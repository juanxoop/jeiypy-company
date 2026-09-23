import { cn } from "@/lib/cn";

/* Glifos simplificados de canales y redes. Lineales para mantener coherencia con el resto del sistema. */

export type ChannelIconName = "instagram" | "facebook" | "whatsapp" | "tiktok" | "referrals";

const paths: Record<ChannelIconName, React.ReactNode> = {
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17.2 6.8h.01" strokeWidth="2.2" />
    </>
  ),
  facebook: <path d="M14 21v-7.5h2.6l.4-3H14V8.6c0-.9.3-1.5 1.6-1.5H17V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H8.4v3H11V21" />,
  whatsapp: (
    <>
      <path d="M20.5 11.8a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.3-4.2a8.5 8.5 0 1 1 15.7-4.5Z" />
      <path d="M9 8.5c0 3.6 2.9 6.5 6.5 6.5l.9-1.6-1.9-.9-.9.9c-1.1-.4-2.6-1.9-3-3l.9-.9-.9-1.9L9 8.5Z" />
    </>
  ),
  tiktok: <path d="M14 3.5v11.2a3.8 3.8 0 1 1-3.8-3.8M14 3.5c.3 2.4 2 4.2 4.5 4.4" />,
  referrals: (
    <>
      <circle cx="8.5" cy="8.5" r="3" />
      <circle cx="16.5" cy="9.5" r="2.5" />
      <path d="M3.5 19c.5-3 2.5-4.8 5-4.8s4.5 1.8 5 4.8M14.5 14.4c2.6-.6 5.3.7 6 4.6" />
    </>
  ),
};

export function ChannelIcon({ name, className }: { name: ChannelIconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn("size-5", className)}
    >
      {paths[name]}
    </svg>
  );
}

export function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={cn("size-4", className)}>
      <path d="m3.5 8.5 3 3 6-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Destello de Jeipy AI: una estrella principal y una secundaria que se mueve con el hover del grupo. */
export function SparkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={cn("size-4", className)}>
      <path
        d="M10 3.5c.5 3.6 2.4 5.5 6 6-3.6.5-5.5 2.4-6 6-.5-3.6-2.4-5.5-6-6 3.6-.5 5.5-2.4 6-6Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M18 14.5c.25 1.7 1.05 2.5 2.75 2.75-1.7.25-2.5 1.05-2.75 2.75-.25-1.7-1.05-2.5-2.75-2.75 1.7-.25 2.5-1.05 2.75-2.75Z"
        fill="currentColor"
        className="origin-center transition-transform duration-500 ease-(--ease-jeipy) [transform-box:fill-box] group-hover:rotate-45 group-hover:scale-110"
      />
    </svg>
  );
}
