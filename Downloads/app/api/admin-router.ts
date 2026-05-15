import { z } from "zod";
import { createRouter, adminQuery } from "./middleware";
import { usersCollection, checklistItemsCollection, checklistStatesCollection, issuesCollection, appSettingsCollection } from "../db/mongo";
import type { UserDoc, ChecklistItemDoc, ChecklistStateDoc, IssueDoc } from "../db/mongo";

export const adminRouter = createRouter({
  getStats: adminQuery.query(async () => {
    const [usersCol, itemsCol, statesCol, issuesCol] = await Promise.all([
      usersCollection(), checklistItemsCollection(), checklistStatesCollection(), issuesCollection(),
    ]);

    const [allUsers, allItems, allStates, allIssues] = await Promise.all([
      usersCol.find().toArray() as Promise<UserDoc[]>,
      itemsCol.find().toArray() as Promise<ChecklistItemDoc[]>,
      statesCol.find().toArray() as Promise<ChecklistStateDoc[]>,
      issuesCol.find().toArray() as Promise<IssueDoc[]>,
    ]);

    const teamSize = allUsers.length;
    const totalTasks = allItems.length;
    const totalCompleted = allStates.filter((s: ChecklistStateDoc) => s.checked).length;
    const totalPossible = totalTasks * teamSize;
    const overallCompletion = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
    const openIssues = allIssues.filter((i: IssueDoc) => !i.resolved).length;

    const settings = await appSettingsCollection();
    const serviceTimeSetting = await settings.findOne({ key: "serviceTime" });
    const serviceTimeStr = serviceTimeSetting?.value ?? "09:00";
    const [hours, minutes] = serviceTimeStr.split(":").map(Number);
    const serviceTime = new Date();
    serviceTime.setHours(hours, minutes, 0, 0);
    const now = new Date();
    const diff = serviceTime.getTime() - now.getTime();

    let timeToService = "LIVE";
    if (diff > 0) {
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      timeToService = h > 0 ? `${h}h ${m}m` : `${m}m`;
    }

    return { teamSize, overallCompletion, timeToService, openIssues };
  }),

  getTeamProgress: adminQuery.query(async () => {
    const [usersCol, itemsCol, statesCol] = await Promise.all([
      usersCollection(), checklistItemsCollection(), checklistStatesCollection(),
    ]);

    const [allUsers, allItems] = await Promise.all([
      usersCol.find().toArray() as Promise<UserDoc[]>,
      itemsCol.find().toArray() as Promise<ChecklistItemDoc[]>,
    ]);

    const result = await Promise.all(
      allUsers.map(async (user: UserDoc) => {
        const userStates = await statesCol.find({ userId: user.id }).toArray() as ChecklistStateDoc[];
        const stateMap = new Map(userStates.map((s: ChecklistStateDoc) => [s.itemId, s.checked]));

        const userItems = allItems.filter(
          (item: ChecklistItemDoc) => item.role === user.teamRole || item.role === "all" || user.teamRole === "team-lead"
        );
        const completed = userItems.filter((item: ChecklistItemDoc) => stateMap.get(item.id)).length;
        const total = userItems.length;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

        let status = "critical";
        if (percent >= 80) status = "ready";
        else if (percent >= 50) status = "warning";

        return {
          user: { id: user.id, name: user.name, role: user.teamRole, email: user.email },
          completed, total, percent, status,
        };
      })
    );

    return result;
  }),

  resetProgress: adminQuery.mutation(async () => {
    const [statesCol, issuesCol] = await Promise.all([checklistStatesCollection(), issuesCollection()]);
    await statesCol.deleteMany({});
    await issuesCol.deleteMany({});
    return { success: true };
  }),

  deleteMember: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const [statesCol, issuesCol, usersCol] = await Promise.all([
        checklistStatesCollection(), issuesCollection(), usersCollection(),
      ]);
      await statesCol.deleteMany({ userId: input.id });
      await issuesCol.deleteMany({ reportedBy: input.id });
      await usersCol.deleteOne({ id: input.id });
      return { success: true };
    }),
});
