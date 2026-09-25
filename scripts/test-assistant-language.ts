/**
 * Pruebas conversacionales de Jeipy AI: el visitante responde con sus palabras y el asistente
 * debe interpretarlo según el contexto, sin exigir respuestas exactas.
 *
 *   npm run test:assistant
 */
import { respond } from "@/features/assistant/engine";
import { interpretReply } from "@/features/assistant/interpret";
import { readPolarity } from "@/features/assistant/polarity";
import { initialConversationState, type ConversationState, type MessageBlock } from "@/features/assistant/types";

let failures = 0;
const check = (ok: boolean, label: string, detail = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "  ✓" : "  ✗"} ${label}${detail ? ` — ${detail}` : ""}`);
};

const textOf = (blocks: MessageBlock[]) => blocks.map((b) => (b.type === "text" ? b.text : `[${b.type}]`)).join(" ");
const NOT_UNDERSTOOD = /no te entend|no entend|no estoy seguro de haber entendido/i;

function talk(inputs: string[], start: ConversationState = initialConversationState()) {
  let state = start;
  let last = { blocks: [] as MessageBlock[], quickReplies: [] as string[] | undefined };
  const replies: string[] = [];
  for (const input of inputs) {
    const turn = respond(input, state);
    state = turn.state;
    last = { blocks: turn.blocks, quickReplies: turn.quickReplies };
    replies.push(textOf(turn.blocks));
  }
  return { state, last, replies, reply: replies[replies.length - 1] ?? "" };
}

/* ---------------------------------------------------------------
   1. Postura (sí / no / duda) en frases libres, con errores y sin tildes
   --------------------------------------------------------------- */
console.log("1) Lectura de postura");
const POLARITY: [string, string][] = [
  ["Sí", "positive"], ["Me gustaría", "positive"], ["Me encanta", "positive"], ["De una", "positive"], ["Puede ser", "uncertain+"],
  ["No sé todavía", "uncertain"], ["No por ahora", "negative·later"], ["La verdad no", "negative"], ["Eso sí me serviría", "positive"],
  ["Nah, eso no", "negative"], ["Mmm no sé todavía", "uncertain"], ["Pues sí me llama la atención pero depende", "uncertain+"],
  ["Sí, aunque primero quiero algo sencillo", "positive·later"], ["Por ahora prefiero arrancar sencillo", "negative·later"],
  ["claro", "positive"], ["dale", "positive"], ["perfecto", "positive"], ["me interesa", "positive"], ["suena bien", "positive"],
  ["podría servirme", "positive"], ["quiero eso", "positive"], ["hagámoslo", "positive"], ["no gracias", "negative"],
  ["no me interesa", "negative"], ["no me gustaría", "negative"], ["prefiero que no", "negative"], ["eso no", "negative"],
  ["quizá", "uncertain+"], ["tal vez", "uncertain+"], ["déjame pensarlo", "uncertain"], ["no estoy seguro", "uncertain"],
  ["podría ser", "uncertain+"], ["claro que no", "negative"],
  // Errores de escritura, sin tildes, lenguaje informal
  ["sii claroo", "positive"], ["q chevere, me sirve", "positive"], ["nop", "negative"], ["hagamoslo", "positive"], ["nesesito eso", "positive"],
  ["me intereza", "positive"], ["perfeto", "positive"], ["nose", "uncertain"], ["si claro q si", "positive"], ["obvio", "positive"],
  ["tal ves", "uncertain+"], ["me encantaria", "positive"], ["noo", "negative"], ["siii de unaa", "positive"],
  // Respuesta larga
  ["Claro que sí, me encantaría tener eso en la página para que los clientes vean todo sin tener que escribirme a cada rato", "positive"],
];
for (const [phrase, want] of POLARITY) {
  const r = readPolarity(phrase);
  const got = r.polarity ? `${r.polarity}${r.polarity === "uncertain" && r.lean === "positive" ? "+" : ""}${r.later ? "·later" : ""}` : "-";
  check(got === want, `"${phrase}" → ${got}`, got === want ? "" : `esperado ${want}`);
}

/* ---------------------------------------------------------------
   2. Respuestas a una pregunta de sí/no, en contexto
   --------------------------------------------------------------- */
console.log("\n2) Respuestas a \"¿Quieres mostrar tus productos con precios, como un catálogo?\"");
const context = ["Tengo una tienda de ropa y vendo por Instagram"];
const asked = talk(context);
check(asked.state.expecting?.kind === "feature", "El asistente pregunta por el catálogo");
const FEATURE_ANSWERS: [string, boolean][] = [
  ["Sí", true], ["Me gustaría", true], ["Me encanta", true], ["De una", true], ["Puede ser", true], ["No sé todavía", false],
  ["No por ahora", false], ["La verdad no", false], ["Eso sí me serviría", true], ["Nah, eso no", false], ["Mmm no sé todavía", false],
  ["Pues sí me llama la atención pero depende", true], ["Sí, aunque primero quiero algo sencillo", false],
  ["Por ahora prefiero arrancar sencillo", false], ["sii claroo", true], ["q chevere, me sirve", true], ["nop", false], ["suena bien", true],
  ["prefiero que no", false], ["Quiero algo más sencillo", false],
];
for (const [answer, value] of FEATURE_ANSWERS) {
  const r = talk([...context, answer]);
  const got = r.state.profile.features.catalog;
  check(got === value && !NOT_UNDERSTOOD.test(r.reply) && r.state.expecting?.kind !== "feature" || (got === value && r.state.expecting?.kind === "feature" && (r.state.expecting as { feature: string }).feature !== "catalog"),
    `"${answer}" → catálogo ${got}`, NOT_UNDERSTOOD.test(r.reply) ? `respondió: ${r.reply.slice(0, 80)}` : "");
}
{
  const r = talk([...context, "Me encanta"]);
  check(r.state.answers?.at(-1)?.raw === "Me encanta" && r.state.answers?.at(-1)?.kind === "positive", "Guarda el texto original y su interpretación", JSON.stringify(r.state.answers?.at(-1)));
}
{
  const r = talk(["Tengo una barbería y quiero más clientes", "Solo WhatsApp", "Sí"]);
  check(r.state.expecting?.kind === "feature", "Pregunta de reservas en una barbería", r.reply.slice(0, 70));
  const later = talk(["Tengo una barbería y quiero más clientes", "Solo WhatsApp", "Sí", "Por ahora prefiero arrancar sencillo"]);
  check(later.state.profile.features.booking === false && /más adelante|segunda etapa/.test(later.reply), "\"Por ahora prefiero arrancar sencillo\" posterga las reservas", later.reply.slice(0, 80));
}

/* ---------------------------------------------------------------
   3. Presencia digital en texto libre
   --------------------------------------------------------------- */
console.log("\n3) Presencia digital");
const PRESENCE: [string, string, string][] = [
  ["Solo tengo WhatsApp", "whatsapp", "none"],
  ["Tengo Instagram pero no web", "instagram", "none"],
  ["Solo manejo insta", "instagram", "none"],
  ["La verdad no", "", "none"],
  ["Perdón, también tengo web pero está horrible", "website", "needs_improvement"],
];
for (const [answer, channels, web] of PRESENCE) {
  const r = talk(["Tengo una barbería", answer]);
  const ch = (r.state.profile.channels ?? []).filter((c) => c !== "none").join("+");
  check(ch === channels && new RegExp(`^(${web})$`).test(r.state.profile.websiteStatus ?? "") && !NOT_UNDERSTOOD.test(r.reply), `"${answer}" → canales [${ch}] · web ${r.state.profile.websiteStatus}`);
}
{
  // Dato distinto al que se preguntó: se aprovecha y se sigue sin rechazarlo.
  const r = talk(["Tengo una tienda de ropa y vendo por Instagram", "Solo tengo Instagram y WhatsApp"]);
  check(Boolean(r.state.profile.channels?.includes("whatsapp")) && !NOT_UNDERSTOOD.test(r.reply), "Info fuera de la pregunta (catálogo) se guarda y se sigue", r.reply.slice(0, 90));
}

/* ---------------------------------------------------------------
   4. Un mensaje con muchos datos
   --------------------------------------------------------------- */
console.log("\n4) Varios datos en una sola respuesta");
{
  const r = talk(["Tengo una ferretería, manejo Instagram y WhatsApp pero todavía no tengo página y quiero mostrar productos."]);
  const p = r.state.profile;
  check(/ferreter/i.test(p.businessType ?? ""), "tipo de negocio = ferretería", p.businessType);
  check(Boolean(p.channels?.includes("instagram") && p.channels?.includes("whatsapp")), "instagram y whatsapp", p.channels?.join("+"));
  check(p.websiteStatus === "none", "web = no");
  check(p.features.catalog === true, "necesidad = catálogo");
  const next = r.state.expecting?.kind;
  check(!["businessType", "website"].includes(next ?? "") && !(next === "feature" && (r.state.expecting as { feature: string }).feature === "catalog"), "No vuelve a preguntar lo ya dicho", `siguiente: ${JSON.stringify(r.state.expecting)}`);
}

/* ---------------------------------------------------------------
   5. Correcciones y objeciones con la recomendación ya hecha
   --------------------------------------------------------------- */
console.log("\n5) Correcciones y objeciones");
const recommended = talk(["Tengo una tienda de ropa, uso Instagram y TikTok y quiero más ventas.", "Sí", "No"]);
check(recommended.state.recommended === "esencial", "Punto de partida: Esencial recomendado");
{
  const r = talk(["Perdón, sí tengo página"], recommended.state);
  check(r.state.profile.websiteStatus === "existing" && !NOT_UNDERSTOOD.test(r.reply), "\"Perdón, sí tengo página\" actualiza la web", r.reply.slice(0, 90));
}
{
  const r = talk(["Perdón, sí tengo Instagram"], recommended.state);
  check(/aclararlo|Instagram/.test(r.reply) && !/no lo tengo confirmado/i.test(r.reply), "\"Perdón, sí tengo Instagram\" confirma lo que ya sabía", r.reply.slice(0, 90));
}
{
  const r = talk(["Perdón, no tengo TikTok"], recommended.state);
  check(!r.state.profile.channels?.includes("tiktok") && Boolean(r.state.profile.channels?.includes("instagram")), "\"Perdón, no tengo TikTok\" quita el dato corregido", r.state.profile.channels?.join("+"));
}
{
  const r = talk(["En realidad mi presupuesto es menor"], recommended.state);
  check(r.state.expecting?.kind === "budget", "\"En realidad mi presupuesto es menor\" pide la cifra", r.reply.slice(0, 80));
  const r2 = talk(["Como un millón"], r.state);
  const card = r2.last.blocks.find((b) => b.type === "recommendation") as { planId?: string } | undefined;
  check(card?.planId === "basico", "…y recalcula con la nueva cifra", `plan ${card?.planId}`);
}
{
  const r = talk(["No quiero catálogo, quiero reservas"], recommended.state);
  check(r.state.profile.features.catalog === false && r.state.profile.features.booking === true && r.state.recommended === "premium", "\"No quiero catálogo, quiero reservas\" cambia ambas cosas y recalcula", `catálogo ${r.state.profile.features.catalog} · reservas ${r.state.profile.features.booking} · ${r.state.recommended}`);
}
{
  const r = talk(["Está bueno pero no me alcanza"], recommended.state);
  check(r.last.blocks.some((b) => b.type === "recommendation" && b.variant === "alternative"), "\"Está bueno pero no me alcanza\" → alternativa más económica");
}
{
  const r = talk(["Quiero algo más sencillo"], recommended.state);
  check(r.last.blocks.some((b) => b.type === "recommendation" && b.variant === "alternative"), "\"Quiero algo más sencillo\" → alternativa más económica");
}
{
  const cheaper = talk(["Está bueno pero no me alcanza"], recommended.state);
  const r = talk(["Déjame pensarlo"], cheaper.state);
  check(/piénsalo/.test(r.reply) && !NOT_UNDERSTOOD.test(r.reply), "\"Déjame pensarlo\" ante la alternativa: sin presión", r.reply.slice(0, 80));
  const yes = talk(["De una, me sirve"], cheaper.state);
  check(yes.last.blocks.some((b) => b.type === "recommendation" && b.variant === "confirmed"), "\"De una, me sirve\" acepta la alternativa");
}

/* ---------------------------------------------------------------
   6. Autorización: nunca enviar con un "no"
   --------------------------------------------------------------- */
console.log("\n6) Autorización de contacto");
{
  const base = talk(["Tengo una ferretería, solo uso WhatsApp y quiero mostrar mis productos.", "No", "Quiero este plan", "Laura Gómez", "3001234567", "No", "Ferretería Central", "WhatsApp"]);
  check(base.state.expecting?.kind === "consent", "Llega a la autorización", JSON.stringify(base.state.expecting));
  const no = respond("No autorizo", base.state);
  check(!no.effects?.length, "\"No autorizo\" NO envía el lead");
  const yes = respond("Dale, de una", base.state);
  check(Boolean(yes.effects?.some((e) => e.type === "submit-lead")), "\"Dale, de una\" envía el lead");
  const unsure = respond("mmm no sé", base.state);
  check(!unsure.effects?.length && /autoriz/i.test(textOf(unsure.blocks)), "Duda → una pregunta concreta, sin enviar", textOf(unsure.blocks).slice(0, 80));
}

/* ---------------------------------------------------------------
   7. Prueba de estrés conversacional (frases del equipo)
   --------------------------------------------------------------- */
console.log("\n7) Estrés conversacional");
const STRESS: [string, (r: ReturnType<typeof talk>) => boolean, string][] = [
  ["Pues sí me llama la atención pero depende", (r) => r.state.profile.features.catalog === true, "catálogo como opción"],
  ["Mmm no sé todavía", (r) => r.state.profile.features.catalog === false, "sigue sin insistir"],
  ["Eso sí me serviría", (r) => r.state.profile.features.catalog === true, "sí"],
  ["Nah, eso no", (r) => r.state.profile.features.catalog === false, "no"],
  ["Sí, aunque primero quiero algo sencillo", (r) => r.state.profile.features.catalog === false && /segunda etapa/.test(r.reply), "pospone"],
  ["Solo manejo insta", (r) => Boolean(r.state.profile.channels?.includes("instagram")), "instagram"],
  ["Perdón, también tengo web pero está horrible", (r) => ["needs_improvement", "outdated", "existing"].includes(r.state.profile.websiteStatus ?? ""), "web existente a mejorar"],
];
for (const [phrase, ok, what] of STRESS) {
  const r = talk(["Tengo una tienda de ropa y vendo por Instagram", phrase]);
  check(ok(r) && !NOT_UNDERSTOOD.test(r.reply), `"${phrase}" → ${what}`, r.reply.slice(0, 90));
}

/* ---------------------------------------------------------------
   8. Categorías de la capa de interpretación
   --------------------------------------------------------------- */
console.log("\n8) Categorías");
const asking = talk(["Tengo una tienda de ropa y vendo por Instagram"]).state;
const KINDS: [string, string][] = [
  ["Me encanta", "positive"], ["La verdad no", "negative"], ["No sé todavía", "uncertain"], ["¿Cuánto cuesta el catálogo?", "question"],
  ["Perdón, sí tengo página", "correction"], ["Está bueno pero no me alcanza", "budget_objection"], ["Solo tengo WhatsApp", "free_text_information"],
  ["asdf qwerty", "unknown"],
];
for (const [phrase, kind] of KINDS) {
  const got = interpretReply(phrase, asking).kind;
  check(got === kind, `"${phrase}" → ${got}`, got === kind ? "" : `esperado ${kind}`);
}

console.log(failures ? `\n✗ ${failures} comprobaciones fallaron` : "\n✓ Todo correcto");
process.exit(failures ? 1 : 0);
