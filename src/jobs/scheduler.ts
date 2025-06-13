// jobs/scheduler.ts
import { bot } from "../bot";
import dayjs from "dayjs";
import { listarMensajes } from "../services/scheduleService";
import { escapeIfMarkdown } from "../utils/escapeMarkdownV2";

const MAX_CAPTION = 1024;

export function iniciarScheduler() {
  const revisarMensajes = async () => {
    const ahora = dayjs();
    const horaActual = ahora.format("HH:mm"); // ej. "23:47"
    const fechaActual = `${ahora.date()}/${ahora.month() + 1}`; // ej. "14/6"
    const mensajes = listarMensajes();

    console.log(
      `[Scheduler] tick: hora='${horaActual}', fecha='${fechaActual}'`
    );

    for (const msg of mensajes) {
      try {
        console.log(
          `– comprueba msg ${msg.id}: hora='${msg.hora}' día='${msg.dia}'`
        );

        // 1) Hora exacta
        if (msg.hora !== horaActual) {
          console.log(`  → salto (hora no coincide, necesita '${msg.hora}')`);
          continue;
        }

        // 2) Fecha puntual (si hay slash)
        if (msg.dia?.includes("/")) {
          const [dRaw, mRaw] = msg.dia.split("/");
          const d = parseInt(dRaw, 10),
            m = parseInt(mRaw, 10);
          if (d !== ahora.date() || m !== ahora.month() + 1) {
            console.log(`  → salto (fecha '${msg.dia}' no coincide hoy)`);
            continue;
          }
        }
        // si msg.dia está vacío o no tiene "/", enviamos todos los días

        // 3) Preparamos envío
        console.log(`  → enviando msg ${msg.id} al chat ${msg.chatId}`);
        const textoSeguro = escapeIfMarkdown(msg.mensaje, true);
        const needsSeparate = textoSeguro.length > MAX_CAPTION;
        const fileId = msg.fileId;
        const type = msg.mediaType;

        // 3a) Solo texto
        if (!fileId) {
          await bot.telegram.sendMessage(msg.chatId, textoSeguro, {
            parse_mode: "MarkdownV2",
          });
          console.log(`    ✅ Texto enviado`);
          continue;
        }

        // 3b) Animación (GIF) nativo
        if (type === "animation") {
          if (!needsSeparate) {
            await bot.telegram.sendAnimation(msg.chatId, fileId, {
              caption: textoSeguro,
              parse_mode: "MarkdownV2",
            });
          } else {
            const sent = await bot.telegram.sendAnimation(msg.chatId, fileId);
            await bot.telegram.sendMessage(msg.chatId, textoSeguro, {
              parse_mode: "MarkdownV2",
              reply_to_message_id: sent.message_id,
            } as any);
          }
          console.log(`    ✅ GIF enviado`);
          continue;
        }

        // 3c) Fotos / Documentos / Vídeos con fallback para GIFs erroneamente tipados
        try {
          if (!needsSeparate) {
            await bot.telegram.sendPhoto(msg.chatId, fileId, {
              caption: textoSeguro,
              parse_mode: "MarkdownV2",
            });
          } else {
            await bot.telegram.sendPhoto(msg.chatId, fileId);
            await bot.telegram.sendMessage(msg.chatId, textoSeguro, {
              parse_mode: "MarkdownV2",
            });
          }
          console.log(`    ✅ Media enviada (foto/doc/video)`);
        } catch (err: any) {
          const desc = err.response?.description as string;
          if (desc?.includes("can't use file of type Animation as Photo")) {
            console.warn(`    ⚠️ Fallback a GIF para msg ${msg.id}`);
            // reenviamos como animación
            if (!needsSeparate) {
              await bot.telegram.sendAnimation(msg.chatId, fileId, {
                caption: textoSeguro,
                parse_mode: "MarkdownV2",
              });
            } else {
              const sent = await bot.telegram.sendAnimation(msg.chatId, fileId);
              await bot.telegram.sendMessage(msg.chatId, textoSeguro, {
                parse_mode: "MarkdownV2",
                reply_to_message_id: sent.message_id,
              } as any);
            }
            console.log(`    ✅ GIF fallback enviado`);
          } else {
            throw err;
          }
        }
      } catch (err) {
        console.error(`❌ Error procesando msg ${msg.id}:`, err);
      }
    }
  };

  // Arranca justo al cambio de minuto y luego cada minuto
  const now = dayjs();
  const delayInicial = 60000 - (now.second() * 1000 + now.millisecond());
  setTimeout(() => {
    revisarMensajes();
    setInterval(revisarMensajes, 60 * 1000);
  }, delayInicial);
}
