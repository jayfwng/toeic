import seed from "@content/words.json";
import type { Word, WordEdit, WordsFile } from "./types";

export const baseWords: Word[] = (seed as WordsFile).words;

/** words.json(원본) 위에 사용자 수정 레이어를 덮어써서 최종 단어 목록을 만든다 */
export function mergeWords(base: Word[], edits: WordEdit[]): Word[] {
  const map = new Map(base.map((w) => [w.id, w]));
  for (const e of edits) {
    if (e.deleted) map.delete(e.id);
    else if (e.data) map.set(e.id, e.data);
  }
  return [...map.values()].sort((a, b) => a.rank - b.rank || a.word.localeCompare(b.word));
}

export function makeId(word: string, existing: Set<string>): string {
  const base = word.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  let id = base || "word";
  let i = 2;
  while (existing.has(id)) id = `${base}-${i++}`;
  return id;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** 한 단어의 활용형(-s, -ed, -ing, -ies, 자음 중복 등)을 허용하는 정규식 조각 */
function inflectPattern(w: string): string {
  const alts = new Set<string>([`${escapeRe(w)}[a-z]*`]);
  if (/e$/.test(w) && w.length > 3) alts.add(`${escapeRe(w.slice(0, -1))}(?:ing|ed|er|ers|ion|ions|ive|ively)`);
  if (/y$/.test(w) && w.length > 3) alts.add(`${escapeRe(w.slice(0, -1))}i[a-z]+`);
  if (/[^aeiou][aeiou][bdgmnprt]$/.test(w)) alts.add(`${escapeRe(w)}${w.slice(-1)}(?:ed|ing|er|ers)`);
  return `(?:${[...alts].join("|")})`;
}

/** 예문에서 표제어(활용형 포함)를 찾는다. 빈칸 채우기·검증에 사용 */
export function findWordInSentence(word: string, sentence: string): { start: number; end: number } | null {
  const parts = word.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!parts.length) return null;
  const re = new RegExp(`\\b${parts.map(inflectPattern).join("\\s+")}\\b`, "i");
  const m = re.exec(sentence);
  return m ? { start: m.index, end: m.index + m[0].length } : null;
}
