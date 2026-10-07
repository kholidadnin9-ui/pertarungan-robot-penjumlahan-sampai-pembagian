import type { LevelConfig, MathOp } from "./levels";

export interface Question {
  /** Teks soal yang ditampilkan (mis. "24 + 36" atau "24 ÷ 4" atau "7 × 8") */
  expression: string;
  /** Jawaban benar */
  answer: number;
  options: number[];
  /** Faktor kiri (dividend untuk ÷, penjumlahan pertama untuk +, faktor pertama untuk ×) */
  dividend: number;
  /** Faktor kanan (divisor untuk ÷, penjumlahan kedua untuk +, faktor kedua untuk ×) */
  divisor: number;
  op: MathOp;
}

export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Membuat 3 pilihan jawaban: benar + 2 penyamar yang dekat/jauh, dipilih acak */
export function makeOptions(answer: number, max: number): number[] {
  const set = new Set<number>([answer]);
  const near = shuffle([answer - 1, answer + 1, answer - 2, answer + 2]).filter(
    (n) => n >= 1 && n <= max && n !== answer
  );
  const far = shuffle([answer - 3, answer + 3, answer - 4, answer + 4]).filter(
    (n) => n >= 1 && n <= max && n !== answer
  );
  for (const n of [...near, ...far]) {
    if (set.size >= 3) break;
    set.add(n);
  }
  let guard = 0;
  while (set.size < 3 && guard++ < 200) set.add(randInt(1, max));
  return shuffle([...set]);
}

/** Apakah penjumlahan a+b menghasilkan penyimpanan (carry)? */
export function hasCarry(a: number, b: number): boolean {
  return (a % 10) + (b % 10) >= 10;
}

/** Apakah pengurangan a-b memerlukan peminjaman (borrow)? */
export function hasBorrow(a: number, b: number): boolean {
  return a % 10 < b % 10;
}

/** Soal pembagian: dividend ÷ divisor */
function genDiv(level: LevelConfig): Question | null {
  const divisors = level.divisors ?? [2, 3, 4, 5, 6];
  const [qMin, qMax] = level.quotients ?? [1, 10];
  const divisor = pick(divisors);
  const answer = randInt(qMin, qMax);
  return {
    expression: `${divisor * answer} ÷ ${divisor}`,
    answer,
    options: makeOptions(answer, 10),
    dividend: divisor * answer,
    divisor,
    op: "÷",
  };
}

/**
 * Soal penjumlahan: hasil maksimal 100.
 * mode "tanpa"  = tanpa penyimpanan (a%10 + b%10 < 10)
 * mode "dengan" = dengan penyimpanan (a%10 + b%10 >= 10)
 * mode "campur" = acak salah satu
 */
function genAdd(level: LevelConfig): Question | null {
  const mode = level.addMode ?? "tanpa";
  const digits = level.addDigits ?? "2+2";
  const maxSum = level.maxSum ?? 100;

  for (let i = 0; i < 200; i++) {
    let a: number, b: number;
    if (digits === "1+1") {
      a = randInt(1, 9);
      b = randInt(1, 9);
    } else if (digits === "2+1") {
      a = randInt(10, 89);
      b = randInt(1, 9);
    } else {
      a = randInt(10, 89);
      b = randInt(10, 90);
    }

    const carry = hasCarry(a, b);
    if (mode === "tanpa" && carry) continue;
    if (mode === "dengan" && !carry) continue;

    const answer = a + b;
    if (answer > maxSum) continue;
    // minimal hasil supaya menarik
    if (answer < 2) continue;

    return {
      expression: `${a} + ${b}`,
      answer,
      options: makeOptions(answer, maxSum),
      dividend: a,
      divisor: b,
      op: "+",
    };
  }
  return null;
}

/**
 * Soal pengurangan: a − b, hasil selalu >= 1 dan bilangan maksimal 100.
 * mode "tanpa"  = tanpa meminjam (satuan a >= satuan b)
 * mode "dengan" = dengan meminjam (satuan a < satuan b)
 * mode "campur" = acak salah satu
 */
function genSub(level: LevelConfig): Question | null {
  const mode = level.subMode ?? "tanpa";
  const digits = level.subDigits ?? "2-2";

  for (let i = 0; i < 300; i++) {
    let a: number, b: number;
    if (digits === "1-1") {
      a = randInt(2, 9);
      b = randInt(1, 8);
    } else if (digits === "2-1") {
      a = randInt(11, 99);
      b = randInt(1, 9);
    } else {
      a = randInt(21, 99);
      b = randInt(10, 89);
    }

    if (b >= a) continue;
    const borrow = hasBorrow(a, b);
    if (mode === "tanpa" && borrow) continue;
    if (mode === "dengan" && !borrow) continue;

    const answer = a - b;
    if (answer < 1 || answer > 100) continue;

    return {
      expression: `${a} − ${b}`,
      answer,
      options: makeOptions(answer, 100),
      dividend: a,
      divisor: b,
      op: "−",
    };
  }
  return null;
}

/** Soal perkalian: a × b, batas hasil ditentukan oleh level (tabel 1-12) */
function genMul(level: LevelConfig): Question | null {
  const factors = level.factors ?? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  for (let i = 0; i < 300; i++) {
    const a = pick(factors);
    const b = randInt(1, 12);
    const answer = a * b;
    if (answer < 1 || answer > 144) continue;
    return {
      expression: `${a} × ${b}`,
      answer,
      options: makeOptions(answer, 144),
      dividend: a,
      divisor: b,
      op: "×",
    };
  }
  return null;
}

export function generateQuestions(level: LevelConfig): Question[] {
  const out: Question[] = [];
  const used = new Set<string>();
  let guard = 0;
  while (out.length < level.questions && guard++ < 5000) {
    let q: Question | null = null;
    if (level.op === "+") q = genAdd(level);
    else if (level.op === "×") q = genMul(level);
    else if (level.op === "−") q = genSub(level);
    else q = genDiv(level);
    if (!q) continue;
    const key = `${q.op}:${q.expression}`;
    if (used.has(key)) continue;
    used.add(key);
    out.push(q);
  }
  return out;
}

/** Waktu (ms) robot musuh menembak untuk setiap soal */
export function rollEnemyTimes(level: LevelConfig): number[] {
  const limit = level.timeLimit * 1000;
  return Array.from({ length: level.questions }, () => {
    const f = level.enemyMin + Math.random() * (level.enemyMax - level.enemyMin);
    return Math.round(limit * f);
  });
}
