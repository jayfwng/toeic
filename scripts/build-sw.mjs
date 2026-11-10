// next build(정적 export) 후 out/ 의 모든 파일을 precache 목록으로 하는 서비스워커를 생성한다.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const OUT = "out";
const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (!/(^|\/)(sw\.js|.*\.map)$/.test(p)) files.push(p);
  }
})(OUT);

const hash = crypto.createHash("sha256");
const urls = files.sort().map((f) => {
  hash.update(f).update(fs.readFileSync(f));
  const rel = "/" + path.relative(OUT, f).split(path.sep).join("/");
  return base + rel.replace(/index\.html$/, "");
});
const version = hash.digest("hex").slice(0, 12);

const tpl = fs.readFileSync("scripts/sw.template.js", "utf8");
fs.writeFileSync(
  path.join(OUT, "sw.js"),
  tpl.replace("__VERSION__", version).replace("__PRECACHE__", JSON.stringify(urls)).replace("__BASE__", JSON.stringify(base)),
);
console.log(`sw.js 생성: ${urls.length}개 파일 precache (v${version})`);
