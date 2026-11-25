import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { api } from "@/convex/_generated/api";
import { joinPath, parseBusinessId } from "@/lib/join-link";
import { AuthShell } from "../auth-shell";
import { SessionProvider } from "../session-provider";
import { BusinessAccountNotice, StaffKiosk } from "./account";
import { OwnerWorkspace } from "./owner-workspace";
import { Wallet } from "./wallet/wallet";
import "./owner.css";

export const metadata: Metadata = { title: "Mi cuenta" };

export default function AccountPage(props: PageProps<"/cuenta">) {
  return (
    <Suspense fallback={<AuthShell><p role="status">Cargando tu cuenta…</p></AuthShell>}>
      <AccountContent searchParams={props.searchParams} />
    </Suspense>
  );
}

async function AccountContent({ searchParams }: Pick<PageProps<"/cuenta">, "searchParams">) {
  await connection();
  const params = await searchParams;
  // Set when the visitor arrived through a business's QR.
  const businessId = parseBusinessId(params.negocio);
  const token = await convexAuthNextjsToken();
  // The installed app is mostly the customers'. Every account can sign in from their page.
  const signedOutPath = businessId ? joinPath(businessId)
    : params.app !== undefined ? "/clientes?tab=login" : "/auth?tab=login";
  if (!token) redirect(signedOutPath);

  const user = await fetchQuery(api.users.viewer, {}, { token });
  if (!user) redirect(signedOutPath);

  if (user.role === "client") {
    const cards = await fetchQuery(api.memberships.mine, {}, { token });
    return (
      <SessionProvider>
        <Wallet customer={{ name: user.name, email: user.email, phone: user.phone }} initialCards={cards} joinId={businessId} />
      </SessionProvider>
    );
  }

  if (businessId) return <BusinessAccountNotice role={user.role} businessId={businessId} />;

  return (
    <SessionProvider>
      {user.role === "owner" ? <OwnerWorkspace user={user} /> : <StaffKiosk user={user} />}
    </SessionProvider>
  );
}
