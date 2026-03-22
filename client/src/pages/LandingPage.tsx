/**
 * LandingPage.tsx - 天命共振 Destiny Oracle
 * v1.9：MVP 首頁大改版 — 五大功能展示（CSS 手機框架）+ 生活化行銷語法
 */
import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Sparkles, Star, Lock, ArrowRight, LogIn, Loader2,
  AlertCircle, CheckCircle, ChevronDown, Sun, Moon,
  Calendar, Coins, Shuffle, BookOpen, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import FortuneCard from "@/components/FortuneCard";

const CDN = {
  logo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663104688923/MLF7bLVZzzxdGTPVXTct3c/logo_b72df721.png",
  heroBg: "https://d2xsxph8kpxj0f.cloudfront.net/310519663104688923/MLF7bLVZzzxdGTPVXTct3c/hero_bg_bf834d5c.png",
  orb: "https://d2xsxph8kpxj0f.cloudfront.net/310519663104688923/MLF7bLVZzzxdGTPVXTct3c/orb_99cde47d.png",
  iconDestinyCard: "https://d2xsxph8kpxj0f.cloudfront.net/310519663104688923/MLF7bLVZzzxdGTPVXTct3c/icon_destiny_card_2abbf718.png",
  iconWarRoom: "https://d2xsxph8kpxj0f.cloudfront.net/310519663104688923/MLF7bLVZzzxdGTPVXTct3c/icon_war_room_116def49.png",
  iconOracle: "https://d2xsxph8kpxj0f.cloudfront.net/310519663104688923/MLF7bLVZzzxdGTPVXTct3c/icon_oracle_7ac88381.png",
  iconWealth: "https://d2xsxph8kpxj0f.cloudfront.net/310519663104688923/MLF7bLVZzzxdGTPVXTct3c/icon_wealth_4ae8ffed.png",
  iconLottery: "https://d2xsxph8kpxj0f.cloudfront.net/310519663104688923/MLF7bLVZzzxdGTPVXTct3c/icon_lottery_38c16ec6.png",
};

/** 主題配色 token — 深色 / 淺色模式 */
function getTheme(dark: boolean) {
  return dark
    ? {
        pageBg: "#0d1b2e",
        sectionBg: "rgba(13,27,46,1)",
        sectionBg2: "rgba(9,21,37,1)",
        sectionAlt: "rgba(10,20,38,1)",
        navBg: "rgba(13,27,46,0.85)",
        statsBg: "linear-gradient(135deg,rgba(201,162,39,0.08) 0%,rgba(0,206,209,0.05) 100%)",
        statsBorder: "rgba(201,162,39,0.2)",
        heroOverlay: "linear-gradient(rgba(13,27,46,0.3) 0%,rgba(13,27,46,0.1) 40%,rgba(13,27,46,0.7) 100%)",
        text: "text-slate-200",
        textSub: "text-slate-400",
        textMuted: "text-slate-500",
        textBody: "text-slate-300",
        cardText: "text-slate-100",
        cardTextLocked: "text-slate-300",
        cardDesc: "text-slate-300",
        cardDescLocked: "text-slate-400",
        footerBorder: "border-slate-800/50",
        footerText: "text-slate-500",
        footerCopy: "text-slate-600",
        resultBg: "bg-slate-900/90 border-amber-500/20",
        starOpacity: "opacity-60",
        toggleLabel: "夜晚",
        toggleIcon: <Moon className="w-4 h-4" />,
        phoneBg: "rgba(15,25,50,0.95)",
        phoneHeader: "rgba(20,35,65,0.9)",
        phoneCard: "rgba(25,45,80,0.8)",
        phoneText: "#e2e8f0",
        phoneSubText: "#94a3b8",
        phoneAccent: "#C9A227",
        phoneBorder: "rgba(201,162,39,0.2)",
      }
    : {
        pageBg: "#f5f0e8",
        sectionBg: "rgba(245,240,232,1)",
        sectionBg2: "rgba(237,231,220,1)",
        sectionAlt: "rgba(250,245,238,1)",
        navBg: "rgba(245,240,232,0.92)",
        statsBg: "linear-gradient(135deg,rgba(201,162,39,0.12) 0%,rgba(0,150,160,0.07) 100%)",
        statsBorder: "rgba(201,162,39,0.3)",
        heroOverlay: "linear-gradient(rgba(245,240,232,0.2) 0%,rgba(245,240,232,0.05) 40%,rgba(245,240,232,0.75) 100%)",
        text: "text-slate-800",
        textSub: "text-slate-600",
        textMuted: "text-slate-600",
        textBody: "text-slate-700",
        cardText: "text-slate-800",
        cardTextLocked: "text-slate-600",
        cardDesc: "text-slate-600",
        cardDescLocked: "text-slate-500",
        footerBorder: "border-amber-200/60",
        footerText: "text-slate-500",
        footerCopy: "text-slate-400",
        resultBg: "bg-amber-50/90 border-amber-300/40",
        starOpacity: "opacity-20",
        toggleLabel: "白天",
        toggleIcon: <Sun className="w-4 h-4" />,
        phoneBg: "rgba(240,235,225,0.95)",
        phoneHeader: "rgba(230,225,215,0.9)",
        phoneCard: "rgba(255,252,248,0.9)",
        phoneText: "#1e293b",
        phoneSubText: "#64748b",
        phoneAccent: "#C9A227",
        phoneBorder: "rgba(201,162,39,0.3)",
      };
}

const ELEMENT_COLORS: Record<string, { gradient: string; text: string; bg: string; border: string }> = {
  木: { gradient: "from-emerald-600 to-green-500", text: "text-emerald-600", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  火: { gradient: "from-red-600 to-orange-500", text: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/30" },
  土: { gradient: "from-amber-600 to-yellow-500", text: "text-amber-600", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  金: { gradient: "from-slate-400 to-gray-300", text: "text-slate-500", bg: "bg-slate-500/10", border: "border-slate-400/30" },
  水: { gradient: "from-blue-600 to-cyan-500", text: "text-blue-600", bg: "bg-blue-500/10", border: "border-blue-500/30" },
};

const STATS = [
  { value: "22", label: "大阿爾卡納塔羅牌", sub: "每日流日精準對應" },
  { value: "120+", label: "天干地支命格組合", sub: "10天干 × 12地支" },
  { value: "5行", label: "能量即時共振", sub: "木火土金水全維度" },
  { value: "24", label: "節氣命盤校準", sub: "順天應時精準指引" },
];

const TESTIMONIALS = [
  {
    name: "小雅", role: "上班族", avatar: "雅", element: "火",
    text: "以前每天都不知道要怎麼開始，現在早上看一下今日作戰室，整個人的節奏就對了。感覺不是迷信，是讓自己更有方向感的工具"
  },
  {
    name: "阿凱", role: "自由接案", avatar: "凱", element: "金",
    text: "用擲筊問了一個糾結很久的合作案，結果是陰杯。雖然只是參考，但那個當下我突然想清楚了，有些事情心裡其實早就有答案"
  },
  {
    name: "Sophia", role: "設計師", avatar: "S", element: "木",
    text: "命格身份證讓我重新認識自己，原來我的天生特質是這樣。天命問卜的解析也很細，不是那種模糊的說法，是真的有針對我的情況"
  },
  {
    name: "大偉", role: "創業者", avatar: "偉", element: "土",
    text: "財運羅盤幫我找到今年最佳的投資時機窗口，結合自己的判斷去行動，感覺比以前瞎猜要踏實多了"
  },
];

/** 星星粒子 Canvas */
function StarCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);
    const stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.2 + 0.3,
      alpha: Math.random(),
      speed: Math.random() * 0.008 + 0.003,
      phase: Math.random() * Math.PI * 2,
    }));
    let animId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const t = Date.now() / 1000;
      stars.forEach((s) => {
        const a = 0.15 + 0.85 * (0.5 + 0.5 * Math.sin(t * s.speed * 10 + s.phase));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} className={className} />;
}

type Theme = ReturnType<typeof getTheme>;

function LandingNav({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b border-white/10"
      style={{ background: theme.navBg }}
    >
      <div className="container flex items-center justify-between h-16">
        <div className="flex items-center gap-3">
          <img src={CDN.logo} alt="天命共振" className="w-9 h-9 object-contain drop-shadow-[0_0_8px_rgba(201,162,39,0.6)]" />
          <div>
            <span className="text-lg font-bold text-gold-gradient">天命共振</span>
            <span className={`hidden sm:block text-xs ${theme.textSub} tracking-widest`}>數位錦囊</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onToggle}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-500/30 ${theme.textSub} hover:text-amber-500 hover:border-amber-500/60 transition-all text-xs`}
            title="切換日夜模式"
          >
            {theme.toggleIcon}
            <span className="hidden sm:inline">{theme.toggleLabel}</span>
          </button>
          <a
            href={getLoginUrl()}
            className="text-sm font-medium px-4 py-1.5 rounded-full transition-all gold-pulse"
            style={{ background: "linear-gradient(135deg, #C9A227, #F5D06A)", color: "#1a1a2e" }}
          >
            登入
          </a>
        </div>
      </div>
    </nav>
  );
}

function HeroSection({ theme }: { theme: Theme }) {
  const [birthInput, setBirthInput] = useState("");
  const [fortuneResult, setFortuneResult] = useState<{
    fortune: {
      overall: string; overall_score: number; summary: string;
      love: string; career: string; wealth: string; health: string;
      lucky_color: string; lucky_number: number; advice: string; element: string;
    };
    birthdate: string;
    lifePath: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fortuneMutation = trpc.fortune.getToday.useMutation({
    onSuccess: (data) => { setFortuneResult(data); setError(null); },
    onError: (err) => { setError(err.message || "推算失敗，請稍後再試"); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!birthInput) return;
    setFortuneResult(null);
    setError(null);
    fortuneMutation.mutate({ birthdate: birthInput });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      <div className="absolute inset-0">
        <img src={CDN.heroBg} alt="天命共振背景" className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: theme.heroOverlay }} />
      </div>
      <StarCanvas className={`absolute inset-0 w-full h-full pointer-events-none ${theme.starOpacity}`} />

      <div className="relative z-10 container">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
          {/* 左側文字區 */}
          <div className="flex-1 text-center lg:text-left space-y-6">
            <div className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
              <p className="text-xs tracking-[0.3em] text-[#C9A227] mb-3 uppercase">
                Destiny Oracle · 天命共振
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                <span className="text-holographic">解讀天命</span>
                <br />
                <span className={theme.text}>掌握命運</span>
              </h1>
            </div>

            <div className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <p className={`text-base sm:text-lg ${theme.textBody} max-w-lg mx-auto lg:mx-0 leading-relaxed`}>
                融合東方玄學與現代 AI，為你解讀命盤、指引每日運勢
              </p>
              <p className={`text-sm ${theme.textSub} max-w-lg mx-auto lg:mx-0 mt-2`}>
                輸入生日，免費體驗今日運勢
              </p>
            </div>

            {/* 輸入卡片 */}
            <div className="glass-card rounded-2xl p-5 max-w-md mx-auto lg:mx-0 animate-slide-up" style={{ animationDelay: "0.3s" }}>
              <p className="text-sm font-medium text-[#C9A227] mb-3 tracking-wide">
                ✦ 免費體驗今日運勢
              </p>
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  type="date"
                  value={birthInput}
                  onChange={(e) => setBirthInput(e.target.value)}
                  min="1920-01-01"
                  max="2010-12-31"
                  aria-label="輸入生日"
                  className="flex-1 bg-input border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#C9A227] focus:ring-1 focus:ring-[#C9A227]/50 transition-all"
                />
                <Button
                  type="submit"
                  disabled={!birthInput || fortuneMutation.isPending}
                  className="relative px-5 py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-60 overflow-hidden shrink-0"
                  style={{ background: "linear-gradient(135deg, #C9A227, #F5D06A)", color: "#1a1a2e" }}
                >
                  {fortuneMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "⭐ 探索今日運勢"}
                </Button>
              </form>
              {error && (
                <div className="mt-3 flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
                </div>
              )}
              <p className={`mt-3 text-xs text-center ${theme.textMuted}`}>
                <a href={getLoginUrl()} className="text-[#C9A227] hover:underline font-medium">
                  登入後，天命之門將為你開啟
                </a>
                ，解鎖完整命盤功能
              </p>
            </div>

            {/* 運勢結果 */}
            <AnimatePresence>
              {fortuneResult && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className={`rounded-2xl backdrop-blur-sm overflow-hidden p-5 border ${theme.resultBg}`}>
                    <FortuneCard
                      fortune={fortuneResult.fortune}
                      birthdate={fortuneResult.birthdate}
                      onClose={() => { setFortuneResult(null); setBirthInput(""); }}
                    />
                    <div className="mt-4 pt-4 border-t border-slate-700/40">
                      <a
                        href={getLoginUrl()}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all"
                        style={{ background: "linear-gradient(135deg, #C9A227, #F5D06A)", color: "#1a1a2e" }}
                      >
                        <LogIn className="w-4 h-4" />免費加入，解鎖完整命格
                      </a>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 右側命盤光球 */}
          <div
            className="flex-shrink-0 relative w-72 h-72 sm:w-96 sm:h-96 lg:w-[420px] lg:h-[420px] animate-fade-in"
            style={{ animationDelay: "0.4s" }}
          >
            <div
              className="absolute inset-0 rounded-full blur-3xl opacity-40"
              style={{ background: "radial-gradient(circle, rgba(201,162,39,0.5) 0%, rgba(0,206,209,0.3) 50%, transparent 70%)" }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              {[
                { size: "60%", delay: "0s", duration: "2.5s" },
                { size: "80%", delay: "0.8s", duration: "3s" },
                { size: "100%", delay: "1.6s", duration: "3.5s" },
              ].map((ring, i) => (
                <div
                  key={i}
                  className="absolute rounded-full border border-[#C9A227]/20"
                  style={{ width: ring.size, height: ring.size, animation: `ripple-expand ${ring.duration} ease-out ${ring.delay} infinite` }}
                />
              ))}
            </div>
            <img
              src={CDN.orb}
              alt="命盤光球"
              className="relative z-10 w-full h-full object-contain orb-float drop-shadow-[0_0_40px_rgba(201,162,39,0.5)]"
            />
          </div>
        </div>
      </div>

      <motion.div
        className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 ${theme.textMuted} text-xs`}
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <span>探索更多</span>
        <ChevronDown className="w-4 h-4" />
      </motion.div>
    </section>
  );
}

/** 手機外框模擬 UI 元件 */
function PhoneMockup({ theme, children }: { theme: Theme; children: React.ReactNode }) {
  return (
    <div className="relative mx-auto" style={{ width: 220, height: 440 }}>
      {/* 手機外框 */}
      <div
        className="absolute inset-0 rounded-[2.5rem] border-2 shadow-2xl"
        style={{
          borderColor: "rgba(201,162,39,0.4)",
          background: theme.phoneBg,
          boxShadow: "0 25px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
        }}
      />
      {/* 頂部瀏海 */}
      <div
        className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-4 rounded-full"
        style={{ background: "rgba(0,0,0,0.6)" }}
      />
      {/* 內容區 */}
      <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden pt-8 pb-4 px-3">
        {children}
      </div>
    </div>
  );
}

/** 今日作戰室手機 UI */
function WarRoomPhone({ theme }: { theme: Theme }) {
  return (
    <PhoneMockup theme={theme}>
      <div className="h-full flex flex-col gap-1.5 text-[10px]">
        {/* 頂部標題 */}
        <div className="rounded-lg px-2 py-1.5" style={{ background: theme.phoneHeader }}>
          <div className="flex items-center justify-between">
            <span style={{ color: theme.phoneAccent }} className="font-bold text-[9px] tracking-wider">今日作戰室</span>
            <span style={{ color: theme.phoneSubText }} className="text-[8px]">3月22日</span>
          </div>
          <div className="mt-0.5 text-[8px]" style={{ color: theme.phoneSubText }}>丙午年 辛卯月 乙未日</div>
        </div>
        {/* 命運指數 */}
        <div className="rounded-lg px-2 py-2" style={{ background: theme.phoneCard, border: `1px solid ${theme.phoneBorder}` }}>
          <div className="text-[8px] mb-1" style={{ color: theme.phoneSubText }}>今日命運指數</div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold" style={{ color: theme.phoneAccent }}>7.8</span>
            <span className="text-[8px]" style={{ color: "#22c55e" }}>大吉</span>
          </div>
          <div className="mt-1 h-1 rounded-full bg-slate-700/30 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: "78%", background: "linear-gradient(90deg, #C9A227, #F5D06A)" }} />
          </div>
        </div>
        {/* 流日塔羅 */}
        <div className="rounded-lg px-2 py-2" style={{ background: theme.phoneCard, border: `1px solid ${theme.phoneBorder}` }}>
          <div className="text-[8px] mb-1" style={{ color: theme.phoneSubText }}>本日流日能量</div>
          <div className="font-bold text-sm" style={{ color: theme.phoneAccent }}>星星</div>
          <div className="text-[8px] mt-0.5" style={{ color: theme.phoneSubText }}>希望 · 靈感 · 療癒</div>
        </div>
        {/* 天命符言 */}
        <div className="rounded-lg px-2 py-2 flex-1" style={{ background: theme.phoneCard, border: `1px solid ${theme.phoneBorder}` }}>
          <div className="text-[8px] mb-1" style={{ color: theme.phoneAccent }}>天命符言</div>
          <div className="text-[8px] leading-relaxed" style={{ color: theme.phoneText }}>
            穩紮穩打，守住現有，星星指引方向，希望就在前方
          </div>
        </div>
        {/* 最佳時機 */}
        <div className="rounded-lg px-2 py-1.5" style={{ background: "rgba(201,162,39,0.1)", border: "1px solid rgba(201,162,39,0.3)" }}>
          <div className="text-[8px]" style={{ color: theme.phoneAccent }}>⚡ 本週最旺時機</div>
          <div className="text-[8px] mt-0.5" style={{ color: theme.phoneText }}>週一 巳時 09:00-11:00</div>
        </div>
      </div>
    </PhoneMockup>
  );
}

/** 天命問卜手機 UI */
function DivinationPhone({ theme }: { theme: Theme }) {
  return (
    <PhoneMockup theme={theme}>
      <div className="h-full flex flex-col gap-1.5 text-[10px]">
        <div className="rounded-lg px-2 py-1.5" style={{ background: theme.phoneHeader }}>
          <div className="flex items-center gap-1">
            <span style={{ color: theme.phoneAccent }} className="font-bold text-[9px]">💰 財運金錢 問卜</span>
          </div>
          <div className="text-[8px] mt-0.5" style={{ color: theme.phoneSubText }}>蘇祐震 的天命問卜</div>
        </div>
        <div className="rounded-lg px-2 py-2" style={{ background: theme.phoneCard, border: `1px solid ${theme.phoneBorder}` }}>
          <div className="text-[8px] mb-1" style={{ color: theme.phoneSubText }}>今日命運指數</div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold" style={{ color: "#f97316" }}>35</span>
            <span className="text-[8px]" style={{ color: "#f97316" }}>小凶</span>
          </div>
        </div>
        <div className="rounded-lg px-2 py-2" style={{ background: theme.phoneCard, border: `1px solid ${theme.phoneBorder}` }}>
          <div className="text-[8px] mb-0.5" style={{ color: theme.phoneSubText }}>本日流日能量</div>
          <div className="font-bold text-sm" style={{ color: theme.phoneAccent }}>星星</div>
          <div className="text-[8px]" style={{ color: theme.phoneSubText }}>希望 · 靈感 · 療癒</div>
        </div>
        <div className="rounded-lg px-2 py-2 flex-1" style={{ background: theme.phoneCard, border: `1px solid ${theme.phoneBorder}` }}>
          <div className="text-[8px] mb-1" style={{ color: theme.phoneAccent }}>天命符言</div>
          <div className="text-[8px] leading-relaxed" style={{ color: theme.phoneText }}>
            穩紮穩打，守住現有，星星指引方向，希望就在前方
          </div>
        </div>
        <div className="rounded-lg px-2 py-1.5 text-center" style={{ background: "linear-gradient(135deg, #C9A227, #F5D06A)" }}>
          <span className="text-[8px] font-bold" style={{ color: "#1a1a2e" }}>深度解析 →</span>
        </div>
      </div>
    </PhoneMockup>
  );
}

/** 擲筊問卜手機 UI */
function OraclePhone({ theme }: { theme: Theme }) {
  return (
    <PhoneMockup theme={theme}>
      <div className="h-full flex flex-col items-center justify-center gap-3 text-[10px]">
        <div className="text-[8px] tracking-wider" style={{ color: theme.phoneAccent }}>✦ 天命共振 ✦</div>
        <div className="text-[8px]" style={{ color: theme.phoneSubText }}>丙午年 辛卯月 乙未日</div>
        {/* 聖杯圖示 */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-3xl"
          style={{ background: "radial-gradient(circle, rgba(201,162,39,0.3), rgba(201,162,39,0.05))", border: "2px solid rgba(201,162,39,0.4)" }}
        >
          🪙
        </div>
        <div className="font-bold text-lg" style={{ color: theme.phoneAccent }}>聖杯</div>
        <div className="text-[9px]" style={{ color: "#22c55e" }}>神明允許</div>
        <div
          className="w-full rounded-lg px-3 py-2 text-center"
          style={{ background: theme.phoneCard, border: `1px solid ${theme.phoneBorder}` }}
        >
          <div className="text-[8px] mb-1" style={{ color: theme.phoneAccent }}>神明指引</div>
          <div className="text-[8px] leading-relaxed" style={{ color: theme.phoneText }}>
            此事可行，時機已到，放心前進
          </div>
        </div>
        <div
          className="w-full rounded-lg px-3 py-2 text-center"
          style={{ background: "rgba(201,162,39,0.1)", border: "1px solid rgba(201,162,39,0.3)" }}
        >
          <div className="text-[8px]" style={{ color: theme.phoneAccent }}>能量共鳴</div>
          <div className="text-[8px] mt-0.5" style={{ color: theme.phoneText }}>火行 · 行動 · 突破</div>
        </div>
      </div>
    </PhoneMockup>
  );
}

/** 命格身份證手機 UI */
function DestinyPhone({ theme }: { theme: Theme }) {
  return (
    <PhoneMockup theme={theme}>
      <div className="h-full flex flex-col gap-1.5 text-[10px]">
        <div className="text-center py-1">
          <div className="text-[8px] tracking-wider" style={{ color: theme.phoneAccent }}>✦ 天命共振 ✦</div>
          <div className="font-bold text-[11px] mt-0.5" style={{ color: theme.phoneAccent }}>命格身份證</div>
        </div>
        <div className="text-center">
          <div className="font-bold text-base" style={{ color: theme.phoneText }}>蘇祐震</div>
          <div className="text-[9px] mt-0.5" style={{ color: theme.phoneAccent }}>教皇 · The Hierophant</div>
        </div>
        <div className="rounded-lg px-2 py-2" style={{ background: theme.phoneCard, border: `1px solid ${theme.phoneBorder}` }}>
          <div className="text-[8px] mb-1.5" style={{ color: theme.phoneSubText }}>生命靈數</div>
          <div className="grid grid-cols-2 gap-1">
            {[
              { num: "5", label: "主要靈魂數", name: "教皇" },
              { num: "8", label: "外在個性數", name: "力量" },
              { num: "10", label: "中間個性數", name: "命運之輪" },
              { num: "22", label: "靈魂渴望數", name: "愚者" },
            ].map((item) => (
              <div key={item.num} className="flex items-baseline gap-1">
                <span className="font-bold text-sm" style={{ color: theme.phoneAccent }}>{item.num}</span>
                <span className="text-[7px]" style={{ color: theme.phoneSubText }}>{item.name}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg px-2 py-2" style={{ background: theme.phoneCard, border: `1px solid ${theme.phoneBorder}` }}>
          <div className="text-[8px] mb-1" style={{ color: theme.phoneSubText }}>八字命盤</div>
          <div className="text-[8px]" style={{ color: theme.phoneText }}>年柱：甲子 · 日柱：甲子</div>
          <div className="text-[8px] mt-0.5" style={{ color: theme.phoneSubText }}>喜用神：火 · 土</div>
        </div>
        <div className="text-center py-1" style={{ color: theme.phoneSubText }}>
          <div className="text-[8px]">教皇 · 傳統 · 智慧</div>
        </div>
      </div>
    </PhoneMockup>
  );
}

/** 樂透/財運手機 UI */
function LotteryPhone({ theme }: { theme: Theme }) {
  return (
    <PhoneMockup theme={theme}>
      <div className="h-full flex flex-col gap-1.5 text-[10px]">
        <div className="rounded-lg px-2 py-1.5" style={{ background: theme.phoneHeader }}>
          <div className="font-bold text-[9px]" style={{ color: theme.phoneAccent }}>💰 財運羅盤</div>
          <div className="text-[8px] mt-0.5" style={{ color: theme.phoneSubText }}>今日幸運數字推算</div>
        </div>
        {/* 幸運號碼 */}
        <div className="rounded-lg px-2 py-3" style={{ background: theme.phoneCard, border: `1px solid ${theme.phoneBorder}` }}>
          <div className="text-[8px] mb-2 text-center" style={{ color: theme.phoneSubText }}>本期命理推薦號碼</div>
          <div className="flex justify-center gap-1.5 flex-wrap">
            {[5, 8, 14, 22, 31, 38].map((n) => (
              <div
                key={n}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold"
                style={{ background: "linear-gradient(135deg, #C9A227, #F5D06A)", color: "#1a1a2e" }}
              >
                {n}
              </div>
            ))}
          </div>
          <div className="text-[7px] text-center mt-2" style={{ color: theme.phoneSubText }}>基於生命靈數 5 · 8 · 22 推算</div>
        </div>
        {/* 財運方位 */}
        <div className="rounded-lg px-2 py-2" style={{ background: theme.phoneCard, border: `1px solid ${theme.phoneBorder}` }}>
          <div className="text-[8px] mb-1" style={{ color: theme.phoneAccent }}>今日財運方位</div>
          <div className="flex gap-2">
            <div className="text-center flex-1">
              <div className="text-[8px] font-bold" style={{ color: "#22c55e" }}>東南方</div>
              <div className="text-[7px]" style={{ color: theme.phoneSubText }}>旺財</div>
            </div>
            <div className="text-center flex-1">
              <div className="text-[8px] font-bold" style={{ color: theme.phoneAccent }}>金色</div>
              <div className="text-[7px]" style={{ color: theme.phoneSubText }}>幸運色</div>
            </div>
          </div>
        </div>
        {/* 流年財星 */}
        <div className="rounded-lg px-2 py-2 flex-1" style={{ background: "rgba(201,162,39,0.08)", border: "1px solid rgba(201,162,39,0.2)" }}>
          <div className="text-[8px] mb-1" style={{ color: theme.phoneAccent }}>流年財星分析</div>
          <div className="text-[8px] leading-relaxed" style={{ color: theme.phoneText }}>
            今年財星入命，適合穩健投資，避免高風險操作
          </div>
        </div>
      </div>
    </PhoneMockup>
  );
}

/** 預約命理手機 UI */
function AppointmentPhone({ theme }: { theme: Theme }) {
  return (
    <PhoneMockup theme={theme}>
      <div className="h-full flex flex-col gap-1.5 text-[10px]">
        <div className="rounded-lg px-2 py-1.5" style={{ background: theme.phoneHeader }}>
          <div className="font-bold text-[9px]" style={{ color: theme.phoneAccent }}>🌸 預約命理諮詢</div>
          <div className="text-[8px] mt-0.5" style={{ color: theme.phoneSubText }}>一對一深度命盤解析</div>
        </div>
        {/* 命理師卡片 */}
        {[
          { name: "天命老師", spec: "八字 · 紫微", rating: "4.9", count: "128" },
          { name: "玄機老師", spec: "塔羅 · 流年", rating: "4.8", count: "96" },
        ].map((master) => (
          <div
            key={master.name}
            className="rounded-lg px-2 py-2"
            style={{ background: theme.phoneCard, border: `1px solid ${theme.phoneBorder}` }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                style={{ background: "linear-gradient(135deg, #C9A227, #F5D06A)", color: "#1a1a2e" }}
              >
                命
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[9px]" style={{ color: theme.phoneText }}>{master.name}</div>
                <div className="text-[7px]" style={{ color: theme.phoneSubText }}>{master.spec}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[8px]" style={{ color: theme.phoneAccent }}>★ {master.rating}</div>
                <div className="text-[7px]" style={{ color: theme.phoneSubText }}>{master.count}次</div>
              </div>
            </div>
          </div>
        ))}
        {/* 預約時段 */}
        <div className="rounded-lg px-2 py-2" style={{ background: theme.phoneCard, border: `1px solid ${theme.phoneBorder}` }}>
          <div className="text-[8px] mb-1.5" style={{ color: theme.phoneSubText }}>可預約時段</div>
          <div className="flex flex-wrap gap-1">
            {["今天 14:00", "今天 16:00", "明天 10:00"].map((t) => (
              <div
                key={t}
                className="text-[7px] px-1.5 py-0.5 rounded"
                style={{ background: "rgba(201,162,39,0.15)", color: theme.phoneAccent, border: "1px solid rgba(201,162,39,0.3)" }}
              >
                {t}
              </div>
            ))}
          </div>
        </div>
        <div
          className="rounded-lg px-2 py-2 text-center"
          style={{ background: "linear-gradient(135deg, #C9A227, #F5D06A)" }}
        >
          <span className="text-[8px] font-bold" style={{ color: "#1a1a2e" }}>立即預約 →</span>
        </div>
      </div>
    </PhoneMockup>
  );
}

/** 五大功能展示區塊 */
const FEATURE_SHOWCASES = [
  {
    id: "war-room",
    icon: <Calendar className="w-6 h-6" />,
    emoji: "⚔️",
    tag: "每日更新",
    tagColor: "bg-emerald-500/20 text-emerald-500",
    title: "今日作戰室",
    subtitle: "每天早上 3 分鐘，知道今天的能量是順是逆",
    desc: "結合你的八字命盤與今日流年流月，精準分析今天的能量狀態、最佳行動時機，以及需要避開的事項。",
    points: ["今日命運指數 + 吉凶判斷", "流日塔羅牌能量解析", "本週最旺時機提醒"],
    cta: "免費體驗",
    locked: false,
    phone: (theme: Theme) => <WarRoomPhone theme={theme} />,
  },
  {
    id: "divination",
    icon: <BookOpen className="w-6 h-6" />,
    emoji: "🔮",
    tag: "AI 命理",
    tagColor: "bg-purple-500/20 text-purple-400",
    title: "天命問卜",
    subtitle: "工作、感情、財運，一次問清楚，不再瞎猜",
    desc: "選擇你最想了解的面向，AI 命理師結合你的八字命盤與今日能量，給出深度、具體的命理解析。",
    points: ["六大主題：感情、事業、財運等", "結合個人命盤的深度解析", "天命符言 + 行動建議"],
    cta: "登入解鎖",
    locked: true,
    phone: (theme: Theme) => <DivinationPhone theme={theme} />,
  },
  {
    id: "oracle",
    icon: <Shuffle className="w-6 h-6" />,
    emoji: "🪙",
    tag: "神明指引",
    tagColor: "bg-amber-500/20 text-amber-500",
    title: "擲筊問卜",
    subtitle: "今天該不該做這件事？讓神明給你一個答案",
    desc: "傳統擲筊儀式的數位化體驗，輸入你的問題，結合今日命理能量，獲得聖杯、陰杯或笑杯的神明回應。",
    points: ["四種筊果：聖杯、陰杯、笑杯、立筊", "結合今日八字能量的詮釋", "能量共鳴 + 行動指引"],
    cta: "免費體驗",
    locked: false,
    phone: (theme: Theme) => <OraclePhone theme={theme} />,
  },
  {
    id: "destiny",
    icon: <Star className="w-6 h-6" />,
    emoji: "✨",
    tag: "會員限定",
    tagColor: "bg-amber-900/40 text-amber-300",
    title: "命格身份證",
    subtitle: "你的天生特質、人生主線，一張卡片說清楚",
    desc: "根據生辰八字精算你的生命靈數、塔羅原型、八字命盤，生成專屬命格身份證，揭示你的天命密碼。",
    points: ["生命靈數四維度解析", "塔羅原型 + 八字命盤", "可分享的命格身份證卡片"],
    cta: "登入解鎖",
    locked: true,
    phone: (theme: Theme) => <DestinyPhone theme={theme} />,
  },
  {
    id: "lottery",
    icon: <Coins className="w-6 h-6" />,
    emoji: "💰",
    tag: "財運分析",
    tagColor: "bg-yellow-500/20 text-yellow-500",
    title: "財運羅盤",
    subtitle: "用命理選號，讓五行幫你挑好運數字",
    desc: "精算流年財星位置，分析最佳投資時機與財富增長方向，並根據你的生命靈數推算今期幸運號碼。",
    points: ["流年財星位置分析", "命理幸運號碼推算", "最佳財運時機窗口"],
    cta: "免費體驗",
    locked: false,
    phone: (theme: Theme) => <LotteryPhone theme={theme} />,
  },
  {
    id: "appointment",
    icon: <Users className="w-6 h-6" />,
    emoji: "🌸",
    tag: "即將推出",
    tagColor: "bg-pink-500/20 text-pink-400",
    title: "預約命理",
    subtitle: "想深聊命格？預約一對一命理諮詢",
    desc: "當 AI 解析還不夠，真人命理師為你深度解盤。預約線上諮詢，針對你的人生課題給出更細膩的指引。",
    points: ["認證命理師一對一諮詢", "八字、紫微、塔羅多元流派", "線上視訊 + 文字諮詢"],
    cta: "預約通知",
    locked: false,
    phone: (theme: Theme) => <AppointmentPhone theme={theme} />,
  },
];

function FeatureShowcaseSection({ theme }: { theme: Theme }) {
  return (
    <section className="py-20 lg:py-28 relative overflow-hidden" style={{ background: theme.sectionBg }}>
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-amber-500/70 text-xs tracking-[0.3em] uppercase mb-3">FEATURES</p>
          <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${theme.text}`}>
            六大<span className="text-holographic">天命功能</span>
          </h2>
          <p className={`${theme.textSub} text-base max-w-xl mx-auto`}>
            從每日運勢到深度命盤，全方位陪你走過每一個人生關口
          </p>
        </motion.div>

        <div className="space-y-24">
          {FEATURE_SHOWCASES.map((feature, index) => {
            const isEven = index % 2 === 0;
            return (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className={`flex flex-col ${isEven ? "lg:flex-row" : "lg:flex-row-reverse"} items-center gap-10 lg:gap-16`}
              >
                {/* 手機模擬 */}
                <div className="flex-shrink-0 relative">
                  {/* 光暈背景 */}
                  <div
                    className="absolute inset-0 -m-8 rounded-full blur-3xl opacity-20"
                    style={{ background: "radial-gradient(circle, rgba(201,162,39,0.6), transparent 70%)" }}
                  />
                  <div className="relative">
                    {feature.phone(theme)}
                  </div>
                </div>

                {/* 文字說明 */}
                <div className="flex-1 text-center lg:text-left space-y-5">
                  {/* 標籤 */}
                  <div className="flex items-center justify-center lg:justify-start gap-3">
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${feature.tagColor}`}>
                      {feature.tag}
                    </span>
                  </div>

                  {/* 標題 */}
                  <div>
                    <div className="flex items-center justify-center lg:justify-start gap-2 mb-2">
                      <span className="text-2xl">{feature.emoji}</span>
                      <h3 className={`text-3xl font-bold ${theme.text}`}>{feature.title}</h3>
                    </div>
                    <p className="text-xl font-medium" style={{ color: "#C9A227" }}>
                      {feature.subtitle}
                    </p>
                  </div>

                  {/* 描述 */}
                  <p className={`${theme.textBody} leading-relaxed text-base max-w-lg mx-auto lg:mx-0`}>
                    {feature.desc}
                  </p>

                  {/* 功能要點 */}
                  <ul className="space-y-2">
                    {feature.points.map((point) => (
                      <li key={point} className="flex items-center justify-center lg:justify-start gap-2">
                        <CheckCircle className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className={`text-sm ${theme.textBody}`}>{point}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <div className="pt-2">
                    <a
                      href={getLoginUrl()}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all"
                      style={
                        feature.locked
                          ? { background: "rgba(201,162,39,0.15)", color: "#C9A227", border: "1px solid rgba(201,162,39,0.4)" }
                          : { background: "linear-gradient(135deg, #C9A227, #F5D06A)", color: "#1a1a2e" }
                      }
                    >
                      {feature.locked ? <Lock className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                      {feature.cta}
                    </a>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StatsSection({ theme }: { theme: Theme }) {
  return (
    <section
      className="py-16 relative overflow-hidden"
      style={{
        background: theme.statsBg,
        borderTop: `1px solid ${theme.statsBorder}`,
        borderBottom: `1px solid ${theme.statsBorder}`,
      }}
    >
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="text-center"
            >
              <div className="text-4xl font-bold text-gold-gradient font-serif mb-1">{stat.value}</div>
              <div className={`${theme.text} text-sm font-medium mb-0.5`}>{stat.label}</div>
              {stat.sub && <div className={`${theme.textMuted} text-xs`}>{stat.sub}</div>}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection({ theme }: { theme: Theme }) {
  return (
    <section className="py-24 relative overflow-hidden" style={{ background: theme.sectionAlt }}>
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <p className="text-amber-500/70 text-xs tracking-[0.3em] uppercase mb-3">TESTIMONIALS</p>
          <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${theme.text}`}>
            他們怎麼說
          </h2>
          <p className={`${theme.textSub} text-base max-w-lg mx-auto`}>
            不是神話，是真實的日常體驗
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
          {TESTIMONIALS.map((t, index) => {
            const style = ELEMENT_COLORS[t.element] ?? ELEMENT_COLORS["火"];
            return (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="glass-card rounded-2xl p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-full ${style.bg} ${style.border} border flex items-center justify-center`}>
                    <span className={`font-bold text-sm ${style.text}`}>{t.avatar}</span>
                  </div>
                  <div>
                    <div className={`${theme.cardText} font-semibold text-sm`}>{t.name}</div>
                    <div className={`${theme.textMuted} text-xs`}>{t.role}</div>
                  </div>
                  <div className="ml-auto flex gap-0.5">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />)}
                  </div>
                </div>
                <p className={`${theme.textBody} text-sm leading-relaxed`}>「{t.text}」</p>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="inline-block mb-8">
            <motion.img
              src={CDN.orb}
              alt="命盤光球"
              className="w-24 h-24 object-contain mx-auto opacity-80 orb-float"
            />
          </div>
          <h3 className={`text-3xl md:text-4xl font-bold mb-4 ${theme.text}`}>
            登入後，<span className="text-holographic">天命之門</span>將為你開啟
          </h3>
          <p className={`${theme.textSub} mb-8 max-w-lg mx-auto text-sm leading-relaxed`}>
            解鎖命格身份證、天命問卜、財運羅盤等完整功能
            <br />讓 AI 命理師成為你最貼身的人生顧問
          </p>
          <a
            href={getLoginUrl()}
            className="inline-flex items-center gap-3 px-10 py-4 rounded-2xl font-bold text-base transition-all duration-200 gold-pulse"
            style={{ background: "linear-gradient(135deg, #C9A227, #F5D06A)", color: "#1a1a2e" }}
          >
            🔮 揭開專屬指引 <ArrowRight className="w-5 h-5" />
          </a>
          <p className={`mt-4 text-xs ${theme.textMuted}`}>
            <Sparkles className="w-3 h-3 inline mr-1 text-amber-500/60" />
            免費加入，隨時開始你的天命旅程 · oracleres.com
          </p>
        </motion.div>
      </div>
    </section>
  );
}

function LandingFooter({ theme }: { theme: Theme }) {
  return (
    <footer className={`py-8 border-t ${theme.footerBorder}`} style={{ background: theme.sectionBg2 }}>
      <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <img src={CDN.logo} alt="天命共振" className="w-6 h-6 object-contain opacity-70" />
          <span className={`${theme.footerText} text-sm`}>天命共振 Destiny Oracle · 數位命理秘書 · 融合東方玄學與現代科技</span>
        </div>
        <p className={`${theme.footerCopy} text-xs`}>© 2026 天命共振 · 本系統提供命理參考，不構成任何投資或決策建議</p>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [darkMode, setDarkMode] = useState(true);
  const theme = getTheme(darkMode);

  useEffect(() => {
    if (!loading && user) navigate("/war-room");
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0d1b2e" }}>
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0d1b2e" }}>
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">正在跳轉至作戰室...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen transition-colors duration-500"
      style={{ background: theme.pageBg }}
    >
      <LandingNav theme={theme} onToggle={() => setDarkMode(!darkMode)} />
      <HeroSection theme={theme} />
      <FeatureShowcaseSection theme={theme} />
      <StatsSection theme={theme} />
      <TestimonialsSection theme={theme} />
      <LandingFooter theme={theme} />
    </div>
  );
}
