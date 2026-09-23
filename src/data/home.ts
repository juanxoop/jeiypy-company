/** Textos de las secciones de la home. */

export const heroContent = {
  eyebrow: "Tecnología a tu alcance",
  title: { lead: "Lleva tu negocio al", highlight: "mundo digital." },
  description: "Diseñamos experiencias digitales que convierten visitantes en clientes.",
  primaryCta: "Quiero digitalizar mi negocio",
  secondaryCta: { label: "Ver nuestro trabajo", href: "#portafolio" },
  highlights: ["Diseño a medida", "Listo para móvil", "Conectado a WhatsApp"],
} as const;

export const problemContent = {
  eyebrow: "El problema",
  title: "Tu negocio merece mucho más que una página de Instagram.",
  description:
    "Las redes y el voz a voz funcionan, pero no te pertenecen y no cuentan toda tu historia.",
  todayLabel: "Hoy dependes de",
  limitLabel: "Limitado",
  footnote: "Muchos negocios dependen solo de redes sociales y recomendaciones. Es cómodo, pero limita.",
  channels: [
    { id: "instagram", name: "Instagram", note: "El algoritmo decide quién te ve." },
    { id: "facebook", name: "Facebook", note: "Tu información se pierde entre publicaciones." },
    { id: "whatsapp", name: "WhatsApp", note: "Respondes lo mismo una y otra vez." },
    { id: "referrals", name: "Recomendaciones", note: "Te buscan y no encuentran dónde verificarte." },
  ],
  withWebLabel: "Con una presencia profesional ganas",
  benefits: [
    { title: "Credibilidad", text: "Un sitio propio dice que tu negocio va en serio." },
    { title: "Accesibilidad", text: "Tus clientes te encuentran a cualquier hora, desde cualquier lugar." },
    { title: "Confianza", text: "Información clara, ubicación y contacto en un solo lugar." },
    { title: "Vitrina", text: "Tus productos y servicios, presentados como merecen." },
    { title: "Conversión", text: "Cada visita tiene un camino directo para convertirse en cliente." },
  ],
} as const;

export const solutionContent = {
  eyebrow: "La solución Jeipy",
  title: "Diseñamos la presencia digital que tu negocio necesita para crecer.",
  description:
    "Hacemos que un negocio pequeño se vea digitalmente como una gran empresa: con diseño, claridad y un camino directo hacia tus clientes.",
} as const;

export const portfolioContent = {
  eyebrow: "Portafolio",
  title: "Proyectos diseñados para destacar.",
  description:
    "Estamos construyendo nuestro portafolio. Cada proyecto se muestra tal como es: conceptos propios o trabajos para clientes, siempre identificados.",
  nextSlot: {
    title: "Tu negocio puede ser el próximo proyecto.",
    text: "Estamos seleccionando los primeros negocios con los que construiremos este portafolio.",
    cta: "Hablemos",
  },
} as const;

export const pricingContent = {
  eyebrow: "Planes",
  title: "Una inversión clara para cada etapa de tu negocio.",
  description: "Precios orientativos para empezar la conversación. Cada plan se adapta a tu negocio.",
  notes: ["El precio final depende del alcance, funcionalidades e integraciones de cada proyecto."],
} as const;

export const processContent = {
  eyebrow: "Proceso",
  title: "Del primer mensaje a tu web publicada.",
  description: "Un proceso simple y transparente. Sabes qué estamos haciendo en cada momento.",
} as const;

export const finalCtaContent = {
  eyebrow: "Contacto",
  title: "Tu negocio puede ser el siguiente.",
  description: "Construyamos una presencia digital a la altura de lo que quieres lograr.",
  cta: "Hablemos de tu proyecto",
  message: "Hola Jeipy, quiero hablar sobre un proyecto para mi negocio.",
  note: "Respuesta directa, sin compromiso.",
} as const;
