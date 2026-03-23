import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import {
  WUXING_NAMES,
  WUXING_CSS_CLASS,
  WUXING_BG_CLASS,
  STATUS_NAMES,
  STATUS_COLORS,
  STRATEGY_NAMES,
  STRATEGY_DESC,
  EVENT_TYPE_COLORS,
  EVENT_TYPE_NAMES,
  TERRAIN_ICONS,
  type WuXing,
} from "@/lib/wuxing";
import { useAuth } from "@/_core/hooks/useAuth";

// ─── 顏色常數 ─────────────────────────────────────────────────
const EL_TEXT: Record<string, string> = {
  wood: "text-green-400",
  fire: "text-red-400",
  earth: "text-yellow-400",
  metal: "text-slate-300",
  water: "text-blue-400",
};
const EL_BORDER: Record<string, string> = {
  wood: "border-green-700/40",
  fire: "border-red-700/40",
  earth: "border-yellow-700/40",
  metal: "border-slate-600/40",
  water: "border-blue-700/40",
};
const EL_BG: Record<string, string> = {
  wood: "bg-green-950/50",
  fire: "bg-red-950/50",
  earth: "bg-yellow-950/50",
  metal: "bg-slate-900/50",
  water: "bg-blue-950/50",
};
const EL_BAR: Record<string, string> = {
  wood: "bg-green-500",
  fire: "bg-red-500",
  earth: "bg-yellow-500",
  metal: "bg-slate-400",
  water: "bg-blue-500",
};

// ─── 小工具 ───────────────────────────────────────────────────
function Bar({ value, max, color, label }: { value: number; max: number; color: string; label?: string }) {
  const pct = Math.min(100, Math.round((value / Math.max(max, 1)) * 100));
  return (
    <div>
      {label && (
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>{label}</span>
          <span>{value}/{max}</span>
        </div>
      )}
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Stars({ n, max = 5 }: { n: number; max?: number }) {
  return (
    <span>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={i < n ? "text-orange-400" : "text-slate-700"}>★</span>
      ))}
    </span>
  );
}

function Badge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    idle: ["待機", "bg-slate-700 text-slate-300"],
    moving: ["移動中", "bg-blue-900 text-blue-300"],
    fighting: ["戰鬥中", "bg-red-900 text-red-300"],
    gathering: ["採集中", "bg-green-900 text-green-300"],
    resting: ["休息中", "bg-purple-900 text-purple-300"],
    dead: ["陣亡", "bg-slate-900 text-slate-500"],
  };
  const [label, cls] = map[status] ?? [status, "bg-slate-700 text-slate-300"];
  const pulse = ["moving", "fighting", "gathering"].includes(status) ? "animate-pulse" : "";
  return <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${cls} ${pulse}`}>{label}</span>;
}

function Card({ children, el, className = "" }: { children: React.ReactNode; el?: string; className?: string }) {
  const border = el ? EL_BORDER[el] : "border-slate-800/60";
  const bg = el ? EL_BG[el] : "bg-slate-900/50";
  return (
    <div className={`rounded-2xl border p-4 ${border} ${bg} ${className}`}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-slate-500 font-mono mb-3">— {children} —</div>;
}

function Empty({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-600">
      <span className="text-4xl">{icon}</span>
      <span className="text-sm">{text}</span>
    </div>
  );
}

// ─── Tab：旅人檔案 ────────────────────────────────────────────
function TabAgent({ agent }: { agent: any }) {
  if (!agent) return <Empty icon="⚔️" text="旅人尚未出發" />;
  const el = agent.dominantElement ?? "wood";
  const wuxing = [
    { k: "wood", lbl: "木", pct: agent.wuxingWood ?? 20, stat: "HP", val: agent.maxHp },
    { k: "fire", lbl: "火", pct: agent.wuxingFire ?? 20, stat: "攻", val: agent.attack },
    { k: "earth", lbl: "土", pct: agent.wuxingEarth ?? 20, stat: "防", val: agent.defense },
    { k: "metal", lbl: "金", pct: agent.wuxingMetal ?? 20, stat: "速", val: agent.speed },
    { k: "water", lbl: "水", pct: agent.wuxingWater ?? 20, stat: "MP", val: agent.maxMp },
  ];

  return (
    <div className="flex flex-col gap-3 pb-4">
      {/* 頭像卡 */}
      <Card el={el}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-white font-bold text-lg leading-tight">{agent.name}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-sm ${EL_TEXT[el]}`}>{WUXING_NAMES[el as WuXing]}靈相</span>
              <span className="text-slate-400 text-sm">Lv.{agent.level}</span>
              <Badge status={agent.status} />
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">靈氣</div>
            <div className="text-2xl font-bold text-amber-400">{agent.exp ?? 0}</div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Bar value={agent.hp} max={agent.maxHp} color="bg-green-500" label="HP" />
          <Bar value={agent.mp} max={agent.maxMp} color="bg-blue-500" label="MP" />
          <Bar value={agent.exp} max={agent.expToNext} color="bg-amber-500" label="EXP" />
        </div>
      </Card>

      {/* 命格五行 */}
      <Card>
        <SectionLabel>命格五行（八字連動）</SectionLabel>
        <div className="grid grid-cols-5 gap-1 text-center mb-3">
          {wuxing.map((w) => (
            <div key={w.k}>
              <div className={`text-sm font-bold ${EL_TEXT[w.k]}`}>{w.lbl}</div>
              <div className="text-xs text-slate-500">{w.stat}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {wuxing.map((w) => (
            <div key={w.k} className="flex items-center gap-2">
              <span className={`text-xs w-4 ${EL_TEXT[w.k]}`}>{w.lbl}</span>
              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${EL_BAR[w.k]}`} style={{ width: `${w.pct}%` }} />
              </div>
              <span className="text-xs text-slate-500 w-8 text-right">{w.pct}%</span>
              <span className={`text-xs w-14 text-right font-mono ${EL_TEXT[w.k]}`}>{w.stat} {w.val}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* 財富 */}
      <Card>
        <SectionLabel>財富</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 bg-slate-800/60 rounded-xl p-3">
            <span className="text-xl">🪙</span>
            <div>
              <div className="text-white font-bold">{agent.gold ?? 0}</div>
              <div className="text-xs text-slate-400">天命幣</div>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-800/60 rounded-xl p-3">
            <span className="text-xl">💎</span>
            <div>
              <div className="text-blue-300 font-bold">{agent.spiritStone ?? 0}</div>
              <div className="text-xs text-slate-400">靈石</div>
            </div>
          </div>
        </div>
      </Card>

      {/* 當前位置 */}
      {agent.currentNode && (
        <Card>
          <SectionLabel>當前位置</SectionLabel>
          <div className="flex items-start gap-3">
            <span className="text-2xl">{TERRAIN_ICONS[agent.currentNode.terrain] ?? "📍"}</span>
            <div className="flex-1">
              <div className={`font-bold ${EL_TEXT[agent.currentNode.element]}`}>{agent.currentNode.name}</div>
              <div className="text-xs text-slate-500 mt-0.5">{agent.currentNode.county}</div>
              <div className="flex items-center gap-2 mt-1">
                <Stars n={agent.currentNode.dangerLevel} />
                <span className="text-xs text-slate-600">危險度</span>
              </div>
            </div>
          </div>
          {agent.movingToNode && (
            <div className="mt-2 text-xs text-blue-400 flex items-center gap-1">
              <span className="animate-pulse">→</span>
              <span>前往 {agent.movingToNode.name}</span>
            </div>
          )}
        </Card>
      )}

      {/* 成就（預留） */}
      <Card className="opacity-40">
        <SectionLabel>成就進度</SectionLabel>
        <div className="text-center text-xs text-slate-600 py-2">完成任務後解鎖</div>
      </Card>
    </div>
  );
}

// ─── Tab：冒險日誌 ────────────────────────────────────────────
function TabLog({ events, onTick, ticking }: { events: any[]; onTick: () => void; ticking: boolean }) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events.length]);

  const TYPE_ICON: Record<string, string> = {
    move: "🚶", combat: "⚔️", loot: "💰", gather: "🌿",
    trade: "🛒", rest: "😴", levelup: "⬆️", divine: "✨",
    weather: "🌤️", encounter: "👁️", death: "💀", system: "📡",
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <SectionLabel>冒險日誌</SectionLabel>
        <button
          onClick={onTick}
          disabled={ticking}
          className="text-xs bg-green-900/50 border border-green-700/50 text-green-400 px-3 py-1 rounded-full hover:bg-green-800/50 transition-colors disabled:opacity-50"
        >
          {ticking ? "結算中..." : "手動 Tick"}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
        {events.length === 0 ? (
          <Empty icon="📜" text="旅人尚未留下任何記錄" />
        ) : (
          [...events].reverse().map((ev, i) => {
            const color = EVENT_TYPE_COLORS[ev.eventType] ?? "text-slate-400";
            return (
              <div key={ev.id ?? i} className="flex items-start gap-2 py-2 px-3 rounded-xl bg-slate-900/50 border border-slate-800/40">
                <span className="text-base shrink-0 mt-0.5">{TYPE_ICON[ev.eventType] ?? "•"}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${color}`}>{ev.message}</p>
                  <div className="text-xs text-slate-600 mt-0.5 font-mono">
                    {ev.nodeId && <span className="mr-2">📍{ev.nodeId}</span>}
                    Tick #{ev.tick}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// ─── Tab：地圖 ────────────────────────────────────────────────
function TabMap({ nodes, currentNodeId, spiritStone, onTeleport }: {
  nodes: any[]; currentNodeId: string; spiritStone: number; onTeleport: (id: string) => void;
}) {
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState<"list" | "map">("list");
  const FILTERS = [
    { id: "all", lbl: "全部" },
    { id: "wood", lbl: "木" },
    { id: "fire", lbl: "火" },
    { id: "earth", lbl: "土" },
    { id: "metal", lbl: "金" },
    { id: "water", lbl: "水" },
  ];
  const filtered = filter === "all" ? nodes : nodes.filter((n) => n.element === filter);
  const currentNode = nodes.find((n) => n.id === currentNodeId);

  return (
    <div className="flex flex-col h-full gap-3">
      {/* 當前位置 */}
      {currentNode && (
        <Card el={currentNode.element} className="shrink-0">
          <div className="text-xs text-slate-400 mb-1">當前位置</div>
          <div className="flex items-center gap-2">
            <span className="text-xl">{TERRAIN_ICONS[currentNode.terrain] ?? "📍"}</span>
            <div>
              <div className={`font-bold ${EL_TEXT[currentNode.element]}`}>{currentNode.name}</div>
              <div className="text-xs text-slate-400">{currentNode.county} · 怪物 Lv.{currentNode.monsterLevel?.[0]}–{currentNode.monsterLevel?.[1]}</div>
            </div>
          </div>
        </Card>
      )}

      {/* 切換列 */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex gap-1">
          {(["list", "map"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${view === v ? "bg-green-900/60 border-green-600 text-green-300" : "border-slate-700 text-slate-500"}`}>
              {v === "list" ? "清單" : "地圖"}
            </button>
          ))}
        </div>
        <div className="flex gap-1 overflow-x-auto flex-1">
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`text-xs px-2 py-1 rounded-full border shrink-0 transition-colors ${filter === f.id ? `border-current ${EL_TEXT[f.id] ?? "text-slate-300"} bg-slate-800` : "border-slate-700 text-slate-500"}`}>
              {f.lbl}
            </button>
          ))}
        </div>
      </div>

      {/* 清單 / 地圖 */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {view === "list" ? (
          <div className="space-y-2">
            {filtered.map((node) => {
              const isCurrent = node.id === currentNodeId;
              return (
                <div key={node.id}
                  className={`rounded-2xl border p-3 transition-colors ${isCurrent ? `${EL_BORDER[node.element]} ${EL_BG[node.element]}` : "border-slate-800 bg-slate-900/40"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <span className="text-lg shrink-0 mt-0.5">{TERRAIN_ICONS[node.terrain] ?? "📍"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-bold text-sm ${EL_TEXT[node.element]}`}>{node.name}</span>
                          {isCurrent && <span className="text-xs bg-green-900/60 text-green-400 px-1.5 py-0.5 rounded-full">在此</span>}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{node.county} · {node.terrain}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Stars n={node.dangerLevel} />
                          <span className="text-xs text-slate-600">Lv.{node.monsterLevel?.[0]}–{node.monsterLevel?.[1]}</span>
                        </div>
                      </div>
                    </div>
                    {!isCurrent && spiritStone >= 10 && (
                      <button onClick={() => onTeleport(node.id)}
                        className="shrink-0 text-xs bg-cyan-900/50 border border-cyan-700/50 text-cyan-400 px-2 py-1 rounded-lg hover:bg-cyan-800/50 transition-colors">
                        傳送 💎10
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <TaiwanMiniMap nodes={nodes} currentNodeId={currentNodeId} />
        )}
      </div>
    </div>
  );
}

function TaiwanMiniMap({ nodes, currentNodeId }: { nodes: any[]; currentNodeId: string }) {
  const SVG_COLOR: Record<string, string> = {
    wood: "#22c55e", fire: "#ef4444", earth: "#eab308", metal: "#94a3b8", water: "#3b82f6",
  };
  // 每縣市取一個代表節點
  const byCounty = new Map<string, any>();
  for (const n of nodes) { if (!byCounty.has(n.county)) byCounty.set(n.county, n); }
  const reps = Array.from(byCounty.values());
  const currentCounty = nodes.find((n) => n.id === currentNodeId)?.county;

  return (
    <Card>
      <div className="text-xs text-slate-500 text-center mb-2">台灣地圖（縣市代表節點）</div>
      <svg viewBox="0 0 100 120" className="w-full max-h-72">
        {reps.map((n) =>
          (n.connections ?? []).map((cid: string) => {
            const t = reps.find((r) => r.id === cid);
            if (!t) return null;
            return <line key={`${n.id}-${cid}`} x1={n.x} y1={n.y} x2={t.x} y2={t.y} stroke="#334155" strokeWidth="0.5" strokeDasharray="1,1" />;
          })
        )}
        {reps.map((n) => {
          const active = n.county === currentCounty;
          return (
            <g key={n.id}>
              <circle cx={n.x} cy={n.y} r={active ? 4 : 2.5} fill={SVG_COLOR[n.element] ?? "#6b7280"} opacity={active ? 1 : 0.65} stroke={active ? "#fff" : "none"} strokeWidth={active ? 0.8 : 0} />
              {active && <text x={n.x} y={n.y - 5} textAnchor="middle" fontSize="3" fill="#fff">{n.county.replace("縣", "").replace("市", "")}</text>}
            </g>
          );
        })}
      </svg>
      <div className="flex justify-center gap-3 mt-2">
        {["wood", "fire", "earth", "metal", "water"].map((el) => (
          <div key={el} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SVG_COLOR[el] }} />
            <span className={`text-xs ${EL_TEXT[el]}`}>{WUXING_NAMES[el as WuXing]}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Tab：神明策略台 ──────────────────────────────────────────
function TabStrategy({ agent, worldStatus, onStrategy, onHeal, isPending }: {
  agent: any; worldStatus: any; onStrategy: (s: string) => void; onHeal: () => void; isPending: boolean;
}) {
  const STRATS = [
    { id: "explore", icon: "🗺️", name: "探索", desc: "四處探索，遭遇怪物時戰鬥" },
    { id: "farm", icon: "⚔️", name: "刷怪", desc: "專注刷怪，最大化戰鬥收益" },
    { id: "gather", icon: "🌿", name: "採集", desc: "主要採集素材，避開高風險" },
    { id: "rest", icon: "😴", name: "休息", desc: "原地休息，快速恢復 HP/MP" },
  ];
  const dailyEl = (worldStatus?.dailyElement ?? "wood") as WuXing;
  const elIcon: Record<string, string> = { wood: "🌿", fire: "🔥", earth: "🏔️", metal: "⚡", water: "💧" };

  return (
    <div className="flex flex-col gap-3 pb-4">
      {/* 今日流日 */}
      <Card el={dailyEl}>
        <SectionLabel>今日流日</SectionLabel>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{elIcon[dailyEl]}</span>
          <div>
            <div className={`font-bold text-lg ${EL_TEXT[dailyEl]}`}>
              {worldStatus?.dailyStem ?? "甲"}{worldStatus?.dailyBranch ?? "子"}（{WUXING_NAMES[dailyEl]}旺）
            </div>
            <div className="text-xs text-slate-400 mt-0.5">{WUXING_NAMES[dailyEl]}屬性怪物掉落率 +30%</div>
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-600 font-mono">全服 Tick #{worldStatus?.currentTick ?? 0}</div>
      </Card>

      {/* 行動策略 */}
      <Card>
        <SectionLabel>行動策略</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          {STRATS.map((s) => {
            const active = agent?.strategy === s.id;
            return (
              <button key={s.id} onClick={() => onStrategy(s.id)} disabled={isPending}
                className={`rounded-2xl border p-3 text-left transition-all ${active ? "border-green-500/60 bg-green-950/40 ring-1 ring-green-500/20" : "border-slate-700 bg-slate-900/40 hover:border-slate-600"}`}>
                <div className="text-xl mb-1">{s.icon}</div>
                <div className={`text-sm font-bold ${active ? "text-green-300" : "text-slate-300"}`}>{s.name}</div>
                <div className="text-xs text-slate-500 mt-0.5 leading-tight">{s.desc}</div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* 神明干預 */}
      <Card>
        <SectionLabel>神明干預</SectionLabel>
        <div className="flex flex-col gap-2">
          <button onClick={onHeal} disabled={isPending || (agent?.spiritStone ?? 0) < 5}
            className="flex items-center justify-between rounded-2xl border border-cyan-700/40 bg-cyan-950/30 p-3 hover:bg-cyan-950/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <div className="flex items-center gap-2">
              <span className="text-xl">💊</span>
              <div className="text-left">
                <div className="text-sm font-bold text-cyan-300">神蹟治癒</div>
                <div className="text-xs text-slate-400">恢復 50% HP，解除休息狀態</div>
              </div>
            </div>
            <div className="text-sm text-blue-300 font-bold shrink-0">💎 5</div>
          </button>
        </div>
      </Card>

      {/* 來自靈相的祝福（預留） */}
      <Card className="border-amber-700/20 bg-amber-950/10">
        <SectionLabel>來自靈相的祝福</SectionLabel>
        <div className="text-center text-xs text-slate-600 py-2">完成今日穿搭任務後，祝福加成將顯示於此</div>
        <div className="mt-2 text-xs text-slate-700 text-center">
          Aura Score 80+ → 天命祝福：全屬性 +15%、稀有掉落 +30%
        </div>
      </Card>
    </div>
  );
}

// ─── Tab：世界（擴充入口）────────────────────────────────────
function TabWorld() {
  const FEATURES = [
    { icon: "⚔️", name: "戰鬥圖鑑", desc: "已遭遇的怪物記錄", soon: false },
    { icon: "🌿", name: "採集倉庫", desc: "素材收集與管理", soon: true },
    { icon: "🔨", name: "鍛造工坊", desc: "消耗素材打造裝備", soon: true },
    { icon: "🛒", name: "流浪商人", desc: "限時稀有道具交易", soon: true },
    { icon: "📜", name: "隨機任務", desc: "NPC 委託任務系統", soon: true },
    { icon: "🏆", name: "成就徽章", desc: "解鎖成就與稱號", soon: true },
    { icon: "🐾", name: "靈獸系統", desc: "捕捉與培養靈獸", soon: true },
    { icon: "🏠", name: "靈相空間", desc: "陽宅開運・命理服務", soon: true },
  ];

  return (
    <div className="flex flex-col gap-3 pb-4">
      <SectionLabel>世界功能</SectionLabel>
      <div className="grid grid-cols-2 gap-3">
        {FEATURES.map((f) => (
          <div key={f.name}
            className={`rounded-2xl border p-4 transition-colors ${f.soon ? "border-slate-800 bg-slate-900/20 opacity-45" : "border-slate-700 bg-slate-900/60 hover:border-slate-600 cursor-pointer"}`}>
            <div className="text-2xl mb-2">{f.icon}</div>
            <div className="text-sm font-bold text-slate-200">{f.name}</div>
            <div className="text-xs text-slate-500 mt-0.5">{f.desc}</div>
            {f.soon && <div className="text-xs text-slate-700 mt-1">即將開放</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 主元件 ───────────────────────────────────────────────────
export default function VirtualWorld() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<"log" | "agent" | "map" | "strategy" | "world">("log");
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  const enabled = !!user;

  const { data: agentData, refetch: refetchAgent } = trpc.game.getAgentStatus.useQuery(undefined, {
    enabled, refetchInterval: 5000,
  });
  const { data: events, refetch: refetchEvents } = trpc.game.getEventLog.useQuery(
    { limit: 80 }, { enabled, refetchInterval: 5000 }
  );
  const { data: worldStatus } = trpc.game.getWorldStatus.useQuery(undefined, { refetchInterval: 10000 });
  const { data: mapNodes } = trpc.game.getMapNodes.useQuery();

  // 自動建立旅人
  trpc.game.getOrCreateAgent.useQuery(undefined, { enabled: enabled && agentData === null });

  const setStrategy = trpc.game.setStrategy.useMutation({
    onSuccess: () => { refetchAgent(); showToast("策略已更新"); },
    onError: (e) => showToast(e.message),
  });
  const divineHeal = trpc.game.divineHeal.useMutation({
    onSuccess: () => { refetchAgent(); refetchEvents(); showToast("神蹟治癒已施放！"); },
    onError: (e) => showToast(e.message),
  });
  const divineTransport = trpc.game.divineTransport.useMutation({
    onSuccess: () => { refetchAgent(); refetchEvents(); showToast("神蹟傳送完成！"); },
    onError: (e) => showToast(e.message),
  });
  const triggerTick = trpc.game.triggerTick.useMutation({
    onSuccess: () => { refetchAgent(); refetchEvents(); },
  });

  // Demo 模式：暫時移除登入驗證，讓主系統 Agent 可以直接查看架構
  // TODO: 上線前恢復登入驗證
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-green-400 font-mono animate-pulse text-sm">正在連結虛相世界...</div>
      </div>
    );
  }

  const agent = agentData?.agent;
  const nodes = mapNodes ?? [];
  const currentNodeId = agent?.currentNodeId ?? "";
  const isPending = setStrategy.isPending || divineHeal.isPending || divineTransport.isPending;

  const TABS = [
    { id: "log", icon: "📜", label: "日誌" },
    { id: "agent", icon: "👤", label: "旅人" },
    { id: "map", icon: "🗺️", label: "地圖" },
    { id: "strategy", icon: "✨", label: "神明" },
    { id: "world", icon: "🌏", label: "世界" },
  ] as const;

  const dailyEl = (worldStatus?.dailyElement ?? "wood") as WuXing;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-mono select-none">
      {/* 頂部狀態列 */}
      <div className="sticky top-0 z-20 bg-slate-950/95 backdrop-blur border-b border-slate-800/60 px-4 py-2.5">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-green-400 font-bold text-sm">【靈相虛界】</span>
            {agent && <Badge status={agent.status} />}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            {worldStatus && (
              <span className={EL_TEXT[dailyEl]}>
                流日：{worldStatus.dailyStem}{worldStatus.dailyBranch}
              </span>
            )}
            <span className="text-slate-600">{user.name}</span>
          </div>
        </div>
      </div>

      {/* 主內容 */}
      <div className="flex-1 overflow-hidden">
        <div
          className="max-w-lg mx-auto px-4 pt-4 flex flex-col"
          style={{ height: "calc(100dvh - 112px)" }}
        >
          {tab === "log" && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <TabLog events={events ?? []} onTick={() => triggerTick.mutate()} ticking={triggerTick.isPending} />
            </div>
          )}
          {tab === "agent" && (
            <div className="flex-1 overflow-y-auto">
              <TabAgent agent={agent ? { ...agent, currentNode: agentData?.currentNode, movingToNode: agentData?.movingToNode } : null} />
            </div>
          )}
          {tab === "map" && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <TabMap
                nodes={nodes}
                currentNodeId={currentNodeId}
                spiritStone={agent?.spiritStone ?? 0}
                onTeleport={(id) => divineTransport.mutate({ targetNodeId: id })}
              />
            </div>
          )}
          {tab === "strategy" && (
            <div className="flex-1 overflow-y-auto">
              <TabStrategy
                agent={agent}
                worldStatus={worldStatus}
                onStrategy={(s) => setStrategy.mutate({ strategy: s as any })}
                onHeal={() => divineHeal.mutate()}
                isPending={isPending}
              />
            </div>
          )}
          {tab === "world" && (
            <div className="flex-1 overflow-y-auto">
              <TabWorld />
            </div>
          )}
        </div>
      </div>

      {/* 底部 Tab Bar */}
      <div className="sticky bottom-0 z-20 bg-slate-950/95 backdrop-blur border-t border-slate-800/60">
        <div className="flex max-w-lg mx-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition-colors ${tab === t.id ? "text-green-400" : "text-slate-600 hover:text-slate-400"}`}
            >
              <span className="text-lg leading-none">{t.icon}</span>
              <span className="text-xs">{t.label}</span>
              {tab === t.id && <div className="w-1 h-1 rounded-full bg-green-400 mt-0.5" />}
            </button>
          ))}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-800 border border-slate-600 text-white text-sm px-4 py-2 rounded-full shadow-xl whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  );
}
