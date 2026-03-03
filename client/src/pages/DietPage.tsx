/**
 * 飲食羅盤 V10.0+V11.0 全面升級版
 * - 情境模式選擇器（天命/工作/戀愛/休閒/健康）
 * - 時辰時間軸（12時辰能量）
 * - AI 主廚菜單（LLM 生成）
 * - 五行知識彈窗
 * - 飲食日誌記錄
 * - 策略層整合顯示
 * - 短期記憶提示
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { SharedNav } from "@/components/SharedNav";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureLockedCard } from "@/components/FeatureLockedCard";
import { NearbyRestaurants } from "@/components/NearbyRestaurants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  MapPin, Thermometer, Wind, Droplets, RefreshCw, ChevronLeft, ChevronRight,
  AlertCircle, CheckCircle2, Sparkles, BookOpen, ChefHat, Clock, Plus, X,
  Briefcase, Heart, Coffee, Leaf, Zap,
} from "lucide-react";

// ─── 工具函數 ─────────────────────────────────────────────────
function getTaiwanDateStr(offsetDays = 0): string {
  const now = new Date();
  const twMs = now.getTime() + 8 * 60 * 60 * 1000 + offsetDays * 24 * 60 * 60 * 1000;
  return new Date(twMs).toISOString().split("T")[0];
}

const ELEMENT_EMOJI: Record<string, string> = { 火: "🔥", 木: "🌳", 水: "🌊", 土: "🌍", 金: "⚪" };
const ELEMENT_BG: Record<string, string> = {
  火: "bg-red-500/15 border-red-500/30 text-red-300",
  木: "bg-green-500/15 border-green-500/30 text-green-300",
  水: "bg-blue-500/15 border-blue-500/30 text-blue-300",
  土: "bg-yellow-500/15 border-yellow-500/30 text-yellow-300",
  金: "bg-slate-400/15 border-slate-400/30 text-slate-300",
};
const ELEMENT_GRADIENT: Record<string, string> = {
  火: "from-red-500/20 to-orange-500/10",
  木: "from-green-500/20 to-emerald-500/10",
  水: "from-blue-500/20 to-cyan-500/10",
  土: "from-yellow-500/20 to-amber-500/10",
  金: "from-slate-400/20 to-gray-500/10",
};
const LABEL_COLOR: Record<string, string> = {
  "首選方案": "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  "次選方案": "bg-sky-500/20 text-sky-300 border-sky-500/40",
  "中性": "bg-slate-500/20 text-slate-300 border-slate-500/40",
  "應避免": "bg-orange-500/20 text-orange-300 border-orange-500/40",
  "強烈避免": "bg-red-500/20 text-red-300 border-red-500/40",
};
const MEAL_LABEL: Record<string, string> = { breakfast: "早餐", lunch: "午餐", dinner: "晚餐", snack: "點心" };
const MEAL_EMOJI: Record<string, string> = { breakfast: "🌅", lunch: "☀️", dinner: "🌙", snack: "🍵" };

// ─── 情境模式 ─────────────────────────────────────────────────
const MODES = [
  { id: "default" as const, label: "天命", icon: Zap, color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/30" },
  { id: "work" as const, label: "工作", icon: Briefcase, color: "text-blue-400", bg: "bg-blue-500/15 border-blue-500/30" },
  { id: "love" as const, label: "戀愛", icon: Heart, color: "text-pink-400", bg: "bg-pink-500/15 border-pink-500/30" },
  { id: "leisure" as const, label: "休閒", icon: Coffee, color: "text-purple-400", bg: "bg-purple-500/15 border-purple-500/30" },
  { id: "health" as const, label: "健康", icon: Leaf, color: "text-green-400", bg: "bg-green-500/15 border-green-500/30" },
];
type ModeId = "default" | "work" | "love" | "leisure" | "health";

// ─── 共振文案 ─────────────────────────────────────────────────
const RESONANCE_COPY: Record<string, { high: string; mid: string; low: string }> = {
  火: { high: "天命共振・火能大旺！辛辣燒烤、咖啡濃茶皆是今日補運利器，點燃你的創意才華。", mid: "火能中性，適量攝取辛辣食物，維持能量平衡即可。", low: "今日火能過旺，建議暫避辛辣刺激，以免耗散精氣。" },
  土: { high: "財星共振・土能充盈！甜食、碳水、山藥蜂蜜皆能強化財庫，把才華轉化為實際財富。", mid: "土能中性，適量補充甜食與碳水，穩定今日根基。", low: "今日土能相剋，建議減少甜膩食物，以免阻礙能量流動。" },
  金: { high: "決斷力共振・金能充足！白色食物、銀耳百合、杏仁皆是今日利器，強化判斷力。", mid: "金能中性，適量攝取白色食物，維持清晰思維。", low: "今日金能受剋，建議暫避辛辣金屬感食物，保護能量場。" },
  木: { high: "生機共振・木能旺盛！綠色蔬菜、酸味食物皆能強化生命力，適合積極行動。", mid: "木能中性，適量攝取蔬菜，維持生機流動。", low: "今日木能為忌，建議減少酸味食物，以免加重能量負擔。" },
  水: { high: "智慧共振・水能充盈！海鮮、黑色食物、豆類皆能強化智慧，適合深度思考。", mid: "水能中性，適量攝取海鮮豆類，維持思維流暢。", low: "今日水能為忌，建議暫避寒涼食物，以免耗損陽氣。" },
};
function getResonanceCopy(element: string, score: number): string {
  const copy = RESONANCE_COPY[element];
  if (!copy) return score >= 60 ? `${element}系食材今日與天命高度共振，推薦積極攝取。` : score < 0 ? `${element}系食材今日能量相剋，建議減少攝取。` : `${element}系食材今日中性，可適量攝取。`;
  return score >= 60 ? copy.high : score < 0 ? copy.low : copy.mid;
}

// ─── 補運指數量表 ─────────────────────────────────────────────
function ResonanceGauge({ score, element }: { score: number; element: string }) {
  const pct = Math.max(0, Math.min(100, (score + 100) / 2));
  const color = score >= 60 ? "#10b981" : score >= 0 ? "#f59e0b" : "#ef4444";
  const label = score >= 100 ? "完美" : score >= 60 ? "強振" : score >= 0 ? "中性" : score >= -50 ? "洩漏" : "相剋";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-12 h-12">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
          <circle cx="18" cy="18" r="16" fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={`${pct * 1.005} 100.5`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm">{ELEMENT_EMOJI[element]}</span>
        </div>
      </div>
      <span className="text-xs font-bold" style={{ color }}>{score > 0 ? `+${score}` : score}</span>
      <span className="text-[10px] text-white/40">{label}</span>
    </div>
  );
}

// ─── 天氣資訊條 ──────────────────────────────────────────────
function WeatherBar({ weather }: { weather: { description: string; temperature: number; humidity: number; windSpeed: number; wuxing: Record<string, number> } }) {
  const dominant = Object.entries(weather.wuxing).sort(([, a], [, b]) => b - a)[0][0];
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm flex-wrap">
      <span className="text-base">{ELEMENT_EMOJI[dominant]}</span>
      <span className="text-white/70 font-medium">{weather.description}</span>
      <div className="flex items-center gap-1 text-white/50"><Thermometer className="w-3.5 h-3.5" /><span>{weather.temperature.toFixed(1)}°C</span></div>
      <div className="flex items-center gap-1 text-white/50"><Droplets className="w-3.5 h-3.5" /><span>{weather.humidity}%</span></div>
      <div className="flex items-center gap-1 text-white/50"><Wind className="w-3.5 h-3.5" /><span>{weather.windSpeed.toFixed(0)} km/h</span></div>
      <Badge className={`ml-auto text-xs border ${ELEMENT_BG[dominant]}`}>天氣五行：{dominant}</Badge>
    </div>
  );
}

// ─── 天氣授權引導 ─────────────────────────────────────────────
function WeatherPermissionBanner({ loading, denied, onRetry }: { loading: boolean; denied: boolean; onRetry: () => void }) {
  if (loading) return (
    <div className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-white/15 text-white/40 text-sm">
      <RefreshCw className="w-4 h-4 animate-spin" /><span>正在取得位置，啟用天氣五行加成...</span>
    </div>
  );
  if (denied) return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 space-y-2">
      <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" /><p className="text-sm text-amber-300 font-medium">位置授權被拒絕</p></div>
      <p className="text-xs text-white/50 leading-relaxed">開啟位置可啟用「天氣五行加成」，讓補運指數計算更精準。</p>
      <button onClick={onRetry} className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors"><RefreshCw className="w-3.5 h-3.5" />重新嘗試取得位置</button>
    </div>
  );
  return (
    <button onClick={onRetry} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-white/15 text-white/40 text-sm hover:border-amber-500/30 hover:text-amber-400/70 transition-colors group">
      <MapPin className="w-4 h-4 group-hover:text-amber-400/70" /><span>點此開啟位置，啟用天氣五行加成</span>
    </button>
  );
}

// ─── 時辰時間軸 ──────────────────────────────────────────────
type HourInfo = { branchIndex: number; branch: string; chineseName: string; displayTime: string; stem: string; score: number; level: string; label: string; isCurrent: boolean };
function HourlyTimeline({ hours }: { hours: HourInfo[] }) {
  if (!hours || hours.length === 0) return null;
  const currentIdx = hours.findIndex(h => h.isCurrent);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-white/40" />
        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest">今日時辰能量</h3>
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-1.5 min-w-max">
          {hours.map((h, i) => {
            const isHigh = h.score >= 7;
            const isMid = h.score >= 4;
            const barColor = isHigh ? "#10b981" : isMid ? "#f59e0b" : "#6b7280";
            return (
              <div key={i} className={`flex flex-col items-center gap-1 px-1.5 py-2 rounded-lg transition-all ${h.isCurrent ? "bg-amber-500/15 border border-amber-500/30" : "bg-white/[0.02]"}`}>
                <span className="text-[9px] text-white/40">{h.displayTime.split("–")[0]}</span>
                <div className="w-4 h-8 rounded-full bg-white/10 overflow-hidden flex flex-col-reverse">
                  <div className="rounded-full transition-all duration-700" style={{ height: `${h.score * 10}%`, background: barColor }} />
                </div>
                <span className="text-[10px] font-medium" style={{ color: h.isCurrent ? "#f59e0b" : "rgba(255,255,255,0.6)" }}>{h.chineseName}</span>
                {h.isCurrent && <span className="text-[8px] text-amber-400">▲ 現在</span>}
              </div>
            );
          })}
        </div>
      </div>
      {currentIdx >= 0 && (
        <p className="text-[10px] text-white/40 mt-2">當前時辰：{hours[currentIdx]?.chineseName}（{hours[currentIdx]?.displayTime}）・能量：{hours[currentIdx]?.label}</p>
      )}
    </div>
  );
}

// ─── 五行知識彈窗 ─────────────────────────────────────────────
type ElementKnowledge = { element: string; organ: string; tcmBenefit: string; cookingStyle: string; season: string; color: string; taste: string };
function ElementKnowledgeModal({ open, onClose, knowledge }: { open: boolean; onClose: () => void; knowledge: ElementKnowledge | null }) {
  if (!knowledge) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0f0f1a] border border-white/15 text-white max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="text-2xl">{ELEMENT_EMOJI[knowledge.element]}</span>
            <span>{knowledge.element}行知識庫</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="rounded-xl bg-white/5 p-3 space-y-2">
            {([ ["對應臟腑", knowledge.organ], ["對應季節", knowledge.season], ["對應顏色", knowledge.color], ["對應味道", knowledge.taste] ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex items-start gap-2">
                <span className="text-white/40 w-16 flex-shrink-0">{k}</span>
                <span className="text-white/80">{v}</span>
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-white/40 text-xs mb-1.5">中醫功效</p>
            <p className="text-white/70 text-xs leading-relaxed">{knowledge.tcmBenefit}</p>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-white/40 text-xs mb-1.5">建議烹飪方式</p>
            <p className="text-white/70 text-xs leading-relaxed">{knowledge.cookingStyle}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── AI 主廚菜單彈窗 ──────────────────────────────────────────
type AiDish = { name: string; ingredients: string; wuxingEffect: string };
type AiMenu = { menuName: string; mainDishes: AiDish[]; sideDish: AiDish; drink: { name: string; description: string; wuxingEffect: string }; motto: string };
function AiChefMenuModal({ open, onClose, targetElement, secondaryElement, mealScene, mode, healthTags, budgetPreference }: {
  open: boolean; onClose: () => void; targetElement: string; secondaryElement?: string;
  mealScene: string; mode: ModeId; healthTags: string[]; budgetPreference: string;
}) {
  const aiChefMenu = trpc.diet.aiChefMenu.useMutation();
  useEffect(() => {
    if (open && !aiChefMenu.data && !aiChefMenu.isPending) {
      aiChefMenu.mutate({
        targetElement, secondaryElement,
        mealType: mealScene as "breakfast" | "lunch" | "dinner" | "snack",
        mode, healthTags,
        budgetPreference: budgetPreference as "budget" | "mid" | "premium",
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const menu = aiChefMenu.data?.menu as AiMenu | undefined;
  const retry = () => aiChefMenu.mutate({ targetElement, secondaryElement, mealType: mealScene as "breakfast" | "lunch" | "dinner" | "snack", mode, healthTags, budgetPreference: budgetPreference as "budget" | "mid" | "premium" });
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0f0f1a] border border-white/15 text-white max-w-sm mx-auto max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ChefHat className="w-5 h-5 text-amber-400" /><span>AI 天命主廚菜單</span>
          </DialogTitle>
        </DialogHeader>
        {aiChefMenu.isPending && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="w-12 h-12 rounded-full bg-amber-500/15 flex items-center justify-center">
              <ChefHat className="w-6 h-6 text-amber-400 animate-pulse" />
            </div>
            <p className="text-sm text-white/50">天命主廚正在為您準備菜單...</p>
          </div>
        )}
        {aiChefMenu.isError && (
          <div className="text-center py-6">
            <p className="text-sm text-red-400">菜單生成失敗，請稍後再試</p>
            <Button variant="ghost" size="sm" className="mt-2 text-white/50" onClick={retry}>重試</Button>
          </div>
        )}
        {menu && (
          <div className="space-y-3">
            <div className={`rounded-xl bg-gradient-to-br ${ELEMENT_GRADIENT[targetElement] ?? "from-white/5 to-white/[0.02]"} p-3 text-center`}>
              <p className="text-xs text-white/40 mb-1">今日天命菜單</p>
              <p className="text-base font-bold text-white">{menu.menuName}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-white/40">主菜推薦</p>
              {menu.mainDishes?.map((dish, i) => (
                <div key={i} className="rounded-xl bg-white/5 p-3">
                  <p className="text-sm font-semibold text-white mb-1">{dish.name}</p>
                  <p className="text-xs text-white/50 mb-1">食材：{dish.ingredients}</p>
                  <p className="text-xs text-amber-400/70">{ELEMENT_EMOJI[targetElement]} {dish.wuxingEffect}</p>
                </div>
              ))}
            </div>
            {menu.sideDish && (
              <div>
                <p className="text-xs text-white/40 mb-1.5">配菜推薦</p>
                <div className="rounded-xl bg-white/5 p-3">
                  <p className="text-sm font-semibold text-white mb-1">{menu.sideDish.name}</p>
                  <p className="text-xs text-white/50 mb-1">食材：{menu.sideDish.ingredients}</p>
                  <p className="text-xs text-amber-400/70">{menu.sideDish.wuxingEffect}</p>
                </div>
              </div>
            )}
            {menu.drink && (
              <div>
                <p className="text-xs text-white/40 mb-1.5">飲品推薦</p>
                <div className="rounded-xl bg-white/5 p-3">
                  <p className="text-sm font-semibold text-white mb-1">{menu.drink.name}</p>
                  <p className="text-xs text-white/50 mb-1">{menu.drink.description}</p>
                  <p className="text-xs text-amber-400/70">{menu.drink.wuxingEffect}</p>
                </div>
              </div>
            )}
            {menu.motto && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center">
                <p className="text-xs text-amber-300 italic">「{menu.motto}」</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── 飲食日誌 ─────────────────────────────────────────────────
type DietLog = { id: number; mealType: string; consumedElement: string; consumedFood: string; preference: string | null };
function DietLogSection({ selectedDate }: { selectedDate: string }) {
  const [showLogForm, setShowLogForm] = useState(false);
  const [logFood, setLogFood] = useState("");
  const [logElement, setLogElement] = useState("火");
  const [logMeal, setLogMeal] = useState<"breakfast" | "lunch" | "dinner" | "snack">("lunch");
  const [logPref, setLogPref] = useState<"like" | "neutral" | "dislike">("neutral");
  const { data: logs, refetch: refetchLogs } = trpc.diet.getTodayLogs.useQuery({ logDate: selectedDate }, { staleTime: 30 * 1000 });
  const logMutation = trpc.diet.logConsumption.useMutation({
    onSuccess: () => { refetchLogs(); setShowLogForm(false); setLogFood(""); toast.success(`${MEAL_EMOJI[logMeal]} ${logFood} 已記錄`); },
    onError: () => toast.error("記錄失敗，請稍後再試"),
  });
  const handleSubmit = () => {
    if (!logFood.trim()) return;
    logMutation.mutate({ logDate: selectedDate, mealType: logMeal, consumedElement: logElement, consumedFood: logFood.trim(), preference: logPref });
  };
  const elementsByMeal = useMemo(() => {
    if (!logs) return {} as Record<string, DietLog[]>;
    const grouped: Record<string, DietLog[]> = {};
    for (const log of logs) {
      if (!grouped[log.mealType]) grouped[log.mealType] = [];
      grouped[log.mealType].push(log);
    }
    return grouped;
  }, [logs]);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-white/40" />
          <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest">今日飲食日誌</h3>
        </div>
        <Button variant="ghost" size="sm" className="h-7 text-xs text-amber-400 hover:text-amber-300 gap-1" onClick={() => setShowLogForm(v => !v)}>
          {showLogForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showLogForm ? "取消" : "記錄"}
        </Button>
      </div>
      <AnimatePresence>
        {showLogForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-3 rounded-xl border border-white/10 bg-white/5 p-3 space-y-2.5 overflow-hidden">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-white/40 mb-1">餐別</p>
                <div className="flex gap-1 flex-wrap">
                  {(["breakfast", "lunch", "dinner", "snack"] as const).map(m => (
                    <button key={m} onClick={() => setLogMeal(m)} className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${logMeal === m ? "bg-amber-500/20 border-amber-500/40 text-amber-300" : "border-white/10 text-white/40"}`}>
                      {MEAL_EMOJI[m]} {MEAL_LABEL[m]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-white/40 mb-1">五行</p>
                <div className="flex gap-1 flex-wrap">
                  {["火", "木", "水", "土", "金"].map(el => (
                    <button key={el} onClick={() => setLogElement(el)} className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${logElement === el ? ELEMENT_BG[el] : "border-white/10 text-white/40"}`}>
                      {ELEMENT_EMOJI[el]} {el}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <input type="text" value={logFood} onChange={e => setLogFood(e.target.value)} placeholder="輸入食物名稱（例：炒青菜、紅燒肉）"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-500/40"
              onKeyDown={e => e.key === "Enter" && handleSubmit()} />
            <div>
              <p className="text-[10px] text-white/40 mb-1">喜好</p>
              <div className="flex gap-2">
                {[{ id: "like", label: "😋 喜歡" }, { id: "neutral", label: "😐 普通" }, { id: "dislike", label: "😞 不喜歡" }].map(p => (
                  <button key={p.id} onClick={() => setLogPref(p.id as typeof logPref)} className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${logPref === p.id ? "bg-white/15 border-white/30 text-white" : "border-white/10 text-white/40"}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <Button size="sm" className="w-full h-8 text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30" onClick={handleSubmit} disabled={!logFood.trim() || logMutation.isPending}>
              {logMutation.isPending ? "記錄中..." : "確認記錄"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      {logs && logs.length > 0 ? (
        <div className="space-y-2">
          {(["breakfast", "lunch", "dinner", "snack"] as const).map(meal => {
            const mealLogs = elementsByMeal[meal];
            if (!mealLogs || mealLogs.length === 0) return null;
            return (
              <div key={meal}>
                <p className="text-[10px] text-white/30 mb-1">{MEAL_EMOJI[meal]} {MEAL_LABEL[meal]}</p>
                <div className="flex flex-wrap gap-1.5">
                  {mealLogs.map(log => (
                    <span key={log.id} className={`text-xs px-2 py-0.5 rounded-full border ${ELEMENT_BG[log.consumedElement] ?? "bg-white/10 border-white/20 text-white/60"}`}>
                      {ELEMENT_EMOJI[log.consumedElement]} {log.consumedFood}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-white/30 text-center py-3">尚無今日飲食記錄，點擊「記錄」開始追蹤</p>
      )}
    </div>
  );
}

// ─── 主頁面 ──────────────────────────────────────────────────
export default function DietPage() {
  const { hasFeature, isAdmin } = usePermissions();
  const [selectedOffset, setSelectedOffset] = useState(0);
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [activePlanTab, setActivePlanTab] = useState<"planA" | "planB">("planA");
  const [selectedMode, setSelectedMode] = useState<ModeId>("default");
  const [showKnowledgeModal, setShowKnowledgeModal] = useState(false);
  const [showChefModal, setShowChefModal] = useState(false);

  const selectedDate = getTaiwanDateStr(selectedOffset);
  const dateLabel = selectedOffset === 0 ? "今日" : selectedOffset === -1 ? "昨日" : selectedOffset === 1 ? "明日" : `${selectedOffset > 0 ? "+" : ""}${selectedOffset}天`;

  const { data: dietData, isLoading: dietLoading, refetch: refetchDiet } = trpc.diet.getDietaryAdvice.useQuery(
    { date: selectedDate, mode: selectedMode },
    { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false }
  );
  const { data: warRoomData, isLoading: warRoomLoading, refetch: refetchWarRoom } = trpc.warRoom.dailyReport.useQuery(
    { date: selectedDate, lat: userCoords?.lat, lon: userCoords?.lon },
    { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false }
  );
  const { data: userPrefs } = trpc.diet.getUserPreferences.useQuery(undefined, { staleTime: 60 * 1000 });

  const isAccessible = isAdmin || hasFeature("warroom_dietary");
  const isLoading = dietLoading || warRoomLoading;
  const weather = warRoomData?.weather;
  const dietary = dietData?.advice;
  const targetElement = dietary?.targetElement ?? "火";
  const planB = dietary?.planB ?? [];
  const favorableElements = warRoomData?.favorableElements ?? [];
  const unfavorableElements = warRoomData?.unfavorableElements ?? [];

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) { setLocationDenied(true); return; }
    setLocationLoading(true); setLocationDenied(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }); setLocationLoading(false); },
      (err) => { setLocationLoading(false); if (err.code === 1) setLocationDenied(true); },
      { timeout: 8000 }
    );
  }, []);
  useEffect(() => { requestLocation(); }, [requestLocation]);
  useEffect(() => { if (userCoords) refetchWarRoom(); }, [userCoords, refetchWarRoom]);
  useEffect(() => { refetchDiet(); }, [selectedMode, refetchDiet]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <SharedNav currentPage="diet" />
      <main className="max-w-2xl mx-auto px-4 pt-20 pb-32 space-y-5">

        {/* 頁頭 */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center pt-2">
          <h1 className="text-2xl font-bold tracking-tight">飲食羅盤</h1>
          <p className="text-sm text-white/40 mt-1">以五行能量為你選擇今日最佳補運餐食</p>
        </motion.div>

        {/* 日期選擇器 */}
        <div className="flex items-center justify-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setSelectedOffset(o => o - 1)}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-sm font-semibold text-white/80 w-36 text-center">{dateLabel} · {selectedDate}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setSelectedOffset(o => o + 1)}><ChevronRight className="w-4 h-4" /></Button>
        </div>

        {/* 情境模式選擇器 */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[10px] text-white/30 mb-2 text-center uppercase tracking-widest">情境模式・選擇今日補運方向</p>
          <div className="grid grid-cols-5 gap-1.5">
            {MODES.map(mode => {
              const Icon = mode.icon;
              const isActive = selectedMode === mode.id;
              return (
                <button key={mode.id} onClick={() => setSelectedMode(mode.id)}
                  className={`flex flex-col items-center gap-1 py-2 rounded-xl border transition-all ${isActive ? `${mode.bg} ${mode.color}` : "border-white/8 text-white/40 hover:border-white/20"}`}>
                  <Icon className="w-4 h-4" />
                  <span className="text-[10px] font-medium">{mode.label}</span>
                </button>
              );
            })}
          </div>
          {dietData?.strategy && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2.5 rounded-xl bg-amber-500/8 border border-amber-500/20 px-3 py-2">
              <p className="text-[10px] text-amber-400/70 mb-0.5">✦ 今日策略：{dietData.strategy.name}</p>
              <p className="text-xs text-white/60 leading-relaxed">{dietData.strategy.coreText}</p>
            </motion.div>
          )}
        </motion.div>

        {/* 天氣資訊 */}
        {weather ? <WeatherBar weather={weather} /> : <WeatherPermissionBanner loading={locationLoading} denied={locationDenied} onRetry={requestLocation} />}
        {weather && userCoords && (
          <div className="flex items-center gap-2 text-xs text-emerald-400/70">
            <CheckCircle2 className="w-3.5 h-3.5" /><span>天氣五行加成已啟用・三維加權計算中（本命30% · 環境50% · 天氣20%）</span>
          </div>
        )}

        {!isAccessible ? (
          <FeatureLockedCard feature="warroom_dietary" description="升級方案以解鎖每日補運飲食建議與附近餐廳五行評分" />
        ) : isLoading ? (
          <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse" />)}</div>
        ) : !dietData ? (
          <div className="text-center py-12 text-white/40">無法載入資料，請稍後再試</div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={`${selectedDate}-${selectedMode}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">

              {/* 短期記憶提示 */}
              {dietary?.memoryHint && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-blue-300 mb-0.5">記憶感知提示</p>
                    <p className="text-xs text-white/50 leading-relaxed">{dietary.memoryHint}</p>
                    {dietary.lightFoods && dietary.lightFoods.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {dietary.lightFoods.map(f => <span key={f} className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-300/70">{f}</span>)}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* 補運指數儀表盤 */}
              {planB.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                  className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest">今日補運指數</h3>
                      <p className="text-sm text-white/70 mt-0.5">
                        目標補充：<span className={`font-bold ${ELEMENT_BG[targetElement].split(' ')[2]}`}>{ELEMENT_EMOJI[targetElement]} {targetElement}</span>
                        {dietData.modeLabel !== "天命模式" && <span className="ml-2 text-xs text-white/40">（{dietData.modeLabel}）</span>}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <button onClick={() => setShowKnowledgeModal(true)} className="flex items-center gap-1 text-[10px] text-amber-400/70 hover:text-amber-400 transition-colors">
                        <BookOpen className="w-3 h-3" />五行知識
                      </button>
                      {weather ? <p className="text-[10px] text-emerald-400/60">✦ 三維加權已啟用</p> : <p className="text-[10px] text-amber-400/60">⚠ 天氣維度未啟用</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {planB.map((item) => <ResonanceGauge key={item.element} score={item.resonanceScore} element={item.element} />)}
                  </div>
                </motion.div>
              )}

              {/* Plan A / Plan B 切換 */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <Tabs value={activePlanTab} onValueChange={(v) => setActivePlanTab(v as "planA" | "planB")}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest">飲食方案</h3>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-amber-400 hover:text-amber-300 gap-1 px-2" onClick={() => setShowChefModal(true)}>
                        <ChefHat className="w-3.5 h-3.5" />AI 菜單
                      </Button>
                      <TabsList className="h-8 bg-white/10">
                        <TabsTrigger value="planA" className="text-xs px-3 h-6 data-[state=active]:bg-white/20">🎯 首選方案</TabsTrigger>
                        <TabsTrigger value="planB" className="text-xs px-3 h-6 data-[state=active]:bg-white/20">🗺️ 全覽比較</TabsTrigger>
                      </TabsList>
                    </div>
                  </div>
                  {activePlanTab === "planA" && (
                    <div className="space-y-4">
                      {dietary?.supplements && dietary.supplements.length > 0 && (
                        <div>
                          <p className="text-xs text-white/40 mb-2">✦ 今日優先補充</p>
                          <div className="space-y-3">
                            {dietary.supplements.map((s) => (
                              <div key={s.element} className={`rounded-xl border p-4 bg-gradient-to-br ${ELEMENT_GRADIENT[s.element] ?? "from-white/5 to-white/[0.02]"} ${ELEMENT_BG[s.element]?.split(' ').slice(0, 2).join(' ')}`}>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xl">{ELEMENT_EMOJI[s.element]}</span>
                                  <div>
                                    <span className="font-bold text-sm">{s.element}系食材</span>
                                    <span className="ml-2 text-[10px] text-white/40">優先級 #{s.priority}</span>
                                  </div>
                                </div>
                                <p className="text-xs text-white/60 mb-3 leading-relaxed">{s.advice}</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {s.foods.map((f) => <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70">{f}</span>)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {dietary?.avoid && dietary.avoid.length > 0 && (
                        <div>
                          <p className="text-xs text-white/40 mb-2">⚠️ 今日建議避開</p>
                          <div className="space-y-2">
                            {dietary.avoid.map((a) => (
                              <div key={a.element} className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-base">{ELEMENT_EMOJI[a.element]}</span>
                                  <span className="font-semibold text-sm text-red-300">{a.element}系食材</span>
                                </div>
                                <p className="text-xs text-white/50 mb-2">{a.reason}</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {a.foods.map((f) => <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-300/70">{f}</span>)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {activePlanTab === "planB" && (
                    <div className="space-y-2">
                      <p className="text-xs text-white/40 mb-3">✦ 天命共振五行食材排行・以{ELEMENT_EMOJI[targetElement]}{targetElement}為今日補運核心</p>
                      {planB.map((item) => (
                        <motion.div key={item.element} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3">
                          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xl flex-shrink-0">{ELEMENT_EMOJI[item.element]}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm">{item.element}系食材</span>
                              <Badge className={`text-[10px] border ${LABEL_COLOR[item.label] ?? "bg-slate-500/20 text-slate-300 border-slate-500/40"}`}>{item.label}</Badge>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${Math.max(0, (item.resonanceScore + 100) / 2)}%`, background: item.resonanceScore >= 60 ? "#10b981" : item.resonanceScore >= 0 ? "#f59e0b" : "#ef4444" }} />
                            </div>
                            <p className="text-[10px] text-white/40 mt-1 leading-relaxed line-clamp-2">{getResonanceCopy(item.element, item.resonanceScore)}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="text-sm font-bold" style={{ color: item.resonanceScore >= 60 ? "#10b981" : item.resonanceScore >= 0 ? "#f59e0b" : "#ef4444" }}>
                              {item.resonanceScore > 0 ? `+${item.resonanceScore}` : item.resonanceScore}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </Tabs>
              </motion.div>

              {/* 時辰時間軸 */}
              {dietData.allHours && dietData.allHours.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <HourlyTimeline hours={dietData.allHours} />
                </motion.div>
              )}

              {/* 飲食日誌 */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <DietLogSection selectedDate={selectedDate} />
              </motion.div>

              {/* 附近餐廳 */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <NearbyRestaurants
                  supplements={dietary?.supplements ?? []}
                  todayDirections={warRoomData?.todayDirections as { xi: string; fu: string; cai: string } | undefined}
                  favorableElements={favorableElements}
                  unfavorableElements={unfavorableElements}
                  weatherEnabled={!!weather}
                  weatherElement={weather ? Object.entries(weather.wuxing).sort(([, a], [, b]) => b - a)[0]?.[0] : undefined}
                />
              </motion.div>
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* 五行知識彈窗 */}
      <ElementKnowledgeModal
        open={showKnowledgeModal}
        onClose={() => setShowKnowledgeModal(false)}
        knowledge={dietData?.targetKnowledge ?? null}
      />

      {/* AI 主廚菜單彈窗 */}
      {dietData && (
        <AiChefMenuModal
          open={showChefModal}
          onClose={() => setShowChefModal(false)}
          targetElement={targetElement}
          secondaryElement={dietary?.supplements?.[1]?.element}
          mealScene={dietData.mealScene}
          mode={selectedMode}
          healthTags={(userPrefs as { healthTags?: string[] } | undefined)?.healthTags ?? []}
          budgetPreference={(userPrefs as { budgetPreference?: string } | undefined)?.budgetPreference ?? "mid"}
        />
      )}
    </div>
  );
}
