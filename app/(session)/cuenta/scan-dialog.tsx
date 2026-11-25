"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import "./scan-dialog.css";

/** Opens the camera and reads QR codes. `onText` returns why a code was refused, or null to accept it. */
export function ScanDialog({ open, onOpenChange, title, description, onText, className = "" }: {
  className?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onText: (text: string) => string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`scan-dialog ${className}`}>
        <DialogHeader>
          <DialogTitle className="m-0">{title}</DialogTitle>
          <DialogDescription className="m-0">{description}</DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so closing the dialog always turns the camera off. */}
        <Camera onText={(text) => {
          const refusal = onText(text);
          if (!refusal) onOpenChange(false);
          return refusal;
        }} />
      </DialogContent>
    </Dialog>
  );
}

function Camera({ onText }: { onText: (text: string) => string | null }) {
  const video = useRef<HTMLVideoElement>(null);
  const handler = useRef(onText);
  const [message, setMessage] = useState("Abriendo la cámara…");

  useEffect(() => { handler.current = onText; });

  useEffect(() => {
    let cancelled = false;
    let accepted = false;
    let stop = () => {};

    async function start() {
      // Browsers only give camera access to https pages (and localhost).
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new Error("insecure");
      }
      const { default: QrScanner } = await import("qr-scanner");
      if (cancelled || !video.current) return;
      const scanner = new QrScanner(video.current, ({ data }) => {
        if (accepted) return;
        const refusal = handler.current(data);
        if (refusal) setMessage(refusal);
        else accepted = true;
      }, { returnDetailedScanResult: true, preferredCamera: "environment", highlightScanRegion: true, maxScansPerSecond: 5 });
      stop = () => scanner.destroy();
      await scanner.start();
      // The dialog may have closed while the browser was asking for permission.
      if (cancelled) scanner.destroy();
      else setMessage("Apunta la cámara al código QR.");
    }

    start().catch((error: unknown) => {
      if (cancelled) return;
      setMessage(error instanceof Error && error.message === "insecure"
        ? "La cámara solo funciona en una dirección segura (https)."
        : "No pudimos abrir la cámara. Revisa que el navegador tenga permiso para usarla.");
    });
    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  return (
    <>
      <div className="scan-view"><video ref={video} muted playsInline /></div>
      <p className="scan-message" role="status">{message}</p>
    </>
  );
}
