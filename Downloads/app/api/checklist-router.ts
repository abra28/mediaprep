import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { checklistItemsCollection, checklistStatesCollection, usersCollection } from "../db/mongo";
import type { ChecklistItemDoc, ChecklistStateDoc, UserDoc } from "../db/mongo";

export const checklistRouter = createRouter({
  getItems: publicQuery
    .input(z.object({
      phase: z.enum(["arrival", "video", "presentation", "streaming", "audio", "golive", "during", "post"]).optional(),
      role: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const items = await checklistItemsCollection();
      const results = await items.find().toArray() as ChecklistItemDoc[];

      return results.filter((item: ChecklistItemDoc) => {
        if (input?.phase && item.phase !== input.phase) return false;
        if (input?.role && input.role !== "all" && item.role !== input.role && item.role !== "all") return false;
        return true;
      }).sort((a: ChecklistItemDoc, b: ChecklistItemDoc) => a.order - b.order);
    }),

  getStates: publicQuery
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const states = await checklistStatesCollection();
      return await states.find({ userId: input.userId }).toArray() as ChecklistStateDoc[];
    }),

  toggleItem: publicQuery
    .input(z.object({ itemId: z.number(), userId: z.number(), checked: z.boolean() }))
    .mutation(async ({ input }) => {
      const states = await checklistStatesCollection();
      const existing = await states.findOne({ itemId: input.itemId, userId: input.userId });

      if (existing) {
        await states.updateOne(
          { id: existing.id },
          { $set: { checked: input.checked, timestamp: new Date() } }
        );
      } else {
        const { getNextId } = await import("../db/mongo");
        await states.insertOne({
          id: await getNextId("checklist_state"),
          itemId: input.itemId,
          userId: input.userId,
          checked: input.checked,
          timestamp: new Date(),
        });
      }
      return { success: true };
    }),

  getProgress: publicQuery
    .input(z.object({ userId: z.number(), phase: z.string().optional(), role: z.string().optional() }))
    .query(async ({ input }) => {
      const [itemsCol, statesCol] = await Promise.all([checklistItemsCollection(), checklistStatesCollection()]);
      const allItems = (await itemsCol.find().toArray() as ChecklistItemDoc[]).filter((item: ChecklistItemDoc) => {
        if (input.phase && input.phase !== "all" && item.phase !== input.phase) return false;
        if (input.role && input.role !== "all" && item.role !== input.role && item.role !== "all") return false;
        return true;
      });

      const states = await statesCol.find({ userId: input.userId }).toArray() as ChecklistStateDoc[];
      const stateMap = new Map(states.map((s: ChecklistStateDoc) => [s.itemId, s.checked]));
      const completed = allItems.filter((item: ChecklistItemDoc) => stateMap.get(item.id)).length;
      const total = allItems.length;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

      return { completed, total, percent };
    }),

  getTeamActivity: publicQuery
    .input(z.object({ limit: z.number().min(1).max(50).optional() }).optional())
    .query(async ({ input }) => {
      const limit = input?.limit ?? 20;
      const [statesCol, itemsCol, usersCol] = await Promise.all([
        checklistStatesCollection(),
        checklistItemsCollection(),
        usersCollection(),
      ]);

      const states = (await statesCol.find({ checked: true }).toArray() as ChecklistStateDoc[])
        .sort((a: ChecklistStateDoc, b: ChecklistStateDoc) => (b.timestamp?.getTime() ?? 0) - (a.timestamp?.getTime() ?? 0))
        .slice(0, limit);

      const [items, allUsers] = await Promise.all([
        itemsCol.find().toArray() as Promise<ChecklistItemDoc[]>,
        usersCol.find().toArray() as Promise<UserDoc[]>,
      ]);

      const itemMap = new Map(items.map((i: ChecklistItemDoc) => [i.id, i]));
      const userMap = new Map(allUsers.map((u: UserDoc) => [u.id, u]));

      return states.map((state: ChecklistStateDoc) => {
        const item = itemMap.get(state.itemId);
        const user = userMap.get(state.userId);
        return {
          id: state.id,
          itemText: item?.text ?? "Unknown task",
          itemPhase: item?.phase ?? "unknown",
          userName: user?.name ?? "Unknown",
          userRole: user?.teamRole ?? "member",
          timestamp: state.timestamp,
        };
      });
    }),
});
