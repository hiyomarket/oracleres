/**
 * AvatarRoom.tsx
 * 靈相空間主頁面
 * 路由：/game/avatar
 *
 * 版面：
 *   頂部 - 今日五行建議橫幅
 *   中央 - 角色展示區（AvatarRenderer）
 *   底部 - 衣櫃面板（依圖層分頁）+ 確認穿搭按鈕
 *
 * 命盤連動初始外觀（PROPOSAL-20260323-GAME-命盤連動初始外觀）：
 *   首次進入時 getEquipped 回傳 isFirstTime: true，
 *   前端播放「靈相覺醒」全螢幕動畫（五行光芒匯聚 + 提示彈窗）。
 */

import React, { useState, useCallback, useEffect } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { AvatarRenderer, WUXING_COLORS, LAYER_ORDER, LAYER_LABELS, type AvatarItem } from "@/components/game/AvatarRenderer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, ShoppingBag, Sparkles, Star, RefreshCw, X } from "lucide-react";
import DailyQuestCard from "@/components/game/DailyQuestCard";
import QuestCompleteModal from "@/components/game/QuestCompleteModal";

// ─── 五行顏色點（衣物標籤） ────────────────────────────────────
const WuxingDot: React.FC<{ wuxing: string }> = ({ wuxing }) => {
  const cfg = WUXING_COLORS[wuxing];
  if (!cfg) return null;
  return (
    <span
      className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold ${cfg.bg} ${cfg.text} border border-current`}
      title={`${cfg.label}屬性`}
    >
      {cfg.label}
    </span>
  );
};

// ─── 稀有度標籤 ───────────────────────────────────────────────
const RARITY_STYLES: Record<string, string> = {
  common:    "text-gray-400 border-gray-600",
  rare:      "text-blue-400 border-blue-500",
  epic:      "text-purple-400 border-purple-500",
  legendary: "text-yellow-400 border-yellow-500",
};
const RARITY_LABELS: Record<string, string> = {
  common: "普通", rare: "稀有", epic: "史詩", legendary: "傳說",
};

// ─── 祝福等級樣式 ─────────────────────────────────────────────
const BLESSING_STYLES: Record<string, string> = {
  none:    "from-gray-800 to-gray-900 border-gray-600",
  normal:  "from-blue-900/60 to-gray-900 border-blue-500",
  good:    "from-purple-900/60 to-gray-900 border-purple-500",
  destiny: "from-yellow-900/60 to-gray-900 border-yellow-500",
};

// ─── 五行覺醒配色（TASK-004 指定重點配色） ────────────────────
const WUXING_AWAKENING: Record<string, { color: string; glow: string; label: string; desc: string }> = {
  wood:  { color: "#2E8B57", glow: "rgba(46,139,87,0.6)",  label: "木",  desc: "靈木之氣，生生不息，您的靈相已與自然之力共鳴。" },
  fire:  { color: "#DC143C", glow: "rgba(220,20,60,0.6)",  label: "火",  desc: "烈火之魂，光芒萬丈，您的靈相已與天命之火共鳴。" },
  earth: { color: "#CD853F", glow: "rgba(205,133,63,0.6)", label: "土",  desc: "厚土之德，承載萬物，您的靈相已與大地之力共鳴。" },
  metal: { color: "#C9A227", glow: "rgba(201,162,39,0.6)", label: "金",  desc: "天命之金，銳利精純，您的靈相已與金氣之力共鳴。" },
  water: { color: "#00CED1", glow: "rgba(0,206,209,0.6)",  label: "水",  desc: "量子之水，流動無形，您的靈相已與水命之力共鳴。" },
};

// ─── 靈相覺醒動畫組件 ─────────────────────────────────────────
const AwakeningOverlay: React.FC<{
  elementEn: string;
  elementZh: string;
  onDismiss: () => void;
}> = ({ elementEn, elementZh, onDismiss }) => {
  const cfg = WUXING_AWAKENING[elementEn] ?? WUXING_AWAKENING.wood;
  const [phase, setPhase] = useState<"gather" | "reveal" | "done">("gather");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("reveal"), 1800);
    const t2 = setTimeout(() => setPhase("done"), 3600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.92)" }}
    >
      {/* 光芒匯聚粒子 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i / 24) * 360;
          const delay = (i * 0.08).toFixed(2);
          return (
            <div
              key={i}
              className="absolute w-1 rounded-full"
              style={{
                height: `${60 + Math.random() * 80}px`,
                background: `linear-gradient(to bottom, ${cfg.color}, transparent)`,
                left: "50%",
                top: "50%",
                transformOrigin: "top center",
                transform: `rotate(${angle}deg) translateX(-50%)`,
                opacity: phase === "gather" ? 0.7 : phase === "reveal" ? 1 : 0,
                transition: "opacity 0.8s ease",
                animationDelay: `${delay}s`,
              }}
            />
          );
        })}
        {/* 中心光球 */}
        <div
          className="absolute rounded-full"
          style={{
            width: phase === "reveal" ? "200px" : "60px",
            height: phase === "reveal" ? "200px" : "60px",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            background: `radial-gradient(circle, ${cfg.color}cc, ${cfg.glow}, transparent)`,
            boxShadow: `0 0 60px 20px ${cfg.glow}`,
            transition: "all 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        />
      </div>

      {/* 文字提示卡片 */}
      {phase !== "gather" && (
        <div
          className="relative z-10 mx-6 rounded-2xl border p-6 text-center max-w-sm"
          style={{
            background: "rgba(10,15,26,0.95)",
            borderColor: cfg.color,
            boxShadow: `0 0 30px ${cfg.glow}`,
            animation: "fadeInUp 0.6s ease forwards",
          }}
        >
          {/* 五行符文 */}
          <div
            className="text-6xl font-bold mb-3"
            style={{ color: cfg.color, textShadow: `0 0 20px ${cfg.glow}` }}
          >
            {cfg.label}
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            天命共振，靈相覺醒
          </h2>
          <p className="text-sm text-gray-300 mb-1">
            您的本命五行：<span style={{ color: cfg.color }} className="font-bold">{elementZh}（{cfg.label}）</span>
          </p>
          <p className="text-xs text-gray-400 leading-relaxed mb-4">
            {cfg.desc}
          </p>
          <p className="text-xs text-amber-300 mb-4">
            ✦ 已為您自動裝備本命五行專屬基礎套裝
          </p>
          <Button
            size="sm"
            className="w-full font-semibold"
            style={{
              background: `linear-gradient(135deg, ${cfg.color}cc, ${cfg.color}88)`,
              color: "white",
              border: `1px solid ${cfg.color}`,
            }}
            onClick={onDismiss}
          >
            <Sparkles size={14} className="mr-1" />
            進入靈相空間
          </Button>
        </div>
      )}

      {/* 跳過按鈕 */}
      {phase === "gather" && (
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
          onClick={onDismiss}
        >
          <X size={20} />
        </button>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

// ─── Aura Score 圓形進度 ──────────────────────────────────────
const AuraScoreRing: React.FC<{ score: number }> = ({ score }) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 80 ? "#fbbf24" : score >= 60 ? "#a78bfa" : score >= 30 ? "#60a5fa" : "#6b7280";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="100" height="100" className="-rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#1f2937" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={radius} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-bold" style={{ color }}>{score}</div>
        <div className="text-[10px] text-gray-400">氣場值</div>
      </div>
    </div>
  );
};

// ─── 主頁面 ───────────────────────────────────────────────────
const AvatarRoom: React.FC = () => {
  const [activeLayer, setActiveLayer] = useState<string>("top");
  const [pendingEquipped, setPendingEquipped] = useState<Record<string, number>>({}); // layer → id
  const [showAuraResult, setShowAuraResult] = useState(false);
  const [auraGlowElement, setAuraGlowElement] = useState<string | null>(null);
  const [showAwakening, setShowAwakening] = useState(false);
  const [showQuestComplete, setShowQuestComplete] = useState(false);
  const [questCompleteData, setQuestCompleteData] = useState<{
    wuxing: string; earnedStones: number; auraBonus: number; score: number; blessingLevel: string;
  } | null>(null);

  // ─── tRPC 查詢 ─────────────────────────────────────────────
  const { data: equippedData, isLoading: equippedLoading, refetch: refetchEquipped } =
    trpc.gameAvatar.getEquipped.useQuery();

  // 解構新的回傳格式（含 isFirstTime / dayMasterElement）
  const equipped = equippedData?.items ?? [];
  const isFirstTime = equippedData?.isFirstTime ?? false;
  const dayMasterElementZh = equippedData?.dayMasterElement ?? "";
  const dayMasterElementEn = equippedData?.dayMasterElementEn ?? "wood";

  // 首次進入時觸發覺醒動畫
  useEffect(() => {
    if (isFirstTime) {
      setShowAwakening(true);
    }
  }, [isFirstTime]);

  const { data: inventory, isLoading: inventoryLoading } =
    trpc.gameAvatar.getInventory.useQuery();

  const { data: dailyAdvice } = trpc.gameAvatar.getDailyAdvice.useQuery();

  const { data: todayAura, refetch: refetchTodayAura } =
    trpc.gameAvatar.getTodayAura.useQuery();

  const saveOutfitMutation = trpc.gameAvatar.saveOutfit.useMutation({
    onSuccess: () => {
      refetchEquipped();
      toast.success("穿搭已儲存", { description: "靈相造型已更新" });
    },
    onError: (err: { message: string }) => toast.error("儲存失敗", { description: err.message }),
  });

  // 每日任務查詢
  const { data: dailyQuestData, refetch: refetchQuest } = trpc.gameAvatar.getDailyQuest.useQuery(undefined, {
    staleTime: 60000,
  });

  const submitAuraMutation = trpc.gameAvatar.submitDailyAura.useMutation({
    onSuccess: (data) => {
      refetchTodayAura();
      refetchQuest();
      setShowAuraResult(true);
      if (data.todayTopElement) setAuraGlowElement(data.todayTopElement);
      // 若任務達標，顯示任務完成彈窗
      if (data.questCompleted && dailyQuestData) {
        setQuestCompleteData({
          wuxing: dailyQuestData.targetWuxing,
          earnedStones: data.earnedStones ?? dailyQuestData.reward.stones,
          auraBonus: dailyQuestData.reward.auraBonus,
          score: data.score,
          blessingLevel: data.blessingLevel,
        });
        setShowQuestComplete(true);
      }
    },
    onError: (err: { message: string }) => toast.error("結算失敗", { description: err.message }),
  });

  // ─── 衣物選擇 ──────────────────────────────────────────────
  const handleSelectItem = useCallback((item: AvatarItem) => {
    if (item.id < 0) return; // 預設道具不可選
    setPendingEquipped((prev) => ({ ...prev, [item.layer]: item.id }));
  }, []);

  // ─── 確認穿搭 ──────────────────────────────────────────────
  const handleSaveOutfit = () => {
    const ids = Object.values(pendingEquipped);
    if (ids.length === 0) {
      toast.warning("尚未選擇任何服裝", { description: "請先從衣櫃選擇服裝部件" });
      return;
    }
    saveOutfitMutation.mutate({ equippedIds: ids });
  };

  // ─── 提交每日穿搭 ──────────────────────────────────────────
  const handleSubmitAura = () => {
    if (todayAura) {
      setShowAuraResult(true);
      return;
    }
    submitAuraMutation.mutate();
  };

  // ─── 合併顯示用的裝備（pending 優先） ─────────────────────
  const displayEquipped: AvatarItem[] = React.useMemo(() => {
    if (!equipped || equipped.length === 0) return [];
    return equipped.map((item) => {
      const pendingId = pendingEquipped[item.layer];
      if (pendingId && inventory?.items) {
        const pendingItem = inventory.items.find((i) => i.id === pendingId);
        if (pendingItem) return { ...pendingItem, isDefault: false } as AvatarItem;
      }
      return item as AvatarItem;
    });
  }, [equipped, pendingEquipped, inventory]);

  // ─── 每日任務的裝備五行列表（即時計算） ──────────────────────
  const currentEquippedWuxingList = React.useMemo(() => {
    return displayEquipped.map((item) => item.wuxing).filter(Boolean);
  }, [displayEquipped]);

  // ─── 當前圖層的衣物列表 ────────────────────────────────────
  const currentLayerItems = inventory?.grouped?.[activeLayer] ?? [];

  // ─── Aura 結果資料 ─────────────────────────────────────────
  const auraResult = submitAuraMutation.data ?? (todayAura ? {
    score: todayAura.score,
    blessingLevel: todayAura.blessingLevel,
    blessing: todayAura.blessing,
    alreadySubmitted: true,
  } : null);

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white flex flex-col">

      {/* ── 靈相覺醒動畫（首次進入） ─────────────────────────── */}
      {showAwakening && (
        <AwakeningOverlay
          elementEn={dayMasterElementEn}
          elementZh={dayMasterElementZh}
          onDismiss={() => setShowAwakening(false)}
        />
      )}

      {/* ── 頂部導覽列 ─────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <Link href="/">
          <button className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={18} />
            <span className="text-sm">返回</span>
          </button>
        </Link>
        <h1 className="text-base font-semibold tracking-wider text-amber-300">
          ✦ 靈相空間
        </h1>
        <button
          className="flex items-center gap-1 text-gray-400 hover:text-amber-300 transition-colors"
          onClick={() => toast.info("虛擬服裝商城即將開放")}
        >
          <ShoppingBag size={18} />
          <span className="text-sm">商城</span>
        </button>
      </div>

      {/* ── 任務完成彈窗 ─────────────────────────────────────── */}
      {showQuestComplete && questCompleteData && (
        <QuestCompleteModal
          wuxing={questCompleteData.wuxing}
          earnedStones={questCompleteData.earnedStones}
          auraBonus={questCompleteData.auraBonus}
          score={questCompleteData.score}
          blessingLevel={questCompleteData.blessingLevel}
          onClose={() => setShowQuestComplete(false)}
        />
      )}

      {/* ── 今日五行建議橫幅 ─────────────────────────────────── */}
      {dailyAdvice && (
        <div className="mx-4 mt-3 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-900/30 to-transparent border border-amber-500/30 flex items-center gap-2">
          <Sparkles size={14} className="text-amber-400 shrink-0" />
          <p className="text-xs text-amber-200">{dailyAdvice.advice}</p>
        </div>
      )}

      {/* ── 每日穿搭任務卡片 ─────────────────────────────────── */}
      {dailyQuestData && (
        <div className="mx-4 mt-3">
          <DailyQuestCard
            quest={dailyQuestData}
            equippedWuxingList={currentEquippedWuxingList}
            isSubmitting={submitAuraMutation.isPending}
            onSubmit={handleSubmitAura}
          />
        </div>
      )}

      {/* ── 主體：角色展示 + 衣櫃 ────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">

        {/* 角色展示區 */}
        <div className="flex flex-col items-center gap-4 lg:w-64 shrink-0">
          <div className="relative">
            <AvatarRenderer
              equippedItems={displayEquipped}
              width={200}
              isLoading={equippedLoading}
              auraGlow={auraGlowElement}
            />
          </div>

          {/* 今日 Aura 狀態 */}
          {todayAura && !showAuraResult && (
            <div
              className={`w-full rounded-xl border bg-gradient-to-b p-3 text-center cursor-pointer ${BLESSING_STYLES[todayAura.blessingLevel]}`}
              onClick={() => setShowAuraResult(true)}
            >
              <div className="text-xs text-gray-400 mb-1">今日氣場</div>
              <AuraScoreRing score={todayAura.score} />
              <div className="text-xs text-amber-300 mt-1">{todayAura.blessing?.label}</div>
            </div>
          )}

          {/* Aura 結算結果 */}
          {showAuraResult && auraResult && (
            <div
              className={`w-full rounded-xl border bg-gradient-to-b p-4 ${BLESSING_STYLES[auraResult.blessingLevel]}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">今日氣場結算</span>
                <button onClick={() => setShowAuraResult(false)} className="text-gray-500 hover:text-white text-xs">收起</button>
              </div>
              <div className="flex items-center gap-3">
                <AuraScoreRing score={auraResult.score} />
                <div>
                  <div className="text-sm font-bold text-amber-300">{auraResult.blessing?.label}</div>
                  {auraResult.blessing?.effects.map((e: string, i: number) => (
                    <div key={i} className="text-xs text-gray-300 mt-0.5">• {e}</div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 衣櫃面板 */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* 圖層分頁 */}
          <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
            {LAYER_ORDER.filter((l) => l !== "background").map((layer) => (
              <button
                key={layer}
                onClick={() => setActiveLayer(layer)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeLayer === layer
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/50"
                    : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
                }`}
              >
                {LAYER_LABELS[layer as keyof typeof LAYER_LABELS]}
              </button>
            ))}
            <button
              onClick={() => setActiveLayer("background")}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeLayer === "background"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/50"
                  : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
              }`}
            >
              背景
            </button>
          </div>

          {/* 衣物格子 */}
          <div className="flex-1 overflow-y-auto">
            {inventoryLoading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-xl bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : currentLayerItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                <ShoppingBag size={32} className="mb-2 opacity-40" />
                <p className="text-sm">尚無{LAYER_LABELS[activeLayer as keyof typeof LAYER_LABELS]}道具</p>
                <p className="text-xs mt-1 text-gray-600">前往商城購買或完成任務獲得</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
                {currentLayerItems.map((item) => {
                  const isSelected = pendingEquipped[item.layer] === item.id
                    || (!pendingEquipped[item.layer] && item.isEquipped === 1);
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectItem(item as AvatarItem)}
                      className={`relative aspect-square rounded-xl border overflow-hidden transition-all ${
                        isSelected
                          ? "border-amber-400 ring-2 ring-amber-400/40"
                          : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      <img
                        src={item.imageUrl}
                        alt={item.layer}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            `https://placehold.co/100x100/1a2a3a/666?text=${LAYER_LABELS[item.layer as keyof typeof LAYER_LABELS]}`;
                        }}
                      />
                      {/* 五行標籤 */}
                      <div className="absolute top-1 right-1">
                        <WuxingDot wuxing={item.wuxing} />
                      </div>
                      {/* 稀有度 */}
                      {item.rarity !== "common" && (
                        <div className="absolute bottom-0 left-0 right-0 text-center">
                          <span className={`text-[9px] font-bold ${RARITY_STYLES[item.rarity]}`}>
                            {RARITY_LABELS[item.rarity]}
                          </span>
                        </div>
                      )}
                      {/* 已裝備標記 */}
                      {isSelected && (
                        <div className="absolute top-1 left-1">
                          <Star size={10} className="text-amber-400 fill-amber-400" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 操作按鈕列 */}
          <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-white/20 text-gray-300 hover:text-white"
              onClick={handleSaveOutfit}
              disabled={saveOutfitMutation.isPending || Object.keys(pendingEquipped).length === 0}
            >
              {saveOutfitMutation.isPending ? (
                <RefreshCw size={14} className="animate-spin mr-1" />
              ) : null}
              儲存穿搭
            </Button>
            <Button
              size="sm"
              className={`flex-1 font-semibold ${
                todayAura
                  ? "bg-amber-600/40 text-amber-300 border border-amber-500/50 hover:bg-amber-600/60"
                  : "bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:from-amber-400 hover:to-orange-400"
              }`}
              onClick={handleSubmitAura}
              disabled={submitAuraMutation.isPending}
            >
              {submitAuraMutation.isPending ? (
                <RefreshCw size={14} className="animate-spin mr-1" />
              ) : (
                <Sparkles size={14} className="mr-1" />
              )}
              {todayAura ? "查看今日氣場" : "確認穿搭並結算"}
            </Button>
          </div>
        </div>
      </div>

      {/* ── CSS 粒子動畫 ─────────────────────────────────────── */}
      <style>{`
        @keyframes aura-particle {
          0%   { opacity: 0; transform: translateY(0) scale(1); }
          50%  { opacity: 0.8; transform: translateY(-20px) scale(1.2); }
          100% { opacity: 0; transform: translateY(-40px) scale(0.8); }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default AvatarRoom;
