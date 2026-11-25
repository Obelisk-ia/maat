import sharp from "sharp";
import { cardImageLimit, cardImageTypes, sourceImageLimit, type CardImageSlot } from "./business-card";

const dimensions = {
  logo: { width: 512, height: 512 },
  background: { width: 1440, height: 1800 },
  stampLogo: { width: 256, height: 256 },
  cover: { width: 1440, height: 960 },
};

export async function compressCardImage(file: File, slot: CardImageSlot): Promise<ArrayBuffer> {
  if (!file.size || file.size > sourceImageLimit || !cardImageTypes.includes(file.type)) {
    throw new Error("Elige una imagen PNG, JPG o WebP de hasta 10 MB.");
  }

  try {
    const image = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40_000_000 });
    const { format } = await image.metadata();
    if (!format || !["png", "jpeg", "webp"].includes(format)) throw new Error("Unsupported image format");

    const { width, height } = dimensions[slot];
    for (const scale of [1, 0.75, 0.55, 0.35]) {
      const resized = image.clone().rotate().resize({
        width: Math.round(width * scale),
        height: Math.round(height * scale),
        fit: "inside",
        withoutEnlargement: true,
      });
      for (const quality of [84, 70, 55, 42]) {
        const bytes = await resized.clone().webp({ quality }).toBuffer();
        if (bytes.byteLength <= cardImageLimit) return Uint8Array.from(bytes).buffer;
      }
    }
  } catch {
    throw new Error("No pudimos procesar esa imagen. Elige otro PNG, JPG o WebP.");
  }
  throw new Error("No pudimos reducir esa imagen a 150 KB. Prueba con otra.");
}
