"use client";
import { useEffect, useRef, useState } from "react";
import type { Word } from "@/lib/types";
import { useSettings } from "@/lib/hooks";
import { speak } from "@/lib/tts";
import SpeakButton from "./SpeakButton";
import WordDetail, { PosTags } from "./WordDetail";
import { Button } from "./ui";

const THRESHOLD = 90;

/** 탭: 뒤집기 / 오른쪽 스와이프: 알아요 / 왼쪽 스와이프: 몰라요 */
export default function Flashcard({
  word,
  isNew,
  onAnswer,
  onKnown,
}: {
  word: Word;
  isNew: boolean;
  onAnswer: (knew: boolean) => void;
  onKnown?: () => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const [dx, setDx] = useState(0);
  const [pendingFail, setPendingFail] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  const { ttsRate } = useSettings();

  useEffect(() => {
    setFlipped(false); setDx(0); setPendingFail(false);
    if (isNew) speak(word.word, ttsRate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word.id]);

  const answer = (knew: boolean) => {
    if (!knew && !flipped) {
      // 몰라요: 뒷면을 먼저 보여주고 '다음'으로 넘어감
      setFlipped(true); setPendingFail(true); setDx(0);
      return;
    }
    onAnswer(knew);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY };
    moved.current = false;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!start.current || pendingFail) return;
    const ddx = e.clientX - start.current.x;
    if (Math.abs(ddx) > 8) moved.current = true;
    setDx(ddx);
  };
  const onPointerUp = () => {
    if (!start.current) return;
    start.current = null;
    if (pendingFail) return;
    if (dx > THRESHOLD) answer(true);
    else if (dx < -THRESHOLD) answer(false);
    else if (!moved.current) setFlipped((f) => !f);
    setDx(0);
  };

  const hint = dx > 30 ? "알아요" : dx < -30 ? "몰라요" : null;

  return (
    <div className="flex flex-col gap-4">
      <div
        className="card-3d relative touch-pan-y select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { start.current = null; setDx(0); }}
        style={{ transform: `translateX(${dx}px) rotate(${dx / 20}deg)`, transition: start.current ? "none" : "transform 0.2s" }}
        data-testid="flashcard"
      >
        <div className={`card-inner relative min-h-[420px] ${flipped ? "flipped" : ""}`}>
          <div className="card-face absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            {isNew && <span className="absolute left-5 top-5 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-900 dark:text-sky-200">NEW</span>}
            <span className="absolute right-5 top-5 text-xs text-slate-400">#{word.rank}</span>
            <p className="break-all text-center text-4xl font-bold tracking-tight">{word.word}</p>
            <div className="mt-3"><PosTags w={word} /></div>
            <SpeakButton text={word.word} size="lg" className="mt-6" />
            <p className="absolute bottom-5 text-sm text-slate-400">탭해서 뜻 보기 · 좌우로 밀기</p>
          </div>
          <div className="card-face card-back absolute inset-0 overflow-y-auto rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <WordDetail w={word} showWord />
          </div>
        </div>
        {hint && (
          <div className={`pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 rounded-full px-4 py-1.5 text-lg font-bold text-white ${dx > 0 ? "bg-emerald-500" : "bg-rose-500"}`}>
            {hint}
          </div>
        )}
      </div>

      {pendingFail ? (
        <Button onClick={() => onAnswer(false)} className="w-full">다음</Button>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Button variant="danger" onClick={() => answer(false)} className="min-h-16">← 몰라요</Button>
          <Button variant="success" onClick={() => answer(true)} className="min-h-16">알아요 →</Button>
        </div>
      )}
      {isNew && onKnown && !pendingFail && (
        <button onClick={onKnown} className="py-2 text-sm text-slate-500 underline underline-offset-4 dark:text-slate-400">
          이미 아는 단어 — 학습에서 제외
        </button>
      )}
    </div>
  );
}
