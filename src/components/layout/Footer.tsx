import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { JpMark } from "@/components/brand/JpMark";
import { ChannelIcon } from "@/components/icons/BrandIcons";
import { Container } from "@/components/ui/Container";
import { footerNav, siteConfig } from "@/config/site";
import { getSocialLinks, isExternalHref } from "@/lib/contact";
import { CurrentYear } from "./CurrentYear";

export function Footer() {
  const socials = getSocialLinks();

  return (
    <footer className="relative overflow-hidden border-t border-line">
      <JpMark
        mono
        className="pointer-events-none absolute -right-16 -bottom-24 size-[22rem] text-snow opacity-[0.025] sm:size-[28rem]"
      />
      <Container className="relative py-14 sm:py-16">
        <div className="flex flex-col gap-12 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-sm text-mist">{siteConfig.slogan}</p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:gap-16">
            <nav aria-label="Pie de página">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-mist/80">Navegación</p>
              <ul className="mt-4 space-y-3">
                {footerNav.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-sm text-mist transition-colors hover:text-snow">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-mist/80">Redes</p>
              <ul className="mt-4 space-y-3">
                {socials.map((social) => (
                  <li key={social.id}>
                    {social.href ? (
                      <a
                        href={social.href}
                        {...(isExternalHref(social.href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        className="inline-flex items-center gap-2.5 text-sm text-mist transition-colors hover:text-snow"
                      >
                        <ChannelIcon name={social.id} className="size-4" />
                        {social.label}
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-2.5 text-sm text-mist/50">
                        <ChannelIcon name={social.id} className="size-4" />
                        {social.label}
                        <span className="font-mono text-[10px] uppercase tracking-wider">Pronto</span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-line pt-6 text-xs text-mist/80 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © <CurrentYear fallback={new Date().getFullYear()} /> {siteConfig.name}. Todos los derechos reservados.
          </p>
          <p className="font-mono uppercase tracking-[0.18em]">Hecho en {siteConfig.country}</p>
        </div>
      </Container>
    </footer>
  );
}
