"use client";

import Link from "next/link";
import { platformOf, pushHelp, type PushTrouble } from "@/lib/push-help";
import { CopyLink } from "./copy-link";
import { installState } from "./install-store";
import "./install-app.css";
import "./push-help.css";

/** The steps for this phone, with ways to check again, go elsewhere or look into it. */
export function PushHelp({ trouble, busy, onRecheck }: {
  trouble: PushTrouble;
  busy: boolean;
  onRecheck: () => void;
}) {
  // Only rendered in the browser, once the phone's state is known.
  const help = pushHelp(trouble, platformOf(navigator), installState() === "app");
  return (
    <div className="push-help">
      {help.steps.length > 0 && <ol>{help.steps.map((step) => <li key={step}>{step}</li>)}</ol>}
      {help.recheck && (
        <button type="button" className="push-help-recheck" disabled={busy} onClick={onRecheck}>
          Ya los permití, revisar
        </button>
      )}
      {help.note && <p>{help.note}</p>}
      {help.copyLink && <CopyLink />}
      <Link href="/diagnostico" className="push-help-check">Revisar este teléfono</Link>
    </div>
  );
}
