import type { DailyStat, Part, POS, Progress, Word } from "./types";

/** RFC 4180 CSV 파서 (따옴표, 줄바꿈, "" 이스케이프 지원) */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f !== "")) rows.push(row);
  return rows;
}

function esc(v: unknown): string {
  const s = v === undefined || v === null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(header: string[], rows: unknown[][]): string {
  // BOM: 엑셀에서 한글이 깨지지 않도록
  return "﻿" + [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n") + "\r\n";
}

const SEP = " | ";
const join = (a: string[]) => a.join(SEP);
const split = (s: string | undefined) => (s ?? "").split("|").map((x) => x.trim()).filter(Boolean);

export const WORD_COLUMNS = [
  "id", "word", "pos", "meanings", "example_en", "example_ko", "rank", "parts", "synonyms", "collocations",
] as const;
export const PROGRESS_COLUMNS = [
  "status", "ease", "interval", "reps", "due", "lapses", "wrong", "wrongStreak", "firstSeen", "lastReviewed",
] as const;
export const DAILY_COLUMNS = ["date", "newCount", "reviewCount", "correct", "total"] as const;

/** 단어 + 학습 기록을 한 파일로 (단어당 1행) */
export function exportWordsCSV(words: Word[], progress: Map<string, Progress>): string {
  const rows = words.map((w) => {
    const p = progress.get(w.id);
    return [
      w.id, w.word, join(w.pos), join(w.meanings), w.example.en, w.example.ko, w.rank,
      join(w.parts), join(w.synonyms), join(w.collocations),
      ...PROGRESS_COLUMNS.map((k) => (p ? p[k] : "")),
    ];
  });
  return toCSV([...WORD_COLUMNS, ...PROGRESS_COLUMNS], rows);
}

export function exportDailyCSV(stats: DailyStat[]): string {
  return toCSV([...DAILY_COLUMNS], stats.map((s) => DAILY_COLUMNS.map((k) => s[k])));
}

export interface ParsedImport {
  kind: "words" | "daily";
  words: Word[];
  progress: Progress[];
  daily: DailyStat[];
  errors: string[];
}

export function parseImport(text: string): ParsedImport {
  const rows = parseCSV(text);
  const out: ParsedImport = { kind: "words", words: [], progress: [], daily: [], errors: [] };
  if (!rows.length) { out.errors.push("빈 파일"); return out; }
  const header = rows[0].map((h) => h.trim());
  const idx = (k: string) => header.indexOf(k);
  const get = (r: string[], k: string) => (idx(k) >= 0 ? (r[idx(k)] ?? "").trim() : "");

  if (idx("date") >= 0 && idx("total") >= 0 && idx("word") < 0) {
    out.kind = "daily";
    for (const r of rows.slice(1)) {
      out.daily.push({
        date: get(r, "date"),
        newCount: Number(get(r, "newCount")) || 0,
        reviewCount: Number(get(r, "reviewCount")) || 0,
        correct: Number(get(r, "correct")) || 0,
        total: Number(get(r, "total")) || 0,
      });
    }
    return out;
  }

  if (idx("word") < 0) { out.errors.push("헤더에 word 열이 없습니다"); return out; }
  rows.slice(1).forEach((r, i) => {
    const wordText = get(r, "word");
    if (!wordText) return;
    const id = get(r, "id") || wordText.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const w: Word = {
      id,
      word: wordText,
      pos: split(get(r, "pos")) as POS[],
      meanings: split(get(r, "meanings")),
      example: { en: get(r, "example_en"), ko: get(r, "example_ko") },
      rank: Number(get(r, "rank")) || 9999,
      parts: split(get(r, "parts")) as Part[],
      synonyms: split(get(r, "synonyms")),
      collocations: split(get(r, "collocations")),
    };
    out.words.push(w);
    const status = get(r, "status");
    if (status === "learning" || status === "review" || status === "known") {
      out.progress.push({
        wordId: id,
        status,
        ease: Number(get(r, "ease")) || 2.5,
        interval: Number(get(r, "interval")) || 0,
        reps: Number(get(r, "reps")) || 0,
        due: get(r, "due"),
        lapses: Number(get(r, "lapses")) || 0,
        wrong: get(r, "wrong") === "1" ? 1 : 0,
        wrongStreak: Number(get(r, "wrongStreak")) || 0,
        firstSeen: get(r, "firstSeen"),
        lastReviewed: get(r, "lastReviewed"),
      });
    } else if (status) out.errors.push(`${i + 2}행: 알 수 없는 status '${status}'`);
  });
  return out;
}
