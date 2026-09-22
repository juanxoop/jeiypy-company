export type ProcessStep = {
  number: string;
  title: string;
  description: string;
};

export const processSteps: ProcessStep[] = [
  {
    number: "01",
    title: "Descubrimos",
    description: "Entendemos el negocio, sus clientes y objetivos.",
  },
  {
    number: "02",
    title: "Diseñamos",
    description: "Construimos una propuesta visual adaptada a su identidad.",
  },
  {
    number: "03",
    title: "Desarrollamos",
    description: "Convertimos el diseño en una experiencia web rápida y funcional.",
  },
  {
    number: "04",
    title: "Lanzamos",
    description: "Publicamos, revisamos y dejamos el proyecto listo para recibir clientes.",
  },
];
