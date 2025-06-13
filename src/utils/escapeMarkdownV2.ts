// utils/escapeMarkdownV2.ts
export function escapeIfMarkdown(text: string, isMarkdown = false): string {
  if (!isMarkdown) return text;
  return text.replace(/([\\_[\]()~`>#+\-=|{}.!])/g, '\\$1');
}
