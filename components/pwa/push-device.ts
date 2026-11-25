// What this phone or browser can do about notifications.
import { installGuide } from "@/lib/install-platform";
import { installState } from "./install-store";

export type PushSupport = "ready" | "needs-install" | "unsupported";

export function pushSupport(): PushSupport {
  // On iPhone and iPad, only the home screen app can receive notifications.
  if (installGuide(navigator)?.startsWith("ios") && installState() !== "app") return "needs-install";
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window ? "ready" : "unsupported";
}

export type PushStep = "permiso" | "suscripcion" | "servidor" | "consulta";

export class PushStepError extends Error {
  constructor(readonly step: PushStep, readonly timedOut: boolean, cause?: unknown) {
    super(`${step}: ${timedOut ? "no answer" : cause instanceof Error ? `${cause.name} ${cause.message}` : String(cause)}`);
  }
}

/**
 * Waits for one step of turning notifications on. Some phones never answer, so every step has a
 * time limit. In development, these messages also show in the terminal running `next dev`.
 */
export async function pushStep<T>(step: PushStep, ms: number, work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  // The routine status check runs often, so it's logged only when it fails.
  const note = (text: string) => { if (step !== "consulta") console.info(`[maat avisos] ${step}: ${text}`); };
  note("start");
  try {
    const result = await Promise.race([
      work,
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new PushStepError(step, true)), ms); }),
    ]);
    note("done");
    return result;
  } catch (error) {
    const failure = error instanceof PushStepError ? error : new PushStepError(step, false, error);
    console.warn(`[maat avisos] ${failure.message} | ${navigator.userAgent}`);
    // The server's own explanation is worth keeping as it is.
    throw step === "servidor" && !failure.timedOut ? error : failure;
  } finally {
    clearTimeout(timer);
  }
}

export async function currentSubscription() {
  const registration = await navigator.serviceWorker.getRegistration();
  return await registration?.pushManager.getSubscription() ?? null;
}

/** A new subscription, replacing any this browser had, which may belong to someone else or no longer work. */
export async function createSubscription(publicKey: string) {
  // `ready` never settles if the service worker failed to register, so the caller sets a time limit.
  const registration = await navigator.serviceWorker.ready;
  await (await registration.pushManager.getSubscription())?.unsubscribe();
  const text = atob(publicKey.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - publicKey.length % 4) % 4));
  return registration.pushManager.subscribe({
    // Browsers require every notification to be shown.
    userVisibleOnly: true,
    applicationServerKey: Uint8Array.from(text, (character) => character.charCodeAt(0)),
  });
}

export function subscriptionDetails(subscription: PushSubscription) {
  const { endpoint, keys } = subscription.toJSON();
  if (!endpoint || !keys?.p256dh || !keys.auth) throw new Error("Incomplete subscription");
  return { endpoint, p256dh: keys.p256dh, auth: keys.auth };
}

// Notifications are on unless the customer switched them off. These are kept per account, so one
// person's choice on a shared phone doesn't decide another's.
function readFlag(name: string, account: string) {
  try {
    return localStorage.getItem(`maat:${name}:${account}`) === "1";
  } catch {
    return false;
  }
}

function writeFlag(name: string, account: string, on: boolean) {
  try {
    if (on) localStorage.setItem(`maat:${name}:${account}`, "1");
    else localStorage.removeItem(`maat:${name}:${account}`);
  } catch {
    // Without storage, the choice lasts only for this visit.
  }
}

export const switchedOff = (account: string) => readFlag("push-off", account);
export const setSwitchedOff = (account: string, off: boolean) => writeFlag("push-off", account, off);

/**
 * The welcome panel that offers notifications when Maat opens. It's shown a few times at most,
 * counted apart for the installed app and the browser: on Android they share this storage, and the
 * app must still offer them even if the browser already did.
 */
export const welcomeLimit = 3;
const welcomeKey = (account: string) => `maat:push-welcome:${installState() === "app" ? "app" : "web"}:${account}`;
export function timesWelcomed(account: string) {
  try {
    return Number(localStorage.getItem(welcomeKey(account))) || 0;
  } catch {
    return 0;
  }
}
export function countWelcome(account: string) {
  try {
    localStorage.setItem(welcomeKey(account), String(timesWelcomed(account) + 1));
  } catch {
    // Without storage, it's limited to once per visit.
  }
}
