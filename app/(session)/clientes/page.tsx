import { fetchQuery } from "convex/nextjs";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { cache, Suspense } from "react";
import { Brand } from "@/app/brand";
import { InstallApp } from "@/components/pwa/install-app";
import { api } from "@/convex/_generated/api";
import { parseBusinessId } from "@/lib/join-link";
import { AuthForm } from "../auth/auth-form";
import { LoyaltyCard } from "../cuenta/loyalty-card";
import { SessionProvider } from "../session-provider";
import "./clientes.css";

export const metadata: Metadata = {
  title: "Mis tarjetas",
  description: "Reúne las tarjetas de lealtad de tus negocios favoritos en Maat.",
};

const cards = [
  { theme: "bakery", name: "Panadería Sol", branch: "Roma Norte", stamps: 4, target: 12 },
  { theme: "coffee", name: "Molino Café", branch: "Condesa", stamps: 2, target: 8 },
  { theme: "tacos", name: "Taquería El Farol", branch: "Narvarte", stamps: 3, target: 6 },
];

// The art and the form both need the scanned business; one request fetches it once.
const scannedBusiness = cache(async (organizationId: string) => {
  await connection();
  return fetchQuery(api.clients.businesses.publicCard, { organizationId });
});

export default function ClientsPage(props: PageProps<"/clientes">) {
  return (
    <div className="auth-page client-entry">
      <div className="maat-relief" aria-hidden="true">
        <Image src="/maat/hathor.webp" alt="" width={1536} height={1024}
          sizes="(max-width: 876px) 130vw, 1140px" loading="eager" className="is-active" />
      </div>
      <main className="client-entry-grid">
        <header className="client-entry-header">
          <Link href="/clientes" className="brand-link" aria-label="Maat, clientes"><Brand /></Link>
          <div className="client-entry-actions">
            <Suspense>
              <EntryInstall searchParams={props.searchParams} />
            </Suspense>
            <Link href="/" className="back-link">¿Tienes un negocio?</Link>
          </div>
        </header>
        <Suspense fallback={<div className="client-card-fan" />}>
          <EntryArt searchParams={props.searchParams} />
        </Suspense>
        <section className="client-access" aria-labelledby="client-entry-title">
          <Suspense fallback={<p className="auth-status" role="status">Cargando acceso…</p>}>
            <ClientAccess searchParams={props.searchParams} />
          </Suspense>
        </section>
      </main>
    </div>
  );
}

/**
 * Not offered right after a scan: the installed app opens on its own start page, which would drop
 * the scanned business. The wallet offers it once the card is saved.
 */
async function EntryInstall({ searchParams }: Pick<PageProps<"/clientes">, "searchParams">) {
  return (await searchParams).negocio === undefined ? <InstallApp /> : null;
}

/** After a scan, the scanned business's own card; otherwise a few sample cards. */
async function EntryArt({ searchParams }: Pick<PageProps<"/clientes">, "searchParams">) {
  const businessId = parseBusinessId((await searchParams).negocio);
  const business = businessId ? await scannedBusiness(businessId) : null;
  if (business) {
    return (
      <div className="client-card-scanned">
        <LoyaltyCard compact card={business.details} stamps={0} member="Tú"
          art={{ logo: business.logoUrl, background: business.backgroundUrl, stampLogo: business.stampLogoUrl }} />
      </div>
    );
  }
  return (
    <div className="client-card-fan" aria-hidden="true">
      {cards.map(({ theme, name, branch, stamps, target }) => (
        <div key={theme} className={`client-card client-card--${theme}`}>
          <div className="client-card-heading">
            <div><strong>{name}</strong><span>{branch}</span></div>
            <div><strong>{stamps}/{target}</strong><span>sellos</span></div>
          </div>
          <div className="client-card-stamps">
            {Array.from({ length: target }, (_, index) => (
              <span key={index} className={index < stamps ? "is-filled" : undefined} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

async function ClientAccess({ searchParams }: Pick<PageProps<"/clientes">, "searchParams">) {
  const params = await searchParams;
  const mode = params.tab === "login" ? "login" : "signup";
  const businessId = parseBusinessId(params.negocio);
  const business = businessId ? await scannedBusiness(businessId) : null;
  const title = !business ? "Tus tarjetas, en un solo lugar."
    : `${mode === "signup" ? "Regístrate" : "Inicia sesión"} y guarda tu tarjeta de ${business.details.displayName}.`;
  return (
    <>
      <h1 className="client-entry-title" id="client-entry-title">{title}</h1>
      {params.negocio !== undefined && !business && (
        <p className="field-error" role="alert">Este código QR no corresponde a un negocio en Maat. Aún puedes entrar a tus tarjetas.</p>
      )}
      <SessionProvider>
        <AuthForm key={mode} mode={mode} initialRole="client" businessId={business ? businessId : null} />
      </SessionProvider>
    </>
  );
}
