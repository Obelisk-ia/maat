// The link inside a business's printed QR. Printed codes can't be edited: keep this format working.

export function joinPath(organizationId: string) {
  return `/clientes?negocio=${encodeURIComponent(organizationId)}`;
}

/** Rejects anything that can't be an ID. The server still checks that the business exists. */
export function parseBusinessId(value: unknown) {
  return typeof value === "string" && /^[a-z0-9]{1,64}$/i.test(value) ? value : null;
}

/** Reads the business from a scanned QR. Only the ID is used; the scanned address is never opened. */
export function parseJoinLink(text: string) {
  if (!URL.canParse(text)) return null;
  const url = new URL(text);
  return url.pathname === "/clientes" ? parseBusinessId(url.searchParams.get("negocio")) : null;
}
