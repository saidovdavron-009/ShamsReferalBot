export function normalizePhone(text: string): string | null {
  const digitsOnly = text.trim().replace(/[\s\-()]/g, "");

  if (!/^\+?\d{9,15}$/.test(digitsOnly)) {
    return null;
  }

  return digitsOnly.startsWith("+") ? digitsOnly : `+${digitsOnly}`;
}
