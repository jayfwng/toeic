import { describe, expect, it } from "vitest";
import { exportWordsCSV, parseImport, exportDailyCSV } from "@/lib/csv";
import { validateWords } from "@/lib/validate";
import { baseWords, findWordInSentence, mergeWords } from "@/lib/words";
import { calcExamPlan, calcStreak } from "@/lib/stats";
import { newProgress } from "@/lib/srs";

describe("words.json", () => {
  it("시드 300개, 검증 통과", () => {
    expect(baseWords.length).toBeGreaterThanOrEqual(300);
    expect(validateWords(baseWords)).toEqual([]);
  });
  it("예문에서 활용형 찾기", () => {
    expect(findWordInSentence("apply", "She applied for the job.")).not.toBeNull();
    expect(findWordInSentence("submit", "It was submitted late.")).not.toBeNull();
    expect(findWordInSentence("schedule", "It was rescheduled.")).toBeNull();
  });
  it("수정 레이어 병합: 수정/삭제/추가", () => {
    const [a, b] = baseWords;
    const merged = mergeWords(baseWords.slice(0, 3), [
      { id: a.id, data: { ...a, meanings: ["바뀜"] }, updatedAt: 0 },
      { id: b.id, deleted: true, updatedAt: 0 },
      { id: "zzz", data: { ...a, id: "zzz", word: "zzz", rank: 9999 }, updatedAt: 0 },
    ]);
    expect(merged.map((w) => w.id)).toEqual([a.id, baseWords[2].id, "zzz"]);
    expect(merged[0].meanings).toEqual(["바뀜"]);
  });
});

describe("CSV", () => {
  it("단어+학습기록 왕복", () => {
    const words = baseWords.slice(0, 5);
    const p = { ...newProgress(words[1].id, "2026-11-10"), interval: 6, wrong: 1 as const };
    const csv = exportWordsCSV(words, new Map([[p.wordId, p]]));
    const back = parseImport(csv);
    expect(back.errors).toEqual([]);
    expect(back.words).toEqual(words);
    expect(back.progress).toEqual([p]);
  });
  it("일별 기록 왕복", () => {
    const daily = [{ date: "2026-11-09", newCount: 30, reviewCount: 10, correct: 35, total: 40 }];
    const back = parseImport(exportDailyCSV(daily));
    expect(back.kind).toBe("daily");
    expect(back.daily).toEqual(daily);
  });
});

describe("통계", () => {
  it("연속 학습일", () => {
    const s = (date: string) => ({ date, newCount: 1, reviewCount: 0, correct: 1, total: 1 });
    expect(calcStreak([s("2026-11-08"), s("2026-11-09"), s("2026-11-10")], "2026-11-10")).toBe(3);
    expect(calcStreak([s("2026-11-08"), s("2026-11-09")], "2026-11-10")).toBe(2); // 오늘 아직 안 함
    expect(calcStreak([s("2026-11-07")], "2026-11-10")).toBe(0);
  });
  it("D-day 하루 필요량", () => {
    const plan = calcExamPlan("2027-02-28", "2026-11-10", 300, 1000, new Map());
    expect(plan.daysLeft).toBe(110);
    expect(plan.perDay).toBe(Math.ceil(1000 / 103));
  });
});
