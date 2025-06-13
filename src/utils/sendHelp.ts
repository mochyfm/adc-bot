import { Context } from "telegraf";
import { escapeIfMarkdown } from "./escapeMarkdownV2";

export async function enviarAyudaPrivada(ctx: Context, mensaje: string) {
  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    await ctx.telegram.sendMessage(userId, mensaje, { parse_mode: "HTML" });
    if (ctx.chat?.type !== "private") {
      await ctx.reply("📬 Te envié instrucciones por privado.");
    }
  } catch (err) {
    await ctx.reply("❌ No pude enviarte el mensaje por privado. Asegúrate de haber iniciado conversación conmigo.");
    console.log(err);
  }
}