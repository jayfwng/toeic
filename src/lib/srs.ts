import { addDays } from "./date";
import type { Progress, Quality } from "./types";

/** interval 이 이 값 이상이면 '암기 완료' */
export const MASTERED_INTERVAL = 21;
/** 오답 단어장에 있는 동안 복습 간격 상한(일) */
export const WRONG_INTERVAL_CAP = 3;
/** 오답 단어장 해제에 필요한 연속 정답 수 */
export const WRONG_CLEAR_STREAK = 3;

export function newProgress(wordId: string, today: string): Progress {
  return {
    wordId,
    status: "learning",
    ease: 2.5,
    interval: 0,
    reps: 0,
    due: today,
    lapses: 0,
    wrong: 0,
    wrongStreak: 0,
    firstSeen: today,
    lastReviewed: "",
  };
}

export function isMastered(p: Progress | undefined): boolean {
  return !!p && p.status !== "known" && p.interval >= MASTERED_INTERVAL;
}

/**
 * SM-2 변형.
 * - q >= 3: 표준 SM-2 (1일 → 6일 → interval × EF)
 * - q < 3 : reps 초기화, EF -0.2, 내일 다시, 오답 단어장 등록
 * - 같은 날 두 번째 응답: 정답이면 일정 유지(연습으로 간주), 오답이면 그날 처음 틀린 경우에만 lapse 처리
 * - 오답장 단어는 interval 상한(3일), 3회 연속 정답 시 해제
 */
export function review(prev: Progress, q: Quality, today: string): Progress {
  const p: Progress = { ...prev };
  const correct = q >= 3;
  const sameDay = p.lastReviewed === today;

  if (p.status === "known") p.status = "learning";

  if (sameDay) {
    // 오늘 이미 채점된 단어: 정답은 일정 변화 없음
    if (correct) return p;
    // 오늘 이미 틀린 단어(reps=0, 내일 due)는 중복 감점하지 않음
    if (p.reps === 0 && p.due === addDays(today, 1)) return p;
  }

  if (correct) {
    if (p.reps === 0) p.interval = 1;
    else if (p.reps === 1) p.interval = 6;
    else p.interval = Math.round(p.interval * p.ease);
    p.reps += 1;
    p.ease = Math.max(1.3, p.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

    if (p.wrong) {
      p.wrongStreak += 1;
      if (p.wrongStreak >= WRONG_CLEAR_STREAK) {
        p.wrong = 0;
        p.wrongStreak = 0;
      } else {
        p.interval = Math.min(p.interval, WRONG_INTERVAL_CAP);
      }
    }
  } else {
    p.reps = 0;
    p.interval = 1;
    p.ease = Math.max(1.3, p.ease - 0.2);
    p.lapses += 1;
    p.wrong = 1;
    p.wrongStreak = 0;
  }

  p.due = addDays(today, p.interval);
  p.lastReviewed = today;
  p.status = p.interval >= MASTERED_INTERVAL ? "review" : "learning";
  return p;
}

export function markKnown(prev: Progress | undefined, wordId: string, today: string): Progress {
  const p = prev ? { ...prev } : newProgress(wordId, today);
  p.status = "known";
  p.wrong = 0;
  p.wrongStreak = 0;
  return p;
}
