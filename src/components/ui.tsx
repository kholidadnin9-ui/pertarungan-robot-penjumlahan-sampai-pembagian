import type { CSSProperties, ReactNode } from "react";
import { Star } from "lucide-react";
import { cn } from "@/utils/cn";
import { sfx } from "@/game/audio";

/** Tombol bulat ala HUD (seperti tombol di sisi layar pada referensi) */
export function HudRound({
  children,
  onClick,
  size = 52,
  className,
  title,
  disabled,
  style,
  badge,
}: {
  children: ReactNode;
  onClick?: () => void;
  size?: number;
  className?: string;
  title?: string;
  disabled?: boolean;
  style?: CSSProperties;
  badge?: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        sfx.click();
        onClick?.();
      }}
      className={cn(
        "hud-round relative flex items-center justify-center rounded-full text-cyan-100 transition-transform active:scale-90",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      style={{ width: size, height: size, ...style }}
    >
      {children}
      {badge !== undefined && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 font-display text-[11px] font-bold text-black shadow">
          {badge}
        </span>
      )}
    </button>
  );
}

/** Tombol utama bergaya neon */
export function NeonButton({
  children,
  onClick,
  color = "cyan",
  className,
  disabled,
  size = "md",
}: {
  children: ReactNode;
  onClick?: () => void;
  color?: "cyan" | "yellow" | "pink" | "green" | "red" | "slate";
  className?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const palette: Record<string, string> = {
    cyan: "from-cyan-400 to-blue-600 border-cyan-200 text-white shadow-[0_0_24px_rgba(34,211,238,0.55)]",
    yellow:
      "from-yellow-300 to-amber-500 border-yellow-100 text-slate-900 shadow-[0_0_24px_rgba(250,204,21,0.6)]",
    pink: "from-pink-400 to-fuchsia-600 border-pink-200 text-white shadow-[0_0_24px_rgba(236,72,153,0.55)]",
    green:
      "from-emerald-400 to-green-600 border-emerald-100 text-white shadow-[0_0_24px_rgba(34,197,94,0.55)]",
    red: "from-rose-400 to-red-600 border-rose-200 text-white shadow-[0_0_24px_rgba(244,63,94,0.55)]",
    slate:
      "from-slate-500 to-slate-800 border-slate-300 text-white shadow-[0_0_18px_rgba(148,163,184,0.35)]",
  };
  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-7 py-3 text-lg",
    lg: "px-10 py-4 text-2xl",
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        sfx.select();
        onClick?.();
      }}
      className={cn(
        "relative inline-flex items-center justify-center gap-2 rounded-xl border-2 bg-gradient-to-b font-display font-bold uppercase tracking-wider transition-all",
        "hover:brightness-110 active:scale-95",
        "before:absolute before:inset-x-2 before:top-1 before:h-1/3 before:rounded-full before:bg-white/30 before:content-['']",
        palette[color],
        sizes[size],
        disabled && "cursor-not-allowed opacity-40 saturate-50",
        className
      )}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  );
}

export function Panel({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={cn("hud-panel rounded-2xl", className)} style={style}>
      {children}
    </div>
  );
}

export function Stars({ count, size = 22, className }: { count: number; size?: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {[0, 1, 2].map((i) => (
        <Star
          key={i}
          style={{ width: size, height: size }}
          className={cn(
            i < count ? "fill-yellow-300 text-yellow-200 drop-shadow-[0_0_6px_rgba(250,204,21,0.9)]" : "text-slate-600"
          )}
        />
      ))}
    </div>
  );
}

/** Badge skor / koin di pojok kiri atas, seperti referensi */
export function StatPill({
  icon,
  value,
  color = "cyan",
  className,
}: {
  icon: ReactNode;
  value: ReactNode;
  color?: "cyan" | "yellow";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "hud-panel flex h-9 min-w-[150px] items-center gap-2 rounded-lg pl-1.5 pr-4",
        color === "yellow" && "border-amber-300/50",
        className
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-md",
          color === "cyan" ? "bg-cyan-500/30 text-cyan-200" : "bg-amber-400/30 text-amber-200"
        )}
      >
        {icon}
      </span>
      <span className="font-display text-base font-bold tracking-wide text-white">{value}</span>
    </div>
  );
}
