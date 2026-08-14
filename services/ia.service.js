/**
 * Service: AI Processor & Prompt Builder
 * Responsabilidad: Construir prompts avanzados con roles, contexto, reglas 
 * y asegurar respuestas estrictas en formato JSON utilizando el SDK oficial de Google Gen AI.
 */

const { GoogleGenAI, Type } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Función auxiliar de reintento para lidiar con picos de alta demanda (503)
 */
const reintentarConexion = async (fn, maxIntentos = 3, delayMs = 1000) => {
  for (let intento = 1; intento <= maxIntentos; intento++) {
    try {
      return await fn();
    } catch (error) {
      // Si es un error de alta demanda (503 / UNAVAILABLE) y quedan intentos, esperamos y reintentamos
      const esSobrecarga = error.message.includes('503') || error.message.includes('UNAVAILABLE') || error.message.includes('high demand');
      if (esSobrecarga && intento < maxIntentos) {
        console.warn(`⚠️ [AiService]: Modelo saturado. Reintento ${intento} de ${maxIntentos} en ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2; // Backoff exponencial
      } else {
        throw error;
      }
    }
  }
};

const consultarGeminiService = async (promptUsuario, systemInstruction = "Eres un mentor de vida y coach de crecimiento personal experto y analítico.") => {
  return reintentarConexion(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: promptUsuario,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });
    return response.text;
  });
};

const generarRespuestaEstructuradaService = async ({ rol, contexto, reglas, schemaJson }) => {
  const reglasTexto = Array.isArray(reglas) 
    ? reglas.map((regla, index) => `${index + 1}. ${regla}`).join('\n') 
    : reglas;

  const promptMaestro = `
  CONTEXTO A ANALIZAR:
  ${typeof contexto === 'string' ? contexto : JSON.stringify(contexto, null, 2)}

  REGLAS ESTRICTAS QUE DEBES CUMPLIR:
  ${reglasTexto}
  `;

  return reintentarConexion(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: promptMaestro,
      config: {
        systemInstruction: rol,
        responseMimeType: 'application/json',
        responseSchema: schemaJson,
        temperature: 0.4,
      }
    });

    return JSON.parse(response.text);
  });
};

module.exports = {
  consultarGeminiService,
  generarRespuestaEstructuradaService,
  Type,
};