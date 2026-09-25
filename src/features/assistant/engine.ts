/**
 * Jeipy AI · Sales V1 — motor local de conversación (prototipo sin IA).
 *
 * Actúa como vendedor consultivo:
 * 1. Entiende el negocio y lo que quiere lograr.
 * 2. Diagnostica con preguntas cortas (una por turno, nunca repetidas).
 * 3. Recomienda el plan y explica por qué frente al plan vecino.
 * 4. Resuelve dudas y objeciones sin presionar.
 * 5. Cierra con "¿Cómo quieres continuar?": asesor por WhatsApp o solicitud de llamada.
 * 6. Captura los datos (nombre, teléfono, email opcional, negocio), pide autorización y
 *    emite el efecto `submit-lead`: `useAssistant` lo envía al backend y el motor muestra
 *    el resultado real con `leadSubmissionResult` (nunca simula que el equipo lo recibió).
 * Nunca inventa precios, funciones ni resultados: todo sale de `knowledge.ts`.
 */
import { assistantConfig } from "@/config/assistant";
import { isWhatsAppConfigured } from "@/lib/contact";
import { aiAvailability, aiTierPriceLine, company, formatCop, getAiTier, getPlan, knowledge, unknownTopics, type UnknownTopic } from "./knowledge";
import {
  declines,
  detectIntent,
  enrichProfile,
  extractBudget,
  extractBusinessDescription,
  applyPresence,
  businessRef,
  extractBusinessType,
  extractPresence,
  extractChannel,
  extractEmail,
  extractFeatures,
  extractGoal,
  extractName,
  extractPhone,
  isBookingBusiness,
  isKnownBusiness,
  isQuestion,
  mentionedPlans,
  normalize,
  parseAiLevelAnswer,
  parseYesNo,
  businessKind,
  type Intent,
} from "./nlu";
import { CHANNEL_LABEL, FEATURE_LABEL, GOAL_LABEL, needsLabels, presenceLabel } from "@/features/leads/labels";
import {
  coverage,
  nextLowerTier,
  tierAdds,
  tierLabel,
  tierOf,
  tierPriceText,
  tierRank,
  tierCost,
  type Tier,
} from "./ladder";
import { aiCostNote, alternativeCard, needsAiLevelQuestion, pickTier, recommendPlan } from "./recommend";
import type {
  AiTierId,
  AssistantBrain,
  AssistantTurn,
  ConversationState,
  Feature,
  Goal,
  LeadDraft,
  MessageBlock,
  PlanId,
  Profile,
  RecommendationBlock,
  Slot,
} from "./types";

type Reply = AssistantTurn;

const text = (value: string): MessageBlock => ({ type: "text", text: value });
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const CHIPS = {
  start: [...assistantConfig.suggestions],
  afterInfo: ["¿Qué plan me conviene?", "Quiero cotizar una página"],
  afterRecommendation: ["Quiero avanzar", "¿Qué incluye exactamente?", "Comparar planes"],
  fallback: ["¿Qué plan me conviene?", "Ver precios", "Hablar con una persona"],
};

/* ---------------------------------------------------------------
   Diagnóstico
   --------------------------------------------------------------- */

const slotKey = (slot: Slot) => (slot.kind === "feature" ? `feature:${slot.feature}` : slot.kind);

/** Siguiente dato que falta. El diagnóstico nunca repite lo que ya se sabe. */
function nextSlot(state: ConversationState): Slot | null {
  const { profile, flow, skipped } = state;
  const pending = (slot: Slot, known: boolean) => (!known && !skipped.includes(slotKey(slot)) ? slot : null);
  const f = profile.features;

  const consent = pending({ kind: "consent" }, state.consentGiven);
  if (flow === "lead") {
    return (
      [
        pending({ kind: "name" }, Boolean(profile.name)),
        pending({ kind: "phone" }, Boolean(profile.phone)),
        pending({ kind: "email" }, Boolean(profile.email)),
        pending({ kind: "businessName" }, Boolean(profile.businessName)),
        pending({ kind: "channel" }, Boolean(profile.preferredChannel)),
        consent,
      ].find((s): s is Slot => s !== null) ?? null
    );
  }
  if (flow === "callback") {
    const known = Boolean(profile.name && profile.phone);
    return (
      [
        known ? pending({ kind: "confirm-contact" }, false) : null,
        pending({ kind: "name" }, Boolean(profile.name)),
        pending({ kind: "phone" }, Boolean(profile.phone)),
        pending({ kind: "businessName" }, Boolean(profile.businessName)),
        pending({ kind: "preferredTime" }, Boolean(profile.preferredTime)),
        consent,
      ].find((s): s is Slot => s !== null) ?? null
    );
  }

  const diagnosis: (Slot | null)[] = [
    pending({ kind: "businessType" }, Boolean(profile.businessType)),
    pending({ kind: "website" }, Boolean(profile.websiteStatus)),
    pending({ kind: "goal" }, Boolean(profile.goal)),
    pending({ kind: "feature", feature: "catalog" }, f.catalog !== undefined),
    isBookingBusiness(profile.businessType)
      ? pending({ kind: "feature", feature: "booking" }, f.booking !== undefined)
      : pending({ kind: "feature", feature: "forms" }, f.forms !== undefined || f.catalog === true),
    pending({ kind: "feature", feature: "ai" }, f.ai !== undefined),
    // Desempate entre Esencial + Jeipy AI y Premium: qué tan profunda debe ser la automatización.
    pending({ kind: "aiLevel" }, !needsAiLevelQuestion(profile)),
    flow === "quote" ? pending({ kind: "budget" }, profile.budget !== undefined) : null,
  ];
  return diagnosis.find((s): s is Slot => s !== null) ?? null;
}

function question(slot: Slot, state: ConversationState): { blocks: MessageBlock[]; quickReplies?: string[] } {
  const profile = state.profile;
  const yesNo = ["Sí", "No"];
  const kind = businessKind(profile);
  switch (slot.kind) {
    case "businessType":
      return {
        blocks: [text("¿Qué tipo de negocio tienes?")],
        quickReplies: ["Restaurante o café", "Barbería o salón", "Tienda", "Servicios profesionales"],
      };
    case "website":
      return {
        blocks: [
          text(
            "¿Qué presencia digital tiene hoy tu negocio? Cuéntamelo con tus palabras: WhatsApp, Instagram, Facebook, TikTok, Google Maps, una página web…",
          ),
        ],
        quickReplies: ["Solo WhatsApp", "Redes sociales, sin página", "Ya tengo página web", "No tengo nada"],
      };
    case "goal":
      return {
        blocks: [text("¿Qué es lo que más quieres lograr con la web?")],
        quickReplies: ["Conseguir más clientes", "Verme más profesional", "Mostrar productos o servicios", "Automatizar la atención"],
      };
    case "budget":
      return {
        blocks: [text("¿Tienes un presupuesto aproximado? Es opcional, pero me ayuda a ajustar la recomendación.")],
        quickReplies: ["Hasta $1.000.000", "Hasta $2.400.000", "Hasta $4.700.000", "Más de $4.700.000", "Prefiero no decirlo"],
      };
    case "aiLevel":
      return {
        blocks: [
          text(
            "¿Quieres que la IA solo responda dudas y capture información (Jeipy AI Lite), o también que automatice reservas, cotizaciones o procesos (Jeipy AI Pro)?",
          ),
        ],
        quickReplies: ["Solo responder dudas y captar datos", "También automatizar procesos"],
      };
    case "name":
      return { blocks: [text("¿Cuál es tu nombre?")] };
    case "phone":
      return {
        blocks: [text(`${profile.name ? `Gracias, ${firstName(profile.name)}. ` : ""}¿A qué número de celular te podemos contactar?`)],
        quickReplies: ["Prefiero no dejarlo"],
      };
    case "email":
      return { blocks: [text("¿Quieres dejar también un correo? Es opcional.")], quickReplies: ["Omitir"] };
    case "businessName":
      return {
        blocks: [text(`¿Cómo se llama ${businessRef(profile.businessType)}?`)],
        quickReplies: ["Aún no tiene nombre"],
      };
    case "channel":
      return {
        blocks: [text("¿Por dónde prefieres que te contactemos?")],
        quickReplies: ["WhatsApp", "Llamada", ...(profile.email ? ["Correo"] : [])],
      };
    case "preferredTime":
      return {
        blocks: [text("¿Tienes un horario preferido para la llamada? Es opcional.")],
        quickReplies: ["En la mañana", "En la tarde", "Cualquier horario"],
      };
    case "confirm-contact":
      return {
        blocks: [text(`Confirmo tus datos para la llamada: **${profile.name}** · ${profile.phone}. ¿Son correctos?`)],
        quickReplies: ["Sí, son correctos", "Cambiar datos"],
      };
    case "consent":
      return {
        blocks: [
          { type: "summary", title: "Resumen de tu solicitud", rows: summaryRows(state) },
          text(
            "Antes de enviarlo: ¿autorizas a Jeipy Company a contactarte por teléfono, WhatsApp o correo sobre esta solicitud? Usaremos tus datos solo para eso.",
          ),
        ],
        quickReplies: ["Sí, autorizo", "No, gracias"],
      };
    case "confirm-plan":
      return {
        blocks: [text("¿Te interesa esta alternativa?")],
        quickReplies: ["Sí, me interesa", ...(slot.tier !== "basico" ? ["Sigue siendo alto"] : []), "¿Cuál es la diferencia?"],
      };
    case "feature":
      switch (slot.feature) {
        case "catalog":
          return {
            blocks: [
              text(
                kind === "food"
                  ? "¿Te gustaría mostrar tu menú con precios en la web?"
                  : kind === "retail"
                    ? "¿Quieres mostrar tus productos con precios, como un catálogo?"
                    : "¿Quieres mostrar tus servicios y precios en la web?",
              ),
            ],
            quickReplies: yesNo,
          };
        case "booking":
          return {
            blocks: [
              text(
                kind === "food"
                  ? "¿Te sirve que tus clientes puedan reservar mesa desde la web?"
                  : "¿Te sirve que tus clientes puedan reservar o agendar citas desde la web?",
              ),
            ],
            quickReplies: [...yesNo, "Más adelante"],
          };
        case "forms":
          return { blocks: [text("¿Quieres recibir solicitudes de cotización o contacto desde la web?")], quickReplies: yesNo };
        case "ai":
          return {
            blocks: [text("¿Te interesa que un asistente con IA responda preguntas frecuentes y atienda consultas por ti?")],
            quickReplies: [...yesNo, "¿Qué haría el asistente?"],
          };
        default:
          return { blocks: [text("¿Lo necesitas?")], quickReplies: yesNo };
      }
  }
}

/* ---------------------------------------------------------------
   Lectura de respuestas
   --------------------------------------------------------------- */

const GOAL_ACK: Record<Goal, string> = {
  clients: "Buen objetivo: la web tiene que convertir visitas en contactos.",
  image: "Una imagen profesional genera confianza desde el primer vistazo.",
  showcase: "Mostrar bien lo que ofreces es clave para que te elijan.",
  sell: "Entonces la web tiene que llevar al cliente directo a la compra.",
  automate: "Automatizar la atención te libera tiempo para lo importante.",
};

/** "una ferretería", "un taller": femenino si la primera palabra termina en "a" (con pocas excepciones). */
function articleFor(business: string): string {
  const first = normalize(business).trim().split(" ")[0];
  if (/^(spa|dia|mapa|sistema|programa)$/.test(first)) return "un";
  return /(a|ion|dad|boutique)$/.test(first) ? "una" : "un";
}

type Filled = { state: ConversationState; ack?: string };

/** Acuse del rubro, sin forzar frases raras con rubros descriptivos ("venta de calzado"). */
function businessAck(value: string): string {
  if (/^(venta|servicios|negocio|organizaci|empresa|consultoria)/.test(normalize(value).trim())) return `Perfecto, un negocio de ${value.replace(/^negocio (de )?/, "")}.`;
  if (isKnownBusiness(value)) return `Perfecto, ${articleFor(value)} ${value}.`;
  return `Perfecto, anotado: ${value}.`;
}

const channelNames = (profile: Profile) =>
  (profile.channels ?? []).filter((c) => c !== "website" && c !== "none").map((c) => CHANNEL_LABEL[c]);

/** Acuse de la presencia digital: muestra que entendió dónde está hoy el negocio. */
function presenceAck(profile: Profile): string {
  const names = channelNames(profile);
  switch (profile.websiteStatus) {
    case "outdated":
      return "Entendido: no partimos de cero. Se trata de renovar tu página para que vuelva a trabajar para ti.";
    case "needs_improvement":
      return "Entendido: ya tienes página, así que el foco es mejorarla para que te traiga más clientes.";
    case "existing":
      return `Bien: ya tienes página${names.length ? ` y usas ${joinNatural(names)}` : ""}, así que no partimos de cero; la idea es llevarla a una base más sólida.`;
    default:
      return names.length
        ? `Perfecto: hoy trabajas con ${joinNatural(names)}, sin página propia. Una web te da un lugar propio, más confianza y clientes que te encuentran.`
        : "Perfecto, empezarías desde cero, que es el mejor momento para hacerlo bien.";
  }
}

/** Qué aprendió de un mensaje libre, para acusarlo en una frase. */
function learnedAck(before: Profile, after: Profile): string | undefined {
  const parts: string[] = [];
  if (!before.businessType && after.businessType) parts.push(businessAck(after.businessType));
  const presenceParts: string[] = [];
  const presenceChanged =
    before.websiteStatus !== after.websiteStatus || (before.channels ?? []).join() !== (after.channels ?? []).join();
  if (presenceChanged && after.websiteStatus) {
    presenceParts.push(
      before.websiteStatus === "none" && after.websiteStatus !== "none"
        ? `Anotado: también tienes página web. ${presenceAck(after)}`
        : presenceAck(after),
    );
  }
  // Una sola vez "Perfecto" por mensaje.
  const presence = presenceParts.map((p) => (parts.length ? p.replace(/^Perfecto: h/, "H").replace(/^Perfecto, e/, "E") : p));
  const all = [...parts, ...presence];
  return all.length ? all.join(" ") : undefined;
}

function fillSlot(slot: Slot, input: string, state: ConversationState): Filled | null {
  const profile: Profile = { ...state.profile, features: { ...state.profile.features } };
  const next = (ack?: string): Filled => ({ state: { ...state, profile }, ack });

  switch (slot.kind) {
    case "businessType": {
      const value = extractBusinessType(input, { loose: true });
      if (!value) return null;
      profile.businessType = value;
      profile.businessDescription ??= extractBusinessDescription(input);
      return next(businessAck(value));
    }
    case "website": {
      // Respuesta libre: "Solo manejo WhatsApp y un Instagram", "tengo página pero está vieja"…
      const reading = extractPresence(input, { direct: true });
      if (!reading.mentioned) return null;
      applyPresence(profile, input, reading, { direct: true });
      profile.websiteStatus ??= "none";
      return next(presenceAck(profile));
    }
    case "goal": {
      const value = extractGoal(input);
      if (!value) return null;
      profile.goal = value;
      return next(GOAL_ACK[value]);
    }
    case "budget": {
      const value = extractBudget(input);
      if (!value) return null;
      profile.budget = value !== "skipped" && normalize(input).includes(" mas de ") ? { amount: value.amount + 1 } : value;
      return next(value === "skipped" ? "Sin problema." : "Gracias, lo tengo en cuenta.");
    }
    case "feature": {
      // "No quiero reservas" ante la pregunta de IA habla de otra función: no es la respuesta.
      const mentioned = extractFeatures(input);
      if (Object.keys(mentioned).length && mentioned[slot.feature] === undefined) return null;
      const answer = parseYesNo(input);
      if (!answer) return null;
      profile.features[slot.feature] = answer === "yes";
      return next();
    }
    case "aiLevel": {
      const value = parseAiLevelAnswer(input);
      if (!value) return null;
      profile.aiLevel = value;
      if (value === "advanced") profile.features.automation = true;
      return next(
        value === "basic"
          ? "Perfecto, entonces Jeipy AI Lite es suficiente: responder, orientar y captar datos."
          : "Entendido: necesitas automatización más profunda, no solo atención básica.",
      );
    }
    case "name": {
      const value = extractName(input);
      if (!value) return null;
      profile.name = value;
      return next();
    }
    case "phone": {
      const value = extractPhone(input);
      if (!value) return null;
      profile.phone = value;
      profile.email ??= extractEmail(input);
      return next();
    }
    case "email": {
      const skip = () => ({ state: { ...state, skipped: [...state.skipped, "email"] } });
      if (declines(input)) return skip();
      const value = extractEmail(input);
      if (!value) return null;
      profile.email = value;
      return next();
    }
    case "businessName": {
      if (declines(input) || /sin nombre|no tiene nombre/.test(normalize(input))) {
        return { state: { ...state, skipped: [...state.skipped, "businessName"] } };
      }
      const value = input.trim().replace(/\s+/g, " ");
      if (value.length < 2 || value.length > 80 || isQuestion(input)) return null;
      profile.businessName = value;
      return next();
    }
    case "channel": {
      const value = extractChannel(input);
      if (!value) return null;
      profile.preferredChannel = value;
      return next();
    }
    case "preferredTime": {
      const t = normalize(input);
      if (declines(input) || t.includes(" cualquier")) return { state: { ...state, skipped: [...state.skipped, "preferredTime"] } };
      const value = input.trim().replace(/\s+/g, " ");
      if (value.length < 2 || value.length > 60 || isQuestion(input)) return null;
      profile.preferredTime = value;
      return next();
    }
    case "confirm-contact": {
      const t = normalize(input);
      if (t.includes(" cambiar") || parseYesNo(input) === "no") {
        profile.name = undefined;
        profile.phone = undefined;
        return { state: { ...state, profile, skipped: [...state.skipped, "confirm-contact"] }, ack: "Claro, actualicémoslos." };
      }
      if (parseYesNo(input) !== "yes" && !t.includes(" correcto")) return null;
      return { state: { ...state, skipped: [...state.skipped, "confirm-contact"] } };
    }
    case "consent":
      return null; // se resuelve en `respond`
    case "confirm-plan":
      return null; // se resuelve en `respond`
  }
}

const firstName = (name: string) => name.split(" ")[0];

/* ---------------------------------------------------------------
   Resúmenes, lead y cierre
   --------------------------------------------------------------- */

const aiInterestLabel = (profile: Profile, aiTier?: AiTierId) =>
  !profile.features.ai
    ? "No por ahora"
    : aiTier
      ? `Sí, ${getAiTier(aiTier).name}`
      : profile.aiLevel === "advanced"
        ? "Sí, avanzada (automatización)"
        : "Sí, básica (dudas y datos)";

const wantedFeatures = (profile: Profile) => (Object.keys(profile.features) as Feature[]).filter((f) => profile.features[f]);

const joinNatural = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;

/** Lo que el visitante ve antes de autorizar el envío: exactamente lo que recibirá el equipo. */
function summaryRows(state: ConversationState) {
  const { profile, recommended: planId, recommendedAi: aiTier } = state;
  const rows: { label: string; value: string }[] = [];
  if (profile.name) rows.push({ label: "Nombre", value: profile.name });
  const business = [profile.businessName, profile.businessType && (profile.businessName ? `(${profile.businessType})` : capitalize(profile.businessType))]
    .filter(Boolean)
    .join(" ");
  if (business) rows.push({ label: "Negocio", value: business });
  const presence = presenceLabel(profile.channels, profile.websiteStatus);
  if (presence) rows.push({ label: "Presencia", value: presence });
  if (profile.goal) rows.push({ label: "Objetivo", value: GOAL_LABEL[profile.goal] });
  const wanted = wantedFeatures(profile).filter((f) => f !== "ai");
  if (wanted.length) rows.push({ label: "Necesita", value: capitalize(wanted.map((f) => FEATURE_LABEL[f]).join(", ")) });
  if (profile.features.ai !== undefined) rows.push({ label: "Interés en IA", value: aiInterestLabel(profile, aiTier) });
  if (profile.budget) rows.push({ label: "Presupuesto", value: profile.budget === "skipped" ? "Sin definir" : formatCop(profile.budget.amount) });
  if (planId) {
    const plan = getPlan(planId);
    rows.push({ label: "Recomendación", value: `${plan.name}${aiTier ? ` + ${getAiTier(aiTier).name}` : ""} (web desde ${plan.price})` });
  }
  if (profile.phone) rows.push({ label: "Teléfono", value: profile.phone });
  if (profile.email) rows.push({ label: "Correo", value: profile.email });
  if (state.flow === "callback" || state.callbackRequested) {
    rows.push({ label: "Solicita llamada", value: profile.preferredTime ? `Sí · ${profile.preferredTime}` : "Sí" });
  }
  return rows;
}

/**
 * Mensaje breve para WhatsApp: nombre, negocio, plan recomendado y necesidad principal.
 * Sin teléfono, correo ni otros datos sensibles en la URL.
 */
export function buildWhatsAppMessage(state: ConversationState): string {
  const { profile, recommended, recommendedAi } = state;
  const hello = profile.name ? `Hola, soy ${firstName(profile.name)}.` : "Hola.";
  const business = profile.businessName ?? businessRef(profile.businessType, "mi");
  const parts = [`${hello} Estuve hablando con Jeipy AI sobre ${business}.`];
  if (recommended) {
    const plan = `${getPlan(recommended).name}${recommendedAi ? ` + ${getAiTier(recommendedAi).name}` : ""}`;
    const needs = needsLabels(profile.goal, wantedFeatures(profile)).slice(0, 3);
    parts.push(`Me recomendó ${plan}${needs.length ? ` porque necesito ${joinNatural(needs)}` : ""}.`);
    parts.push("Quisiera continuar con la cotización.");
  } else {
    parts.push("Quisiera hablar con un asesor.");
  }
  return parts.join(" ");
}

/** "¿Cómo quieres continuar?": asesor ahora (WhatsApp) o solicitud de llamada, con igual peso. */
function closingBlock(state: ConversationState, title = "¿Cómo quieres continuar?"): MessageBlock {
  return { type: "closing", title, whatsappMessage: buildWhatsAppMessage(state), offerCallback: !state.callbackRequested };
}

/** Lead listo para el backend, construido solo con lo que el visitante contó en la conversación. */
export function buildLeadDraft(state: ConversationState): LeadDraft {
  const { profile } = state;
  return {
    conversationId: state.conversationId,
    consent: true,
    name: profile.name ?? "",
    phone: profile.phone ?? "",
    email: profile.email,
    businessName: profile.businessName,
    businessType: profile.businessType,
    businessDescription: profile.businessDescription,
    channels: profile.channels ?? [],
    websiteStatus: profile.websiteStatus,
    goal: profile.goal,
    features: wantedFeatures(profile),
    aiInterest: Boolean(profile.features.ai),
    aiLevel: profile.features.ai ? profile.aiLevel : undefined,
    recommendedPlan: state.recommended,
    recommendedAi: state.recommendedAi,
    budget: profile.budget && profile.budget !== "skipped" ? profile.budget.amount : undefined,
    intent: state.callbackRequested ? "callback" : (state.leadIntent ?? "quote"),
    callbackRequested: state.callbackRequested,
    preferredTime: profile.preferredTime,
    preferredChannel: state.callbackRequested ? (profile.preferredChannel ?? "llamada") : profile.preferredChannel,
    isUpdate: state.leadCaptured,
  };
}

/** Con autorización y datos completos: se pide a `useAssistant` que envíe el lead. */
function submitLead(state: ConversationState, lead: MessageBlock[] = []): Reply {
  const next: ConversationState = { ...state, expecting: null, consentGiven: true, pendingSubmission: true, retries: 0 };
  return {
    blocks: lead,
    state: next,
    effects: [{ type: "submit-lead", lead: buildLeadDraft(next) }],
  };
}

/**
 * Respuesta al resultado real del envío. Solo confirma la recepción si el backend
 * guardó o notificó el lead; si no, lo dice con honestidad y ofrece alternativas.
 */
/**
 * Respuesta al resultado real del envío. "Solicitud recibida" SOLO si al menos un mecanismo
 * persistente confirmó el lead: la base de datos o un canal de respaldo (correo o webhook).
 */
export function leadSubmissionResult(
  state: ConversationState,
  result: { ok: boolean; backup?: "email" | "webhook" | "none" },
): AssistantTurn {
  const viaBackup = !result.ok && (result.backup === "email" || result.backup === "webhook");
  if (result.ok || viaBackup) {
    const next: ConversationState = { ...state, flow: "free", expecting: null, pendingSubmission: false, leadCaptured: true, handoffOffered: true };
    const whatsapp = isWhatsAppConfigured();
    const base = state.callbackRequested
      ? "Ya tenemos tus datos. Un asesor de Jeipy podrá contactarte para hablar sobre tu proyecto."
      : "Ya tenemos tus datos. El equipo de Jeipy revisará tu solicitud y te contactará para continuar con tu proyecto.";
    return {
      blocks: [
        {
          type: "lead-status",
          ok: true,
          title: "Solicitud recibida",
          // Con respaldo, se dice con honestidad por dónde llegó; el registro principal se completa solo.
          text: viaBackup ? `${base} (La recibimos por nuestro canal de respaldo mientras nuestro sistema principal se recupera.)` : base,
        },
        ...(whatsapp || !state.callbackRequested ? [closingBlock(next, "Si quieres adelantar la conversación:")] : []),
      ],
      quickReplies: whatsapp || !state.callbackRequested ? [] : ["Tengo otra duda"],
      state: next,
    };
  }
  // Sin éxito falso: ningún mecanismo confirmó el lead.
  return {
    blocks: [
      {
        type: "lead-status",
        ok: false,
        title: "No pudimos enviar tu solicitud",
        text: "Estamos teniendo una dificultad temporal para enviar tu solicitud. Tus datos siguen preparados para reintentar. Puedes intentarlo nuevamente o continuar por WhatsApp.",
      },
      { type: "contact-links", whatsappMessage: buildWhatsAppMessage(state) },
    ],
    quickReplies: ["Reintentar envío", "Tengo otra duda"],
    state: { ...state, flow: "free", expecting: null, pendingSubmission: true },
  };
}

/** Datos de contacto: no alimentan el diagnóstico (un teléfono no es un presupuesto). */
const CONTACT_SLOTS = new Set<Slot["kind"]>(["name", "phone", "email", "businessName", "channel", "preferredTime", "confirm-contact", "consent"]);
/** Sin estos no se envía nada. */
const REQUIRED_SLOTS = new Set<Slot["kind"]>(["name", "phone", "consent"]);

/** Sin nombre, teléfono o autorización no se puede contactar: se cancela sin enviar nada. */
function abortLead(state: ConversationState, intro?: string): Reply {
  const next: ConversationState = { ...state, flow: "free", expecting: null, callbackRequested: state.leadCaptured && state.callbackRequested };
  return {
    blocks: [
      text(
        `${intro ?? "Sin problema, no envío nada. Para que el equipo te contacte necesito al menos tu nombre y un teléfono."}${
          isWhatsAppConfigured() ? " Si lo prefieres, puedes escribirnos directamente:" : ""
        }`,
      ),
      ...(isWhatsAppConfigured() ? [{ ...closingBlock(next, "Otras formas de continuar"), offerCallback: false } as MessageBlock] : []),
    ],
    quickReplies: ["Tengo otra duda"],
    state: next,
  };
}

/** Inicia la captura de datos: para cotizar (`lead`) o para que un asesor llame (`callback`). */
function startContact(flow: "lead" | "callback", state: ConversationState, intro: string, lead: MessageBlock[] = []): Reply {
  const next: ConversationState = {
    ...state,
    flow,
    leadIntent: flow === "callback" ? "callback" : "quote",
    callbackRequested: flow === "callback" || state.callbackRequested,
    // Solo se confirman el nombre y el teléfono que ya se conocían antes de pedir la llamada.
    skipped:
      state.profile.name && state.profile.phone
        ? state.skipped.filter((k) => k !== "confirm-contact")
        : [...state.skipped.filter((k) => k !== "confirm-contact"), "confirm-contact"],
  };
  if (!nextSlot(next)) return submitLead(next, [...lead, text(intro)]);
  return advance(next, [...lead, text(intro)]);
}

/* ---------------------------------------------------------------
   Recomendación
   --------------------------------------------------------------- */

/**
 * Recomendación como tarjeta estructurada: una frase corta la presenta y la tarjeta sustituye la
 * explicación larga (no se repite su contenido en texto). `confirmed`: el visitante acaba de aceptar
 * una alternativa que ya vio en detalle, así que la tarjeta va en versión compacta.
 */
function recommend(state: ConversationState, lead: MessageBlock[] = [], cap?: Tier, { confirmed = false } = {}): Reply {
  const { needsHuman, intro, tier, ideal, ...card } = recommendPlan(state.profile, cap ?? state.planCap);
  const lower = nextLowerTier(state.profile, tier);
  const next: ConversationState = {
    ...state,
    expecting: null,
    recommended: card.planId,
    recommendedAi: card.aiTier,
    comparePair: tier !== ideal ? [ideal, tier] : lower ? [tier, lower] : state.comparePair,
    retries: 0,
  };
  const recommendation: RecommendationBlock = confirmed
    ? { type: "recommendation", variant: "confirmed", planId: card.planId, aiTier: card.aiTier, title: "Tu plan para empezar", tagline: card.tagline, budget: card.budget, notes: card.notes }
    : card;

  // Presupuesto por debajo del plan de entrada: opciones honestas y, ahora sí, el equipo.
  if (needsHuman) {
    return {
      blocks: [
        ...lead,
        text(intro),
        recommendation,
        text("Para que igual puedas avanzar, estas son las opciones:"),
        { type: "list", items: BUDGET_OPTIONS },
        closingBlock(next),
      ],
      quickReplies: [],
      state: { ...next, flow: "free", handoffOffered: true },
    };
  }

  // En cotización, tras recomendar se piden los datos para preparar la propuesta.
  if (state.flow === "quote") {
    return startContact("lead", next, "Para preparar tu cotización necesito unos pocos datos.", [...lead, ...(confirmed ? [] : [text(intro)]), recommendation]);
  }

  // La tarjeta lleva la decisión principal ("Quiero este plan" pide los datos aquí mismo, sin saltar a
  // WhatsApp) y la alternativa más económica. El asesor y la llamada quedan a un toque en las sugerencias.
  recommendation.actions = [
    { label: "Quiero este plan", message: "Quiero este plan", primary: true },
    ...(lower ? [{ label: "Ver alternativa más económica", message: "Algo más económico" }] : []),
  ];
  return {
    blocks: [...lead, ...(confirmed ? [] : [text(intro)]), recommendation],
    quickReplies: ["Hablar con un asesor", ...(state.callbackRequested ? [] : ["Quiero que me llamen"]), "¿Qué incluye exactamente?"],
    state: { ...next, flow: "free" },
  };
}

/** Continúa el flujo: siguiente pregunta o, si ya hay suficiente, el siguiente paso. */
function advance(state: ConversationState, lead: MessageBlock[] = []): Reply {
  const slot = nextSlot(state);
  if (!slot) return state.flow === "lead" || state.flow === "callback" ? submitLead(state, lead) : recommend(state, lead);
  const q = question(slot, state);
  return { blocks: [...lead, ...q.blocks], quickReplies: q.quickReplies, state: { ...state, expecting: slot, retries: 0 } };
}

const startFlow = (flow: ConversationState["flow"], state: ConversationState, intro: string, lead: MessageBlock[] = []): Reply =>
  advance({ ...state, flow }, [...lead, ...(intro ? [text(intro)] : [])]);

/** "Diseño responsive" → "diseño responsive"; respeta siglas como "SEO". */
const lowerFirst = (value: string) => (/^[A-ZÁÉÍÓÚÑ]{2}/.test(value) ? value : value.charAt(0).toLowerCase() + value.slice(1));

/** Resumen de lo que incluye cada plan, seguido de una invitación a encontrar el adecuado. */
function plansOverview(): MessageBlock[] {
  return [
    text("Así se diferencian los planes:"),
    {
      type: "list",
      items: knowledge.plans.map((p) => `**${p.name}** (desde ${p.price}): ${p.features.slice(0, 5).map(lowerFirst).join(", ")}.`),
    },
    text(
      "Jeipy AI no viene incluido en ningún plan: es un complemento que se contrata aparte. Básico no lleva IA; Esencial es compatible con **Jeipy AI Lite** (responder dudas y captar datos) y Premium con **Jeipy AI Pro** (un asistente comercial más completo). Para decirte cuál encaja contigo, cuéntame un poco de tu negocio.",
    ),
  ];
}

/* ---------------------------------------------------------------
   Conocimiento, objeciones y dudas
   --------------------------------------------------------------- */

function planInfo(planId: PlanId, state: ConversationState): Reply {
  const plan = getPlan(planId);
  return {
    blocks: [
      text(`**${plan.name}**, desde ${plan.price} ${plan.currency}. ${plan.summary}`),
      { type: "list", items: plan.features },
      text(`${plan.name} ${aiAvailability(plan)}. ${knowledge.priceNote}`),
      ...(state.recommended === planId && state.recommendedAi ? [text(aiCostNote(state.recommendedAi))] : []),
    ],
    quickReplies: state.recommended === planId ? ["Quiero avanzar", "Comparar planes"] : ["¿Me conviene este plan?", "Comparar planes"],
    state,
  };
}

function unknownTopic(topic: UnknownTopic, state: ConversationState): Reply {
  const intro =
    topic === "ecommerce"
      ? "Las tiendas con pagos en línea no están entre los servicios que tengo confirmados. Lo que sí incluyen los planes es un catálogo con paso directo a WhatsApp para cerrar la venta."
      : `No tengo información confirmada sobre ${unknownTopics[topic]} y prefiero no inventarla.`;
  return {
    blocks: [text(`${intro} El equipo te lo puede confirmar sin problema.`)],
    quickReplies: ["Hablar con una persona", "Seguir con el asistente"],
    state,
  };
}

/* ---------------------------------------------------------------
   Escalera comercial: objeciones, presupuesto y cambios de opinión
   --------------------------------------------------------------- */

const BUDGET_OPTIONS = [
  "**Reducir el alcance** a lo esencial para empezar.",
  "**Hacer el proyecto por etapas** y sumar funciones después.",
  "**Empezar con un plan inferior** y crecer cuando el negocio lo permita.",
  "**Hablar con un asesor** para una propuesta personalizada.",
];

const hasNeeds = (profile: Profile) => Boolean(profile.goal) || Object.values(profile.features).some(Boolean);

/** Nivel del que parte la objeción: la recomendación vigente, el plan mencionado o el ideal según lo contado. */
function currentTier(state: ConversationState, mentioned: PlanId[] = []): Tier | undefined {
  if (state.recommended) return tierOf(state.recommended, state.recommendedAi);
  const plan = [...mentioned].sort((a, b) => tierRank(b) - tierRank(a))[0];
  if (plan) return plan === "esencial" && state.profile.features.ai ? "esencial-ai" : plan;
  return hasNeeds(state.profile) ? pickTier(state.profile) : undefined;
}

/**
 * Objeción de precio o de alcance: antes de pasar a una persona, se busca el siguiente peldaño
 * que cubra una parte razonable de lo que necesita y se explica qué conserva y qué pierde.
 */
function offerCheaper(state: ConversationState, kind: "price" | "scope", from?: Tier, mentioned: PlanId[] = []): Reply {
  const current = from ?? currentTier(state, mentioned);
  if (!current) {
    return startFlow(
      "advisor",
      state,
      kind === "price"
        ? "Entiendo, la inversión importa. Para no recomendarte de más, veamos qué necesitas de verdad."
        : "Perfecto, empecemos por lo necesario. Para no recomendarte de más, cuéntame un poco de tu negocio.",
    );
  }
  const lower = nextLowerTier(state.profile, current);
  if (!lower) return entryOptions(state);

  const ack = from
    ? "Entiendo. Bajemos un nivel más:"
    : kind === "price"
      ? "Entiendo, la inversión importa. Podemos simplificar la solución sin perder lo principal:"
      : "Tiene sentido empezar con lo necesario. Esta sería la base:";
  const card = alternativeCard(state.profile, lower);
  card.actions = [
    { label: "Me interesa esta alternativa", message: "Sí, me interesa", primary: true },
    ...(lower !== "basico" ? [{ label: "Sigue siendo alto", message: "Sigue siendo alto" }] : []),
  ];
  // La tarjeta ya pregunta con sus botones; el visitante también puede responder con sus palabras.
  const slot: Slot = { kind: "confirm-plan", tier: lower, from: current };
  return {
    blocks: [text(ack), card],
    quickReplies: ["¿Cuál es la diferencia?"],
    state: { ...state, expecting: slot, comparePair: [current, lower], retries: 0 },
  };
}

/** Ya en el plan de entrada: se dice con transparencia y ahora sí se ofrece el equipo. */
function entryOptions(state: ConversationState): Reply {
  const basico = getPlan("basico");
  const next: ConversationState = { ...state, expecting: null, flow: "free", handoffOffered: true };
  return {
    blocks: [
      text(
        `Entiendo. **${basico.name}** es nuestro plan de entrada (desde ${basico.price}): presencia profesional con información del negocio, WhatsApp, ubicación y contacto. Para ajustar aún más la inversión, hay varias opciones:`,
      ),
      { type: "list", items: BUDGET_OPTIONS },
      closingBlock(next),
    ],
    quickReplies: [],
    state: next,
  };
}

/** Comparación en contexto: "¿cuál es la diferencia entre esos dos?". */
function compareTiers(state: ConversationState, pair: [Tier, Tier]): MessageBlock[] {
  const [hi, lo] = tierRank(pair[0]) >= tierRank(pair[1]) ? pair : [pair[1], pair[0]];
  if (hi === lo) return [text(`Es el mismo nivel: **${tierLabel(hi)}** (${tierPriceText(hi)}).`)];
  const cov = coverage(state.profile, lo);
  return [
    text(`La diferencia entre **${tierLabel(hi)}** y **${tierLabel(lo)}**:`),
    {
      type: "list",
      items: [
        `**${tierLabel(hi)}** (${tierPriceText(hi)}): suma ${joinNatural(tierAdds(state.profile, lo, hi))}.`,
        `**${tierLabel(lo)}** (${tierPriceText(lo)}): ${
          cov.lost.length ? `mantiene ${joinNatural(cov.kept)}, pero sin ${joinNatural(cov.lost)}` : `cubre ${joinNatural(cov.kept)}`
        }.`,
      ],
    },
    ...(cov.workarounds.length ? [text(cov.workarounds.join(" "))] : []),
    text("Con cualquiera de los dos puedes crecer después por etapas."),
  ];
}

/** Presupuesto dicho en texto libre: se usa para adaptar la recomendación, nunca se ignora. */
function applyBudget(state: ConversationState, amount: number, input = ""): Reply {
  const next: ConversationState = {
    ...state,
    expecting: null,
    planCap: undefined,
    profile: { ...enrichProfile(state.profile, input), budget: { amount } },
  };
  const ready = next.recommended || !nextSlot({ ...next, flow: "advisor" });
  if (ready) return recommend(next, [text(`Gracias, con un presupuesto de ${formatCop(amount)} ajusto la recomendación.`)]);

  const entry = getPlan("basico");
  if (tierCost("basico") > amount) {
    return startFlow(
      "advisor",
      next,
      `Te soy transparente: con ${formatCop(amount)} todavía no alcanza nuestro plan de entrada (**${entry.name}**, desde ${entry.price}). Podemos reducir el alcance, hacerlo por etapas o revisar una propuesta personalizada con un asesor. Primero cuéntame un poco de tu negocio para ver qué sería lo mínimo necesario.`,
    );
  }
  const plans: PlanId[] = ["basico", "esencial", "premium"];
  const fits = plans.filter((id) => tierCost(id) <= amount).pop()!;
  const above = plans[plans.indexOf(fits) + 1];
  return startFlow(
    "advisor",
    next,
    `Perfecto, con ${formatCop(amount)} entra **${getPlan(fits).name}** (desde ${getPlan(fits).price})${
      above ? `; ${getPlan(above).name} (desde ${getPlan(above).price}) quedaría por encima` : ""
    }. Para confirmar que cubre lo que necesitas, cuéntame un poco más.`,
  );
}

/** Tras un cambio en el perfil: recomienda de nuevo si ya había recomendación, o sigue el diagnóstico. */
function continueWith(state: ConversationState, lead: MessageBlock[]): Reply {
  if (state.recommended) {
    const before = tierOf(state.recommended, state.recommendedAi);
    const reply = recommend(state, lead);
    const after = reply.state.recommended ? tierOf(reply.state.recommended, reply.state.recommendedAi) : before;
    if (after !== before) reply.blocks.splice(lead.length, 0, text("Con eso cambia mi recomendación."));
    return reply;
  }
  return startFlow(state.flow === "quote" ? "quote" : "advisor", state, "", lead);
}

const FEATURE_SHORT: Record<Feature, string> = {
  catalog: "catálogo",
  booking: "reservas",
  forms: "formularios",
  ai: "IA",
  integrations: "integraciones",
  seo: "SEO",
  automation: "automatizaciones",
};

/** "No quiero reservas", "sin IA": se respeta el cambio y se ajusta la propuesta. */
function dropFeatures(state: ConversationState, input: string, features: Feature[]): Reply {
  const profile = enrichProfile(state.profile, input);
  for (const f of features) profile.features[f] = false;
  const ack = `Entendido, sin ${joinNatural(features.map((f) => FEATURE_SHORT[f]))}.`;
  return continueWith({ ...state, profile, expecting: null }, [text(ack)]);
}

/** "Solo necesito aparecer en internet": presencia profesional, sin funciones que no pidió. */
function presenceOnly(state: ConversationState, input: string): Reply {
  const t = normalize(input);
  const known = enrichProfile(state.profile, input);
  const f = { ...known.features };
  for (const key of ["catalog", "booking", "forms", "ai", "automation", "integrations"] as Feature[]) f[key] = false;
  const wantsGoogle = t.includes(" encuentren") || t.includes(" google") || t.includes(" buscador");
  const profile: Profile = { ...known, features: f, goal: "image", aiLevel: undefined, aiTier: undefined };
  const intro = `Entendido: lo que buscas es una presencia profesional en internet. Para eso, **Básico** suele ser suficiente: página informativa con tu información, WhatsApp, ubicación y contacto, con diseño profesional.${
    wantsGoogle ? " Si además quieres posicionarte mejor en las búsquedas de Google, Esencial incluye SEO básico." : ""
  }`;
  return continueWith({ ...state, profile, planCap: undefined, expecting: null }, [text(intro)]);
}

/** "¿Después podría ponerle IA?": sí, por etapas, sin prometer lo que el plan no trae. */
function upgradeLater(state: ConversationState, feature?: Feature): MessageBlock[] {
  const tier = state.recommended ? tierOf(state.recommended, state.recommendedAi) : undefined;
  const lite = getAiTier("lite");
  const pro = getAiTier("pro");
  if (feature === "ai") {
    const answer =
      tier === "basico"
        ? `Sí, pero Jeipy AI se suma desde Esencial: primero pasarías de Básico a Esencial y luego agregarías **${lite.name}** (configuración desde ${lite.setup.price} + operación mensual según uso).`
        : tier === "esencial"
          ? `Sí. **${lite.name}** se puede sumar más adelante a Esencial sin cambiar de plan: configuración desde ${lite.setup.price} + operación mensual según uso.`
          : tier === "esencial-ai"
            ? `Ya lo tienes contemplado con **${lite.name}**. Si más adelante necesitas reservas o clasificar clientes, podrías pasar a Premium con **${pro.name}**.`
            : tier === "premium"
              ? `Sí. Premium es compatible con **${pro.name}**, que se puede sumar después: configuración desde ${pro.setup.price} + operación mensual según uso.`
              : `Sí. Puedes empezar sin IA y sumarla después: **${lite.name}** se añade a Esencial y **${pro.name}** acompaña a Premium.`;
    return [text(answer)];
  }
  return [
    text(
      "Sí, puedes empezar con lo necesario y crecer por etapas: por ejemplo, pasar de Básico a Esencial para sumar catálogo y formularios, o de Esencial a Premium para reservas y automatizaciones. El equipo te confirma cómo se ajustan el alcance y el valor en cada etapa.",
    ),
  ];
}

/** "No entendí": se explica más simple lo último, sin reiniciar. */
const SLOT_EXPLANATION: Partial<Record<Slot["kind"] | `feature:${Feature}`, string>> = {
  businessType: "Solo necesito saber a qué se dedica tu negocio; por ejemplo, restaurante, barbería, tienda o consultorio.",
  website:
    "Te pregunto dónde está hoy tu negocio en internet: por ejemplo WhatsApp, Instagram, Facebook, TikTok, Google Maps o una página web. Puedes contármelo con tus palabras.",
  goal: "Te pregunto qué es lo más importante para ti: conseguir más clientes, verte más profesional, mostrar lo que vendes o automatizar la atención.",
  "feature:catalog": "Me refiero a una sección donde tus clientes vean tus productos o servicios con sus precios.",
  "feature:booking": "Me refiero a que tus clientes puedan apartar una cita o reserva desde la web, sin tener que escribirte.",
  "feature:forms": "Me refiero a un formulario donde el cliente deja su solicitud y te llega directamente.",
  "feature:ai": "Me refiero a un asistente como yo en tu página, que responde las preguntas de tus clientes a cualquier hora.",
  aiLevel:
    "Te lo pongo más simple: ¿quieres que el asistente solo conteste preguntas y tome datos (Jeipy AI Lite), o que además agende citas y organice a tus clientes (Jeipy AI Pro)?",
  budget: "Es un valor aproximado de lo que piensas invertir en la página. Es opcional.",
  consent: "Te pido permiso para que el equipo de Jeipy te contacte sobre esta solicitud. Sin tu autorización no enviamos nada.",
};

function explainAgain(state: ConversationState): Reply {
  const slot = state.expecting;
  if (slot) {
    if (slot.kind === "confirm-plan") {
      return {
        blocks: [
          text(
            `En simple: **${tierLabel(slot.tier)}** cuesta menos que **${tierLabel(slot.from)}**, pero trae menos funciones. Te lo muestro lado a lado:`,
          ),
          ...compareTiers(state, [slot.from, slot.tier]),
          ...question(slot, state).blocks,
        ],
        quickReplies: question(slot, state).quickReplies,
        state,
      };
    }
    const q = question(slot, state);
    const explanation = SLOT_EXPLANATION[slotKey(slot) as keyof typeof SLOT_EXPLANATION] ?? "Te lo pregunto para recomendarte solo lo que necesitas.";
    return { blocks: [text(explanation), ...q.blocks], quickReplies: q.quickReplies, state };
  }
  if (state.recommended) {
    const tier = tierOf(state.recommended, state.recommendedAi);
    const { because } = recommendPlan(state.profile, state.planCap);
    const reason = because.find((b) => /^(Quieres|Necesitas|Buscas)/.test(b)) ?? because[0];
    return {
      blocks: [
        text(
          `Te lo resumo en simple: te recomiendo **${tierLabel(tier)}** (${tierPriceText(tier)}) porque ${lowerFirst(reason ?? "es lo que mejor se ajusta a lo que me contaste.").replace(/\.$/, "")}. Si prefieres algo más económico o tienes otra duda, escríbeme con tus palabras.`,
        ),
      ],
      quickReplies: ["Algo más económico", "¿Qué incluye exactamente?", "Tengo otra duda"],
      state,
    };
  }
  return {
    blocks: [
      text(
        "Te explico en simple: tenemos tres planes web. **Básico** es presencia digital profesional, **Esencial** es una web comercial para captar clientes, y **Premium** es una solución comercial automatizada (seguimiento de oportunidades, integraciones, reservas y procesos). Jeipy AI se suma aparte si quieres un asistente. Cuéntame a qué se dedica tu negocio y te digo cuál te sirve.",
      ),
    ],
    quickReplies: CHIPS.start,
    state,
  };
}

/** Los tres conceptos de precio: plan web, configuración de la IA y operación mensual. */
function priceConcepts(): MessageBlock {
  const { setup, operation } = knowledge.aiOffer.pricing;
  return {
    type: "list",
    items: [
      "**Plan web:** el precio de tu página (Básico, Esencial o Premium).",
      `**${setup.title} de Jeipy AI:** ${lowerFirst(setup.text)}`,
      `**${operation.title}:** ${lowerFirst(operation.text)}`,
    ],
  };
}

function aiTierInfo(id: AiTierId, state: ConversationState): Reply {
  const tier = getAiTier(id);
  const price =
    id === "custom"
      ? `Desde ${tier.setup.price} ${tier.setup.currency}. ${tier.setup.note} Ajustes y mantenimiento: ${lowerFirst(tier.maintenance.value)}.`
      : `Configuración inicial desde ${tier.setup.price} ${tier.setup.currency} (pago único) + operación mensual según nivel de uso. ${tier.maintenance.value}.`;
  return {
    blocks: [
      text(`**${tier.name}:** ${lowerFirst(tier.audience)} ${tier.pairsWith}.`),
      { type: "list", items: tier.features },
      text(`${price} Se suma al precio del plan web, no lo reemplaza.`),
    ],
    quickReplies: [`Quiero ${tier.name}`, "¿Cuánto es la mensualidad?", "¿Qué plan me conviene?"],
    state,
  };
}

function answerIntent(intent: Intent, state: ConversationState): Reply | null {
  switch (intent.type) {
    case "about":
      return { blocks: [text(`${company.pitch}\n\nLo resumimos así: **${company.slogan}**.`)], quickReplies: CHIPS.afterInfo, state };
    case "services":
      return {
        blocks: [text("Esto es lo que hacemos:"), { type: "list", items: knowledge.services.map((s) => `**${s.title}:** ${s.description}`) }],
        quickReplies: CHIPS.afterInfo,
        state,
      };
    case "prices":
      return {
        blocks: [
          { type: "list", items: knowledge.plans.map((p) => `**${p.name}:** desde ${p.price} ${p.currency}`) },
          text(
            `Son precios orientativos: ${knowledge.priceNote.charAt(0).toLowerCase()}${knowledge.priceNote.slice(1)} Si además quieres Jeipy AI, se contrata aparte con su propia configuración inicial y una mensualidad según uso. ¿Vemos cuál aplica a tu caso?`,
          ),
        ],
        quickReplies: ["¿Qué plan me conviene?", "¿Cuánto cuesta Jeipy AI?", "¿Qué diferencia hay entre planes?"],
        state,
      };
    case "upgrade-later":
      return {
        blocks: upgradeLater(state, intent.feature),
        quickReplies: state.recommended ? ["Quiero avanzar", "Tengo otra duda"] : CHIPS.afterInfo,
        state,
      };
    case "compare": {
      // "¿Y la diferencia entre esos dos?": se resuelve con lo que se está conversando.
      const rec = state.recommended ? tierOf(state.recommended, state.recommendedAi) : undefined;
      const pair: [Tier, Tier] | undefined =
        intent.plans.length === 1 && rec ? [rec, intent.plans[0]] : intent.plans.length === 0 ? state.comparePair : undefined;
      if (pair) {
        return {
          blocks: compareTiers(state, pair),
          quickReplies: state.recommended ? ["Algo más económico", "Quiero avanzar", "Tengo otra duda"] : CHIPS.afterInfo,
          state,
        };
      }
      return {
        blocks: [
          {
            type: "list",
            items: [
              `**Básico** (desde ${getPlan("basico").price}): presencia digital profesional, sin IA.`,
              `**Esencial** (desde ${getPlan("esencial").price}): web comercial orientada a captación, con catálogo, formularios, SEO básico y Analytics. Compatible con Jeipy AI Lite como complemento opcional.`,
              `**Premium** (desde ${getPlan("premium").price}): solución digital comercial y automatizada: seguimiento de oportunidades, flujos, integraciones y funciones a medida. Compatible con Jeipy AI Pro, que se contrata aparte.`,
            ],
          },
          text("La diferencia está en lo que necesitas lograr. Si me cuentas un poco de tu negocio, te digo cuál tiene más sentido."),
        ],
        quickReplies: ["¿Qué plan me conviene?", "Quiero cotizar una página"],
        state,
      };
    }
    case "plan-info":
      return planInfo(intent.planId, state);
    case "process":
      return {
        blocks: [text("Trabajamos en cuatro pasos:"), { type: "list", items: knowledge.process.map((s) => `**${s.title}:** ${s.description}`) }],
        quickReplies: CHIPS.afterInfo,
        state,
      };
    case "ai-info":
      return {
        blocks: [
          text(
            `**${knowledge.jeipyAi.name}** convierte tu página en un asistente que responde, orienta y ayuda a transformar visitantes en clientes, incluso cuando tú no estás disponible. Como lo estoy haciendo contigo.`,
          ),
          text("Se suma a tu plan web en tres niveles:"),
          {
            type: "list",
            items: knowledge.aiTiers.map((t) => `**${t.name}** (${lowerFirst(t.pairsWith)}): ${lowerFirst(t.audience)}`),
          },
          text("No reemplaza tu página: la potencia. Tiene una configuración inicial de pago único y una operación mensual según el nivel de uso."),
        ],
        quickReplies: ["¿Cuánto cuesta Jeipy AI?", "Quiero automatizar mi negocio", "¿Qué plan me conviene?"],
        state,
      };
    case "ai-pricing":
      return {
        blocks: [
          text("Jeipy AI se contrata aparte del plan web. Estos son los valores de configuración inicial:"),
          { type: "list", items: (["lite", "pro", "custom"] as const).map((id) => aiTierPriceLine(id)) },
          text("Para que quede claro, hay tres conceptos distintos:"),
          priceConcepts(),
          text("La mensualidad no tiene un valor fijo publicado: depende del uso y del servicio. Si me cuentas de tu negocio, te oriento sobre el nivel que necesitas."),
        ],
        quickReplies: ["Continuar el diagnóstico", "¿Cuánto es la mensualidad?", "Hablar con una persona"],
        state,
      };
    case "ai-monthly":
      return {
        blocks: [
          text(
            "La operación mensual de Jeipy AI cubre el uso de la IA, mantenimiento, actualizaciones, soporte y optimización. Su valor depende del nivel de uso y del alcance de tu solución, así que no tengo una cifra fija y prefiero no inventarla.",
          ),
          {
            type: "list",
            items: knowledge.aiTiers.map((t) => `**${t.name}:** ${lowerFirst(t.maintenance.value)}.`),
          },
          text(
            "Es distinta de la configuración inicial, que se paga una sola vez. Si seguimos con el diagnóstico, puedo orientarte sobre el nivel que necesitas y el equipo te confirma la mensualidad estimada.",
          ),
        ],
        quickReplies: ["Continuar el diagnóstico", "Ver niveles de Jeipy AI", "Hablar con una persona"],
        state,
      };
    case "ai-tier":
      return aiTierInfo(intent.tier, state);
    case "guarantee":
      return {
        blocks: [
          text(
            "No puedo prometerte resultados: dependen de muchos factores de tu negocio. Lo que sí hacemos es construir una web pensada para convertir: clara, rápida, conectada a WhatsApp y, desde Esencial, medible con Analytics para tomar mejores decisiones.",
          ),
        ],
        quickReplies: state.recommended ? CHIPS.afterRecommendation : CHIPS.afterInfo,
        state,
      };
    case "think-later":
      return {
        blocks: [
          text(
            state.recommended
              ? "Claro, sin prisa. Si quieres, déjame tus datos y el equipo te envía la propuesta con este resumen para que la revises con calma."
              : "Claro, sin prisa. Cuando quieras retomarlo, aquí estoy.",
          ),
        ],
        quickReplies: state.recommended ? ["Dejar mis datos", "Tengo otra duda"] : CHIPS.afterInfo,
        state,
      };
    case "unknown-topic":
      return unknownTopic(intent.topic, state);
    case "greeting":
      return { blocks: [text("¡Hola! Soy Jeipy AI. Te ayudo a encontrar la solución digital que tiene sentido para tu negocio. ¿Por dónde empezamos?")], quickReplies: CHIPS.start, state };
    case "thanks":
      return { blocks: [text("¡Con gusto! Si te surge otra duda, aquí estoy.")], quickReplies: state.recommended ? CHIPS.afterRecommendation : CHIPS.afterInfo, state };
    default:
      return null;
  }
}

/** El visitante eligió un nivel de Jeipy AI (p. ej. desde los CTA de la sección Planes). */
function startAiTierFlow(id: AiTierId, state: ConversationState): Reply {
  const tier = getAiTier(id);
  const p = state.profile;
  const features = { ...p.features, ai: true };
  if (id !== "lite") features.automation = true;
  if (id === "custom") features.integrations = true;
  const profile: Profile = { ...p, aiTier: id, aiLevel: id === "lite" ? "basic" : "advanced", goal: p.goal ?? "automate", features };
  const intro: Record<AiTierId, string> = {
    lite: `Buena elección. **${tier.name}** se suma a tu página para responder preguntas frecuentes, orientar y captar datos, sin complicaciones. Se combina con el plan Esencial: primero entendamos tu negocio para confirmar la base web que lo acompaña.`,
    pro: `Buena decisión. **${tier.name}** convierte el asistente en una herramienta comercial: diagnostica, recomienda, clasifica clientes potenciales y agenda cuando aplica. Va de la mano del plan Premium. Para proponerte algo a tu medida, quiero entender tu negocio.`,
    custom: `Perfecto. **${tier.name}** se diseña a partir de tu operación: integraciones, CRM, múltiples flujos o cotizaciones. Para preparar una propuesta orientativa, cuéntame un poco de tu proyecto.`,
  };
  return startFlow(id === "custom" ? "quote" : "advisor", { ...state, profile }, intro[id]);
}

/* ---------------------------------------------------------------
   Punto de entrada
   --------------------------------------------------------------- */

export function respond(input: string, current: ConversationState): Reply {
  const t = normalize(input);
  const intent = detectIntent(input);

  if (intent?.type === "restart") {
    return { blocks: [text("Listo, empecemos de nuevo. ¿En qué te ayudo?")], quickReplies: CHIPS.start, state: { ...current, flow: "free", expecting: null } };
  }

  // 1. Respuesta a la pregunta pendiente (tiene prioridad: "solo redes y WhatsApp" es un dato, no una petición).
  if (current.expecting) {
    const slot = current.expecting;

    if (slot.kind === "confirm-plan") {
      const base: ConversationState = { ...current, expecting: null };
      // "Sigue siendo alto": un peldaño más abajo, siempre explicando qué se pierde.
      if (intent?.type === "objection-price" || intent?.type === "objection-scope" || t.includes(" sigue siendo")) {
        return offerCheaper(base, intent?.type === "objection-scope" ? "scope" : "price", slot.tier);
      }
      if (intent?.type === "budget") return applyBudget(base, intent.amount);
      if (intent?.type === "not-understood") return explainAgain(current);
      if (intent?.type === "compare" || t.includes(" diferencia")) {
        const q = question(slot, current);
        return { blocks: [...compareTiers(current, [slot.from, slot.tier]), ...q.blocks], quickReplies: q.quickReplies, state: current };
      }
      const answer = parseYesNo(input) ?? (t.includes(" me interesa") || t.includes(" me sirve") || t.includes(" ver ") ? "yes" : undefined);
      if (answer === "yes") {
        return recommend({ ...base, planCap: slot.tier }, [text("Perfecto, ajustemos la propuesta. Así quedaría:")], slot.tier, { confirmed: true });
      }
      if (answer === "no" || t.includes(" lo mantengo")) {
        if (!current.recommended) return recommend(base, [text("Perfecto, mantengamos la opción completa.")]);
        return {
          blocks: [
            text(
              `Perfecto, mantenemos ${tierLabel(slot.from)}. El valor final se confirma al revisar el alcance, así que hay margen para ajustarlo con el equipo.`,
            ),
          ],
          quickReplies: ["Quiero avanzar", "Tengo otra duda"],
          state: base,
        };
      }
    } else if (intent?.type === "not-understood") {
      // "No entiendo" no es un "no": se explica la pregunta.
      return explainAgain(current);
    } else if (slot.kind === "consent") {
      const t2 = normalize(input);
      if (t2.includes(" autorizo") || t2.includes(" acepto") || parseYesNo(input) === "yes") return submitLead(current);
      if (parseYesNo(input) === "no" || declines(input)) return abortLead(current, "Entendido, no envío tus datos.");
    } else if (CONTACT_SLOTS.has(slot.kind) && REQUIRED_SLOTS.has(slot.kind) && declines(input)) {
      return abortLead(current);
    } else {
      const filled = fillSlot(slot, input, current);
      if (filled) {
        const state: ConversationState = {
          ...filled.state,
          profile: CONTACT_SLOTS.has(slot.kind) ? filled.state.profile : enrichProfile(filled.state.profile, input),
          expecting: null,
          retries: 0,
        };
        return advance(state, filled.ack ? [text(filled.ack)] : []);
      }
    }

    // Texto libre a mitad del diagnóstico: se aprovecha sin reiniciar ni repetir preguntas.
    const diagnosing = !CONTACT_SLOTS.has(slot.kind);
    if (intent?.type === "budget") {
      const state: ConversationState = { ...current, expecting: null, profile: { ...current.profile, budget: { amount: intent.amount } } };
      return advance(state, [text(`Anotado: presupuesto de ${formatCop(intent.amount)}. Lo tendré en cuenta en la recomendación.`)]);
    }
    if (diagnosing && intent?.type === "drop-feature") {
      const profile = enrichProfile(current.profile, input);
      for (const f of intent.features) profile.features[f] = false;
      return advance({ ...current, profile, expecting: null }, [text(`Entendido, sin ${joinNatural(intent.features.map((f) => FEATURE_SHORT[f]))}.`)]);
    }
    if (diagnosing && intent?.type === "presence") return presenceOnly(current, input);
    if (diagnosing && !current.recommended && (intent?.type === "objection-price" || intent?.type === "objection-scope")) {
      const q = question(slot, current);
      return {
        blocks: [text("Lo tengo en cuenta: te voy a recomendar solo lo necesario, sin pasarme de lo que quieres invertir."), ...q.blocks],
        quickReplies: q.quickReplies,
        state: current,
      };
    }

    // Un dato nuevo o una corrección a mitad del diagnóstico ("también tengo página web"):
    // se guarda y se sigue con la siguiente pregunta pendiente, sin reiniciar.
    if (diagnosing && !isQuestion(input)) {
      const learnedMid = enrichProfile(current.profile, input);
      if (JSON.stringify(learnedMid) !== JSON.stringify(current.profile)) {
        return advance({ ...current, profile: learnedMid, expecting: null, retries: 0 }, [
          text(learnedAck(current.profile, learnedMid) ?? "Anotado, lo tengo en cuenta."),
        ]);
      }
    }

    // "¿Cuál es mejor?" o "no sé" a mitad del diagnóstico: se explica para qué son las preguntas.
    if (intent && ["which-best", "unsure", "recommend"].includes(intent.type)) {
      const q = question(slot, current);
      return {
        blocks: [text("Depende de lo que quieras lograr, y justo para eso te pregunto: con un par de respuestas más te digo cuál tiene más sentido."), ...q.blocks],
        quickReplies: q.quickReplies,
        state: current,
      };
    }

    // Una duda, objeción o petición en medio del diagnóstico: se atiende y se retoma.
    if (intent && !["quote", "recommend", "digitalize", "which-best", "unsure"].includes(intent.type)) {
      if (intent.type === "ai-tier" && intent.wants) return startAiTierFlow(intent.tier, { ...current, expecting: null });
      if (["human", "lead", "objection-price", "objection-scope", "advance", "callback", "restart"].includes(intent.type)) {
        return respond(input, { ...current, expecting: null });
      }
      const answer = answerIntent(intent, current);
      if (answer) {
        const q = question(slot, current);
        return { blocks: [...answer.blocks, text("Retomando:"), ...q.blocks], quickReplies: q.quickReplies, state: current };
      }
    }

    if (current.retries < 1) {
      const q = question(slot, current);
      const hint =
        slot.kind === "phone"
          ? "Necesito un número de teléfono válido, por ejemplo 300 123 4567."
          : slot.kind === "email"
            ? "No reconocí el correo. Puedes escribirlo de nuevo u omitirlo."
            : "Perdona, no te entendí bien.";
      return { blocks: [text(hint), ...q.blocks], quickReplies: q.quickReplies, state: { ...current, retries: current.retries + 1 } };
    }
    // Sin nombre, teléfono ni autorización no se envía nada.
    if (REQUIRED_SLOTS.has(slot.kind)) return abortLead(current);
    return advance({ ...current, expecting: null, skipped: [...current.skipped, slotKey(slot)], retries: 0 }, [text("No te preocupes, sigamos.")]);
  }

  // 2. Cierre y atención humana: siempre se respetan.
  if (intent?.type === "retry-submit" && current.pendingSubmission && current.consentGiven) {
    return submitLead(current);
  }
  if (intent?.type === "callback") {
    if (current.leadCaptured && current.callbackRequested) {
      return {
        blocks: [text("Tu solicitud de llamada ya está registrada: un asesor de Jeipy podrá contactarte. ¿Te ayudo con algo más mientras tanto?")],
        quickReplies: ["Tengo otra duda"],
        state: current,
      };
    }
    return startContact(
      "callback",
      current,
      current.profile.name && current.profile.phone ? "Perfecto, te llamamos." : "Perfecto, te llamamos. Solo necesito un par de datos.",
    );
  }
  if (intent?.type === "human") {
    if (!isWhatsAppConfigured()) {
      if (current.leadCaptured && current.callbackRequested) return respond("Quiero que me llamen", current);
      return startContact("callback", current, "Con gusto. La forma más directa es que un asesor de Jeipy te llame. Solo necesito un par de datos.");
    }
    const state = { ...current, handoffOffered: true };
    return {
      blocks: [
        text(
          current.recommended || current.profile.businessType
            ? "Claro. Al escribirnos, el asesor verá un resumen breve de lo que hablamos para que no tengas que repetirlo."
            : "Claro, una persona del equipo puede ayudarte.",
        ),
        closingBlock(state),
      ],
      quickReplies: [],
      state,
    };
  }
  if (intent?.type === "lead" || (intent?.type === "advance" && current.recommended)) {
    if (current.leadCaptured) {
      return {
        blocks: [text("Ya tenemos tus datos: el equipo de Jeipy te contactará para continuar con tu proyecto. ¿Te ayudo con algo más?")],
        quickReplies: ["Tengo otra duda"],
        state: current,
      };
    }
    return startContact(
      "lead",
      current,
      intent.type === "advance" && current.recommended
        ? `Excelente decisión. Para que el equipo prepare tu propuesta de ${tierLabel(tierOf(current.recommended, current.recommendedAi))}, necesito unos pocos datos.`
        : "Perfecto. Para que el equipo te contacte, necesito unos pocos datos.",
    );
  }
  if (intent?.type === "advance") {
    return startFlow("quote", { ...current, profile: enrichProfile(current.profile, input) }, "¡Genial! Antes de preparar la propuesta, entendamos bien tu proyecto.");
  }
  // Objeciones y cambios de opinión: primero se intenta una alternativa viable, no el traspaso.
  if (intent?.type === "budget") return applyBudget(current, intent.amount, input);
  if (intent?.type === "objection-price" || intent?.type === "objection-scope") {
    return offerCheaper(
      { ...current, profile: enrichProfile(current.profile, input) },
      intent.type === "objection-price" ? "price" : "scope",
      undefined,
      mentionedPlans(t),
    );
  }
  if (intent?.type === "drop-feature") return dropFeatures(current, input, intent.features);
  if (intent?.type === "presence") return presenceOnly(current, input);
  if (intent?.type === "not-understood") return explainAgain(current);

  if (t.includes(" seguir con el asistente") || t.includes(" tengo otra duda")) {
    return {
      blocks: [text("Perfecto, sigo aquí. ¿Qué te gustaría saber?")],
      quickReplies: current.recommended ? ["¿Qué incluye exactamente?", "¿Cuánto cuesta Jeipy AI?", "Ver precios"] : CHIPS.start,
      state: current,
    };
  }

  // 3. Referencias al plan ya recomendado.
  if (current.recommended && intent?.type !== "plans-overview" && (t.includes(" ese plan") || t.includes(" que incluye") || t.includes(" incluye exactamente"))) {
    return planInfo(current.recommended, current);
  }

  // 4. Flujos guiados.
  const enriched = enrichProfile(current.profile, input);
  const learned = JSON.stringify(enriched) !== JSON.stringify(current.profile);
  const withProfile = { ...current, profile: enriched };

  if (intent?.type === "ai-tier" && intent.wants) return startAiTierFlow(intent.tier, withProfile);

  switch (intent?.type) {
    case "plans-overview":
      return startFlow("advisor", withProfile, "", plansOverview());
    case "automate":
      return startFlow(
        "advisor",
        { ...withProfile, profile: { ...enriched, goal: enriched.goal ?? "automate", features: { ...enriched.features, ai: true } } },
        "Buena decisión. Automatizar puede ir desde responder preguntas frecuentes hasta gestionar reservas o procesos completos. Para recomendarte el nivel correcto, primero quiero entender tu negocio.",
      );
    case "quote":
      return startFlow(
        "quote",
        withProfile,
        current.recommended ? "Perfecto, ya tengo buena parte de la información." : "Con gusto. Para darte un valor orientativo, primero quiero entender tu proyecto.",
      );
    case "recommend":
      return startFlow("advisor", withProfile, "Con gusto. Para recomendarte bien, quiero entender cómo trabajas hoy.");
    case "which-best":
      return startFlow("advisor", withProfile, "Depende de lo que quieras lograr. Te hago un par de preguntas y te recomiendo el que tenga más sentido para tu negocio.");
    case "unsure":
      return startFlow("advisor", withProfile, "Tranquilo, para eso estoy. Lo definimos juntos con unas preguntas cortas.");
    case "digitalize":
      return startFlow(
        "advisor",
        withProfile,
        `¡Buenísimo! ${learnedAck(current.profile, enriched) ?? ""} Para recomendarte bien, quiero entender cómo trabajas hoy.`.replace(/\s+/g, " "),
      );
  }

  // 5. Dudas de conocimiento. Si el mensaje describe el negocio (no es una pregunta),
  //    se trata como información del diagnóstico aunque mencione "IA" o "servicios".
  const describing = learned && !isQuestion(input) && Boolean(enriched.businessType || Object.keys(enriched.features).length);
  if (intent && !describing) {
    const answer = answerIntent(intent, current);
    if (answer) return answer;
  }

  // 6. El visitante cuenta algo de su negocio: se guarda, se acusa y se sigue sin repetir preguntas.
  if (learned) {
    const ack = learnedAck(current.profile, enriched);
    if (current.recommended) {
      const before = tierOf(current.recommended, current.recommendedAi);
      const { tier } = recommendPlan(enriched, current.planCap);
      // Un dato que no cambia el plan (p. ej. "también tengo página") se acusa sin repetir la tarjeta.
      if (tier === before && ack) {
        return {
          blocks: [text(`${ack} Lo sumo a tu solicitud; la recomendación de ${tierLabel(tier)} se mantiene.`)],
          quickReplies: ["Quiero avanzar", "Tengo otra duda"],
          state: withProfile,
        };
      }
      return continueWith(withProfile, [text(ack ?? "Gracias por el dato, lo tengo en cuenta.")]);
    }
    return startFlow("advisor", withProfile, ack ? `${ack} Para recomendarte bien, sigamos.` : "Perfecto. Para recomendarte bien, quiero entender cómo trabajas hoy.");
  }

  // 7. Un "sí" o "no" suelto sin pregunta pendiente.
  if (parseYesNo(input)) {
    return { blocks: [text("Entendido. ¿En qué más te puedo ayudar?")], quickReplies: current.recommended ? CHIPS.afterRecommendation : CHIPS.afterInfo, state: current };
  }

  // 8. Sin información configurada: se reconoce y se ofrece ayuda humana.
  return {
    blocks: [
      text("Eso no lo tengo confirmado y prefiero no inventarlo. Puedo ayudarte con planes, precios, servicios, el proceso o Jeipy AI. Si lo prefieres, te pongo en contacto con el equipo."),
    ],
    quickReplies: CHIPS.fallback,
    state: current,
  };
}

/** Implementación local del contrato `AssistantBrain`. */
export const localBrain: AssistantBrain = {
  async reply(input, state) {
    return respond(input, state);
  },
};
