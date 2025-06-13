// src/commands/alias.ts
import { Telegraf, Context } from "telegraf";
import { config } from "../config";
import { saveGroupAlias } from "../services/groupAliasService";

export default function registerAlias(bot: Telegraf<Context>) {
  bot.command("alias", async (ctx) => {
    const userId = ctx.from!.id;
    const chatType = ctx.chat?.type;
    const fromPrivate = chatType === "private";
    const isOwner =
      ctx.from?.id === config.ownerId ||
      ctx.from?.username?.toLowerCase() === config.adminUser?.toLowerCase();

    const text = ctx.message?.text?.trim() || "";
    const partes = text.split(" ").slice(1); // quitamos "/alias"

    // Función helper para enviar siempre por privado
    const dm = (msg: string, opts: any = {}) =>
      bot.telegram.sendMessage(userId, msg, opts);

    if (partes.length === 0) {
      // Ayuda
      await dm(
        "⚠️ *Formato incorrecto.*\n\n" +
          "• En privado:\n" +
          "`/alias <alias>` → guarda tu ID como alias\n" +
          "• En grupo:\n" +
          "`/alias <alias>` → guarda este grupo (solo admins)\n" +
          "• Avanzado (solo propietario, en privado o en grupo):\n" +
          "`/alias <id> <alias>`",
        { parse_mode: "Markdown" }
      );
      if (!fromPrivate) {
        return ctx.reply("📬 Te he enviado las instrucciones por privado.");
      }
      return;
    }

    // Modo avanzado: /alias <id> <alias>
    if (partes.length === 2) {
      const [maybeId, alias] = partes;
      const idNum = Number(maybeId);

      if (isNaN(idNum) || (!fromPrivate && !isOwner)) {
        await dm("⛔ No tienes permiso o el ID no es válido.", { parse_mode: "Markdown" });
        if (!fromPrivate) ctx.reply("📬 Revisa tu privado para más info.");
        return;
      }

      saveGroupAlias(alias, idNum);
      await dm(
        `✅ Alias guardado manualmente:\n*${alias}* → \`${idNum}\``,
        { parse_mode: "Markdown" }
      );
      if (!fromPrivate) ctx.reply("✅ Alias registrado. Comprueba tu privado.");
      return;
    }

    // Alias simple (1 argumento)
    const alias = partes[0];

    // En privado, solo owner puede guardar alias de sí mismo
    if (fromPrivate) {
      if (!isOwner) {
        await dm("⛔ No tienes permiso para guardar alias desde privado.", {
          parse_mode: "Markdown",
        });
        return;
      }
      saveGroupAlias(alias, userId);
      await dm(
        `✅ Alias privado guardado:\n*${alias}* → \`${userId}\``,
        { parse_mode: "Markdown" }
      );
      return;
    }

    // En grupo, solo admins pueden guardar alias del grupo
    if (chatType === "group" || chatType === "supergroup") {
      try {
        const member = await ctx.getChatMember(userId);
        const isAdmin = ["administrator", "creator"].includes(member.status);
        if (!isAdmin) {
          await dm("⛔ Solo un administrador puede guardar un alias de este grupo.", {
            parse_mode: "Markdown",
          });
          return ctx.reply("📬 Te he enviado un mensaje privado.");
        }

        saveGroupAlias(alias, ctx.chat!.id);
        await dm(
          `✅ Alias del grupo guardado:\n*${alias}* → \`${ctx.chat!.id}\``,
          { parse_mode: "Markdown" }
        );
        return ctx.reply("✅ Alias registrado. Comprueba tu privado.");
      } catch (e) {
        console.error("❌ Error comprobando admin:", e);
        await dm("❌ No se pudo comprobar tus permisos de administrador.", {
          parse_mode: "Markdown",
        });
        return ctx.reply("📬 Error. Más detalles en tu privado.");
      }
    }

    // Cualquier otro caso
    await dm("⛔ Este comando solo se puede usar en privado o en grupos.", {
      parse_mode: "Markdown",
    });
    if (!fromPrivate) ctx.reply("📬 Revisa tu privado para más información.");
  });
}
