import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/date";
import { MASTERED_INTERVAL, newProgress, review, WRONG_CLEAR_STREAK } from "@/lib/srs";

const D0 = "2026-11-10";

describe("SM-2 review", () => {
  it("정답이면 1일 → 6일 → interval×EF", () => {
    let p = review(newProgress("a", D0), 4, D0);
    expect(p.interval).toBe(1);
    expect(p.due).toBe(addDays(D0, 1));
    p = review(p, 4, p.due);
    expect(p.interval).toBe(6);
    const d2 = p.due;
    p = review(p, 4, d2);
    expect(p.interval).toBe(Math.round(6 * p.ease));
    expect(p.wrong).toBe(0);
  });

  it("오답이면 reps 초기화, EF 감소, 내일 복습, 오답장 등록", () => {
    let p = review(newProgress("a", D0), 5, D0);
    p = review(p, 4, p.due);
    const ease = p.ease;
    const day = p.due;
    p = review(p, 1, day);
    expect(p.reps).toBe(0);
    expect(p.interval).toBe(1);
    expect(p.ease).toBeCloseTo(ease - 0.2);
    expect(p.wrong).toBe(1);
    expect(p.lapses).toBe(1);
    expect(p.due).toBe(addDays(day, 1));
  });

  it("오답장 단어는 간격 상한 3일, 3회 연속 정답이면 해제", () => {
    let p = review(newProgress("a", D0), 1, D0);
    let day = p.due;
    for (let i = 1; i <= WRONG_CLEAR_STREAK; i++) {
      p = review(p, 5, day);
      if (i < WRONG_CLEAR_STREAK) {
        expect(p.wrong).toBe(1);
        expect(p.interval).toBeLessThanOrEqual(3);
      }
      day = p.due;
    }
    expect(p.wrong).toBe(0);
  });

  it("같은 날 재응답: 정답은 일정 유지, 오늘 이미 틀린 단어는 중복 감점 없음", () => {
    let p = review(newProgress("a", D0), 4, D0);
    const same = review(p, 5, D0);
    expect(same).toEqual(p);
    p = review(p, 1, D0); // 맞혔다가 같은 날 퀴즈에서 틀림 → lapse
    expect(p.wrong).toBe(1);
    const again = review(p, 1, D0);
    expect(again.lapses).toBe(p.lapses);
    expect(again.ease).toBe(p.ease);
  });

  it("오래 맞히면 암기 완료 간격에 도달", () => {
    let p = newProgress("a", D0);
    let day = D0;
    for (let i = 0; i < 5; i++) { p = review(p, 5, day); day = p.due; }
    expect(p.interval).toBeGreaterThanOrEqual(MASTERED_INTERVAL);
    expect(p.status).toBe("review");
  });
});
