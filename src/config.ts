// src/config.ts
import dotenv from "dotenv";
dotenv.config();

export const config = {
  botToken: process.env.BOT_TOKEN ?? "",
  ownerId: Number(process.env.OWNER_ID) || 0,
  devChatId: process.env.DEV_CHAT_ID
    ? Number(process.env.DEV_CHAT_ID)
    : undefined,
  env: process.env.NODE_ENV ?? "development",
  gifRabbit: process.env.GIF_RABBIT ?? "CgACAgQAAx0Cf8YkgQABCA3AaGahnLqaFQV_RTuxjg7xXVx5mxkAAocZAALToThTd4GsG3ieKzE2BA",
  audioRabbit: process.env.AUDIO_RABBIT ?? "CQACAgQAAx0Cf8YkgQABCA2_aGahnAIuX4EzIG2l--Ql2U_34HkAAoYZAALToThTLVT4Yafkm_E2BA",
  ownerRabbit: process.env.RABBIT_ID,
  rabbitAdminsEnabled: process.env.RABBIT_ADMINS_ENABLED || false,
  adminUser:
    process.env.ADMIN_USER && process.env.ADMIN_USER.trim() !== ""
      ? process.env.ADMIN_USER.trim()
      : "mochyfm",

  userTimezone: process.env.USER_TIMEZONE ?? "UTC",
  webhookBaseUrl: process.env.WEBHOOK_BASE_URL || "",
};
