"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ConvexError } from "convex/values";
import { Check, Plus, ScanLine, Search } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { PhoneInput } from "@/components/phone-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import { cardProgress, nextStepText } from "@/lib/card-progress";
import { reformatInput } from "@/lib/format-input";
import { formatMemberCode, formatMemberCodeInput, parseMemberCode } from "@/lib/member-code";
import { normalizePhone } from "@/lib/registration";
import { dayKey, sameStampDay } from "@/lib/stamp-day";
import { lastVisitText } from "./dashboard/format";
import { LoyaltyCard, useStampPlayback } from "./loyalty-card";
import { PrizeDesk } from "./prize-desk";
import { ScanDialog } from "./scan-dialog";
import "./stamp-station.css";

type Found = Extract<FunctionReturnType<typeof api.stamps.find>, { valid: true }>;

/** Where owners and staff serve a customer: find their card, add a stamp or hand over a prize. */
export function StampStation() {
  const { isAuthenticated } = useConvexAuth();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [term, setTerm] = useState("");
  const [problem, setProblem] = useState<{ field: "phone" | "code"; text: string }>();
  const [scanning, setScanning] = useState(false);
  const result = useQuery(api.stamps.find, isAuthenticated && term ? { term } : "skip");
  const resultArea = useRef<HTMLDivElement>(null);
  const foundId = term && result?.valid ? result.matches[0]?.membershipId : undefined;

  // On a phone the result sits below the search, so bring it into view.
  useEffect(() => {
    if (foundId) resultArea.current?.scrollIntoView({ block: "nearest" });
  }, [foundId]);

  /** Typing in one field starts a new search, so the other field and old results clear. */
  function type(field: "phone" | "code", value: string) {
    setPhone(field === "phone" ? value : "");
    setCode(field === "code" ? value : "");
    setTerm("");
    setProblem(undefined);
  }

  function search(event: FormEvent<HTMLFormElement>, field: "phone" | "code") {
    event.preventDefault();
    const found = field === "phone" ? normalizePhone(phone) : parseMemberCode(code);
    setTerm(found ?? "");
    setProblem(found ? undefined : {
      field,
      text: field === "phone"
        ? "Escribe los 10 dígitos del celular."
        : "El código tiene 8 letras y números, como K7QM-3FXD.",
    });
  }

  return (
    <div className="station-frame">
      <div className="station">
        <section className="station-finder" aria-label="Buscar la tarjeta del cliente">
          <div className="station-viewfinder">
            <ScanLine aria-hidden="true" />
            <strong>Escanea el QR del cliente</strong>
            <span>Pídele que abra su tarjeta y muestre el código.</span>
            <button type="button" className="station-scan" onClick={() => setScanning(true)}>
              <ScanLine aria-hidden="true" /> Escanear tarjeta del cliente
            </button>
          </div>

          <p className="station-divider">o búscalo a mano</p>

          <form className="station-search" onSubmit={(event) => search(event, "phone")}>
            <Label htmlFor="station-phone">Celular del cliente</Label>
            <div>
              <PhoneInput id="station-phone" value={phone} autoComplete="off" placeholder="55 1234 5678"
                aria-invalid={problem?.field === "phone"} onValueChange={(value) => type("phone", value)} />
              <Button type="submit" variant="outline" disabled={!phone} aria-label="Buscar por celular">
                <Search aria-hidden="true" /> Buscar
              </Button>
            </div>
            {problem?.field === "phone" && <p className="station-error" role="alert">{problem.text}</p>}
          </form>

          <form className="station-search" onSubmit={(event) => search(event, "code")}>
            <Label htmlFor="station-code">Código de la tarjeta</Label>
            <div>
              <Input id="station-code" className="station-code" value={code} autoComplete="off" autoCapitalize="characters"
                spellCheck={false} placeholder="XXXX-XXXX" aria-invalid={problem?.field === "code"}
                onChange={(event) => type("code", reformatInput(event.target, formatMemberCodeInput))} />
              <Button type="submit" variant="outline" disabled={!code} aria-label="Buscar por código">
                <Search aria-hidden="true" /> Buscar
              </Button>
            </div>
            {problem?.field === "code" && <p className="station-error" role="alert">{problem.text}</p>}
          </form>
        </section>

        <div ref={resultArea} className="station-result">
          <div aria-live="polite">
            {term && !result && <p className="station-note">Buscando…</p>}
            {term && result?.valid && result.matches.length === 0 && (
              <p className="station-note">No encontramos una tarjeta de tu negocio con esos datos. Pide al cliente que escanee el QR de tu negocio para agregarla.</p>
            )}
          </div>
          {!term && <p className="station-empty">Aquí aparecerá la tarjeta del cliente.</p>}
          {term && result?.valid && result.matches.map((match) => (
            <StampTarget key={match.membershipId} design={result.design} match={match} onScan={() => setScanning(true)} />
          ))}
        </div>
      </div>

      <ScanDialog open={scanning} onOpenChange={setScanning} title="Escanear tarjeta"
        description="Pide al cliente que muestre el QR de su tarjeta."
        onText={(text) => {
          const scanned = parseMemberCode(text);
          if (!scanned) return "Ese QR no es de una tarjeta de cliente.";
          type("code", formatMemberCode(scanned));
          setTerm(scanned);
          return null;
        }} />
    </div>
  );
}

function StampTarget({ design, match, onScan }: {
  design: Found["design"];
  match: Found["matches"][number];
  onScan: () => void;
}) {
  const addStamp = useMutation(api.stamps.add);
  const [pending, setPending] = useState(false);
  // What the last action did, in the numbers of that moment.
  const [done, setDone] = useState("");
  const [error, setError] = useState("");
  const progress = cardProgress(design.details, match.stamps, match.redeemedPrizes);
  const { total, stamps } = progress;
  const play = useStampPlayback(stamps);
  const full = stamps >= total;
  const [openedAt] = useState(() => Date.now());
  // The server enforces the daily limit; this explains it before anyone taps.
  const stampedToday = match.lastStampAt !== null && sameStampDay(match.lastStampAt, openedAt);

  async function stamp() {
    setPending(true);
    setError("");
    setDone("");
    try {
      const result = await addStamp({ membershipId: match.membershipId, expectedStamps: match.stamps });
      setDone(`Sello agregado. Ahora tiene ${result.stamps} de ${total}.`);
    } catch (error) {
      setError(error instanceof ConvexError && typeof error.data === "string"
        ? error.data : "No pudimos agregar el sello. Intenta de nuevo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="station-target" aria-label={`Tarjeta de ${match.customerName}`}>
      <div className="station-customer">
        <strong>{match.customerName}</strong>
        {match.code && <span>{formatMemberCode(match.code)}</span>}
      </div>
      <LoyaltyCard compact card={design.details} stamps={stamps} redeemed={match.redeemedPrizes}
        member={match.customerName} play={play}
        art={{ logo: design.logoUrl, background: design.backgroundUrl, stampLogo: design.stampLogoUrl }} />
      <p className="station-note">{nextStepText(design.details, stamps, match.redeemedPrizes, "staff")}</p>
      {done && <p className="station-added" role="status"><Check aria-hidden="true" /> {done}</p>}
      {error && <p className="station-error" role="alert">{error}</p>}
      {stampedToday && !full && <p className="station-note">Solo se puede dar un sello por día. Podrá ganar otro mañana.</p>}
      <Button type="button" size="lg" disabled={pending || full || stampedToday} onClick={stamp}>
        <Plus aria-hidden="true" />
        {full ? "Tarjeta completa" : stampedToday ? "Ya tiene su sello de hoy" : pending ? "Agregando…" : "Agregar 1 sello"}
      </Button>
      <PrizeDesk match={match} progress={progress} onScan={onScan} onError={setError}
        onDone={(message) => { setError(""); setDone(message); }} />
      {match.recentPrizes.length > 0 && (
        <div className="station-history">
          <h2>Últimas entregas</h2>
          <ul>
            {match.recentPrizes.map((prize) => (
              <li key={prize.id}>
                <strong>{prize.name}</strong>
                <span>{lastVisitText(prize.at, dayKey(openedAt))} · Entregó {prize.deliveredBy}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
