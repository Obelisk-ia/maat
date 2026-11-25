"use client";

import type { FunctionReturnType } from "convex/server";
import { Bell, ChartNoAxesColumn, CreditCard, LogOut, QrCode, ScanLine, Settings, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { api } from "@/convex/_generated/api";
import { Brand } from "@/app/brand";
import { InstallApp } from "@/components/pwa/install-app";
import { Button } from "@/components/ui/button";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel,
  SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { defaultBusinessCard } from "@/lib/business-card";
import { Campaigns } from "./campaigns/campaigns";
import { CardStudio } from "./card-studio";
import { Dashboard } from "./dashboard/dashboard";
import { QrStudio } from "./qr-studio";
import { RewardSettings } from "./reward-settings";
import { StampStation } from "./stamp-station";
import { TeamInvite } from "./team-invite";
import { signOutAccount } from "./sign-out";

type Owner = Extract<NonNullable<FunctionReturnType<typeof api.users.viewer>>, { role: "owner" }>;
type View = "dashboard" | "kiosco" | "tarjeta" | "qr" | "avisos" | "equipo" | "ajustes";

const viewTitles: Record<View, string> = {
  dashboard: "Dashboard", kiosco: "Kiosco", tarjeta: "Tarjeta de lealtad", qr: "Código QR", avisos: "Campañas push", equipo: "Equipo", ajustes: "Ajustes",
};

const navigation = [
  { label: "Dashboard", icon: ChartNoAxesColumn, view: "dashboard" },
  { label: "Kiosco", icon: ScanLine, view: "kiosco" },
  { label: "Tarjeta de lealtad", icon: CreditCard, view: "tarjeta" },
  { label: "Código QR", icon: QrCode, view: "qr" },
  { label: "Campañas push", icon: Bell, view: "avisos" },
  { label: "Equipo", icon: Users, view: "equipo" },
  { label: "Ajustes", icon: Settings, view: "ajustes" },
] satisfies { label: string; icon: typeof Bell; view?: View }[];

function OwnerSidebar({ user, view, onView }: { user: Owner; view: View; onView: (view: View) => void }) {
  const { setOpenMobile } = useSidebar();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    setSigningOut(true);
    setError("");
    try {
      await signOutAccount("/auth?tab=login");
    } catch {
      setError("No pudimos cerrar tu sesión.");
      setSigningOut(false);
    }
  }

  return (
    <Sidebar>
      <SidebarHeader className="px-5 pt-6 pb-5">
        <Link href="/" aria-label="Maat, inicio" className="owner-brand">
          <Brand />
        </Link>
        <span className="truncate text-xs font-medium text-muted-foreground">{user.businessName}</span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="px-3">
          <SidebarGroupLabel className="px-2 text-muted-foreground">Gestión del negocio</SidebarGroupLabel>
          <nav aria-label="Navegación del dueño">
            <SidebarMenu className="m-0 list-none gap-1 p-0">
              {navigation.map(({ label, icon: Icon, view: target }) => (
                <SidebarMenuItem key={label}>
                  <SidebarMenuButton type="button" size="lg" isActive={target === view}
                    aria-current={target === view ? "page" : undefined} disabled={!target}
                    onClick={target ? () => { onView(target); setOpenMobile(false); } : undefined}>
                    <Icon aria-hidden="true" />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </nav>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-3 border-t border-sidebar-border px-5 py-5">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold">{user.name}</div>
          <div className="text-xs text-muted-foreground">Dueño</div>
        </div>
        <Button type="button" variant="outline" onClick={logout} disabled={signingOut} className="justify-start">
          <LogOut aria-hidden="true" /> Cerrar sesión
        </Button>
        {error && <p className="m-0 text-xs text-destructive" role="alert">{error}</p>}
      </SidebarFooter>
    </Sidebar>
  );
}

export function OwnerWorkspace({ user }: { user: Owner }) {
  // A new business designs its card first; after that, the owner lands on the numbers.
  const [view, setView] = useState<View>(() => user.card ? "dashboard" : "tarjeta");

  return (
    <SidebarProvider className="owner-workspace">
      <OwnerSidebar user={user} view={view} onView={setView} />
      <SidebarInset className="owner-main min-w-0">
        <div aria-hidden="true" className="owner-relief">
          <Image src="/maat/maat.png" width={1672} height={941} sizes="(max-width: 900px) 80vw, 900px" alt="" />
        </div>
        <header className="owner-toolbar">
          <SidebarTrigger title="Alternar navegación" aria-label="Alternar navegación" />
          <span className="truncate font-bold">{user.businessName}</span>
          <span className="owner-toolbar-location">{viewTitles[view]}</span>
          <InstallApp className="owner-toolbar-install" />
        </header>
        <div className="owner-content">
          {view === "dashboard" && <Dashboard onEditCard={() => setView("tarjeta")} />}
          {view === "ajustes" && <RewardSettings />}
          {view === "avisos" && <Campaigns />}
          {/* Unmounted when away, so no customer stays on screen. */}
          {view === "kiosco" && (
            <>
              <div className="owner-heading">
                <h1>Kiosco</h1>
                <p>Escanea la tarjeta de tu cliente, o búscala por su celular o código, para agregar su sello o entregar su premio.</p>
              </div>
              <StampStation />
            </>
          )}
          <div hidden={view !== "tarjeta"}>
            <CardStudio initial={user.card ?? defaultBusinessCard(user.businessName)}
              logoUrl={user.logoUrl} backgroundUrl={user.backgroundUrl}
              stampLogoUrl={user.stampLogoUrl} coverUrl={user.coverUrl} hasSavedCard={user.card !== null} />
          </div>
          <div hidden={view !== "qr"}>
            <QrStudio organizationId={user.organizationId} cardLogoUrl={user.logoUrl}
              card={user.card ?? defaultBusinessCard(user.businessName)} />
          </div>
          <div hidden={view !== "equipo"}>
            <TeamInvite inviteCode={user.inviteCode} />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
