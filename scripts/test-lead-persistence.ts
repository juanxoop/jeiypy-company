/**
 * Prueba de persistencia de leads con el MISMO payload que genera Jeipy AI en producción.
 *
 *   npm run test:leads
 *
 * 1. Compatibilidad (siempre): recorre conversaciones reales con el motor de Jeipy AI, arma el
 *    cuerpo igual que el navegador y lo pasa por validación → registro → columnas de Supabase.
 *    Compara el resultado con el schema de `public.leads` en supabase/leads.sql: columnas que no
 *    existen, NOT NULL sin valor, estados y website_status fuera del CHECK, tipos incorrectos y
 *    texto que Supabase rechazaría (sustitutos UTF-16 sueltos, NUL).
 *
 * 2. Extremo a extremo (si hay variables): API → Supabase → recuperar el lead creado.
 *      LEADS_TEST_BASE_URL        p. ej. http://localhost:3000 o https://tu-dominio.com
 *      SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   para leer el lead guardado y limpiar
 *    Los leads llevan "PRUEBA AUTOMÁTICA" en el negocio. Limpieza: se intenta borrar; si la base
 *    no lo permite (producción: service_role no tiene DELETE a propósito), se cierran como
 *    "cerrado-sin-respuesta" para que no queden en Activos.
 *    Ojo: en producción, cada lead de prueba también dispara el aviso por correo/webhook.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { TEST_MARKER, samplePayloads, type LeadPayload } from "@/features/leads/sample";
import { buildLeadRecord } from "@/server/leads/service";
import { fromRecord } from "@/server/leads/store";
import { validateLead } from "@/server/leads/validate";

let failures = 0;
const check = (ok: boolean, label: string, detail = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "  ✓" : "  ✗"} ${label}${detail ? ` — ${detail}` : ""}`);
};
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

/* ---------------------------------------------------------------
   Schema de public.leads según supabase/leads.sql
   --------------------------------------------------------------- */
type Column = { type: string; notNull: boolean; hasDefault: boolean };

function readSchema() {
  const sql = readFileSync(resolve(process.cwd(), "supabase/leads.sql"), "utf8");
  const columns = new Map<string, Column>();
  const table = /create table if not exists public\.leads \(([\s\S]*?)\n\);/.exec(sql)?.[1] ?? "";
  const colRe = /^\s*(\w+)\s+(uuid|text\[\]|text|timestamptz|boolean|bigint|jsonb)(?=[\s,]|$)(.*)$/;
  for (const line of table.split("\n")) {
    const m = colRe.exec(line);
    if (m) columns.set(m[1], { type: m[2], notNull: /not null|primary key/.test(m[3]), hasDefault: /default/.test(m[3]) });
  }
  for (const m of sql.matchAll(/alter table public\.leads add column if not exists (\w+) (text\[\]|text|timestamptz|boolean|bigint|jsonb)([^;]*);/g)) {
    columns.set(m[1], { type: m[2], notNull: /not null/.test(m[3]), hasDefault: /default/.test(m[3]) });
  }
  const list = (re: RegExp) => [...(re.exec(sql)?.[1] ?? "").matchAll(/'([^']+)'/g)].map((m) => m[1]);
  return {
    columns,
    statuses: list(/leads_status_check\s+check \(status in \(([\s\S]*?)\)\)/),
    websiteStatuses: list(/leads_website_status_check\s+check \(website_status is null or website_status in \(([^)]*)\)\)/),
  };
}

function typeOk(type: string, value: unknown): boolean {
  if (value === null) return true;
  switch (type) {
    case "text":
      return typeof value === "string";
    case "text[]":
      return Array.isArray(value) && value.every((v) => typeof v === "string");
    case "boolean":
      return typeof value === "boolean";
    case "bigint":
      return Number.isInteger(value);
    case "timestamptz":
      return typeof value === "string" && !Number.isNaN(Date.parse(value));
    case "uuid":
      return typeof value === "string";
    case "jsonb":
      return true;
    default:
      return false;
  }
}

function compatibility(schema: ReturnType<typeof readSchema>, name: string, payload: LeadPayload) {
  console.log(`\n· ${name}`);
  const body = JSON.stringify(payload);
  check(!LONE_SURROGATE.test(body), "El cuerpo enviado es texto válido (sin emojis partidos)");
  const validation = validateLead(JSON.parse(body));
  check(validation.ok, "Pasa la validación del servidor", validation.ok ? "" : validation.reason);
  if (!validation.ok) return;

  const row = fromRecord(buildLeadRecord(validation.lead, { userAgent: "test-lead-persistence" }));
  const unknown = Object.keys(row).filter((k) => !schema.columns.has(k));
  check(unknown.length === 0, "Todas las columnas existen en public.leads", unknown.join(", "));
  const missing = [...schema.columns].filter(([k, c]) => c.notNull && !c.hasDefault && (row[k] === undefined || row[k] === null)).map(([k]) => k);
  check(missing.length === 0, "Columnas NOT NULL con valor", missing.join(", "));
  const nulls = Object.entries(row).filter(([k, v]) => v === null && schema.columns.get(k)?.notNull).map(([k]) => k);
  check(nulls.length === 0, "Ningún null en columnas NOT NULL", nulls.join(", "));
  const badTypes = Object.entries(row).filter(([k, v]) => schema.columns.has(k) && !typeOk(schema.columns.get(k)!.type, v)).map(([k]) => `${k}:${schema.columns.get(k)!.type}`);
  check(badTypes.length === 0, "Tipos compatibles", badTypes.join(", "));
  check(schema.statuses.includes(String(row.status)), `status "${row.status}" permitido por leads_status_check`);
  check(row.website_status === null || schema.websiteStatuses.includes(String(row.website_status)), `website_status "${row.website_status}" permitido`);
  check(!LONE_SURROGATE.test(JSON.stringify(row)), "Lo que se envía a Supabase es JSON válido");
}

/* ---------------------------------------------------------------
   Extremo a extremo: API → Supabase → recuperar
   --------------------------------------------------------------- */
async function endToEnd(name: string, payload: LeadPayload, env: { base: string; url: string; key: string }) {
  console.log(`\n· ${name}`);
  const headers = { apikey: env.key, Authorization: `Bearer ${env.key}`, "Content-Type": "application/json" };
  const response = await fetch(`${env.base}/api/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: env.base },
    body: JSON.stringify(payload),
  });
  const result = (await response.json().catch(() => null)) as { ok?: boolean; id?: string; error?: string; requestId?: string } | null;
  check(response.status === 201 && Boolean(result?.ok && result.id), `POST /api/leads → ${response.status}`, result?.ok ? `id ${result.id}` : `error ${result?.error} · ref ${result?.requestId}`);
  if (!result?.ok || !result.id) return;

  const read = await fetch(`${env.url}/rest/v1/leads?id=eq.${result.id}&select=*`, { headers });
  const [row] = ((await read.json().catch(() => [])) as Record<string, unknown>[]) ?? [];
  check(read.ok && Boolean(row), "El lead se recupera de Supabase", read.ok ? "" : `HTTP ${read.status}`);
  if (row) {
    const validated = validateLead(payload);
    const lead = validated.ok ? validated.lead : undefined;
    check(row.conversation_id === payload.conversationId, "conversation_id coincide");
    check(row.name === lead?.name && row.phone === lead?.phone, "Nombre y teléfono coinciden");
    check(row.recommended_plan === (lead?.recommendedPlan ?? null) && row.recommended_ai === (lead?.recommendedAi ?? null), "Plan y Jeipy AI coinciden", `${row.recommended_plan} / ${row.recommended_ai}`);
    check(row.business_description === (lead?.businessDescription ?? null), "Descripción del negocio intacta (sin emojis partidos)");
    check(Number(row.budget ?? 0) === (lead?.budget ?? 0), "Presupuesto intacto");
    check(Array.isArray(row.transcript) && (row.transcript as unknown[]).length === (lead?.transcript?.length ?? 0), "Historial guardado completo");
  }

  // Limpieza: borrar si la base lo permite; si no (producción), cerrar para que salga de Activos.
  const del = await fetch(`${env.url}/rest/v1/leads?id=eq.${result.id}`, { method: "DELETE", headers });
  if (del.ok) console.log("    limpieza: lead de prueba eliminado");
  else {
    const close = await fetch(`${env.url}/rest/v1/leads?id=eq.${result.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status: "cerrado-sin-respuesta", status_changed_by: "Prueba automática" }),
    });
    console.log(`    limpieza: DELETE no permitido (${del.status}, esperado en producción) → cerrado como "sin respuesta" (${close.status})`);
  }
}

async function main() {
  const schema = readSchema();
  console.log(`Schema de public.leads (supabase/leads.sql): ${schema.columns.size} columnas · estados: ${schema.statuses.join(", ")}`);

  const runId = Date.now().toString(36);
  const samples = samplePayloads(`${TEST_MARKER} ${runId}`).map((s, i) => ({ ...s, payload: { ...s.payload, conversationId: `prueba-auto-${runId}-${i}` } }));
  // Lead que quedó en el navegador con texto partido (versiones anteriores): el servidor debe repararlo.
  const broken = samples[3].payload;
  samples.push({
    name: "Reintento de un pendiente antiguo con emoji partido",
    payload: {
      ...broken,
      conversationId: `prueba-auto-${runId}-roto`,
      businessDescription: `${broken.businessDescription ?? ""}\uD83D`,
      transcript: [...(broken.transcript ?? []), { role: "user", text: "texto partido \uD83D" }],
    },
  });

  console.log("\n1) Compatibilidad del payload con public.leads");
  for (const { name, payload } of samples) {
    if (name.startsWith("Reintento")) {
      console.log(`\n· ${name}`);
      const v = validateLead(JSON.parse(JSON.stringify(payload)));
      check(v.ok && !LONE_SURROGATE.test(JSON.stringify(v.ok ? fromRecord(buildLeadRecord(v.lead)) : {})), "El servidor repara el texto antes de enviarlo a Supabase");
    } else compatibility(schema, name, payload);
  }

  const base = process.env.LEADS_TEST_BASE_URL?.replace(/\/+$/, "");
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (base && url && key) {
    console.log(`\n2) Extremo a extremo: ${base}/api/leads → Supabase → lectura`);
    for (const { name, payload } of samples) await endToEnd(name, payload, { base, url, key });
  } else {
    console.log("\n2) Extremo a extremo: omitido (define LEADS_TEST_BASE_URL, SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY).");
  }

  console.log(failures ? `\n✗ ${failures} comprobaciones fallaron` : "\n✓ Todo correcto");
  process.exit(failures ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
