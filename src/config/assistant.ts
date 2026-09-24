/**
 * Configuración de Jeipy AI.
 * `prototype: true` mientras el asistente funcione con el motor local de reglas:
 * se muestra la etiqueta "Prototipo" y los datos de contacto no se envían a ningún servidor.
 */
export const assistantConfig = {
  name: "Jeipy AI",
  status: "Asistente inteligente",
  prototype: true,
  /** Pausa simulada de "análisis" antes de cada respuesta (ms). */
  thinkingDelay: { base: 450, perCharacter: 4, max: 1400 },
  suggestions: [
    "¿Qué plan me conviene?",
    "Quiero digitalizar mi negocio",
    "¿Qué incluye cada plan?",
    "Quiero automatizar mi negocio",
  ],
  launcherHint: "¿Te ayudo a elegir?",
} as const;
