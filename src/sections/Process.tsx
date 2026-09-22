"use client";

import { m, useMotionValueEvent, useReducedMotion, useScroll, useSpring } from "framer-motion";
import { useRef, useState } from "react";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { processContent } from "@/data/home";
import { processSteps } from "@/data/process";
import { cn } from "@/lib/cn";

/**
 * Proceso con interacción ligada al scroll:
 * una línea de progreso recorre los pasos y activa cada uno al alcanzarlo.
 */
export function Process() {
  const listRef = useRef<HTMLOListElement>(null);
  const reduceMotion = useReducedMotion();
  const [reached, setReached] = useState(0);

  const { scrollYProgress } = useScroll({ target: listRef, offset: ["start 70%", "end 60%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    const next = processSteps.filter((_, index) => value >= index / processSteps.length).length;
    setReached((current) => (current === next ? current : next));
  });

  const activeCount = reduceMotion ? processSteps.length : reached;

  return (
    <Section id="proceso" aria-labelledby="proceso-title" className="border-t border-line">
      <Container>
        <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <SectionHeading
              index="05"
              eyebrow={processContent.eyebrow}
              title={processContent.title}
              description={processContent.description}
              titleId="proceso-title"
            />
          </div>

          <ol ref={listRef} className="relative">
            {/* Riel y progreso */}
            <div aria-hidden className="absolute top-2 bottom-2 left-[1.375rem] w-px bg-line sm:left-7">
              <m.div
                className="h-full w-full origin-top bg-[linear-gradient(to_bottom,#54a8ff,#1769ff)] shadow-[0_0_12px_rgb(84_168_255/0.6)]"
                style={{ scaleY: reduceMotion ? 1 : progress }}
              />
            </div>

            {processSteps.map((step, index) => {
              const active = index < activeCount;
              return (
                <li key={step.number} className="relative flex gap-6 pb-14 last:pb-0 sm:gap-8 sm:pb-20">
                  <span
                    className={cn(
                      "relative z-10 grid size-11 shrink-0 place-items-center rounded-full border bg-ink font-mono text-xs transition-[color,border-color,box-shadow] duration-500 ease-(--ease-jeipy) sm:size-14 sm:text-sm",
                      active
                        ? "border-glow/50 text-glow shadow-[0_0_0_4px_rgb(5_7_11),0_0_28px_-4px_rgb(23_105_255/0.7)]"
                        : "border-line-strong text-mist shadow-[0_0_0_4px_rgb(5_7_11)]",
                    )}
                  >
                    {step.number}
                  </span>
                  <div className="pt-1.5 sm:pt-3">
                    <h3
                      className={cn(
                        "text-2xl font-semibold tracking-[-0.03em] transition-colors duration-500 sm:text-3xl",
                        active ? "text-snow" : "text-snow/55",
                      )}
                    >
                      {step.title}
                    </h3>
                    <p className="mt-3 max-w-md leading-relaxed text-mist sm:text-lg">{step.description}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </Container>
    </Section>
  );
}
