/**
 * Controller: Cartera IA (Tarjeta Diaria)
 * Responsabilidad: Orquestar la obtención de datos, construir el prompt estructurado
 * y enviar la respuesta a la app móvil.
 */

const { obtenerResumenGeneralService } = require('../services/resumenGeneral.service');
const { generarRespuestaEstructuradaService, Type } = require('../services/ia.service');
const { usuarioIdSchema } = require('../validators/carteraRecurrente.validator');

const getTarjetaDiariaInteligente = async (req, res, next) => {
  try {
    // 1. Validar el ID del usuario autenticado
    const usuarioId = usuarioIdSchema.parse(req.user?.id);

    // 2. Recolectar toda la información global de la base de datos (Indicadores, Logros, Deseos, Cartera, Movimientos)
    const resumenGeneral = await obtenerResumenGeneralService(usuarioId);

    // 3. Redefinir el rol, reglas y enfoque hacia un Mentor de Vida y Crecimiento Personal
    const rol = "Eres un mentor de vida de élite, coach de crecimiento personal y estratega de alto rendimiento. Tu misión es ayudar al usuario a ordenar su vida, alinear sus hábitos, celebrar sus logros y guiarlo hacia su mejor versión en todas las áreas (mentalidad, metas, enfoque y finanzas).";
    
    const reglas = [
      "Analiza el panorama completo del usuario: sus indicadores de vida, logros alcanzados, lista de deseos y su situación de cartera.",
      "No te limites a lo financiero; usa las finanzas solo como un reflejo o herramienta cuando sea verdaderamente relevante para su bienestar general.",
      "Genera una frase motivacional profunda, retadora y enfocada en la mentalidad de crecimiento y disciplina.",
      "Genera un consejo de vida o de acción práctica y directa que le ayude a ordenar su día, avanzar en sus metas personales o ajustar sus hábitos.",
      "Mantén un tono empático, exigente pero comprensivo, inspirando claridad mental y orden."
    ];

    console.log("DEBUG: ¿Qué es Type?", Type);
    const schemaJson = {
      type: "object",
      properties: {
        frase_motivacional: { 
          type: "string",
          description: "Frase motivacional de alto rendimiento..." 
        },
        consejo_financiero: { 
          type: "string", 
          description: "Consejo de vida, hábitos, organización..." 
        }
      },
      required: ['frase_motivacional', 'consejo_financiero']
    };

    // 4. Llamar al servicio estructurado de IA con la visión global
    const resultadoIa = await generarRespuestaEstructuradaService({
      rol,
      contexto: resumenGeneral,
      reglas,
      schemaJson
    });

    // 5. Retornar la respuesta exitosa al cliente para la app en Flutter
    return res.status(200).json({
      status: 'success',
      data: resultadoIa
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTarjetaDiariaInteligente,
};