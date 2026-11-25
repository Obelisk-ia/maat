import { fetchQuery } from "convex/nextjs";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { api } from "@/convex/_generated/api";
import { PushCheck } from "./push-check";
import "./diagnostico.css";

export const metadata: Metadata = { title: "Revisar avisos", robots: { index: false } };

export default function DiagnosticPage() {
  return (
    <main className="check">
      <Suspense fallback={<p role="status">Preparando la revisión…</p>}>
        <Check />
      </Suspense>
    </main>
  );
}

async function Check() {
  await connection();
  const { publicKey } = await fetchQuery(api.notifications.config, {});
  return <PushCheck publicKey={publicKey} />;
}
