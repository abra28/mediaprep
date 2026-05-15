import "dotenv/config";

export const env = {
  appId: process.env.APP_ID ?? "mediaprep-app",
  appSecret: process.env.APP_SECRET ?? "mediaprep-secret",
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: process.env.DATABASE_URL ?? "",
  kimiAuthUrl: process.env.KIMI_AUTH_URL ?? "https://auth.kimi.com",
  kimiOpenUrl: process.env.KIMI_OPEN_URL ?? "https://open.kimi.com",
  ownerUnionId: process.env.OWNER_UNION_ID ?? "",
};