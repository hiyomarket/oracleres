/**
 * TeleportModal — 地圖傳送彈窗（V14）
 */
import { useState } from "react";
import type { MapNode } from "../../../../../shared/mapNodes";
import { calcMoveCost } from "../../../../../shared/mapNodes";
import { WX_HEX, WX_ZH, WX_EMOJI } from "./constants";

export function TeleportModal({
  nodes, currentNodeId, onClose, onTeleport, isPending, agentAP, agentStamina, moveStaminaCost,
}: {
  nodes: MapNode[];
  currentNodeId: string;
  agentStamina?: number;
  moveStaminaCost?: number;
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
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(56,189,248,0.2)" }}>
          <div>
            <h2 className="text-lg font-bold text-sky-300">🗺️ 地圖傳送</h2>
            <p className="text-xs text-slate-500 mt-0.5">目前：{currentNode?.name ?? currentNodeId} · 體力 {currentStamina} 點</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xl px-2">✕</button>
        </div>
        <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜尋地名或縣市…"
            className="w-full px-3 py-2 rounded-xl text-sm text-slate-200 outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(56,189,248,0.2)" }}
          />
        </div>
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
        <div className="px-4 py-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <button
            onClick={() => selected && onTeleport(selected)}
            disabled={!selected || isPending || currentStamina < (moveStaminaCost ?? 2)}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: selected && currentStamina >= (moveStaminaCost ?? 2) ? "linear-gradient(135deg,#0ea5e9,#38bdf8)" : "rgba(100,100,120,0.2)",
              color: selected && currentStamina >= (moveStaminaCost ?? 2) ? "#000" : "#475569",
            }}>
            {isPending ? "⏳ 移動中…" : selected ? `🗺️ 前往 ${nodes.find(n => n.id === selected)?.name ?? selected}（消耗 ${moveStaminaCost ?? 2} 體力）` : "請選擇目標地點"}
          </button>
          {currentStamina < (moveStaminaCost ?? 2) && (
            <p className="text-center text-red-400 text-xs mt-2">體力不足，無法移動（需要 {moveStaminaCost ?? 2} 點體力）</p>
          )}
        </div>
      </div>
    </div>
  );
}
