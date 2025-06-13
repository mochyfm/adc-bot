// src/commands/message.ts
import { Telegraf, Context } from "telegraf";
import { config } from "../config";
import { getGroupIdFromAlias } from "../services/groupAliasService";
import { Message } from "telegraf/typings/core/types/typegram";

function extractFullText(msg: Message & any): string {
  return msg.text?.trim() ?? msg.caption?.trim() ?? "";
}

export default function registerMessage(bot: Telegraf<Context>) {
  // Lógica centralizada en messageHandler
  async function messageHandler(ctx: Context) {
    if (ctx.from?.id !== config.ownerId || ctx.chat?.type !== "private") {
      return;
    }

    const msg = ctx.message as any;
    const fullText = extractFullText(msg);
    const match = fullText.match(/^\/message\s+\[([^\]]+)\]\s+([\s\S]+)/i);
    if (!match) {
      return ctx.reply(
        "⚠️ Formato correcto:\n" +
          "/message [alias1 alias2 ...] mensaje o caption con media",
        { parse_mode: "HTML" }
      );
    }

    const rawTargets = match[1].split(/\s+/);
    const mensaje = match[2].trim();
    if (!mensaje) {
      return ctx.reply("❌ No se detectó el mensaje a enviar.", {
        parse_mode: "HTML",
      });
    }

    // Detecta media
    let fileId: string | undefined;
    let fileType: "photo" | "animation" | "document" | "video" | null = null;
    if (msg.photo) {
      fileId = msg.photo[msg.photo.length - 1].file_id;
      fileType = "photo";
    } else if (msg.animation) {
      fileId = msg.animation.file_id;
      fileType = "animation";
    } else if (msg.document) {
      fileId = msg.document.file_id;
      fileType = "document";
    } else if (msg.video) {
      fileId = msg.video.file_id;
      fileType = "video";
    }

    let enviados = 0;
    for (const target of rawTargets) {
      const chatId = /^-?\d+$/.test(target)
        ? Number(target)
        : getGroupIdFromAlias(target);
      if (typeof chatId !== "number" || isNaN(chatId)) {
        await ctx.reply(`❌ Alias o ID no válido: ${target}`, {
          parse_mode: "HTML",
        });
        continue;
      }
      try {
        if (fileId && fileType === "photo") {
          await ctx.telegram.sendPhoto(chatId, fileId, {
            caption: mensaje,
            parse_mode: "HTML",
          });
        } else if (fileId && fileType === "animation") {
          await ctx.telegram.sendAnimation(chatId, fileId, {
            caption: mensaje,
            parse_mode: "HTML",
          });
        } else if (fileId && fileType === "document") {
          await ctx.telegram.sendDocument(chatId, fileId, {
            caption: mensaje,
            parse_mode: "HTML",
          });
        } else if (fileId && fileType === "video") {
          await ctx.telegram.sendVideo(chatId, fileId, {
            caption: mensaje,
            parse_mode: "HTML",
          });
        } else {
          await ctx.telegram.sendMessage(chatId, mensaje, {
            parse_mode: "HTML",
          });
        }
        enviados++;
      } catch (e) {
        console.error(`❌ Error enviando a ${chatId}:`, e);
        await ctx.reply(`❌ No se pudo enviar a ${chatId}`, {
          parse_mode: "HTML",
        });
      }
    }

    if (enviados > 0) {
      await ctx.reply(`✅ Mensaje enviado a ${enviados} grupo(s).`, {
        parse_mode: "HTML",
      });
    }
  }

  // 1) /message en texto plano
  bot.command("message", messageHandler);

  // 2) captions/media que empiecen con /message
  bot.on("message", async (ctx, next) => {
    const msg = ctx.message as any;
    const text = extractFullText(msg).toLowerCase();
    if (text.startsWith("/message")) {
      // Manejamos /message y no llamamos a next()
      return messageHandler(ctx);
    }
    // Para cualquier otro mensaje, pasamos al siguiente handler
    return next();
  });
}
