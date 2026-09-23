/**
 * Genera los derivados del isotipo oficial de Jeipy a partir del archivo fuente.
 * Solo recorta el margen transparente, centra y redimensiona: el símbolo no se altera.
 *
 *   node scripts/generate-brand-assets.mjs
 */
import sharp from "sharp";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const SOURCE = `${root}src/assets/brand/source/jp-isotipo-original.png`;
const TILE_BG = "#0A0E16";

/** Isotipo recortado y centrado en un lienzo cuadrado transparente. */
async function trimmedSquare() {
  const trimmed = await sharp(SOURCE).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
  const { width, height } = trimmed.info;
  const side = Math.round(Math.max(width, height) * 1.04);
  return sharp({ create: { width: side, height: side, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: trimmed.data, gravity: "center" }])
    .png()
    .toBuffer();
}

/** Isotipo sobre una placa oscura, para favicon e iconos de aplicación. */
async function tile(mark, size, { scale, radius }) {
  const background = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <defs><radialGradient id="g" cx="50%" cy="30%" r="75%">
        <stop offset="0" stop-color="#0F1B33"/><stop offset="1" stop-color="${TILE_BG}"/>
      </radialGradient></defs>
      <rect width="${size}" height="${size}" rx="${radius}" fill="url(#g)"/>
    </svg>`,
  );
  const markSize = Math.round(size * scale);
  const resizedMark = await sharp(mark).resize(markSize, markSize).png().toBuffer();
  return sharp(background).composite([{ input: resizedMark, gravity: "center" }]).png().toBuffer();
}

const mark = await trimmedSquare();

await sharp(mark).toFile(`${root}src/assets/brand/jp-isotipo.png`);
// Silueta ligera (solo alfa) para máscaras CSS como el destello metálico.
await sharp(mark).resize(256, 256).ensureAlpha().extractChannel("alpha").toColourspace("b-w")
  .toBuffer()
  .then((alpha) =>
    sharp({ create: { width: 256, height: 256, channels: 3, background: "#ffffff" } })
      .joinChannel(alpha)
      .png({ compressionLevel: 9, palette: true })
      .toFile(`${root}public/brand/jp-mask.png`),
  );
await sharp(await tile(mark, 512, { scale: 0.7, radius: 112 })).toFile(`${root}src/app/icon.png`);
await sharp(await tile(mark, 180, { scale: 0.66, radius: 0 })).toFile(`${root}src/app/apple-icon.png`);
await sharp(await tile(mark, 192, { scale: 0.6, radius: 0 })).toFile(`${root}public/brand/icon-192.png`);
await sharp(await tile(mark, 512, { scale: 0.6, radius: 0 })).toFile(`${root}public/brand/icon-512.png`);

console.log("Recursos de marca generados.");
