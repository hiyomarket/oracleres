/**
 * battle/ItemPanel.tsx — 道具選擇面板
 */
import React from "react";
import { trpc } from "@/lib/trpc";

const RARITY_COLOR: Record<string, string> = {
  common: "#94a3b8", rare: "#60a5fa", epic: "#a78bfa", legendary: "#fbbf24",
};

export function ItemPanel({ battleId, onSelect, onCancel, selectedItemId }: {
  battleId: string; onSelect: (itemId: string) => void; onCancel: () => void; selectedItemId: string | null;
}) {
  const itemsQuery = trpc.gameBattle.getBattleItems.useQuery({ battleId }, { staleTime: 30000 });

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-emerald-300 font-bold tracking-wider">🎒 選擇道具</span>
        <button onClick={onCancel}
          className="text-[10px] text-slate-500 hover:text-white transition-colors px-1.5 py-0.5 rounded hover:bg-white/5">
          ✕ 返回
        </button>
      </div>
      {itemsQuery.isLoading && <p className="text-[10px] text-slate-600 text-center py-3 animate-pulse">載入中…</p>}
      {itemsQuery.data && itemsQuery.data.length === 0 && (
        <p className="text-[10px] text-slate-600 text-center py-3">背包中沒有可用的戰鬥道具</p>
      )}
      <div className="grid grid-cols-3 gap-1.5 max-h-[150px] overflow-y-auto pr-1"
        style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(99,102,241,0.3) transparent" }}>
        {(itemsQuery.data ?? []).map(item => {
          const rarityColor = RARITY_COLOR[item.rarity] ?? "#94a3b8";
          const selected = selectedItemId === item.itemId;
          const effectDesc = item.useEffect?.description ?? item.effectDesc ?? "使用效果";
          return (
            <button key={item.itemId}
              onClick={() => onSelect(item.itemId)}
              className={`relative rounded-xl px-2 py-2 text-left transition-all duration-200 ${
                selected ? "scale-[1.02]" : "hover:scale-[1.02]"
              }`}
              style={{
                background: selected
                  ? "linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(15,13,46,0.6) 100%)"
                  : "linear-gradient(135deg, rgba(30,27,75,0.3) 0%, rgba(15,13,46,0.5) 100%)",
                border: `1px solid ${selected ? "rgba(34,197,94,0.4)" : "rgba(34,197,94,0.1)"}`,
              }}>
              <div className="flex items-center gap-1">
                <p className="font-bold text-[9px] truncate" style={{ color: rarityColor }}>{item.name}</p>
                <span className="text-[8px] text-slate-500 ml-auto shrink-0">×{item.quantity}</span>
              </div>
              <p className="text-[8px] text-slate-500 truncate mt-0.5">{effectDesc}</p>
              {selected && <div className="absolute top-1 right-1.5 text-[8px] text-emerald-300">✓</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
