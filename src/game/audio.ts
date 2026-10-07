/** Efek suara sintetis dengan Web Audio API (tanpa file eksternal). */

let ctx: AudioContext | null = null;
let muted = typeof localStorage !== "undefined" && localStorage.getItem("rb_muted") === "1";

type Wave = OscillatorType;

function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function unlockAudio() {
  getCtx();
}

export function isMuted() {
  return muted;
}

export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem("rb_muted", m ? "1" : "0");
  } catch {
    /* ignore */
  }
}

interface ToneOpts {
  gain?: number;
  delay?: number;
  slideTo?: number;
  attack?: number;
}

function tone(freq: number, type: Wave, duration: number, opts: ToneOpts = {}) {
  if (muted) return;
  const c = getCtx();
  if (!c) return;
  const { gain = 0.15, delay = 0, slideTo, attack = 0.005 } = opts;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + duration);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

function noise(duration: number, gain = 0.3, delay = 0, cutoff = 1200) {
  if (muted) return;
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * duration), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 1.5;
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(cutoff * 3, t0);
  filter.frequency.exponentialRampToValueAtTime(cutoff / 4, t0 + duration);
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(filter).connect(g).connect(c.destination);
  src.start(t0);
}

export const sfx = {
  click() {
    tone(900, "square", 0.06, { gain: 0.06 });
  },
  select() {
    tone(600, "triangle", 0.08, { gain: 0.1 });
    tone(900, "triangle", 0.12, { gain: 0.1, delay: 0.07 });
  },
  correct() {
    tone(660, "sine", 0.12, { gain: 0.18 });
    tone(990, "sine", 0.22, { gain: 0.18, delay: 0.1 });
  },
  wrong() {
    tone(180, "sawtooth", 0.3, { gain: 0.12, slideTo: 80 });
  },
  laser() {
    tone(1400, "sawtooth", 0.28, { gain: 0.1, slideTo: 160 });
    tone(2200, "square", 0.15, { gain: 0.04, slideTo: 300 });
  },
  explosion() {
    noise(0.55, 0.35, 0, 900);
    tone(90, "sine", 0.4, { gain: 0.2, slideTo: 35 });
  },
  tick() {
    tone(1100, "square", 0.04, { gain: 0.05 });
  },
  countdown() {
    tone(720, "square", 0.12, { gain: 0.09 });
  },
  go() {
    tone(1000, "square", 0.25, { gain: 0.1 });
    tone(1500, "square", 0.3, { gain: 0.08, delay: 0.08 });
  },
  hint() {
    tone(1300, "sine", 0.1, { gain: 0.1 });
    tone(1800, "sine", 0.15, { gain: 0.1, delay: 0.08 });
  },
  ko() {
    noise(1.1, 0.5, 0, 600);
    noise(0.8, 0.35, 0.25, 400);
    tone(70, "sine", 0.9, { gain: 0.25, slideTo: 25 });
  },
  win() {
    [523, 659, 784, 1047, 1319].forEach((f, i) =>
      tone(f, "triangle", 0.25, { gain: 0.14, delay: i * 0.13 })
    );
    tone(1568, "triangle", 0.6, { gain: 0.14, delay: 0.7 });
  },
  lose() {
    [440, 370, 311, 220].forEach((f, i) =>
      tone(f, "sawtooth", 0.35, { gain: 0.1, delay: i * 0.22 })
    );
  },
  draw() {
    tone(500, "triangle", 0.3, { gain: 0.12 });
    tone(500, "triangle", 0.3, { gain: 0.12, delay: 0.35 });
  },
};
