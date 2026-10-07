import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  Pause,
  Play,
  Volume2,
  VolumeX,
  Coins,
  Trophy,
  Flame,
  Check,
  X,
  Rocket,
  Home,
  RotateCcw,
  ChevronRight,
  LayoutGrid,
  Crosshair,
  Skull,
  Target,
  Keyboard,
} from "lucide-react";
import cityBg from "@/assets/city-bg.jpg";
import { RobotSprite, SPRITE_BOX_RATIO, type RobotAnim } from "./RobotSprite";
import { useStage, BASE_H } from "./Stage";
import { useKeyedMeta, DEFAULT_META } from "@/game/chroma";
import { HudRound, NeonButton, Panel, StatPill, Stars } from "./ui";
import {
  type LevelConfig,
  type MathOp,
  MAX_HP,
  BASE_DAMAGE,
  CRIT_DAMAGE,
  CRIT_FRACTION,
  HINTS_PER_LEVEL,
} from "@/game/levels";
import { rollEnemyTimes, type Question } from "@/game/questions";
import { questionsForLevel, type QuizBank } from "@/game/quizBank";
import type { RobotDef } from "@/game/robots";
import { sfx } from "@/game/audio";
import { cn } from "@/utils/cn";

/* ------------------------------------------------------------------ */
/* Tipe & reducer                                                      */
/* ------------------------------------------------------------------ */

export interface BattleResult {
  winner: 0 | 1 | null;
  players: 1 | 2;
  op: MathOp;
  levelId: number;
  stars: number;
  score: number;
  coins: number;
  correct: number;
}

interface Fighter {
  hp: number;
  score: number;
  coins: number;
  correct: number;
  wrong: number;
  streak: number;
  bestStreak: number;
  locked: boolean;
  pick: number | null;
  hints: number;
  lastGain: number;
  anim: RobotAnim;
}

type Phase = "intro" | "question" | "resolve" | "ko" | "finished";
type Reason = "correct" | "wrong" | "enemy" | "timeout" | "bothwrong";

interface Resolve {
  by: 0 | 1 | null;
  target: 0 | 1 | null;
  reason: Reason;
  dmg: number;
  crit: boolean;
}

interface State {
  players: 1 | 2;
  level: LevelConfig;
  questions: Question[];
  enemyTimes: number[];
  qIndex: number;
  phase: Phase;
  introStep: number;
  fighters: [Fighter, Fighter];
  resolve: Resolve | null;
  hidden: number[];
  winner: 0 | 1 | null;
  /** Robot yang kalah dan akan meledak (HP habis, atau HP lebih sedikit setelah soal terakhir) */
  loser: 0 | 1 | null;
  /** true = kalah karena HP habis (K.O.), false = kalah angka di akhir soal */
  ko: boolean;
  seq: number;
}

type Action =
  | { type: "INTRO_TICK" }
  | { type: "ANSWER"; player: 0 | 1; option: number; elapsedMs: number }
  | { type: "ENEMY_FIRE" }
  | { type: "TIMEOUT" }
  | { type: "RESOLVE_DONE" }
  | { type: "KO_DONE" }
  | { type: "USE_HINT"; hide: number };

function newFighter(): Fighter {
  return {
    hp: MAX_HP,
    score: 0,
    coins: 0,
    correct: 0,
    wrong: 0,
    streak: 0,
    bestStreak: 0,
    locked: false,
    pick: null,
    hints: HINTS_PER_LEVEL,
    lastGain: 0,
    anim: "enter",
  };
}

function init({
  players,
  level,
  bank,
}: {
  players: 1 | 2;
  level: LevelConfig;
  bank: QuizBank;
}): State {
  return {
    players,
    level,
    questions: questionsForLevel(level, bank),
    enemyTimes: rollEnemyTimes(level),
    qIndex: 0,
    phase: "intro",
    introStep: 3,
    fighters: [newFighter(), newFighter()],
    resolve: null,
    hidden: [],
    winner: null,
    loser: null,
    ko: false,
    seq: 0,
  };
}

/** Mode 1 pemain: robot musuh (indeks 1) menembak pemain (indeks 0) */
function enemyShoots(s: State, reason: "wrong" | "enemy" | "timeout"): State {
  const f = [...s.fighters] as [Fighter, Fighter];
  f[0] = {
    ...f[0],
    hp: Math.max(0, f[0].hp - BASE_DAMAGE),
    anim: "hit",
    streak: 0,
    locked: true,
    wrong: reason === "wrong" ? f[0].wrong : f[0].wrong + 1,
  };
  f[1] = { ...f[1], anim: "attack", correct: f[1].correct + 1 };
  return {
    ...s,
    fighters: f,
    phase: "resolve",
    resolve: { by: 1, target: 0, reason, dmg: BASE_DAMAGE, crit: false },
    seq: s.seq + 1,
  };
}

function finish(s: State): State {
  const [a, b] = s.fighters;
  const winner: 0 | 1 | null = a.hp > b.hp ? 0 : b.hp > a.hp ? 1 : null;
  const f = s.fighters.map((x, i) => ({
    ...x,
    anim: (winner === i ? "win" : "idle") as RobotAnim,
  })) as [Fighter, Fighter];
  return { ...s, fighters: f, phase: "finished", winner, resolve: null };
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "INTRO_TICK": {
      if (s.phase !== "intro") return s;
      if (s.introStep <= 0) {
        const f = s.fighters.map((x) => ({ ...x, anim: "idle" as RobotAnim })) as [Fighter, Fighter];
        return { ...s, phase: "question", introStep: -1, fighters: f };
      }
      return { ...s, introStep: s.introStep - 1 };
    }
    case "ANSWER": {
      if (s.phase !== "question") return s;
      const me = s.fighters[a.player];
      if (me.locked || s.hidden.includes(a.option)) return s;
      const q = s.questions[s.qIndex];
      const correct = q.options[a.option] === q.answer;
      const f = [...s.fighters] as [Fighter, Fighter];
      if (correct) {
        const limitMs = s.level.timeLimit * 1000;
        const crit = a.elapsedMs <= limitMs * CRIT_FRACTION;
        const dmg = crit ? CRIT_DAMAGE : BASE_DAMAGE;
        const target: 0 | 1 = a.player === 0 ? 1 : 0;
        const remaining = Math.max(0, limitMs - a.elapsedMs);
        const streak = me.streak + 1;
        const gained = 100 + Math.round(remaining / 100) + (crit ? 50 : 0) + Math.min(5, me.streak) * 20;
        f[a.player] = {
          ...me,
          pick: a.option,
          score: me.score + gained,
          coins: me.coins + (crit ? 15 : 10),
          correct: me.correct + 1,
          streak,
          bestStreak: Math.max(me.bestStreak, streak),
          lastGain: gained,
          anim: "attack",
        };
        f[target] = { ...f[target], hp: Math.max(0, f[target].hp - dmg), anim: "hit", locked: true };
        return {
          ...s,
          fighters: f,
          phase: "resolve",
          resolve: { by: a.player, target, reason: "correct", dmg, crit },
          seq: s.seq + 1,
        };
      }
      // Jawaban salah
      f[a.player] = { ...me, pick: a.option, locked: true, wrong: me.wrong + 1, streak: 0 };
      const s2: State = { ...s, fighters: f };
      if (s.players === 1) return enemyShoots(s2, "wrong");
      const other = a.player === 0 ? 1 : 0;
      if (f[other].locked) {
        return {
          ...s2,
          phase: "resolve",
          resolve: { by: null, target: null, reason: "bothwrong", dmg: 0, crit: false },
          seq: s.seq + 1,
        };
      }
      return s2;
    }
    case "ENEMY_FIRE": {
      if (s.phase !== "question" || s.players !== 1) return s;
      return enemyShoots(s, "enemy");
    }
    case "TIMEOUT": {
      if (s.phase !== "question") return s;
      if (s.players === 1) return enemyShoots(s, "timeout");
      return {
        ...s,
        phase: "resolve",
        resolve: { by: null, target: null, reason: "timeout", dmg: 0, crit: false },
        seq: s.seq + 1,
      };
    }
    case "RESOLVE_DONE": {
      if (s.phase !== "resolve") return s;
      const dead = s.fighters.findIndex((f) => f.hp <= 0);
      if (dead >= 0) {
        const alive: 0 | 1 = dead === 0 ? 1 : 0;
        const f = [...s.fighters] as [Fighter, Fighter];
        f[dead] = { ...f[dead], anim: "ko" };
        f[alive] = { ...f[alive], anim: "win" };
        return { ...s, fighters: f, phase: "ko", winner: alive, loser: dead as 0 | 1, ko: true };
      }
      const next = s.qIndex + 1;
      if (next >= s.questions.length) {
        // Soal habis: robot dengan HP lebih sedikit tetap hancur meledak. Seri = tanpa ledakan.
        const [a0, b0] = s.fighters;
        if (a0.hp === b0.hp) return finish(s);
        const winner: 0 | 1 = a0.hp > b0.hp ? 0 : 1;
        const loser: 0 | 1 = winner === 0 ? 1 : 0;
        const f = [...s.fighters] as [Fighter, Fighter];
        f[loser] = { ...f[loser], anim: "ko" };
        f[winner] = { ...f[winner], anim: "win" };
        return { ...s, fighters: f, phase: "ko", winner, loser, ko: false };
      }
      const f = s.fighters.map((x) => ({
        ...x,
        locked: false,
        pick: null,
        anim: "idle" as RobotAnim,
      })) as [Fighter, Fighter];
      return { ...s, fighters: f, qIndex: next, phase: "question", resolve: null, hidden: [] };
    }
    case "KO_DONE": {
      if (s.phase !== "ko") return s;
      return { ...s, phase: "finished", resolve: null };
    }
    case "USE_HINT": {
      if (s.phase !== "question" || s.players !== 1) return s;
      const me = s.fighters[0];
      if (me.hints <= 0 || s.hidden.length >= 1 || me.locked) return s;
      const f = [...s.fighters] as [Fighter, Fighter];
      f[0] = { ...me, hints: me.hints - 1 };
      return { ...s, fighters: f, hidden: [...s.hidden, a.hide] };
    }
    default:
      return s;
  }
}

/* ------------------------------------------------------------------ */
/* Komponen pendukung                                                  */
/* ------------------------------------------------------------------ */

const KEY_HINTS: [string[], string[]] = [
  ["A", "S", "D"],
  ["J", "K", "L"],
];

type BtnStatus = "normal" | "picked-correct" | "picked-wrong" | "reveal" | "dim" | "hidden" | "locked";

function AnswerButton({
  value,
  keyHint,
  status,
  color,
  size,
  onClick,
}: {
  value: number;
  keyHint: string;
  status: BtnStatus;
  color: string;
  size: number;
  onClick: () => void;
}) {
  const interactive = status === "normal";
  const base: CSSProperties = { width: size, height: size };
  let style: CSSProperties = {
    ...base,
    borderColor: `${color}cc`,
    boxShadow: `0 0 0 3px rgba(0,0,0,0.6), 0 0 18px ${color}88, inset 0 0 22px ${color}33`,
    background: `radial-gradient(circle at 40% 30%, rgba(30,50,80,0.95), rgba(5,12,26,0.96) 75%)`,
  };
  if (status === "picked-correct" || status === "reveal") {
    style = {
      ...base,
      borderColor: "#86efac",
      boxShadow: "0 0 0 3px rgba(0,0,0,0.6), 0 0 30px #22c55e, inset 0 0 26px #22c55e88",
      background: "radial-gradient(circle at 40% 30%, #4ade80, #15803d 75%)",
    };
  } else if (status === "picked-wrong") {
    style = {
      ...base,
      borderColor: "#fca5a5",
      boxShadow: "0 0 0 3px rgba(0,0,0,0.6), 0 0 30px #ef4444, inset 0 0 26px #ef444488",
      background: "radial-gradient(circle at 40% 30%, #f87171, #991b1b 75%)",
    };
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full border-[3px] font-display font-black text-white transition-transform",
        interactive && "hover:scale-105 active:scale-95",
        status === "dim" && "opacity-45",
        status === "locked" && "opacity-35",
        status === "hidden" && "opacity-20 grayscale",
        status === "picked-wrong" && "anim-wrong",
        status === "picked-correct" && "anim-pop",
        status === "reveal" && "anim-blink"
      )}
      style={style}
    >
      <span
        className={cn("leading-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]", status === "hidden" && "line-through")}
        style={{ fontSize: size * 0.46 }}
      >
        {value}
      </span>
      <span className="absolute -left-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-md border border-white/40 bg-black/80 px-1 font-display text-[11px] font-bold text-cyan-200">
        {keyHint}
      </span>
      {status === "picked-correct" && (
        <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white text-green-600">
          <Check className="h-5 w-5" strokeWidth={3} />
        </span>
      )}
      {status === "picked-wrong" && (
        <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white text-red-600">
          <X className="h-5 w-5" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

function HpBar({
  fighter,
  robot,
  side,
  tag,
  dimmed,
}: {
  fighter: Fighter;
  robot: RobotDef;
  side: 0 | 1;
  tag: string;
  dimmed: boolean;
}) {
  const pct = (fighter.hp / MAX_HP) * 100;
  const color = pct > 50 ? "#22c55e" : pct > 25 ? "#facc15" : "#ef4444";
  return (
    <div
      className={cn("absolute top-[92px] w-[330px] transition-opacity", side === 0 ? "left-[56px]" : "right-[56px]", dimmed && "opacity-50")}
    >
      <div className={cn("flex items-center gap-2", side === 1 && "flex-row-reverse")}>
        <div
          className="flex h-8 min-w-9 items-center justify-center rounded-md border-2 px-1 font-display text-[12px] font-black"
          style={{ borderColor: robot.color, color: robot.color, background: "rgba(0,0,0,0.65)" }}
        >
          {tag}
        </div>
        <div className="font-display text-[15px] font-bold tracking-wider text-outline" style={{ color: robot.color }}>
          {robot.name} <span className="text-[11px] text-slate-300">{robot.codename}</span>
        </div>
        <div className={cn("font-display text-[13px] text-white text-outline", side === 0 ? "ml-auto" : "mr-auto")}>
          {fighter.hp}/{MAX_HP}
        </div>
      </div>
      <div
        className={cn(
          "mt-1 flex h-[22px] w-full overflow-hidden rounded-md border border-white/30 bg-black/65 p-[3px]",
          side === 1 && "justify-end"
        )}
      >
        <div
          className="h-full rounded-sm transition-all duration-500 ease-out"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(180deg, ${color}, ${color}99)`,
            boxShadow: `0 0 10px ${color}`,
          }}
        />
      </div>
    </div>
  );
}

function InfoChip({
  icon,
  label,
  value,
  color,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  color: string;
}) {
  return (
    <div className="hud-round flex h-[52px] w-[52px] flex-col items-center justify-center rounded-full" title={label}>
      <span style={{ color }}>{icon}</span>
      <span className="font-display text-[12px] font-bold leading-none text-white">{value}</span>
    </div>
  );
}

function Explosion({ x, y, big, delay = 0.1 }: { x: number; y: number; big: boolean; delay?: number }) {
  const size = big ? 240 : 170;
  const sparks = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        angle: (i / 12) * Math.PI * 2 + Math.random() * 0.5,
        dist: 70 + Math.random() * 80,
      })),
    []
  );
  return (
    <div className="pointer-events-none absolute" style={{ left: x - size / 2, top: y - size / 2, width: size, height: size }}>
      <div
        className="fx-boom absolute inset-0 rounded-full"
        style={{
          animationDelay: `${delay}s`,
          background:
            "radial-gradient(circle, #fff 0%, #ffe066 18%, #ff7a00 42%, rgba(255,60,0,0.45) 62%, transparent 72%)",
        }}
      />
      <div
        className="fx-boom absolute inset-[18%] rounded-full"
        style={{
          animationDelay: `${delay + 0.1}s`,
          background: "radial-gradient(circle, #fff 0%, #ffd166 35%, transparent 70%)",
        }}
      />
      {sparks.map((s, i) => (
        <div
          key={i}
          className="fx-spark absolute left-1/2 top-1/2 h-2.5 w-2.5 rounded-full bg-yellow-200"
          style={
            {
              animationDelay: `${delay + 0.05}s`,
              boxShadow: "0 0 8px #ffb300",
              "--sx": `${Math.cos(s.angle) * s.dist}px`,
              "--sy": `${Math.sin(s.angle) * s.dist}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

/**
 * Sinar laser: berawal TEPAT di moncong senjata robot penyerang (sx, sy) dan
 * berakhir di tubuh (dada) robot lawan (ex, ey). Sinar otomatis miring mengikuti arah.
 */
function BeamFx({
  sx,
  sy,
  ex,
  ey,
  color,
  crit,
}: {
  sx: number;
  sy: number;
  ex: number;
  ey: number;
  color: string;
  crit: boolean;
}) {
  const dx = ex - sx;
  const dy = ey - sy;
  const len = Math.hypot(dx, dy);
  const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
  const thick = crit ? 24 : 16;
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {/* Kilatan di mulut senjata */}
      <div
        className="fx-muzzle absolute rounded-full"
        style={{
          left: sx - 50,
          top: sy - 50,
          width: 100,
          height: 100,
          background: `radial-gradient(circle, #fff 0%, ${color} 32%, transparent 70%)`,
        }}
      />
      {/* Sinar */}
      <div
        className="absolute"
        style={{
          left: sx,
          top: sy,
          width: len,
          height: thick,
          transformOrigin: "0 50%",
          transform: `translateY(-50%) rotate(${ang}deg)`,
        }}
      >
        <div
          className="fx-beam absolute inset-0"
          style={{
            transformOrigin: "left center",
            borderRadius: 999,
            background: `linear-gradient(90deg, #fff 0%, ${color} 10%, #ffffff 55%, ${color} 100%)`,
            boxShadow: `0 0 16px ${color}, 0 0 44px ${color}, 0 0 80px ${color}88`,
          }}
        />
        <div
          className="fx-beam absolute left-0 right-0 top-1/2 h-[5px] -translate-y-1/2"
          style={{
            transformOrigin: "left center",
            borderRadius: 3,
            background: "#fff",
            boxShadow: "0 0 12px #fff, 0 0 26px #fff",
          }}
        />
      </div>
      {/* Ledakan di tubuh lawan */}
      <Explosion x={ex} y={ey} big={crit} />
    </div>
  );
}

/**
 * Ledakan besar saat robot kalah: rentetan ledakan kecil di sekujur tubuh,
 * lalu bola api raksasa, gelombang kejut, serpihan logam, dan asap.
 */
function KoBlast({ cx, cy, bw, bh, color }: { cx: number; cy: number; bw: number; bh: number; color: string }) {
  const [final, setFinal] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFinal(true), 1200);
    return () => clearTimeout(t);
  }, []);

  const parts = useMemo(() => {
    const blasts = Array.from({ length: 9 }, (_, i) => ({
      x: cx + (Math.random() - 0.5) * bw * 0.9,
      y: cy + (Math.random() - 0.5) * bh * 0.85,
      delay: 0.05 + i * 0.125 + Math.random() * 0.04,
      big: i % 3 === 2,
    }));
    const palette = [color, color, "#334155", "#94a3b8", "#fbbf24"];
    const debris = Array.from({ length: 28 }, () => {
      const a = Math.random() * Math.PI * 2;
      const dist = 130 + Math.random() * 300;
      return {
        dx: Math.cos(a) * dist,
        dy: Math.sin(a) * dist * 0.75 - 50,
        rot: (Math.random() - 0.5) * 1000,
        w: 8 + Math.random() * 20,
        h: 6 + Math.random() * 14,
        color: palette[Math.floor(Math.random() * palette.length)],
      };
    });
    const smoke = Array.from({ length: 9 }, () => ({
      x: cx + (Math.random() - 0.5) * bw * 0.7,
      y: cy + (Math.random() - 0.3) * bh * 0.5,
      sx: (Math.random() - 0.5) * 120,
      size: 90 + Math.random() * 90,
      delay: Math.random() * 0.25,
    }));
    return { blasts, debris, smoke };
  }, [cx, cy, bw, bh, color]);

  const fire = Math.max(bw, bh) * 1.25;

  return (
    <div className="pointer-events-none absolute inset-0 z-[25]">
      {/* Rentetan ledakan kecil sebelum meledak total */}
      {parts.blasts.map((b, i) => (
        <Explosion key={i} x={b.x} y={b.y} big={b.big} delay={b.delay} />
      ))}

      {final && (
        <>
          <div
            className="fx-bigflash absolute inset-0"
            style={{ background: "radial-gradient(circle at 50% 50%, #fff 0%, #ffe9a0 45%, rgba(255,140,0,0.6) 100%)" }}
          />
          {/* Bola api raksasa */}
          <div
            className="fx-fireball absolute rounded-full"
            style={{
              left: cx,
              top: cy,
              width: fire,
              height: fire,
              background:
                "radial-gradient(circle, #ffffff 0%, #fff0a8 20%, #ffb300 42%, #ff5a00 62%, rgba(180,20,0,0.55) 78%, transparent 90%)",
              boxShadow: "0 0 90px 30px rgba(255,120,0,0.65)",
            }}
          />
          {/* Gelombang kejut */}
          <div
            className="fx-ring absolute rounded-full border-solid"
            style={{
              left: cx,
              top: cy,
              width: fire * 2.4,
              height: fire * 2.4,
              borderColor: "rgba(255,230,160,0.95)",
              boxShadow: `0 0 40px ${color}, inset 0 0 40px rgba(255,200,100,0.6)`,
            }}
          />
          <div
            className="fx-ring absolute rounded-full border-solid"
            style={{
              left: cx,
              top: cy,
              width: fire * 1.6,
              height: fire * 1.6,
              borderColor: color,
              animationDelay: "0.1s",
            }}
          />
          {/* Serpihan logam */}
          {parts.debris.map((p, i) => (
            <div
              key={i}
              className="fx-debris absolute"
              style={
                {
                  left: cx - p.w / 2,
                  top: cy - p.h / 2,
                  width: p.w,
                  height: p.h,
                  background: p.color,
                  borderRadius: 2,
                  boxShadow: "0 0 10px rgba(255,160,0,0.9)",
                  "--dx": `${p.dx}px`,
                  "--dy": `${p.dy}px`,
                  "--rot": `${p.rot}deg`,
                } as CSSProperties
              }
            />
          ))}
          {/* Asap */}
          {parts.smoke.map((s, i) => (
            <div
              key={i}
              className="fx-smoke absolute rounded-full"
              style={
                {
                  left: s.x,
                  top: s.y,
                  width: s.size,
                  height: s.size,
                  animationDelay: `${s.delay}s`,
                  background: "radial-gradient(circle, rgba(60,60,70,0.9) 0%, rgba(30,30,40,0.6) 55%, transparent 75%)",
                  "--sx": `${s.sx}px`,
                } as CSSProperties
              }
            />
          ))}
          {/* Ledakan susulan di pusat */}
          <Explosion x={cx} y={cy} big delay={0.05} />
          <Explosion x={cx - bw * 0.25} y={cy - bh * 0.15} big={false} delay={0.2} />
          <Explosion x={cx + bw * 0.25} y={cy + bh * 0.15} big={false} delay={0.3} />
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Komponen utama                                                      */
/* ------------------------------------------------------------------ */

interface Props {
  players: 1 | 2;
  robots: [RobotDef, RobotDef];
  level: LevelConfig;
  /** Bank soal custom (dari menu admin) */
  bank: QuizBank;
  hasNext: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onExit: () => void;
  onLevels: () => void;
  onRetry: () => void;
  onNext: () => void;
  onFinished: (r: BattleResult) => void;
}

export function Battle({
  players,
  robots,
  level,
  bank,
  hasNext,
  muted,
  onToggleMute,
  onExit,
  onLevels,
  onRetry,
  onNext,
  onFinished,
}: Props) {
  const [state, dispatch] = useReducer(reducer, { players, level, bank }, init);
  const stateRef = useRef(state);
  stateRef.current = state;

  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  const startRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number | null>(null);
  const lastSetRef = useRef(0);
  const lastTickSecRef = useRef(-1);
  const reportedRef = useRef(false);
  const [elapsed, setElapsed] = useState(0);

  const limitMs = level.timeLimit * 1000;
  const q = state.questions[state.qIndex];
  const enemyMs = state.enemyTimes[state.qIndex] ?? limitMs;
  const [p1, p2] = state.fighters;
  const { phase } = state;

  /* ---------- Geometri arena (koordinat panggung) ---------- */
  const { w: SW, h: SH } = useStage();
  const metaA = useKeyedMeta(robots[0].image);
  const metaB = useKeyedMeta(robots[1].image);
  const ROBOT_H = 430;
  const SIDE = 62;
  const boxW = ROBOT_H * SPRITE_BOX_RATIO;
  const robotBottom = 140 + Math.round((SH - BASE_H) / 2);
  const robotTop = SH - robotBottom - ROBOT_H;

  /** Posisi nyata moncong senjata, dada, dan pusat tubuh tiap robot di panggung */
  const geom = (i: 0 | 1) => {
    const m = i === 0 ? metaA : metaB;
    const aspect = m?.aspect ?? DEFAULT_META.aspect;
    const mu = m?.muzzle ?? DEFAULT_META.muzzle;
    const ch = m?.chest ?? DEFAULT_META.chest;
    const wi = ROBOT_H * aspect;
    const boxLeft = i === 0 ? SIDE : SW - SIDE - boxW;
    const imgLeft = boxLeft + (boxW - wi) / 2;
    const flip = i === 1; // robot kanan dicerminkan agar menghadap ke kiri
    const px = (p: { x: number }) => imgLeft + (flip ? 1 - p.x : p.x) * wi;
    const py = (p: { y: number }) => robotTop + p.y * ROBOT_H;
    return {
      muzzle: { x: px(mu), y: py(mu) },
      chest: { x: px(ch), y: py(ch) },
      cx: imgLeft + wi / 2,
      cy: robotTop + ROBOT_H / 2,
      bw: wi * 0.85,
      bh: ROBOT_H * 0.9,
    };
  };

  /* ---------- Intro countdown ---------- */
  useEffect(() => {
    if (phase !== "intro") return;
    if (state.introStep > 0) sfx.countdown();
    else sfx.go();
    const t = setTimeout(() => dispatch({ type: "INTRO_TICK" }), state.introStep > 0 ? 900 : 750);
    return () => clearTimeout(t);
  }, [phase, state.introStep]);

  /* ---------- Timer soal ---------- */
  useEffect(() => {
    if (phase !== "question") {
      startRef.current = null;
      return;
    }
    if (paused) return;
    if (startRef.current == null) {
      startRef.current = performance.now();
      lastTickSecRef.current = -1;
      lastSetRef.current = 0;
      setElapsed(0);
    }
    let raf = 0;
    const loop = () => {
      const now = performance.now();
      const e = now - (startRef.current ?? now);
      if (now - lastSetRef.current > 40) {
        lastSetRef.current = now;
        setElapsed(e);
      }
      const remainSec = Math.ceil((limitMs - e) / 1000);
      if (remainSec <= 3 && remainSec > 0 && remainSec !== lastTickSecRef.current) {
        lastTickSecRef.current = remainSec;
        sfx.tick();
      }
      if (players === 1 && e >= enemyMs) {
        sfx.laser();
        setTimeout(() => sfx.explosion(), 180);
        dispatch({ type: "ENEMY_FIRE" });
        return;
      }
      if (e >= limitMs) {
        if (players === 1) {
          sfx.laser();
          setTimeout(() => sfx.explosion(), 180);
        } else {
          sfx.wrong();
        }
        dispatch({ type: "TIMEOUT" });
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, state.qIndex, paused, players, limitMs, enemyMs]);

  /* ---------- Resolve / KO timers ---------- */
  useEffect(() => {
    if (phase === "resolve") {
      const t = setTimeout(() => dispatch({ type: "RESOLVE_DONE" }), 1900);
      return () => clearTimeout(t);
    }
    if (phase === "ko") {
      // Rentetan ledakan kecil lalu ledakan besar saat robot hancur
      const timers = [60, 300, 560, 820, 1020].map((ms) => setTimeout(() => sfx.explosion(), ms));
      timers.push(setTimeout(() => sfx.ko(), 1200));
      timers.push(setTimeout(() => dispatch({ type: "KO_DONE" }), 3100));
      return () => timers.forEach(clearTimeout);
    }
  }, [phase, state.seq]);

  /* ---------- Hasil ---------- */
  const stars = useMemo(() => {
    if (players !== 1 || state.winner !== 0) return 0;
    return p1.wrong === 0 ? 3 : p1.wrong <= 2 ? 2 : 1;
  }, [players, state.winner, p1.wrong]);

  useEffect(() => {
    if (phase !== "finished" || reportedRef.current) return;
    reportedRef.current = true;
    const w = state.winner;
    if (players === 1) {
      if (w === 0) sfx.win();
      else if (w === 1) sfx.lose();
      else sfx.draw();
    } else if (w === null) sfx.draw();
    else sfx.win();
    onFinished({
      winner: w,
      players,
      op: level.op,
      levelId: level.id,
      stars,
      score: p1.score + (players === 2 ? p2.score : 0),
      coins: p1.coins + (players === 2 ? p2.coins : 0),
      correct: p1.correct,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /* ---------- Aksi ---------- */
  const answer = useCallback((player: 0 | 1, option: number) => {
    const s = stateRef.current;
    if (s.phase !== "question" || pausedRef.current) return;
    const me = s.fighters[player];
    if (me.locked || s.hidden.includes(option)) return;
    const e = performance.now() - (startRef.current ?? performance.now());
    const qq = s.questions[s.qIndex];
    const correct = qq.options[option] === qq.answer;
    if (correct) {
      sfx.correct();
      setTimeout(() => sfx.laser(), 140);
      setTimeout(() => sfx.explosion(), 400);
    } else {
      sfx.wrong();
      if (s.players === 1) {
        setTimeout(() => sfx.laser(), 300);
        setTimeout(() => sfx.explosion(), 560);
      }
    }
    dispatch({ type: "ANSWER", player, option, elapsedMs: e });
  }, []);

  const useHint = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== "question" || s.players !== 1 || pausedRef.current) return;
    const me = s.fighters[0];
    if (me.hints <= 0 || s.hidden.length >= 1 || me.locked) return;
    const qq = s.questions[s.qIndex];
    const wrongIdx = qq.options
      .map((_, i) => i)
      .filter((i) => qq.options[i] !== qq.answer && !s.hidden.includes(i));
    if (!wrongIdx.length) return;
    sfx.hint();
    dispatch({ type: "USE_HINT", hide: wrongIdx[Math.floor(Math.random() * wrongIdx.length)] });
  }, []);

  const togglePause = useCallback(() => {
    const s = stateRef.current;
    if (s.phase === "finished") return;
    sfx.click();
    const np = !pausedRef.current;
    if (np) {
      pausedAtRef.current = performance.now();
    } else if (pausedAtRef.current != null && startRef.current != null) {
      startRef.current += performance.now() - pausedAtRef.current;
      pausedAtRef.current = null;
    }
    setPaused(np);
  }, []);

  useEffect(() => {
    const p1Map: Record<string, number> = { Digit1: 0, Digit2: 1, Digit3: 2, KeyA: 0, KeyS: 1, KeyD: 2 };
    const p2Map: Record<string, number> = { Numpad1: 0, Numpad2: 1, Numpad3: 2, KeyJ: 0, KeyK: 1, KeyL: 2 };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.repeat) return;
      const code = ev.code;
      if (code === "Escape" || code === "KeyP") {
        ev.preventDefault();
        togglePause();
        return;
      }
      if (players === 1) {
        const idx = p1Map[code] ?? p2Map[code];
        if (idx !== undefined) {
          answer(0, idx);
          return;
        }
        if (code === "KeyH" || code === "Space") {
          ev.preventDefault();
          useHint();
        }
      } else {
        if (p1Map[code] !== undefined) answer(0, p1Map[code]);
        else if (p2Map[code] !== undefined) answer(1, p2Map[code]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answer, useHint, togglePause, players]);

  /* ---------- Turunan tampilan ---------- */
  const effElapsed =
    phase === "question"
      ? startRef.current == null
        ? 0
        : elapsed
      : phase === "resolve" || phase === "ko"
        ? elapsed
        : 0;
  const timeFrac = Math.max(0, 1 - effElapsed / limitMs);
  const remainSec = Math.max(0, Math.ceil((limitMs - effElapsed) / 1000));
  const timerColor = timeFrac > 0.5 ? "#22c55e" : timeFrac > 0.25 ? "#facc15" : "#ef4444";
  const enemyFrac = phase === "question" && players === 1 ? Math.min(1, elapsed / enemyMs) : 0;

  const statusFor = (player: 0 | 1, idx: number): BtnStatus => {
    const f = state.fighters[player];
    const isCorrect = q.options[idx] === q.answer;
    if (phase === "question") {
      if (player === 0 && state.hidden.includes(idx)) return "hidden";
      if (f.locked) return f.pick === idx ? "picked-wrong" : "locked";
      return "normal";
    }
    if (phase === "intro") return "dim";
    if (f.pick === idx) return isCorrect ? "picked-correct" : "picked-wrong";
    if (isCorrect) return "reveal";
    return "dim";
  };

  const res = state.resolve;
  const showFx = (phase === "resolve" || phase === "ko") && res && res.by !== null;

  const bannerText = useMemo(() => {
    if (!res) return null;
    const name = (i: 0 | 1) => (players === 1 && i === 1 ? "ROBOT MUSUH" : `${robots[i].name}`);
    switch (res.reason) {
      case "correct":
        return {
          title: res.crit ? "SERANGAN KRITIS!" : "TEPAT SASARAN!",
          sub: `${players === 2 ? `PEMAIN ${res.by! + 1} • ` : ""}${name(res.by!)} menembak! -${res.dmg} HP`,
          color: res.crit ? "#fde047" : robots[res.by!].color,
        };
      case "wrong":
        return { title: "SALAH!", sub: `Jawaban: ${q.answer} • Musuh membalas -${res.dmg} HP`, color: "#f87171" };
      case "enemy":
        return { title: "TERLAMBAT!", sub: `Robot musuh menembak -${res.dmg} HP • Jawaban: ${q.answer}`, color: "#f87171" };
      case "timeout":
        return { title: "WAKTU HABIS!", sub: `Jawaban yang benar: ${q.answer}`, color: "#fbbf24" };
      case "bothwrong":
        return { title: "KEDUANYA SALAH!", sub: `Jawaban yang benar: ${q.answer}`, color: "#fbbf24" };
    }
  }, [res, players, robots, q.answer]);

  const resultTitle = useMemo(() => {
    const w = state.winner;
    if (players === 1) {
      if (w === 0) return { text: "MENANG!", color: "#fde047" };
      if (w === 1) return { text: "KALAH!", color: "#f87171" };
      return { text: "SERI!", color: "#67e8f9" };
    }
    if (w === null) return { text: "SERI!", color: "#67e8f9" };
    return { text: `PEMAIN ${w + 1} MENANG!`, color: robots[w].color };
  }, [state.winner, players, robots]);

  const canNext = hasNext && (players === 1 ? state.winner === 0 : state.winner !== null);
  const btnSize = players === 1 ? 112 : 98;
  const btnGap = players === 1 ? 26 : 16;

  const renderAnswers = (player: 0 | 1) => (
    <div className="flex items-end" style={{ gap: btnGap }}>
      {q.options.map((opt, i) => (
        <AnswerButton
          key={`${state.qIndex}-${i}`}
          value={opt}
          keyHint={players === 1 ? `${i + 1}` : KEY_HINTS[player][i]}
          status={statusFor(player, i)}
          color={robots[player].color}
          size={btnSize}
          onClick={() => answer(player, i)}
        />
      ))}
    </div>
  );

  return (
    <div className="relative h-full w-full overflow-hidden font-body text-white">
      {/* Latar */}
      <div
        className={cn(
          "absolute inset-0",
          phase === "ko"
            ? "fx-shake-ko"
            : showFx && res?.target !== null && (state.seq % 2 === 0 ? "fx-shake" : "fx-shake-b")
        )}
      >
        <img src={cityBg} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
        <div className="absolute inset-x-0 bottom-0 h-[260px] bg-gradient-to-t from-[#06101c]/90 via-[#06101c]/40 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-[150px] bg-gradient-to-b from-black/50 to-transparent" />

        {/* Robot kiri (P1) */}
        <div className="absolute transition-all" style={{ left: SIDE, bottom: robotBottom }}>
          <RobotSprite robot={robots[0]} facing="right" anim={p1.anim} animKey={state.seq} height={ROBOT_H} />
        </div>
        {/* Robot kanan (P2 / musuh) - dicerminkan sehingga menghadap ke kiri (berhadapan dengan P1) */}
        <div className="absolute transition-all" style={{ right: SIDE, bottom: robotBottom }}>
          <RobotSprite robot={robots[1]} facing="left" anim={p2.anim} animKey={state.seq} height={ROBOT_H} />
        </div>

        {/* Efek tembakan: dari moncong senjata penyerang ke dada robot lawan */}
        {showFx && res && res.by !== null && res.target !== null && (
          <BeamFx
            key={`beam-${state.seq}`}
            sx={geom(res.by).muzzle.x}
            sy={geom(res.by).muzzle.y}
            ex={geom(res.target).chest.x}
            ey={geom(res.target).chest.y}
            color={robots[res.by].color}
            crit={res.crit}
          />
        )}
        {showFx && res && res.target !== null && (
          <div
            key={`dmg-${state.seq}`}
            className="fx-float pointer-events-none absolute z-30 font-display text-[46px] font-black text-outline"
            style={{
              left: geom(res.target).cx,
              top: robotTop + 40,
              color: res.crit ? "#fde047" : "#ffffff",
              animationDelay: "0.15s",
            }}
          >
            -{res.dmg}
          </div>
        )}
        {showFx && res && res.reason === "correct" && res.by !== null && (
          <div
            key={`gain-${state.seq}`}
            className="fx-float pointer-events-none absolute z-30 font-display text-[30px] font-black text-outline"
            style={{
              left: geom(res.by).cx,
              top: robotTop - 10,
              color: "#67e8f9",
              animationDelay: "0.35s",
            }}
          >
            +{state.fighters[res.by].lastGain}
          </div>
        )}
        {/* Ledakan besar saat robot kalah */}
        {phase === "ko" && state.loser !== null && (
          <KoBlast
            key={`ko-${state.loser}`}
            cx={geom(state.loser).cx}
            cy={geom(state.loser).cy}
            bw={geom(state.loser).bw}
            bh={geom(state.loser).bh}
            color={robots[state.loser].color}
          />
        )}
        {showFx && res && res.target !== null && (
          <div
            key={`flash-${state.seq}`}
            className="fx-flash pointer-events-none absolute inset-0 z-20"
            style={{ background: res.crit ? "rgba(255,220,80,0.5)" : "rgba(255,255,255,0.45)", animationDelay: "0.15s" }}
          />
        )}
      </div>

      {/* ---------- HUD ATAS ---------- */}
      <div className="absolute left-4 top-4 flex flex-col gap-2">
        <StatPill icon={<Trophy className="h-4 w-4" />} value={p1.score.toLocaleString("id-ID")} />
        <StatPill icon={<Coins className="h-4 w-4" />} value={p1.coins.toLocaleString("id-ID")} color="yellow" />
      </div>
      {players === 2 && (
        <div className="absolute right-[86px] top-4 flex flex-col gap-2">
          <StatPill icon={<Trophy className="h-4 w-4" />} value={p2.score.toLocaleString("id-ID")} />
          <StatPill icon={<Coins className="h-4 w-4" />} value={p2.coins.toLocaleString("id-ID")} color="yellow" />
        </div>
      )}
      <div className="absolute right-4 top-4 flex flex-col items-center gap-2">
        <HudRound
          onClick={togglePause}
          size={56}
          title="Jeda"
          className="text-slate-900"
          style={{
            background: "radial-gradient(circle at 35% 30%, #fde047, #d97706 75%)",
            borderColor: "rgba(254,240,138,0.8)",
            boxShadow: "0 0 0 2px rgba(0,0,0,0.55), 0 0 16px rgba(250,204,21,0.6)",
          }}
        >
          {paused ? <Play className="h-7 w-7 fill-slate-900" /> : <Pause className="h-7 w-7 fill-slate-900" />}
        </HudRound>
        <HudRound onClick={onToggleMute} size={44} title="Suara">
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </HudRound>
      </div>

      {/* Panel soal */}
      <Panel className="absolute left-1/2 top-3 w-[500px] -translate-x-1/2 px-5 pb-3 pt-2">
        <div className="flex items-center justify-between font-display text-[12px] font-bold tracking-widest text-cyan-200">
          <span>
            LEVEL {level.id} • {level.name.toUpperCase()}
          </span>
          <span className="flex items-center gap-1">
            <Target className="h-3.5 w-3.5" /> SOAL {Math.min(state.qIndex + 1, level.questions)}/{level.questions}
          </span>
        </div>
        <div className="mt-0.5 flex h-[66px] items-center justify-center">
          {phase === "intro" ? (
            <span className="font-display text-[26px] font-bold tracking-[0.3em] text-cyan-100 text-glow-cyan">BERSIAP...</span>
          ) : (
            <span key={state.qIndex} className="anim-pop font-display text-[52px] font-black tracking-wider text-white text-glow-cyan">
              {q.dividend}{" "}
              <span
                className={
                  q.op === "+"
                    ? "text-yellow-300"
                    : q.op === "×"
                      ? "text-pink-300"
                      : q.op === "−"
                        ? "text-emerald-300"
                        : "text-cyan-300"
                }
              >
                {q.op}
              </span>{" "}
              {q.divisor} <span className="text-cyan-300">=</span>{" "}
              {phase === "question" ? (
                <span className="text-yellow-300 text-glow-yellow">?</span>
              ) : (
                <span className="text-emerald-300" style={{ textShadow: "0 0 18px #22c55e" }}>
                  {q.answer}
                </span>
              )}
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div className="h-[12px] flex-1 overflow-hidden rounded-full border border-white/25 bg-black/60 p-[2px]">
            <div
              className="h-full rounded-full"
              style={{
                width: `${timeFrac * 100}%`,
                background: `linear-gradient(90deg, ${timerColor}, ${timerColor}aa)`,
                boxShadow: `0 0 10px ${timerColor}`,
                transition: "width 0.1s linear",
              }}
            />
          </div>
          <span
            className={cn("w-9 text-right font-display text-[15px] font-bold", remainSec <= 3 && phase === "question" && "anim-blink text-red-400")}
            style={{ color: remainSec <= 3 && phase === "question" ? undefined : timerColor }}
          >
            {phase === "intro" || phase === "finished" ? level.timeLimit : remainSec}s
          </span>
        </div>
      </Panel>

      {/* HP bars */}
      <HpBar fighter={p1} robot={robots[0]} side={0} tag={players === 1 ? "KAMU" : "P1"} dimmed={phase === "finished" && state.winner === 1} />
      <HpBar fighter={p2} robot={robots[1]} side={1} tag={players === 1 ? "MUSUH" : "P2"} dimmed={phase === "finished" && state.winner === 0} />

      {/* Bar bidikan musuh (1 pemain) */}
      {players === 1 && phase === "question" && (
        <div className="absolute right-[56px] top-[150px] w-[330px]">
          <div className="flex items-center justify-between font-display text-[11px] font-bold tracking-widest text-rose-200">
            <span className={cn("flex items-center gap-1", enemyFrac > 0.75 && "anim-blink")}>
              <Crosshair className="h-3.5 w-3.5" /> MUSUH MEMBIDIK
            </span>
            <span>{Math.round(enemyFrac * 100)}%</span>
          </div>
          <div className="mt-0.5 h-[10px] w-full overflow-hidden rounded-full border border-rose-300/40 bg-black/60 p-[2px]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-400 to-red-500"
              style={{ width: `${enemyFrac * 100}%`, boxShadow: "0 0 10px #ef4444" }}
            />
          </div>
        </div>
      )}

      {/* Kolom info kiri (P1) */}
      <div className="absolute left-3 top-[200px] flex flex-col gap-2">
        <InfoChip icon={<Flame className="h-4 w-4" />} label="Beruntun" value={`x${p1.streak}`} color="#fb923c" />
        <InfoChip icon={<Check className="h-4 w-4" />} label="Benar" value={p1.correct} color="#4ade80" />
        <InfoChip icon={<X className="h-4 w-4" />} label="Salah" value={p1.wrong} color="#f87171" />
      </div>
      {/* Kolom info kanan (P2 / musuh) */}
      <div className="absolute right-3 top-[200px] flex flex-col gap-2">
        {players === 2 && <InfoChip icon={<Flame className="h-4 w-4" />} label="Beruntun" value={`x${p2.streak}`} color="#fb923c" />}
        <InfoChip icon={players === 2 ? <Check className="h-4 w-4" /> : <Crosshair className="h-4 w-4" />} label={players === 2 ? "Benar" : "Tembakan kena"} value={p2.correct} color="#4ade80" />
        {players === 2 && <InfoChip icon={<X className="h-4 w-4" />} label="Salah" value={p2.wrong} color="#f87171" />}
      </div>

      {/* Banner tengah saat resolve */}
      {(phase === "resolve" || phase === "ko") && bannerText && (
        <div key={`banner-${state.seq}`} className="anim-banner pointer-events-none absolute left-1/2 top-[300px] z-30 -translate-x-1/2 text-center">
          <div
            className="font-display text-[44px] font-black tracking-wider text-outline"
            style={{ color: bannerText.color, textShadow: `0 0 24px ${bannerText.color}, 0 3px 0 rgba(0,0,0,0.7)` }}
          >
            {bannerText.title}
          </div>
          <div className="mt-1 inline-block rounded-lg bg-black/70 px-4 py-1 font-display text-[16px] font-bold text-white">
            {bannerText.sub}
          </div>
        </div>
      )}

      {/* Lock indicator 2P */}
      {players === 2 && phase === "question" && (
        <>
          {p1.locked && (
            <div className="anim-pop absolute bottom-[150px] left-[120px] rounded-lg border-2 border-red-300 bg-red-600/90 px-3 py-1 font-display text-sm font-black tracking-wider">
              MACET! SALAH
            </div>
          )}
          {p2.locked && (
            <div className="anim-pop absolute bottom-[150px] right-[120px] rounded-lg border-2 border-red-300 bg-red-600/90 px-3 py-1 font-display text-sm font-black tracking-wider">
              MACET! SALAH
            </div>
          )}
        </>
      )}

      {/* ---------- HUD BAWAH ---------- */}
      {players === 1 ? (
        <>
          {/* Joystick dekoratif / combo */}
          <div className="absolute bottom-[22px] left-[28px] flex h-[120px] w-[120px] items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-cyan-300/40 bg-black/40" />
            <div className="absolute inset-[14px] rounded-full border border-cyan-300/30" />
            <div className="anim-pulse-ring absolute inset-[20px] rounded-full border-2" style={{ borderColor: robots[0].color }} />
            <div
              className="relative flex h-[62px] w-[62px] flex-col items-center justify-center rounded-full border-2 border-white/40"
              style={{ background: `radial-gradient(circle at 35% 30%, ${robots[0].glow}, ${robots[0].dark} 75%)`, boxShadow: `0 0 18px ${robots[0].color}` }}
            >
              <span className="font-display text-[10px] font-bold text-white/80">COMBO</span>
              <span className="font-display text-[20px] font-black leading-none text-white">x{p1.streak}</span>
            </div>
          </div>

          {/* Tombol jawaban tengah */}
          <div className="absolute bottom-[22px] left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5">
            {renderAnswers(0)}
            <div className="flex items-center gap-1 rounded-md bg-black/50 px-2 py-0.5 font-display text-[10px] tracking-widest text-cyan-200/80">
              <Keyboard className="h-3 w-3" /> 1 2 3 / A S D • H = PETUNJUK
            </div>
          </div>

          {/* Tombol petunjuk (roket) */}
          <div className="absolute bottom-[22px] right-[28px] flex flex-col items-center gap-1">
            <HudRound
              onClick={useHint}
              size={116}
              disabled={phase !== "question" || p1.hints <= 0 || state.hidden.length > 0 || p1.locked}
              badge={p1.hints}
              title="Petunjuk: hapus satu jawaban salah"
              style={{
                background: "radial-gradient(circle at 35% 30%, #22d3ee, #0e4a8a 75%)",
                borderColor: "rgba(165,243,252,0.8)",
                boxShadow: "0 0 0 3px rgba(0,0,0,0.55), 0 0 22px rgba(34,211,238,0.6)",
              }}
            >
              <div className="flex flex-col items-center">
                <Rocket className="h-10 w-10 text-white drop-shadow-[0_0_10px_#fff]" />
                <span className="font-display text-[11px] font-bold tracking-widest text-white">PETUNJUK</span>
              </div>
            </HudRound>
          </div>
        </>
      ) : (
        <>
          <div className="absolute bottom-[22px] left-[26px] flex flex-col items-start gap-1.5">
            {renderAnswers(0)}
            <div className="flex items-center gap-1 rounded-md bg-black/50 px-2 py-0.5 font-display text-[10px] tracking-widest" style={{ color: robots[0].glow }}>
              <Keyboard className="h-3 w-3" /> PEMAIN 1: A S D / 1 2 3
            </div>
          </div>
          <div className="absolute bottom-[22px] right-[26px] flex flex-col items-end gap-1.5">
            {renderAnswers(1)}
            <div className="flex items-center gap-1 rounded-md bg-black/50 px-2 py-0.5 font-display text-[10px] tracking-widest" style={{ color: robots[1].glow }}>
              <Keyboard className="h-3 w-3" /> PEMAIN 2: J K L / NUMPAD 1 2 3
            </div>
          </div>
          <div className="absolute bottom-[40px] left-1/2 flex -translate-x-1/2 flex-col items-center">
            <div className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-2 border-rose-300/70 bg-black/60 font-display text-[26px] font-black text-rose-300" style={{ boxShadow: "0 0 20px rgba(244,63,94,0.5)" }}>
              VS
            </div>
            <div className="mt-1 rounded-md bg-black/50 px-2 py-0.5 font-display text-[10px] tracking-widest text-slate-300">
              TERCEPAT MENEMBAK!
            </div>
          </div>
        </>
      )}

      {/* ---------- Overlay intro ---------- */}
      {phase === "intro" && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/55">
          <div className="anim-pop font-display text-[20px] font-bold tracking-[0.5em] text-cyan-200">LEVEL {level.id}</div>
          <div className="anim-pop font-display text-[48px] font-black tracking-wider text-yellow-300 text-glow-yellow" style={{ animationDelay: "0.05s" }}>
            {level.name.toUpperCase()}
          </div>
          <div className="anim-pop mt-1 rounded-full border border-white/20 bg-black/50 px-5 py-1 font-display text-[18px] font-bold text-white" style={{ animationDelay: "0.1s" }}>
            {level.subtitle} • {level.timeLimit} detik / soal
          </div>
          <div key={state.introStep} className="anim-countdown mt-6 font-display text-[120px] font-black leading-none text-white" style={{ textShadow: "0 0 40px #22d3ee, 0 6px 0 #0e7490" }}>
            {state.introStep > 0 ? state.introStep : "MULAI!"}
          </div>
          <div className="mt-4 flex items-center gap-6 font-display text-[16px] font-bold">
            <span style={{ color: robots[0].color }}>
              {players === 1 ? "KAMU" : "PEMAIN 1"}: {robots[0].name}
            </span>
            <span className="text-rose-400">VS</span>
            <span style={{ color: robots[1].color }}>
              {players === 1 ? "MUSUH" : "PEMAIN 2"}: {robots[1].name}
            </span>
          </div>
        </div>
      )}

      {/* ---------- KO text ---------- */}
      {phase === "ko" && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
          <div
            className="anim-pop flex items-center gap-4 font-display font-black leading-none text-red-500"
            style={{
              fontSize: state.ko ? 130 : 84,
              textShadow: "0 0 50px #ef4444, 0 8px 0 #450a0a",
              animationDelay: "1.15s",
            }}
          >
            <Skull style={{ width: state.ko ? 110 : 72, height: state.ko ? 110 : 72 }} />
            {state.ko ? "K.O.!" : "ROBOT HANCUR!"}
          </div>
        </div>
      )}

      {/* ---------- Overlay jeda ---------- */}
      {paused && phase !== "finished" && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75">
          <Panel className="anim-pop flex w-[460px] flex-col items-center gap-3 p-8">
            <Pause className="h-12 w-12 fill-yellow-300 text-yellow-300" />
            <h2 className="font-display text-[40px] font-black tracking-widest text-yellow-300 text-glow-yellow">JEDA</h2>
            <div className="text-base text-slate-300">
              Level {level.id} • Soal {state.qIndex + 1}/{level.questions}
            </div>
            <NeonButton color="yellow" className="mt-2 w-full" onClick={togglePause}>
              <Play className="h-5 w-5 fill-current" /> Lanjutkan
            </NeonButton>
            <NeonButton color="cyan" className="w-full" onClick={onRetry}>
              <RotateCcw className="h-5 w-5" /> Ulangi Level
            </NeonButton>
            <div className="flex w-full gap-3">
              <NeonButton color="slate" className="flex-1" onClick={onLevels}>
                <LayoutGrid className="h-5 w-5" /> Level
              </NeonButton>
              <NeonButton color="slate" className="flex-1" onClick={onExit}>
                <Home className="h-5 w-5" /> Menu
              </NeonButton>
            </div>
            <button type="button" onClick={onToggleMute} className="mt-1 flex items-center gap-2 text-sm text-slate-300 hover:text-white">
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />} Suara: {muted ? "Mati" : "Hidup"}
            </button>
          </Panel>
        </div>
      )}

      {/* ---------- Overlay hasil ---------- */}
      {phase === "finished" && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70">
          <Panel className="anim-pop w-[780px] px-8 pb-7 pt-6 text-center">
            <div className="font-display text-[14px] font-bold tracking-[0.5em] text-cyan-200">
              LEVEL {level.id} SELESAI {state.ko && "• K.O.!"}
            </div>
            <h2
              className="mt-1 font-display text-[64px] font-black leading-none tracking-wider"
              style={{ color: resultTitle.color, textShadow: `0 0 30px ${resultTitle.color}, 0 5px 0 rgba(0,0,0,0.6)` }}
            >
              {resultTitle.text}
            </h2>
            {players === 1 && (
              <div className="mt-3 flex flex-col items-center gap-1">
                <Stars count={stars} size={46} />
                <div className="text-base text-slate-300">
                  {state.winner === 0
                    ? stars === 3
                      ? "Sempurna! Tanpa satu pun kesalahan!"
                      : stars === 2
                        ? "Hebat! Maksimal 2 kesalahan. Coba tanpa salah untuk 3 bintang."
                        : "Bagus! Kurangi kesalahan untuk mendapat bintang lebih banyak."
                    : state.winner === 1
                      ? "Jangan menyerah! Coba lagi dan jawab lebih cepat."
                      : "Hampir! Satu jawaban benar lagi untuk menang."}
                </div>
              </div>
            )}
            <div className="mt-5 grid grid-cols-2 gap-4">
              {[p1, p2].map((f, i) => {
                const r = robots[i];
                const isWinner = state.winner === i;
                const label = players === 1 ? (i === 0 ? "KAMU" : "ROBOT MUSUH") : `PEMAIN ${i + 1}`;
                return (
                  <div
                    key={i}
                    className={cn("relative rounded-xl border-2 bg-black/40 p-4 text-left", isWinner ? "" : "border-white/10")}
                    style={isWinner ? { borderColor: r.color, boxShadow: `0 0 22px ${r.color}66` } : undefined}
                  >
                    {isWinner && (
                      <span className="absolute -top-3 right-3 rounded-md px-2 py-0.5 font-display text-[11px] font-black text-black" style={{ background: r.color }}>
                        PEMENANG
                      </span>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="font-display text-[12px] tracking-widest text-slate-400">{label}</span>
                      <span className="font-display text-lg font-black" style={{ color: r.color }}>
                        {r.name}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[15px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400">HP tersisa</span>
                        <span className="font-display font-bold">{f.hp}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">{players === 1 && i === 1 ? "Tembakan kena" : "Benar"}</span>
                        <span className="font-display font-bold text-emerald-300">{f.correct}</span>
                      </div>
                      {(players === 2 || i === 0) && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Salah/lewat</span>
                            <span className="font-display font-bold text-rose-300">{f.wrong}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Beruntun</span>
                            <span className="font-display font-bold text-orange-300">x{f.bestStreak}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Skor</span>
                            <span className="font-display font-bold text-cyan-200">{f.score.toLocaleString("id-ID")}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Koin</span>
                            <span className="font-display font-bold text-yellow-300">+{f.coins}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {canNext && (
                <NeonButton color="yellow" size="lg" onClick={onNext}>
                  Level Berikutnya <ChevronRight className="h-7 w-7" />
                </NeonButton>
              )}
              <NeonButton color={canNext ? "cyan" : "yellow"} size={canNext ? "md" : "lg"} onClick={onRetry}>
                <RotateCcw className="h-5 w-5" /> Main Lagi
              </NeonButton>
              <NeonButton color="slate" onClick={onLevels}>
                <LayoutGrid className="h-5 w-5" /> Pilih Level
              </NeonButton>
              <NeonButton color="slate" onClick={onExit}>
                <Home className="h-5 w-5" /> Menu
              </NeonButton>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
