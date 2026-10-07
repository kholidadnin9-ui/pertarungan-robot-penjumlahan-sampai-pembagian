import type { CSSProperties } from "react";
import { useKeyedMeta } from "@/game/chroma";
import type { RobotDef } from "@/game/robots";
import { cn } from "@/utils/cn";

export type RobotAnim = "idle" | "enter" | "attack" | "hit" | "ko" | "win";

/** Lebar kotak sprite = tinggi × rasio ini (dipakai juga untuk menghitung posisi laser) */
export const SPRITE_BOX_RATIO = 0.78;

interface Props {
  robot: RobotDef;
  /** Arah hadap robot: kanan = berdiri di sisi kiri arena */
  facing: "right" | "left";
  anim?: RobotAnim;
  height?: number;
  className?: string;
  /** Kunci untuk memaksa animasi diputar ulang */
  animKey?: string | number;
  shadow?: boolean;
  glow?: boolean;
}

export function RobotSprite({
  robot,
  facing,
  anim = "idle",
  height = 440,
  className,
  animKey,
  shadow = true,
  glow = true,
}: Props) {
  const meta = useKeyedMeta(robot.image);
  const dir = facing === "right" ? 1 : -1;
  const exploded = anim === "ko";

  return (
    <div
      className={cn("relative flex items-end justify-center", className)}
      style={{ height, width: height * SPRITE_BOX_RATIO }}
    >
      {glow && !exploded && (
        <div
          className="anim-glow pointer-events-none absolute bottom-[8%] left-1/2 h-[60%] w-[80%] -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, ${robot.color}66 0%, transparent 70%)` }}
        />
      )}
      {shadow && (
        <div
          className={cn(
            "pointer-events-none absolute bottom-[-6px] left-1/2 h-[26px] w-[70%] -translate-x-1/2 rounded-[50%] bg-black/55 blur-md transition-opacity duration-700",
            exploded && "opacity-0"
          )}
        />
      )}
      <div
        key={`${anim}-${animKey ?? ""}`}
        className={cn("relative h-full w-full", {
          "anim-idle": anim === "idle",
          "anim-enter": anim === "enter",
          "anim-attack": anim === "attack",
          "anim-hit": anim === "hit",
          "anim-ko": anim === "ko",
          "anim-win": anim === "win",
        })}
        style={{ "--dir": dir, "--glow": robot.glow } as CSSProperties}
      >
        {meta ? (
          <img
            src={meta.url}
            alt={`Robot ${robot.name}`}
            draggable={false}
            className="absolute bottom-0 left-1/2 h-full max-w-none object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.6)]"
            style={{ width: height * meta.aspect, transform: `translateX(-50%) scaleX(${dir})` }}
          />
        ) : (
          <div className="absolute inset-x-[20%] bottom-0 top-[10%] animate-pulse rounded-3xl bg-white/10" />
        )}
      </div>
    </div>
  );
}
