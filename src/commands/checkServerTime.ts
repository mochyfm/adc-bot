// src/commands/checkServerTime.ts
import dayjs from "dayjs";
import { Context, Telegraf } from "telegraf";

export default function registerCheckServerTime(bot: Telegraf<Context>) {
  bot.command("check-server-time", async (ctx, next) => {
    const now = dayjs();
    const formatted = now.format("YYYY-MM-DD HH:mm:ss");
    await ctx.reply(`⏰ Hora del servidor:\n${formatted}`, {
      parse_mode: "Markdown",
    });
    return next();
  });
}