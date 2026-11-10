"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Word } from "@/lib/types";
import { makeChoices, spellingMatches } from "@/lib/queue";
import { findWordInSentence } from "@/lib/words";
import { useSettings } from "@/lib/hooks";
import { speak } from "@/lib/tts";
import SpeakButton from "./SpeakButton";
import WordDetail, { PosTags } from "./WordDetail";
import { Button, Card } from "./ui";

type Done = (correct: boolean) => void;

function Feedback({ correct, word, onNext }: { correct: boolean; word: Word; onNext: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollIntoView?.({ behavior: "smooth", block: "end" }); }, []);
  return (
    <div ref={ref} className="animate-pop space-y-3 scroll-mb-28">
      <Card className={correct ? "ring-2 ring-emerald-400" : "ring-2 ring-rose-400"}>
        <p className={`mb-3 text-lg font-bold ${correct ? "text-emerald-600" : "text-rose-600"}`}>
          {correct ? "정답!" : "오답 — 오답 단어장에 추가됐어요"}
        </p>
        <WordDetail w={word} showWord />
      </Card>
      <Button onClick={onNext} className="w-full" autoFocus>다음</Button>
    </div>
  );
}

/** 4지선다. 70%는 영→한, 30%는 한→영 */
export function QuizChoice({ word, pool, onDone }: { word: Word; pool: Word[]; onDone: Done }) {
  const [picked, setPicked] = useState<string | null>(null);
  const { ttsRate } = useSettings();
  const { choices, reverse } = useMemo(
    () => ({ choices: makeChoices(word, pool), reverse: Math.random() < 0.3 }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [word.id],
  );
  useEffect(() => setPicked(null), [word.id]);
  const correct = picked === word.id;

  const pick = (id: string) => {
    if (picked) return;
    setPicked(id);
    if (!reverse) speak(word.word, ttsRate);
  };

  return (
    <div className="space-y-4">
      <Card className="text-center">
        <p className="mb-1 text-xs font-semibold text-slate-400">{reverse ? "알맞은 영단어는?" : "알맞은 뜻은?"}</p>
        {reverse ? (
          <p className="py-4 text-2xl font-bold">{word.meanings.join(", ")}</p>
        ) : (
          <div className="flex items-center justify-center gap-3 py-4">
            <p className="text-3xl font-bold">{word.word}</p>
            <SpeakButton text={word.word} />
          </div>
        )}
        <PosTags w={word} />
      </Card>
      <div className="grid gap-3">
        {choices.map((c) => {
          const state = !picked ? "" : c.id === word.id ? "bg-emerald-500 text-white" : c.id === picked ? "bg-rose-500 text-white" : "opacity-50";
          return (
            <button
              key={c.id}
              data-testid="choice"
              onClick={() => pick(c.id)}
              className={`min-h-16 rounded-2xl bg-white px-4 py-3 text-left text-lg font-medium ring-1 ring-slate-200 active:scale-[0.98] dark:bg-slate-900 dark:ring-slate-700 ${state}`}
            >
              {reverse ? c.word : c.meanings.slice(0, 2).join(", ")}
            </button>
          );
        })}
      </div>
      {picked && <Feedback correct={correct} word={word} onNext={() => onDone(correct)} />}
    </div>
  );
}

/** 철자 입력: 뜻을 보고 영단어를 직접 쓴다 */
export function QuizSpelling({ word, onDone }: { word: Word; onDone: Done }) {
  const [value, setValue] = useState("");
  const [result, setResult] = useState<boolean | null>(null);
  const [hint, setHint] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const { ttsRate } = useSettings();
  useEffect(() => { setValue(""); setResult(null); setHint(false); input.current?.focus(); }, [word.id]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (result !== null || !value.trim()) return;
    setResult(spellingMatches(value, word.word));
    speak(word.word, ttsRate);
  };

  return (
    <div className="space-y-4">
      <Card className="text-center">
        <p className="mb-1 text-xs font-semibold text-slate-400">영단어를 입력하세요</p>
        <p className="py-3 text-2xl font-bold">{word.meanings.join(", ")}</p>
        <PosTags w={word} />
        <p className="mt-3 font-mono text-lg tracking-[0.3em] text-slate-400">
          {word.word[0]}{word.word.slice(1).replace(/[A-Za-z]/g, "_")}
        </p>
        {hint ? (
          <p className="mt-2 text-sm text-slate-500"><HiddenSentence w={word} /></p>
        ) : (
          <button className="mt-2 text-sm text-indigo-600 underline dark:text-indigo-400" onClick={() => setHint(true)}>예문 힌트</button>
        )}
      </Card>
      <form onSubmit={submit} className="space-y-3">
        <input
          ref={input}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={result !== null}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          placeholder="여기에 입력"
          data-testid="spelling-input"
          className="h-16 w-full rounded-2xl bg-white px-5 text-center text-2xl font-semibold ring-1 ring-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:ring-slate-700"
        />
        {result === null && <Button type="submit" className="w-full" disabled={!value.trim()}>확인</Button>}
      </form>
      {result === false && (
        <p className="text-center text-lg">
          입력: <span className="text-rose-500 line-through">{value}</span> → <span className="font-bold text-emerald-600">{word.word}</span>
        </p>
      )}
      {result !== null && <Feedback correct={result} word={word} onNext={() => onDone(result)} />}
    </div>
  );
}

function HiddenSentence({ w }: { w: Word }) {
  const m = findWordInSentence(w.word, w.example.en);
  if (!m) return <>{w.example.ko}</>;
  const target = w.example.en.slice(m.start, m.end);
  return (
    <>
      {w.example.en.slice(0, m.start)}
      <span className="font-mono">{target[0]}{"_".repeat(Math.max(1, target.length - 1))}</span>
      {w.example.en.slice(m.end)}
    </>
  );
}

/** 예문 빈칸 채우기 (Part 5 스타일 4지선다) */
export function QuizCloze({ word, pool, onDone }: { word: Word; pool: Word[]; onDone: Done }) {
  const [picked, setPicked] = useState<string | null>(null);
  const choices = useMemo(() => makeChoices(word, pool), [word.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setPicked(null), [word.id]);
  const m = findWordInSentence(word.word, word.example.en);
  const en = word.example.en;
  const correct = picked === word.id;

  return (
    <div className="space-y-4">
      <Card>
        <p className="mb-2 text-xs font-semibold text-slate-400">빈칸에 들어갈 단어는? (형태는 바뀔 수 있음)</p>
        <p className="text-xl leading-relaxed">
          {m ? (
            <>
              {en.slice(0, m.start)}
              <span className={`mx-0.5 inline-block min-w-16 border-b-2 text-center font-bold ${picked ? "border-emerald-500 text-emerald-600" : "border-indigo-500"}`}>
                {picked ? en.slice(m.start, m.end) : " "}
              </span>
              {en.slice(m.end)}
            </>
          ) : en}
        </p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{word.example.ko}</p>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        {choices.map((c) => {
          const state = !picked ? "" : c.id === word.id ? "bg-emerald-500 text-white" : c.id === picked ? "bg-rose-500 text-white" : "opacity-50";
          return (
            <button
              key={c.id}
              data-testid="choice"
              onClick={() => !picked && setPicked(c.id)}
              className={`min-h-16 rounded-2xl bg-white px-3 text-lg font-semibold ring-1 ring-slate-200 active:scale-[0.98] dark:bg-slate-900 dark:ring-slate-700 ${state}`}
            >
              {c.word}
            </button>
          );
        })}
      </div>
      {picked && <Feedback correct={correct} word={word} onNext={() => onDone(correct)} />}
    </div>
  );
}
