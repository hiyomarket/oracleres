/**
 * CharacterProfile.tsx
 * 靈相世界 - 主角色檔案頁（Pikmin Bloom 風格）
 *
 * 設計規格：
 *   - 全螢幕角色展示（素體 + 五行服裝疊加）
 *   - 五行主題動態背景（粒子光效）
 *   - 底部滑動資訊卡（等級 / 貨幣 / Aura Score / 成就）
 *   - 浮動 UI 按鈕（換裝 / 商城 / 戰鬥 / 設定）
 */
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  BODY_BASE_URLS,
  WUXING_THEMES,
  getClothingUrls,
  type WuxingElement,
  type CharacterGender,
} from "@/lib/gameAssets";

// ── 五行中英文對照 ────────────────────────────────────────────
const ZH_TO_EN_ELEMENT: Record<string, WuxingElement> = {
  木: "wood", 火: "fire", 土: "earth", 金: "metal", 水: "water",
};

// ── 等級計算（依 gameCoins 總量估算） ────────────────────────
function calcLevel(gameCoins: number, gameStones: number): number {
  const total = gameCoins + gameStones * 5;
  return Math.max(1, Math.min(99, Math.floor(Math.sqrt(total / 100)) + 1));
}

// ── 粒子系統 ─────────────────────────────────────────────────
interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  drift: number;
}

function useParticles(count: number, color: string) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const animRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const initial: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      opacity: Math.random() * 0.6 + 0.2,
      speed: Math.random() * 0.3 + 0.1,
      drift: (Math.random() - 0.5) * 0.2,
    }));
    particlesRef.current = initial;
    setParticles([...initial]);

    const animate = () => {
      particlesRef.current = particlesRef.current.map((p) => {
        let newY = p.y - p.speed;
        let newX = p.x + p.drift;
        if (newY < -5) { newY = 105; newX = Math.random() * 100; }
        if (newX < -5) newX = 105;
        if (newX > 105) newX = -5;
        return { ...p, x: newX, y: newY };
      });
      setParticles([...particlesRef.current]);
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [count, color]);

  return particles;
}

// ── 角色渲染組件 ──────────────────────────────────────────────
interface CharacterRendererProps {
  gender: CharacterGender;
  element: WuxingElement;
  equippedItems: Array<{ layer: string; imageUrl: string }>;
  glowColor: string;
}

function CharacterRenderer({ gender, element, equippedItems, glowColor }: CharacterRendererProps) {
  const bodyUrl = BODY_BASE_URLS[gender];
  const clothingUrls = getClothingUrls(gender, element);

  // 圖層順序（由下至上）
  const layerOrder = ["bottom", "top", "shoes", "bracelet"];

  // 優先使用 DB 中已裝備的道具 URL，若無則使用五行預設 URL
  function getLayerUrl(layer: string): string | null {
    const equipped = equippedItems.find((i) => i.layer === layer);
    if (equipped?.imageUrl) return equipped.imageUrl;
    const key = layer as keyof typeof clothingUrls;
    return clothingUrls[key] ?? null;
  }

  return (
    <div
      className="relative w-full h-full flex items-center justify-center"
      style={{ filter: `drop-shadow(0 0 40px ${glowColor})` }}
    >
      {/* 素體基底 */}
      <img
        src={bodyUrl}
        alt="character-body"
        className="absolute inset-0 w-full h-full object-contain object-bottom"
        style={{ zIndex: 1 }}
      />
      {/* 服裝圖層疊加 */}
      {layerOrder.map((layer) => {
        const url = getLayerUrl(layer);
        if (!url) return null;
        return (
          <img
            key={layer}
            src={url}
            alt={`layer-${layer}`}
            className="absolute inset-0 w-full h-full object-contain object-bottom"
            style={{ zIndex: layerOrder.indexOf(layer) + 2 }}
          />
        );
      })}
    </div>
  );
}

// ── 底部資訊卡片 ──────────────────────────────────────────────
interface InfoCardProps {
  userName: string;
  level: number;
  gameCoins: number;
  gameStones: number;
  auraScore: number | null;
  unlockedCount: number;
  totalAchievements: number;
  element: WuxingElement;
  accentColor: string;
  textColor: string;
  onClose: () => void;
}

function InfoCard({
  userName, level, gameCoins, gameStones, auraScore,
  unlockedCount, totalAchievements, element, accentColor, textColor, onClose,
}: InfoCardProps) {
  const theme = WUXING_THEMES[element];

  return (
    <div
      className="absolute bottom-0 left-0 right-0 rounded-t-3xl p-6 pb-8"
      style={{
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: `1px solid ${accentColor}40`,
      }}
    >
      {/* 拖拉指示條 */}
      <div className="flex justify-center mb-4">
        <div
          className="w-12 h-1 rounded-full cursor-pointer"
          style={{ background: `${accentColor}60` }}
          onClick={onClose}
        />
      </div>

      {/* 用戶名稱 + 等級 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-white text-xl font-bold">{userName}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: `${accentColor}30`, color: accentColor, border: `1px solid ${accentColor}50` }}
            >
              {theme.nameZh}靈相
            </span>
            <span className="text-gray-400 text-sm">Lv.{level}</span>
          </div>
        </div>
        {/* Aura Score 圓形指示 */}
        <div className="relative w-16 h-16">
          <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
            <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
            <circle
              cx="32" cy="32" r="26" fill="none"
              stroke={accentColor} strokeWidth="4"
              strokeDasharray={`${(auraScore ?? 0) / 100 * 163.4} 163.4`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-white text-sm font-bold leading-none">{auraScore ?? 0}</span>
            <span className="text-gray-400 text-xs leading-none mt-0.5">靈氣</span>
          </div>
        </div>
      </div>

      {/* 貨幣列 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <span className="text-lg">🪙</span>
          <div>
            <div className="text-white text-sm font-semibold">{gameCoins.toLocaleString()}</div>
            <div className="text-gray-500 text-xs">天命幣</div>
          </div>
        </div>
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <span className="text-lg">💎</span>
          <div>
            <div className="text-white text-sm font-semibold">{gameStones.toLocaleString()}</div>
            <div className="text-gray-500 text-xs">靈石</div>
          </div>
        </div>
      </div>

      {/* 成就進度條 */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-gray-400 text-xs">成就進度</span>
          <span className="text-gray-400 text-xs">{unlockedCount} / {totalAchievements}</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: totalAchievements > 0 ? `${(unlockedCount / totalAchievements) * 100}%` : "0%",
              background: `linear-gradient(90deg, ${accentColor}, ${accentColor}80)`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ── 主頁面 ────────────────────────────────────────────────────
export default function CharacterProfile() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [showCard, setShowCard] = useState(true);
  const [activeElement, setActiveElement] = useState<WuxingElement>("wood");

  // tRPC queries
  const { data: equippedData } = trpc.gameAvatar.getEquipped.useQuery();
  const { data: todayAura } = trpc.gameAvatar.getTodayAura.useQuery();
  const { data: achievements } = trpc.gameAchievement.getAll.useQuery();
  const { data: unlockedAchievements } = trpc.gameAchievement.getUnlocked.useQuery();

  // 從 getEquipped 取得日主五行
  useEffect(() => {
    if (equippedData?.dayMasterElementEn) {
      const el = equippedData.dayMasterElementEn as WuxingElement;
      if (WUXING_THEMES[el]) setActiveElement(el);
    }
  }, [equippedData]);

  // 性別（從 userProfiles.gender 讀取，預設 female）
  const gender: CharacterGender = "female"; // 從 user profile 讀取，預設 female

  const theme = WUXING_THEMES[activeElement];
  const particles = useParticles(20, theme.particleColor);

  const level = calcLevel(user?.gameCoins ?? 0, user?.gameStones ?? 0);
  const auraScore = todayAura?.score ?? null;
  const unlockedCount = unlockedAchievements?.length ?? 0;
  const totalAchievements = achievements?.length ?? 0;

  const equippedItems = equippedData?.items ?? [];

  return (
    <div className="fixed inset-0 overflow-hidden select-none" style={{ background: "#0a0a0a" }}>
      {/* ── 五行漸層背景 ── */}
      <div
        className={`absolute inset-0 bg-gradient-to-b ${theme.gradient} transition-all duration-1000`}
        style={{ opacity: 0.9 }}
      />

      {/* ── 背景光暈 ── */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 50% 70%, ${theme.glowColor}, transparent 70%)`,
        }}
      />

      {/* ── 粒子層 ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              background: theme.particleColor,
              opacity: p.opacity,
              filter: "blur(1px)",
              transition: "none",
            }}
          />
        ))}
      </div>

      {/* ── 頂部浮動按鈕列 ── */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 pt-safe pt-4">
        {/* 返回按鈕 */}
        <button
          onClick={() => navigate("/game")}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(10px)" }}
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* 標題 */}
        <div className="text-center">
          <div className="text-white text-sm font-medium opacity-90">靈相世界</div>
          <div className="text-xs opacity-60" style={{ color: theme.textColor }}>
            {theme.nameZh}靈相 · Lv.{level}
          </div>
        </div>

        {/* 設定按鈕 */}
        <button
          onClick={() => navigate("/game/avatar")}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(10px)" }}
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* ── 角色顯示區 ── */}
      <div
        className="absolute inset-0 z-10"
        style={{ bottom: showCard ? "280px" : "80px", transition: "bottom 0.4s ease" }}
      >
        <CharacterRenderer
          gender={gender}
          element={activeElement}
          equippedItems={equippedItems}
          glowColor={theme.glowColor}
        />
      </div>

      {/* ── 底部快捷按鈕列 ── */}
      <div
        className="absolute left-0 right-0 z-20 flex justify-center gap-4 px-6"
        style={{
          bottom: showCard ? "295px" : "90px",
          transition: "bottom 0.4s ease",
        }}
      >
        {[
          { icon: "👗", label: "換裝", path: "/game/avatar" },
          { icon: "🏪", label: "商城", path: "/game/shop" },
          { icon: "⚔️", label: "戰鬥", path: "/game/combat" },
        ].map((btn) => (
          <button
            key={btn.label}
            onClick={() => navigate(btn.path)}
            className="flex flex-col items-center gap-1"
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl"
              style={{
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(10px)",
                border: `1px solid ${theme.accentColor}40`,
              }}
            >
              {btn.icon}
            </div>
            <span className="text-xs text-white opacity-70">{btn.label}</span>
          </button>
        ))}
      </div>

      {/* ── 展開/收合按鈕 ── */}
      <button
        onClick={() => setShowCard((v) => !v)}
        className="absolute z-30 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center"
        style={{
          bottom: showCard ? "268px" : "68px",
          transition: "bottom 0.4s ease",
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(10px)",
          border: `1px solid ${theme.accentColor}40`,
        }}
      >
        <svg
          className="w-4 h-4 text-white transition-transform duration-300"
          style={{ transform: showCard ? "rotate(180deg)" : "rotate(0deg)" }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* ── 底部資訊卡片 ── */}
      <div
        className="absolute left-0 right-0 z-20"
        style={{
          bottom: showCard ? "0px" : "-280px",
          transition: "bottom 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <InfoCard
          userName={user?.name ?? "旅行者"}
          level={level}
          gameCoins={user?.gameCoins ?? 0}
          gameStones={user?.gameStones ?? 0}
          auraScore={auraScore}
          unlockedCount={unlockedCount}
          totalAchievements={totalAchievements}
          element={activeElement}
          accentColor={theme.accentColor}
          textColor={theme.textColor}
          onClose={() => setShowCard(false)}
        />
      </div>

      {/* ── 五行切換指示點 ── */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-2">
        {(Object.keys(WUXING_THEMES) as WuxingElement[]).map((el) => (
          <button
            key={el}
            onClick={() => setActiveElement(el)}
            className="w-2 h-2 rounded-full transition-all duration-300"
            style={{
              background: activeElement === el ? WUXING_THEMES[el].accentColor : "rgba(255,255,255,0.3)",
              transform: activeElement === el ? "scale(1.4)" : "scale(1)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
