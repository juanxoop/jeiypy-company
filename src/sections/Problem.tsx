import { ChannelIcon, CheckIcon } from "@/components/icons/BrandIcons";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { problemContent } from "@/data/home";

export function Problem() {
  return (
    <Section id="problema" aria-labelledby="problema-title">
      <Container>
        <SectionHeading
          index="01"
          eyebrow={problemContent.eyebrow}
          title={problemContent.title}
          description={problemContent.description}
          titleId="problema-title"
        />

        <div className="mt-14 grid items-stretch gap-4 sm:mt-16 lg:grid-cols-[1fr_4.5rem_1fr] lg:gap-0">
          {/* Situación actual */}
          <Reveal className="h-full">
            <Card interactive={false} className="h-full p-6 sm:p-8">
              <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-mist">{problemContent.todayLabel}</h3>
              <ul className="mt-6">
                {problemContent.channels.map((channel) => (
                  <li
                    key={channel.id}
                    className="flex items-start gap-4 border-t border-dashed border-line py-4 first:border-t-0 first:pt-0 last:pb-0"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-white/[0.02] text-mist">
                      <ChannelIcon name={channel.id} />
                    </span>
                    <div>
                      <p className="font-medium text-snow/90">{channel.name}</p>
                      <p className="mt-1 text-sm leading-relaxed text-mist">{channel.note}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </Reveal>

          {/* Conector */}
          <div aria-hidden className="flex items-center justify-center py-1 lg:py-0">
            <div className="relative flex items-center justify-center lg:h-full lg:w-full">
              <span className="absolute h-8 w-px bg-[linear-gradient(to_bottom,transparent,rgb(84_168_255/0.5),transparent)] lg:h-px lg:w-full lg:bg-[linear-gradient(to_right,transparent,rgb(84_168_255/0.5),transparent)]" />
              <span className="relative grid size-9 place-items-center rounded-full border border-glow/30 bg-ink text-glow shadow-[0_0_24px_-4px_rgb(23_105_255/0.6)]">
                <svg viewBox="0 0 16 16" fill="none" className="size-4 rotate-90 lg:rotate-0">
                  <path d="M3 8h9.5M8.5 3.5 13 8l-4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          </div>

          {/* Con presencia profesional */}
          <Reveal delay={0.12} className="h-full">
            <Card interactive={false} featured className="h-full p-6 sm:p-8">
              <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-glow">{problemContent.withWebLabel}</h3>
              <RevealGroup as="ul" className="mt-6 space-y-5">
                {problemContent.benefits.map((benefit) => (
                  <RevealItem as="li" key={benefit.title} className="flex items-start gap-4">
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-jeipy/15 text-glow ring-1 ring-glow/25">
                      <CheckIcon className="size-3.5" />
                    </span>
                    <p className="leading-relaxed text-mist">
                      <span className="font-medium text-snow">{benefit.title}.</span> {benefit.text}
                    </p>
                  </RevealItem>
                ))}
              </RevealGroup>
            </Card>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
