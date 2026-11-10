import Dexie, { type EntityTable } from "dexie";
import type { DailyStat, Progress, ReviewLog, Settings, WordEdit } from "./types";
import { DEFAULT_SETTINGS } from "./types";

export class ToeicDB extends Dexie {
  progress!: EntityTable<Progress, "wordId">;
  reviewLog!: EntityTable<ReviewLog, "id">;
  dailyStats!: EntityTable<DailyStat, "date">;
  wordEdits!: EntityTable<WordEdit, "id">;
  settings!: EntityTable<Settings, "key">;

  constructor() {
    super("toeic-words");
    this.version(1).stores({
      progress: "wordId, due, wrong, status",
      reviewLog: "++id, wordId, date",
      dailyStats: "date",
      wordEdits: "id",
      settings: "key",
    });
  }
}

export const db = new ToeicDB();

export async function getSettings(): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...((await db.settings.get("app")) ?? {}) };
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  const cur = await getSettings();
  await db.settings.put({ ...cur, ...patch, key: "app" });
}
