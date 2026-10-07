import { ADD_LEVELS, LEVELS, MUL_LEVELS, SUB_LEVELS, type LevelConfig, type MathOp } from "./levels";

export interface Progress {
  /** Level pembagian yang terbuka (1..5) */
  divUnlocked: number;
  divStars: number[];
  /** Level penjumlahan yang terbuka (1..5) */
  addUnlocked: number;
  addStars: number[];
  /** Level perkalian yang terbuka (1..5) */
  mulUnlocked: number;
  mulStars: number[];
  /** Level pengurangan yang terbuka (1..5) */
  subUnlocked: number;
  subStars: number[];
  coins: number;
  bestScore: number;
  wins: number;
}

const KEY = "robot_battle_math_v2";
const OLD_KEY = "robot_battle_pembagian_v1";

export function levelsForOp(op: MathOp): LevelConfig[] {
  if (op === "+") return ADD_LEVELS;
  if (op === "×") return MUL_LEVELS;
  if (op === "−") return SUB_LEVELS;
  return LEVELS;
}

export function unlockedOf(p: Progress, op: MathOp): number {
  if (op === "+") return p.addUnlocked;
  if (op === "×") return p.mulUnlocked;
  if (op === "−") return p.subUnlocked;
  return p.divUnlocked;
}

export function starsOf(p: Progress, op: MathOp): number[] {
  if (op === "+") return p.addStars;
  if (op === "×") return p.mulStars;
  if (op === "−") return p.subStars;
  return p.divStars;
}

export function defaultProgress(): Progress {
  return {
    divUnlocked: 1,
    divStars: LEVELS.map(() => 0),
    addUnlocked: 1,
    addStars: ADD_LEVELS.map(() => 0),
    mulUnlocked: 1,
    mulStars: MUL_LEVELS.map(() => 0),
    subUnlocked: 1,
    subStars: SUB_LEVELS.map(() => 0),
    coins: 0,
    bestScore: 0,
    wins: 0,
  };
}

export function loadProgress(): Progress {
  try {
    const d = defaultProgress();
    // Migrasi data lama (hanya pembagian) dari format v1
    try {
      const oldRaw = localStorage.getItem(OLD_KEY);
      if (oldRaw && !localStorage.getItem(KEY)) {
        const o = JSON.parse(oldRaw) as { unlocked?: number; stars?: number[] };
        d.divUnlocked = Math.min(LEVELS.length, Math.max(1, o.unlocked ?? 1));
        d.divStars = LEVELS.map((_, i) => o.stars?.[i] ?? 0);
        localStorage.setItem(KEY, JSON.stringify(d));
      }
    } catch {
      /* ignore */
    }

    const raw = localStorage.getItem(KEY);
    if (!raw) return d;
    const p = JSON.parse(raw) as Partial<Progress>;
    return {
      divUnlocked: Math.min(LEVELS.length, Math.max(1, p.divUnlocked ?? d.divUnlocked)),
      divStars: LEVELS.map((_, i) => p.divStars?.[i] ?? 0),
      addUnlocked: Math.min(ADD_LEVELS.length, Math.max(1, p.addUnlocked ?? d.addUnlocked)),
      addStars: ADD_LEVELS.map((_, i) => p.addStars?.[i] ?? 0),
      mulUnlocked: Math.min(MUL_LEVELS.length, Math.max(1, p.mulUnlocked ?? d.mulUnlocked)),
      mulStars: MUL_LEVELS.map((_, i) => p.mulStars?.[i] ?? 0),
      subUnlocked: Math.min(SUB_LEVELS.length, Math.max(1, p.subUnlocked ?? d.subUnlocked)),
      subStars: SUB_LEVELS.map((_, i) => p.subStars?.[i] ?? 0),
      coins: p.coins ?? 0,
      bestScore: p.bestScore ?? 0,
      wins: p.wins ?? 0,
    };
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function clearProgress() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(OLD_KEY);
  } catch {
    /* ignore */
  }
}
