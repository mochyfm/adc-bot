export const config = {
  env: process.env.NODE_ENV || 'development',
  botToken: process.env.BOT_TOKEN || '',
  devChatId: process.env.DEV_CHAT_ID ? parseInt(process.env.DEV_CHAT_ID, 10) : undefined,
  ownerId: Number(process.env.OWNER_ID),
  adminUser: process.env.ADMIN_USER?.toString().trim() !== '' ? process.env.ADMIN_USER!.toString() : "mochyfm",
  botUsername: process.env.BOT_USERNAME ??  "MonitorTPYM_bot",
  userTimezone: process.env.USER_TIMEZONE || "UTC"
};