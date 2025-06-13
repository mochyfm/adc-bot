import { Context } from "telegraf";

export async function esAdmin(ctx: Context): Promise<boolean> {
  if (!ctx.chat || ctx.chat.type === "private") return false;
  const admins = await ctx.getChatAdministrators();
  return !!admins.find(a => a.user.id === ctx.from?.id);
}
