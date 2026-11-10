"use client";
import { useMemo, useState } from "react";
import { toDateStr } from "@/lib/date";
import { useProgressMap, useSettings, useWords } from "@/lib/hooks";
import { buildSession, buildTodayPlan, type QueueItem } from "@/lib/queue";
import { markKnownMany } from "@/lib/actions";
import type { StudyMode, Word } from "@/lib/types";
import StudySession from "@/components/StudySession";
import { Button, Card, Loading, PageTitle } from "@/components/ui";

const MODES: { id: StudyMode | "mixed"; label: string; desc: string }[] = [
  { id: "mixed", label: "추천 학습", desc: "신규: 카드 → 4지선다 확인 / 복습: 퀴즈 섞기" },
  { id: "flashcard", label: "플래시카드", desc: "스와이프로 알아요 · 몰라요" },
  { id: "choice", label: "4지선다", desc: "뜻 고르기 · 단어 고르기" },
  { id: "spelling", label: "철자 입력", desc: "뜻 보고 직접 쓰기" },
  { id: "cloze", label: "빈칸 채우기", desc: "예문 속 Part 5 스타일" },
];

export default function StudyPage() {
  const words = useWords();
  const progress = useProgressMap();
  const settings = useSettings();
  const [session, setSession] = useState<QueueItem[] | null>(null);
  const [extra, setExtra] = useState(0);
  const [selecting, setSelecting] = useState(false);
  const today = toDateStr();

  const plan = useMemo(
    () => (progress ? buildTodayPlan(words, progress, today, settings.dailyNewGoal + extra) : null),
    [words, progress, settings.dailyNewGoal, extra, today],
  );

  if (session) return <StudySession initial={session} words={words} onExit={() => setSession(null)} />;
  if (!plan) return <Loading />;
  if (selecting) return <KnownSelector fresh={plan.fresh} onDone={() => setSelecting(false)} />;

  const start = (mode: StudyMode | "mixed") => setSession(buildSession(plan.due, plan.fresh, mode));
  const empty = plan.due.length + plan.fresh.length === 0;

  return (
    <div className="space-y-4">
      <PageTitle>학습</PageTitle>
      <Card className="flex justify-around text-center">
        <div><p className="text-3xl font-bold tabular-nums">{plan.due.length}</p><p className="text-sm text-slate-500">복습</p></div>
        <div className="w-px bg-slate-200 dark:bg-slate-800" />
        <div><p className="text-3xl font-bold tabular-nums">{plan.fresh.length}</p><p className="text-sm text-slate-500">신규</p></div>
      </Card>

      {empty ? (
        <Card className="space-y-3 text-center">
          <p className="text-lg font-semibold">오늘 학습을 모두 마쳤어요 👏</p>
          <p className="text-sm text-slate-500">더 하고 싶다면 신규 단어를 추가로 가져올 수 있어요.</p>
          <Button onClick={() => setExtra((e) => e + 10)} className="w-full">신규 10개 더 학습</Button>
        </Card>
      ) : (
        <div className="grid gap-3">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => start(m.id)}
              data-testid={`mode-${m.id}`}
              className={`flex min-h-16 flex-col items-start justify-center rounded-2xl px-5 py-3 text-left active:scale-[0.98] ${
                m.id === "mixed" ? "bg-indigo-600 text-white" : "bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
              }`}
            >
              <span className="text-lg font-bold">{m.label}</span>
              <span className={`text-sm ${m.id === "mixed" ? "text-indigo-100" : "text-slate-500"}`}>{m.desc}</span>
            </button>
          ))}
        </div>
      )}

      {plan.fresh.length > 0 && (
        <Button variant="secondary" onClick={() => setSelecting(true)} className="w-full" data-testid="known-selector">
          오늘 신규 중 이미 아는 단어 제외하기
        </Button>
      )}
    </div>
  );
}

/** 오늘의 신규 단어 목록에서 아는 단어를 골라 한 번에 제외 */
function KnownSelector({ fresh, onDone }: { fresh: Word[]; onDone: () => void }) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const all = sel.size === fresh.length;
  return (
    <div className="space-y-3">
      <PageTitle right={<button className="text-sm text-indigo-600 dark:text-indigo-400" onClick={() => setSel(all ? new Set() : new Set(fresh.map((w) => w.id)))}>{all ? "전체 해제" : "전체 선택"}</button>}>
        아는 단어 제외
      </PageTitle>
      <p className="text-sm text-slate-500">확실히 아는 단어를 선택하세요. 학습·복습에서 빠지고 빈 자리는 다음 순위 단어로 채워져요.</p>
      <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 dark:divide-slate-800 dark:bg-slate-900 dark:ring-slate-800">
        {fresh.map((w) => (
          <li key={w.id}>
            <label className="flex min-h-14 items-center gap-3 px-4 py-2">
              <input type="checkbox" className="h-6 w-6 accent-indigo-600" checked={sel.has(w.id)} onChange={() => toggle(w.id)} />
              <span className="font-semibold">{w.word}</span>
              <span className="truncate text-sm text-slate-500">{w.meanings[0]}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="sticky bottom-20 grid grid-cols-2 gap-3 bg-slate-50/90 py-2 dark:bg-slate-950/90">
        <Button variant="secondary" onClick={onDone}>취소</Button>
        <Button disabled={!sel.size} onClick={async () => { await markKnownMany([...sel]); onDone(); }} data-testid="known-apply">
          {sel.size}개 제외
        </Button>
      </div>
    </div>
  );
}
