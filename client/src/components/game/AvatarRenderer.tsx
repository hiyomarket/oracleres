/**
 * AvatarRenderer.tsx
 * 靈相換裝系統 — 7 大圖層絕對定位疊加渲染元件
 *
 * 圖層由下至上：background → body → bottom → top → shoes → hair → accessory
 * 支援三視角切換：front / left45 / right45
 * 每個圖層為 position:absolute，以 PNG 透明圖層疊加方式呈現 Pop Mart 公仔風格。
 *
 * TASK-004 更新：
 * - 新增 currentView prop（front / left45 / right45）
 * - AvatarItem 新增 view 欄位，渲染時依 currentView 篩選對應圖片
 * - 五行顏色更新為指定重點配色（木#2E8B57 / 火#DC143C / 土#CD853F / 金#C9A227 / 水#00CED1）
 */

import React, { useState } from "react";

// ─── 五行顏色配置（TASK-004 指定重點配色） ──────────────────────
export const WUXING_COLORS: Record<string, { bg: string; text: string; glow: string; label: string; hex: string }> = {
  wood:  { bg: "bg-[#2E8B57]/20",  text: "text-[#2E8B57]",  glow: "shadow-[#2E8B57]/50",  label: "木", hex: "#2E8B57" },
  fire:  { bg: "bg-[#DC143C]/20",  text: "text-[#DC143C]",  glow: "shadow-[#DC143C]/50",  label: "火", hex: "#DC143C" },
  earth: { bg: "bg-[#CD853F]/20",  text: "text-[#CD853F]",  glow: "shadow-[#CD853F]/50",  label: "土", hex: "#CD853F" },
  metal: { bg: "bg-[#C9A227]/20",  text: "text-[#C9A227]",  glow: "shadow-[#C9A227]/50",  label: "金", hex: "#C9A227" },
  water: { bg: "bg-[#00CED1]/20",  text: "text-[#00CED1]",  glow: "shadow-[#00CED1]/50",  label: "水", hex: "#00CED1" },
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

export const LAYER_LABELS: Record<AvatarLayer | string, string> = {
  background: "背景",
  body:       "素體",
  bottom:     "下衣",
  top:        "上衣",
  shoes:      "鞋子",
  hair:       "髮型",
  accessory:  "飾品",
  bracelet:   "手串",
};

// ─── 視角類型 ─────────────────────────────────────────────────
export type AvatarView = "front" | "left45" | "right45";

export const VIEW_LABELS: Record<AvatarView, string> = {
  front:   "正面",
  left45:  "左側",
  right45: "右側",
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
  /** 視角：front / left45 / right45（來自 game_items） */
  view?: string;
  /** 同一圖層的其他視角圖片（key = view, value = imageUrl） */
  viewImages?: Record<string, string>;
}

interface AvatarRendererProps {
  /** 當前裝備的所有部件（最多 7 件，每個圖層一件） */
  equippedItems: AvatarItem[];
  /** 容器寬度（px），高度自動為 1.5 倍 */
  width?: number;
  /** 是否顯示圖層標籤（除錯用） */
  showLabels?: boolean;
  /** 是否顯示 Aura 光暈特效（結算後） */
  auraGlow?: string | null;
  /** 是否正在載入 */
  isLoading?: boolean;
  /** 當前視角（front / left45 / right45），由父元件控制 */
  currentView?: AvatarView;
  /** 是否顯示視角切換按鈕（預設 true） */
  showViewSwitcher?: boolean;
  /** 視角切換回調 */
  onViewChange?: (view: AvatarView) => void;
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
  木: "rgba(46,139,87,0.4)",
  火: "rgba(220,20,60,0.4)",
  土: "rgba(205,133,63,0.4)",
  金: "rgba(201,162,39,0.4)",
  水: "rgba(0,206,209,0.4)",
  // 英文 key 備用
  wood:  "rgba(46,139,87,0.4)",
  fire:  "rgba(220,20,60,0.4)",
  earth: "rgba(205,133,63,0.4)",
  metal: "rgba(201,162,39,0.4)",
  water: "rgba(0,206,209,0.4)",
};

// ─── 元件 ─────────────────────────────────────────────────────
export const AvatarRenderer: React.FC<AvatarRendererProps> = ({
  equippedItems,
  width = 240,
  showLabels = false,
  auraGlow = null,
  isLoading = false,
  currentView: externalView,
  showViewSwitcher = true,
  onViewChange,
}) => {
  const height = Math.round(width * 1.5);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const [internalView, setInternalView] = useState<AvatarView>("front");

  // 優先使用外部控制的視角，否則使用內部狀態
  const currentView = externalView ?? internalView;

  const handleViewChange = (view: AvatarView) => {
    setInternalView(view);
    onViewChange?.(view);
  };

  // 依圖層順序排列，並根據當前視角選擇正確的 imageUrl
  const layerMap: Record<string, { item: AvatarItem; resolvedImageUrl: string } | undefined> = {};
  for (const item of equippedItems) {
    // 如果 item 有 viewImages（多視角圖片），根據 currentView 選擇
    let resolvedImageUrl = item.imageUrl;
    if (item.viewImages && item.viewImages[currentView]) {
      resolvedImageUrl = item.viewImages[currentView];
    } else if (item.view && item.view !== currentView) {
      // 如果 item 本身的 view 不符合當前視角，嘗試使用 front 作為 fallback
      // （待商城道具補齊三視角後，這裡會自動切換）
      resolvedImageUrl = item.imageUrl;
    }
    layerMap[item.layer] = { item, resolvedImageUrl };
  }

  const glowStyle = auraGlow
    ? {
        boxShadow: `0 0 40px 10px ${AURA_GLOW_COLORS[auraGlow] ?? "rgba(251,191,36,0.3)"}`,
        transition: "box-shadow 0.8s ease",
      }
    : {};

  return (
    <div className="flex flex-col items-center gap-2">
      {/* 視角切換按鈕 */}
      {showViewSwitcher && (
        <div className="flex gap-1">
          {(["front", "left45", "right45"] as AvatarView[]).map((view) => (
            <button
              key={view}
              onClick={() => handleViewChange(view)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all border ${
                currentView === view
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                  : "bg-white/5 text-gray-500 border-white/10 hover:text-gray-300"
              }`}
            >
              {VIEW_LABELS[view]}
            </button>
          ))}
        </div>
      )}

      {/* 角色渲染區域 */}
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
            const entry = layerMap[layer];
            if (!entry) return null;

            const { item, resolvedImageUrl } = entry;
            const errorKey = `${String(item.id)}-${currentView}`;
            const hasError = imgErrors[errorKey];
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
                    src={resolvedImageUrl}
                    alt={LAYER_LABELS[layer]}
                    className="absolute inset-0 w-full h-full object-contain"
                    style={filterStyle}
                    onError={() =>
                      setImgErrors((prev) => ({ ...prev, [errorKey]: true }))
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
            {Array.from({ length: 12 }).map((_: unknown, i: number) => (
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

      {/* 當前視角標示 */}
      <div className="text-[10px] text-gray-600">
        {VIEW_LABELS[currentView]} 視角
      </div>
    </div>
  );
};

export default AvatarRenderer;
