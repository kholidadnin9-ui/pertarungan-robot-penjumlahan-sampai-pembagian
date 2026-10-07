import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Lock,
  RotateCcw,
  Wrench,
  ListChecks,
  Info,
} from "lucide-react";
import cityBg from "@/assets/city-bg.jpg";
import { HudRound, NeonButton, Panel } from "./ui";
import { type LevelConfig, type MathOp } from "@/game/levels";
import { levelsForOp } from "@/game/storage";
import {
  answerOf,
  bankCount,
  bankKey,
  expressionOf,
  makeOptions,
  opLabel,
  uid,
  validateQuestion,
  type CustomQuestion,
  type QuizBank,
} from "@/game/quizBank";
import { sfx } from "@/game/audio";
import { cn } from "@/utils/cn";

interface Props {
  op: MathOp;
  bank: QuizBank;
  onChange: (b: QuizBank) => void;
  onOpChange: (op: MathOp) => void;
  onBack: () => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-display text-[11px] font-bold tracking-widest text-cyan-200">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border-2 border-cyan-300/40 bg-[#04101f] px-3 py-2 font-display text-lg font-bold text-white outline-none focus:border-yellow-300/80";

const OPS: { op: MathOp; label: string; color: string }[] = [
  { op: "+", label: "+ Penjumlahan", color: "#facc15" },
  { op: "−", label: "− Pengurangan", color: "#4ade80" },
  { op: "×", label: "× Perkalian", color: "#f472b6" },
  { op: "÷", label: "÷ Pembagian", color: "#22d3ee" },
];

export function AdminScreen({ op, bank, onChange, onOpChange, onBack }: Props) {
  const [lvl, setLvl] = useState(1);
  const levels: LevelConfig[] = levelsForOp(op);
  const level = levels.find((l) => l.id === lvl) ?? levels[0];
  const maxAns = op === "×" ? 144 : op === "÷" ? 10 : 100;
  const key = bankKey(op, lvl);

  const [aStr, setAStr] = useState("");
  const [bStr, setBStr] = useState("");
  const [opts, setOpts] = useState(["", "", ""]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const list: CustomQuestion[] = bank[key] ?? [];
  const answerPreview = useMemo(() => {
    const a = parseInt(aStr, 10);
    const b = parseInt(bStr, 10);
    if (!Number.isInteger(a) || !Number.isInteger(b)) return null;
    if (op === "+") {
      const ans = a + b;
      return ans >= 2 && ans <= 100 ? ans : null;
    }
    if (op === "−") {
      const ans = a - b;
      return ans >= 1 && ans <= 100 ? ans : null;
    }
    if (op === "×") {
      const ans = a * b;
      return ans >= 1 && ans <= 144 ? ans : null;
    }
    if (b === 0 || a % b !== 0) return null;
    const ans = a / b;
    return ans >= 1 && ans <= 10 ? ans : null;
  }, [aStr, bStr, op]);

  const showToast = (t: string) => {
    setToast(t);
    window.setTimeout(() => setToast(null), 2200);
  };

  const resetForm = () => {
    setAStr("");
    setBStr("");
    setOpts(["", "", ""]);
    setEditingId(null);
    setFormErr(null);
  };

  const startEdit = (q: CustomQuestion) => {
    sfx.click();
    setEditingId(q.id);
    setAStr(String(q.a));
    setBStr(String(q.b));
    setOpts(q.options.map(String));
    setFormErr(null);
  };

  const submit = () => {
    const a = parseInt(aStr, 10);
    const b = parseInt(bStr, 10);
    let o = opts.map((s) => parseInt(s, 10));
    // Jika pilihan belum terisi lengkap dan jawaban valid, isi otomatis di sini
    // (bukan lewat setState karena submit berjalan pada tick yang sama)
    const ans = Number.isInteger(a) && Number.isInteger(b) && b !== 0 ? answerOf(op, a, b) : null;
    if (
      o.some((v) => Number.isNaN(v)) &&
      ans != null &&
      ans >= 1 &&
      ans <= maxAns &&
      (op !== "÷" || a % b === 0)
    ) {
      o = makeOptions(ans, maxAns);
    }
    const err = validateQuestion(op, a, b, o);
    if (err) {
      setFormErr(err);
      sfx.wrong();
      return;
    }
    const next = { ...bank };
    const current = [...(next[key] ?? [])];
    if (editingId) {
      const idx = current.findIndex((q) => q.id === editingId);
      const q: CustomQuestion = { id: editingId, op, a, b, options: o };
      if (idx >= 0) current[idx] = q;
      else current.push(q);
      next[key] = current;
      sfx.select();
      showToast(`Soal ${expressionOf(op, a, b)} diperbarui`);
    } else {
      current.push({ id: uid(), op, a, b, options: o });
      next[key] = current;
      sfx.select();
      showToast(`Soal ${expressionOf(op, a, b)} ditambahkan ke Level ${lvl}`);
    }
    onChange(next);
    resetForm();
  };

  const doDelete = (id: string) => {
    sfx.click();
    const current = (bank[key] ?? []).filter((q) => q.id !== id);
    const next = { ...bank };
    if (current.length) next[key] = current;
    else delete next[key];
    onChange(next);
    setConfirmDel(null);
    if (editingId === id) resetForm();
    showToast("Soal dihapus");
  };

  const doResetLevel = () => {
    sfx.click();
    const next = { ...bank };
    delete next[key];
    onChange(next);
    setConfirmReset(false);
    if (list.length) resetForm();
    showToast(`Level ${lvl} kembali memakai soal otomatis`);
  };

  return (
    <div className="relative h-full w-full overflow-hidden font-body text-white">
      <img src={cityBg} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      <div className="absolute inset-0 bg-[#06101c]/85" />
      <div className="scanlines pointer-events-none absolute inset-0 opacity-40" />

      {/* Header */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-6 pt-5">
        <NeonButton color="slate" size="sm" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" /> Menu
        </NeonButton>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-yellow-300 bg-yellow-300/20">
            <Wrench className="h-6 w-6 text-yellow-300" />
          </div>
          <div>
            <h1 className="font-display text-[30px] font-black tracking-widest text-yellow-300 text-glow-yellow">
              MENU ADMIN
            </h1>
            <div className="text-sm text-slate-300">Kelola soal {opLabel(op)}</div>
          </div>
          <div className="ml-2 flex items-center gap-1 rounded-lg bg-black/40 px-3 py-1.5 font-display text-xs text-cyan-200">
            <Lock className="h-3.5 w-3.5" /> TERPROTEKSI PASSWORD
          </div>
        </div>
        <div className="flex justify-end gap-2">
          {OPS.map(({ op: o, label, color }) => (
            <button
              key={o}
              type="button"
              aria-pressed={op === o}
              onClick={() => {
                if (op === o) return;
                sfx.select();
                setLvl(1);
                resetForm();
                setConfirmReset(false);
                onOpChange(o);
              }}
              className={cn(
                "rounded-lg border-2 px-3 py-1.5 font-display text-[13px] font-bold transition-all",
                op !== o && "border-white/15 bg-black/30 text-slate-300 hover:border-cyan-300/50"
              )}
              style={
                op === o
                  ? { borderColor: color, color, background: `${color}22` }
                  : undefined
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Konten */}
      <div className="absolute inset-x-0 bottom-4 top-[112px] flex justify-center gap-4 px-4">
        {/* Pilih level */}
        <Panel className="flex w-[270px] flex-col p-3">
          <div className="mb-2 flex items-center gap-2 font-display text-[13px] font-bold tracking-widest text-cyan-200">
            <ListChecks className="h-4 w-4" />
            PILIH LEVEL
          </div>
          <div className="flex flex-col gap-2 overflow-y-auto">
            {levels.map((lv) => {
              const count = bankCount(bank, op, lv.id);
              const active = lv.id === lvl;
              return (
                <button
                  key={lv.id}
                  type="button"
                  onClick={() => {
                    sfx.click();
                    setLvl(lv.id);
                    resetForm();
                  }}
                  className={cn(
                    "flex items-center justify-between rounded-xl border-2 px-3 py-2.5 text-left transition-all",
                    active
                      ? "border-yellow-300 bg-yellow-300/10 shadow-[0_0_16px_rgba(250,204,21,0.35)]"
                      : "border-white/10 bg-black/30 hover:border-cyan-300/40"
                  )}
                >
                  <div>
                    <div className="font-display text-[15px] font-bold">
                      <span className={active ? "text-yellow-300" : "text-cyan-200"}>LEVEL {lv.id}</span>
                      <span className="ml-2 text-slate-300">{lv.name}</span>
                    </div>
                    <div className="text-xs text-slate-400">{lv.subtitle}</div>
                  </div>
                  <span
                    className={cn(
                      "rounded-md px-2 py-1 font-display text-[11px] font-bold",
                      count > 0 ? "bg-yellow-400 text-black" : "bg-white/10 text-slate-300"
                    )}
                  >
                    {count > 0 ? `${count} SOAL` : "AUTO"}
                  </span>
                </button>
              );
            })}
          </div>
        </Panel>

        {/* Daftar soal */}
        <Panel className="flex flex-1 flex-col p-4">
          <div className="flex items-center justify-between">
            <div className="font-display text-[17px] font-bold tracking-wide text-white">
              SOAL LEVEL {level.id} <span className="text-slate-400">— {level.name}</span>
              <span
                className="ml-3 font-display text-[11px] font-bold tracking-widest"
                style={{ color: OPS.find((o) => o.op === op)?.color ?? "#7dd3fc" }}
              >
                {opLabel(op).toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "rounded-md px-2.5 py-1 font-display text-[12px] font-bold",
                  list.length > 0 ? "bg-yellow-400 text-black" : "bg-white/10 text-slate-300"
                )}
              >
                {list.length > 0 ? `${list.length} SOAL CUSTOM` : "Otomatis"}
              </span>
              {!confirmReset ? (
                <button
                  type="button"
                  disabled={list.length === 0}
                  onClick={() => {
                    sfx.click();
                    setConfirmReset(true);
                  }}
                  className={cn(
                    "flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-semibold",
                    list.length === 0
                      ? "cursor-not-allowed border-white/10 text-slate-500"
                      : "border-rose-300/50 text-rose-200 hover:bg-rose-400/10"
                  )}
                >
                  <RotateCcw className="h-4 w-4" /> Kosongkan (auto)
                </button>
              ) : (
                <div className="flex items-center gap-1.5 rounded-lg border border-rose-300/60 bg-rose-950/60 px-2.5 py-1 text-sm">
                  <span className="text-rose-200">Hapus semua soal level ini?</span>
                  <button type="button" className="rounded bg-rose-500 px-2 py-0.5 font-bold" onClick={doResetLevel}>
                    Ya
                  </button>
                  <button
                    type="button"
                    className="rounded bg-white/10 px-2 py-0.5"
                    onClick={() => setConfirmReset(false)}
                  >
                    Batal
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-1 flex items-center gap-2 rounded-lg bg-black/30 px-3 py-1.5 text-[13px] text-slate-300">
            <Info className="h-4 w-4 shrink-0 text-cyan-300" />
            {list.length === 0
              ? `Belum ada soal custom. Level ini memakai soal pembangkit otomatis. Tambahkan soal di panel kanan.`
              : list.length >= level.questions
                ? `Ada ${list.length} soal — 10 soal akan dipilih secara acak setiap main.`
                : `Ada ${list.length} soal — soal akan diacak dan dipakai ulang bergiliran sampai 10 soal.`}
            {op !== "÷" && (
              <span
                className="ml-auto shrink-0 rounded px-2 py-0.5 font-display text-[11px] font-bold"
                style={{
                  background: `${OPS.find((o) => o.op === op)?.color ?? "#facc15"}22`,
                  color: OPS.find((o) => o.op === op)?.color ?? "#facc15",
                }}
              >
                {level.subtitle} • maks {maxAns}
              </span>
            )}
          </div>

          <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1" style={{ maxHeight: 430 }}>
            {list.length === 0 && (
              <div className="flex h-full min-h-[160px] flex-col items-center justify-center text-slate-500">
                <ListChecks className="mb-2 h-10 w-10" />
                Belum ada soal custom di level ini.
              </div>
            )}
            {list.map((q, i) => {
              const ans = answerOf(q.op, q.a, q.b);
              return (
                <div
                  key={q.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-3 py-2",
                    editingId === q.id ? "border-yellow-300 bg-yellow-300/10" : "border-white/10 bg-black/30"
                  )}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 font-display text-[12px] font-bold text-cyan-200">
                    {i + 1}
                  </span>
                  <span className="font-display text-[22px] font-black text-white">
                    {q.a} <span className={q.op === "+" ? "text-yellow-300" : "text-cyan-300"}>{q.op}</span> {q.b}
                    <span className="ml-3 text-emerald-300">= {ans}</span>
                  </span>
                  <div className="flex gap-1.5">
                    {q.options.map((o, j) => (
                      <span
                        key={j}
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full border font-display text-[14px] font-bold",
                          o === ans
                            ? "border-emerald-300 bg-emerald-400/20 text-emerald-200"
                            : "border-white/20 bg-white/5 text-slate-300"
                        )}
                      >
                        {o}
                      </span>
                    ))}
                  </div>
                  <div className="ml-auto flex items-center gap-1.5">
                    {confirmDel === q.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => doDelete(q.id)}
                          className="flex items-center gap-1 rounded-lg bg-rose-500 px-2.5 py-1.5 text-sm font-bold text-white hover:bg-rose-400"
                        >
                          <Check className="h-4 w-4" /> Ya
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDel(null)}
                          className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-sm hover:bg-white/20"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <HudRound size={40} onClick={() => startEdit(q)} title="Edit" style={{ borderColor: "rgba(125,211,252,0.6)" }}>
                          <Pencil className="h-4 w-4" />
                        </HudRound>
                        <HudRound
                          size={40}
                          onClick={() => {
                            sfx.click();
                            setConfirmDel(q.id);
                          }}
                          title="Hapus"
                          style={{ borderColor: "rgba(251,113,133,0.7)" }}
                        >
                          <Trash2 className="h-4 w-4 text-rose-300" />
                        </HudRound>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Form tambah / edit */}
        <Panel className={cn("flex w-[330px] flex-col p-4", editingId && "border-2 border-yellow-300")}>
          <div className="flex items-center justify-between">
            <div className="font-display text-[15px] font-bold tracking-wide">
              {editingId ? (
                <span className="text-yellow-300">EDIT SOAL</span>
              ) : (
                <span className="text-cyan-200">TAMBAH SOAL</span>
              )}
            </div>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-xs hover:bg-white/20"
              >
                <X className="h-3.5 w-3.5" /> Batal
              </button>
            )}
          </div>

          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field
                label={
                  op === "+"
                    ? "ANGKA PERTAMA (1-99)"
                    : op === "−"
                      ? "ANGKA AWAL (2-100)"
                      : op === "×"
                        ? "FAKTOR 1 (1-12)"
                        : "ANGKA DIBAGI (1-99)"
                }
              >
                <input
                  className={inputCls}
                  inputMode="numeric"
                  value={aStr}
                  onChange={(e) => setAStr(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
                  placeholder={op === "+" ? "36" : op === "−" ? "72" : op === "×" ? "7" : "24"}
                />
              </Field>
              <Field
                label={
                  op === "+"
                    ? "ANGKA KEDUA (1-99)"
                    : op === "−"
                      ? "PENGURANG (1-99)"
                      : op === "×"
                        ? "FAKTOR 2 (1-12)"
                        : "PEMBAGI (1-10)"
                }
              >
                <input
                  className={inputCls}
                  inputMode="numeric"
                  value={bStr}
                  onChange={(e) =>
                    setBStr(e.target.value.replace(/[^0-9]/g, "").slice(0, op === "÷" ? 1 : 2))
                  }
                  placeholder={op === "+" ? "27" : op === "−" ? "48" : op === "×" ? "8" : "4"}
                />
              </Field>
            </div>

            <div
              className={cn(
                "flex items-center justify-between rounded-lg border-2 px-3 py-2",
                answerPreview != null ? "border-emerald-300/60 bg-emerald-400/10" : "border-white/15 bg-black/30"
              )}
            >
              <span className="font-display text-[12px] font-bold tracking-widest text-slate-300">JAWABAN</span>
              <span className="font-display text-[24px] font-black text-emerald-300">{answerPreview ?? "—"}</span>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="font-display text-[11px] font-bold tracking-widest text-cyan-200">
                  3 PILIHAN JAWABAN
                </span>
                <button
                  type="button"
                  className="rounded bg-cyan-400/20 px-2 py-0.5 text-[11px] font-bold text-cyan-200 hover:bg-cyan-400/30"
                  onClick={() => {
                    if (answerPreview != null && answerPreview >= 1 && answerPreview <= maxAns) {
                      sfx.click();
                      setOpts(makeOptions(answerPreview, maxAns).map(String));
                    }
                  }}
                >
                  Isi otomatis
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {opts.map((o, i) => (
                  <input
                    key={i}
                    className={cn(inputCls, "text-center")}
                    inputMode="numeric"
                    value={o}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9]/g, "").slice(0, 2);
                      setOpts((prev) => prev.map((p, j) => (j === i ? v : p)));
                    }}
                    placeholder={["A", "B", "C"][i]}
                  />
                ))}
              </div>
            </div>

            {formErr && (
              <div className="anim-wrong rounded-lg border border-rose-300/60 bg-rose-950/60 px-3 py-2 text-[13px] text-rose-200">
                {formErr}
              </div>
            )}

            <NeonButton color={editingId ? "pink" : "yellow"} className="w-full" onClick={submit}>
              {editingId ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              {editingId ? "Simpan Perubahan" : "Tambah Soal"}
            </NeonButton>
          </div>

          <div className="mt-3 rounded-lg bg-black/30 px-3 py-2 text-[12px] leading-relaxed text-slate-400">
            {op === "+" ? (
              <>
                Contoh: <b className="text-yellow-200">36 + 27</b> → jawaban 63, pilihan: 63, 62, 61. Hasil penjumlahan
                maksimal <b className="text-yellow-200">100</b>. Soal ini akan dipakai pada Level {lvl} (penjumlahan).
              </>
            ) : op === "−" ? (
              <>
                Contoh: <b className="text-emerald-200">72 − 48</b> → jawaban 24, pilihan: 24, 26, 22. Angka
                pengurang harus lebih kecil (hasil minimal 1). Soal ini akan dipakai pada Level {lvl}{" "}
                (pengurangan).
              </>
            ) : op === "×" ? (
              <>
                Contoh: <b className="text-pink-200">7 × 8</b> → jawaban 56, pilihan: 56, 54, 55. Perkalian tabel
                1-12 (hasil maksimal 144). Soal ini akan dipakai pada Level {lvl} (perkalian).
              </>
            ) : (
              <>
                Contoh: <b className="text-cyan-200">24 ÷ 4</b> → jawaban 6, pilihan: 6, 5, 7. Soal ini akan dipakai
                pada Level {lvl} (pembagian).
              </>
            )}
          </div>
        </Panel>
      </div>

      {/* Toast */}
      {toast && (
        <div className="anim-pop absolute bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border-2 border-emerald-300/70 bg-emerald-950/90 px-5 py-2.5 font-display text-[15px] font-bold text-emerald-200 shadow-[0_0_24px_rgba(34,197,94,0.4)]">
          {toast}
        </div>
      )}
    </div>
  );
}
