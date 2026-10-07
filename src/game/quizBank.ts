import type { LevelConfig, MathOp } from "./levels";
import { generateQuestions, makeOptions, shuffle, type Question } from "./questions";

/** Bank soal custom. Kunci = `${op}|${levelId}` (mis. "+|3" atau "×|2"). */
export interface CustomQuestion {
  id: string;
  op: MathOp;
  /** Operand pertama (untuk ÷: angka yang dibagi; untuk +: penjumlahan pertama; untuk ×: faktor pertama) */
  a: number;
  /** Operand kedua (untuk ÷: pembagi; untuk +: penjumlahan kedua; untuk ×: faktor kedua) */
  b: number;
  options: number[];
}
export type QuizBank = Record<string, CustomQuestion[]>;

const KEY = "rb_quizbank_v2";

export function bankKey(op: MathOp, levelId: number): string {
  return `${op}|${levelId}`;
}

export function answerOf(op: MathOp, a: number, b: number): number {
  if (op === "+") return a + b;
  if (op === "×") return a * b;
  if (op === "−") return a - b;
  return Math.round(a / b);
}

export function expressionOf(op: MathOp, a: number, b: number): string {
  return `${a} ${op} ${b}`;
}

export function opLabel(op: MathOp): string {
  if (op === "+") return "Penjumlahan";
  if (op === "×") return "Perkalian";
  if (op === "−") return "Pengurangan";
  return "Pembagian";
}

/** Maksimum hasil yang diizinkan untuk pembuatan/validasi soal custom per level */
export function maxAnswerOf(level: LevelConfig): number {
  if (level.op === "+") return level.maxSum ?? 100;
  if (level.op === "−") return 100;
  if (level.op === "×") {
    const maxF = Math.max(...(level.factors ?? [10]));
    return maxF * 12;
  }
  return 10;
}

export function loadBank(): QuizBank {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return {};
    const clean: QuizBank = {};
    for (const [k, list] of Object.entries(parsed)) {
      if (!Array.isArray(list)) continue;
      // Kunci lama (angka) dianggap soal pembagian
      const key = /^\d+$/.test(k) ? bankKey("÷", Number(k)) : k;
      const op: MathOp = key.startsWith("+")
        ? "+"
        : key.startsWith("×")
          ? "×"
          : key.startsWith("−")
            ? "−"
            : "÷";
      const ok = list.filter((q) => {
        const c = q as CustomQuestion | null;
        return (
          c &&
          typeof c.id === "string" &&
          Number.isInteger(c.a) &&
          Number.isInteger(c.b) &&
          Array.isArray(c.options) &&
          c.options.length === 3 &&
          validateQuestion(op, c.a, c.b, c.options) === null
        );
      }) as CustomQuestion[];
      if (ok.length) clean[key] = ok;
    }
    return clean;
  } catch {
    return {};
  }
}

export function saveBank(b: QuizBank) {
  try {
    localStorage.setItem(KEY, JSON.stringify(b));
  } catch {
    /* ignore */
  }
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

export function bankCount(bank: QuizBank, op: MathOp, levelId: number): number {
  return bank[bankKey(op, levelId)]?.length ?? 0;
}

/** Ambil soal custom untuk level (diacak; dipakai ulang bila kurang dari jumlah soal level). */
export function customQuestions(level: LevelConfig, bank: QuizBank): Question[] | null {
  const list = bank[bankKey(level.op, level.id)];
  if (!list || list.length === 0) return null;
  const shuffled = shuffle(list);
  const out: Question[] = [];
  for (let i = 0; i < level.questions; i++) {
    const c = shuffled[i % shuffled.length];
    out.push({
      expression: expressionOf(level.op, c.a, c.b),
      answer: answerOf(level.op, c.a, c.b),
      options: shuffle(c.options.slice(0, 3)),
      dividend: c.a,
      divisor: c.b,
      op: level.op,
    });
  }
  return out;
}

/** Soal untuk level: custom bila ada, selain itu otomatis. */
export function questionsForLevel(level: LevelConfig, bank: QuizBank): Question[] {
  return customQuestions(level, bank) ?? generateQuestions(level);
}

/** Validasi soal custom. Mengembalikan pesan error (Indonesia) atau null bila valid. */
export function validateQuestion(op: MathOp, a: number, b: number, options: number[]): string | null {
  if (op === "−") {
    if (!Number.isInteger(a) || a < 2 || a > 100) return "Angka pertama harus bilangan bulat 2 - 100.";
    if (!Number.isInteger(b) || b < 1 || b > 99) return "Angka pengurang harus bilangan bulat 1 - 99.";
    if (b >= a) return "Angka pengurang harus lebih kecil dari angka pertama.";
    const answer = a - b;
    if (answer < 1) return "Hasil pengurangan harus minimal 1.";
    if (options.some((o) => !Number.isInteger(o) || o < 1 || o > 100))
      return "Ketiga pilihan harus bilangan bulat 1 - 100.";
    if (new Set(options).size !== 3) return "Ketiga pilihan jawaban harus berbeda.";
    if (!options.includes(answer)) return "Jawaban yang benar harus ada di antara pilihan.";
    return null;
  }
  if (op === "+" || op === "×") {
    if (!Number.isInteger(a) || a < 1 || a > 99)
      return op === "+" ? "Angka pertama harus bilangan bulat 1 - 99." : "Faktor pertama harus bilangan bulat 1 - 99.";
    if (!Number.isInteger(b) || b < 1 || b > 99)
      return op === "+" ? "Angka kedua harus bilangan bulat 1 - 99." : "Faktor kedua harus bilangan bulat 1 - 99.";
    const answer = answerOf(op, a, b);
    if (answer > 100 && op === "+") return "Hasil penjumlahan tidak boleh lebih dari 100.";
    if (answer > 144 && op === "×") return "Hasil perkalian tidak boleh lebih dari 144.";
    const maxOpt = op === "+" ? 100 : 144;
    if (options.some((o) => !Number.isInteger(o) || o < 1 || o > maxOpt))
      return `Ketiga pilihan harus bilangan bulat 1 - ${maxOpt}.`;
    if (new Set(options).size !== 3) return "Ketiga pilihan jawaban harus berbeda.";
    if (!options.includes(answer)) return "Jawaban yang benar harus ada di antara pilihan.";
    return null;
  }
  // ÷
  if (!Number.isInteger(a) || a < 1 || a > 99)
    return "Angka yang dibagi harus bilangan bulat 1 - 99.";
  if (!Number.isInteger(b) || b < 1 || b > 10) return "Pembagi harus bilangan bulat 1 - 10.";
  if (a % b !== 0) return "Angka yang dibagi harus habis dibagi pembagi.";
  const answer = a / b;
  if (answer < 1 || answer > 10) return "Hasil bagi harus antara 1 - 10.";
  if (options.some((o) => !Number.isInteger(o) || o < 1 || o > 99))
    return "Ketiga pilihan harus bilangan bulat 1 - 99.";
  if (new Set(options).size !== 3) return "Ketiga pilihan jawaban harus berbeda.";
  if (!options.includes(answer)) return "Jawaban yang benar harus ada di antara pilihan.";
  return null;
}

export { makeOptions };
