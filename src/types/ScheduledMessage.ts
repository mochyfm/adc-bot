export interface ScheduledMessage {
  id: string;
  chatId: number;
  hora: string;
  dia?: string;
  mensaje: string;
  autor: number;
  fileId?: string;
  mediaType?: "photo" | "animation" | "document" | "video" | undefined;
}
