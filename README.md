# Jeipy Company — Sitio web

**Tecnología a tu alcance.** Landing principal de Jeipy Company.

Stack: Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Framer Motion (vía `LazyMotion`) · Geist.

## Comandos

```bash
npm install
npm run dev        # desarrollo en http://localhost:3000
npm run build      # build de producción (todo se prerenderiza como estático)
npm run start      # servir el build
npm run lint
npm run typecheck
```

Copia `.env.example` a `.env.local` y define `NEXT_PUBLIC_SITE_URL` con el dominio real
(se usa en metadata, Open Graph, sitemap y robots).

## Qué editar y dónde

| Quiero cambiar… | Archivo |
| --- | --- |
| Número de WhatsApp, mensaje por defecto | `src/config/site.ts` → `contactConfig` |
| Redes sociales (Instagram, TikTok, WhatsApp) | `src/config/site.ts` → `socialLinks` |
| Navegación, SEO (title, description, keywords) | `src/config/site.ts` |
| Textos de cada sección de la home | `src/data/home.ts` |
| Servicios | `src/data/services.ts` |
| Planes y precios | `src/data/plans.ts` |
| Pasos del proceso | `src/data/process.ts` |
| Proyectos del portafolio | `src/data/projects.ts` |
| Colores, curvas y animaciones | `src/app/globals.css` (`@theme`) |
| Símbolo JP | `src/components/brand/mark-paths.ts` y `src/app/icon.svg` |

**WhatsApp:** mientras `whatsappNumber` esté vacío, todos los CTA llevan a `#contacto`.
Al definirlo (formato internacional sin `+`, p. ej. `57` + 10 dígitos) abren WhatsApp con un
mensaje prellenado según el botón (cada plan envía su propio mensaje).

**Redes:** las que no tienen `href` se muestran como "Pronto" en el footer.

**Portafolio:** cada proyecto tiene `kind: "concept" | "client"`. Los conceptos se etiquetan
siempre como "Concepto / Demo". Para mostrar una captura real, agrega `image` (archivo en
`public/projects/`); si no hay `href`, el botón indica "Demo en preparación".

**Logo oficial:** cuando exista el SVG definitivo, reemplaza los trazos de `mark-paths.ts`
(header, footer, hero, loading, apple-icon y OG image lo usan) y `src/app/icon.svg` (favicon).

## Arquitectura

```
src/
  app/            layout, página, globals.css, SEO (sitemap, robots, manifest, OG, iconos)
  config/         configuración de marca, contacto, redes, navegación
  data/           contenido editable (textos, servicios, planes, proceso, proyectos)
  sections/       secciones de la home (Hero, Problem, Services, Portfolio, Pricing, Process, FinalCta)
  components/
    brand/        símbolo JP y logo
    layout/       Navbar, MobileMenu, Footer
    motion/       MotionProvider y Reveal
    ui/           primitivas reutilizables (Button, Card, SectionHeading, PlanCard, ProjectCard…)
    icons/        iconografía lineal propia
    visuals/      fondos y composiciones ilustradas
  lib/            utilidades (contacto/WhatsApp, hooks, tokens de movimiento)
```

## Sistema de microanimación

| Patrón | Implementación |
| --- | --- |
| Jeipy Reveal | `<Reveal>` / `<RevealGroup>` (Framer Motion) · `.jp-enter` (CSS) para el hero |
| Jeipy Glow | utilidad `.jp-glow` |
| Jeipy Arrow | `<ArrowIcon>` (`.jp-arrow`) dentro de un `.group` |
| Jeipy Card Lift | utilidad `.jp-lift` (incluida en `<Card>`) |
| Jeipy Pulse | `<PulseDot>` |

Todo respeta `prefers-reduced-motion` (CSS global + `MotionConfig reducedMotion="user"`).
El hero anima solo con CSS para que el titular se pinte sin esperar a la hidratación (mejor LCP).
