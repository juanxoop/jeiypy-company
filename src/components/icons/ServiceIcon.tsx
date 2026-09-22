import { cn } from "@/lib/cn";

export type ServiceIconName = "web" | "landing" | "catalog" | "chat" | "speed" | "presence";

/*
 * Iconos lineales de 24px. Cada uno anima una sola pieza cuando la card (.group)
 * recibe hover: la microanimación acompaña, no protagoniza.
 */
const part = "transition-transform duration-500 ease-(--ease-jeipy) [transform-box:fill-box] origin-center";

const icons: Record<ServiceIconName, React.ReactNode> = {
  web: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <path d="M3 8.5h18" />
      <path d="M6 6.5h.01M8 6.5h.01" />
      <path d={"M7 12.5h6M7 15.5h4"} className={cn(part, "origin-left group-hover:scale-x-125")} />
    </>
  ),
  landing: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" className={cn(part, "group-hover:scale-75")} />
      <circle cx="12" cy="12" r="1" className="fill-current" />
    </>
  ),
  catalog: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.8" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.8" className={cn(part, "group-hover:-translate-y-0.5 group-hover:translate-x-0.5")} />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.8" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.8" />
    </>
  ),
  chat: (
    <>
      <path d="M20.5 11.6c0 4.4-3.8 7.9-8.5 7.9-1.2 0-2.4-.2-3.4-.7L4 20l1.2-3.7c-.9-1.3-1.7-2.9-1.7-4.7C3.5 7.2 7.3 3.7 12 3.7s8.5 3.5 8.5 7.9Z" />
      <g className={cn(part, "group-hover:-translate-y-0.5")}>
        <path d="M8.5 11.7h.01M12 11.7h.01M15.5 11.7h.01" strokeWidth="2.2" />
      </g>
    </>
  ),
  speed: (
    <>
      <path d="M4.2 17.5a8.5 8.5 0 1 1 15.6 0" />
      <path d="M12 13.5 15.5 9" className={cn(part, "origin-bottom-left group-hover:rotate-[24deg]")} />
      <circle cx="12" cy="13.5" r="1.3" className="fill-current" />
    </>
  ),
  presence: (
    <>
      <path d="M12 3.5 19.5 6v5.6c0 4.3-3.1 7.6-7.5 8.9-4.4-1.3-7.5-4.6-7.5-8.9V6L12 3.5Z" />
      <path d="m8.8 12 2.2 2.2 4.2-4.4" className={cn(part, "group-hover:scale-110")} />
    </>
  ),
};

export function ServiceIcon({ name, className }: { name: ServiceIconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn("size-6", className)}
    >
      {icons[name]}
    </svg>
  );
}
