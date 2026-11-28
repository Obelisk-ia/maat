"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useAction, useConvexAuth, useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import Link from "next/link";
import { useEffect, useState, type ComponentProps, type FormEvent } from "react";
import { PhoneInput } from "@/components/phone-input";
import { api } from "@/convex/_generated/api";
import { maximumPasswordLength, minimumPasswordLength, normalizePhone } from "@/lib/registration";
import { AuthShell } from "../auth-shell";

type Role = "owner" | "staff" | "client";
type Mode = "login" | "signup";
type ResetView = "none" | "push-request" | "code-reset";

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

function authError(error: unknown, mode: Mode, resetView: ResetView = "none") {
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
  if (resetView === "push-request") return "No pudimos enviar el código de recuperación. Intenta de nuevo.";
  if (resetView === "code-reset") return "No pudimos restablecer la contraseña. Revisa tu código e intenta de nuevo.";
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
  const requestPushReset = useMutation(api.account.requestPushResetCode);
  const resetWithCode = useAction(api.account.resetPasswordWithCode);
  const [role, setRole] = useState<Role>(initialRole);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [pending, setPending] = useState(false);
  const [phone, setPhone] = useState("");
  const [resetView, setResetView] = useState<ResetView>("none");
  const [resetEmail, setResetEmail] = useState("");
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

  async function submitPushResetRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim().toLowerCase();
    setError("");
    setInfo("");
    setPending(true);
    try {
      const result = await requestPushReset({ email });
      setResetEmail(email);
      if (result.sent) {
        setInfo("Enviamos un código de 6 dígitos como notificación push a tu teléfono. Vence en 15 minutos.");
        setResetView("code-reset");
      } else if (result.reason === "unavailable") {
        setError("Las notificaciones push no están configuradas en este servidor. Usa un código de respaldo (PDF) o pide un código al administrador.");
      } else {
        setError("No encontramos avisos push activados para ese correo. Para usar esta opción necesitas tener los avisos activados en tu teléfono, o usa «Tengo un código» (código de respaldo PDF o código de administrador).");
      }
    } catch (err) {
      setError(authError(err, mode, "push-request"));
    } finally {
      setPending(false);
    }
  }

  async function submitCodeReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? resetEmail).trim().toLowerCase();
    const code = String(data.get("code") ?? "").trim();
    const newPassword = String(data.get("newPassword") ?? "");
    const confirmPassword = String(data.get("confirmPassword") ?? "");
    setError("");
    setInfo("");

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }

    setPending(true);
    try {
      await resetWithCode({ email, code, newPassword });
      const { signingIn } = await signIn("password", {
        flow: "signIn",
        email,
        password: newPassword,
      });
      if (!signingIn) {
        setResetView("none");
        setPending(false);
      }
    } catch (err) {
      setError(authError(err, mode, "code-reset"));
      setPending(false);
    }
  }

  const accessPath = client ? "/clientes" : "/auth";
  const roleParam = role === "staff" ? "&role=staff" : "";
  const businessParam = client && businessId ? `&negocio=${businessId}` : "";
  const submitLabel = !signup ? "Iniciar sesión" : role === "staff" ? "Unirme a mi equipo" : "Crear cuenta";

  const resetForm = (
    <>
      {client ? <h2 className="auth-title">Recuperar contraseña</h2> : <h1 className="auth-title">Recuperar contraseña</h1>}
      {client && (
        <nav className="tab-bar" aria-label="Método de recuperación">
          <button
            type="button"
            className="tab-btn"
            aria-current={resetView === "push-request" ? "page" : undefined}
            onClick={() => { setResetView("push-request"); setError(""); setInfo(""); }}
          >
            Notificación push
          </button>
          <button
            type="button"
            className="tab-btn"
            aria-current={resetView === "code-reset" ? "page" : undefined}
            onClick={() => { setResetView("code-reset"); setError(""); setInfo(""); }}
          >
            Tengo un código
          </button>
        </nav>
      )}

      {resetView === "push-request" ? (
        <>
          <p className="field-hint" style={{ marginBottom: 16 }}>
            Te enviaremos un código de 6 dígitos por notificación push al teléfono donde tienes Maat. Necesitas haber activado los avisos previamente.
          </p>
          <form onSubmit={submitPushResetRequest} aria-busy={pending}>
            <Field name="email" label="Correo electrónico" type="email" autoComplete="username"
              defaultValue={resetEmail} placeholder="sofia@ejemplo.mx" maxLength={254} />
            {error && <p className="field-error" role="alert">{error}</p>}
            <button type="submit" className="btn-submit" disabled={pending || isLoading}>
              {pending ? "Enviando código…" : "Enviar código a mi teléfono"}
            </button>
          </form>
        </>
      ) : (
        <>
          <p className="field-hint" style={{ marginBottom: 16 }}>
            {info || (client
              ? "Usa el código que recibiste por notificación push, uno de tus códigos de respaldo (PDF) o un código temporal de administrador."
              : "Usa uno de tus códigos de respaldo (PDF) o pide un código temporal de 6 dígitos al dueño de tu negocio (si eres staff) o al administrador.")}
          </p>
          <form onSubmit={submitCodeReset} aria-busy={pending || isAuthenticated}>
            <Field name="email" label="Correo electrónico" type="email" autoComplete="username"
              defaultValue={resetEmail} placeholder="sofia@ejemplo.mx" maxLength={254} />
            <Field name="code" label="Código de recuperación" type="text" autoComplete="one-time-code"
              autoCapitalize="characters" spellCheck={false}
              placeholder="Ej. 123456 o ABCD-EFGH" maxLength={16} />
            <Field name="newPassword" label="Nueva contraseña" type="password" autoComplete="new-password"
              minLength={minimumPasswordLength} maxLength={maximumPasswordLength}
              placeholder={`Mínimo ${minimumPasswordLength} caracteres`} />
            <Field name="confirmPassword" label="Confirmar nueva contraseña" type="password" autoComplete="new-password"
              minLength={minimumPasswordLength} maxLength={maximumPasswordLength}
              placeholder="Repite tu nueva contraseña" />
            {error && <p className="field-error" role="alert">{error}</p>}
            <button type="submit" className="btn-submit" disabled={pending || isAuthenticated || isLoading}>
              {pending || isAuthenticated ? "Restableciendo…" : "Restablecer contraseña"}
            </button>
          </form>
        </>
      )}

      <div className="quick-links">
        <button type="button" className="underline bg-transparent border-0 p-0 cursor-pointer text-inherit font-inherit"
          onClick={() => { setResetView("none"); setError(""); setInfo(""); }}>
          Volver a iniciar sesión
        </button>
      </div>
    </>
  );

  const form = resetView !== "none" ? resetForm : (
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

      {!signup && (
        <div className="quick-links">
          <button
            type="button"
            className="underline bg-transparent border-0 p-0 cursor-pointer text-inherit font-inherit"
            onClick={() => { setResetView(client ? "push-request" : "code-reset"); setError(""); setInfo(""); }}
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>
      )}

      {!client && (
        <div className="quick-links">
          <Link href={signup ? "/clientes" : "/clientes?tab=login"}>Acceso para clientes</Link>
        </div>
      )}
      {client && (
        <div className="quick-links">
          <Link href="/auth?tab=login">¿Tienes un negocio? Acceso dueño / staff</Link>
        </div>
      )}
    </>
  );

  return client ? form : <AuthShell role={role}>{form}</AuthShell>;
}
