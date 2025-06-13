// src/db.ts
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

// Ruta al archivo SQLite
const dbPath = path.join(__dirname, "./data/database.sqlite");
const schemaPath = path.join(__dirname, "./data/schema.sql");

// Crear carpeta si no existe
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Crear base de datos (o abrirla si ya existe)
const db = new Database(dbPath);

// Cargar esquema solo si es nuevo (no tiene tabla group_aliases aún)
const res = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='group_aliases'")
  .get();

if (!res && fs.existsSync(schemaPath)) {
  const schema = fs.readFileSync(schemaPath, "utf-8");
  db.exec(schema);
  console.log("✅ Base de datos SQLite inicializada con el esquema.");
}

export default db;
