import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Meter, Reading, SubMeter, SubReading } from '../types';
import { Button } from './Button';
import { Plus, Trash2, FileSpreadsheet, Download, Upload, Sun, Sparkles, AlertTriangle, Loader2, Zap, Gauge } from 'lucide-react';
import { getElectricityPrice } from '../services/geminiService';

interface ReadingsViewProps {
    meters: Meter[];
    readings: Reading[];
    // Sub Meters (Intermediate)
    subMeters?: SubMeter[];
    subReadings?: SubReading[];

    onAddReading: (reading: Reading) => void;
    onDeleteReading: (id: string) => void;
    onDeleteAllReadings: () => void;
    onImportReadings: (readings: Reading[]) => void;

    // Sub Meter Handlers
    onAddSubMeter?: (name: string) => void;
    onDeleteSubMeter?: (id: string) => void;
    onAddSubReading?: (reading: SubReading) => void;
    onDeleteSubReading?: (id: string) => void;
}

export const ReadingsView: React.FC<ReadingsViewProps> = ({
    meters,
    readings,
    subMeters = [],
    subReadings = [],
    onAddReading,
    onDeleteReading,
    onDeleteAllReadings,
    onImportReadings,
    onAddSubMeter,
    onDeleteSubMeter,
    onAddSubReading,
    onDeleteSubReading
}) => {
    const [activeTab, setActiveTab] = useState<'main' | 'sub'>('main');

    // --- MAIN METERS STATE ---
    const [selectedMeterId, setSelectedMeterId] = useState<string>(meters[0]?.id || '');
    const [isImporting, setIsImporting] = useState(false);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().slice(0, 7), // YYYY-MM
        kwh: '',
        solarKwh: '',
        cost: '',
        notes: ''
    });

    // --- SUB METERS STATE ---
    const [selectedSubMeterId, setSelectedSubMeterId] = useState<string>('');
    const [newSubMeterName, setNewSubMeterName] = useState('');
    const [isAddingSubMeter, setIsAddingSubMeter] = useState(false);
    const [subFormData, setSubFormData] = useState({
        date: new Date().toISOString().slice(0, 7),
        kwh: '',
        cost: '' // Added manual cost for submeters
    });

    // Initialize selectedSubMeterId if needed
    React.useEffect(() => {
        if (subMeters.length > 0 && !selectedSubMeterId) {
            setSelectedSubMeterId(subMeters[0].id);
        }
    }, [subMeters]);

    // --- MAIN LOGIC ---
    const filteredReadings = useMemo(() => {
        return readings
            .filter(r => r.meterId === selectedMeterId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [readings, selectedMeterId]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMeterId) return;

        onAddReading({
            id: crypto.randomUUID(),
            meterId: selectedMeterId,
            date: formData.date || new Date().toISOString().slice(0, 7),
            kwh: formData.kwh ? parseFloat(formData.kwh) : 0,
            solarKwh: formData.solarKwh ? parseFloat(formData.solarKwh) : 0,
            cost: formData.cost ? parseFloat(formData.cost) : 0,
            notes: formData.notes
        });

        setFormData(prev => ({ ...prev, kwh: '', solarKwh: '', cost: '', notes: '' }));
    };

    // --- SUB METERS LOGIC ---
    const filteredSubReadings = useMemo(() => {
        return subReadings
            .filter(r => r.subMeterId === selectedSubMeterId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [subReadings, selectedSubMeterId]);

    const handleCreateSubMeter = (e: React.FormEvent) => {
        e.preventDefault();
        if (newSubMeterName && onAddSubMeter) {
            onAddSubMeter(newSubMeterName);
            setNewSubMeterName('');
            setIsAddingSubMeter(false);
        }
    };

    const handleSubmitSubReading = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSubMeterId || !onAddSubReading) return;
        if (!subFormData.kwh) {
            alert('Introduce los kWh');
            return;
        }

        const kwh = parseFloat(subFormData.kwh);
        const cost = subFormData.cost ? parseFloat(subFormData.cost) : 0;
        // Derived price used, just for record keeping. If cost is 0, price is 0.
        const priceUsed = kwh > 0 ? cost / kwh : 0;

        onAddSubReading({
            id: crypto.randomUUID(),
            subMeterId: selectedSubMeterId,
            date: subFormData.date,
            kwh: kwh,
            calculatedCost: cost,
            priceUsed: priceUsed
        });

        setSubFormData(prev => ({ ...prev, kwh: '', cost: '' }));
    };


    // --- SHARED LOGIC ---
    const handleClearHistory = () => {
        if (filteredReadings.length === 0) return;
        const confirmMessage = "⚠️ ¿Estás seguro de que quieres BORRAR TODO el historial de este contador?\n\nEsta acción no se puede deshacer.";
        if (window.confirm(confirmMessage)) {
            onDeleteAllReadings();
        }
    };

    const exportToExcel = () => {
        const dataToExport = filteredReadings.map(r => {
            const realConsumption = r.kwh + (r.solarKwh || 0);
            const savings = realConsumption > 0 ? ((r.solarKwh || 0) / realConsumption) : 0;
            const pricePerKwh = r.kwh > 0 ? r.cost / r.kwh : 0;
            const hypotheticalCost = realConsumption * pricePerKwh;

            return {
                Fecha: r.date,
                'Consumo Red (kWh)': r.kwh,
                'Producción Solar (kWh)': r.solarKwh || 0,
                'Consumo Real (kWh)': realConsumption,
                'Ahorro (%)': savings,
                'Coste Pagado (€)': r.cost,
                'Coste Teórico (Sin Solar) (€)': hypotheticalCost,
                'Notas': r.notes || ''
            };
        });

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        const meterName = meters.find(m => m.id === selectedMeterId)?.name || 'Consumo';

        XLSX.utils.book_append_sheet(wb, ws, "Consumos");
        XLSX.writeFile(wb, `Estudio_Energetico_IPS_${meterName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedMeterId) return;

        setIsImporting(true);

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const arrayBuffer = evt.target?.result;
                const wb = XLSX.read(arrayBuffer, { type: 'array' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                const findValue = (row: any, ...terms: string[]) => {
                    const keys = Object.keys(row);
                    const key = keys.find(k => terms.some(term => k.toLowerCase().includes(term.toLowerCase())));
                    return key ? row[key] : undefined;
                };

                const processedReadings: Reading[] = [];

                // Process sequentially
                for (const row of data as any[]) {
                    let dateVal = findValue(row, 'fecha', 'date');
                    let formattedDate = new Date().toISOString().slice(0, 7);

                    if (dateVal) {
                        if (typeof dateVal === 'number') {
                            const dateObj = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
                            if (!isNaN(dateObj.getTime())) formattedDate = dateObj.toISOString().slice(0, 7);
                        } else {
                            const dateObj = new Date(dateVal);
                            if (!isNaN(dateObj.getTime())) formattedDate = dateObj.toISOString().slice(0, 7);
                            else if (typeof dateVal === 'string') {
                                const parts = dateVal.split(/[-/]/);
                                if (parts.length === 3) {
                                    const p1 = parseInt(parts[0]);
                                    const p3 = parseInt(parts[2]);
                                    if (p1 > 1000) formattedDate = `${parts[0]}-${parts[1].padStart(2, '0')}`;
                                    else if (p3 > 1000) formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}`;
                                }
                            }
                        }
                    }

                    const kwhVal = parseFloat(findValue(row, 'consumo red', 'consumo', 'kwh', 'grid') || '0');
                    const solarVal = parseFloat(findValue(row, 'solar', 'placas', 'produccion', 'sun') || '0');
                    let costVal = parseFloat(findValue(row, 'coste', 'cost', '€', 'eur', 'importe', 'precio') || '0');
                    const notesVal = findValue(row, 'nota', 'obs', 'comment') || '';

                    processedReadings.push({
                        id: crypto.randomUUID(),
                        meterId: selectedMeterId,
                        date: formattedDate,
                        kwh: isNaN(kwhVal) ? 0 : kwhVal,
                        solarKwh: isNaN(solarVal) ? 0 : solarVal,
                        cost: isNaN(costVal) ? 0 : costVal,
                        notes: String(notesVal)
                    });
                }

                const validReadings = processedReadings.filter(r => r.kwh > 0 || r.cost > 0 || (r.solarKwh || 0) > 0);

                if (validReadings.length === 0 && processedReadings.length > 0) {
                    alert("No se han encontrado datos válidos.");
                } else {
                    onImportReadings(validReadings);
                }

            } catch (error) {
                console.error("Error importando Excel:", error);
                alert("Error al leer el archivo.");
            } finally {
                setIsImporting(false);
                e.target.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    };

    if (meters.length === 0 && activeTab === 'main') {
        return (
            <div className="text-center py-12">
                <p className="text-slate-500">Por favor, crea un contador primero para añadir lecturas.</p>
            </div>
        );
    }

    // --- RENDER ---
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Registro de Consumos</h2>
                    <p className="text-slate-500">Gestiona facturas principales y contadores intermedios.</p>
                </div>

                {/* TABS */}
                <div className="bg-slate-200 p-1 rounded-lg inline-flex">
                    <button
                        onClick={() => setActiveTab('main')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'main' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'
                            }`}
                    >
                        Facturación (Principal)
                    </button>
                    <button
                        onClick={() => setActiveTab('sub')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'sub' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'
                            }`}
                    >
                        Contadores Intermedios
                    </button>
                </div>
            </div>

            {/* --- MAIN METER VIEW --- */}
            {activeTab === 'main' && (
                <div className="animate-in fade-in duration-300 space-y-6">
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={exportToExcel} disabled={filteredReadings.length === 0}>
                            <Download className="w-4 h-4 mr-2" />
                            Exportar
                        </Button>
                        <div className="relative">
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={handleFileUpload}
                                disabled={isImporting}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                            />
                            <Button variant="secondary" disabled={isImporting}>
                                {isImporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                                {isImporting ? 'Importando...' : 'Importar'}
                            </Button>
                        </div>
                        {filteredReadings.length > 0 && (
                            <Button variant="danger" onClick={handleClearHistory} title="Borrar todo el historial">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Borrar Todo
                            </Button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Form Column */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-fit sticky top-6">
                            <h3 className="font-bold text-lg mb-4 flex items-center">
                                <Plus className="w-5 h-5 mr-2 text-emerald-600" />
                                Nueva Lectura
                            </h3>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Contador</label>
                                    <select
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                                        value={selectedMeterId}
                                        onChange={(e) => setSelectedMeterId(e.target.value)}
                                    >
                                        {meters.map(m => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Mes y Año</label>
                                    <input
                                        type="month"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Consumo Red (kWh)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                            value={formData.kwh}
                                            onChange={e => setFormData({ ...formData, kwh: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                                            <Sun className="w-3 h-3 text-amber-500" />
                                            Solar (kWh)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                                            value={formData.solarKwh}
                                            onChange={e => setFormData({ ...formData, solarKwh: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-sm font-medium text-slate-700">Coste Estimado (€)</label>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                if (!formData.kwh || parseFloat(formData.kwh) <= 0) {
                                                    alert("Introduce el consumo (kWh) primero.");
                                                    return;
                                                }
                                                // Calculate based on date
                                                const price = await getElectricityPrice(formData.date);
                                                const estimated = (parseFloat(formData.kwh) * price).toFixed(2);
                                                setFormData(prev => ({ ...prev, cost: estimated }));
                                            }}
                                            className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium bg-indigo-50 px-2 py-0.5 rounded-full transition-colors"
                                            title="Calcular coste estimado con precio medio histórico (IA)"
                                        >
                                            <Sparkles className="w-3 h-3" />
                                            Auto-Calcular
                                        </button>
                                    </div>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                        value={formData.cost}
                                        onChange={e => setFormData({ ...formData, cost: e.target.value })}
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">
                                        * Coste = kWh Red x Precio Medio del mes (PVPC)
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
                                    <textarea
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                        rows={2}
                                        value={formData.notes}
                                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    />
                                </div>

                                <Button type="submit" className="w-full">Añadir Lectura</Button>
                            </form>
                        </div>

                        {/* List Column */}
                        <div className="lg:col-span-2 space-y-4">
                            <h3 className="font-bold text-slate-700 px-2">Historial de Consumo</h3>
                            {filteredReadings.length === 0 ? (
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-500">
                                    <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                    No hay lecturas para este contador.
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-x-auto">
                                    <table className="w-full text-left min-w-[600px]">
                                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                                            <tr>
                                                <th className="px-4 py-3">Fecha</th>
                                                <th className="px-4 py-3">Total (kWh)</th>
                                                <th className="px-4 py-3 text-green-600">Ahorro</th>
                                                <th className="px-4 py-3">Coste Pagado</th>
                                                <th className="px-4 py-3 text-slate-400">Coste Teórico</th>
                                                <th className="px-4 py-3 text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-sm">
                                            {filteredReadings.map(reading => {
                                                const solar = reading.solarKwh || 0;
                                                const realConsumption = reading.kwh + solar;
                                                const savingsPercent = realConsumption > 0 ? (solar / realConsumption) * 100 : 0;

                                                // Calculate hypothetical cost (Price paid / grid kwh = unit price. Then unit price * total consumption)
                                                const pricePerKwh = reading.kwh > 0 ? reading.cost / reading.kwh : 0;
                                                const hypotheticalCost = realConsumption * pricePerKwh;

                                                return (
                                                    <tr key={reading.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-4 py-4 font-medium text-slate-900">
                                                            <div className="flex flex-col">
                                                                <span>{new Date(reading.date).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
                                                                <span className="text-xs text-slate-400">Red: {reading.kwh} + Solar: {solar}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 text-slate-800 font-bold">{realConsumption.toFixed(2)}</td>
                                                        <td className="px-4 py-4 text-green-600">
                                                            {savingsPercent > 0 ? (
                                                                <span className="bg-green-100 px-2 py-1 rounded-full text-xs font-bold">
                                                                    {savingsPercent.toFixed(0)}%
                                                                </span>
                                                            ) : '-'}
                                                        </td>
                                                        <td className="px-4 py-4 text-emerald-600 font-medium text-base">
                                                            {reading.cost.toFixed(2)} €
                                                        </td>
                                                        <td className="px-4 py-4 text-slate-500 text-sm">
                                                            {hypotheticalCost > 0 ? `${hypotheticalCost.toFixed(2)} €` : '-'}
                                                            {hypotheticalCost > 0 && (
                                                                <div className="text-[10px] text-slate-400">Sin solar</div>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-4 text-right">
                                                            <button
                                                                onClick={() => onDeleteReading(reading.id)}
                                                                className="text-slate-400 hover:text-red-600 transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- SUB METER VIEW (INTERMEDIATE) --- */}
            {activeTab === 'sub' && (
                <div className="animate-in fade-in duration-300 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Selector & Form */}
                    <div className="space-y-6">
                        {/* Selector Card */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center">
                                <Gauge className="w-5 h-5 mr-2 text-indigo-600" />
                                Contador Intermedio
                            </h3>

                            {isAddingSubMeter ? (
                                <form onSubmit={handleCreateSubMeter} className="flex gap-2">
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Ej. Bomba Piscina"
                                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                        value={newSubMeterName}
                                        onChange={e => setNewSubMeterName(e.target.value)}
                                    />
                                    <Button type="submit" disabled={!newSubMeterName} className="whitespace-nowrap">Crear</Button>
                                    <Button type="button" variant="ghost" onClick={() => setIsAddingSubMeter(false)}>x</Button>
                                </form>
                            ) : (
                                <div className="flex gap-2">
                                    <select
                                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-white"
                                        value={selectedSubMeterId}
                                        onChange={e => setSelectedSubMeterId(e.target.value)}
                                    >
                                        {subMeters.length === 0 && <option value="">-- Crea un contador --</option>}
                                        {subMeters.map(sm => (
                                            <option key={sm.id} value={sm.id}>{sm.name}</option>
                                        ))}
                                    </select>
                                    <Button variant="secondary" onClick={() => setIsAddingSubMeter(true)} title="Nuevo contador intermedio">
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                    {selectedSubMeterId && onDeleteSubMeter && (
                                        <Button variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => onDeleteSubMeter(selectedSubMeterId)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Input Form */}
                        {selectedSubMeterId && (
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                                <h4 className="font-semibold text-slate-700 mb-4">Añadir Lectura Simple</h4>
                                <form onSubmit={handleSubmitSubReading} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
                                        <input
                                            type="month"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                                            value={subFormData.date}
                                            onChange={e => setSubFormData({ ...subFormData, date: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Consumo (kWh)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                                            value={subFormData.kwh}
                                            onChange={e => setSubFormData({ ...subFormData, kwh: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Coste Estimado (€)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                                            value={subFormData.cost}
                                            onChange={e => setSubFormData({ ...subFormData, cost: e.target.value })}
                                        />
                                    </div>

                                    <Button type="submit" className="w-full" disabled={!subFormData.kwh}>
                                        Registrar
                                    </Button>
                                </form>
                            </div>
                        )}
                    </div>

                    {/* Right Column: History */}
                    <div className="lg:col-span-2">
                        <h3 className="font-bold text-slate-700 px-2 mb-4">Historial Intermedio</h3>
                        {!selectedSubMeterId ? (
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-500">
                                Selecciona o crea un contador intermedio.
                            </div>
                        ) : filteredSubReadings.length === 0 ? (
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-500">
                                No hay lecturas registradas.
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                                        <tr>
                                            <th className="px-4 py-3">Fecha</th>
                                            <th className="px-4 py-3">Consumo</th>
                                            <th className="px-4 py-3">Precio Ref.</th>
                                            <th className="px-4 py-3 text-emerald-600">Coste Calc.</th>
                                            <th className="px-4 py-3 text-right"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm">
                                        {filteredSubReadings.map(reading => (
                                            <tr key={reading.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 font-medium">
                                                    {new Date(reading.date).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                                                </td>
                                                <td className="px-4 py-3 font-bold text-slate-700">{reading.kwh} kWh</td>
                                                <td className="px-4 py-3 text-xs text-slate-500">
                                                    {reading.priceUsed.toFixed(4)} €/kWh
                                                </td>
                                                <td className="px-4 py-3 text-emerald-600 font-bold">
                                                    {reading.calculatedCost.toFixed(2)} €
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {onDeleteSubReading && (
                                                        <button onClick={() => onDeleteSubReading(reading.id)} className="text-slate-400 hover:text-red-500">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};