import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthShell } from "../auth-shell";
import { SessionProvider } from "../session-provider";
import { AuthForm } from "./auth-form";

export const metadata: Metadata = { title: "Acceso" };

export default function AuthPage(props: PageProps<"/auth">) {
  return (
    <Suspense fallback={<AuthShell><p role="status">Cargando acceso…</p></AuthShell>}>
      <BusinessAccess searchParams={props.searchParams} />
    </Suspense>
  );
}

async function BusinessAccess({ searchParams }: Pick<PageProps<"/auth">, "searchParams">) {
  const params = await searchParams;
  const mode = params.tab === "login" ? "login" : "signup";
  if (params.role === "client") redirect(`/clientes?tab=${mode}`);
  const role = params.role === "staff" ? "staff" : "owner";
  return (
    <SessionProvider>
      <AuthForm key={`${mode}-${role}`} mode={mode} initialRole={role} />
    </SessionProvider>
  );
}
