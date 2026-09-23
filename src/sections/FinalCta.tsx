import { JpMark } from "@/components/brand/JpMark";
import { Reveal } from "@/components/motion/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { PulseDot } from "@/components/ui/PulseDot";
import { finalCtaContent } from "@/data/home";
import { getContactHref } from "@/lib/contact";

export function FinalCta() {
  return (
    <section
      id="contacto"
      aria-labelledby="contacto-title"
      className="relative overflow-hidden border-t border-line py-32 sm:py-40 lg:py-52"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 jp-grid opacity-50 [mask-image:radial-gradient(ellipse_60%_55%_at_50%_100%,#000,transparent)]" />
        <div className="absolute bottom-[-30%] left-1/2 h-[80%] w-[110%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(23_105_255/0.28),rgb(13_71_199/0.12)_55%,transparent)] blur-2xl animate-jp-drift" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.04]">
          <JpMark sizes="768px" className="size-[36rem] sm:size-[48rem]" />
        </div>
      </div>

      <Container className="relative text-center">
        <Reveal>
          <Eyebrow index="06" className="justify-center">
            {finalCtaContent.eyebrow}
          </Eyebrow>
        </Reveal>
        <Reveal delay={0.06}>
          <h2
            id="contacto-title"
            className="mx-auto mt-8 max-w-5xl text-[2.9rem] leading-[1] font-semibold tracking-[-0.05em] text-snow min-[400px]:text-6xl sm:text-7xl lg:text-8xl xl:text-[7.5rem]"
          >
            {finalCtaContent.title}
          </h2>
        </Reveal>
        <Reveal delay={0.12}>
          <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-mist sm:text-xl">{finalCtaContent.description}</p>
        </Reveal>
        <Reveal delay={0.18}>
          <div className="mt-12 flex flex-col items-center gap-5">
            <ButtonLink href={getContactHref(finalCtaContent.message)} size="lg" withArrow className="w-full sm:w-auto">
              {finalCtaContent.cta}
            </ButtonLink>
            <p className="inline-flex items-center gap-2.5 text-sm text-mist">
              <PulseDot />
              {finalCtaContent.note}
            </p>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
