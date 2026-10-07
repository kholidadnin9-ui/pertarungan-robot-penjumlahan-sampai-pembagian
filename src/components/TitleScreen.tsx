import { useEffect, useState } from "react";
import {
  Coins,
  Trophy,
  User,
  Users,
  Volume2,
  VolumeX,
  Info,
  X,
  Keyboard,
  Zap,
  Maximize,
  Minimize,
  KeyRound,
} from "lucide-react";
import { fullscreenSupported, isFullscreen, toggleFullscreen } from "@/game/fullscreen";
import cityBg from "@/assets/city-bg.jpg";
import { RobotSprite } from "./RobotSprite";
import { HudRound, NeonButton, Panel, StatPill } from "./ui";
import { getRobot } from "@/game/robots";
import type { Progress } from "@/game/storage";
import { sfx } from "@/game/audio";
import { cn } from "@/utils/cn";

interface Props {
  progress: Progress;
  muted: boolean;
  onToggleMute: () => void;
  onStart: (players: 1 | 2) => void;
  onOpenAdmin: () => void;
}

/** Password admin (base64) */
const ADMIN_KEY = "aW50YW1rZWhxczI=";

export function TitleScreen({ progress, muted, onToggleMute, onStart, onOpenAdmin }: Props) {
  const [showHelp, setShowHelp] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [pw, setPw] = useState("");
  const [pwErr, setPwErr] = useState(0); // >0 = tampilkan error (juga jadi kunci animasi)

  const tryAdmin = () => {
    try {
      if (pw === atob(ADMIN_KEY)) {
        sfx.select();
        setShowAdmin(false);
        setPw("");
        setPwErr(0);
        onOpenAdmin();
      } else {
        sfx.wrong();
        setPwErr((n) => n + 1);
      }
    } catch {
      setPwErr((n) => n + 1);
    }
  };
  const [fs, setFs] = useState(false);
  const canFullscreen = fullscreenSupported();

  useEffect(() => {
    const onChange = () => setFs(isFullscreen());
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden font-body text-white">
      <img src={cityBg} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      <div className="absolute inset-0 bg-gradient-to-b from-[#06101c]/55 via-transparent to-[#06101c]/95" />
      <div className="scanlines pointer-events-none absolute inset-0 opacity-60" />

      {/* Robot dekorasi */}
      <div className="absolute bottom-[40px] left-[40px]">
        <RobotSprite robot={getRobot("yellow")} facing="right" anim="idle" height={470} />
      </div>
      <div className="absolute bottom-[40px] right-[40px]">
        <RobotSprite robot={getRobot("blue")} facing="left" anim="idle" height={470} />
      </div>

      {/* HUD atas */}
      <div className="absolute left-4 top-4 flex flex-col gap-2">
        <StatPill icon={<Trophy className="h-4 w-4" />} value={progress.bestScore.toLocaleString("id-ID")} />
        <StatPill icon={<Coins className="h-4 w-4" />} value={progress.coins.toLocaleString("id-ID")} color="yellow" />
      </div>
      <div className="absolute right-4 top-4 flex flex-col items-center gap-2">
        <HudRound onClick={onToggleMute} title="Suara">
          {muted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
        </HudRound>
        <HudRound onClick={() => setShowHelp(true)} title="Cara bermain" size={44}>
          <Info className="h-5 w-5" />
        </HudRound>
        {canFullscreen && (
          <HudRound
            onClick={() => {
              void toggleFullscreen().then(() => setFs(isFullscreen()));
            }}
            title="Layar penuh"
            size={44}
          >
            {fs ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </HudRound>
        )}
        <HudRound
          onClick={() => {
            sfx.click();
            setPw("");
            setPwErr(0);
            setShowAdmin(true);
          }}
          title="Menu admin"
          size={44}
        >
          <KeyRound className="h-5 w-5 text-yellow-200" />
        </HudRound>
      </div>

      {/* Logo */}
      <div className="absolute left-1/2 top-[70px] flex -translate-x-1/2 flex-col items-center">
        <div className="anim-pop flex items-center gap-3">
          <Zap className="h-9 w-9 fill-yellow-300 text-yellow-300 drop-shadow-[0_0_12px_rgba(250,204,21,0.9)]" />
          <span className="font-display text-xl font-bold tracking-[0.45em] text-cyan-200 text-glow-cyan">
            MATH MECHA ARENA
          </span>
          <Zap className="h-9 w-9 fill-yellow-300 text-yellow-300 drop-shadow-[0_0_12px_rgba(250,204,21,0.9)]" />
        </div>
        <h1
          className="anim-pop mt-2 text-center font-display text-[84px] font-black leading-none tracking-wide"
          style={{
            background: "linear-gradient(180deg,#fff7c2 0%,#ffd23f 35%,#ff9a00 70%,#ffcc33 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            filter: "drop-shadow(0 4px 0 #6b3b00) drop-shadow(0 0 26px rgba(255,170,0,0.6))",
            animationDelay: "0.1s",
          }}
        >
          ROBOT BATTLE
        </h1>
        <div
          className="anim-pop mt-1 rounded-full border border-cyan-300/50 bg-[#061a33]/80 px-6 py-1.5 font-display text-[17px] font-bold tracking-[0.3em] text-cyan-100"
          style={{ animationDelay: "0.2s" }}
        >
          PERTEMPURAN MATEMATIKA + − × ÷
        </div>
        <div
          className="anim-rise mt-3 inline-flex items-center gap-2 rounded-full border-2 border-yellow-300 bg-[#020a16] px-6 py-1.5 text-[18px] font-bold tracking-wide text-white"
          style={{
            animationDelay: "0.25s",
            boxShadow: "0 0 0 3px rgba(0,0,0,0.65), 0 0 18px rgba(250,204,21,0.55), 0 4px 14px rgba(0,0,0,0.7)",
            textShadow: "0 1px 2px rgba(0,0,0,0.9)",
          }}
        >
          Created by:
          <span className="font-display font-black tracking-wider text-yellow-300" style={{ textShadow: "0 0 10px rgba(250,204,21,0.8)" }}>
            widodo guru sd
          </span>
        </div>

        <div className="anim-rise mt-10 flex flex-col items-center gap-4" style={{ animationDelay: "0.35s" }}>
          <div className="flex gap-6">
            <NeonButton size="lg" color="yellow" onClick={() => onStart(1)} className="min-w-[250px]">
              <User className="h-7 w-7" /> 1 Pemain
            </NeonButton>
            <NeonButton size="lg" color="cyan" onClick={() => onStart(2)} className="min-w-[250px]">
              <Users className="h-7 w-7" /> 2 Pemain
            </NeonButton>
          </div>
          <div className="text-center text-lg text-cyan-100/90">
            Penjumlahan, pengurangan, perkalian, pembagian — jawab lebih cepat untuk menembak robot lawan!
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-black/40 px-3 py-1 text-sm text-slate-300">
            <Keyboard className="h-4 w-4" /> 4 Operasi • 5 Level tiap operasi • 10 Soal per level • 3 pilihan jawaban
          </div>
        </div>
      </div>

      {showHelp && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 p-8">
          <Panel className="anim-pop relative w-[860px] p-7">
            <button
              type="button"
              className="absolute right-4 top-4 rounded-full p-1 text-slate-300 hover:bg-white/10"
              onClick={() => setShowHelp(false)}
            >
              <X className="h-6 w-6" />
            </button>
            <h2 className="font-display text-2xl font-bold text-yellow-300 text-glow-yellow">CARA BERMAIN</h2>
            <div className="mt-4 grid grid-cols-2 gap-6 text-[17px] leading-relaxed text-slate-100">
              <div>
                <h3 className="font-display text-base font-bold text-cyan-300">MODE 1 PEMAIN</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>Pilih robotmu, lalu pilih level.</li>
                  <li>Jawab soal sebelum robot musuh selesai membidik.</li>
                  <li>
                    Jawaban <b className="text-emerald-300">benar</b> = robotmu menembak musuh (-10 HP).
                  </li>
                  <li>
                    Jawaban sangat cepat = <b className="text-yellow-300">serangan kritis</b> (-15 HP).
                  </li>
                  <li>
                    Jawaban <b className="text-rose-300">salah</b> atau terlambat = musuh menembakmu.
                  </li>
                  <li>Gunakan tombol roket untuk petunjuk (hapus 1 jawaban salah).</li>
                </ul>
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-pink-300">MODE 2 PEMAIN</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>Kedua pemain melihat soal yang sama.</li>
                  <li>
                    Siapa yang menjawab <b className="text-emerald-300">benar paling cepat</b> menembak robot
                    lawan!
                  </li>
                  <li>Jawaban salah = robotmu macet sampai soal berikutnya.</li>
                  <li>Robot yang HP-nya habis duluan kalah (K.O.).</li>
                </ul>
                <h3 className="mt-3 font-display text-base font-bold text-cyan-300">KONTROL</h3>
                <ul className="mt-1 space-y-1">
                  <li>
                    Pemain 1: tombol <kbd className="rounded bg-white/15 px-1.5">A</kbd>{" "}
                    <kbd className="rounded bg-white/15 px-1.5">S</kbd>{" "}
                    <kbd className="rounded bg-white/15 px-1.5">D</kbd> atau{" "}
                    <kbd className="rounded bg-white/15 px-1.5">1</kbd>{" "}
                    <kbd className="rounded bg-white/15 px-1.5">2</kbd>{" "}
                    <kbd className="rounded bg-white/15 px-1.5">3</kbd>
                  </li>
                  <li>
                    Pemain 2: tombol <kbd className="rounded bg-white/15 px-1.5">J</kbd>{" "}
                    <kbd className="rounded bg-white/15 px-1.5">K</kbd>{" "}
                    <kbd className="rounded bg-white/15 px-1.5">L</kbd> atau Numpad 1 2 3
                  </li>
                  <li>Atau sentuh / klik tombol jawaban di layar.</li>
                </ul>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <NeonButton color="yellow" onClick={() => setShowHelp(false)}>
                Mengerti!
              </NeonButton>
            </div>
          </Panel>
        </div>
      )}

      {/* Modal password admin */}
      {showAdmin && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/75">
          <Panel className="anim-pop w-[430px] p-7">
            <div>
              <div className="flex flex-col items-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-yellow-300 bg-yellow-300/15">
                  <KeyRound className="h-8 w-8 text-yellow-300" />
                </div>
                <h2 className="mt-3 font-display text-[26px] font-black tracking-widest text-yellow-300 text-glow-yellow">
                  MENU ADMIN
                </h2>
                <p className="mt-1 text-base text-slate-300">Masukkan password untuk mengelola soal.</p>
              </div>
              <div key={pwErr} className={cn("mt-4", pwErr > 0 && "anim-wrong")}>
                <input
                  type="password"
                  autoFocus
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") tryAdmin();
                    if (e.key === "Escape") setShowAdmin(false);
                  }}
                  placeholder="Password..."
                  className="w-full rounded-xl border-2 border-cyan-300/40 bg-[#04101f] px-4 py-3 font-display text-lg tracking-widest text-white outline-none placeholder:text-slate-500 focus:border-yellow-300/80"
                />
                {pwErr > 0 && (
                  <div className="mt-2 text-center font-display text-[13px] font-bold text-rose-300">
                    Password salah. Coba lagi.
                  </div>
                )}
              </div>
              <div className="mt-5 flex gap-3">
                <NeonButton color="slate" className="flex-1" onClick={() => setShowAdmin(false)}>
                  Batal
                </NeonButton>
                <NeonButton color="yellow" className="flex-1" onClick={tryAdmin}>
                  <KeyRound className="h-5 w-5" /> Masuk
                </NeonButton>
              </div>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
