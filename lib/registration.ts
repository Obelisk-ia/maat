export const minimumPasswordLength = 8;
export const maximumPasswordLength = 128;

export function normalizePhone(input: string) {
  const compact = input.trim().replace(/[\s().-]/g, "");
  const phone = /^\d{10}$/.test(compact) ? `+52${compact}` : compact;
  if (phone.startsWith("+52") && !/^\+52\d{10}$/.test(phone)) return null;
  return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null;
}

// Mexico City, Guadalajara and Monterrey use two-digit area codes; everywhere else uses three.
function groupNational(digits: string) {
  const area = /^(55|56|33|81)/.test(digits) ? 2 : 3;
  const groups = area === 2 ? [2, 4, 4] : [3, 3, 4];
  let start = 0;
  return groups.map((length) => digits.slice(start, start += length)).filter(Boolean).join(" ");
}

/** Spaces a number as it's typed. Numbers without "+" are Mexican; others keep their own prefix. */
export function formatPhoneInput(input: string) {
  const international = input.trimStart().startsWith("+");
  let digits = input.replace(/\D/g, "");
  // A full number with Mexico's prefix (typed, pasted or autofilled) is shown as a national one.
  if (digits.length === 12 && digits.startsWith("52")) digits = digits.slice(2);
  else if (international) {
    if (!digits.startsWith("52")) return `+${digits.slice(0, 15)}`;
    return digits.length > 2 ? `+52 ${groupNational(digits.slice(2, 12))}` : `+${digits}`;
  }
  return groupNational(digits.slice(0, 10));
}

/** Shows a stored number, such as +525512345678, the way people read it. */
export function formatPhone(phone: string) {
  const national = /^\+52(\d{10})$/.exec(phone)?.[1];
  return national ? `+52 ${groupNational(national)}` : phone;
}
