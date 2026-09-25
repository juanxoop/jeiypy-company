import "server-only";
import type { AiLevel, AiTierId, DigitalChannel, Feature, Goal, PlanId, WebsiteStatus } from "@/features/assistant/types";
import type { ContactChannel, LeadIntent, LeadSubmission, TranscriptEntry } from "@/features/leads/types";
import { safeSlice } from "@/lib/text";

/**
 * Validación estricta de lo que envía el navegador. Nada del cliente se da por bueno:
 * tipos, longitudes y valores permitidos se comprueban aquí.
 */
const PLANS: PlanId[] = ["basico", "esencial", "premium"];
const AI_TIERS: AiTierId[] = ["lite", "pro", "custom"];
const FEATURES: Feature[] = ["catalog", "booking", "forms", "ai", "integrations", "seo", "automation"];
const GOALS: Goal[] = ["clients", "image", "showcase", "sell", "automate"];
const WEBSITES: WebsiteStatus[] = ["none", "existing", "outdated", "needs_improvement"];
const CHANNELS_ALLOWED: DigitalChannel[] = ["whatsapp", "instagram", "facebook", "tiktok", "google_business", "website", "ecommerce", "other", "none"];
const AI_LEVELS: AiLevel[] = ["basic", "advanced"];
const INTENTS: LeadIntent[] = ["quote", "callback"];
const CHANNELS: ContactChannel[] = ["whatsapp", "llamada", "correo"];

const MAX_TRANSCRIPT = 80;

type Obj = Record<string, unknown>;

// Recorte seguro: nunca parte un emoji (un sustituto suelto hace que Supabase rechace el lead completo).
const text = (value: unknown, max: number): string | undefined => {
  if (typeof value !== "string") return undefined;
  const clean = safeSlice(value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim(), max).trim();
  return clean || undefined;
};
const oneOf = <T extends string>(value: unknown, allowed: readonly T[]): T | undefined =>
  typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;

export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 160;
}

function transcript(value: unknown): TranscriptEntry[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const entries = value
    .slice(-MAX_TRANSCRIPT)
    .map((entry) => {
      const e = (entry ?? {}) as Obj;
      const role = oneOf(e.role, ["user", "assistant"] as const);
      // Sin NUL (jsonb no lo admite) y sin partir emojis.
      const body = typeof e.text === "string" ? safeSlice(e.text.replace(/\u0000/g, "").trim(), 1500) || undefined : undefined;
      return role && body ? { role, text: body } : null;
    })
    .filter((e): e is TranscriptEntry => e !== null);
  return entries.length ? entries : undefined;
}

export type ValidationResult = { ok: true; lead: LeadSubmission } | { ok: false; reason: string };

export function validateLead(input: unknown): ValidationResult {
  if (!input || typeof input !== "object") return { ok: false, reason: "body" };
  const b = input as Obj;

  const conversationId = text(b.conversationId, 64);
  if (!conversationId || !/^[\w-]{8,64}$/.test(conversationId)) return { ok: false, reason: "conversationId" };
  if (b.consent !== true) return { ok: false, reason: "consent" };

  const name = text(b.name, 80);
  if (!name) return { ok: false, reason: "name" };
  const phone = text(b.phone, 30);
  if (!phone || !isValidPhone(phone)) return { ok: false, reason: "phone" };
  const email = text(b.email, 160)?.toLowerCase();
  if (email && !isValidEmail(email)) return { ok: false, reason: "email" };

  const intent = oneOf(b.intent, INTENTS);
  if (!intent) return { ok: false, reason: "intent" };

  const features = Array.isArray(b.features) ? [...new Set(b.features.filter((f) => oneOf(f, FEATURES)))] as Feature[] : [];
  const budget = typeof b.budget === "number" && Number.isFinite(b.budget) && b.budget > 0 && b.budget < 1e11 ? Math.round(b.budget) : undefined;

  return {
    ok: true,
    lead: {
      conversationId,
      consent: true,
      name,
      phone,
      email,
      businessName: text(b.businessName, 120),
      businessType: text(b.businessType, 80),
      businessDescription: text(b.businessDescription, 300),
      channels: Array.isArray(b.channels) ? ([...new Set(b.channels.filter((c) => oneOf(c, CHANNELS_ALLOWED)))] as DigitalChannel[]) : [],
      websiteStatus: oneOf(b.websiteStatus, WEBSITES),
      goal: oneOf(b.goal, GOALS),
      features,
      aiInterest: b.aiInterest === true,
      aiLevel: oneOf(b.aiLevel, AI_LEVELS),
      recommendedPlan: oneOf(b.recommendedPlan, PLANS),
      recommendedAi: oneOf(b.recommendedAi, AI_TIERS),
      budget,
      intent,
      callbackRequested: b.callbackRequested === true,
      preferredTime: text(b.preferredTime, 80),
      preferredChannel: oneOf(b.preferredChannel, CHANNELS),
      transcript: transcript(b.transcript),
      isUpdate: b.isUpdate === true,
      backupNotified: b.backupNotified === true,
    },
  };
}
