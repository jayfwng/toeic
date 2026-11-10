/**
 * Anthropic API로 TOEIC 비즈니스 영어 빈출 단어를 추가 생성해 content/words.json에 병합한다.
 *
 * 사용:
 *   export ANTHROPIC_API_KEY=sk-ant-...
 *   npm run generate -- --count 200            # 200개 추가 (50개씩 나눠 요청)
 *   npm run generate -- --count 50 --dry-run   # 파일에 쓰지 않고 결과만 확인
 *   npm run generate -- --target 1000          # 전체가 1000개가 될 때까지 추가
 *
 * 처리 과정: 기존 단어 목록을 제외 목록으로 전달 → 구조화 출력(JSON 스키마)으로 생성
 *           → 필드 검증(validateWord) → 기존/배치 내 중복 제거 → rank 이어 붙이기 → 저장
 */
import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { PARTS, POS_LIST, type Word, type WordsFile } from "../src/lib/types";
import { validateWord, validateWords } from "../src/lib/validate";
import { makeId } from "../src/lib/words";

const FILE = "content/words.json";
const MODEL = process.env.WORDS_MODEL || "claude-opus-5-5";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const DRY = process.argv.includes("--dry-run");
const BATCH = Number(arg("batch") ?? 50);

const SCHEMA = {
  type: "object",
  properties: {
    words: {
      type: "array",
      items: {
        type: "object",
        properties: {
          word: { type: "string", description: "표제어 (소문자, 고유명사 제외)" },
          pos: { type: "array", items: { type: "string", enum: [...POS_LIST] } },
          meanings: { type: "array", items: { type: "string" }, description: "한국어 뜻 1~3개, TOEIC에서 쓰이는 뜻 우선" },
          example_en: { type: "string", description: "표제어(또는 규칙 활용형)가 그대로 들어간 비즈니스 상황 영어 예문, 8~18 단어" },
          example_ko: { type: "string", description: "예문의 자연스러운 한국어 해석" },
          parts: { type: "array", items: { type: "string", enum: [...PARTS] } },
          synonyms: { type: "array", items: { type: "string" } },
          collocations: { type: "array", items: { type: "string" } },
        },
        required: ["word", "pos", "meanings", "example_en", "example_ko", "parts", "synonyms", "collocations"],
        additionalProperties: false,
      },
    },
  },
  required: ["words"],
  additionalProperties: false,
} as const;

interface Generated {
  word: string;
  pos: string[];
  meanings: string[];
  example_en: string;
  example_ko: string;
  parts: string[];
  synonyms: string[];
  collocations: string[];
}

const SYSTEM = `You are a TOEIC vocabulary editor building a word list for a Korean learner aiming for a score of 900.
Write every definition and example sentence yourself. Do not copy or paraphrase text from published TOEIC books or test materials.
Rules:
- Suggest words that frequently appear on the TOEIC (business, office, travel, finance, HR, manufacturing, customer service contexts).
- Order the list from most to least frequent on the TOEIC.
- meanings: 1-3 short Korean glosses, the TOEIC sense first.
- example_en: one natural business sentence, 8-18 words, that contains the headword itself or a regular inflection (-s, -ed, -ing). Avoid irregular forms such as "held" for "hold".
- example_ko: a natural Korean translation of example_en.
- parts: where the word typically appears (Part5, Part6, Part7, LC).
- synonyms: 1-3 single words or short phrases. collocations: 1-3 common business phrases containing the word.
- Never include any word from the exclusion list, and no duplicates in your output.`;

async function generateBatch(client: Anthropic, exclude: string[], n: number): Promise<Generated[]> {
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 64000,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
    // 정책상 거절되면 서버가 자동으로 대체 모델로 재시도
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Generate ${n} new TOEIC words.\n\nExclusion list (already in the deck):\n${exclude.join(", ")}`,
      },
    ],
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === "refusal") throw new Error("모델이 요청을 거절했습니다.");
  if (msg.stop_reason === "max_tokens") throw new Error("출력이 max_tokens에서 잘렸습니다. --batch 를 줄여 보세요.");
  const text = msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  const parsed = JSON.parse(text) as { words: Generated[] };
  return parsed.words;
}

async function main() {
  const data: WordsFile = JSON.parse(fs.readFileSync(FILE, "utf8"));
  const words: Word[] = data.words;
  const target = arg("target") ? Number(arg("target")) : words.length + Number(arg("count") ?? 100);
  if (!(target > words.length)) {
    console.log(`이미 ${words.length}개입니다. 목표(${target})보다 많아요.`);
    return;
  }

  const client = new Anthropic();
  const seen = new Set(words.map((w) => w.word.toLowerCase()));
  const ids = new Set(words.map((w) => w.id));
  let rank = words.reduce((m, w) => Math.max(m, w.rank), 0);
  const added: Word[] = [];
  let failures = 0;

  while (words.length + added.length < target && failures < 3) {
    const need = Math.min(BATCH, target - words.length - added.length);
    console.log(`→ ${need}개 요청 중… (현재 ${words.length + added.length}/${target}, 모델 ${MODEL})`);
    let batch: Generated[];
    try {
      batch = await generateBatch(client, [...seen], need);
    } catch (e) {
      if (e instanceof Anthropic.AuthenticationError) throw new Error("API 키가 올바르지 않습니다 (ANTHROPIC_API_KEY 확인).");
      if (e instanceof Anthropic.RateLimitError || e instanceof Anthropic.InternalServerError || e instanceof Anthropic.APIConnectionError || e instanceof SyntaxError) {
        failures++;
        console.warn(`  ! 일시 오류, 다시 시도합니다: ${(e as Error).message}`);
        continue;
      }
      throw e;
    }

    let ok = 0;
    for (const g of batch) {
      const key = g.word.trim().toLowerCase();
      if (seen.has(key)) { console.warn(`  - 중복 제외: ${g.word}`); continue; }
      const w: Word = {
        id: makeId(key, ids),
        word: key,
        pos: [...new Set(g.pos)] as Word["pos"],
        meanings: g.meanings.map((m) => m.trim()).filter(Boolean),
        example: { en: g.example_en.trim(), ko: g.example_ko.trim() },
        rank: rank + 1,
        parts: [...new Set(g.parts)] as Word["parts"],
        synonyms: g.synonyms.map((s) => s.trim()).filter(Boolean).slice(0, 4),
        collocations: g.collocations.map((s) => s.trim()).filter(Boolean).slice(0, 4),
      };
      const errs = validateWord(w);
      if (errs.length) { console.warn(`  - 검증 실패 제외: ${g.word} (${errs.join(", ")})`); continue; }
      rank++;
      seen.add(key);
      ids.add(w.id);
      added.push(w);
      ok++;
      if (words.length + added.length >= target) break;
    }
    console.log(`  ✓ ${ok}개 추가`);
    if (ok === 0) failures++;
  }

  const merged = [...words, ...added];
  const errs = validateWords(merged);
  if (errs.length) {
    console.error("병합 결과 검증 실패:\n" + errs.join("\n"));
    process.exit(1);
  }
  console.log(`\n총 ${added.length}개 추가 → 전체 ${merged.length}개`);
  if (DRY) {
    console.log("(--dry-run: 파일에 쓰지 않음) 미리보기:");
    for (const w of added.slice(0, 10)) console.log(`  ${w.rank}. ${w.word} — ${w.meanings.join(", ")}`);
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(FILE, JSON.stringify({ ...data, updatedAt: today, words: merged }, null, 2) + "\n");
  console.log(`${FILE} 저장 완료`);
}

main().catch((e) => {
  const m = e instanceof Error ? e.message : String(e);
  console.error(m);
  if (/authentication/i.test(m)) console.error("→ ANTHROPIC_API_KEY 환경변수를 설정한 뒤 다시 실행하세요.");
  process.exit(1);
});
