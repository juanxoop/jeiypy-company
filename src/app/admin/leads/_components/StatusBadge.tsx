import type { LeadStatus } from "@/features/leads/types";
import { cn } from "@/lib/cn";
import { statusLabel, statusTone } from "./format";

export function StatusBadge({ status, className }: { status: LeadStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium", statusTone(status), className)}>
      {statusLabel(status)}
    </span>
  );
}
