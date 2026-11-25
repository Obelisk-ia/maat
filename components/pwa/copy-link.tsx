"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

/** Copies the customer sign-in address, to open Maat in another browser. */
export function CopyLink() {
  const [status, setStatus] = useState<"copied" | "failed">();
  const link = typeof window === "undefined" ? "" : `${window.location.origin}/clientes?tab=login`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <div className="install-copy">
      <button type="button" onClick={copy}>
        {status === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {status === "copied" ? "Enlace copiado" : "Copiar enlace"}
      </button>
      {status === "failed" && <p role="alert">No pudimos copiarlo. Escríbelo así: <span>{link}</span></p>}
    </div>
  );
}
