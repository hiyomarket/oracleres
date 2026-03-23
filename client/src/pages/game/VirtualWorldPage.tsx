/**
 * VirtualWorldPage.tsx — 靈相虛界主畫面
 * V11.16：手機優先、地圖為主視覺、折疊式角色面板、浮動事件日誌
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import GameTabLayout from "@/components/GameTabLayout";

// ─── 五行配色 ─────────────────────────────────────────────────
const WX_HEX: Record<string, string> = {
  wood: "#2E8B57", fire: "#DC143C", earth: "#CD853F", metal: "#C9A227", water: "#00CED1",
};
const WX_ZH: Record<string, string> = {
  wood: "木", fire: "火", earth: "土", metal: "金", water: "水",
};
const WX_EMOJI: Record<string, string> = {
  wood: "🌿", fire: "🔥", earth: "🪨", metal: "⚡", water: "💧",
};

// ─── 事件配色 ─────────────────────────────────────────────────
const EV_COLOR: Record<string, string> = {
  combat: "#ef4444", move: "#60a5fa", gather: "#34d399",
  rest: "#a78bfa", rogue: "#f59e0b", system: "#e2e8f0",
};
const EV_ICON: Record<string, string> = {
  combat: "⚔️", move: "🚶", gather: "🌿", rest: "😴", rogue: "🎲", system: "✨",
};

// ─── 策略 ─────────────────────────────────────────────────────
const STRATEGIES = [
  { id: "explore" as const, icon: "🗺️", label: "探索" },
  { id: "combat"  as const, icon: "⚔️", label: "戰鬥" },
  { id: "gather"  as const, icon: "🌿", label: "採集" },
  { id: "rest"    as const, icon: "😴", label: "休息" },
];

// ─── 品質顏色 ─────────────────────────────────────────────────
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
      style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(10px)" }}>
      <div className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
        style={{
          background: "linear-gradient(135deg, #0f1a2e 0%, #1a2a3a 100%)",
          border: "1px solid rgba(245,158,11,0.3)",
          boxShadow: "0 0 50px rgba(245,158,11,0.15)",
        }}>
        <div className="text-center">
          <div className="text-5xl mb-3">✨</div>
          <h2 className="text-xl font-bold tracking-widest mb-1"
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
          className="w-full px-4 py-3 rounded-xl text-center text-lg font-bold tracking-widest outline-none"
          style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${error ? "rgba(239,68,68,0.5)" : "rgba(245,158,11,0.3)"}`, color: "#f59e0b" }}
          autoFocus
        />
        {error && <p className="text-red-400 text-xs text-center -mt-2">{error}</p>}
        <button onClick={submit} disabled={mut.isPending || !name.trim()}
          className="w-full py-3 rounded-xl font-bold text-sm tracking-widest transition-all hover:scale-105 disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)", color: "#000" }}>
          {mut.isPending ? "命名中…" : "確認踏入虛界 ✨"}
        </button>
        <p className="text-slate-600 text-[10px] text-center">旅人屬性由你的八字命盤自動計算</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 台灣地圖（可縮放/平移）
// ─────────────────────────────────────────────────────────────
interface MapNode { id: string; name: string; element: string; x: number; y: number; dangerLevel: number; county: string; }

function TaiwanMap({ nodes, currentNodeId }: { nodes: MapNode[]; currentNodeId: string }) {
  const [scale, setScale] = useState(1.2);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ sx: 0, sy: 0, ox: 0, oy: 0 });
  const [hovered, setHovered] = useState<string | null>(null);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale(s => Math.min(6, Math.max(0.5, s * (e.deltaY > 0 ? 0.85 : 1.18))));
  }, []);

  const onMD = useCallback((e: React.MouseEvent) => {
    setDragging(true);
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: offset.x, oy: offset.y };
  }, [offset]);
  const onMM = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setOffset({ x: dragRef.current.ox + e.clientX - dragRef.current.sx, y: dragRef.current.oy + e.clientY - dragRef.current.sy });
  }, [dragging]);
  const onMU = useCallback(() => setDragging(false), []);

  const touchRef = useRef<{ lx: number; ly: number } | null>(null);
  const onTS = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) touchRef.current = { lx: e.touches[0].clientX - offset.x, ly: e.touches[0].clientY - offset.y };
  }, [offset]);
  const onTM = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && touchRef.current)
      setOffset({ x: e.touches[0].clientX - touchRef.current.lx, y: e.touches[0].clientY - touchRef.current.ly });
  }, []);

  const focusCurrent = useCallback(() => {
    const n = nodes.find(n => n.id === currentNodeId);
    if (n) { setScale(3); setOffset({ x: -(n.x * 3 * 3.6) + 120, y: -(n.y * 1.8 * 3 * 3.6) + 160 }); }
    else { setScale(1.2); setOffset({ x: 0, y: 0 }); }
  }, [nodes, currentNodeId]);

  useEffect(() => { focusCurrent(); }, [currentNodeId]);

  const hovNode = nodes.find(n => n.id === hovered);

  return (
    <div className="relative w-full overflow-hidden select-none"
      style={{
        background: "radial-gradient(ellipse at 40% 30%, rgba(10,25,45,0.98) 0%, rgba(5,10,20,0.99) 100%)",
        aspectRatio: "1/1.05",
        cursor: dragging ? "grabbing" : "grab",
      }}
      onWheel={onWheel} onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU}
      onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={() => { touchRef.current = null; }}>
      <svg viewBox="0 0 100 180" className="w-full h-full"
        style={{ transform: `translate(${offset.x}px,${offset.y}px) scale(${scale})`, transformOrigin: "center center", transition: dragging ? "none" : "transform 0.08s" }}>
        {/* 台灣輪廓 */}
        <path d="M47 8 C44 10,41 13,40 17 C38 21,37 24,36 28 C34 33,33 37,32 41 C30 46,29 50,28 54 C27 58,27 62,27 66 C27 70,28 74,29 78 C30 82,32 85,34 88 C36 91,38 93,40 95 C42 97,44 99,46 101 C48 103,50 104,52 104 C54 104,56 103,58 101 C60 99,62 97,63 95 C65 92,66 89,66 86 C67 83,67 80,67 77 C67 74,66 71,65 68 C64 65,63 62,62 59 C61 56,60 53,60 50 C60 47,60 44,60 41 C60 38,59 35,58 32 C57 29,56 26,55 23 C54 20,53 17,52 14 C51 11,50 9,47 8 Z"
          fill="rgba(20,45,30,0.45)" stroke="rgba(80,160,80,0.18)" strokeWidth="0.5" />
        {/* 縣市色塊 */}
        {[
          [47,19,6,"#DC143C"],[44,22,8,"#CD853F"],[39,26,6,"#C9A227"],[33,31,5,"#2E8B57"],
          [32,38,5,"#00CED1"],[34,47,7,"#DC143C"],[40,52,6,"#2E8B57"],[30,51,5,"#CD853F"],
          [29,57,5,"#C9A227"],[32,62,5,"#2E8B57"],[31,70,6,"#00CED1"],[35,79,7,"#DC143C"],
          [37,89,6,"#CD853F"],[55,82,6,"#C9A227"],[58,65,7,"#2E8B57"],[57,40,5,"#00CED1"],[52,14,3,"#DC143C"],
        ].map(([cx,cy,r,c],i) => (
          <circle key={i} cx={cx as number} cy={cy as number} r={r as number} fill={`${c}07`} stroke={`${c}12`} strokeWidth="0.3" />
        ))}
        {/* 節點 */}
        {nodes.map(node => {
          const isCur = node.id === currentNodeId;
          const isHov = node.id === hovered;
          const c = WX_HEX[node.element] ?? "#888";
          const cy = node.y * 1.8;
          const r = isCur ? 3.5 : isHov ? 2.2 : 1.5;
          return (
            <g key={node.id}>
              {isCur && <>
                <circle cx={node.x} cy={cy} r={8} fill="none" stroke={c} strokeWidth="0.35" opacity="0.25" />
                <circle cx={node.x} cy={cy} r={5.5} fill="none" stroke={c} strokeWidth="0.4" opacity="0.45" />
              </>}
              <circle cx={node.x} cy={cy} r={r}
                fill={isCur ? c : isHov ? `${c}bb` : `${c}60`}
                stroke={isCur ? "#fff" : isHov ? c : `${c}40`}
                strokeWidth={isCur ? "0.7" : "0.2"}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
              />
              {isCur && <text x={node.x} y={cy - 5} textAnchor="middle" fontSize="3" fill="#fff" fontWeight="bold" style={{ pointerEvents: "none" }}>{node.name.slice(0,4)}</text>}
              {isHov && !isCur && <text x={node.x} y={cy - 3.5} textAnchor="middle" fontSize="2.6" fill={c} style={{ pointerEvents: "none" }}>{node.name.slice(0,4)}</text>}
            </g>
          );
        })}
      </svg>
      {/* 縮放按鈕 */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1.5 z-10">
        {[["＋", () => setScale(s => Math.min(6, s*1.3))], ["－", () => setScale(s => Math.max(0.5, s*0.77))], ["📍", focusCurrent]].map(([lbl, fn], i) => (
          <button key={i} onClick={fn as () => void}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold transition-all hover:scale-110"
            style={{ background: i===2 ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.1)", color: i===2 ? "#f59e0b" : "#fff", border: `1px solid ${i===2 ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.15)"}` }}>
            {lbl as string}
          </button>
        ))}
      </div>
      {/* Hover 提示 */}
      {hovNode && (
        <div className="absolute top-3 left-3 px-3 py-2 rounded-xl text-xs pointer-events-none z-10"
          style={{ background: "rgba(8,12,25,0.93)", border: `1px solid ${WX_HEX[hovNode.element]}35`, backdropFilter: "blur(8px)", maxWidth: 160 }}>
          <p className="font-bold text-slate-200">{hovNode.name}</p>
          <p className="text-slate-500 text-[10px]">{hovNode.county}</p>
          <div className="flex items-center gap-1 mt-1">
            <span style={{ color: WX_HEX[hovNode.element] }}>{WX_EMOJI[hovNode.element]}</span>
            <span style={{ color: WX_HEX[hovNode.element] }} className="text-[10px]">{WX_ZH[hovNode.element]}屬性</span>
            <span className="text-slate-600 text-[10px] ml-auto">危險 Lv.{hovNode.dangerLevel}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 狀態條
// ─────────────────────────────────────────────────────────────
function StatBar({ icon, label, value, max, color }: { icon: string; label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-base w-5 text-center leading-none">{icon}</span>
      <span className="text-[11px] text-slate-500 w-8">{label}</span>
      <div className="flex-1 h-2 bg-slate-800/80 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[11px] text-slate-300 tabular-nums w-16 text-right">{value}/{max}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 折疊式角色面板
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
  triggerTick, divineHeal, setStrategy,
}: {
  agent: AgentData | null | undefined;
  staminaInfo: { current?: number; max?: number; nextRegenMin?: number } | null | undefined;
  natalStats: { hp?: number; atk?: number; def?: number; spd?: number; mp?: number } | null | undefined;
  equippedData: { userGender?: string; dayMasterElementEn?: string; equipped?: Record<string, { name: string; quality?: string } | null> } | null | undefined;
  balanceData: { gameCoins?: number; gameStones?: number } | null | undefined;
  dailyData: { dayPillar?: { stem?: string; branch?: string; stemElement?: string } } | null | undefined;
  triggerTick: { mutate: () => void; isPending: boolean };
  divineHeal: { mutate: () => void; isPending: boolean };
  setStrategy: { mutate: (a: { strategy: "combat" | "gather" | "rest" | "explore" }) => void; isPending: boolean };
}) {
  const [activePanel, setActivePanel] = useState<PanelId | null>("combat");

  const agentElement = agent?.dominantElement ?? equippedData?.dayMasterElementEn ?? "metal";
  const ec = WX_HEX[agentElement] ?? "#C9A227";
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
  const todayColor = WX_HEX[todayElementEn] ?? "#2E8B57";
  const equipped = equippedData?.equipped ?? {};

  const statusLabel = agentStatus === "idle" ? "待機" : agentStatus === "moving" ? "移動中" : agentStatus === "resting" ? "休息中" : agentStatus;
  const statusBg = agentStatus === "idle" ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)";
  const statusFg = agentStatus === "idle" ? "#22c55e" : "#f59e0b";

  const PANELS: { id: PanelId; icon: string; label: string }[] = [
    { id: "combat", icon: "⚔️", label: "戰鬥" },
    { id: "life",   icon: "🏠", label: "生活" },
    { id: "equip",  icon: "🛡️", label: "裝備" },
    { id: "skill",  icon: "✨", label: "技能" },
    { id: "natal",  icon: "🔮", label: "命格" },
  ];

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: "rgba(10,15,30,0.94)", borderColor: `${ec}22`, backdropFilter: "blur(12px)" }}>
      {/* 旅人頭部 */}
      <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl border shrink-0"
          style={{ background: `radial-gradient(circle,${ec}22,transparent)`, borderColor: `${ec}40` }}>
          {userGender === "male" ? "🧙" : "🧝"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-200 font-bold text-sm">{agentName}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0"
              style={{ background: `${ec}20`, color: ec }}>{WX_ZH[agentElement] ?? "金"}命</span>
            <span className="text-[10px] text-slate-500">Lv.{agentLevel}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded shrink-0" style={{ background: statusBg, color: statusFg }}>{statusLabel}</span>
          </div>
          {/* 經驗條 */}
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${agentExpToNext > 0 ? Math.min(100,(agentExp/agentExpToNext)*100) : 0}%`, background: "linear-gradient(90deg,#a78bfa,#7c3aed)" }} />
            </div>
            <span className="text-[9px] text-slate-600 shrink-0">{agentExp}/{agentExpToNext} EXP</span>
          </div>
        </div>
        {/* Tick 按鈕 */}
        <button onClick={() => triggerTick.mutate()} disabled={triggerTick.isPending}
          className="px-3 py-2.5 rounded-xl text-xs font-bold border transition-all hover:scale-105 disabled:opacity-50 shrink-0"
          style={{ background: "rgba(245,158,11,0.12)", borderColor: "rgba(245,158,11,0.35)", color: "#f59e0b" }}>
          {triggerTick.isPending ? "⏳" : "▶ Tick"}
        </button>
      </div>

      {/* Tab 列 */}
      <div className="flex" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        {PANELS.map(p => (
          <button key={p.id} onClick={() => setActivePanel(activePanel === p.id ? null : p.id)}
            className="flex-1 py-2.5 flex flex-col items-center gap-0.5 text-[10px] transition-all"
            style={{
              background: activePanel === p.id ? `${ec}12` : "transparent",
              color: activePanel === p.id ? ec : "rgba(148,163,184,0.5)",
              borderBottom: activePanel === p.id ? `2px solid ${ec}` : "2px solid transparent",
            }}>
            <span className="text-base leading-none">{p.icon}</span>
            <span>{p.label}</span>
          </button>
        ))}
      </div>

      {/* 面板內容 */}
      {activePanel && (
        <div className="px-4 py-3">

          {/* ── 戰鬥 ──────────────────────────────────────── */}
          {activePanel === "combat" && (
            <div className="space-y-2.5">
              <StatBar icon="❤️" label="HP"   value={agentHp}      max={agentMaxHp}      color="#ef4444" />
              <StatBar icon="💧" label="MP"   value={agentMp}      max={agentMaxMp}      color="#60a5fa" />
              <StatBar icon="⚡" label="活躍" value={agentStamina} max={agentMaxStamina} color="#f59e0b" />
              {staminaInfo && agentStamina < agentMaxStamina && (
                <p className="text-[9px] text-slate-600 text-right">下次恢復：{staminaInfo.nextRegenMin} 分鐘後</p>
              )}
              {/* 策略 */}
              <div className="pt-1">
                <p className="text-[10px] text-slate-600 mb-2">行動策略</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {STRATEGIES.map(s => (
                    <button key={s.id} onClick={() => setStrategy.mutate({ strategy: s.id })}
                      className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-[10px] border transition-all hover:scale-105"
                      style={{
                        background: agentStrategy === s.id ? `${ec}15` : "rgba(255,255,255,0.03)",
                        borderColor: agentStrategy === s.id ? `${ec}50` : "rgba(255,255,255,0.07)",
                        color: agentStrategy === s.id ? ec : "rgba(148,163,184,0.6)",
                      }}>
                      <span className="text-base leading-none">{s.icon}</span>
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* 神蹟干預 */}
              <div className="pt-1 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-slate-600">神蹟干預</p>
                  <span className="text-[10px] text-cyan-400">靈力 {agentAP}/{agentMaxAP}</span>
                </div>
                <button onClick={() => divineHeal.mutate()} disabled={agentAP < 1 || divineHeal.isPending}
                  className="w-full py-3 rounded-xl text-sm font-bold border transition-all hover:scale-[1.02] disabled:opacity-40"
                  style={{ background: "rgba(0,206,209,0.08)", borderColor: "rgba(0,206,209,0.25)", color: "#00CED1" }}>
                  {divineHeal.isPending ? "⏳ 施法中…" : "💊 神蹟治癒（恢復 50% HP）"}
                </button>
              </div>
            </div>
          )}

          {/* ── 生活 ──────────────────────────────────────── */}
          {activePanel === "life" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: "🪙", label: "金幣",  value: agentGold.toLocaleString(),  color: "#f59e0b" },
                  { icon: "💎", label: "靈石",  value: gameStones.toLocaleString(), color: "#00CED1" },
                  { icon: "🏆", label: "等級",  value: `Lv.${agentLevel}`,           color: ec },
                  { icon: "📊", label: "遊戲幣", value: gameCoins.toLocaleString(),  color: "#a78bfa" },
                ].map(item => (
                  <div key={item.label} className="px-3 py-2.5 rounded-xl border"
                    style={{ background: `${item.color}08`, borderColor: `${item.color}20` }}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-sm">{item.icon}</span>
                      <span className="text-[10px] text-slate-500">{item.label}</span>
                    </div>
                    <p className="text-sm font-bold" style={{ color: item.color }}>{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="px-3 py-2.5 rounded-xl border"
                style={{ background: `${todayColor}08`, borderColor: `${todayColor}25` }}>
                <p className="text-[10px] text-slate-500 mb-1">今日流日</p>
                <p className="text-sm font-bold" style={{ color: todayColor }}>{todayStem}{todayBranch}（{todayElement}旺）</p>
                <p className="text-[10px] text-slate-400 mt-1">{todayElement}屬性怪物掉落率 +30%・技能傷害 +20%</p>
              </div>
            </div>
          )}

          {/* ── 裝備 ──────────────────────────────────────── */}
          {activePanel === "equip" && (
            <div className="space-y-3">
              <p className="text-[10px] text-slate-600">裝備欄位</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { slot: "weapon", icon: "⚔️", label: "武器" },
                  { slot: "helmet", icon: "⛑️", label: "頭盔" },
                  { slot: "armor",  icon: "🛡️", label: "護甲" },
                  { slot: "boots",  icon: "👟", label: "鞋子" },
                ].map(({ slot, icon, label }) => {
                  const item = equipped[slot];
                  const qc = item?.quality ? QUALITY_COLOR[item.quality] ?? "#94a3b8" : null;
                  return (
                    <div key={slot} className="px-3 py-3 rounded-xl border flex flex-col gap-1.5 min-h-[72px]"
                      style={{
                        background: item ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
                        borderColor: item ? "rgba(245,158,11,0.25)" : "rgba(255,255,255,0.07)",
                        borderStyle: item ? "solid" : "dashed",
                      }}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{icon}</span>
                        <span className="text-[10px] text-slate-500">{label}</span>
                      </div>
                      {item ? (
                        <>
                          <p className="text-xs font-bold text-slate-200 leading-tight">{item.name}</p>
                          {item.quality && qc && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full self-start"
                              style={{ background: `${qc}20`, color: qc }}>
                              {QUALITY_ZH[item.quality] ?? item.quality}
                            </span>
                          )}
                        </>
                      ) : <p className="text-[10px] text-slate-700 italic">空槽</p>}
                    </div>
                  );
                })}
              </div>
              <div className="px-3 py-3 rounded-xl border text-center"
                style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
                <p className="text-[11px] text-slate-600">背包道具系統開發中</p>
                <p className="text-[10px] text-slate-700 mt-1">擊敗怪物後將自動獲得道具</p>
              </div>
            </div>
          )}

          {/* ── 技能 ──────────────────────────────────────── */}
          {activePanel === "skill" && (
            <div className="space-y-2">
              <p className="text-[10px] text-slate-600 mb-2">已習得技能</p>
              {(agent?.skills ?? []).length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-slate-600 text-sm">尚未習得任何技能</p>
                  <p className="text-slate-700 text-xs mt-1">在戰鬥中有機率習得技能</p>
                </div>
              ) : (agent?.skills ?? []).map((s, i) => {
                const c = WX_HEX[s.element] ?? "#888";
                return (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border"
                    style={{ background: `${c}08`, borderColor: `${c}20` }}>
                    <span className="text-lg">{WX_EMOJI[s.element]}</span>
                    <div className="flex-1">
                      <p className="text-xs font-bold" style={{ color: c }}>{s.name}</p>
                      {s.description && <p className="text-[10px] text-slate-500">{s.description}</p>}
                    </div>
                    <span className="text-[10px] text-slate-600">Lv.{s.level}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── 命格 ──────────────────────────────────────── */}
          {activePanel === "natal" && (
            <div className="space-y-3">
              <p className="text-[10px] text-slate-600">命格能力值（來自你的八字）</p>
              {natalStats ? (
                <div className="space-y-2">
                  {[
                    { key: "hp",  icon: "🌿", label: "木 HP",  color: "#2E8B57", max: 300 },
                    { key: "atk", icon: "🔥", label: "火 攻",  color: "#DC143C", max: 60  },
                    { key: "def", icon: "🪨", label: "土 防",  color: "#CD853F", max: 50  },
                    { key: "spd", icon: "⚡", label: "金 速",  color: "#C9A227", max: 30  },
                    { key: "mp",  icon: "💧", label: "水 MP",  color: "#00CED1", max: 150 },
                  ].map(({ key, icon, label, color, max }) => {
                    const val = (natalStats as Record<string, number>)[key] ?? 0;
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-sm w-5 text-center">{icon}</span>
                        <span className="text-[11px] text-slate-500 w-12">{label}</span>
                        <div className="flex-1 h-2 bg-slate-800/80 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${Math.min(100,(val/max)*100)}%`, background: color }} />
                        </div>
                        <span className="text-[11px] font-bold tabular-nums w-8 text-right" style={{ color }}>{val}</span>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-slate-600 text-xs text-center py-3">請先完成八字分析</p>}
              <div className="pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <p className="text-[10px] text-slate-600 mb-1.5">加成來源</p>
                <div className="space-y-1 text-[10px] text-slate-600">
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
// 浮動事件日誌
// ─────────────────────────────────────────────────────────────
function FloatingLog({
  events, logTab, setLogTab, triggerTick,
}: {
  events: Array<{ id: number; eventType: string; message: string; createdAt: string; detail?: Record<string, unknown> | null }> | undefined;
  logTab: "all" | "combat" | "rogue";
  setLogTab: (t: "all" | "combat" | "rogue") => void;
  triggerTick: { mutate: () => void; isPending: boolean };
}) {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [events, open]);

  const unread = events?.length ?? 0;

  return (
    <>
      {/* 浮動按鈕 */}
      <div className="absolute bottom-4 left-4 z-20">
        <button onClick={() => setOpen(v => !v)}
          className="w-13 h-13 rounded-2xl flex items-center justify-center text-xl shadow-xl transition-all hover:scale-110 relative"
          style={{
            width: 52, height: 52,
            background: open ? "rgba(245,158,11,0.2)" : "rgba(8,12,25,0.92)",
            border: `1px solid ${open ? "rgba(245,158,11,0.5)" : "rgba(255,255,255,0.12)"}`,
            backdropFilter: "blur(12px)",
          }}>
          💬
          {unread > 0 && !open && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
              style={{ background: "#ef4444", color: "#fff" }}>
              {Math.min(99, unread)}
            </span>
          )}
        </button>
      </div>

      {/* 展開面板 */}
      {open && (
        <div className="absolute bottom-20 left-4 right-4 rounded-2xl border overflow-hidden z-20"
          style={{
            background: "rgba(6,10,22,0.97)",
            borderColor: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(16px)",
            maxHeight: "56vh",
          }}>
          {/* 標題列 */}
          <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2">
              <span className="text-sm">📜</span>
              <span className="text-sm font-bold text-slate-200">冒險日誌</span>
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            </div>
            <div className="flex items-center gap-1">
              {(["all", "combat", "rogue"] as const).map(tab => (
                <button key={tab} onClick={() => setLogTab(tab)}
                  className="px-2.5 py-1 rounded-lg text-[10px] transition-all"
                  style={{ background: logTab === tab ? "rgba(245,158,11,0.15)" : "transparent", color: logTab === tab ? "#f59e0b" : "rgba(148,163,184,0.5)" }}>
                  {tab === "all" ? "全部" : tab === "combat" ? "戰鬥" : "奇遇"}
                </button>
              ))}
              <button onClick={() => setOpen(false)} className="ml-1 text-slate-600 hover:text-slate-400 text-sm px-1">✕</button>
            </div>
          </div>
          {/* 列表 */}
          <div ref={listRef} className="overflow-y-auto px-4 py-3 space-y-1.5 font-mono" style={{ maxHeight: "calc(56vh - 58px)" }}>
            {(!events || events.length === 0) ? (
              <div className="text-center py-6">
                <p className="text-slate-600 text-sm">等待旅人的第一個事件…</p>
                <p className="text-slate-700 text-xs mt-1">Tick 引擎每 5 分鐘自動觸發</p>
                <button onClick={() => triggerTick.mutate()}
                  className="mt-3 px-4 py-2 rounded-xl text-xs border transition-all hover:scale-105"
                  style={{ background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.25)", color: "#f59e0b" }}>
                  立即觸發 Tick
                </button>
              </div>
            ) : [...events].reverse().map(ev => {
              const detail = ev.detail;
              const hasCombat = Boolean(detail?.phase === "result" && detail?.rounds);
              const isExp = expandedId === ev.id;
              return (
                <div key={ev.id} className="flex flex-col gap-0.5 text-xs leading-relaxed">
                  <div className="flex gap-2 cursor-pointer py-0.5"
                    onClick={() => hasCombat && setExpandedId(isExp ? null : ev.id)}>
                    <span className="text-slate-700 shrink-0 tabular-nums text-[9px] pt-0.5">
                      {new Date(ev.createdAt).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="shrink-0 text-[11px]">{EV_ICON[ev.eventType] ?? "•"}</span>
                    <span className="flex-1" style={{ color: EV_COLOR[ev.eventType] ?? "rgba(148,163,184,0.85)" }}>{ev.message}</span>
                    {hasCombat && <span className="text-slate-600 text-[9px] shrink-0">{isExp ? "▲" : "▼"}</span>}
                  </div>
                  {isExp && hasCombat && detail && (
                    <div className="ml-8 pl-2 border-l border-slate-700 text-[10px] text-slate-500 space-y-0.5">
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
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// 主頁面
// ─────────────────────────────────────────────────────────────
export default function VirtualWorldPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [showNaming, setShowNaming] = useState(false);
  const [logTab, setLogTab] = useState<"all" | "combat" | "rogue">("all");
  const [showNodeList, setShowNodeList] = useState(false);
  const utils = trpc.useUtils();

  // ── 查詢 ──────────────────────────────────────────────────
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

  // ── Mutations ──────────────────────────────────────────────
  const setStrategy = trpc.gameWorld.setStrategy.useMutation({ onSuccess: () => utils.gameWorld.getAgentStatus.invalidate() });
  const divineHeal  = trpc.gameWorld.divineHeal.useMutation({ onSuccess: () => { refetchStatus(); refetchLog(); } });
  const triggerTick = trpc.gameWorld.triggerTick.useMutation({ onSuccess: () => { refetchStatus(); refetchLog(); } });

  // ── 命名檢查 ───────────────────────────────────────────────
  useEffect(() => { if (agentData?.needsNaming) setShowNaming(true); }, [agentData?.needsNaming]);

  // ── 資料解析 ───────────────────────────────────────────────
  const agent = (statusData?.agent ?? agentData?.agent) as AgentData | null | undefined;
  const currentNode = statusData?.currentNode as { name?: string; county?: string; element?: string } | undefined;
  const staminaInfo = statusData?.staminaInfo as { current?: number; max?: number; nextRegenMin?: number } | undefined;
  const natalStats = equippedData?.natalStats as { hp?: number; atk?: number; def?: number; spd?: number; mp?: number } | undefined;
  const mapNodeList = useMemo(() => (mapNodes ?? []) as MapNode[], [mapNodes]);
  const currentNodeId = agent?.currentNodeId ?? "taipei-zhongzheng";

  const agentElement = agent?.dominantElement ?? equippedData?.dayMasterElementEn ?? "metal";
  const ec = WX_HEX[agentElement] ?? "#C9A227";

  const todayStem = dailyData?.dayPillar?.stem ?? "甲";
  const todayBranch = dailyData?.dayPillar?.branch ?? "子";
  const todayElement = dailyData?.dayPillar?.stemElement ?? "木";
  const todayElementEn = ({"木":"wood","火":"fire","土":"earth","金":"metal","水":"water"} as Record<string,string>)[todayElement] ?? "wood";
  const todayColor = WX_HEX[todayElementEn] ?? "#2E8B57";

  // ── 未登入 ─────────────────────────────────────────────────
  if (!user) {
    return (
      <GameTabLayout activeTab="world">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
          <div className="text-6xl">🌏</div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-amber-400 mb-2">靈相虛界</h2>
            <p className="text-slate-400 text-sm">登入後開始你的虛界旅程</p>
          </div>
          <a href={getLoginUrl()}
            className="px-8 py-3 rounded-xl font-bold text-black text-sm transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)" }}>
            登入開始
          </a>
        </div>
      </GameTabLayout>
    );
  }

  return (
    <GameTabLayout activeTab="world">
      {/* 命名對話框 */}
      {showNaming && (
        <NamingDialog onNamed={() => {
          setShowNaming(false);
          utils.gameWorld.getOrCreateAgent.invalidate();
          utils.gameWorld.getAgentStatus.invalidate();
        }} />
      )}

      {/* ── 頂部標題列 ─────────────────────────────────────── */}
      <div className="px-4 py-3 flex items-center justify-between sticky top-0 z-10"
        style={{ background: "rgba(8,12,25,0.93)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-2">
          <span className="text-xl">🌏</span>
          <div>
            <h1 className="text-base font-bold tracking-widest leading-none"
              style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              靈相虛界
            </h1>
            <p className="text-slate-600 text-[9px] tracking-widest">VIRTUAL WORLD · ORACLE RESONANCE</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-medium"
            style={{ borderColor: `${todayColor}40`, background: `${todayColor}10`, color: todayColor }}>
            <span className="font-bold">{todayStem}{todayBranch}</span>
            <span className="opacity-60">({todayElement}旺)</span>
          </div>
          <div className="px-2 py-1 rounded-full border text-[10px] font-bold"
            style={{ borderColor: `${ec}40`, background: `${ec}10`, color: ec }}>
            {WX_ZH[agentElement] ?? "金"}命
          </div>
        </div>
      </div>

      {/* ── 桌機：左右分欄 / 手機：上下 ─────────────────────── */}
      <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-4 lg:px-4 lg:py-4 lg:items-start">

        {/* ── 地圖區 ─────────────────────────────────────────── */}
        <div>
          {/* 位置標題 */}
          <div className="px-4 py-2.5 flex items-center justify-between lg:rounded-t-2xl"
            style={{ background: "rgba(255,255,255,0.025)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2">
              <span className="text-sm">📍</span>
              <span className="text-sm font-bold text-slate-200">{currentNode?.name ?? "中正廣場"}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: `${ec}15`, color: ec }}>
                {currentNode?.county ?? "台北市"}
              </span>
              <span className="text-[10px] text-slate-600">{mapNodeList.length} 個節點</span>
            </div>
            <button onClick={() => setShowNodeList(v => !v)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-all hover:scale-110"
              style={{
                background: showNodeList ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${showNodeList ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.08)"}`,
                color: showNodeList ? "#f59e0b" : "#94a3b8",
              }}>
              ⊞
            </button>
          </div>

          {/* 地圖 + 浮動日誌 */}
          <div className="relative">
            {agentLoading ? (
              <div className="flex items-center justify-center" style={{ height: 300, background: "rgba(8,12,25,0.95)" }}>
                <p className="text-slate-600 text-sm animate-pulse">載入地圖中…</p>
              </div>
            ) : (
              <TaiwanMap nodes={mapNodeList} currentNodeId={currentNodeId} />
            )}
            <FloatingLog
              events={eventLog as Array<{ id: number; eventType: string; message: string; createdAt: string; detail?: Record<string, unknown> | null }> | undefined}
              logTab={logTab}
              setLogTab={setLogTab}
              triggerTick={triggerTick}
            />
          </div>

          {/* 節點清單（展開） */}
          {showNodeList && (
            <div style={{ background: "rgba(6,10,22,0.97)", borderTop: "1px solid rgba(255,255,255,0.06)", maxHeight: 220, overflowY: "auto" }}>
              <div className="grid grid-cols-2">
                {mapNodeList.map(node => {
                  const c = WX_HEX[node.element] ?? "#888";
                  const isCur = node.id === currentNodeId;
                  return (
                    <div key={node.id} className="px-3 py-2 flex items-center gap-2 border-b border-r"
                      style={{ borderColor: "rgba(255,255,255,0.04)", background: isCur ? `${c}10` : "transparent" }}>
                      <span style={{ color: c }} className="text-xs shrink-0">{WX_EMOJI[node.element]}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-slate-300 truncate">{node.name}</p>
                        <p className="text-[9px] text-slate-600 truncate">{node.county}</p>
                      </div>
                      {isCur && <span className="text-[9px] text-amber-400 shrink-0">◀</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── 角色面板（手機下方，桌機右欄） ──────────────── */}
        <div className="px-4 py-4 lg:px-0 lg:py-0 space-y-3">
          <CharacterPanel
            agent={agent}
            staminaInfo={staminaInfo}
            natalStats={natalStats}
            equippedData={equippedData as { userGender?: string; dayMasterElementEn?: string; equipped?: Record<string, { name: string; quality?: string } | null> } | null | undefined}
            balanceData={balanceData as { gameCoins?: number; gameStones?: number } | null | undefined}
            dailyData={dailyData as { dayPillar?: { stem?: string; branch?: string; stemElement?: string } } | null | undefined}
            triggerTick={triggerTick}
            divineHeal={divineHeal}
            setStrategy={setStrategy}
          />

          {/* 快速入口 */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => navigate("/game/profile")}
              className="flex items-center gap-2.5 px-4 py-3.5 rounded-xl border transition-all hover:scale-[1.02]"
              style={{ background: "rgba(155,89,182,0.08)", borderColor: "rgba(155,89,182,0.25)" }}>
              <span className="text-xl">👤</span>
              <span className="text-sm text-slate-300 font-medium">靈相空間</span>
            </button>
            <button onClick={() => navigate("/game/shop")}
              className="flex items-center gap-2.5 px-4 py-3.5 rounded-xl border transition-all hover:scale-[1.02]"
              style={{ background: "rgba(0,206,209,0.08)", borderColor: "rgba(0,206,209,0.25)" }}>
              <span className="text-xl">🛒</span>
              <span className="text-sm text-slate-300 font-medium">天命商城</span>
            </button>
          </div>
        </div>
      </div>
    </GameTabLayout>
  );
}
