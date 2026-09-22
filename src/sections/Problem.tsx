import { ChannelIcon, CheckIcon } from "@/components/icons/BrandIcons";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { problemContent } from "@/data/home";
import { cn } from "@/lib/cn";

export function Problem() {
  const lastIndex = problemContent.benefits.length - 1;

  return (
    <Section id="problema" aria-labelledby="problema-title">
      <Container>
        <SectionHeading
          index="01"
          eyebrow={problemContent.eyebrow}
          title={problemContent.title}
          description={problemContent.description}
          titleId="problema-title"
          className="max-w-4xl"
        />

        <div className="mt-12 grid grid-cols-1 gap-4 sm:mt-16 lg:grid-cols-[0.95fr_1.05fr] lg:gap-5">
          {/* Situación actual: canales prestados */}
          <Reveal className="h-full">
            <div className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-glow/[0.14] bg-[linear-gradient(155deg,rgb(23_105_255/0.2)_0%,rgb(13_71_199/0.08)_45%,rgb(10_14_22)_100%)] p-5 shadow-[inset_0_1px_0_rgb(84_168_255/0.14)] sm:p-8">
              <div aria-hidden className="pointer-events-none absolute -top-24 -left-24 size-72 rounded-full bg-jeipy/20 blur-3xl" />
              <h3 className="relative font-mono text-[11px] uppercase tracking-[0.22em] text-mist">{problemContent.todayLabel}</h3>

              <ul className="relative mt-6 space-y-2.5">
                {problemContent.channels.map((channel) => (
                  <li
                    key={channel.id}
                    className="group flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.035] px-4 py-3.5 backdrop-blur-sm transition-colors duration-500 hover:border-white/[0.14] hover:bg-white/[0.05]"
                  >
                    <span className="hidden size-10 shrink-0 place-items-center rounded-xl min-[400px]:grid bg-ink/60 text-mist ring-1 ring-white/[0.06] transition-colors duration-500 group-hover:text-snow">
                      <ChannelIcon name={channel.id} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <p className="font-medium text-snow">{channel.name}</p>
                        <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-mist">
                          {problemContent.limitLabel}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-snug text-mist">{channel.note}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <p className="relative mt-auto pt-6 text-sm leading-relaxed text-mist">{problemContent.footnote}</p>
            </div>
          </Reveal>

          {/* Lo que se gana con una presencia propia */}
          <div>
            <Reveal>
              <h3 className="mb-4 px-1 font-mono text-[11px] uppercase tracking-[0.22em] text-glow lg:sr-only">
                {problemContent.withWebLabel}
              </h3>
            </Reveal>
            <RevealGroup as="ul" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {problemContent.benefits.map((benefit, index) => {
                const featured = index === lastIndex;
                return (
                  <RevealItem as="li" key={benefit.title} className={cn("h-full", featured && "sm:col-span-2")}>
                    <Card tone="tinted" featured={featured} className="h-full p-5 sm:p-7">
                      <div className={cn("flex items-start gap-4", featured ? "sm:items-center sm:gap-6" : "sm:block")}>
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-jeipy/15 text-glow ring-1 ring-glow/25 transition-transform duration-500 ease-(--ease-jeipy) group-hover:scale-105">
                          <CheckIcon />
                        </span>
                        <div className={cn(!featured && "sm:mt-5")}>
                          <p className="text-lg font-semibold tracking-[-0.02em] text-snow">{benefit.title}</p>
                          <p className="mt-1.5 leading-relaxed text-mist">{benefit.text}</p>
                        </div>
                      </div>
                    </Card>
                  </RevealItem>
                );
              })}
            </RevealGroup>
          </div>
        </div>
      </Container>
    </Section>
  );
}
