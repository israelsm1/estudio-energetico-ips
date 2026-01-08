import React, { useState } from 'react';
import { Sparkles, TrendingDown, Lightbulb, AlertCircle } from 'lucide-react';
import { Meter, Reading, AiAnalysisResult } from '../types';
import { generateEnergyAnalysis } from '../services/geminiService';
import { Button } from './Button';

interface AIAnalysisComponentProps {
    meter: Meter;
    readings: Reading[];
}

export const AIAnalysisComponent: React.FC<AIAnalysisComponentProps> = ({ meter, readings }) => {
    const [analysis, setAnalysis] = useState<AiAnalysisResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAnalyze = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await generateEnergyAnalysis(meter, readings);
            setAnalysis(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido al analizar');
        } finally {
            setLoading(false);
        }
    };

    if (!meter || readings.length < 2) {
        return (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center text-slate-500">
                <Sparkles className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p>Necesitas al menos 2 lecturas para que la IA (Gemini) pueda analizar tu consumo.</p>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-6 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles className="w-32 h-32 text-indigo-600" />
            </div>

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-indigo-600" />
                            Analista Energético IA
                        </h3>
                        <p className="text-indigo-600/80 text-sm">
                            Impulsado por Google Gemini
                        </p>
                    </div>
                    {!analysis && (
                        <Button
                            onClick={handleAnalyze}
                            disabled={loading}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20"
                        >
                            {loading ? 'Analizando...' : 'Analizar Consumo'}
                        </Button>
                    )}
                </div>

                {error && (
                    <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-2 mb-4 border border-red-100">
                        <AlertCircle className="w-5 h-5" />
                        {error}
                    </div>
                )}

                {analysis && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {/* Advice Section */}
                        <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-indigo-100">
                            <div className="flex items-start gap-3">
                                <div className="bg-amber-100 p-2 rounded-full text-amber-600 mt-1">
                                    <Lightbulb className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-800 mb-1">Consejo de Ahorro</h4>
                                    <p className="text-slate-600 leading-relaxed">{analysis.advice}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Savings Potential */}
                            <div className="bg-emerald-50 rounded-lg p-5 border border-emerald-100 flex items-center justify-between">
                                <div>
                                    <p className="text-emerald-800 font-medium mb-1">Potencial de Ahorro</p>
                                    <p className="text-emerald-600 text-sm">Estimación mensual</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-3xl font-bold text-emerald-600">{analysis.savingsPotential}</span>
                                    <TrendingDown className="w-5 h-5 text-emerald-500 inline ml-2" />
                                </div>
                            </div>

                            {/* Predictions Table */}
                            <div className="bg-white/60 rounded-lg border border-indigo-100 overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-indigo-100/50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-indigo-900 font-semibold">Mes Predicho</th>
                                            <th className="px-4 py-2 text-right text-indigo-900 font-semibold">kWh</th>
                                            <th className="px-4 py-2 text-right text-indigo-900 font-semibold">Coste Est.</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-indigo-50">
                                        {analysis.predictions.map((pred, idx) => (
                                            <tr key={idx} className="hover:bg-indigo-50/30">
                                                <td className="px-4 py-2 text-slate-700 font-medium">{pred.month}</td>
                                                <td className="px-4 py-2 text-right text-slate-600">{pred.kwh.toFixed(0)}</td>
                                                <td className="px-4 py-2 text-right text-slate-600">{pred.cost.toFixed(2)} €</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="text-center pt-2">
                            <button
                                onClick={handleAnalyze}
                                className="text-xs text-indigo-500 hover:text-indigo-700 underline"
                            >
                                Actualizar Análisis
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
