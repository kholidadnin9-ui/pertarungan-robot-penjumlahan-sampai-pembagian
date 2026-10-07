import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Dices, Swords, Cpu } from "lucide-react";
import cityBg from "@/assets/city-bg.jpg";
import { RobotSprite } from "./RobotSprite";
import { NeonButton, Panel } from "./ui";
import { ROBOTS, getRobot, type RobotId } from "@/game/robots";
import { sfx } from "@/game/audio";
import { cn } from "@/utils/cn";

interface Props {
  players: 1 | 2;
  onBack: () => void;
  onConfirm: (robots: [RobotId, RobotId]) => void;
}

function randomOther(exclude: RobotId | null): RobotId {
  const pool = ROBOTS.filter((r) => r.id !== exclude);
  return pool[Math.floor(Math.random() * pool.length)].id;
}

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span className="w-14 text-slate-300">{label}</span>
      <div className="flex flex-1 gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className="h-2 flex-1 rounded-sm"
            style={{ background: i <= value ? color : "rgba(255,255,255,0.12)" }}
          />
        ))}
      </div>
    </div>
  );
}

export function RobotSelect({ players, onBack, onConfirm }: Props) {
  const [p1, setP1] = useState<RobotId | null>(null);
  const [p2, setP2] = useState<RobotId | null>(null);
  const [turn, setTurn] = useState<0 | 1>(0);

  const ready = p1 !== null && p2 !== null;

  const choose = (id: RobotId) => {
    sfx.select();
    if (players === 1) {
      setP1(id);
      setP2((prev) => (prev && prev !== id ? prev : randomOther(id)));
      return;
    }
    if (turn === 0) {
      setP1(id);
      if (p2 === id) setP2(null);
      setTurn(1);
    } else {
      if (id === p1) return;
      setP2(id);
    }
  };

  const activeColor = turn === 0 ? "#facc15" : "#f472b6";
  const headline = useMemo(() => {
    if (players === 1) return "PILIH ROBOTMU";
    return turn === 0 ? "PEMAIN 1 — PILIH ROBOTMU" : "PEMAIN 2 — PILIH ROBOTMU";
  }, [players, turn]);

  return (
    <div className="relative h-full w-full overflow-hidden font-body text-white">
      <img src={cityBg} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      <div className="absolute inset-0 bg-[#06101c]/80" />
      <div className="scanlines pointer-events-none absolute inset-0 opacity-50" />

      {/* Header */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-6 pt-5">
        <NeonButton color="slate" size="sm" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" /> Kembali
        </NeonButton>
        <div className="flex flex-col items-center">
          <h1 className="font-display text-[30px] font-black tracking-widest text-glow-cyan" style={{ color: activeColor }}>
            {headline}
          </h1>
          <div className="mt-1 text-base text-slate-300">
            {players === 1
              ? "Robot lawan akan dipilih secara acak"
              : "Ketuk kartu robot untuk memilih. Robot yang sama tidak boleh dipilih dua kali."}
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-black/40 px-3 py-2 font-display text-sm text-cyan-200">
          <Cpu className="h-4 w-4" /> {players === 1 ? "MODE 1 PEMAIN" : "MODE 2 PEMAIN"}
        </div>
      </div>

      {/* Kartu robot */}
      <div className="absolute left-1/2 top-[108px] flex -translate-x-1/2 gap-5">
        {ROBOTS.map((r, i) => {
          const isP1 = p1 === r.id;
          const isP2 = p2 === r.id;
          const taken = players === 2 && turn === 1 && isP1;
          const selected = isP1 || isP2;
          return (
            <button
              key={r.id}
              type="button"
              disabled={taken}
              onClick={() => choose(r.id)}
              className={cn(
                "anim-rise group relative flex w-[232px] flex-col items-center overflow-hidden rounded-2xl border-2 bg-gradient-to-b from-[#0d1e38]/90 to-[#050c18]/95 pb-3 pt-2 text-left transition-all",
                "hover:-translate-y-1 hover:brightness-110 active:scale-[0.98]",
                selected ? "scale-[1.02]" : "border-white/15",
                taken && "cursor-not-allowed opacity-60"
              )}
              style={{
                animationDelay: `${i * 0.07}s`,
                borderColor: selected ? r.color : undefined,
                boxShadow: selected ? `0 0 28px ${r.color}99, inset 0 0 30px ${r.color}22` : "0 8px 24px rgba(0,0,0,0.5)",
              }}
            >
              {/* Label pemilih */}
              <div className="absolute left-2 top-2 z-10 flex flex-col gap-1">
                {isP1 && (
                  <span className="rounded-md bg-yellow-400 px-2 py-0.5 font-display text-[11px] font-bold text-black shadow">
                    {players === 1 ? "KAMU" : "PEMAIN 1"}
                  </span>
                )}
                {isP2 && (
                  <span className="rounded-md bg-pink-500 px-2 py-0.5 font-display text-[11px] font-bold text-white shadow">
                    {players === 1 ? "LAWAN" : "PEMAIN 2"}
                  </span>
                )}
              </div>
              {selected && (
                <span
                  className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full text-black"
                  style={{ background: r.color }}
                >
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
              )}

              <div className="relative mt-4 flex h-[290px] w-full items-end justify-center">
                <div
                  className="absolute left-1/2 top-1/2 h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed opacity-40 anim-spin-slow"
                  style={{ borderColor: r.color }}
                />
                <RobotSprite robot={r} facing="right" anim="idle" height={275} glow />
              </div>

              <div className="mt-2 w-full px-4">
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-[22px] font-black tracking-wider" style={{ color: r.color }}>
                    {r.name}
                  </span>
                  <span className="font-display text-[11px] tracking-widest text-slate-400">{r.codename}</span>
                </div>
                <div className="mt-2 space-y-1">
                  <StatBar label="Tenaga" value={r.power} color={r.color} />
                  <StatBar label="Cepat" value={r.speed} color={r.color} />
                  <StatBar label="Pelindung" value={r.armor} color={r.color} />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer: ringkasan pertandingan */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-6 pb-5">
        <Panel className="flex items-center gap-4 px-5 py-2.5">
          <div className="flex items-center gap-2">
            <span className="font-display text-xs text-slate-400">{players === 1 ? "KAMU" : "PEMAIN 1"}</span>
            <span className="font-display text-lg font-bold" style={{ color: p1 ? getRobot(p1).color : "#64748b" }}>
              {p1 ? getRobot(p1).name : "—"}
            </span>
          </div>
          <Swords className="h-6 w-6 text-rose-400" />
          <div className="flex items-center gap-2">
            <span className="font-display text-xs text-slate-400">{players === 1 ? "LAWAN" : "PEMAIN 2"}</span>
            <span className="font-display text-lg font-bold" style={{ color: p2 ? getRobot(p2).color : "#64748b" }}>
              {p2 ? getRobot(p2).name : "—"}
            </span>
          </div>
          {players === 1 && p1 && (
            <button
              type="button"
              onClick={() => {
                sfx.click();
                setP2(randomOther(p1));
              }}
              className="ml-2 flex items-center gap-1 rounded-lg border border-white/20 bg-white/5 px-3 py-1 text-sm hover:bg-white/10"
            >
              <Dices className="h-4 w-4" /> Acak lawan
            </button>
          )}
          {players === 2 && p1 && (
            <button
              type="button"
              onClick={() => {
                sfx.click();
                setTurn(turn === 0 ? 1 : 0);
              }}
              className="ml-2 flex items-center gap-1 rounded-lg border border-white/20 bg-white/5 px-3 py-1 text-sm hover:bg-white/10"
            >
              Ganti ke {turn === 0 ? "Pemain 2" : "Pemain 1"}
            </button>
          )}
        </Panel>

        <NeonButton color="yellow" size="lg" disabled={!ready} onClick={() => ready && onConfirm([p1!, p2!])}>
          Pilih Level <ArrowRight className="h-7 w-7" />
        </NeonButton>
      </div>
    </div>
  );
}
