/**
 * LandingPage.tsx - 天命共振 Destiny Oracle
 * 完整移植美術 Agent 設計稿
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { Sparkles, Star, Lock, ArrowRight, LogIn, Loader2, AlertCircle, CheckCircle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import StarField from "@/components/StarField";
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

const ENERGY_LEVEL_LABEL: Record<string, { label: string; color: string; emoji: string }> = {
  excellent: { label: "大吉", color: "text-amber-400", emoji: "🌟" },
  good: { label: "吉", color: "text-emerald-400", emoji: "✨" },
  neutral: { label: "平", color: "text-blue-400", emoji: "⚪" },
  challenging: { label: "凶", color: "text-red-400", emoji: "⚠️" },
  complex: { label: "複雜", color: "text-purple-400", emoji: "🔮" },
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
  { value: "3,544+", label: "命盤解讀用戶" },
  { value: "69%", label: "運勢準確率" },
  { value: "258", label: "天不間斷服務" },
  { value: "8", label: "位專業命理師" },
];

const TESTIMONIALS = [
  { name: "Mia C.", role: "創業者", avatar: "M", element: "火", text: "天命共振幫我找到最佳創業時機，去年按照命盤建議的月份出發，現在公司已經穩定成長了！" },
  { name: "Jason L.", role: "投資人", avatar: "J", element: "金", text: "財運羅盤的預測準確度讓我驚訝，幾次重要投資決策都參考了天命指引，回報率明顯提升。" },
  { name: "Sophia W.", role: "設計師", avatar: "S", element: "木", text: "每天早上開啟今日作戰室，感覺整個人的節奏都對了。命格身份證更讓我重新認識自己。" },
];

interface PreviewResult {
  dayMaster: { stem: string; element: string };
  destinyKeyword: string;
  bazi: { yearPillar: string; monthPillar: string; dayPillar: string };
  elementBalance: { dominant: Array<{ element: string; percentage: number }> };
  todayEnergy: { level: string; dayPillar: string; description: string };
  todayAdvice: string;
  luckyElement: { element: string; color: string; direction: string };
  teaser: string;
  cta: { message: string; registerUrl: string };
}

function LandingNav() {
  return (
    <nav className="absolute top-0 left-0 right-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={CDN.logo} alt="天命共振" className="w-9 h-9 object-contain drop-shadow-[0_0_8px_rgba(201,162,39,0.6)]" />
          <div>
            <span className="text-white font-bold text-base tracking-wide">天命共振</span>
            <span className="text-amber-400/60 text-xs ml-2 hidden sm:inline">數位錦囊</span>
          </div>
        </div>
        <a href={getLoginUrl()} className="flex items-center gap-2 px-5 py-2 rounded-full bg-amber-500/90 hover:bg-amber-400 text-slate-900 font-semibold text-sm transition-all duration-200 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
          <LogIn className="w-3.5 h-3.5" />
          登入
        </a>
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
    <section className="relative min-h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0">
        <img src={CDN.heroBg} alt="天命共振背景" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d1b2e]/85 via-[#0d1b2e]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1b2e]/60 via-transparent to-transparent" />
      </div>
      <StarField className="opacity-60" />

      <motion.div className="absolute right-0 top-1/2 -translate-y-1/2 w-[55vw] max-w-[700px] pointer-events-none hidden md:block"
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2, ease: "easeOut" }}>
        <motion.img src={CDN.orb} alt="命盤光球" className="w-full h-full object-contain drop-shadow-[0_0_60px_rgba(201,162,39,0.3)]"
          animate={{ y: [0, -18, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} />
      </motion.div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-24 pb-16">
        <div className="max-w-xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="flex items-center gap-2 mb-6">
            <span className="text-amber-400/80 text-xs tracking-[0.3em] uppercase font-medium">DESTINY ORACLE · 天命共振</span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold text-white mb-4 leading-[1.1] font-serif">
            解讀天命<br />掌握命運
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
            className="text-slate-300/80 text-base leading-relaxed mb-8">
            融合東方玄學與現代 AI，為你解讀命盤、指引每日運勢。<br />輸入生日，立即開啟你的數位錦囊。
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}
            className="bg-slate-900/70 backdrop-blur-md rounded-2xl border border-slate-700/50 p-5 shadow-2xl">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-amber-400 text-sm font-medium">❖ 免費體驗今日運勢</span>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <Input type="date" value={birthInput} onChange={(e) => setBirthInput(e.target.value)}
                min="1920-01-01" max="2010-12-31"
                className="flex-1 h-11 bg-slate-800/60 border-slate-600/50 text-white placeholder:text-slate-500 focus:border-amber-500/60 text-base" />
              <Button type="submit" disabled={!birthInput || fortuneMutation.isPending}
                className="h-11 px-6 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm shrink-0 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all">
                {fortuneMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "開啟錦囊"}
              </Button>
            </form>
            {error && <div className="mt-3 flex items-center gap-2 text-red-400 text-sm"><AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span></div>}
            <div className="mt-3">
              <a href={getLoginUrl()} className="text-slate-400 text-xs hover:text-amber-400 transition-colors">
                登入後，你的元神將正式覺醒<span className="ml-1 text-slate-500">解鎖完整命盤功能</span>
              </a>
            </div>
          </motion.div>

          <AnimatePresence>
            {fortuneResult && (
              <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.5 }} className="mt-4">
                <div className="rounded-2xl bg-slate-900/90 border border-amber-500/20 backdrop-blur-sm overflow-hidden p-5">
                  <FortuneCard
                    fortune={fortuneResult.fortune}
                    birthdate={fortuneResult.birthdate}
                    onClose={() => { setFortuneResult(null); setBirthInput(""); }}
                  />
                  <div className="mt-4 pt-4 border-t border-slate-700/40">
                    <a href={getLoginUrl()} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white font-semibold text-sm transition-all">
                      <LogIn className="w-4 h-4" />免費加入，解鎖完整命格
                    </a>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <motion.div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-slate-400/60 text-xs"
        animate={{ y: [0, 6, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
        <span>探索更多</span>
        <ChevronDown className="w-4 h-4" />
      </motion.div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className="py-24 px-6 bg-[#0d1b2e]">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-14">
          <p className="text-amber-400/70 text-xs tracking-[0.3em] uppercase mb-3">CORE FEATURES</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 font-serif">六大天命模組</h2>
          <p className="text-slate-400 text-base max-w-xl mx-auto">從命格解讀到每日指引，全方位覆蓋你的命理需求</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {FEATURE_CARDS.map((card, index) => (
            <motion.div key={card.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className="relative rounded-2xl border border-slate-700/40 bg-slate-900/60 backdrop-blur-sm p-6 hover:border-slate-600/60 transition-all duration-300 group overflow-hidden">
              {card.locked ? (
                <div className="absolute top-4 right-4 flex items-center gap-1 text-slate-500 text-xs"><Lock className="w-3 h-3" /><span>會員限定</span></div>
              ) : (
                <div className={`absolute top-4 right-4 text-xs px-2 py-0.5 rounded-full ${card.tagColor}`}>{card.tag}</div>
              )}
              <div className="w-16 h-16 mb-5">
                <img src={card.img} alt={card.title} className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110" />
              </div>
              <h3 className={`text-lg font-bold mb-1 ${card.locked ? "text-slate-400" : "text-white"}`}>{card.title}</h3>
              <p className="text-amber-400/70 text-xs mb-3">{card.subtitle}</p>
              <p className={`text-sm leading-relaxed ${card.locked ? "text-slate-500" : "text-slate-400"}`}>{card.desc}</p>
              <a href={getLoginUrl()} className={`mt-4 flex items-center gap-1 text-xs transition-colors ${card.locked ? "text-slate-500 hover:text-slate-400" : "text-amber-400/70 hover:text-amber-400"}`}>
                {!card.locked && <CheckCircle className="w-3.5 h-3.5" />}
                <span>登入後，你的元神將正式覺醒</span>
              </a>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-500/0 to-amber-500/0 group-hover:from-amber-500/3 group-hover:to-transparent transition-all duration-500 pointer-events-none" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  return (
    <section className="py-16 px-6 bg-[#091525] border-y border-slate-800/50">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((stat, index) => (
            <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }} className="text-center">
              <div className="text-4xl font-bold text-amber-400 font-serif mb-2">{stat.value}</div>
              <div className="text-slate-500 text-sm">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section className="py-24 px-6 bg-[#0d1b2e]">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-14">
          <p className="text-amber-400/70 text-xs tracking-[0.3em] uppercase mb-3">TESTIMONIALS</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 font-serif">他們的天命故事</h2>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {TESTIMONIALS.map((t, index) => {
            const style = ELEMENT_COLORS[t.element] ?? ELEMENT_COLORS["火"];
            return (
              <motion.div key={t.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="rounded-2xl bg-slate-900/60 border border-slate-700/40 p-6 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-full ${style.bg} ${style.border} border flex items-center justify-center`}>
                    <span className={`font-bold text-sm ${style.text}`}>{t.avatar}</span>
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">{t.name}</div>
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
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center">
          <div className="inline-block mb-8">
            <motion.img src={CDN.orb} alt="命盤光球" className="w-24 h-24 object-contain mx-auto opacity-80"
              animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
          </div>
          <h3 className="text-3xl md:text-4xl font-bold text-white mb-3 font-serif">登入後，你的元神將正式覺醒</h3>
          <p className="text-slate-400 mb-8 max-w-lg mx-auto text-sm leading-relaxed">
            解鎖命格身份證、天命問卜、財運羅盤等完整功能，<br />讓 AI 命理師成為你最貼身的人生顧問。
          </p>
          <a href={getLoginUrl()} className="inline-flex items-center gap-3 px-10 py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-base transition-all duration-200 shadow-[0_0_40px_rgba(245,158,11,0.4)] hover:shadow-[0_0_60px_rgba(245,158,11,0.5)]">
            立即覺醒元神<ArrowRight className="w-5 h-5" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="py-8 px-6 border-t border-slate-800/50 bg-[#091525]">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
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

  useEffect(() => {
    if (!loading && user) navigate("/war-room");
  }, [user, loading, navigate]);

  if (loading) {
    return <div className="min-h-screen bg-[#0d1b2e] flex items-center justify-center"><Loader2 className="w-8 h-8 text-amber-400 animate-spin" /></div>;
  }

  if (user) {
    return (
      <div className="min-h-screen bg-[#0d1b2e] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">正在跳轉至作戰室...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1b2e] text-white">
      <LandingNav />
      <HeroSection />
      <FeaturesSection />
      <StatsSection />
      <TestimonialsSection />
      <LandingFooter />
    </div>
  );
}
