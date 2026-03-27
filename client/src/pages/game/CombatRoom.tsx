/**
 * CombatRoom.tsx
 * 戰鬥大廳 — 回合制戰鬥入口
 * 路由：/game/combat
 *
 * 功能：
 * 1. 當前地圖節點的怪物列表（可選擇挑戰）
 * 2. 整合 BattleWindow 回合制戰鬥介面
 * 3. 戰鬥歷史記錄
 * 4. 角色 / 寵物狀態概覽
 */

import { useState, useCallback, useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { BattleWindow } from "@/components/BattleWindow";
import GameTabLayout from "@/components/GameTabLayout";
import { toast } from "sonner";

// ─── 五行配色 ───
const WX_HEX: Record<string, string> = {
  wood: "#22c55e", fire: "#ef4444", earth: "#f59e0b", metal: "#e2e8f0", water: "#38bdf8",
  "木": "#22c55e", "火": "#ef4444", "土": "#f59e0b", "金": "#e2e8f0", "水": "#38bdf8",
};
const WX_EMOJI: Record<string, string> = {
  wood: "🌿", fire: "🔥", earth: "🪨", metal: "⚡", water: "💧",
  "木": "🌿", "火": "🔥", "土": "🪨", "金": "⚡", "水": "💧",
};
const RARITY_COLOR: Record<string, string> = {
  common: "#94a3b8", rare: "#38bdf8", elite: "#a78bfa", epic: "#c084fc",
  boss: "#f59e0b", legendary: "#ef4444",
};
const RARITY_LABEL: Record<string, string> = {
  common: "普通", rare: "精良", elite: "菁英", epic: "史詩",
  boss: "BOSS", legendary: "傳說",
};

const CombatRoom = () => {
  const [activeBattleId, setActiveBattleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"monsters" | "history">("monsters");

  // 取得角色資料
  const agentQuery = trpc.gameWorld.getAgentStatus.useQuery(undefined, {
    staleTime: 10000,
  });
  const agentData = agentQuery.data;
  const agent = agentData?.agent;

  // 取得當前節點資訊（含怪物列表）
  const nodeId = agent?.currentNodeId ?? "tp-zhongzheng";
  const nodeInfoQuery = trpc.gameWorld.getNodeInfo.useQuery(
    { nodeId },
    { enabled: !!agent, staleTime: 15000 }
  );
  const nodeInfo = nodeInfoQuery.data;
  const monsters = useMemo(() => nodeInfo?.monsters ?? [], [nodeInfo]);

  // 戰鬥歷史
  const historyQuery = trpc.gameBattle.getBattleHistory.useQuery(
    { limit: 20 },
    { staleTime: 5000 }
  );

  // 開始戰鬥
  const startBattleMut = trpc.gameBattle.startBattle.useMutation({
    onSuccess: (data) => {
      setActiveBattleId(data.battleId);
    },
    onError: (err) => {
      toast.error(`戰鬥開始失敗：${err.message}`);
    },
  });

  const handleChallenge = useCallback((monsterId: string, monsterName: string, isBoss?: boolean) => {
    if (activeBattleId || startBattleMut.isPending) {
      toast.error("戰鬥進行中，無法發起新戰鬥");
      return;
    }
    const mode = isBoss ? "boss" as const : "player_open" as const;
    startBattleMut.mutate({ mode, monsterId });
    toast.info(`向 ${monsterName} 發起挑戰！`);
  }, [activeBattleId, startBattleMut]);

  const handleBattleClose = useCallback(() => {
    setActiveBattleId(null);
    // 刷新角色狀態和戰鬥歷史
    agentQuery.refetch();
    historyQuery.refetch();
  }, [agentQuery, historyQuery]);

  const ec = nodeInfo?.node?.element
    ? WX_HEX[nodeInfo.node.element] ?? "#f59e0b"
    : "#f59e0b";

  return (
    <GameTabLayout>
      <div className="min-h-screen pb-20"
        style={{ background: "linear-gradient(180deg, #050d14 0%, #0a1628 40%, #0f1a2e 100%)" }}>

        {/* 頂部標題 */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/game">
                <button className="text-slate-400 hover:text-white transition-colors text-sm">
                  ← 世界
                </button>
              </Link>
              <div className="w-px h-4 bg-slate-700" />
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                <span>⚔️</span> 戰鬥大廳
              </h1>
            </div>
            {agent && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Lv.{agent.level}</span>
                <span className="text-amber-400 font-bold">{agent.agentName ?? "旅人"}</span>
              </div>
            )}
          </div>

          {/* 當前位置 */}
          {nodeInfo?.node && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded-full font-bold"
                style={{ background: `${ec}20`, color: ec, border: `1px solid ${ec}30` }}>
                {WX_EMOJI[nodeInfo.node.element] ?? "🌏"} {nodeInfo.node.name}
              </span>
              <span className="text-slate-500">
                怪物等級 Lv.{nodeInfo.node.monsterLevel?.[0] ?? 1}–{nodeInfo.node.monsterLevel?.[1] ?? 10}
              </span>
            </div>
          )}
        </div>

        {/* 角色 & 寵物概覽 */}
        {agent && (
          <div className="px-4 mb-3">
            <div className="rounded-xl p-3 border"
              style={{ background: "rgba(15,23,42,0.8)", borderColor: "rgba(99,102,241,0.15)" }}>
              <div className="flex gap-3">
                {/* 角色 */}
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-sm">👤</span>
                    <span className="text-xs font-bold text-cyan-400">{agent.agentName ?? "旅人"}</span>
                    <span className="text-[10px] text-slate-500">Lv.{agent.level}</span>
                  </div>
                  <div className="space-y-1">
                    <StatBar label="HP" current={agent.hp ?? agent.maxHp ?? 100} max={agent.maxHp ?? 100} color="#22c55e" />
                    <StatBar label="MP" current={agent.mp ?? agent.maxMp ?? 50} max={agent.maxMp ?? 50} color="#6366f1" />
                    <StatBar label="體力" current={agentData?.staminaInfo?.current ?? agent.stamina ?? 100} max={agentData?.staminaInfo?.max ?? agent.maxStamina ?? 100} color="#f59e0b" />
                  </div>
                </div>
                {/* 出戰寵物 */}
                {(agent as any).activePet && (
                  <div className="flex-1 border-l border-slate-800 pl-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-sm">🐾</span>
                      <span className="text-xs font-bold text-purple-400">{(agent as any).activePet.nickname || "寵物"}</span>
                      <span className="text-[10px] text-slate-500">Lv.{(agent as any).activePet.level}</span>
                    </div>
                    <div className="space-y-1">
                      <StatBar label="HP" current={(agent as any).activePet.hp} max={(agent as any).activePet.maxHp} color="#22c55e" />
                      <StatBar label="MP" current={(agent as any).activePet.mp} max={(agent as any).activePet.maxMp} color="#6366f1" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 切換 */}
        <div className="px-4 mb-3">
          <div className="flex gap-1 p-1 rounded-xl"
            style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(99,102,241,0.1)" }}>
            {[
              { id: "monsters" as const, icon: "👹", label: "怪物列表" },
              { id: "history" as const, icon: "📜", label: "戰鬥記錄" },
            ].map(tab => (
              <button key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: activeTab === tab.id ? "rgba(99,102,241,0.2)" : "transparent",
                  color: activeTab === tab.id ? "#c7d2fe" : "#64748b",
                  border: activeTab === tab.id ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent",
                }}>
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 怪物列表 */}
        {activeTab === "monsters" && (
          <div className="px-4 space-y-2">
            {nodeInfoQuery.isLoading && (
              <div className="text-center py-8">
                <div className="animate-spin text-2xl mb-2">⚔️</div>
                <p className="text-xs text-slate-500">載入怪物資料…</p>
              </div>
            )}

            {monsters.length === 0 && !nodeInfoQuery.isLoading && (
              <div className="text-center py-8">
                <p className="text-slate-500 text-sm">此區域暫無怪物出沒</p>
                <p className="text-slate-600 text-xs mt-1">嘗試前往其他地圖節點探索</p>
              </div>
            )}

            {monsters.map((m: any) => {
              const mc = WX_HEX[m.element] ?? "#888";
              const rc = RARITY_COLOR[m.rarity ?? "common"] ?? "#94a3b8";
              const rl = RARITY_LABEL[m.rarity ?? "common"] ?? "普通";
              return (
                <div key={m.id}
                  className="rounded-xl border overflow-hidden transition-all hover:scale-[1.01]"
                  style={{ background: `linear-gradient(135deg, ${mc}08 0%, rgba(15,23,42,0.9) 100%)`, borderColor: `${mc}20` }}>
                  <div className="p-3">
                    <div className="flex items-start gap-3">
                      {/* 怪物圖標 */}
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `${mc}15`, border: `1px solid ${mc}25` }}>
                        <span className="text-2xl">{WX_EMOJI[m.element] ?? "👾"}</span>
                      </div>

                      {/* 怪物資訊 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-sm" style={{ color: mc }}>{m.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                            style={{ background: `${rc}20`, color: rc, border: `1px solid ${rc}30` }}>
                            {rl}
                          </span>
                          {m.isBoss && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold animate-pulse"
                              style={{ background: "rgba(245,158,11,0.2)", color: "#f59e0b" }}>
                              BOSS
                            </span>
                          )}
                        </div>
                        {m.description && (
                          <p className="text-[10px] text-slate-500 truncate mb-1">{m.description}</p>
                        )}
                        <div className="flex items-center gap-3 text-[10px]">
                          <span className="text-slate-400">Lv.{m.level}</span>
                          <span className="text-red-400">HP {m.hp}</span>
                          <span className="text-orange-400">ATK {m.attack}</span>
                          <span className="text-blue-400">DEF {m.defense}</span>
                        </div>
                        {/* 技能標籤 */}
                        {m.skills && m.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {m.skills.slice(0, 3).map((sk: string, i: number) => (
                              <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full"
                                style={{ background: "rgba(139,92,246,0.15)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.2)" }}>
                                {sk}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 挑戰按鈕 */}
                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        <button
                          onClick={() => handleChallenge(m.id, m.name, m.isBoss)}
                          disabled={!!activeBattleId || startBattleMut.isPending}
                          className="px-3 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
                          style={{
                            background: m.isBoss
                              ? "linear-gradient(135deg, rgba(245,158,11,0.3), rgba(239,68,68,0.3))"
                              : `linear-gradient(135deg, ${mc}25, ${mc}15)`,
                            color: m.isBoss ? "#fcd34d" : mc,
                            border: `1px solid ${m.isBoss ? "rgba(245,158,11,0.4)" : `${mc}40`}`,
                          }}>
                          ⚔️ 挑戰
                        </button>
                        <span className="text-[9px] text-slate-600">
                          EXP +{m.expReward ?? Math.round(m.level * 8)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* 提示 */}
            {monsters.length > 0 && (
              <div className="text-center py-3">
                <p className="text-[10px] text-slate-600">
                  💡 挑戰怪物將進入回合制戰鬥，可手動選擇攻擊/技能/防禦/道具/逃跑
                </p>
              </div>
            )}
          </div>
        )}

        {/* 戰鬥歷史 */}
        {activeTab === "history" && (
          <div className="px-4 space-y-2">
            {historyQuery.isLoading && (
              <div className="text-center py-8">
                <div className="animate-spin text-2xl mb-2">📜</div>
                <p className="text-xs text-slate-500">載入戰鬥記錄…</p>
              </div>
            )}

            {(historyQuery.data?.length ?? 0) === 0 && !historyQuery.isLoading && (
              <div className="text-center py-8">
                <p className="text-slate-500 text-sm">尚無戰鬥記錄</p>
                <p className="text-slate-600 text-xs mt-1">挑戰怪物後，戰鬥記錄將顯示在此</p>
              </div>
            )}

            {historyQuery.data?.map((b: any) => {
              const won = b.result === "win";
              const fled = b.result === "flee";
              const resultColor = won ? "#22c55e" : fled ? "#f59e0b" : "#ef4444";
              const resultLabel = won ? "勝利" : fled ? "逃跑" : "失敗";
              const resultIcon = won ? "🎉" : fled ? "🏃" : "💀";
              const modeLabel: Record<string, string> = {
                player_open: "手動", player_closed: "自動", idle: "掛機",
                boss: "BOSS", map_mob: "野怪", pvp: "PvP",
              };
              const timeAgo = getTimeAgo(b.createdAt);

              return (
                <div key={b.battleId}
                  className="rounded-xl border p-3 flex items-center gap-3"
                  style={{ background: `${resultColor}05`, borderColor: `${resultColor}15` }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                    style={{ background: `${resultColor}15` }}>
                    {resultIcon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold" style={{ color: resultColor }}>{resultLabel}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(99,102,241,0.1)", color: "#94a3b8" }}>
                        {modeLabel[b.mode] ?? b.mode}
                      </span>
                      <span className="text-[10px] text-slate-600">{b.rounds} 回合</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-500">{timeAgo}</span>
                      {b.rewardMultiplier > 1 && (
                        <span className="text-[9px] text-amber-400">×{b.rewardMultiplier} 獎勵</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 戰鬥視窗 */}
      {activeBattleId && (
        <BattleWindow
          battleId={activeBattleId}
          onClose={handleBattleClose}
          onBattleEnd={(result) => {
            if (result === "win") toast.success("戰鬥勝利！獲得獎勵");
            else if (result === "flee") toast.info("成功逃離戰鬥");
            else toast.error("戰鬥失敗…");
          }}
        />
      )}
    </GameTabLayout>
  );
};

// ─── 輔助組件 ───

function StatBar({ label, current, max, color }: { label: string; current: number; max: number; color: string }) {
  const percent = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-1">
      <span className="text-[8px] text-slate-500 w-4">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%`, background: color }} />
      </div>
      <span className="text-[8px] text-slate-500 w-12 text-right">{current}/{max}</span>
    </div>
  );
}

function getTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "剛剛";
  if (mins < 60) return `${mins} 分鐘前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小時前`;
  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}

export default CombatRoom;
