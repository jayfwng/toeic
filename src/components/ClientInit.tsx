"use client";
import { useEffect } from "react";
import { useSettings } from "@/lib/hooks";

/** 테마 적용 + 서비스워커 등록 + 영구 저장소 요청 */
export default function ClientInit() {
  const { theme } = useSettings();

  useEffect(() => {
    try { localStorage.setItem("theme", theme); } catch {}
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      document.documentElement.classList.toggle("dark", theme === "dark" || (theme === "system" && mq.matches));
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if ("serviceWorker" in navigator) {
      const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
      navigator.serviceWorker.register(`${base}/sw.js`, { scope: `${base}/` }).catch(() => {});
    }
    // 브라우저가 IndexedDB를 임의로 지우지 않도록 요청
    navigator.storage?.persist?.().catch(() => {});
  }, []);

  return null;
}
