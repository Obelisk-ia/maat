"use client";

import { Download, Share, SquarePlus } from "lucide-react";
import { useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { CopyLink } from "./copy-link";
import { installState, promptInstall, subscribeInstall, type InstallState } from "./install-store";
import "./install-app.css";

type Guide = Exclude<InstallState, "app" | "prompt" | "none">;

/** "none" until the page is running in the browser, so the server never guesses. */
export function useInstallState() {
  return useSyncExternalStore<InstallState>(subscribeInstall, installState, () => "none");
}

const guides: Record<Guide, { description: string; steps: ReactNode[]; note?: string; copyLink?: boolean }> = {
  ios: {
    description: "Agrega Maat a tu pantalla de inicio en tres pasos.",
    steps: [
      <>Toca <b>Compartir</b> <Share aria-hidden="true" />. Si no lo ves, toca primero <b>•••</b>.</>,
      <>Elige <b>Agregar a Inicio</b> <SquarePlus aria-hidden="true" />. Quizá tengas que deslizar la lista.</>,
      <>Si aparece <b>Abrir como app web</b>, déjalo activado. Toca <b>Agregar</b>.</>,
    ],
    note: "La primera vez que abras la app quizá tengas que iniciar sesión otra vez.",
  },
  "ios-inapp": {
    description: "Estás en el navegador de otra app, que no puede instalar Maat.",
    steps: [<>Copia el enlace.</>, <>Ábrelo en <b>Safari</b>.</>, <>Ahí toca <b>Agregar a inicio</b> y sigue los pasos.</>],
    copyLink: true,
  },
  android: {
    description: "Agrega Maat desde el menú de tu navegador.",
    steps: [
      <>Abre el menú del navegador (<b>⋮</b> o <b>≡</b>).</>,
      <>Elige <b>Instalar app</b> o <b>Agregar a la pantalla principal</b>.</>,
      <>Confirma. Maat aparecerá con tus demás apps.</>,
    ],
    note: "¿Ya la instalaste? Ábrela desde el ícono de Maat.",
  },
  "android-inapp": {
    description: "Estás en el navegador de otra app, que no puede instalar Maat.",
    steps: [<>Copia el enlace.</>, <>Ábrelo en el <b>navegador</b> de tu teléfono.</>, <>Ahí toca <b>Instalar</b> o <b>Agregar a inicio</b>.</>],
    copyLink: true,
  },
};

/**
 * Offers to put Maat on the home screen. It renders nothing inside the installed app, or where
 * the browser has no way to install it.
 */
export function InstallApp({ className = "", label }: { className?: string; label?: string }) {
  const state = useInstallState();
  // Kept while the dialog is open, even if the browser's answer changes meanwhile.
  const [guide, setGuide] = useState<Guide>();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const offered = state !== "app" && state !== "none";

  function choose() {
    if (state === "prompt") void promptInstall();
    else if (state !== "app" && state !== "none") {
      setGuide(state);
      setOpen(true);
    }
  }

  return (
    <>
      {offered && (
        <button ref={button} type="button" className={`install-app ${className}`} onClick={choose}
          aria-haspopup={state === "prompt" ? undefined : "dialog"}>
          <Download aria-hidden="true" />
          {label ?? (state === "prompt" || state.endsWith("inapp") ? "Instalar" : (
            // Very narrow headers have room only for the shorter word.
            <><span className="install-app-long">Agregar a inicio</span><span className="install-app-short">Instalar</span></>
          ))}
        </button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        {guide && (
          // Opened without a dialog trigger, so focus has to be handed back by hand.
          <DialogContent className="install-dialog"
            onCloseAutoFocus={(event) => { event.preventDefault(); button.current?.focus(); }}>
            <DialogHeader>
              <DialogTitle className="m-0">Agregar Maat a inicio</DialogTitle>
              <DialogDescription className="m-0">{guides[guide].description}</DialogDescription>
            </DialogHeader>
            <ol>{guides[guide].steps.map((step, index) => <li key={index}><span>{step}</span></li>)}</ol>
            {guides[guide].copyLink && <CopyLink />}
            {guides[guide].note && <p className="install-note">{guides[guide].note}</p>}
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
