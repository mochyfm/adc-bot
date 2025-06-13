// jobs/scheduler.ts
import { bot } from "../bot";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { listarMensajes } from "../services/scheduleService";
import { escapeIfMarkdown } from "../utils/escapeMarkdownV2";

dayjs.extend(utc);
dayjs.extend(timezone);

const USER_ZONE = process.env.USER_TIMEZONE || "Europe/Madrid";
const MAX_CAPTION = 1024;

export function iniciarScheduler() {
  const revisarMensajes = async () => {
    // 1) Obtenemos la hora y fecha **en Madrid**
    const ahoraMadrid  = dayjs().tz(USER_ZONE);
    const horaMadrid   = ahoraMadrid.format("HH:mm");          // e.g. "01:49"
    const fechaMadrid  = `${ahoraMadrid.date()}/${ahoraMadrid.month() + 1}`;

    console.log(`[Scheduler] horaPeninsula='${horaMadrid}', fecha='${fechaMadrid}'`);

    // 2) Recorremos
    const mensajes = listarMensajes();
    for (const msg of mensajes) {
      // Filtrado de hora según Madrid
      if (msg.hora !== horaMadrid) continue;

      // Filtrado de fecha puntual  
      if (msg.dia?.includes("/")) {
        const [dRaw, mRaw] = msg.dia.split("/");
        const d = parseInt(dRaw, 10), m = parseInt(mRaw, 10);
        if (d !== ahoraMadrid.date() || m !== ahoraMadrid.month() + 1) continue;
      }

      // 3) Envío (texto, GIFs, fotos…) idéntico al de antes
      const textoSeguro   = escapeIfMarkdown(msg.mensaje, true);
      const needsSeparate = textoSeguro.length > MAX_CAPTION;
      const fileId        = msg.fileId;
      const type          = msg.mediaType;

      if (!fileId) {
        await bot.telegram.sendMessage(msg.chatId, textoSeguro, { parse_mode: "MarkdownV2" });
      } else if (type === "animation") {
        if (!needsSeparate) {
          await bot.telegram.sendAnimation(msg.chatId, fileId, {
            caption: textoSeguro,
            parse_mode: "MarkdownV2",
          });
        } else {
          const sent = await bot.telegram.sendAnimation(msg.chatId, fileId);
          await bot.telegram.sendMessage(
            msg.chatId,
            textoSeguro,
            { parse_mode: "MarkdownV2", reply_to_message_id: sent.message_id } as any
          );
        }
      } else {
        try {
          if (!needsSeparate) {
            await bot.telegram.sendPhoto(msg.chatId, fileId, {
              caption: textoSeguro,
              parse_mode: "MarkdownV2",
            });
          } else {
            await bot.telegram.sendPhoto(msg.chatId, fileId);
            await bot.telegram.sendMessage(msg.chatId, textoSeguro, { parse_mode: "MarkdownV2" });
          }
        } catch (err: any) {
          // fallback GIF mal tipado
          if (err.response?.description?.includes("Animation as Photo")) {
            if (!needsSeparate) {
              await bot.telegram.sendAnimation(msg.chatId, fileId, {
                caption: textoSeguro,
                parse_mode: "MarkdownV2",
              });
            } else {
              const sent = await bot.telegram.sendAnimation(msg.chatId, fileId);
              await bot.telegram.sendMessage(
                msg.chatId,
                textoSeguro,
                { parse_mode: "MarkdownV2", reply_to_message_id: sent.message_id } as any
              );
            }
          } else throw err;
        }
      }
      console.log(`✅ msg ${msg.id} enviado en horaPeninsula=${horaMadrid}`);
    }
  };

  // Arranque al cambio de minuto…
  const now = dayjs().tz(USER_ZONE);
  const delay = 60000 - (now.second() * 1000 + now.millisecond());
  setTimeout(() => {
    revisarMensajes();
    setInterval(revisarMensajes, 60 * 1000);
  }, delay);
}
