"use client";

import { Copy, Download, TriangleAlert, Upload } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { useEffect, useRef, useState, useSyncExternalStore, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cardImageTypes, sourceImageLimit, type CardDetails } from "@/lib/business-card";
import { jpegToPdf } from "@/lib/image-pdf";
import { joinPath } from "@/lib/join-link";
import { letterPage, loadLogo, printFormats, renderPrintPage, type PrintContent, type PrintFormat } from "./qr-print";

type LogoChoice = "card" | "custom" | "none";

const subscribeToNothing = () => () => {};

// Phones can't open these addresses, so a printed code pointing at one would be useless.
function isLocalAddress(address: string) {
  const host = URL.canParse(address) ? new URL(address).hostname : "";
  return /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\])|\.local$/.test(host);
}

export function QrStudio({ organizationId, card, cardLogoUrl }: {
  organizationId: string;
  card: CardDetails;
  cardLogoUrl: string | null;
}) {
  const [format, setFormat] = useState<PrintFormat>("poster");
  // Undefined follows the saved card until the owner types something else.
  const [businessName, setBusinessName] = useState<string>();
  const [headline, setHeadline] = useState("Junta sellos y gana premios");
  const [message, setMessage] = useState("Escanea el código con la cámara de tu celular y guarda tu tarjeta.");
  const [tableText, setTableText] = useState("Escanea y junta sellos");
  const [cardColors, setCardColors] = useState(true);
  const [chosenLogo, setLogoChoice] = useState<LogoChoice>();
  const [customLogo, setCustomLogo] = useState<string>();
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [downloading, setDownloading] = useState(false);
  const preview = useRef<HTMLCanvasElement>(null);
  const qr = useRef<HTMLCanvasElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);

  const origin = useSyncExternalStore(subscribeToNothing, () => window.location.origin, () => "");
  const site = process.env.NEXT_PUBLIC_SITE_URL || origin;
  const joinUrl = site ? new URL(joinPath(organizationId), site).href : "";

  const logoChoice = chosenLogo ?? (cardLogoUrl ? "card" : "none");
  const logoUrl = logoChoice === "card" ? cardLogoUrl : logoChoice === "custom" ? customLogo ?? null : null;
  const name = businessName ?? card.displayName;
  const colors = cardColors
    ? { background: card.colors.background, ink: card.colors.text, accent: card.colors.accent }
    : { background: "#ffffff", ink: "#1d1c1a", accent: "#1d1c1a" };
  const content: PrintContent = { businessName: name, headline, message, tableText, colors };
  const contentKey = JSON.stringify(content);

  useEffect(() => {
    if (!customLogo) return;
    return () => URL.revokeObjectURL(customLogo);
  }, [customLogo]);

  async function render(dpi: number, page: PrintContent) {
    const logo = logoUrl ? await loadLogo(logoUrl) : null;
    return renderPrintPage({ format, content: page, qr: qr.current!, logo, dpi });
  }

  useEffect(() => {
    if (!joinUrl) return;
    let cancelled = false;
    render(144, JSON.parse(contentKey)).then((page) => {
      const target = preview.current;
      if (cancelled || !target) return;
      target.width = page.width;
      target.height = page.height;
      target.getContext("2d")!.drawImage(page, 0, 0);
      setError("");
    }).catch(() => {
      if (!cancelled) setError("No pudimos cargar el logo. Elige otro o quítalo.");
    });
    return () => { cancelled = true; };
    // `render` is rebuilt every time; these are the values it reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentKey, format, logoUrl, joinUrl]);

  async function download() {
    setDownloading(true);
    setStatus("");
    try {
      const page = await render(300, content);
      const jpeg = await new Promise<Blob>((resolve, reject) => page.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("Empty page")), "image/jpeg", 0.95));
      const pdf = jpegToPdf(new Uint8Array(await jpeg.arrayBuffer()), page, letterPage);
      const url = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `qr-${printFormats[format].file}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setStatus("PDF descargado. Imprímelo en tamaño real (100%).");
    } catch {
      setStatus("No pudimos crear el PDF. Intenta de nuevo.");
    } finally {
      setDownloading(false);
    }
  }

  function chooseLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (!cardImageTypes.includes(file.type) || !file.size || file.size > sourceImageLimit) {
      setStatus("Elige una imagen PNG, JPG o WebP de hasta 10 MB.");
      return;
    }
    setCustomLogo(URL.createObjectURL(file));
    setLogoChoice("custom");
    setStatus("");
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setStatus("Enlace copiado.");
    } catch {
      setStatus("Selecciona el enlace para copiarlo manualmente.");
    }
  }

  const logoOptions: { choice: LogoChoice; label: string; available: boolean }[] = [
    { choice: "card", label: "Logo de la tarjeta", available: Boolean(cardLogoUrl) },
    { choice: "custom", label: "Otro logo", available: Boolean(customLogo) },
    { choice: "none", label: "Sin logo", available: true },
  ];

  return (
    <>
      <div className="owner-heading studio-heading">
        <div>
          <h1>Tu código QR</h1>
          <p>Imprímelo para que tus clientes lo escaneen y guarden tu tarjeta.</p>
        </div>
        <Button type="button" onClick={download} disabled={!joinUrl || Boolean(error) || downloading}>
          <Download aria-hidden="true" /> {downloading ? "Creando PDF…" : "Descargar PDF"}
        </Button>
      </div>
      <p className="studio-status" role="status">{status}</p>
      {isLocalAddress(joinUrl) && (
        <p className="qr-warning">
          <TriangleAlert aria-hidden="true" />
          Este código apunta a una dirección local que los celulares de tus clientes no pueden abrir. Úsalo solo para probar; imprime desde tu sitio publicado.
        </p>
      )}

      <div className="studio-layout">
        <div className="studio-controls">
          <section className="studio-section" aria-labelledby="qr-format-title">
            <h2 id="qr-format-title">Formato para imprimir</h2>
            <div className="studio-two" role="group" aria-labelledby="qr-format-title">
              {(Object.keys(printFormats) as PrintFormat[]).map((option) => (
                <button key={option} type="button" className="qr-format" aria-pressed={format === option}
                  onClick={() => setFormat(option)}>
                  <span className="qr-format-sheet" data-format={option} aria-hidden="true">
                    {Array.from({ length: option === "table" ? 4 : 1 }, (_, index) => <i key={index} />)}
                  </span>
                  <strong>{printFormats[option].label}</strong>
                  <span>{printFormats[option].detail}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="studio-section" aria-labelledby="qr-text-title">
            <h2 id="qr-text-title">Textos</h2>
            <div className="studio-field">
              <Label htmlFor="qr-name">Nombre del negocio</Label>
              <Input id="qr-name" value={name} maxLength={60} onChange={(event) => setBusinessName(event.target.value)} />
            </div>
            {format === "poster" ? (
              <>
                <div className="studio-field">
                  <Label htmlFor="qr-headline">Título</Label>
                  <Input id="qr-headline" value={headline} maxLength={60} onChange={(event) => setHeadline(event.target.value)} />
                </div>
                <div className="studio-field">
                  <Label htmlFor="qr-message">Mensaje bajo el código</Label>
                  <Input id="qr-message" value={message} maxLength={140} onChange={(event) => setMessage(event.target.value)} />
                </div>
              </>
            ) : (
              <div className="studio-field">
                <Label htmlFor="qr-table-text">Texto corto</Label>
                <Input id="qr-table-text" value={tableText} maxLength={50} onChange={(event) => setTableText(event.target.value)} />
              </div>
            )}
          </section>

          <section className="studio-section" aria-labelledby="qr-style-title">
            <h2 id="qr-style-title">Logo y colores</h2>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Logo">
              {logoOptions.filter(({ available }) => available).map(({ choice, label }) => (
                <Button key={choice} type="button" variant="outline" size="sm" className="studio-palette"
                  aria-pressed={logoChoice === choice} onClick={() => setLogoChoice(choice)}>
                  {label}
                </Button>
              ))}
              <input ref={logoInput} id="qr-logo-file" type="file" accept={cardImageTypes.join(",")} hidden onChange={chooseLogo} />
              <Button type="button" variant="ghost" size="sm" onClick={() => logoInput.current?.click()}>
                <Upload aria-hidden="true" /> {customLogo ? "Cambiar otro logo" : "Subir otro logo"}
              </Button>
            </div>
            {error && <p className="studio-status m-0" data-error="true" role="alert">{error}</p>}
            <div className="flex flex-wrap gap-2" role="group" aria-label="Colores">
              <Button type="button" variant="outline" size="sm" className="studio-palette" aria-pressed={cardColors}
                onClick={() => setCardColors(true)}>
                <span aria-hidden="true" style={{ backgroundColor: card.colors.background }} />Colores de la tarjeta
              </Button>
              <Button type="button" variant="outline" size="sm" className="studio-palette" aria-pressed={!cardColors}
                onClick={() => setCardColors(false)}>
                <span aria-hidden="true" className="qr-white-swatch" />Fondo blanco (ahorra tinta)
              </Button>
            </div>
            <p className="studio-hint">Estos textos y el otro logo no se guardan: descarga tu PDF antes de salir de la página.</p>
          </section>
        </div>

        <aside className="card-preview" aria-labelledby="qr-preview-title">
          <h2 id="qr-preview-title">Vista previa de la hoja</h2>
          <canvas ref={preview} className="qr-sheet" width={1224} height={1584} role="img"
            aria-label={`${printFormats[format].label}: ${name}. ${format === "poster" ? `${headline}. ${message}` : tableText}`} />
          <div className="qr-link">
            <span>El código abre:</span>
            <code>{joinUrl}</code>
            <Button type="button" variant="outline" size="sm" onClick={copyLink} disabled={!joinUrl}>
              <Copy aria-hidden="true" /> Copiar enlace
            </Button>
          </div>
          {joinUrl && <QRCodeCanvas ref={qr} value={joinUrl} size={1024} level="Q" marginSize={4} className="qr-source" />}
        </aside>
      </div>
    </>
  );
}
