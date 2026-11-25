"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { ConvexError } from "convex/values";
import Link from "next/link";
import { useEffect, useState, type ComponentProps, type FormEvent } from "react";
import { PhoneInput } from "@/components/phone-input";
import { maximumPasswordLength, minimumPasswordLength, normalizePhone } from "@/lib/registration";
import { AuthShell } from "../auth-shell";

type Role = "owner" | "staff" | "client";
type Mode = "login" | "signup";

function Field({ label, name, hint, ...props }: ComponentProps<"input"> & {
  label: string;
  name: string;
  hint?: string;
}) {
  return (
    <div className="field-group">
      <label className="field-label" htmlFor={name}>{label} *</label>
      <input id={name} name={name} className="field-input" required
        aria-describedby={hint ? `${name}-hint` : undefined} {...props} />
      {hint && <div className="field-hint" id={`${name}-hint`}>{hint}</div>}
    </div>
  );
}

function authError(error: unknown, mode: Mode) {
  if (error instanceof ConvexError && typeof error.data === "string") return error.data;
  if (error instanceof Error) {
    // The Next.js auth proxy forwards Convex errors as plain Error messages.
    const validation = error.message.match(/Uncaught ConvexError: ([^\n]+)/);
    if (validation) return validation[1];
    if (error.message.includes("already exists")) return "Ese correo ya tiene una cuenta. Inicia sesión.";
    if (/InvalidAccountId|InvalidSecret|Invalid credentials/.test(error.message)) {
      return "El correo o la contraseña son incorrectos.";
    }
    if (/TooManyFailedAttempts/.test(error.message)) return "Demasiados intentos. Intenta más tarde.";
  }
  return mode === "signup"
    ? "No pudimos crear la cuenta. Intenta de nuevo."
    : "No pudimos iniciar sesión. Intenta de nuevo.";
}

export function AuthForm({ mode, initialRole, businessId }: {
  mode: Mode;
  initialRole: Role;
  /** The business whose QR the customer scanned; its card is added once they're in. */
  businessId?: string | null;
}) {
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [role, setRole] = useState<Role>(initialRole);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [phone, setPhone] = useState("");
  const signup = mode === "signup";
  const client = role === "client";

  useEffect(() => {
    if (isAuthenticated) window.location.replace(businessId ? `/cuenta?negocio=${businessId}` : "/cuenta");
  }, [isAuthenticated, businessId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    setError("");
    if (signup && client && !normalizePhone(String(data.get("phone") ?? ""))) {
      setError("Escribe un número válido de 10 dígitos o incluye el prefijo internacional.");
      return;
    }

    setPending(true);
    data.set("flow", signup ? "signUp" : "signIn");
    if (signup) data.set("role", role);

    try {
      const { signingIn } = await signIn("password", data);
      if (!signingIn) {
        setError("El acceso no se completó. Intenta de nuevo.");
        setPending(false);
      }
    } catch (err) {
      setError(authError(err, mode));
      setPending(false);
    }
  }

  const accessPath = client ? "/clientes" : "/auth";
  const roleParam = role === "staff" ? "&role=staff" : "";
  const businessParam = client && businessId ? `&negocio=${businessId}` : "";
  const submitLabel = !signup ? "Iniciar sesión" : role === "staff" ? "Unirme a mi equipo" : "Crear cuenta";

  const form = (
    <>
      <nav className="tab-bar" aria-label="Acceso a Maat">
        <Link className="tab-btn" href={`${accessPath}?tab=login${roleParam}${businessParam}`} aria-current={!signup ? "page" : undefined}>Iniciar sesión</Link>
        <Link className="tab-btn" href={`${accessPath}?tab=signup${roleParam}${businessParam}`} aria-current={signup ? "page" : undefined}>Crear cuenta</Link>
      </nav>
      {!client && <h1 className="auth-title">{signup ? "Crea tu cuenta" : "Bienvenido de vuelta"}</h1>}

      {signup && !client && (
        <div className="role-grid" role="group" aria-label="Tipo de cuenta">
          <button type="button" className="role-option" aria-pressed={role === "owner"} disabled={pending}
            onClick={() => { setRole("owner"); setError(""); }}>
            <span className="role-option-title">Soy Dueño</span>
            <span className="role-option-desc">Diseña tu tarjeta y ve cómo va tu negocio.</span>
          </button>
          <button type="button" className="role-option" aria-pressed={role === "staff"} disabled={pending}
            onClick={() => { setRole("staff"); setError(""); }}>
            <span className="role-option-title">Soy Staff</span>
            <span className="role-option-desc">Escanea y suma sellos.</span>
          </button>
        </div>
      )}

      <form onSubmit={submit} aria-busy={pending || isAuthenticated}>
        {signup && client && (
          <div className="field-group">
            <label className="field-label" htmlFor="phone">Número de celular *</label>
            <PhoneInput id="phone" name="phone" required autoComplete="tel" placeholder="55 1234 5678"
              value={phone} onValueChange={setPhone} />
          </div>
        )}
        {signup && <Field name="name" label="Nombre completo" autoComplete="name"
          placeholder="Ej. Sofía Mendoza" minLength={2} maxLength={100} />}
        {signup && role === "owner" &&
          <Field key="businessName" name="businessName" label="Nombre de tu negocio" autoComplete="organization"
            placeholder="Ej. Panadería Sol" minLength={2} maxLength={100} />}
        {signup && role === "staff" &&
          <Field key="inviteCode" name="inviteCode" label="Código de invitación del negocio"
            className="field-input code-input" autoComplete="off" autoCapitalize="characters" spellCheck={false}
            placeholder="Pega el código de tu negocio" maxLength={64} hint="Te lo da el dueño." />}
        <Field name="email" label="Correo electrónico" type="email" autoComplete="username"
          placeholder="sofia@ejemplo.mx" maxLength={254} />
        <Field name="password" label="Contraseña" type="password"
          autoComplete={signup ? "new-password" : "current-password"} maxLength={maximumPasswordLength}
          minLength={signup ? minimumPasswordLength : undefined}
          placeholder={signup ? `Mínimo ${minimumPasswordLength} caracteres` : "••••••••"} />
        {error && <p className="field-error" role="alert">{error}</p>}
        <button type="submit" className="btn-submit" disabled={pending || isAuthenticated || isLoading}>
          {pending || isAuthenticated ? "Conectando…" : submitLabel}
        </button>
      </form>

      {!client && (
        <div className="quick-links">
          <Link href={signup ? "/clientes" : "/clientes?tab=login"}>Acceso para clientes</Link>
        </div>
      )}
    </>
  );

  return client ? form : <AuthShell role={role}>{form}</AuthShell>;
}
