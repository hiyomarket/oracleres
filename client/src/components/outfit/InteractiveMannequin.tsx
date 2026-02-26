import { useState } from "react";

export type BodyPart = "upper" | "lower" | "shoes" | "outer" | "accessory" | "bracelet";

export interface SelectedItem {
  color: string;
  wuxing: string;
  name?: string;
}

export type OutfitSelection = Partial<Record<BodyPart, SelectedItem>>;

interface InteractiveMannequinProps {
  selection: OutfitSelection;
  onPartClick: (part: BodyPart) => void;
  favorableElements?: string[];
}

// 五行顏色映射（用於顯示選中的顏色）
const WUXING_BG: Record<string, string> = {
  木: "#22C55E",
  火: "#EF4444",
  土: "#EAB308",
  金: "#D1D5DB",
  水: "#3B82F6",
};

const WUXING_GLOW: Record<string, string> = {
  木: "#22C55E40",
  火: "#EF444440",
  土: "#EAB30840",
  金: "#D1D5DB40",
  水: "#3B82F640",
};

// 部位中文名稱
const PART_LABELS: Record<BodyPart, string> = {
  upper: "上衣",
  lower: "下身",
  shoes: "鞋子",
  outer: "外套",
  accessory: "配件",
  bracelet: "手串",
};

// 部位圖示
const PART_ICONS: Record<BodyPart, string> = {
  upper: "👕",
  lower: "👖",
  shoes: "👟",
  outer: "🧥",
  accessory: "💍",
  bracelet: "📿",
};

/**
 * InteractiveMannequin - 交互式虛擬人台
 * 使用 SVG 繪製人形輪廓，各部位可點擊選擇衣物
 */
export function InteractiveMannequin({
  selection,
  onPartClick,
  favorableElements = [],
}: InteractiveMannequinProps) {
  const [hoveredPart, setHoveredPart] = useState<BodyPart | null>(null);

  function getPartColor(part: BodyPart): string {
    const item = selection[part];
    if (item?.wuxing) return WUXING_BG[item.wuxing] ?? "#6B7280";
    return "#374151"; // 未選擇：深灰
  }

  function getPartGlow(part: BodyPart): string {
    const item = selection[part];
    if (item?.wuxing) return WUXING_GLOW[item.wuxing] ?? "transparent";
    return "transparent";
  }

  function isSelected(part: BodyPart): boolean {
    return !!selection[part];
  }

  function isFavorable(part: BodyPart): boolean {
    const item = selection[part];
    return !!item?.wuxing && favorableElements.includes(item.wuxing);
  }

  const HotZone = ({
    part,
    x,
    y,
    width,
    height,
    rx = 8,
    label,
  }: {
    part: BodyPart;
    x: number;
    y: number;
    width: number;
    height: number;
    rx?: number;
    label?: string;
  }) => {
    const selected = isSelected(part);
    const favorable = isFavorable(part);
    const hovered = hoveredPart === part;
    const color = getPartColor(part);
    const glow = getPartGlow(part);

    return (
      <g
        onClick={() => onPartClick(part)}
        onMouseEnter={() => setHoveredPart(part)}
        onMouseLeave={() => setHoveredPart(null)}
        style={{ cursor: "pointer" }}
      >
        {/* 光暈效果 */}
        {(selected || hovered) && (
          <rect
            x={x - 3}
            y={y - 3}
            width={width + 6}
            height={height + 6}
            rx={rx + 3}
            fill={glow}
            style={{
              filter: selected ? `blur(6px)` : undefined,
            }}
          />
        )}
        {/* 主體 */}
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx={rx}
          fill={color}
          stroke={
            favorable ? "#FFD700" :
            selected ? color :
            hovered ? "#9CA3AF" : "#4B5563"
          }
          strokeWidth={favorable ? 2 : selected ? 1.5 : 1}
          style={{
            transition: "fill 0.3s, stroke 0.3s",
            filter: hovered ? "brightness(1.2)" : undefined,
          }}
        />
        {/* 標籤 */}
        {label && (
          <text
            x={x + width / 2}
            y={y + height / 2 + 4}
            textAnchor="middle"
            fontSize="10"
            fill={selected ? "white" : "#9CA3AF"}
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            {label}
          </text>
        )}
        {/* 已選標記 */}
        {selected && (
          <text
            x={x + width - 8}
            y={y + 12}
            textAnchor="middle"
            fontSize="8"
            fill={favorable ? "#FFD700" : "white"}
            style={{ pointerEvents: "none" }}
          >
            {favorable ? "★" : "✓"}
          </text>
        )}
      </g>
    );
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* SVG 人台 */}
      <div className="relative">
        <svg
          width="180"
          height="320"
          viewBox="0 0 180 320"
          className="overflow-visible"
        >
          {/* 人形輪廓（簡化版） */}
          {/* 頭部 */}
          <circle cx="90" cy="28" r="22" fill="#1F2937" stroke="#374151" strokeWidth="1.5" />
          <text x="90" y="33" textAnchor="middle" fontSize="18">😐</text>

          {/* 頸部 */}
          <rect x="82" y="48" width="16" height="12" rx="4" fill="#1F2937" />

          {/* 外套熱區（最外層，略大） */}
          <HotZone
            part="outer"
            x={22}
            y={60}
            width={136}
            height={90}
            rx={12}
            label={!selection.outer ? "外套" : undefined}
          />

          {/* 上衣熱區 */}
          <HotZone
            part="upper"
            x={35}
            y={65}
            width={110}
            height={80}
            rx={10}
            label={!selection.upper ? "上衣" : undefined}
          />

          {/* 左手腕（手串） */}
          <HotZone
            part="bracelet"
            x={8}
            y={105}
            width={28}
            height={22}
            rx={6}
            label={!selection.bracelet ? "手串" : undefined}
          />

          {/* 右手腕（配件/手錶） */}
          <HotZone
            part="accessory"
            x={144}
            y={105}
            width={28}
            height={22}
            rx={6}
            label={!selection.accessory ? "配件" : undefined}
          />

          {/* 下身熱區 */}
          <HotZone
            part="lower"
            x={40}
            y={152}
            width={100}
            height={100}
            rx={10}
            label={!selection.lower ? "下身" : undefined}
          />

          {/* 鞋子熱區（左） */}
          <HotZone
            part="shoes"
            x={38}
            y={258}
            width={44}
            height={28}
            rx={8}
            label={!selection.shoes ? "鞋" : undefined}
          />
          {/* 鞋子熱區（右，同步） */}
          <rect
            x={98}
            y={258}
            width={44}
            height={28}
            rx={8}
            fill={getPartColor("shoes")}
            stroke={isFavorable("shoes") ? "#FFD700" : isSelected("shoes") ? getPartColor("shoes") : "#4B5563"}
            strokeWidth={isFavorable("shoes") ? 2 : 1}
            style={{ cursor: "pointer", transition: "fill 0.3s" }}
            onClick={() => onPartClick("shoes")}
          />
        </svg>
      </div>

      {/* 選中狀態摘要 */}
      <div className="grid grid-cols-3 gap-2 w-full max-w-[280px]">
        {(["upper", "lower", "shoes", "outer", "accessory", "bracelet"] as BodyPart[]).map((part) => {
          const item = selection[part];
          return (
            <button
              key={part}
              onClick={() => onPartClick(part)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all text-xs ${
                item
                  ? "border-amber-500/50 bg-amber-900/20"
                  : "border-gray-700 bg-gray-800/50 hover:border-gray-500"
              }`}
            >
              <span className="text-base">{PART_ICONS[part]}</span>
              <span className="text-gray-400">{PART_LABELS[part]}</span>
              {item ? (
                <div className="flex items-center gap-1">
                  <div
                    className="w-3 h-3 rounded-full border border-gray-600"
                    style={{ backgroundColor: WUXING_BG[item.wuxing] ?? "#6B7280" }}
                  />
                  <span
                    className="font-medium text-[10px]"
                    style={{ color: WUXING_BG[item.wuxing] ?? "#9CA3AF" }}
                  >
                    {item.wuxing}
                  </span>
                </div>
              ) : (
                <span className="text-gray-600 text-[10px]">點擊選擇</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
