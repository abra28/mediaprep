import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { usersCollection } from "../db/mongo";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: any;
};

export async function createContext(opts: FetchCreateContextFnOptions): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };

  // Try local auth via header
  try {
    const localAuthHeader = opts.req.headers.get("x-local-auth-user");
    if (localAuthHeader) {
      const localUser = JSON.parse(localAuthHeader);
      if (localUser && localUser.id) {
        const users = await usersCollection();
        const found = await users.findOne({ id: localUser.id });
        if (found) {
          ctx.user = found;
        }
      }
    }
  } catch {
    // Local auth not available
  }

  return ctx;
}
