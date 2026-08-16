const NAME_CHARS = /^[A-Za-zА-Яа-яЁёʼʻ’'\-\s]+$/;

export function isValidFullName(text: string): boolean {
  if (text.length < 3 || text.length > 60) {
    return false;
  }

  if (!NAME_CHARS.test(text)) {
    return false;
  }

  const words = text.split(/\s+/).filter(Boolean);
  return words.length >= 2 && words.every((word) => word.length >= 2);
}
