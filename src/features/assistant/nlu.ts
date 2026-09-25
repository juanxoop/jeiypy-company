/**
 * Comprensión de texto del motor local (sin IA): normaliza, detecta intenciones
 * y extrae datos del perfil a partir de lenguaje libre en español.
 */
import type { UnknownTopic } from "./knowledge";
import type { AiLevel, AiTierId, Budget, DigitalChannel, Feature, FeatureMap, Goal, PlanId, Profile, WebsiteStatus } from "./types";
import { safeSlice } from "@/lib/text";

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

  if (has(t, " quiero avanzar", " quiero contratar", " quiero empezar", " quiero arrancar", " empecemos", " vamos con", " lo quiero", " me lo llevo", " quiero ese plan", " quiero este plan"))
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
  if (
    has(t, " tienda online", " tiendas online", " tienda virtual", " tiendas virtuales", " ecommerce", " e-commerce", " carrito", " pagos en linea", " pagos online", " con pagos", " pasarela") &&
    !has(t, " tengo una tienda online", " tengo tienda online", " tengo una tienda virtual", " vendo por", " ya tengo")
  )
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
/**
 * Rubros frecuentes con una etiqueta legible. Es solo una ayuda: cualquier otro negocio
 * se entiende igual a partir de lo que el visitante escriba (ver `extractBusinessType`).
 * Los más específicos van primero ("tienda de ropa" antes que "tienda").
 */
const BUSINESS_TYPES: [string, string][] = [
  ["zapat", "venta de calzado"],
  ["calzado", "venta de calzado"],
  ["ropa", "tienda de ropa"],
  ["boutique", "boutique"],
  ["lenceria", "tienda de lencería"],
  ["repuesto", "venta de repuestos"],
  ["autoparte", "venta de repuestos"],
  ["taller mecanic", "taller mecánico"],
  ["mecanica", "taller mecánico"],
  ["taller", "taller"],
  ["lavadero", "lavadero de carros"],
  ["ferreteria", "ferretería"],
  ["drogueria", "droguería"],
  ["farmacia", "droguería"],
  ["miscelanea", "miscelánea"],
  ["minimercado", "minimercado"],
  ["supermercado", "supermercado"],
  ["licorera", "licorera"],
  ["carniceria", "carnicería"],
  ["fruver", "fruver"],
  ["accesorio", "venta de accesorios"],
  ["bisuteria", "venta de bisutería"],
  ["joyeria", "joyería"],
  ["cosmetic", "venta de cosméticos"],
  ["maquillaje", "venta de cosméticos"],
  ["perfum", "perfumería"],
  ["celular", "venta de celulares"],
  ["computador", "venta de tecnología"],
  ["tecnologia", "venta de tecnología"],
  ["mueble", "venta de muebles"],
  ["mascota", "tienda de mascotas"],
  ["pet shop", "tienda de mascotas"],
  ["barberia", "barbería"],
  ["peluqueria", "peluquería"],
  ["salon de belleza", "salón de belleza"],
  ["spa", "spa"],
  ["manicure", "salón de uñas"],
  ["unas", "salón de uñas"],
  ["estetica", "centro de estética"],
  ["tatuaje", "estudio de tatuajes"],
  ["gimnasio", "gimnasio"],
  ["gym", "gimnasio"],
  ["crossfit", "gimnasio"],
  ["yoga", "estudio de yoga"],
  ["restaurante", "restaurante"],
  ["pizzeria", "pizzería"],
  ["heladeria", "heladería"],
  ["cafeteria", "cafetería"],
  ["cafe ", "café"],
  ["panaderia", "panadería"],
  ["pasteleria", "pastelería"],
  ["reposteria", "repostería"],
  ["comidas rapidas", "negocio de comidas rápidas"],
  ["catering", "catering"],
  ["bar ", "bar"],
  ["odontolog", "consultorio odontológico"],
  ["psicolog", "consultorio de psicología"],
  ["fisioterap", "consultorio de fisioterapia"],
  ["nutricion", "consultorio de nutrición"],
  ["consultorio", "consultorio"],
  ["clinica", "clínica"],
  ["veterinaria", "veterinaria"],
  ["fotograf", "estudio de fotografía"],
  ["abogad", "firma de abogados"],
  ["contador", "servicios contables"],
  ["contable", "servicios contables"],
  ["consultoria", "consultoría"],
  ["servicios profesionales", "servicios profesionales"],
  ["arquitect", "estudio de arquitectura"],
  ["inmobiliaria", "inmobiliaria"],
  ["finca raiz", "inmobiliaria"],
  ["constructora", "constructora"],
  ["hotel", "hotel"],
  ["hostal", "hostal"],
  ["agencia de viajes", "agencia de viajes"],
  ["turismo", "agencia de turismo"],
  ["eventos", "organización de eventos"],
  ["academia", "academia"],
  ["colegio", "colegio"],
  ["jardin infantil", "jardín infantil"],
  ["floristeria", "floristería"],
  ["optica", "óptica"],
  ["papeleria", "papelería"],
  ["lavanderia", "lavandería"],
  ["agencia", "agencia"],
  ["transporte", "empresa de transporte"],
  ["tienda", "tienda"],
];

/** Negocios donde reservar o agendar suele ser clave. */
const BOOKING_BUSINESSES = [
  "barber", "peluquer", "salon", "spa", "manicure", "consultorio", "odontolog", "clinica", "veterinaria",
  "gimnasio", "estetica", "tatuaje", "hotel", "hostal", "fotograf", "restaurante",
];

/** Rubro de la lista de frecuentes (permite frases como "tu ferretería"). */
export function isKnownBusiness(businessType?: string): boolean {
  return Boolean(businessType && BUSINESS_TYPES.some(([, label]) => label === businessType));
}

const GENERIC_BUSINESS = /^(venta|servicios|negocio|organizaci|empresa|consultoria|reparaci|servicio)/;

/** "tu ferretería" o, si el rubro es descriptivo ("venta de calzado"), "tu negocio". */
export function businessRef(businessType?: string, possessive = "tu"): string {
  return businessType && isKnownBusiness(businessType) && !GENERIC_BUSINESS.test(normalize(businessType).trim())
    ? `${possessive} ${businessType}`
    : `${possessive} negocio`;
}

/** Rubro a grandes rasgos: cambia cómo se nombra el catálogo (menú, productos o servicios). */
export function businessKind(profile: Profile): "food" | "retail" | "service" {
  const t = normalize(profile.businessType ?? "");
  if (/restaurante|cafe|panaderia|pasteleria|comidas|cafeteria/.test(t)) return "food";
  if (
    /tienda|boutique|venta|ferreteria|joyeria|optica|drogueria|papeleria|floristeria|miscelanea|minimercado|supermercado|repuesto|calzado|ropa|accesorio|bisuteria|cosmetic|perfum|mueble|mascota|celular|tecnologia|licorera|carniceria|fruver/.test(t) ||
    profile.goal === "sell" ||
    profile.channels?.includes("ecommerce")
  )
    return "retail";
  return "service";
}

export function isBookingBusiness(businessType?: string): boolean {
  if (!businessType) return false;
  const t = normalize(businessType);
  return BOOKING_BUSINESSES.some((b) => t.includes(b));
}

const BUSINESS_STOP = / (y|por|en|con|desde|pero|para|que|a trav[eé]s|mediante|aunque|solo|tambi[eé]n|adem[aá]s)( |$)|[,.;!?]/;

/** Texto en minúsculas conservando tildes, para devolver el rubro tal como lo escribió el visitante. */
const lowerKeep = (raw: string) => ` ${raw.toLowerCase().replace(/[¿¡!;:()"'$]/g, " ").replace(/\s+/g, " ").trim()} `;

/** Frase del negocio tras un verbo ("vendo velas aromáticas por Instagram" → "venta de velas aromáticas"). */
function businessPhrase(raw: string): string | undefined {
  const t = lowerKeep(raw);
  const service = t.match(/ ((?:reparaci[oó]n|arreglo|mantenimiento|instalaci[oó]n|servicio t[eé]cnico|alquiler|asesor[ií]a) de .{3,40})/);
  if (service) return service[1].split(BUSINESS_STOP)[0].trim();
  const match = t.match(
    / (?:tengo|manejo|administro|mont[eé]|abr[ií]|somos|es) (?:un |una |el |la )(.{3,60})| (?:vendo|vendemos|venta de|ofrezco|ofrecemos|fabrico|fabricamos|hago|hacemos|distribuyo|distribuimos|produzco|comercializo|me dedico a|nos dedicamos a|mi negocio es|trabajo con|trabajamos con) (.{3,60})/,
  );
  if (!match) return undefined;
  const verbSell = !match[1];
  let phrase = (match[1] ?? match[2]).split(BUSINESS_STOP)[0].trim();
  phrase = phrase.replace(/^(un|una|el|la|los|las|de) /, "").trim();
  if (!phrase || phrase.split(" ").length > 5) return undefined;
  const plain = normalize(phrase).trim();
  // "Tengo una página web", "tengo un Instagram": es presencia digital, no el rubro.
  if (/^(negocio|empresa|emprendimiento|pagina|web|pagina web|sitio|tienda online|marca|cuenta|perfil|idea|duda|pregunta)\b/.test(plain)) return undefined;
  if (extractPresence(phrase).mentioned) return undefined;
  const venta = /(vendo|vendemos|venta de|distribuyo|distribuimos|comercializo|fabrico|fabricamos|produzco)/.test(match[0]);
  return verbSell && venta && !/^venta/.test(phrase) ? `venta de ${phrase}` : phrase;
}

/**
 * Rubro del negocio. Acepta cualquier negocio: primero busca rubros frecuentes para darles
 * una etiqueta limpia; si no, toma la frase que usó el visitante ("vendo accesorios para motos").
 */
export function extractBusinessType(raw: string, { loose = false } = {}): string | undefined {
  const t = normalize(raw);
  // Un servicio ("reparación de celulares") no es la venta de ese producto.
  const service = /(reparacion|arreglo|mantenimiento|instalacion|servicio tecnico|alquiler|asesoria) de/.test(t) ? businessPhrase(raw) : undefined;
  if (service) return service;
  const known = BUSINESS_TYPES.find(([key]) => t.includes(` ${key}`));
  if (known) return known[1];

  const phrase = businessPhrase(raw);
  if (phrase) return phrase;

  // Respuesta directa a "¿qué tipo de negocio tienes?": solo si no es una pregunta ni otra respuesta.
  const looksLikeOtherAnswer =
    /^ (quiero|verme|conseguir|mostrar|automatizar|vender|tener|mas|solo|no|si|ya) /.test(t) ||
    CONVERSATIONAL_INTENTS.has(detectIntent(raw)?.type ?? "");
  if (loose && !isQuestion(raw) && !parseYesNo(raw) && !extractPresence(raw).mentioned && !looksLikeOtherAnswer) {
    const answer = lowerKeep(raw).trim().replace(/^(es |soy |tengo |somos )?(un |una |el |la )?/, "").split(BUSINESS_STOP)[0].trim();
    if (answer.length >= 3 && answer.split(" ").length <= 6) return answer;
  }
  return undefined;
}

/** Lo que el visitante cuenta de su negocio, con sus palabras (para el equipo, no se reinterpreta). */
export function extractBusinessDescription(raw: string): string | undefined {
  const t = normalize(raw);
  const describesActivity = has(t, " vendo", " vendemos", " ofrezco", " ofrecemos", " me dedico", " nos dedicamos", " fabrico", " hacemos", " hago ", " trabajo con", " distribuimos", " distribuyo");
  if (!describesActivity && !extractBusinessType(raw)) return undefined;
  const clean = raw.replace(/\s+/g, " ").trim();
  return clean.length >= 12 ? safeSlice(clean, 280) : undefined;
}

/* ---------------------------------------------------------------
   Presencia digital
   --------------------------------------------------------------- */

const CHANNEL_WORDS: [Exclude<DigitalChannel, "website" | "none">, string[]][] = [
  ["whatsapp", [" whatsapp", " whats", " wasap", " guasap", " wpp", " wsp"]],
  ["instagram", [" instagram", " insta ", " ig "]],
  ["facebook", [" facebook", " face ", " fb ", " marketplace"]],
  ["tiktok", [" tiktok", " tik tok"]],
  ["google_business", [" google maps", " perfil de google", " ficha de google", " google business", " google my business", " google mi negocio", " en maps"]],
  ["ecommerce", [" tienda online", " tienda virtual", " shopify", " mercado libre", " mercadolibre", " woocommerce", " rappi", " amazon", " falabella"]],
  ["other", [" linkedin", " youtube", " pinterest", " twitter", " telegram", " redes", " red social"]],
];
const WEBSITE_WORDS = [" pagina web", " pagina", " sitio web", " sitio", " web ", " website", " dominio", " landing"];
const OUTDATED = [" vieja", " viejo", " desactualizad", " antigua", " anticuad", " obsolet", " fea", " feo", " de hace anos", " pasada de moda", " vencid"];
const NEEDS_WORK = [" mejorar", " mejorarla", " no funciona", " lenta", " no me gusta", " no vende", " no convierte", " rediseñ", " redisen", " arreglar", " no sirve", " mala", " renovar", " actualizar", " incompleta", " no genera"];

/**
 * Suma lo que el visitante contó de su presencia digital al perfil. Lo que dice de su página
 * manda (corrige "no tengo" → "también tengo página"); la ausencia deducida solo se usa
 * si aún no se sabía nada.
 */
export function applyPresence(profile: Profile, raw: string, reading: PresenceReading, { direct = false } = {}): void {
  if (!reading.mentioned) return;
  const merged = new Set([...(profile.channels ?? []), ...reading.channels]);
  if ([...merged].some((c) => c !== "none")) merged.delete("none");
  profile.channels = [...merged];
  const explicitSite = direct || WEBSITE_WORDS.some((w) => normalize(raw).includes(w)) || reading.channels.includes("none");
  if (reading.websiteStatus && (explicitSite || !profile.websiteStatus)) profile.websiteStatus = reading.websiteStatus;
}

export type PresenceReading = {
  channels: DigitalChannel[];
  websiteStatus?: WebsiteStatus;
  /** El mensaje habla de su presencia digital (redes, página o "no tengo nada"). */
  mentioned: boolean;
};

/**
 * Presencia digital en texto libre: "Solo manejo WhatsApp y un Instagram" → whatsapp + instagram,
 * sin página. `direct`: responde a la pregunta de presencia, así que "sí"/"no" también cuentan.
 */
export function extractPresence(raw: string, { direct = false } = {}): PresenceReading {
  // "página de Facebook" es Facebook, no una página web.
  const t = normalize(raw).replace(/ (pagina|perfil|cuenta) (de|en) (facebook|instagram|tiktok|google)/g, " $3");
  const channels = new Set<DigitalChannel>();
  for (const [channel, words] of CHANNEL_WORDS) {
    for (const word of words) {
      const i = t.indexOf(word);
      if (i !== -1 && !negatedAt(t, i)) channels.add(channel);
    }
  }
  // "redes" solo cuenta como "other" si no nombró ninguna red concreta.
  if (channels.has("other") && [...channels].some((c) => c !== "other" && c !== "ecommerce") && !has(t, " linkedin", " youtube", " pinterest", " twitter", " telegram")) {
    channels.delete("other");
  }

  let websiteStatus: WebsiteStatus | undefined;
  const siteIndex = WEBSITE_WORDS.map((w) => t.indexOf(w)).filter((i) => i !== -1).sort((a, b) => a - b)[0];
  if (siteIndex !== undefined) {
    const owns =
      direct ||
      has(t, " tengo", " tenemos", " mi pagina", " mi web", " mi sitio", " nuestra pagina", " nuestra web", " nuestro sitio", " cuento con", " manejo", " ya hay", " la pagina que", " la web que") ||
      has(t, ...OUTDATED, ...NEEDS_WORK);
    if (negatedAt(t, siteIndex)) websiteStatus = "none";
    // "Quiero cotizar una página" es lo que busca, no lo que ya tiene.
    else if (owns) {
      channels.add("website");
      websiteStatus = has(t, ...OUTDATED) ? "outdated" : has(t, ...NEEDS_WORK) ? "needs_improvement" : "existing";
    }
  }
  if (has(t, " no tengo nada", " nada todavia", " todavia nada", " aun nada", " no tengo ninguna", " ninguna red", " sin redes", " no tengo redes") || /^ (nada|ninguna|ninguno) /.test(t)) {
    if (!channels.size) channels.add("none");
    websiteStatus ??= "none";
  }
  if (direct && !channels.size && !websiteStatus) {
    if (/^ (si|claro|ya|sip|correcto)\b/.test(t)) {
      channels.add("website");
      websiteStatus = "existing";
    } else if (/^ (no|nop|todavia no|aun no)\b/.test(t)) websiteStatus = "none";
  }
  // Nombró sus canales sin mencionar una página: hoy no tiene web propia.
  if (!websiteStatus && [...channels].some((c) => c !== "none")) websiteStatus = "none";
  return { channels: [...channels], websiteStatus, mentioned: channels.size > 0 || websiteStatus !== undefined };
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
  seo: [" en google", " aparecer en", " salir en google", " seo", " posicionamiento", " buscadores"],
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
  next.businessDescription ??= extractBusinessDescription(raw);
  applyPresence(next, raw, extractPresence(raw));
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
