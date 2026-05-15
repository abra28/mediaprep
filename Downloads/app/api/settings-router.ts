import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { appSettingsCollection } from "../db/mongo";

export const settingsRouter = createRouter({
  get: publicQuery
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      const settings = await appSettingsCollection();
      return await settings.findOne({ key: input.key });
    }),

  set: publicQuery
    .input(z.object({ key: z.string(), value: z.string() }))
    .mutation(async ({ input }) => {
      const settings = await appSettingsCollection();
      const existing = await settings.findOne({ key: input.key });

      if (existing) {
        await settings.updateOne({ key: input.key }, { $set: { value: input.value, updatedAt: new Date() } });
      } else {
        const { getNextId } = await import("../db/mongo");
        await settings.insertOne({
          id: await getNextId("app_setting"),
          key: input.key,
          value: input.value,
          updatedAt: new Date(),
        });
      }
      return { success: true };
    }),
});
