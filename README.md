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

## Leads de Jeipy AI y bandeja del equipo

**Flujo:**
1. El cliente completa su solicitud en Jeipy AI.
2. `POST /api/leads` la guarda en **Supabase** (tabla `leads`).
3. Aparece en la bandeja privada **`/admin/leads`**.
4. Si el correo está configurado, se envía un aviso por **Resend**.

El asistente solo muestra "Solicitud recibida" cuando Supabase confirma que guardó el lead. Si el guardado falla, lo dice y ofrece reintentar, y el error queda en los registros del servidor con una referencia (`requestId`). La falta de correo nunca impide guardar el lead.

**Configuración (una vez):**
1. En Supabase: *SQL Editor → New query*, pega `supabase/leads.sql` y ejecútalo. Crea o actualiza las tablas `leads` y `lead_notes` con RLS activo y sin políticas públicas.
2. En Vercel: *Project → Settings → Environment Variables*, agrega las variables de la tabla y vuelve a desplegar.

| Variable | Obligatoria | Para qué |
| --- | --- | --- |
| `SUPABASE_URL` | Sí | URL del proyecto (*Project Settings → API*) |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí | Clave `service_role` (secreta, solo servidor) |
| `ADMIN_PASSWORD` | Sí | Contraseña del equipo para `/admin/leads` (≥ 10 caracteres) |
| `ADMIN_SESSION_SECRET` | Sí | Firma de las sesiones (≥ 32 caracteres: `openssl rand -base64 48`) |
| `JEIPY_LEADS_EMAIL` | No | Correo(s) del equipo para el aviso (separados por coma) |
| `RESEND_API_KEY` | No | API key de Resend para el aviso |
| `LEADS_EMAIL_FROM` | No | Remitente verificado en Resend |
| `JEIPY_ALERTS_EMAIL` | No | Destino de alertas de fallas (por defecto, `JEIPY_LEADS_EMAIL`) |
| `LEADS_ALERT_WEBHOOK_URL` | No | Webhook de Slack/Discord para las mismas alertas |
| `HEALTHCHECK_TOKEN` | No | Token para que un monitor consulte `/api/health` |
| `NEXT_PUBLIC_CONTACT_PHONE` | No | Teléfono para "Llamar ahora" (si falta, el de WhatsApp) |

**Estados:** Nuevo, Contactado, Interesado, Cotización, Solicita llamada, Cerrado - Ganado, Cerrado - No interesado y Cerrado - Sin respuesta.
- Cerrar solo cambia el estado; nunca borra. El servidor no tiene permiso de `DELETE` sobre los leads.
- Cada cambio de estado queda en el historial (`lead_notes`, `kind = 'status'`) junto con las notas del equipo.

**Resiliencia:**
- Supabase se reintenta 3 veces, con espera creciente y tiempo límite de 4 s por intento. El correo al equipo sale en paralelo y sirve de respaldo.
- Si Supabase no responde, el cliente nunca ve "Solicitud recibida":
  - si el correo llegó, el mensaje dice que la solicitud llegó por un canal alternativo;
  - si no, que no pudimos enviarla.

  En ambos casos:
  - sus datos quedan 72 h en el navegador;
  - se reintentan solos (al volver la conexión y cada 60 s);
  - se ofrece WhatsApp o llamada directa.
- Las fallas repetidas (o un lead sin respaldo) generan una alerta por correo y/o webhook.
- `GET /api/health` (sesión del equipo o `Authorization: Bearer $HEALTHCHECK_TOKEN`) comprueba backend, lectura y escritura no destructiva en Supabase. Responde 503 si algo falla, para que un monitor avise.
- Si el asistente no carga o falla, un formulario mínimo de contingencia permite dejar datos, pedir llamada o abrir WhatsApp.

**Bandeja `/admin/leads`:**
- Se entra con la contraseña del equipo. La sesión es una cookie httpOnly firmada que dura 12 horas.
- `src/proxy.ts` bloquea `/admin` sin sesión, y cada página y acción vuelve a verificarla antes de tocar datos.
- Filtros: Activos (todo lo no cerrado, vista por defecto), Solicita llamada, Cotizaciones, Cerrados y Todos. El listado se relee de la base de datos cada 20 s y al volver a la pestaña.
- Clic en una fila: ficha completa en un panel lateral, con enlace a la vista dedicada `/admin/leads/[id]`.
- Acciones de la ficha: llamar, abrir WhatsApp, cambiar estado, notas, marcar como contactado y cerrar como ganado, no interesado o sin respuesta. También muestra el historial de actividad.
- Si la base de datos no está lista, la bandeja explica qué falta.

**Seguridad:** el navegador nunca recibe claves. Los visitantes no pueden leer ni escribir las tablas: RLS está activo sin políticas y se revocaron los permisos de `anon` y `authenticated`. El formulario público solo crea leads validados en el servidor.

Código: `src/server/leads/` (validación, Supabase, correo), `src/server/admin/` (sesión y acceso) y `src/app/admin/` (bandeja).

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
  server/leads/   backend de leads: validación, Supabase, correo (solo servidor)
  server/admin/   sesión y control de acceso de la bandeja /admin/leads
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
