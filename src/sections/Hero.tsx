import { HeroMark } from "@/components/brand/HeroMark";
import { CheckIcon } from "@/components/icons/BrandIcons";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { AmbientBackground } from "@/components/visuals/AmbientBackground";
import { HeroVisual } from "@/components/visuals/HeroVisual";
import { TechLine } from "@/components/visuals/TechLine";
import { heroContent } from "@/data/home";
import { getContactHref } from "@/lib/contact";

/** Retardo escalonado de entrada (ms) para el patrón Jeipy Reveal en CSS. */
const enter = (ms: number) => ({ "--enter-delay": ms }) as React.CSSProperties;

export function Hero() {
  return (
    <section id="inicio" aria-labelledby="hero-title" className="relative overflow-hidden pt-28 sm:pt-32 lg:pt-36">
      <AmbientBackground particles intensity="medium" />
      {/* Foco de luz detrás del titular */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-24 left-1/2 h-[34rem] w-[min(64rem,100%)] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(23_105_255/0.2),transparent)] blur-2xl"
      />

      <Container className="relative flex flex-col items-center text-center">
        <div className="jp-enter" style={enter(0)}>
          <HeroMark />
        </div>

        <p
          className="jp-enter mt-6 inline-flex items-center gap-3 font-mono text-[11px] font-medium whitespace-nowrap uppercase tracking-[0.2em] text-glow min-[400px]:tracking-[0.32em] sm:text-xs"
          style={enter(120)}
        >
          <span aria-hidden className="h-px w-6 bg-[linear-gradient(to_right,transparent,rgb(84_168_255/0.7))]" />
          {heroContent.eyebrow}
          <span aria-hidden className="h-px w-6 bg-[linear-gradient(to_left,transparent,rgb(84_168_255/0.7))]" />
        </p>

        <h1
          id="hero-title"
          className="jp-enter mt-6 max-w-5xl text-[2.6rem] leading-[1.02] font-semibold tracking-[-0.045em] text-snow min-[400px]:text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] xl:text-[6.25rem]"
          style={enter(200)}
        >
          {heroContent.title.lead}{" "}
          <span className="jp-text-gradient sm:block">{heroContent.title.highlight}</span>
        </h1>

        <p className="jp-enter mt-6 max-w-xl text-lg leading-relaxed text-mist sm:mt-8 sm:text-xl" style={enter(300)}>
          {heroContent.description}
        </p>

        <div
          className="jp-enter mt-10 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4"
          style={enter(400)}
        >
          <ButtonLink href={getContactHref()} size="lg" withArrow glow>
            {heroContent.primaryCta}
          </ButtonLink>
          <ButtonLink href={heroContent.secondaryCta.href} variant="ghost" size="lg" withArrow>
            {heroContent.secondaryCta.label}
          </ButtonLink>
        </div>

        <ul className="jp-enter mt-9 flex flex-wrap justify-center gap-x-6 gap-y-3" style={enter(500)}>
          {heroContent.highlights.map((item) => (
            <li key={item} className="inline-flex items-center gap-2 text-sm text-mist">
              <CheckIcon className="size-3.5 text-glow" />
              {item}
            </li>
          ))}
        </ul>
      </Container>

      <Container className="relative mt-16 pb-20 sm:mt-20 sm:pb-28 lg:mt-24">
        <div className="animate-jp-stage [animation-delay:450ms]">
          <HeroVisual />
        </div>
      </Container>

      <TechLine />
    </section>
  );
}
