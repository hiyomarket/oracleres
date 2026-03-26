/**
 * GameLobby.tsx
 * 遊戲大廳首頁 — 天命共振遊戲化模組統一入口
 * 路由：/game
 * PROPOSAL-20260323-GAME-遊戲大廳入口整合
 */

import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useMemo, useState } from "react";
import { GlobalChat } from "@/components/GlobalChat";
import { LiveFeedContainer } from "@/components/LiveFeedBanner";
import { AchievementToastContainer } from "@/components/AchievementToast";
import { useGameWebSocket } from "@/hooks/useGameWebSocket";

// ─── TASK-008 立繪 CDN URL ───────────────────────────────────
const PLAYER_SPRITES: Record<string, string> = {
  male:   "https://d2xsxph8kpxj0f.cloudfront.net/310519663104688923/MLF7bLVZzzxdGTPVXTct3c/player_male_idle_956e678d.png",
  female: "https://d2xsxph8kpxj0f.cloudfront.net/310519663104688923/MLF7bLVZzzxdGTPVXTct3c/player_female_idle_00c1da48.png",
};

const WUXING_HEX: Record<string, string> = {
  wood: "#2E8B57",
  fire: "#DC143C",
  earth: "#CD853F",
  metal: "#C9A227",
  water: "#00CED1",
};

const WUXING_ZH: Record<string, string> = {
  wood: "木", fire: "火", earth: "土", metal: "金", water: "水",
};

export default function GameLobby() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  // 取得用戶性別（用於立繪選擇）
  const { data: userGenderData } = trpc.auth.me.useQuery(undefined, {
    enabled: !!user,
    staleTime: 300000,
  });
  const userGender = (userGenderData as { gender?: string | null } | null)?.gender ?? "female";
  const spriteUrl = PLAYER_SPRITES[userGender === "male" ? "male" : "female"];

  // 取得天命幣餘額
  const { data: coinsData } = trpc.coins.getBalance.useQuery(undefined, {
    enabled: !!user,
    staleTime: 30000,
  });
  // 取得靈石餘額（從 me 查詢）
  const { data: meData } = trpc.auth.me.useQuery(undefined, {
    enabled: !!user,
    staleTime: 30000,
  });
  // Note: userGenderData above reuses auth.me (same cache key)
  // 取得今日任務狀態
  const { data: questData } = trpc.gameAvatar.getDailyQuest.useQuery(undefined, {
    enabled: !!user,
    staleTime: 60000,
  });
  // 取得已裝備角色（用於縮圖預覽）
  const { data: equippedData } = trpc.gameAvatar.getEquipped.useQuery(undefined, {
    enabled: !!user,
    staleTime: 60000,
  });

  const destinyCoins = coinsData?.balance ?? 0;
  const gameStones = (meData as { gameStones?: number } | null)?.gameStones ?? 0;
  const questCompleted = questData?.alreadyCompleted ?? false;
  const questColor = questData?.targetWuxing ? WUXING_HEX[questData.targetWuxing] ?? "#C9A227" : "#C9A227";
  const questZh = questData?.targetWuxing ? WUXING_ZH[questData.targetWuxing] ?? "" : "";

  // 角色主五行（從裝備中取最多的五行）
  const equippedItems = equippedData?.items ?? [];
  const wuxingCount: Record<string, number> = {};
  for (const item of equippedItems) {
    if (item.wuxing) wuxingCount[item.wuxing] = (wuxingCount[item.wuxing] ?? 0) + 1;
  }
  const topWuxing = Object.entries(wuxingCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "metal";
  const avatarColor = WUXING_HEX[topWuxing] ?? "#C9A227";

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4"
        style={{ background: "radial-gradient(ellipse at 50% 30%, #1a2a3a 0%, #050d14 70%)" }}>
        <div className="text-6xl">⚔️</div>
        <h1 className="text-2xl font-bold text-amber-300 tracking-widest">天命共振</h1>
        <p className="text-slate-400 text-sm text-center max-w-xs">登入後即可進入遊戲大廳，開啟你的靈相養成之旅</p>
        <a
          href={getLoginUrl()}
          className="px-8 py-3 rounded-xl font-bold text-black text-sm transition-all hover:scale-105"
          style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}
        >
          登入開始
        </a>
      </div>
    );
  }

  const lobbyCards = [
    {
      id: "profile",
      path: "/game/profile",
      icon: "✨",
      title: "靈相世界",
      desc: "角色檔案・五行形象・全螢幕展示",
      color: "#9b59b6",
      badge: null,
      tag: "NEW",
    },
    {
      id: "avatar",
      path: "/game/avatar",
      icon: "🌟",
      title: "靈相空間",
      desc: "換裝・氣場・每日穿搭",
      color: "#C9A227",
      badge: questCompleted ? null : { text: "今日任務未完成", color: questColor },
      tag: null,
    },
    {
      id: "shop",
      path: "/game/shop",
      icon: "🛒",
      title: "天命商城",
      desc: "靈石・服裝・道具",
      color: "#00CED1",
      badge: null,
      tag: "新品上架",
    },
    {
      id: "combat",
      path: "/game/combat",
      icon: "⚔️",
      title: "虛相探索",
      desc: "戰鬥測試・角色立繪",
      color: "#DC143C",
      badge: null,
      tag: "測試中",
    },
    {
      id: "achievements",
      path: "/game/achievements",
      icon: "🏅",
      title: "冠軍成就",
      desc: "PvP戰績・徽章牆・連勝榜",
      color: "#a855f7",
      badge: null,
      tag: "V32 NEW",
    },
  ];

  // WebSocket 連線（全服動態橫幅 + 成就通知）
  const { latestMessage } = useGameWebSocket({ agentId: null, enabled: !!user });

  return (
    <div
      className="min-h-screen"
      style={{ background: "radial-gradient(ellipse at 50% 20%, #1E3A5F 0%, #050d14 65%)" }}
    >
      {/* 全服即時動態橫幅 */}
      <div className="max-w-screen-md mx-auto px-4 pt-3">
        <LiveFeedContainer latestMessage={latestMessage} />
      </div>

      {/* 成就解鎖通知彈窗 */}
      <AchievementToastContainer latestMessage={latestMessage} />

      {/* 頂部標題區 */}
      <div className="max-w-screen-md mx-auto px-4 pt-10 pb-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl">⚔️</span>
          <h1
            className="text-2xl font-bold tracking-widest"
            style={{
              background: "linear-gradient(135deg, #f59e0b, #ef4444)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            天命共振
          </h1>
        </div>
        <p className="text-slate-500 text-xs tracking-wider pl-12">ORACLE RESONANCE · GAME LOBBY</p>
      </div>

      {/* 狀態列：角色縮圖 + 貨幣 */}
      <div className="max-w-screen-md mx-auto px-4 mb-8">
        <div
          className="flex items-center gap-4 p-4 rounded-2xl border"
          style={{
            background: "rgba(255,255,255,0.03)",
            borderColor: "rgba(255,255,255,0.08)",
          }}
        >
          {/* 角色立繪（TASK-008 真實立繪 + 五行光暈）→ 點擊進入角色檔案頁 */}
          <div
            className="relative w-16 h-20 shrink-0 rounded-xl overflow-hidden border cursor-pointer"
            onClick={() => navigate("/game/profile")}
            style={{
              background: `linear-gradient(180deg, ${avatarColor}15 0%, ${avatarColor}05 100%)`,
              borderColor: `${avatarColor}40`,
              boxShadow: `0 0 18px ${avatarColor}35, inset 0 0 10px ${avatarColor}10`,
            }}
          >
            {/* 五行光暈底層 */}
            <div
              className="absolute inset-0 rounded-xl"
              style={{
                background: `radial-gradient(ellipse at 50% 100%, ${avatarColor}25 0%, transparent 70%)`,
              }}
            />
            {/* 真實立繪 */}
            <img
              src={spriteUrl}
              alt="角色立繪"
              className="absolute bottom-0 left-1/2 -translate-x-1/2 h-full w-auto object-contain"
              style={{ filter: `drop-shadow(0 0 6px ${avatarColor}60)` }}
            />
          </div>
          {/* 用戶名 + 五行 */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-200 truncate">{user.name ?? "旅行者"}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              本命五行：
              <span className="font-bold" style={{ color: avatarColor }}>
                {WUXING_ZH[topWuxing] ?? "—"}
              </span>
            </p>
          </div>
          {/* 貨幣 */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1">
              <span className="text-xs">🪙</span>
              <span className="text-xs font-bold text-amber-300">{destinyCoins.toLocaleString()}</span>
              <span className="text-[10px] text-slate-500">天命幣</span>
            </div>
            <div className="flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg px-2.5 py-1">
              <span className="text-xs">💎</span>
              <span className="text-xs font-bold text-cyan-300">{gameStones.toLocaleString()}</span>
              <span className="text-[10px] text-slate-500">靈石</span>
            </div>
          </div>
        </div>
      </div>

      {/* 今日任務提示橫幅（未完成時顯示） */}
      {questData && !questCompleted && (
        <div className="max-w-screen-md mx-auto px-4 mb-6">
          <button
            onClick={() => navigate("/game/avatar")}
            className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all hover:scale-[1.01]"
            style={{
              background: `${questColor}12`,
              borderColor: `${questColor}40`,
            }}
          >
            <span className="text-xl shrink-0">🎯</span>
            <div className="flex-1 text-left min-w-0">
              <p className="text-xs font-semibold" style={{ color: questColor }}>
                今日穿搭任務
              </p>
              <p className="text-xs text-slate-400 truncate">
                穿戴 {questData.minItems} 件【{questZh}屬性】服裝，獲得 💎 {questData.reward?.stones ?? 50} 靈石
              </p>
            </div>
            <span className="text-slate-500 text-xs shrink-0">前往 →</span>
          </button>
        </div>
      )}

      {/* 三個主入口卡片 */}
      <div className="max-w-screen-md mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {lobbyCards.map((card) => (
            <button
              key={card.id}
              onClick={() => navigate(card.path)}
              className="relative flex flex-col items-start gap-3 p-5 rounded-2xl border text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: `${card.color}0e`,
                borderColor: `${card.color}35`,
              }}
            >
              {/* 角標 */}
              {card.badge && (
                <span
                  className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${card.badge.color}30`, color: card.badge.color, border: `1px solid ${card.badge.color}50` }}
                >
                  {card.badge.text}
                </span>
              )}
              {card.tag && (
                <span
                  className="absolute top-3 right-3 text-[10px] font-medium px-2 py-0.5 rounded-full text-slate-400 border border-slate-600/50 bg-slate-800/60"
                >
                  {card.tag}
                </span>
              )}
              {/* 圖示 */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{ background: `${card.color}20`, boxShadow: `0 0 16px ${card.color}25` }}
              >
                {card.icon}
              </div>
              {/* 文字 */}
              <div>
                <h2 className="text-base font-bold text-slate-100">{card.title}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{card.desc}</p>
              </div>
              {/* 底部箭頭 */}
              <div className="mt-auto flex items-center gap-1 text-xs font-medium" style={{ color: card.color }}>
                <span>進入</span>
                <span>→</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── 全服聊天室 ───────────────────────────────────────────────────────── */}
      <div className="max-w-screen-md mx-auto px-4 mb-6">
        <GlobalChat />
      </div>

      {/* ── 玩家排行榜 ───────────────────────────────────────────────────────── */}
      <LeaderboardSection />

      {/* ── 成就徽章牆 ──────────────────────────────────────────────────────── */}
      <AchievementWall userId={user?.id} />
    </div>
  );
}

// ── 成就牆子組件 ────────────────────────────────────────────
function AchievementWall({ userId }: { userId?: number }) {
  const { data: achievements, isLoading } = trpc.gameAchievement.getAll.useQuery(undefined, {
    enabled: !!userId,
    staleTime: 120000,
  });

  const WUXING_HEX: Record<string, string> = {
    wood: "#2E8B57", fire: "#DC143C", earth: "#CD853F", metal: "#C9A227", water: "#00CED1",
  };

  const categoryLabel: Record<string, string> = {
    social: "社群", collection: "收藏", combat: "戰鬥", daily: "日常", special: "特殊",
  };

  const grouped = useMemo(() => {
    if (!achievements) return {};
    return achievements.reduce<Record<string, typeof achievements>>((acc, a) => {
      const cat = a.category ?? "special";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(a);
      return acc;
    }, {});
  }, [achievements]);

  if (!userId) return null;
  if (isLoading) return (
    <div className="max-w-screen-md mx-auto px-4 pb-16">
      <div className="h-32 rounded-2xl bg-slate-800/40 animate-pulse" />
    </div>
  );
  if (!achievements || achievements.length === 0) return null;

  const unlockedCount = achievements.filter((a) => a.isUnlocked).length;

  return (
    <div className="max-w-screen-md mx-auto px-4 pb-20">
      {/* 標題列 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-slate-200 tracking-wide">成就徽章</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">{unlockedCount} / {achievements.length} 已解鎖</span>
          <a href="/game/achievements"
            className="text-xs px-2.5 py-1 rounded-lg font-medium transition-all hover:opacity-80"
            style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
            🏅 冠軍成就
          </a>
          <a href="/game/skills"
            className="text-xs px-2.5 py-1 rounded-lg font-medium transition-all hover:opacity-80"
            style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}>
            ✨ 技能圖鑑
          </a>
          <a href="/game/quest-skills"
            className="text-xs px-2.5 py-1 rounded-lg font-medium transition-all hover:opacity-80"
            style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
            🔥 天命考核
          </a>
          <a href="/game/pets"
            className="text-xs px-2.5 py-1 rounded-lg font-medium transition-all hover:opacity-80"
            style={{ background: "rgba(168,85,247,0.15)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.3)" }}>
            🐾 寵物系統
          </a>
        </div>
      </div>

      {/* 進度條 */}
      <div className="w-full h-1.5 bg-slate-800 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${achievements.length ? (unlockedCount / achievements.length) * 100 : 0}%`,
            background: "linear-gradient(90deg, #f59e0b, #ef4444)",
          }}
        />
      </div>

      {/* 分類成就格 */}
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} className="mb-6">
          <p className="text-xs text-slate-500 mb-2 tracking-widest uppercase">
            {categoryLabel[cat] ?? cat}
          </p>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
            {items.map((a) => {
              const color = WUXING_HEX[a.category ?? ""] ?? "#C9A227";
              return (
                <div
                  key={a.id}
                  title={`${a.title}\n${a.description}`}
                  className={`relative flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                    a.isUnlocked
                      ? "border-amber-500/40 bg-amber-500/10"
                      : "border-slate-700/40 bg-slate-800/30 opacity-40 grayscale"
                  }`}
                >
                  {/* 圖示 */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                    style={{
                      background: a.isUnlocked
                        ? `radial-gradient(circle, ${color}33, ${color}11)`
                        : "#1e293b",
                      border: a.isUnlocked ? `1.5px solid ${color}66` : "1.5px solid #334155",
                    }}
                  >
                    {a.iconUrl ? (
                      <img src={a.iconUrl} alt={a.title} className="w-6 h-6 object-contain" />
                    ) : (
                      <span>🏅</span>
                    )}
                  </div>
                  {/* 標題 */}
                  <p className="text-[10px] text-center leading-tight text-slate-400 line-clamp-2">{a.title}</p>
                  {/* 解鎖時間 */}
                  {a.isUnlocked && a.unlockedAt && (
                    <p className="text-[9px] text-amber-400/60">
                      {new Date(a.unlockedAt).toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" })}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 排行榜子組件 ────────────────────────────────────────────────
const WX_HEX_LB: Record<string, string> = {
  wood: "#22c55e", fire: "#ef4444", earth: "#f59e0b", metal: "#e2e8f0", water: "#38bdf8",
};
const WX_ZH_LB: Record<string, string> = {
  wood: "木", fire: "火", earth: "土", metal: "金", water: "水",
};
const STATUS_LABEL: Record<string, string> = {
  idle: "✨探索", combat: "⚔️戰鬥", moving: "🚶移動", gathering: "🌿採集", resting: "💤休息",
};

function PvpLeaderboardTab() {
  const { data: pvpLb } = trpc.gameWorld.getPvpLeaderboard.useQuery(undefined, { staleTime: 60000 });
  const winRank = pvpLb?.winRank ?? [];
  if (winRank.length === 0) {
    return <div className="flex items-center justify-center py-8 text-slate-500 text-sm">尚無足夠戰績資料（至少5場）</div>;
  }
  return (
    <div>
      {winRank.map((r, i) => {
        const color = WX_HEX_LB[r.agentElement] ?? "#94a3b8";
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`;
        return (
          <div key={r.agentId}
            className="flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0 transition-colors hover:bg-white/[0.02]"
            style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            <span className="w-6 text-center text-sm shrink-0">{medal}</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
              style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
              {WX_ZH_LB[r.agentElement] ?? "？"}
            </span>
            <span className="flex-1 text-sm text-slate-200 truncate">{r.agentName}</span>
            <div className="text-right shrink-0">
              <div className="text-sm font-bold" style={{ color: "#f59e0b" }}>{r.winRate}%</div>
              <div className="text-[10px] text-slate-500">{r.wins}勝{r.losses}敗</div>
            </div>
            {r.currentStreak > 0 && (
              <span className="text-[10px] text-orange-400 shrink-0">🔥{r.currentStreak}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function LeaderboardSection() {
  const [tab, setTab] = useState<"level" | "combat" | "pvp">("level");
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const challengePvp = trpc.gameWorld.challengePvp.useMutation({
    onSuccess: (res) => {
      const msg = res.result === "challenger_win" ? `⚔️挑戰勝利！出手了 ${res.goldReward} 金幣` : res.result === "defender_win" ? `🛡️挑戰失敗，對手 ${res.defenderName} 很強！` : `🤝平局，勢均力敵！`;
      import("sonner").then(({ toast }) => toast.success(msg));
      utils.gameWorld.getLeaderboard.invalidate();
    },
    onError: (err: { message: string }) => {
      import("sonner").then(({ toast }) => toast.error(err.message));
    },
  });
  const { data, isLoading } = trpc.gameWorld.getLeaderboard.useQuery(undefined, {
    staleTime: 60000,
    refetchInterval: 120000,
  });

  return (
    <div className="max-w-screen-md mx-auto px-4 mb-8">
      {/* 標題 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏆</span>
          <h2 className="text-sm font-bold tracking-widest text-slate-300">英雄排行榜</h2>
        </div>
        {/* Tab 切換 */}
        <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
          {(["level", "combat", "pvp"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-3 py-1 rounded-md text-xs font-medium transition-all"
              style={{
                background: tab === t ? "rgba(245,158,11,0.2)" : "transparent",
                color: tab === t ? "#f59e0b" : "#64748b",
                borderBottom: tab === t ? "1px solid rgba(245,158,11,0.5)" : "1px solid transparent",
              }}
            >
              {t === "level" ? "⭐ 等級榜" : t === "combat" ? "⚔️ 戰鬥王" : "📊 勝率榜"}
            </button>
          ))}
        </div>
      </div>

      {/* 排行榜內容 */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-slate-500 text-sm">載入中...</div>
        ) : tab === "level" ? (
          <div>
            {(!data?.levelRank || data.levelRank.length === 0) ? (
              <div className="flex items-center justify-center py-8 text-slate-500 text-sm">尚無旅人上榜</div>
            ) : (
              data.levelRank.slice(0, 10).map((r, i) => {
                const color = WX_HEX_LB[r.dominantElement] ?? "#94a3b8";
                const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0 transition-colors hover:bg-white/[0.02]"
                    style={{ borderColor: "rgba(255,255,255,0.04)" }}
                  >
                    {/* 排名 */}
                    <span className="w-6 text-center text-sm shrink-0">{medal}</span>
                    {/* 五行標籤 */}
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                      style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
                    >
                      {WX_ZH_LB[r.dominantElement] ?? "？"}
                    </span>
                    {/* 名稱 */}
                    <span className="flex-1 text-sm text-slate-200 truncate">{r.agentName}</span>
                    {/* 狀態 */}
                    <span className="text-[10px] text-slate-500 shrink-0">
                      {STATUS_LABEL[r.status ?? "idle"] ?? "✨探索"}
                    </span>
                    {/* 等級 */}
                    <span className="text-sm font-bold shrink-0" style={{ color }}>
                      Lv.{r.level}
                    </span>
                    {/* PvP 挑戰按鈕 */}
                    {user && r.agentId && (
                      <button
                        onClick={() => challengePvp.mutate({ defenderAgentId: r.agentId! })}
                        disabled={challengePvp.isPending}
                        className="text-[10px] px-2 py-0.5 rounded border transition-colors shrink-0 hover:opacity-80"
                        style={{ borderColor: `${color}40`, color, background: `${color}10` }}
                      >
                        ⚔️挑戰
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : tab === "combat" ? (
          <div>
            {(!data?.combatRank || data.combatRank.length === 0) ? (
              <div className="flex items-center justify-center py-8 text-slate-500 text-sm">本週尚無戰鬥記錄</div>
            ) : (
              data.combatRank.slice(0, 10).map((r, i) => {
                const color = WX_HEX_LB[r.dominantElement] ?? "#94a3b8";
                const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0 transition-colors hover:bg-white/[0.02]"
                    style={{ borderColor: "rgba(255,255,255,0.04)" }}
                  >
                    <span className="w-6 text-center text-sm shrink-0">{medal}</span>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                      style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
                    >
                      {WX_ZH_LB[r.dominantElement] ?? "？"}
                    </span>
                    <span className="flex-1 text-sm text-slate-200 truncate">{r.agentName}</span>
                    <span className="text-[10px] text-slate-500 shrink-0">Lv.{r.level}</span>
                    <span className="text-sm font-bold text-red-400 shrink-0">
                      ⚔️ {r.combatCount}場
                    </span>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <PvpLeaderboardTab />
        )}
      </div>
    </div>
  );
}
