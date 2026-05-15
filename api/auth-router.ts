import { createRouter, publicQuery } from "./middleware";

export const authRouter = createRouter({
  me: publicQuery.query(({ ctx }) => {
    if (ctx.user) {
      return {
        id: Number(ctx.user.id),
        name: ctx.user.name,
        email: ctx.user.email,
        avatar: ctx.user.avatar ?? null,
        role: ctx.user.role,
        teamRole: ctx.user.teamRole ?? null,
      };
    }
    return null;
  }),

  logout: publicQuery.mutation(() => {
    return { ok: true };
  }),
});
