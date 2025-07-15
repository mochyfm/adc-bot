import { Telegraf, Context } from "telegraf";
import { config } from "../config";

export default function registerRabbit(bot: Telegraf<Context>) {
  console.log("🐇 Comando /rabbit registrado");

  bot.command("rabbit", async (ctx) => {
    const userId = ctx.from?.id.toString();
    const username = ctx.from?.username ?? "";

    const isOwnerRabbit = userId === config.ownerRabbit;
    const isAdminUser = username === config.adminUser;

    const autorizado = isOwnerRabbit || isAdminUser;

    if (!autorizado) {
      return ctx.reply("⛔ No tienes permiso para usar este comando.");
    }

    try {
      await ctx.replyWithAnimation(config.gifRabbit);
      await ctx.replyWithAudio(config.audioRabbit);
    } catch (error) {
      console.error("❌ Error en /rabbit:", error);
      await ctx.reply("⚠️ Ocurrió un error al enviar los archivos.");
    }
  });
}
