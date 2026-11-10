"use client";
import Link from "next/link";
import { useMemo } from "react";
import { toDateStr } from "@/lib/date";
import { useDailyStats, useProgressMap, useSettings, useWords } from "@/lib/hooks";
import { buildTodayPlan } from "@/lib/queue";
import { isMastered } from "@/lib/srs";
import { calcExamPlan, calcStreak } from "@/lib/stats";
import { Card, Loading, ProgressBar } from "@/components/ui";
import { FlameIcon, GearIcon, ListIcon } from "@/components/Icons";

export default function Home() {
  const words = useWords();
  const progress = useProgressMap();
  const settings = useSettings();
  const daily = useDailyStats();
  const today = toDateStr();

  const data = useMemo(() => {
    if (!progress) return null;
    const plan = buildTodayPlan(words, progress, today, settings.dailyNewGoal);
    const exam = calcExamPlan(settings.examDate, today, words.length, settings.targetCount, progress);
    let mastered = 0, wrong = 0;
    for (const p of progress.values()) {
      if (isMastered(p)) mastered++;
      if (p.wrong) wrong++;
    }
    return { plan, exam, mastered, wrong };
  }, [words, progress, settings, today]);

  if (!data) return <Loading />;
  const { plan, exam, mastered, wrong } = data;
  const streak = calcStreak(daily, today);
  const todayStat = daily.find((d) => d.date === today);
  const goalShort = exam.perDay > settings.dailyNewGoal;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">목표 TOEIC 900</p>
          <h1 className="text-2xl font-bold">오늘의 단어</h1>
        </div>
        <div className="flex gap-1">
          <Link href="/words/" aria-label="단어 관리" className="rounded-full p-3 text-slate-500 active:bg-slate-200 dark:active:bg-slate-800"><ListIcon /></Link>
          <Link href="/settings/" aria-label="설정" className="rounded-full p-3 text-slate-500 active:bg-slate-200 dark:active:bg-slate-800"><GearIcon /></Link>
        </div>
      </div>

      <Link href="/study/" className="block">
        <Card className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white ring-0 dark:from-indigo-700 dark:to-violet-800">
          <p className="text-base font-medium text-indigo-100">오늘 복습할 단어</p>
          <p className="mt-1 text-7xl font-extrabold tabular-nums" data-testid="due-count">{plan.due.length}<span className="ml-1 text-2xl font-bold">개</span></p>
          <p className="mt-2 text-indigo-100">
            신규 {plan.fresh.length}개 남음 <span className="opacity-70">(오늘 {plan.newDoneToday}/{settings.dailyNewGoal})</span>
          </p>
          <div className="mt-4 flex h-14 items-center justify-center rounded-2xl bg-white/95 text-lg font-bold text-indigo-700">
            {plan.due.length + plan.fresh.length > 0 ? "학습 시작" : "오늘 할 일 완료 ✓"}
          </div>
        </Card>
      </Link>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <FlameIcon className="mx-auto h-6 w-6 text-orange-500" />
          <p className="mt-1 text-2xl font-bold tabular-nums" data-testid="streak">{streak}</p>
          <p className="text-xs text-slate-500">연속 학습일</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-emerald-600">{mastered}</p>
          <p className="text-xs text-slate-500">암기 완료</p>
        </Card>
        <Link href="/wrong/">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold tabular-nums text-rose-500">{wrong}</p>
            <p className="text-xs text-slate-500">오답 단어</p>
          </Card>
        </Link>
      </div>

      <Card>
        <div className="flex items-baseline justify-between">
          <p className="font-semibold">시험까지</p>
          <p className="text-3xl font-extrabold tabular-nums text-indigo-600 dark:text-indigo-400" data-testid="dday">
            {exam.daysLeft > 0 ? `D-${exam.daysLeft}` : exam.daysLeft === 0 ? "D-DAY" : `D+${-exam.daysLeft}`}
          </p>
        </div>
        <p className="text-xs text-slate-400">{settings.examDate} · 설정에서 변경</p>
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-sm"><span>학습 시작한 단어</span><span className="tabular-nums">{exam.started}/{exam.target}</span></div>
          <ProgressBar value={exam.started} max={exam.target} />
        </div>
        <p className="mt-3 text-sm leading-relaxed">
          {exam.remaining === 0 ? (
            <>모든 목표 단어를 시작했어요. 이제 <b>복습</b>에 집중하세요!</>
          ) : (
            <>
              남은 {exam.remaining}개를 시험 1주 전까지 끝내려면 <b className="text-indigo-600 dark:text-indigo-400">하루 {exam.perDay}개</b>가 필요해요.
              {goalShort ? <span className="text-rose-500"> 현재 목표({settings.dailyNewGoal}개)를 늘려주세요.</span> : <span className="text-emerald-600"> 현재 목표({settings.dailyNewGoal}개)로 충분해요.</span>}
            </>
          )}
        </p>
      </Card>

      {todayStat && (
        <p className="text-center text-sm text-slate-500">오늘 응답 {todayStat.total}개 · 정답률 {Math.round((todayStat.correct / Math.max(1, todayStat.total)) * 100)}%</p>
      )}
    </div>
  );
}
