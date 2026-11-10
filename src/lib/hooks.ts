"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { db, getSettings } from "./db";
import { DEFAULT_SETTINGS, type Progress, type Settings, type Word } from "./types";
import { baseWords, mergeWords } from "./words";

export function useWords(): Word[] {
  const edits = useLiveQuery(() => db.wordEdits.toArray(), [], []);
  return useMemo(() => mergeWords(baseWords, edits), [edits]);
}

export function useProgressMap(): Map<string, Progress> | undefined {
  const rows = useLiveQuery(() => db.progress.toArray(), []);
  return useMemo(() => (rows ? new Map(rows.map((p) => [p.wordId, p])) : undefined), [rows]);
}

export function useSettings(): Settings {
  return useLiveQuery(() => getSettings(), [], DEFAULT_SETTINGS);
}

export function useDailyStats() {
  return useLiveQuery(() => db.dailyStats.toArray(), [], []);
}
