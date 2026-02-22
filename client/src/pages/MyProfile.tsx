/**
 * MyProfile.tsx
 * 個人命格資料填寫頁：
 * - 姓名、出生地、出生日期、出生時間
 * - 四柱八字（可手動填寫）
 * - 日主五行、喜用神、忌神
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { User, Save, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { Link } from "wouter";

const HOUR_MAP: Record<string, string> = {
  "23:00": "子", "00:00": "子", "01:00": "丑", "02:00": "丑",
  "03:00": "寅", "04:00": "寅", "05:00": "卯", "06:00": "卯",
  "07:00": "辰", "08:00": "辰", "09:00": "巳", "10:00": "巳",
  "11:00": "午", "12:00": "午", "13:00": "未", "14:00": "未",
  "15:00": "申", "16:00": "申", "17:00": "酉", "18:00": "酉",
  "19:00": "戌", "20:00": "戌", "21:00": "亥", "22:00": "亥",
};

const ELEMENTS = [
  { value: "fire", label: "火", color: "text-orange-400 bg-orange-500/20 border-orange-500/40" },
  { value: "earth", label: "土", color: "text-yellow-500 bg-yellow-600/20 border-yellow-600/40" },
  { value: "metal", label: "金", color: "text-slate-300 bg-slate-500/20 border-slate-500/40" },
  { value: "wood", label: "木", color: "text-emerald-400 bg-emerald-500/20 border-emerald-500/40" },
  { value: "water", label: "水", color: "text-blue-400 bg-blue-500/20 border-blue-500/40" },
];

export default function MyProfile() {
  const { user } = useAuth();
  const { data: profile, isLoading } = trpc.account.getProfile.useQuery();
  const utils = trpc.useUtils();

  const [form, setForm] = useState({
    displayName: "",
    birthPlace: "",
    birthDate: "",
    birthTime: "",
    birthHour: "",
    yearPillar: "",
    monthPillar: "",
    dayPillar: "",
    hourPillar: "",
    dayMasterElement: "" as "" | "fire" | "earth" | "metal" | "wood" | "water",
    favorableElements: "",
    unfavorableElements: "",
    notes: "",
  });

  // 載入現有資料
  useEffect(() => {
    if (profile) {
      setForm({
        displayName: profile.displayName ?? "",
        birthPlace: profile.birthPlace ?? "",
        birthDate: profile.birthDate ?? "",
        birthTime: profile.birthTime ?? "",
        birthHour: profile.birthHour ?? "",
        yearPillar: profile.yearPillar ?? "",
        monthPillar: profile.monthPillar ?? "",
        dayPillar: profile.dayPillar ?? "",
        hourPillar: profile.hourPillar ?? "",
        dayMasterElement: (profile.dayMasterElement as any) ?? "",
        favorableElements: profile.favorableElements ?? "",
        unfavorableElements: profile.unfavorableElements ?? "",
        notes: profile.notes ?? "",
      });
    }
  }, [profile]);

  // 自動推算時辰
  const handleBirthTimeChange = (time: string) => {
    const hour = time.split(":")[0];
    const key = `${hour.padStart(2, "0")}:00`;
    const earthlyBranch = HOUR_MAP[key] ?? "";
    setForm(f => ({ ...f, birthTime: time, birthHour: earthlyBranch }));
  };

  const saveProfile = trpc.account.saveProfile.useMutation({
    onSuccess: () => {
      toast.success("命格資料已儲存！");
      utils.account.getProfile.invalidate();
    },
    onError: (err) => toast.error(`儲存失敗：${err.message}`),
  });

  const handleSave = () => {
    saveProfile.mutate({
      displayName: form.displayName || undefined,
      birthPlace: form.birthPlace || undefined,
      birthDate: form.birthDate || undefined,
      birthTime: form.birthTime || undefined,
      birthHour: form.birthHour || undefined,
      yearPillar: form.yearPillar || undefined,
      monthPillar: form.monthPillar || undefined,
      dayPillar: form.dayPillar || undefined,
      hourPillar: form.hourPillar || undefined,
      dayMasterElement: form.dayMasterElement || undefined,
      favorableElements: form.favorableElements || undefined,
      unfavorableElements: form.unfavorableElements || undefined,
      notes: form.notes || undefined,
    });
  };

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
            <p className="text-xs text-slate-500">{user?.name}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/5 border border-amber-500/20 rounded-2xl px-4 py-3 flex items-start gap-3"
        >
          <Sparkles className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-300/80">
            命格資料將用於個人化風水分析、喜用神五行匹配等功能。資料僅供您個人使用，主帳號可查看但不會對外公開。
          </p>
        </motion.div>

        {/* 基本資料 */}
        <section className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-white">基本資料</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">姓名</label>
              <input
                type="text"
                value={form.displayName}
                onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                placeholder="您的姓名"
                className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/60"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">出生日期</label>
              <input
                type="date"
                value={form.birthDate}
                onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))}
                className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/60"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">出生時間</label>
              <input
                type="time"
                value={form.birthTime}
                onChange={e => handleBirthTimeChange(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/60"
              />
              {form.birthHour && (
                <p className="text-xs text-slate-500 mt-1">時辰：{form.birthHour}時</p>
              )}
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">出生地</label>
              <input
                type="text"
                value={form.birthPlace}
                onChange={e => setForm(f => ({ ...f, birthPlace: e.target.value }))}
                placeholder="例：台北市、台中市"
                className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/60"
              />
            </div>
          </div>
        </section>

        {/* 四柱八字 */}
        <section className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white">四柱八字（選填）</h2>
          <div className="grid grid-cols-4 gap-2">
            {[
              { key: "yearPillar", label: "年柱" },
              { key: "monthPillar", label: "月柱" },
              { key: "dayPillar", label: "日柱" },
              { key: "hourPillar", label: "時柱" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs text-slate-400 mb-1 block text-center">{label}</label>
                <input
                  type="text"
                  value={(form as any)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder="甲子"
                  maxLength={8}
                  className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-2 py-2 text-sm text-white text-center placeholder-slate-600 focus:outline-none focus:border-amber-500/60"
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-600">如不確定，可留空，由命理師協助填寫</p>
        </section>

        {/* 五行命格 */}
        <section className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white">五行命格</h2>
          <div>
            <label className="text-xs text-slate-400 mb-2 block">日主五行</label>
            <div className="flex gap-2 flex-wrap">
              {ELEMENTS.map(el => (
                <button
                  key={el.value}
                  onClick={() => setForm(f => ({ ...f, dayMasterElement: f.dayMasterElement === el.value ? "" : el.value as any }))}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                    form.dayMasterElement === el.value
                      ? el.color + " ring-1 ring-offset-1 ring-offset-slate-900"
                      : "bg-slate-700/40 text-slate-400 border-slate-600/40 hover:bg-slate-700/60"
                  }`}
                >
                  {el.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">喜用神五行（逗號分隔）</label>
            <input
              type="text"
              value={form.favorableElements}
              onChange={e => setForm(f => ({ ...f, favorableElements: e.target.value }))}
              placeholder="例：fire,earth"
              className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">忌神五行（逗號分隔）</label>
            <input
              type="text"
              value={form.unfavorableElements}
              onChange={e => setForm(f => ({ ...f, unfavorableElements: e.target.value }))}
              placeholder="例：water,wood"
              className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500/60"
            />
          </div>
        </section>

        {/* 備註 */}
        <section className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
          <label className="text-xs text-slate-400 mb-1.5 block">個人備註</label>
          <textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="其他命理資訊，例如：格局、大運、流年等"
            rows={4}
            maxLength={2000}
            className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 resize-none"
          />
        </section>

        {/* 儲存按鈕 */}
        <button
          onClick={handleSave}
          disabled={saveProfile.isPending}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saveProfile.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saveProfile.isPending ? "儲存中..." : "儲存命格資料"}
        </button>
      </div>
    </div>
  );
}
