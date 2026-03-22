/**
 * AvatarRenderer.tsx
 * 靈相換裝系統 — 7 大圖層絕對定位疊加渲染元件
 *
 * 圖層由下至上：background → body → bottom → top → shoes → hair → accessory
 * 每個圖層為 position:absolute，以 PNG 透明圖層疊加方式呈現 Pop Mart 公仔風格。
 */

import React, { useState } from "react";

// ─── 五行顏色配置 ─────────────────────────────────────────────
export const WUXING_COLORS: Record<string, { bg: string; text: string; glow: string; label: string }> = {
  wood:  { bg: "bg-green-500/20",  text: "text-green-400",  glow: "shadow-green-500/50",  label: "木" },
  fire:  { bg: "bg-red-500/20",    text: "text-red-400",    glow: "shadow-red-500/50",    label: "火" },
  earth: { bg: "bg-yellow-500/20", text: "text-yellow-400", glow: "shadow-yellow-500/50", label: "土" },
  metal: { bg: "bg-gray-300/20",   text: "text-gray-300",   glow: "shadow-gray-300/50",   label: "金" },
  water: { bg: "bg-blue-500/20",   text: "text-blue-400",   glow: "shadow-blue-500/50",   label: "水" },
};

// ─── 圖層順序 ─────────────────────────────────────────────────
export const LAYER_ORDER = [
  "background",
  "body",
  "bottom",
  "top",
  "shoes",
  "hair",
  "accessory",
] as const;

export type AvatarLayer = (typeof LAYER_ORDER)[number];

export const LAYER_LABELS: Record<AvatarLayer, string> = {
  background: "背景",
  body:       "素體",
  bottom:     "下衣",
  top:        "上衣",
  shoes:      "鞋子",
  hair:       "髮型",
  accessory:  "飾品",
};

// ─── Props ────────────────────────────────────────────────────
export interface AvatarItem {
  id: number;
  layer: string;
  imageUrl: string;
  wuxing: string;
  rarity: string;
  isEquipped: number;
  isDefault?: boolean;
}

interface AvatarRendererProps {
  /** 當前裝備的所有部件（最多 7 件，每個圖層一件） */
  equippedItems: AvatarItem[];
  /** 容器寬度（px），高度自動為 1.25 倍 */
  width?: number;
  /** 是否顯示圖層標籤（除錯用） */
  showLabels?: boolean;
  /** 是否顯示 Aura 光暈特效（結算後） */
  auraGlow?: string | null;
  /** 是否正在載入 */
  isLoading?: boolean;
}

// ─── 稀有度光暈 ───────────────────────────────────────────────
const RARITY_GLOW: Record<string, string> = {
  common:    "",
  rare:      "drop-shadow(0 0 6px rgba(96,165,250,0.6))",
  epic:      "drop-shadow(0 0 8px rgba(167,139,250,0.8))",
  legendary: "drop-shadow(0 0 12px rgba(251,191,36,1))",
};

// ─── 五行 Aura 光暈顏色 ───────────────────────────────────────
const AURA_GLOW_COLORS: Record<string, string> = {
  木: "rgba(74,222,128,0.4)",
  火: "rgba(248,113,113,0.4)",
  土: "rgba(251,191,36,0.4)",
  金: "rgba(209,213,219,0.4)",
  水: "rgba(96,165,250,0.4)",
};

// ─── 元件 ─────────────────────────────────────────────────────
export const AvatarRenderer: React.FC<AvatarRendererProps> = ({
  equippedItems,
  width = 240,
  showLabels = false,
  auraGlow = null,
  isLoading = false,
}) => {
  const height = Math.round(width * 1.5);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  // 依圖層順序排列
  const layerMap: Record<string, AvatarItem | undefined> = {};
  for (const item of equippedItems) {
    layerMap[item.layer] = item;
  }

  const glowStyle = auraGlow
    ? {
        boxShadow: `0 0 40px 10px ${AURA_GLOW_COLORS[auraGlow] ?? "rgba(251,191,36,0.3)"}`,
        transition: "box-shadow 0.8s ease",
      }
    : {};

  return (
    <div
      className="relative mx-auto select-none"
      style={{ width, height, ...glowStyle }}
    >
      {/* 底層：無裝備時的佔位背景 */}
      {!layerMap["background"] && (
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: "linear-gradient(180deg, #0d1b2a 0%, #1a2a3a 50%, #0d1b2a 100%)",
          }}
        />
      )}

      {/* 載入中骨架 */}
      {isLoading && (
        <div className="absolute inset-0 rounded-2xl bg-white/5 animate-pulse" />
      )}

      {/* 7 大圖層由下至上疊加 */}
      {!isLoading &&
        LAYER_ORDER.map((layer) => {
          const item = layerMap[layer];
          if (!item) return null;

          const hasError = imgErrors[String(item.id)];
          const filterStyle = RARITY_GLOW[item.rarity] ? { filter: RARITY_GLOW[item.rarity] } : {};

          return (
            <div
              key={layer}
              className="absolute inset-0"
              style={{ zIndex: LAYER_ORDER.indexOf(layer) + 1 }}
            >
              {hasError ? (
                // 圖片載入失敗時的 fallback
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white/20 text-xs">{LAYER_LABELS[layer]}</span>
                </div>
              ) : (
                <img
                  src={item.imageUrl}
                  alt={LAYER_LABELS[layer]}
                  className="absolute inset-0 w-full h-full object-contain"
                  style={filterStyle}
                  onError={() =>
                    setImgErrors((prev) => ({ ...prev, [String(item.id)]: true }))
                  }
                  draggable={false}
                />
              )}

              {/* 圖層標籤（除錯用） */}
              {showLabels && (
                <div
                  className="absolute top-1 left-1 text-[9px] bg-black/60 text-white px-1 rounded"
                  style={{ zIndex: 100 }}
                >
                  {LAYER_LABELS[layer]}
                </div>
              )}
            </div>
          );
        })}

      {/* 五行光暈粒子特效（結算後） */}
      {auraGlow && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 20 }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full opacity-0"
              style={{
                width: 4 + (i % 4) * 2,
                height: 4 + (i % 4) * 2,
                background: AURA_GLOW_COLORS[auraGlow] ?? "rgba(251,191,36,0.6)",
                left: `${10 + (i * 7) % 80}%`,
                top: `${5 + (i * 11) % 90}%`,
                animation: `aura-particle ${1.5 + (i % 3) * 0.5}s ease-in-out ${i * 0.15}s infinite`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AvatarRenderer;
