// src/commands/clearMessage.ts
import { Telegraf, Context } from "telegraf";
import { config } from "../config";
import { esAdmin } from "../middlewares/isAdmin";
import {
  borrarMensaje,
  borrarTodosLosMensajes,
} from "../services/scheduleService";
import { getGroupIdFromAlias } from "../services/groupAliasService";
import { Message } from "telegraf/typings/core/types/typegram";

function extractFullText(msg: Message & any): string {
  return msg.text?.trim() ?? "";
}

export default function registerClearMessage(bot: Telegraf<Context>) {
  bot.command("clear_message", async (ctx) => {
    const userId = ctx.from!.id;
    const chatType = ctx.chat?.type;
    const fromPrivate = chatType === "private";
    const isOwner = ctx.from!.id === config.ownerId;
    const autorizado = fromPrivate ? isOwner : await esAdmin(ctx);

    // helper para enviar por privado
    const dm = (text: string, opts: any = {}) =>
      bot.telegram.sendMessage(userId, text, opts);

    if (!autorizado) {
      await dm("⛔ No tienes permisos para borrar mensajes.", {
        parse_mode: "HTML",
      });
      if (!fromPrivate) return ctx.reply("📬 ¡He enviado un mensaje privado!");
      return;
    }

    // limpiamos @BotUsername y extraemos el resto
    const raw = extractFullText(ctx.message as any);
    const withoutCmd = raw.replace(/^\/clear_message(?:@\w+)?\s*/, "");
    if (!withoutCmd) {
      await dm(
        `<b>🧹 Uso de /clear_message</b>

<b>Formas de uso:</b>
<code>/clear_message [alias1 alias2] all</code>
- Borra <i>todos</i> los mensajes de los chats indicados.

<code>/clear_message [alias1 alias2] id1 id2 …</code>
- Borra los mensajes con esos <i>IDs</i> de los chats indicados.

<code>/clear_message all</code>
- Borra <i>todos</i> los mensajes del chat actual.

<code>/clear_message id</code>
- Borra el mensaje con ese <i>ID</i> del chat actual.

<b>Avanzado</b> <i>(solo propietario, en privado)</i>:
<code>/clear_message chatId all</code>
<code>/clear_message chatId id</code>`,
        { parse_mode: "HTML" }
      );
      if (!fromPrivate)
        return ctx.reply("📬 Te envié instrucciones por privado.");
      return;
    }

    let chatIds: number[] = [];
    let targets: string[] = [];

    // formato con corchetes para múltiples chats
    const bracketMatch = withoutCmd.match(/^\[([^\]]+)\]\s+(.+)$/);
    if (bracketMatch) {
      const rawChats = bracketMatch[1].split(/\s+/);
      targets = bracketMatch[2].split(/\s+/);
      for (const rawAlias of rawChats) {
        let id: number | undefined;
        if (/^-?\d+$/.test(rawAlias)) id = Number(rawAlias);
        else id = getGroupIdFromAlias(rawAlias);
        if (!id) {
          await dm(
            `❌ Alias o ID de chat no válido: <code>${rawAlias}</code>`,
            {
              parse_mode: "HTML",
            }
          );
        } else chatIds.push(id);
      }
      if (!chatIds.length) {
        if (!fromPrivate)
          return ctx.reply("📬 Consulta tu privado para más detalles.");
        return;
      }
    } else {
      // sin corchetes: comportamiento clásico
      const parts = withoutCmd.split(/\s+/);
      if (
        fromPrivate &&
        isOwner &&
        parts.length > 1 &&
        /^-?\d+$/.test(parts[0])
      ) {
        chatIds = [Number(parts[0])];
        targets = parts.slice(1);
      } else {
        chatIds = [ctx.chat!.id];
        targets = parts;
      }
    }

    // procesamos borra cada chat y cada target
    const lines: string[] = [];
    for (const chatId of chatIds) {
      if (targets.length === 1 && targets[0].toLowerCase() === "all") {
        const count = borrarTodosLosMensajes(chatId);
        lines.push(
          `🗑️ ${count} mensajes eliminados de <code>${chatId}</code>.`
        );
      } else {
        for (const t of targets) {
          const ok = borrarMensaje(t, chatId);
          if (ok) {
            lines.push(
              `✅ Mensaje <code>${t}</code> eliminado de <code>${chatId}</code>.`
            );
          } else {
            lines.push(
              `⚠️ No existe ID <code>${t}</code> en <code>${chatId}</code>.`
            );
          }
        }
      }
    }

    // enviamos resumen por privado
    await dm(lines.join("\n"), { parse_mode: "HTML" });
    if (!fromPrivate) {
      return ctx.reply("✅ Operación completada. Revisa tu privado.");
    }
  });
}
