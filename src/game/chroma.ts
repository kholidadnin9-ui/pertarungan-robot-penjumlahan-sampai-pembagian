import { useEffect, useState } from "react";

/**
 * Menghapus latar chroma-key (hijau / magenta / warna polos lain) dari gambar robot
 * secara otomatis menggunakan canvas, memotong margin transparan, lalu MENGANALISIS siluet
 * robot untuk menemukan:
 *  - muzzle : ujung moncong senjata (titik paling depan di bagian atas-tengah tubuh)
 *  - chest  : titik tubuh (dada) yang menjadi sasaran tembakan
 * Semua koordinat berupa pecahan (0..1) terhadap gambar hasil potong, saat robot menghadap KANAN.
 */

export interface Pt {
  x: number;
  y: number;
}

export interface RobotMeta {
  url: string;
  /** lebar / tinggi gambar hasil potong */
  aspect: number;
  muzzle: Pt;
  chest: Pt;
}

export const DEFAULT_META: Omit<RobotMeta, "url"> = {
  aspect: 0.78,
  muzzle: { x: 0.96, y: 0.4 },
  chest: { x: 0.5, y: 0.38 },
};

type KeyMode = "green" | "magenta" | "color" | "none";

const cache = new Map<string, Promise<RobotMeta>>();
const resolved = new Map<string, RobotMeta>();

function sampleCorners(d: Uint8ClampedArray, w: number, h: number) {
  const patch = Math.max(4, Math.floor(Math.min(w, h) * 0.02));
  const spots = [
    [0, 0],
    [w - patch, 0],
    [0, h - patch],
    [w - patch, h - patch],
    [Math.floor(w / 2) - patch, 0],
    [0, Math.floor(h / 2)],
    [w - patch, Math.floor(h / 2)],
  ];
  let r = 0,
    g = 0,
    b = 0,
    n = 0;
  for (const [sx, sy] of spots) {
    for (let y = sy; y < sy + patch; y++) {
      for (let x = sx; x < sx + patch; x++) {
        const i = (y * w + x) * 4;
        r += d[i];
        g += d[i + 1];
        b += d[i + 2];
        n++;
      }
    }
  }
  return { r: r / n, g: g / n, b: b / n };
}

function detectMode(k: { r: number; g: number; b: number }): KeyMode {
  const gScore = k.g - Math.max(k.r, k.b);
  const mScore = Math.min(k.r, k.b) - k.g;
  if (gScore > 40) return "green";
  if (mScore > 40) return "magenta";
  const maxC = Math.max(k.r, k.g, k.b);
  const minC = Math.min(k.r, k.g, k.b);
  if (maxC > 200 && maxC - minC < 28) return "color";
  return "none";
}

/** Cari ujung moncong & titik dada dari data alpha (area crop: x0..x1, y0..y1). */
function analyzeSilhouette(
  d: Uint8ClampedArray,
  w: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number
): { muzzle: Pt; chest: Pt } {
  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;
  const A = (x: number, y: number) => d[(y * w + x) * 4 + 3];

  // Band baris tempat senjata berada (bagian atas-tengah tubuh)
  const rowLo = y0 + Math.floor(ch * 0.1);
  const rowHi = y0 + Math.floor(ch * 0.64);
  const need = Math.max(4, Math.floor(ch * 0.01));

  // Kolom paling kanan yang memiliki cukup piksel solid => ujung senjata
  let tipX = -1;
  for (let x = x1; x >= x0; x--) {
    let cnt = 0;
    for (let y = rowLo; y <= rowHi; y++) {
      if (A(x, y) > 200) {
        cnt++;
        if (cnt >= need) break;
      }
    }
    if (cnt >= need) {
      tipX = x;
      break;
    }
  }

  let muzzle: Pt = { ...DEFAULT_META.muzzle };
  if (tipX >= 0) {
    // y ujung = rata-rata baris solid pada beberapa kolom terakhir (laras)
    const span = Math.max(6, Math.floor(cw * 0.035));
    let sumY = 0;
    let n = 0;
    for (let x = Math.max(x0, tipX - span); x <= tipX; x++) {
      for (let y = rowLo; y <= rowHi; y++) {
        if (A(x, y) > 200) {
          sumY += y;
          n++;
        }
      }
    }
    const tipY = n > 0 ? sumY / n : y0 + ch * 0.4;
    muzzle = {
      x: Math.min(1, Math.max(0, (tipX - x0 + 1) / cw)),
      y: Math.min(1, Math.max(0, (tipY - y0) / ch)),
    };
  }

  // Titik dada: pusat massa piksel di band 24%-50% tinggi, digeser ke tengah
  const cLo = y0 + Math.floor(ch * 0.24);
  const cHi = y0 + Math.floor(ch * 0.5);
  let sx = 0;
  let sn = 0;
  for (let y = cLo; y <= cHi; y++) {
    for (let x = x0; x <= x1; x++) {
      if (A(x, y) > 200) {
        sx += x;
        sn++;
      }
    }
  }
  const meanX = sn > 0 ? (sx / sn - x0) / cw : 0.5;
  const chest: Pt = { x: 0.5 * meanX + 0.5 * 0.5, y: 0.36 };
  return { muzzle, chest };
}

function process(img: HTMLImageElement): RobotMeta | null {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) return null;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;
  const key = sampleCorners(d, w, h);
  const mode = detectMode(key);
  if (mode === "none") return null;

  const LO = mode === "color" ? 14 : 26;
  const HI = mode === "color" ? 46 : 78;

  let minX = w,
    minY = h,
    maxX = -1,
    maxY = -1;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i],
      g = d[i + 1],
      b = d[i + 2];
    let score: number;
    if (mode === "green") {
      score = g - Math.max(r, b);
      if (score > 0) d[i + 1] = Math.max(r, b); // despill
    } else if (mode === "magenta") {
      score = Math.min(r, b) - g;
      if (score > 0) {
        d[i] = r - score;
        d[i + 2] = b - score;
      }
    } else {
      const dist = Math.sqrt((r - key.r) ** 2 + (g - key.g) ** 2 + (b - key.b) ** 2);
      score = HI + LO - dist;
    }

    let alpha = 255;
    if (score >= HI) alpha = 0;
    else if (score > LO) alpha = Math.round(255 * (1 - (score - LO) / (HI - LO)));
    d[i + 3] = alpha;

    if (alpha > 12) {
      const px = (i / 4) % w;
      const py = Math.floor(i / 4 / w);
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    }
  }

  if (maxX < 0) return null;
  ctx.putImageData(imageData, 0, 0);

  const pad = 6;
  const cx = Math.max(0, minX - pad);
  const cy = Math.max(0, minY - pad);
  const cw = Math.min(w, maxX + pad) - cx;
  const ch = Math.min(h, maxY + pad) - cy;

  // Analisis siluet dalam koordinat crop
  const { muzzle, chest } = analyzeSilhouette(d, w, cx, cy, cx + cw - 1, cy + ch - 1);

  const out = document.createElement("canvas");
  out.width = cw;
  out.height = ch;
  const octx = out.getContext("2d");
  if (!octx) return null;
  octx.drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);
  return { url: out.toDataURL("image/png"), aspect: cw / ch, muzzle, chest };
}

export function keyedMeta(src: string): Promise<RobotMeta> {
  const existing = cache.get(src);
  if (existing) return existing;
  const p = new Promise<RobotMeta>((resolve) => {
    const img = new Image();
    const done = (m: RobotMeta) => {
      resolved.set(src, m);
      resolve(m);
    };
    img.onload = () => {
      try {
        const m = process(img);
        done(
          m ?? {
            url: src,
            ...DEFAULT_META,
            aspect: img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : DEFAULT_META.aspect,
          }
        );
      } catch {
        done({ url: src, ...DEFAULT_META });
      }
    };
    img.onerror = () => done({ url: src, ...DEFAULT_META });
    img.src = src;
  });
  cache.set(src, p);
  return p;
}

export function preloadKeyed(srcs: string[]) {
  srcs.forEach((s) => void keyedMeta(s));
}

/** Meta robot (url bersih + titik moncong/dada). null selama masih diproses. */
export function useKeyedMeta(src: string): RobotMeta | null {
  const [meta, setMeta] = useState<RobotMeta | null>(() => resolved.get(src) ?? null);
  useEffect(() => {
    let alive = true;
    const r = resolved.get(src);
    if (r) {
      setMeta(r);
      return;
    }
    keyedMeta(src).then((m) => {
      if (alive) setMeta(m);
    });
    return () => {
      alive = false;
    };
  }, [src]);
  return meta;
}
