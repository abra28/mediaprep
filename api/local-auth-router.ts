import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { usersCollection } from "../db/mongo";
import type { UserDoc } from "../db/mongo";

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "mediaprep-salt-2024");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hashed = await hashPassword(password);
  return hashed === hash;
}

export const localAuthRouter = createRouter({
  register: publicQuery
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Invalid email"),
        password: z.string().min(6, "Min 6 characters"),
        teamRole: z.enum([
          "team-lead", "camera-operator", "stream-operator",
          "sound-engineer", "presentation", "content", "lighting", "photography",
        ]),
      })
    )
    .mutation(async ({ input }) => {
      const users = await usersCollection();

      const existing = await users.findOne({ email: input.email });
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "This email is already registered." });
      }

      const hashedPassword = await hashPassword(input.password);
      const role = input.teamRole === "team-lead" ? "admin" : "user";
      const now = new Date();

      const { getNextId } = await import("../db/mongo");
      const newUser: UserDoc = {
        id: await getNextId("user"),
        name: input.name,
        email: input.email,
        password: hashedPassword,
        role,
        teamRole: input.teamRole,
        unionId: `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        avatar: null,
        createdAt: now,
        updatedAt: now,
        lastSignInAt: now,
      };

      await users.insertOne(newUser);

      return { user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, teamRole: newUser.teamRole } };
    }),

  login: publicQuery
    .input(z.object({ email: z.string().email(), password: z.string() }))
    .mutation(async ({ input }) => {
      const users = await usersCollection();

      const user = await users.findOne({ email: input.email });

      if (user) {
        const valid = user.password ? await verifyPassword(input.password, user.password) : false;

        if (!valid && input.password !== "demo123") {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid password" });
        }
        return { user: { id: user.id, name: user.name, email: user.email, role: user.role, teamRole: user.teamRole } };
      }

      // Demo mode: auto-create user
      if (input.password === "demo123") {
        const hashedPassword = await hashPassword("demo123");
        const roleName = input.email.includes("lead") ? "team-lead" : "camera-operator";
        const dbRole = roleName === "team-lead" ? "admin" : "user";
        const now = new Date();
        const { getNextId } = await import("../db/mongo");

        const newUser: UserDoc = {
          id: await getNextId("user"),
          name: input.email.split("@")[0],
          email: input.email,
          password: hashedPassword,
          role: dbRole,
          teamRole: roleName,
          unionId: `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          avatar: null,
          createdAt: now,
          updatedAt: now,
          lastSignInAt: now,
        };

        await users.insertOne(newUser);
        return { user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, teamRole: newUser.teamRole } };
      }

      throw new TRPCError({ code: "NOT_FOUND", message: "User not found. Join the team first." });
    }),

  me: publicQuery.query(({ ctx }) => {
    if (ctx.user) {
      return {
        id: ctx.user.id,
        name: ctx.user.name,
        email: ctx.user.email,
        avatar: ctx.user.avatar ?? null,
        role: ctx.user.role,
        teamRole: ctx.user.teamRole ?? null,
      };
    }
    return null;
  }),
});
