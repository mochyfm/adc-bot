// src/commands/listMessages.ts
import { Telegraf, Context } from "telegraf";
import { config } from "../config";
import {
  listarMensajes,
  listarTodosLosMensajes as leerMensajes,
} from "../services/scheduleService";
import { obtenerTipoDeChat } from "../services/chatTypeService";
import { getGroupIdFromAlias } from "../services/groupAliasService";
import { ScheduledMessage } from "../types/ScheduledMessage";
import { chunkText } from "../utils/chunkText";
import { esAdmin } from "../middlewares/isAdmin";

export default function registerListMessages(bot: Telegraf<Context>) {
  bot.command("list_messages", async (ctx) => {
    const userId = ctx.from!.id;
    const chatType = ctx.chat?.type;
    const fromPrivate = chatType === "private";
    const isOwner = ctx.from!.id === config.ownerId;
    const isAdminGrupo = !fromPrivate && (await esAdmin(ctx));

    // Helper para enviar siempre por privado
    const dm = (text: string, opts: any = {}) =>
      bot.telegram.sendMessage(userId, text, opts);

    // Permisos generales
    if (!((fromPrivate && isOwner) || (!fromPrivate && isAdminGrupo))) {
      await dm("⛔ No tienes permisos para ver mensajes programados.", {
        parse_mode: "HTML",
      });
      if (!fromPrivate) await ctx.reply("📬 Te he enviado un mensaje privado.");
      return;
    }

    const parts = ctx.message?.text?.trim().split(/\s+/).slice(1) ?? [];
    const filtro = parts[0];

    // Función interna para formatear y enviar un grupo de mensajes por DM
    const enviarPorPrivado = async (
      chatId: number,
      mensajes: ScheduledMessage[]
    ) => {
      const tipo = obtenerTipoDeChat(chatId) || "desconocido";
      const header = `🗓 <b>Chat ${chatId}</b>  |  Tipo: <i>${tipo}</i>  |  Total: <b>${mensajes.length}</b>\n──────────────────`;
      await dm(header, { parse_mode: "HTML" });

      for (const m of mensajes) {
        const lineas = [
          `<b>ID:</b> ${m.id}`,
          `<b>Hora:</b> ${m.hora}${m.dia ? ` • Día: ${m.dia}` : ""}`,
          `<b>Media:</b> ${m.fileId ? "🖼️ Sí" : "❌ No"}`,
          `<b>Texto:</b>\n${m.mensaje}`,
        ];
        const bloque = lineas.join("\n");
        for (const chunk of chunkText(bloque, 4000)) {
          await dm(chunk, { parse_mode: "HTML" });
        }
        await dm("―".repeat(20));
      }
    };

    // 1) Filtro por alias o ID de chat
    if (filtro) {
      if (fromPrivate && !isOwner) {
        await dm("⛔ Solo el propietario puede filtrar desde privado.", {
          parse_mode: "HTML",
        });
        return;
      }
      let chatId: number | undefined;
      if (/^-?\d+$/.test(filtro)) chatId = Number(filtro);
      else chatId = getGroupIdFromAlias(filtro);

      if (!chatId) {
        await dm("❌ Alias o ID no válido.", { parse_mode: "HTML" });
        return;
      }
      const msgs = listarMensajes(chatId);
      if (!msgs.length) {
        await dm("ℹ️ No hay mensajes programados en ese chat.", {
          parse_mode: "HTML",
        });
        return;
      }
      await dm("📬 Aquí tienes la lista de mensajes programados:");
      await enviarPorPrivado(chatId, msgs);
      if (!fromPrivate)
        await ctx.reply("📬 Te he enviado la lista por privado.");
      return;
    }

    // 2) Owner en privado => todos los chats
    if (fromPrivate && isOwner) {
      const todos = leerMensajes();
      if (!todos.length) {
        await dm("ℹ️ No hay mensajes programados en ningún chat.", {
          parse_mode: "HTML",
        });
        return;
      }
      await dm("📬 Listado completo de mensajes programados:");
      const agrupados = todos.reduce<Record<number, ScheduledMessage[]>>(
        (acc, m) => {
          (acc[m.chatId] ||= []).push(m);
          return acc;
        },
        {}
      );

      for (const [chatIdStr, msgs] of Object.entries(agrupados)) {
        await enviarPorPrivado(Number(chatIdStr), msgs);
      }
      return;
    }

    // 3) Admin en grupo => sólo su grupo
    if (!fromPrivate && isAdminGrupo) {
      const chatId = ctx.chat!.id;
      const msgs = listarMensajes(chatId);
      if (!msgs.length) {
        await dm("ℹ️ No hay mensajes programados para este grupo.", {
          parse_mode: "HTML",
        });
        await ctx.reply("📬 Te he enviado un mensaje privado.");
        return;
      }
      await dm("📬 Aquí tienes los mensajes programados de este grupo:");
      await enviarPorPrivado(chatId, msgs);
      await ctx.reply("📬 Comprueba tu privado.");
      return;
    }

    // Cualquier otro caso (no debería llegar aquí)
    await dm("❌ No tienes acceso a este comando.", { parse_mode: "HTML" });
    if (!fromPrivate) await ctx.reply("📬 Comprueba tu privado.");
  });
}
