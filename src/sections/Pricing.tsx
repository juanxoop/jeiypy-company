import { SparkIcon } from "@/components/icons/BrandIcons";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { Container } from "@/components/ui/Container";
import { PlanCard } from "@/components/ui/PlanCard";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { pricingContent } from "@/data/home";
import { jeipyAi, plans } from "@/data/plans";

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

        <RevealGroup as="ul" className="mx-auto mt-14 grid max-w-xl gap-5 sm:mt-20 lg:max-w-none lg:grid-cols-[1fr_1fr_1.25fr] lg:gap-4 xl:gap-5">
          {plans.map((plan, index) => (
            <RevealItem as="li" key={plan.id} className="h-full">
              <PlanCard plan={plan} index={index} />
            </RevealItem>
          ))}
        </RevealGroup>

        <Reveal>
          <ul className="mx-auto mt-12 flex max-w-3xl flex-col gap-3 text-sm leading-relaxed text-mist sm:items-center sm:text-center">
            {pricingContent.notes.map((note) => (
              <li key={note} className="flex items-start gap-2.5 sm:items-center">
                <svg viewBox="0 0 16 16" fill="none" aria-hidden className="mt-0.5 size-4 shrink-0 text-glow sm:mt-0">
                  <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M8 7.2v3.6M8 5.2h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                {note}
              </li>
            ))}
            <li className="flex items-start gap-2.5 sm:items-center">
              <SparkIcon className="mt-0.5 size-4 shrink-0 text-glow sm:mt-0" />
              {jeipyAi.costNote}
            </li>
          </ul>
        </Reveal>
      </Container>
    </Section>
  );
}
