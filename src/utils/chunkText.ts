export function chunkText(text: string, maxLength = 4000): string[] {
  const chunks: string[] = [];
  let actual = "";

  for (const linea of text.split("\n")) {
    if ((actual + linea + "\n").length > maxLength) {
      chunks.push(actual);
      actual = "";
    }
    actual += linea + "\n";
  }

  if (actual) chunks.push(actual);
  return chunks;
}
