import { authRouter } from "./auth-router";
import { localAuthRouter } from "./local-auth-router";
import { checklistRouter } from "./checklist-router";
import { issuesRouter } from "./issues-router";
import { adminRouter } from "./admin-router";
import { settingsRouter } from "./settings-router";
import { teamRouter } from "./team-router";
import { customTasksRouter } from "./custom-tasks-router";
import { reportRouter } from "./report-router";
import { messagesRouter } from "./messages-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  localAuth: localAuthRouter,
  checklist: checklistRouter,
  issues: issuesRouter,
  admin: adminRouter,
  settings: settingsRouter,
  team: teamRouter,
  customTasks: customTasksRouter,
  report: reportRouter,
  messages: messagesRouter,
});

export type AppRouter = typeof appRouter;
