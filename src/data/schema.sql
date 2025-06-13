-- Esquema para SQLite

-- Tabla de alias de grupos y usuarios
CREATE TABLE IF NOT EXISTS group_aliases (
  alias TEXT PRIMARY KEY,
  chat_id INTEGER NOT NULL
);

-- Tabla de mensajes programados
CREATE TABLE IF NOT EXISTS scheduled_messages (
  id TEXT PRIMARY KEY,
  chat_id INTEGER NOT NULL,
  hora TEXT NOT NULL,
  dia TEXT,
  mensaje TEXT NOT NULL,
  autor INTEGER NOT NULL,
  file_id TEXT
);

-- Tabla de tipos de chat
CREATE TABLE IF NOT EXISTS chat_types (
  chat_id INTEGER PRIMARY KEY,
  tipo TEXT NOT NULL
);
