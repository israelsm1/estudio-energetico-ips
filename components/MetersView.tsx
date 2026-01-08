import React, { useState } from 'react';
import { Meter } from '../types';
import { Trash2, Edit2, Plus, Zap } from 'lucide-react';
import { Button } from './Button';

interface MetersViewProps {
  meters: Meter[];
  onAddMeter: (meter: Meter) => void;
  onDeleteMeter: (id: string) => void;
  onUpdateMeter: (meter: Meter) => void;
}

export const MetersView: React.FC<MetersViewProps> = ({ meters, onAddMeter, onDeleteMeter, onUpdateMeter }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMeter, setEditingMeter] = useState<Meter | null>(null);
  const [formData, setFormData] = useState({ name: '', location: '' });

  const openModal = (meter?: Meter) => {
    if (meter) {
      setEditingMeter(meter);
      setFormData({ name: meter.name, location: meter.location });
    } else {
      setEditingMeter(null);
      setFormData({ name: '', location: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMeter) {
      onUpdateMeter({ ...editingMeter, ...formData });
    } else {
      onAddMeter({
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        ...formData
      });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Mis Contadores</h2>
          <p className="text-slate-500">Gestiona los puntos de suministro eléctrico.</p>
        </div>
        <Button onClick={() => openModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Contador
        </Button>
      </div>

      {meters.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border-2 border-dashed border-slate-200">
          <Zap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No hay contadores registrados</h3>
          <p className="text-slate-500 mb-4">Añade tu primer contador para empezar a registrar consumos.</p>
          <Button variant="secondary" onClick={() => openModal()}>Añadir Contador</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {meters.map(meter => (
            <div key={meter.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Zap className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openModal(meter)} className="text-slate-400 hover:text-indigo-600 transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => onDeleteMeter(meter.id)} className="text-slate-400 hover:text-red-600 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">{meter.name}</h3>
              <p className="text-sm text-slate-500">{meter.location}</p>
              <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400">
                ID: {meter.id.slice(0, 8)}...
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4">
              {editingMeter ? 'Editar Contador' : 'Nuevo Contador'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Casa Principal"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ubicación</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Calle Mayor, 12"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button type="submit">{editingMeter ? 'Guardar Cambios' : 'Crear Contador'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};