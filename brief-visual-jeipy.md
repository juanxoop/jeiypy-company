# Jeipy Company — Brief visual y funcional

Estado actual de la landing principal. Sirve como referencia para recrear o extender la dirección visual sin perder la identidad.

## 1. Marca y sensación general

- **Marca:** Jeipy Company. Eslogan: **"Tecnología a tu alcance"**.
- **Qué vende:** presencia digital profesional para pequeños negocios, emprendedores y microempresas en Colombia. La idea central es que un negocio pequeño se vea digitalmente como una gran empresa.
- **Sensación:** dark-tech premium. Sobria, tecnológica, limpia, precisa y en calma, con movimiento sutil. Debe transmitir "esta empresa sabe lo que hace".
- **Regla visual:** 90 % sobriedad y 10 % energía. El negro domina y el azul es solo acento.
- **Evitar:** estética gamer, neón, glow excesivo, efectos 3D exagerados, animaciones largas o constantes y exceso de azul.
- **Honestidad:** nada de testimonios, cifras, premios ni clientes inventados. Los proyectos conceptuales siempre se etiquetan como "Concepto / Demo".

## 2. Paleta

| Rol | Color |
| --- | --- |
| Fondo principal (negro) | `#05070B` |
| Azul noche (superficies profundas, chips flotantes) | `#0A1224` |
| Superficie de cards | `#0A0E16` |
| Superficie elevada / placas | `#0E1420` |
| Azul profundo (degradados, luz ambiental) | `#0D47C7` |
| **Azul Jeipy** (CTA principal, elementos activos) | `#1769FF` |
| Azul luminoso (hover, focus, acentos de texto, indicadores) | `#54A8FF` |
| Blanco (texto principal) | `#F5F7FA` |
| Gris secundario (texto de apoyo) | `#8994A7` |
| Bordes | blanco al 8 % (sutil) y al 14 % (marcado) |

Los azules brillantes aparecen solo en CTA, estados hover/focus/activo, indicadores, detalles clave y algunas animaciones. Los fondos llevan luces ambientales azules muy difusas, nunca planos de azul.

## 3. Tipografía

- **Geist Sans** para todo el texto. Títulos en semibold, con interlineado apretado (~1.0–1.1) y tracking negativo marcado (−0.03 a −0.05 em). Tienen mucha presencia y aire alrededor.
- **Geist Mono** para detalles técnicos: etiquetas de sección, numeraciones, badges, "COP", labels como "INCLUYE". Siempre en mayúsculas pequeñas con tracking amplio (0.18–0.32 em).
- **Tamaños orientativos:** H1 del hero de 42 px (móvil) a 100 px (desktop). H2 de sección de 32 px a 56 px. El CTA final es el titular más grande de la página (hasta 120 px).
- **Etiqueta de sección:** `[01] —— EL PROBLEMA`, con el número en azul luminoso, una línea corta y el texto en gris mono.

## 4. Símbolo JP (isotipo oficial)

- Isotipo metálico plateado: una "J" y una "P" geométricas con esquinas biseladas, un pequeño cuadrado plateado arriba a la izquierda y un **cuadrado azul brillante** abajo a la derecha como único acento de color. Nunca se redibuja, recolorea ni deforma.
- **Navbar:** el símbolo solo (36 px) junto al wordmark "**Jeipy** Company" ("Company" en gris). Al pasar el cursor lo recorre un destello metálico.
- **Hero:** es el punto focal centrado (80–96 px). Entra con fade, subida corta y desenfoque que se aclara, seguido de un destello metálico único. Lo rodean dos anillos finos que pulsan hacia afuera muy lentamente, sobre un halo azul difuso.
- **Favicon e iconos de app:** el símbolo sobre una placa cuadrada azul-negra con esquinas redondeadas.
- **Marcas de agua:** versiones gigantes al 4–5 % de opacidad en el CTA final, el footer y la card "próximo proyecto" del portafolio.
- **Página 404:** el símbolo en su placa redondeada.

## 5. Estructura de la página (en orden)

1. Navbar fija
2. Hero (`#inicio`)
3. [01] Problema
4. [02] Servicios, "La solución Jeipy"
5. [03] Portafolio
6. [04] Planes
7. [05] Proceso
8. [06] CTA final (`#contacto`)
9. Footer

Todas las secciones de contenido tienen mucho aire vertical (~96–144 px) y se separan con líneas horizontales de 1 px muy sutiles.

## 6. Navbar

- Fija arriba, 72 px de alto. En la parte superior es transparente. Al hacer scroll pasa a negro al 75 % con blur fuerte y un borde inferior sutil.
- **Izquierda:** isotipo y wordmark. **Centro:** Servicios · Portafolio · Planes · Proceso · Contacto, en gris que pasa a blanco al hover. La sección activa se marca en blanco con un punto azul debajo.
- **Derecha:** botón azul sólido "Empezar proyecto →".
- **Móvil:** un botón hamburguesa de dos líneas (la inferior más corta) que se convierte en X. Abre un panel a pantalla completa, casi opaco, con enlaces grandes numerados (`01 Servicios`…), separadores finos y flechas. Los enlaces entran en cascada y abajo va el CTA a ancho completo. El fondo queda bloqueado y el menú se cierra con Escape.

## 7. Hero

- **Composición centrada:**
  1. Isotipo con anillos y halo.
  2. Eyebrow en mono azul entre dos líneas cortas: `TECNOLOGÍA A TU ALCANCE`.
  3. H1: **"Lleva tu negocio al / mundo digital."**, con "mundo digital." en degradado de blanco a azul luminoso y azul Jeipy.
  4. Subtítulo gris: "Diseñamos experiencias digitales que convierten visitantes en clientes."
  5. CTA principal: pastilla azul con degradado vertical, halo azul suave y un destello de luz que la cruza al hover, con el texto "Quiero digitalizar mi negocio →". CTA secundario como enlace de texto con flecha: "Ver nuestro trabajo →".
  6. Tres checks azules pequeños: Diseño a medida · Listo para móvil · Conectado a WhatsApp.
- **Fondo:** cuadrícula tenue de 64 px que se desvanece hacia los bordes, luz ambiental azul profunda que se desplaza muy lentamente, un foco azul detrás del titular y partículas azules mínimas que titilan (solo desde tablet). En la base, una línea de 1 px con un destello que la recorre.
- **Escenario de producto** debajo del texto:
  - Ilustración de un navegador (`tunegocio.com`) con una web genérica de "Tu negocio": titular "Lo que ofreces, presentado como mereces.", botón azul "Escríbenos" con WhatsApp y tiles de producto con degradados azules.
  - Un teléfono superpuesto a la derecha que muestra la versión móvil (desde tablet).
  - Chips flotantes oscuros: "WhatsApp conectado", con un punto que pulsa, y "Listo para móvil".
  - Al cargar, el escenario entra con una leve inclinación en perspectiva que se endereza.
- **Carga:** todo el hero entra en cascada con fade y una subida corta.

## 8. Sistema de cards

- **Base:** fondo `#0A0E16`, borde blanco al 8 %, radio grande (~24 px), mucho padding (28–32 px) y un brillo interior de 1 px arriba.
- **Hover:** sube 3 px, el borde pasa a azul tenue, aparece una sombra azul difusa y un foco de luz radial sigue al cursor dentro de la card. Todo es suave, sin 3D.
- **Variante "tinted":** velo azul en diagonal (más intenso arriba a la izquierda) sobre el oscuro, con borde azul tenue. Se usa en beneficios y servicios.
- **Variante "featured":** borde con degradado azul (luminoso en las esquinas, casi invisible en los lados). Se usa en el plan destacado y en el beneficio clave.

## 9. Botones

- **Primario:** pastilla azul Jeipy con texto blanco y brillo interior. Al hover se ilumina y proyecta un halo azul. La versión "glow", reservada al CTA principal del hero, añade un degradado, un halo permanente suave y un destello que la cruza.
- **Secundario:** pastilla con contorno blanco al 14 % y fondo casi transparente. Al hover, el borde pasa a azul y aparece un halo suave.
- **Ghost / enlace:** texto blanco atenuado con flecha.
- Todas las flechas se desplazan 4 px a la derecha al hover. Al presionar, el botón se reduce al 98 %. El foco se ve con un contorno azul luminoso.
- Alturas: 44 px normal y 52–56 px grande. A ancho completo en móvil.

## 10. Microanimaciones (patrones con nombre)

1. **Jeipy Reveal:** fade con una subida de ~18 px al entrar en pantalla, con curva suave y en cascada en listas y grids.
2. **Jeipy Glow:** halo azul discreto, solo al interactuar.
3. **Jeipy Arrow:** la flecha avanza 4 px al hover.
4. **Jeipy Card Lift:** las cards suben 3 px.
5. **Jeipy Pulse:** los puntos indicadores emiten un anillo azul que se desvanece cada ~3 s.

Extras sutiles: los iconos de servicio animan una sola pieza al hover, la luz ambiental se desplaza en ciclos de ~40 s y los destellos recorren las líneas técnicas. Todo se desactiva con "reducir movimiento" y nada se mueve de forma protagonista.

## 11. Responsive

- **Mobile-first y sin scroll horizontal**, probado de 320 a 1440 px.
- Los layouts se reorganizan, no solo se reducen:
  - Hero: CTAs apilados a ancho completo. El teléfono y un chip se ocultan en móvil.
  - Problema: pasa de dos columnas a apiladas.
  - Servicios: de 3 a 2 a 1 columna.
  - Planes: de 3 columnas en desktop a cards apiladas centradas (máx. ~576 px).
  - Proceso: el titular fijo pasa a ir arriba.
- Los tamaños de títulos escalan por breakpoint, los botones mantienen una buena área táctil y la navbar pasa a menú hamburguesa por debajo de 1024 px.

## 12. [01] Problema

- **H2:** "Tu negocio merece mucho más que una página de Instagram." Subtítulo: "Las redes y el voz a voz funcionan, pero no te pertenecen y no cuentan toda tu historia."
- **Izquierda:** panel con velo azul y un halo en la esquina, titulado `HOY DEPENDES DE`. Contiene cuatro filas tipo vidrio: Instagram, Facebook, WhatsApp y Recomendaciones. Cada fila lleva un icono lineal, una nota breve ("El algoritmo decide quién te ve"…) y una etiqueta mono `LIMITADO`. Al pie: "Muchos negocios dependen solo de redes sociales y recomendaciones. Es cómodo, pero limita."
- **Derecha:** grid 2×2 de cards tinted con un check azul en una placa (Credibilidad, Accesibilidad, Confianza, Vitrina). Debajo, **Conversión** a ancho completo con borde en degradado, como beneficio clave.

## 13. [02] Servicios

- **H2 centrado:** "Diseñamos la presencia digital que tu negocio necesita para crecer." Subtítulo sobre verse como una gran empresa.
- **Grid de 6 cards tinted**, cada una con una placa de icono azul rellena (azul al 15 % con anillo) y un número mono tenue arriba a la derecha. Al hover, la placa se vuelve azul sólido con icono blanco y la pieza del icono se anima.
- **Servicios:**
  - Diseño Web
  - Landing Pages
  - Catálogos Digitales
  - Integración con WhatsApp
  - Optimización
  - Presencia Digital
- Cada servicio lleva una línea de descripción.

## 14. [03] Portafolio

- **H2:** "Proyectos diseñados para destacar." Aclara que el portafolio está en construcción y que todo se identifica honestamente.
- **Card grande de proyecto**, con vista previa a la izquierda y datos a la derecha:
  - Proyecto: **Blackroom Barber**, con el badge azul `Concepto / Demo`, el sector `BARBERÍA`, la descripción "Concepto digital para una barbería moderna y premium." y tecnologías en chips mono.
  - Botón con borde punteado: "Demo en preparación".
  - La vista previa es un mockup propio muy oscuro con toque cálido: "BLACKROOM · BARBER STUDIO · El corte que te define."
- **Card punteada:** "Tu negocio puede ser el próximo proyecto.", con botón "Hablemos →" y marca de agua JP.

## 15. [04] Planes

- **H2 centrado:** "Una inversión clara para cada etapa de tu negocio." Subtítulo: precios orientativos.
- **Bajo el encabezado:** "¿No sabes cuál elegir? Jeipy AI puede recomendarte la opción más adecuada según tu negocio." Abre el asistente con "¿Qué plan me conviene?".
- **Tres cards del mismo ancho.** En desktop sus bloques quedan alineados fila por fila (subgrid) y los CTA abajo.
- **Orden de cada card:**
  1. Icono del enfoque + nombre + enfoque en mono (Presencia / Captación / Automatización).
  2. "Desde" y precio grande con "COP" en mono.
  3. Frase de valor (y en Premium, la aclaración "No es una web más grande…").
  4. Cómo trabaja, en pasos cortos: Básico reúne (Tu web + WhatsApp + Ubicación), Esencial recorre (Visita → Catálogo → Contacto → Oportunidad) y Premium cicla (Capta → Organiza → Da seguimiento → Automatiza).
  5. `IDEAL PARA` en chips.
  6. `INCLUYE`: 6 puntos visibles; el resto en "Ver todo lo que incluye (+N)".
  7. `RESULTADO ESPERADO`: 3 beneficios con icono.
  8. Jeipy AI en versión compacta (el detalle está en la sección Jeipy AI).
  9. CTA "Quiero este plan".

| | Básico | Esencial | Premium |
| --- | --- | --- | --- |
| Precio | Desde $999.900 COP | Desde $2.399.000 COP | Desde $4.699.000 COP |
| Frase de valor | Presencia digital profesional. | Una web pensada para captar oportunidades (Jeipy AI Lite como complemento opcional). | Una solución comercial automatizada (no "una página más cara"). |
| Resultado esperado | Más confianza · Te encuentran más fácil · Contacto directo | Más oportunidades · Clientes mejor informados · Contactos organizados | Menos procesos manuales · Seguimiento de cada oportunidad · Atención que escala |
| Incluye | Página informativa, responsive, info del negocio, WhatsApp, ubicación y contacto, estructura visual profesional, optimización básica de rendimiento. | Sitio más completo, varias secciones, catálogo, formularios de contacto o cotización, SEO básico y Analytics, WhatsApp, velocidad y experiencia optimizadas, responsive. | Diseño avanzado, desarrollo personalizado, catálogo avanzado, formularios y flujos a medida, integraciones, SEO básico y Analytics, optimización avanzada, soporte y acompañamiento, actualizaciones, responsive. |
| Jeipy AI | Fila discreta: "Sin Jeipy AI. Ideal para comenzar…". | Recuadro punteado "+ Jeipy AI Lite · Opcional" con costo y enlace. | Bloque compacto "Compatible con Jeipy AI Pro" con Atiende · Capta · Conecta (detalle en el punto 16). |
| Destaque | Neutro. | Borde en degradado azul, nombre en azul, badge discreto "Recomendado" con punto. | Icono en degradado, trama tecnológica sutil y bloque de IA más tecnológico. |
| CTA | "Quiero este plan" (contorno) | "Quiero este plan" (azul sólido) | "Quiero este plan" (contorno con tinte azul) |

- **Notas bajo los planes:**
  - Con icono de información: "El precio final depende del alcance, funcionalidades e integraciones de cada proyecto."
  - Con icono de destello: "Jeipy AI puede requerir configuración inicial y una mensualidad según uso, complejidad e integraciones."
- Cada CTA abre WhatsApp con un mensaje propio del plan. Mientras no haya número configurado, lleva a `#contacto`.

## 16. Cómo se presenta Jeipy AI

- **Posicionamiento:** un **asistente inteligente para tu negocio** y una ventaja comercial real. Nunca "chatbot". Responde dudas, orienta visitantes, capta oportunidades, reduce trabajo repetitivo y ayuda a convertir.
- **Icono:** un destello de dos estrellas. La pequeña gira levemente al hover.
- **En Esencial (mejora opcional, secundaria):** recuadro con borde punteado y "+", con el texto "Responde preguntas frecuentes, orienta visitantes y convierte consultas en contactos." y "Se cotiza aparte del precio base."
- **En Premium (identidad fuerte):**
  - Panel azul-noche con borde en degradado, cuadrícula tenue, halo azul en la esquina y una línea de luz que recorre el borde superior.
  - Cabecera: placa con el destello, "Jeipy AI" y, en azul, "Asistente inteligente para tu negocio".
  - Frase de valor: "Responde dudas, orienta clientes y captura oportunidades mientras tú atiendes tu negocio."
  - Capacidades agrupadas por resultado, con la etiqueta en mono azul:
    - **ATIENDE:** Preguntas frecuentes · Productos y servicios · Recomendaciones
    - **CAPTA:** Captación de leads · Formularios conversacionales · Clasificación de clientes
    - **CONECTA:** Paso a WhatsApp · Reservas o agendamiento · Automatizaciones a medida
  - Cierre: pastilla `SEGÚN ALCANCE` y "Automatizaciones avanzadas e integraciones externas según el alcance del proyecto."
- **Sin mensualidad concreta publicada:** solo la nota de posible configuración inicial y mensualidad.

## 17. [05] Proceso

- **H2:** "Del primer mensaje a tu web publicada." En desktop el titular queda fijo a la izquierda mientras los pasos avanzan a la derecha.
- **Cuatro pasos sobre un riel vertical:**
  - `01` Descubrimos: Entendemos el negocio, sus clientes y objetivos.
  - `02` Diseñamos: Construimos una propuesta visual adaptada a su identidad.
  - `03` Desarrollamos: Convertimos el diseño en una experiencia web rápida y funcional.
  - `04` Lanzamos: Publicamos, revisamos y dejamos el proyecto listo para recibir clientes.
- **Interacción ligada al scroll:** una línea azul con degradado rellena el riel a medida que se avanza. Cada número circular se "enciende" con borde y halo azul al alcanzarlo, y su título pasa de blanco atenuado a blanco pleno.

## 18. [06] CTA final

- La sección más impactante, con mucho espacio negativo y todo centrado.
- Etiqueta `[06] CONTACTO`. Titular enorme: **"Tu negocio puede ser el siguiente."**
- Subtítulo: "Construyamos una presencia digital a la altura de lo que quieres lograr."
- Botón azul grande: "Hablemos de tu proyecto →". Debajo, un punto que pulsa con "Respuesta directa, sin compromiso."
- **Fondo:** gran resplandor azul que sube desde abajo y se desplaza lentamente, cuadrícula que se desvanece desde la base y el isotipo gigante como marca de agua al 4 %.

## 19. Footer

- Minimalista, con un borde superior sutil.
- **Columnas:**
  - Isotipo, wordmark y "Tecnología a tu alcance".
  - `NAVEGACIÓN`: Inicio, Servicios, Portafolio, Planes, Contacto.
  - `REDES`: Instagram, TikTok y WhatsApp con iconos lineales, atenuados y marcados "PRONTO" hasta tener las cuentas.
- **Barra inferior:** "© {año actual} Jeipy Company. Todos los derechos reservados." y, en mono, `HECHO EN COLOMBIA`.
- Isotipo gigante como marca de agua en la esquina inferior derecha.

## 20. Funcional (resumen)

- Landing de una sola página con anclas y scroll suave. La navbar marca la sección activa.
- **Contacto centralizado:** todos los CTA abren WhatsApp con un mensaje prellenado según el contexto (hero, plan elegido, portafolio, CTA final). Sin número configurado, llevan a `#contacto`. No hay números ni redes inventados.
- **Accesibilidad:**
  - HTML semántico.
  - Enlace "Saltar al contenido".
  - Foco visible en azul.
  - Menú móvil con gestión de foco.
  - Contraste AA.
  - Respeto a "reducir movimiento".
- **SEO:** título "Jeipy Company | Diseño web para negocios", meta descripción, Open Graph y Twitter con imagen de marca, sitemap, robots, manifest y datos estructurados.
- **Rendimiento:** página estática, animaciones del hero en CSS puro, imágenes optimizadas y JavaScript de animación mínimo.
