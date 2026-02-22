/**
 * OnboardingModal.tsx
 * 首次登入引導彈窗：用戶只需填寫姓名、出生年月日時辰、出生地
 * 系統自動推算四柱八字、五行命格、喜忌神
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Sparkles, ChevronRight, ChevronLeft, Check, Loader2,
  User, Calendar, MapPin, Wand2
} from "lucide-react";

interface OnboardingModalProps {
  onComplete: () => void;
}

const BIRTH_HOUR_OPTIONS = [
  { value: 0,  label: "子時", desc: "23:00–01:00" },
  { value: 1,  label: "丑時", desc: "01:00–03:00" },
  { value: 2,  label: "寅時", desc: "03:00–05:00" },
  { value: 3,  label: "卯時", desc: "05:00–07:00" },
  { value: 4,  label: "辰時", desc: "07:00–09:00" },
  { value: 5,  label: "巳時", desc: "09:00–11:00" },
  { value: 6,  label: "午時", desc: "11:00–13:00" },
  { value: 7,  label: "未時", desc: "13:00–15:00" },
  { value: 8,  label: "申時", desc: "15:00–17:00" },
  { value: 9,  label: "酉時", desc: "17:00–19:00" },
  { value: 10, label: "戌時", desc: "19:00–21:00" },
  { value: 11, label: "亥時", desc: "21:00–23:00" },
];

const ELEMENT_COLORS: Record<string, string> = {
  wood:  "text-green-400",
  fire:  "text-red-400",
  earth: "text-yellow-500",
  metal: "text-slate-300",
  water: "text-blue-400",
};

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    displayName: "",
    birthDate: "",       // YYYY-MM-DD，空字串表示未填
    birthHour: null as number | null,   // 0-11 時辰索引，null = 不確定
    birthPlace: "",
  });
  // 是否已點擊「推算命格」並進入步驟3
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const utils = trpc.useUtils();

  // previewBazi 是 query，只在 showPreview && birthDate 有值時才啟用
  const previewQuery = trpc.account.previewBazi.useQuery(
    {
      birthDate: form.birthDate || "2000-01-01", // 提供 fallback 避免 TS 報錯
      hourIndex: form.birthHour !== null ? form.birthHour : undefined,
    },
    {
      enabled: showPreview && form.birthDate.length === 10,
      retry: false,
    }
  );

  const calculateAndSave = trpc.account.calculateAndSaveBazi.useMutation({
    onSuccess: () => {
      utils.account.getProfile.invalidate();
      toast.success("命格推算完成！天命共振系統已為您個人化。");
      onComplete();
    },
    onError: (err: { message: string }) => {
      toast.error("儲存失敗：" + err.message);
      setSaving(false);
    },
  });

  const handleCalculate = () => {
    if (!form.birthDate) {
      toast.error("請填寫出生日期");
      return;
    }
    setShowPreview(true);
    setStep(3);
  };

  const handleSubmit = () => {
    if (!form.birthDate) {
      toast.error("請填寫出生日期");
      return;
    }
    setSaving(true);
    calculateAndSave.mutate({
      birthDate: form.birthDate,
      hourIndex: form.birthHour !== null ? form.birthHour : undefined,
      displayName: form.displayName.trim() || undefined,
      birthPlace: form.birthPlace.trim() || undefined,
    });
  };

  const canNext = () => {
    if (step === 1) return form.displayName.trim().length > 0;
    return true;
  };

  const baziPreview = previewQuery.data;
  const isLoadingPreview = showPreview && previewQuery.isLoading;

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
              只需填寫基本資料，系統將自動推算您的四柱八字與命格
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

            {/* 步驟 2：出生資料 */}
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
                  <span>步驟 2 / 3：出生資料</span>
                </div>

                {/* 出生日期 */}
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">出生日期 *</label>
                  <input
                    type="date"
                    value={form.birthDate}
                    onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))}
                    className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/60 text-sm"
                  />
                </div>

                {/* 出生時辰 */}
                <div>
                  <label className="text-xs text-slate-400 mb-2 block">出生時辰（選填）</label>
                  <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {BIRTH_HOUR_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setForm(f => ({
                          ...f,
                          birthHour: f.birthHour === opt.value ? null : opt.value,
                        }))}
                        className={`flex flex-col items-center gap-0.5 p-2 rounded-xl border text-xs transition-all ${
                          form.birthHour === opt.value
                            ? "border-amber-500/60 bg-amber-500/10 text-amber-300"
                            : "border-slate-700/50 bg-slate-800/40 text-slate-400 hover:border-slate-600"
                        }`}
                      >
                        <span className="font-medium">{opt.label}</span>
                        <span className="text-[10px] opacity-60">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-600 mt-1.5">
                    時辰影響時柱推算，不確定可略過
                  </p>
                </div>

                {/* 出生地 */}
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">
                    <MapPin className="w-3 h-3 inline mr-1" />
                    出生地（選填）
                  </label>
                  <input
                    type="text"
                    value={form.birthPlace}
                    onChange={e => setForm(f => ({ ...f, birthPlace: e.target.value }))}
                    placeholder="例：台北市、高雄市"
                    className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/60 text-sm"
                  />
                </div>
              </motion.div>
            )}

            {/* 步驟 3：命格推算結果 */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-3">
                  <Wand2 className="w-4 h-4" />
                  <span>步驟 3 / 3：您的命格推算結果</span>
                </div>

                {isLoadingPreview ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                    <p className="text-slate-400 text-sm">正在推算您的命格...</p>
                  </div>
                ) : baziPreview ? (
                  <div className="space-y-3">
                    {/* 四柱八字 */}
                    <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/30">
                      <p className="text-xs text-slate-400 mb-2">四柱八字</p>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        {[
                          { label: "年柱", value: baziPreview.yearPillar },
                          { label: "月柱", value: baziPreview.monthPillar },
                          { label: "日柱", value: baziPreview.dayPillar },
                          { label: "時柱", value: baziPreview.hourPillar },
                        ].map(col => (
                          <div key={col.label} className="bg-slate-900/60 rounded-xl p-2">
                            <p className="text-[10px] text-slate-500 mb-1">{col.label}</p>
                            <p className="text-sm font-bold text-amber-300">{col.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 日主與喜忌 */}
                    {(() => {
                      const ELEMENT_ZH_MAP: Record<string, string> = {
                        wood: '木', fire: '火', earth: '土', metal: '金', water: '水'
                      };
                      const dmZh = ELEMENT_ZH_MAP[baziPreview.dayMasterElement] ?? baziPreview.dayMasterElement;
                      const favZh = baziPreview.favorableElements
                        .split(',').map(e => ELEMENT_ZH_MAP[e] ?? e).join('、');
                      const unfavZh = baziPreview.unfavorableElements
                        .split(',').map(e => ELEMENT_ZH_MAP[e] ?? e).join('、');
                      return (
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/30 text-center">
                            <p className="text-[10px] text-slate-500 mb-1">日主五行</p>
                            <p className={`text-sm font-bold ${ELEMENT_COLORS[baziPreview.dayMasterElement] ?? 'text-white'}`}>
                              {baziPreview.dayMasterStem}（{dmZh}）
                            </p>
                          </div>
                          <div className="bg-slate-800/40 rounded-xl p-3 border border-green-500/20 text-center">
                            <p className="text-[10px] text-slate-500 mb-1">喜用神</p>
                            <p className="text-sm font-bold text-green-400">{favZh}</p>
                          </div>
                          <div className="bg-slate-800/40 rounded-xl p-3 border border-red-500/20 text-center">
                            <p className="text-[10px] text-slate-500 mb-1">忌神</p>
                            <p className="text-sm font-bold text-red-400">{unfavZh}</p>
                          </div>
                        </div>
                      );
                    })()}

                    <p className="text-xs text-slate-500 bg-slate-800/30 rounded-xl p-3">
                      ✨ 系統已根據您的出生資料推算出命格，所有分析將以此為基礎個人化呈現。
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <p className="text-slate-400 text-sm">推算失敗，請返回重試</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 按鈕區 */}
          <div className="flex gap-3 mt-6">
            {step > 1 && step < 3 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-700/50 text-slate-400 text-sm hover:border-slate-600 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                上一步
              </button>
            )}

            {step === 1 && (
              <button
                onClick={() => setStep(2)}
                disabled={!canNext()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                下一步
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {step === 2 && (
              <button
                onClick={handleCalculate}
                disabled={!form.birthDate}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                <Wand2 className="w-4 h-4" />
                推算我的命格
              </button>
            )}

            {step === 3 && baziPreview && (
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> 儲存中...</>
                ) : (
                  <><Check className="w-4 h-4" /> 確認並完成設定</>
                )}
              </button>
            )}

            {step === 3 && !baziPreview && !isLoadingPreview && (
              <button
                onClick={() => { setShowPreview(false); setStep(2); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-700/50 text-slate-400 text-sm hover:border-slate-600 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                返回重試
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
