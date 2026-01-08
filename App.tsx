
import React, { useState, useEffect } from 'react';
import { Layout, LayoutDashboard, Zap, FileText, Settings, Menu, X } from 'lucide-react';
import { AppView, Meter, Reading, SubMeter, SubReading } from './types';
import { getMeters, saveMeters, getReadings, saveReadings, getSubMeters, saveSubMeters, getSubReadings, saveSubReadings } from './services/storageService';
import { Dashboard } from './components/Dashboard';
import { MetersView } from './components/MetersView';
import { ReadingsView } from './components/ReadingsView';
import { SettingsView } from './components/SettingsView';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [meters, setMeters] = useState<Meter[]>([]);
  const [readings, setReadings] = useState<Reading[]>([]);
  
  // New State for SubMeters (Intermediate Counters)
  const [subMeters, setSubMeters] = useState<SubMeter[]>([]);
  const [subReadings, setSubReadings] = useState<SubReading[]>([]);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Function to refresh data from storage (used after restore backup)
  const refreshData = () => {
    setMeters(getMeters());
    setReadings(getReadings());
    setSubMeters(getSubMeters());
    setSubReadings(getSubReadings());
  };

  // Initial Data Load
  useEffect(() => {
    refreshData();
  }, []);

  // Persistence Handlers - MAIN METERS
  const handleAddMeter = (meter: Meter) => {
    const newMeters = [...meters, meter];
    setMeters(newMeters);
    saveMeters(newMeters);
  };

  const handleUpdateMeter = (updatedMeter: Meter) => {
    const newMeters = meters.map(m => m.id === updatedMeter.id ? updatedMeter : m);
    setMeters(newMeters);
    saveMeters(newMeters);
  };

  const handleDeleteMeter = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este contador? Se borrarán también sus lecturas.')) {
      const newMeters = meters.filter(m => m.id !== id);
      const newReadings = readings.filter(r => r.meterId !== id);
      setMeters(newMeters);
      setReadings(newReadings);
      saveMeters(newMeters);
      saveReadings(newReadings);
    }
  };

  const handleAddReading = (reading: Reading) => {
    const newReadings = [...readings, reading];
    setReadings(newReadings);
    saveReadings(newReadings);
  };

  const handleImportReadings = (importedReadings: Reading[]) => {
    const newReadings = [...readings, ...importedReadings];
    setReadings(newReadings);
    saveReadings(newReadings);
    alert(`Se han importado ${importedReadings.length} lecturas correctamente.`);
  };

  const handleDeleteReading = (id: string) => {
    const newReadings = readings.filter(r => r.id !== id);
    setReadings(newReadings);
    saveReadings(newReadings);
  };

  const handleDeleteAllReadings = () => {
    setReadings([]);
    saveReadings([]);
  };

  // Persistence Handlers - SUB METERS (Intermediate)
  const handleAddSubMeter = (name: string) => {
    const newSubMeter: SubMeter = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now()
    };
    const newSubMeters = [...subMeters, newSubMeter];
    setSubMeters(newSubMeters);
    saveSubMeters(newSubMeters);
  };

  const handleDeleteSubMeter = (id: string) => {
    if(confirm('¿Borrar este contador intermedio y sus datos?')) {
        const newSubMeters = subMeters.filter(sm => sm.id !== id);
        const newSubReadings = subReadings.filter(sr => sr.subMeterId !== id);
        setSubMeters(newSubMeters);
        setSubReadings(newSubReadings);
        saveSubMeters(newSubMeters);
        saveSubReadings(newSubReadings);
    }
  };

  const handleAddSubReading = (reading: SubReading) => {
    const newSubReadings = [...subReadings, reading];
    setSubReadings(newSubReadings);
    saveSubReadings(newSubReadings);
  };

  const handleDeleteSubReading = (id: string) => {
     const newSubReadings = subReadings.filter(sr => sr.id !== id);
     setSubReadings(newSubReadings);
     saveSubReadings(newSubReadings);
  };

  const NavItem = ({ view, icon: Icon, label }: { view: AppView, icon: any, label: string }) => (
    <button
      onClick={() => {
        setCurrentView(view);
        setSidebarOpen(false);
      }}
      className={`w-full flex items-center px-4 py-3 mb-2 rounded-lg transition-colors ${
        currentView === view 
          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      <Icon className="w-5 h-5 mr-3" />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-full flex flex-col p-4">
          <div className="flex items-center gap-3 px-4 py-6 mb-4">
            <div className="bg-emerald-600 p-2 rounded-lg">
              <Layout className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight leading-tight">ESTUDIO<br/>ENERGETICO IPS</h1>
          </div>

          <nav className="flex-1">
            <NavItem view={AppView.DASHBOARD} icon={LayoutDashboard} label="Dashboard" />
            <NavItem view={AppView.METERS} icon={Zap} label="Contadores" />
            <NavItem view={AppView.READINGS} icon={FileText} label="Lecturas" />
            <NavItem view={AppView.SETTINGS} icon={Settings} label="Configuración" />
          </nav>

          <div className="pt-4 border-t border-slate-100">
             <div className="px-4 py-4 bg-emerald-50 rounded-xl mb-4">
                <p className="text-xs text-emerald-800 font-semibold mb-1">PRO TIP</p>
                <p className="text-xs text-emerald-600 leading-relaxed">
                  Usa "Configuración" para guardar tus datos en Drive (descargar copia).
                </p>
             </div>
             <p className="text-xs text-center text-slate-400">v1.1.0 • by React Expert</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto h-screen">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 py-4 flex items-center justify-between lg:hidden">
           <div className="font-bold text-slate-800">ESTUDIO ENERGETICO IPS</div>
           <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-slate-600">
             {sidebarOpen ? <X /> : <Menu />}
           </button>
        </header>

        <div className="p-6 lg:p-10 max-w-7xl mx-auto">
          {currentView === AppView.DASHBOARD && (
            <Dashboard 
              meters={meters} 
              readings={readings} 
              subMeters={subMeters}
              subReadings={subReadings}
            />
          )}
          {currentView === AppView.METERS && (
            <MetersView 
              meters={meters} 
              onAddMeter={handleAddMeter} 
              onDeleteMeter={handleDeleteMeter}
              onUpdateMeter={handleUpdateMeter}
            />
          )}
          {currentView === AppView.READINGS && (
            <ReadingsView 
              meters={meters} 
              readings={readings} 
              subMeters={subMeters}
              subReadings={subReadings}
              onAddReading={handleAddReading}
              onDeleteReading={handleDeleteReading}
              onDeleteAllReadings={handleDeleteAllReadings}
              onImportReadings={handleImportReadings}
              onAddSubMeter={handleAddSubMeter}
              onDeleteSubMeter={handleDeleteSubMeter}
              onAddSubReading={handleAddSubReading}
              onDeleteSubReading={handleDeleteSubReading}
            />
          )}
          {currentView === AppView.SETTINGS && (
            <SettingsView onDataChange={refreshData} />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
