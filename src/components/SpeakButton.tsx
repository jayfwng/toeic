"use client";
import { speak, ttsSupported } from "@/lib/tts";
import { useSettings } from "@/lib/hooks";
import { SpeakerIcon } from "./Icons";

export default function SpeakButton({ text, className = "", size = "md" }: { text: string; className?: string; size?: "sm" | "md" | "lg" }) {
  const { ttsRate } = useSettings();
  if (typeof window !== "undefined" && !ttsSupported()) return null;
  const dim = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-9 w-9" : "h-11 w-11";
  return (
    <button
      type="button"
      aria-label="발음 듣기"
      onClick={(e) => { e.stopPropagation(); speak(text, ttsRate); }}
      onPointerDown={(e) => e.stopPropagation()}
      className={`inline-flex ${dim} items-center justify-center rounded-full bg-indigo-50 text-indigo-600 active:scale-95 dark:bg-indigo-950 dark:text-indigo-300 ${className}`}
    >
      <SpeakerIcon className={size === "lg" ? "h-7 w-7" : "h-5 w-5"} />
    </button>
  );
}
