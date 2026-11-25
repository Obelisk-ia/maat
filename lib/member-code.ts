// The code printed on a customer's card. Staff scan it as a QR or type it.

// No 0/O or 1/I, so a code read aloud or typed by hand isn't ambiguous.
const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const codeLength = 8;
const scanPrefix = "MAAT:CARD:";

export function randomMemberCode() {
  // 32 characters divide 256 evenly, so every character is equally likely.
  const bytes = crypto.getRandomValues(new Uint8Array(codeLength));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export function formatMemberCode(code: string) {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export function memberQrValue(code: string) {
  return `${scanPrefix}${code}`;
}

/** Accepts a typed code or the text of a scanned card QR. Returns the stored form, or null. */
export function parseMemberCode(input: string) {
  const text = input.trim().toUpperCase();
  const code = (text.startsWith(scanPrefix) ? text.slice(scanPrefix.length) : text).replace(/[\s-]/g, "");
  return code.length === codeLength && [...code].every((character) => alphabet.includes(character)) ? code : null;
}

/** Uppercases and hyphenates a card code as it's typed. */
export function formatMemberCodeInput(input: string) {
  const characters = input.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, codeLength);
  return characters.length > 4 ? formatMemberCode(characters) : characters;
}
