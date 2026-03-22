/**
 * LandingPage.tsx - 天命共振 Destiny Oracle
 * 整合排程 Agent 設計稿：全息漸層、glass-card hover 金光、ripple 波紋、居中布局
 */
import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { Sparkles, Star, Lock, ArrowRight, LogIn, Loader2, AlertCircle, CheckCircle, ChevronDown, Sun, Moon } from "lucide-react";
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

const ELEMENT_COLORS: Record<string, { gradient: string; text: string; bg: string; border: string }> = {
  木: { gradient: "from-emerald-600 to-green-500", text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  火: { gradient: "from-red-600 to-orange-500", text: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30" },
  土: { gradient: "from-amber-600 to-yellow-500", text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  金: { gradient: "from-slate-400 to-gray-300", text: "text-slate-300", bg: "bg-slate-500/10", border: "border-slate-400/30" },
  水: { gradient: "from-blue-600 to-cyan-500", text: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
};

const FEATURE_CARDS = [
  { img: CDN.iconDestinyCard, title: "命格身份證", subtitle: "解讀你的天命密碼", desc: "根據生辰八字，生成專屬命格身份證，揭示你的元神屬性與人生主線。", tag: "會員限定", tagColor: "bg-slate-700/60 text-slate-300", locked: true },
  { img: CDN.iconWarRoom, title: "今日作戰室", subtitle: "每日策略指引", desc: "結合今日流年流月，提供最佳行動時機與避忌事項，讓你每天都能精準出擊。", tag: "每日更新", tagColor: "bg-emerald-500/20 text-emerald-400", locked: false },
  { img: CDN.iconOracle, title: "天命問卜", subtitle: "AI 命理諮詢", desc: "以天命 AI 為媒介，針對感情、事業、財運提出問題，獲得深度命理解析。", tag: "會員限定", tagColor: "bg-slate-700/60 text-slate-300", locked: true },
  { img: CDN.iconWealth, title: "財運羅盤", subtitle: "財富流向預測", desc: "精算流年財星位置，分析最佳投資時機與財富增長方向，掌握天時地利。", tag: "免費體驗", tagColor: "bg-amber-500/20 text-amber-400", locked: false },
  { img: CDN.iconDestinyCard, title: "天命日曆", subtitle: "吉凶宜忌一覽", desc: "整合農曆節氣、個人命盤，標示每日吉凶宜忌，讓重要決策都能順天應時。", tag: "核心功能", tagColor: "bg-blue-500/20 text-blue-400", locked: false },
  { img: CDN.iconLottery, title: "數位錦囊", subtitle: "隨身命理秘書", desc: "隨時隨地開啟錦囊，獲取當下最需要的命理指引，如同隨身攜帶命理師。", tag: "核心功能", tagColor: "bg-purple-500/20 text-purple-400", locked: false },
];

const STATS = [
  { value: "22", label: "大阿爾卡納塔羅牌", sub: "每日流日精準對應" },
  { value: "120", label: "天干地支命格組合", sub: "10天干 × 12地支" },
  { value: "5行", label: "能量即時共振", sub: "木火土金水全維度" },
  { value: "24", label: "節氣命盤校準", sub: "順天應時精準指引" },
];

const TESTIMONIALS = [
  { name: "Mia C.", role: "創業者", avatar: "M", element: "火", text: "天命共振讓我开始注意流日能量的變化，選對時機做决定就是比較輕鬆。不是魔法，是讓自己更清醒的工具。" },
  { name: "Jason L.", role: "自雇工作者", avatar: "J", element: "金", text: "天命日曆讓我知道哪幾天適合推進新案子、哪幾天適合休息整理思路。安排工作節奏變得比以前自然多了。" },
  { name: "Sophia W.", role: "設計師", avatar: "S", element: "木", text: "每天早上看一下今日作戰室，感覺整個人的節奏都對了。命格身份證讓我重新認識自己的天生屬性，很有趣。" },
];

/** 星星粒子 Canvas（純 CSS 動畫，不依賴 framer-motion） */
function StarCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
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

function LandingNav({ darkMode, onToggle }: { darkMode: boolean; onToggle: () => void }) {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b border-white/10"
      style={{ background: "rgba(13, 27, 46, 0.85)" }}
    >
      <div className="container flex items-center justify-between h-16">
        <div className="flex items-center gap-3">
          <img src={CDN.logo} alt="天命共振" className="w-9 h-9 object-contain drop-shadow-[0_0_8px_rgba(201,162,39,0.6)]" />
          <div>
            <span className="text-lg font-bold text-gold-gradient">天命共振</span>
            <span className="hidden sm:block text-xs text-slate-400 tracking-widest">數位錦囊</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onToggle}
            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-amber-400 transition-colors"
            title="切換日夜模式"
          >
            {darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
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

function HeroSection() {
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
      {/* 背景圖片 */}
      <div className="absolute inset-0">
        <img
          src={CDN.heroBg}
          alt="天命共振背景"
          className="w-full h-full object-cover transition-opacity duration-1000 opacity-100"
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(rgba(13,27,46,0.3) 0%, rgba(13,27,46,0.1) 40%, rgba(13,27,46,0.7) 100%)" }}
        />
      </div>

      {/* 星星 Canvas */}
      <StarCanvas className="absolute inset-0 w-full h-full pointer-events-none opacity-60" />

      {/* 主要內容：左文右球 */}
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
                <span className="text-foreground">掌握命運</span>
              </h1>
            </div>

            <p
              className="text-base sm:text-lg text-slate-300/80 max-w-lg mx-auto lg:mx-0 leading-relaxed animate-slide-up"
              style={{ animationDelay: "0.2s" }}
            >
              融合東方玄學與現代 AI，為你解讀命盤、指引每日運勢。
              <br className="hidden sm:block" />
              輸入生日，立即開啟你的數位錦囊。
            </p>

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
                  {fortuneMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "開啟錦囊"}
                </Button>
              </form>
              {error && (
                <div className="mt-3 flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
                </div>
              )}
              <p className="mt-3 text-xs text-center text-muted-foreground">
                <a href={getLoginUrl()} className="text-[#C9A227] hover:underline font-medium">
                  登入後，你的元神將正式覺醒
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
                  <div className="rounded-2xl bg-slate-900/90 border border-amber-500/20 backdrop-blur-sm overflow-hidden p-5">
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
            {/* 光暈背景 */}
            <div
              className="absolute inset-0 rounded-full blur-3xl opacity-40"
              style={{ background: "radial-gradient(circle, rgba(201,162,39,0.5) 0%, rgba(0,206,209,0.3) 50%, transparent 70%)" }}
            />
            {/* Ripple 波紋 */}
            <div className="absolute inset-0 flex items-center justify-center">
              {[
                { size: "60%", delay: "0s", duration: "2.5s" },
                { size: "80%", delay: "0.8s", duration: "3s" },
                { size: "100%", delay: "1.6s", duration: "3.5s" },
              ].map((ring, i) => (
                <div
                  key={i}
                  className="absolute rounded-full border border-[#C9A227]/20"
                  style={{
                    width: ring.size,
                    height: ring.size,
                    animation: `ripple-expand ${ring.duration} ease-out ${ring.delay} infinite`,
                  }}
                />
              ))}
            </div>
            {/* 光球圖片 */}
            <img
              src={CDN.orb}
              alt="命盤光球"
              className="relative z-10 w-full h-full object-contain orb-float drop-shadow-[0_0_40px_rgba(201,162,39,0.5)]"
            />
          </div>
        </div>
      </div>

      {/* 向下滾動提示 */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-slate-400/60 text-xs"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <span>探索更多</span>
        <ChevronDown className="w-4 h-4" />
      </motion.div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className="py-20 lg:py-28 relative overflow-hidden" style={{ background: "rgba(13,27,46,1)" }}>
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <p className="text-amber-400/70 text-xs tracking-[0.3em] uppercase mb-3">CORE FEATURES</p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            六大<span className="text-holographic">天命模組</span>
          </h2>
          <p className="text-slate-400 text-base max-w-xl mx-auto">從命格解讀到每日指引，全方位覆蓋你的命理需求</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {FEATURE_CARDS.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className="glass-card rounded-2xl p-6 group relative overflow-hidden"
            >
              {card.locked ? (
                <div className="absolute top-4 right-4 flex items-center gap-1 text-slate-500 text-xs">
                  <Lock className="w-3 h-3" /><span>會員限定</span>
                </div>
              ) : (
                <div className={`absolute top-4 right-4 text-xs px-2 py-0.5 rounded-full ${card.tagColor}`}>{card.tag}</div>
              )}
              <div className="w-16 h-16 mb-5">
                <img src={card.img} alt={card.title} className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110" />
              </div>
              <h3 className={`text-lg font-bold mb-1 ${card.locked ? "text-slate-400" : "text-foreground"}`}>{card.title}</h3>
              <p className="text-amber-400/70 text-xs mb-3">{card.subtitle}</p>
              <p className={`text-sm leading-relaxed ${card.locked ? "text-slate-500" : "text-slate-400"}`}>{card.desc}</p>
              <a
                href={getLoginUrl()}
                className={`mt-4 flex items-center gap-1 text-xs transition-colors ${card.locked ? "text-slate-500 hover:text-slate-400" : "text-amber-400/70 hover:text-amber-400"}`}
              >
                {!card.locked && <CheckCircle className="w-3.5 h-3.5" />}
                <span>登入後，你的元神將正式覺醒</span>
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  return (
    <section
      className="py-16 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(201,162,39,0.08) 0%, rgba(0,206,209,0.05) 100%)",
        borderTop: "1px solid rgba(201,162,39,0.2)",
        borderBottom: "1px solid rgba(201,162,39,0.2)",
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
              <div className="text-slate-200 text-sm font-medium mb-0.5">{stat.label}</div>
              {stat.sub && <div className="text-slate-500 text-xs">{stat.sub}</div>}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section className="py-24 relative overflow-hidden" style={{ background: "rgba(13,27,46,1)" }}>
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <p className="text-amber-400/70 text-xs tracking-[0.3em] uppercase mb-3">TESTIMONIALS</p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            他們的<span className="text-holographic">天命故事</span>
          </h2>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
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
                    <div className="text-foreground font-semibold text-sm">{t.name}</div>
                    <div className="text-slate-500 text-xs">{t.role}</div>
                  </div>
                  <div className="ml-auto flex gap-0.5">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />)}
                  </div>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">「{t.text}」</p>
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
          <h3 className="text-3xl md:text-4xl font-bold mb-3">
            登入後，你的<span className="text-holographic">元神</span>將正式覺醒
          </h3>
          <p className="text-slate-400 mb-8 max-w-lg mx-auto text-sm leading-relaxed">
            解鎖命格身份證、天命問卜、財運羅盤等完整功能，
            <br />讓 AI 命理師成為你最貼身的人生顧問。
          </p>
          <a
            href={getLoginUrl()}
            className="inline-flex items-center gap-3 px-10 py-4 rounded-2xl font-bold text-base transition-all duration-200 gold-pulse"
            style={{
              background: "linear-gradient(135deg, #C9A227, #F5D06A)",
              color: "#1a1a2e",
            }}
          >
            立即覺醒元神 <ArrowRight className="w-5 h-5" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="py-8 border-t border-slate-800/50" style={{ background: "rgba(9,21,37,1)" }}>
      <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <img src={CDN.logo} alt="天命共振" className="w-6 h-6 object-contain opacity-70" />
          <span className="text-slate-500 text-sm">天命共振 Destiny Oracle · 數位命理秘書 · 融合東方玄學與現代科技</span>
        </div>
        <p className="text-slate-600 text-xs">© 2026 天命共振 · 本系統提供命理參考，不構成任何投資或決策建議</p>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [darkMode, setDarkMode] = useState(true);

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
    <div className="min-h-screen text-foreground" style={{ background: "#0d1b2e" }}>
      <LandingNav darkMode={darkMode} onToggle={() => setDarkMode(!darkMode)} />
      <HeroSection />
      <FeaturesSection />
      <StatsSection />
      <TestimonialsSection />
      <LandingFooter />
    </div>
  );
}
