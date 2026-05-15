import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { issuesCollection, getNextId } from "../db/mongo";
import type { IssueDoc } from "../db/mongo";

export const issuesRouter = createRouter({
  list: publicQuery
    .input(z.object({ resolved: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      const issues = await issuesCollection();
      const all = (await issues.find().toArray() as IssueDoc[]).sort(
        (a: IssueDoc, b: IssueDoc) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
      );
      if (input?.resolved !== undefined) return all.filter((i: IssueDoc) => i.resolved === input.resolved);
      return all;
    }),

  create: publicQuery
    .input(z.object({
      taskId: z.number().optional(),
      description: z.string().min(1, "Description is required"),
      severity: z.enum(["low", "medium", "high"]),
      reporterName: z.string(),
      reportedBy: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const issues = await issuesCollection();
      await issues.insertOne({
        id: await getNextId("issue"),
        taskId: input.taskId ?? null,
        description: input.description,
        severity: input.severity,
        reportedBy: input.reportedBy ?? null,
        reporterName: input.reporterName,
        resolved: false,
        createdAt: new Date(),
      });
      return { success: true };
    }),

  resolve: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const issues = await issuesCollection();
      await issues.updateOne({ id: input.id }, { $set: { resolved: true } });
      return { success: true };
    }),
});
