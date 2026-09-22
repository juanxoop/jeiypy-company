/**
 * Portafolio.
 * `kind` distingue proyectos conceptuales de trabajos reales para clientes:
 * nunca presentar un concepto como cliente.
 */
export type ProjectKind = "concept" | "client";

export type Project = {
  slug: string;
  name: string;
  sector: string;
  description: string;
  kind: ProjectKind;
  technologies: string[];
  /** Imagen de portada en /public. Si no existe se muestra la vista previa conceptual. */
  image?: { src: string; alt: string; width: number; height: number };
  /** Enlace a la demo o caso de estudio. Sin enlace, el botón indica que está en preparación. */
  href?: string;
  preview?: "blackroom";
};

export const projectKindLabel: Record<ProjectKind, string> = {
  concept: "Concepto / Demo",
  client: "Cliente",
};

export const projects: Project[] = [
  {
    slug: "blackroom-barber",
    name: "Blackroom Barber",
    sector: "Barbería",
    description: "Concepto digital para una barbería moderna y premium.",
    kind: "concept",
    technologies: ["Next.js", "TypeScript", "Tailwind CSS", "Framer Motion"],
    preview: "blackroom",
  },
];
