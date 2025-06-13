// services/scheduleService.ts
import { db } from "../db";
import { ScheduledMessage } from "../types/ScheduledMessage";

// Añadir un mensaje programado (sin cambios)
export function añadirMensaje(msg: ScheduledMessage): void {
  db.prepare(`
    INSERT INTO scheduled_messages (id, chat_id, hora, dia, mensaje, autor, file_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    msg.id,
    msg.chatId,
    msg.hora,
    msg.dia ?? null,
    msg.mensaje,
    msg.autor,
    msg.fileId ?? null
  );
}

// Listar mensajes de un chat (o todos)
export function listarMensajes(chatId?: number): ScheduledMessage[] {
  const sql = chatId
    ? `
      SELECT
        id,
        chat_id   AS chatId,
        hora,
        dia,
        mensaje,
        autor,
        file_id   AS fileId
      FROM scheduled_messages
      WHERE chat_id = ?
    `
    : `
      SELECT
        id,
        chat_id   AS chatId,
        hora,
        dia,
        mensaje,
        autor,
        file_id   AS fileId
      FROM scheduled_messages
    `;

  const stmt = db.prepare(sql.trim());
  const rows = chatId ? stmt.all(chatId) : stmt.all();
  return rows as ScheduledMessage[];
}

// Alias para compatibilidad
export function listarTodosLosMensajes(): ScheduledMessage[] {
  return listarMensajes();
}

// Borrar uno
export function borrarMensaje(id: string, chatId: number): boolean {
  const result = db
    .prepare(`DELETE FROM scheduled_messages WHERE id = ? AND chat_id = ?`)
    .run(id, chatId);
  return result.changes > 0;
}

// Borrar todos de un chat
export function borrarTodosLosMensajes(chatId: number): number {
  const result = db
    .prepare(`DELETE FROM scheduled_messages WHERE chat_id = ?`)
    .run(chatId);
  return result.changes;
}
