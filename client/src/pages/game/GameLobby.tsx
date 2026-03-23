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
  ];

  return (
    <div
      className="min-h-screen"
      style={{ background: "radial-gradient(ellipse at 50% 20%, #1E3A5F 0%, #050d14 65%)" }}
    >
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
          {/* 角色縮圖 */}
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0 border"
            style={{
              background: `${avatarColor}18`,
              borderColor: `${avatarColor}40`,
              boxShadow: `0 0 12px ${avatarColor}30`,
            }}
          >
            👤
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
    </div>
  );
}
