import { CheckIcon } from "@/components/icons/BrandIcons";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { PulseDot } from "@/components/ui/PulseDot";
import { AmbientBackground } from "@/components/visuals/AmbientBackground";
import { HeroVisual } from "@/components/visuals/HeroVisual";
import { TechLine } from "@/components/visuals/TechLine";
import { heroContent } from "@/data/home";
import { getContactHref } from "@/lib/contact";

/** Retardo escalonado de entrada (ms) para el patrón Jeipy Reveal en CSS. */
const enter = (ms: number) => ({ "--enter-delay": ms }) as React.CSSProperties;

export function Hero() {
  return (
    <section
      id="inicio"
      aria-labelledby="hero-title"
      className="relative flex min-h-[100svh] flex-col overflow-hidden pt-28 sm:pt-32 lg:pt-36"
    >
      <AmbientBackground particles intensity="medium" />

      <Container className="relative flex flex-1 flex-col">
        <div className="grid flex-1 items-center gap-16 pb-20 lg:grid-cols-[1.08fr_0.92fr] lg:gap-10 lg:pb-28">
          <div className="max-w-2xl">
            <p
              className="jp-enter inline-flex items-center gap-2.5 rounded-full border border-line-strong bg-white/[0.03] py-1.5 pr-3.5 pl-3 font-mono text-[11px] uppercase tracking-[0.18em] text-mist"
              style={enter(0)}
            >
              <PulseDot />
              {heroContent.eyebrow}
            </p>

            <h1
              id="hero-title"
              className="jp-enter mt-7 text-[2.75rem] leading-[1.02] font-semibold tracking-[-0.045em] text-snow min-[400px]:text-5xl sm:text-6xl lg:text-7xl xl:text-[5.25rem]"
              style={enter(80)}
            >
              {heroContent.title.lead} <span className="jp-text-gradient">{heroContent.title.highlight}</span>
            </h1>

            <p
              className="jp-enter mt-6 max-w-lg text-lg leading-relaxed text-mist sm:text-xl"
              style={enter(180)}
            >
              {heroContent.description}
            </p>

            <div className="jp-enter mt-10 flex flex-col gap-3 sm:flex-row sm:items-center" style={enter(280)}>
              <ButtonLink href={getContactHref()} size="lg" withArrow>
                {heroContent.primaryCta}
              </ButtonLink>
              <ButtonLink href={heroContent.secondaryCta.href} variant="secondary" size="lg">
                {heroContent.secondaryCta.label}
              </ButtonLink>
            </div>

            <ul className="jp-enter mt-10 flex flex-wrap gap-x-6 gap-y-3" style={enter(380)}>
              {heroContent.highlights.map((item) => (
                <li key={item} className="inline-flex items-center gap-2 text-sm text-mist">
                  <CheckIcon className="size-3.5 text-glow" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="jp-enter" style={enter(300)}>
            <HeroVisual />
          </div>
        </div>
      </Container>

      <TechLine />
    </section>
  );
}
