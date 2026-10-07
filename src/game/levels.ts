export type MathOp = "+" | "÷" | "×" | "−";

export interface LevelConfig {
  id: number;
  name: string;
  subtitle: string;
  /** Operasi level ini */
  op: MathOp;
  /** Pembagi yang boleh muncul pada level ini (op ÷) */
  divisors?: number[];
  /** Rentang hasil bagi (1-10) (op ÷) */
  quotients?: [number, number];
  /** Jenis penyimpanan pada penjumlahan (op +) */
  addMode?: "tanpa" | "dengan" | "campur";
  /** Pola bilangan pada penjumlahan (op +) */
  addDigits?: "1+1" | "2+1" | "2+2";
  /** Tabel/faktor perkalian yang boleh muncul (op ×) */
  factors?: number[];
  /** Jenis peminjaman pada pengurangan (op −) */
  subMode?: "tanpa" | "dengan" | "campur";
  /** Pola bilangan pada pengurangan (op −) */
  subDigits?: "1-1" | "2-1" | "2-2";
  /** Batas hasil untuk penjumlahan (maksimum) */
  maxSum?: number;
  /** Batas waktu per soal (detik) */
  timeLimit: number;
  /** Waktu robot musuh menembak, sebagai fraksi dari timeLimit (mode 1 pemain) */
  enemyMin: number;
  enemyMax: number;
  questions: number;
}

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    op: "÷",
    name: "Jalan Kota",
    subtitle: "Pembagian 1 & 2",
    divisors: [1, 2],
    quotients: [1, 10],
    timeLimit: 15,
    enemyMin: 0.7,
    enemyMax: 0.95,
    questions: 10,
  },
  {
    id: 2,
    op: "÷",
    name: "Pusat Kota",
    subtitle: "Pembagian 2 – 4",
    divisors: [2, 3, 4],
    quotients: [1, 10],
    timeLimit: 13,
    enemyMin: 0.62,
    enemyMax: 0.9,
    questions: 10,
  },
  {
    id: 3,
    op: "÷",
    name: "Jembatan Baja",
    subtitle: "Pembagian 3 – 6",
    divisors: [3, 4, 5, 6],
    quotients: [1, 10],
    timeLimit: 11,
    enemyMin: 0.58,
    enemyMax: 0.88,
    questions: 10,
  },
  {
    id: 4,
    op: "÷",
    name: "Pelabuhan",
    subtitle: "Pembagian 5 – 8",
    divisors: [5, 6, 7, 8],
    quotients: [1, 10],
    timeLimit: 10,
    enemyMin: 0.55,
    enemyMax: 0.85,
    questions: 10,
  },
  {
    id: 5,
    op: "÷",
    name: "Markas Bos",
    subtitle: "Pembagian 6 – 10",
    divisors: [6, 7, 8, 9, 10],
    quotients: [1, 10],
    timeLimit: 9,
    enemyMin: 0.5,
    enemyMax: 0.8,
    questions: 10,
  },
];

/** Level penjumlahan — hasil maksimal 100, ada penyimpanan & tanpa penyimpanan */
export const ADD_LEVELS: LevelConfig[] = [
  {
    id: 1,
    op: "+",
    name: "Taman Bermain",
    subtitle: "1 Digit + 1 Digit",
    addDigits: "1+1",
    addMode: "tanpa",
    maxSum: 20,
    timeLimit: 15,
    enemyMin: 0.7,
    enemyMax: 0.95,
    questions: 10,
  },
  {
    id: 2,
    op: "+",
    name: "Alun-Alun",
    subtitle: "2 Digit + 1 Digit",
    addDigits: "2+1",
    addMode: "tanpa",
    maxSum: 50,
    timeLimit: 14,
    enemyMin: 0.64,
    enemyMax: 0.92,
    questions: 10,
  },
  {
    id: 3,
    op: "+",
    name: "Jembatan Baja",
    subtitle: "2 Digit + 2 Digit",
    addDigits: "2+2",
    addMode: "tanpa",
    maxSum: 100,
    timeLimit: 12,
    enemyMin: 0.6,
    enemyMax: 0.9,
    questions: 10,
  },
  {
    id: 4,
    op: "+",
    name: "Pelabuhan",
    subtitle: "Dengan Penyimpanan",
    addDigits: "2+2",
    addMode: "dengan",
    maxSum: 100,
    timeLimit: 11,
    enemyMin: 0.56,
    enemyMax: 0.88,
    questions: 10,
  },
  {
    id: 5,
    op: "+",
    name: "Menara Bintang",
    subtitle: "Campur Penyimpanan",
    addDigits: "2+2",
    addMode: "campur",
    maxSum: 100,
    timeLimit: 10,
    enemyMin: 0.52,
    enemyMax: 0.85,
    questions: 10,
  },
];

/** Level perkalian — hasil maksimal ~132 (tabel 1-12, di bawah 10 x 10) */
export const MUL_LEVELS: LevelConfig[] = [
  {
    id: 1,
    op: "×",
    name: "Taman Bermain",
    subtitle: "Perkalian 1 – 3",
    factors: [1, 2, 3],
    timeLimit: 15,
    enemyMin: 0.7,
    enemyMax: 0.95,
    questions: 10,
  },
  {
    id: 2,
    op: "×",
    name: "Alun-Alun",
    subtitle: "Perkalian 4 – 6",
    factors: [4, 5, 6],
    timeLimit: 14,
    enemyMin: 0.64,
    enemyMax: 0.92,
    questions: 10,
  },
  {
    id: 3,
    op: "×",
    name: "Jembatan Baja",
    subtitle: "Perkalian 7 – 9",
    factors: [7, 8, 9],
    timeLimit: 12,
    enemyMin: 0.6,
    enemyMax: 0.9,
    questions: 10,
  },
  {
    id: 4,
    op: "×",
    name: "Pelabuhan",
    subtitle: "Perkalian 10 – 12",
    factors: [10, 11, 12],
    timeLimit: 11,
    enemyMin: 0.56,
    enemyMax: 0.88,
    questions: 10,
  },
  {
    id: 5,
    op: "×",
    name: "Menara Bintang",
    subtitle: "Campur 1 – 12",
    factors: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    timeLimit: 10,
    enemyMin: 0.52,
    enemyMax: 0.85,
    questions: 10,
  },
];

/** Level pengurangan — bilangan maksimal 100, ada peminjaman & tanpa peminjaman */
export const SUB_LEVELS: LevelConfig[] = [
  {
    id: 1,
    op: "−",
    name: "Taman Bermain",
    subtitle: "1 Digit − 1 Digit",
    subDigits: "1-1",
    subMode: "tanpa",
    timeLimit: 15,
    enemyMin: 0.7,
    enemyMax: 0.95,
    questions: 10,
  },
  {
    id: 2,
    op: "−",
    name: "Alun-Alun",
    subtitle: "2 Digit − 1 Digit",
    subDigits: "2-1",
    subMode: "tanpa",
    timeLimit: 14,
    enemyMin: 0.64,
    enemyMax: 0.92,
    questions: 10,
  },
  {
    id: 3,
    op: "−",
    name: "Jembatan Baja",
    subtitle: "2 Digit − 2 Digit",
    subDigits: "2-2",
    subMode: "tanpa",
    timeLimit: 12,
    enemyMin: 0.6,
    enemyMax: 0.9,
    questions: 10,
  },
  {
    id: 4,
    op: "−",
    name: "Pelabuhan",
    subtitle: "Dengan Meminjam",
    subDigits: "2-2",
    subMode: "dengan",
    timeLimit: 11,
    enemyMin: 0.56,
    enemyMax: 0.88,
    questions: 10,
  },
  {
    id: 5,
    op: "−",
    name: "Menara Bintang",
    subtitle: "Campur Meminjam",
    subDigits: "2-2",
    subMode: "campur",
    timeLimit: 10,
    enemyMin: 0.52,
    enemyMax: 0.85,
    questions: 10,
  },
];

export const MAX_HP = 100;
export const BASE_DAMAGE = 10;
export const CRIT_DAMAGE = 15;
/** Jawaban lebih cepat dari fraksi waktu ini = serangan kritis */
export const CRIT_FRACTION = 0.35;
export const HINTS_PER_LEVEL = 2;
