"use client";
import { useMemo } from "react";
import { addDays, toDateStr } from "@/lib/date";
import { useDailyStats, useProgressMap, useWords } from "@/lib/hooks";
import { isMastered } from "@/lib/srs";
import { calcBands, calcStreak } from "@/lib/stats";
import { Card, Loading, PageTitle } from "@/components/ui";

export default function StatsPage() {
  const words = useWords();
  const progress = useProgressMap();
  const daily = useDailyStats();
  const today = toDateStr();

  const data = useMemo(() => {
    if (!progress) return null;
    let mastered = 0, known = 0, learning = 0, wrong = 0;
    for (const p of progress.values()) {
      if (p.status === "known") known++;
      else if (isMastered(p)) mastered++;
      else learning++;
      if (p.wrong) wrong++;
    }
    return { mastered, known, learning, wrong, bands: calcBands(words, progress) };
  }, [words, progress]);

  if (!data) return <Loading />;
  const streak = calcStreak(daily, today);
  const byDate = new Map(daily.map((d) => [d.date, d]));
  const last14 = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13)).map((d) => ({ d, s: byDate.get(d) }));
  const maxTotal = Math.max(1, ...last14.map((x) => x.s?.total ?? 0));
  const totalAns = daily.reduce((a, s) => a + s.total, 0);
  const totalCorrect = daily.reduce((a, s) => a + s.correct, 0);
  const unseen = words.length - data.mastered - data.known - data.learning;

  return (
    <div className="space-y-4">
      <PageTitle>통계</PageTitle>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="연속 학습일" value={`${streak}일`} color="text-orange-500" />
        <Stat label="암기 완료 (간격 21일+)" value={data.mastered} color="text-emerald-600" testId="stat-mastered" />
        <Stat label="학습 중" value={data.learning} color="text-indigo-600 dark:text-indigo-400" />
        <Stat label="아는 단어 (제외)" value={data.known} color="text-slate-500" />
        <Stat label="오답 단어" value={data.wrong} color="text-rose-500" />
        <Stat label="누적 정답률" value={totalAns ? `${Math.round((totalCorrect / totalAns) * 100)}%` : "-"} color="" />
      </div>

      <Card>
        <p className="mb-3 font-semibold">빈출 순위 구간별 진행률</p>
        <div className="space-y-4">
          {data.bands.map((b) => {
            const pct = (n: number) => (b.total ? (n / b.total) * 100 : 0);
            const done = b.mastered + b.known;
            return (
              <div key={b.band} data-testid={`band-${b.band}`}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium">상위 {b.band}{b.total < b.band ? <span className="text-slate-400"> ({b.total}개 보유)</span> : ""}</span>
                  <span className="tabular-nums text-slate-500">{done}/{b.total} · {Math.round(pct(done))}%</span>
                </div>
                <div className="flex h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div className="bg-emerald-500" style={{ width: `${pct(b.mastered)}%` }} />
                  <div className="bg-slate-400" style={{ width: `${pct(b.known)}%` }} />
                  <div className="bg-indigo-400" style={{ width: `${pct(b.learning)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
          <Legend c="bg-emerald-500" t="암기 완료" /><Legend c="bg-slate-400" t="아는 단어" /><Legend c="bg-indigo-400" t="학습 중" />
        </div>
      </Card>

      <Card>
        <p className="mb-3 font-semibold">최근 14일 응답 수</p>
        <div className="flex h-32 items-end gap-1">
          {last14.map(({ d, s }) => (
            <div key={d} className="flex flex-1 flex-col items-center justify-end gap-1">
              <div className="w-full rounded-t bg-indigo-500" style={{ height: `${((s?.total ?? 0) / maxTotal) * 100}%`, minHeight: s?.total ? 4 : 0 }} title={`${d}: ${s?.total ?? 0}`} />
              <span className="text-[10px] text-slate-400">{Number(d.slice(8))}</span>
            </div>
          ))}
        </div>
      </Card>

      <p className="text-center text-sm text-slate-500">전체 {words.length}개 중 아직 안 본 단어 {unseen}개</p>
    </div>
  );
}

function Stat({ label, value, color, testId }: { label: string; value: string | number; color: string; testId?: string }) {
  return (
    <Card className="p-4">
      <p className={`text-2xl font-bold tabular-nums ${color}`} data-testid={testId}>{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </Card>
  );
}

function Legend({ c, t }: { c: string; t: string }) {
  return <span className="inline-flex items-center gap-1"><span className={`h-2.5 w-2.5 rounded-full ${c}`} />{t}</span>;
}
