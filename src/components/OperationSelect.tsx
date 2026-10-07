import { ArrowLeft, Database, Star, Swords } from "lucide-react";
import cityBg from "@/assets/city-bg.jpg";
import { NeonButton, Panel } from "./ui";
import { type MathOp } from "@/game/levels";
import { levelsForOp, starsOf, unlockedOf, type Progress } from "@/game/storage";

interface Props {
  progress: Progress;
  onBack: () => void;
  onPick: (op: MathOp) => void;
}

interface CardDef {
  op: MathOp;
  symbol: string;
  title: string;
  badge: string;
  desc: string;
  example: [string, string, string];
  color: string;
  glow: string;
}

const CARDS: CardDef[] = [
  {
    op: "+",
    symbol: "+",
    title: "PENJUMLAHAN",
    badge: "HASIL ≤ 100",
    desc: "Dengan & tanpa penyimpanan",
    example: ["36 + 27", "=", "63"],
    color: "#facc15",
    glow: "rgba(250,204,21,0.55)",
  },
  {
    op: "−",
    symbol: "−",
    title: "PENGURANGAN",
    badge: "BILANGAN ≤ 100",
    desc: "Dengan & tanpa meminjam",
    example: ["72 − 48", "=", "24"],
    color: "#4ade80",
    glow: "rgba(74,222,128,0.55)",
  },
  {
    op: "×",
    symbol: "×",
    title: "PERKALIAN",
    badge: "TABEL 1 – 12",
    desc: "Latihan tabel perkalian",
    example: ["7 × 8", "=", "56"],
    color: "#f472b6",
    glow: "rgba(244,114,182,0.55)",
  },
  {
    op: "÷",
    symbol: "÷",
    title: "PEMBAGIAN",
    badge: "HASIL BAGI 1 – 10",
    desc: "Pembagian hasil 1 sampai 10",
    example: ["56 ÷ 8", "=", "7"],
    color: "#22d3ee",
    glow: "rgba(34,211,238,0.55)",
  },
];

export function OperationSelect({ progress, onBack, onPick }: Props) {
  return (
    <div className="relative h-full w-full overflow-hidden font-body text-white">
      <img src={cityBg} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      <div className="absolute inset-0 bg-[#050d1a]/85" />
      {/* Semburat warna keempat operasi di latar */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 28% 55% at 14% 55%, rgba(250,204,21,0.16), transparent 70%), radial-gradient(ellipse 28% 55% at 38% 55%, rgba(74,222,128,0.14), transparent 70%), radial-gradient(ellipse 28% 55% at 62% 55%, rgba(244,114,182,0.14), transparent 70%), radial-gradient(ellipse 28% 55% at 86% 55%, rgba(34,211,238,0.16), transparent 70%)",
        }}
      />
      <div className="scanlines pointer-events-none absolute inset-0 opacity-40" />

      {/* Header */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-6 pt-5">
        <NeonButton color="slate" size="sm" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" /> Menu
        </NeonButton>
        <div className="flex flex-col items-center">
          <h1 className="font-display text-[34px] font-black tracking-widest text-yellow-300 text-glow-yellow">
            PILIH OPERASI
          </h1>
          <div className="mt-0.5 text-[17px] text-slate-300">Tentukan jenis soal untuk pertempuran robot</div>
        </div>
        <div className="w-[120px]" />
      </div>

      {/* Baris 4 kartu — ukuran sama, jarak tetap, tidak saling menimpa */}
      <div className="absolute inset-x-0 bottom-[74px] top-[104px] flex items-center justify-center px-6">
        <div className="grid w-full max-w-[1180px] grid-cols-4 gap-6">
          {CARDS.map((c, i) => {
            const levels = levelsForOp(c.op);
            const unlocked = unlockedOf(progress, c.op);
            const stars = starsOf(progress, c.op).reduce((s, n) => s + n, 0);
            const maxStars = levels.length * 3;
            return (
              <button
                key={c.op}
                type="button"
                onClick={() => onPick(c.op)}
                className="anim-rise group relative flex h-[452px] min-w-0 flex-col overflow-hidden rounded-[28px] border-[3px] text-left transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  animationDelay: `${i * 0.08}s`,
                  borderColor: c.color,
                  background: `linear-gradient(180deg, ${c.color}30 0%, #0b1a30 38%, #050c18 100%)`,
                  boxShadow: `0 0 0 2px rgba(0,0,0,0.6), 0 0 34px ${c.glow}, 0 14px 30px rgba(0,0,0,0.55)`,
                }}
              >
                {/* Kilau saat hover */}
                <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-1/3 -translate-x-[140%] -skew-x-[20deg] bg-white/15 transition-transform duration-700 group-hover:translate-x-[420%]" />

                {/* Lencana operator */}
                <div className="relative flex shrink-0 justify-center pt-5">
                  <div className="anim-idle relative flex h-[118px] w-[118px] items-center justify-center">
                    <div
                      className="anim-spin-slow absolute inset-0 rounded-full border-2 border-dashed opacity-70"
                      style={{ borderColor: c.color }}
                    />
                    <div
                      className="absolute inset-[9px] rounded-full border-2"
                      style={{
                        borderColor: c.color,
                        background: `radial-gradient(circle at 35% 30%, ${c.color}66, #07121f 72%)`,
                        boxShadow: `0 0 28px ${c.glow}, inset 0 0 22px ${c.color}44`,
                      }}
                    />
                    <span
                      className="relative font-display text-[68px] font-black leading-none"
                      style={{ color: "#fff", textShadow: `0 0 18px ${c.color}, 0 0 38px ${c.color}` }}
                    >
                      {c.symbol}
                    </span>
                  </div>
                </div>

                {/* Judul */}
                <div className="mt-3 px-3 text-center">
                  <div
                    className="font-display text-[22px] font-black leading-tight tracking-wide"
                    style={{ color: c.color, textShadow: `0 0 14px ${c.glow}` }}
                  >
                    {c.title}
                  </div>
                  <div
                    className="mx-auto mt-1.5 inline-block rounded-full px-3 py-0.5 font-display text-[11px] font-bold tracking-[0.18em]"
                    style={{ background: `${c.color}26`, color: c.color, border: `1px solid ${c.color}88` }}
                  >
                    {c.badge}
                  </div>
                  <div className="mt-2 text-[15px] leading-snug text-slate-300">{c.desc}</div>
                </div>

                {/* Contoh soal */}
                <div className="mx-4 mt-3 rounded-2xl border border-white/10 bg-black/45 px-2 py-2.5 text-center">
                  <div className="font-display text-[10px] font-bold tracking-[0.3em] text-slate-400">CONTOH</div>
                  <div className="mt-0.5 flex items-center justify-center gap-2 font-display text-[26px] font-black leading-none text-white">
                    <span>{c.example[0]}</span>
                    <span style={{ color: c.color }}>{c.example[1]}</span>
                    <span style={{ color: c.color, textShadow: `0 0 12px ${c.glow}` }}>{c.example[2]}</span>
                  </div>
                </div>

                {/* Progres level & bintang */}
                <div className="mx-4 mt-3">
                  <div className="flex items-center justify-between font-display text-[11px] font-bold tracking-widest">
                    <span style={{ color: c.color }}>
                      LEVEL {unlocked}/{levels.length}
                    </span>
                    <span className="flex items-center gap-1 text-yellow-300">
                      <Star className="h-3.5 w-3.5 fill-yellow-300" /> {stars}/{maxStars}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-1.5">
                    {levels.map((lv) => {
                      const open = lv.id <= unlocked;
                      const current = lv.id === unlocked;
                      return (
                        <span
                          key={lv.id}
                          className="relative flex h-7 flex-1 items-center justify-center rounded-md font-display text-[12px] font-black"
                          style={{
                            background: open ? c.color : "rgba(255,255,255,0.08)",
                            color: open ? "#07121f" : "#64748b",
                            boxShadow: current ? `0 0 12px ${c.color}` : undefined,
                            outline: current ? `2px solid ${c.color}` : undefined,
                            outlineOffset: current ? 2 : undefined,
                          }}
                        >
                          {lv.id}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Tombol main */}
                <div className="mt-auto px-4 pb-4 pt-3">
                  <div
                    className="flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 font-display text-[17px] font-black tracking-wider transition-all group-hover:brightness-125"
                    style={{
                      background: `linear-gradient(180deg, ${c.color}, ${c.color}aa)`,
                      borderColor: "#ffffff66",
                      color: "#07121f",
                      boxShadow: `0 0 22px ${c.glow}`,
                    }}
                  >
                    <Swords className="h-5 w-5" /> MAIN
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Info bawah */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3">
        <Panel className="flex items-center gap-2 px-5 py-2 text-[15px] text-slate-200">
          <Database className="h-4 w-4 text-cyan-300" />
          Tiap operasi punya progres & bintang sendiri (tersimpan otomatis)
        </Panel>
      </div>
    </div>
  );
}
