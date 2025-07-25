import { Telegraf, Context } from "telegraf";
import { config } from "../config";
import {
  removeGroupAlias,
  removeGroupAliasById,
} from "../services/groupAliasService";

export default function registerAliasRemove(bot: Telegraf<Context>) {
  bot.command("alias_remove", async (ctx) => {
    const userId = ctx.from!.id;
    const chatType = ctx.chat?.type;
    const fromPrivate = chatType === "private";
    const isOwner = ctx.from?.id === config.ownerId;

    const rawText = ctx.message?.text?.trim() || "";
    const withoutCmd = rawText.replace(/^\/alias_remove(?:@\w+)?\s*/, "");
    const partes = withoutCmd.split(/\s+/).filter((p) => p.length > 0);

    // helper para DM
    const dm = (msg: string, opts: any = {}) =>
      bot.telegram.sendMessage(userId, msg, opts);

    if (partes.length === 0) {
      await dm(
        "⚠️ *Debes indicar el alias o ID a eliminar.*\n\n" +
          "📌 *Ejemplos*: \n" +
          "`/alias_remove fc` → elimina el alias ‘fc’\n" +
          "`/alias_remove 123456789` → (owner en privado) elimina por ID",
        { parse_mode: "Markdown" }
      );
      if (!fromPrivate) {
        return ctx.reply("📬 Te he enviado las instrucciones por privado.");
      }
      return;
    }

    const input = partes[0];

    // modo grupo: solo admins pueden eliminar alias de grupo
    if (!fromPrivate && (chatType === "group" || chatType === "supergroup")) {
      try {
        const member = await ctx.getChatMember(userId);
        const isAdmin = ["creator", "administrator"].includes(member.status);
        if (!isAdmin) {
          await dm("⛔ Solo un administrador puede eliminar un alias.", {
            parse_mode: "Markdown",
          });
          return ctx.reply("📬 Revisa tu privado para más info.");
        }
        // Elimina directamente en base de datos
        const ok = removeGroupAlias(input);
        if (!ok) {
          await dm(`❌ No se encontró el alias «${input}».`, {
            parse_mode: "Markdown",
          });
          return ctx.reply("📬 Comprueba tu privado.");
        }
        await dm(`✅ Alias eliminado: *${input}*`, { parse_mode: "Markdown" });
        return ctx.reply("✅ Alias eliminado. Comprueba tu privado.");
      } catch (e) {
        console.error("❌ Error comprobando admin:", e);
        await dm("❌ No se pudo verificar tus permisos de administrador.", {
          parse_mode: "Markdown",
        });
        return ctx.reply("📬 Error. Más detalles en tu privado.");
      }
    }

    // modo privado: owner puede eliminar por alias o por ID
    let eliminado = false;
    if (isOwner) {
      if (removeGroupAlias(input)) {
        eliminado = true;
      } else if (!isNaN(Number(input)) && removeGroupAliasById(Number(input))) {
        eliminado = true;
      }
    } else {
      if (removeGroupAlias(input)) {
        eliminado = true;
      }
    }
    if (!eliminado) {
      await dm("❌ No se encontró ningún alias o ID coincidente.", {
        parse_mode: "Markdown",
      });
      if (!fromPrivate) return ctx.reply("📬 Comprueba tu privado.");
      return;
    }

    await dm(`✅ Alias eliminado correctamente: \`${input}\``, {
      parse_mode: "Markdown",
    });
    if (!fromPrivate) {
      return ctx.reply("✅ Alias eliminado. Comprueba tu privado.");
    }
  });
}
