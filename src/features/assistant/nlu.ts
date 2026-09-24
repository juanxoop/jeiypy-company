/**
 * Comprensión de texto del motor local (sin IA): normaliza, detecta intenciones
 * y extrae datos del perfil a partir de lenguaje libre en español.
 */
import type { UnknownTopic } from "./knowledge";
import type { AiLevel, AiTierId, Budget, Feature, FeatureMap, Goal, PlanId, Profile, WebsiteStatus } from "./types";

export function normalize(text: string): string {
  return ` ${text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/(?<!\d)[.,]|[.,](?!\d)/g, " ")
    .replace(/[¿?¡!;:()"'$]/g, " ")
    .replace(/\s+/g, " ")
    .trim()} `;
}

const has = (text: string, ...needles: string[]) => needles.some((n) => text.includes(n));

/** El mensaje es una pregunta (signos o palabras interrogativas al inicio). */
export function isQuestion(raw: string): boolean {
  return /[?¿]/.test(raw) || /^ (que|cual|cuales|cuanto|cuanta|como|donde|cuando|hacen|tienen|pueden|puedo|es posible) /.test(normalize(raw));
}

/* ---------------------------------------------------------------
   Intenciones
   --------------------------------------------------------------- */

export type Intent =
  /** El visitante dio una cifra de presupuesto ("tengo 700 mil", "máximo un millón"). */
  | { type: "budget"; amount: number }
  /** Descarta funciones ("no quiero reservas", "sin IA"). */
  | { type: "drop-feature"; features: Feature[] }
  /** "No necesito todo eso", "prefiero comenzar pequeño". */
  | { type: "objection-scope" }
  /** "Solo necesito aparecer en internet". */
  | { type: "presence" }
  /** "¿Después podría ponerle IA?" */
  | { type: "upgrade-later"; feature?: Feature }
  | { type: "not-understood" }
  | { type: "callback" }
  | { type: "retry-submit" }
  | { type: "human" }
  | { type: "lead" }
  | { type: "advance" }
  | { type: "quote" }
  | { type: "recommend" }
  | { type: "plans-overview" }
  | { type: "automate" }
  | { type: "which-best" }
  | { type: "unsure" }
  | { type: "digitalize" }
  | { type: "objection-price" }
  | { type: "think-later" }
  | { type: "guarantee" }
  | { type: "ai-info" }
  | { type: "ai-pricing" }
  | { type: "ai-monthly" }
  /** Un nivel concreto de Jeipy AI; `wants`: lo quiere (CTA), no solo pregunta por él. */
  | { type: "ai-tier"; tier: AiTierId; wants: boolean }
  | { type: "plan-info"; planId: PlanId }
  /** `plans`: los planes mencionados; vacío = "esos dos", se resuelve con el contexto. */
  | { type: "compare"; plans: PlanId[] }
  | { type: "prices" }
  | { type: "services" }
  | { type: "about" }
  | { type: "process" }
  | { type: "unknown-topic"; topic: UnknownTopic }
  | { type: "greeting" }
  | { type: "thanks" }
  | { type: "restart" };

const PLAN_WORDS: Record<PlanId, string> = { basico: " basico", esencial: " esencial", premium: " premium" };

/** Intenciones que nunca son el nombre de un negocio ("me parece caro", "¿y la mensualidad?"). */
const CONVERSATIONAL_INTENTS = new Set<string>([
  "human", "lead", "objection-price", "think-later", "guarantee", "unsure", "which-best",
  "ai-monthly", "ai-pricing", "ai-tier", "prices", "compare", "thanks", "restart", "callback",
]);

/** "Jeipy AI Lite" → "lite". Pro solo cuenta junto a "ai"/"ia"/"jeipy" para no confundirlo con otras palabras. */
export function extractAiTier(t: string): AiTierId | undefined {
  if (has(t, " lite ")) return "lite";
  if (has(t, " ai pro", " ia pro", " jeipy pro", " version pro", " nivel pro")) return "pro";
  if (has(t, " ai custom", " ia custom", " jeipy custom", " custom ")) return "custom";
  return undefined;
}

const PLAN_WORDS_LIST = Object.entries(PLAN_WORDS) as [PlanId, string][];
export function mentionedPlans(t: string): PlanId[] {
  return PLAN_WORDS_LIST.filter(([, word]) => t.includes(word)).map(([id]) => id);
}

/** Palabras que niegan lo que viene después ("no quiero", "sin", "tampoco", "ni"). */
const NEGATION = / (no|sin|nada de|tampoco|ni) /;

/** Detecta la intención principal. El orden define la prioridad. */
export function detectIntent(raw: string): Intent | null {
  const t = normalize(raw);

  if (has(t, " empezar de nuevo", " reiniciar", " nueva conversacion")) return { type: "restart" };

  if (has(t, " reintentar envio", " reintentar el envio", " enviar de nuevo")) return { type: "retry-submit" };
  // Solicitud de llamada: va antes que "asesor" porque es más concreta.
  if (has(t, " que me llamen", " llamenme", " me llamen", " me pueden llamar", " me puedes llamar", " solicitar una llamada", " pedir una llamada", " quiero una llamada"))
    return { type: "callback" };

  // Atención humana: pedirla de forma explícita. Mencionar WhatsApp como canal del negocio no cuenta.
  if (
    has(t, " asesor", " humano", " una persona", " alguien del equipo", " hablar con alguien", " agente", " llamar", " llamada") ||
    /(hablar|escribir|continuar|seguir|contactar|pasar|pasame|numero de|su|tu) (por |al |de )?whatsapp/.test(t)
  ) {
    return { type: "human" };
  }
  if (has(t, " dejar mis datos", " dejo mis datos", " que me contacten", " contactenme", " me pueden contactar", " escribanme"))
    return { type: "lead" };

  // Presupuesto explícito: la cifra manda sobre cualquier otra lectura del mensaje.
  const budget = extractBudgetStatement(raw);
  if (budget) return { type: "budget", amount: budget };

  // Descartar funciones ("no quiero reservas", "sin IA"): cambia el perfil, no es una pregunta.
  const dropped = (Object.entries(extractFeatures(raw)) as [Feature, boolean][]).filter(([, v]) => v === false).map(([f]) => f);
  if (dropped.length && NEGATION.test(t)) return { type: "drop-feature", features: dropped };

  if (has(t, " no entendi", " no entiendo", " no me quedo claro", " explicame mejor", " explicamelo", " como asi ", " no comprendo", " me perdi"))
    return { type: "not-understood" };

  // Mensualidad de Jeipy AI: nunca se inventa un valor.
  if (has(t, " mensualidad", " mensual", " al mes", " cada mes", " por mes", " mantenimiento")) return { type: "ai-monthly" };

  // Niveles de Jeipy AI (Lite, Pro, Custom).
  const tier = extractAiTier(t);
  if (tier) {
    const wants = has(t, " quiero", " agregar", " anadir", " sumar", " consultar", " me interesa", " contratar", " automatizar mi negocio");
    return { type: "ai-tier", tier, wants };
  }

  if (has(t, " quiero avanzar", " quiero contratar", " quiero empezar", " quiero arrancar", " empecemos", " vamos con", " lo quiero", " me lo llevo", " quiero ese plan"))
    return { type: "advance" };

  if (
    has(
      t,
      " caro", " costoso", " muy alto", " sigue siendo alto", " no me alcanza", " no tengo tanto", " sale mucho",
      " mucha plata", " mucho dinero", " fuera de mi presupuesto", " fuera del presupuesto", " sale de mi presupuesto",
      " se sale de mi", " pasa de mi presupuesto", " mas barato", " mas barata", " economico", " economica", " no puedo pagar",
      " no puedo invertir", " no me da el presupuesto", " menos plata", " menos dinero", " mas bajo", " rebaja", " descuento",
    )
  )
    return { type: "objection-price" };
  if (
    has(
      t, " no necesito todo eso", " no necesito tanto", " es demasiado", " demasiadas cosas", " algo mas sencillo", " algo mas simple",
      " algo sencillo", " comenzar pequeno", " empezar pequeno", " iniciar pequeno", " empezar con poco", " comenzar con poco",
      " lo minimo", " lo justo", " paso a paso", " por etapas", " poco a poco",
    )
  )
    return { type: "objection-scope" };
  if (
    has(t, " despues", " mas adelante", " luego", " en el futuro", " con el tiempo") &&
    has(t, " podria", " puedo", " se puede", " agregar", " anadir", " sumar", " ponerle", " poner", " ampliar", " subir", " mejorar", " cambiar")
  ) {
    const feature = (Object.entries(extractFeatures(raw)) as [Feature, boolean][]).find(([, v]) => v)?.[0];
    return { type: "upgrade-later", feature };
  }
  if (
    has(
      t, " aparecer en internet", " aparecer profesionalmente", " aparezca en internet", " que me encuentren", " me encuentren en internet",
      " presencia en internet", " estar en internet", " tener presencia", " solo una pagina", " solo quiero una pagina", " pagina sencilla",
      " una pagina basica", " verme profesional en internet",
    )
  )
    return { type: "presence" };
  if (
    has(
      t, " lo voy a pensar", " lo pienso", " lo pensare", " quiero pensarlo", " dejame pensarlo", " tengo que pensarlo", " pensarlo",
      " mas adelante lo", " despues te escribo", " luego te aviso", " todavia no estoy listo", " lo consulto", " lo hablo con",
    )
  )
    return { type: "think-later" };
  if (has(t, " garantiz", " garantia", " aseguran", " seguro que", " resultados seguros", " prometen"))
    return { type: "guarantee" };
  if (has(t, " no se que necesito", " no se que plan", " no estoy seguro de que", " no tengo claro", " no se por donde", " no se que quiero"))
    return { type: "unsure" };
  if (has(t, " cual es mejor", " cual es el mejor", " que plan es mejor", " cual recomiendan", " cual me recomiendas")) return { type: "which-best" };

  if (has(t, " cotiz", " cotizacion", " presupuesto para", " cuanto me cuesta", " cuanto costaria", " cuanto vale una", " cuanto cuesta una"))
    return { type: "quote" };
  if (has(t, " que incluye cada", " que incluyen los planes", " que trae cada plan", " que tiene cada plan", " que ofrece cada plan"))
    return { type: "plans-overview" };
  if (has(t, " quiero automatizar", " automatizar mi negocio", " automatizar el negocio", " automatizar mi empresa")) return { type: "automate" };
  if (has(t, " continuar el diagnostico", " seguir con el diagnostico", " estimar mi caso")) return { type: "recommend" };
  if (has(t, " que plan", " cual plan", " me conviene", " recomiend", " cual me sirve", " cual elijo", " ayudame a elegir", " que me sirve"))
    return { type: "recommend" };
  if (has(t, " digitaliz", " tengo un negocio", " tengo una empresa", " tengo un emprendimiento")) return { type: "digitalize" };
  const aboutAi = has(t, " jeipy ai", " asistente", " inteligencia artificial", " ia ", " chatbot", " bot ", " automatiz");
  if ((aboutAi && has(t, " precio", " cuesta", " cuanto", " costo", " valor", " vale", " cobran")) || has(t, " niveles de jeipy", " niveles de ia"))
    return { type: "ai-pricing" };
  if (aboutAi) return { type: "ai-info" };

  const mentioned = mentionedPlans(t);
  if (mentioned.length > 1 || has(t, " diferencia", " comparar", " compara", " versus", " vs ", " esos dos", " entre ambos", " entre los dos"))
    return { type: "compare", plans: mentioned };
  if (mentioned.length === 1) return { type: "plan-info", planId: mentioned[0] };

  if (has(t, " tiempo", " tarda", " demora", " plazo", " cuando estaria", " dias", " semanas")) return { type: "unknown-topic", topic: "timeline" };
  if (has(t, " forma de pago", " formas de pago", " pagar", " pago ", " cuotas", " anticipo", " tarjeta")) return { type: "unknown-topic", topic: "payment" };
  if (has(t, " dominio", " hosting", " hospedaje", " servidor")) return { type: "unknown-topic", topic: "hosting" };
  if (has(t, " tienda online", " tiendas online", " tienda virtual", " tiendas virtuales", " ecommerce", " e-commerce", " carrito", " pagos en linea", " pagos online", " con pagos", " pasarela"))
    return { type: "unknown-topic", topic: "ecommerce" };

  if (has(t, " precio", " cuesta", " cuanto vale", " costo", " tarifa", " valor", " planes")) return { type: "prices" };
  if (has(t, " servicio", " que hacen", " que ofrecen", " a que se dedican")) return { type: "services" };
  if (has(t, " quienes son", " que es jeipy", " jeipy company", " sobre ustedes", " quien es jeipy")) return { type: "about" };
  if (has(t, " proceso", " como trabajan", " pasos", " como funciona el servicio", " metodologia")) return { type: "process" };
  if (has(t, " gracias")) return { type: "thanks" };
  if (/^ (hola|buenas|buenos dias|buenas tardes|buenas noches|hey|holi) /.test(t)) return { type: "greeting" };

  return null;
}

/* ---------------------------------------------------------------
   Extracción de datos del perfil
   --------------------------------------------------------------- */

/** Rubros frecuentes → etiqueta legible. Las claves ya están normalizadas. */
const BUSINESS_TYPES: [string, string][] = [
  ["barberia", "barbería"],
  ["peluqueria", "peluquería"],
  ["salon de belleza", "salón de belleza"],
  ["spa", "spa"],
  ["manicure", "salón de uñas"],
  ["restaurante", "restaurante"],
  ["cafeteria", "cafetería"],
  ["cafe ", "café"],
  ["panaderia", "panadería"],
  ["pasteleria", "pastelería"],
  ["comidas rapidas", "negocio de comidas rápidas"],
  ["tienda de ropa", "tienda de ropa"],
  ["boutique", "boutique"],
  ["tienda", "tienda"],
  ["ferreteria", "ferretería"],
  ["taller", "taller"],
  ["consultorio", "consultorio"],
  ["odontolog", "consultorio odontológico"],
  ["clinica", "clínica"],
  ["veterinaria", "veterinaria"],
  ["gimnasio", "gimnasio"],
  ["gym", "gimnasio"],
  ["fotograf", "estudio de fotografía"],
  ["abogad", "firma de abogados"],
  ["contador", "servicios contables"],
  ["contable", "servicios contables"],
  ["inmobiliaria", "inmobiliaria"],
  ["hotel", "hotel"],
  ["hostal", "hostal"],
  ["academia", "academia"],
  ["floristeria", "floristería"],
  ["joyeria", "joyería"],
  ["optica", "óptica"],
  ["drogueria", "droguería"],
  ["papeleria", "papelería"],
  ["lavanderia", "lavandería"],
  ["constructora", "constructora"],
  ["agencia", "agencia"],
  ["estetica", "centro de estética"],
  ["tatuaje", "estudio de tatuajes"],
];

/** Negocios donde reservar o agendar suele ser clave. */
const BOOKING_BUSINESSES = [
  "barber", "peluquer", "salon", "spa", "manicure", "consultorio", "odontolog", "clinica", "veterinaria",
  "gimnasio", "estetica", "tatuaje", "hotel", "hostal", "fotograf", "restaurante",
];

/** El rubro es uno de los conocidos (permite frases como "tu barbería"). */
export function isKnownBusiness(businessType?: string): boolean {
  return Boolean(businessType && BUSINESS_TYPES.some(([, label]) => label === businessType));
}

export function isBookingBusiness(businessType?: string): boolean {
  if (!businessType) return false;
  const t = normalize(businessType);
  return BOOKING_BUSINESSES.some((b) => t.includes(b));
}

export function extractBusinessType(raw: string, { loose = false } = {}): string | undefined {
  const t = normalize(raw);
  const known = BUSINESS_TYPES.find(([key]) => t.includes(` ${key}`));
  if (known) return known[1];

  const match = t.match(/ (?:tengo|manejo|administro) (?:un|una) ([a-z ]{3,40}?)(?: y | que | con | en | para |$| )/);
  if (match && !/(negocio|empresa|emprendimiento|pagina|web)$/.test(match[1].trim())) return match[1].trim();

  // Respuesta directa a "¿qué tipo de negocio tienes?": solo si no es una pregunta ni otra respuesta.
  const looksLikeOtherAnswer =
    /^ (quiero|verme|conseguir|mostrar|automatizar|vender|tener|mas|solo) /.test(t) ||
    CONVERSATIONAL_INTENTS.has(detectIntent(raw)?.type ?? "");
  if (loose && !isQuestion(raw) && !parseYesNo(raw) && !extractWebsite(raw) && !looksLikeOtherAnswer) {
    const answer = t.trim().replace(/^(es |soy |tengo )?(un |una |el |la )?/, "");
    if (answer.length >= 3 && answer.split(" ").length <= 5) return answer;
  }
  return undefined;
}

export function extractWebsite(raw: string, { direct = false } = {}): WebsiteStatus | undefined {
  const t = normalize(raw);
  if (has(t, " solo redes", " solo instagram", " solo facebook", " solo whatsapp", " solo tengo instagram", " solo tengo facebook", " redes sociales", " redes y whatsapp", " manejo redes"))
    return "social";
  if (has(t, " no tengo pagina", " no tengo web", " no tengo sitio", " sin pagina", " sin web", " todavia no tengo", " aun no tengo", " no tengo nada"))
    return "no";
  if (has(t, " ya tengo pagina", " ya tengo web", " ya tengo una pagina", " ya tengo un sitio", " tengo pagina", " tengo una pagina web", " tengo web"))
    return "yes";
  if (direct) {
    if (/^ (si|claro|ya|sip|correcto)\b/.test(t)) return "yes";
    if (/^ (no|nop|todavia no|aun no|nada)\b/.test(t)) return "no";
  }
  return undefined;
}

export function extractGoal(raw: string): Goal | undefined {
  const t = normalize(raw);
  if (has(t, " vender", " ventas", " vendo")) return "sell";
  if (has(t, " clientes", " captar", " atraer", " crecer")) return "clients";
  if (has(t, " automatiz", " atender", " responder", " preguntas frecuentes")) return "automate";
  if (has(t, " profesional", " imagen", " credibilidad", " confianza", " seriedad")) return "image";
  if (has(t, " mostrar", " catalogo", " exhibir", " informar", " dar a conocer", " conocer")) return "showcase";
  return undefined;
}

const FEATURE_KEYWORDS: Record<Feature, string[]> = {
  catalog: [" catalogo", " productos", " servicios y precios", " precios", " menu", " carta", " portafolio de", " mostrar mis servicios"],
  booking: [" reserva", " reserven", " agenda", " agendar", " cita", " citas", " turno"],
  forms: [" formulario", " solicitudes", " cotizaciones de clientes"],
  ai: [" preguntas frecuentes", " automatiz", " asistente", " inteligencia artificial", " chatbot", " responder automatic", " una ia", " la ia", " ia "],
  automation: [
    " clasific", " seguimiento", " cotizaciones automatic", " cotizacion automatic", " cotice", " flujos", " procesos",
    " automatizar procesos", " automatice", " gestione", " embudo",
  ],
  integrations: [" integracion con", " integrar", " crm", " sistema de inventario", " software"],
  seo: [" google", " seo", " aparecer en", " posicionamiento", " buscadores"],
};

/** Funciones que el visitante menciona espontáneamente (solo afirmaciones). */
/**
 * ¿La palabra en `index` está negada? Mira las palabras anteriores dentro de la misma frase:
 * "no quiero reservas" → negada; "no tengo web y quiero reservas" → no ("y" abre otra idea).
 */
function negatedAt(t: string, index: number): boolean {
  const before = t.slice(Math.max(0, index - 40), index + 1);
  const clause = before.split(/ pero | sino | aunque | y | mas bien | ademas |, /).pop() ?? "";
  return NEGATION.test(` ${clause.trim()} `);
}

/** Funciones que menciona el mensaje: `true` si las quiere, `false` si las descarta. */
export function extractFeatures(raw: string): FeatureMap {
  const t = normalize(raw);
  const found: FeatureMap = {};
  for (const feature of Object.keys(FEATURE_KEYWORDS) as Feature[]) {
    for (const keyword of FEATURE_KEYWORDS[feature]) {
      const index = t.indexOf(keyword);
      if (index === -1) continue;
      const negated = negatedAt(t, index);
      // Una mención positiva gana sobre una negada ("no quiero reservas pero sí citas" es raro; "sin IA" no).
      if (!negated) found[feature] = true;
      else if (found[feature] === undefined) found[feature] = false;
    }
  }
  return found;
}

const BUDGET_CONTEXT = [
  " tengo", " presupuesto", " maximo", " hasta", " puedo gastar", " puedo pagar", " puedo invertir", " cuento con", " dispongo",
  " invertir", " alcanza", " mi limite", " tope", " no mas de", " menos de", " como mucho", " a lo sumo",
];

/** Cifra de presupuesto dicha en texto libre, solo si el contexto lo deja claro (no un teléfono). */
export function extractBudgetStatement(raw: string): number | undefined {
  const t = normalize(raw);
  if (!has(t, ...BUDGET_CONTEXT) && !/^ \$?\s?[\d.,]+ ?(mil|millon|millones|k)? $/.test(t)) return undefined;
  const budget = extractBudget(raw);
  if (!budget || budget === "skipped") return undefined;
  return budget.amount >= 100_000 && budget.amount <= 100_000_000 ? budget.amount : undefined;
}

/** Quiere algo de forma explícita: puede cambiar una respuesta anterior ("ahora sí quiero reservas"). */
const EXPLICIT_WANT = [" quiero", " necesito", " me gustaria", " tambien", " ahora si", " si quiero", " agreguemos", " sumemos"];

export type YesNo = "yes" | "no" | "later" | undefined;

export function parseYesNo(raw: string): YesNo {
  const t = normalize(raw);
  if (/^ (mas adelante|despues|luego|quizas|tal vez|puede ser|no se|no estoy seguro)\b/.test(t)) return "later";
  if (/^ (si|claro|obvio|por supuesto|me gustaria|me interesa|dale|ok|vale|sip|seria ideal|lo necesito|quiero)\b/.test(t)) return "yes";
  if (/^ (no|nop|nel|para nada|no lo necesito|no por ahora|por ahora no|ninguno|ninguna)\b/.test(t)) return "no";
  return undefined;
}

/** Montos como "800 mil", "1 millón", "$1.500.000", "2M", "900k". */
export function extractBudget(raw: string): Budget | undefined {
  const t = normalize(raw);
  if (has(t, " prefiero no", " no se ", " no tengo idea", " omitir", " no quiero decir", " saltar", " no estoy seguro")) return "skipped";

  if (has(t, " millon y medio", " millon quinientos")) return { amount: 1_500_000 };
  if (has(t, " medio millon")) return { amount: 500_000 };
  const wordMillions = t.match(/ (un|uno|dos|tres|cuatro|cinco) millon(?:es)?(?: (\d{3}) mil)?/);
  if (wordMillions) {
    const base = { un: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5 }[wordMillions[1] as "un"] * 1_000_000;
    return { amount: base + (wordMillions[2] ? Number(wordMillions[2]) * 1_000 : 0) };
  }
  const millions = t.match(/(\d+(?:[.,]\d+)?) ?(?:millon|millones|m )/);
  if (millions) return { amount: Math.round(parseFloat(millions[1].replace(",", ".")) * 1_000_000) };

  const thousands = t.match(/(\d+(?:[.,]\d+)?) ?(?:mil|k )/);
  if (thousands) return { amount: Math.round(parseFloat(thousands[1].replace(",", ".")) * 1_000) };

  const plain = raw.match(/\$?\s?(\d{1,3}(?:[.,]\d{3})+|\d{5,})/);
  if (plain) return { amount: Number(plain[1].replace(/[.,]/g, "")) };
  return undefined;
}

const ADVANCED_AI = [" clasific", " seguimiento", " gestione", " automatice", " procesos", " flujos", " cotice", " cotizaciones automatic", " reserven", " reservas automatic", " agende"];
const BASIC_AI = [" preguntas frecuentes", " responda", " responder", " dudas", " explique", " oriente", " orientar", " recomiende"];

/** Nivel de IA que se deduce del texto (solo cuando se habla de IA o automatización). */
export function extractAiLevel(raw: string): AiLevel | undefined {
  const t = normalize(raw);
  if (has(t, ...ADVANCED_AI)) return "advanced";
  if (has(t, ...BASIC_AI)) return "basic";
  return undefined;
}

/** Respuesta a "¿solo responder dudas… o también automatizar reservas, cotizaciones o procesos?" */
export function parseAiLevelAnswer(raw: string): AiLevel | undefined {
  const t = normalize(raw);
  if (has(t, " tambien", " automatiz", " reserva", " cotizacion", " procesos", " avanzad", " todo")) {
    return has(t, " solo ") && !has(t, " tambien") ? "basic" : "advanced";
  }
  if (has(t, " solo", " dudas", " responder", " captar", " basic", " sencill", " informacion")) return "basic";
  return undefined;
}

/** Aplica al perfil todo lo que se pueda deducir de un mensaje libre. */
export function enrichProfile(profile: Profile, raw: string): Profile {
  const next: Profile = { ...profile, features: { ...profile.features } };
  next.businessType ??= extractBusinessType(raw);
  next.website ??= extractWebsite(raw);
  next.goal ??= extractGoal(raw);
  const t = normalize(raw);
  const explicit = has(t, ...EXPLICIT_WANT);
  for (const [feature, value] of Object.entries(extractFeatures(raw)) as [Feature, boolean][]) {
    // Descartar siempre cuenta (es un cambio de opinión); sumar, si es nuevo o se pide de forma explícita.
    if (value === false || next.features[feature] === undefined || explicit) next.features[feature] = value;
  }
  if (next.features.ai === false) {
    next.aiLevel = undefined;
    next.aiTier = undefined;
  }
  if (next.features.ai && !next.aiLevel) next.aiLevel = extractAiLevel(raw);
  const budget = extractBudgetStatement(raw);
  if (budget) next.budget = { amount: budget };
  return next;
}

/* ---------------------------------------------------------------
   Datos de contacto (solo durante la captura de un lead)
   --------------------------------------------------------------- */

const capitalizeWords = (value: string) =>
  value
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

export function extractName(raw: string): string | undefined {
  const clean = raw.trim().replace(/[.!¡¿?,]/g, "");
  const explicit = clean.match(/(?:me llamo|mi nombre es|soy)\s+([a-záéíóúñü]+(?:\s+[a-záéíóúñü]+){0,3})/i);
  if (explicit) return capitalizeWords(explicit[1]);
  if (/^[a-záéíóúñü]+(?:\s+[a-záéíóúñü]+){0,3}$/i.test(clean) && !parseYesNo(clean) && !isQuestion(raw)) return capitalizeWords(clean);
  return undefined;
}

export function extractEmail(raw: string): string | undefined {
  const email = raw.match(/[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}/i);
  return email ? email[0].toLowerCase() : undefined;
}

/** Teléfono de 7 a 15 dígitos, conservando el formato que escribió el visitante. */
export function extractPhone(raw: string): string | undefined {
  const match = raw.match(/\+?\d[\d\s().-]{5,}\d/);
  if (!match) return undefined;
  const digits = match[0].replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return undefined;
  return match[0].replace(/\s+/g, " ").trim();
}

export function extractChannel(raw: string): "whatsapp" | "llamada" | "correo" | undefined {
  const t = normalize(raw);
  if (has(t, " whatsapp", " wasap", " whats")) return "whatsapp";
  if (has(t, " llamada", " llamar", " telefono", " celular")) return "llamada";
  if (has(t, " correo", " email", " mail")) return "correo";
  return undefined;
}

export function declines(raw: string): boolean {
  return /^ (no|prefiero no|mejor no|no gracias|ahora no|despues|luego|omitir|saltar|no tengo|aun no)\b/.test(normalize(raw));
}
