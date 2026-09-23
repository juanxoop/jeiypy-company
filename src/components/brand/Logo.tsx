import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/cn";
import { JpMark } from "./JpMark";

type LogoProps = {
  className?: string;
  withWordmark?: boolean;
  href?: string;
  onClick?: () => void;
};

export function Logo({ className, withWordmark = true, href = "#inicio", onClick }: LogoProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-label={`${siteConfig.name}, ir al inicio`}
      className={cn("group inline-flex items-center gap-2.5 rounded-lg text-snow", className)}
    >
      <JpMark shine preload sizes="36px" className="size-9" />
      {withWordmark && (
        <span className="text-[15px] font-semibold tracking-tight whitespace-nowrap">
          Jeipy<span className="text-mist font-medium"> Company</span>
        </span>
      )}
    </Link>
  );
}
