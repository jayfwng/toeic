import { describe, expect, it } from "vitest";
import { buildSession, buildTodayPlan, makeChoices, spellingMatches } from "@/lib/queue";
import { newProgress, review } from "@/lib/srs";
import { baseWords } from "@/lib/words";
import type { Progress } from "@/lib/types";

const today = "2026-11-10";

describe("오늘 큐", () => {
  it("신규는 빈출 순위 순으로 하루 목표량만큼", () => {
    const plan = buildTodayPlan(baseWords, new Map(), today, 30);
    expect(plan.fresh).toHaveLength(30);
    expect(plan.fresh.map((w) => w.rank)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    expect(plan.due).toHaveLength(0);
  });

  it("오늘 시작한 단어 수만큼 신규가 줄고, 기한 지난 단어는 복습에 포함, 아는 단어 제외", () => {
    const m = new Map<string, Progress>();
    const [a, b, c] = baseWords;
    m.set(a.id, { ...review(newProgress(a.id, "2026-11-01"), 4, "2026-11-01") }); // due 11-02 → 복습
    m.set(b.id, { ...newProgress(b.id, today), status: "known" });
    m.set(c.id, review(newProgress(c.id, today), 4, today)); // 오늘 신규 학습
    const plan = buildTodayPlan(baseWords, m, today, 30);
    expect(plan.due.map((w) => w.id)).toEqual([a.id]);
    expect(plan.newDoneToday).toBe(1);
    expect(plan.fresh).toHaveLength(29);
    expect(plan.fresh.find((w) => w.id === b.id)).toBeUndefined();
  });

  it("추천 모드: 신규는 카드 후 4지선다로 확인", () => {
    const s = buildSession([], baseWords.slice(0, 5), "mixed");
    expect(s.map((x) => x.mode)).toEqual([...Array(5).fill("flashcard"), ...Array(5).fill("choice")]);
  });

  it("4지선다 보기는 정답 포함 4개, 중복 없음", () => {
    const target = baseWords[10];
    const ch = makeChoices(target, baseWords);
    expect(ch).toHaveLength(4);
    expect(new Set(ch.map((w) => w.id)).size).toBe(4);
    expect(ch.some((w) => w.id === target.id)).toBe(true);
  });

  it("철자 비교는 대소문자/공백 무시", () => {
    expect(spellingMatches("  Schedule ", "schedule")).toBe(true);
    expect(spellingMatches("according  to", "according to")).toBe(true);
    expect(spellingMatches("shedule", "schedule")).toBe(false);
  });
});
