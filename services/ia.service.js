/**
 * Service: AI Processor & Prompt Builder
 * Responsabilidad: Construir prompts avanzados con roles, contexto, reglas 
 * y asegurar respuestas estrictas en formato JSON utilizando el SDK oficial de Google Gen AI.
 */

const { GoogleGenAI, Type } = require('@google/genai');

// Inicializa el cliente oficial (detecta automáticamente la variable GEMINI_API_KEY del .env)
const ai = new GoogleGenAI();

/**
 * Función genérica para enviar consultas libres a Gemini
 */
const consultarGeminiService = async (promptUsuario, systemInstruction = "Eres un asistente financiero experto y analítico.") => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: promptUsuario,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });

    return response.text();
  } catch (error) {
    const err = new Error(`Error al comunicarse con la IA: ${error.message}`);
    err.statusCode = 500;
    throw err;
  }
};

/**
 * Función avanzada para estructurar prompts con reglas estrictas y salida JSON forzada.
 * 
 * @param {Object} params
 * @param {string} params.rol - El rol que debe asumir la IA (ej: "Eres un asesor financiero personal empático...")
 * @param {string|Object} params.contexto - Los datos o información cruda (ej: el resumen general del usuario en JSON)
 * @param {string[]} params.reglas - Lista de reglas o restricciones que la IA debe cumplir
 * @param {Object} params.schemaJson - Objeto de esquema compatible con @google/genai (Type) para estructurar el JSON
 * @returns {Promise<Object>} - Retorna el objeto JSON parseado y validado
 */
const generarRespuestaEstructuradaService = async ({ rol, contexto, reglas, schemaJson }) => {
  try {
    // 1. Construir las reglas formateadas como texto limpio
    const reglasTexto = Array.isArray(reglas) 
      ? reglas.map((regla, index) => `${index + 1}. ${regla}`).join('\n') 
      : reglas;

    // 2. Armar el prompt maestro combinando el contexto y las reglas de negocio
    const promptMaestro = `
    CONTEXTO A ANALIZAR:
    ${typeof contexto === 'string' ? contexto : JSON.stringify(contexto, null, 2)}

    REGLAS ESTRICTAS QUE DEBES CUMPLIR:
    ${reglasTexto}
    `;

    // 3. Llamar a Gemini utilizando Structured Outputs (Garantiza que la respuesta cumpla el schema)
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: promptMaestro,
      config: {
        systemInstruction: rol,
        responseMimeType: 'application/json',
        responseSchema: schemaJson,
        temperature: 0.4, // Temperatura moderada-baja para respetar con precisión las reglas y el formato
      }
    });

    // 4. Retornar el JSON ya parseado listo para el controlador y la app de Flutter
    return JSON.parse(response.text());
  } catch (error) {
    const err = new Error(`Error al generar respuesta estructurada con IA: ${error.message}`);
    err.statusCode = 500;
    throw err;
  }
};

module.exports = {
  consultarGeminiService,
  generarRespuestaEstructuradaService,
  Type // Exportamos Type para que puedas definir fácilmente los tipos en tus esquemas JSON
};