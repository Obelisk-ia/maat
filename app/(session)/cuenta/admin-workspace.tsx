"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ConvexError } from "convex/values";
import {
  CalendarClock, CheckCircle2, Copy, CreditCard, KeyRound, LogOut, Power, Search, ShieldCheck, XCircle,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { Brand } from "@/app/brand";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ChangePasswordDialog } from "./change-password-dialog";
import { RecoveryKitDialog } from "./recovery-kit-dialog";
import { signOutAccount } from "./sign-out";
import "./admin.css";

type AdminUser = Extract<NonNullable<FunctionReturnType<typeof api.users.viewer>>, { role: "admin" }>;
type OrganizationRow = FunctionReturnType<typeof api.admin.listOrganizations>[number];
type Filter = "all" | "inactive" | "active" | "due" | "unpaid";

const DAY_MS = 24 * 60 * 60 * 1000;
const BILLING_CYCLE_MS = 30 * DAY_MS;
const DUE_SOON_DAYS = 5;

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function toDateInputValue(timestamp: number) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateInputValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return Date.now();
  // Midday local time avoids timezone rollbacks across midnight.
  return new Date(year, month - 1, day, 12, 0, 0).getTime();
}

type PaymentState =
  | { kind: "unpaid"; label: string }
  | { kind: "overdue"; label: string; detail: string }
  | { kind: "due-soon"; label: string; detail: string }
  | { kind: "paid"; label: string; detail: string };

function paymentStateOf(nextPaymentDueAt: number | null, now: number): PaymentState {
  if (nextPaymentDueAt === null) {
    return { kind: "unpaid", label: "No pagado" };
  }
  const days = Math.ceil((nextPaymentDueAt - now) / DAY_MS);
  if (days < 0) {
    const overdue = Math.abs(days);
    return {
      kind: "overdue",
      label: "No pagado · Vencido",
      detail: overdue === 1 ? "hace 1 día" : `hace ${overdue} días`,
    };
  }
  if (days === 0) {
    return { kind: "due-soon", label: "Vence hoy", detail: "hoy" };
  }
  if (days <= DUE_SOON_DAYS) {
    return {
      kind: "due-soon",
      label: "Por vencer",
      detail: days === 1 ? "en 1 día" : `en ${days} días`,
    };
  }
  return {
    kind: "paid",
    label: "Pagado",
    detail: `en ${days} días`,
  };
}

function errorText(error: unknown, fallback: string) {
  if (error instanceof ConvexError && typeof error.data === "string") return error.data;
  return fallback;
}

function PaymentDialog({
  organization,
  onClose,
}: {
  organization: OrganizationRow | null;
  onClose: () => void;
}) {
  const recordPayment = useMutation(api.admin.recordPayment);
  const history = useQuery(
    api.admin.listOrganizationPayments,
    organization ? { organizationId: organization.organizationId } : "skip",
  );
  const [dateValue, setDateValue] = useState(() => toDateInputValue(Date.now()));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const paidAtMs = fromDateInputValue(dateValue);
  const previewNextDueAt = organization
    ? (organization.nextPaymentDueAt !== null
      ? Math.max(paidAtMs, organization.nextPaymentDueAt)
      : paidAtMs) + BILLING_CYCLE_MS
    : paidAtMs + BILLING_CYCLE_MS;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization || saving) return;
    setSaving(true);
    setError("");
    try {
      await recordPayment({
        organizationId: organization.organizationId,
        paidAt: paidAtMs,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      onClose();
    } catch (err) {
      setError(errorText(err, "No pudimos registrar el pago. Intenta de nuevo."));
      setSaving(false);
    }
  }

  return (
    <Dialog open={organization !== null} onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <DialogContent>
        {organization && (
          <>
            <DialogHeader>
              <DialogTitle>
                {organization.paymentCount === 0 ? "Registrar primer pago" : "Confirmar pago mensual"}
              </DialogTitle>
              <DialogDescription>
                {organization.businessName}
                {organization.ownerName ? ` · ${organization.ownerName}` : ""}
              </DialogDescription>
            </DialogHeader>

            <form className="admin-dialog-form" onSubmit={handleSubmit}>
              <label className="admin-dialog-field">
                <span>Fecha de pago</span>
                <Input
                  type="date"
                  required
                  value={dateValue}
                  onChange={(event) => setDateValue(event.target.value)}
                />
              </label>

              <label className="admin-dialog-field">
                <span>Nota (opcional)</span>
                <Input
                  type="text"
                  maxLength={200}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Ej. Transferencia SPEI, efectivo…"
                />
              </label>

              <div className="admin-dialog-preview">
                Próximo cobro programado (+30 días):{" "}
                <strong>{dateFormatter.format(previewNextDueAt)}</strong>
              </div>

              {error && <p className="admin-error" role="alert">{error}</p>}

              <DialogFooter>
                <Button type="button" variant="outline" disabled={saving} onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  <CreditCard aria-hidden="true" />
                  {saving ? "Guardando…" : "Confirmar pago"}
                </Button>
              </DialogFooter>
            </form>

            {history && history.length > 0 && (
              <div className="admin-history">
                <p className="admin-history-title">Historial reciente</p>
                <ul className="admin-history-list">
                  {history.map((item) => (
                    <li key={item.id}>
                      <strong>Pagado: {dateFormatter.format(item.paidAt)}</strong>
                      <span>Siguiente: {dateFormatter.format(item.nextDueAt)}</span>
                      {item.note && <span className="admin-history-note">{item.note}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AdminResetCodeDialog({
  open,
  initialEmail,
  onClose,
}: {
  open: boolean;
  initialEmail: string;
  onClose: () => void;
}) {
  const issueCode = useMutation(api.admin.issueResetCode);
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [issued, setIssued] = useState<{ code: string; name: string; email: string; role: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setCopied(false);
    try {
      const result = await issueCode({ email });
      setIssued({ code: result.code, name: result.name, email: result.email, role: result.role });
    } catch (err) {
      setError(errorText(err, "No pudimos generar el código de recuperación."));
    } finally {
      setBusy(false);
    }
  }

  async function copyCode() {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.code);
      setCopied(true);
    } catch {
      setError("Copia el código manualmente.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !busy) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generar código de recuperación</DialogTitle>
          <DialogDescription>
            Emite un código temporal de 6 dígitos (15 minutos, un solo uso) para cualquier dueño, staff o cliente.
          </DialogDescription>
        </DialogHeader>
        <form className="admin-dialog-form" onSubmit={handleSubmit}>
          <label className="admin-dialog-field">
            <span>Correo de la cuenta</span>
            <Input
              type="email"
              required
              value={email}
              onChange={(event) => { setEmail(event.target.value); setIssued(null); setError(""); }}
              placeholder="correo@ejemplo.mx"
            />
          </label>
          {error && <p className="admin-error" role="alert">{error}</p>}
          {issued && (
            <div className="admin-dialog-preview grid gap-2">
              <div>
                <strong>{issued.name}</strong> ({issued.email} · {issued.role})
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <code className="rounded-lg bg-background px-3 py-1.5 font-mono text-xl font-extrabold tracking-widest">
                  {issued.code}
                </code>
                <Button type="button" variant="outline" size="sm" onClick={copyCode}>
                  <Copy aria-hidden="true" /> {copied ? "Copiado" : "Copiar"}
                </Button>
              </div>
              <span className="text-xs text-muted-foreground">
                Válido por 15 minutos. El usuario debe ingresarlo en «¿Olvidaste tu contraseña?» (en clientes, pestaña «Tengo un código»).
              </span>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
              Cerrar
            </Button>
            <Button type="submit" disabled={busy}>
              <KeyRound aria-hidden="true" />
              {busy ? "Generando…" : "Generar código"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdminWorkspace({ user }: { user: AdminUser }) {
  const organizations = useQuery(api.admin.listOrganizations);
  const setOrganizationActive = useMutation(api.admin.setOrganizationActive);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [pendingId, setPendingId] = useState<Id<"organizations"> | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<OrganizationRow | null>(null);
  const [resetEmailTarget, setResetEmailTarget] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [now] = useState(() => Date.now());

  const counts = useMemo(() => {
    const list = organizations ?? [];
    let active = 0;
    let due = 0;
    let unpaid = 0;
    for (const org of list) {
      if (org.active) active++;
      const state = paymentStateOf(org.nextPaymentDueAt, now);
      if (state.kind === "overdue" || state.kind === "due-soon") due++;
      if (state.kind === "unpaid") unpaid++;
    }
    return { total: list.length, active, inactive: list.length - active, due, unpaid };
  }, [organizations, now]);

  const filtered = useMemo(() => {
    const list = organizations ?? [];
    const needle = search.trim().toLowerCase();
    return list.filter((org) => {
      if (filter === "active" && !org.active) return false;
      if (filter === "inactive" && org.active) return false;
      if (filter === "due") {
        const state = paymentStateOf(org.nextPaymentDueAt, now);
        if (state.kind !== "overdue" && state.kind !== "due-soon") return false;
      }
      if (filter === "unpaid" && org.nextPaymentDueAt !== null) return false;
      if (!needle) return true;
      return (
        org.businessName.toLowerCase().includes(needle) ||
        (org.ownerName?.toLowerCase().includes(needle) ?? false) ||
        (org.ownerEmail?.toLowerCase().includes(needle) ?? false)
      );
    });
  }, [organizations, filter, search, now]);

  async function toggleActive(organizationId: Id<"organizations">, nextActive: boolean) {
    setPendingId(organizationId);
    setError("");
    try {
      await setOrganizationActive({ organizationId, active: nextActive });
    } catch (err) {
      setError(errorText(err, "No pudimos actualizar el estado del negocio. Intenta de nuevo."));
    } finally {
      setPendingId(null);
    }
  }

  async function logout() {
    setSigningOut(true);
    setError("");
    try {
      await signOutAccount("/auth?tab=login");
    } catch {
      setError("No pudimos cerrar tu sesión. Intenta de nuevo.");
      setSigningOut(false);
    }
  }

  return (
    <div className="admin-shell">
      <header className="admin-bar">
        <Link href="/" aria-label="Maat, inicio" className="admin-brand">
          <Brand />
        </Link>
        <div className="admin-who">
          <strong>{user.name}</strong>
          <span>Administrador · {user.email}</span>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setResetEmailTarget("")}>
          <KeyRound aria-hidden="true" /> <span>Código de acceso</span>
        </Button>
        <RecoveryKitDialog label="Recuperación" variant="outline" size="sm" />
        <ChangePasswordDialog variant="outline" size="sm" />
        <Button type="button" variant="outline" size="sm" disabled={signingOut} onClick={logout}>
          <LogOut aria-hidden="true" /> <span>Cerrar sesión</span>
        </Button>
      </header>

      <main className="admin-main">
        <div className="owner-heading">
          <h1>Panel de administración</h1>
          <p>
            Activa o desactiva cuentas de negocios y lleva el control de sus pagos cada 30 días. Cuando un negocio
            está inactivo, sus cuentas de staff también quedan desactivadas.
          </p>
        </div>

        <section className="admin-stats" aria-label="Resumen de negocios">
          <div className="admin-stat">
            <span className="admin-stat-label">Total de negocios</span>
            <span className="admin-stat-value">{organizations ? counts.total : "—"}</span>
          </div>
          <div className="admin-stat">
            <span className="admin-stat-label">Activos</span>
            <span className="admin-stat-value admin-stat-value--active">{organizations ? counts.active : "—"}</span>
          </div>
          <div className="admin-stat">
            <span className="admin-stat-label">Inactivos</span>
            <span className="admin-stat-value admin-stat-value--inactive">{organizations ? counts.inactive : "—"}</span>
          </div>
          <div className="admin-stat">
            <span className="admin-stat-label">Pagos por cobrar</span>
            <span className="admin-stat-value admin-stat-value--due">{organizations ? counts.due : "—"}</span>
          </div>
        </section>

        <div className="admin-controls">
          <div className="admin-filters" role="group" aria-label="Filtrar negocios">
            <button type="button" className="admin-filter" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
              Todos ({counts.total})
            </button>
            <button type="button" className="admin-filter" aria-pressed={filter === "inactive"} onClick={() => setFilter("inactive")}>
              Inactivos ({counts.inactive})
            </button>
            <button type="button" className="admin-filter" aria-pressed={filter === "active"} onClick={() => setFilter("active")}>
              Activos ({counts.active})
            </button>
            <button type="button" className="admin-filter" aria-pressed={filter === "due"} onClick={() => setFilter("due")}>
              Por cobrar ({counts.due})
            </button>
            <button type="button" className="admin-filter" aria-pressed={filter === "unpaid"} onClick={() => setFilter("unpaid")}>
              Sin pago ({counts.unpaid})
            </button>
          </div>

          <div className="admin-search">
            <Search aria-hidden="true" />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar negocio, dueño o correo…"
              aria-label="Buscar negocio, dueño o correo"
            />
          </div>
        </div>

        {error && <p className="admin-error" role="alert">{error}</p>}

        {organizations === undefined ? (
          <div className="admin-empty" role="status">Cargando negocios…</div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty">
            {organizations.length === 0
              ? "Todavía no hay negocios registrados."
              : "No hay negocios que coincidan con ese filtro."}
          </div>
        ) : (
          <div className="admin-list">
            {filtered.map((org) => {
              const busy = pendingId === org.organizationId;
              const payment = paymentStateOf(org.nextPaymentDueAt, now);
              return (
                <article
                  key={org.organizationId}
                  className={`admin-row admin-row--${payment.kind}${org.active ? "" : " admin-row--inactive"}`}
                >
                  <div className="admin-row-info">
                    <div className="admin-row-title">
                      <h2>{org.businessName}</h2>
                      <span className={`admin-badge ${org.active ? "admin-badge--active" : "admin-badge--inactive"}`}>
                        {org.active
                          ? <><CheckCircle2 size={14} aria-hidden="true" /> Activo</>
                          : <><XCircle size={14} aria-hidden="true" /> Inactivo</>}
                      </span>
                      <span className={`admin-badge admin-badge--${payment.kind}`}>
                        <CalendarClock size={14} aria-hidden="true" /> {payment.label}
                      </span>
                    </div>
                    <p className="admin-row-owner">
                      {org.ownerName ? <strong>{org.ownerName}</strong> : <strong>Sin dueño</strong>}
                      {org.ownerEmail && <span> · {org.ownerEmail}</span>}
                    </p>
                    <div className="admin-row-meta">
                      <span>Creado el {dateFormatter.format(org.createdAt)}</span>
                      <span>{org.staffCount} staff</span>
                      <span>{org.customerCount} {org.customerCount === 1 ? "cliente" : "clientes"}</span>
                      {org.paymentCount > 0 && (
                        <span>{org.paymentCount} {org.paymentCount === 1 ? "pago registrado" : "pagos registrados"}</span>
                      )}
                    </div>
                    <div className="admin-row-billing">
                      {org.lastPaidAt !== null && org.nextPaymentDueAt !== null ? (
                        <>
                          <div>
                            <span>Último pago: </span>
                            <strong>{dateFormatter.format(org.lastPaidAt)}</strong>
                          </div>
                          <div>
                            <span>Próximo pago: </span>
                            <strong>{dateFormatter.format(org.nextPaymentDueAt)}</strong>
                            {" "}
                            <span>({payment.kind !== "unpaid" ? payment.detail : ""})</span>
                          </div>
                        </>
                      ) : (
                        <span>Aún no se ha registrado el primer pago de este negocio.</span>
                      )}
                    </div>
                  </div>
                  <div className="admin-row-actions">
                    {org.ownerEmail && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => setResetEmailTarget(org.ownerEmail!)}
                      >
                        <KeyRound aria-hidden="true" />
                        Código
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant={payment.kind === "overdue" || payment.kind === "due-soon" ? "default" : "outline"}
                      disabled={busy}
                      onClick={() => setPaymentTarget(org)}
                    >
                      <CreditCard aria-hidden="true" />
                      {org.paymentCount === 0 ? "Registrar primer pago" : "Confirmar pago"}
                    </Button>
                    {org.active ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busy}
                        onClick={() => toggleActive(org.organizationId, false)}
                      >
                        <Power aria-hidden="true" />
                        {busy ? "Desactivando…" : "Desactivar"}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        disabled={busy}
                        onClick={() => toggleActive(org.organizationId, true)}
                      >
                        <ShieldCheck aria-hidden="true" />
                        {busy ? "Activando…" : "Activar cuenta"}
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <PaymentDialog
        key={paymentTarget?.organizationId ?? "closed"}
        organization={paymentTarget}
        onClose={() => setPaymentTarget(null)}
      />

      <AdminResetCodeDialog
        key={resetEmailTarget === null ? "reset-closed" : `reset-${resetEmailTarget}`}
        open={resetEmailTarget !== null}
        initialEmail={resetEmailTarget ?? ""}
        onClose={() => setResetEmailTarget(null)}
      />
    </div>
  );
}
