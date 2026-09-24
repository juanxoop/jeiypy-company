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
  extractBusinessType,
  extractChannel,
  extractEmail,
  extractGoal,
  extractName,
  extractPhone,
  extractWebsite,
  isBookingBusiness,
  isKnownBusiness,
  isQuestion,
  normalize,
  parseAiLevelAnswer,
  parseYesNo,
  type Intent,
} from "./nlu";
import { FEATURE_LABEL, GOAL_LABEL, WEBSITE_LABEL, needsLabels } from "@/features/leads/labels";
import { aiCostNote, lowerPlan, needsAiLevelQuestion, recommendPlan } from "./recommend";
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

function businessKind(profile: Profile): "food" | "retail" | "service" {
  const t = normalize(profile.businessType ?? "");
  if (/restaurante|cafe|panaderia|pasteleria|comidas|cafeteria/.test(t)) return "food";
  if (/tienda|boutique|ferreteria|joyeria|optica|drogueria|papeleria|floristeria/.test(t)) return "retail";
  return "service";
}

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
    pending({ kind: "website" }, Boolean(profile.website)),
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
        blocks: [text("¿Ya tienes página web o solo manejas redes y WhatsApp?")],
        quickReplies: ["Ya tengo web", "Solo redes y WhatsApp", "Aún no tengo nada"],
      };
    case "goal":
      return {
        blocks: [text("¿Qué es lo que más quieres lograr con la web?")],
        quickReplies: ["Conseguir más clientes", "Verme más profesional", "Mostrar productos o servicios", "Automatizar la atención"],
      };
    case "budget":
      return {
        blocks: [text("¿Tienes un presupuesto aproximado? Es opcional, pero me ayuda a ajustar la recomendación.")],
        quickReplies: ["Hasta $600.000", "Hasta $1.000.000", "Hasta $1.500.000", "Más de $1.500.000", "Prefiero no decirlo"],
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
        blocks: [text(`¿Cómo se llama tu ${isKnownBusiness(profile.businessType) ? profile.businessType : "negocio"}?`)],
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
      return { blocks: [text(`¿Quieres que lo ajustemos a ${getPlan(slot.planId).name}?`)], quickReplies: [`Sí, ver ${getPlan(slot.planId).name}`, "No, lo mantengo"] };
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

function articleFor(business: string): string {
  return /^(barberia|peluqueria|tienda|clinica|veterinaria|academia|floristeria|joyeria|optica|drogueria|papeleria|lavanderia|constructora|agencia|cafeteria|panaderia|pasteleria|inmobiliaria|boutique|firma)/.test(
    normalize(business).trim(),
  )
    ? "una"
    : "un";
}

type Filled = { state: ConversationState; ack?: string };

function fillSlot(slot: Slot, input: string, state: ConversationState): Filled | null {
  const profile: Profile = { ...state.profile, features: { ...state.profile.features } };
  const next = (ack?: string): Filled => ({ state: { ...state, profile }, ack });

  switch (slot.kind) {
    case "businessType": {
      const value = extractBusinessType(input, { loose: true });
      if (!value) return null;
      profile.businessType = value;
      return next(isKnownBusiness(value) ? `Perfecto, ${articleFor(value)} ${value}.` : "Perfecto.");
    }
    case "website": {
      const value = extractWebsite(input, { direct: true });
      if (!value) return null;
      profile.website = value;
      return next(
        {
          yes: "Bien, entonces podemos mejorarla o rehacerla sobre una base más sólida.",
          no: "Perfecto, empezarías desde cero, que es el mejor momento para hacerlo bien.",
          social: "Es lo más común. Una web propia te da más control y más confianza.",
        }[value],
      );
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
  if (profile.website) rows.push({ label: "Hoy", value: WEBSITE_LABEL[profile.website] });
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
  const business = profile.businessName
    ? profile.businessName
    : isKnownBusiness(profile.businessType)
      ? `mi ${profile.businessType}`
      : "mi negocio";
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
    website: profile.website,
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
export function leadSubmissionResult(state: ConversationState, ok: boolean): AssistantTurn {
  if (ok) {
    const next: ConversationState = { ...state, flow: "free", expecting: null, pendingSubmission: false, leadCaptured: true, handoffOffered: true };
    const whatsapp = isWhatsAppConfigured();
    return {
      blocks: [
        {
          type: "lead-status",
          ok: true,
          title: "Solicitud recibida",
          text: state.callbackRequested
            ? "Ya tenemos tus datos. Un asesor de Jeipy podrá contactarte para hablar sobre tu proyecto."
            : "Ya tenemos tus datos. El equipo de Jeipy revisará tu solicitud y te contactará para continuar con tu proyecto.",
        },
        ...(whatsapp || !state.callbackRequested ? [closingBlock(next, "Si quieres adelantar la conversación:")] : []),
      ],
      quickReplies: whatsapp || !state.callbackRequested ? [] : ["Tengo otra duda"],
      state: next,
    };
  }
  const whatsapp = isWhatsAppConfigured();
  return {
    blocks: [
      {
        type: "lead-status",
        ok: false,
        title: "No pudimos enviar tu solicitud",
        text: whatsapp
          ? "Hubo un problema al registrar tus datos y no quiero hacerte creer que llegaron. Puedes intentarlo de nuevo o escribirnos directamente por WhatsApp."
          : "Hubo un problema al registrar tus datos y no quiero hacerte creer que llegaron. Inténtalo de nuevo en unos minutos.",
      },
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

function recommend(state: ConversationState, lead: MessageBlock[] = [], cap?: PlanId): Reply {
  const { needsHuman, verdict, ...recommendation } = recommendPlan(state.profile, cap);
  const next: ConversationState = {
    ...state,
    expecting: null,
    recommended: recommendation.planId,
    recommendedAi: recommendation.aiTier,
    retries: 0,
  };
  const blocks: MessageBlock[] = [...lead, text(verdict), recommendation];

  if (needsHuman) {
    return {
      blocks: [
        ...blocks,
        text("Tu caso vale la pena revisarlo con una persona del equipo para ajustar el alcance a tu presupuesto."),
        closingBlock(next),
      ],
      quickReplies: [],
      state: { ...next, flow: "free", handoffOffered: true },
    };
  }

  // En cotización, tras recomendar se piden los datos para preparar la propuesta.
  if (state.flow === "quote") {
    return startContact("lead", next, "Para preparar tu cotización necesito unos pocos datos.", blocks);
  }

  // Cierre comercial: asesor ahora o solicitud de llamada, con el mismo protagonismo.
  return { blocks: [...blocks, closingBlock(next)], quickReplies: [], state: { ...next, flow: "free", handoffOffered: true } };
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

function priceObjection(state: ConversationState): Reply {
  const current = state.recommended;
  if (!current) {
    return startFlow(
      "advisor",
      state,
      "Entiendo, la inversión importa. Para no recomendarte de más, veamos qué necesitas de verdad.",
    );
  }
  const lower = lowerPlan(current);
  if (!lower) {
    return {
      blocks: [
        text(
          `Entiendo. ${getPlan(current).name} es el punto de entrada, y el valor final depende del alcance. Lo mejor es revisar con el equipo qué se puede ajustar a tu presupuesto, sin compromiso.`,
        ),
        closingBlock(state),
      ],
      quickReplies: [],
      state: { ...state, handoffOffered: true },
    };
  }
  const lost =
    current === "premium"
      ? "Si no necesitas automatización avanzada, reservas ni integraciones por ahora, probablemente Esencial cubra lo importante (web completa, catálogo y captación) con una inversión menor."
      : "Si por ahora lo prioritario es tener presencia profesional, Básico cubre página informativa, WhatsApp, ubicación y contacto con una inversión menor. Lo que dejarías para después es el catálogo y los formularios.";
  const slot: Slot = { kind: "confirm-plan", planId: lower };
  const q = question(slot, state);
  return {
    blocks: [text(`Entiendo. Revisemos qué funciones son realmente necesarias para tu negocio. ${lost}`), ...q.blocks],
    quickReplies: q.quickReplies,
    state: { ...state, expecting: slot },
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
    case "compare":
      return {
        blocks: [
          {
            type: "list",
            items: [
              `**Básico** (desde ${getPlan("basico").price}): presencia profesional sencilla, sin IA.`,
              `**Esencial** (desde ${getPlan("esencial").price}): web completa para captar clientes, con catálogo y formularios. Compatible con Jeipy AI Lite como complemento opcional.`,
              `**Premium** (desde ${getPlan("premium").price}): solución personalizada con reservas, integraciones y flujos a medida. Compatible con Jeipy AI Pro, que se contrata aparte.`,
            ],
          },
          text("La diferencia está en lo que necesitas lograr. Si me cuentas un poco de tu negocio, te digo cuál tiene más sentido."),
        ],
        quickReplies: ["¿Qué plan me conviene?", "Quiero cotizar una página"],
        state,
      };
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
      const answer = parseYesNo(input) ?? (t.includes(" ver ") ? "yes" : undefined);
      if (answer === "yes") {
        return recommend({ ...current, expecting: null }, [text("Perfecto, ajustemos la propuesta.")], slot.planId);
      }
      if (answer === "no" || t.includes(" lo mantengo")) {
        return {
          blocks: [text(`Perfecto, mantenemos ${getPlan(current.recommended ?? "esencial").name}. El valor final se confirma al revisar el alcance, así que hay margen para ajustarlo con el equipo.`)],
          quickReplies: ["Quiero avanzar", "Tengo otra duda"],
          state: { ...current, expecting: null },
        };
      }
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
      if (["human", "lead", "objection-price", "advance", "callback", "restart"].includes(intent.type)) {
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
        ? `Excelente decisión. Para que el equipo prepare tu propuesta de ${getPlan(current.recommended).name}, necesito unos pocos datos.`
        : "Perfecto. Para que el equipo te contacte, necesito unos pocos datos.",
    );
  }
  if (intent?.type === "advance") {
    return startFlow("quote", { ...current, profile: enrichProfile(current.profile, input) }, "¡Genial! Antes de preparar la propuesta, entendamos bien tu proyecto.");
  }
  if (intent?.type === "objection-price") return priceObjection(current);

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
        isKnownBusiness(enriched.businessType)
          ? `Buenísimo, ${articleFor(enriched.businessType!)} ${enriched.businessType}. Para recomendarte bien, quiero entender cómo trabajas hoy.`
          : "¡Buenísimo! Para recomendarte bien, quiero entender cómo trabajas hoy.",
      );
  }

  // 5. Dudas de conocimiento. Si el mensaje describe el negocio (no es una pregunta),
  //    se trata como información del diagnóstico aunque mencione "IA" o "servicios".
  const describing = learned && !isQuestion(input) && Boolean(enriched.businessType || Object.keys(enriched.features).length);
  if (intent && !describing) {
    const answer = answerIntent(intent, current);
    if (answer) return answer;
  }

  // 6. El visitante cuenta algo de su negocio.
  if (learned) {
    if (current.recommended) {
      const before = current.recommended;
      const reply = recommend(withProfile, [text("Gracias por el dato, lo tengo en cuenta.")]);
      if (reply.state.recommended !== before) reply.blocks.splice(1, 0, text("Con eso cambia mi recomendación."));
      return reply;
    }
    return startFlow("advisor", withProfile, "Perfecto. Para recomendarte bien, quiero entender cómo trabajas hoy.");
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
