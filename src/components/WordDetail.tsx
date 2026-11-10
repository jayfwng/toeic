import { POS_LABEL, type Word } from "@/lib/types";
import { findWordInSentence } from "@/lib/words";
import SpeakButton from "./SpeakButton";

export function Highlight({ word, sentence }: { word: string; sentence: string }) {
  const m = findWordInSentence(word, sentence);
  if (!m) return <>{sentence}</>;
  return (
    <>
      {sentence.slice(0, m.start)}
      <mark className="rounded bg-amber-200 px-0.5 text-inherit dark:bg-amber-700/60">{sentence.slice(m.start, m.end)}</mark>
      {sentence.slice(m.end)}
    </>
  );
}

export function PosTags({ w }: { w: Word }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {w.pos.map((p) => (
        <span key={p} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {POS_LABEL[p]}
        </span>
      ))}
    </span>
  );
}

/** 카드 뒷면/정답 확인용 상세 */
export default function WordDetail({ w, showWord = false }: { w: Word; showWord?: boolean }) {
  return (
    <div className="space-y-3 text-left">
      {showWord && (
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">{w.word}</span>
          <SpeakButton text={w.word} size="sm" />
          <PosTags w={w} />
        </div>
      )}
      <p className="text-xl font-semibold leading-snug">{w.meanings.join(", ")}</p>
      <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
        <div className="flex items-start gap-2">
          <p className="flex-1 text-[15px] leading-relaxed">
            <Highlight word={w.word} sentence={w.example.en} />
          </p>
          <SpeakButton text={w.example.en} size="sm" />
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{w.example.ko}</p>
      </div>
      {w.collocations.length > 0 && (
        <p className="text-sm"><span className="font-semibold text-indigo-600 dark:text-indigo-400">표현 </span>{w.collocations.join(" · ")}</p>
      )}
      {w.synonyms.length > 0 && (
        <p className="text-sm"><span className="font-semibold text-emerald-600 dark:text-emerald-400">유의어 </span>{w.synonyms.join(", ")}</p>
      )}
      <p className="text-xs text-slate-400">빈출 {w.rank}위 · {w.parts.join(" ")}</p>
    </div>
  );
}
