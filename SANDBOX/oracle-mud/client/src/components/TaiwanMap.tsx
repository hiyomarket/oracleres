import { useMemo } from "react";
import type { MapNode } from "../../../shared/mapNodes";
import { WUXING_CSS_CLASS } from "@/lib/wuxing";
import type { WuXing } from "@/lib/wuxing";

type Props = {
  nodes: MapNode[];
  currentNodeId?: string;
  movingToNodeId?: string;
  onNodeClick?: (nodeId: string) => void;
};

const ELEMENT_COLORS: Record<string, string> = {
  wood: "#4ade80",
  fire: "#fb923c",
  earth: "#facc15",
  metal: "#cbd5e1",
  water: "#60a5fa",
};

const DANGER_RADIUS: Record<number, number> = {
  1: 5,
  2: 6,
  3: 7,
  4: 8,
  5: 10,
};

export default function TaiwanMap({ nodes, currentNodeId, movingToNodeId, onNodeClick }: Props) {
  // 建立連線資料
  const connections = useMemo(() => {
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number; key: string }> = [];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const drawn = new Set<string>();

    for (const node of nodes) {
      for (const connId of node.connections) {
        const key = [node.id, connId].sort().join("--");
        if (drawn.has(key)) continue;
        drawn.add(key);
        const target = nodeMap.get(connId);
        if (!target) continue;
        lines.push({
          x1: node.x,
          y1: node.y,
          x2: target.x,
          y2: target.y,
          key,
        });
      }
    }
    return lines;
  }, [nodes]);

  return (
    <div className="relative w-full" style={{ paddingBottom: "120%" }}>
      <svg
        viewBox="25 10 50 65"
        className="absolute inset-0 w-full h-full"
        style={{ background: "transparent" }}
      >
        {/* 連線 */}
        {connections.map((line) => (
          <line
            key={line.key}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="rgba(74, 222, 128, 0.15)"
            strokeWidth="0.3"
            strokeDasharray="0.5 0.5"
          />
        ))}

        {/* 節點 */}
        {nodes.map((node) => {
          const isCurrent = node.id === currentNodeId;
          const isMovingTo = node.id === movingToNodeId;
          const color = ELEMENT_COLORS[node.element] ?? "#888";
          const radius = DANGER_RADIUS[node.dangerLevel] ?? 5;

          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              onClick={() => onNodeClick?.(node.id)}
              style={{ cursor: onNodeClick ? "pointer" : "default" }}
            >
              {/* 當前位置光暈 */}
              {isCurrent && (
                <circle
                  r={radius + 4}
                  fill="none"
                  stroke={color}
                  strokeWidth="0.5"
                  opacity="0.6"
                  className="animate-ping"
                  style={{ transformOrigin: "0 0" }}
                />
              )}

              {/* 移動目標閃爍 */}
              {isMovingTo && (
                <circle
                  r={radius + 3}
                  fill="none"
                  stroke="#60a5fa"
                  strokeWidth="0.5"
                  opacity="0.8"
                  style={{
                    animation: "pulse 1s ease-in-out infinite",
                    transformOrigin: "0 0",
                  }}
                />
              )}

              {/* 主節點圓圈 */}
              <circle
                r={radius * 0.8}
                fill={isCurrent ? color : `${color}33`}
                stroke={color}
                strokeWidth={isCurrent ? "0.8" : "0.4"}
                opacity={isCurrent ? 1 : 0.7}
              />

              {/* 危險等級 Boss 標記 */}
              {node.dangerLevel >= 5 && (
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="3"
                  fill="#fbbf24"
                >
                  ★
                </text>
              )}

              {/* 節點名稱（只顯示重要節點）*/}
              {(isCurrent || isMovingTo || node.dangerLevel >= 4) && (
                <text
                  y={-radius - 1.5}
                  textAnchor="middle"
                  fontSize="2.2"
                  fill={isCurrent ? color : "rgba(255,255,255,0.6)"}
                  style={{ fontFamily: "Noto Sans TC, sans-serif" }}
                >
                  {node.name.length > 5 ? node.name.slice(0, 5) + "…" : node.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* 圖例 */}
      <div className="absolute bottom-2 left-2 flex gap-2 text-[10px]">
        {(["wood", "fire", "earth", "metal", "water"] as const).map((el) => {
          const names = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };
          return (
            <div key={el} className="flex items-center gap-0.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: ELEMENT_COLORS[el] }}
              />
              <span style={{ color: ELEMENT_COLORS[el] }}>{names[el]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
