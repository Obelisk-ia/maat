"use client";

import { jpegToPdf } from "./image-pdf";

type RecoveryKitInfo = {
  name: string;
  email: string;
  role: "client" | "staff" | "owner" | "admin";
  codes: string[];
  generatedAt: number;
};

const ROLE_LABELS: Record<RecoveryKitInfo["role"], string> = {
  client: "Cliente",
  staff: "Staff",
  owner: "Dueño de negocio",
  admin: "Administrador",
};

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Generates and downloads a single-page Letter PDF with the user's 6 backup codes and recovery instructions. */
export async function downloadRecoveryKitPdf(info: RecoveryKitInfo): Promise<void> {
  const width = 1275;
  const height = 1650;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No pudimos generar el PDF.");

  // Warm Maat parchment background
  ctx.fillStyle = "#f7f3ea";
  ctx.fillRect(0, 0, width, height);

  // Top header band
  ctx.fillStyle = "#1f4a3b";
  ctx.fillRect(0, 0, width, 190);

  ctx.fillStyle = "#f7f3ea";
  ctx.font = "800 54px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillText("MAAT", 84, 96);

  ctx.font = "600 28px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillStyle = "#d9e7e0";
  ctx.fillText("Kit de recuperación de cuenta", 84, 146);

  const dateText = new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(info.generatedAt);

  // Account info card
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#d9d2c5";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(84, 232, width - 168, 178, 20);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#5c564d";
  ctx.font = "700 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillText("DATOS DE TU CUENTA", 120, 278);

  ctx.fillStyle = "#1f1e1c";
  ctx.font = "800 32px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillText(info.name, 120, 326);

  ctx.fillStyle = "#4f4a43";
  ctx.font = "500 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillText(`${info.email}  ·  ${ROLE_LABELS[info.role]}  ·  Generado el ${dateText}`, 120, 372);

  // Backup codes section
  ctx.fillStyle = "#1f1e1c";
  ctx.font = "800 32px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillText("Tus 6 códigos de respaldo (un solo uso)", 84, 480);

  ctx.fillStyle = "#4f4a43";
  ctx.font = "500 23px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  const introLines = wrapLines(
    ctx,
    "Si olvidas tu contraseña, entra a «¿Olvidaste tu contraseña?» en la pantalla de inicio de sesión, elige «Tengo un código» y escribe uno de estos códigos junto con tu nueva contraseña.",
    width - 168,
  );
  introLines.forEach((line, i) => ctx.fillText(line, 84, 524 + i * 32));

  // 2 x 3 code boxes
  const gridTop = 620;
  const colGap = 28;
  const rowGap = 24;
  const boxWidth = (width - 168 - colGap) / 2;
  const boxHeight = 96;

  info.codes.forEach((code, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = 84 + col * (boxWidth + colGap);
    const y = gridTop + row * (boxHeight + rowGap);

    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#1f4a3b";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(x, y, boxWidth, boxHeight, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#5c564d";
    ctx.font = "700 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillText(`#${index + 1}`, x + 28, y + 57);

    ctx.fillStyle = "#1f1e1c";
    ctx.font = "800 38px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText(code, x + 92, y + 61);
  });

  // Other recovery methods
  const methodsTop = 1020;
  ctx.fillStyle = "#1f1e1c";
  ctx.font = "800 32px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillText("Otras formas de recuperar tu contraseña", 84, methodsTop);

  const methods: string[] = [];
  if (info.role === "client") {
    methods.push(
      "1. Notificación push en tu teléfono: Si tienes los avisos de Maat activados en tu dispositivo, elige «Por notificación push» en «¿Olvidaste tu contraseña?» y te enviaremos un código de 6 dígitos al instante.",
      "2. Código de respaldo (este PDF): Usa cualquiera de los 6 códigos de arriba. Cada código funciona una sola vez y puedes generar un nuevo juego cuando quieras desde Cuenta -> Seguridad.",
      "3. Código de administrador: Si cambiaste de teléfono y no tienes tus códigos de respaldo, un administrador de Maat puede generarte un código temporal de 15 minutos.",
    );
  } else if (info.role === "staff") {
    methods.push(
      "1. Código de respaldo (este PDF): Usa cualquiera de los 6 códigos de arriba en «¿Olvidaste tu contraseña?» -> «Tengo un código».",
      "2. Código del dueño de tu negocio: El dueño puede generarte un código temporal de 6 dígitos (válido por 15 minutos) desde la sección Equipo.",
      "3. Código de administrador: Un administrador de Maat también puede emitirte un código temporal de recuperación.",
    );
  } else {
    methods.push(
      "1. Código de respaldo (este PDF): Usa cualquiera de los 6 códigos de arriba en «¿Olvidaste tu contraseña?» -> «Tengo un código».",
      "2. Código de administrador: Un administrador de Maat puede generarte un código temporal de 6 dígitos (válido por 15 minutos) para restablecer tu acceso.",
    );
  }

  let cursorY = methodsTop + 50;
  ctx.fillStyle = "#3f3b35";
  ctx.font = "500 23px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  for (const method of methods) {
    const lines = wrapLines(ctx, method, width - 168);
    for (const line of lines) {
      ctx.fillText(line, 84, cursorY);
      cursorY += 34;
    }
    cursorY += 16;
  }

  // Footer warning banner
  ctx.fillStyle = "#fae8d4";
  ctx.strokeStyle = "#c2782c";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(84, height - 180, width - 168, 108, 16);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#6e3208";
  ctx.font = "700 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillText("Guarda este archivo en un lugar seguro y privado.", 116, height - 134);
  ctx.font = "500 21px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillText("Si generas nuevos códigos en Maat, los anteriores dejarán de funcionar automáticamente.", 116, height - 98);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  if (!blob) throw new Error("No pudimos crear la imagen del PDF.");
  const jpeg = new Uint8Array(await blob.arrayBuffer());
  const pdfBytes = jpegToPdf(jpeg, { width, height }, { width: 612, height: 792 });
  const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "maat-kit-recuperacion.pdf";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}
