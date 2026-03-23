/**
 * VirtualWorldPage.tsx — 靈相虛界主畫面
 * V11.19：手機版 RWD 全面重構（地圖全螢幕、底部抽屜角色面板、事件日誌右下角大按鈕、跟隨冒險者）
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import GameTabLayout from "@/components/GameTabLayout";
import LeafletMap from "@/components/LeafletMap";
import type { LeafletMapHandle } from "@/components/LeafletMap";
import type { MapNode } from "../../../../shared/mapNodes";

// ─── 五行配色 ─────────────────────────────────────────────────
const WX_HEX: Record<string, string> = {
  wood: "#22c55e", fire: "#ef4444", earth: "#f59e0b", metal: "#e2e8f0", water: "#38bdf8",
};
const WX_ZH: Record<string, string> = {
  wood: "木", fire: "火", earth: "土", metal: "金", water: "水",
};
const WX_EMOJI: Record<string, string> = {
  wood: "🌿", fire: "🔥", earth: "🪨", metal: "⚡", water: "💧",
};
const WX_GLOW: Record<string, string> = {
  wood: "0 0 20px rgba(34,197,94,0.6)", fire: "0 0 20px rgba(239,68,68,0.6)",
  earth: "0 0 20px rgba(245,158,11,0.6)", metal: "0 0 20px rgba(226,232,240,0.5)",
  water: "0 0 20px rgba(56,189,248,0.6)",
};
const EV_COLOR: Record<string, string> = {
  combat: "#ef4444", move: "#60a5fa", gather: "#34d399",
  rest: "#a78bfa", rogue: "#f59e0b", system: "#e2e8f0",
};
const EV_ICON: Record<string, string> = {
  combat: "⚔️", move: "🚶", gather: "🌿", rest: "😴", rogue: "🎲", system: "✨",
};
const STRATEGIES = [
  { id: "explore" as const, icon: "🗺️", label: "探索" },
  { id: "combat"  as const, icon: "⚔️", label: "戰鬥" },
  { id: "gather"  as const, icon: "🌿", label: "採集" },
  { id: "rest"    as const, icon: "😴", label: "休息" },
];
const QUALITY_COLOR: Record<string, string> = {
  legendary: "#f59e0b", epic: "#a78bfa", rare: "#60a5fa",
  uncommon: "#34d399", common: "#94a3b8",
};
const QUALITY_ZH: Record<string, string> = {
  legendary: "傳說", epic: "史詩", rare: "稀有", uncommon: "精良", common: "普通",
};
type PanelId = "combat" | "life" | "equip" | "skill" | "natal";

// ─────────────────────────────────────────────────────────────
// 命名對話框
// ─────────────────────────────────────────────────────────────
function NamingDialog({ onNamed }: { onNamed: () => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const mut = trpc.gameWorld.nameAgent.useMutation({
    onSuccess: () => onNamed(),
    onError: (e) => setError(e.message),
  });
  const submit = () => {
    const t = name.trim();
    if (t.length < 1 || t.length > 12) { setError("名稱需 1-12 字"); return; }
    mut.mutate({ name: t });
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)" }}>
      <div className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
        style={{
          background: "linear-gradient(135deg, #0f1a2e 0%, #1a2a3a 100%)",
          border: "1px solid rgba(245,158,11,0.3)",
          boxShadow: "0 0 60px rgba(245,158,11,0.2)",
        }}>
        <div className="text-center">
          <div className="text-5xl mb-3">✨</div>
          <h2 className="text-2xl font-bold tracking-widest mb-1"
            style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            命格旅人誕生
          </h2>
          <p className="text-slate-400 text-sm">為你的旅人取一個名字</p>
          <p className="text-slate-600 text-xs mt-1">1-12 字 · 命名後無法更改</p>
        </div>
        <input
          type="text" value={name} onChange={e => { setName(e.target.value); setError(""); }}
          onKeyDown={e => e.key === "Enter" && submit()}
          placeholder="旅人名稱…" maxLength={12}
          className="w-full px-4 py-4 rounded-xl text-center text-xl font-bold tracking-widest outline-none"
          style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${error ? "rgba(239,68,68,0.5)" : "rgba(245,158,11,0.3)"}`, color: "#f59e0b" }}
          autoFocus
        />
        {error && <p className="text-red-400 text-sm text-center -mt-2">{error}</p>}
        <button onClick={submit} disabled={mut.isPending || !name.trim()}
          className="w-full py-4 rounded-xl font-bold text-base tracking-widest transition-all hover:scale-105 disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)", color: "#000" }}>
          {mut.isPending ? "命名中…" : "確認踏入虛界 ✨"}
        </button>
        <p className="text-slate-600 text-xs text-center">旅人屬性由你的八字命盤自動計算</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 進度條
// ─────────────────────────────────────────────────────────────
function StatBar({ icon, label, value, max, color }: { icon: string; label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-base w-5 text-center shrink-0">{icon}</span>
      <span className="text-xs text-slate-400 w-8 shrink-0">{label}</span>
      <div className="flex-1 h-2.5 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-bold tabular-nums w-16 text-right shrink-0" style={{ color }}>{value}/{max}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 方格面板（節點資訊）
// ─────────────────────────────────────────────────────────────
type NodeInfoData = {
  node?: { name?: string; county?: string; element?: string; terrain?: string; description?: string; dangerLevel?: number; monsterLevel?: [number, number] };
  monsters?: Array<{ id: string; name: string; element: string; level: number; hp: number; attack: number; defense: number; isBoss: boolean; description: string }>;
  resources?: Array<{ name: string; rarity: string; icon: string }>;
  questHints?: string[];
  adventurers?: Array<{ name: string; level: number; hp: number; maxHp: number; element: string; status: string }>;
};

function NodeInfoPanel({
  nodeData, isOpen, onToggle, ec, compact = false,
}: {
  nodeData: NodeInfoData | null | undefined;
  isOpen: boolean;
  onToggle: () => void;
  ec: string;
  compact?: boolean;
}) {
  const node = nodeData?.node;
  const monsters = nodeData?.monsters ?? [];
  const resources = nodeData?.resources ?? [];
  const questHints = nodeData?.questHints ?? [];
  const adventurers = nodeData?.adventurers ?? [];
  const dangerColor = ["", "#22c55e", "#84cc16", "#f59e0b", "#ef4444", "#dc2626"];
  const dangerLabel = ["", "安全", "低危", "中危", "高危", "極危"];
  const dl = Math.min(5, Math.max(0, node?.dangerLevel ?? 1));

  return (
    <div className="flex flex-col">
      <button
        onClick={onToggle}
        className="flex items-center justify-between px-4 py-3 w-full transition-all hover:bg-white/5"
        style={{ background: isOpen ? `${ec}08` : "transparent" }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base">📍</span>
          <span className="text-sm font-bold text-slate-200">{node?.name ?? "—"}</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: `${ec}18`, color: ec }}>{node?.county ?? "—"}</span>
          {dl > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-bold"
              style={{ background: `${dangerColor[dl]}18`, color: dangerColor[dl] }}>
              {dangerLabel[dl]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {adventurers.length > 0 && (
            <span className="text-xs text-slate-500">{adventurers.length} 人在場</span>
          )}
          <span className="text-slate-500 text-sm">{isOpen ? "▼" : "▲"}</span>
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-4 overflow-y-auto" style={{ maxHeight: "38vh" }}>
          {node?.description && (
            <p className="text-xs text-slate-500 leading-relaxed italic border-l-2 pl-3"
              style={{ borderColor: `${ec}40` }}>{node.description}</p>
          )}

          {monsters.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                <span>⚔️</span> 此地怪物
                <span className="text-slate-600 font-normal ml-1">Lv.{node?.monsterLevel?.[0] ?? 1}–{node?.monsterLevel?.[1] ?? 10}</span>
              </p>
              <div className="space-y-2">
                {monsters.map(m => {
                  const mc = WX_HEX[m.element] ?? "#888";
                  return (
                    <div key={m.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border"
                      style={{ background: `${mc}08`, borderColor: `${mc}25` }}>
                      <span className="text-base shrink-0">{WX_EMOJI[m.element] ?? "👾"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-bold" style={{ color: mc }}>{m.name}</span>
                          {m.isBoss && (
                            <span className="text-xs px-1.5 py-0.5 rounded font-bold"
                              style={{ background: "rgba(245,158,11,0.2)", color: "#f59e0b" }}>BOSS</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 truncate">{m.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-slate-300">Lv.{m.level}</p>
                        <p className="text-xs text-red-400">HP {m.hp}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {resources.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                <span>🌿</span> 可收集資源
              </p>
              <div className="flex flex-wrap gap-2">
                {resources.map((r, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs"
                    style={{ background: `${ec}08`, borderColor: `${ec}25`, color: ec }}>
                    <span>{r.icon}</span>
                    <span className="font-medium">{r.name}</span>
                    <span className="text-slate-600">·{r.rarity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {questHints.length > 0 && (
            <div className="space-y-1.5">
              {questHints.map((hint, i) => (
                <div key={i} className="text-xs px-3 py-2 rounded-lg"
                  style={{ background: "rgba(245,158,11,0.08)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)" }}>
                  {hint}
                </div>
              ))}
            </div>
          )}

          {adventurers.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                <span>👥</span> 在場冒險者（{adventurers.length}）
              </p>
              <div className="space-y-2">
                {adventurers.map((a, i) => {
                  const ac = WX_HEX[a.element] ?? "#888";
                  const hpPct = a.maxHp > 0 ? Math.min(100, (a.hp / a.maxHp) * 100) : 0;
                  const statusLabel = a.status === "idle" ? "待機" : a.status === "moving" ? "移動" : a.status === "resting" ? "休息" : a.status === "combat" ? "戰鬥中" : a.status;
                  return (
                    <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-xl border"
                      style={{ background: `${ac}06`, borderColor: `${ac}20` }}>
                      <span className="text-sm shrink-0">{WX_EMOJI[a.element] ?? "👤"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-bold text-slate-200">{a.name}</span>
                          <span className="text-xs text-slate-500">Lv.{a.level}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded"
                            style={{ background: a.status === "combat" ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.1)", color: a.status === "combat" ? "#ef4444" : "#22c55e" }}>
                            {statusLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${hpPct}%`, background: "#ef4444" }} />
                          </div>
                          <span className="text-xs text-slate-600 shrink-0">{a.hp}/{a.maxHp}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {monsters.length === 0 && resources.length === 0 && adventurers.length === 0 && (
            <p className="text-xs text-slate-600 text-center py-2">此地一片寧靜…</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 角色面板
// ─────────────────────────────────────────────────────────────
type AgentData = {
  agentName?: string; level?: number; hp?: number; maxHp?: number; mp?: number; maxMp?: number;
  stamina?: number; maxStamina?: number; gold?: number; strategy?: string; status?: string;
  dominantElement?: string; currentNodeId?: string; actionPoints?: number; maxActionPoints?: number;
  exp?: number; expToNext?: number; attack?: number; defense?: number; speed?: number;
  skills?: Array<{ name: string; element: string; level: number; description?: string }>;
};

function CharacterPanel({
  agent, staminaInfo, natalStats, equippedData, balanceData, dailyData,
  divineHeal, setStrategy, ec, mobileMode = false,
}: {
  agent: AgentData | null | undefined;
  staminaInfo: { current?: number; max?: number; nextRegenMin?: number } | null | undefined;
  natalStats: { hp?: number; atk?: number; def?: number; spd?: number; mp?: number } | null | undefined;
  equippedData: { userGender?: string; dayMasterElementEn?: string; equipped?: Record<string, { name: string; quality?: string } | null> } | null | undefined;
  balanceData: { gameCoins?: number; gameStones?: number } | null | undefined;
  dailyData: { dayPillar?: { stem?: string; branch?: string; stemElement?: string } } | null | undefined;
  divineHeal: { mutate: () => void; isPending: boolean };
  setStrategy: { mutate: (a: { strategy: "combat" | "gather" | "rest" | "explore" }) => void; isPending: boolean };
  ec: string;
  mobileMode?: boolean;
}) {
  const [activePanel, setActivePanel] = useState<PanelId | null>("combat");
  const agentElement = agent?.dominantElement ?? equippedData?.dayMasterElementEn ?? "metal";
  const agentName = agent?.agentName ?? "旅人";
  const agentLevel = agent?.level ?? 1;
  const agentHp = agent?.hp ?? 100;
  const agentMaxHp = agent?.maxHp ?? 100;
  const agentMp = agent?.mp ?? 50;
  const agentMaxMp = agent?.maxMp ?? 50;
  const agentStamina = staminaInfo?.current ?? agent?.stamina ?? 100;
  const agentMaxStamina = staminaInfo?.max ?? agent?.maxStamina ?? 100;
  const agentGold = agent?.gold ?? 0;
  const agentStrategy = agent?.strategy ?? "explore";
  const agentStatus = agent?.status ?? "idle";
  const agentAP = agent?.actionPoints ?? 5;
  const agentMaxAP = agent?.maxActionPoints ?? 5;
  const agentExp = agent?.exp ?? 0;
  const agentExpToNext = agent?.expToNext ?? 100;
  const userGender = equippedData?.userGender ?? "female";
  const gameCoins = balanceData?.gameCoins ?? 0;
  const gameStones = balanceData?.gameStones ?? 0;
  const todayStem = dailyData?.dayPillar?.stem ?? "甲";
  const todayBranch = dailyData?.dayPillar?.branch ?? "子";
  const todayElement = dailyData?.dayPillar?.stemElement ?? "木";
  const todayElementEn = ({"木":"wood","火":"fire","土":"earth","金":"metal","水":"water"} as Record<string,string>)[todayElement] ?? "wood";
  const todayColor = WX_HEX[todayElementEn] ?? "#22c55e";
  const equipped = equippedData?.equipped ?? {};
  const statusLabel = agentStatus === "idle" ? "待機" : agentStatus === "moving" ? "移動中" : agentStatus === "resting" ? "休息中" : agentStatus === "combat" ? "戰鬥中" : agentStatus;
  const statusBg = agentStatus === "combat" ? "rgba(239,68,68,0.12)" : agentStatus === "idle" ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)";
  const statusFg = agentStatus === "combat" ? "#ef4444" : agentStatus === "idle" ? "#22c55e" : "#f59e0b";
  const PANELS: { id: PanelId; icon: string; label: string }[] = [
    { id: "combat", icon: "⚔️", label: "戰鬥" },
    { id: "life",   icon: "🏠", label: "生活" },
    { id: "equip",  icon: "🛡️", label: "裝備" },
    { id: "skill",  icon: "✨", label: "技能" },
    { id: "natal",  icon: "🔮", label: "命格" },
  ];

  return (
    <div className="flex flex-col overflow-hidden flex-1"
      style={{ background: "rgba(8,12,25,0.97)" }}>
      {/* 旅人頭部：手機版底部抽屜模式下隱藏（已有把手列） */}
      <div className={`px-4 py-3 flex items-center gap-3 shrink-0${mobileMode ? " hidden" : ""}`} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl border shrink-0"
          style={{ background: `radial-gradient(circle,${ec}25,transparent)`, borderColor: `${ec}50`, boxShadow: `0 0 12px ${ec}30` }}>
          {userGender === "male" ? "🧙" : "🧝"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-100 font-bold text-base">{agentName}</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold shrink-0"
              style={{ background: `${ec}22`, color: ec }}>{WX_ZH[agentElement] ?? "金"}命</span>
            <span className="text-xs text-slate-500">Lv.{agentLevel}</span>
            <span className="text-xs px-2 py-0.5 rounded-full shrink-0 font-medium" style={{ background: statusBg, color: statusFg }}>{statusLabel}</span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${agentExpToNext > 0 ? Math.min(100,(agentExp/agentExpToNext)*100) : 0}%`, background: "linear-gradient(90deg,#a78bfa,#7c3aed)" }} />
            </div>
            <span className="text-xs text-slate-600 shrink-0">{agentExp}/{agentExpToNext} EXP</span>
          </div>
        </div>
      </div>

      {/* Tab 列 */}
      <div className="flex shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        {PANELS.map(p => (
          <button key={p.id} onClick={() => setActivePanel(activePanel === p.id ? null : p.id)}
            className="flex-1 py-2.5 flex flex-col items-center gap-0.5 transition-all"
            style={{
              background: activePanel === p.id ? `${ec}12` : "transparent",
              color: activePanel === p.id ? ec : "rgba(148,163,184,0.55)",
              borderBottom: activePanel === p.id ? `2px solid ${ec}` : "2px solid transparent",
            }}>
            <span className="text-lg leading-none">{p.icon}</span>
            <span className="text-[11px]">{p.label}</span>
          </button>
        ))}
      </div>

      {/* 面板內容 */}
      {activePanel && (
        <div className="px-4 py-3 overflow-y-auto flex-1">
          {/* ── 戰鬥 ── */}
          {activePanel === "combat" && (
            <div className="space-y-3">
              <StatBar icon="❤️" label="HP"   value={agentHp}      max={agentMaxHp}      color="#ef4444" />
              <StatBar icon="💧" label="MP"   value={agentMp}      max={agentMaxMp}      color="#38bdf8" />
              <StatBar icon="⚡" label="活躍" value={agentStamina} max={agentMaxStamina} color="#f59e0b" />
              {staminaInfo && agentStamina < agentMaxStamina && (
                <p className="text-xs text-slate-600 text-right">下次恢復：{staminaInfo.nextRegenMin} 分鐘後</p>
              )}
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[
                  { icon: "⚔️", label: "攻擊", value: agent?.attack ?? 10, color: "#ef4444" },
                  { icon: "🛡️", label: "防禦", value: agent?.defense ?? 5, color: "#60a5fa" },
                  { icon: "💨", label: "速度", value: agent?.speed ?? 8, color: "#a78bfa" },
                ].map(s => (
                  <div key={s.label} className="px-2 py-2.5 rounded-xl border text-center"
                    style={{ background: `${s.color}08`, borderColor: `${s.color}25` }}>
                    <span className="text-base">{s.icon}</span>
                    <p className="text-base font-bold mt-0.5" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-xs text-slate-600">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="pt-1">
                <p className="text-xs text-slate-500 mb-2">行動策略</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {STRATEGIES.map(s => (
                    <button key={s.id} onClick={() => setStrategy.mutate({ strategy: s.id })}
                      className="flex flex-col items-center gap-1 py-3 rounded-xl text-xs border transition-all hover:scale-105 active:scale-95"
                      style={{
                        background: agentStrategy === s.id ? `${ec}18` : "rgba(255,255,255,0.03)",
                        borderColor: agentStrategy === s.id ? `${ec}55` : "rgba(255,255,255,0.08)",
                        color: agentStrategy === s.id ? ec : "rgba(148,163,184,0.6)",
                      }}>
                      <span className="text-xl leading-none">{s.icon}</span>
                      <span className="text-xs">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-1 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-500">神蹟干預</p>
                  <span className="text-xs text-cyan-400 font-bold">靈力 {agentAP}/{agentMaxAP}</span>
                </div>
                <button onClick={() => divineHeal.mutate()} disabled={agentAP < 1 || divineHeal.isPending}
                  className="w-full py-3.5 rounded-xl text-sm font-bold border transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
                  style={{ background: "rgba(56,189,248,0.08)", borderColor: "rgba(56,189,248,0.3)", color: "#38bdf8" }}>
                  {divineHeal.isPending ? "⏳ 施法中…" : "💊 神蹟治癒（恢復 50% HP）"}
                </button>
              </div>
            </div>
          )}

          {/* ── 生活 ── */}
          {activePanel === "life" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: "🪙", label: "金幣",  value: agentGold.toLocaleString(),  color: "#f59e0b" },
                  { icon: "💎", label: "靈石",  value: gameStones.toLocaleString(), color: "#38bdf8" },
                  { icon: "🏆", label: "等級",  value: `Lv.${agentLevel}`,           color: ec },
                  { icon: "📊", label: "遊戲幣", value: gameCoins.toLocaleString(),  color: "#a78bfa" },
                ].map(item => (
                  <div key={item.label} className="px-3 py-3 rounded-xl border"
                    style={{ background: `${item.color}08`, borderColor: `${item.color}22` }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-base">{item.icon}</span>
                      <span className="text-xs text-slate-500">{item.label}</span>
                    </div>
                    <p className="text-base font-bold" style={{ color: item.color }}>{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="px-3 py-3 rounded-xl border"
                style={{ background: `${todayColor}08`, borderColor: `${todayColor}28` }}>
                <p className="text-xs text-slate-500 mb-1">今日流日</p>
                <p className="text-base font-bold" style={{ color: todayColor }}>{todayStem}{todayBranch}（{todayElement}旺）</p>
                <p className="text-xs text-slate-400 mt-1">{todayElement}屬性怪物掉落率 +30%・技能傷害 +20%</p>
              </div>
            </div>
          )}

          {/* ── 裝備 ── */}
          {activePanel === "equip" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">裝備欄位（8格）</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { slot: "weapon",  icon: "⚔️", label: "主武器" },
                  { slot: "offhand", icon: "🗡️", label: "副手" },
                  { slot: "head",    icon: "⛑️", label: "頭盔" },
                  { slot: "body",    icon: "🛡️", label: "護甲" },
                  { slot: "hands",   icon: "🧤", label: "手套" },
                  { slot: "feet",    icon: "👟", label: "鞋子" },
                  { slot: "ringA",   icon: "💍", label: "戒指A" },
                  { slot: "ringB",   icon: "💍", label: "戒指B" },
                ].map(({ slot, icon, label }) => {
                  const item = equipped[slot];
                  const qc = item?.quality ? QUALITY_COLOR[item.quality] ?? "#94a3b8" : null;
                  return (
                    <div key={slot} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border"
                      style={{
                        background: item ? `${qc ?? ec}08` : "rgba(255,255,255,0.02)",
                        borderColor: item ? `${qc ?? ec}30` : "rgba(255,255,255,0.07)",
                      }}>
                      <span className="text-xl shrink-0">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-500">{label}</p>
                        {item ? (
                          <div>
                            <p className="text-sm font-bold text-slate-200 leading-tight truncate">{item.name}</p>
                            {item.quality && qc && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full"
                                style={{ background: `${qc}20`, color: qc }}>
                                {QUALITY_ZH[item.quality] ?? item.quality}
                              </span>
                            )}
                          </div>
                        ) : <p className="text-xs text-slate-700 italic">空槽</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-3 py-3 rounded-xl border text-center"
                style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
                <p className="text-sm text-slate-600">背包道具系統開發中</p>
                <p className="text-xs text-slate-700 mt-1">擊敗怪物後將自動獲得道具</p>
              </div>
            </div>
          )}

          {/* ── 技能 ── */}
          {activePanel === "skill" && (
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                {["主動1", "主動2", "主動3", "主動4"].map((slot, i) => {
                  const s = (agent?.skills ?? [])[i];
                  const c = s ? WX_HEX[s.element] ?? "#888" : "#334155";
                  return (
                    <div key={slot} className="px-3 py-2.5 rounded-xl border"
                      style={{ background: s ? `${c}08` : "rgba(255,255,255,0.02)", borderColor: s ? `${c}25` : "rgba(255,255,255,0.07)" }}>
                      <p className="text-xs text-slate-600 mb-1">{slot}</p>
                      {s ? (
                        <div>
                          <p className="text-sm font-bold" style={{ color: c }}>{s.name}</p>
                          <p className="text-xs text-slate-600">Lv.{s.level}</p>
                          {s.description && <p className="text-xs text-slate-700 mt-0.5 truncate">{s.description}</p>}
                        </div>
                      ) : <p className="text-xs text-slate-700 italic">空槽</p>}
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {["被動1", "被動2"].map((slot, i) => {
                  const s = (agent?.skills ?? [])[4 + i];
                  const c = s ? WX_HEX[s.element] ?? "#888" : "#334155";
                  return (
                    <div key={slot} className="px-3 py-2.5 rounded-xl border"
                      style={{ background: s ? `${c}08` : "rgba(255,255,255,0.02)", borderColor: s ? `${c}25` : "rgba(255,255,255,0.07)" }}>
                      <p className="text-xs text-slate-600 mb-1">{slot}</p>
                      {s ? (
                        <div>
                          <p className="text-sm font-bold" style={{ color: c }}>{s.name}</p>
                          <p className="text-xs text-slate-600">Lv.{s.level}</p>
                        </div>
                      ) : <p className="text-xs text-slate-700 italic">空槽</p>}
                    </div>
                  );
                })}
              </div>
              {(agent?.skills ?? []).length === 0 && (
                <div className="text-center py-4">
                  <p className="text-slate-600 text-sm">尚未習得任何技能</p>
                  <p className="text-slate-700 text-xs mt-1">在戰鬥中有機率習得技能</p>
                </div>
              )}
            </div>
          )}

          {/* ── 命格 ── */}
          {activePanel === "natal" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">命格能力值（來自你的八字）</p>
              {natalStats ? (
                <div className="space-y-2.5">
                  {[
                    { key: "hp",  icon: "🌿", label: "木 HP",  color: "#22c55e", max: 300 },
                    { key: "atk", icon: "🔥", label: "火 攻",  color: "#ef4444", max: 60  },
                    { key: "def", icon: "🪨", label: "土 防",  color: "#f59e0b", max: 50  },
                    { key: "spd", icon: "⚡", label: "金 速",  color: "#e2e8f0", max: 30  },
                    { key: "mp",  icon: "💧", label: "水 MP",  color: "#38bdf8", max: 150 },
                  ].map(({ key, icon, label, color, max }) => {
                    const val = (natalStats as Record<string, number>)[key] ?? 0;
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-base w-5 text-center">{icon}</span>
                        <span className="text-xs text-slate-500 w-14">{label}</span>
                        <div className="flex-1 h-2.5 bg-slate-800/80 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${Math.min(100,(val/max)*100)}%`, background: color }} />
                        </div>
                        <span className="text-sm font-bold tabular-nums w-8 text-right" style={{ color }}>{val}</span>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-slate-600 text-sm text-center py-3">請先完成八字分析</p>}
              <div className="pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <p className="text-xs text-slate-500 mb-2">加成來源</p>
                <div className="space-y-1.5 text-xs text-slate-600">
                  <p>🔮 八字命格 → 基礎能力值</p>
                  <p>⚔️ 裝備詞條 → 額外加成（開發中）</p>
                  <p>🎯 技能 Combo → 特殊效果（開發中）</p>
                  <p>🐾 寵物加成 → 屬性提升（開發中）</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 事件日誌抽屜
// ─────────────────────────────────────────────────────────────
function EventLogDrawer({
  events, logTab, setLogTab, isOpen, onClose,
}: {
  events: Array<{ id: number; eventType: string; message: string; createdAt: string; detail?: Record<string, unknown> | null }> | undefined;
  logTab: "all" | "combat" | "rogue";
  setLogTab: (t: "all" | "combat" | "rogue") => void;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isOpen && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [isOpen, events]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end" onClick={onClose}>
      <div className="w-full rounded-t-2xl flex flex-col"
        style={{ background: "rgba(6,10,22,0.98)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.08)", maxHeight: "70vh" }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-2">
            <span className="text-base">📜</span>
            <span className="text-sm font-bold text-slate-200">冒險日誌</span>
          </div>
          <div className="flex items-center gap-2">
            {(["all", "combat", "rogue"] as const).map(tab => (
              <button key={tab} onClick={() => setLogTab(tab)}
                className="px-2.5 py-1 rounded-full text-xs border transition-all"
                style={{
                  background: logTab === tab ? "rgba(245,158,11,0.15)" : "transparent",
                  borderColor: logTab === tab ? "rgba(245,158,11,0.4)" : "rgba(255,255,255,0.1)",
                  color: logTab === tab ? "#f59e0b" : "#64748b",
                }}>
                {tab === "all" ? "全部" : tab === "combat" ? "戰鬥" : "奇遇"}
              </button>
            ))}
            <button onClick={onClose} className="text-slate-600 hover:text-slate-400 text-lg px-1">✕</button>
          </div>
        </div>
        <div ref={listRef} className="overflow-y-auto px-4 py-3 space-y-1.5 font-mono flex-1">
          {(!events || events.length === 0) ? (
            <div className="text-center py-8">
              <p className="text-slate-600 text-sm">等待旅人的第一個事件…</p>
              <p className="text-slate-700 text-xs mt-1">Tick 引擎每 5 分鐘自動觸發</p>
            </div>
          ) : [...events].reverse().map(ev => {
            const detail = ev.detail;
            const hasCombat = Boolean(detail && detail.phase === "result" && detail.rounds);
            const isExp = expandedId === ev.id;
            return (
              <div key={ev.id} className="flex flex-col gap-0.5 text-sm leading-relaxed">
                <div className="flex gap-2 cursor-pointer py-0.5"
                  onClick={() => hasCombat && setExpandedId(isExp ? null : ev.id)}>
                  <span className="text-slate-700 shrink-0 tabular-nums text-xs pt-0.5">
                    {new Date(ev.createdAt).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="shrink-0 text-sm">{EV_ICON[ev.eventType] ?? "•"}</span>
                  <span className="flex-1" style={{ color: EV_COLOR[ev.eventType] ?? "rgba(148,163,184,0.85)" }}>{ev.message}</span>
                  {hasCombat && <span className="text-slate-600 text-xs shrink-0">{isExp ? "▲" : "▼"}</span>}
                </div>
                {isExp && hasCombat && detail && (
                  <div className="ml-8 pl-2 border-l border-slate-700 text-xs text-slate-500 space-y-0.5">
                    {(detail.rounds as Array<Record<string, unknown>> ?? []).slice(0, 4).map((r, i) => (
                      <p key={i}>{String(r.attacker ?? "")} → {String(r.defender ?? "")}：{String(r.damage ?? 0)} 傷害{r.critical ? " 💥暴擊" : ""}</p>
                    ))}
                    {Boolean(detail.victory)
                      ? <p className="text-green-500">✓ 勝利！+{String(detail.expGained ?? 0)} EXP・+{String(detail.goldGained ?? 0)} 金幣</p>
                      : <p className="text-red-500">✗ 敗退</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 主頁面
// ─────────────────────────────────────────────────────────────
export default function VirtualWorldPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [logTab, setLogTab] = useState<"all" | "combat" | "rogue">("all");
  const [showLog, setShowLog] = useState(false);
  const [nodeInfoOpen, setNodeInfoOpen] = useState(true);
  const [tickRunning, setTickRunning] = useState(false);
  const [charPanelOpen, setCharPanelOpen] = useState(true); // 手機版底部抽屜：預設展開
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mapRef = useRef<LeafletMapHandle>(null); // 跟隨冒險者用
  const utils = trpc.useUtils();

  const { data: agentData, isLoading: agentLoading } = trpc.gameWorld.getOrCreateAgent.useQuery(
    undefined, { enabled: !!user, refetchInterval: 30000 });
  const { data: statusData, refetch: refetchStatus } = trpc.gameWorld.getAgentStatus.useQuery(
    undefined, { enabled: !!user && !agentData?.needsNaming, refetchInterval: 30000 });
  const { data: eventLog, refetch: refetchLog } = trpc.gameWorld.getEventLog.useQuery(
    { limit: 60, eventType: logTab === "all" ? undefined : logTab === "combat" ? "combat" : "rogue" },
    { enabled: !!user && !agentData?.needsNaming, refetchInterval: 30000 });
  const { data: mapNodes } = trpc.gameWorld.getMapNodes.useQuery(undefined, { staleTime: Infinity });
  const { data: equippedData } = trpc.gameAvatar.getEquipped.useQuery(undefined, { enabled: !!user, staleTime: 60000 });
  const { data: balanceData } = trpc.gameShop.getBalance.useQuery(undefined, { enabled: !!user, staleTime: 30000 });
  const { data: dailyData } = trpc.oracle.dailyEnergy.useQuery(undefined, { enabled: !!user, staleTime: 300000 });
  const { data: onlineStats } = trpc.gameWorld.getOnlineStats.useQuery(undefined, { refetchInterval: 60000 });

  const agent = agentData?.agent as AgentData | null | undefined;
  const currentNodeId = agent?.currentNodeId ?? "tp-zhongzheng";
  const { data: nodeInfoData } = trpc.gameWorld.getNodeInfo.useQuery(
    { nodeId: currentNodeId },
    { enabled: !!currentNodeId, refetchInterval: 30000 }
  );

  const setStrategy = trpc.gameWorld.setStrategy.useMutation({ onSuccess: () => utils.gameWorld.getAgentStatus.invalidate() });
  const divineHeal  = trpc.gameWorld.divineHeal.useMutation({ onSuccess: () => { refetchStatus(); refetchLog(); } });
  const triggerTick = trpc.gameWorld.triggerTick.useMutation({ onSuccess: () => { refetchStatus(); refetchLog(); } });

  const handleTickToggle = useCallback(() => {
    if (tickRunning) {
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
      setTickRunning(false);
    } else {
      triggerTick.mutate();
      tickIntervalRef.current = setInterval(() => { triggerTick.mutate(); }, 5 * 60 * 1000);
      setTickRunning(true);
    }
  }, [tickRunning, triggerTick]);

  useEffect(() => {
    return () => { if (tickIntervalRef.current) clearInterval(tickIntervalRef.current); };
  }, []);

  const [showNaming, setShowNaming] = useState(false);
  useEffect(() => {
    if (agentData?.needsNaming) setShowNaming(true);
  }, [agentData?.needsNaming]);

  const staminaInfo = statusData?.staminaInfo as { current?: number; max?: number; nextRegenMin?: number } | undefined;
  const natalStats = equippedData?.natalStats as { hp?: number; atk?: number; def?: number; spd?: number; mp?: number } | undefined;
  const mapNodeList = useMemo(() => (mapNodes ?? []) as MapNode[], [mapNodes]);
  const agentElement = agent?.dominantElement ?? equippedData?.dayMasterElementEn ?? "metal";
  const ec = WX_HEX[agentElement] ?? "#e2e8f0";
  const todayStem = dailyData?.dayPillar?.stem ?? "甲";
  const todayBranch = dailyData?.dayPillar?.branch ?? "子";
  const todayElement = dailyData?.dayPillar?.stemElement ?? "木";
  const todayElementEn = ({"木":"wood","火":"fire","土":"earth","金":"metal","水":"water"} as Record<string,string>)[todayElement] ?? "wood";
  const todayColor = WX_HEX[todayElementEn] ?? "#22c55e";
  const onlineCount = onlineStats?.onlineCount ?? 0;
  const totalAdventurers = onlineStats?.totalAdventurers ?? 0;

  if (!user) {
    return (
      <GameTabLayout activeTab="world">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
          <div className="text-6xl">🌏</div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-amber-400 mb-2">靈相虛界</h2>
            <p className="text-slate-400 text-sm">登入後開始你的虛界旅程</p>
          </div>
          <a href={getLoginUrl()}
            className="px-8 py-4 rounded-xl font-bold text-black text-base transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)" }}>
            登入開始
          </a>
        </div>
      </GameTabLayout>
    );
  }

  return (
    <GameTabLayout activeTab="world">
      {showNaming && (
        <NamingDialog onNamed={() => {
          setShowNaming(false);
          utils.gameWorld.getOrCreateAgent.invalidate();
          utils.gameWorld.getAgentStatus.invalidate();
        }} />
      )}

      <EventLogDrawer
        events={eventLog as Array<{ id: number; eventType: string; message: string; createdAt: string; detail?: Record<string, unknown> | null }> | undefined}
        logTab={logTab}
        setLogTab={setLogTab}
        isOpen={showLog}
        onClose={() => setShowLog(false)}
      />

      {/* ── 固定視窗主佈局 ── */}
      <div className="flex flex-col" style={{ height: "calc(100vh - 64px)", overflow: "hidden" }}>

        {/* ── 置頂區 ── */}
        <div className="shrink-0 px-3 py-2 flex items-center gap-2"
          style={{
            background: "rgba(6,10,22,0.97)",
            backdropFilter: "blur(16px)",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            zIndex: 20,
          }}>

          {/* 左：本命霓虹標籤 */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="px-2.5 py-1.5 rounded-xl border font-bold text-xs"
              style={{
                background: `${todayColor}12`,
                borderColor: `${todayColor}40`,
                color: todayColor,
                boxShadow: `0 0 14px ${todayColor}40`,
                textShadow: `0 0 8px ${todayColor}`,
              }}>
              {todayStem}{todayBranch}{todayElement}旺
            </div>
            <div className="px-2.5 py-1.5 rounded-xl border font-bold text-xs"
              style={{
                background: `${ec}12`,
                borderColor: `${ec}40`,
                color: ec,
                boxShadow: WX_GLOW[agentElement] ?? "none",
                textShadow: `0 0 8px ${ec}`,
              }}>
              {WX_ZH[agentElement] ?? "金"}命
            </div>
          </div>

          {/* 中：在線統計 */}
          <div className="flex-1 flex items-center justify-center gap-3">
            <div className="flex items-center gap-1 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
              <span className="text-green-400 font-bold">{onlineCount}</span>
              <span className="text-slate-600">在線</span>
            </div>
            <div className="text-slate-700 text-xs">|</div>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-400 font-bold">{totalAdventurers}</span>
              <span className="text-slate-600">旅人</span>
            </div>
          </div>

          {/* 右：跟隨冒險者 + Tick 大按鈕 */}
          <div className="flex items-center gap-2 shrink-0">
            {/* 跟隨冒險者按鈕（特殊光效） */}
            <button
              className="px-2.5 py-2 rounded-xl text-xs font-bold border transition-all hover:scale-105 active:scale-95"
              style={{
                background: "rgba(168,85,247,0.12)",
                borderColor: "rgba(168,85,247,0.5)",
                color: "#a855f7",
                boxShadow: "0 0 16px rgba(168,85,247,0.4), inset 0 0 8px rgba(168,85,247,0.1)",
                textShadow: "0 0 8px rgba(168,85,247,0.9)",
                animation: "pulse 2s infinite",
              }}
              onClick={() => {
                if (currentNodeId) {
                  mapRef.current?.highlightNode(currentNodeId);
                  // 手機版：如果角色面板展開中則收合以顯示地圖
                  setCharPanelOpen(false);
                }
              }}
            >
              👁 跟隨
            </button>

            {/* Tick 大按鈕 */}
            <button
              onClick={handleTickToggle}
              disabled={triggerTick.isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-sm border transition-all hover:scale-105 active:scale-95 disabled:opacity-60"
              style={{
                background: tickRunning ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
                borderColor: tickRunning ? "rgba(239,68,68,0.5)" : "rgba(245,158,11,0.5)",
                color: tickRunning ? "#ef4444" : "#f59e0b",
                boxShadow: tickRunning ? "0 0 18px rgba(239,68,68,0.5)" : "0 0 18px rgba(245,158,11,0.5)",
                minWidth: "80px",
              }}
            >
              {triggerTick.isPending ? (
                <span className="animate-spin text-base">⏳</span>
              ) : tickRunning ? (
                <>
                  <span className="w-2 h-2 rounded-sm bg-red-400 animate-pulse shrink-0" />
                  <span>暫停</span>
                </>
              ) : (
                <>
                  <span className="text-base">▶</span>
                  <span>Tick</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── 主內容區 ── */}
        {/* 桌機版：左地圖+方格面板、右角色面板 */}
        {/* 手機版：地圖占滿上半、底部抽屜角色面板 */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">

          {/* ── 地圖區塊 ── */}
          {/* 桌機： flex-1；手機：占滿剩餘空間 */}
          <div className="flex flex-col lg:flex-1 overflow-hidden" style={{ minHeight: 0 }}>

            {/* 地圖容器：手機版占滿剩餘空間，桌機版 flex-1 */}
            <div
              className="relative overflow-hidden"
              style={{
                flex: 1,
                minHeight: 0,
                // 手機版：当角色面板收合時地圖占滿；展開時地圖占剩餘
              }}
            >
              {agentLoading ? (
                <div className="w-full h-full flex items-center justify-center"
                  style={{ background: "rgba(8,12,25,0.95)" }}>
                  <p className="text-slate-600 text-sm animate-pulse">載入地圖中…</p>
                </div>
              ) : (
                <LeafletMap
                  ref={mapRef}
                  nodes={mapNodeList}
                  currentNodeId={currentNodeId}
                  onNodeClick={(_nodeId) => {}}
                />
              )}

              {/* ── 地圖上的浮動元素 ── */}

              {/* 日誌按鈕：右下角大按鈕（手機版明顯） */}
              <button
                onClick={() => setShowLog(v => !v)}
                className="absolute z-10 flex items-center justify-center border transition-all hover:scale-110 active:scale-95"
                style={{
                  bottom: "16px",
                  right: "16px",
                  width: "52px",
                  height: "52px",
                  borderRadius: "50%",
                  background: "rgba(6,10,22,0.92)",
                  backdropFilter: "blur(10px)",
                  borderColor: "rgba(245,158,11,0.5)",
                  boxShadow: "0 0 16px rgba(245,158,11,0.4), 0 4px 12px rgba(0,0,0,0.5)",
                  fontSize: "22px",
                }}
              >
                📜
                {/* 未讀數徳章 */}
                {(eventLog?.length ?? 0) > 0 && (
                  <span
                    className="absolute font-bold"
                    style={{
                      top: "-4px",
                      right: "-4px",
                      minWidth: "20px",
                      height: "20px",
                      borderRadius: "10px",
                      background: "#ef4444",
                      color: "#fff",
                      fontSize: "11px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 4px",
                      border: "2px solid rgba(6,10,22,0.9)",
                    }}
                  >
                    {(eventLog?.length ?? 0) > 99 ? "99+" : eventLog?.length}
                  </span>
                )}
              </button>

              {/* 手機版：角色面板抽屜把手（地圖上方） */}
              <button
                className="absolute lg:hidden z-10 flex items-center justify-center gap-1.5 border transition-all"
                style={{
                  bottom: "16px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  height: "32px",
                  padding: "0 16px",
                  borderRadius: "16px",
                  background: "rgba(6,10,22,0.92)",
                  backdropFilter: "blur(10px)",
                  borderColor: `${ec}50`,
                  boxShadow: `0 0 12px ${ec}30, 0 4px 12px rgba(0,0,0,0.5)`,
                  color: ec,
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
                onClick={() => setCharPanelOpen(v => !v)}
              >
                <span>{charPanelOpen ? "▼" : "▲"}</span>
                <span>{charPanelOpen ? "收合角色面板" : "展開角色面板"}</span>
              </button>

              {/* 方格面板浮動卡片（手機版左上角） */}
              <div
                className="absolute top-2 left-2 z-10 lg:hidden"
                style={{ maxWidth: "calc(100% - 80px)" }}
              >
                <button
                  onClick={() => setNodeInfoOpen(v => !v)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all"
                  style={{
                    background: "rgba(6,10,22,0.92)",
                    backdropFilter: "blur(10px)",
                    borderColor: `${ec}40`,
                    color: ec,
                    boxShadow: `0 0 10px ${ec}25`,
                  }}
                >
                  <span>📍</span>
                  <span className="truncate" style={{ maxWidth: "80px" }}>{nodeInfoData?.node?.name ?? "—"}</span>
                  <span className="text-slate-500">{nodeInfoOpen ? "▼" : "▲"}</span>
                </button>

                {/* 手機版方格面板展開內容 */}
                {nodeInfoOpen && (
                  <div
                    className="mt-1 rounded-xl border overflow-hidden"
                    style={{
                      background: "rgba(6,10,22,0.95)",
                      backdropFilter: "blur(16px)",
                      borderColor: `${ec}25`,
                      maxHeight: "45vh",
                      overflowY: "auto",
                      width: "min(280px, calc(100vw - 80px))",
                    }}
                  >
                    <NodeInfoPanel
                      nodeData={nodeInfoData as NodeInfoData | null | undefined}
                      isOpen={true}
                      onToggle={() => setNodeInfoOpen(false)}
                      ec={ec}
                      compact={true}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 方格面板（桌機版展開，收合時地圖自動延展） */}
            <div className="shrink-0 overflow-hidden hidden lg:block"
              style={{ background: "rgba(8,12,25,0.97)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <NodeInfoPanel
                nodeData={nodeInfoData as NodeInfoData | null | undefined}
                isOpen={nodeInfoOpen}
                onToggle={() => setNodeInfoOpen(v => !v)}
                ec={ec}
              />
            </div>
          </div>

          {/* ── 角色面板：桌機版右側、手機版底部抽屜 ── */}
          {/* 桌機：固定寬度 340px，左邊框 */}
          {/* 手機：絕對定位底部，可上滑展開／下滑收合 */}
          <div
            className="lg:w-[340px] lg:border-l lg:relative lg:flex lg:flex-col lg:overflow-hidden"
            style={{
              borderColor: "rgba(255,255,255,0.06)",
            }}
          >
            {/* 桌機版：正常顯示 */}
            <div className="hidden lg:flex lg:flex-col lg:flex-1 lg:overflow-hidden">
              <CharacterPanel
                agent={agent}
                staminaInfo={staminaInfo}
                natalStats={natalStats}
                equippedData={equippedData as { userGender?: string; dayMasterElementEn?: string; equipped?: Record<string, { name: string; quality?: string } | null> } | null | undefined}
                balanceData={balanceData as { gameCoins?: number; gameStones?: number } | null | undefined}
                dailyData={dailyData as { dayPillar?: { stem?: string; branch?: string; stemElement?: string } } | null | undefined}
                divineHeal={divineHeal}
                setStrategy={setStrategy}
                ec={ec}
              />
              {/* 緊湊功能按鈕列（取代重複大按鈕） */}
              <div className="px-3 py-2 flex items-center gap-2 shrink-0 border-t"
                style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(8,12,25,0.97)" }}>
                {/* 旅人日誌按鈕 */}
                <button
                  onClick={() => setShowLog(v => !v)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl border transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.28)" }}>
                  <span className="text-base">📜</span>
                  <span className="text-xs text-amber-300 font-bold">旅人日誌</span>
                  {(eventLog?.length ?? 0) > 0 && (
                    <span className="text-xs font-bold px-1 rounded-full" style={{ background: "#ef4444", color: "#fff", fontSize: "10px" }}>
                      {(eventLog?.length ?? 0) > 99 ? "99+" : eventLog?.length}
                    </span>
                  )}
                </button>
                {/* 地圖傳送按鈕 */}
                <button
                  onClick={() => { /* TODO: 開啟地圖傳送面板 */ alert("地圖傳送：即將推出！"); }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl border transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: "rgba(56,189,248,0.08)", borderColor: "rgba(56,189,248,0.28)" }}>
                  <span className="text-base">🗺️</span>
                  <span className="text-xs text-sky-300 font-bold">地圖傳送</span>
                </button>
                {/* 隱藏商店感應按鈕：平常暗灰，遇到隱藏商店時金色脈衝發光 */}
                <button
                  onClick={() => { navigate("/game/shop"); }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl border transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: "rgba(100,100,120,0.06)",
                    borderColor: "rgba(100,100,120,0.2)",
                    opacity: 0.5,
                  }}>
                  <span className="text-base">🏪</span>
                  <span className="text-xs text-slate-500 font-bold">商店</span>
                </button>
              </div>
            </div>

            {/* 手機版：底部抽屜角色面板 */}
            <div
              className="lg:hidden fixed left-0 right-0 z-30 flex flex-col"
              style={{
                bottom: "56px", // GameTabLayout 底部導覽列高度
                background: "rgba(6,10,22,0.98)",
                backdropFilter: "blur(20px)",
                borderTop: `2px solid ${ec}40`,
                boxShadow: `0 -4px 24px ${ec}20, 0 -2px 8px rgba(0,0,0,0.6)`,
                transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1)",
                transform: charPanelOpen ? "translateY(0)" : "translateY(calc(100% - 56px))",
                maxHeight: "70vh",
              }}
            >
              {/* 抽屜把手列 */}
              <div
                className="flex items-center justify-between px-4 py-2 shrink-0 cursor-pointer"
                onClick={() => setCharPanelOpen(v => !v)}
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg border shrink-0"
                    style={{ background: `radial-gradient(circle,${ec}25,transparent)`, borderColor: `${ec}50` }}>
                    {equippedData?.userGender === "male" ? "🧙" : "🧙‍♀️"}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-200">{agent?.agentName ?? "旅人"}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: `${ec}22`, color: ec }}>{WX_ZH[agentElement] ?? "金"}命</span>
                    <span className="text-xs text-slate-500">Lv.{agent?.level ?? 1}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* HP 小條 */}
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-red-400">♥</span>
                    <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-red-500" style={{ width: `${agent?.maxHp ? Math.min(100,(agent.hp ?? 0)/agent.maxHp*100) : 0}%` }} />
                    </div>
                  </div>
                  <span className="text-slate-500 text-sm">{charPanelOpen ? "▼" : "▲"}</span>
                </div>
              </div>

              {/* 抽屜內容：可滾動 */}
              <div className="overflow-y-auto flex-1">
                <CharacterPanel
                  agent={agent}
                  staminaInfo={staminaInfo}
                  natalStats={natalStats}
                  equippedData={equippedData as { userGender?: string; dayMasterElementEn?: string; equipped?: Record<string, { name: string; quality?: string } | null> } | null | undefined}
                  balanceData={balanceData as { gameCoins?: number; gameStones?: number } | null | undefined}
                  dailyData={dailyData as { dayPillar?: { stem?: string; branch?: string; stemElement?: string } } | null | undefined}
                  divineHeal={divineHeal}
                  setStrategy={setStrategy}
                  ec={ec}
                  mobileMode={true}
                />
                {/* 手機版緊湊功能按鈕列 */}
                <div className="px-3 py-2 flex items-center gap-2 border-t"
                  style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  {/* 旅人日誌 */}
                  <button
                    onClick={() => { setShowLog(v => !v); setCharPanelOpen(false); }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl border transition-all active:scale-[0.98]"
                    style={{ background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.28)" }}>
                    <span className="text-base">📜</span>
                    <span className="text-xs text-amber-300 font-bold">日誌</span>
                    {(eventLog?.length ?? 0) > 0 && (
                      <span className="text-xs font-bold px-1 rounded-full" style={{ background: "#ef4444", color: "#fff", fontSize: "10px" }}>
                        {(eventLog?.length ?? 0) > 99 ? "99+" : eventLog?.length}
                      </span>
                    )}
                  </button>
                  {/* 地圖傳送 */}
                  <button
                    onClick={() => { alert("地圖傳送：即將推出！"); }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl border transition-all active:scale-[0.98]"
                    style={{ background: "rgba(56,189,248,0.08)", borderColor: "rgba(56,189,248,0.28)" }}>
                    <span className="text-base">🗺️</span>
                    <span className="text-xs text-sky-300 font-bold">傳送</span>
                  </button>
                  {/* 隱藏商店感應 */}
                  <button
                    onClick={() => { navigate("/game/shop"); }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl border transition-all active:scale-[0.98]"
                    style={{
                      background: "rgba(100,100,120,0.06)",
                      borderColor: "rgba(100,100,120,0.2)",
                      opacity: 0.5,
                    }}>
                    <span className="text-base">🏪</span>
                    <span className="text-xs text-slate-500 font-bold">商店</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </GameTabLayout>
  );
}
