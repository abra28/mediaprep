import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { customTasksCollection, checklistStatesCollection, getNextId } from "../db/mongo";
import type { CustomTaskDoc } from "../db/mongo";

export const customTasksRouter = createRouter({
  list: publicQuery
    .input(z.object({
      phase: z.string().optional(),
      role: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const tasks = await customTasksCollection();
      const results = await tasks.find().toArray() as CustomTaskDoc[];
      return results.filter((item: CustomTaskDoc) => {
        if (input?.phase && item.phase !== input.phase) return false;
        if (input?.role && input.role !== "all" && item.role !== input.role && item.role !== "all") return false;
        return true;
      }).sort((a: CustomTaskDoc, b: CustomTaskDoc) => a.order - b.order);
    }),

  create: publicQuery
    .input(z.object({
      text: z.string().min(1),
      phase: z.string(),
      role: z.string(),
      addedBy: z.number(),
      addedByName: z.string(),
    }))
    .mutation(async ({ input }) => {
      const tasks = await customTasksCollection();
      await tasks.insertOne({
        id: await getNextId("custom_task"),
        text: input.text,
        phase: input.phase,
        role: input.role,
        addedBy: input.addedBy,
        addedByName: input.addedByName,
        order: 0,
        createdAt: new Date(),
      });
      return { success: true };
    }),

  update: publicQuery
    .input(z.object({
      id: z.number(),
      text: z.string().min(1),
      phase: z.string(),
      role: z.string(),
    }))
    .mutation(async ({ input }) => {
      const tasks = await customTasksCollection();
      await tasks.updateOne(
        { id: input.id },
        { $set: { text: input.text, phase: input.phase, role: input.role } }
      );
      return { success: true };
    }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const [statesCol, tasksCol] = await Promise.all([checklistStatesCollection(), customTasksCollection()]);
      await statesCol.deleteMany({ itemId: input.id });
      await tasksCol.deleteOne({ id: input.id });
      return { success: true };
    }),
});
