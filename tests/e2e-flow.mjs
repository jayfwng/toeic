// 실제 브라우저로 '플래시카드 → 퀴즈 → 다음 날 SRS 복습' 흐름을 확인하는 E2E 스크립트.
// 사용: npm run build && npx serve out -l 3123 & 그 다음 node tests/e2e-flow.mjs [baseURL]
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import fs from "node:fs";

const WORDS = JSON.parse(fs.readFileSync(new URL("../content/words.json", import.meta.url))).words;

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); }
catch { playwright = require(execSync("npm root -g").toString().trim() + "/playwright"); }

const BASE = process.argv[2] ?? "http://localhost:3123";
const SHOTS = process.env.SHOTS; // 스크린샷 저장 폴더 (선택)
const D0 = new Date("2026-11-10T09:00:00");
const D1 = new Date("2026-11-11T09:00:00");

const log = (...a) => console.log("  •", ...a);
function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
  log("OK", msg);
}

const browser = await playwright.chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, colorScheme: "dark" });
const page = await ctx.newPage();
await page.clock.install({ time: D0 });
page.on("pageerror", (e) => console.error("pageerror:", e.message));
const shot = async (name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png` });
const nextItem = async (prev) => {
  await page.waitForFunction(
    (p) => document.querySelector('[data-testid="session-done"]') || document.querySelector('[data-testid="session-progress"]')?.textContent !== p,
    prev,
  );
};
const progressText = async () => (await page.getByTestId("session-progress").count()) ? await page.getByTestId("session-progress").textContent() : null;
const text = async (sel) => (await page.locator(sel).first().textContent())?.trim();

console.log("1) 설정: 하루 목표 5개");
await page.goto(`${BASE}/settings/`);
await page.getByTestId("goal-input").fill("5");
await page.getByTestId("goal-input").blur();
await page.waitForTimeout(200);

console.log("2) 홈 확인");
await page.goto(`${BASE}/`);
await page.getByTestId("due-count").waitFor();
assert((await text('[data-testid="due-count"]')).startsWith("0"), "처음엔 복습 0개");
assert((await text('[data-testid="dday"]')) === "D-110", "D-day = D-110 (2027-02-28 기준)");
await shot("01-home");

console.log("3) 추천 학습: 신규 5개 카드 → 4지선다");
await page.goto(`${BASE}/study/`);
await page.getByTestId("mode-mixed").click();
let wrongWords = [];
let step = 0;
while (!(await page.getByTestId("session-done").count())) {
  step++;
  await page.getByTestId("mode-label").or(page.getByTestId("session-done")).first().waitFor();
  if (await page.getByTestId("session-done").count()) break;
  const mode = await text('[data-testid="mode-label"]');
  const before = await progressText();
  if (mode.startsWith("플래시카드")) {
    const card = page.getByTestId("flashcard");
    await card.waitFor({ state: "visible" });
    const word = (await card.locator("p").first().textContent()).trim();
    if (step === 1) await shot("02-card-front");
    if (step === 2) {
      // 2번째 카드: 탭해서 뒤집은 뒤 '몰라요' 버튼
      await card.click();
      await page.waitForTimeout(400);
      await shot("03-card-back");
      await page.getByRole("button", { name: "← 몰라요" }).click();
      wrongWords.push(word);
    } else {
      // 나머지: 오른쪽 스와이프 = 알아요
      const box = await card.boundingBox();
      const y = box.y + box.height / 2;
      await page.mouse.move(box.x + box.width / 2, y);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 160, y, { steps: 8 });
      await page.mouse.up();
    }
    if (await page.getByRole("button", { name: "다음" }).count()) await page.getByRole("button", { name: "다음" }).click();
  } else if (mode.startsWith("4지선다")) {
    // 정답 찾기: 정답은 단어/뜻이 일치하는 보기. 여기서는 첫 보기를 누르고 결과에 따라 진행
    if (step === 6) await shot("04-quiz");
    await page.getByTestId("choice").first().click();
    await page.getByRole("button", { name: "다음" }).click();
  } else {
    throw new Error("예상치 못한 모드: " + mode);
  }
  await nextItem(before);
  if (step > 40) throw new Error("세션이 끝나지 않음");
}
await shot("05-done");
assert(true, `세션 완료 (${step}문항)`);

console.log("4) 오답 단어장 확인");
await page.goto(`${BASE}/wrong/`);
await page.getByTestId("wrong-list").waitFor();
const wrongList = await page.getByTestId("wrong-list").textContent();
assert(wrongWords.every((w) => wrongList.includes(w)), `몰라요 한 단어(${wrongWords.join(", ")})가 오답장에 등록됨`);
await shot("06-wrong");

console.log("5) 오늘은 복습 0, 신규 0");
await page.goto(`${BASE}/`);
await page.getByTestId("due-count").waitFor();
assert((await text('[data-testid="due-count"]')).startsWith("0"), "오늘 복습 0개");
assert((await text('[data-testid="streak"]')) === "1", "연속 학습일 1");

console.log("6) 다음 날: 5개 모두 복습 대상");
await page.clock.setSystemTime(D1);
await page.goto(`${BASE}/`);
await page.getByTestId("due-count").waitFor();
const due = parseInt(await text('[data-testid="due-count"]'), 10);
assert(due === 5, `다음 날 복습 ${due}개 (어제 학습한 5개)`);
await shot("07-home-next-day");

console.log("7) 철자 입력 세션: 복습 5개 + 오늘 신규 5개, 모두 정답 입력");
await page.goto(`${BASE}/study/`);
await page.getByTestId("mode-spelling").click();
let reviewed = 0;
while (!(await page.getByTestId("session-done").count())) {
  await page.getByTestId("spelling-input").or(page.getByTestId("session-done")).first().waitFor();
  if (await page.getByTestId("session-done").count()) break;
  // 정답은 words.json에서 뜻으로 찾아 입력 (UI 흐름 확인 목적)
  const meaning = (await page.locator("p.text-2xl").first().textContent()).trim();
  const word = WORDS.find((w) => w.meanings.join(", ") === meaning)?.word;
  await page.getByTestId("spelling-input").fill(word ?? "wrong");
  if (reviewed === 0) await shot("08-spelling");
  const before = await progressText();
  await page.getByRole("button", { name: "확인" }).click();
  await page.getByRole("button", { name: "다음" }).click();
  await nextItem(before);
  reviewed++;
  if (reviewed > 20) throw new Error("복습 세션이 끝나지 않음");
}
assert(reviewed >= 5, `복습 ${reviewed}문항 완료`);

console.log("8) 복습 후 홈: 복습 0, 연속 학습일 2, 간격 늘어남");
await page.goto(`${BASE}/`);
await page.getByTestId("due-count").waitFor();
assert((await text('[data-testid="due-count"]')).startsWith("0"), "복습 0개로 감소");
assert((await text('[data-testid="streak"]')) === "2", "연속 학습일 2");
const intervals = await page.evaluate(() => new Promise((resolve) => {
  const r = indexedDB.open("toeic-words");
  r.onsuccess = () => {
    const tx = r.result.transaction("progress").objectStore("progress").getAll();
    tx.onsuccess = () => resolve(tx.result.map((p) => ({ id: p.wordId, interval: p.interval, wrong: p.wrong, due: p.due, firstSeen: p.firstSeen })));
  };
}));
const day1 = intervals.filter((p) => p.firstSeen === "2026-11-10");
const day2 = intervals.filter((p) => p.firstSeen === "2026-11-11");
assert(day1.length === 5 && day2.length === 5, "어제 5개 복습 + 오늘 신규 5개 학습");
assert(day1.filter((p) => !p.wrong).every((p) => p.interval === 6), "어제 단어 중 계속 맞힌 단어 → 간격 6일");
assert(day1.filter((p) => p.wrong).every((p) => p.interval <= 3), "오답장 단어 → 간격 3일 이하로 짧게 유지");
assert(day2.every((p) => p.due === "2026-11-12"), "오늘 신규 단어 → 내일 복습");
await shot("09-home-after-review");

await page.goto(`${BASE}/stats/`);
await page.getByTestId("band-100").waitFor();
await shot("10-stats");

console.log("9) 오프라인: 서비스워커 캐시로 동작");
await page.goto(`${BASE}/`);
await page.evaluate(() => navigator.serviceWorker.ready);
await page.reload();
await ctx.setOffline(true);
await page.goto(`${BASE}/wrong/`);
assert((await page.locator("h1").first().textContent()).includes("오답"), "오프라인에서 오답 페이지 로드");
await page.goto(`${BASE}/study/`);
assert((await page.locator("h1").first().textContent()).includes("학습"), "오프라인에서 학습 페이지 로드");
await ctx.setOffline(false);

await browser.close();
console.log("\n✓ E2E 흐름 통과");
