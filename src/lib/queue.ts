import type { Progress, StudyMode, Word } from "./types";
import { findWordInSentence } from "./words";

export interface QueueItem {
  wordId: string;
  mode: StudyMode;
  isNew: boolean;
}

export interface TodayPlan {
  due: Word[]; // 오늘 복습할 단어 (기한 지난 것 포함)
  fresh: Word[]; // 오늘 남은 신규 단어
  newDoneToday: number;
}

/** 오늘 큐: 기한 지난 복습(오답 우선, 오래된 것 우선) + 신규(빈출 순위 순, 하루 목표량까지) */
export function buildTodayPlan(
  words: Word[],
  progress: Map<string, Progress>,
  today: string,
  dailyNewGoal: number,
): TodayPlan {
  const due: { w: Word; p: Progress }[] = [];
  const fresh: Word[] = [];
  let newDoneToday = 0;
  for (const w of words) {
    const p = progress.get(w.id);
    if (!p) {
      fresh.push(w);
      continue;
    }
    if (p.firstSeen === today && p.status !== "known") newDoneToday++;
    if (p.status === "known") continue;
    if (p.due <= today && p.lastReviewed !== today) due.push({ w, p });
  }
  due.sort((a, b) => b.p.wrong - a.p.wrong || a.p.due.localeCompare(b.p.due) || a.w.rank - b.w.rank);
  fresh.sort((a, b) => a.rank - b.rank);
  const remaining = Math.max(0, dailyNewGoal - newDoneToday);
  return { due: due.map((d) => d.w), fresh: fresh.slice(0, remaining), newDoneToday };
}

export function canCloze(w: Word): boolean {
  return !!findWordInSentence(w.word, w.example.en);
}

const QUIZ_MODES: StudyMode[] = ["choice", "spelling", "cloze"];

/**
 * 세션 큐 만들기.
 * - mode="mixed": 신규 단어는 플래시카드 → (뒤에서) 4지선다로 한 번 더 확인, 복습 단어는 퀴즈 유형을 섞어 출제
 * - 그 외: 지정한 유형으로만 출제 (빈칸 불가 단어는 4지선다로 대체)
 */
export function buildSession(
  dueWords: Word[],
  newWords: Word[],
  mode: StudyMode | "mixed",
  rand: () => number = Math.random,
): QueueItem[] {
  const pick = (w: Word, m: StudyMode): StudyMode => (m === "cloze" && !canCloze(w) ? "choice" : m);
  if (mode !== "mixed") {
    return [
      ...dueWords.map((w) => ({ wordId: w.id, mode: pick(w, mode), isNew: false })),
      ...newWords.map((w) => ({ wordId: w.id, mode: pick(w, mode), isNew: true })),
    ];
  }
  const items: QueueItem[] = dueWords.map((w) => ({
    wordId: w.id,
    mode: pick(w, QUIZ_MODES[Math.floor(rand() * QUIZ_MODES.length)]),
    isNew: false,
  }));
  // 신규 단어: 5개씩 묶어서 카드로 익힌 뒤 바로 퀴즈로 확인
  for (let i = 0; i < newWords.length; i += 5) {
    const chunk = newWords.slice(i, i + 5);
    items.push(...chunk.map((w) => ({ wordId: w.id, mode: "flashcard" as StudyMode, isNew: true })));
    items.push(...chunk.map((w) => ({ wordId: w.id, mode: "choice" as StudyMode, isNew: true })));
  }
  return items;
}

/** 4지선다 보기: 같은 품사 우선, 비슷한 순위대에서 오답 3개 */
export function makeChoices(target: Word, pool: Word[], rand: () => number = Math.random): Word[] {
  const others = pool.filter((w) => w.id !== target.id && w.meanings[0] !== target.meanings[0]);
  const samePos = others.filter((w) => w.pos.some((p) => target.pos.includes(p)));
  const base = samePos.length >= 3 ? samePos : others;
  const near = [...base].sort((a, b) => Math.abs(a.rank - target.rank) - Math.abs(b.rank - target.rank)).slice(0, 30);
  const distractors: Word[] = [];
  const cand = [...near];
  while (distractors.length < 3 && cand.length) {
    distractors.push(cand.splice(Math.floor(rand() * cand.length), 1)[0]);
  }
  const all = [target, ...distractors];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

/** 철자 비교: 대소문자·앞뒤 공백·중복 공백 무시 */
export function spellingMatches(input: string, word: string): boolean {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  return norm(input) === norm(word);
}
