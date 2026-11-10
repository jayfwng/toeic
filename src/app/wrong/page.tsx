"use client";
import { useMemo, useState } from "react";
import { useProgressMap, useWords } from "@/lib/hooks";
import { buildSession, type QueueItem } from "@/lib/queue";
import { removeFromWrong } from "@/lib/actions";
import { WRONG_CLEAR_STREAK } from "@/lib/srs";
import StudySession from "@/components/StudySession";
import SpeakButton from "@/components/SpeakButton";
import WordDetail from "@/components/WordDetail";
import { Button, Card, Loading, PageTitle } from "@/components/ui";

export default function WrongPage() {
  const words = useWords();
  const progress = useProgressMap();
  const [session, setSession] = useState<QueueItem[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const list = useMemo(() => {
    if (!progress) return null;
    return words
      .filter((w) => progress.get(w.id)?.wrong)
      .map((w) => ({ w, p: progress.get(w.id)! }))
      .sort((a, b) => b.p.lapses - a.p.lapses || a.w.rank - b.w.rank);
  }, [words, progress]);

  if (session) return <StudySession initial={session} words={words} onExit={() => setSession(null)} />;
  if (!list) return <Loading />;

  return (
    <div className="space-y-4">
      <PageTitle>오답 단어장</PageTitle>
      <p className="text-sm text-slate-500">
        틀린 단어는 자동으로 등록되고 복습 간격이 최대 3일로 짧아져요. {WRONG_CLEAR_STREAK}번 연속 맞히면 자동으로 빠집니다.
      </p>
      {list.length === 0 ? (
        <Card className="py-10 text-center text-slate-500">오답 단어가 없어요 👍</Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={() => setSession(buildSession(list.map((x) => x.w), [], "mixed"))} data-testid="wrong-quiz">퀴즈로 복습</Button>
            <Button variant="secondary" onClick={() => setSession(buildSession(list.map((x) => x.w), [], "flashcard"))}>카드로 복습</Button>
          </div>
          <p className="text-xs text-slate-400">오답 복습은 오늘 이미 푼 단어라면 SRS 일정은 바뀌지 않고, 틀리면 다시 짧은 간격으로 돌아가요.</p>
          <ul className="space-y-2" data-testid="wrong-list">
            {list.map(({ w, p }) => (
              <li key={w.id}>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <button className="flex-1 text-left" onClick={() => setOpen(open === w.id ? null : w.id)}>
                      <p className="text-lg font-bold">{w.word}</p>
                      <p className="text-sm text-slate-500">{w.meanings.join(", ")}</p>
                    </button>
                    <SpeakButton text={w.word} size="sm" />
                    <div className="text-right text-xs text-slate-400">
                      <p>틀림 {p.lapses}회</p>
                      <p>연속 {p.wrongStreak}/{WRONG_CLEAR_STREAK}</p>
                    </div>
                  </div>
                  {open === w.id && (
                    <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800">
                      <WordDetail w={w} />
                      <button className="mt-3 text-sm text-slate-500 underline" onClick={() => removeFromWrong(w.id)}>오답장에서 빼기</button>
                    </div>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
