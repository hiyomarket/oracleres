/**
 * AdventureAchievements.tsx
 * 排行榜 + 成就 + PvP 戰績 + 全服動態
 * 整合自 GameLobby 的排行榜和成就徽章功能
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import GameTabLayout from "@/components/GameTabLayout";

const WX_HEX: Record<string, string> = {
  wood: "#22c55e", fire: "#ef4444", earth: "#f59e0b", metal: "#e2e8f0", water: "#38bdf8",
};
const WX_ZH: Record<string, string> = {
  wood: "木", fire: "火", earth: "土", metal: "金", water: "水",
};
const STATUS_LABEL: Record<string, string> = {
  idle: "✨探索", combat: "⚔️戰鬥", moving: "🚶移動", gathering: "🌿採集", resting: "💤休息",
};

const TYPE_LABELS: Record<string, string> = {
  level: "成長", pvp: "戰鬥", combat: "戰鬥", gather: "採集",
  explore: "探索", legendary: "傳說", weekly: "週冠", chat: "社交", special: "特殊",
};
const TYPE_COLORS: Record<string, string> = {
  level: "#22c55e", pvp: "#ef4444", combat: "#ef4444", gather: "#f59e0b",
  explore: "#38bdf8", legendary: "#a855f7", weekly: "#fbbf24", chat: "#60a5fa", special: "#e2e8f0",
};

const CATEGORY_LABELS: Record<string, string> = {
  social: "社群", collection: "收藏", combat: "戰鬥", daily: "日常", special: "特殊",
};

type MainTab = "leaderboard" | "achievements" | "pvp" | "recent";

export default function AdventureAchievements() {
  const { user } = useAuth();
  const [mainTab, setMainTab] = useState<MainTab>("leaderboard");
  const [filterType, setFilterType] = useState<string>("all");
  const [lbTab, setLbTab] = useState<"level" | "combat" | "pvp">("level");

  // ── 成就數據 ──
  const { data: achievements, isLoading: achLoading } = trpc.gameWorld.getAchievements.useQuery(
    undefined, { enabled: !!user, staleTime: 30000 }
  );
  // ── 成就徽章（gameAchievement API，分類式） ──
  const { data: badgeAchievements } = trpc.gameAchievement.getAll.useQuery(undefined, {
    enabled: !!user,
    staleTime: 120000,
  });
  // ── PvP ──
  const { data: pvpLeaderboard } = trpc.gameWorld.getPvpLeaderboard.useQuery(
    undefined, { staleTime: 60000 }
  );
  const { data: myPvpStats } = trpc.gameWorld.getMyPvpStats.useQuery(
    undefined, { enabled: !!user, staleTime: 30000 }
  );
  const { data: recentAchievements } = trpc.gameWorld.getRecentAchievements.useQuery(
    undefined, { staleTime: 30000 }
  );
  // ── 排行榜 ──
  const { data: leaderboard, isLoading: lbLoading } = trpc.gameWorld.getLeaderboard.useQuery(undefined, {
    staleTime: 60000,
    refetchInterval: 120000,
  });

  const utils = trpc.useUtils();
  const challengePvp = trpc.gameWorld.challengePvp.useMutation({
    onSuccess: (res) => {
      const msg = res.result === "challenger_win"
        ? `⚔️挑戰勝利！獲得了 ${res.goldReward} 金幣`
        : res.result === "defender_win"
        ? `🛡️挑戰失敗，對手 ${res.defenderName} 很強！`
        : `🤝平局，勢均力敵！`;
      import("sonner").then(({ toast }) => toast.success(msg));
      utils.gameWorld.getLeaderboard.invalidate();
    },
    onError: (err: { message: string }) => {
      import("sonner").then(({ toast }) => toast.error(err.message));
    },
  });

  if (!user) {
    return (
      <GameTabLayout activeTab="pvp">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
          <div className="text-6xl">🏅</div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-amber-400 mb-2">排行榜 & 成就</h2>
            <p className="text-slate-400 text-sm">登入後查看你的成就紀錄</p>
          </div>
          <a href={getLoginUrl()} className="px-6 py-3 rounded-xl font-bold text-white"
            style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}>
            登入開始
          </a>
        </div>
      </GameTabLayout>
    );
  }

  // 成就統計
  const unlockedCount = achievements?.filter(a => a.unlocked).length ?? 0;
  const totalCount = achievements?.length ?? 0;
  const progressPct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  const types = ["all", ...Array.from(new Set((achievements ?? []).map(a => a.type)))];
  const filtered = filterType === "all"
    ? (achievements ?? [])
    : (achievements ?? []).filter(a => a.type === filterType);

  // 成就徽章分類
  const badgeGrouped = useMemo(() => {
    if (!badgeAchievements) return {};
    return badgeAchievements.reduce<Record<string, typeof badgeAchievements>>((acc, a) => {
      const cat = a.category ?? "special";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(a);
      return acc;
    }, {});
  }, [badgeAchievements]);
  const badgeUnlockedCount = badgeAchievements?.filter(a => a.isUnlocked).length ?? 0;
  const badgeTotalCount = badgeAchievements?.length ?? 0;

  const TABS: { id: MainTab; label: string; icon: string }[] = [
    { id: "leaderboard", label: "排行榜", icon: "🏆" },
    { id: "achievements", label: "成就", icon: "🏅" },
    { id: "pvp", label: "PvP", icon: "⚔️" },
    { id: "recent", label: "動態", icon: "🌟" },
  ];

  return (
    <GameTabLayout activeTab="pvp">
      <div className="min-h-screen pb-20" style={{ background: "linear-gradient(180deg, #0a0a1a 0%, #0d1117 100%)" }}>
        {/* 標題列 */}
        <div className="sticky top-0 z-10 px-4 pt-4 pb-3"
          style={{ background: "rgba(10,10,26,0.95)", backdropFilter: "blur(12px)" }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-amber-400">排行榜 & 成就</h1>
              <p className="text-xs text-slate-500">英雄排行・冒險成就・PvP 戰績</p>
            </div>
            {/* 總進度 */}
            <div className="text-right">
              <div className="text-sm font-bold text-amber-400">{unlockedCount} / {totalCount}</div>
              <div className="text-xs text-slate-500">{progressPct}% 完成</div>
            </div>
          </div>

          {/* 進度條 */}
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden mb-3">
            <div className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progressPct}%`,
                background: "linear-gradient(90deg, #f59e0b, #ef4444)",
                boxShadow: "0 0 8px rgba(245,158,11,0.5)",
              }} />
          </div>

          {/* Tab 切換 */}
          <div className="flex gap-1">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setMainTab(t.id)}
                className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: mainTab === t.id ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.05)",
                  color: mainTab === t.id ? "#f59e0b" : "#94a3b8",
                  border: mainTab === t.id ? "1px solid rgba(245,158,11,0.4)" : "1px solid transparent",
                }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* ── 排行榜 Tab ── */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {mainTab === "leaderboard" && (
          <div className="px-4 pt-3">
            {/* 排行榜子 Tab */}
            <div className="flex gap-1 p-0.5 rounded-lg mb-4" style={{ background: "rgba(255,255,255,0.05)" }}>
              {(["level", "combat", "pvp"] as const).map(t => (
                <button key={t} onClick={() => setLbTab(t)}
                  className="flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                  style={{
                    background: lbTab === t ? "rgba(245,158,11,0.2)" : "transparent",
                    color: lbTab === t ? "#f59e0b" : "#64748b",
                  }}>
                  {t === "level" ? "⭐ 等級榜" : t === "combat" ? "⚔️ 戰鬥王" : "📊 勝率榜"}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border overflow-hidden"
              style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
              {lbLoading ? (
                <div className="flex items-center justify-center py-8 text-slate-500 text-sm">載入中...</div>
              ) : lbTab === "level" ? (
                <div>
                  {(!leaderboard?.levelRank || leaderboard.levelRank.length === 0) ? (
                    <div className="flex items-center justify-center py-8 text-slate-500 text-sm">尚無旅人上榜</div>
                  ) : (
                    leaderboard.levelRank.slice(0, 10).map((r, i) => {
                      const color = WX_HEX[r.dominantElement] ?? "#94a3b8";
                      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`;
                      return (
                        <div key={i}
                          className="flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0 transition-colors hover:bg-white/[0.02]"
                          style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                          <span className="w-6 text-center text-sm shrink-0">{medal}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                            style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
                            {WX_ZH[r.dominantElement] ?? "？"}
                          </span>
                          <span className="flex-1 text-sm text-slate-200 truncate">{r.agentName}</span>
                          <span className="text-[10px] text-slate-500 shrink-0">
                            {STATUS_LABEL[r.status ?? "idle"] ?? "✨探索"}
                          </span>
                          <span className="text-sm font-bold shrink-0" style={{ color }}>Lv.{r.level}</span>
                          {user && r.agentId && (
                            <button
                              onClick={() => challengePvp.mutate({ defenderAgentId: r.agentId! })}
                              disabled={challengePvp.isPending}
                              className="text-[10px] px-2 py-0.5 rounded border transition-colors shrink-0 hover:opacity-80"
                              style={{ borderColor: `${color}40`, color, background: `${color}10` }}>
                              ⚔️挑戰
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              ) : lbTab === "combat" ? (
                <div>
                  {(!leaderboard?.combatRank || leaderboard.combatRank.length === 0) ? (
                    <div className="flex items-center justify-center py-8 text-slate-500 text-sm">本週尚無戰鬥記錄</div>
                  ) : (
                    leaderboard.combatRank.slice(0, 10).map((r, i) => {
                      const color = WX_HEX[r.dominantElement] ?? "#94a3b8";
                      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`;
                      return (
                        <div key={i}
                          className="flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0 transition-colors hover:bg-white/[0.02]"
                          style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                          <span className="w-6 text-center text-sm shrink-0">{medal}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                            style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
                            {WX_ZH[r.dominantElement] ?? "？"}
                          </span>
                          <span className="flex-1 text-sm text-slate-200 truncate">{r.agentName}</span>
                          <span className="text-[10px] text-slate-500 shrink-0">Lv.{r.level}</span>
                          <span className="text-sm font-bold text-red-400 shrink-0">⚔️ {r.combatCount}場</span>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                /* 勝率榜 */
                <div>
                  {(pvpLeaderboard?.winRank ?? []).length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-slate-500 text-sm">尚無足夠戰績資料（至少5場）</div>
                  ) : (
                    (pvpLeaderboard?.winRank ?? []).map((r, i) => {
                      const color = WX_HEX[r.agentElement] ?? "#94a3b8";
                      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`;
                      return (
                        <div key={r.agentId}
                          className="flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0 transition-colors hover:bg-white/[0.02]"
                          style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                          <span className="w-6 text-center text-sm shrink-0">{medal}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                            style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
                            {WX_ZH[r.agentElement] ?? "？"}
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
                    })
                  )}
                </div>
              )}
            </div>

            {/* 連勝榜（排行榜 Tab 底部） */}
            {(pvpLeaderboard?.streakRank ?? []).length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-bold text-orange-400 mb-2">🔥 當前連勝榜</div>
                <div className="rounded-2xl border overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
                  {(pvpLeaderboard?.streakRank ?? []).map((r, i) => {
                    const ec = WX_HEX[r.agentElement] ?? "#e2e8f0";
                    return (
                      <div key={r.agentId}
                        className="flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0"
                        style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                          style={{ background: "rgba(255,100,0,0.2)", color: "#fb923c" }}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold truncate" style={{ color: ec }}>{r.agentName}</div>
                          <div className="text-xs text-slate-500">Lv.{r.agentLevel} · 歷史最高 {r.maxStreak}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-base font-bold text-orange-400">{r.currentStreak} 連勝</div>
                          <div className="text-xs text-slate-500">{r.wins} 勝</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* ── 成就牆 Tab ── */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {mainTab === "achievements" && (
          <div className="px-4 pt-3">
            {/* 成就徽章牆（分類式） */}
            {badgeAchievements && badgeAchievements.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-bold text-slate-200">成就徽章</div>
                  <span className="text-xs text-slate-500">{badgeUnlockedCount} / {badgeTotalCount} 已解鎖</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden mb-4">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${badgeTotalCount ? (badgeUnlockedCount / badgeTotalCount) * 100 : 0}%`,
                      background: "linear-gradient(90deg, #f59e0b, #ef4444)",
                    }} />
                </div>
                {Object.entries(badgeGrouped).map(([cat, items]) => (
                  <div key={cat} className="mb-4">
                    <p className="text-xs text-slate-500 mb-2 tracking-widest uppercase">
                      {CATEGORY_LABELS[cat] ?? cat}
                    </p>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                      {items.map((a) => {
                        const color = WX_HEX[a.category ?? ""] ?? "#C9A227";
                        return (
                          <div key={a.id}
                            title={`${a.title}\n${a.description}`}
                            className={`relative flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                              a.isUnlocked
                                ? "border-amber-500/40 bg-amber-500/10"
                                : "border-slate-700/40 bg-slate-800/30 opacity-40 grayscale"
                            }`}>
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                              style={{
                                background: a.isUnlocked ? `radial-gradient(circle, ${color}33, ${color}11)` : "#1e293b",
                                border: a.isUnlocked ? `1.5px solid ${color}66` : "1.5px solid #334155",
                              }}>
                              {a.iconUrl ? (
                                <img src={a.iconUrl} alt={a.title} className="w-6 h-6 object-contain" />
                              ) : (
                                <span>🏅</span>
                              )}
                            </div>
                            <p className="text-[10px] text-center leading-tight text-slate-400 line-clamp-2">{a.title}</p>
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
            )}

            {/* 冒險成就（帶進度條） */}
            <div className="text-sm font-bold text-slate-200 mb-3">冒險成就</div>
            {/* 類型篩選 */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-hide">
              {types.map(t => (
                <button key={t} onClick={() => setFilterType(t)}
                  className="shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all"
                  style={{
                    background: filterType === t ? (TYPE_COLORS[t] ?? "#f59e0b") + "30" : "rgba(255,255,255,0.05)",
                    color: filterType === t ? (TYPE_COLORS[t] ?? "#f59e0b") : "#94a3b8",
                    border: filterType === t ? `1px solid ${TYPE_COLORS[t] ?? "#f59e0b"}60` : "1px solid transparent",
                  }}>
                  {t === "all" ? "全部" : TYPE_LABELS[t] ?? t}
                </button>
              ))}
            </div>

            {achLoading ? (
              <div className="text-center text-slate-500 py-12">載入中...</div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filtered.map(a => {
                  const color = TYPE_COLORS[a.type] ?? "#e2e8f0";
                  const pct = a.threshold > 0 ? Math.min(100, Math.round((a.progress / a.threshold) * 100)) : 0;
                  return (
                    <div key={a.id}
                      className="rounded-xl p-3 border transition-all"
                      style={{
                        background: a.unlocked ? `${color}10` : "rgba(255,255,255,0.03)",
                        borderColor: a.unlocked ? `${color}40` : "rgba(255,255,255,0.08)",
                        opacity: a.unlocked ? 1 : 0.6,
                      }}>
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-2xl" style={{ filter: a.unlocked ? "none" : "grayscale(1) opacity(0.4)" }}>
                          {a.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold truncate" style={{ color: a.unlocked ? color : "#64748b" }}>
                            {a.name}
                          </div>
                          <div className="text-xs text-slate-500 leading-tight mt-0.5">{a.desc}</div>
                        </div>
                      </div>
                      {!a.unlocked && a.threshold > 1 && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-slate-600 mb-1">
                            <span>{a.progress}</span>
                            <span>{a.threshold}</span>
                          </div>
                          <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                            <div className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, background: color }} />
                          </div>
                        </div>
                      )}
                      {a.unlocked && a.unlockedAt && (
                        <div className="text-xs mt-1" style={{ color: `${color}80` }}>
                          {new Date(a.unlockedAt).toLocaleDateString("zh-TW")} 解鎖
                        </div>
                      )}
                      <div className="mt-2">
                        <span className="text-xs px-1.5 py-0.5 rounded-full"
                          style={{ background: `${color}20`, color }}>
                          {TYPE_LABELS[a.type] ?? a.type}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* ── PvP 戰績 Tab ── */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {mainTab === "pvp" && (
          <div className="px-4 pt-3 space-y-4">
            {/* 我的戰績 */}
            {myPvpStats && (
              <div className="rounded-xl p-4 border border-red-500/20"
                style={{ background: "rgba(239,68,68,0.05)" }}>
                <div className="text-sm font-bold text-red-400 mb-3">我的戰績</div>
                <div className="grid grid-cols-4 gap-2 text-center mb-3">
                  {[
                    { label: "勝", value: myPvpStats.wins, color: "#22c55e" },
                    { label: "敗", value: myPvpStats.losses, color: "#ef4444" },
                    { label: "平", value: myPvpStats.draws, color: "#94a3b8" },
                    { label: "勝率", value: `${myPvpStats.winRate}%`, color: "#f59e0b" },
                  ].map(s => (
                    <div key={s.label} className="rounded-lg py-2" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <div className="text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
                      <div className="text-xs text-slate-500">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 text-xs text-slate-400">
                  <span>當前連勝 <span className="text-amber-400 font-bold">{myPvpStats.currentStreak}</span></span>
                  <span>最高連勝 <span className="text-purple-400 font-bold">{myPvpStats.maxStreak}</span></span>
                  <span>總場次 <span className="text-slate-300 font-bold">{myPvpStats.total}</span></span>
                </div>
              </div>
            )}

            {/* 勝率榜 */}
            <div>
              <div className="text-sm font-bold text-amber-400 mb-2">勝率排行榜 Top 10</div>
              <div className="text-xs text-slate-600 mb-3">（至少 5 場方可上榜）</div>
              {(pvpLeaderboard?.winRank ?? []).length === 0 ? (
                <div className="text-center text-slate-600 py-8 text-sm">尚無足夠戰績資料</div>
              ) : (
                <div className="space-y-2">
                  {(pvpLeaderboard?.winRank ?? []).map((r, i) => {
                    const ec = WX_HEX[r.agentElement] ?? "#e2e8f0";
                    return (
                      <div key={r.agentId}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 border"
                        style={{
                          background: i < 3 ? `${ec}08` : "rgba(255,255,255,0.03)",
                          borderColor: i < 3 ? `${ec}30` : "rgba(255,255,255,0.06)",
                        }}>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                          style={{
                            background: i === 0 ? "#fbbf24" : i === 1 ? "#94a3b8" : i === 2 ? "#b45309" : "rgba(255,255,255,0.1)",
                            color: i < 3 ? "#0a0a1a" : "#64748b",
                          }}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold truncate" style={{ color: ec }}>{r.agentName}</div>
                          <div className="text-xs text-slate-500">Lv.{r.agentLevel} · {r.wins}勝{r.losses}敗</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-base font-bold text-amber-400">{r.winRate}%</div>
                          {r.currentStreak > 0 && (
                            <div className="text-xs text-orange-400">連勝{r.currentStreak}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 查看對戰記錄連結 */}
            <div className="text-center pt-2">
              <a href="/game/pvp-history"
                className="inline-flex items-center gap-2 text-sm text-red-400 hover:text-red-300 border border-red-500/30 rounded-lg px-4 py-2 hover:bg-red-950/30 transition-colors">
                ⚔️ 查看我的對戰記錄
              </a>
            </div>

            {/* 連勝榜 */}
            {(pvpLeaderboard?.streakRank ?? []).length > 0 && (
              <div>
                <div className="text-sm font-bold text-orange-400 mb-2">當前連勝榜</div>
                <div className="space-y-2">
                  {(pvpLeaderboard?.streakRank ?? []).map((r, i) => {
                    const ec = WX_HEX[r.agentElement] ?? "#e2e8f0";
                    return (
                      <div key={r.agentId}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 border"
                        style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.06)" }}>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                          style={{ background: "rgba(255,100,0,0.2)", color: "#fb923c" }}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold truncate" style={{ color: ec }}>{r.agentName}</div>
                          <div className="text-xs text-slate-500">Lv.{r.agentLevel} · 歷史最高 {r.maxStreak}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-base font-bold text-orange-400">{r.currentStreak} 連勝</div>
                          <div className="text-xs text-slate-500">{r.wins} 勝</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* ── 最新動態 Tab ── */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {mainTab === "recent" && (
          <div className="px-4 pt-3">
            <div className="text-sm font-bold text-slate-400 mb-3">全服最新成就解鎖</div>
            {(recentAchievements ?? []).length === 0 ? (
              <div className="text-center text-slate-600 py-12 text-sm">尚無成就解鎖記錄</div>
            ) : (
              <div className="space-y-2">
                {(recentAchievements ?? []).map((r, i) => (
                  <div key={i}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 border border-white/5"
                    style={{ background: "rgba(255,255,255,0.03)" }}>
                    <span className="text-2xl shrink-0">{r.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-200 truncate">{r.agentName}</div>
                      <div className="text-xs text-slate-500">解鎖了「{r.name}」</div>
                    </div>
                    <div className="text-xs text-slate-600 shrink-0">
                      {r.unlockedAt ? new Date(r.unlockedAt).toLocaleDateString("zh-TW") : "—"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </GameTabLayout>
  );
}
