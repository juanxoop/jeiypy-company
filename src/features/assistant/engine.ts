/**
 * Motor local de conversación de Jeipy AI (prototipo sin IA).
 *
 * Principios:
 * 1. Entender antes de recomendar: pregunta lo que falta, de a una pregunta.
 * 2. Recomendar con razones tomadas de lo que dijo el visitante.
 * 3. Responder dudas dentro del chat, sin perder el hilo de la conversación.
 * 4. Nunca inventar: lo que no está en la base de conocimiento se reconoce como desconocido.
 * 5. Ofrecer contacto humano solo si se pide, si el caso lo requiere o al cerrar una cotización.
 */
import { isWhatsAppConfigured } from "@/lib/contact";
import { aiAvailability, company, formatCop, getPlan, knowledge, unknownTopics, type UnknownTopic } from "./knowledge";
import {
  detectIntent,
  enrichProfile,
  extractBudget,
  extractBusinessType,
  extractGoal,
  extractWebsite,
  isBookingBusiness,
  isKnownBusiness,
  normalize,
  parseYesNo,
  type Intent,
} from "./nlu";
import { recommendPlan } from "./recommend";
import type {
  AssistantBrain,
  AssistantTurn,
  ConversationState,
  Feature,
  Goal,
  HandoffAction,
  MessageBlock,
  PlanId,
  Profile,
  Slot,
} from "./types";

type Reply = { blocks: MessageBlock[]; quickReplies?: string[]; state: ConversationState };

const text = (value: string): MessageBlock => ({ type: "text", text: value });

const SUGGESTIONS = {
  afterInfo: ["¿Qué plan me conviene?", "Quiero cotizar una página"],
  afterRecommendation: ["¿Qué incluye ese plan?", "Quiero cotizar", "¿Qué haría Jeipy AI por mi negocio?"],
  fallback: ["¿Qué plan me conviene?", "Ver precios", "Hablar con una persona"],
};

/* ---------------------------------------------------------------
   Preguntas
   --------------------------------------------------------------- */

const slotKey = (slot: Slot) => (slot.kind === "feature" ? `feature:${slot.feature}` : slot.kind);

function businessKind(profile: Profile): "food" | "retail" | "service" {
  const t = normalize(profile.businessType ?? "");
  if (/restaurante|cafe|panaderia|pasteleria|comidas|cafeteria/.test(t)) return "food";
  if (/tienda|boutique|ferreteria|joyeria|optica|drogueria|papeleria|floristeria/.test(t)) return "retail";
  return "service";
}

/** Siguiente dato que falta para recomendar con criterio. */
function nextSlot(state: ConversationState): Slot | null {
  const { profile, flow, skipped } = state;
  const pending = (slot: Slot, known: boolean) => (!known && !skipped.includes(slotKey(slot)) ? slot : null);
  const f = profile.features;
  const booking = isBookingBusiness(profile.businessType);

  const order: (Slot | null)[] = [
    pending({ kind: "businessType" }, Boolean(profile.businessType)),
    pending({ kind: "website" }, Boolean(profile.website)),
    pending({ kind: "goal" }, Boolean(profile.goal)),
    pending({ kind: "feature", feature: "catalog" }, f.catalog !== undefined),
    booking
      ? pending({ kind: "feature", feature: "booking" }, f.booking !== undefined)
      : pending({ kind: "feature", feature: "forms" }, f.forms !== undefined || f.catalog === true),
    pending({ kind: "feature", feature: "ai" }, f.ai !== undefined),
    flow === "quote" ? pending({ kind: "budget" }, profile.budget !== undefined) : null,
  ];
  return order.find((slot): slot is Slot => slot !== null) ?? null;
}

function question(slot: Slot, profile: Profile): { blocks: MessageBlock[]; quickReplies?: string[] } {
  switch (slot.kind) {
    case "businessType":
      return {
        blocks: [text("Para orientarte bien, ¿qué tipo de negocio tienes?")],
        quickReplies: ["Restaurante o café", "Barbería o salón", "Tienda", "Servicios profesionales"],
      };
    case "website":
      return {
        blocks: [text("¿Ya tienes página web?")],
        quickReplies: ["Sí, ya tengo", "No, todavía no", "Solo redes sociales"],
      };
    case "goal":
      return {
        blocks: [text("¿Cuál es tu objetivo principal con la web?")],
        quickReplies: ["Conseguir más clientes", "Verme más profesional", "Mostrar productos o servicios", "Automatizar la atención"],
      };
    case "budget":
      return {
        blocks: [text("Última pregunta, y es opcional: ¿tienes un presupuesto aproximado en mente?")],
        quickReplies: ["Hasta $600.000", "Hasta $1.000.000", "Hasta $1.500.000", "Más de $1.500.000", "Prefiero no decirlo"],
      };
    case "feature":
      return featureQuestion(slot.feature, profile);
  }
}

function featureQuestion(feature: Feature, profile: Profile) {
  const yesNo = ["Sí", "No"];
  const kind = businessKind(profile);
  switch (feature) {
    case "catalog":
      return {
        blocks: [
          text(
            kind === "food"
              ? "¿Quieres mostrar tu menú con precios en la web?"
              : kind === "retail"
                ? "¿Quieres mostrar tus productos con precios, como un catálogo?"
                : "¿Quieres mostrar tus servicios y precios?",
          ),
        ],
        quickReplies: yesNo,
      };
    case "booking":
      return {
        blocks: [
          text(
            kind === "food"
              ? "¿Necesitas que tus clientes puedan reservar mesa desde la web?"
              : "¿Necesitas que tus clientes puedan reservar o agendar citas desde la web?",
          ),
        ],
        quickReplies: [...yesNo, "Más adelante"],
      };
    case "forms":
      return {
        blocks: [text("¿Te interesa recibir solicitudes de contacto o cotización con un formulario?")],
        quickReplies: yesNo,
      };
    case "ai":
      return {
        blocks: [text("¿Te gustaría automatizar las respuestas a preguntas frecuentes con un asistente inteligente como yo?")],
        quickReplies: [...yesNo, "¿Qué haría el asistente?"],
      };
    default:
      return { blocks: [text("¿Lo necesitas?")], quickReplies: yesNo };
  }
}

/* ---------------------------------------------------------------
   Lectura de la respuesta a la pregunta actual
   --------------------------------------------------------------- */

const GOAL_ACK: Record<Goal, string> = {
  clients: "Conseguir más clientes: vamos a enfocar la web en convertir visitas en contactos.",
  image: "Una imagen más profesional genera confianza desde el primer vistazo.",
  showcase: "Mostrar bien lo que ofreces es clave para que te elijan.",
  sell: "Vender más: la web tiene que llevar al cliente directo a la acción.",
  automate: "Automatizar la atención te ahorra tiempo en preguntas repetidas.",
};

/** Intenta completar el dato esperado. Devuelve el perfil actualizado y un acuse breve. */
function fillSlot(slot: Slot, input: string, state: ConversationState): { profile: Profile; ack?: string } | null {
  const profile: Profile = { ...state.profile, features: { ...state.profile.features } };

  switch (slot.kind) {
    case "businessType": {
      const value = extractBusinessType(input, { loose: true });
      if (!value) return null;
      profile.businessType = value;
      return { profile, ack: isKnownBusiness(value) ? `Perfecto, ${articleFor(value)} ${value}.` : "Perfecto, gracias por contarme." };
    }
    case "website": {
      const value = extractWebsite(input, { direct: true });
      if (!value) return null;
      profile.website = value;
      const ack = {
        yes: "Bien, entonces podemos mejorar lo que ya tienes o rehacerlo con una base más sólida.",
        no: "Entendido: empezarías desde cero, un buen momento para hacerlo bien.",
        social: "Muchos negocios empiezan así. Una web propia te da más control y más confianza.",
      }[value];
      return { profile, ack };
    }
    case "goal": {
      const value = extractGoal(input);
      if (!value) return null;
      profile.goal = value;
      return { profile, ack: GOAL_ACK[value] };
    }
    case "budget": {
      const value = extractBudget(input);
      if (!value) return null;
      profile.budget =
        value !== "skipped" && normalize(input).includes(" mas de ") ? { amount: value.amount + 1 } : value;
      return { profile, ack: value === "skipped" ? "Sin problema." : "Gracias, lo tendré en cuenta." };
    }
    case "feature": {
      const answer = parseYesNo(input);
      if (!answer) return null;
      profile.features[slot.feature] = answer === "yes";
      return { profile };
    }
  }
}

function articleFor(business: string): string {
  return /^(barberia|peluqueria|tienda|clinica|veterinaria|academia|floristeria|joyeria|optica|drogueria|papeleria|lavanderia|constructora|agencia|cafeteria|panaderia|pasteleria|inmobiliaria|boutique|firma)/.test(
    normalize(business).trim(),
  )
    ? "una"
    : "un";
}

/* ---------------------------------------------------------------
   Respuestas de conocimiento
   --------------------------------------------------------------- */

function answerIntent(intent: Intent, state: ConversationState): Reply | null {
  switch (intent.type) {
    case "about":
      return {
        blocks: [text(`${company.pitch}\n\nNuestro lema lo resume: **${company.slogan}**.`)],
        quickReplies: ["¿Qué servicios ofrecen?", ...SUGGESTIONS.afterInfo],
        state,
      };
    case "services":
      return {
        blocks: [
          text("Esto es lo que hacemos:"),
          { type: "list", items: knowledge.services.map((s) => `**${s.title}:** ${s.description}`) },
        ],
        quickReplies: SUGGESTIONS.afterInfo,
        state,
      };
    case "prices":
      return {
        blocks: [
          text("Estos son los precios orientativos:"),
          { type: "list", items: knowledge.plans.map((p) => `**${p.name}:** desde ${p.price} ${p.currency}`) },
          text(`${knowledge.priceNote} ¿Quieres que veamos cuál aplica a tu caso?`),
        ],
        quickReplies: ["¿Qué plan me conviene?", "¿Qué diferencia hay entre planes?"],
        state,
      };
    case "compare":
      return {
        blocks: [
          text("La diferencia principal está en el alcance:"),
          {
            type: "list",
            items: knowledge.plans.map((p) => `**${p.name}** (desde ${p.price}): ${p.summary} ${capitalize(aiAvailability(p))}.`),
          },
          text("En resumen: Básico para empezar, Esencial para captar clientes y Premium para personalizar y automatizar."),
        ],
        quickReplies: ["¿Qué plan me conviene?", "Quiero cotizar"],
        state,
      };
    case "plan-info":
      return planInfo(intent.planId, state);
    case "process":
      return {
        blocks: [
          text("Trabajamos en cuatro pasos:"),
          { type: "list", items: knowledge.process.map((s) => `**${s.number} ${s.title}:** ${s.description}`) },
        ],
        quickReplies: SUGGESTIONS.afterInfo,
        state,
      };
    case "ai-info":
      return {
        blocks: [
          text(
            `**${knowledge.jeipyAi.name}** es un ${knowledge.jeipyAi.tagline.toLowerCase()}. No es un chatbot de respuestas fijas: entiende lo que necesita cada visitante, lo orienta y lo acerca a convertirse en cliente.`,
          ),
          {
            type: "list",
            items: [
              "**Atiende:** preguntas frecuentes, información de productos o servicios y recomendaciones.",
              "**Capta:** captación de leads, formularios conversacionales y clasificación inicial de clientes.",
              "**Conecta:** paso a WhatsApp, reservas o agendamiento y automatizaciones a medida.",
            ],
          },
          text(
            `En **Esencial** está disponible como mejora opcional, y en **Premium** es parte de la propuesta. Las funciones avanzadas dependen del alcance e integraciones de cada proyecto. ${knowledge.jeipyAi.costNote}`,
          ),
        ],
        quickReplies: ["¿Qué plan me conviene?", "Quiero cotizar"],
        state,
      };
    case "unknown-topic":
      return unknownTopic(intent.topic, state);
    case "greeting":
      return {
        blocks: [text("¡Hola! Soy Jeipy AI. Te ayudo a encontrar la solución digital adecuada para tu negocio. ¿Por dónde empezamos?")],
        quickReplies: [
          "¿Qué plan me conviene?",
          "Quiero cotizar una página",
          "¿Qué puede hacer Jeipy AI?",
          "Tengo un negocio y quiero digitalizarlo",
        ],
        state,
      };
    case "thanks":
      return {
        blocks: [text("¡Con gusto! Si te surge otra duda, aquí estoy.")],
        quickReplies: SUGGESTIONS.afterInfo,
        state,
      };
    default:
      return null;
  }
}

function planInfo(planId: PlanId, state: ConversationState): Reply {
  const plan = getPlan(planId);
  return {
    blocks: [
      text(`**Plan ${plan.name}**, desde ${plan.price} ${plan.currency}. ${plan.summary}`),
      { type: "list", items: plan.features },
      text(`${capitalize(aiAvailability(plan))}. ${knowledge.priceNote}`),
    ],
    quickReplies:
      state.recommended === planId
        ? ["Quiero cotizar", "Comparar planes"]
        : ["¿Me conviene este plan?", "Comparar planes", "Quiero cotizar"],
    state,
  };
}

function unknownTopic(topic: UnknownTopic, state: ConversationState): Reply {
  const intro =
    topic === "ecommerce"
      ? "Las tiendas online con pagos en línea no están entre los servicios que tengo configurados. Lo que sí incluyen los planes es un catálogo digital con paso directo a WhatsApp para cerrar la venta."
      : `Todavía no tengo información confirmada sobre ${unknownTopics[topic]} y prefiero no inventarla.`;
  return {
    blocks: [text(`${intro} Una persona del equipo puede ayudarte con eso con precisión. ¿Quieres que te ponga en contacto?`)],
    quickReplies: ["Sí, hablar con una persona", "Seguir con el asistente"],
    state,
  };
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/* ---------------------------------------------------------------
   Recomendación, resumen y contacto
   --------------------------------------------------------------- */

const WEBSITE_LABEL = { yes: "Ya tiene web", no: "Aún no tiene web", social: "Solo redes sociales" } as const;
const GOAL_LABEL: Record<Goal, string> = {
  clients: "Conseguir más clientes",
  image: "Imagen más profesional",
  showcase: "Mostrar productos o servicios",
  sell: "Vender más",
  automate: "Automatizar la atención",
};
const FEATURE_LABEL: Record<Feature, string> = {
  catalog: "Catálogo o servicios con precios",
  booking: "Reservas o agendamiento",
  forms: "Formularios",
  ai: "Automatización con IA",
  integrations: "Integraciones",
  seo: "Aparecer en Google",
};

function summaryRows(profile: Profile, planId?: PlanId) {
  const rows: { label: string; value: string }[] = [];
  if (profile.businessType) rows.push({ label: "Negocio", value: capitalize(profile.businessType) });
  if (profile.website) rows.push({ label: "Web actual", value: WEBSITE_LABEL[profile.website] });
  if (profile.goal) rows.push({ label: "Objetivo", value: GOAL_LABEL[profile.goal] });
  const wanted = (Object.keys(profile.features) as Feature[]).filter((f) => profile.features[f]);
  if (wanted.length) rows.push({ label: "Necesita", value: wanted.map((f) => FEATURE_LABEL[f]).join(", ") });
  if (profile.features.ai !== undefined) rows.push({ label: "Jeipy AI", value: profile.features.ai ? "Sí" : "No por ahora" });
  if (profile.budget) rows.push({ label: "Presupuesto", value: profile.budget === "skipped" ? "Sin definir" : formatCop(profile.budget.amount) });
  if (planId) rows.push({ label: "Plan orientativo", value: `${getPlan(planId).name} (desde ${getPlan(planId).price})` });
  return rows;
}

/** Mensaje prellenado para WhatsApp con el contexto de la conversación. */
export function buildWhatsAppMessage(profile: Profile, planId?: PlanId): string {
  const rows = summaryRows(profile, planId);
  if (!rows.length) return "Hola Jeipy, vengo del asistente de la web y quiero hablar con una persona.";
  return ["Hola Jeipy, vengo del asistente de la web.", ...rows.map((r) => `${r.label}: ${r.value}`)].join("\n");
}

function handoffBlock(state: ConversationState): MessageBlock {
  const actions: HandoffAction[] = ["lead", isWhatsAppConfigured() ? "whatsapp" : "contact-section"];
  return { type: "handoff", actions, whatsappMessage: buildWhatsAppMessage(state.profile, state.recommended) };
}

function recommend(state: ConversationState, lead: MessageBlock[] = []): Reply {
  const { needsHuman, ...recommendation } = recommendPlan(state.profile);
  const next: ConversationState = { ...state, flow: "free", expecting: null, recommended: recommendation.planId, retries: 0 };
  const plan = getPlan(recommendation.planId);
  const intro = `Por lo que me cuentas, te recomiendo el plan **${plan.name}**.`;

  if (state.flow === "quote" || needsHuman) {
    return {
      blocks: [
        ...lead,
        { type: "summary", title: "Resumen de tu proyecto", rows: summaryRows(state.profile, recommendation.planId) },
        text(intro),
        recommendation,
        text(
          needsHuman
            ? "Tu caso merece revisarlo con una persona del equipo. ¿Cómo prefieres continuar?"
            : "El valor final se confirma al revisar el alcance. ¿Cómo prefieres continuar?",
        ),
        handoffBlock(next),
      ],
      quickReplies: ["¿Qué incluye ese plan?", "Tengo otra duda"],
      state: { ...next, handoffOffered: true },
    };
  }

  return {
    blocks: [...lead, text(intro), recommendation],
    quickReplies: SUGGESTIONS.afterRecommendation,
    state: next,
  };
}

/** Continúa el flujo: siguiente pregunta o, si ya hay suficiente, la recomendación. */
function advance(state: ConversationState, lead: MessageBlock[] = []): Reply {
  const slot = nextSlot(state);
  if (!slot) return recommend(state, lead);
  const q = question(slot, state.profile);
  return { blocks: [...lead, ...q.blocks], quickReplies: q.quickReplies, state: { ...state, expecting: slot, retries: 0 } };
}

function startFlow(flow: "advisor" | "quote", state: ConversationState, intro: string): Reply {
  return advance({ ...state, flow }, [text(intro)]);
}

/* ---------------------------------------------------------------
   Punto de entrada
   --------------------------------------------------------------- */

export function respond(input: string, current: ConversationState): Reply {
  const t = normalize(input);
  const intent = detectIntent(input);

  // Reinicio explícito
  if (intent?.type === "restart") {
    return { blocks: [text("Listo, empecemos de nuevo. ¿En qué te ayudo?")], quickReplies: SUGGESTIONS.afterInfo, state: { ...current, flow: "free", expecting: null } };
  }

  // Petición de atención humana: siempre se respeta.
  if (intent?.type === "human") {
    const state = { ...current, expecting: null, handoffOffered: true };
    return {
      blocks: [
        text(
          current.recommended || current.profile.businessType
            ? "Claro. Le paso a una persona del equipo el contexto de lo que hablamos para que no tengas que repetirlo."
            : "Claro, una persona del equipo puede ayudarte.",
        ),
        handoffBlock(state),
      ],
      quickReplies: ["Seguir con el asistente"],
      state,
    };
  }

  if (t.includes(" seguir con el asistente") || t.includes(" tengo otra duda")) {
    return {
      blocks: [text("Perfecto, sigo aquí. ¿Qué te gustaría saber?")],
      quickReplies: ["¿Qué incluye ese plan?", "¿Qué puede hacer Jeipy AI?", "Ver precios"].filter(
        (q) => current.recommended || !q.includes("ese plan"),
      ),
      state: { ...current, expecting: null },
    };
  }

  // 1. Hay una pregunta pendiente: intentar leer la respuesta.
  if (current.expecting) {
    const filled = fillSlot(current.expecting, input, current);
    if (filled) {
      const state: ConversationState = { ...current, profile: enrichProfile(filled.profile, input), expecting: null, retries: 0 };
      return advance(state, filled.ack ? [text(filled.ack)] : []);
    }

    // Una pregunta distinta en medio del flujo: se responde y se retoma.
    if (intent && !["quote", "recommend", "digitalize"].includes(intent.type)) {
      const answer = answerIntent(intent, current);
      if (answer) {
        const q = question(current.expecting, current.profile);
        return {
          blocks: [...answer.blocks, text(`Retomando: ${(q.blocks[0] as { text: string }).text.replace(/^Última pregunta, y es opcional: /, "")}`)],
          quickReplies: q.quickReplies,
          state: current,
        };
      }
    }

    // No se entendió: se reformula una vez y luego se sigue sin ese dato.
    if (current.retries < 1) {
      const q = question(current.expecting, current.profile);
      return {
        blocks: [text("No estoy seguro de haberte entendido."), ...q.blocks],
        quickReplies: q.quickReplies,
        state: { ...current, retries: current.retries + 1 },
      };
    }
    const skipped = [...current.skipped, slotKey(current.expecting)];
    return advance({ ...current, expecting: null, skipped, retries: 0 }, [text("No te preocupes, sigamos con lo demás.")]);
  }

  // 2. Referencias al plan ya recomendado.
  if (current.recommended && (t.includes(" ese plan") || t.includes(" que incluye"))) {
    return planInfo(current.recommended, current);
  }

  // 3. Flujos guiados.
  const enriched = enrichProfile(current.profile, input);
  const learnedSomething = JSON.stringify(enriched) !== JSON.stringify(current.profile);

  if (intent?.type === "quote") {
    return startFlow(
      "quote",
      { ...current, profile: enriched },
      current.recommended
        ? "Perfecto, ya tengo buena parte de la información."
        : "Con gusto. Antes de darte un valor orientativo necesito entender tu proyecto: son unas pocas preguntas.",
    );
  }
  if (intent?.type === "recommend") {
    return startFlow(
      "advisor",
      { ...current, profile: enriched },
      "Con gusto te ayudo a elegir. Te haré unas preguntas rápidas para recomendarte con criterio.",
    );
  }
  if (intent?.type === "digitalize") {
    return startFlow(
      "advisor",
      { ...current, profile: enriched },
      isKnownBusiness(enriched.businessType)
        ? `Genial, ${articleFor(enriched.businessType!)} ${enriched.businessType}. Cuéntame un poco más para orientarte.`
        : "¡Genial! Cuéntame un poco para orientarte bien.",
    );
  }

  // 4. Preguntas de conocimiento.
  if (intent) {
    const answer = answerIntent(intent, current);
    if (answer) return answer;
  }

  // 5. El visitante cuenta algo de su negocio sin pedir nada concreto.
  if (learnedSomething) {
    const state = { ...current, profile: enriched };
    if (current.recommended) {
      const before = current.recommended;
      const reply = recommend(state, [text("Gracias por el dato, lo tengo en cuenta.")]);
      if (reply.state.recommended !== before) {
        reply.blocks.splice(1, 0, text("Con eso cambia mi recomendación."));
      }
      return reply;
    }
    const lead = isKnownBusiness(enriched.businessType)
      ? `${capitalize(articleFor(enriched.businessType!))} ${enriched.businessType}${enriched.goal ? " con un objetivo claro" : ""}: buen punto de partida. Para recomendarte bien, necesito entender un poco más.`
      : "Entiendo. Para recomendarte bien, necesito entender un poco más.";
    return startFlow("advisor", state, lead);
  }

  // 6. Un "sí" o "no" suelto sin pregunta pendiente.
  if (parseYesNo(input)) {
    return {
      blocks: [text("Entendido. ¿En qué más te puedo ayudar?")],
      quickReplies: current.recommended ? SUGGESTIONS.afterRecommendation : SUGGESTIONS.afterInfo,
      state: current,
    };
  }

  // 7. No hay información configurada para responder.
  return {
    blocks: [
      text(
        "No tengo información sobre eso y prefiero no inventarla. Puedo ayudarte con planes, precios, servicios, nuestro proceso o Jeipy AI. Si lo prefieres, te pongo en contacto con una persona del equipo.",
      ),
    ],
    quickReplies: SUGGESTIONS.fallback,
    state: current,
  };
}

/** Implementación local del contrato `AssistantBrain`. */
export const localBrain: AssistantBrain = {
  async reply(input, state) {
    const turn: AssistantTurn = respond(input, state);
    return turn;
  },
};
