import { cn } from "@/lib/cn";
import { Reveal } from "@/components/motion/Reveal";
import { Eyebrow } from "./Eyebrow";

type SectionHeadingProps = {
  eyebrow: string;
  index?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
  titleId?: string;
};

export function SectionHeading({
  eyebrow,
  index,
  title,
  description,
  align = "left",
  className,
  titleId,
}: SectionHeadingProps) {
  const centered = align === "center";
  return (
    <div className={cn("max-w-3xl", centered && "mx-auto text-center", className)}>
      <Reveal>
        <Eyebrow index={index}>{eyebrow}</Eyebrow>
      </Reveal>
      <Reveal delay={0.06}>
        <h2
          id={titleId}
          className="mt-5 text-[2rem] leading-[1.08] font-semibold tracking-[-0.035em] text-snow sm:text-5xl lg:text-[3.5rem]"
        >
          {title}
        </h2>
      </Reveal>
      {description && (
        <Reveal delay={0.12}>
          <p className={cn("mt-5 max-w-xl text-base leading-relaxed text-mist sm:text-lg", centered && "mx-auto")}>
            {description}
          </p>
        </Reveal>
      )}
    </div>
  );
}
