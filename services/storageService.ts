
import { Meter, Reading, SubMeter, SubReading } from '../types';

const METERS_KEY = 'ecotrack_meters';
const READINGS_KEY = 'ecotrack_readings';
const SUBMETERS_KEY = 'ecotrack_submeters';
const SUBREADINGS_KEY = 'ecotrack_subreadings';

export const getMeters = (): Meter[] => {
  try {
    const data = localStorage.getItem(METERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Error loading meters", e);
    return [];
  }
};

export const saveMeters = (meters: Meter[]): void => {
  localStorage.setItem(METERS_KEY, JSON.stringify(meters));
};

export const getReadings = (): Reading[] => {
  try {
    const data = localStorage.getItem(READINGS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Error loading readings", e);
    return [];
  }
};

export const saveReadings = (readings: Reading[]): void => {
  localStorage.setItem(READINGS_KEY, JSON.stringify(readings));
};

export const getSubMeters = (): SubMeter[] => {
  try {
    const data = localStorage.getItem(SUBMETERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const saveSubMeters = (subMeters: SubMeter[]): void => {
  localStorage.setItem(SUBMETERS_KEY, JSON.stringify(subMeters));
};

export const getSubReadings = (): SubReading[] => {
  try {
    const data = localStorage.getItem(SUBREADINGS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const saveSubReadings = (subReadings: SubReading[]): void => {
  localStorage.setItem(SUBREADINGS_KEY, JSON.stringify(subReadings));
};

export const exportDataToJSON = () => {
  const meters = getMeters();
  const readings = getReadings();
  const subMeters = getSubMeters();
  const subReadings = getSubReadings();
  const backup = {
    version: 1,
    timestamp: Date.now(),
    data: { meters, readings, subMeters, subReadings }
  };
  return JSON.stringify(backup, null, 2);
};

export const importDataFromJSON = (jsonString: string): { success: boolean; message?: string } => {
  try {
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e) {
      return { success: false, message: "El archivo no es un JSON válido." };
    }

    // Determine the data source. It could be:
    // 1. A full backup object with a 'data' property
    // 2. The data object itself (direct export)
    // 3. A partial object
    let dataToImport = parsed;

    // If it has the standard backup structure with 'data', use that
    if (parsed && parsed.data && typeof parsed.data === 'object') {
      dataToImport = parsed.data;
    }

    const { meters, readings, subMeters, subReadings } = dataToImport;

    // Validation: At least one known key must exist to be considered valid
    // Checks for both English (internal) and Spanish (export) keys
    if (!meters && !readings && !subMeters && !subReadings &&
      !dataToImport.contadores && !dataToImport.lecturas) {
      // Fallback: check if the parsed object IS an array of meters (legacy simple export? unlikely but safe)
      if (!Array.isArray(parsed)) {
        return { success: false, message: "No se encontraron datos reconocibles (contadores, lecturas, etc)." };
      }
    }

    // Save found data (mapping Spanish keys if present)
    const rawMeters = meters || dataToImport.contadores;
    const rawReadings = readings || dataToImport.lecturas;
    const rawSubMeters = subMeters || dataToImport.subContadores;
    const rawSubReadings = subReadings || dataToImport.subLecturas;

    if (rawMeters && Array.isArray(rawMeters)) {
      const mappedMeters = rawMeters.map((m: any) => ({
        id: m.id,
        name: m.name || m.nombre || 'Sin Nombre',
        location: m.location || m.cups || '',
        createdAt: m.createdAt ? new Date(m.createdAt).getTime() : Date.now()
      }));
      saveMeters(mappedMeters);
    }

    if (rawReadings && Array.isArray(rawReadings)) {
      const mappedReadings = rawReadings.map((r: any) => ({
        id: r.id,
        meterId: r.meterId || r.contadorId,
        date: r.date || (r.fecha ? r.fecha.substring(0, 7) : ''), // Ensure YYYY-MM
        kwh: Number(r.kwh || r.consumoRed || 0),
        solarKwh: r.solarKwh || r.produccionSolar ? Number(r.solarKwh || r.produccionSolar) : undefined,
        cost: Number(r.cost || r.coste || 0),
        notes: r.notes || ''
      }));
      saveReadings(mappedReadings);
    }

    if (rawSubMeters && Array.isArray(rawSubMeters)) saveSubMeters(rawSubMeters);
    if (rawSubReadings && Array.isArray(rawSubReadings)) saveSubReadings(rawSubReadings);

    return { success: true };
  } catch (e) {
    console.error("Error importing data", e);
    return { success: false, message: e instanceof Error ? e.message : "Error desconocido al importar." };
  }
};

export const clearAllData = () => {
  localStorage.removeItem(METERS_KEY);
  localStorage.removeItem(READINGS_KEY);
  localStorage.removeItem(SUBMETERS_KEY);
  localStorage.removeItem(SUBREADINGS_KEY);
};
