// services/groupAliasService.ts
import { db } from "../db";

type AliasRow = {
  alias: string;
  chat_id: number;
};

// Guardar o actualizar un alias
export function saveGroupAlias(alias: string, chatId: number): void {
  db.prepare(`
    INSERT INTO group_aliases (alias, chat_id)
    VALUES (?, ?)
    ON CONFLICT(alias) DO UPDATE SET chat_id = excluded.chat_id
  `).run(alias, chatId);

  console.log(`✅ Alias guardado: ${alias} → ${chatId}`);
}

// Obtener ID a partir del alias
export function getGroupIdFromAlias(alias: string): number | undefined {
  const row = db
    .prepare(`SELECT chat_id FROM group_aliases WHERE alias = ?`)
    .get(alias) as { chat_id?: number } | undefined;

  return row?.chat_id;
}

// Leer todos los alias
export function leerAliases(): Record<string, number> {
  const rows = db.prepare(`SELECT alias, chat_id FROM group_aliases`).all() as AliasRow[];

  const resultado: Record<string, number> = {};
  for (const row of rows) {
    resultado[row.alias] = row.chat_id;
  }
  return resultado;
}

// Guardar todos los alias de golpe (no muy útil en SQLite, pero por compatibilidad)
export function guardarAliases(aliases: Record<string, number>): void {
  const insert = db.prepare(`
    INSERT INTO group_aliases (alias, chat_id)
    VALUES (?, ?)
    ON CONFLICT(alias) DO UPDATE SET chat_id = excluded.chat_id
  `);

  const trans = db.transaction(() => {
    for (const [alias, chatId] of Object.entries(aliases)) {
      insert.run(alias, chatId);
    }
  });

  trans();
}
