
import React, { useState, useEffect } from 'react';
import { Download, Upload, Trash2, Database, AlertTriangle, CheckCircle, Sparkles } from 'lucide-react';
import { Button } from './Button';
import { exportDataToJSON, importDataFromJSON, clearAllData } from '../services/storageService';
import { testConnection } from '../services/geminiService';

interface SettingsViewProps {
  onDataChange: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onDataChange }) => {
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [geminiKey, setGeminiKey] = useState('');

  useEffect(() => {
    const savedKey = localStorage.getItem('ecotrack_gemini_key');
    if (savedKey) setGeminiKey(savedKey);
  }, []);

  const handleTestAI = async () => {
    try {
      await testConnection();
      // Alert is handled in service for now to keep simple, or we can toast here
    } catch (e) {
      // Error alert handled in service
    }
  };

  const handleDownloadBackup = () => {
    const jsonString = exportDataToJSON();
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Copia_Seguridad_IPS_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = importDataFromJSON(content);
        if (result.success) {
          setImportStatus('success');
          onDataChange(); // Refresh App state
          setTimeout(() => setImportStatus('idle'), 3000);
        } else {
          setImportStatus('error');
          alert(`Error al restaurar: ${result.message}`); // Show specific error
          setTimeout(() => setImportStatus('idle'), 3000);
        }
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const handleResetApp = () => {
    const confirmText = "ELIMINAR";
    const userText = prompt(`⚠️ PELIGRO: Esto borrará TODOS los datos de la aplicación.\n\nPara confirmar, escribe "${confirmText}":`);

    if (userText === confirmText) {
      clearAllData();
      onDataChange();
      alert("La aplicación ha sido reiniciada de fábrica.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Configuración y Datos</h2>
        <p className="text-slate-500">Gestiona tus claves API y copias de seguridad.</p>
      </div>

      {/* AI Configuration Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            Inteligencia Artificial (Gemini)
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Configura tu clave para activar el Analista Energético y las estimaciones de precio.
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Clave API de Google Gemini</label>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="Pegar clave API (AIza...)"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={geminiKey}
                onChange={(e) => {
                  setGeminiKey(e.target.value);
                  localStorage.setItem('ecotrack_gemini_key', e.target.value);
                }}
              />
              <Button onClick={handleTestAI} disabled={!geminiKey} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Probar Conexión
              </Button>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              La clave se guarda localmente en tu navegador.
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline ml-1">
                Obtener clave gratis
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Backup Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600" />
            Copias de Seguridad
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Guarda este archivo en tu <strong>Google Drive</strong> para no perder nunca tus datos.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Export */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-medium text-slate-900">1. Descargar Copia Completa</h4>
              <p className="text-sm text-slate-500">Genera un archivo .json con todos tus contadores y lecturas.</p>
            </div>
            <Button onClick={handleDownloadBackup} className="shrink-0">
              <Download className="w-4 h-4 mr-2" />
              Descargar Archivo
            </Button>
          </div>

          <div className="h-px bg-slate-100 w-full"></div>

          {/* Import */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-medium text-slate-900">2. Restaurar Copia</h4>
              <p className="text-sm text-slate-500">Recupera tus datos subiendo el archivo .json guardado.</p>
            </div>
            <div className="relative shrink-0">
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button variant="secondary" className={importStatus === 'success' ? 'border-green-500 text-green-600 bg-green-50' : ''}>
                {importStatus === 'success' ? <CheckCircle className="w-4 h-4 mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                {importStatus === 'success' ? 'Restaurado OK' : importStatus === 'error' ? 'Error Archivo' : 'Seleccionar Archivo'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 rounded-xl border border-red-100 p-6">
        <h3 className="font-bold text-red-800 flex items-center gap-2 mb-2">
          <AlertTriangle className="w-5 h-5" />
          Zona de Peligro
        </h3>
        <p className="text-sm text-red-700 mb-4">
          Si borras los datos de la aplicación, no se podrán recuperar a menos que tengas una copia de seguridad descargada.
        </p>
        <Button variant="danger" onClick={handleResetApp}>
          <Trash2 className="w-4 h-4 mr-2" />
          Borrar Todos los Datos
        </Button>
      </div>
    </div>
  );
};
