// src/bot.ts
import dotenv from "dotenv";
dotenv.config();
import "./db";
import { verifyDatabase } from "./db";

verifyDatabase();

import { Telegraf, Context } from "telegraf";
import { config } from "./config";
import fs from "fs";
import path from "path";
import { iniciarScheduler } from "./jobs/scheduler";

// 1) Arrancamos el scheduler
iniciarScheduler();

// 2) Creamos la instancia del bot
export const bot = new Telegraf<Context>(config.botToken);
console.log("ENV:", config.env, "DEV_CHAT_ID:", config.devChatId);

// 3) Middleware combinado para debug y logging
bot.use(async (ctx, next) => {
  const msg = ctx.message || ctx.editedMessage;
  if (msg) {
    const text =
      "text" in msg ? msg.text : "caption" in msg ? msg.caption : "(sin texto)";
    console.log("📨 Mensaje recibido:", {
      user: ctx.from?.username ?? "(sin username)",
      chatId: ctx.chat?.id ?? "(sin chat)",
      text,
    });
  }
  await next();
});

// 4) Capturador global de errores
bot.catch((err, ctx) => {
  console.error("🚨 Error no gestionado en un handler:", err);
  if (ctx && ctx.reply) {
    ctx.reply("❌ ¡Ups! Ha ocurrido un error interno.");
  }
});

// 5) Carga y registro de comandos/plugins
const commandsDir = path.join(__dirname, "commands");
console.log("📂 Buscando comandos en:", commandsDir);
fs.readdirSync(commandsDir)
  .filter((file) => /\.(ts|js)$/.test(file))
  .forEach((file) => {
    const full = path.join(commandsDir, file);
    console.log("▶ Cargando comando:", file);
    const mod = require(full);
    const def = mod.default;
    console.log("   ➡ Export default es:", def);
    // Composer plugin
    if (def && typeof def.middleware === "function") {
      bot.use(def.middleware());
      console.log(`   ✔ Montado composer desde ${file}`);
    }
    // Función register(bot)
    else if (typeof def === "function") {
      def(bot);
      console.log(`   ✔ Invocada register(bot) desde ${file}`);
    }
    // Los módulos que hacen top-level bot.command() ya se registran al importarse
  });

// 6) Registro de comandos en BotFather
bot.telegram.setMyCommands([
  { command: "program", description: "Programar un mensaje." },
  { command: "list_messages", description: "Listar mensajes programados." },
  {
    command: "clear_message",
    description: "Eliminar mensajes por ID o todos.",
  },
  {
    command: "message",
    description: "Enviar un mensaje manual (solo propietario).",
  },
  {
    command: "alias",
    description: "Guardar alias para un grupo (solo propietario).",
  },
  {
    command: "alias_list",
    description: "Ver tus alias guardados (solo propietario).",
  },
  { command: "alias_remove", description: "Eliminar un alias por nombre o ID" },
]);

// 7) Mostrar comandos activos
bot.telegram
  .getMyCommands()
  .then((cmds) => {
    console.log("📌 Comandos activos en el bot:");
    if (!cmds.length)
      console.log("⚠️ No hay comandos registrados con setMyCommands.");
    else cmds.forEach((c) => console.log(`/${c.command} – ${c.description}`));
  })
  .catch(console.error);

// 8) Mensaje de arranque (solo primera vez)
const statePath = path.join(__dirname, "data/state.json");
function getState() {
  if (!fs.existsSync(statePath)) return { mensajeEnviado: false };
  try {
    return JSON.parse(fs.readFileSync(statePath, "utf-8"));
  } catch {
    return { mensajeEnviado: false };
  }
}
function setState(s: any) {
  fs.writeFileSync(statePath, JSON.stringify(s, null, 2));
}
const estado = getState();
if (
  config.env === "development" &&
  config.devChatId &&
  !estado.mensajeEnviado
) {
  bot.telegram
    .sendMessage(
      config.devChatId,
      "🚧 *ATENCIÓN*: El bot ha arrancado correctamente en MODO DESARROLLO.\n\n_¡Este mensaje solo se envía al primer arranque!_",
      { parse_mode: "Markdown" }
    )
    .then(() => {
      console.log("✅  Mensaje de arranque enviado correctamente.");
      setState({ mensajeEnviado: true });
    })
    .catch(console.error);
} else if (config.env === "development") {
  console.log("⚠️  Mensaje de arranque ya enviado anteriormente.");
}

// 9) Lanzamiento y apagado limpio
console.log("Antes de launch");
bot
  .launch()
  .then(() => console.log("✅  Bot lanzado (polling)."))
  .catch((err) => console.error("❌  Error arrancando polling:", err));

process.once("SIGINT", () => {
  bot.stop("SIGINT");
  process.exit(0);
});
process.once("SIGTERM", () => {
  bot.stop("SIGTERM");
  process.exit(0);
});
