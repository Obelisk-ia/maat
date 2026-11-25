// What the server accepts as a phone's address for notifications. The server sends requests to it,
// so it must belong to a browser maker's push service, never an address of someone's choosing.

const exactHosts = ["fcm.googleapis.com", "android.googleapis.com"];
const hostSuffixes = [
  ".google.com", // Chrome
  ".push.apple.com", // Safari and iPhone
  ".push.services.mozilla.com", // Firefox
  ".notify.windows.com", // Edge
];

export function isPushServiceUrl(endpoint: string) {
  if (endpoint.length > 2048) return false;
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  return url.protocol === "https:" && !url.port && !url.username && !url.password &&
    (exactHosts.includes(url.hostname) || hostSuffixes.some((suffix) => url.hostname.endsWith(suffix)));
}

const base64Url = (text: string, length: number) => text.length === length && /^[A-Za-z0-9_-]+$/.test(text);

/** The two keys a browser hands over: a P-256 public key (65 bytes) and a 16 byte secret. */
export function arePushKeys(p256dh: string, auth: string) {
  return base64Url(p256dh, 87) && p256dh.startsWith("B") && base64Url(auth, 22);
}
