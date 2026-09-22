import { JpMark } from "@/components/brand/JpMark";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main id="contenido" className="relative grid min-h-[100svh] place-items-center overflow-hidden px-5 text-center">
      <div aria-hidden className="pointer-events-none absolute inset-0 jp-grid jp-noise-fade opacity-60" />
      <div className="relative">
        <JpMark tile draw className="mx-auto size-16 text-snow" />
        <p className="mt-8 font-mono text-xs uppercase tracking-[0.2em] text-glow">Error 404</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Esta página no existe.</h1>
        <p className="mt-4 text-mist">Puede que el enlace haya cambiado o que la dirección esté mal escrita.</p>
        <ButtonLink href="/" withArrow className="mt-10">
          Volver al inicio
        </ButtonLink>
      </div>
    </main>
  );
}
