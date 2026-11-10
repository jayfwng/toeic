export const PARTS = ["Part5", "Part6", "Part7", "LC"] as const;
export type Part = (typeof PARTS)[number];

export const POS_LIST = ["n", "v", "adj", "adv", "prep", "conj", "phr"] as const;
export type POS = (typeof POS_LIST)[number];

export const POS_LABEL: Record<POS, string> = {
  n: "명사",
  v: "동사",
  adj: "형용사",
  adv: "부사",
  prep: "전치사",
  conj: "접속사",
  phr: "구",
};

/** 콘텐츠: content/words.json 의 단어 1개 */
export interface Word {
  id: string;
  word: string;
  pos: POS[];
  meanings: string[];
  example: { en: string; ko: string };
  rank: number;
  parts: Part[];
  synonyms: string[];
  collocations: string[];
}

export interface WordsFile {
  version: number;
  updatedAt: string;
  words: Word[];
}

/** 학습 기록: 단어별 SRS 상태 */
export interface Progress {
  wordId: string;
  status: "learning" | "review" | "known";
  ease: number;
  interval: number;
  reps: number;
  due: string; // YYYY-MM-DD
  lapses: number;
  wrong: 0 | 1;
  wrongStreak: number;
  firstSeen: string;
  lastReviewed: string;
}

export type StudyMode = "flashcard" | "choice" | "spelling" | "cloze";
export type Quality = 0 | 1 | 2 | 3 | 4 | 5;

export interface ReviewLog {
  id?: number;
  wordId: string;
  date: string;
  mode: StudyMode;
  quality: Quality;
  ts: number;
}

export interface DailyStat {
  date: string;
  newCount: number;
  reviewCount: number;
  correct: number;
  total: number;
}

export interface WordEdit {
  id: string;
  data?: Word;
  deleted?: boolean;
  updatedAt: number;
}

export interface Settings {
  key: "app";
  dailyNewGoal: number;
  examDate: string;
  targetCount: number; // 0 = 전체 단어 수
  ttsRate: number;
  theme: "system" | "dark" | "light";
}

export const DEFAULT_SETTINGS: Settings = {
  key: "app",
  dailyNewGoal: 30,
  examDate: "2027-02-28",
  targetCount: 0,
  ttsRate: 0.9,
  theme: "system",
};
