"use client";
import { useEffect, useState } from "react";
import { saveSettings } from "@/lib/db";
import { useSettings, useWords } from "@/lib/hooks";
import { resetAllProgress } from "@/lib/actions";
import { speak } from "@/lib/tts";
import type { Settings } from "@/lib/types";
import { Button, Card, PageTitle } from "@/components/ui";

export default function SettingsPage() {
  const s = useSettings();
  const words = useWords();
  const [goal, setGoal] = useState(String(s.dailyNewGoal));
  const [target, setTarget] = useState(String(s.targetCount));
  useEffect(() => { setGoal(String(s.dailyNewGoal)); setTarget(String(s.targetCount)); }, [s.dailyNewGoal, s.targetCount]);

  const set = (patch: Partial<Settings>) => saveSettings(patch);
  const input = "h-14 w-full rounded-xl bg-white px-4 text-lg ring-1 ring-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:ring-slate-700";

  return (
    <div className="space-y-4">
      <PageTitle>설정</PageTitle>
      <Card className="space-y-4">
        <label className="block space-y-1.5">
          <span className="font-medium">하루 신규 단어 목표</span>
          <div className="flex items-center gap-2">
            <button className="h-14 w-14 rounded-xl bg-slate-200 text-2xl dark:bg-slate-800" onClick={() => set({ dailyNewGoal: Math.max(0, s.dailyNewGoal - 5) })}>−</button>
            <input className={`${input} text-center`} inputMode="numeric" value={goal} data-testid="goal-input"
              onChange={(e) => setGoal(e.target.value)} onBlur={() => set({ dailyNewGoal: Math.max(0, Math.min(500, Number(goal) || 0)) })} />
            <button className="h-14 w-14 rounded-xl bg-slate-200 text-2xl dark:bg-slate-800" onClick={() => set({ dailyNewGoal: Math.min(500, s.dailyNewGoal + 5) })}>+</button>
          </div>
        </label>
        <label className="block space-y-1.5">
          <span className="font-medium">시험일</span>
          <input type="date" className={input} value={s.examDate} onChange={(e) => e.target.value && set({ examDate: e.target.value })} />
          <span className="text-xs text-slate-400">접수한 정기시험 날짜로 바꿔주세요.</span>
        </label>
        <label className="block space-y-1.5">
          <span className="font-medium">시험 전까지 목표 단어 수</span>
          <input className={input} inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value)} onBlur={() => set({ targetCount: Math.max(0, Number(target) || 0) })} />
          <span className="text-xs text-slate-400">0 = 전체 단어({words.length}개). D-day 하루 필요량 계산에 사용돼요.</span>
        </label>
      </Card>

      <Card className="space-y-4">
        <div className="space-y-1.5">
          <span className="font-medium">발음 속도 {s.ttsRate.toFixed(1)}x</span>
          <input type="range" min={0.5} max={1.3} step={0.1} value={s.ttsRate} className="w-full accent-indigo-600"
            onChange={(e) => set({ ttsRate: Number(e.target.value) })} onPointerUp={() => speak("schedule", s.ttsRate)} />
        </div>
        <div className="space-y-1.5">
          <span className="font-medium">화면 모드</span>
          <div className="grid grid-cols-3 gap-2">
            {(["system", "light", "dark"] as const).map((t) => (
              <button key={t} onClick={() => set({ theme: t })}
                className={`h-12 rounded-xl text-base font-medium ${s.theme === t ? "bg-indigo-600 text-white" : "bg-slate-200 dark:bg-slate-800"}`}>
                {t === "system" ? "시스템" : t === "light" ? "라이트" : "다크"}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Button variant="ghost" className="w-full text-rose-500"
        onClick={async () => { if (confirm("모든 학습 기록(SRS, 오답, 통계)을 지울까요? 단어 수정 내용은 유지됩니다. 먼저 CSV 백업을 권장해요.")) await resetAllProgress(); }}>
        학습 기록 초기화
      </Button>
    </div>
  );
}
