import { createRouter, publicQuery } from "./middleware";
import { usersCollection, checklistItemsCollection, checklistStatesCollection } from "../db/mongo";
import type { UserDoc, ChecklistItemDoc, ChecklistStateDoc } from "../db/mongo";

export const teamRouter = createRouter({
  list: publicQuery.query(async () => {
    const users = await usersCollection();
    return await users.find().toArray() as UserDoc[];
  }),

  getProgress: publicQuery.query(async () => {
    const [usersCol, itemsCol, statesCol] = await Promise.all([
      usersCollection(), checklistItemsCollection(), checklistStatesCollection(),
    ]);

    const [allUsers, allItems] = await Promise.all([
      usersCol.find().toArray() as Promise<UserDoc[]>,
      itemsCol.find().toArray() as Promise<ChecklistItemDoc[]>,
    ]);

    return await Promise.all(
      allUsers.map(async (user: UserDoc) => {
        const userStates = await statesCol.find({ userId: user.id }).toArray() as ChecklistStateDoc[];
        const stateMap = new Map(userStates.map((s: ChecklistStateDoc) => [s.itemId, s.checked]));
        const userItems = allItems.filter(
          (item: ChecklistItemDoc) => item.role === user.teamRole || item.role === "all" || user.teamRole === "team-lead"
        );
        const completed = userItems.filter((item: ChecklistItemDoc) => stateMap.get(item.id)).length;
        const total = userItems.length;
        return {
          user: { id: user.id, name: user.name, role: user.teamRole, email: user.email },
          completed, total,
          percent: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      })
    );
  }),
});
