// src/commands/aliasList.ts
import { Telegraf, Context } from "telegraf";
import { config } from "../config";
import { leerAliases } from "../services/groupAliasService";

export default function registerAliasList(bot: Telegraf<Context>) {
  bot.command("alias_list", async (ctx) => {
    const userId = ctx.from!.id;
    const chatType = ctx.chat?.type;
    const fromPrivate = chatType === "private";
    const isOwner = ctx.from?.id === config.ownerId;

    // Función helper para enviar siempre por privado
    const dm = (msg: string, opts: any = {}) =>
      bot.telegram.sendMessage(userId, msg, opts);

    // Construimos el texto con los alias
    const aliases = leerAliases(); // { [alias: string]: number }
    const texto =
      Object.keys(aliases).length === 0
        ? "📭 No tienes alias guardados."
        : "<b>📚 Alias guardados:</b>\n" +
          Object.entries(aliases)
            .map(([alias, id]) => `🔹 <b>${alias}</b> → <code>${id}</code>`)
            .join("\n");

    // 1) Si es privado y eres propietario, enviamos directamente
    if (fromPrivate && isOwner) {
      return ctx.reply(texto, { parse_mode: "HTML" });
    }

    // 2) En grupo/supergrupo: solo admins
    if (chatType === "group" || chatType === "supergroup") {
      try {
        const member = await ctx.getChatMember(userId);
        const isAdmin = ["creator", "administrator"].includes(member.status);
        if (!isAdmin) {
          return ctx.reply("⛔ Solo los administradores pueden ver los alias.");
        }
        // enviamos por privado
        await dm(texto, { parse_mode: "HTML" });
        return ctx.reply("📬 Te he enviado la lista de alias por privado.");
      } catch (e) {
        console.error("❌ Error comprobando admin:", e);
        await dm("❌ No se pudo comprobar tus permisos. Inténtalo de nuevo.", {
          parse_mode: "HTML",
        });
        return ctx.reply("📬 Revisa tu privado para más detalles.");
      }
    }

    // 3) Resto de casos (e.g. privado pero no propietario)
    await dm("⛔ Solo el propietario puede ver la lista de alias en privado.", {
      parse_mode: "HTML",
    });
    if (!fromPrivate) {
      return ctx.reply("📬 Te he enviado un mensaje privado.");
    }
  });
}
