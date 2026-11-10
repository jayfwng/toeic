"use client";
import { useMemo, useState } from "react";
import type { QueueItem } from "@/lib/queue";
import type { Quality, Word } from "@/lib/types";
import { markKnownMany, recordAnswer } from "@/lib/actions";
import Flashcard from "./Flashcard";
import { QuizChoice, QuizCloze, QuizSpelling } from "./Quiz";
import { Button, Card, ProgressBar } from "./ui";
import { CloseIcon } from "./Icons";

const MODE_LABEL = { flashcard: "플래시카드", choice: "4지선다", spelling: "철자 입력", cloze: "빈칸 채우기" } as const;
const MAX_REQUEUE = 2;

/** 세션 진행기. 시작 시점의 큐를 스냅샷으로 들고, 틀린 단어는 몇 문제 뒤에 다시 출제한다 */
export default function StudySession({ initial, words, onExit }: { initial: QueueItem[]; words: Word[]; onExit: () => void }) {
  const byId = useMemo(() => new Map(words.map((w) => [w.id, w])), [words]);
  const [queue, setQueue] = useState<QueueItem[]>(initial);
  const [idx, setIdx] = useState(0);
  const [stats, setStats] = useState({ correct: 0, total: 0, wrongIds: new Set<string>(), known: 0 });
  const [requeued, setRequeued] = useState<Record<string, number>>({});

  const item = queue[idx];
  const word = item ? byId.get(item.wordId) : undefined;

  const advance = () => setIdx((i) => i + 1);

  const handle = async (correct: boolean, quality?: Quality) => {
    if (!item) return;
    const q: Quality = quality ?? (correct ? 4 : 1);
    await recordAnswer(item.wordId, item.mode, q);
    setStats((s) => {
      const wrongIds = new Set(s.wrongIds);
      if (!correct) wrongIds.add(item.wordId);
      return { ...s, correct: s.correct + (correct ? 1 : 0), total: s.total + 1, wrongIds };
    });
    if (!correct && (requeued[item.wordId] ?? 0) < MAX_REQUEUE) {
      // 틀린 단어: 4문제 뒤에 플래시카드로 다시 확인
      setRequeued((r) => ({ ...r, [item.wordId]: (r[item.wordId] ?? 0) + 1 }));
      setQueue((qq) => {
        const next = [...qq];
        next.splice(Math.min(next.length, idx + 4), 0, { wordId: item.wordId, mode: "flashcard", isNew: false });
        return next;
      });
    }
    advance();
  };

  const handleKnown = async () => {
    if (!item) return;
    await markKnownMany([item.wordId]);
    setStats((s) => ({ ...s, known: s.known + 1 }));
    // 같은 단어의 남은 문제도 제거
    setQueue((qq) => qq.filter((x, i) => i <= idx || x.wordId !== item.wordId));
    advance();
  };

  if (!item || !word) {
    const acc = stats.total ? Math.round((stats.correct / stats.total) * 100) : 0;
    return (
      <div className="space-y-4" data-testid="session-done">
        <Card className="text-center">
          <p className="text-5xl">🎉</p>
          <p className="mt-3 text-2xl font-bold">세션 완료!</p>
          <p className="mt-2 text-slate-500">응답 {stats.total}개 · 정답률 {acc}%{stats.known ? ` · 아는 단어 ${stats.known}개 제외` : ""}</p>
        </Card>
        {stats.wrongIds.size > 0 && (
          <Card>
            <p className="mb-2 font-semibold">틀린 단어 {stats.wrongIds.size}개 (오답 단어장에 등록됨)</p>
            <ul className="space-y-1">
              {[...stats.wrongIds].map((id) => {
                const w = byId.get(id);
                return w ? <li key={id}><b>{w.word}</b> <span className="text-slate-500">{w.meanings[0]}</span></li> : null;
              })}
            </ul>
          </Card>
        )}
        <Button onClick={onExit} className="w-full">완료</Button>
      </div>
    );
  }

  const pool = words;
  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <button onClick={onExit} aria-label="그만하기" className="rounded-full p-2 text-slate-500 active:bg-slate-200 dark:active:bg-slate-800">
          <CloseIcon />
        </button>
        <ProgressBar value={idx} max={queue.length} />
        <span className="shrink-0 text-sm tabular-nums text-slate-500" data-testid="session-progress">{idx + 1}/{queue.length}</span>
      </div>
      <p className="mb-2 text-xs font-semibold text-slate-400" data-testid="mode-label">{MODE_LABEL[item.mode]}{item.isNew ? " · 신규" : " · 복습"}</p>
      <div key={`${idx}-${item.wordId}`}>
        {item.mode === "flashcard" && (
          <Flashcard word={word} isNew={item.isNew} onAnswer={(k) => handle(k)} onKnown={item.isNew ? handleKnown : undefined} />
        )}
        {item.mode === "choice" && <QuizChoice word={word} pool={pool} onDone={(c) => handle(c)} />}
        {item.mode === "cloze" && <QuizCloze word={word} pool={pool} onDone={(c) => handle(c)} />}
        {item.mode === "spelling" && <QuizSpelling word={word} onDone={(c) => handle(c, c ? 5 : 1)} />}
      </div>
    </div>
  );
}
