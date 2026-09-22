import { ServiceIcon } from "@/components/icons/ServiceIcon";
import { RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { solutionContent } from "@/data/home";
import { services } from "@/data/services";

export function Services() {
  return (
    <Section id="servicios" aria-labelledby="servicios-title" className="border-t border-line">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,rgb(13_71_199/0.14),transparent)]" />
      <Container className="relative">
        <SectionHeading
          index="02"
          eyebrow={solutionContent.eyebrow}
          title={solutionContent.title}
          description={solutionContent.description}
          titleId="servicios-title"
        />

        <RevealGroup as="ul" className="mt-14 grid gap-4 sm:mt-16 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => (
            <RevealItem as="li" key={service.title} className="h-full">
              <Card className="flex h-full flex-col p-7 sm:p-8">
                <div className="flex items-start justify-between">
                  <span className="grid size-12 place-items-center rounded-2xl border border-line-strong bg-white/[0.03] text-snow transition-colors duration-500 group-hover:border-glow/35 group-hover:text-glow">
                    <ServiceIcon name={service.icon} />
                  </span>
                  <span className="font-mono text-[11px] text-mist/60">{String(index + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="mt-10 text-xl font-semibold tracking-[-0.02em] text-snow">{service.title}</h3>
                <p className="mt-3 leading-relaxed text-mist">{service.description}</p>
              </Card>
            </RevealItem>
          ))}
        </RevealGroup>
      </Container>
    </Section>
  );
}
