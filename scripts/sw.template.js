/* 빌드 시 scripts/build-sw.mjs 가 이 템플릿으로 out/sw.js 를 생성합니다. */
const VERSION = "__VERSION__";
const BASE = __BASE__;
const PRECACHE = __PRECACHE__;
const CACHE = `toeic-${VERSION}`;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("toeic-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  const url = new URL(req.url);
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      // 페이지 이동: 경로를 정규화해 미리 받아 둔 HTML을 돌려준다 (오프라인 동작)
      if (req.mode === "navigate") {
        let p = url.pathname.endsWith("/") ? url.pathname : url.pathname + "/";
        const hit = (await cache.match(p)) || (await cache.match(BASE + "/"));
        if (hit) {
          fetch(req).then((res) => res.ok && cache.put(p, res.clone())).catch(() => {});
          return hit;
        }
      }
      const cached = await cache.match(req, { ignoreSearch: true });
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res.ok && res.type === "basic") cache.put(req, res.clone());
        return res;
      } catch (e) {
        return (await cache.match(BASE + "/")) || Response.error();
      }
    })(),
  );
});
