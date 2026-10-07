import { useState } from "react";
import { ArrowLeft, Lock, Play, Timer, Divide, Plus, Minus, Trash2, Swords, X } from "lucide-react";
import cityBg from "@/assets/city-bg.jpg";
import { NeonButton, Panel, Stars } from "./ui";
import { RobotSprite } from "./RobotSprite";
import { type LevelConfig, type MathOp } from "@/game/levels";
import { bankCount, type QuizBank } from "@/game/quizBank";
import { levelsForOp, unlockedOf, starsOf, type Progress } from "@/game/storage";
import { getRobot, type RobotId } from "@/game/robots";
import { cn } from "@/utils/cn";

interface Props {
  op: MathOp;
  progress: Progress;
  players: 1 | 2;
  robots: [RobotId, RobotId];
  bank: QuizBank;
  onBack: () => void;
  onPick: (levelId: number) => void;
  onReset: () => void;
}

const LEVEL_COLORS = ["#22c55e", "#06b6d4", "#facc15", "#f97316", "#ef4444"];

export function LevelSelect({ op, progress, players, robots, bank, onBack, onPick, onReset }: Props) {
  const [confirmReset, setConfirmReset] = useState(false);
  const r1 = getRobot(robots[0]);
  const r2 = getRobot(robots[1]);
  const levels: LevelConfig[] = levelsForOp(op);
  const unlocked = unlockedOf(progress, op);
  const starsList = starsOf(progress, op);
  const opColor =
    op === "+" ? "#facc15" : op === "×" ? "#f472b6" : op === "−" ? "#4ade80" : "#22d3ee";
  const OpIcon = op === "+" ? Plus : op === "×" ? X : op === "−" ? Minus : Divide;
  const opName =
    op === "+" ? "PENJUMLAHAN" : op === "×" ? "PERKALIAN" : op === "−" ? "PENGURANGAN" : "PEMBAGIAN";

  return (
    <div className="relative h-full w-full overflow-hidden font-body text-white">
      <img src={cityBg} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      <div className="absolute inset-0 bg-[#06101c]/80" />
      <div className="scanlines pointer-events-none absolute inset-0 opacity-50" />

      <div className="absolute bottom-[-10px] left-[-40px] opacity-90">
        <RobotSprite robot={r1} facing="right" anim="idle" height={300} />
      </div>
      <div className="absolute bottom-[-10px] right-[-40px] opacity-90">
        <RobotSprite robot={r2} facing="left" anim="idle" height={300} />
      </div>

      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-6 pt-5">
        <NeonButton color="slate" size="sm" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" /> Robot
        </NeonButton>
        <div className="flex flex-col items-center">
          <h1 className="font-display text-[32px] font-black tracking-widest text-yellow-300 text-glow-yellow">
            PILIH LEVEL
          </h1>
          <div className="mt-1 flex items-center gap-2 text-base text-slate-300">
            <span style={{ color: r1.color }} className="font-display font-bold">
              {r1.name}
            </span>
            <Swords className="h-4 w-4 text-rose-400" />
            <span style={{ color: r2.color }} className="font-display font-bold">
              {r2.name}
            </span>
            <span className="ml-2 flex items-center gap-1 rounded bg-black/40 px-2 py-0.5 font-display text-xs" style={{ color: opColor }}>
              <OpIcon className="h-3 w-3" /> {opName}
            </span>
            <span className="ml-1 rounded bg-black/40 px-2 py-0.5 font-display text-xs text-cyan-200">
              {players === 1 ? "1 PEMAIN" : "2 PEMAIN"}
            </span>
          </div>
        </div>
        <div className="w-[120px]" />
      </div>

      <div className="absolute left-1/2 top-[130px] flex -translate-x-1/2 gap-4">
        {levels.map((lv, i) => {
          const locked = lv.id > unlocked;
          const stars = starsList[i] ?? 0;
          const color = LEVEL_COLORS[i];
          return (
            <button
              key={lv.id}
              type="button"
              disabled={locked}
              onClick={() => onPick(lv.id)}
              className={cn(
                "anim-rise relative flex w-[196px] flex-col items-center rounded-2xl border-2 bg-gradient-to-b from-[#0d1e38]/95 to-[#050c18]/95 px-3 pb-4 pt-4 transition-all",
                locked
                  ? "cursor-not-allowed border-white/10 opacity-70 saturate-0"
                  : "hover:-translate-y-1.5 hover:brightness-110 active:scale-[0.98]"
              )}
              style={{
                animationDelay: `${i * 0.07}s`,
                borderColor: locked ? undefined : `${color}aa`,
                boxShadow: locked ? undefined : `0 0 24px ${color}55`,
              }}
            >
              <div
                className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-4 font-display text-[36px] font-black"
                style={{
                  borderColor: color,
                  color: locked ? "#94a3b8" : color,
                  background: `radial-gradient(circle, ${color}33, transparent 70%)`,
                  textShadow: locked ? "none" : `0 0 16px ${color}`,
                }}
              >
                {locked ? <Lock className="h-8 w-8" /> : lv.id}
              </div>
              <div className="mt-2 font-display text-[12px] tracking-[0.3em] text-slate-400">LEVEL {lv.id}</div>
              <div className="font-display text-[18px] font-bold text-white">{lv.name}</div>
              <div className="mt-2 flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1 text-sm text-cyan-100">
                <OpIcon className="h-4 w-4" /> {lv.subtitle}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-300">
                <Timer className="h-4 w-4" /> {lv.timeLimit} detik / soal
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {op === "+" ? (
                  <>Pola: {lv.addDigits?.replace("+", " + ")} • Penyimpanan: {lv.addMode}</>
                ) : op === "−" ? (
                  <>Pola: {lv.subDigits?.replace("-", " − ")} • Meminjam: {lv.subMode}</>
                ) : op === "×" ? (
                  <>Tabel ×: {lv.factors?.join(", ") ?? "1–12"}</>
                ) : (
                  <>Pembagi: {lv.divisors?.join(", ") ?? "auto"}</>
                )}
              </div>
              <Stars count={stars} className="mt-3" />
              {bankCount(bank, op, lv.id) > 0 && (
                <div className="mt-2 rounded-md bg-yellow-400/90 px-2 py-0.5 font-display text-[10px] font-black tracking-wider text-black">
                  SOAL CUSTOM • {bankCount(bank, op, lv.id)} SOAL
                </div>
              )}
              {!locked && (
                <div
                  className="mt-3 flex items-center gap-1 rounded-lg px-4 py-1.5 font-display text-sm font-bold text-black"
                  style={{ background: color }}
                >
                  <Play className="h-4 w-4 fill-black" /> MAIN
                </div>
              )}
              {locked && (
                <div className="mt-3 rounded-lg bg-white/10 px-3 py-1.5 font-display text-xs text-slate-300">
                  Menangkan Level {lv.id - 1}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-3">
        <Panel className="px-5 py-2 text-base text-slate-200">
          {op === "+"
            ? "Penjumlahan hasil maksimal 100 — ada penyimpanan dan tanpa penyimpanan. Jawaban cepat = serangan kritis!"
            : op === "−"
              ? "Pengurangan bilangan sampai 100 — ada yang meminjam dan tanpa meminjam. Jawaban cepat = serangan kritis!"
              : op === "×"
                ? "Perkalian tabel 1-12. Kalahkan robot lawan untuk membuka level berikutnya. Jawaban cepat = serangan kritis!"
                : "Pembagian 1-10. Kalahkan robot lawan untuk membuka level berikutnya. Jawaban cepat = serangan kritis!"}
        </Panel>
        {!confirmReset ? (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="flex items-center gap-1 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-slate-300 hover:bg-white/10"
          >
            <Trash2 className="h-4 w-4" /> Reset progres
          </button>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-rose-400/40 bg-black/60 px-3 py-1.5 text-sm">
            <span className="text-rose-200">Hapus semua progres?</span>
            <button
              type="button"
              className="rounded bg-rose-500 px-2 py-1 font-bold text-white"
              onClick={() => {
                onReset();
                setConfirmReset(false);
              }}
            >
              Ya
            </button>
            <button
              type="button"
              className="rounded bg-white/10 px-2 py-1"
              onClick={() => setConfirmReset(false)}
            >
              Batal
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
