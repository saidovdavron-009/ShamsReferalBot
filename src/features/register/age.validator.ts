export function parseAge(text: string): number | null {
  if (!/^\d{1,3}$/.test(text.trim())) {
    return null;
  }

  const age = Number(text.trim());
  if (age < 7 || age > 100) {
    return null;
  }

  return age;
}
