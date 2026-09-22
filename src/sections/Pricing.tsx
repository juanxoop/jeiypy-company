import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { Container } from "@/components/ui/Container";
import { PlanCard } from "@/components/ui/PlanCard";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { pricingContent } from "@/data/home";
import { plans } from "@/data/plans";

export function Pricing() {
  return (
    <Section id="planes" aria-labelledby="planes-title" className="border-t border-line">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 h-[36rem] w-[60rem] max-w-full -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(13_71_199/0.16),transparent)] blur-2xl" />
      </div>
      <Container className="relative">
        <SectionHeading
          index="04"
          eyebrow={pricingContent.eyebrow}
          title={pricingContent.title}
          description={pricingContent.description}
          align="center"
          titleId="planes-title"
        />

        <RevealGroup as="ul" className="mx-auto mt-14 grid max-w-md gap-4 sm:mt-20 lg:max-w-none lg:grid-cols-3 lg:items-center">
          {plans.map((plan) => (
            <RevealItem as="li" key={plan.id} className="h-full">
              <PlanCard plan={plan} />
            </RevealItem>
          ))}
        </RevealGroup>

        <Reveal>
          <p className="mx-auto mt-12 flex max-w-md items-center justify-center gap-2.5 text-center text-sm text-mist">
            <svg viewBox="0 0 16 16" fill="none" aria-hidden className="size-4 shrink-0 text-glow">
              <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.3" />
              <path d="M8 7.2v3.6M8 5.2h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {pricingContent.disclaimer}
          </p>
        </Reveal>
      </Container>
    </Section>
  );
}
