// src/db.ts
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dbPath = path.join(__dirname, "../data/database.sqlite");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
export const db = new Database(dbPath);

// Función que comprueba y crea las tablas si faltan
export function verifyDatabase() {
  const tables = {
    group_aliases: `
      CREATE TABLE IF NOT EXISTS group_aliases (
        alias TEXT PRIMARY KEY,
        chat_id INTEGER NOT NULL
      );`,
    scheduled_messages: `
      CREATE TABLE IF NOT EXISTS scheduled_messages (
        id TEXT PRIMARY KEY,
        chat_id INTEGER NOT NULL,
        hora TEXT NOT NULL,
        dia TEXT,
        mensaje TEXT NOT NULL,
        autor INTEGER NOT NULL,
        file_id TEXT,
        mediaType TEXT
      );`,
    chat_types: `
      CREATE TABLE IF NOT EXISTS chat_types (
        chat_id INTEGER PRIMARY KEY,
        tipo TEXT NOT NULL
      );`,
  };

  for (const [name, sql] of Object.entries(tables)) {
    const exists = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
      .get(name);
    if (!exists) {
      console.log(`🔧 [DB] tabla '${name}' no existe, creándola…`);
      db.exec(sql);
    }
  }
  console.log("✅ [DB] verificación de tablas completada.");
}
