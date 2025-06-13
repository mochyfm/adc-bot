// src/config.ts
import dotenv from "dotenv";
dotenv.config();

export const config = {
  botToken: process.env.BOT_TOKEN ?? "",
  ownerId: Number(process.env.OWNER_ID) || 0,
  devChatId: process.env.DEV_CHAT_ID ? Number(process.env.DEV_CHAT_ID) : undefined,
  env: process.env.NODE_ENV ?? "development",

  // ← Aquí la cambiamos:
  adminUser: process.env.ADMIN_USER && process.env.ADMIN_USER.trim() !== ""
    ? process.env.ADMIN_USER.trim()
    : "mochyfm",

  userTimezone: process.env.USER_TIMEZONE ?? "UTC",
};
