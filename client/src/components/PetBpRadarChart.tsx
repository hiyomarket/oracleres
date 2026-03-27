/**
 * PetBpRadarChart.tsx — 寵物 BP 五維雷達圖 + 歷史變化動畫
 * 支援時間軸滑桿拖動查看不同時間點的 BP 分佈
 */
import { useState, useRef, useEffect, useMemo, useCallback } from "react";

// ─── 常量 ─────────────────────────────────────────────────
const DIMENSIONS = [
  { key: "constitution", label: "體質", color: "#22c55e", angle: -90 },
  { key: "strength", label: "力量", color: "#ef4444", angle: -18 },
  { key: "magic", label: "魔力", color: "#38bdf8", angle: 54 },
  { key: "agility", label: "敏捷", color: "#e2e8f0", angle: 126 },
  { key: "defense", label: "防禦", color: "#f59e0b", angle: 198 },
] as const;

const SOURCE_LABEL: Record<string, string> = {
  battle: "⚔️ 戰鬥",
  idle: "💤 掛機",
  levelup: "⬆️ 升級",
  manual: "🔧 手動",
};

const SOURCE_COLOR: Record<string, string> = {
  battle: "#ef4444",
  idle: "#a855f7",
  levelup: "#f59e0b",
  manual: "#38bdf8",
};

type BpRecord = {
  id: number;
  source: string;
  description: string | null;
  prevConstitution: number;
  prevStrength: number;
  prevDefense: number;
  prevAgility: number;
  prevMagic: number;
  newConstitution: number;
  newStrength: number;
  newDefense: number;
  newAgility: number;
  newMagic: number;
  deltaConstitution: number;
  deltaStrength: number;
  deltaDefense: number;
  deltaAgility: number;
  deltaMagic: number;
  createdAt: number;
};

type Props = {
  history: BpRecord[];
  currentBp: {
    constitution: number;
    strength: number;
    defense: number;
    agility: number;
    magic: number;
  };
  accentColor?: string;
};

// ─── 工具函數 ─────────────────────────────────────────────
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function getBpValues(record: BpRecord, useNew = true) {
  if (useNew) {
    return {
      constitution: record.newConstitution,
      strength: record.newStrength,
      defense: record.newDefense,
      agility: record.newAgility,
      magic: record.newMagic,
    };
  }
  return {
    constitution: record.prevConstitution,
    strength: record.prevStrength,
    defense: record.prevDefense,
    agility: record.prevAgility,
    magic: record.prevMagic,
  };
}

export default function PetBpRadarChart({ history, currentBp, accentColor = "#a855f7" }: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number>(-1); // -1 = current
  const [isPlaying, setIsPlaying] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 計算最大 BP 值（用於雷達圖比例）
  const maxBp = useMemo(() => {
    let max = 10;
    const allRecords = [...history];
    for (const r of allRecords) {
      max = Math.max(max, r.newConstitution, r.newStrength, r.newDefense, r.newAgility, r.newMagic);
    }
    max = Math.max(max, currentBp.constitution, currentBp.strength, currentBp.defense, currentBp.agility, currentBp.magic);
    return Math.ceil(max / 5) * 5; // 向上取整到 5 的倍數
  }, [history, currentBp]);

  // 當前顯示的 BP 值
  const displayBp = useMemo(() => {
    if (selectedIdx === -1 || history.length === 0) return currentBp;
    const record = history[selectedIdx];
    if (!record) return currentBp;
    return getBpValues(record, true);
  }, [selectedIdx, history, currentBp]);

  // 前一個 BP 值（用於疊加顯示）
  const prevBp = useMemo(() => {
    if (selectedIdx === -1 || history.length === 0) {
      if (history.length > 0) {
        const last = history[history.length - 1];
        return getBpValues(last, false);
      }
      return null;
    }
    const record = history[selectedIdx];
    if (!record) return null;
    return getBpValues(record, false);
  }, [selectedIdx, history]);

  // 繪製雷達圖
  const drawRadar = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 280;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const maxR = size / 2 - 40;

    ctx.clearRect(0, 0, size, size);

    // 繪製背景網格
    const gridLevels = 5;
    for (let i = 1; i <= gridLevels; i++) {
      const r = (maxR / gridLevels) * i;
      ctx.beginPath();
      DIMENSIONS.forEach((dim, j) => {
        const pt = polarToCartesian(cx, cy, r, dim.angle);
        if (j === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.closePath();
      ctx.strokeStyle = `rgba(255,255,255,${i === gridLevels ? 0.15 : 0.06})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 繪製軸線
    DIMENSIONS.forEach((dim) => {
      const pt = polarToCartesian(cx, cy, maxR, dim.angle);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(pt.x, pt.y);
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // 繪製前一個 BP（灰色半透明）
    if (prevBp) {
      ctx.beginPath();
      DIMENSIONS.forEach((dim, j) => {
        const val = prevBp[dim.key as keyof typeof prevBp] || 0;
        const r = (val / maxBp) * maxR;
        const pt = polarToCartesian(cx, cy, Math.max(r, 2), dim.angle);
        if (j === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.closePath();
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 繪製當前 BP（主色填充）
    ctx.beginPath();
    DIMENSIONS.forEach((dim, j) => {
      const val = displayBp[dim.key as keyof typeof displayBp] || 0;
      const r = (val / maxBp) * maxR;
      const pt = polarToCartesian(cx, cy, Math.max(r, 2), dim.angle);
      if (j === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.closePath();
    ctx.fillStyle = `${accentColor}20`;
    ctx.fill();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 繪製頂點圓點
    DIMENSIONS.forEach((dim) => {
      const val = displayBp[dim.key as keyof typeof displayBp] || 0;
      const r = (val / maxBp) * maxR;
      const pt = polarToCartesian(cx, cy, Math.max(r, 2), dim.angle);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = dim.color;
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // 繪製標籤
    DIMENSIONS.forEach((dim) => {
      const val = displayBp[dim.key as keyof typeof displayBp] || 0;
      const labelR = maxR + 22;
      const pt = polarToCartesian(cx, cy, labelR, dim.angle);
      ctx.font = "bold 11px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = dim.color;
      ctx.fillText(`${dim.label}`, pt.x, pt.y - 7);
      ctx.font = "10px system-ui";
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillText(`${val}`, pt.x, pt.y + 7);
    });

    // 繪製刻度數值
    for (let i = 1; i <= gridLevels; i++) {
      const val = Math.round((maxBp / gridLevels) * i);
      const r = (maxR / gridLevels) * i;
      const pt = polarToCartesian(cx, cy, r, -90);
      ctx.font = "9px system-ui";
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillText(`${val}`, pt.x - 4, pt.y);
    }
  }, [displayBp, prevBp, maxBp, accentColor]);

  useEffect(() => {
    drawRadar();
  }, [drawRadar]);

  // 播放動畫
  useEffect(() => {
    if (isPlaying && history.length > 0) {
      let idx = 0;
      playRef.current = setInterval(() => {
        setSelectedIdx(idx);
        idx++;
        if (idx >= history.length) {
          idx = -1;
          setSelectedIdx(-1);
          setIsPlaying(false);
          if (playRef.current) clearInterval(playRef.current);
        }
      }, 600);
    }
    return () => {
      if (playRef.current) clearInterval(playRef.current);
    };
  }, [isPlaying, history.length]);

  const selectedRecord = selectedIdx >= 0 && selectedIdx < history.length ? history[selectedIdx] : null;
  const totalBp = displayBp.constitution + displayBp.strength + displayBp.defense + displayBp.agility + displayBp.magic;

  return (
    <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-white text-sm font-bold">
          📊 BP 五維雷達圖 <span className="text-gray-500 font-normal">（總計 {totalBp}）</span>
        </h4>
        {history.length > 0 && (
          <button
            onClick={() => setShowOverlay(!showOverlay)}
            className="text-xs px-2 py-1 rounded-lg transition-all"
            style={{
              background: showOverlay ? `${accentColor}20` : "rgba(255,255,255,0.05)",
              color: showOverlay ? accentColor : "rgba(255,255,255,0.5)",
              border: `1px solid ${showOverlay ? `${accentColor}40` : "rgba(255,255,255,0.1)"}`,
            }}
          >
            {showOverlay ? "隱藏歷史" : "📈 成長歷史"}
          </button>
        )}
      </div>

      {/* 雷達圖 */}
      <div className="flex justify-center">
        <canvas ref={canvasRef} style={{ width: 280, height: 280 }} />
      </div>

      {/* BP 數值條 */}
      <div className="grid grid-cols-5 gap-2 mt-2">
        {DIMENSIONS.map((dim) => {
          const val = displayBp[dim.key as keyof typeof displayBp] || 0;
          const delta = selectedRecord
            ? selectedRecord[`delta${dim.key.charAt(0).toUpperCase() + dim.key.slice(1)}` as keyof BpRecord] as number
            : 0;
          return (
            <div key={dim.key} className="text-center">
              <div className="text-lg font-bold" style={{ color: dim.color }}>
                {val}
                {delta > 0 && <span className="text-xs ml-0.5" style={{ color: "#22c55e" }}>+{delta}</span>}
              </div>
              <div className="text-gray-500 text-xs">{dim.label}</div>
            </div>
          );
        })}
      </div>

      {/* 歷史面板 */}
      {showOverlay && history.length > 0 && (
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {/* 時間軸滑桿 */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => {
                if (isPlaying) {
                  setIsPlaying(false);
                  if (playRef.current) clearInterval(playRef.current);
                } else {
                  setSelectedIdx(0);
                  setIsPlaying(true);
                }
              }}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 transition-all"
              style={{
                background: isPlaying ? "rgba(239,68,68,0.15)" : `${accentColor}15`,
                color: isPlaying ? "#ef4444" : accentColor,
                border: `1px solid ${isPlaying ? "rgba(239,68,68,0.3)" : `${accentColor}30`}`,
              }}
            >
              {isPlaying ? "⏸" : "▶"}
            </button>
            <input
              type="range"
              min={0}
              max={history.length - 1}
              value={selectedIdx === -1 ? history.length - 1 : selectedIdx}
              onChange={(e) => {
                setIsPlaying(false);
                if (playRef.current) clearInterval(playRef.current);
                const v = parseInt(e.target.value);
                setSelectedIdx(v === history.length - 1 ? -1 : v);
              }}
              className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, ${accentColor}, ${accentColor}40)`,
                accentColor,
              }}
            />
            <button
              onClick={() => setSelectedIdx(-1)}
              className="text-xs px-2 py-1 rounded-lg transition-all"
              style={{
                background: selectedIdx === -1 ? `${accentColor}20` : "rgba(255,255,255,0.05)",
                color: selectedIdx === -1 ? accentColor : "rgba(255,255,255,0.4)",
              }}
            >
              現在
            </button>
          </div>

          {/* 選中記錄詳情 */}
          {selectedRecord && (
            <div className="rounded-lg p-3 mb-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                  style={{ color: SOURCE_COLOR[selectedRecord.source] || "#9ca3af", background: `${SOURCE_COLOR[selectedRecord.source] || "#9ca3af"}15` }}>
                  {SOURCE_LABEL[selectedRecord.source] || selectedRecord.source}
                </span>
                <span className="text-gray-500 text-xs">
                  {new Date(selectedRecord.createdAt).toLocaleString("zh-TW")}
                </span>
              </div>
              {selectedRecord.description && (
                <p className="text-gray-400 text-xs">{selectedRecord.description}</p>
              )}
            </div>
          )}

          {/* 歷史列表（最近 10 條） */}
          <div className="space-y-1 max-h-40 overflow-y-auto scrollbar-thin">
            {history.slice(-10).reverse().map((record, i) => {
              const realIdx = history.length - 1 - i;
              const isSelected = realIdx === selectedIdx;
              const totalDelta = record.deltaConstitution + record.deltaStrength + record.deltaDefense + record.deltaAgility + record.deltaMagic;
              return (
                <button
                  key={record.id}
                  onClick={() => setSelectedIdx(isSelected ? -1 : realIdx)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all"
                  style={{
                    background: isSelected ? `${accentColor}10` : "transparent",
                    border: `1px solid ${isSelected ? `${accentColor}30` : "transparent"}`,
                  }}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: SOURCE_COLOR[record.source] || "#9ca3af" }} />
                  <span className="text-gray-400 text-xs flex-1 truncate">
                    {record.description || SOURCE_LABEL[record.source] || record.source}
                  </span>
                  <span className="text-xs font-bold shrink-0" style={{ color: totalDelta > 0 ? "#22c55e" : "#9ca3af" }}>
                    {totalDelta > 0 ? `+${totalDelta}` : totalDelta}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 無歷史記錄提示 */}
      {history.length === 0 && (
        <div className="text-center py-3 text-gray-600 text-xs">
          尚無 BP 成長記錄，透過戰鬥或掛機來累積吧！
        </div>
      )}
    </div>
  );
}
