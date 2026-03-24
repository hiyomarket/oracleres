/**
 * AdventureAchievements.tsx
 * 冒險成就展示頁面
 * - 徽章牆（已解鎖 / 未解鎖）
 * - 進度條
 * - PvP 戰績統計
 * - 全服最新解鎖動態
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import GameTabLayout from "@/components/GameTabLayout";

const WX_HEX: Record<string, string> = {
  wood: "#22c55e", fire: "#ef4444", earth: "#f59e0b", metal: "#e2e8f0", water: "#38bdf8",
};

const TYPE_LABELS: Record<string, string> = {
  level: "成長", pvp: "戰鬥", combat: "戰鬥", gather: "採集",
  explore: "探索", legendary: "傳說", weekly: "週冠", chat: "社交", special: "特殊",
};

const TYPE_COLORS: Record<string, string> = {
  level: "#22c55e", pvp: "#ef4444", combat: "#ef4444", gather: "#f59e0b",
  explore: "#38bdf8", legendary: "#a855f7", weekly: "#fbbf24", chat: "#60a5fa", special: "#e2e8f0",
};

type Tab = "achievements" | "pvp" | "recent";

export default function AdventureAchievements() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("achievements");
  const [filterType, setFilterType] = useState<string>("all");

  const { data: achievements, isLoading } = trpc.gameWorld.getAchievements.useQuery(
    undefined, { enabled: !!user, staleTime: 30000 }
  );
  const { data: pvpLeaderboard } = trpc.gameWorld.getPvpLeaderboard.useQuery(
    undefined, { staleTime: 60000 }
  );
  const { data: myPvpStats } = trpc.gameWorld.getMyPvpStats.useQuery(
    undefined, { enabled: !!user, staleTime: 30000 }
  );
  const { data: recentAchievements } = trpc.gameWorld.getRecentAchievements.useQuery(
    undefined, { staleTime: 30000 }
  );

  if (!user) {
    return (
      <GameTabLayout activeTab="avatar">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
          <div className="text-6xl">🏅</div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-amber-400 mb-2">冒險成就</h2>
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

  const unlockedCount = achievements?.filter(a => a.unlocked).length ?? 0;
  const totalCount = achievements?.length ?? 0;
  const progressPct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  const types = ["all", ...Array.from(new Set((achievements ?? []).map(a => a.type)))];
  const filtered = filterType === "all"
    ? (achievements ?? [])
    : (achievements ?? []).filter(a => a.type === filterType);

  return (
    <GameTabLayout activeTab="avatar">
      <div className="min-h-screen pb-20" style={{ background: "linear-gradient(180deg, #0a0a1a 0%, #0d1117 100%)" }}>
        {/* 標題列 */}
        <div className="sticky top-0 z-10 px-4 pt-4 pb-3"
          style={{ background: "rgba(10,10,26,0.95)", backdropFilter: "blur(12px)" }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-amber-400">冒險成就</h1>
              <p className="text-xs text-slate-500">記錄你的旅途傳說</p>
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
            {([["achievements", "🏅 成就牆"], ["pvp", "⚔️ PvP 戰績"], ["recent", "🌟 最新動態"]] as [Tab, string][]).map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)}
                className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: tab === t ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.05)",
                  color: tab === t ? "#f59e0b" : "#94a3b8",
                  border: tab === t ? "1px solid rgba(245,158,11,0.4)" : "1px solid transparent",
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── 成就牆 ── */}
        {tab === "achievements" && (
          <div className="px-4 pt-3">
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

            {isLoading ? (
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
                      {/* 圖示 + 名稱 */}
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-2xl" style={{ filter: a.unlocked ? "none" : "grayscale(1) opacity(0.4)" }}>
                          {a.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold truncate"
                            style={{ color: a.unlocked ? color : "#64748b" }}>
                            {a.name}
                          </div>
                          <div className="text-xs text-slate-500 leading-tight mt-0.5">{a.desc}</div>
                        </div>
                      </div>

                      {/* 進度條 */}
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

                      {/* 解鎖時間 */}
                      {a.unlocked && a.unlockedAt && (
                        <div className="text-xs mt-1" style={{ color: `${color}80` }}>
                          {new Date(a.unlockedAt).toLocaleDateString("zh-TW")} 解鎖
                        </div>
                      )}

                      {/* 類型標籤 */}
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

        {/* ── PvP 戰績 ── */}
        {tab === "pvp" && (
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
                        {/* 名次 */}
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                          style={{
                            background: i === 0 ? "#fbbf24" : i === 1 ? "#94a3b8" : i === 2 ? "#b45309" : "rgba(255,255,255,0.1)",
                            color: i < 3 ? "#0a0a1a" : "#64748b",
                          }}>
                          {i + 1}
                        </div>
                        {/* 名稱 */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold truncate" style={{ color: ec }}>{r.agentName}</div>
                          <div className="text-xs text-slate-500">Lv.{r.agentLevel} · {r.wins}勝{r.losses}敗</div>
                        </div>
                        {/* 勝率 */}
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
              <a
                href="/game/pvp-history"
                className="inline-flex items-center gap-2 text-sm text-red-400 hover:text-red-300 border border-red-500/30 rounded-lg px-4 py-2 hover:bg-red-950/30 transition-colors"
              >
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

        {/* ── 最新動態 ── */}
        {tab === "recent" && (
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
