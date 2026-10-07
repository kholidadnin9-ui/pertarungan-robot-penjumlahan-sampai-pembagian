import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Smartphone } from "lucide-react";
import cityBg from "@/assets/city-bg.jpg";

/** Ukuran dasar panggung (16:9). Panggung melebar / meninggi mengikuti rasio layar. */
export const BASE_W = 1280;
export const BASE_H = 720;
const MAX_W = 1560; // layar sangat lebar (mis. 21:9, HP modern landscape)
const MAX_H = 900; // layar lebih "tinggi" (4:3 / tablet / laptop 16:10)

interface StageSize {
  w: number;
  h: number;
}

const StageContext = createContext<StageSize>({ w: BASE_W, h: BASE_H });

/** Ukuran panggung saat ini (dalam piksel desain) */
export function useStage(): StageSize {
  return useContext(StageContext);
}

interface Viewport {
  w: number;
  h: number;
}

function readViewport(): Viewport {
  const vv = window.visualViewport;
  return {
    w: Math.round(vv?.width ?? window.innerWidth),
    h: Math.round(vv?.height ?? window.innerHeight),
  };
}

export function Stage({ children }: { children: ReactNode }) {
  const [vp, setVp] = useState<Viewport>(() => readViewport());
  const [showHint, setShowHint] = useState(true);

  useEffect(() => {
    const onResize = () => setVp(readViewport());
    onResize();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    // beberapa browser mobile memperbarui ukuran sedikit terlambat
    const t = setTimeout(onResize, 300);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
    };
  }, []);

  // Petunjuk putar perangkat hanya muncul sebentar
  const portraitPhone = vp.h > vp.w && vp.w < 1000;
  useEffect(() => {
    if (!portraitPhone) return;
    setShowHint(true);
    const t = setTimeout(() => setShowHint(false), 7000);
    return () => clearTimeout(t);
  }, [portraitPhone]);

  // HP / tablet kecil posisi tegak: putar panggung 90° agar memenuhi layar
  const rotate = portraitPhone;
  const vw = rotate ? vp.h : vp.w;
  const vh = rotate ? vp.w : vp.h;
  const aspect = vw / Math.max(1, vh);
  const base = BASE_W / BASE_H;

  let sw = BASE_W;
  let sh = BASE_H;
  if (aspect > base) sw = Math.min(MAX_W, Math.round(BASE_H * aspect));
  else sh = Math.min(MAX_H, Math.round(BASE_W / aspect));

  const scale = Math.min(vw / sw, vh / sh);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#06101c]" style={{ width: "100%", height: "100%" }}>
      {/* Latar luar panggung (letterbox) */}
      <div
        className="absolute inset-[-20px] bg-cover bg-center opacity-50 blur-md"
        style={{ backgroundImage: `url(${cityBg})` }}
      />
      <div className="absolute inset-0 bg-black/40" />

      <div
        className="absolute left-1/2 top-1/2 overflow-hidden"
        style={{
          width: sw,
          height: sh,
          transform: `translate(-50%, -50%) ${rotate ? "rotate(90deg) " : ""}scale(${scale})`,
          transformOrigin: "center center",
          boxShadow: "0 0 0 2px rgba(0,0,0,0.6), 0 0 60px rgba(0,0,0,0.8)",
        }}
      >
        <StageContext.Provider value={{ w: sw, h: sh }}>{children}</StageContext.Provider>
      </div>

      {rotate && showHint && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-50 flex justify-center px-3">
          <div className="flex items-center gap-2 rounded-full border border-cyan-300/60 bg-black/80 px-4 py-2 text-center text-[13px] font-semibold text-cyan-100 shadow-lg">
            <Smartphone className="h-4 w-4 shrink-0 rotate-90" />
            Miringkan HP (mendatar) agar tampilan lebih besar
          </div>
        </div>
      )}
    </div>
  );
}
