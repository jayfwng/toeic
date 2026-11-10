import { db } from "./db";
import { toDateStr } from "./date";
import { markKnown, newProgress, review } from "./srs";
import type { ParsedImport } from "./csv";
import type { Quality, StudyMode, Word, WordEdit } from "./types";
import { baseWords } from "./words";
import { validateWord } from "./validate";

/** 응답 1건 기록: SRS 갱신 + 로그 + 일별 통계 (트랜잭션) */
export async function recordAnswer(wordId: string, mode: StudyMode, quality: Quality): Promise<void> {
  const today = toDateStr();
  await db.transaction("rw", db.progress, db.reviewLog, db.dailyStats, async () => {
    const prev = await db.progress.get(wordId);
    const isNew = !prev || prev.status === "known";
    const firstToday = !prev || prev.lastReviewed !== today;
    const next = review(prev && prev.status !== "known" ? prev : newProgress(wordId, today), quality, today);
    await db.progress.put(next);
    await db.reviewLog.add({ wordId, date: today, mode, quality, ts: Date.now() });
    const s = (await db.dailyStats.get(today)) ?? { date: today, newCount: 0, reviewCount: 0, correct: 0, total: 0 };
    s.total++;
    if (quality >= 3) s.correct++;
    if (isNew) s.newCount++;
    else if (firstToday) s.reviewCount++;
    await db.dailyStats.put(s);
  });
}

/** '이미 아는 단어' — 여러 개를 한 번에 제외 */
export async function markKnownMany(wordIds: string[]): Promise<void> {
  const today = toDateStr();
  await db.transaction("rw", db.progress, async () => {
    const existing = await db.progress.bulkGet(wordIds);
    await db.progress.bulkPut(wordIds.map((id, i) => markKnown(existing[i], id, today)));
  });
}

/** 아는 단어 처리 취소 → 신규로 되돌림 */
export async function unmarkKnown(wordId: string): Promise<void> {
  const p = await db.progress.get(wordId);
  if (p?.status === "known") await db.progress.delete(wordId);
}

export async function removeFromWrong(wordId: string): Promise<void> {
  await db.progress.update(wordId, { wrong: 0, wrongStreak: 0 });
}

export async function saveWord(w: Word): Promise<string[]> {
  const errs = validateWord(w);
  if (errs.length) return errs;
  await db.wordEdits.put({ id: w.id, data: w, updatedAt: Date.now() });
  return [];
}

export async function deleteWord(id: string): Promise<void> {
  const isBase = baseWords.some((w) => w.id === id);
  await db.transaction("rw", db.wordEdits, db.progress, async () => {
    if (isBase) await db.wordEdits.put({ id, deleted: true, updatedAt: Date.now() });
    else await db.wordEdits.delete(id);
    await db.progress.delete(id);
  });
}

/** CSV 가져오기 적용. 원본과 동일한 단어는 수정 레이어에 저장하지 않는다 */
export async function applyImport(data: ParsedImport): Promise<{ words: number; progress: number; daily: number; skipped: string[] }> {
  const skipped: string[] = [];
  const baseMap = new Map(baseWords.map((w) => [w.id, w]));
  const edits: WordEdit[] = [];
  for (const w of data.words) {
    const errs = validateWord(w);
    if (errs.length) { skipped.push(`${w.word}: ${errs[0]}`); continue; }
    const b = baseMap.get(w.id);
    if (b && JSON.stringify(b) === JSON.stringify(w)) continue;
    edits.push({ id: w.id, data: w, updatedAt: Date.now() });
  }
  await db.transaction("rw", db.wordEdits, db.progress, db.dailyStats, async () => {
    await db.wordEdits.bulkPut(edits);
    await db.progress.bulkPut(data.progress);
    await db.dailyStats.bulkPut(data.daily);
  });
  return { words: edits.length, progress: data.progress.length, daily: data.daily.length, skipped };
}

export async function resetAllProgress(): Promise<void> {
  await db.transaction("rw", db.progress, db.reviewLog, db.dailyStats, async () => {
    await db.progress.clear();
    await db.reviewLog.clear();
    await db.dailyStats.clear();
  });
}
