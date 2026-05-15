import { usersCollection } from "../../db/mongo";
import { env } from "../lib/env";
import type { UserDoc } from "../../db/mongo";

export async function findUserByUnionId(unionId: string): Promise<UserDoc | null> {
  const users = await usersCollection();
  return await users.findOne({ unionId });
}

export async function upsertUser(data: Partial<UserDoc>): Promise<UserDoc> {
  const users = await usersCollection();
  const existing = data.unionId ? await users.findOne({ unionId: data.unionId }) : null;

  const updateSet: Partial<UserDoc> = {
    lastSignInAt: new Date(),
    ...data,
  };

  if (data.role === undefined && data.unionId && data.unionId === env.ownerUnionId) {
    updateSet.role = "admin";
  }

  if (existing) {
    await users.updateOne({ id: existing.id }, { $set: updateSet });
    return { ...existing, ...updateSet } as UserDoc;
  } else {
    const { getNextId } = await import("../../db/mongo");
    const newUser: UserDoc = {
      id: await getNextId("user"),
      unionId: data.unionId || `oauth_${Date.now()}`,
      name: data.name || null,
      email: data.email || null,
      avatar: data.avatar || null,
      password: null,
      role: (updateSet.role as "user" | "admin") || "user",
      teamRole: data.teamRole || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignInAt: new Date(),
      ...data,
    };
    await users.insertOne(newUser);
    return newUser;
  }
}
