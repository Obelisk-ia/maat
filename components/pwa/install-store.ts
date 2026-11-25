// What the browser says about installing: whether this is already the installed app, and whether
// it offered its own install prompt.
import { installGuide, type InstallGuide } from "@/lib/install-platform";

type InstallPromptEvent = Event & {
  prompt: () => Promise<unknown>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    __maatInstall?: InstallPromptEvent | null;
    __maatInstalled?: boolean;
  }
}

const changed = "maat:install";
const installedModes = ["standalone", "fullscreen", "minimal-ui"].map((mode) => `(display-mode: ${mode})`).join(", ");

/**
 * Runs in the page's <head>: the browser may offer its prompt before React is ready, and it
 * offers it only once.
 */
export const captureInstallPrompt = `
addEventListener("beforeinstallprompt", function (event) {
  event.preventDefault();
  window.__maatInstall = event;
  window.__maatInstalled = false;
  dispatchEvent(new Event("${changed}"));
});
addEventListener("appinstalled", function () {
  window.__maatInstall = null;
  window.__maatInstalled = true;
  dispatchEvent(new Event("${changed}"));
});
`;

export type InstallState =
  /** Opened from the home screen. */
  | "app"
  /** In a browser that can install with one tap. */
  | "prompt"
  /** In a browser where the customer follows steps. */
  | NonNullable<InstallGuide>
  /** Nothing to offer, or it was just installed. */
  | "none";

export function installState(): InstallState {
  // navigator.standalone is how iOS reports a home screen app.
  if (window.matchMedia(installedModes).matches || (navigator as { standalone?: boolean }).standalone) return "app";
  if (window.__maatInstall) return "prompt";
  if (window.__maatInstalled) return "none";
  return installGuide(navigator) ?? "none";
}

export function subscribeInstall(onChange: () => void) {
  const mode = window.matchMedia(installedModes);
  window.addEventListener(changed, onChange);
  mode.addEventListener("change", onChange);
  return () => {
    window.removeEventListener(changed, onChange);
    mode.removeEventListener("change", onChange);
  };
}

/** Opens the browser's install prompt. It can be used once. */
export async function promptInstall() {
  const event = window.__maatInstall;
  if (!event) return;
  window.__maatInstall = null;
  try {
    await event.prompt();
    if ((await event.userChoice).outcome === "accepted") window.__maatInstalled = true;
  } finally {
    window.dispatchEvent(new Event(changed));
  }
}
