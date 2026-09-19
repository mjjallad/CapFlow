// Jordanian mobile numbers are the WhatsApp identity of a captain, so every
// source (Excel, webhook, manual entry) must collapse to one canonical form:
// E.164 without spaces, e.g. "+962791234567".

const ARABIC_INDIC_ZERO = 0x0660;
const EXTENDED_ARABIC_INDIC_ZERO = 0x06f0;

function toAsciiDigits(input: string): string {
  return input.replace(/[٠-٩۰-۹]/g, (ch) => {
    const code = ch.charCodeAt(0);
    const base = code >= EXTENDED_ARABIC_INDIC_ZERO ? EXTENDED_ARABIC_INDIC_ZERO : ARABIC_INDIC_ZERO;
    return String(code - base);
  });
}

export function normalizeJordanPhone(raw: string | number | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;

  // Excel often stores the number as a float (e.g. 962791234567.0).
  const text = typeof raw === "number" ? raw.toFixed(0) : String(raw);
  let digits = toAsciiDigits(text).replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("00962")) digits = digits.slice(5);
  else if (digits.startsWith("962")) digits = digits.slice(3);
  else if (digits.startsWith("0")) digits = digits.slice(1);

  // Local mobile numbers: 7 followed by 8 digits (77x, 78x, 79x ranges).
  if (!/^7[789]\d{7}$/.test(digits)) return null;

  return `+962${digits}`;
}
