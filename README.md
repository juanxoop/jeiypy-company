# Jeipy Company — Sitio web

**Tecnología a tu alcance.** Landing principal de Jeipy Company.

Stack: Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Framer Motion (vía `LazyMotion`) · Geist.

## Comandos

```bash
npm install
npm run dev        # desarrollo en http://localhost:3000
npm run build      # build de producción (la home es estática; /api/leads corre en el servidor)
npm run start      # servir el build
npm run lint
npm run typecheck
```

Copia `.env.example` a `.env.local` y define `NEXT_PUBLIC_SITE_URL` con el dominio real
(se usa en metadata, Open Graph, sitemap y robots). Las variables de los leads se explican abajo.

## Qué editar y dónde

| Quiero cambiar… | Archivo |
| --- | --- |
| Número de WhatsApp | variable `NEXT_PUBLIC_WHATSAPP_NUMBER` (ver `.env.example`) |
| Mensaje de WhatsApp por defecto | `src/config/site.ts` → `contactConfig` |
| Redes sociales (Instagram, TikTok, WhatsApp) | `src/config/site.ts` → `socialLinks` |
| Navegación, SEO (title, description, keywords) | `src/config/site.ts` |
| Textos de cada sección de la home | `src/data/home.ts` |
| Servicios | `src/data/services.ts` |
| Planes y precios | `src/data/plans.ts` |
| Pasos del proceso | `src/data/process.ts` |
| Proyectos del portafolio | `src/data/projects.ts` |
| Colores, curvas y animaciones | `src/app/globals.css` (`@theme`) |
| Isotipo JP (oficial) | `src/assets/brand/source/jp-isotipo-original.png` + `node scripts/generate-brand-assets.mjs` |

**WhatsApp:** mientras `NEXT_PUBLIC_WHATSAPP_NUMBER` esté vacío, todos los CTA llevan a `#contacto`.
Al definirlo (formato internacional sin `+`, p. ej. `57` + 10 dígitos) abren WhatsApp con un
mensaje prellenado según el botón (cada plan envía su propio mensaje).

**Redes:** las que no tienen `href` se muestran como "Pronto" en el footer.

**Portafolio:** cada proyecto tiene `kind: "concept" | "client"`. Los conceptos se etiquetan
siempre como "Concepto / Demo". Para mostrar una captura real, agrega `image` (archivo en
`public/projects/`); si no hay `href`, el botón indica "Demo en preparación".

**Isotipo oficial:** el archivo fuente vive en `src/assets/brand/source/jp-isotipo-original.png`.
`node scripts/generate-brand-assets.mjs` genera, sin alterar el símbolo (solo recorta el margen
transparente y redimensiona), todos los derivados: `src/assets/brand/jp-isotipo.png` (usado por
`<JpMark />` en navbar, hero, footer, marcas de agua y 404), el favicon `src/app/icon.png`,
`src/app/apple-icon.png`, los iconos del manifest y la silueta `public/brand/jp-mask.png`
del destello metálico. La imagen Open Graph también usa el isotipo.

## Leads de Jeipy AI

Cuando un visitante pide cotización o una llamada, Jeipy AI pide nombre, teléfono, correo
(opcional) y nombre del negocio, muestra el resumen y pide autorización. Después el navegador
envía el lead a `POST /api/leads`, y el servidor:

1. valida y sanea los datos (`src/server/leads/validate.ts`);
2. genera el resumen comercial y la prioridad interna: Nuevo, Interesado, Cotización o Solicita llamada (`src/features/leads/report.ts`);
3. lo guarda en **Supabase** (`src/server/leads/store.ts`, tabla de `supabase/leads.sql`);
4. avisa al equipo por correo con **Resend** (`src/server/leads/notify.ts` + `email.ts`).

El asistente solo dice "Solicitud recibida" si el lead quedó guardado o notificado. Si no, lo dice
y ofrece reintentar. Las claves solo existen en el servidor.

| Variable | Para qué |
| --- | --- |
| `JEIPY_LEADS_EMAIL` | Correo(s) del equipo que reciben los leads (separados por coma) |
| `RESEND_API_KEY` | API key de Resend |
| `LEADS_EMAIL_FROM` | Remitente verificado en Resend (opcional; por defecto `onboarding@resend.dev`) |
| `SUPABASE_URL` | URL del proyecto de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave `service_role` de Supabase (secreta) |
| `SUPABASE_LEADS_TABLE` | Nombre de la tabla (opcional, por defecto `leads`) |
| `LEADS_STORE=file` | Solo en local: guarda en `.data/leads.jsonl` (automático en `npm run dev`) |

`GET /api/leads` indica qué hay conectado (`storage`, `notifications`) sin mostrar ningún valor.
Para cambiar de proveedor basta con implementar `LeadStore` o `LeadNotifier`.

## Arquitectura

```
src/
  app/            layout, página, globals.css, SEO (sitemap, robots, manifest, OG, iconos)
  config/         configuración de marca, contacto, redes, navegación
  data/           contenido editable (textos, servicios, planes, proceso, proyectos)
  sections/       secciones de la home (Hero, Problem, Services, Portfolio, Pricing, Process, FinalCta)
  components/
    brand/        isotipo JP (<JpMark />), logo y símbolo del hero
    layout/       Navbar, MobileMenu, Footer
    motion/       MotionProvider y Reveal
    ui/           primitivas reutilizables (Button, Card, SectionHeading, PlanCard, ProjectCard…)
    icons/        iconografía lineal propia
    visuals/      fondos y composiciones ilustradas
  features/       Jeipy AI (assistant/) y contrato y resumen de leads (leads/)
  server/leads/   backend de leads: validación, almacenamiento, correo (solo servidor)
  lib/            utilidades (contacto/WhatsApp, hooks, tokens de movimiento)
  assets/brand/   isotipo oficial (fuente y versión optimizada)
scripts/          generación de recursos de marca
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
