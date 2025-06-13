// services/chatTypeService.ts
import { db } from "../db";

// Define el tipo que esperas de la consulta
type ChatTypeRow = {
  chat_id: number;
  tipo: string;
};

export function guardarTipoDeChat(chatId: number, tipo: string): void {
  db.prepare(`
    INSERT INTO chat_types (chat_id, tipo)
    VALUES (?, ?)
    ON CONFLICT(chat_id) DO UPDATE SET tipo = excluded.tipo
  `).run(chatId, tipo);
}

export function obtenerTipoDeChat(chatId: number): string | undefined {
  const fila = db
    .prepare(`SELECT tipo FROM chat_types WHERE chat_id = ?`)
    .get(chatId) as { tipo?: string } | undefined;

  return fila?.tipo;
}

export function listarChatsPorTipo(tipo: string): number[] {
  const filas = db
    .prepare(`SELECT chat_id FROM chat_types WHERE tipo = ?`)
    .all(tipo) as ChatTypeRow[];

  return filas.map((f) => f.chat_id);
}

export function listarTodosLosChats(): Record<number, string> {
  const filas = db
    .prepare(`SELECT chat_id, tipo FROM chat_types`)
    .all() as ChatTypeRow[];

  const resultado: Record<number, string> = {};
  for (const fila of filas) {
    resultado[fila.chat_id] = fila.tipo;
  }
  return resultado;
}
  