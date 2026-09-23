import Image from "next/image";
import isotipo from "@/assets/brand/jp-isotipo.png";
import { cn } from "@/lib/cn";

/** Silueta ligera del isotipo, generada por el script de marca, usada como máscara del destello. */
const MASK_URL = "url(/brand/jp-mask.png)";

type JpMarkProps = {
  className?: string;
  /** Muestra el isotipo sobre su placa oscura tipo app icon. */
  tile?: boolean;
  /** Entrada suave al cargar (hero, 404). */
  reveal?: boolean;
  /** Destello metálico que recorre el símbolo: al cargar con `reveal`, o al hacer hover en su `.group`. */
  shine?: boolean;
  /** Precarga la imagen: solo para el símbolo visible al cargar la página. */
  preload?: boolean;
  /** Texto alternativo. Sin título el símbolo se trata como decorativo. */
  title?: string;
  /** Ancho de render para elegir la resolución adecuada (atributo `sizes`). */
  sizes?: string;
};

/**
 * Isotipo oficial de Jeipy. Única fuente del símbolo en todo el sitio:
 * para actualizarlo, reemplaza el archivo fuente y ejecuta `node scripts/generate-brand-assets.mjs`.
 */
export function JpMark({ className, tile = false, reveal = false, shine = false, preload = false, title, sizes = "64px" }: JpMarkProps) {
  const renderMark = (position: string) => (
    <span className={cn(position, reveal && "jp-mark-reveal")}>
      <Image
        src={isotipo}
        alt={title ?? ""}
        sizes={sizes}
        preload={preload}
        draggable={false}
        className="h-full w-full object-contain select-none"
      />
      {shine && (
        <span
          aria-hidden
          className={cn("jp-mark-shine", reveal ? "jp-mark-shine-once" : "jp-mark-shine-hover")}
          style={{ maskImage: MASK_URL, WebkitMaskImage: MASK_URL }}
        />
      )}
    </span>
  );

  if (!tile) {
    return <span className={cn("relative inline-block shrink-0", className)}>{renderMark("relative block h-full w-full")}</span>;
  }

  return (
    <span
      className={cn(
        "relative inline-block shrink-0 rounded-[28%] border border-white/10",
        "bg-[radial-gradient(circle_at_50%_25%,#0f1b33,#0a0e16_75%)] shadow-[inset_0_1px_0_rgb(245_247_250/0.08)]",
        className,
      )}
    >
      {renderMark("absolute inset-[15%] block")}
    </span>
  );
}
