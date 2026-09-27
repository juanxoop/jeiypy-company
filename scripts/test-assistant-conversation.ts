/**
 * Robustez conversacional de Jeipy AI: el visitante pregunta, pausa, corrige y cambia de idea en
 * cualquier momento, y el asistente responde como un asesor, sin forzar el formulario.
 *
 *   npm run test:conversation
 */
import { buildLeadDraft, respond } from "@/features/assistant/engine";
import { interpretReply } from "@/features/assistant/interpret";
import { detectIntent } from "@/features/assistant/nlu";
import { initialConversationState, type ConversationState, type MessageBlock, type RecommendationBlock } from "@/features/assistant/types";

let failures = 0;
const check = (ok: boolean, label: string, detail = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "  ✓" : "  ✗"} ${label}${detail ? ` — ${detail}` : ""}`);
};

const textOf = (blocks: MessageBlock[]) =>
  blocks.map((b) => (b.type === "text" ? b.text : b.type === "list" ? b.items.join(" ") : `[${b.type}]`)).join(" ");
const cardOf = (blocks: MessageBlock[]) => blocks.find((b): b is RecommendationBlock => b.type === "recommendation");
const ROBOTIC = /no te entend|no entend|necesito un n[uú]mero de tel[eé]fono v[aá]lido|no reconoc[ií] el correo|para asegurarme de entenderte/i;

type Turn = ReturnType<typeof respond>;
function talk(inputs: string[], start: ConversationState = initialConversationState()) {
  let state = start;
  let last: Turn | undefined;
  for (const input of inputs) {
    last = respond(input, state);
    state = last.state;
  }
  return { state, last: last!, reply: last ? textOf(last.blocks) : "" };
}

/** Hasta "¿A qué número?" de la captura de datos, tras una recomendación de Esencial. */
const TO_PHONE = ["Tengo una ferretería, solo uso WhatsApp y quiero mostrar mis productos.", "No", "Quiero este plan", "Laura Gómez"];
const RECOMMENDED = ["Tengo una tienda de ropa, uso Instagram y TikTok y quiero más ventas.", "Sí", "No"];

console.log("A) Pide el teléfono → \"bro tengo una duda más\"");
{
  const atPhone = talk(TO_PHONE);
  check(atPhone.state.expecting?.kind === "phone", "Está pidiendo el teléfono");
  const pause = talk(["bro tengo una duda más"], atPhone.state);
  check(!ROBOTIC.test(pause.reply) && /dime tu duda/i.test(pause.reply), "Invita a hacer la pregunta, no pide un número válido", pause.reply);
  check(pause.state.expecting?.kind === "phone" && pause.state.profile.name === "Laura Gómez", "Conserva el punto (teléfono) y los datos ya dados");
  check(pause.state.tone === "informal" && /^De una/.test(pause.reply), "Responde un poco más cercano si el visitante habla informal");
  const q = talk(["¿cuánto se demora hacer la página?"], pause.state);
  check(/tiempos de entrega/i.test(q.reply) && /seguimos con tu teléfono/i.test(q.reply) && !ROBOTIC.test(q.reply), "Responde la duda y retoma el teléfono con suavidad", q.reply.slice(0, 140));
  const phone = talk(["300 123 4567"], q.state);
  check(phone.state.profile.phone === "300 123 4567", "Luego acepta el teléfono normalmente");
}

console.log("\nB) Quiere reservas → \"tengo poco presupuesto\"");
{
  const rec = talk(["Tengo una barbería y quiero reservas desde la página", "Solo Instagram", "Conseguir más clientes", "Sí", "No"]);
  check(rec.state.recommended === "premium", "Recomienda Premium por las reservas", rec.state.recommended);
  const low = talk(["tengo poco presupuesto"], rec.state);
  const card = cardOf(low.last.blocks);
  check(Boolean(card) && card!.planId !== "basico", "No ofrece Básico como solución con reservas", `alternativa: ${card?.planId}`);
  check(/lo ideal es \*\*Premium\*\*/.test(low.reply) && /reservas/.test(low.reply), "Distingue el plan ideal por necesidad", low.reply.slice(0, 160));
  check(Boolean(card?.later?.some((l) => /reservas/i.test(l))), "Dice qué queda fuera en la primera fase", card?.later?.join(", "));
  const withBudget = talk(["Tengo una barbería y quiero reservas desde la página", "Solo Instagram", "Conseguir más clientes", "Sí", "No", "tengo 800 mil"]);
  const gap = cardOf(withBudget.last.blocks);
  check(/lo ideal sería \*\*Premium\*\*/.test(withBudget.reply) && Boolean(gap?.later?.some((l) => /reservas/i.test(l))), "Presupuesto por debajo del plan de entrada: Básico solo como primera fase, sin reservas", `${gap?.title} · fuera: ${gap?.later?.join(", ")}`);
}

console.log("\nC) \"tengo Instagram pero no página\" → \"perdón, sí tengo página\"");
{
  const r = talk(["Tengo una tienda de ropa", "tengo Instagram pero no página", "perdón, sí tengo página"]);
  check(r.state.profile.websiteStatus === "existing" && Boolean(r.state.profile.channels?.includes("website")), "Estado final: sí tiene web", r.state.profile.websiteStatus);
  check(Boolean(r.state.profile.channels?.includes("instagram")), "Conserva Instagram");
  check(/lo corrijo/i.test(r.reply), "Lo reconoce como corrección", r.reply.slice(0, 80));
}

console.log("\nD, E, F) \"sí\", \"me gustaría\", \"no sé todavía\" según la pregunta anterior");
{
  const q = talk(["Tengo una tienda de ropa y vendo por Instagram"]);
  check(q.state.expecting?.kind === "feature", "Pregunta por el catálogo");
  const yes = talk(["sí"], q.state);
  check(yes.state.profile.features.catalog === true, "D · \"sí\" → catálogo sí");
  const like = talk(["me gustaría"], q.state);
  check(like.state.profile.features.catalog === true && !ROBOTIC.test(like.reply), "E · \"me gustaría\" → positivo, sin \"no entendí\"");
  const unsure = talk(["no sé todavía"], q.state);
  check(unsure.state.answers?.at(-1)?.kind === "uncertain" && /opcional/i.test(unsure.reply), "F · \"no sé todavía\" → incertidumbre (opcional), no un no rotundo", unsure.reply.slice(0, 80));
}

console.log("\nG) \"solo tengo WhatsApp\"");
{
  const r = talk(["Tengo una barbería", "solo tengo WhatsApp"]);
  check((r.state.profile.channels ?? []).join() === "whatsapp" && r.state.profile.websiteStatus === "none", "Registra WhatsApp y sin web", `${r.state.profile.channels} · ${r.state.profile.websiteStatus}`);
  check(r.state.expecting?.kind !== "website", "No vuelve a preguntar por la presencia");
}

console.log("\nH) Varios datos en un mensaje");
{
  const r = talk(["Tengo una barbería. Quiero catálogo, formularios y reservas; tengo Instagram pero no web"]);
  const p = r.state.profile;
  check(Boolean(p.features.catalog && p.features.forms && p.features.booking), "catálogo, formularios y reservas", JSON.stringify(p.features));
  check(Boolean(p.channels?.includes("instagram")) && p.websiteStatus === "none", "Instagram y sin web");
  const asked = r.state.expecting;
  check(!asked || !["website", "businessType"].includes(asked.kind) && !(asked.kind === "feature" && ["catalog", "forms", "booking"].includes(asked.feature)), "No pregunta lo ya dicho", JSON.stringify(asked));
}

console.log("\nI) \"me gusta pero está caro\"");
{
  const rec = talk(RECOMMENDED);
  const r = talk(["me gusta pero está caro"], rec.state);
  const card = cardOf(r.last.blocks);
  check(card?.variant === "alternative" && Boolean(card.later?.length), "Alternativa razonada con lo que queda fuera", `${card?.planId} · fuera: ${card?.later?.join(", ")}`);
  check(/lo ideal es \*\*Esencial\*\*/.test(r.reply) && !/asesor/i.test(r.reply), "Explica lo que realmente necesita; no manda directo a un humano", r.reply.slice(0, 140));
}

console.log("\nJ) Pregunta mientras pide el nombre");
{
  const atName = talk(["Tengo una barbería y quiero más clientes", "Solo Instagram", "Sí", "No", "No", "Quiero este plan"]);
  check(atName.state.expecting?.kind === "name", "Está pidiendo el nombre");
  const q = talk(["antes de eso, ¿puedo tener reservas directamente en la web?"], atName.state);
  check(/reservas/.test(q.reply) && /Premium/.test(q.reply) && /cómo te llamas/i.test(q.reply) && !ROBOTIC.test(q.reply), "Responde, explica si cambia la propuesta y retoma el nombre", q.reply.slice(0, 160));
  check(q.state.expecting?.kind === "name" && q.state.recommended === "esencial", "Conserva el punto y no cambia la propuesta sin permiso");
  const accept = talk(["sí, súmalo"], q.state);
  check(accept.state.profile.features.booking === true && accept.state.recommended === "premium" && accept.state.expecting?.kind === "name", "Con un sí suma reservas, recalcula a Premium y sigue en el nombre", `${accept.state.recommended} · ${JSON.stringify(accept.state.expecting)}`);
  const decline = talk(["no, así está bien"], q.state);
  check(decline.state.recommended === "esencial" && decline.state.expecting?.kind === "name", "Con un no, sigue con Esencial y retoma el nombre");
  const email = talk([...TO_PHONE, "3001234567", "¿para qué necesitan mi correo?"]);
  check(/opcional/i.test(email.reply) && !ROBOTIC.test(email.reply) && email.state.expecting?.kind === "email", "\"¿Para qué necesitan mi correo?\" se responde con honestidad", email.reply.slice(0, 100));
  const flowAfter = talk(["Laura Gómez", "3001234567", "No", "Ferretería Central", "WhatsApp", "Sí, autorizo"], talk(["antes de eso, ¿cuánto cuesta?"], atName.state).state);
  const lead = flowAfter.last.effects?.find((e) => e.type === "submit-lead")?.lead;
  check(Boolean(lead && lead.name === "Laura Gómez" && lead.phone === "3001234567" && lead.recommendedPlan === "esencial"), "Tras las preguntas, la solicitud se completa con todos los datos", lead ? `${lead.name} · ${lead.phone} · ${lead.recommendedPlan}` : "sin envío");
}

console.log("\nK) Nueva necesidad después de la recomendación");
{
  const rec = talk(RECOMMENDED);
  const r = talk(["ah, y también necesito que los clientes agenden citas"], rec.state);
  check(r.state.recommended === "premium" && /cambia mi recomendación/i.test(r.reply) && cardOf(r.last.blocks)?.planId === "premium", "Recalcula y explica que cambia", r.reply.slice(0, 100));
  const q = talk(["¿se pueden tener reservas en la página?"], rec.state);
  check(q.state.recommended === "esencial" && q.state.profile.features.booking === undefined && /¿Lo sumamos\?/.test(q.reply), "Una PREGUNTA por reservas se responde; no cambia la propuesta sola", q.reply.slice(0, 140));
  const yes = talk(["de una"], q.state);
  check(yes.state.recommended === "premium" && cardOf(yes.last.blocks)?.planId === "premium", "\"De una\" suma reservas y muestra la nueva tarjeta");
}

console.log("\nL) Contradicción");
{
  const r = talk(["Tengo una tienda de ropa", "no tengo web", "Sí", "perdón, en realidad sí tengo una página"]);
  check(r.state.profile.websiteStatus === "existing", "Actualiza a \"sí tiene web\"", r.state.profile.websiteStatus);
  check(!(r.state.profile.channels ?? []).includes("none"), "No conserva a la vez \"sin presencia\"");
  const ch = talk(RECOMMENDED);
  const fix = talk(["perdón, no tengo TikTok"], ch.state);
  check(!fix.state.profile.channels?.includes("tiktok") && Boolean(fix.state.profile.channels?.includes("instagram")), "\"No tengo TikTok\" lo quita y conserva Instagram", fix.state.profile.channels?.join("+"));
}

console.log("\nExtras) Pausas y lenguaje informal a mitad del diagnóstico");
{
  const r = talk(["Tengo una barbería", "espera, tengo una duda"]);
  check(/dime tu duda/i.test(r.reply) && r.state.expecting?.kind === "website", "\"espera, tengo una duda\" pausa sin perder la pregunta", r.reply);
  const q = talk(["¿cuánto cuesta?"], r.state);
  check(/999\.900/.test(q.reply) && /volviendo a lo tuyo/i.test(q.reply), "Responde el precio y retoma la pregunta de presencia");
  const chevere = talk([...RECOMMENDED, "está chévere pero no me alcanza"]);
  check(cardOf(chevere.last.blocks)?.variant === "alternative", "\"está chévere pero no me alcanza\" → alternativa");
  const bro = talk(["bro tengo una tienda de ropa y vendo por insta", "de una"]);
  check(bro.state.profile.features.catalog === true && !ROBOTIC.test(bro.reply), "\"bro … insta\" + \"de una\" se entienden");
}


console.log("\nM) Reconsiderar el plan tras la recomendación (PLAN_RECONSIDERATION)");
{
  // Tienda de ropa con catálogo, ventas, Jeipy AI Lite y $3.000.000 → Esencial + Jeipy AI Lite.
  const rec = talk(["Tengo una tienda de ropa", "Vendo por Instagram y WhatsApp", "No tengo página", "Quiero vender online", "sí", "Solo responder dudas y captar datos", "Tengo 3000000"]);
  check(rec.state.recommended === "esencial" && rec.state.recommendedAi === "lite", "Punto de partida: Esencial + Jeipy AI Lite", `${rec.state.recommended}+${rec.state.recommendedAi}`);
  const profileBefore = JSON.stringify(rec.state.profile);
  const HANDOFF = /no lo tengo confirmado|prefiero no inventarlo/i;

  for (const phrase of ["quisiera cambiar de plan", "cambiar de plan", "quiero otro plan", "ese plan no me convence", "no me convence", "¿podemos revisar el plan?"]) {
    const r = talk([phrase], rec.state);
    const handoff = r.last.blocks.some((b) => b.type === "closing" || b.type === "contact-links");
    check(
      /podemos revisarlo/i.test(r.reply) && /Bajar la inversión/.test(r.reply) && !HANDOFF.test(r.reply) && !handoff,
      `"${phrase}" → pregunta qué ajustar, sin "no lo tengo confirmado" ni pasar a humano`,
      r.reply.slice(0, 90),
    );
    check(
      JSON.stringify(r.state.profile) === profileBefore && r.state.recommended === "esencial" && r.state.conversationId === rec.state.conversationId,
      `"${phrase}" → conserva perfil, presupuesto, canales y conversación`,
    );
    check(interpretReply(phrase, { ...rec.state, expecting: { kind: "aiLevel" } }).kind === "plan_reconsideration", `"${phrase}" se interpreta como plan_reconsideration`);
  }

  const cheaper = talk(["quiero algo más barato"], rec.state);
  const alt = cardOf(cheaper.last.blocks);
  check(alt?.variant === "alternative" && alt.planId === "esencial" && !alt.aiTier, "\"algo más barato\" → alternativa inferior (Esencial sin IA)", alt?.planId);
  check(Boolean(alt?.later?.some((l) => /Jeipy AI Lite/.test(l))), "Explica qué queda fuera", alt?.later?.join(", "));

  const up = talk(["quiero algo más completo"], rec.state);
  const upCard = cardOf(up.last.blocks);
  check(upCard?.planId === "premium" && /suma automatización/.test(up.reply), "\"algo más completo\" → Premium y qué añade", up.reply.slice(0, 120));
  check(/hoy no pediste esas funciones/.test(up.reply), "Es honesto: dice que hoy no pidió esas funciones");
  check(upCard?.budget?.fits === false, "Avisa que Premium supera el presupuesto dicho", upCard?.budget?.text);
  check(up.state.expecting?.kind === "confirm-plan" && up.state.recommended === "esencial", "No cambia hasta que confirme");
  const upYes = talk(["Sí, me interesa"], up.state);
  check(upYes.state.recommended === "premium" && upYes.state.planChoice === "premium", "Al confirmar, el estado queda en Premium");
  const keep = talk(["Mantener mi plan"], up.state);
  check(keep.state.recommended === "esencial" && /mantenemos Esencial \+ Jeipy AI Lite/.test(keep.reply), "\"Mantener mi plan\" deja todo igual");

  const toPremium = talk(["Quiero cambiar al Premium"], rec.state);
  check(toPremium.state.recommended === "premium" && cardOf(toPremium.last.blocks)?.planId === "premium", "\"Quiero cambiar al Premium\" → recalcula de inmediato");
  check(/Frente a Esencial \+ Jeipy AI Lite suma/.test(toPremium.reply) && /hoy no lo necesitas/.test(toPremium.reply), "Explica qué suma y si tiene sentido con sus necesidades", toPremium.reply.slice(0, 120));
  check(JSON.stringify(toPremium.state.profile) === profileBefore, "Conserva todo lo que contó");
  const vamos = talk(["vamos con el premium"], rec.state);
  check(vamos.state.recommended === "premium", "\"vamos con el premium\" también cambia de plan (no avanza con el anterior)");

  // Guardado de la conversación (sessionStorage): el cambio sobrevive a serializar el estado.
  const restored = JSON.parse(JSON.stringify(toPremium.state)) as ConversationState;
  const advance = talk(["Quiero este plan", "Juan Pérez", "3001234567", "Omitir"], restored);
  check(/propuesta de Premium/.test(talk(["Quiero este plan"], restored).reply), "Tras restaurar la conversación, avanza con Premium");
  const draft = buildLeadDraft(advance.state);
  check(draft.recommendedPlan === "premium" && draft.name === "Juan Pérez" && draft.budget === 3_000_000, "El lead para el CRM lleva Premium, nombre y presupuesto", `${draft.recommendedPlan} · ${draft.budget}`);

  const objection = talk(["Quiero cambiar al Premium", "es muy caro"], rec.state);
  check(cardOf(objection.last.blocks)?.variant === "alternative" && cardOf(objection.last.blocks)?.planId === "esencial", "Objeción de precio tras elegir Premium → alternativa más económica");
  const budgetAfter = talk(["Quiero cambiar al Premium", "Tengo 2500000"], rec.state);
  check(budgetAfter.state.planChoice === undefined && budgetAfter.state.recommended === "esencial", "Un presupuesto nuevo recalcula (la elección anterior deja de mandar)");

  // Bajar desde Premium: dice qué se pierde.
  const premium = talk(["Tengo una barbería y quiero reservas desde la página", "Solo Instagram", "Conseguir más clientes", "Sí", "No"]);
  const down = talk(["quiero cambiar al esencial"], premium.state);
  const downCard = cardOf(down.last.blocks);
  check(down.state.recommended === "esencial" && /quedan por fuera/.test(down.reply) && Boolean(downCard?.later?.some((l) => /reservas/i.test(l))), "Bajar a Esencial explica que las reservas quedan fuera", down.reply.slice(0, 120));
  check(Boolean(downCard?.meanwhile?.length), "Y cómo se resuelve mientras tanto (WhatsApp/formulario)");
  const top = talk(["quiero algo más completo"], premium.state);
  check(/ya es nuestro plan más completo/.test(top.reply) && top.state.recommended === "premium", "Desde Premium: dice que es el más completo, sin inventar otro plan");

  // Mientras deja sus datos.
  const contact = talk(["Quiero este plan", "Laura Gómez", "quisiera cambiar de plan"], rec.state);
  check(/podemos revisarlo/.test(contact.reply) && contact.state.profile.name === "Laura Gómez" && contact.state.expecting === null, "Durante la captura de datos: atiende el cambio y conserva lo que ya dio");

  // Sin falsos positivos.
  check(detectIntent("¿cuál es el mejor plan?")?.type === "which-best", "\"¿cuál es el mejor plan?\" sigue siendo una consulta, no un cambio");
  check(detectIntent("quiero algo más barato")?.type === "objection-price", "\"quiero algo más barato\" sigue siendo objeción de precio");
  const web = talk(["Tengo una peluquería", "Mi página web no me convence"]);
  check(web.state.profile.websiteStatus === "needs_improvement" && web.state.recommended === undefined, "\"mi página web no me convence\" es un dato de la web, no un cambio de plan");
  const noRec = talk(["cambiar de plan"]);
  check(noRec.state.flow === "advisor" && !HANDOFF.test(noRec.reply), "Sin recomendación todavía: empieza el diagnóstico");
}

console.log(failures ? `\n✗ ${failures} comprobaciones fallaron` : "\n✓ Todo correcto");
process.exit(failures ? 1 : 0);
