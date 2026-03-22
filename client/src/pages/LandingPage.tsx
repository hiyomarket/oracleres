/**
 * LandingPage.tsx
 * 天命共振 Destiny Oracle - 數位錦囊
 * 全新首頁 MVP — 面向未登入訪客
 *
 * 三大區塊：
 * 1. 錦囊體驗（Hero + 輸入生日體驗命格）
 * 2. 功能卡片展示（系統核心功能預覽）
 * 3. 社會認證（用戶見證 + 最終 CTA）
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Sparkles, Star, Zap, Moon, Sun, Compass, Eye, Lock,
  ChevronRight, ArrowRight, Calendar, Shield, Users, Trophy,
  Loader2, CheckCircle, AlertCircle, LogIn
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// ─── 五行顏色映射 ────────────────────────────────────────────────
const ELEMENT_COLORS: Record<string, { gradient: string; text: string; bg: string; border: string }> = {
  木: { gradient: "from-emerald-600 to-green-500", text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  火: { gradient: "from-red-600 to-orange-500", text: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30" },
  土: { gradient: "from-amber-600 to-yellow-500", text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  金: { gradient: "from-slate-400 to-gray-300", text: "text-slate-300", bg: "bg-slate-500/10", border: "border-slate-400/30" },
  水: { gradient: "from-blue-600 to-cyan-500", text: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
};

const ENERGY_LEVEL_LABEL: Record<string, { label: string; color: string; emoji: string }> = {
  excellent: { label: "大吉", color: "text-amber-400", emoji: "🌟" },
  good: { label: "吉", color: "text-emerald-400", emoji: "✨" },
  neutral: { label: "平", color: "text-blue-400", emoji: "⚪" },
  challenging: { label: "凶", color: "text-red-400", emoji: "⚠️" },
  complex: { label: "複雜", color: "text-purple-400", emoji: "🔮" },
};

// ─── 功能卡片資料 ────────────────────────────────────────────────
const FEATURE_CARDS = [
  {
    icon: Zap,
    title: "每日能量作戰室",
    desc: "今日四柱八字、十神分析、12 時辰吉凶一覽，讓你每天都能精準出擊",
    tag: "核心功能",
    color: "amber",
    locked: false,
  },
  {
    icon: Moon,
    title: "天命問卜",
    desc: "融合八字命理與天命共振算法的現代擲筊，問事問財問感情，天命給你答案",
    tag: "最受歡迎",
    color: "blue",
    locked: false,
  },
  {
    icon: Star,
    title: "命格深度解析",
    desc: "四柱八字、五行比例、喜忌神、大運流年，完整呈現你的命運藍圖",
    tag: "會員限定",
    color: "purple",
    locked: true,
  },
  {
    icon: Compass,
    title: "幸運選號輔助",
    desc: "結合命格五行與流日能量，為你的彩券選號提供天命加持",
    tag: "會員限定",
    color: "green",
    locked: true,
  },
  {
    icon: Sun,
    title: "每日穿搭 × 飲食建議",
    desc: "依今日五行能量推薦幸運顏色、食材，讓你從裡到外都與天命共振",
    tag: "會員限定",
    color: "orange",
    locked: true,
  },
  {
    icon: Eye,
    title: "大運流年預覽",
    desc: "十年大運、流年流月分析，提前掌握人生重要轉折點",
    tag: "進階功能",
    color: "cyan",
    locked: true,
  },
];

// ─── 用戶見證資料 ────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    name: "陳小姐",
    role: "創業者",
    avatar: "陳",
    content: "每天早上看一下今日能量，決定要不要主動出擊，真的有差！上個月簽了一個大案子，剛好是大吉日。",
    stars: 5,
    element: "火",
  },
  {
    name: "林先生",
    role: "投資人",
    avatar: "林",
    content: "偶財指數這個功能很有趣，我開始記錄後發現，高指數日的投資決策真的比較順。",
    stars: 5,
    element: "土",
  },
  {
    name: "王小姐",
    role: "上班族",
    avatar: "王",
    content: "問卜功能讓我在猶豫不決時有個參考，不是迷信，是給自己一個思考的框架。",
    stars: 5,
    element: "木",
  },
];

// ─── 統計數字 ────────────────────────────────────────────────────
const STATS = [
  { value: "5,000+", label: "命格分析次數" },
  { value: "98%", label: "用戶滿意度" },
  { value: "365", label: "天不間斷更新" },
  { value: "12", label: "核心功能模組" },
];

// ─── 預覽 API 回傳型別 ────────────────────────────────────────────
interface PreviewResult {
  birth: string;
  bazi: { yearPillar: string; monthPillar: string; dayPillar: string; hourPillar: string };
  dayMaster: { stem: string; element: string; description: string };
  destinyKeyword: string;
  elementBalance: { dominant: Array<{ element: string; percent: number }> };
  todayEnergy: { level: string; description: string; date: string; dayPillar: string };
  todayAdvice: string;
  luckyElement: { element: string; color: string; direction: string };
  teaser: string;
  cta: { message: string; registerUrl: string };
}

// ─── 錦囊體驗區塊 ────────────────────────────────────────────────
function JinNangSection() {
  const [birthInput, setBirthInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!birthInput) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/preview?birth=${encodeURIComponent(birthInput)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? "推算失敗，請稍後再試");
      } else {
        setResult(data as PreviewResult);
      }
    } catch {
      setError("網路連線異常，請稍後再試");
    } finally {
      setIsLoading(false);
    }
  };

  const energyInfo = result ? (ENERGY_LEVEL_LABEL[result.todayEnergy.level] ?? ENERGY_LEVEL_LABEL.neutral) : null;
  const dominantElement = result?.elementBalance.dominant[0]?.element ?? "火";
  const elementStyle = ELEMENT_COLORS[dominantElement] ?? ELEMENT_COLORS["火"];

  return (
    <section className="relative py-20 px-4 overflow-hidden">
      {/* 背景裝飾 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto">
        {/* Hero 標題 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            <span>免費體驗 · 無需登入</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 leading-tight font-serif">
            輸入生日
            <span className="block bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 bg-clip-text text-transparent">
              解開你的天命密碼
            </span>
          </h1>

          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            融合八字命理、紫微斗數與現代算法，為你推算專屬命格
            <br className="hidden md:block" />
            每日能量、幸運五行、今日建議——讓天命指引你的每一步
          </p>
        </motion.div>

        {/* 輸入區 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-lg mx-auto"
        >
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                type="date"
                value={birthInput}
                onChange={(e) => setBirthInput(e.target.value)}
                min="1920-01-01"
                max="2010-12-31"
                className="h-12 bg-slate-800/60 border-slate-600/50 text-white placeholder:text-slate-500 focus:border-amber-500/60 focus:ring-amber-500/20 text-base"
                placeholder="選擇你的生日"
              />
            </div>
            <Button
              type="submit"
              disabled={!birthInput || isLoading}
              className="h-12 px-8 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white font-semibold text-base shrink-0 transition-all duration-200"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  開啟錦囊
                </>
              )}
            </Button>
          </form>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 flex items-center gap-2 text-red-400 text-sm"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </motion.div>

        {/* 結果展示 */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6 }}
              className="mt-10 max-w-2xl mx-auto"
            >
              {/* 命格卡片 */}
              <div className="rounded-2xl bg-slate-900/80 border border-slate-700/50 backdrop-blur-sm overflow-hidden">
                {/* 卡片頂部：命格標題 */}
                <div className={`px-6 py-5 bg-gradient-to-r ${elementStyle.gradient} bg-opacity-10`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white/60 text-sm">你的命格</span>
                        <Badge className={`${elementStyle.bg} ${elementStyle.border} ${elementStyle.text} border text-xs`}>
                          {result.dayMaster.element}日主
                        </Badge>
                      </div>
                      <h3 className="text-2xl font-bold text-white font-serif">
                        {result.dayMaster.stem}日主 · {result.destinyKeyword}
                      </h3>
                    </div>
                    <div className={`w-14 h-14 rounded-xl ${elementStyle.bg} ${elementStyle.border} border flex items-center justify-center`}>
                      <span className={`text-2xl font-bold ${elementStyle.text}`}>{result.dayMaster.element}</span>
                    </div>
                  </div>
                </div>

                {/* 八字四柱 */}
                <div className="px-6 py-4 border-b border-slate-700/50">
                  <p className="text-slate-400 text-xs mb-3 uppercase tracking-wider">八字四柱</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "年柱", value: result.bazi.yearPillar },
                      { label: "月柱", value: result.bazi.monthPillar },
                      { label: "日柱", value: result.bazi.dayPillar },
                      { label: "時柱", value: "??" },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className={`text-center py-3 rounded-lg ${
                          value === "??"
                            ? "bg-slate-800/40 border border-dashed border-slate-600/40"
                            : "bg-slate-800/60 border border-slate-700/40"
                        }`}
                      >
                        <div className={`text-lg font-bold font-serif ${value === "??" ? "text-slate-600" : "text-amber-300"}`}>
                          {value === "??" ? (
                            <Lock className="w-4 h-4 mx-auto text-slate-600" />
                          ) : value}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{label}</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-600 mt-2 text-center">時柱需登入後解鎖</p>
                </div>

                {/* 五行比例 */}
                <div className="px-6 py-4 border-b border-slate-700/50">
                  <p className="text-slate-400 text-xs mb-3 uppercase tracking-wider">五行能量（前三強）</p>
                  <div className="space-y-2">
                    {result.elementBalance.dominant.map(({ element, percent }) => {
                      const style = ELEMENT_COLORS[element] ?? ELEMENT_COLORS["火"];
                      return (
                        <div key={element} className="flex items-center gap-3">
                          <span className={`text-sm font-medium ${style.text} w-4`}>{element}</span>
                          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percent}%` }}
                              transition={{ duration: 0.8, delay: 0.2 }}
                              className={`h-full rounded-full bg-gradient-to-r ${style.gradient}`}
                            />
                          </div>
                          <span className="text-slate-400 text-xs w-8 text-right">{percent}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 今日運勢 */}
                <div className="px-6 py-4 border-b border-slate-700/50">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-slate-400 text-xs uppercase tracking-wider">今日運勢</p>
                    <span className="text-xs text-slate-500">{result.todayEnergy.date}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                      energyInfo?.color === "text-amber-400" ? "bg-amber-500/10" :
                      energyInfo?.color === "text-emerald-400" ? "bg-emerald-500/10" :
                      energyInfo?.color === "text-red-400" ? "bg-red-500/10" : "bg-blue-500/10"
                    }`}>
                      {energyInfo?.emoji}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-bold ${energyInfo?.color}`}>{energyInfo?.label}</span>
                        <span className="text-slate-500 text-sm">日柱 {result.todayEnergy.dayPillar}</span>
                      </div>
                      <p className="text-slate-300 text-sm leading-relaxed">{result.todayEnergy.description}</p>
                    </div>
                  </div>
                </div>

                {/* 今日建議 + 幸運五行 */}
                <div className="px-6 py-4 border-b border-slate-700/50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">今日建議</p>
                      <p className="text-slate-200 text-sm leading-relaxed">{result.todayAdvice}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">幸運五行</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${ELEMENT_COLORS[result.luckyElement.element]?.text ?? "text-amber-400"}`}>
                          {result.luckyElement.element}
                        </span>
                        <div className="text-xs text-slate-400">
                          <div>幸運色：{result.luckyElement.color}</div>
                          <div>幸運方位：{result.luckyElement.direction}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 引導 CTA */}
                <div className="px-6 py-5 bg-gradient-to-r from-amber-950/30 to-orange-950/20">
                  <p className="text-amber-300/80 text-sm mb-4 leading-relaxed">
                    {result.teaser}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <a
                      href={getLoginUrl()}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white font-semibold text-sm transition-all duration-200"
                    >
                      <LogIn className="w-4 h-4" />
                      免費加入，解鎖完整命格
                    </a>
                    <button
                      onClick={() => { setResult(null); setBirthInput(""); }}
                      className="flex items-center justify-center gap-1 py-3 px-4 rounded-xl border border-slate-600/50 text-slate-400 hover:text-slate-300 hover:border-slate-500/50 text-sm transition-colors"
                    >
                      重新輸入
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 未輸入時的引導提示 */}
        {!result && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 text-center"
          >
            <p className="text-slate-500 text-sm">
              已有帳號？
              <a href={getLoginUrl()} className="text-amber-400 hover:text-amber-300 ml-1 underline underline-offset-2">
                直接登入
              </a>
            </p>
          </motion.div>
        )}
      </div>
    </section>
  );
}

// ─── 功能卡片展示區塊 ────────────────────────────────────────────
function FeaturesSection() {
  const colorMap: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", icon: "text-amber-400" },
    blue: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", icon: "text-blue-400" },
    purple: { bg: "bg-purple-500/10", border: "border-purple-500/20", text: "text-purple-400", icon: "text-purple-400" },
    green: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", icon: "text-emerald-400" },
    orange: { bg: "bg-orange-500/10", border: "border-orange-500/20", text: "text-orange-400", icon: "text-orange-400" },
    cyan: { bg: "bg-cyan-500/10", border: "border-cyan-500/20", text: "text-cyan-400", icon: "text-cyan-400" },
  };

  return (
    <section className="py-20 px-4 bg-slate-900/30">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <Badge className="mb-4 bg-blue-500/10 border-blue-500/30 text-blue-400 border">
            系統功能
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 font-serif">
            命理智慧，全面賦能
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            從每日能量到命格深解，從問卜決策到幸運選號，
            天命共振為你的生活提供全方位的命理指引
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURE_CARDS.map((card, index) => {
            const style = colorMap[card.color] ?? colorMap.amber;
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className={`relative rounded-xl p-5 border ${
                  card.locked
                    ? "bg-slate-900/40 border-slate-700/30"
                    : `${style.bg} ${style.border}`
                } transition-all duration-200 hover:border-opacity-60`}
              >
                {card.locked && (
                  <div className="absolute top-3 right-3">
                    <Lock className="w-3.5 h-3.5 text-slate-600" />
                  </div>
                )}
                <div className={`w-10 h-10 rounded-lg ${style.bg} ${style.border} border flex items-center justify-center mb-4`}>
                  <Icon className={`w-5 h-5 ${style.icon}`} />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className={`font-semibold ${card.locked ? "text-slate-400" : "text-white"}`}>
                    {card.title}
                  </h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    card.tag === "最受歡迎" ? "bg-amber-500/20 text-amber-400" :
                    card.tag === "核心功能" ? "bg-emerald-500/20 text-emerald-400" :
                    card.tag === "進階功能" ? "bg-purple-500/20 text-purple-400" :
                    "bg-slate-700/50 text-slate-400"
                  }`}>
                    {card.tag}
                  </span>
                </div>
                <p className={`text-sm leading-relaxed ${card.locked ? "text-slate-500" : "text-slate-400"}`}>
                  {card.desc}
                </p>
                {!card.locked && (
                  <div className="mt-4 flex items-center gap-1 text-xs text-amber-400/70">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>登入即可使用</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center mt-10"
        >
          <a
            href={getLoginUrl()}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white font-semibold transition-all duration-200"
          >
            <LogIn className="w-4 h-4" />
            免費加入，解鎖全部功能
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}

// ─── 統計數字區塊 ────────────────────────────────────────────────
function StatsSection() {
  return (
    <section className="py-12 px-4 border-y border-slate-700/30">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="text-center"
            >
              <div className="text-3xl font-bold text-amber-400 font-serif mb-1">{stat.value}</div>
              <div className="text-slate-500 text-sm">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── 社會認證區塊 ────────────────────────────────────────────────
function TestimonialsSection() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <Badge className="mb-4 bg-emerald-500/10 border-emerald-500/30 text-emerald-400 border">
            用戶見證
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 font-serif">
            他們都在用天命共振
          </h2>
          <p className="text-slate-400">
            真實用戶的真實體驗，讓命理智慧成為日常決策的好夥伴
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {TESTIMONIALS.map((t, index) => {
            const style = ELEMENT_COLORS[t.element] ?? ELEMENT_COLORS["火"];
            return (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="rounded-xl p-6 bg-slate-900/60 border border-slate-700/40 hover:border-slate-600/50 transition-colors"
              >
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-5">
                  「{t.content}」
                </p>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full ${style.bg} ${style.border} border flex items-center justify-center`}>
                    <span className={`text-sm font-bold ${style.text}`}>{t.avatar}</span>
                  </div>
                  <div>
                    <div className="text-white text-sm font-medium">{t.name}</div>
                    <div className="text-slate-500 text-xs">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* 最終 CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center rounded-2xl p-10 bg-gradient-to-b from-amber-950/30 to-slate-900/60 border border-amber-800/20"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8 text-amber-400" />
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-3 font-serif">
            準備好開啟你的天命之旅了嗎？
          </h3>
          <p className="text-slate-400 mb-8 max-w-lg mx-auto">
            加入天命共振，讓千年命理智慧與現代算法，
            為你的每一個決策提供天命加持
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={getLoginUrl()}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white font-semibold text-base transition-all duration-200"
            >
              <LogIn className="w-5 h-5" />
              免費加入天命共振
            </a>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-slate-600/50 text-slate-300 hover:text-white hover:border-slate-500/50 font-medium text-base transition-colors"
            >
              <Sparkles className="w-5 h-5" />
              再次體驗錦囊
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── 頂部導覽列 ────────────────────────────────────────────────
function LandingNav() {
  return (
    <nav className="sticky top-0 z-50 px-4 py-3 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/50">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <span className="text-white font-bold text-sm">天命共振</span>
            <span className="text-amber-400/60 text-xs ml-1 hidden sm:inline">Destiny Oracle</span>
          </div>
        </div>
        <a
          href={getLoginUrl()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600/20 border border-amber-600/30 text-amber-400 hover:bg-amber-600/30 text-sm font-medium transition-colors"
        >
          <LogIn className="w-3.5 h-3.5" />
          登入
        </a>
      </div>
    </nav>
  );
}

// ─── 頁尾 ────────────────────────────────────────────────────────
function LandingFooter() {
  return (
    <footer className="py-8 px-4 border-t border-slate-800/50 bg-slate-950/50">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400/60" />
          <span className="text-slate-500 text-sm">天命共振 Destiny Oracle · 數位錦囊</span>
        </div>
        <p className="text-slate-600 text-xs">
          本系統提供命理參考，不構成任何投資或決策建議
        </p>
      </div>
    </footer>
  );
}

// ─── 主頁面元件 ────────────────────────────────────────────────
export default function LandingPage() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  // 已登入用戶自動跳轉至功能頁
  useEffect(() => {
    if (!loading && user) {
      navigate("/war-room");
    }
  }, [user, loading, navigate]);

  // 載入中
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  // 已登入：顯示跳轉中（useEffect 會跳轉）
  if (user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">正在跳轉至作戰室...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />
      <JinNangSection />
      <StatsSection />
      <FeaturesSection />
      <TestimonialsSection />
      <LandingFooter />
    </div>
  );
}
