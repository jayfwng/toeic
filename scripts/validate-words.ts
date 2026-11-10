/**
 * content/words.json 검증: 필드 형식, 예문에 표제어 포함, id/단어/순위 중복
 * 사용: npm run validate
 */
import fs from "node:fs";
import { validateWords } from "../src/lib/validate";

const file = process.argv[2] ?? "content/words.json";
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const errs = validateWords(data.words);
if (errs.length) {
  console.error(`✗ ${errs.length}개 문제 발견:`);
  for (const e of errs) console.error("  " + e);
  process.exit(1);
}
console.log(`✓ ${data.words.length}개 단어 검증 통과 (${file})`);
