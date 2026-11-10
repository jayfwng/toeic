import { PARTS, POS_LIST, type Word } from "./types";
import { findWordInSentence } from "./words";

const hasHangul = (s: string) => /[가-힣]/.test(s);

/** 단어 1개의 필드 검증. 문제 목록을 반환(빈 배열 = 통과) */
export function validateWord(w: unknown): string[] {
  const errs: string[] = [];
  const x = w as Partial<Word>;
  const isStrArr = (a: unknown) => Array.isArray(a) && a.every((s) => typeof s === "string");
  if (!x || typeof x !== "object") return ["객체가 아님"];
  if (typeof x.id !== "string" || !/^[a-z0-9-]+$/.test(x.id)) errs.push("id 형식 오류");
  if (typeof x.word !== "string" || !/^[A-Za-z][A-Za-z' -]*$/.test(x.word.trim())) errs.push("word 형식 오류");
  if (!isStrArr(x.pos) || !x.pos!.length || !x.pos!.every((p) => (POS_LIST as readonly string[]).includes(p)))
    errs.push("pos 오류");
  if (!isStrArr(x.meanings) || !x.meanings!.length || !x.meanings!.every((m) => m.trim() && hasHangul(m)))
    errs.push("meanings 오류(한국어 뜻 1개 이상)");
  if (!x.example || typeof x.example.en !== "string" || typeof x.example.ko !== "string") errs.push("example 누락");
  else {
    if (x.example.en.trim().split(/\s+/).length < 5) errs.push("영어 예문이 너무 짧음");
    if (!hasHangul(x.example.ko)) errs.push("예문 해석이 한국어가 아님");
    if (typeof x.word === "string" && !findWordInSentence(x.word, x.example.en))
      errs.push(`예문에 '${x.word}'(활용형 포함)가 없음`);
  }
  if (typeof x.rank !== "number" || !Number.isInteger(x.rank) || x.rank < 1) errs.push("rank 오류");
  if (!isStrArr(x.parts) || !x.parts!.length || !x.parts!.every((p) => (PARTS as readonly string[]).includes(p)))
    errs.push("parts 오류");
  if (!isStrArr(x.synonyms)) errs.push("synonyms 오류");
  if (!isStrArr(x.collocations)) errs.push("collocations 오류");
  return errs;
}

/** 전체 목록 검증: 필드 + id/word/rank 중복 */
export function validateWords(words: unknown[]): string[] {
  const errs: string[] = [];
  const ids = new Set<string>();
  const keys = new Set<string>();
  const ranks = new Set<number>();
  words.forEach((w, i) => {
    const x = w as Word;
    const label = `#${i} ${x?.word ?? "?"}`;
    for (const e of validateWord(w)) errs.push(`${label}: ${e}`);
    if (ids.has(x.id)) errs.push(`${label}: id 중복`);
    ids.add(x.id);
    const key = `${x.word?.toLowerCase()}|${[...(x.pos ?? [])].sort().join(",")}`;
    if (keys.has(key)) errs.push(`${label}: 단어+품사 중복`);
    keys.add(key);
    if (ranks.has(x.rank)) errs.push(`${label}: rank 중복`);
    ranks.add(x.rank);
  });
  return errs;
}
