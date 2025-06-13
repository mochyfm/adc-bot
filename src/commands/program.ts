// src/commands/program.ts
import { Telegraf, Context } from "telegraf";
import { v4 as uuidv4 } from "uuid";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { ScheduledMessage } from "../types/ScheduledMessage";
import { esAdmin } from "../middlewares/isAdmin";
import { config } from "../config";
import { añadirMensaje } from "../services/scheduleService";
import { getGroupIdFromAlias } from "../services/groupAliasService";
import { escapeIfMarkdown } from "../utils/escapeMarkdownV2";

dayjs.extend(utc);
dayjs.extend(timezone);

// Zona leída de env, por ejemplo "Europe/Madrid"
const USER_ZONE = config.userTimezone;

function extractFullText(msg: { text?: string; caption?: string }): string {
  return msg.text?.trim() ?? msg.caption?.trim() ?? "";
}

// Regex acepta hora HH:MM, opcional fecha D/M, y mensaje
const progRe =
  /^\/program(?:@\w+)?\s+(?:\[([^\]]+)\]\s+)?(\d{1,2}:\d{2})(?:\s+(\d{1,2}\/\d{1,2}))?\s+([\s\S]+)$/i;

export default function registerProgram(bot: Telegraf<Context>) {
  console.log("🔌 registerProgram initialized");

  async function programHandler(ctx: Context) {
    const userId = ctx.from!.id;
    const chatType = ctx.chat?.type;
    const fromPrivate = chatType === "private";
    const isOwner = ctx.from?.id === config.ownerId;
    const isDev = ctx.from?.username === config.adminUser;
    const isGrpAdmin = !fromPrivate && (await esAdmin(ctx));

    const dm = (text: string, opts: any = {}) =>
      bot.telegram.sendMessage(userId, text, opts);

    if (!((fromPrivate && (isOwner || isDev)) || isGrpAdmin)) {
      return ctx.reply("⛔ No tienes permisos para programar mensajes.", {
        parse_mode: "HTML",
      });
    }

    const fullText = extractFullText(ctx.message as any);
    const m = fullText.match(progRe);
    if (!m) {
      const help = `<b>🕒 Uso de /program</b>

<b>Formas de uso:</b>
<code>/program [alias1 alias2] HH:MM D/M mensaje</code>
– Programa un mensaje a la hora HH:MM el día D/M.

<code>/program [alias1 alias2] HH:MM mensaje</code>
– Programa un mensaje todos los días a la hora HH:MM.

• Si omites [alias…], se enviará al chat actual.
• Alias soporta IDs numéricos o cualquier alias guardado.
• La zona horaria utilizada es <code>${USER_ZONE}</code>.
`;
      await dm(help, { parse_mode: "HTML" });
      if (!fromPrivate) {
        return ctx.reply("📬 Te he enviado las instrucciones por privado.");
      }
      return;
    }

    const rawTargets = m[1]?.split(/\s+/) ?? [];
    const rawHora = m[2];      // Guardamos la hora tal cual (ej. "01:49")
    const rawDia = m[3];       // Fecha puntual D/M o undefined
    const mensajeRaw = m[4].trim();

    // YA NO convertimos la hora: la guardamos en USER_ZONE directamente
    const serverHora = rawHora;

    // resolución de destinos
    const destinos: number[] = [];
    if (rawTargets.length) {
      for (const t of rawTargets) {
        const id = /^\-?\d+$/.test(t) ? Number(t) : getGroupIdFromAlias(t);
        if (!id) {
          await ctx.reply(`❌ Alias o ID no válido: ${t}`, {
            parse_mode: "HTML",
          });
        } else destinos.push(id);
      }
      if (!destinos.length) return;
    } else destinos.push(ctx.chat!.id);

    // detección de media
    let mediaId: string | undefined,
      mediaType: "photo" | "animation" | "document" | "video" | undefined;
    const msgObj = ctx.message as any;
    if (msgObj.photo) {
      mediaId = msgObj.photo[msgObj.photo.length - 1].file_id;
      mediaType = "photo";
    } else if (msgObj.animation) {
      mediaId = msgObj.animation.file_id;
      mediaType = "animation";
    } else if (msgObj.document) {
      mediaId = msgObj.document.file_id;
      mediaType = "document";
    } else if (msgObj.video) {
      mediaId = msgObj.video.file_id;
      mediaType = "video";
    }

    let creados = 0;
    for (const chatId of destinos) {
      const nuevo: ScheduledMessage = {
        id: uuidv4(),
        chatId,
        hora: serverHora,    // ahora coincide con USER_ZONE
        dia: rawDia,
        mensaje: mensajeRaw,
        autor: userId,
        fileId: mediaId,
        mediaType,
      };
      añadirMensaje(nuevo);
      console.log(
        `[Scheduler] Programado msg ${nuevo.id}: chat=${chatId} hora=${serverHora} día=${rawDia ?? "—"}`
      );
      creados++;
    }

    return ctx.reply(
      escapeIfMarkdown(
        `✅ Mensaje${creados > 1 ? "s" : ""} programado para ${creados} chat${creados > 1 ? "s" : ""}.`,
        true
      ),
      { parse_mode: "MarkdownV2" }
    );
  }

  bot.command("program", (ctx) => programHandler(ctx));
  bot.on("message", (ctx, next) => {
    const text = extractFullText(ctx.message as any).toLowerCase();
    if (text.startsWith("/program")) {
      return programHandler(ctx);
    }
    return next();
  });
}
