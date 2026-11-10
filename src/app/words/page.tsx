"use client";
import { useMemo, useRef, useState } from "react";
import { useDailyStats, useProgressMap, useWords } from "@/lib/hooks";
import { applyImport, deleteWord, markKnownMany, saveWord, unmarkKnown } from "@/lib/actions";
import { exportDailyCSV, exportWordsCSV, parseImport } from "@/lib/csv";
import { toDateStr } from "@/lib/date";
import { PARTS, POS_LABEL, POS_LIST, type Part, type POS, type Word } from "@/lib/types";
import { makeId } from "@/lib/words";
import { Button, Card, Loading, PageTitle } from "@/components/ui";

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function WordsPage() {
  const words = useWords();
  const progress = useProgressMap();
  const daily = useDailyStats();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Word | "new" | null>(null);
  const [msg, setMsg] = useState("");
  const [limit, setLimit] = useState(50);
  const file = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return words;
    return words.filter((w) => w.word.toLowerCase().includes(s) || w.meanings.some((m) => m.includes(s)));
  }, [q, words]);

  if (!progress) return <Loading />;
  if (editing) {
    return <WordForm initial={editing === "new" ? null : editing} words={words} onClose={(m) => { setEditing(null); if (m) setMsg(m); }} />;
  }

  const onImport = async (f: File) => {
    try {
      const parsed = parseImport(await f.text());
      if (parsed.errors.length && !parsed.words.length && !parsed.daily.length) { setMsg(`가져오기 실패: ${parsed.errors[0]}`); return; }
      const r = await applyImport(parsed);
      setMsg(
        parsed.kind === "daily"
          ? `일별 기록 ${r.daily}일 가져옴`
          : `단어 ${r.words}개 반영, 학습 기록 ${r.progress}개 복원${r.skipped.length ? ` · ${r.skipped.length}개 건너뜀 (${r.skipped.slice(0, 2).join("; ")})` : ""}`,
      );
    } catch (e) {
      setMsg(`가져오기 실패: ${(e as Error).message}`);
    }
  };

  const stamp = toDateStr().replace(/-/g, "");
  return (
    <div className="space-y-4">
      <PageTitle right={<Button className="min-h-11 px-4 text-base" onClick={() => setEditing("new")}>+ 추가</Button>}>단어 관리</PageTitle>

      <Card className="space-y-3">
        <p className="font-semibold">백업 · CSV</p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" className="text-base" onClick={() => download(`toeic-words-${stamp}.csv`, exportWordsCSV(words, progress))}>단어+기록 내보내기</Button>
          <Button variant="secondary" className="text-base" onClick={() => download(`toeic-daily-${stamp}.csv`, exportDailyCSV(daily))}>일별 기록 내보내기</Button>
        </div>
        <Button variant="secondary" className="w-full text-base" onClick={() => file.current?.click()}>CSV 가져오기</Button>
        <input ref={file} type="file" accept=".csv,text/csv" className="hidden" data-testid="csv-input"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ""; }} />
        <p className="text-xs text-slate-400">
          두 파일을 모두 내보내 두면 폰을 바꿔도 그대로 복원돼요. 목록 열(pos, meanings, parts, synonyms, collocations)은 &quot; | &quot;로 구분합니다.
        </p>
        {msg && <p className="rounded-xl bg-indigo-50 p-3 text-sm text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200" data-testid="words-msg">{msg}</p>}
      </Card>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={`검색 (${words.length}개)`}
        className="h-14 w-full rounded-2xl bg-white px-4 text-lg ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:ring-slate-800"
      />
      <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 dark:divide-slate-800 dark:bg-slate-900 dark:ring-slate-800">
        {filtered.slice(0, limit).map((w) => {
          const p = progress.get(w.id);
          const known = p?.status === "known";
          return (
            <li key={w.id} className="flex items-center gap-2 px-4 py-3">
              <button className="min-w-0 flex-1 text-left" onClick={() => setEditing(w)}>
                <p className="font-semibold">
                  <span className="mr-1 text-xs text-slate-400">{w.rank}</span>{w.word}
                  {p && <span className={`ml-2 text-xs ${known ? "text-slate-400" : p.wrong ? "text-rose-500" : "text-indigo-500"}`}>{known ? "아는 단어" : p.wrong ? "오답" : `${p.interval}일`}</span>}
                </p>
                <p className="truncate text-sm text-slate-500">{w.meanings.join(", ")}</p>
              </button>
              <button
                className="shrink-0 rounded-xl px-3 py-2 text-sm text-slate-500 ring-1 ring-slate-200 active:bg-slate-100 dark:ring-slate-700 dark:active:bg-slate-800"
                onClick={() => (known ? unmarkKnown(w.id) : markKnownMany([w.id]))}
              >
                {known ? "되돌리기" : "알아요"}
              </button>
            </li>
          );
        })}
      </ul>
      {filtered.length > limit && <Button variant="secondary" className="w-full" onClick={() => setLimit((l) => l + 100)}>더 보기 ({filtered.length - limit})</Button>}
    </div>
  );
}

const lines = (s: string) => s.split(/[|\n]/).map((x) => x.trim()).filter(Boolean);

function WordForm({ initial, words, onClose }: { initial: Word | null; words: Word[]; onClose: (msg?: string) => void }) {
  const maxRank = words.reduce((m, w) => Math.max(m, w.rank), 0);
  const [f, setF] = useState({
    word: initial?.word ?? "",
    pos: new Set<POS>(initial?.pos ?? []),
    meanings: initial?.meanings.join(" | ") ?? "",
    en: initial?.example.en ?? "",
    ko: initial?.example.ko ?? "",
    rank: String(initial?.rank ?? maxRank + 1),
    parts: new Set<Part>(initial?.parts ?? ["Part5"]),
    synonyms: initial?.synonyms.join(" | ") ?? "",
    collocations: initial?.collocations.join(" | ") ?? "",
  });
  const [errs, setErrs] = useState<string[]>([]);

  const save = async () => {
    const id = initial?.id ?? makeId(f.word, new Set(words.map((w) => w.id)));
    const w: Word = {
      id,
      word: f.word.trim(),
      pos: POS_LIST.filter((p) => f.pos.has(p)),
      meanings: lines(f.meanings),
      example: { en: f.en.trim(), ko: f.ko.trim() },
      rank: Number(f.rank),
      parts: PARTS.filter((p) => f.parts.has(p)),
      synonyms: lines(f.synonyms),
      collocations: lines(f.collocations),
    };
    const e = await saveWord(w);
    if (e.length) setErrs(e);
    else onClose(initial ? `'${w.word}' 수정됨` : `'${w.word}' 추가됨`);
  };

  const input = "w-full rounded-xl bg-white px-3 py-3 text-base ring-1 ring-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:ring-slate-700";
  const chip = (on: boolean) => `rounded-full px-3 py-2 text-sm ring-1 ${on ? "bg-indigo-600 text-white ring-indigo-600" : "ring-slate-300 dark:ring-slate-700"}`;
  const toggle = <T,>(s: Set<T>, v: T) => { const n = new Set(s); if (n.has(v)) n.delete(v); else n.add(v); return n; };

  return (
    <div className="space-y-4">
      <PageTitle>{initial ? "단어 수정" : "단어 추가"}</PageTitle>
      <Field label="단어"><input className={input} value={f.word} onChange={(e) => setF({ ...f, word: e.target.value })} disabled={!!initial} autoCapitalize="none" data-testid="form-word" /></Field>
      <Field label="품사">
        <div className="flex flex-wrap gap-2">
          {POS_LIST.map((p) => <button key={p} type="button" className={chip(f.pos.has(p))} onClick={() => setF({ ...f, pos: toggle(f.pos, p) })}>{POS_LABEL[p]}</button>)}
        </div>
      </Field>
      <Field label="뜻 ( | 로 구분)"><input className={input} value={f.meanings} onChange={(e) => setF({ ...f, meanings: e.target.value })} data-testid="form-meanings" /></Field>
      <Field label="영어 예문 (단어 포함)"><textarea className={input} rows={2} value={f.en} onChange={(e) => setF({ ...f, en: e.target.value })} data-testid="form-en" /></Field>
      <Field label="예문 해석"><textarea className={input} rows={2} value={f.ko} onChange={(e) => setF({ ...f, ko: e.target.value })} data-testid="form-ko" /></Field>
      <Field label="빈출 순위 (1 = 최빈출)"><input className={input} inputMode="numeric" value={f.rank} onChange={(e) => setF({ ...f, rank: e.target.value })} /></Field>
      <Field label="파트">
        <div className="flex flex-wrap gap-2">
          {PARTS.map((p) => <button key={p} type="button" className={chip(f.parts.has(p))} onClick={() => setF({ ...f, parts: toggle(f.parts, p) })}>{p}</button>)}
        </div>
      </Field>
      <Field label="유의어 ( | 로 구분)"><input className={input} value={f.synonyms} onChange={(e) => setF({ ...f, synonyms: e.target.value })} /></Field>
      <Field label="자주 쓰는 표현 ( | 로 구분)"><input className={input} value={f.collocations} onChange={(e) => setF({ ...f, collocations: e.target.value })} /></Field>
      {errs.length > 0 && <ul className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-200">{errs.map((e) => <li key={e}>• {e}</li>)}</ul>}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={() => onClose()}>취소</Button>
        <Button onClick={save} data-testid="form-save">저장</Button>
      </div>
      {initial && (
        <Button variant="ghost" className="w-full text-rose-500" onClick={async () => { if (confirm(`'${initial.word}'를 삭제할까요? 학습 기록도 함께 지워져요.`)) { await deleteWord(initial.id); onClose(`'${initial.word}' 삭제됨`); } }}>
          단어 삭제
        </Button>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</span>{children}</label>;
}
