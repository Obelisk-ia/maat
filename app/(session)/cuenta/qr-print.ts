// Draws the printable pages. The on-screen preview and the PDF share this code, so they always match.

export const letterPage = { width: 612, height: 792 }; // US Letter ("Carta"), in points

export const printFormats = {
  poster: { label: "Póster", detail: "1 por hoja carta. Para la entrada o el mostrador.", file: "poster" },
  table: { label: "Tarjetas de mesa", detail: "4 por hoja carta, con líneas de corte.", file: "mesas" },
} as const;
export type PrintFormat = keyof typeof printFormats;

export type PrintContent = {
  businessName: string;
  headline: string;
  message: string;
  tableText: string;
  colors: { background: string; ink: string; accent: string };
};

const fontFamily = '"Plus Jakarta Sans Variable", system-ui, sans-serif';
// Blank border around each piece, wide enough for the unprintable edge of home printers.
const pageMargin = 18;

type Block = { height: number; gap: number; draw: (top: number) => void };

type Sizes = {
  padding: number;
  logo: number;
  name: number;
  nameLines: number;
  title: number;
  qr: number;
  gaps: { name: number; title: number; qr: number; message: number };
};

const posterSizes: Sizes = {
  padding: 28, logo: 80, name: 18, nameLines: 1, title: 44, qr: 330,
  gaps: { name: 12, title: 20, qr: 22, message: 22 },
};
const tableSizes: Sizes = {
  padding: 14, logo: 40, name: 11, nameLines: 2, title: 20, qr: 192,
  gaps: { name: 6, title: 8, qr: 10, message: 0 },
};

function wrap(context: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  for (const word of text.split(/\s+/)) {
    const joined = lines.length ? `${lines[lines.length - 1]} ${word}` : word;
    if (lines.length && context.measureText(joined).width <= width) lines[lines.length - 1] = joined;
    else lines.push(word);
  }
  return lines;
}

/** Shrinks text until it fits the width within the line limit. */
function textBlock(context: CanvasRenderingContext2D, text: string, options: {
  center: number; width: number; size: number; weight: number; maxLines: number;
  leading: number; color: string; gap: number;
}): Block | null {
  const value = text.trim();
  if (!value) return null;
  let size = options.size;
  let lines: string[] = [];
  for (; ; size -= 0.5) {
    context.font = `${options.weight} ${size}px ${fontFamily}`;
    lines = wrap(context, value, options.width);
    const fits = lines.length <= options.maxLines &&
      lines.every((line) => context.measureText(line).width <= options.width);
    // At half size, fillText's maxWidth squeezes whatever is still too long.
    if (fits || size <= options.size / 2) break;
  }
  if (lines.length > options.maxLines) {
    lines = [...lines.slice(0, options.maxLines - 1), lines.slice(options.maxLines - 1).join(" ")];
  }
  // Even out the lines so a single word isn't left alone on the last one.
  for (let width = options.width - 4; lines.length > 1 && width > options.width / 2; width -= 4) {
    const narrower = wrap(context, value, width);
    if (narrower.length !== lines.length || narrower.some((line) => context.measureText(line).width > width)) break;
    lines = narrower;
  }
  const lineHeight = size * options.leading;
  const font = context.font;
  return {
    height: lines.length * lineHeight,
    gap: options.gap,
    draw(top) {
      context.font = font;
      context.fillStyle = options.color;
      context.textAlign = "center";
      context.textBaseline = "middle";
      lines.forEach((line, index) => context.fillText(line, options.center, top + lineHeight * (index + 0.5), options.width));
    },
  };
}

function roundedBox(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, color: string) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fillStyle = color;
  context.fill();
}

function drawPiece(context: CanvasRenderingContext2D, box: { x: number; y: number; width: number; height: number },
  sizes: Sizes, content: PrintContent, title: string, message: string, qr: HTMLCanvasElement, logo: HTMLImageElement | null) {
  const { colors } = content;
  const center = box.x + box.width / 2;
  const width = box.width - sizes.padding * 2;
  roundedBox(context, box.x, box.y, box.width, box.height, sizes.padding / 2, colors.background);

  const logoBlock: Block | null = logo && {
    height: sizes.logo,
    gap: 0,
    draw(top) {
      // The logo sits on a white tile so dark or transparent logos stay visible on any color.
      const inset = sizes.logo * 0.08;
      const room = sizes.logo - inset * 2;
      const scale = Math.min((room * 2.5) / logo.naturalWidth, room / logo.naturalHeight);
      const logoWidth = logo.naturalWidth * scale;
      const logoHeight = logo.naturalHeight * scale;
      const tile = Math.max(sizes.logo, logoWidth + inset * 2);
      roundedBox(context, center - tile / 2, top, tile, sizes.logo, sizes.logo * 0.2, "#ffffff");
      context.drawImage(logo, center - logoWidth / 2, top + (sizes.logo - logoHeight) / 2, logoWidth, logoHeight);
    },
  };

  const blocks = [
    logoBlock,
    textBlock(context, content.businessName, {
      center, width, size: sizes.name, weight: 700, maxLines: sizes.nameLines, leading: 1.25, color: colors.accent, gap: sizes.gaps.name,
    }),
    textBlock(context, title, {
      center, width, size: sizes.title, weight: 800, maxLines: 2, leading: 1.15, color: colors.ink, gap: sizes.gaps.title,
    }),
    {
      height: sizes.qr,
      gap: sizes.gaps.qr,
      draw(top: number) {
        // The QR keeps its own white quiet zone and black modules so every camera can read it.
        context.imageSmoothingEnabled = false;
        context.drawImage(qr, center - sizes.qr / 2, top, sizes.qr, sizes.qr);
        context.imageSmoothingEnabled = true;
      },
    },
    textBlock(context, message, {
      center, width, size: 18, weight: 500, maxLines: 3, leading: 1.4, color: colors.ink, gap: sizes.gaps.message,
    }),
  ].filter((block): block is Block => block !== null);

  const total = blocks.reduce((sum, block, index) => sum + block.height + (index ? block.gap : 0), 0);
  let top = box.y + (box.height - total) / 2;
  blocks.forEach((block, index) => {
    if (index) top += block.gap;
    block.draw(top);
    top += block.height;
  });
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No pudimos cargar el logo."));
    image.src = source;
  });
}

/** Fetches a logo as a local copy: drawing a remote image directly would block exporting the canvas. */
export async function loadLogo(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("No pudimos cargar el logo.");
  const local = URL.createObjectURL(await response.blob());
  try {
    return await loadImage(local);
  } finally {
    URL.revokeObjectURL(local);
  }
}

export async function renderPrintPage({ format, content, qr, logo, dpi }: {
  format: PrintFormat;
  content: PrintContent;
  qr: HTMLCanvasElement;
  logo: HTMLImageElement | null;
  dpi: number;
}) {
  const text = [content.businessName, content.headline, content.message, content.tableText].join(" ");
  await Promise.all([500, 700, 800].map((weight) => document.fonts.load(`${weight} 20px ${fontFamily}`, text)));

  const canvas = document.createElement("canvas");
  canvas.width = Math.round((letterPage.width / 72) * dpi);
  canvas.height = Math.round((letterPage.height / 72) * dpi);
  const context = canvas.getContext("2d")!;
  context.scale(dpi / 72, dpi / 72);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, letterPage.width, letterPage.height);

  if (format === "poster") {
    drawPiece(context, {
      x: pageMargin, y: pageMargin,
      width: letterPage.width - pageMargin * 2, height: letterPage.height - pageMargin * 2,
    }, posterSizes, content, content.headline, content.message, qr, logo);
    return canvas;
  }

  const width = letterPage.width / 2;
  const height = letterPage.height / 2;
  for (const [column, row] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    drawPiece(context, {
      x: column * width + pageMargin, y: row * height + pageMargin,
      width: width - pageMargin * 2, height: height - pageMargin * 2,
    }, tableSizes, content, content.tableText, "", qr, logo);
  }
  context.beginPath();
  context.setLineDash([4, 4]);
  context.lineWidth = 0.5;
  context.strokeStyle = "#8a8a8a";
  context.moveTo(width, 0);
  context.lineTo(width, letterPage.height);
  context.moveTo(0, height);
  context.lineTo(letterPage.width, height);
  context.stroke();
  return canvas;
}
