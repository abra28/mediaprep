import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { usersCollection, checklistItemsCollection, checklistStatesCollection, issuesCollection } from "../db/mongo";
import type { UserDoc, ChecklistItemDoc, ChecklistStateDoc, IssueDoc } from "../db/mongo";

export const reportRouter = createRouter({
  getServiceReport: publicQuery
    .input(z.object({ since: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const sinceMs = input?.since ? new Date(input.since).getTime() : Date.now() - 6 * 60 * 60 * 1000;

      const [usersCol, itemsCol, statesCol, issuesCol] = await Promise.all([
        usersCollection(), checklistItemsCollection(), checklistStatesCollection(), issuesCollection(),
      ]);

      const [allUsers, allItems, allStates, allIssues] = await Promise.all([
        usersCol.find().toArray() as Promise<UserDoc[]>,
        itemsCol.find().toArray() as Promise<ChecklistItemDoc[]>,
        statesCol.find().toArray() as Promise<ChecklistStateDoc[]>,
        issuesCol.find().toArray() as Promise<IssueDoc[]>,
      ]);

      const recentStates = allStates.filter((s: ChecklistStateDoc) => (s.timestamp?.getTime() ?? 0) >= sinceMs);

      const teamStats = allUsers.map((user: UserDoc) => {
        const userItems = allItems.filter(
          (item: ChecklistItemDoc) => item.role === user.teamRole || item.role === "all" || user.teamRole === "team-lead"
        );
        const userStateMap = new Map(
          allStates.filter((s: ChecklistStateDoc) => s.userId === user.id).map((s: ChecklistStateDoc) => [s.itemId, s.checked])
        );
        const completed = userItems.filter((item: ChecklistItemDoc) => userStateMap.get(item.id)).length;
        const total = userItems.length;
        return {
          userId: user.id, name: user.name || "Unknown", role: user.teamRole || "member",
          completed, total, percent: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      });

      const phaseStats: Record<string, { completed: number; total: number }> = {};
      for (const item of allItems) {
        if (!phaseStats[item.phase]) phaseStats[item.phase] = { completed: 0, total: 0 };
        phaseStats[item.phase].total++;
        const checked = allStates.some((s: ChecklistStateDoc) => s.itemId === item.id && s.checked);
        if (checked) phaseStats[item.phase].completed++;
      }

      const phaseBreakdown = Object.entries(phaseStats).map(([phase, stats]) => ({
        phase, ...stats, percent: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
      }));

      const totalTasks = allItems.length;
      const totalCompleted = allStates.filter((s: ChecklistStateDoc) => s.checked).length;
      const overallPercent = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;
      const openIssues = allIssues.filter((i: IssueDoc) => !i.resolved).length;
      const resolvedIssues = allIssues.filter((i: IssueDoc) => i.resolved).length;

      const recentActivity = recentStates.filter((s: ChecklistStateDoc) => s.checked)
        .sort((a: ChecklistStateDoc, b: ChecklistStateDoc) => (b.timestamp?.getTime() ?? 0) - (a.timestamp?.getTime() ?? 0))
        .slice(0, 30)
        .map((state: ChecklistStateDoc) => {
          const item = allItems.find((i: ChecklistItemDoc) => i.id === state.itemId);
          const user = allUsers.find((u: UserDoc) => u.id === state.userId);
          return {
            id: state.id, itemText: item?.text || "Unknown task", itemPhase: item?.phase || "unknown",
            userName: user?.name || "Unknown", userRole: user?.teamRole || "member", timestamp: state.timestamp,
          };
        });

      const timestamps = recentStates.map((s: ChecklistStateDoc) => (s.timestamp?.getTime() ?? 0)).filter((t: number) => t > 0);
      const firstActivity = timestamps.length > 0 ? new Date(Math.min(...timestamps)) : null;
      const lastActivity = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null;
      let durationMinutes = 0;
      if (firstActivity && lastActivity) durationMinutes = Math.round((lastActivity.getTime() - firstActivity.getTime()) / 60000);

      return {
        serviceDate: new Date().toISOString(), overallPercent, totalTasks, totalCompleted,
        openIssues, resolvedIssues, totalIssues: allIssues.length, teamSize: allUsers.length,
        durationMinutes, firstActivity: firstActivity?.toISOString() || null, lastActivity: lastActivity?.toISOString() || null,
        teamStats, phaseBreakdown,
        issues: allIssues.map((i: IssueDoc) => ({ id: i.id, description: i.description, severity: i.severity, reporterName: i.reporterName, resolved: i.resolved, createdAt: i.createdAt })),
        recentActivity,
      };
    }),
});
