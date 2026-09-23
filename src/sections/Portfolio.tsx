import { JpMark } from "@/components/brand/JpMark";
import { Reveal } from "@/components/motion/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { ProjectCard } from "@/components/ui/ProjectCard";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { portfolioContent } from "@/data/home";
import { projects } from "@/data/projects";
import { getContactHref } from "@/lib/contact";

export function Portfolio() {
  return (
    <Section id="portafolio" aria-labelledby="portafolio-title" className="border-t border-line">
      <Container>
        <SectionHeading
          index="03"
          eyebrow={portfolioContent.eyebrow}
          title={portfolioContent.title}
          description={portfolioContent.description}
          titleId="portafolio-title"
        />

        <div className="mt-14 space-y-4 sm:mt-16">
          {projects.map((project) => (
            <Reveal key={project.slug}>
              <ProjectCard project={project} />
            </Reveal>
          ))}

          <Reveal delay={0.08}>
            <div className="relative flex flex-col items-start gap-6 overflow-hidden rounded-3xl border border-dashed border-line-strong p-7 sm:flex-row sm:items-center sm:justify-between sm:p-10">
              <div aria-hidden className="pointer-events-none absolute -right-6 -bottom-10 opacity-[0.05]">
                <JpMark sizes="176px" className="size-44" />
              </div>
              <div className="relative max-w-xl">
                <p className="text-xl font-semibold tracking-[-0.02em] text-snow sm:text-2xl">{portfolioContent.nextSlot.title}</p>
                <p className="mt-2 text-mist">{portfolioContent.nextSlot.text}</p>
              </div>
              <ButtonLink
                href={getContactHref("Hola Jeipy, quiero que mi negocio sea uno de sus próximos proyectos.")}
                variant="secondary"
                withArrow
                className="relative"
              >
                {portfolioContent.nextSlot.cta}
              </ButtonLink>
            </div>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
