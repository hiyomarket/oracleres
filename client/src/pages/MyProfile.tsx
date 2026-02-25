/**
 * MyProfile.tsx
 * 個人命格資料填寫頁（重設計版）：
 * - 只需填寫：姓名、出生日期、出生時辰、出生地
 * - 系統自動推算四柱八字、五行命格、喜忌神
 * - 顯示已計算的命格結果（唯讀）
 * - 提供「重新推算」按鈕
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  User, Save, ArrowLeft, Loader2, Sparkles,
  RefreshCw, MapPin, Calendar, ChevronDown, ChevronUp, AlertTriangle, Trash2
} from "lucide-react";
import { Link, useLocation } from "wouter";

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

const ELEMENT_ZH: Record<string, string> = {
  wood: '木', fire: '火', earth: '土', metal: '金', water: '水'
};

const ELEMENT_COLORS: Record<string, string> = {
  wood:  "text-green-400",
  fire:  "text-red-400",
  earth: "text-yellow-500",
  metal: "text-slate-300",
  water: "text-blue-400",
};

// 從 birthTime 字串（HH:MM）推算時辰索引
function birthTimeToHourIndex(birthTime: string): number | null {
  if (!birthTime) return null;
  const [hourStr] = birthTime.split(':');
  const hour = parseInt(hourStr, 10);
  if (hour === 23 || hour === 0) return 0;   // 子
  if (hour === 1  || hour === 2) return 1;   // 丑
  if (hour === 3  || hour === 4) return 2;   // 寅
  if (hour === 5  || hour === 6) return 3;   // 卯
  if (hour === 7  || hour === 8) return 4;   // 辰
  if (hour === 9  || hour === 10) return 5;  // 巳
  if (hour === 11 || hour === 12) return 6;  // 午
  if (hour === 13 || hour === 14) return 7;  // 未
  if (hour === 15 || hour === 16) return 8;  // 申
  if (hour === 17 || hour === 18) return 9;  // 酉
  if (hour === 19 || hour === 20) return 10; // 戌
  if (hour === 21 || hour === 22) return 11; // 亥
  return null;
}

// ─── 農曆即時換算提示元件 ────────────────────────────────────────────────────
function LunarDateHint({ solarDate }: { solarDate: string }) {
  const { data, isFetching } = trpc.utils.toLunar.useQuery(
    { date: solarDate },
    { enabled: !!solarDate && solarDate.length === 10 }
  );
  if (!solarDate || solarDate.length < 10) {
    return (
      <p className="text-xs text-slate-600 mt-1.5 pl-1">
        輸入陽曆生日後將自動換算農曆
      </p>
    );
  }
  if (isFetching) {
    return <p className="text-xs text-amber-500/60 mt-1.5 pl-1 animate-pulse">換算農曆中...</p>;
  }
  if (!data?.lunarString) return null;
  return (
    <p className="text-xs text-amber-400/80 mt-1.5 pl-1">
      🌙 {data.lunarString}
    </p>
  );
}

export default function MyProfile() {
  const { user } = useAuth();
  const { data: profile, isLoading } = trpc.account.getProfile.useQuery();
  const utils = trpc.useUtils();

  const [form, setForm] = useState({
    displayName: "",
    birthDate: "",       // YYYY-MM-DD
    birthHour: null as number | null,  // 0-11 時辰索引
    birthPlace: "",
    occupation: "",
    birthLunar: "",
    notes: "",
  });

  const [showHourPicker, setShowHourPicker] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [, navigate] = useLocation();

  // 載入現有資料
  useEffect(() => {
    if (profile) {
      const hourIndex = profile.birthTime ? birthTimeToHourIndex(profile.birthTime) : null;
      setForm({
        displayName: profile.displayName ?? "",
        birthDate: profile.birthDate ?? "",
        birthHour: hourIndex,
        birthPlace: profile.birthPlace ?? "",
        occupation: (profile as any).occupation ?? "",
        birthLunar: (profile as any).birthLunar ?? "",
        notes: profile.notes ?? "",
      });
    }
  }, [profile]);

  const deleteSelf = trpc.account.deleteSelf.useMutation({
    onSuccess: () => {
      toast.success("帳號已刪除，即將登出");
      setTimeout(() => { navigate("/"); window.location.reload(); }, 1200);
    },
    onError: (err) => toast.error(err.message),
  });

  // 儲存基本資料（不含八字計算）
  const saveProfile = trpc.account.saveProfile.useMutation({
    onSuccess: () => {
      toast.success("基本資料已儲存！");
      utils.account.getProfile.invalidate();
    },
    onError: (err) => toast.error(`儲存失敗：${err.message}`),
  });

  // 重新推算八字並儲存
  const calculateAndSave = trpc.account.calculateAndSaveBazi.useMutation({
    onSuccess: () => {
      toast.success("命格已重新推算並儲存！");
      utils.account.getProfile.invalidate();
      setRecalculating(false);
    },
    onError: (err) => {
      toast.error(`推算失敗：${err.message}`);
      setRecalculating(false);
    },
  });

  const handleSaveBasic = () => {
    saveProfile.mutate({
      displayName: form.displayName || undefined,
      birthPlace: form.birthPlace || undefined,
      occupation: form.occupation || undefined,
      birthLunar: form.birthLunar || undefined,
      notes: form.notes || undefined,
    });
  };

  const handleRecalculate = () => {
    if (!form.birthDate) {
      toast.error("請先填寫出生日期");
      return;
    }
    setRecalculating(true);
    calculateAndSave.mutate({
      birthDate: form.birthDate,
      hourIndex: form.birthHour !== null ? form.birthHour : undefined,
      displayName: form.displayName || undefined,
      birthPlace: form.birthPlace || undefined,
    });
  };

  const hasBazi = profile?.dayPillar && profile?.yearPillar;
  const selectedHourLabel = form.birthHour !== null
    ? BIRTH_HOUR_OPTIONS[form.birthHour]?.label ?? "未設定"
    : "未設定（可略過）";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="border-b border-slate-800/60 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/" className="p-2 rounded-xl hover:bg-slate-800/60 transition-colors">
            <ArrowLeft className="w-4 h-4 text-slate-400" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white">個人命格資料</h1>
            <p className="text-xs text-slate-500">{form.displayName || user?.name}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* 說明橫幅 */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/5 border border-amber-500/20 rounded-2xl px-4 py-3 flex items-start gap-3"
        >
          <Sparkles className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-300/80">
            填寫出生資料後，系統將自動推算您的四柱八字與五行命格。資料採加密儲存，僅供您個人使用。
          </p>
        </motion.div>

        {/* 基本資料 */}
        <section className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-white">基本資料</h2>
          </div>

          {/* 姓名 */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">姓名</label>
            <input
              type="text"
              value={form.displayName}
              onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
              placeholder="您的姓名"
              className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/60"
            />
          </div>

          {/* 出生地 */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">
              <MapPin className="w-3 h-3 inline mr-1" />
              出生地（選填）
            </label>
            <input
              type="text"
              value={form.birthPlace}
              onChange={e => setForm(f => ({ ...f, birthPlace: e.target.value }))}
              placeholder="例：台北市、高雄市"
              className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/60"
            />
          </div>

          {/* 職業 */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">職業（選填）</label>
            <input
              type="text"
              value={form.occupation}
              onChange={e => setForm(f => ({ ...f, occupation: e.target.value }))}
              placeholder="例：行銷 / 攝影 / 產品經理"
              className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/60"
            />
          </div>

          {/* 農曆生日 */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">農曆生日（選填）</label>
            <input
              type="text"
              value={form.birthLunar}
              onChange={e => setForm(f => ({ ...f, birthLunar: e.target.value }))}
              placeholder="例：甲子年 十月 初一日"
              className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/60"
            />
          </div>

          {/* 備註 */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">個人備註（選填）</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="其他命理資訊"
              rows={3}
              maxLength={2000}
              className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 resize-none"
            />
          </div>

          <button
            onClick={handleSaveBasic}
            disabled={saveProfile.isPending}
            className="w-full py-2.5 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saveProfile.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saveProfile.isPending ? "儲存中..." : "儲存基本資料"}
          </button>
        </section>

        {/* 出生資料與八字推算 */}
        <section className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white">出生資料與命格推算</h2>
          </div>

          {/* 出生日期 */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">出生日期 *</label>
            <input
              type="date"
              value={form.birthDate}
              onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))}
              className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/60"
            />
            <LunarDateHint solarDate={form.birthDate} />
          </div>

          {/* 出生時辰 */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">出生時辰（選填）</label>
            <button
              onClick={() => setShowHourPicker(v => !v)}
              className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-3 py-2 text-sm text-white text-left flex items-center justify-between focus:outline-none focus:border-amber-500/60"
            >
              <span className={form.birthHour !== null ? "text-amber-300" : "text-slate-500"}>
                {selectedHourLabel}
              </span>
              {showHourPicker ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {showHourPicker && (
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                <button
                  onClick={() => { setForm(f => ({ ...f, birthHour: null })); setShowHourPicker(false); }}
                  className={`flex flex-col items-center gap-0.5 p-2 rounded-xl border text-xs transition-all ${
                    form.birthHour === null
                      ? "border-amber-500/60 bg-amber-500/10 text-amber-300"
                      : "border-slate-700/50 bg-slate-800/40 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  <span className="font-medium">不確定</span>
                  <span className="text-[10px] opacity-60">可略過</span>
                </button>
                {BIRTH_HOUR_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setForm(f => ({ ...f, birthHour: opt.value })); setShowHourPicker(false); }}
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
            )}
            <p className="text-xs text-slate-600 mt-1">時辰影響時柱推算，不確定可略過</p>
          </div>

          {/* 已計算的命格（唯讀顯示） */}
          {hasBazi && (
            <div className="bg-slate-900/40 rounded-2xl p-4 border border-amber-500/10 space-y-3">
              <p className="text-xs text-slate-400 font-medium">目前命格（系統推算）</p>

              {/* 四柱 */}
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { label: "年柱", value: profile?.yearPillar },
                  { label: "月柱", value: profile?.monthPillar },
                  { label: "日柱", value: profile?.dayPillar },
                  { label: "時柱", value: profile?.hourPillar },
                ].map(col => (
                  <div key={col.label} className="bg-slate-800/60 rounded-xl p-2">
                    <p className="text-[10px] text-slate-500 mb-1">{col.label}</p>
                    <p className="text-sm font-bold text-amber-300">{col.value ?? "—"}</p>
                  </div>
                ))}
              </div>

              {/* 日主與喜忌 */}
              {profile?.dayMasterElement && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-800/60 rounded-xl p-2 text-center">
                    <p className="text-[10px] text-slate-500 mb-1">日主</p>
                    <p className={`text-sm font-bold ${ELEMENT_COLORS[profile.dayMasterElement] ?? "text-white"}`}>
                      {ELEMENT_ZH[profile.dayMasterElement] ?? profile.dayMasterElement}
                    </p>
                  </div>
                  <div className="bg-slate-800/60 rounded-xl p-2 text-center">
                    <p className="text-[10px] text-slate-500 mb-1">喜用神</p>
                    <p className="text-xs font-bold text-green-400">
                      {profile.favorableElements?.split(',').map(e => ELEMENT_ZH[e] ?? e).join('、') ?? "—"}
                    </p>
                  </div>
                  <div className="bg-slate-800/60 rounded-xl p-2 text-center">
                    <p className="text-[10px] text-slate-500 mb-1">忌神</p>
                    <p className="text-xs font-bold text-red-400">
                      {profile.unfavorableElements?.split(',').map(e => ELEMENT_ZH[e] ?? e).join('、') ?? "—"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 推算/重新推算按鈕 */}
          <button
            onClick={handleRecalculate}
            disabled={recalculating || !form.birthDate}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {recalculating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> 推算中...</>
            ) : (
              <><RefreshCw className="w-4 h-4" /> {hasBazi ? "重新推算命格" : "推算我的命格"}</>
            )}
          </button>
          {hasBazi && (
            <p className="text-xs text-slate-600 text-center">
              修改出生日期或時辰後，點擊「重新推算」更新命格
            </p>
          )}
        </section>

        {/* ── 危險區域：刪除帳號 ── */}
        <section className="border border-red-500/20 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h2 className="text-sm font-semibold text-red-400">危險區域</h2>
          </div>
          <p className="text-xs text-slate-500">
            刪除帳號將永久移除您的所有資料，包含命格資料、擲筊記錄、選號記錄等。此操作無法復原。
          </p>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              刪除我的帳號
            </button>
          ) : (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-3">
              <p className="text-sm text-red-300 font-medium">確定要刪除帳號嗎？此操作無法復原。</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-700/50 text-slate-300 text-sm hover:bg-slate-700 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => deleteSelf.mutate()}
                  disabled={deleteSelf.isPending}
                  className="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {deleteSelf.isPending
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />}
                  確認刪除
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
