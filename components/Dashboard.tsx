import React, { useState, useMemo, useEffect } from 'react';
import { Meter, Reading, SubMeter, SubReading } from '../types';
import { TrendingUp, DollarSign, Zap, Gauge } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { AIAnalysisComponent } from './AIAnalysisComponent';

interface DashboardProps {
  meters: Meter[];
  readings: Reading[];
  subMeters: SubMeter[];
  subReadings: SubReading[];
}

export const Dashboard: React.FC<DashboardProps> = ({ meters, readings, subMeters, subReadings }) => {
  // Use a composite ID (e.g. "main:123" or "sub:456") or just ID to track selection
  // Since we have separate lists, we'll try to find the ID in both lists to determine type
  const [selectedId, setSelectedId] = useState<string>('');

  // Custom Date Range State
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });

  // Set default selection
  useEffect(() => {
    if (!selectedId) {
      if (meters && meters.length > 0) setSelectedId(meters[0].id);
      else if (subMeters && subMeters.length > 0) setSelectedId(subMeters[0].id);
    }
  }, [meters, subMeters, selectedId]);

  // Determine current context based on selectedId
  const context = useMemo(() => {
    // Safety check for arrays
    const safeMeters = meters || [];
    const safeSubMeters = subMeters || [];

    const mainMeter = safeMeters.find(m => m.id === selectedId);
    if (mainMeter) return { type: 'main' as const, entity: mainMeter };

    const subMeter = safeSubMeters.find(m => m.id === selectedId);
    if (subMeter) return { type: 'sub' as const, entity: subMeter };

    return null;
  }, [selectedId, meters, subMeters]);

  // Find the 'Total IPS' meter for Solar Data
  const solarData = useMemo(() => {
    if (!meters && !readings) return [];
    // Try to find a meter named like "Total IPS" or "General" or "Total"
    // The user explicitly said "Total IPS"
    const solarMeter = meters?.find(m =>
      m.name.toLowerCase().includes('total ips') ||
      m.name.toLowerCase().includes('general') // Fallback
    );

    if (!solarMeter) return [];

    return (readings || []).filter(r => r.meterId === solarMeter.id);
  }, [meters, readings]);

  const filteredReadings = useMemo(() => {
    if (!context) return [];

    let targetReadings: any[] = [];
    if (context.type === 'main') {
      targetReadings = (readings || []).filter(r => r.meterId === selectedId);
    } else {
      targetReadings = (subReadings || []).filter(r => r.subMeterId === selectedId);
    }

    return targetReadings.filter(r => {
      if (!r.date) return false;

      // Simple string comparison works for ISO YYYY-MM dates or YYYY-MM-DD
      // Ensure inputs are respected
      if (dateRange.start && r.date < dateRange.start) return false;
      if (dateRange.end && r.date > dateRange.end) return false;

      return true;
    });
  }, [readings, subReadings, selectedId, context, dateRange]);

  // Determine if we should show solar data
  const showSolar = useMemo(() => {
    if (!context || !context.entity) return false;
    const name = context.entity.name.toLowerCase();
    return name.includes('total ips') || name.includes('general');
  }, [context]);

  const chartData = useMemo(() => {
    return filteredReadings
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((r: any) => {
        // Find corresponding solar reading for this date
        // Assuming date format is YYYY-MM
        let solarVal = 0;
        if (showSolar) {
          const solarReading = solarData.find(sr => sr.date === r.date);
          solarVal = r.solarKwh || (solarReading ? solarReading.solarKwh : 0) || 0;
        }

        return {
          date: r.date,
          formattedDate: new Date(r.date).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
          kwh: r.kwh,
          solarKwh: solarVal, // Use Global Solar Data
          cost: context?.type === 'main' ? (r as Reading).cost : (r as SubReading).calculatedCost,
          type: 'Real'
        };
      });
  }, [filteredReadings, context, solarData, showSolar]);

  const stats = useMemo(() => {
    const totalKwh = chartData.reduce((acc, curr) => acc + curr.kwh, 0);
    const totalCost = chartData.reduce((acc, curr) => acc + curr.cost, 0);
    const avgCost = chartData.length > 0 ? totalCost / chartData.length : 0;

    // Solar Stats (aggregating all solar data within the filtered range)
    const totalSolar = chartData.reduce((acc, curr) => acc + (curr.solarKwh || 0), 0);

    // Estimated Savings: Solar kWh * Average Cost per kWh inside grid
    // Cost per kWh = TotalCost / TotalKwh
    const avgPricePerKwh = totalKwh > 0 ? totalCost / totalKwh : 0.15; // default to 0.15 if no consumption
    const estimatedSavings = totalSolar * avgPricePerKwh;

    return { totalKwh, totalCost, avgCost, totalSolar, estimatedSavings };
  }, [chartData]);

  // Helper to set presets
  const applyPreset = (preset: 'all' | '2025' | '2026' | '12m') => {
    if (preset === 'all') setDateRange({ start: '', end: '' });
    if (preset === '2025') setDateRange({ start: '2025-01-01', end: '2025-12-31' });
    if (preset === '2026') setDateRange({ start: '2026-01-01', end: '2026-12-31' });
    if (preset === '12m') {
      const end = new Date().toISOString().split('T')[0]; // Today
      const start = new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0];
      setDateRange({ start: start.substring(0, 7), end: end.substring(0, 7) }); // Use YYYY-MM if possible or full date
    }
  };

  if ((!meters || meters.length === 0) && (!subMeters || subMeters.length === 0)) {
    return <div className="text-center py-12 text-slate-500">Registra un contador para ver el panel.</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Panel de Control</h2>
          <p className="text-slate-500">
            {context?.type === 'sub' ? 'Kpi de consumo' : 'Visualiza tu gasto real'}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 w-full xl:w-auto items-end">
          {/* Date Presets */}
          <div className="bg-white border border-slate-200 rounded-lg p-1 flex shadow-sm">
            <button onClick={() => applyPreset('all')} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded transition-colors">Todo</button>
            <div className="w-px bg-slate-200 my-1 mx-1"></div>
            <button onClick={() => applyPreset('12m')} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded transition-colors">12 Meses</button>
            <button onClick={() => applyPreset('2025')} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded transition-colors">2025</button>
            <button onClick={() => applyPreset('2026')} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded transition-colors">2026</button>
          </div>

          {/* Custom Range Inputs */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1.5 shadow-sm">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider pl-1">Desde</span>
              <input
                type="month"
                className="text-sm bg-transparent border-none p-0 focus:ring-0 text-slate-700 w-32"
                value={dateRange.start ? dateRange.start.substring(0, 7) : ''}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
            </div>
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider pl-1">Hasta</span>
              <input
                type="month"
                className="text-sm bg-transparent border-none p-0 focus:ring-0 text-slate-700 w-32"
                value={dateRange.end ? dateRange.end.substring(0, 7) : ''}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
          </div>

          <div className="w-full sm:w-64">
            <select
              className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {meters.length > 0 && (
                <optgroup label="Facturación (Principal)">
                  {meters.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </optgroup>
              )}
              {subMeters.length > 0 && (
                <optgroup label="Contadores Intermedios">
                  {subMeters.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </optgroup>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className={`grid grid-cols-1 md:grid-cols-${stats.totalSolar > 0 ? '5' : '3'} gap-4 transition-all duration-300`}>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center transition-transform hover:scale-105 duration-200">
          <div className="bg-blue-100 p-2 rounded-full mr-3 text-blue-600">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium whitespace-nowrap">Consumo Red</p>
            <h3 className="text-lg font-bold text-slate-800">{stats.totalKwh.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">kWh</span></h3>
          </div>
        </div>

        {stats.totalSolar > 0 && (
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center transition-transform hover:scale-105 duration-200 animate-in fade-in">
            <div className="bg-orange-100 p-2 rounded-full mr-3 text-orange-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium whitespace-nowrap">Prod. Solar</p>
              <h3 className="text-lg font-bold text-slate-800">{stats.totalSolar.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">kWh</span></h3>
            </div>
          </div>
        )}

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center transition-transform hover:scale-105 duration-200">
          <div className="bg-emerald-100 p-2 rounded-full mr-3 text-emerald-600">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium whitespace-nowrap">Coste Total</p>
            <h3 className="text-lg font-bold text-slate-800">{stats.totalCost.toFixed(2)} <span className="text-[10px] font-normal text-slate-400">€</span></h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center transition-transform hover:scale-105 duration-200">
          <div className="bg-lime-100 p-2 rounded-full mr-3 text-lime-600">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium whitespace-nowrap">Ahorro Est.</p>
            <h3 className="text-lg font-bold text-slate-800">{stats.estimatedSavings.toFixed(2)} <span className="text-[10px] font-normal text-slate-400">€</span></h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center transition-transform hover:scale-105 duration-200">
          <div className={`p-2 rounded-full mr-3 ${context?.type === 'sub' ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}>
            {context?.type === 'sub' ? <Gauge className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium whitespace-nowrap">Media Mensual</p>
            <h3 className="text-lg font-bold text-slate-800">{stats.avgCost.toFixed(2)} <span className="text-[10px] font-normal text-slate-400">€</span></h3>
          </div>
        </div>
      </div>

      {/* Energy Chart (kWh & Solar) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div className='flex justify-between items-center mb-6'>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-500" />
            Evolución Energética: {context?.entity.name}
          </h3>
          {(dateRange.start || dateRange.end) && (
            <span className='text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full flex items-center gap-1'>
              Filtro: {dateRange.start || 'Inicio'} - {dateRange.end || 'Fin'}
            </span>
          )}
        </div>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="formattedDate"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="left"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                label={{ value: 'Energía (kWh)', angle: -90, position: 'insideLeft', style: { fill: '#64748b' } }}
              />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                labelStyle={{ color: '#1e293b', fontWeight: 'bold' }}
              />
              <Legend verticalAlign="top" height={36} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="kwh"
                name="Consumo Red"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 0, fill: '#3b82f6' }}
                activeDot={{ r: 6 }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="solarKwh"
                name="Producción Solar"
                stroke="#f59e0b"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 0, fill: '#f59e0b' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cost Chart (Euros) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div className='flex justify-between items-center mb-6'>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-500" />
            Evolución de Costes
          </h3>
        </div>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="formattedDate"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                label={{ value: 'Coste (€)', angle: -90, position: 'insideLeft', style: { fill: '#64748b' } }}
              />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                labelStyle={{ color: '#1e293b', fontWeight: 'bold' }}
                formatter={(value: number) => [`${value.toFixed(2)} €`, 'Coste']}
              />
              <Line
                type="monotone"
                dataKey="cost"
                name="Coste Mensual"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 0, fill: '#10b981' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI Analyst Section */}
      {context?.type === 'main' && (
        <AIAnalysisComponent
          meter={context.entity as Meter}
          readings={filteredReadings as Reading[]}
        />
      )}
    </div>
  );
};