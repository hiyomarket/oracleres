/**
 * OnboardingModal.tsx
 * 首次登入引導彈窗：命格資料未填寫時，引導用戶填寫最關鍵的命格資訊
 * 採用精簡版表單（3步驟），填寫完成後自動關閉
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Sparkles, ChevronRight, ChevronLeft, Check, Loader2, User, Calendar, Flame } from "lucide-react";

interface OnboardingModalProps {
  onComplete: () => void;
}

const ELEMENT_OPTIONS = [
  { value: "wood", label: "木", emoji: "🌳", desc: "甲、乙日主" },
  { value: "fire", label: "火", emoji: "🔥", desc: "丙、丁日主" },
  { value: "earth", label: "土", emoji: "🌍", desc: "戊、己日主" },
  { value: "metal", label: "金", emoji: "⚪", desc: "庚、辛日主" },
  { value: "water", label: "水", emoji: "🌊", desc: "壬、癸日主" },
] as const;

const FAVORABLE_OPTIONS = [
  { value: "wood", label: "木", emoji: "🌳" },
  { value: "fire", label: "火", emoji: "🔥" },
  { value: "earth", label: "土", emoji: "🌍" },
  { value: "metal", label: "金", emoji: "⚪" },
  { value: "water", label: "水", emoji: "🌊" },
] as const;

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    displayName: "",
    birthDate: "",
    dayMasterElement: "" as "" | "wood" | "fire" | "earth" | "metal" | "water",
    favorableElements: [] as string[],
  });
  const [saving, setSaving] = useState(false);

  const utils = trpc.useUtils();
  const saveProfile = trpc.account.saveProfile.useMutation({
    onSuccess: () => {
      utils.account.getProfile.invalidate();
      toast.success("命格資料已儲存！天命共振系統已為您個人化。");
      onComplete();
    },
    onError: (err) => {
      toast.error("儲存失敗：" + err.message);
      setSaving(false);
    },
  });

  const toggleFavorable = (val: string) => {
    setForm(f => ({
      ...f,
      favorableElements: f.favorableElements.includes(val)
        ? f.favorableElements.filter(e => e !== val)
        : [...f.favorableElements, val],
    }));
  };

  const handleSubmit = () => {
    if (!form.displayName.trim()) {
      toast.error("請填寫您的姓名");
      return;
    }
    setSaving(true);
    saveProfile.mutate({
      displayName: form.displayName.trim() || undefined,
      birthDate: form.birthDate || undefined,
      dayMasterElement: form.dayMasterElement || undefined,
      favorableElements: form.favorableElements.length > 0
        ? form.favorableElements.join(",")
        : undefined,
    });
  };

  const canNext = () => {
    if (step === 1) return form.displayName.trim().length > 0;
    if (step === 2) return true; // 出生日期可選填
    if (step === 3) return true; // 命格可選填
    return true;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-[#0f0f1a] border border-amber-500/20 rounded-3xl overflow-hidden shadow-2xl"
      >
        {/* 頂部進度條 */}
        <div className="flex gap-1 p-4 pb-0">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                s <= step ? "bg-amber-400" : "bg-slate-700"
              }`}
            />
          ))}
        </div>

        <div className="p-6">
          {/* 標題 */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6 text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-white">建立您的命格檔案</h2>
            <p className="text-slate-400 text-sm mt-1">
              填寫命格資料，讓系統為您提供個人化的天命分析
            </p>
          </div>

          <AnimatePresence mode="wait">
            {/* 步驟 1：姓名 */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-3">
                  <User className="w-4 h-4" />
                  <span>步驟 1 / 3：您的姓名</span>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">姓名 *</label>
                  <input
                    type="text"
                    value={form.displayName}
                    onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                    placeholder="請輸入您的姓名"
                    className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/60 text-sm"
                    autoFocus
                  />
                  <p className="text-xs text-slate-500 mt-1.5">
                    此名稱將顯示在系統各頁面中
                  </p>
                </div>
              </motion.div>
            )}

            {/* 步驟 2：出生日期 */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-3">
                  <Calendar className="w-4 h-4" />
                  <span>步驟 2 / 3：出生日期（選填）</span>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">出生日期</label>
                  <input
                    type="date"
                    value={form.birthDate}
                    onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))}
                    className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/60 text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-1.5">
                    出生日期用於計算更精確的命格分析，可稍後在「我的命格」頁面補填
                  </p>
                </div>
              </motion.div>
            )}

            {/* 步驟 3：命格設定 */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-3">
                  <Flame className="w-4 h-4" />
                  <span>步驟 3 / 3：命格設定（選填）</span>
                </div>

                {/* 日主五行 */}
                <div>
                  <label className="text-xs text-slate-400 mb-2 block">日主五行</label>
                  <div className="grid grid-cols-5 gap-2">
                    {ELEMENT_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setForm(f => ({
                          ...f,
                          dayMasterElement: f.dayMasterElement === opt.value ? "" : opt.value,
                        }))}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs transition-all ${
                          form.dayMasterElement === opt.value
                            ? "border-amber-500/60 bg-amber-500/10 text-amber-300"
                            : "border-slate-700/50 bg-slate-800/40 text-slate-400 hover:border-slate-600"
                        }`}
                      >
                        <span className="text-lg">{opt.emoji}</span>
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    日主即您八字中「日柱天干」的五行屬性
                  </p>
                </div>

                {/* 喜用神 */}
                <div>
                  <label className="text-xs text-slate-400 mb-2 block">喜用神五行（可多選）</label>
                  <div className="grid grid-cols-5 gap-2">
                    {FAVORABLE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => toggleFavorable(opt.value)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs transition-all ${
                          form.favorableElements.includes(opt.value)
                            ? "border-green-500/60 bg-green-500/10 text-green-300"
                            : "border-slate-700/50 bg-slate-800/40 text-slate-400 hover:border-slate-600"
                        }`}
                      >
                        <span className="text-lg">{opt.emoji}</span>
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    喜用神是您命格中最需要補充的五行能量
                  </p>
                </div>

                <p className="text-xs text-slate-500 bg-slate-800/40 rounded-xl p-3">
                  💡 不確定命格？可先略過，稍後在「我的命格」頁面詳細填寫，或諮詢命理師後再填入。
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 按鈕區 */}
          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-700/50 text-slate-400 text-sm hover:border-slate-600 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                上一步
              </button>
            )}

            {step < 3 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canNext()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                下一步
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> 儲存中...</>
                ) : (
                  <><Check className="w-4 h-4" /> 完成設定</>
                )}
              </button>
            )}
          </div>

          {/* 略過連結 */}
          <div className="text-center mt-3">
            <button
              onClick={onComplete}
              className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
            >
              稍後再填寫
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
