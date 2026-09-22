import Image from "next/image";
import { ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { BlackroomPreview } from "@/components/visuals/BlackroomPreview";
import { projectKindLabel, type Project } from "@/data/projects";

const previews = {
  blackroom: BlackroomPreview,
} as const;

export function ProjectCard({ project }: { project: Project }) {
  const Preview = project.preview ? previews[project.preview] : null;

  return (
    <Card className="overflow-hidden p-2 sm:p-3">
      <article className="grid gap-2 lg:grid-cols-[1.35fr_1fr] lg:gap-3">
        <div className="relative aspect-[16/10] overflow-hidden rounded-[1.1rem] border border-line bg-ink">
          {project.image ? (
            <Image
              src={project.image.src}
              alt={project.image.alt}
              width={project.image.width}
              height={project.image.height}
              sizes="(min-width: 1024px) 700px, 100vw"
              className="h-full w-full object-cover transition-transform duration-700 ease-(--ease-jeipy) group-hover:scale-[1.02]"
            />
          ) : Preview ? (
            <div className="h-full w-full transition-transform duration-700 ease-(--ease-jeipy) group-hover:scale-[1.02]">
              <Preview />
            </div>
          ) : null}
        </div>

        <div className="flex flex-col p-5 sm:p-6 lg:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="accent">{projectKindLabel[project.kind]}</Badge>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-mist">{project.sector}</p>
          </div>
          <h3 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-snow sm:text-4xl">{project.name}</h3>
          <p className="mt-4 leading-relaxed text-mist">{project.description}</p>

          <ul className="mt-6 flex flex-wrap gap-2" aria-label="Tecnologías">
            {project.technologies.map((tech) => (
              <li key={tech} className="rounded-md border border-line bg-white/[0.02] px-2.5 py-1 font-mono text-[11px] text-mist">
                {tech}
              </li>
            ))}
          </ul>

          <div className="mt-8 lg:mt-auto lg:pt-8">
            {project.href ? (
              <ButtonLink href={project.href} variant="secondary" withArrow aria-label={`Ver proyecto ${project.name}`}>
                Ver proyecto
              </ButtonLink>
            ) : (
              <span className="inline-flex h-11 items-center gap-2.5 rounded-full border border-dashed border-line-strong px-5 text-sm text-mist">
                <span className="size-1.5 rounded-full bg-mist/60" aria-hidden />
                Demo en preparación
              </span>
            )}
          </div>
        </div>
      </article>
    </Card>
  );
}
