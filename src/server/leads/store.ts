import "server-only";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { LeadRecord } from "@/features/leads/types";
import { leadsConfig } from "./config";

/**
 * Almacenamiento de leads. Interfaz mínima para poder cambiar de proveedor
 * (Supabase hoy; otro Postgres, un CRM o una hoja de cálculo mañana) sin tocar el resto.
 */
export interface LeadStore {
  readonly name: string;
  /** Guarda o actualiza el lead de una conversación. */
  save(lead: LeadRecord): Promise<void>;
}

/** Supabase (Postgres) vía su API REST, con la clave de servicio: solo existe en el servidor. */
function supabaseStore(url: string, key: string, table: string): LeadStore {
  return {
    name: "supabase",
    async save(lead) {
      const row = {
        conversation_id: lead.conversationId,
        updated_at: new Date().toISOString(),
        status: lead.status,
        intent: lead.intent,
        name: lead.name,
        phone: lead.phone,
        email: lead.email ?? null,
        business_name: lead.businessName ?? null,
        business_type: lead.businessType ?? null,
        website_status: lead.website ?? null,
        goal: lead.goal ?? null,
        needs: lead.needs,
        features: lead.features,
        ai_interest: lead.aiInterest,
        ai_level: lead.aiLevel ?? null,
        recommended_plan: lead.recommendedPlan ?? null,
        recommended_ai: lead.recommendedAi ?? null,
        budget: lead.budget ?? null,
        callback_requested: lead.callbackRequested,
        preferred_time: lead.preferredTime ?? null,
        preferred_channel: lead.preferredChannel ?? null,
        summary: lead.summary,
        report: lead.report,
        transcript: lead.transcript ?? null,
        consent_at: lead.consentAt,
        source: lead.source,
        user_agent: lead.userAgent ?? null,
      };
      const response = await fetch(`${url}/rest/v1/${encodeURIComponent(table)}?on_conflict=conversation_id`, {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify(row),
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error(`Supabase ${response.status}: ${(await response.text()).slice(0, 300)}`);
    },
  };
}

/** Archivo JSONL local, solo para desarrollo. En Vercel el disco es efímero: no sirve en producción. */
function fileStore(): LeadStore {
  const file = path.join(process.cwd(), ".data", "leads.jsonl");
  return {
    name: "file",
    async save(lead) {
      await mkdir(path.dirname(file), { recursive: true });
      await appendFile(file, `${JSON.stringify(lead)}\n`, "utf8");
    },
  };
}

export function getLeadStore(): LeadStore | null {
  const { supabase, store } = leadsConfig;
  if (supabase.url && supabase.serviceRoleKey) return supabaseStore(supabase.url, supabase.serviceRoleKey, supabase.table);
  if (store === "file") return fileStore();
  return null;
}
