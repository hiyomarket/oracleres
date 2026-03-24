/**
 * VirtualWorldPage.tsx — 靈相虛界主畫面
 * V14：地圖傳送系統、密店隨機邏輯、命格稱號、日誌左下角、UI全面重構
 *      GD-002 三維五行屬性系統、GD-001 技能系統、GD-006 裝備系統
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import GameTabLayout from "@/components/GameTabLayout";
import LeafletMap from "@/components/LeafletMap";
import type { LeafletMapHandle } from "@/components/LeafletMap";
import type { MapNode } from "../../../../shared/mapNodes";
import { calcMoveCost } from "../../../../shared/mapNodes";
import { DraggableWidget } from "@/components/DraggableWidget";
import { safePlay, playLevelUpSound, playLegendarySound, playTickSound, isSoundEnabled, setSoundEnabled } from "@/hooks/useGameSound";
import { useGameWebSocket } from "@/hooks/useGameWebSocket";
import { CombatWindow } from "@/components/CombatWindow";
import type { CombatWindowData } from "@/components/CombatWindow";
import { GlobalChat } from "@/components/GlobalChat";

/// ─── 經驗升級公式（和後端 tickEngine.ts 相同） ───
function calcExpToNextFn(level: number): number {
  if (level >= 60) return 999999;
  return Math.floor(100 * Math.pow(1.4, level - 1));
}

// ─── 五行配色 ─────────────────────────────────────────────
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
  { id: "infuse"  as const, icon: "✨", label: "注靈" },
];
const QUALITY_COLOR: Record<string, string> = {
  legendary: "#f59e0b", epic: "#a78bfa", rare: "#60a5fa",
  uncommon: "#34d399", common: "#94a3b8",
};
const QUALITY_ZH: Record<string, string> = {
  legendary: "傳說", epic: "史詩", rare: "稀有", uncommon: "精良", common: "普通",
};

// GD-001 初始技能定義
const SKILL_DEFS: Record<string, { name: string; element: string; type: "active" | "passive"; desc: string; icon: string }> = {
  "wood-basic-atk":  { name: "木行拳", element: "wood",  type: "active",  desc: "木屬基礎攻擊，造成少量永久傷害", icon: "🌿" },
  "wood-heal":       { name: "春風愈傈", element: "wood",  type: "active",  desc: "治癒 20% 最大 HP，持續 2 回合", icon: "🌼" },
  "wood-regen":      { name: "根脆之力", element: "wood",  type: "passive", desc: "戰鬥後自動回血 5%", icon: "🌱" },
  "fire-basic-atk":  { name: "烈焰拳", element: "fire",  type: "active",  desc: "火屬基礎攻擊，有機率燃燒敵人", icon: "🔥" },
  "fire-burst":      { name: "爆烎衝波", element: "fire",  type: "active",  desc: "範圍火屬傷害，消耗額外 MP", icon: "💥" },
  "fire-boost":      { name: "火行催化", element: "fire",  type: "passive", desc: "攻擊力 +10%，造成火屬傷害時额外 +5%", icon: "⭐" },
  "earth-basic-atk": { name: "山岳拳", element: "earth", type: "active",  desc: "土屬基礎攻擊，有機率活動敢對方", icon: "🪨" },
  "earth-shield":    { name: "大地護盾", element: "earth", type: "active",  desc: "下一回合對對方傷害免疫 30%", icon: "🛡️" },
  "earth-tough":     { name: "山岳之體", element: "earth", type: "passive", desc: "防穡力 +15%，死亡時有機率以 1 HP 存活", icon: "💪" },
  "metal-basic-atk": { name: "利金拳", element: "metal", type: "active",  desc: "金屬基礎攻擊，穿透防穡 10%", icon: "⚡" },
  "metal-pierce":    { name: "穿雲一擊", element: "metal", type: "active",  desc: "忠实命中，造成基礎攻擊 150% 傷害", icon: "🗡️" },
  "metal-crit":      { name: "銀月洞察", element: "metal", type: "passive", desc: "有 15% 機率觸發暴擊（傷害 x2）", icon: "🎯" },
  "water-basic-atk": { name: "水流拳", element: "water", type: "active",  desc: "水屬基礎攻擊，有機率降低敵人速度", icon: "💧" },
  "water-flow":      { name: "流水貊潏", element: "water", type: "active",  desc: "回復 15% 最大 MP，下回合魔法傷害 +20%", icon: "🌊" },
  "water-sense":     { name: "流水感知", element: "water", type: "passive", desc: "尋寶力 +10，稀有材料出現率 +5%", icon: "🔮" },
};
// GD-002 三維五行屬性定義
const COMBAT_ATTRS = [
  { key: "attack",      icon: "🔥", label: "攻擊力",  wx: "fire",   desc: "物理傷害基礎值" },
  { key: "defense",     icon: "🪨", label: "防禦力",  wx: "earth",  desc: "減少受到的傷害" },
  { key: "speed",       icon: "⚡", label: "命中力",  wx: "metal",  desc: "攻擊命中率與穿透" },
  { key: "healPower",   icon: "🌿", label: "治癒力",  wx: "wood",   desc: "戰鬥中自我回血量" },
  { key: "magicAttack", icon: "💧", label: "魔法攻擊", wx: "water",  desc: "元素傷害與狀態觸發" },
];
const LIFE_ATTRS = [
  { key: "gatherPower",     icon: "🌿", label: "採集力",  wx: "wood",  desc: "植物/草藥掉落率加成" },
  { key: "forgePower",      icon: "🔥", label: "鍛冶力",  wx: "fire",  desc: "製造裝備成功率與品質" },
  { key: "carryWeight",     icon: "🪨", label: "承重力",  wx: "earth", desc: "背包格子數與可攜帶總重" },
  { key: "refinePower",     icon: "⚡", label: "精煉力",  wx: "metal", desc: "提升素材品質等級機率" },
  { key: "treasureHunting", icon: "💧", label: "尋寶力",  wx: "water", desc: "感知隱藏商店/任務/NPC" },
];

// GD-006 裝備部位
const EQUIP_SLOTS = [
  { slot: "weapon",   icon: "⚔️", label: "主武器",  desc: "攻擊力+" },
  { slot: "offhand",  icon: "🗡️", label: "副手",    desc: "防禦力+" },
  { slot: "head",     icon: "⛑️", label: "頭盔",    desc: "HP+" },
  { slot: "body",     icon: "🛡️", label: "護甲",    desc: "防禦力+" },
  { slot: "hands",    icon: "🧤", label: "手套",    desc: "命中力+" },
  { slot: "feet",     icon: "👟", label: "鞋子",    desc: "速度+" },
  { slot: "ringA",    icon: "💍", label: "戒指",    desc: "五行屬性+" },
  { slot: "ringB",    icon: "💍", label: "戒指",    desc: "五行屬性+" },
  { slot: "necklace", icon: "📿", label: "項鍊",    desc: "MP+" },
  { slot: "amulet",   icon: "🔮", label: "護符",    desc: "特殊效果" },
];

type PanelId = "combat" | "life" | "items" | "equip" | "skill" | "natal";

// ─── NodeInfoData 型別 ─────────────────────────────────────────
type NodeInfoData = {
  node?: { name?: string; county?: string; dangerLevel?: number; description?: string; monsterLevel?: [number, number] };
  monsters?: Array<{ id: string; name: string; element: string; level: number; hp: number; isBoss?: boolean; description?: string }>;
  resources?: Array<{ name: string; icon: string; rarity: string }>;
  questHints?: string[];
  adventurers?: Array<{ name: string; element: string; level: number; hp: number; maxHp: number; status: string }>;
};

// ─── StatBar ──────────────────────────────────────────────────
function StatBar({ icon, label, value, max, color }: { icon: string; label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm w-5 text-center shrink-0">{icon}</span>
      <span className="text-xs text-slate-500 w-6 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-slate-800/80 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}60` }} />
      </div>
      <span className="text-xs font-bold tabular-nums shrink-0" style={{ color, minWidth: "60px", textAlign: "right" }}>
        {value}/{max}
      </span>
    </div>
  );
}

// ─── MiniAttrBar（屬性值小條）─────────────────────────────────
function MiniAttrBar({ icon, label, value, color, max = 100 }: { icon: string; label: string; value: number; color: string; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs w-4 text-center shrink-0">{icon}</span>
      <span className="text-xs text-slate-500 shrink-0" style={{ minWidth: "36px" }}>{label}</span>
      <div className="flex-1 h-1.5 bg-slate-800/80 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-bold tabular-nums shrink-0" style={{ color, minWidth: "24px", textAlign: "right" }}>{value}</span>
    </div>
  );
}

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
          <p className="text-slate-500 text-sm">為你的旅人命名，踏上命格之旅</p>
        </div>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          placeholder="輸入旅人名稱（1-12字）"
          maxLength={12}
          className="w-full px-4 py-3 rounded-xl text-slate-200 text-center text-lg font-bold tracking-widest outline-none"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(245,158,11,0.3)" }}
        />
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        <button onClick={submit} disabled={mut.isPending}
          className="w-full py-3.5 rounded-xl font-bold text-black text-base transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
          style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)" }}>
          {mut.isPending ? "⏳ 命格生成中…" : "✨ 確認命名"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 地圖傳送彈窗（V14）
// ─────────────────────────────────────────────────────────────
function TeleportModal({
  nodes, currentNodeId, onClose, onTeleport, isPending, agentAP, agentStamina,
}: {
  nodes: MapNode[];
  currentNodeId: string;
  agentStamina?: number;
  onClose: () => void;
  onTeleport: (nodeId: string) => void;
  isPending: boolean;
  agentAP: number;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const filtered = nodes.filter(n =>
    n.id !== currentNodeId &&
    (search === "" || n.name.includes(search) || (n.county ?? "").includes(search))
  );
  const currentStamina = agentStamina ?? 100;
  const currentNode = nodes.find(n => n.id === currentNodeId);
  // 計算每個目標節點的移動體力消耗
  const getMoveCost = (targetNode: MapNode): number => {
    if (!currentNode) return 2;
    return calcMoveCost(currentNode, targetNode);
  };
  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(16px)" }}
      onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl flex flex-col overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0a1628 0%, #0f1f35 100%)",
          border: "1px solid rgba(56,189,248,0.3)",
          boxShadow: "0 0 60px rgba(56,189,248,0.2), 0 20px 40px rgba(0,0,0,0.6)",
          maxHeight: "80vh",
        }}
        onClick={e => e.stopPropagation()}>
        {/* 標題列 */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(56,189,248,0.2)" }}>
          <div>
            <h2 className="text-lg font-bold text-sky-300">🗺️ 地圖傳送</h2>
            <p className="text-xs text-slate-500 mt-0.5">目前：{currentNode?.name ?? currentNodeId} · 靈力 {agentAP} 點 · 體力 {currentStamina} 點</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xl px-2">✕</button>
        </div>
        {/* 搜尋 */}
        <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜尋地名或縣市…"
            className="w-full px-3 py-2 rounded-xl text-sm text-slate-200 outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(56,189,248,0.2)" }}
          />
        </div>
        {/* 節點列表 */}
        <div className="overflow-y-auto flex-1 px-3 py-2 space-y-1">
          {filtered.length === 0 ? (
            <p className="text-center text-slate-600 text-sm py-6">找不到符合的地點</p>
          ) : filtered.map(node => {
            const isSelected = selected === node.id;
            const elColor = WX_HEX[node.element ?? "metal"] ?? "#e2e8f0";
            const moveCost = getMoveCost(node);
            const canAfford = currentStamina >= moveCost;
            const costColor = !canAfford ? '#ef4444' : moveCost <= 3 ? '#34d399' : moveCost <= 6 ? '#f59e0b' : '#ef4444';
            return (
              <button key={node.id}
                onClick={() => setSelected(isSelected ? null : node.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                style={{
                  background: isSelected ? `${elColor}18` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${isSelected ? elColor + "50" : "rgba(255,255,255,0.06)"}`,
                  opacity: canAfford ? 1 : 0.6,
                }}>
                <span className="text-lg shrink-0">{WX_EMOJI[node.element ?? "metal"] ?? "📍"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-200">{node.name}</span>
                    {node.county && <span className="text-xs text-slate-600">{node.county}</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: `${elColor}18`, color: elColor }}>
                      {WX_ZH[node.element ?? "metal"] ?? "金"}域
                    </span>
                    {node.dangerLevel && (
                      <span className="text-xs text-slate-600">危險 Lv.{node.dangerLevel}</span>
                    )}
                    <span className="text-xs font-bold" style={{ color: costColor }}>
                      🏃 -{moveCost} 體力{!canAfford ? ' (不足)' : ''}
                    </span>
                  </div>
                </div>
                {isSelected && (
                  <span className="text-sky-400 text-sm shrink-0">✓</span>
                )}
              </button>
            );
          })}
        </div>
        {/* 確認按鈕 */}
        <div className="px-4 py-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <button
            onClick={() => selected && onTeleport(selected)}
            disabled={!selected || isPending || agentAP < 1}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: selected && agentAP >= 1 ? "linear-gradient(135deg,#0ea5e9,#38bdf8)" : "rgba(100,100,120,0.2)",
              color: selected && agentAP >= 1 ? "#000" : "#475569",
            }}>
            {isPending ? "⏳ 傳送中…" : selected ? `🗺️ 傳送至 ${nodes.find(n => n.id === selected)?.name ?? selected}（消耗 1 靈力）` : "請選擇目標地點"}
          </button>
          {agentAP < 1 && (
            <p className="text-center text-red-400 text-xs mt-2">靈力不足，無法傳送（需要 1 靈力）</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 節點資訊面板（方格面板）
// ─────────────────────────────────────────────────────────────
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
        className="flex items-center justify-between px-3 py-2.5 w-full transition-all hover:bg-white/5"
        style={{ background: isOpen ? `${ec}08` : "transparent" }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm">📍</span>
          <span className="text-sm font-bold text-slate-200">{node?.name ?? "—"}</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
            style={{ background: `${ec}18`, color: ec }}>{node?.county ?? "—"}</span>
          {dl > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
              style={{ background: `${dangerColor[dl]}18`, color: dangerColor[dl] }}>
              {dangerLabel[dl]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {adventurers.length > 0 && (
            <span className="text-xs text-slate-500">{adventurers.length}人</span>
          )}
          <span className="text-slate-500 text-xs">{isOpen ? "▼" : "▲"}</span>
        </div>
      </button>

      {isOpen && (
        <div className="px-3 pb-3 space-y-3 overflow-y-auto" style={{ maxHeight: compact ? "30vh" : "35vh" }}>
          {node?.description && (
            <p className="text-xs text-slate-500 leading-relaxed italic border-l-2 pl-2.5"
              style={{ borderColor: `${ec}40` }}>{node.description}</p>
          )}

          {/* 怪物列表 */}
          {monsters.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-400 mb-1.5 flex items-center gap-1">
                <span>⚔️</span> 此地怪物
                <span className="text-slate-600 font-normal ml-1">Lv.{node?.monsterLevel?.[0] ?? 1}–{node?.monsterLevel?.[1] ?? 10}</span>
              </p>
              <div className="space-y-1.5">
                {monsters.map(m => {
                  const mc = WX_HEX[m.element] ?? "#888";
                  return (
                    <div key={m.id} className="flex items-center gap-2 px-2.5 py-2 rounded-xl border"
                      style={{ background: `${mc}08`, borderColor: `${mc}25` }}>
                      <span className="text-sm shrink-0">{WX_EMOJI[m.element] ?? "👾"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-bold" style={{ color: mc }}>{m.name}</span>
                          {m.isBoss && (
                            <span className="text-xs px-1.5 py-0.5 rounded font-bold"
                              style={{ background: "rgba(245,158,11,0.2)", color: "#f59e0b" }}>BOSS</span>
                          )}
                        </div>
                        {m.description && <p className="text-xs text-slate-600 truncate">{m.description}</p>}
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

          {/* 資源列表 */}
          {resources.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-400 mb-1.5 flex items-center gap-1">
                <span>🌿</span> 可收集資源
              </p>
              <div className="flex flex-wrap gap-1.5">
                {resources.map((r, i) => (
                  <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-full border text-xs"
                    style={{ background: `${ec}08`, borderColor: `${ec}25`, color: ec }}>
                    <span>{r.icon}</span>
                    <span className="font-medium">{r.name}</span>
                    <span className="text-slate-600">·{r.rarity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 隱藏任務提示 */}
          {questHints.length > 0 && (
            <div className="space-y-1">
              {questHints.map((hint, i) => (
                <div key={i} className="text-xs px-2.5 py-1.5 rounded-lg"
                  style={{ background: "rgba(245,158,11,0.08)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)" }}>
                  {hint}
                </div>
              ))}
            </div>
          )}

          {/* 在場冒險者 */}
          {adventurers.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-400 mb-1.5 flex items-center gap-1">
                <span>👥</span> 在場冒險者（{adventurers.length}）
              </p>
              <div className="space-y-1.5">
                {adventurers.map((a, i) => {
                  const ac = WX_HEX[a.element] ?? "#888";
                  const hpPct = a.maxHp > 0 ? Math.min(100, (a.hp / a.maxHp) * 100) : 0;
                  const isCombat = a.status === "combat";
                  const isResting = a.status === "resting";
                  const isMoving = a.status === "moving";
                  const statusLabel = isCombat ? "⚔️ 戰鬥中" : isMoving ? "🚶 移動中" : isResting ? "💤 休息中" : "✨ 探索中";
                  const statusColor = isCombat ? "#ef4444" : isMoving ? "#38bdf8" : isResting ? "#94a3b8" : "#22c55e";
                  const statusBg = isCombat ? "rgba(239,68,68,0.15)" : isMoving ? "rgba(56,189,248,0.1)" : isResting ? "rgba(148,163,184,0.1)" : "rgba(34,197,94,0.1)";
                  const hpColor = hpPct > 60 ? "#22c55e" : hpPct > 30 ? "#f59e0b" : "#ef4444";
                  return (
                    <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all"
                      style={{ background: `${ac}08`, borderColor: isCombat ? `${statusColor}40` : `${ac}20`,
                        boxShadow: isCombat ? `0 0 8px ${statusColor}20` : "none" }}>
                      <div className="relative shrink-0">
                        <span className="text-sm">{WX_EMOJI[a.element] ?? "👤"}</span>
                        {/* 狀態脈衝點 */}
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                          style={{ background: statusColor,
                            animation: isCombat ? "nodeAdventurerPulse 0.8s ease-in-out infinite" : "none",
                            boxShadow: isCombat ? `0 0 4px ${statusColor}` : "none" }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-sm font-bold text-slate-200 truncate max-w-[80px]">{a.name}</span>
                          <span className="text-xs text-slate-500">Lv.{a.level}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                            style={{ background: statusBg, color: statusColor, fontSize: "10px" }}>
                            {statusLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${hpPct}%`, background: hpColor,
                                boxShadow: hpPct < 30 ? `0 0 4px ${hpColor}` : "none" }} />
                          </div>
                          <span className="text-xs text-slate-600 shrink-0" style={{ fontSize: "10px" }}>{a.hp}/{a.maxHp}</span>
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
  id?: number; agentName?: string; level?: number; hp?: number; maxHp?: number; mp?: number; maxMp?: number;
  stamina?: number; maxStamina?: number; gold?: number; strategy?: string; status?: string;
  dominantElement?: string; currentNodeId?: string; actionPoints?: number; maxActionPoints?: number;
  exp?: number; expToNext?: number; experience?: number; attack?: number; defense?: number; speed?: number;
  healPower?: number; magicAttack?: number; hitRate?: number;
  gatherPower?: number; forgePower?: number; carryWeight?: number; refinePower?: number; treasureHunting?: number;
  // 五行比例欄位
  wuxingWood?: number; wuxingFire?: number; wuxingEarth?: number; wuxingMetal?: number; wuxingWater?: number;
  // 技能欄位
  skillSlot1?: string | null; skillSlot2?: string | null; skillSlot3?: string | null; skillSlot4?: string | null;
  passiveSlot1?: string | null; passiveSlot2?: string | null;
  skills?: Array<{ name: string; element: string; level: number; description?: string; type?: string }>;
  // 靈相干預冷卻時間
  lastDivineHealDate?: string | null;
  lastDivineEyeDate?: string | null;
  lastDivineStaminaDate?: string | null;
  // 行動模式
  movementMode?: string | null;
};

function CharacterPanel({
  agent, staminaInfo, natalStats, equippedData, balanceData, dailyData,
  divineHeal, divineEye, divineStamina, setStrategy, ec, mobileMode = false,
}: {
  agent: AgentData | null | undefined;
  staminaInfo: { current?: number; max?: number; nextRegenMin?: number } | null | undefined;
  natalStats: { hp?: number; atk?: number; def?: number; spd?: number; mp?: number } | null | undefined;
  equippedData: { userGender?: string; dayMasterElementEn?: string; equipped?: Record<string, { name: string; quality?: string } | null> } | null | undefined;
  balanceData: { gameCoins?: number; gameStones?: number } | null | undefined;
  dailyData: { dayPillar?: { stem?: string; branch?: string; stemElement?: string } } | null | undefined;
  divineHeal: { mutate: () => void; isPending: boolean };
  divineEye: { mutate: () => void; isPending: boolean };
  divineStamina: { mutate: () => void; isPending: boolean };
  setStrategy: { mutate: (a: { strategy: "combat" | "gather" | "rest" | "explore" | "infuse" }) => void; isPending: boolean };
  ec: string;
  mobileMode?: boolean;
}) {
  const [activePanel, setActivePanel] = useState<PanelId>("combat");
  // 背包道具查詢（頂層呼叫，遵守 React Hooks 規則）
  const invQuery = trpc.gameWorld.getInventory.useQuery(undefined, { staleTime: 30000 });
  const invItems = (invQuery.data ?? []) as Array<{ id: number; itemId: string; itemName: string; quantity: number; rarity?: string; itemType?: string; emoji?: string }>;
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
  // Bug 5 fix: 使用和後端相同的公式計算 expToNext（Math.floor(100 * 1.4^(level-1))）
  const calcExpToNextFn = (level: number): number => {
    if (level >= 60) return 999999;
    return Math.floor(100 * Math.pow(1.4, level - 1));
  };
  const agentExpToNext = calcExpToNextFn(agent?.level ?? 1);
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

  // 靈相干預冷卻時間（台灣時間 UTC+8）
  const todayTW = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
  const healUsedToday = agent?.lastDivineHealDate === todayTW;
  const eyeUsedToday = agent?.lastDivineEyeDate === todayTW;
  const staminaUsedToday = agent?.lastDivineStaminaDate === todayTW;

  // GD-002 戰鬥系屬性値
  const combatValues: Record<string, number> = {
    attack: agent?.attack ?? 10,
    defense: agent?.defense ?? 5,
    speed: agent?.speed ?? 8,
    healPower: agent?.healPower ?? 20,
    magicAttack: agent?.magicAttack ?? 20,
  };
  // GD-002 生活系屬性值
  const lifeValues: Record<string, number> = {
    gatherPower: agent?.gatherPower ?? 20,
    forgePower: agent?.forgePower ?? 20,
    carryWeight: agent?.carryWeight ?? 20,
    refinePower: agent?.refinePower ?? 20,
    treasureHunting: agent?.treasureHunting ?? 20,
  };

  const [showSkillPicker, setShowSkillPicker] = useState(false);
  const [skillPickerSlot, setSkillPickerSlot] = useState<{ type: "active" | "passive"; index: number; slot: "skillSlot1" | "skillSlot2" | "passiveSlot1" } | null>(null);
  const [skillWuxingFilter, setSkillWuxingFilter] = useState("");
  const skillCatalogQuery = trpc.gameWorld.getSkillCatalogForPlayer.useQuery(
    skillWuxingFilter ? { wuxing: skillWuxingFilter } : undefined,
    { enabled: showSkillPicker, staleTime: 60000 }
  );
  const cpUtils = trpc.useUtils();
  const installSkillMutation = trpc.gameWorld.installSkill.useMutation({
    onSuccess: () => {
      setShowSkillPicker(false);
      toast.success("技能安裝成功！");
      // Bug 1 fix: 安裝後立即刷新 agent 資料，讓技能槽 UI 更新
      cpUtils.gameWorld.getOrCreateAgent.invalidate();
      cpUtils.gameWorld.getAgentStatus.invalidate();
    },
    onError: (e) => toast.error("安裝失敗：" + e.message),
  });
  const [itemCategory, setItemCategory] = useState<"all" | "material" | "consumable" | "equipment">("all");
  const [showEquipShop, setShowEquipShop] = useState(false);
  const [equipShopWuxing, setEquipShopWuxing] = useState("");
  const [equipShopSlot, setEquipShopSlot] = useState("");
  const equipCatalogQuery = trpc.gameWorld.getEquipmentCatalog.useQuery(
    { wuxing: equipShopWuxing || undefined, slot: equipShopSlot || undefined },
    { enabled: showEquipShop, staleTime: 60000 }
  );
  const equipItemMutation = trpc.gameWorld.equipItem.useMutation({
    onSuccess: (data) => {
      toast.success(`裝備了「${data.equipName}」`);
      invQuery.refetch();
    },
    onError: (e) => toast.error("裝備失敗：" + e.message),
  });
  const useItemMutation = trpc.gameWorld.useItem.useMutation({
    onSuccess: (data) => {
      toast.success(`使用了「${data.itemName}」！HP: ${data.newHp}, MP: ${data.newMp}`);
      invQuery.refetch();
    },
    onError: (e) => toast.error("使用失敗：" + e.message),
  });
  const learnSkillMutation = trpc.gameWorld.learnSkillFromBook.useMutation({
    onSuccess: (data) => {
      toast.success(`成功習得技能「${data.skillId}」！可在技能面板裝備使用`);
      invQuery.refetch();
      cpUtils.gameWorld.getOrCreateAgent.invalidate();
    },
    onError: (e) => toast.error("學習失敗：" + e.message),
  });
  const PANELS: { id: PanelId; icon: string; label: string }[] = [
    { id: "combat", icon: "⚔️", label: "戰鬥" },
    { id: "life",   icon: "🏠", label: "生活" },
    { id: "items",  icon: "🎒", label: "道具" },
    { id: "equip",  icon: "🛡️", label: "裝備" },
    { id: "skill",  icon: "✨", label: "技能" },
    { id: "natal",  icon: "🔮", label: "命格" },
  ];

  return (
    <div className="flex flex-col overflow-hidden flex-1">
      {/* 旅人頭部：手機版底部抜屉模式下隱藏 */}
      {!mobileMode && (
        <div className="px-4 py-3 flex items-center gap-3 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "linear-gradient(135deg, rgba(8,12,25,0.99) 0%, rgba(15,20,40,0.99) 100%)" }}>
          {/* 角色頭像 */}
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border-2 shrink-0 relative"
            style={{
              background: `radial-gradient(circle at 30% 30%, ${ec}30, rgba(6,10,22,0.9))`,
              borderColor: `${ec}60`,
              boxShadow: `0 0 20px ${ec}40, inset 0 0 10px ${ec}15`,
            }}>
            {userGender === "male" ? "🧙" : "🧝"}
            {/* 等級徽章 */}
            <span className="absolute -bottom-1 -right-1 text-[11px] font-bold px-1.5 py-0.5 rounded-full border"
              style={{ background: `${ec}22`, borderColor: `${ec}50`, color: ec }}>Lv.{agentLevel}</span>
          </div>
          {/* 角色資訊 */}
          <div className="flex-1 min-w-0">
            {/* 名稱行 */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-slate-100 font-bold text-base leading-tight">{agentName}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold shrink-0 border"
                style={{ background: `${ec}18`, borderColor: `${ec}45`, color: ec }}>{WX_ZH[agentElement] ?? "金"}命</span>
              <span className="text-xs px-2 py-0.5 rounded-full shrink-0 font-semibold border"
                style={{ background: statusBg, borderColor: statusFg + "50", color: statusFg }}>{statusLabel}</span>
            </div>
            {/* 經驗條 */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${agentExpToNext > 0 ? Math.min(100,(agentExp/agentExpToNext)*100) : 0}%`, background: "linear-gradient(90deg,#a78bfa,#7c3aed)" }} />
              </div>
              <span className="text-xs text-slate-500 shrink-0 tabular-nums">{agentExp}/{agentExpToNext}</span>
            </div>
            {/* 靈力指示 */}
            <div className="flex items-center gap-1.5 mt-1.5">
              {Array.from({ length: agentMaxAP }).map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full border transition-all"
                  style={{
                    background: i < agentAP ? "#a78bfa" : "transparent",
                    borderColor: i < agentAP ? "#a78bfa" : "rgba(255,255,255,0.15)",
                    boxShadow: i < agentAP ? "0 0 4px #a78bfa" : "none",
                  }} />
              ))}
              <span className="text-[10px] text-slate-600 ml-1">靈力 {agentAP}/{agentMaxAP}</span>
            </div>
          </div>
          {/* 幣値小卡 */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-sm font-bold text-amber-400">🪙 {gameCoins.toLocaleString()}</span>
            <span className="text-sm font-bold text-sky-400">💎 {gameStones.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Tab 列 */}
      <div className="flex shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(8,12,25,0.97)" }}>
        {PANELS.map(p => (
          <button key={p.id} onClick={() => setActivePanel(p.id)}
            className="flex-1 py-2.5 flex flex-col items-center gap-1 transition-all"
            style={{
              background: activePanel === p.id ? `${ec}12` : "transparent",
              color: activePanel === p.id ? ec : "rgba(148,163,184,0.5)",
              borderBottom: activePanel === p.id ? `2px solid ${ec}` : "2px solid transparent",
            }}>
            <span className="text-[26px] leading-none">{p.icon}</span>
            <span className="text-[11px] font-medium">{p.label}</span>
          </button>
        ))}
      </div>

      {/* 面板內容：overflow-y-auto 讓內容在固定高度內滾動 */}
      <div className="overflow-y-auto flex-1 px-3 py-2.5 space-y-2.5"
        style={{ background: "rgba(8,12,25,0.97)" }}>

        {/* ── 戰鬥面板 ── */}
        {activePanel === "combat" && (
          <div className="space-y-2.5">
            {/* 生命/魔力/活躍值 */}
            <StatBar icon="❤️" label="HP"   value={agentHp}      max={agentMaxHp}      color="#ef4444" />
            <StatBar icon="💧" label="MP"   value={agentMp}      max={agentMaxMp}      color="#38bdf8" />
            <StatBar icon="⚡" label="活躍" value={agentStamina} max={agentMaxStamina} color="#f59e0b" />
              {staminaInfo && agentStamina < agentMaxStamina && (
              <p className="text-xs text-slate-600 text-right">下次恢復：{staminaInfo.nextRegenMin} 分鐘後（+30）</p>
            )}

            {/* GD-002 戰鬥系五行屬性 */}
            <div className="rounded-xl border p-2.5 space-y-1.5"
              style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-bold text-slate-500">⚔️ 戰鬥系屬性</p>
                <span className="text-[10px] text-slate-600">上限 255</span>
              </div>
              {COMBAT_ATTRS.map(a => (
                <MiniAttrBar key={a.key} icon={a.icon} label={a.label}
                  value={combatValues[a.key] ?? 0}
                  color={WX_HEX[a.wx] ?? "#888"} max={255} />
              ))}
              <div className="mt-1.5 px-2 py-1.5 rounded-lg text-[10px] space-y-0.5"
                style={{ background: "rgba(255,255,255,0.03)", borderLeft: "2px solid rgba(255,255,255,0.1)", color: "#64748b" }}>
                <p>🌲 木屬性 × 3.0 → 最大HP</p>
                <p>🔥 火屬性 × 2.0 → 攻擊力</p>
                <p>🌍 土屬性 × 2.5 → 防禦力</p>
                <p>⚔️ 金屬性 × 1.5 → 速度</p>
                <p>💧 水屬性 × 2.0 → 法力/最大MP</p>
              </div>
            </div>

            {/* 提示：行動策略和靈相干預已移至地圖浮動控件 */}
            <div className="px-2.5 py-2 rounded-xl border text-xs text-slate-600"
              style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
              <p className="text-slate-500 font-bold mb-1">💡 快速操作</p>
              <p>⚔️ 行動策略 → 地圖右下角浮動面板</p>
              <p>✨ 靈相干預 → 地圖右上角浮動面板</p>
              <p>❤️ HP/MP/活躍 → 地圖左側浮動條</p>
            </div>
          </div>
        )}

        {/* ── 生活面板 ── */}
        {activePanel === "life" && (
          <div className="space-y-2.5">
            {/* 今日流日加成 */}
            <div className="px-2.5 py-2 rounded-xl border"
              style={{ background: `${todayColor}08`, borderColor: `${todayColor}28` }}>
              <p className="text-xs text-slate-500 mb-0.5">今日流日加成</p>
              <p className="text-sm font-bold" style={{ color: todayColor }}>{todayStem}{todayBranch}（{todayElement}旺）</p>
              <p className="text-xs text-slate-400 mt-0.5">{todayElement}屬性掉落率 +30%・技能傷害 +20%</p>
            </div>

            {/* GD-002 生活系五行屬性 */}
            <div className="rounded-xl border p-2.5 space-y-1.5"
              style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-bold text-slate-500">🌿 生活系屬性</p>
                <span className="text-[10px] text-slate-600">上限 255</span>
              </div>
              {LIFE_ATTRS.map(a => (
                <MiniAttrBar key={a.key} icon={a.icon} label={a.label}
                  value={lifeValues[a.key] ?? 0}
                  color={WX_HEX[a.wx] ?? "#888"} max={255} />
              ))}
              {/* 尋寶力特別說明 */}
              <div className="mt-1.5 px-2 py-1.5 rounded-lg text-xs"
                style={{ background: "rgba(56,189,248,0.06)", borderLeft: "2px solid rgba(56,189,248,0.4)", color: "#94a3b8" }}>
💧 尋寶力 {lifeValues.treasureHunting} → {lifeValues.treasureHunting >= 80 ? "密店感知強（最高80%機率）" : lifeValues.treasureHunting >= 50 ? "偶有感知（約40%機率）" : lifeValues.treasureHunting >= 30 ? "微弱感知（約20%機率）" : "最低機率（5%）—仿然有機會發現密店、隱藏NPC、隱藏任務"}
              </div>
            </div>
          </div>
        )}

        {/* ── 道具面板 ── */}
        {activePanel === "items" && (
          <div className="space-y-2.5">
            {/* 分類筛選 */}
            <div className="flex gap-1.5">
              {([
                { id: "all",         label: "全部" },
                { id: "material",    label: "鍛造素材" },
                { id: "consumable",  label: "消耗道具" },
                { id: "equipment",   label: "裝備" },
              ] as const).map(cat => (
                <button key={cat.id} onClick={() => setItemCategory(cat.id)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all"
                  style={{
                    background: itemCategory === cat.id ? `${ec}18` : "rgba(255,255,255,0.03)",
                    borderColor: itemCategory === cat.id ? `${ec}55` : "rgba(255,255,255,0.08)",
                    color: itemCategory === cat.id ? ec : "rgba(148,163,184,0.5)",
                  }}>
                  {cat.label}
                </button>
              ))}
            </div>
            {/* 道具列表 */}
            {invQuery.isLoading ? (
              <p className="text-xs text-slate-600 text-center py-4">載入中…</p>
            ) : (() => {
              const filtered = invItems.filter(item => {
                if (itemCategory === "all") return true;
                if (itemCategory === "material") return item.itemType === "material" || (!item.itemType && !item.rarity);
                if (itemCategory === "consumable") return item.itemType === "consumable" || item.itemType === "potion";
                // 裝備分類：只根據 itemType，不用 rarity 判斷（避免鍵造素材被誤分入裝備）
                if (itemCategory === "equipment") return item.itemType === "equipment" || item.itemType === "skill_book";
                return true;
              });
              if (filtered.length === 0) return (
                <div className="text-center py-6">
                  <p className="text-slate-600 text-sm">此分類為空</p>
                  <p className="text-slate-700 text-xs mt-1">擊敗怪物後將獲得道具</p>
                </div>
              );
              return (
                <div className="space-y-1.5">
                  {filtered.map(item => {
                    const rc = item.rarity ? QUALITY_COLOR[item.rarity] ?? "#94a3b8" : "#94a3b8";
                    const typeLabel = item.itemType === "material" ? "鍛造素材" :
                      item.itemType === "consumable" || item.itemType === "potion" ? "消耗道具" :
                      item.itemType === "equipment" ? "裝備" :
                      item.itemType === "skill_book" ? "技能書" : "道具";
                    return (
                      <div key={item.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border"
                        style={{ background: `${rc}08`, borderColor: `${rc}25` }}>
                        <span className="text-xl shrink-0">{item.emoji ?? "📦"}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-bold" style={{ color: rc }}>{item.itemName}</p>
                            <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: `${rc}20`, color: rc }}>{typeLabel}</span>
                            {item.rarity && <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "#64748b" }}>{QUALITY_ZH[item.rarity] ?? item.rarity}</span>}
                          </div>
                        </div>
                        <span className="text-sm font-bold text-slate-400 shrink-0">x{item.quantity}</span>
                      {(item.itemType === "consumable" || item.itemType === "potion") && (
                        <button
                          onClick={() => useItemMutation.mutate({ inventoryId: item.id })}
                          disabled={useItemMutation.isPending}
                          className="shrink-0 px-2 py-1 rounded-lg text-xs font-bold transition-all active:scale-95"
                          style={{ background: `${ec}25`, color: ec, border: `1px solid ${ec}40` }}>
                          使用
                        </button>
                      )}
                      {item.itemType === "skill_book" && (
                        <button
                          onClick={() => learnSkillMutation.mutate({ inventoryId: item.id })}
                          disabled={learnSkillMutation.isPending}
                          className="shrink-0 px-2 py-1 rounded-lg text-xs font-bold transition-all active:scale-95"
                          style={{ background: `${ec}25`, color: ec, border: `1px solid ${ec}40` }}>
                          學習
                        </button>
                      )}
                      {item.itemType === "equipment" && (() => {
                        const isEquipped = Object.values(equipped).some((e: any) => e?.equipId === item.itemId || e?.id === item.itemId);
                        return (
                          <button
                            onClick={() => equipItemMutation.mutate({ equipId: item.itemId, action: isEquipped ? 'unequip' : 'equip' })}
                            disabled={equipItemMutation.isPending}
                            className="shrink-0 px-2 py-1 rounded-lg text-xs font-bold transition-all active:scale-95"
                            style={{
                              background: isEquipped ? 'rgba(239,68,68,0.15)' : `${ec}25`,
                              color: isEquipped ? '#ef4444' : ec,
                              border: `1px solid ${isEquipped ? 'rgba(239,68,68,0.3)' : `${ec}40`}`,
                            }}>
                            {isEquipped ? '卸下' : '裝備'}
                          </button>
                        );
                      })()}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* ── 裝備面板（GD-006）── */}
        {activePanel === "equip" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">裝備欄位（10格）</p>
                <p className="text-[10px] text-slate-600">在「道具」頁籤選擇裝備</p>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {EQUIP_SLOTS.map(({ slot, icon, label, desc }) => {
                  const item = equipped[slot];
                  const qc = item?.quality ? QUALITY_COLOR[item.quality] ?? "#94a3b8" : null;
                  return (
                    <div key={slot} className="flex items-center gap-2 px-2.5 py-2 rounded-xl border"
                      style={{
                        background: item ? `${qc ?? ec}08` : "rgba(255,255,255,0.02)",
                        borderColor: item ? `${qc ?? ec}30` : "rgba(255,255,255,0.07)",
                      }}>
                      <span className="text-lg shrink-0">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-500">{label}</p>
                        {item ? (
                          <div>
                            <p className="text-xs font-bold text-slate-200 leading-tight truncate">{item.name}</p>
                            {item.quality && qc && (
                              <span className="text-xs px-1 py-0.5 rounded-full"
                                style={{ background: `${qc}20`, color: qc }}>
                                {QUALITY_ZH[item.quality] ?? item.quality}
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-700 italic">{desc}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 裝備屬性加成摘要 */}
              {(() => {
                const bonuses: { label: string; val: number; color: string }[] = [];
                Object.values(equipped).forEach((e: any) => {
                  if (!e?.baseStats) return;
                  const m = String(e.baseStats).match(/([\+\-]?\d+)/g);
                  if (m) m.forEach(v => { /* 簡化展示，只展示裝備數量 */ });
                });
                const equippedList = Object.entries(equipped).filter(([, v]) => v != null);
                if (equippedList.length === 0) return (
                  <div className="px-2.5 py-2 rounded-xl border text-center"
                    style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
                    <p className="text-xs text-slate-600">尚未裝備任何裝備</p>
                    <p className="text-[10px] text-slate-700 mt-0.5">至「道具」頁籤選擇裝備並安裝</p>
                  </div>
                );
                return (
                  <div className="rounded-xl border p-2.5 space-y-1.5"
                    style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
                    <p className="text-xs font-bold text-slate-500">⚔️ 裝備屬性加成</p>
                    {equippedList.map(([slot, e]: any) => (
                      <div key={slot} className="flex items-center gap-2">
                        <span className="text-xs text-slate-600 w-12 shrink-0">{EQUIP_SLOTS.find(s => s.slot === slot)?.label ?? slot}</span>
                        <span className="text-xs font-bold" style={{ color: e?.quality ? QUALITY_COLOR[e.quality] ?? '#94a3b8' : '#94a3b8' }}>{e?.name ?? ''}</span>
                        {e?.baseStats && <span className="text-[10px] text-slate-500 ml-auto shrink-0">{e.baseStats}</span>}
                      </div>
                    ))}
                    <div className="pt-1 border-t border-slate-800/60">
                      <p className="text-[10px] text-slate-600">• 裝備屬性已反映至「戰鬥」頁籤的數値</p>
                    </div>
                  </div>
                );
              })()}
            </div>
        )}

        {/* ── 裝備商店全視窗 ── */}
        {showEquipShop && (
          <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: "rgba(4,8,20,0.95)" }}>
            <div className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div>
                <p className="text-sm font-bold text-slate-100">🛒 裝備商店</p>
                <p className="text-xs text-slate-500">選擇裝備並裝備至對應欄位</p>
              </div>
              <button onClick={() => setShowEquipShop(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-200"
                style={{ background: "rgba(255,255,255,0.08)" }}>✕</button>
            </div>
            {/* 筛選列 */}
            <div className="flex gap-1.5 px-3 py-2 shrink-0 overflow-x-auto">
              {["", "木", "火", "土", "金", "水"].map(w => (
                <button key={w} onClick={() => setEquipShopWuxing(w)}
                  className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all"
                  style={{
                    background: equipShopWuxing === w ? `${ec}20` : "rgba(255,255,255,0.04)",
                    borderColor: equipShopWuxing === w ? `${ec}50` : "rgba(255,255,255,0.08)",
                    color: equipShopWuxing === w ? ec : "#64748b",
                  }}>{w || "全部"}</button>
              ))}
              <div className="w-px bg-slate-800 mx-1 shrink-0" />
              {["", "weapon", "helmet", "armor", "shoes", "accessory"].map(s => (
                <button key={s} onClick={() => setEquipShopSlot(s)}
                  className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all"
                  style={{
                    background: equipShopSlot === s ? `${ec}20` : "rgba(255,255,255,0.04)",
                    borderColor: equipShopSlot === s ? `${ec}50` : "rgba(255,255,255,0.08)",
                    color: equipShopSlot === s ? ec : "#64748b",
                  }}>{s || "全部"}{s === "weapon" ? "🗡️" : s === "helmet" ? "⛑️" : s === "armor" ? "🛡️" : s === "shoes" ? "👢" : s === "accessory" ? "💍" : ""}</button>
              ))}
            </div>
            {/* 裝備列表 */}
            <div className="flex-1 overflow-y-auto px-3 pb-4">
              {equipCatalogQuery.isLoading ? (
                <p className="text-xs text-slate-600 text-center py-8">載入裝備圖鑑中…</p>
              ) : (equipCatalogQuery.data ?? []).length === 0 ? (
                <p className="text-xs text-slate-600 text-center py-8">沒有符合條件的裝備</p>
              ) : (
                <div className="space-y-2 mt-1">
                  {(equipCatalogQuery.data ?? []).map((equip: any) => {
                    const wc = WX_HEX[({'木':'wood','火':'fire','土':'earth','金':'metal','水':'water'} as Record<string,string>)[equip.wuxing] ?? 'metal'] ?? '#94a3b8';
                    const tierColor = equip.tier === '傳說' ? '#f59e0b' : equip.tier === '高階' ? '#a78bfa' : equip.tier === '中階' ? '#38bdf8' : '#94a3b8';
                    return (
                      <div key={equip.id} className="px-3 py-3 rounded-xl border"
                        style={{ background: `${wc}06`, borderColor: `${wc}20` }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              <p className="text-sm font-bold text-slate-100">{equip.name}</p>
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                                style={{ background: `${wc}20`, color: wc }}>{equip.wuxing}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                                style={{ background: `${tierColor}20`, color: tierColor }}>{equip.tier}</span>
                              {equip.isEquipped && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-900/40 text-green-400 font-bold">已裝備</span>}
                            </div>
                            {equip.baseStats && <p className="text-xs text-slate-400 leading-tight">{equip.baseStats}</p>}
                            {equip.specialEffect && <p className="text-[10px] text-amber-400/80 mt-0.5 leading-tight">✨ {equip.specialEffect}</p>}
                            <p className="text-[10px] text-slate-600 mt-0.5">需等級 Lv.{equip.levelRequired}</p>
                          </div>
                          <button
                            onClick={() => equipItemMutation.mutate({ equipId: equip.equipId, action: equip.isEquipped ? 'unequip' : 'equip' })}
                            disabled={equipItemMutation.isPending}
                            className="shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95"
                            style={{
                              background: equip.isEquipped ? 'rgba(239,68,68,0.15)' : `${wc}20`,
                              color: equip.isEquipped ? '#ef4444' : wc,
                              border: `1px solid ${equip.isEquipped ? 'rgba(239,68,68,0.3)' : `${wc}40`}`,
                            }}>{equip.isEquipped ? '卸下' : '裝備'}</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 技能面板（GD-001 + 木屬性動態擴充）── */}
        {activePanel === "skill" && (() => {
          // 木屬性動態擴充技能槽數量
          const woodVal = agent?.wuxingWood ?? 0;
          // 主動技能槽：預設4，木屬性門檻擴充（最失8）
          const activeSlotCount = woodVal >= 200 ? 8 : woodVal >= 150 ? 7 : woodVal >= 100 ? 6 : woodVal >= 60 ? 5 : 4;
          // 被動技能槽：預設2，木屬性門檻擴充（最失5）
          const passiveSlotCount = woodVal >= 200 ? 5 : woodVal >= 150 ? 4 : woodVal >= 80 ? 3 : 2;
          // 隱藏技能槽：預設1，木屬性門檻擴充（最失3）
          const hiddenSlotCount = woodVal >= 200 ? 3 : woodVal >= 120 ? 2 : 1;
          const ACTIVE_SLOT_KEYS = ["skillSlot1", "skillSlot2", "skillSlot3", "skillSlot4"] as const;
          const PASSIVE_SLOT_KEYS = ["passiveSlot1", "passiveSlot2"] as const;
          const activeSlots = ACTIVE_SLOT_KEYS.map(k => (agent as any)?.[k] as string | undefined);
          const passiveSlots = PASSIVE_SLOT_KEYS.map(k => (agent as any)?.[k] as string | undefined);
          // 技能槽門檻說明
          const nextActiveThreshold = activeSlotCount < 8 ? [4,60,100,150,200].find(t => t > woodVal) : null;
          const nextPassiveThreshold = passiveSlotCount < 5 ? [2,80,150,200].find(t => t > woodVal) : null;
          // 技能圖鑑只顯示自己擁有的技能（從背包中的 skill_book）
          const ownedSkillIds = new Set(invItems.filter(i => i.itemType === "skill_book").map(i => i.itemId));
          // 也加入已安裝的技能
          [...activeSlots, ...passiveSlots].forEach(s => { if (s) ownedSkillIds.add(s); });
          return (
            <div className="space-y-2">
              {/* 木屬性門檻說明 */}
              <div className="px-2.5 py-1.5 rounded-lg text-[10px]"
                style={{ background: "rgba(34,197,94,0.06)", borderLeft: "2px solid rgba(34,197,94,0.3)", color: "#64748b" }}>
                🌲 木屬性 {woodVal} → 主動{activeSlotCount}槽 / 被動{passiveSlotCount}槽 / 隱藏{hiddenSlotCount}槽
                {nextActiveThreshold && <span className="ml-2 text-green-500/60">（主動槽下一步解鎖：木{nextActiveThreshold}）</span>}
              </div>
              {/* 主動技能槽（動態數量） */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs text-slate-500">主動技能（{activeSlotCount}槽）</p>
                  <p className="text-[10px] text-slate-600">點擊槽位可選擇技能</p>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {Array.from({ length: activeSlotCount }).map((_, i) => {
                    const slotId = activeSlots[i];
                    const sk = slotId ? SKILL_DEFS[slotId] : null;
                    const c = sk ? WX_HEX[sk.element] ?? "#888" : "#334155";
                    const slotKey = (ACTIVE_SLOT_KEYS[i] ?? "skillSlot1") as "skillSlot1" | "skillSlot2" | "passiveSlot1";
                    const isLocked = i >= 4; // 木屬性解鎖的額外槽
                    return (
                      <button key={i}
                        onClick={() => { setSkillPickerSlot({ type: "active", index: i, slot: slotKey }); setShowSkillPicker(true); }}
                        className="px-2.5 py-2 rounded-xl border text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                        style={{ background: sk ? `${c}10` : isLocked ? "rgba(34,197,94,0.04)" : "rgba(255,255,255,0.02)", borderColor: sk ? `${c}30` : isLocked ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.07)" }}>
                        <p className="text-xs mb-0.5" style={{ color: isLocked ? "#22c55e80" : "#64748b" }}>主動 {i + 1}{isLocked ? " 🌲" : ""}</p>
                        {sk ? (
                          <div>
                            <div className="flex items-center gap-1 mb-0.5">
                              <span className="text-sm">{sk.icon}</span>
                              <p className="text-xs font-bold" style={{ color: c }}>{sk.name}</p>
                            </div>
                            <p className="text-[10px] text-slate-600 leading-tight">{sk.desc}</p>
                          </div>
                        ) : <p className="text-xs text-slate-700 italic">點擊安裝技能</p>}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* 被動技能槽（動態數量） */}
              <div>
                <p className="text-xs text-slate-500 mb-1.5">被動技能（{passiveSlotCount}槽）</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {Array.from({ length: passiveSlotCount }).map((_, i) => {
                    const slotId = passiveSlots[i];
                    const sk = slotId ? SKILL_DEFS[slotId] : null;
                    const c = sk ? WX_HEX[sk.element] ?? "#888" : "#334155";
                    const isLocked = i >= 2;
                    return (
                      <button key={i}
                        onClick={() => { setSkillPickerSlot({ type: "passive", index: i, slot: "passiveSlot1" }); setShowSkillPicker(true); }}
                        className="px-2.5 py-2 rounded-xl border text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                        style={{ background: sk ? `${c}10` : isLocked ? "rgba(34,197,94,0.04)" : "rgba(255,255,255,0.02)", borderColor: sk ? `${c}30` : isLocked ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.07)" }}>
                        <p className="text-xs mb-0.5" style={{ color: isLocked ? "#22c55e80" : "#64748b" }}>被動 {i + 1}{isLocked ? " 🌲" : ""}</p>
                        {sk ? (
                          <div>
                            <div className="flex items-center gap-1 mb-0.5">
                              <span className="text-sm">{sk.icon}</span>
                              <p className="text-xs font-bold" style={{ color: c }}>{sk.name}</p>
                            </div>
                            <p className="text-[10px] text-slate-600 leading-tight">{sk.desc}</p>
                          </div>
                        ) : <p className="text-xs text-slate-700 italic">點擊安裝技能</p>}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* 隱藏技能槽 */}
              <div>
                <p className="text-xs text-slate-500 mb-1.5">隱藏技能（{hiddenSlotCount}槽）</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {Array.from({ length: hiddenSlotCount }).map((_, i) => {
                    const isLocked = i >= 1;
                    return (
                      <div key={i} className="px-2.5 py-2 rounded-xl border"
                        style={{ background: isLocked ? "rgba(168,85,247,0.04)" : "rgba(255,255,255,0.02)", borderColor: isLocked ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.07)" }}>
                        <p className="text-xs mb-0.5" style={{ color: isLocked ? "#a855f780" : "#64748b" }}>隱藏 {i + 1}{isLocked ? " 🌲" : ""}</p>
                        <p className="text-xs text-slate-700 italic">需機緣觸發</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* 技能選擇全視窗（連動真實圖鑑資料庫） */}
        {showSkillPicker && skillPickerSlot && (
          <div className="fixed inset-0 z-[500] flex flex-col"
            style={{ background: "rgba(6,10,22,0.92)", backdropFilter: "blur(20px)" }}
            onClick={() => setShowSkillPicker(false)}>
            <div className="flex-1 overflow-y-auto p-4" onClick={e => e.stopPropagation()}>
              {/* 標題列 */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-100">技能圖鑑</h3>
                  <p className="text-xs text-slate-500">
                    {skillPickerSlot.type === "active" ? `安裝至主動槽 ${skillPickerSlot.index + 1}` : `安裝至被動槽 ${skillPickerSlot.index + 1}`}
                  </p>
                </div>
                <button onClick={() => setShowSkillPicker(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 border"
                  style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.1)" }}>✕</button>
              </div>
              {/* 五行篩選 */}
              <div className="flex gap-1.5 mb-4 flex-wrap">
                {["","wood","fire","earth","metal","water"].map(wx => (
                  <button key={wx} onClick={() => setSkillWuxingFilter(wx)}
                    className="px-3 py-1 rounded-full text-xs font-bold border transition-all"
                    style={skillWuxingFilter === wx
                      ? { background: WX_HEX[wx] ?? "#64748b", color: "#fff", borderColor: WX_HEX[wx] ?? "#64748b" }
                      : { background: "rgba(255,255,255,0.05)", color: "#94a3b8", borderColor: "rgba(255,255,255,0.1)" }}>
                    {wx ? `${WX_EMOJI[wx]}${WX_ZH[wx]}` : "全部"}
                  </button>
                ))}
              </div>
              {/* 技能列表 */}
              {skillCatalogQuery.isLoading ? (
                <p className="text-slate-500 text-center py-8">載入技能圖鑑中…</p>
              ) : (() => {
                // 只顯示玩家擁有的技能（skill_book 道具 + 已安裝的技能）
                const pickerOwnedIds = new Set(invItems.filter(i => i.itemType === "skill_book").map(i => i.itemId));
                const agentSlots = [agent?.skillSlot1, agent?.skillSlot2, agent?.skillSlot3, agent?.skillSlot4, agent?.passiveSlot1, agent?.passiveSlot2];
                agentSlots.forEach(s => { if (s) pickerOwnedIds.add(s); });
                const filteredSkills = (skillCatalogQuery.data ?? []).filter(sk => {
                  const typeOk = skillPickerSlot.type === "active"
                    ? sk.category === "active_combat"
                    : sk.category === "passive_combat" || sk.category === "life_gather" || sk.category === "craft_forge";
                  return typeOk && pickerOwnedIds.has(sk.skillId);
                });
                if (filteredSkills.length === 0) return (
                  <div className="text-center py-8">
                    <p className="text-slate-500">尚未擁有任何技能</p>
                    <p className="text-xs text-slate-600 mt-1">擊敗怪物或完成任務得到技能書</p>
                  </div>
                );
                return (
                <div className="grid grid-cols-2 gap-2">
                  {filteredSkills.map(sk => {
                    const wc = WX_HEX[sk.wuxing ?? ""] ?? "#64748b";
                    const isInstalling = installSkillMutation.isPending;
                    return (
                      <button key={sk.skillId}
                        disabled={isInstalling}
                        onClick={() => {
                          if (skillPickerSlot.slot) {
                            installSkillMutation.mutate({ skillId: sk.skillId, slot: skillPickerSlot.slot });
                          }
                        }}
                        className="flex items-start gap-2 p-3 rounded-xl border text-left transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                        style={{ background: `${wc}10`, borderColor: `${wc}30` }}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-0.5">
                            <p className="text-xs font-bold" style={{ color: wc }}>{sk.name}</p>
                            <span className="text-[9px] px-1 rounded" style={{ background: `${wc}20`, color: wc }}>{sk.tier}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-tight">{sk.description}</p>
                          {sk.mpCost > 0 && <p className="text-[9px] text-blue-400 mt-0.5">MP -{sk.mpCost}</p>}
                        </div>
                      </button>
                    );
                  })}
                </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ── 命格面板 ── */}
        {activePanel === "natal" && (() => {
          // 五行比例計算
          const wxVals = {
            wood:  agent?.wuxingWood  ?? 0,
            fire:  agent?.wuxingFire  ?? 0,
            earth: agent?.wuxingEarth ?? 0,
            metal: agent?.wuxingMetal ?? 0,
            water: agent?.wuxingWater ?? 0,
          };
          const wxTotal = Object.values(wxVals).reduce((a, b) => a + b, 0) || 1;
          const wxPct = Object.fromEntries(
            Object.entries(wxVals).map(([k, v]) => [k, Math.round((v / wxTotal) * 100)])
          ) as Record<string, number>;
          // 命格強度：主屬性占比
          const dominantPct = wxPct[agentElement] ?? 0;
          // SVG 圓餅圖計算
          const PIE_R = 36; const PIE_CX = 44; const PIE_CY = 44;
          const wxOrder = ["wood", "fire", "earth", "metal", "water"] as const;
          let cumulAngle = -90;
          const pieSlices = wxOrder.map(k => {
            const pct = wxPct[k] ?? 0;
            const angle = (pct / 100) * 360;
            const startAngle = cumulAngle;
            cumulAngle += angle;
            const toRad = (d: number) => (d * Math.PI) / 180;
            const x1 = PIE_CX + PIE_R * Math.cos(toRad(startAngle));
            const y1 = PIE_CY + PIE_R * Math.sin(toRad(startAngle));
            const x2 = PIE_CX + PIE_R * Math.cos(toRad(startAngle + angle));
            const y2 = PIE_CY + PIE_R * Math.sin(toRad(startAngle + angle));
            const large = angle > 180 ? 1 : 0;
            const path = pct >= 100
              ? `M ${PIE_CX} ${PIE_CY - PIE_R} A ${PIE_R} ${PIE_R} 0 1 1 ${PIE_CX - 0.001} ${PIE_CY - PIE_R} Z`
              : pct === 0 ? ""
              : `M ${PIE_CX} ${PIE_CY} L ${x1} ${y1} A ${PIE_R} ${PIE_R} 0 ${large} 1 ${x2} ${y2} Z`;
            return { key: k, path, color: WX_HEX[k] ?? "#888", pct };
          });
          return (
            <div className="space-y-2.5">
              {/* 命格格局名稱 + 命格% */}
              <div className="px-2.5 py-2 rounded-xl border flex items-center gap-3"
                style={{ background: `${ec}08`, borderColor: `${ec}28` }}>
                {/* 命格強度圓形指示器 */}
                <div className="relative shrink-0" style={{ width: 56, height: 56 }}>
                  <svg width="56" height="56" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                    <circle cx="28" cy="28" r="22" fill="none"
                      stroke={ec} strokeWidth="6"
                      strokeDasharray={`${(dominantPct / 100) * 138.2} 138.2`}
                      strokeLinecap="round"
                      transform="rotate(-90 28 28)" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xs font-bold" style={{ color: ec }}>{dominantPct}%</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 mb-0.5">命格格局</p>
                  <p className="text-sm font-bold" style={{ color: ec }}>{WX_ZH[agentElement] ?? "金"}命旅人</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-tight">
                    {agentElement === "wood" ? "採集力強，治癒力高" :
                     agentElement === "fire" ? "攻擊力強，鍛治力高" :
                     agentElement === "earth" ? "防穡力強，承重力高" :
                     agentElement === "metal" ? "命中力強，精煉力高" :
                     "魔攻強，尋寶力高"}
                  </p>
                </div>
              </div>

              {/* 五行圓餅圖 + 比例列表 */}
              <div className="rounded-xl border p-2.5"
                style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
                <p className="text-xs font-bold text-slate-500 mb-2">☘️ 五行比例（命格根源）</p>
                <div className="flex items-center gap-3">
                  {/* 圓餅圖 */}
                  <svg width="88" height="88" viewBox="0 0 88 88" className="shrink-0">
                    {pieSlices.map(s => s.path ? (
                      <path key={s.key} d={s.path} fill={s.color}
                        opacity={s.key === agentElement ? 1 : 0.6}
                        stroke="rgba(8,12,25,0.8)" strokeWidth="1.5" />
                    ) : null)}
                    <circle cx="44" cy="44" r="18" fill="rgba(8,12,25,0.9)" />
                    <text x="44" y="47" textAnchor="middle" fontSize="11" fontWeight="bold" fill={ec}>
                      {WX_ZH[agentElement] ?? "金"}
                    </text>
                  </svg>
                  {/* 列表 */}
                  <div className="flex-1 space-y-1">
                    {wxOrder.map(k => (
                      <div key={k} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: WX_HEX[k] ?? "#888" }} />
                        <span className="text-xs text-slate-400 shrink-0" style={{ minWidth: "14px" }}>{WX_ZH[k]}</span>
                        <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${wxPct[k] ?? 0}%`, background: WX_HEX[k] ?? "#888" }} />
                        </div>
                        <span className="text-xs font-bold tabular-nums shrink-0" style={{ color: WX_HEX[k] ?? "#888", minWidth: "28px", textAlign: "right" }}>{wxPct[k] ?? 0}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 命格基礎値（五行素質） */}
              <div className="rounded-xl border p-2.5 space-y-1.5"
                style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
                <p className="text-xs font-bold text-slate-500 mb-1.5">🔮 命格基礎値（五行素質）</p>
                <p className="text-xs text-slate-600 mb-2">各屬性上限 1000，預設總合 100</p>
                {[
                  { key: "wuxingWood",  icon: "🌿", label: "木",  color: "#22c55e" },
                  { key: "wuxingFire",  icon: "🔥", label: "火",  color: "#ef4444" },
                  { key: "wuxingEarth", icon: "🪨", label: "土",  color: "#f59e0b" },
                  { key: "wuxingMetal", icon: "⚡",    label: "金",  color: "#e2e8f0" },
                  { key: "wuxingWater", icon: "💧", label: "水",  color: "#38bdf8" },
                ].map(({ key, icon, label, color }) => {
                  const val = (agent as Record<string, number> | null | undefined)?.[key] ?? 0;
                  return (
                    <MiniAttrBar key={key} icon={icon} label={label} value={val} color={color} max={1000} />
                  );
                })}
              </div>

              {/* 稱號系統 */}
              <div className="rounded-xl border p-2.5"
                style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
                <p className="text-xs font-bold text-slate-500 mb-2">🏅 稱號</p>
                <div className="flex flex-wrap gap-1.5">
                  {/* 命格稱號（主屬性決定） */}
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold"
                    style={{ background: `${ec}18`, color: ec, border: `1px solid ${ec}40` }}>
                    {agentElement === "wood" ? "🌿 木行先天" :
                     agentElement === "fire" ? "🔥 火行先天" :
                     agentElement === "earth" ? "🪨 土行先天" :
                     agentElement === "metal" ? "⚡ 金行先天" : "💧 水行先天"}
                  </span>
                  {/* 等級稱號 */}
                  {agentLevel >= 5 && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold"
                      style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
                      ⭐ 天命旅人
                    </span>
                  )}
                  {agentLevel >= 10 && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold"
                      style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.3)" }}>
                      🔮 命格深造
                    </span>
                  )}
                  <span className="px-2.5 py-1 rounded-full text-xs text-slate-600 border border-slate-800">
                    更多稱號開發中…
                  </span>
                </div>
              </div>

              {/* 加成來源說明 */}
              <div className="px-2.5 py-2 rounded-xl border"
                style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
                <p className="text-xs text-slate-500 mb-1.5">加成來源</p>
                <div className="space-y-1 text-xs text-slate-600">
                  <p>🔮 八字命格 → 基礎能力値（已套用）</p>
                  <p>⚔️ 裝備詞條 → 額外加成（開發中）</p>
                  <p>🎯 技能 Combo → 特殊效果（開發中）</p>
                  <p>🐾 寵物加成 → 屬性提升（開發中）</p>
                  <p>📅 流日加成 → 今日屬性浮動（已套用）</p>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ─── 密店彈窗組件
// ─────────────────────────────────────────────────────────────
function HiddenShopModal({ onClose, agentGold, agentStones }: { onClose: () => void; agentGold: number; agentStones: number }) {
  const utils = trpc.useUtils();
  const { data: shopData, isLoading } = trpc.gameWorld.getHiddenShopItems.useQuery(undefined, {
    staleTime: 0,
    refetchOnMount: true,
  });
  const buyMutation = trpc.gameWorld.buyHiddenShopItem.useMutation({
    onSuccess: (res) => {
      toast.success(`🔮 密店購買成功！獲得「${res.itemName}」x${res.quantity}`);
      utils.gameWorld.getOrCreateAgent.invalidate();
      utils.gameWorld.getHiddenShopItems.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const RARITY_COLOR: Record<string, string> = {
    common: "#94a3b8",
    rare: "#60a5fa",
    epic: "#a78bfa",
    legendary: "#f59e0b",
  };
  const RARITY_ZH: Record<string, string> = {
    common: "普通",
    rare: "稀有",
    epic: "史詩",
    legendary: "傳說",
  };
  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(16px)" }}
      onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl flex flex-col overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0a0a1a 0%, #12082a 50%, #0a1020 100%)",
          border: "1px solid rgba(167,139,250,0.4)",
          boxShadow: "0 0 80px rgba(167,139,250,0.25), 0 0 30px rgba(245,158,11,0.15), 0 20px 40px rgba(0,0,0,0.7)",
          maxHeight: "85vh",
        }}
        onClick={e => e.stopPropagation()}>
        {/* 標題列 */}
        <div className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "rgba(167,139,250,0.2)" }}>
          <div>
            <h2 className="text-xl font-bold" style={{ color: "#f59e0b" }}>✨ 神秘密店</h2>
            <p className="text-xs text-slate-500 mt-0.5">限時出現的神秘商人，提供稀有商品</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-slate-500">金幣</div>
              <div className="text-sm font-bold text-yellow-400">🪙 {agentGold.toLocaleString()}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">靈石</div>
              <div className="text-sm font-bold text-sky-400">💎 {agentStones.toLocaleString()}</div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xl px-2">✕</button>
          </div>
        </div>
        {/* 內容 */}
        <div className="overflow-y-auto flex-1 px-4 py-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-slate-500 text-sm animate-pulse">🔮 感知密店中…</div>
            </div>
          ) : !shopData?.found ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="text-4xl">🔮</div>
              <p className="text-slate-500 text-sm">未感知到密店商品</p>
              <p className="text-slate-600 text-xs">提升尋寶力可增加感知機率</p>
            </div>
          ) : shopData.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="text-4xl">📦</div>
              <p className="text-slate-500 text-sm">密店今日無貨</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-slate-500 pb-1">
                🔮 密店已出現！共 {shopData.items.length} 件商品
              </div>
              {shopData.items.map((item: { id: number; displayName: string; description?: string | null; currencyType: string; price: number; quantity: number; rarity: string }) => {
                const rarityColor = RARITY_COLOR[item.rarity] ?? "#94a3b8";
                const canAfford = item.currencyType === "coins" ? agentGold >= item.price : agentStones >= item.price;
                return (
                  <div key={item.id}
                    className="rounded-xl p-3 border"
                    style={{
                      background: `${rarityColor}08`,
                      borderColor: `${rarityColor}30`,
                      boxShadow: item.rarity === "legendary" ? `0 0 20px ${rarityColor}20` : "none",
                    }}>
                    <div className="flex items-start gap-3">
                      <div className="text-2xl shrink-0">
                        {item.currencyType === "stones" ? "💎" : item.rarity === "legendary" ? "✨" : item.rarity === "epic" ? "🔮" : "📦"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-200">{item.displayName}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                            style={{ background: `${rarityColor}20`, color: rarityColor }}>
                            {RARITY_ZH[item.rarity] ?? item.rarity}
                          </span>
                          {item.quantity > 1 && (
                            <span className="text-xs text-slate-500">x{item.quantity}</span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm font-bold" style={{ color: item.currencyType === "coins" ? "#f59e0b" : "#38bdf8" }}>
                            {item.currencyType === "coins" ? "🪙" : "💎"} {item.price.toLocaleString()}
                          </span>
                          <button
                            onClick={() => buyMutation.mutate({ itemId: item.id })}
                            disabled={!canAfford || buyMutation.isPending}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-[1.03] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{
                              background: canAfford ? `linear-gradient(135deg, ${rarityColor}cc, ${rarityColor})` : "rgba(100,100,120,0.2)",
                              color: canAfford ? "#000" : "#475569",
                            }}>
                            {buyMutation.isPending ? "⏳" : canAfford ? "購買" : "不足"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {/* 底部提示 */}
        <div className="px-5 py-3 border-t text-center"
          style={{ borderColor: "rgba(167,139,250,0.15)" }}>
          <p className="text-xs text-slate-600">密店商品每次感知都是隨機的 · 提升尋寶力可增加感知機率</p>
        </div>
      </div>
    </div>
  );
}

// ─── 事件日誌抒屉
// ─────────────────────────────────────────────────────────────
function EventLogDrawer({
  events, logTab, setLogTab, isOpen, onClose, anchorBottom,
}: {
  events: Array<{ id: number; eventType: string; message: string; createdAt: string; detail?: Record<string, unknown> | null }> | undefined;
  logTab: "all" | "combat" | "rogue";
  setLogTab: (t: "all" | "combat" | "rogue") => void;
  isOpen: boolean;
  onClose: () => void;
  anchorBottom?: number; // px from bottom
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [todayOnly, setTodayOnly] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // 最新在上，每次更新自動滾到頂部
    if (isOpen && listRef.current) listRef.current.scrollTop = 0;
  }, [isOpen, events]);

  if (!isOpen) return null;

  // 後端已按 desc(createdAt) 排序（最新在前），直接取前 20 條
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const allEvents = events ? events.slice(0, 60) : [];
  const filteredEvents = todayOnly
    ? allEvents.filter(ev => new Date(ev.createdAt).getTime() >= todayStart.getTime())
    : allEvents;
  const displayEvents = filteredEvents.slice(0, 20);

  // 重要事件判斷：升級或傳說摀落
  function isImportantEvent(ev: { message: string; detail?: Record<string, unknown> | null }): { type: 'levelup' | 'legendary' | null } {
    if (ev.message.includes('升級') || ev.message.includes('Level Up') || ev.message.includes('等級成長')) return { type: 'levelup' };
    if (ev.detail && (ev.detail.tier === 'legendary' || ev.detail.tier === 'epic' || ev.detail.tier === 'rare')) return { type: 'legendary' };
    if (ev.message.includes('傳說') || ev.message.includes('史詩級') || ev.message.includes('精英級')) return { type: 'legendary' };
    return { type: null };
  }

  return (
    <div className="fixed z-50 left-2 flex flex-col"
      style={{ bottom: `${anchorBottom ?? 72}px`, width: "min(340px, calc(100vw - 16px))" }}
      onClick={e => e.stopPropagation()}>
      <div className="rounded-2xl flex flex-col border"
        style={{ background: "rgba(6,10,22,0.98)", backdropFilter: "blur(16px)", borderColor: "rgba(245,158,11,0.3)", maxHeight: "50vh" }}>
        <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-1.5">
            <span className="text-sm">📜</span>
            <span className="text-xs font-bold text-amber-300">冒險日誌</span>
          </div>
          <div className="flex items-center gap-1.5">
            {/* 今日笻選 */}
            <button
              onClick={() => setTodayOnly(t => !t)}
              className="px-1.5 py-0.5 rounded-full text-xs border transition-all"
              style={{
                background: todayOnly ? "rgba(56,189,248,0.15)" : "transparent",
                borderColor: todayOnly ? "rgba(56,189,248,0.4)" : "rgba(255,255,255,0.1)",
                color: todayOnly ? "#38bdf8" : "#64748b",
              }}
            >
              📅今日
            </button>
            {(["all", "combat", "rogue"] as const).map(tab => (
              <button key={tab} onClick={() => setLogTab(tab)}
                className="px-1.5 py-0.5 rounded-full text-xs border transition-all"
                style={{
                  background: logTab === tab ? "rgba(245,158,11,0.15)" : "transparent",
                  borderColor: logTab === tab ? "rgba(245,158,11,0.4)" : "rgba(255,255,255,0.1)",
                  color: logTab === tab ? "#f59e0b" : "#64748b",
                }}>
                {tab === "all" ? "全部" : tab === "combat" ? "戰鬥" : "奇遇"}
              </button>
            ))}
            <button onClick={onClose} className="text-slate-600 hover:text-slate-400 text-base px-1">✕</button>
          </div>
        </div>
        <div ref={listRef} className="overflow-y-auto px-3 py-2 space-y-1 font-mono flex-1">
          {displayEvents.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-slate-600 text-xs">等待旅人的第一個事件…</p>
            </div>
          ) : displayEvents.map(ev => {
            const detail = ev.detail;
            const hasCombat = Boolean(detail && detail.phase === "result" && detail.rounds);
            const isExp = expandedId === ev.id;
            const important = isImportantEvent(ev);
            return (
              <div
                key={ev.id}
                className="flex flex-col gap-0.5 text-xs leading-relaxed"
                style={important.type === 'levelup' ? {
                  background: "rgba(245,158,11,0.08)",
                  borderLeft: "2px solid rgba(245,158,11,0.6)",
                  borderRadius: "4px",
                  paddingLeft: "4px",
                } : important.type === 'legendary' ? {
                  background: "rgba(168,85,247,0.08)",
                  borderLeft: "2px solid rgba(168,85,247,0.6)",
                  borderRadius: "4px",
                  paddingLeft: "4px",
                } : undefined}
              >
                <div className="flex gap-1.5 cursor-pointer py-0.5"
                  onClick={() => hasCombat && setExpandedId(isExp ? null : ev.id)}>
                  {/* 重要事件圖示 */}
                  {important.type === 'levelup' && <span className="shrink-0 text-amber-400" title="升級">⭐</span>}
                  {important.type === 'legendary' && <span className="shrink-0 text-purple-400" title="傳說摀落">💎</span>}
                  <span className="text-slate-700 shrink-0 tabular-nums text-[10px] pt-0.5">
                    {new Date(ev.createdAt).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="shrink-0">{EV_ICON[ev.eventType] ?? "•"}</span>
                  <span className="flex-1" style={{ color: EV_COLOR[ev.eventType] ?? "rgba(148,163,184,0.85)" }}>{ev.message}</span>
                  {hasCombat && <span className="text-slate-600 text-[10px] shrink-0">{isExp ? "▲" : "▼"}</span>}
                </div>
                {isExp && hasCombat && detail && (
                  <div className="ml-6 mt-1 rounded-lg border border-slate-700/60 bg-slate-900/60 p-2 text-[10px] space-y-1.5">
                    <div className="flex items-center gap-1.5 border-b border-slate-700/40 pb-1">
                      <span className="text-amber-400 font-bold">⚔️ 戰鬥摘要</span>
                      {detail.monsterRace != null && (
                        <span className="px-1.5 py-0.5 rounded bg-purple-900/50 text-purple-300">{`${detail.monsterRace}`}</span>
                      )}
                      <span className={`ml-auto font-bold ${detail.won ? 'text-green-400' : 'text-red-400'}`}>
                        {detail.won ? '✓ 勝利' : '✗ 敗退'}
                      </span>
                    </div>
                    {((detail.rounds as Array<Record<string, unknown>>) ?? []).length > 0 && (
                      <div className="space-y-1">
                        <p className="text-slate-400 font-medium">⚔️ 戰鬥過程（{(detail.rounds as unknown[]).length} 回合）</p>
                        {(detail.rounds as Array<Record<string, unknown>>).map((r, i) => {
                          const desc = r.description as string | undefined;
                          const skillName = r.agentSkillName as string | undefined;
                          const skillType = r.agentSkillType as string | undefined;
                          const isCrit = r.isCritical as boolean | undefined;
                          const dodged = r.agentDodged as boolean | undefined;
                          const blocked = r.agentBlocked as boolean | undefined;
                          const monsterDodged = r.monsterDodged as boolean | undefined;
                          const monsterBlocked = r.monsterBlocked as boolean | undefined;
                          const monsterCrit = r.monsterIsCritical as boolean | undefined;
                          const healAmt = r.agentHealAmount as number | undefined;
                          const agentHpAfter = r.agentHpAfter as number | undefined;
                          const monsterHpAfter = r.monsterHpAfter as number | undefined;
                          const agentAtk = r.agentAtk as number | undefined;
                          const monsterAtk = r.monsterAtk as number | undefined;
                          const monsterSkillName = r.monsterSkillName as string | undefined;
                          return (
                            <div key={i} className="rounded bg-slate-800/60 p-1.5 space-y-0.5">
                              <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                                <span className="text-amber-500/80">第 {i+1} 回合</span>
                                {skillType === "heal" && <span className="text-green-400 bg-green-900/30 px-1 rounded">治癒</span>}
                                {isCrit && <span className="text-yellow-300 bg-yellow-900/30 px-1 rounded">暴擊！</span>}
                                {monsterCrit && <span className="text-red-400 bg-red-900/30 px-1 rounded">被暴擊</span>}
                              </div>
                              {desc ? (
                                <p className="text-slate-300 text-[10px] leading-relaxed">{desc}</p>
                              ) : (
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-cyan-400 shrink-0">旅人</span>
                                    {skillType === "heal" ? (
                                      <span className="text-green-400">{skillName ?? "治癒技能"} 治癒 +{healAmt}</span>
                                    ) : monsterDodged ? (
                                      <span className="text-slate-500">{skillName ?? "普攻"}（{detail.monsterName as string ?? "怪物"}閃避）</span>
                                    ) : monsterBlocked ? (
                                      <span className="text-blue-400">{skillName ?? "普攻"} 造成 {agentAtk} 傷害（被格擋）</span>
                                    ) : (
                                      <span className={isCrit ? "text-yellow-300 font-bold" : "text-cyan-300"}>{skillName ?? "普攻"} 造成 {agentAtk} 傷害{isCrit ? "！" : ""}</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-red-400 shrink-0">{detail.monsterName as string ?? "怪物"}</span>
                                    {dodged ? (
                                      <span className="text-green-400">閃避了 {monsterSkillName ?? "攻擊"}</span>
                                    ) : blocked ? (
                                      <span className="text-blue-400">格擋了 {monsterSkillName ?? "攻擊"}（傷害減半）</span>
                                    ) : (
                                      <span className={monsterCrit ? "text-red-300 font-bold" : "text-orange-400"}>{monsterSkillName ?? "攻擊"} 造成 {monsterAtk} 傷害{monsterCrit ? "！" : ""}</span>
                                    )}
                                  </div>
                                </div>
                              )}
                              <div className="flex gap-3 text-[9px] text-slate-500 border-t border-slate-700/30 pt-0.5">
                                <span>旅人 HP: {agentHpAfter}</span>
                                <span>{detail.monsterName as string ?? "怪物"} HP: {monsterHpAfter}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
{(() => {
                      const wxDesc = detail.wuxingBoostDesc as string | undefined;
                      const rcDesc = detail.raceBoostDesc as string | undefined;
                      return (wxDesc || rcDesc) ? (
                        <div className="space-y-0.5 border-t border-slate-700/40 pt-1">
                          {wxDesc && <p className="text-yellow-400/80">★ {wxDesc}</p>}
                          {rcDesc && <p className="text-purple-400/80">◆ {rcDesc}</p>}
                        </div>
                      ) : null;
                    })()}
                    <div className="flex flex-wrap gap-2 border-t border-slate-700/40 pt-1">
                      <span className="text-green-400">+{String(detail.expGained ?? 0)} EXP</span>
                      <span className="text-yellow-400">+{String(detail.goldGained ?? 0)} 金幣</span>
                      {(detail.lootItems as string[] ?? []).length > 0 && (
                        <span className="text-cyan-400">🎁 {(detail.lootItems as string[]).join(", ")}</span>
                      )}
                    </div>
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
  const [showTeleport, setShowTeleport] = useState(false);
  const [nodeInfoOpen, setNodeInfoOpen] = useState(true);
  const [tickRunning, setTickRunning] = useState(false);
  const [charPanelOpen, setCharPanelOpen] = useState(false); // 手機版底部抗屉：預設收合（地圖優先）
  // 音效開關
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const toggleSound = useCallback(() => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  }, [soundOn]);
  // 升級/傳說摩落特效
  const [levelUpEffect, setLevelUpEffect] = useState<{ agentName: string; newLevel: number } | null>(null);
  const [legendaryEffect, setLegendaryEffect] = useState<{ agentName: string; equipId: string; tier: string } | null>(null);
  // 戰鬥視窗
  const [combatWindowData, setCombatWindowData] = useState<CombatWindowData | null>(null);
  // Tick 進度條
  const [tickProgress, setTickProgress] = useState(0); // 0-100
  const tickProgressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mapRef = useRef<LeafletMapHandle>(null);
  const utils = trpc.useUtils();
  // ── Widget 位置記憶（桌機版） ──
  // 五大浮動區塊的預設位置（相對於地圖容器，單位 px）
  const WIDGET_DEFAULTS: Record<string, { x: number; y: number }> = {
    "city-panel":     { x: 16,  y: 16  },   // 左上：城市資訊
    "status-bar":     { x: 16,  y: 80  },   // 左上下方：HP/MP/AP/體力
    "divine-panel":   { x: 16,  y: 160 },   // 左中：靈相干預
    "strategy-panel": { x: 16,  y: 260 },   // 左中下：行動策略
    "event-log":      { x: 16,  y: 380 },   // 左下：日誌
  };
  const [widgetLayout, setWidgetLayout] = useState<Record<string, { x: number; y: number }>>(WIDGET_DEFAULTS);
  const saveLayoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveWidgetLayout = trpc.gameWorld.saveWidgetLayout.useMutation();
  const { data: savedLayout } = trpc.gameWorld.getWidgetLayout.useQuery(undefined, { enabled: !!user, staleTime: Infinity });
  // 載入儲存的 widget 位置（用儲存的覆蓋預設，未儲存的使用預設）
  useEffect(() => {
    if (savedLayout) {
      const merged = { ...WIDGET_DEFAULTS, ...(savedLayout as Record<string, { x: number; y: number }>) };
      setWidgetLayout(merged);
    }
  }, [savedLayout]);
  // 拖拉結束後防抖儲存（1.5 秒後才送 API）
  const handleWidgetMove = useCallback((id: string, pos: { x: number; y: number }) => {
    setWidgetLayout(prev => ({ ...prev, [id]: pos }));
    if (saveLayoutTimer.current) clearTimeout(saveLayoutTimer.current);
    saveLayoutTimer.current = setTimeout(() => {
      setWidgetLayout(curr => { saveWidgetLayout.mutate({ layout: curr }); return curr; });
    }, 1500);
  }, [saveWidgetLayout]);

  const { data: agentData, isLoading: agentLoading } = trpc.gameWorld.getOrCreateAgent.useQuery(
    undefined, { enabled: !!user, refetchInterval: 30000 });
  const { data: statusData, refetch: refetchStatus } = trpc.gameWorld.getAgentStatus.useQuery(
    undefined, { enabled: !!user && !agentData?.needsNaming, refetchInterval: 30000 });
  const { data: eventLog, refetch: refetchLog } = trpc.gameWorld.getEventLog.useQuery(
    { limit: 60, eventType: logTab === "all" ? undefined : logTab === "combat" ? "combat" : "rogue" },
    { enabled: !!user && !agentData?.needsNaming, refetchInterval: 8000 });
  const { data: mapNodes } = trpc.gameWorld.getMapNodes.useQuery(undefined, { staleTime: Infinity });
  const { data: equippedData } = trpc.gameAvatar.getEquipped.useQuery(undefined, { enabled: !!user, staleTime: 60000 });
  const { data: balanceData } = trpc.gameShop.getBalance.useQuery(undefined, { enabled: !!user, staleTime: 30000 });
  const { data: dailyData } = trpc.oracle.dailyEnergy.useQuery(undefined, { enabled: !!user, staleTime: 300000 });
  const { data: onlineStats } = trpc.gameWorld.getOnlineStats.useQuery(undefined, { refetchInterval: 60000 });

  const agent = agentData?.agent as AgentData | null | undefined;
  const currentNodeId = agent?.currentNodeId ?? "tp-zhongzheng";
  const { data: nodeInfoData } = trpc.gameWorld.getNodeInfo.useQuery(
    { nodeId: currentNodeId },
    { enabled: !!currentNodeId, refetchInterval: 10000 }
  );

  const setStrategy    = trpc.gameWorld.setStrategy.useMutation({
    onSuccess: (_, vars) => {
      utils.gameWorld.getAgentStatus.invalidate();
      const s = STRATEGIES.find(x => x.id === vars.strategy);
      if (vars.strategy === "rest") {
        toast.success(`😴 已切換為休息模式`, {
          description: "旅人正在休息回血，HP/MP 回滿後自動切回前一個行動",
          duration: 3000,
        });
      } else {
        toast.success(`已切換為${s?.label ?? vars.strategy}模式`, {
          description: s ? `${s.icon} 旅人將以「${s.label}」策略行動` : undefined,
          duration: 2500,
        });
      }
    },
  });
  const divineHeal     = trpc.gameWorld.divineHeal.useMutation({ onSuccess: () => { refetchStatus(); refetchLog(); } });
  const divineEye      = trpc.gameWorld.divineEye.useMutation({ onSuccess: () => { refetchStatus(); refetchLog(); } });
  const divineStamina  = trpc.gameWorld.divineStamina.useMutation({ onSuccess: () => { refetchStatus(); refetchLog(); } });
  // 記錄上次 Tick 前的角色狀態，用於比對變化
  const prevAgentRef = useRef<AgentData | null | undefined>(null);
  const triggerTick    = trpc.gameWorld.triggerTick.useMutation({
    onMutate: () => {
      // 儲存目前狀態供比對
      prevAgentRef.current = agent;
      // Tick 執行音效
      safePlay(playTickSound);
      // 啟動 Tick 進度條
      setTickProgress(0);
      if (tickProgressRef.current) clearInterval(tickProgressRef.current);
      tickProgressRef.current = setInterval(() => {
        setTickProgress(prev => {
          if (prev >= 90) { // 最高到 90%，等待實際完成
            if (tickProgressRef.current) clearInterval(tickProgressRef.current);
            return 90;
          }
          return prev + 10;
        });
      }, 200);
    },
    onSuccess: (result) => {
      // 進度條完成
      if (tickProgressRef.current) clearInterval(tickProgressRef.current);
      setTickProgress(100);
      setTimeout(() => setTickProgress(0), 600);

      refetchStatus();
      refetchLog();

      // 升級特效（只顯示自己的升級）
      const myLevelUp = (result.levelUps ?? []).find(
        (lu: { agentId: number; agentName: string; newLevel: number }) => lu.agentId === agent?.id
      );
      if (myLevelUp) {
        setLevelUpEffect({ agentName: myLevelUp.agentName, newLevel: myLevelUp.newLevel });
        setTimeout(() => setLevelUpEffect(null), 5000);
        // 升級音效
        safePlay(playLevelUpSound);
      }

      // 傳說摀落特效（只顯示自己的摀落）
      const myLegendary = (result.legendaryDrops ?? []).find(
        (ld: { agentId: number; agentName: string; equipId: string; tier: string }) => ld.agentId === agent?.id
      );
      if (myLegendary && !myLevelUp) { // 升級優先於傳說摀落
        setLegendaryEffect({ agentName: myLegendary.agentName, equipId: myLegendary.equipId, tier: myLegendary.tier });
        setTimeout(() => setLegendaryEffect(null), 4000);
        // 傳說音效
        safePlay(playLegendarySound);
      }

      // 展示 Tick 結果 Toast
      if (result.events > 0 && !myLevelUp && !myLegendary) {
        toast.success(`✨ 旅人行動完成`, {
          description: `處理了 ${result.events} 個事件`,
          duration: 2000,
        });
      }
      // 戰鬥視窗：只要有 lastCombat 資料就顯示戰鬥視窗
      // Bug 7 fix: 移除 agentId 比對（agent?.id 可能為 undefined 導致永遠不觸發）
      if (result.lastCombat) {
        setCombatWindowData(result.lastCombat as CombatWindowData);
      }
      // 偵測休息完成後自動切回策略
      const prevStrategy = prevAgentRef.current?.strategy;
      const newStrategy = agent?.strategy;
      if (prevStrategy === "rest" && newStrategy && newStrategy !== "rest") {
        const s = STRATEGIES.find(x => x.id === newStrategy);
        toast.success(`✅ 已回滿，自動切回「${s?.label ?? newStrategy}」模式`, {
          description: `${s?.icon ?? ""} HP/MP 已回滿，繼續行動！`,
          duration: 3000,
        });
      }
    },
    onError: () => {
      if (tickProgressRef.current) clearInterval(tickProgressRef.current);
      setTickProgress(0);
    },
  });
  const setTeleport = trpc.gameWorld.setTeleport.useMutation({
    onSuccess: (data) => {
      setShowTeleport(false);
      if (data.success) {
        utils.gameWorld.getOrCreateAgent.invalidate();
        utils.gameWorld.getAgentStatus.invalidate();
        refetchLog();
        // 地圖飛至目標節點
        if (data.targetNode?.id) mapRef.current?.highlightNode(data.targetNode.id);
      }
    },
  });

  // 修復 6：自動執行直到體力歸零，體力不足時自動切換為休息策略
  const autoExecRef = useRef(false); // 是否正在自動執行

  const handleTickToggle = useCallback(() => {
    if (tickRunning) {
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
      setTickRunning(false);
      autoExecRef.current = false;
    } else {
      autoExecRef.current = true;
      triggerTick.mutate();
      tickIntervalRef.current = setInterval(() => {
        // 每次 Tick 前檢查體力（直接從 statusData 取得，避免引用對象變更問題）
        const curStaminaInfo = statusData?.staminaInfo as { current?: number } | undefined;
        const curStamina = curStaminaInfo?.current ?? agent?.stamina ?? 100;
        const curStrategy = agent?.strategy ?? "explore";
        // Bug 6 fix: 體力 < 5 時自動暫停 Tick（對應一次行動消耗 5 體力）
        if (curStamina < 5) {
          if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
          tickIntervalRef.current = null;
          setTickRunning(false);
          autoExecRef.current = false;
          if (curStrategy !== "rest") {
            setStrategy.mutate({ strategy: "rest" });
            toast.info("😴 體力不足！自動暫停行動並切換「休息」模式", {
              description: "體力將每 30 分鐘自動回復 30 點，回復後可再次開始行動",
              duration: 5000,
            });
          } else {
            toast.info("😴 體力不足！行動已暫停", {
              description: "體力將每 30 分鐘自動回復 30 點，回復後可再次開始行動",
              duration: 5000,
            });
          }
        } else {
          triggerTick.mutate();
        }
      }, 5 * 1000); // 每 5 秒執行一次 Tick
      setTickRunning(true);
    }
  }, [tickRunning, triggerTick, statusData, agent?.stamina, agent?.strategy, setStrategy]);

  useEffect(() => {
    return () => { if (tickIntervalRef.current) clearInterval(tickIntervalRef.current); };
  }, []);

  // 成就解鎖通知
  const [achievementEffect, setAchievementEffect] = useState<{ name: string; icon: string; desc: string } | null>(null);

  // WebSocket 連線（地圖即時狀態 + 廣播 + 成就）
  const { status: wsStatus } = useGameWebSocket({
    agentId: agent?.id ?? null,
    agentName: agent?.agentName ?? null,
    onMessage: (msg) => {
      if (msg.type === "map_update") {
        utils.gameWorld.getNodeInfo.invalidate();
        utils.gameWorld.getAgentStatus.invalidate();
      } else if (msg.type === "world_event") {
        utils.gameWorld.getBroadcast.invalidate();
        utils.gameWorld.getWorldState.invalidate();
      } else if (msg.type === "tick_event") {
        const payload = msg.payload as { levelUps?: Array<{ agentId: number; agentName: string; newLevel: number }>; legendaryDrops?: Array<{ agentId: number; agentName: string; equipId: string; tier: string }> };
        const othersLevelUp = (payload.levelUps ?? []).filter((lu: { agentId: number }) => lu.agentId !== agent?.id);
        if (othersLevelUp.length > 0) {
          const lu = othersLevelUp[0] as { agentName: string; newLevel: number };
          toast.success(`${lu.agentName} 升級到 Lv.${lu.newLevel}`, { duration: 3000 });
        }
      } else if (msg.type === "achievement") {
        const payload = msg.payload as { agentId: number; name: string; icon: string; desc: string };
        if (payload.agentId === agent?.id) {
          setAchievementEffect({ name: payload.name, icon: payload.icon, desc: payload.desc });
          setTimeout(() => setAchievementEffect(null), 5000);
        }
      }
    },
    enabled: !!agent?.id,
  });

  const [showNaming, setShowNaming] = useState(false);
  const [showStrategyPanel, setShowStrategyPanel] = useState(false);
  const [showDivinePanel, setShowDivinePanel] = useState(false);
  const [showQuickTeleport, setShowQuickTeleport] = useState(false);
  const [selectedTeleportNode, setSelectedTeleportNode] = useState<string | null>(null);
  const [showHiddenShopModal, setShowHiddenShopModal] = useState(false);
  const [dismissedBroadcasts, setDismissedBroadcasts] = useState<Set<number>>(new Set());

  // 全服廣播輪詢（20 秒一次）
  const { data: broadcastData } = trpc.gameWorld.getBroadcast.useQuery(undefined, {
    refetchInterval: 20000,
    staleTime: 15000,
  });
  const activeBroadcasts = (broadcastData ?? []).filter(
    (b: { id: number }) => !dismissedBroadcasts.has(b.id)
  );

  // 世界狀態輪詢（隱藏節點發光）
  const { data: worldState } = trpc.gameWorld.getWorldState.useQuery(undefined, {
    refetchInterval: 30000,
    staleTime: 25000,
  });
  // 密店發光節點：從實際密店實例查詢（每 30 秒更新）
  const { data: activeShopData } = trpc.gameWorld.getActiveHiddenShopNodes.useQuery(undefined, {
    refetchInterval: 30000,
    staleTime: 25000,
  });
  const hiddenNodeIds = (activeShopData?.nodes ?? []).map(n => n.nodeId);
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

  // 尋寶力計算（用於隱藏商店感知）
  // V14：所有人都有機率感知密店，尋寶力只影響機率高低
  const treasureHunting = agent?.treasureHunting ?? 20;
  // 尋寶力 >= 60：高機率感知；20-59：低機率；< 20：極低機率
  // 密店按鈕對所有人開放，只是顯示不同的機率提示
  const hiddenShopTier = treasureHunting >= 80 ? "high" : treasureHunting >= 50 ? "mid" : treasureHunting >= 30 ? "low" : "minimal";
  const hiddenShopLabel = hiddenShopTier === "high" ? "密店感知強" : hiddenShopTier === "mid" ? "偶有感知" : hiddenShopTier === "low" ? "微弱感知" : "感知微弱";
  const hiddenShopColor = hiddenShopTier === "high" ? "#f59e0b" : hiddenShopTier === "mid" ? "#a78bfa" : hiddenShopTier === "low" ? "#60a5fa" : "#475569";

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

  // 廣播訊息配色
  const BROADCAST_STYLES: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    info:        { bg: "rgba(56,189,248,0.12)",  border: "rgba(56,189,248,0.4)",  text: "#38bdf8", icon: "📢" },
    warning:     { bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.4)",  text: "#f59e0b", icon: "⚠️" },
    event:       { bg: "rgba(168,85,247,0.12)",  border: "rgba(168,85,247,0.4)",  text: "#a855f7", icon: "🎉" },
    maintenance: { bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.4)",   text: "#ef4444", icon: "🔧" },
  };

  return (
    <GameTabLayout activeTab="world">
      {/* Tick 進度條 */}
      {tickProgress > 0 && (
        <div className="fixed top-0 left-0 right-0 z-[999] h-[3px] overflow-hidden">
          <div
            className="h-full transition-all duration-300 ease-out"
            style={{
              width: `${tickProgress}%`,
              background: "linear-gradient(90deg, #f59e0b, #ef4444, #a855f7)",
              boxShadow: "0 0 8px rgba(245,158,11,0.8)",
            }}
          />
        </div>
      )}

      {/* 升級全螢幕特效 */}
      {levelUpEffect && (
        <div
          className="fixed inset-0 z-[900] flex items-center justify-center pointer-events-none"
          style={{ animation: "fadeInOut 5s ease-in-out forwards" }}
        >
          {/* 金色光芒背景 */}
          <div className="absolute inset-0" style={{
            background: "radial-gradient(ellipse at center, rgba(245,158,11,0.3) 0%, rgba(239,68,68,0.15) 40%, transparent 70%)",
            animation: "pulseGlow 1s ease-in-out infinite alternate",
          }} />
          {/* 升級內容卡片 */}
          <div className="relative flex flex-col items-center gap-4 px-8 py-6 rounded-3xl"
            style={{
              background: "linear-gradient(135deg, rgba(15,20,40,0.95) 0%, rgba(30,15,60,0.95) 100%)",
              border: "2px solid rgba(245,158,11,0.8)",
              boxShadow: "0 0 60px rgba(245,158,11,0.5), 0 0 120px rgba(239,68,68,0.3), inset 0 0 30px rgba(245,158,11,0.1)",
              backdropFilter: "blur(20px)",
              animation: "scaleIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards",
            }}
          >
            <div className="text-6xl" style={{ filter: "drop-shadow(0 0 20px rgba(245,158,11,1))" }}>⬆️</div>
            <div className="text-center">
              <div className="text-amber-400 text-sm font-medium tracking-widest mb-1">✨ 天命展开 ✨</div>
              <div className="text-white text-2xl font-bold">{levelUpEffect.agentName}</div>
              <div className="text-amber-300 text-lg mt-1">將至 <span className="text-3xl font-bold text-amber-400">Lv.{levelUpEffect.newLevel}</span></div>
            </div>
            {/* 粒子光點 */}
            {[...Array(12)].map((_, i) => (
              <div key={i} className="absolute w-1 h-1 rounded-full bg-amber-400"
                style={{
                  top: `${20 + Math.sin(i * 30 * Math.PI / 180) * 45}%`,
                  left: `${50 + Math.cos(i * 30 * Math.PI / 180) * 45}%`,
                  opacity: 0.8,
                  animation: `orbit${i % 3} 2s linear infinite`,
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* 傳說摀落全螢幕特效 */}
      {legendaryEffect && (
        <div
          className="fixed inset-0 z-[900] flex items-center justify-center pointer-events-none"
          style={{ animation: "fadeInOut 4s ease-in-out forwards" }}
        >
          <div className="absolute inset-0" style={{
            background: legendaryEffect.tier === "legendary"
              ? "radial-gradient(ellipse at center, rgba(168,85,247,0.35) 0%, rgba(236,72,153,0.2) 40%, transparent 70%)"
              : "radial-gradient(ellipse at center, rgba(59,130,246,0.3) 0%, rgba(99,102,241,0.15) 40%, transparent 70%)",
            animation: "pulseGlow 0.8s ease-in-out infinite alternate",
          }} />
          <div className="relative flex flex-col items-center gap-4 px-8 py-6 rounded-3xl"
            style={{
              background: "linear-gradient(135deg, rgba(15,20,40,0.95) 0%, rgba(40,10,70,0.95) 100%)",
              border: legendaryEffect.tier === "legendary" ? "2px solid rgba(168,85,247,0.9)" : "2px solid rgba(59,130,246,0.8)",
              boxShadow: legendaryEffect.tier === "legendary"
                ? "0 0 60px rgba(168,85,247,0.6), 0 0 120px rgba(236,72,153,0.3)"
                : "0 0 60px rgba(59,130,246,0.5), 0 0 100px rgba(99,102,241,0.3)",
              backdropFilter: "blur(20px)",
              animation: "scaleIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards",
            }}
          >
            <div className="text-5xl" style={{ filter: legendaryEffect.tier === "legendary" ? "drop-shadow(0 0 20px rgba(168,85,247,1))" : "drop-shadow(0 0 16px rgba(59,130,246,1))" }}>
              {legendaryEffect.tier === "legendary" ? "💎" : "🔷"}
            </div>
            <div className="text-center">
              <div className="text-sm font-medium tracking-widest mb-1" style={{ color: legendaryEffect.tier === "legendary" ? "#a855f7" : "#60a5fa" }}>
                {legendaryEffect.tier === "legendary" ? "✨ 傳說裝備摀落 ✨" : "🔷 高級裝備摀落"}
              </div>
              <div className="text-white text-xl font-bold">{legendaryEffect.agentName}</div>
              <div className="text-slate-300 text-sm mt-1">獲得了神秘裝備</div>
            </div>
          </div>
        </div>
      )}

      {/* 成就解鎖特效 */}
      {achievementEffect && (
        <div className="fixed inset-0 z-[350] flex items-center justify-center pointer-events-none">
          <div
            className="flex flex-col items-center gap-3 px-8 py-6 rounded-2xl border-2"
            style={{
              background: "rgba(88,28,135,0.95)",
              borderColor: "rgba(168,85,247,0.9)",
              boxShadow: "0 0 60px rgba(168,85,247,0.7), 0 0 120px rgba(168,85,247,0.3)",
              backdropFilter: "blur(20px)",
              animation: "fadeInScale 0.4s ease-out",
            }}
          >
            <div className="text-5xl" style={{ filter: "drop-shadow(0 0 20px rgba(168,85,247,1))" }}>
              {achievementEffect.icon}
            </div>
            <div className="text-center">
              <div className="text-xs font-medium tracking-widest mb-1 text-purple-300">
                ✨ 成就解鎖 ✨
              </div>
              <div className="text-white text-xl font-bold">{achievementEffect.name}</div>
              <div className="text-slate-300 text-sm mt-1">{achievementEffect.desc}</div>
            </div>
          </div>
        </div>
      )}

      {/* 戰鬥視窗 */}
      {combatWindowData && (
        <CombatWindow
          data={combatWindowData}
          onClose={() => setCombatWindowData(null)}
        />
      )}

      {/* Bug 2 fix: 全服聊天室整合到虛相世界主頁面 */}
      {agent && (
        <div
          style={{
            position: "fixed",
            bottom: "72px", // 底部 Tab Bar 之上
            right: "12px",
            zIndex: 300,
            width: "min(320px, calc(100vw - 24px))",
          }}
        >
          <GlobalChat
            collapsed={true}
            agentId={agent?.id ?? null}
            agentName={agent?.agentName ?? null}
          />
        </div>
      )}

      {/* 全服廣播橫幅 */}
      {activeBroadcasts.length > 0 && (
        <div className="fixed top-14 left-0 right-0 z-[200] flex flex-col gap-1 px-2 pt-1">
          {activeBroadcasts.slice(0, 2).map((b: { id: number; msgType: string; content: string }) => {
            const style = BROADCAST_STYLES[b.msgType] ?? BROADCAST_STYLES.info;
            return (
              <div key={b.id}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm"
                style={{ background: style.bg, borderColor: style.border, backdropFilter: "blur(12px)" }}>
                <span className="shrink-0">{style.icon}</span>
                <span className="flex-1 font-medium" style={{ color: style.text }}>{b.content}</span>
                <button
                  onClick={() => setDismissedBroadcasts(prev => new Set(Array.from(prev).concat(b.id)))}
                  className="shrink-0 text-slate-500 hover:text-slate-300 text-base px-1">
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

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
        anchorBottom={64}
      />

      {/* 地圖傳送彈窗 */}
      {showTeleport && (
        <TeleportModal
          nodes={mapNodeList}
          currentNodeId={currentNodeId}
          onClose={() => setShowTeleport(false)}
          onTeleport={(nodeId) => setTeleport.mutate({ targetNodeId: nodeId })}
          isPending={setTeleport.isPending}
          agentAP={agent?.actionPoints ?? 0}
        />
      )}

      {/* 快捷傳送彈窗（點擊地圖節點觸發） */}
      {showQuickTeleport && selectedTeleportNode && (() => {
        const targetNode = mapNodeList.find(n => n.id === selectedTeleportNode);
        const elColor = WX_HEX[targetNode?.element ?? "metal"] ?? "#e2e8f0";
        return (
          <div className="fixed inset-0 z-[500] flex items-end justify-center pb-24 px-4"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
            onClick={() => setShowQuickTeleport(false)}>
            <div className="w-full max-w-sm rounded-2xl p-4 flex flex-col gap-3"
              style={{
                background: "linear-gradient(135deg, #0a1628 0%, #0f1f35 100%)",
                border: `1px solid ${elColor}40`,
                boxShadow: `0 0 40px ${elColor}20, 0 20px 40px rgba(0,0,0,0.6)`,
              }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{WX_EMOJI[targetNode?.element ?? "metal"] ?? "📍"}</span>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-slate-200">{targetNode?.name ?? selectedTeleportNode}</h3>
                  <p className="text-xs text-slate-500">{targetNode?.county ?? ""} · 危險 Lv.{targetNode?.dangerLevel ?? 1}</p>
                </div>
                <button onClick={() => setShowQuickTeleport(false)} className="text-slate-500 hover:text-slate-300 text-lg px-1">✕</button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setTeleport.mutate({ targetNodeId: selectedTeleportNode });
                    setShowQuickTeleport(false);
                  }}
                  disabled={setTeleport.isPending || (agent?.actionPoints ?? 0) < 1}
                  className="flex-1 py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  style={{
                    background: (agent?.actionPoints ?? 0) >= 1 ? `linear-gradient(135deg,${elColor},${elColor}cc)` : "rgba(100,100,120,0.2)",
                    color: (agent?.actionPoints ?? 0) >= 1 ? "#000" : "#475569",
                  }}>
                  {setTeleport.isPending ? "⏳ 傳送中…" : "🗺️ 前往此地（1靈力）"}
                </button>
                <button
                  onClick={() => { setShowTeleport(true); setShowQuickTeleport(false); }}
                  className="px-3 py-3 rounded-xl border text-xs text-slate-400 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)" }}>
                  全圖
                </button>
              </div>
              {(agent?.actionPoints ?? 0) < 1 && (
                <p className="text-center text-red-400 text-xs">靈力不足，無法傳送（需要 1 靈力）</p>
              )}
            </div>
          </div>
        );
      })()}

      {/* 密店彈窗 */}
      {showHiddenShopModal && (
        <HiddenShopModal
          onClose={() => setShowHiddenShopModal(false)}
          agentGold={agent?.gold ?? 0}
          agentStones={(balanceData as { gameStones?: number } | null | undefined)?.gameStones ?? 0}
        />
      )}

      {/* ══════════════════════════════════════════════════════
          固定視窗主佈局：頂端~10% + 中間~80% + 底端由 GameTabLayout 提供
          手機：地圖 50vh + 角色面板 30vh（底部抽屜）
          桌機：左地圖+方格面板、右角色面板 340px
      ══════════════════════════════════════════════════════ */}
      <div className="flex flex-col"
        style={{ height: "calc(100vh - 56px)", overflow: "hidden" }}>

        {/* ── 置頂區（~10%）── */}
        <div className="shrink-0 px-3 flex items-center gap-2"
          style={{
            height: "clamp(44px, 10%, 56px)",
            background: "rgba(6,10,22,0.97)",
            backdropFilter: "blur(16px)",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            zIndex: 20,
          }}>

          {/* 左：流日 + 本命（帶有意義資訊） */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* 流日標籤 */}
            <div
              className="relative flex flex-col items-center px-2 py-1 rounded-xl border font-bold cursor-pointer group"
              style={{
                background: `${todayColor}12`,
                borderColor: `${todayColor}40`,
                color: todayColor,
                boxShadow: `0 0 12px ${todayColor}35`,
                textShadow: `0 0 6px ${todayColor}`,
                fontSize: "10px",
                lineHeight: "1.2",
              }}
              onClick={() => {
                // 手機版：點擊顯示說明
                if (window.innerWidth < 1024) {
                  import("sonner").then(({ toast }) => {
                    toast.info(`流日天干：${todayStem}${todayBranch}`, {
                      description: `今日主氣為「${todayElement}」行，${todayElement}旺代表今日所有與${todayElement}行相關的行動和事物都會得到加持。你的本命屬${WX_ZH[agentElement] ?? "金"}，不同流日對你的屬性值會有加成或耠減。`,
                      duration: 5000,
                    });
                  });
                }
              }}
            >
              <span style={{ fontSize: "11px" }}>{todayStem}{todayBranch}</span>
              <span style={{ fontSize: "9px", opacity: 0.8 }}>{todayElement}旺</span>
              {/* 桌機版 hover tooltip */}
              <div className="hidden lg:group-hover:block absolute left-0 top-full mt-1 z-[500] pointer-events-none"
                style={{ minWidth: "220px" }}>
                <div className="rounded-xl border px-3 py-2.5 text-left"
                  style={{
                    background: "rgba(6,10,22,0.97)",
                    backdropFilter: "blur(16px)",
                    borderColor: `${todayColor}40`,
                    boxShadow: `0 4px 20px rgba(0,0,0,0.6)`,
                  }}>
                  <p className="text-xs font-bold mb-1" style={{ color: todayColor }}>流日天干：{todayStem}{todayBranch}</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">今日主氣為「{todayElement}」行，{todayElement}旺代表今日所有與{todayElement}行相關的行動和事物都會得到加持。你的本命屬{WX_ZH[agentElement] ?? "金"}，不同流日對你的屬性值會有加成或耠減。</p>
                </div>
              </div>
            </div>
            {/* 本命標籤（含尋寶力等級） */}
            <div
              className="relative flex flex-col items-center px-2 py-1 rounded-xl border font-bold cursor-pointer group"
              style={{
                background: `${ec}12`,
                borderColor: `${ec}40`,
                color: ec,
                boxShadow: WX_GLOW[agentElement] ?? "none",
                textShadow: `0 0 6px ${ec}`,
                fontSize: "10px",
                lineHeight: "1.2",
              }}
              onClick={() => {
                // 手機版：點擊顯示說明
                if (window.innerWidth < 1024) {
                  import("sonner").then(({ toast }) => {
                    toast.info(`本命：${WX_ZH[agentElement] ?? "金"}行`, {
                      description: `你的命格屬「${WX_ZH[agentElement] ?? "金"}」行，尋寶力為 ${treasureHunting}。尋寶力越高，在尋寶探索中發現稀有資源的機率越大。本命屬性與流日天干相生時，行動效率提升。`,
                      duration: 5000,
                    });
                  });
                }
              }}
            >
              <span style={{ fontSize: "11px" }}>{WX_ZH[agentElement] ?? "金"}命</span>
              <span style={{ fontSize: "9px", opacity: 0.8 }}>尋{treasureHunting}</span>
              {/* 桌機版 hover tooltip */}
              <div className="hidden lg:group-hover:block absolute left-0 top-full mt-1 z-[500] pointer-events-none"
                style={{ minWidth: "220px" }}>
                <div className="rounded-xl border px-3 py-2.5 text-left"
                  style={{
                    background: "rgba(6,10,22,0.97)",
                    backdropFilter: "blur(16px)",
                    borderColor: `${ec}40`,
                    boxShadow: `0 4px 20px rgba(0,0,0,0.6)`,
                  }}>
                  <p className="text-xs font-bold mb-1" style={{ color: ec }}>本命：{WX_ZH[agentElement] ?? "金"}行</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">你的命格屬「{WX_ZH[agentElement] ?? "金"}」行，尋寶力為 {treasureHunting}。尋寶力越高，在尋寶探索中發現稀有資源的機率越大。本命屬性與流日天干相生時，行動效率提升。</p>
                </div>
              </div>
            </div>
          </div>

          {/* 中：角色名稱 + 等級 + 經驗條 */}
          <div className="flex-1 flex flex-col items-center justify-center min-w-0 px-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-200 truncate" style={{ maxWidth: "80px" }}>
                {agent?.agentName ?? "旅人"}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0"
                style={{ background: `${ec}22`, color: ec }}>Lv.{agent?.level ?? 1}</span>
              <span className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: agent?.status === "combat" ? "#ef4444" : agent?.status === "moving" ? "#60a5fa" : "#22c55e" }} />
            </div>
            {/* 經驗條 */}
            {(() => {
              const expCur = agent?.exp ?? agent?.experience ?? 0;
              // Bug 5 fix: 使用和後端相同的公式
              const expNext = calcExpToNextFn(agent?.level ?? 1);
              const pct = expNext > 0 ? Math.min(100, (expCur / expNext) * 100) : 0;
              return (
                <div className="flex items-center gap-1 w-full max-w-[120px]">
                  <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: ec }} />
                  </div>
                  <span className="text-[9px] text-slate-600 tabular-nums shrink-0">{expCur}/{expNext}</span>
                </div>
              );
            })()}
          </div>

          {/* 右：跟隨冒險者 + Tick 按鈕 */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* 跟隨冒險者（脈衝光效） */}
            <button
              className="px-2 py-1.5 rounded-xl text-xs font-bold border transition-all hover:scale-105 active:scale-95"
              style={{
                background: "rgba(168,85,247,0.12)",
                borderColor: "rgba(168,85,247,0.5)",
                color: "#a855f7",
                boxShadow: "0 0 14px rgba(168,85,247,0.4), inset 0 0 6px rgba(168,85,247,0.1)",
                textShadow: "0 0 6px rgba(168,85,247,0.9)",
                animation: "pulse 2s infinite",
              }}
              onClick={() => {
                if (currentNodeId) {
                  mapRef.current?.highlightNode(currentNodeId);
                  setCharPanelOpen(false); // 手機版收合面板以顯示地圖
                }
              }}
            >
              👁 跟隨
            </button>

            {/* Tick 大按鈕 */}
            <button
              onClick={handleTickToggle}
              disabled={triggerTick.isPending}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold text-xs border transition-all hover:scale-105 active:scale-95 disabled:opacity-60"
              style={{
                background: tickRunning ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
                borderColor: tickRunning ? "rgba(239,68,68,0.5)" : "rgba(245,158,11,0.5)",
                color: tickRunning ? "#ef4444" : "#f59e0b",
                boxShadow: tickRunning ? "0 0 16px rgba(239,68,68,0.5)" : "0 0 16px rgba(245,158,11,0.5)",
                minWidth: "64px",
              }}
            >
              {triggerTick.isPending ? (
                <span className="animate-spin text-sm">⏳</span>
              ) : tickRunning ? (
                <>
                  <span className="w-2 h-2 rounded-sm bg-red-400 animate-pulse shrink-0" />
                  <span>暫停</span>
                </>
              ) : (
                <>
                  <span className="text-sm">▶</span>
                  <span>Tick</span>
                </>
              )}
            </button>
            {/* 音效開關按鈕 */}
            <button
              onClick={toggleSound}
              className="flex items-center justify-center w-8 h-8 rounded-xl border transition-all hover:scale-105 active:scale-95"
              style={{
                background: soundOn ? "rgba(34,197,94,0.1)" : "rgba(148,163,184,0.08)",
                borderColor: soundOn ? "rgba(34,197,94,0.3)" : "rgba(148,163,184,0.2)",
                color: soundOn ? "#22c55e" : "#64748b",
              }}
              title={soundOn ? "音效開啟（點擊關閉）" : "音效關閉（點擊開啟）"}
            >
              {soundOn ? "🔊" : "🔇"}
            </button>
            {/* 返回前台按鈕 */}
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1 px-2 py-1.5 rounded-xl font-bold text-xs border transition-all hover:scale-105 active:scale-95"
              style={{
                background: "rgba(148,163,184,0.08)",
                borderColor: "rgba(148,163,184,0.25)",
                color: "#94a3b8",
              }}
              title="返回前台"
            >
              ⌂
            </button>
          </div>
        </div>

        {/* ── 主內容區（~80%）── */}
        {/* 桌機：flex-row（左地圖+方格面板、右角色面板）
            手機：flex-col（地圖 50vh 固定、角色面板底部抽屜）*/}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative" style={{ minHeight: 0 }}>
          {/* ── 地圖區塊 ── */}
          <div className="flex flex-col lg:flex-1 overflow-hidden" style={{ minHeight: 0, zIndex: 0, position: "relative" }}>
            {/* 地圖容器
                手機：全版面（充滿除 Tab Bar 以外的剩餘空間），地圖壓在最底層
                桌機：flex-1 填滿 */}
            <div
              className="relative overflow-hidden"
              style={{
                height: "calc(100dvh - 56px - env(safe-area-inset-bottom, 0px))",
                flex: "none",
                // 桌機覆蓋為 flex-1
              }}
              ref={(el) => {
                if (el) {
                  // 桌機版：height 由 flex 決定
                  const isDesktop = window.innerWidth >= 1024;
                  if (isDesktop) {
                    el.style.height = "auto";
                    el.style.flex = "1";
                  }
                }
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
                  hiddenNodeIds={hiddenNodeIds}
                  onNodeClick={(nodeId) => {
                    // 點擊密店發光節點：如果是當前位置且有密店，顯示密店彈窗
                    if (nodeId === currentNodeId && hiddenNodeIds.includes(nodeId)) {
                      setShowHiddenShopModal(true);
                      return;
                    }
                    // 點擊密店發光節點：非當前位置且有密店，顯示密店提示
                    if (nodeId !== currentNodeId && hiddenNodeIds.includes(nodeId)) {
                      toast("🔮 此地有密店出現！傳送到此地後可進入密店", { icon: "✨" });
                    }
                    // 點擊地圖節點：如果不是當前位置，顯示「前往此地」快捷傳送
                    if (nodeId !== currentNodeId) {
                      setSelectedTeleportNode(nodeId);
                      setShowQuickTeleport(true);
                    }
                  }}
                />
              )}

              {/* 日誌按鈕：左下角圓形按鈕（手機版） */}
              <button
                onClick={() => setShowLog(v => !v)}
                className="absolute z-[400] lg:hidden flex items-center justify-center border transition-all hover:scale-110 active:scale-95"
                style={{
                  bottom: "64px",
                  left: "16px",
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  background: showLog ? "rgba(245,158,11,0.2)" : "rgba(6,10,22,0.92)",
                  backdropFilter: "blur(10px)",
                  borderColor: showLog ? "rgba(245,158,11,0.8)" : "rgba(245,158,11,0.4)",
                  boxShadow: "0 0 12px rgba(245,158,11,0.35), 0 4px 10px rgba(0,0,0,0.5)",
                  fontSize: "18px",
                }}
              >
                📜
                {(eventLog?.length ?? 0) > 0 && (
                  <span
                    className="absolute font-bold"
                    style={{
                      top: "-3px", right: "-3px",
                      minWidth: "16px", height: "16px",
                      borderRadius: "8px",
                      background: "#ef4444", color: "#fff",
                      fontSize: "9px",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      padding: "0 2px",
                      border: "2px solid rgba(6,10,22,0.9)",
                    }}
                  >
                    {(eventLog?.length ?? 0) > 20 ? "20+" : eventLog?.length}
                  </span>
                )}
              </button>
              {/* 日誌按鈕：桌機版可拖拉 */}
              <DraggableWidget
                id="event-log"
                defaultPos={WIDGET_DEFAULTS["event-log"]}
                savedPos={widgetLayout["event-log"]}
                onPositionChange={handleWidgetMove}
                disabled={false}
                zIndex={400}
                className="hidden lg:block"
              >
                <button
                  onClick={() => setShowLog(v => !v)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border transition-all hover:scale-110 active:scale-95"
                  style={{
                    background: showLog ? "rgba(245,158,11,0.2)" : "rgba(6,10,22,0.92)",
                    backdropFilter: "blur(10px)",
                    borderColor: showLog ? "rgba(245,158,11,0.8)" : "rgba(245,158,11,0.4)",
                    boxShadow: "0 0 12px rgba(245,158,11,0.35)",
                  }}
                >
                  <span className="text-xl">📜</span>
                  <span className="text-sm font-bold text-amber-300">日誌</span>
                  {(eventLog?.length ?? 0) > 0 && (
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#ef4444", color: "#fff" }}>
                      {(eventLog?.length ?? 0) > 99 ? "99+" : eventLog?.length}
                    </span>
                  )}
                </button>
              </DraggableWidget>

              {/* 手機版方格面板：左上角浮動卡片 */}
              <div
                className="absolute top-2 left-2 z-[400] lg:hidden"
                style={{ maxWidth: "calc(100% - 70px)" }}
              >
                <button
                  onClick={() => setNodeInfoOpen(v => !v)}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-xl border text-xs font-bold transition-all"
                  style={{
                    background: "rgba(6,10,22,0.92)",
                    backdropFilter: "blur(10px)",
                    borderColor: `${ec}40`,
                    color: ec,
                    boxShadow: `0 0 8px ${ec}25`,
                  }}
                >
                  <span>📍</span>
                  <span className="truncate" style={{ maxWidth: "72px" }}>{nodeInfoData?.node?.name ?? "—"}</span>
                  <span className="text-slate-500">{nodeInfoOpen ? "▼" : "▲"}</span>
                </button>

                {nodeInfoOpen && (
                  <div
                    className="mt-1 rounded-xl border overflow-hidden"
                    style={{
                      background: "rgba(6,10,22,0.95)",
                      backdropFilter: "blur(16px)",
                      borderColor: `${ec}25`,
                      maxHeight: "40vh",
                      overflowY: "auto",
                      width: "min(260px, calc(100vw - 80px))",
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

              {/* ── 城市區塊（桌機版：可拖拉） ── */}
              <DraggableWidget
                id="city-panel"
                defaultPos={WIDGET_DEFAULTS["city-panel"]}
                savedPos={widgetLayout["city-panel"]}
                onPositionChange={handleWidgetMove}
                disabled={false}
                zIndex={400}
                className="hidden lg:block"
              >
                <button
                  onClick={() => setNodeInfoOpen(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-bold transition-all hover:scale-105"
                  style={{
                    background: "rgba(6,10,22,0.92)",
                    backdropFilter: "blur(10px)",
                    borderColor: `${ec}40`,
                    color: ec,
                    boxShadow: `0 0 10px ${ec}25`,
                  }}
                >
                  <span>📍</span>
                  <span>{nodeInfoData?.node?.name ?? "—"}</span>
                  <span className="text-slate-500">{nodeInfoOpen ? "▼" : "▲"}</span>
                </button>
                {nodeInfoOpen && (
                  <div
                    className="mt-1 rounded-xl border overflow-hidden"
                    style={{
                      background: "rgba(6,10,22,0.95)",
                      backdropFilter: "blur(16px)",
                      borderColor: `${ec}25`,
                      maxHeight: "50vh",
                      overflowY: "auto",
                      width: "280px",
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
              </DraggableWidget>
              {/* ── HP/MP/AP/體力 橫排狀態条（手機版：地圖底部中央固定） ── */}
              <div className="absolute left-1/2 lg:hidden z-[400] flex items-center gap-1 px-2 py-1.5 rounded-2xl border"
                style={{
                  bottom: "52px",
                  transform: "translateX(-50%)",
                  background: "rgba(6,10,22,0.92)",
                  backdropFilter: "blur(12px)",
                  borderColor: "rgba(255,255,255,0.10)",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.5)",
                  whiteSpace: "nowrap",
                }}>
                {[
                  { icon: "♥", label: "HP", val: agent?.hp ?? 0, max: agent?.maxHp ?? 100, color: "#ef4444" },
                  { icon: "💧", label: "MP", val: agent?.mp ?? 0, max: agent?.maxMp ?? 100, color: "#38bdf8" },
                  { icon: "⚡", label: "AP", val: agent?.actionPoints ?? 0, max: agent?.maxActionPoints ?? 10, color: "#f59e0b" },
                  { icon: "🏃", label: "體力", val: staminaInfo?.current ?? agent?.stamina ?? 100, max: staminaInfo?.max ?? agent?.maxStamina ?? 100, color: "#22c55e" },
                ].map((bar, idx) => (
                  <div key={bar.label} className="flex items-center gap-0.5">
                    {idx > 0 && <span className="text-slate-700 text-[10px] mx-0.5">|</span>}
                    <span className="text-[10px] shrink-0" style={{ color: bar.color }}>{bar.icon}</span>
                    <div className="w-8 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${bar.max > 0 ? Math.min(100, (bar.val / bar.max) * 100) : 0}%`, background: bar.color }} />
                    </div>
                    <span className="text-[9px] font-bold tabular-nums" style={{ color: bar.color }}>{bar.val}</span>
                  </div>
                ))}
              </div>
              {/* ── HP/MP/AP/體力 橫排狀態条（桌機版：可拖拉） ── */}
              <DraggableWidget
                id="status-bar"
                defaultPos={WIDGET_DEFAULTS["status-bar"]}
                savedPos={widgetLayout["status-bar"]}
                onPositionChange={handleWidgetMove}
                disabled={false}
                zIndex={400}
                className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-2xl border"
                style={{
                  background: "rgba(6,10,22,0.92)",
                  backdropFilter: "blur(12px)",
                  borderColor: "rgba(255,255,255,0.12)",
                  boxShadow: "0 2px 16px rgba(0,0,0,0.5)",
                  whiteSpace: "nowrap",
                }}
              >
                {[
                  { icon: "♥", label: "HP", val: agent?.hp ?? 0, max: agent?.maxHp ?? 100, color: "#ef4444" },
                  { icon: "💧", label: "MP", val: agent?.mp ?? 0, max: agent?.maxMp ?? 100, color: "#38bdf8" },
                  { icon: "⚡", label: "AP", val: agent?.actionPoints ?? 0, max: agent?.maxActionPoints ?? 10, color: "#f59e0b" },
                  { icon: "🏃", label: "體力", val: staminaInfo?.current ?? agent?.stamina ?? 100, max: staminaInfo?.max ?? agent?.maxStamina ?? 100, color: "#22c55e" },
                ].map((bar, idx) => (
                  <div key={bar.label} className="flex items-center gap-1">
                    {idx > 0 && <span className="text-slate-700 text-xs mx-1">|</span>}
                    <span className="text-xs shrink-0" style={{ color: bar.color }}>{bar.icon}</span>
                    <div className="w-12 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${bar.max > 0 ? Math.min(100, (bar.val / bar.max) * 100) : 0}%`, background: bar.color }} />
                    </div>
                    <span className="text-[11px] font-bold tabular-nums" style={{ color: bar.color }}>{bar.val}</span>
                  </div>
                ))}
              </DraggableWidget>

              {/* ── 靈相干預浮動面板（手機版：右上角固定，不受角色面板影響） ── */}
              <div className="absolute right-2 top-2 z-[450] lg:hidden">
                <button
                  onClick={() => setShowDivinePanel(v => !v)}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-xl border text-xs font-bold transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: showDivinePanel ? "rgba(167,139,250,0.2)" : "rgba(6,10,22,0.92)",
                    backdropFilter: "blur(10px)",
                    borderColor: showDivinePanel ? "rgba(167,139,250,0.7)" : "rgba(167,139,250,0.4)",
                    color: "#a78bfa",
                    boxShadow: "0 0 10px rgba(167,139,250,0.3)",
                  }}>
                  <span>✨</span>
                  <span>靈相</span>
                  <span>{showDivinePanel ? "▲" : "▼"}</span>
                </button>
                {showDivinePanel && (() => {
                  const todayStr = new Date().toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" });
                  const agentAP = agent?.actionPoints ?? 0;
                  const healUsedToday = agent?.lastDivineHealDate === todayStr;
                  const eyeUsedToday  = agent?.lastDivineEyeDate  === todayStr;
                  const staminaUsedToday = agent?.lastDivineStaminaDate === todayStr;
                  return (
                    <div className="absolute right-0 top-full mt-1 rounded-xl border overflow-hidden"
                      style={{ background: "rgba(6,10,22,0.97)", backdropFilter: "blur(16px)", borderColor: "rgba(167,139,250,0.3)", width: "200px" }}>
                      <div className="px-3 py-2 border-b flex items-center justify-between"
                        style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                        <span className="text-xs font-bold text-purple-300">靈相干預</span>
                        <span className="text-xs text-slate-500">靈力 {agentAP}/{agent?.maxActionPoints ?? 10}</span>
                      </div>
                      <div className="p-2 space-y-1.5">
                        {[
                          { label: "神癒恢復", desc: "恢復50%HP", icon: "💊", color: "#ef4444", used: healUsedToday, fn: () => divineHeal.mutate(), pending: divineHeal.isPending },
                          { label: "神眼加持", desc: "洞察力+15%", icon: "👁", color: "#38bdf8", used: eyeUsedToday, fn: () => divineEye.mutate(), pending: divineEye.isPending },
                          { label: "靈癒疲勞", desc: "體力回50", icon: "✨", color: "#a78bfa", used: staminaUsedToday, fn: () => divineStamina.mutate(), pending: divineStamina.isPending },
                        ].map(item => (
                          <button key={item.label}
                            onClick={item.fn}
                            disabled={agentAP < 1 || item.pending || item.used}
                            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
                            style={{ background: `${item.color}08`, borderColor: `${item.color}${item.used ? "15" : "30"}`, color: item.color }}>
                            <span className="text-base">{item.pending ? "⏳" : item.used ? "🔒" : item.icon}</span>
                            <div className="flex-1 text-left">
                              <p className="text-xs font-bold">{item.label}</p>
                              <p className="text-[10px]" style={{ color: item.used ? "#475569" : "#64748b" }}>{item.used ? "明日再來" : item.desc}</p>
                            </div>
                            {!item.used && <span className="text-[9px] text-slate-600">-1靈</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* ── 行動策略浮動面板（手機版：右上角固定，靈相下方） ── */}
              <div className="absolute right-2 z-[445] lg:hidden"
                style={{ top: "52px" }}>
                <button
                  onClick={() => setShowStrategyPanel(v => !v)}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-xl border text-xs font-bold transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: showStrategyPanel ? `${ec}20` : "rgba(6,10,22,0.92)",
                    backdropFilter: "blur(10px)",
                    borderColor: showStrategyPanel ? `${ec}70` : `${ec}40`,
                    color: ec,
                    boxShadow: `0 0 10px ${ec}30`,
                  }}>
                  <span>⚔️</span>
                  <span>{STRATEGIES.find(s => s.id === (agent?.strategy ?? "explore"))?.label ?? "探索"}</span>
                  <span>{showStrategyPanel ? "▲" : "▼"}</span>
                </button>
                {showStrategyPanel && (
                  <div className="absolute right-0 top-full mt-1 rounded-xl border overflow-hidden"
                    style={{ background: "rgba(6,10,22,0.97)", backdropFilter: "blur(16px)", borderColor: `${ec}30`, width: "180px" }}>
                    <div className="px-3 py-2 border-b"
                      style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                      <span className="text-xs font-bold" style={{ color: ec }}>行動策略</span>
                    </div>
                    <div className="p-2 grid grid-cols-2 gap-1.5">
                      {STRATEGIES.map(s => (
                        <button key={s.id}
                          onClick={() => { setStrategy.mutate({ strategy: s.id }); setShowStrategyPanel(false); }}
                          className="flex flex-col items-center gap-1 py-2.5 rounded-lg text-xs border transition-all hover:scale-105 active:scale-95"
                          style={{
                            background: (agent?.strategy ?? "explore") === s.id ? `${ec}18` : "rgba(255,255,255,0.03)",
                            borderColor: (agent?.strategy ?? "explore") === s.id ? `${ec}55` : "rgba(255,255,255,0.08)",
                            color: (agent?.strategy ?? "explore") === s.id ? ec : "rgba(148,163,184,0.6)",
                          }}>
                          <span className="text-lg leading-none">{s.icon}</span>
                          <span className="text-[10px]">{s.label}</span>
                        </button>
                      ))}
                    </div>
                    {/* 漫遊/定點切換 */}
                    <div className="px-2 pb-2">
                      <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                        {(["roaming", "stationary"] as const).map(mode => (
                          <button key={mode}
                            onClick={() => setStrategy.mutate({ strategy: (agent?.strategy ?? "explore") as "explore" | "gather" | "rest" | "combat" | "infuse", movementMode: mode })}
                            className="flex-1 py-1.5 text-[10px] font-bold transition-all"
                            style={{
                              background: (agent?.movementMode ?? "roaming") === mode ? `${ec}25` : "transparent",
                              color: (agent?.movementMode ?? "roaming") === mode ? ec : "rgba(148,163,184,0.5)",
                            }}>
                            {mode === "roaming" ? "🚶 漫遊" : "📌 定點"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── 靈相干預浮動面板（桌機版：可拖拉） ── */}
              <DraggableWidget
                id="divine-panel"
                defaultPos={WIDGET_DEFAULTS["divine-panel"]}
                savedPos={widgetLayout["divine-panel"]}
                onPositionChange={handleWidgetMove}
                disabled={false}
                zIndex={400}
                className="hidden lg:block"
              >
                <button
                  onClick={() => setShowDivinePanel(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-bold transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: showDivinePanel ? "rgba(167,139,250,0.2)" : "rgba(6,10,22,0.92)",
                    backdropFilter: "blur(10px)",
                    borderColor: showDivinePanel ? "rgba(167,139,250,0.7)" : "rgba(167,139,250,0.4)",
                    color: "#a78bfa",
                    boxShadow: "0 0 12px rgba(167,139,250,0.3)",
                  }}>
                  <span>✨</span>
                  <span>靈相</span>
                  <span>{showDivinePanel ? "▲" : "▼"}</span>
                </button>
                {showDivinePanel && (() => {
                  const todayStr = new Date().toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" });
                  const agentAP = agent?.actionPoints ?? 0;
                  const healUsedToday = agent?.lastDivineHealDate === todayStr;
                  const eyeUsedToday  = agent?.lastDivineEyeDate  === todayStr;
                  const staminaUsedToday = agent?.lastDivineStaminaDate === todayStr;
                  return (
                    <div className="absolute right-0 top-full mt-1 rounded-xl border overflow-hidden"
                      style={{ background: "rgba(6,10,22,0.97)", backdropFilter: "blur(16px)", borderColor: "rgba(167,139,250,0.3)", width: "220px" }}>
                      <div className="px-3 py-2 border-b flex items-center justify-between"
                        style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                        <span className="text-sm font-bold text-purple-300">靈相干預</span>
                        <span className="text-xs text-slate-500">靈力 {agentAP}/{agent?.maxActionPoints ?? 10}</span>
                      </div>
                      <div className="p-2 space-y-1.5">
                        {[
                          { label: "神癒恢復", desc: "恢復50%HP", icon: "💊", color: "#ef4444", used: healUsedToday, fn: () => divineHeal.mutate(), pending: divineHeal.isPending },
                          { label: "神眼加持", desc: "洞察力+15%", icon: "👁", color: "#38bdf8", used: eyeUsedToday, fn: () => divineEye.mutate(), pending: divineEye.isPending },
                          { label: "靈癒疲勞", desc: "體力回50", icon: "✨", color: "#a78bfa", used: staminaUsedToday, fn: () => divineStamina.mutate(), pending: divineStamina.isPending },
                        ].map(item => (
                          <button key={item.label}
                            onClick={item.fn}
                            disabled={agentAP < 1 || item.pending || item.used}
                            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
                            style={{ background: `${item.color}08`, borderColor: `${item.color}${item.used ? "15" : "30"}`, color: item.color }}>
                            <span className="text-lg">{item.pending ? "⏳" : item.used ? "🔒" : item.icon}</span>
                            <div className="flex-1 text-left">
                              <p className="text-sm font-bold">{item.label}</p>
                              <p className="text-xs" style={{ color: item.used ? "#475569" : "#64748b" }}>{item.used ? "明日再來" : item.desc}</p>
                            </div>
                            {!item.used && <span className="text-xs text-slate-600">-1靈</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </DraggableWidget>
              {/* ── 行動策略浮動面板（桌機版：可拖拉） ── */}
              <DraggableWidget
                id="strategy-panel"
                defaultPos={WIDGET_DEFAULTS["strategy-panel"]}
                savedPos={widgetLayout["strategy-panel"]}
                onPositionChange={handleWidgetMove}
                disabled={false}
                zIndex={400}
                className="hidden lg:block"
              >
                <button
                  onClick={() => setShowStrategyPanel(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-bold transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: showStrategyPanel ? `${ec}20` : "rgba(6,10,22,0.92)",
                    backdropFilter: "blur(10px)",
                    borderColor: showStrategyPanel ? `${ec}70` : `${ec}40`,
                    color: ec,
                    boxShadow: `0 0 12px ${ec}30`,
                  }}>
                  <span>⚔️</span>
                  <span>{STRATEGIES.find(s => s.id === (agent?.strategy ?? "explore"))?.label ?? "探索"}</span>
                  <span>{showStrategyPanel ? "▲" : "▼"}</span>
                </button>
                {showStrategyPanel && (
                  <div className="absolute right-0 bottom-full mb-1 rounded-xl border overflow-hidden"
                    style={{ background: "rgba(6,10,22,0.97)", backdropFilter: "blur(16px)", borderColor: `${ec}30`, width: "200px" }}>
                    <div className="px-3 py-2 border-b"
                      style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                      <span className="text-sm font-bold" style={{ color: ec }}>行動策略</span>
                    </div>
                    <div className="p-2 grid grid-cols-2 gap-2">
                      {STRATEGIES.map(s => (
                        <button key={s.id}
                          onClick={() => { setStrategy.mutate({ strategy: s.id }); setShowStrategyPanel(false); }}
                          className="flex flex-col items-center gap-1 py-3 rounded-lg text-sm border transition-all hover:scale-105 active:scale-95"
                          style={{
                            background: (agent?.strategy ?? "explore") === s.id ? `${ec}18` : "rgba(255,255,255,0.03)",
                            borderColor: (agent?.strategy ?? "explore") === s.id ? `${ec}55` : "rgba(255,255,255,0.08)",
                            color: (agent?.strategy ?? "explore") === s.id ? ec : "rgba(148,163,184,0.6)",
                          }}>
                          <span className="text-xl leading-none">{s.icon}</span>
                          <span className="text-xs">{s.label}</span>
                        </button>
                      ))}
                    </div>
                    {/* 漫遊/定點切換 */}
                    <div className="px-2 pb-2">
                      <p className="text-[10px] text-slate-500 mb-1 px-1">行動模式</p>
                      <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                        {(["roaming", "stationary"] as const).map(mode => (
                          <button key={mode}
                            onClick={() => setStrategy.mutate({ strategy: (agent?.strategy ?? "explore") as "explore" | "gather" | "rest" | "combat" | "infuse", movementMode: mode })}
                            className="flex-1 py-2 text-xs font-bold transition-all"
                            style={{
                              background: (agent?.movementMode ?? "roaming") === mode ? `${ec}25` : "transparent",
                              color: (agent?.movementMode ?? "roaming") === mode ? ec : "rgba(148,163,184,0.5)",
                            }}>
                            {mode === "roaming" ? "🚶 漫遊" : "📌 定點"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </DraggableWidget>
              {/* 手機版角色面板把手：地圖底部中央 */}
              <button
                className="absolute lg:hidden z-10 flex items-center justify-center gap-1 border transition-all"
                style={{
                  bottom: "64px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  height: "28px",
                  padding: "0 14px",
                  borderRadius: "14px",
                  background: "rgba(6,10,22,0.92)",
                  backdropFilter: "blur(10px)",
                  borderColor: `${ec}50`,
                  boxShadow: `0 0 10px ${ec}30, 0 4px 10px rgba(0,0,0,0.5)`,
                  color: ec,
                  fontSize: "11px",
                  fontWeight: "bold",
                }}
                onClick={() => setCharPanelOpen(v => !v)}
              >
                <span>{charPanelOpen ? "▼" : "▲"}</span>
                <span>{charPanelOpen ? "收合" : agent?.agentName ?? "旅人"}</span>
                {/* HP 微型指示 */}
                <span className="text-red-400">♥</span>
                <span className="text-xs text-red-400">{agent?.hp ?? 0}</span>
              </button>
            </div>

            {/* 方格面板（桌機版） */}
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

          {/* ── 角色面板：桌機版右側固定、手機版底部抽屜 ── */}
          <div
            className="lg:w-[340px] lg:border-l lg:relative lg:flex lg:flex-col lg:overflow-hidden"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}
          >
            {/* 桌機版 */}
            <div className="hidden lg:flex lg:flex-col lg:flex-1 lg:overflow-hidden">
              <CharacterPanel
                agent={agent}
                staminaInfo={staminaInfo}
                natalStats={natalStats}
                equippedData={equippedData as { userGender?: string; dayMasterElementEn?: string; equipped?: Record<string, { name: string; quality?: string } | null> } | null | undefined}
                balanceData={balanceData as { gameCoins?: number; gameStones?: number } | null | undefined}
                dailyData={dailyData as { dayPillar?: { stem?: string; branch?: string; stemElement?: string } } | null | undefined}
                divineHeal={divineHeal}
                divineEye={divineEye}
                divineStamina={divineStamina}
                setStrategy={setStrategy}
                ec={ec}
              />
              {/* 桌機版底部功能按鈕列 */}
              <div className="px-3 py-2.5 flex items-center gap-2 shrink-0 border-t"
                style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(8,12,25,0.97)" }}>
                {/* 旅人日誌 */}
                <button
                  onClick={() => setShowLog(v => !v)}
                  className="flex-1 flex items-center justify-center gap-2 px-2 py-2.5 rounded-xl border transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.28)" }}>
                  <span className="text-lg">📜</span>
                  <span className="text-sm text-amber-300 font-bold">日誌</span>
                  {(eventLog?.length ?? 0) > 0 && (
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#ef4444", color: "#fff", fontSize: "11px" }}>
                      {(eventLog?.length ?? 0) > 99 ? "99+" : eventLog?.length}
                    </span>
                  )}
                </button>
                {/* 地圖傳送（桌機版） */}
                <button
                  onClick={() => setShowTeleport(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-2 py-2.5 rounded-xl border transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: "rgba(56,189,248,0.08)", borderColor: "rgba(56,189,248,0.28)" }}>
                  <span className="text-lg">🗺️</span>
                  <span className="text-sm text-sky-300 font-bold">傳送</span>
                </button>
                {/* 虛相世界商店（桂機版）—導向 GameShop */}
                <button
                  onClick={() => navigate("/game/gameshop")}
                  className="flex-1 flex items-center justify-center gap-2 px-2 py-2.5 rounded-xl border transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: "rgba(34,197,94,0.08)", borderColor: "rgba(34,197,94,0.28)" }}>
                  <span className="text-lg">🏪</span>
                  <span className="text-sm text-green-300 font-bold">商店</span>
                </button>
                {/* 密店（導向 GameShop 密店Tab） */}
                <button
                  onClick={() => navigate("/game/gameshop?tab=hidden")}
                  className="flex-1 flex items-center justify-center gap-2 px-2 py-2.5 rounded-xl border transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: hiddenShopTier === "high" ? "rgba(245,158,11,0.12)" : hiddenShopTier === "mid" ? "rgba(167,139,250,0.10)" : "rgba(96,165,250,0.08)",
                    borderColor: hiddenShopTier === "high" ? "rgba(245,158,11,0.5)" : hiddenShopTier === "mid" ? "rgba(167,139,250,0.4)" : "rgba(96,165,250,0.3)",
                    boxShadow: hiddenShopTier === "high" ? "0 0 12px rgba(245,158,11,0.4)" : "none",
                  }}>
                  <span className="text-lg">🔍</span>
                  <span className="text-sm font-bold" style={{ color: hiddenShopColor }}>密店</span>
                </button>
                {/* Widget 重置按鈕 */}
                <button
                  onClick={() => {
                    setWidgetLayout({});
                    saveWidgetLayout.mutate({ layout: {} });
                    toast.success("浮動元件位置已重置");
                  }}
                  title="重置浮動元件位置"
                  className="flex items-center justify-center px-2 py-2.5 rounded-xl border transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: "rgba(100,116,139,0.08)", borderColor: "rgba(100,116,139,0.28)", minWidth: "36px" }}>
                  <span className="text-base">🔄</span>
                </button>
              </div>
            </div>

            {/* 手機版底部抽屜
                - 固定在底部導覽列上方
                - 收合時只露出把手列（56px）
                - 展開時顯示角色面板（30vh）
                - 與底部導覽列保持 8px 間距 */}
            <div
              className="lg:hidden fixed left-0 right-0 z-30 flex flex-col"
              style={{
                // 底部導覽列高度 56px + 8px 間距 + iOS safe-area
                bottom: "calc(56px + 8px + env(safe-area-inset-bottom, 0px))",
                background: "rgba(6,10,22,0.98)",
                backdropFilter: "blur(20px)",
                borderTop: `2px solid ${ec}60`,
                borderRadius: "16px 16px 0 0",
                boxShadow: `0 -6px 32px ${ec}30, 0 -2px 8px rgba(0,0,0,0.6)`,
                transition: "height 0.35s cubic-bezier(0.4,0,0.2,1)",
                height: charPanelOpen ? "calc(50vh + 56px)" : "56px",
                overflow: "hidden",
                touchAction: "none", // 防止意外拖動
              }}
            >
              {/* 把手列（始終可見） */}
              <div
                className="flex items-center justify-between px-4 shrink-0 cursor-pointer select-none"
                style={{ height: "56px", borderBottom: charPanelOpen ? "1px solid rgba(255,255,255,0.06)" : "none", position: "relative" }}
                onClick={() => setCharPanelOpen(v => !v)}
              >
                {/* 顧導調光小条（不展開時顯示） */}
                {!charPanelOpen && (
                  <div style={{
                    position: "absolute",
                    top: 0, left: "50%",
                    transform: "translateX(-50%)",
                    width: "40px", height: "3px",
                    borderRadius: "2px",
                    background: `linear-gradient(90deg, transparent, ${ec}, transparent)`,
                    animation: "pulse 2s ease-in-out infinite",
                  }} />
                )}
                {/* 左：旅人資訊 */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-base border shrink-0"
                    style={{ background: `radial-gradient(circle,${ec}25,transparent)`, borderColor: `${ec}60`, boxShadow: charPanelOpen ? "none" : `0 0 8px ${ec}40` }}>
                    {equippedData?.userGender === "male" ? "🧙" : "🧙‍♀️"}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-200">{agent?.agentName ?? "旅人"}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: `${ec}22`, color: ec }}>{WX_ZH[agentElement] ?? "金"}命</span>
                    <span className="text-xs text-slate-500">Lv.{agent?.level ?? 1}</span>
                  </div>
                </div>
                {/* 右：HP/MP/AP/體力條 + 展開箭頭 */}
                <div className="flex items-center gap-2">
                  {/* HP/MP/AP/體力小型條狀顯示 */}
                  <div className="flex items-center gap-1.5">
                    {[
                      { icon: "♥", val: agent?.hp ?? 0, max: agent?.maxHp ?? 100, color: "#ef4444" },
                      { icon: "💧", val: agent?.mp ?? 0, max: agent?.maxMp ?? 100, color: "#38bdf8" },
                      { icon: "⚡", val: agent?.actionPoints ?? 0, max: agent?.maxActionPoints ?? 10, color: "#f59e0b" },
                      { icon: "🏃", val: staminaInfo?.current ?? agent?.stamina ?? 100, max: staminaInfo?.max ?? agent?.maxStamina ?? 100, color: "#22c55e" },
                    ].map((bar) => (
                      <div key={bar.icon} className="flex items-center gap-0.5">
                        <span className="text-[10px]" style={{ color: bar.color }}>{bar.icon}</span>
                        <div className="w-10 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${bar.max > 0 ? Math.min(100, (bar.val / bar.max) * 100) : 0}%`, background: bar.color }} />
                        </div>
                        <span className="text-[9px] tabular-nums font-bold" style={{ color: bar.color }}>{bar.val}</span>
                      </div>
                    ))}
                  </div>
                  {/* 展開箭頭 */}
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="font-bold text-base leading-none" style={{ color: charPanelOpen ? "#64748b" : ec }}>{charPanelOpen ? "▼" : "▲"}</span>
                    {!charPanelOpen && <span className="text-[9px] font-bold" style={{ color: ec, letterSpacing: "0.05em" }}>角色</span>}
                  </div>
                </div>
              </div>

              {/* 抽屜內容（展開時顯示，高度 50vh） */}
              {charPanelOpen && (
                <div className="flex flex-col overflow-hidden" style={{ height: "50vh" }}>
                  <CharacterPanel
                    agent={agent}
                    staminaInfo={staminaInfo}
                    natalStats={natalStats}
                    equippedData={equippedData as { userGender?: string; dayMasterElementEn?: string; equipped?: Record<string, { name: string; quality?: string } | null> } | null | undefined}
                    balanceData={balanceData as { gameCoins?: number; gameStones?: number } | null | undefined}
                    dailyData={dailyData as { dayPillar?: { stem?: string; branch?: string; stemElement?: string } } | null | undefined}
                    divineHeal={divineHeal}
                    divineEye={divineEye}
                    divineStamina={divineStamina}
                    setStrategy={setStrategy}
                    ec={ec}
                    mobileMode={true}
                  />
                  {/* 手機版功能按鈕列 */}
                  <div className="px-3 py-2 flex items-center gap-1.5 border-t shrink-0"
                    style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(8,12,25,0.97)" }}>
                    {/* 旅人日誌 */}
                    <button
                      onClick={() => { setShowLog(v => !v); setCharPanelOpen(false); }}
                      className="flex-1 flex items-center justify-center gap-1 px-1.5 py-2 rounded-xl border transition-all active:scale-[0.98]"
                      style={{ background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.28)" }}>
                      <span className="text-sm">📜</span>
                      <span className="text-xs text-amber-300 font-bold">日誌</span>
                      {(eventLog?.length ?? 0) > 0 && (
                        <span className="text-xs font-bold px-1 rounded-full" style={{ background: "#ef4444", color: "#fff", fontSize: "10px" }}>
                          {(eventLog?.length ?? 0) > 99 ? "99+" : eventLog?.length}
                        </span>
                      )}
                    </button>
                    {/* 地圖傳送 */}
                    <button
                      onClick={() => { setShowTeleport(true); setCharPanelOpen(false); }}
                      className="flex-1 flex items-center justify-center gap-1 px-1.5 py-2 rounded-xl border transition-all active:scale-[0.98]"
                      style={{ background: "rgba(56,189,248,0.08)", borderColor: "rgba(56,189,248,0.28)" }}>
                      <span className="text-sm">🗺️</span>
                      <span className="text-xs text-sky-300 font-bold">傳送</span>
                    </button>
                    {/* 虛相世界商店（手機版）—導向 GameShop */}
                    <button
                      onClick={() => navigate("/game/gameshop")}
                      className="flex-1 flex items-center justify-center gap-1 px-1.5 py-2 rounded-xl border transition-all active:scale-[0.98]"
                      style={{ background: "rgba(34,197,94,0.08)", borderColor: "rgba(34,197,94,0.28)" }}>
                      <span className="text-sm">🏪</span>
                      <span className="text-xs text-green-300 font-bold">商店</span>
                    </button>
                    {/* 密店（導向 GameShop 密店Tab） */}
                    <button
                      onClick={() => navigate("/game/gameshop?tab=hidden")}
                      className="flex-1 flex items-center justify-center gap-1 px-1.5 py-2 rounded-xl border transition-all active:scale-[0.98]"
                      style={{
                        background: hiddenShopTier === "high" ? "rgba(245,158,11,0.12)" : hiddenShopTier === "mid" ? "rgba(167,139,250,0.10)" : "rgba(96,165,250,0.08)",
                        borderColor: hiddenShopTier === "high" ? "rgba(245,158,11,0.5)" : hiddenShopTier === "mid" ? "rgba(167,139,250,0.4)" : "rgba(96,165,250,0.3)",
                        boxShadow: hiddenShopTier === "high" ? "0 0 10px rgba(245,158,11,0.4)" : "none",
                      }}>
                      <span className="text-sm">🔍</span>
                      <span className="text-xs font-bold" style={{ color: hiddenShopColor }}>密店</span>
                    </button>
                  </div>
                  {/* Bug 3+9 fix: 管理員按鈕已整合到 GameTabLayout 底部 Tab Bar（僅 admin 可見） */}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </GameTabLayout>
  );
}
