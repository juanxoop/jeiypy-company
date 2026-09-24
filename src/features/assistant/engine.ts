/**
 * Jeipy AI · Sales V1 — motor local de conversación (prototipo sin IA).
 *
 * Actúa como vendedor consultivo:
 * 1. Entiende el negocio y lo que quiere lograr.
 * 2. Diagnostica con preguntas cortas (una por turno, nunca repetidas).
 * 3. Recomienda el plan y explica por qué frente al plan vecino.
 * 4. Resuelve dudas y objeciones sin presionar.
 * 5. Captura los datos comerciales dentro del chat y genera el resumen del lead.
 * 6. Ofrece WhatsApp o una persona solo como cierre: si se pide, si el caso lo requiere
 *    o cuando ya hay una recomendación.
 * Nunca inventa precios, funciones ni resultados: todo sale de `knowledge.ts`.
 */
import { assistantConfig } from "@/config/assistant";
import { isWhatsAppConfigured } from "@/lib/contact";
import { aiAvailability, company, formatCop, getPlan, knowledge, unknownTopics, type UnknownTopic } from "./knowledge";
import {
  declines,
  detectIntent,
  enrichProfile,
  extractBudget,
  extractBusinessType,
  extractContact,
  extractGoal,
  extractName,
  extractWebsite,
  isBookingBusiness,
  isKnownBusiness,
  isQuestion,
  normalize,
  parseAiLevelAnswer,
  parseYesNo,
  type Intent,
} from "./nlu";
import { lowerPlan, needsAiLevelQuestion, recommendPlan } from "./recommend";
import type {
  AssistantBrain,
  AssistantTurn,
  ConversationState,
  Feature,
  Goal,
  HandoffAction,
  Lead,
  MessageBlock,
  PlanId,
  Profile,
  Slot,
} from "./types";

type Reply = AssistantTurn;

const text = (value: string): MessageBlock => ({ type: "text", text: value });
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const CHIPS = {
  start: ["¿Qué plan me conviene?", "Quiero cotizar una página", "¿Qué puede hacer Jeipy AI?", "Tengo un negocio y quiero digitalizarlo"],
  afterInfo: ["¿Qué plan me conviene?", "Quiero cotizar una página"],
  afterRecommendation: ["Quiero avanzar", "¿Qué incluye exactamente?", "Me parece caro"],
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

  const contactSlots = [pending({ kind: "name" }, Boolean(profile.name)), pending({ kind: "contact" }, Boolean(profile.contact))];
  if (flow === "lead") return contactSlots.find((s): s is Slot => s !== null) ?? null;

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

function question(slot: Slot, profile: Profile): { blocks: MessageBlock[]; quickReplies?: string[] } {
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
        blocks: [text("¿Quieres que la IA solo responda dudas y capture información, o también que automatice reservas, cotizaciones o procesos?")],
        quickReplies: ["Solo responder dudas y captar datos", "También automatizar procesos"],
      };
    case "name":
      return { blocks: [text("¿A nombre de quién preparo la propuesta?")] };
    case "contact":
      return {
        blocks: [text("¿Por dónde te contactamos? Déjame tu WhatsApp o tu correo.")],
        quickReplies: ["Prefiero no dejarlo"],
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
          ? "Perfecto, entonces una IA ligera es suficiente: responder, orientar y captar datos."
          : "Entendido: necesitas automatización más profunda, no solo atención básica.",
      );
    }
    case "name": {
      if (declines(input)) return { state: { ...state, skipped: [...state.skipped, "name", "contact"] } };
      const value = extractName(input);
      if (!value) return null;
      profile.name = value;
      return next(`Gracias, ${value.split(" ")[0]}.`);
    }
    case "contact": {
      if (declines(input)) return { state: { ...state, skipped: [...state.skipped, "contact"] } };
      const value = extractContact(input);
      if (!value) return null;
      profile.contact = value;
      return next();
    }
    case "confirm-plan":
      return null; // se resuelve en `respond`
  }
}

/* ---------------------------------------------------------------
   Resúmenes, lead y cierre
   --------------------------------------------------------------- */

const WEBSITE_LABEL = { yes: "Ya tiene web", no: "Aún no tiene web", social: "Solo redes y WhatsApp" } as const;
const GOAL_LABEL: Record<Goal, string> = {
  clients: "Conseguir más clientes",
  image: "Imagen más profesional",
  showcase: "Mostrar productos o servicios",
  sell: "Vender más",
  automate: "Automatizar la atención",
};
const FEATURE_LABEL: Record<Feature, string> = {
  catalog: "catálogo",
  booking: "reservas",
  forms: "formularios",
  ai: "automatización con IA",
  integrations: "integraciones",
  seo: "SEO",
  automation: "automatización de procesos",
};

const aiInterestLabel = (profile: Profile) =>
  !profile.features.ai ? "No por ahora" : profile.aiLevel === "advanced" ? "Sí, avanzada (automatización)" : "Sí, básica (dudas y datos)";

const wantedFeatures = (profile: Profile) => (Object.keys(profile.features) as Feature[]).filter((f) => profile.features[f]);

function summaryRows(profile: Profile, planId?: PlanId) {
  const rows: { label: string; value: string }[] = [];
  if (profile.name) rows.push({ label: "Nombre", value: profile.name });
  if (profile.businessType) rows.push({ label: "Negocio", value: capitalize(profile.businessType) });
  if (profile.website) rows.push({ label: "Hoy", value: WEBSITE_LABEL[profile.website] });
  if (profile.goal) rows.push({ label: "Objetivo", value: GOAL_LABEL[profile.goal] });
  const wanted = wantedFeatures(profile).filter((f) => f !== "ai");
  if (wanted.length) rows.push({ label: "Necesita", value: capitalize(wanted.map((f) => FEATURE_LABEL[f]).join(", ")) });
  if (profile.features.ai !== undefined) rows.push({ label: "Interés en IA", value: aiInterestLabel(profile) });
  if (profile.budget) rows.push({ label: "Presupuesto", value: profile.budget === "skipped" ? "Sin definir" : formatCop(profile.budget.amount) });
  if (planId) rows.push({ label: "Plan orientativo", value: `${getPlan(planId).name} (desde ${getPlan(planId).price})` });
  if (profile.contact) rows.push({ label: "Contacto", value: profile.contact });
  return rows;
}

/** "Lead: barbería / necesita reservas + catálogo / interés en IA / presupuesto aproximado $X". */
export function leadSummary(profile: Profile, planId?: PlanId): string {
  const parts = [`Lead: ${profile.businessType ?? "negocio sin especificar"}`];
  const needs = wantedFeatures(profile).filter((f) => f !== "ai").map((f) => FEATURE_LABEL[f]);
  if (profile.goal) needs.unshift(GOAL_LABEL[profile.goal].toLowerCase());
  if (needs.length) parts.push(`necesita ${needs.join(" + ")}`);
  parts.push(
    !profile.features.ai ? "sin interés en IA por ahora" : profile.aiLevel === "advanced" ? "interés en IA avanzada" : "interés en IA básica",
  );
  if (profile.budget && profile.budget !== "skipped") parts.push(`presupuesto aproximado ${formatCop(profile.budget.amount)}`);
  if (planId) parts.push(`plan orientativo ${getPlan(planId).name}`);
  return `${parts.join(" / ")}.`;
}

/** Mensaje prellenado para WhatsApp con el contexto de la conversación. */
export function buildWhatsAppMessage(profile: Profile, planId?: PlanId): string {
  const rows = summaryRows(profile, planId);
  if (!rows.length) return "Hola Jeipy, vengo del asistente de la web y quiero hablar con una persona.";
  return ["Hola Jeipy, vengo del asistente de la web.", ...rows.map((r) => `${r.label}: ${r.value}`)].join("\n");
}

function handoffBlock(state: ConversationState): MessageBlock {
  const actions: HandoffAction[] = [];
  if (!state.leadCaptured) actions.push("lead");
  actions.push(isWhatsAppConfigured() ? "whatsapp" : "contact-section");
  return { type: "handoff", actions, whatsappMessage: buildWhatsAppMessage(state.profile, state.recommended) };
}

function captureLead(state: ConversationState, lead: MessageBlock[] = []): Reply {
  const profile = state.profile;
  const done: ConversationState = { ...state, flow: "free", expecting: null, leadCaptured: true };

  if (!profile.contact) {
    return {
      blocks: [...lead, text("Sin problema. Cuando quieras retomarlo, puedes continuar con el equipo desde aquí."), handoffBlock(done)],
      quickReplies: ["Tengo otra duda"],
      state: { ...done, leadCaptured: false, handoffOffered: true },
    };
  }

  const record: Lead = {
    name: profile.name ?? "Sin nombre",
    contact: profile.contact,
    summary: leadSummary(profile, state.recommended),
    profile,
    plan: state.recommended,
  };
  return {
    blocks: [
      ...lead,
      text(`Listo${profile.name ? `, ${profile.name.split(" ")[0]}` : ""}. Este es el resumen que recibirá el equipo para preparar tu propuesta:`),
      { type: "summary", title: "Resumen de tu solicitud", rows: summaryRows(profile, state.recommended) },
      ...(assistantConfig.prototype
        ? [text("**Modo prototipo:** por ahora estos datos se guardan solo en este navegador y no llegan al equipo.")]
        : []),
      text("Si prefieres adelantar la conversación, puedes continuar directamente:"),
      handoffBlock(done),
    ],
    quickReplies: ["Tengo otra duda"],
    state: { ...done, handoffOffered: true },
    effects: [{ type: "lead-captured", lead: record }],
  };
}

/* ---------------------------------------------------------------
   Recomendación
   --------------------------------------------------------------- */

function recommend(state: ConversationState, lead: MessageBlock[] = [], cap?: PlanId): Reply {
  const { needsHuman, verdict, ...recommendation } = recommendPlan(state.profile, cap);
  const next: ConversationState = { ...state, expecting: null, recommended: recommendation.planId, retries: 0 };
  const blocks: MessageBlock[] = [...lead, text(verdict), recommendation];

  if (needsHuman) {
    return {
      blocks: [...blocks, text("Tu caso vale la pena revisarlo con una persona del equipo para ajustar el alcance a tu presupuesto."), handoffBlock(next)],
      quickReplies: ["Tengo otra duda"],
      state: { ...next, flow: "free", handoffOffered: true },
    };
  }

  // En cotización, tras recomendar se piden los datos para preparar la propuesta.
  if (state.flow === "quote") {
    const contactState: ConversationState = { ...next, flow: "lead" };
    const slot = nextSlot(contactState);
    if (!slot) return captureLead(contactState, blocks);
    const q = question(slot, contactState.profile);
    return {
      blocks: [...blocks, text("Para dejar tu propuesta lista:"), ...q.blocks],
      quickReplies: q.quickReplies,
      state: { ...contactState, expecting: slot },
    };
  }

  return { blocks, quickReplies: CHIPS.afterRecommendation, state: { ...next, flow: "free" } };
}

/** Continúa el flujo: siguiente pregunta o, si ya hay suficiente, el siguiente paso. */
function advance(state: ConversationState, lead: MessageBlock[] = []): Reply {
  const slot = nextSlot(state);
  if (!slot) return state.flow === "lead" ? captureLead(state, lead) : recommend(state, lead);
  const q = question(slot, state.profile);
  return { blocks: [...lead, ...q.blocks], quickReplies: q.quickReplies, state: { ...state, expecting: slot, retries: 0 } };
}

const startFlow = (flow: ConversationState["flow"], state: ConversationState, intro: string): Reply =>
  advance({ ...state, flow }, intro ? [text(intro)] : []);

/* ---------------------------------------------------------------
   Conocimiento, objeciones y dudas
   --------------------------------------------------------------- */

function planInfo(planId: PlanId, state: ConversationState): Reply {
  const plan = getPlan(planId);
  return {
    blocks: [
      text(`**${plan.name}**, desde ${plan.price} ${plan.currency}. ${plan.summary}`),
      { type: "list", items: plan.features },
      text(`${capitalize(aiAvailability(plan))}. ${knowledge.priceNote}`),
    ],
    quickReplies: state.recommended === planId ? ["Quiero avanzar", "Me parece caro"] : ["¿Me conviene este plan?", "Comparar planes"],
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
        handoffBlock(state),
      ],
      quickReplies: ["Tengo otra duda"],
      state: { ...state, handoffOffered: true },
    };
  }
  const lost =
    current === "premium"
      ? "Si no necesitas automatización avanzada, reservas ni integraciones por ahora, probablemente Esencial cubra lo importante (web completa, catálogo y captación) con una inversión menor."
      : "Si por ahora lo prioritario es tener presencia profesional, Básico cubre página informativa, WhatsApp, ubicación y contacto con una inversión menor. Lo que dejarías para después es el catálogo y los formularios.";
  const slot: Slot = { kind: "confirm-plan", planId: lower };
  const q = question(slot, state.profile);
  return {
    blocks: [text(`Entiendo. Revisemos qué funciones son realmente necesarias para tu negocio. ${lost}`), ...q.blocks],
    quickReplies: q.quickReplies,
    state: { ...state, expecting: slot },
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
          text(`Son precios orientativos: ${knowledge.priceNote.charAt(0).toLowerCase()}${knowledge.priceNote.slice(1)} ¿Vemos cuál aplica a tu caso?`),
        ],
        quickReplies: ["¿Qué plan me conviene?", "¿Qué diferencia hay entre planes?"],
        state,
      };
    case "compare":
      return {
        blocks: [
          {
            type: "list",
            items: [
              `**Básico** (desde ${getPlan("basico").price}): presencia profesional sencilla.`,
              `**Esencial** (desde ${getPlan("esencial").price}): web completa para captar clientes, con catálogo y formularios. Jeipy AI opcional.`,
              `**Premium** (desde ${getPlan("premium").price}): solución personalizada con reservas, integraciones y automatización con Jeipy AI.`,
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
            `**${knowledge.jeipyAi.name}** es un ${knowledge.jeipyAi.tagline.toLowerCase()}: entiende qué necesita cada visitante, lo orienta y lo acerca a convertirse en cliente. Como lo estoy haciendo contigo.`,
          ),
          {
            type: "list",
            items: [
              "**Atiende:** preguntas frecuentes, productos o servicios y recomendaciones.",
              "**Capta:** datos de clientes potenciales, formularios conversacionales y clasificación inicial.",
              "**Conecta:** paso a WhatsApp, reservas o agendamiento y automatizaciones a medida.",
            ],
          },
          text(
            `En Esencial se suma como opción y en Premium es parte de la propuesta. Las funciones avanzadas dependen del alcance de cada proyecto. ${knowledge.jeipyAi.costNote}`,
          ),
        ],
        quickReplies: ["¿Qué plan me conviene?", "Quiero cotizar una página"],
        state,
      };
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
    } else {
      const filled = fillSlot(slot, input, current);
      if (filled) {
        const state: ConversationState = {
          ...filled.state,
          profile: slot.kind === "name" || slot.kind === "contact" ? filled.state.profile : enrichProfile(filled.state.profile, input),
          expecting: null,
          retries: 0,
        };
        return advance(state, filled.ack ? [text(filled.ack)] : []);
      }
    }

    // "¿Cuál es mejor?" o "no sé" a mitad del diagnóstico: se explica para qué son las preguntas.
    if (intent && ["which-best", "unsure", "recommend"].includes(intent.type)) {
      const q = question(slot, current.profile);
      return {
        blocks: [text("Depende de lo que quieras lograr, y justo para eso te pregunto: con un par de respuestas más te digo cuál tiene más sentido."), ...q.blocks],
        quickReplies: q.quickReplies,
        state: current,
      };
    }

    // Una duda, objeción o petición en medio del diagnóstico: se atiende y se retoma.
    if (intent && !["quote", "recommend", "digitalize", "which-best", "unsure"].includes(intent.type)) {
      if (intent.type === "human" || intent.type === "lead" || intent.type === "objection-price" || intent.type === "advance") {
        return respond(input, { ...current, expecting: null });
      }
      const answer = answerIntent(intent, current);
      if (answer) {
        const q = question(slot, current.profile);
        return { blocks: [...answer.blocks, text("Retomando:"), ...q.blocks], quickReplies: q.quickReplies, state: current };
      }
    }

    if (current.retries < 1) {
      const q = question(slot, current.profile);
      return { blocks: [text("Perdona, no te entendí bien."), ...q.blocks], quickReplies: q.quickReplies, state: { ...current, retries: current.retries + 1 } };
    }
    return advance({ ...current, expecting: null, skipped: [...current.skipped, slotKey(slot)], retries: 0 }, [text("No te preocupes, sigamos.")]);
  }

  // 2. Cierre y atención humana: siempre se respetan.
  if (intent?.type === "human") {
    const state = { ...current, handoffOffered: true };
    return {
      blocks: [
        text(
          current.recommended || current.profile.businessType
            ? "Claro. Le paso al equipo el contexto de lo que hablamos para que no tengas que repetirlo."
            : "Claro, una persona del equipo puede ayudarte.",
        ),
        handoffBlock(state),
      ],
      quickReplies: ["Seguir con el asistente"],
      state,
    };
  }
  if (intent?.type === "lead" || (intent?.type === "advance" && current.recommended)) {
    if (current.leadCaptured) {
      return { blocks: [text("Ya tengo tus datos: el equipo te contactará con el resumen. ¿Te ayudo con algo más?")], quickReplies: ["Tengo otra duda"], state: current };
    }
    return startFlow(
      "lead",
      current,
      intent.type === "advance" ? `Excelente decisión. Para que el equipo prepare tu propuesta de ${getPlan(current.recommended!).name}:` : "Perfecto.",
    );
  }
  if (intent?.type === "advance") {
    return startFlow("quote", { ...current, profile: enrichProfile(current.profile, input) }, "¡Genial! Antes de preparar la propuesta, entendamos bien tu proyecto.");
  }
  if (intent?.type === "objection-price") return priceObjection(current);

  if (t.includes(" seguir con el asistente") || t.includes(" tengo otra duda")) {
    return {
      blocks: [text("Perfecto, sigo aquí. ¿Qué te gustaría saber?")],
      quickReplies: current.recommended ? ["¿Qué incluye exactamente?", "¿Qué puede hacer Jeipy AI?", "Ver precios"] : CHIPS.start,
      state: current,
    };
  }

  // 3. Referencias al plan ya recomendado.
  if (current.recommended && (t.includes(" ese plan") || t.includes(" que incluye") || t.includes(" incluye exactamente"))) {
    return planInfo(current.recommended, current);
  }

  // 4. Flujos guiados.
  const enriched = enrichProfile(current.profile, input);
  const learned = JSON.stringify(enriched) !== JSON.stringify(current.profile);
  const withProfile = { ...current, profile: enriched };

  switch (intent?.type) {
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
