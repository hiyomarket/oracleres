import { useEffect, useRef, useState } from "react";

interface AuraLevel {
  label: string;
  color: string;
  description: string;
  emoji: string;
}

interface AuraScoreGaugeProps {
  innateAura: number;
  outfitBoost: number;
  totalScore: number;
  auraLevel: AuraLevel;
  isAnimating?: boolean;
}

/**
 * AuraScoreGauge - 本日運勢總分儀表盤
 * 使用 SVG 弧形 + 動畫效果展示雙層計分
 */
export function AuraScoreGauge({
  innateAura,
  outfitBoost,
  totalScore,
  auraLevel,
  isAnimating = false,
}: AuraScoreGaugeProps) {
  const [displayScore, setDisplayScore] = useState(innateAura);
  const prevScoreRef = useRef(innateAura);
  const animFrameRef = useRef<number | null>(null);

  // 動畫計數效果
  useEffect(() => {
    const target = totalScore;
    const start = prevScoreRef.current;
    const duration = 800;
    const startTime = performance.now();

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(start + (target - start) * eased));
      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        prevScoreRef.current = target;
      }
    }

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [totalScore]);

  // SVG 弧形計算
  const SIZE = 200;
  const CENTER = SIZE / 2;
  const RADIUS = 80;
  const STROKE_WIDTH = 16;
  const START_ANGLE = -210; // 度
  const END_ANGLE = 30;
  const TOTAL_ANGLE = END_ANGLE - START_ANGLE; // 240度

  function polarToXY(angle: number, r: number) {
    const rad = (angle * Math.PI) / 180;
    return {
      x: CENTER + r * Math.cos(rad),
      y: CENTER + r * Math.sin(rad),
    };
  }

  function describeArc(startAngle: number, endAngle: number, r: number) {
    const start = polarToXY(startAngle, r);
    const end = polarToXY(endAngle, r);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  }

  // 背景弧（灰色）
  const bgPath = describeArc(START_ANGLE, END_ANGLE, RADIUS);

  // 內在底盤弧（深色）
  const innateAngle = START_ANGLE + (innateAura / 100) * TOTAL_ANGLE;
  const innatePath = describeArc(START_ANGLE, innateAngle, RADIUS);

  // 穿搭加成弧（亮色）
  const totalAngle = START_ANGLE + (displayScore / 100) * TOTAL_ANGLE;
  const boostPath = describeArc(innateAngle, totalAngle, RADIUS);

  // 指針角度
  const needleAngle = START_ANGLE + (displayScore / 100) * TOTAL_ANGLE;
  const needleTip = polarToXY(needleAngle, RADIUS - 8);
  const needleBase1 = polarToXY(needleAngle + 90, 8);
  const needleBase2 = polarToXY(needleAngle - 90, 8);

  // 顏色
  const scoreColor = auraLevel.color;
  const innateColor = "#4B5563"; // gray-600
  const boostColor = scoreColor;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* SVG 儀表盤 */}
      <div className="relative">
        <svg width={SIZE} height={SIZE * 0.75} viewBox={`0 0 ${SIZE} ${SIZE * 0.75}`}>
          {/* 背景弧 */}
          <path
            d={bgPath}
            fill="none"
            stroke="#1F2937"
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
          />
          {/* 內在底盤弧 */}
          <path
            d={innatePath}
            fill="none"
            stroke={innateColor}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
          />
          {/* 穿搭加成弧 */}
          {outfitBoost > 0 && (
            <path
              d={boostPath}
              fill="none"
              stroke={boostColor}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              style={{
                filter: `drop-shadow(0 0 6px ${boostColor}80)`,
              }}
            />
          )}
          {/* 指針 */}
          <polygon
            points={`${needleTip.x},${needleTip.y} ${needleBase1.x},${needleBase1.y} ${CENTER},${CENTER} ${needleBase2.x},${needleBase2.y}`}
            fill={scoreColor}
            style={{ filter: `drop-shadow(0 0 4px ${scoreColor})` }}
          />
          {/* 中心圓 */}
          <circle cx={CENTER} cy={CENTER} r={6} fill={scoreColor} />
          <circle cx={CENTER} cy={CENTER} r={3} fill="white" />

          {/* 分數文字 */}
          <text
            x={CENTER}
            y={CENTER + 30}
            textAnchor="middle"
            fontSize="36"
            fontWeight="bold"
            fill={scoreColor}
            style={{ fontFamily: "monospace" }}
          >
            {displayScore}
          </text>
          <text
            x={CENTER}
            y={CENTER + 48}
            textAnchor="middle"
            fontSize="11"
            fill="#9CA3AF"
          >
            / 100
          </text>
        </svg>

        {/* 動畫光暈 */}
        {isAnimating && (
          <div
            className="absolute inset-0 rounded-full animate-ping opacity-20"
            style={{ backgroundColor: scoreColor }}
          />
        )}
      </div>

      {/* 等級標籤 */}
      <div className="flex items-center gap-2">
        <span className="text-xl">{auraLevel.emoji}</span>
        <span
          className="text-lg font-bold"
          style={{ color: scoreColor }}
        >
          {auraLevel.label}
        </span>
      </div>

      {/* 雙層分數說明 */}
      <div className="flex items-center gap-3 text-sm">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-gray-600" />
          <span className="text-gray-400">天命底盤</span>
          <span className="text-white font-bold">{innateAura}</span>
        </div>
        <span className="text-gray-600">+</span>
        <div className="flex items-center gap-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: scoreColor }}
          />
          <span className="text-gray-400">穿搭加成</span>
          <span className="font-bold" style={{ color: scoreColor }}>
            +{outfitBoost}
          </span>
        </div>
      </div>

      {/* 描述文字 */}
      <p className="text-xs text-gray-400 text-center max-w-[200px] leading-relaxed">
        {auraLevel.description}
      </p>
    </div>
  );
}
