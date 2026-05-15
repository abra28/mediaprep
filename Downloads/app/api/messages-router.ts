import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { messagesCollection, getNextId } from "../db/mongo";
import type { MessageDoc } from "../db/mongo";

export const channels = [
  { key: "general", label: "General", icon: "fa-comments", color: "#4A32A0" },
  { key: "video", label: "Video", icon: "fa-video", color: "#3b82f6" },
  { key: "audio", label: "Audio", icon: "fa-microphone", color: "#f59e0b" },
  { key: "streaming", label: "Streaming", icon: "fa-broadcast-tower", color: "#8b5cf6" },
  { key: "presentation", label: "Presentation", icon: "fa-desktop", color: "#10b981" },
  { key: "lighting", label: "Lighting", icon: "fa-lightbulb", color: "#f97316" },
  { key: "photography", label: "Photography", icon: "fa-camera", color: "#06b6d4" },
  { key: "content", label: "Content", icon: "fa-pen-nib", color: "#ec4899" },
];

export const messagesRouter = createRouter({
  list: publicQuery
    .input(z.object({
      channel: z.string().optional(),
      limit: z.number().min(1).max(100).optional(),
    }).optional())
    .query(async ({ input }) => {
      const limit = input?.limit ?? 50;
      const messages = await messagesCollection();

      let rows: MessageDoc[];
      if (input?.channel && input.channel !== "all") {
        rows = (await messages.find({ channel: input.channel }).toArray() as MessageDoc[])
          .sort((a: MessageDoc, b: MessageDoc) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
          .slice(0, limit);
      } else {
        rows = (await messages.find().toArray() as MessageDoc[])
          .sort((a: MessageDoc, b: MessageDoc) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
          .slice(0, limit);
      }

      const replyToIds = rows.filter((r: MessageDoc) => r.replyToId).map((r: MessageDoc) => r.replyToId as number);
      const replyMap = new Map<number, { text: string; fromName: string }>();
      if (replyToIds.length > 0) {
        const allMsgRows = await messages.find({ id: { $in: replyToIds } }).toArray() as MessageDoc[];
        for (const m of allMsgRows) {
          replyMap.set(m.id, { text: m.text || "", fromName: m.fromName || "Unknown" });
        }
      }

      return rows.map((row: MessageDoc) => ({
        id: row.id,
        text: row.text,
        fromUserId: row.fromUserId,
        fromName: row.fromName,
        channel: row.channel,
        replyToId: row.replyToId,
        replyToText: row.replyToId ? replyMap.get(row.replyToId)?.text : null,
        replyToName: row.replyToId ? replyMap.get(row.replyToId)?.fromName : null,
        createdAt: row.createdAt,
      }));
    }),

  create: publicQuery
    .input(z.object({
      text: z.string().min(1).max(2000),
      fromUserId: z.number(),
      fromName: z.string(),
      channel: z.string(),
      replyToId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const messages = await messagesCollection();
      await messages.insertOne({
        id: await getNextId("message"),
        text: input.text,
        fromUserId: input.fromUserId,
        fromName: input.fromName,
        channel: input.channel,
        replyToId: input.replyToId ?? null,
        createdAt: new Date(),
      });
      return { success: true };
    }),
});
