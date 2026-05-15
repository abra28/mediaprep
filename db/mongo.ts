import { MongoClient, Db, type Collection } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/mediaprep";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectMongo(): Promise<Db> {
  if (db) return db;
  client = new MongoClient(uri);
  await client.connect();
  const dbName = process.env.MONGODB_DB_NAME || "mediaprep";
  db = client.db(dbName);
  console.log("MongoDB connected to", dbName);
  return db;
}

export async function getDb(): Promise<Db> {
  if (db) return db;
  return connectMongo();
}

// Auto-increment counter helper
export async function getNextId(counterName: string): Promise<number> {
  const database = await getDb();
  const counters = database.collection("counters");
  const result = await counters.findOneAndUpdate(
    { _id: counterName as any },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  return result?.seq ?? 1;
}

// Collection accessors
export async function usersCollection(): Promise<Collection<UserDoc>> {
  return (await getDb()).collection<UserDoc>("users");
}
export async function checklistItemsCollection(): Promise<Collection<ChecklistItemDoc>> {
  return (await getDb()).collection<ChecklistItemDoc>("checklist_items");
}
export async function checklistStatesCollection(): Promise<Collection<ChecklistStateDoc>> {
  return (await getDb()).collection<ChecklistStateDoc>("checklist_states");
}
export async function issuesCollection(): Promise<Collection<IssueDoc>> {
  return (await getDb()).collection<IssueDoc>("issues");
}
export async function messagesCollection(): Promise<Collection<MessageDoc>> {
  return (await getDb()).collection<MessageDoc>("messages");
}
export async function customTasksCollection(): Promise<Collection<CustomTaskDoc>> {
  return (await getDb()).collection<CustomTaskDoc>("custom_tasks");
}
export async function appSettingsCollection(): Promise<Collection<AppSettingDoc>> {
  return (await getDb()).collection<AppSettingDoc>("app_settings");
}

// Document types
export interface UserDoc {
  id: number;
  unionId: string;
  name: string | null;
  email: string | null;
  avatar: string | null;
  password: string | null;
  role: "user" | "admin";
  teamRole?: string;
  createdAt: Date;
  updatedAt: Date;
  lastSignInAt: Date;
}

export interface ChecklistItemDoc {
  id: number;
  text: string;
  phase: string;
  role: string;
  order: number;
  createdAt: Date;
}

export interface ChecklistStateDoc {
  id: number;
  itemId: number;
  userId: number;
  checked: boolean;
  timestamp: Date;
}

export interface IssueDoc {
  id: number;
  taskId: number | null;
  description: string;
  severity: "low" | "medium" | "high";
  reportedBy: number | null;
  reporterName: string;
  resolved: boolean;
  createdAt: Date;
}

export interface MessageDoc {
  id: number;
  text: string;
  fromUserId: number | null;
  fromName: string | null;
  channel: string;
  replyToId: number | null;
  createdAt: Date;
}

export interface CustomTaskDoc {
  id: number;
  text: string;
  phase: string;
  role: string;
  addedBy: number | null;
  addedByName: string | null;
  order: number;
  createdAt: Date;
}

export interface AppSettingDoc {
  id: number;
  key: string;
  value: string;
  updatedAt: Date;
}
