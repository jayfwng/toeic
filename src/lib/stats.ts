import { addDays, diffDays } from "./date";
import { isMastered } from "./srs";
import type { DailyStat, Progress, Word } from "./types";

/** 연속 학습일: 오늘(또는 어제)부터 거꾸로 하루도 빠짐없이 학습한 날 수 */
export function calcStreak(stats: DailyStat[], today: string): number {
  const days = new Set(stats.filter((s) => s.total > 0).map((s) => s.date));
  let d = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export const BANDS = [100, 300, 500, 700, 1000, 1500, 2000];

export interface BandProgress {
  band: number;
  total: number;
  mastered: number;
  known: number;
  learning: number;
}

/** 빈출 순위 구간별 진행률(상위 100/300/500…) */
export function calcBands(words: Word[], progress: Map<string, Progress>): BandProgress[] {
  const maxRank = words.reduce((m, w) => Math.max(m, w.rank), 0);
  const bands = BANDS.filter((b, i) => b <= maxRank || (i > 0 && BANDS[i - 1] < maxRank));
  return bands.map((band) => {
    const inBand = words.filter((w) => w.rank <= band);
    let mastered = 0, known = 0, learning = 0;
    for (const w of inBand) {
      const p = progress.get(w.id);
      if (!p) continue;
      if (p.status === "known") known++;
      else if (isMastered(p)) mastered++;
      else learning++;
    }
    return { band, total: inBand.length, mastered, known, learning };
  });
}

export interface ExamPlan {
  daysLeft: number;
  target: number;
  started: number; // 학습 시작(또는 아는 단어 처리)한 단어 수
  remaining: number;
  perDay: number; // 하루 필요 신규 학습량
}

export function calcExamPlan(
  examDate: string,
  today: string,
  totalWords: number,
  targetCount: number,
  progress: Map<string, Progress>,
): ExamPlan {
  const daysLeft = diffDays(today, examDate);
  const target = targetCount > 0 ? targetCount : totalWords;
  const started = Math.min(target, progress.size);
  const remaining = Math.max(0, target - started);
  // 마지막 7일은 복습 전용으로 남겨둔다
  const studyDays = Math.max(1, daysLeft - 7);
  const perDay = remaining === 0 ? 0 : Math.ceil(remaining / studyDays);
  return { daysLeft, target, started, remaining, perDay };
}
