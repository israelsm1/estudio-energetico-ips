import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { Meter, Reading, AiAnalysisResult } from "../types";

const getApiKey = () => {
  const keyLocal = localStorage.getItem('ecotrack_gemini_key');
  const keyEnv = process.env.API_KEY;
  console.log("Debug: Checking API Key. LocalStorage:", keyLocal ? "Found (Ends with " + keyLocal.slice(-4) + ")" : "Not Found", "Env:", keyEnv ? "Found" : "Not Found");
  return keyLocal || keyEnv;
}

export const testConnection = async (): Promise<boolean> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("No hay clave API configurada");

  console.log("Debug: Listing models...");
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Error HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    if (!data.models) {
      throw new Error("La respuesta no contiene modelos.");
    }

    const modelNames = data.models.map((m: any) => m.name.replace('models/', '')).join(', ');
    alert(`✅ CLAVE CORRECTA.\nModelos detectados: ${modelNames}`);
    console.log("Debug: Available models:", modelNames);
    return true;

  } catch (error: any) {
    console.error("Debug: List models failed:", error);
    alert("❌ ERROR AL LISTAR MODELOS:\n" + error.message);
    throw error;
  }
};

export const getElectricityPrice = async (dateStr: string): Promise<number> => {
  console.log("Debug: Starting getElectricityPrice for date:", dateStr);
  const apiKey = getApiKey();

  if (!apiKey) {
    console.warn("API_KEY not found in environment variables or localStorage");
    return 0.15; // Fallback default when no API key is present
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

  const date = new Date(dateStr);
  const monthName = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  const prompt = `
    ¿Cuál fue el precio medio del kWh en España (mercado regulado PVPC) para hogares en ${monthName}?
    Responde ÚNICAMENTE con un número decimal en formato JSON representando el precio en Euros/kWh.
    Si la fecha es futura, haz una estimación basada en tendencias.
    Ejemplo de respuesta: {"price": 0.15}
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Clean markdown code blocks if present
    text = text.replace(/```json\n?|\n?```/g, "").trim();

    const json = JSON.parse(text);
    return json.price || 0.15;
  } catch (error: any) {
    console.error("Error fetching price:", error);
    return 0.15; // Fallback
  }
};

export const generateEnergyAnalysis = async (
  meter: Meter,
  readings: Reading[]
): Promise<AiAnalysisResult> => {
  console.log("Debug: Starting generateEnergyAnalysis");
  // Filter readings for this meter and sort by date
  const sortedReadings = readings
    .filter((r) => r.meterId === meter.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (sortedReadings.length < 2) {
    throw new Error("Se necesitan al menos 2 lecturas para realizar un análisis.");
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Falta la Clave API de Google Gemini. Configúrala en Ajustes.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Using gemini-flash-latest (confirmed available in API)
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

  // Prepare context for the AI
  const historicalDataStr = JSON.stringify(
    sortedReadings.map((r) => ({
      date: r.date,
      gridKwh: r.kwh,
      solarKwh: r.solarKwh || 0,
      cost: r.cost,
    }))
  );

  const prompt = `
    Actúa como un experto consultor energético. Analiza los siguientes datos históricos de consumo eléctrico para el contador "${meter.name}" ubicado en "${meter.location}".
    
    Datos Históricos: ${historicalDataStr}

    Tu tarea es:
    1. Predecir el consumo DE RED (kWh) y el coste (Euros) para los próximos 3 meses.
    2. Proporcionar un consejo breve y práctico para ahorrar.
    3. Estimar un potencial de ahorro mensual en Euros.

    Responde EXCLUSIVAMENTE con un JSON válido con esta estructura: 
    {
      "predictions": [{"month": "Nombre Mes", "kwh": 0, "cost": 0}],
      "advice": "Texto del consejo",
      "savingsPotential": "XX €"
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    text = text.replace(/```json\n?|\n?```/g, "").trim();
    const json = JSON.parse(text);
    return json as AiAnalysisResult;
  } catch (error: any) {
    console.error("Error calling Gemini API:", error);

    // Pass the actual error message to the UI
    let errorMsg = error.message || "Error desconocido";

    if (errorMsg.includes("404")) errorMsg = "Modelo no encontrado (404). Verifica el nombre del modelo.";
    if (errorMsg.includes("400")) errorMsg = "Petición inválida (400). Verifica los datos.";
    if (errorMsg.includes("API key")) errorMsg = "Clave API inválida.";

    throw new Error(errorMsg);
  }
};