/**
 * VirtualWorldPage.tsx
 * 靈相虛界主畫面 — 放置型文字冒險遊戲
 * V11.14：整合真實 Tick 引擎、台灣地圖視覺化、首次命名對話框、詳細戰鬥日誌
 */
import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import GameTabLayout from "@/components/GameTabLayout";

// ─── 五行配色 ─────────────────────────────────────────────────
const WUXING_HEX: Record<string, string> = {
  wood:  "#2E8B57",
  fire:  "#DC143C",
  earth: "#CD853F",
  metal: "#C9A227",
  water: "#00CED1",
};
const WUXING_ZH: Record<string, string> = {
  wood: "木", fire: "火", earth: "土", metal: "金", water: "水",
};
const WUXING_EMOJI: Record<string, string> = {
  wood: "🌿", fire: "🔥", earth: "🪨", metal: "⚡", water: "💧",
};

// ─── 策略選項 ─────────────────────────────────────────────────
const STRATEGIES = [
  { id: "explore" as const, icon: "🗺️", label: "探索", desc: "前往未知節點" },
  { id: "combat"  as const, icon: "⚔️", label: "戰鬥", desc: "在當前區域戰鬥" },
  { id: "gather"  as const, icon: "🌿", label: "採集", desc: "收集材料道具" },
  { id: "rest"    as const, icon: "😴", label: "休息", desc: "恢復 HP / MP" },
];

// ─── 事件類型顏色 ─────────────────────────────────────────────
const EVENT_COLOR: Record<string, string> = {
  combat:  "#ef4444",
  move:    "#60a5fa",
  gather:  "#34d399",
  rest:    "#a78bfa",
  rogue:   "#f59e0b",
  system:  "#e2e8f0",
};

const EVENT_ICON: Record<string, string> = {
  combat:  "⚔️",
  move:    "🚶",
  gather:  "🌿",
  rest:    "😴",
  rogue:   "🎲",
  system:  "✨",
};

// ─── 命名對話框 ───────────────────────────────────────────────
function NamingDialog({ onNamed }: { onNamed: (name: string) => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const nameAgent = trpc.gameWorld.nameAgent.useMutation({
    onSuccess: (data) => {
      onNamed(data.name);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) { setError("請輸入旅人名稱"); return; }
    if (trimmed.length < 1 || trimmed.length > 12) { setError("名稱長度需在 1-12 字之間"); return; }
    setError("");
    nameAgent.mutate({ name: trimmed });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
        style={{
          background: "linear-gradient(135deg, #0f1a2e 0%, #1a2a3a 100%)",
          border: "1px solid rgba(245,158,11,0.3)",
          boxShadow: "0 0 40px rgba(245,158,11,0.15)",
        }}
      >
        {/* 標題 */}
        <div className="text-center">
          <div className="text-4xl mb-3">✨</div>
          <h2
            className="text-xl font-bold tracking-widest mb-1"
            style={{
              background: "linear-gradient(135deg, #f59e0b, #ef4444)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            命格旅人誕生
          </h2>
          <p className="text-slate-400 text-sm">
            你的命格旅人即將踏上台灣大地的冒險旅程
          </p>
          <p className="text-slate-500 text-xs mt-1">
            請為你的旅人取一個名字（1-12 字）
          </p>
        </div>

        {/* 輸入框 */}
        <div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="旅人名稱…"
            maxLength={12}
            className="w-full px-4 py-3 rounded-xl text-center text-lg font-bold tracking-widest outline-none"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(245,158,11,0.3)",
              color: "#f59e0b",
            }}
          />
          {error && (
            <p className="text-red-400 text-xs text-center mt-2">{error}</p>
          )}
          <p className="text-slate-600 text-[10px] text-center mt-1">
            {name.length}/12 字 · 命名後無法更改
          </p>
        </div>

        {/* 確認按鈕 */}
        <button
          onClick={handleSubmit}
          disabled={nameAgent.isPending || !name.trim()}
          className="w-full py-3 rounded-xl font-bold text-sm tracking-widest transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg, #f59e0b, #ef4444)",
            color: "#000",
          }}
        >
          {nameAgent.isPending ? "命名中…" : "確認命名，踏上旅途"}
        </button>

        <p className="text-slate-600 text-[10px] text-center">
          旅人的命格屬性由你的八字命盤自動計算
        </p>
      </div>
    </div>
  );
}

// ─── 台灣地圖視覺化 ───────────────────────────────────────────
interface MapNodeData {
  id: string;
  name: string;
  element: string;
  x: number;
  y: number;
  dangerLevel: number;
  county: string;
}

function TaiwanMap({
  nodes,
  currentNodeId,
  onNodeClick,
}: {
  nodes: MapNodeData[];
  currentNodeId: string;
  onNodeClick?: (nodeId: string) => void;
}) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden"
      style={{
        background: "rgba(0,0,0,0.3)",
        border: "1px solid rgba(255,255,255,0.06)",
        aspectRatio: "0.55",
        maxHeight: "340px",
      }}
    >
      <svg
        viewBox="0 0 100 180"
        className="w-full h-full"
        style={{ overflow: "visible" }}
      >
        {/* 台灣輪廓背景 */}
        <ellipse cx="50" cy="90" rx="28" ry="80" fill="rgba(30,50,30,0.3)" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />

        {/* 連線 */}
        {nodes.map((node) => {
          const nodeData = nodes.find(n => n.id === node.id);
          if (!nodeData) return null;
          return null; // 連線太複雜，暫時省略
        })}

        {/* 節點 */}
        {nodes.map((node) => {
          const isCurrent = node.id === currentNodeId;
          const isHovered = node.id === hoveredNode;
          const color = WUXING_HEX[node.element] ?? "#888";
          const r = isCurrent ? 3.5 : (isHovered ? 2.5 : 1.8);

          return (
            <g key={node.id}>
              {/* 光暈（當前位置） */}
              {isCurrent && (
                <circle
                  cx={node.x}
                  cy={node.y * 1.8}
                  r={6}
                  fill="none"
                  stroke={color}
                  strokeWidth="0.5"
                  opacity="0.4"
                  style={{ animation: "pulse 2s infinite" }}
                />
              )}
              {/* 節點圓點 */}
              <circle
                cx={node.x}
                cy={node.y * 1.8}
                r={r}
                fill={isCurrent ? color : `${color}80`}
                stroke={isCurrent ? "#fff" : color}
                strokeWidth={isCurrent ? "0.8" : "0.3"}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => onNodeClick?.(node.id)}
              />
              {/* 當前位置標籤 */}
              {isCurrent && (
                <text
                  x={node.x}
                  y={node.y * 1.8 - 5}
                  textAnchor="middle"
                  fontSize="3.5"
                  fill="#fff"
                  fontWeight="bold"
                >
                  {node.name.slice(0, 4)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Hover 提示 */}
      {hoveredNode && (() => {
        const n = nodes.find(n => n.id === hoveredNode);
        if (!n) return null;
        return (
          <div
            className="absolute bottom-2 left-2 right-2 px-2 py-1.5 rounded-lg text-xs"
            style={{
              background: "rgba(0,0,0,0.8)",
              border: `1px solid ${WUXING_HEX[n.element]}40`,
              color: WUXING_HEX[n.element],
            }}
          >
            <span className="font-bold">{n.name}</span>
            <span className="text-slate-400 ml-1">· {n.county}</span>
            <span className="ml-1">{WUXING_EMOJI[n.element]}</span>
          </div>
        );
      })()}
    </div>
  );
}

// ─── 戰鬥日誌詳情 ─────────────────────────────────────────────
function CombatDetail({ detail }: { detail: Record<string, unknown> }) {
  const rounds = (detail.rounds as Array<{
    round: number;
    agentAtk: number;
    monsterAtk: number;
    agentHpAfter: number;
    monsterHpAfter: number;
  }>) ?? [];

  return (
    <div className="mt-2 space-y-1 pl-4 border-l-2 border-red-500/20">
      {rounds.map((r) => (
        <div key={r.round} className="text-[9px] text-slate-500 font-mono">
          <span className="text-slate-600">第{r.round}回合</span>
          <span className="text-green-400 ml-2">你→{r.agentAtk}</span>
          <span className="text-red-400 ml-1">敵→{r.monsterAtk}</span>
          <span className="text-slate-500 ml-1">
            HP:{r.agentHpAfter} / 敵HP:{r.monsterHpAfter}
          </span>
        </div>
      ))}
      {typeof detail.elementMultiplier === 'number' && detail.elementMultiplier !== 1 && (
        <div className="text-[9px] text-amber-400">
          五行加成 ×{detail.elementMultiplier.toFixed(1)}
        </div>
      )}
    </div>
  );
}

// ─── 主組件 ───────────────────────────────────────────────────
export default function VirtualWorldPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [showNaming, setShowNaming] = useState(false);
  const [logTab, setLogTab] = useState<"all" | "combat" | "rogue">("all");
  const [expandedEventId, setExpandedEventId] = useState<number | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  // ── tRPC 查詢 ──────────────────────────────────────────────
  const { data: agentData, isLoading: agentLoading } = trpc.gameWorld.getOrCreateAgent.useQuery(
    undefined,
    { enabled: !!user, refetchInterval: 30000 }
  );

  const { data: statusData, refetch: refetchStatus } = trpc.gameWorld.getAgentStatus.useQuery(
    undefined,
    { enabled: !!user && !agentData?.needsNaming, refetchInterval: 30000 }
  );

  const { data: eventLog, refetch: refetchLog } = trpc.gameWorld.getEventLog.useQuery(
    { limit: 50, eventType: logTab === "all" ? undefined : logTab === "combat" ? "combat" : "rogue" },
    { enabled: !!user && !agentData?.needsNaming, refetchInterval: 30000 }
  );

  const { data: mapNodes } = trpc.gameWorld.getMapNodes.useQuery(undefined, {
    staleTime: Infinity,
  });

  const { data: equippedData } = trpc.gameAvatar.getEquipped.useQuery(undefined, {
    enabled: !!user,
    staleTime: 60000,
  });

  const { data: balanceData } = trpc.gameShop.getBalance.useQuery(undefined, {
    enabled: !!user,
    staleTime: 30000,
  });

  const { data: dailyData } = trpc.oracle.dailyEnergy.useQuery(undefined, {
    enabled: !!user,
    staleTime: 300000,
  });

  // ── Mutations ──────────────────────────────────────────────
  const setStrategy = trpc.gameWorld.setStrategy.useMutation({
    onSuccess: () => {
      utils.gameWorld.getAgentStatus.invalidate();
    },
  });

  const divineHeal = trpc.gameWorld.divineHeal.useMutation({
    onSuccess: () => {
      refetchStatus();
      refetchLog();
    },
  });

  const triggerTick = trpc.gameWorld.triggerTick.useMutation({
    onSuccess: () => {
      refetchStatus();
      refetchLog();
    },
  });

  // ── 命名檢查 ───────────────────────────────────────────────
  useEffect(() => {
    if (agentData?.needsNaming) {
      setShowNaming(true);
    }
  }, [agentData?.needsNaming]);

  // ── 自動滾動 ───────────────────────────────────────────────
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [eventLog]);

  // ── 資料解析 ───────────────────────────────────────────────
  const agent = statusData?.agent ?? agentData?.agent;
  const currentNode = statusData?.currentNode;
  const staminaInfo = statusData?.staminaInfo;

  const natalStats = equippedData?.natalStats;
  const userGender = equippedData?.userGender ?? "female";
  const dayMasterEn = equippedData?.dayMasterElementEn ?? "metal";
  const elementColor = WUXING_HEX[dayMasterEn] ?? "#C9A227";
  const elementZh = WUXING_ZH[dayMasterEn] ?? "金";

  const gameCoins = balanceData?.gameCoins ?? 0;
  const gameStones = balanceData?.gameStones ?? 0;

  const todayStem = dailyData?.dayPillar?.stem ?? "甲";
  const todayBranch = dailyData?.dayPillar?.branch ?? "子";
  const todayElement = dailyData?.dayPillar?.stemElement ?? "木";
  const todayElementEn = ({"木":"wood","火":"fire","土":"earth","金":"metal","水":"water"} as Record<string,string>)[todayElement] ?? "wood";
  const todayColor = WUXING_HEX[todayElementEn] ?? "#2E8B57";

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
  const agentElement = agent?.dominantElement ?? "wood";

  // 地圖節點資料
  const mapNodeList = useMemo(() => mapNodes ?? [], [mapNodes]);

  // ── 未登入 ─────────────────────────────────────────────────
  if (!user) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-6 px-4"
        style={{ background: "radial-gradient(ellipse at 50% 30%, #1a2a3a 0%, #050d14 70%)" }}
      >
        <div className="text-6xl">🌏</div>
        <h1 className="text-2xl font-bold text-amber-300 tracking-widest">靈相虛界</h1>
        <p className="text-slate-400 text-sm text-center max-w-xs">
          登入後即可派遣你的命格旅人，踏上台灣大地的放置冒險之旅
        </p>
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

  return (
    <GameTabLayout activeTab="world">
      {/* ── 首次命名對話框 ─────────────────────────────────── */}
      {showNaming && (
        <NamingDialog
          onNamed={(name) => {
            setShowNaming(false);
            utils.gameWorld.getOrCreateAgent.invalidate();
            utils.gameWorld.getAgentStatus.invalidate();
          }}
        />
      )}

      {/* ── 頂部標題列 ─────────────────────────────────────── */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🌏</span>
            <h1
              className="text-lg font-bold tracking-widest"
              style={{
                background: "linear-gradient(135deg, #f59e0b, #ef4444)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              靈相虛界
            </h1>
          </div>
          <p className="text-slate-500 text-[10px] tracking-widest pl-7">VIRTUAL WORLD · ORACLE RESONANCE</p>
        </div>
        {/* 今日流日 + 手動 Tick 按鈕 */}
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-medium"
            style={{ borderColor: `${todayColor}40`, background: `${todayColor}10`, color: todayColor }}
          >
            <span className="font-bold">{todayStem}{todayBranch}</span>
            <span className="opacity-60">({todayElement}旺)</span>
          </div>
          <button
            onClick={() => triggerTick.mutate()}
            disabled={triggerTick.isPending}
            className="px-2 py-1.5 rounded-lg text-[10px] border transition-all hover:scale-105"
            style={{
              background: "rgba(245,158,11,0.08)",
              borderColor: "rgba(245,158,11,0.25)",
              color: "#f59e0b",
            }}
            title="手動觸發 Tick（測試用）"
          >
            {triggerTick.isPending ? "⏳" : "▶ Tick"}
          </button>
        </div>
      </div>

      {/* ── 主體：三欄佈局 ─────────────────────────────────── */}
      <div className="px-4 pb-4 grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── 左欄：旅人狀態面板 ─────────────────────────── */}
        <div
          className="rounded-2xl p-4 border flex flex-col gap-3"
          style={{
            background: "rgba(255,255,255,0.03)",
            borderColor: `${WUXING_HEX[agentElement] ?? elementColor}30`,
            boxShadow: `0 0 20px ${WUXING_HEX[agentElement] ?? elementColor}10`,
          }}
        >
          {/* 旅人名稱 + 等級 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-200 font-bold text-sm">{agentName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{
                    background: `${WUXING_HEX[agentElement] ?? elementColor}25`,
                    color: WUXING_HEX[agentElement] ?? elementColor,
                  }}
                >
                  {WUXING_ZH[agentElement] ?? elementZh}命
                </span>
                <span className="text-[10px] text-slate-500">Lv.{agentLevel}</span>
                <span
                  className="text-[9px] px-1 py-0.5 rounded"
                  style={{
                    background: agentStatus === "idle" ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)",
                    color: agentStatus === "idle" ? "#22c55e" : "#f59e0b",
                  }}
                >
                  {agentStatus === "idle" ? "待機" : agentStatus === "moving" ? "移動中" : agentStatus === "resting" ? "休息中" : agentStatus}
                </span>
              </div>
            </div>
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl border"
              style={{
                background: `radial-gradient(circle, ${WUXING_HEX[agentElement] ?? elementColor}20, transparent)`,
                borderColor: `${WUXING_HEX[agentElement] ?? elementColor}40`,
              }}
            >
              {userGender === "male" ? "🧙" : "🧝"}
            </div>
          </div>

          {/* 位置 */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>📍</span>
            <span>{currentNode?.name ?? "中正紀念堂廣場"}</span>
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
              {currentNode?.county ?? "台北市"}
            </span>
          </div>

          {/* HP / MP / 體力條 */}
          <div className="space-y-2">
            <StatBar label="HP" value={agentHp} max={agentMaxHp} color="#ef4444" icon="❤️" />
            <StatBar label="MP" value={agentMp} max={agentMaxMp} color="#60a5fa" icon="💧" />
            <StatBar label="活躍" value={agentStamina} max={agentMaxStamina} color="#f59e0b" icon="⚡" />
          </div>
          {staminaInfo && agentStamina < agentMaxStamina && (
            <p className="text-[9px] text-slate-600 text-right">
              下次恢復：{staminaInfo.nextRegenMin} 分鐘後
            </p>
          )}

          {/* 五行能力值 */}
          <div className="border-t pt-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <p className="text-[10px] text-slate-500 mb-2 tracking-widest">命格能力值</p>
            <div className="space-y-1.5">
              <MiniStat icon="🌿" label="木 HP"  value={natalStats?.hp ?? agentMaxHp}  max={300} color="#2E8B57" />
              <MiniStat icon="🔥" label="火 攻"  value={natalStats?.atk ?? agent?.attack ?? 10} max={60} color="#DC143C" />
              <MiniStat icon="🪨" label="土 防"  value={natalStats?.def ?? agent?.defense ?? 8} max={50} color="#CD853F" />
              <MiniStat icon="⚡" label="金 速"  value={natalStats?.spd ?? agent?.speed ?? 8} max={30} color="#C9A227" />
              <MiniStat icon="💧" label="水 MP"  value={natalStats?.mp ?? agentMaxMp}  max={150} color="#00CED1" />
            </div>
          </div>

          {/* 裝備欄（GD-018 核心展示） */}
          <div className="border-t pt-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <p className="text-[10px] text-slate-500 mb-2 tracking-widest">裝備欄位</p>
            <div className="grid grid-cols-4 gap-1">
              {["武器", "頭盔", "護甲", "鞋子", "副手", "戒指", "戒指", "手套"].map((slot, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-lg flex flex-col items-center justify-center text-center"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <span className="text-[8px] text-slate-600">{slot}</span>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-slate-600 mt-1 text-center">裝備系統開發中</p>
          </div>

          {/* 貨幣 */}
          <div className="border-t pt-3 flex gap-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-1.5 text-xs">
              <span>🪙</span>
              <span className="text-amber-300 font-bold">{agentGold.toLocaleString()}</span>
              <span className="text-slate-500">金幣</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span>💎</span>
              <span className="text-cyan-300 font-bold">{gameStones}</span>
              <span className="text-slate-500">靈石</span>
            </div>
          </div>
        </div>

        {/* ── 中欄：冒險事件日誌 + 台灣地圖 ─────────────── */}
        <div className="flex flex-col gap-4">
          {/* 台灣地圖 */}
          <div
            className="rounded-2xl p-3 border"
            style={{
              background: "rgba(0,0,0,0.3)",
              borderColor: "rgba(255,255,255,0.07)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-slate-500 tracking-widest">台灣地圖 · {mapNodeList.length} 個節點</p>
              {currentNode && (
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded-full"
                  style={{
                    background: `${WUXING_HEX[currentNode.element] ?? "#888"}20`,
                    color: WUXING_HEX[currentNode.element] ?? "#888",
                  }}
                >
                  {WUXING_EMOJI[currentNode.element]} {currentNode.element}
                </span>
              )}
            </div>
            <TaiwanMap
              nodes={mapNodeList}
              currentNodeId={agent?.currentNodeId ?? "taipei-zhongzheng"}
            />
          </div>

          {/* 事件日誌 */}
          <div
            className="rounded-2xl border flex flex-col"
            style={{
              background: "rgba(255,255,255,0.02)",
              borderColor: "rgba(255,255,255,0.07)",
              minHeight: "280px",
            }}
          >
            {/* 標題 + Tab */}
            <div
              className="px-4 py-3 border-b flex items-center justify-between"
              style={{ borderColor: "rgba(255,255,255,0.06)" }}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">📜</span>
                <span className="text-sm font-bold text-slate-200">冒險日誌</span>
              </div>
              <div className="flex items-center gap-1">
                {(["all", "combat", "rogue"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setLogTab(tab)}
                    className="px-2 py-0.5 rounded text-[10px] transition-all"
                    style={{
                      background: logTab === tab ? "rgba(245,158,11,0.15)" : "transparent",
                      color: logTab === tab ? "#f59e0b" : "rgba(148,163,184,0.6)",
                    }}
                  >
                    {tab === "all" ? "全部" : tab === "combat" ? "戰鬥" : "奇遇"}
                  </button>
                ))}
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse ml-1" />
              </div>
            </div>

            {/* 日誌列表 */}
            <div
              ref={logRef}
              className="flex-1 overflow-y-auto px-4 py-3 space-y-2 font-mono"
              style={{ maxHeight: "300px" }}
            >
              {(!eventLog || eventLog.length === 0) ? (
                <div className="text-center py-8">
                  <p className="text-slate-600 text-sm">等待旅人的第一個事件…</p>
                  <p className="text-slate-700 text-xs mt-1">Tick 引擎每 5 分鐘自動觸發</p>
                  <button
                    onClick={() => triggerTick.mutate()}
                    className="mt-3 px-4 py-1.5 rounded-lg text-xs border transition-all hover:scale-105"
                    style={{
                      background: "rgba(245,158,11,0.08)",
                      borderColor: "rgba(245,158,11,0.25)",
                      color: "#f59e0b",
                    }}
                  >
                    立即觸發 Tick
                  </button>
                </div>
              ) : (
                [...eventLog].reverse().map((event) => {
                  const detail = event.detail as Record<string, unknown> | null;
                  const hasCombatDetail = detail?.phase === "result" && detail?.rounds;
                  const isExpanded = expandedEventId === event.id;

                  return (
                    <div
                      key={event.id}
                      className="flex flex-col gap-0.5 text-xs leading-relaxed"
                    >
                      <div
                        className="flex gap-2 cursor-pointer"
                        onClick={() => hasCombatDetail && setExpandedEventId(isExpanded ? null : event.id)}
                      >
                        <span className="text-slate-600 shrink-0 tabular-nums text-[9px]">
                          {new Date(event.createdAt).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                        <span className="shrink-0">{EVENT_ICON[event.eventType] ?? "•"}</span>
                        <span
                          style={{
                            color: EVENT_COLOR[event.eventType] ?? "rgba(148,163,184,0.85)",
                          }}
                        >
                          {event.message}
                        </span>
                        {hasCombatDetail ? (
                          <span className="text-slate-600 text-[9px] shrink-0 ml-auto">
                            {isExpanded ? "▲" : "▼"}
                          </span>
                        ) : null}
                      </div>
                      {/* 戰鬥詳情展開 */}
                      {isExpanded && hasCombatDetail && detail ? (
                        <CombatDetail detail={detail} />
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── 右欄：神明策略台 ─────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {/* 策略切換 */}
          <div
            className="rounded-2xl p-4 border"
            style={{
              background: "rgba(255,255,255,0.03)",
              borderColor: "rgba(255,255,255,0.07)",
            }}
          >
            <p className="text-[10px] text-slate-500 mb-3 tracking-widest">神明策略台</p>
            <div className="grid grid-cols-2 gap-2">
              {STRATEGIES.map((s) => (
                <button
                  key={s.id}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl border transition-all text-center"
                  onClick={() => setStrategy.mutate({ strategy: s.id })}
                  style={{
                    background: agentStrategy === s.id
                      ? "rgba(245,158,11,0.12)"
                      : "rgba(255,255,255,0.02)",
                    borderColor: agentStrategy === s.id
                      ? "rgba(245,158,11,0.4)"
                      : "rgba(255,255,255,0.06)",
                    boxShadow: agentStrategy === s.id
                      ? "0 0 12px rgba(245,158,11,0.15)"
                      : "none",
                  }}
                >
                  <span className="text-xl">{s.icon}</span>
                  <span
                    className="text-xs font-bold"
                    style={{ color: agentStrategy === s.id ? "#f59e0b" : "rgba(148,163,184,0.8)" }}
                  >
                    {s.label}
                  </span>
                  <span className="text-[9px] text-slate-600">{s.desc}</span>
                </button>
              ))}
            </div>
            <div
              className="mt-3 px-3 py-2 rounded-lg text-xs text-center"
              style={{ background: "rgba(245,158,11,0.08)", color: "rgba(245,158,11,0.8)" }}
            >
              🎯 目前策略：{STRATEGIES.find(s => s.id === agentStrategy)?.label ?? "探索"}
            </div>
          </div>

          {/* 神明干預 */}
          <div
            className="rounded-2xl p-4 border"
            style={{
              background: "rgba(255,255,255,0.03)",
              borderColor: "rgba(255,255,255,0.07)",
            }}
          >
            <p className="text-[10px] text-slate-500 mb-1 tracking-widest">神明干預</p>
            <p className="text-[9px] text-slate-600 mb-3">
              靈力值：{agent?.actionPoints ?? 5}/{agent?.maxActionPoints ?? 5}
            </p>
            <div className="space-y-2">
              <DivineButton
                icon="💊"
                label="神蹟治癒"
                cost={1}
                costLabel="靈力值"
                desc="恢復 50% HP"
                canAfford={(agent?.actionPoints ?? 0) >= 1}
                loading={divineHeal.isPending}
                onClick={() => divineHeal.mutate()}
              />
              <DivineButton
                icon="🌀"
                label="神蹟傳送"
                cost={2}
                costLabel="靈力值"
                desc="傳送至指定節點"
                canAfford={(agent?.actionPoints ?? 0) >= 2}
                loading={false}
                onClick={() => {}}
              />
            </div>
          </div>

          {/* 今日流日加成 */}
          <div
            className="rounded-2xl p-4 border"
            style={{
              background: `${todayColor}08`,
              borderColor: `${todayColor}25`,
            }}
          >
            <p className="text-[10px] text-slate-500 mb-2 tracking-widest">今日流日加成</p>
            <p className="text-sm font-bold mb-1" style={{ color: todayColor }}>
              {todayStem}{todayBranch}（{todayElement}旺）
            </p>
            <p className="text-xs text-slate-400">
              {todayElement}屬性怪物掉落率 +30%
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {todayElement}屬性技能傷害 +20%
            </p>
          </div>

          {/* GD-018 等級說明 */}
          <div
            className="rounded-2xl p-4 border"
            style={{
              background: "rgba(255,255,255,0.02)",
              borderColor: "rgba(255,255,255,0.06)",
            }}
          >
            <p className="text-[10px] text-slate-500 mb-2 tracking-widest">成長哲學</p>
            <div className="space-y-1.5 text-[10px] text-slate-500">
              <p>📊 等級是地圖通行證（上限 Lv.60）</p>
              <p>⚔️ 真正的強大來自裝備與技能</p>
              <p>🎲 Roguelike 奇遇提供稀有道具</p>
              <p>⚡ 體力值：{agentStamina}/{agentMaxStamina}（每 20 分 +1）</p>
            </div>
          </div>

          {/* 快速入口 */}
          <div className="grid grid-cols-2 gap-2">
            <button
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all hover:scale-105"
              onClick={() => navigate("/game/profile")}
              style={{
                background: "rgba(155,89,182,0.08)",
                borderColor: "rgba(155,89,182,0.25)",
              }}
            >
              <span className="text-xl">👤</span>
              <span className="text-xs text-slate-300">靈相空間</span>
            </button>
            <button
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all hover:scale-105"
              onClick={() => navigate("/game/shop")}
              style={{
                background: "rgba(0,206,209,0.08)",
                borderColor: "rgba(0,206,209,0.25)",
              }}
            >
              <span className="text-xl">🛒</span>
              <span className="text-xs text-slate-300">天命商城</span>
            </button>
          </div>
        </div>
      </div>
    </GameTabLayout>
  );
}

// ─── 子組件 ───────────────────────────────────────────────────

function StatBar({
  label, value, max, color, icon,
}: {
  label: string; value: number; max: number; color: string; icon: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-3">{icon}</span>
      <span className="text-[10px] text-slate-500 w-6">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-[10px] text-slate-400 tabular-nums w-14 text-right">
        {value}/{max}
      </span>
    </div>
  );
}

function MiniStat({
  icon, label, value, max, color,
}: {
  icon: string; label: string; value: number; max: number; color: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span>{icon}</span>
      <span className="text-slate-500 w-10">{label}</span>
      <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(100, (value / max) * 100)}%`,
            background: color,
          }}
        />
      </div>
      <span className="text-slate-300 font-bold tabular-nums w-8 text-right">{value}</span>
    </div>
  );
}

function DivineButton({
  icon, label, cost, costLabel, desc, canAfford, loading, onClick,
}: {
  icon: string;
  label: string;
  cost: number;
  costLabel: string;
  desc: string;
  canAfford: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left"
      onClick={onClick}
      disabled={!canAfford || loading}
      style={{
        background: canAfford ? "rgba(245,158,11,0.06)" : "rgba(255,255,255,0.02)",
        borderColor: canAfford ? "rgba(245,158,11,0.25)" : "rgba(255,255,255,0.05)",
        opacity: canAfford ? 1 : 0.5,
      }}
    >
      <span className="text-xl">{loading ? "⏳" : icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-200">{label}</p>
        <p className="text-[10px] text-slate-500">{desc}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[10px] text-cyan-400 font-bold">{cost}</span>
        <span className="text-[10px] text-slate-600">{costLabel}</span>
      </div>
    </button>
  );
}
