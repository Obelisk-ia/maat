"use client";

import { Check, Copy, Minus, Play, X } from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { installState } from "@/components/pwa/install-store";
import { createSubscription, currentSubscription, pushSupport } from "@/components/pwa/push-device";
import { browserName } from "@/lib/browser-name";

type Result = { name: string; status: "ok" | "fail" | "skip"; detail: string };

/** Waits for a step and says how long it took, or that it never answered. */
async function timed(name: string, ms: number, work: () => Promise<string>): Promise<Result> {
  const start = performance.now();
  const seconds = () => `${((performance.now() - start) / 1000).toFixed(1)} s`;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const detail = await Promise.race([
      work(),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("no respondió")), ms); }),
    ]);
    return { name, status: "ok", detail: `${detail} (${seconds()})` };
  } catch (error) {
    const reason = error instanceof Error ? `${error.name === "Error" ? "" : `${error.name}: `}${error.message}` : String(error);
    return { name, status: "fail", detail: `${reason} (${seconds()})` };
  } finally {
    clearTimeout(timer);
  }
}

function facts() {
  const permission = "Notification" in window ? Notification.permission : "no existe";
  return [
    ["Navegador", browserName(navigator.userAgent)],
    ["Abierto como", installState() === "app" ? "app instalada" : "pestaña del navegador"],
    ["Conexión segura", window.isSecureContext ? "sí" : "no"],
    ["Service worker", "serviceWorker" in navigator ? (navigator.serviceWorker.controller ? "activo" : "disponible") : "no existe"],
    ["Avisos push", "PushManager" in window ? "disponibles" : "no existen"],
    ["Permiso", permission],
    ["Identificación", navigator.userAgent],
  ];
}

// Read once in the browser; the server has nothing to say about the phone.
let read: { rows: string[][]; needsInstall: boolean } | undefined;
const unread: NonNullable<typeof read> = { rows: [], needsInstall: false };
const readPhone = () => read ??= { rows: facts(), needsInstall: pushSupport() === "needs-install" };
const subscribeNothing = () => () => {};

const icons = { ok: Check, fail: X, skip: Minus };

export function PushCheck({ publicKey }: { publicKey: string | null }) {
  const initial = useSyncExternalStore(subscribeNothing, readPhone, () => unread);
  const [results, setResults] = useState<Result[]>([]);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState("");
  const [copied, setCopied] = useState<boolean>();

  async function run() {
    setRunning(true);
    setResults([]);
    setCopied(undefined);
    const found: Result[] = [];
    function add(result: Result) {
      found.push(result);
      setResults([...found]);
      // In development this also reaches the terminal running `next dev`.
      console.info(`[maat diagnostico] ${browserName(navigator.userAgent)} | ${installState()} | ${result.name}: ${result.status} ${result.detail}`);
    }

    // The permission question has to come straight from the tap, before anything else.
    const asking = !("Notification" in window) ? undefined
      : Notification.permission === "default" ? Notification.requestPermission() : Promise.resolve(Notification.permission);
    console.info(`[maat diagnostico] inicio | ${navigator.userAgent}`);

    add(asking ? await timed("1. Permiso", 25_000, async () => {
      const answer = await asking;
      if (answer !== "granted") throw new Error(answer === "denied" ? "bloqueado" : "sin respuesta del usuario");
      return "permitido";
    }) : { name: "1. Permiso", status: "fail", detail: "este navegador no tiene avisos" });
    const allowed = "Notification" in window && Notification.permission === "granted";

    const worker = await timed("2. Service worker", 8000, async () => {
      if (!navigator.serviceWorker) throw new Error("no existe en este navegador");
      if (!await navigator.serviceWorker.getRegistration()) await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      return "listo";
    });
    add(worker);

    if (!allowed || worker.status !== "ok") {
      add({ name: "3. Mostrar un aviso", status: "skip", detail: "primero hacen falta los pasos 1 y 2" });
      add({ name: "4. Servicio de avisos", status: "skip", detail: "primero hacen falta los pasos 1 y 2" });
    } else {
      add(await timed("3. Mostrar un aviso", 10_000, async () => {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification("Maat", { body: "Aviso de prueba de este teléfono.", icon: "/icons/maat-192.png", tag: "maat-check" });
        return "el teléfono lo aceptó; confirma que lo viste";
      }));
      if (!("PushManager" in window) || !publicKey) {
        add({ name: "4. Servicio de avisos", status: "fail", detail: publicKey ? "este navegador no tiene avisos push" : "el servidor no tiene llaves" });
      } else {
        add(await timed("4. Servicio de avisos", 25_000, async () => {
          // An existing subscription is only looked at, so notifications already on stay on.
          const existing = await currentSubscription();
          if (existing) return `ya conectado con ${new URL(existing.endpoint).hostname}`;
          const subscription = await createSubscription(publicKey);
          const host = new URL(subscription.endpoint).hostname;
          await subscription.unsubscribe();
          return `conectó con ${host}`;
        }));
      }
    }

    setReport([
      `Revisión de avisos · ${new Date().toLocaleString("es-MX")}`,
      ...facts().map(([name, value]) => `${name}: ${value}`),
      ...found.map((result) => `${result.name}: ${result.status.toUpperCase()} · ${result.detail}`),
    ].join("\n"));
    setRunning(false);
  }

  const failed = results.find((result) => result.status === "fail");

  async function copy() {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="check-panel">
      <h1>Revisar avisos</h1>
      <p>Comprueba, paso por paso, si este teléfono y navegador pueden recibir avisos de Maat.</p>
      {initial.needsInstall && (
        <p className="check-install">
          En iPhone y iPad los avisos solo funcionan en la app de la pantalla de inicio, con cualquier navegador.
          Agrega Maat a tu inicio y haz esta revisión desde la app. Necesitas iOS 16.4 o posterior.
        </p>
      )}
      <button type="button" className="check-run" disabled={running} onClick={run}>
        <Play aria-hidden="true" /> {running ? "Revisando…" : "Probar en este teléfono"}
      </button>

      <ol className="check-results" aria-live="polite">
        {results.map((result) => {
          const Icon = icons[result.status];
          return (
            <li key={result.name} data-status={result.status}>
              <Icon aria-hidden="true" />
              <div><strong>{result.name}</strong><span>{result.detail}</span></div>
            </li>
          );
        })}
      </ol>
      {report && !running && (
        <>
          <p className="check-verdict" data-ok={!failed} role="status">
            {failed ? `No pasó: ${failed.name.replace(/^\d\. /, "")}.` : "Este teléfono puede recibir avisos."}
          </p>
          <button type="button" className="check-copy" onClick={copy}>
            <Copy aria-hidden="true" /> {copied ? "Reporte copiado" : "Copiar reporte"}
          </button>
          {copied === false && <textarea className="check-report" readOnly rows={10} value={report} />}
        </>
      )}

      <h2>Datos de este teléfono</h2>
      <dl>
        {initial.rows.map(([name, value]) => (
          <div key={name}><dt>{name}</dt><dd>{value}</dd></div>
        ))}
      </dl>
      <Link href="/cuenta" className="check-back">Volver a mis tarjetas</Link>
    </div>
  );
}
