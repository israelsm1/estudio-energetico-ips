
export interface Meter {
  id: string;
  name: string;
  location: string;
  createdAt: number;
}

export interface Reading {
  id: string;
  meterId: string;
  date: string; // YYYY-MM format
  kwh: number; // Consumo de RED
  solarKwh?: number; // Generado por PLACAS
  cost: number;
  notes?: string;
}

export interface SubMeter {
  id: string;
  name: string;
  createdAt: number;
}

export interface SubReading {
  id: string;
  subMeterId: string;
  date: string;
  kwh: number;
  calculatedCost: number;
  priceUsed: number; // The price/kwh used for calculation
}



export enum AppView {
  DASHBOARD = 'DASHBOARD',
  METERS = 'METERS',
  READINGS = 'READINGS',
  SETTINGS = 'SETTINGS'
}

export interface AiAnalysisResult {
  predictions: { month: string; kwh: number; cost: number }[];
  advice: string;
  savingsPotential: string;
}
