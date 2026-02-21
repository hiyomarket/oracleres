/**
 * 筊杯組件 - 木質感設計
 * 聖杯面(正面): 紅色 - 凸面
 * 笑杯面(反面): 木色 - 平面
 * 陰杯面: 黑色 - 兩反面
 * 立筊: 金色 - 特殊彩蛋
 */

import { cn } from "@/lib/utils";

export type BlockFace = 'front' | 'back' | 'special';

interface MoonBlockProps {
  face?: BlockFace;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  isAnimating?: boolean;
  animationSide?: 'left' | 'right';
  finalRotation?: number;
}

const sizeMap = {
  sm: { width: 60, height: 100 },
  md: { width: 90, height: 150 },
  lg: { width: 120, height: 200 },
};

export function MoonBlock({
  face = 'front',
  size = 'md',
  className,
  isAnimating = false,
  animationSide = 'left',
  finalRotation = 0,
}: MoonBlockProps) {
  const { width, height } = sizeMap[size];

  const animClass = isAnimating
    ? animationSide === 'left'
      ? 'animate-throw-left'
      : 'animate-throw-right'
    : '';

  return (
    <div
      className={cn('relative inline-block', animClass, className)}
      style={{
        width,
        height,
        '--final-rotation': `${finalRotation}deg`,
      } as React.CSSProperties}
    >
      <MoonBlockSVG face={face} width={width} height={height} />
    </div>
  );
}

function MoonBlockSVG({
  face,
  width,
  height,
}: {
  face: BlockFace;
  width: number;
  height: number;
}) {
  // 筊杯形狀：月牙形，上窄下寬
  const rx = width / 2;
  const ry = height / 2;
  const cx = width / 2;
  const cy = height / 2;

  // 月牙形路徑：外弧 + 內弧
  const outerPath = `
    M ${cx - rx * 0.85} ${cy - ry * 0.3}
    Q ${cx - rx * 0.95} ${cy - ry * 0.8} ${cx} ${cy - ry * 0.95}
    Q ${cx + rx * 0.95} ${cy - ry * 0.8} ${cx + rx * 0.85} ${cy - ry * 0.3}
    Q ${cx + rx * 1.0} ${cy + ry * 0.5} ${cx} ${cy + ry * 0.98}
    Q ${cx - rx * 1.0} ${cy + ry * 0.5} ${cx - rx * 0.85} ${cy - ry * 0.3}
    Z
  `;

  // 正面（聖杯面）：凸面，紅色
  if (face === 'front') {
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <radialGradient id="redGrad" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="oklch(0.65 0.26 22)" />
            <stop offset="40%" stopColor="oklch(0.52 0.28 18)" />
            <stop offset="100%" stopColor="oklch(0.38 0.20 15)" />
          </radialGradient>
          <radialGradient id="redShine" cx="35%" cy="25%" r="45%">
            <stop offset="0%" stopColor="oklch(0.80 0.15 25 / 0.6)" />
            <stop offset="100%" stopColor="oklch(0.80 0.15 25 / 0)" />
          </radialGradient>
          <filter id="redShadow">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="oklch(0.30 0.20 15 / 0.8)" />
          </filter>
        </defs>
        <path d={outerPath} fill="url(#redGrad)" filter="url(#redShadow)" />
        <path d={outerPath} fill="url(#redShine)" />
        {/* 木紋紋理線條 */}
        <path
          d={`M ${cx - rx * 0.3} ${cy - ry * 0.6} Q ${cx} ${cy - ry * 0.7} ${cx + rx * 0.3} ${cy - ry * 0.6}`}
          stroke="oklch(0.60 0.22 20 / 0.3)"
          strokeWidth="1"
          fill="none"
        />
        <path
          d={`M ${cx - rx * 0.5} ${cy} Q ${cx} ${cy + ry * 0.1} ${cx + rx * 0.5} ${cy}`}
          stroke="oklch(0.60 0.22 20 / 0.3)"
          strokeWidth="1"
          fill="none"
        />
        {/* 邊緣高光 */}
        <path
          d={`M ${cx - rx * 0.7} ${cy - ry * 0.2} Q ${cx - rx * 0.8} ${cy - ry * 0.6} ${cx} ${cy - ry * 0.9}`}
          stroke="oklch(0.80 0.15 30 / 0.4)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // 反面（笑杯面）：平面，木色
  if (face === 'back') {
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="woodGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.62 0.14 55)" />
            <stop offset="30%" stopColor="oklch(0.54 0.12 50)" />
            <stop offset="60%" stopColor="oklch(0.60 0.13 58)" />
            <stop offset="100%" stopColor="oklch(0.50 0.11 48)" />
          </linearGradient>
          <filter id="woodShadow">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="oklch(0.30 0.10 50 / 0.7)" />
          </filter>
          <pattern id="woodGrain" x="0" y="0" width="4" height="height" patternUnits="userSpaceOnUse">
            <line x1="2" y1="0" x2="2" y2={height} stroke="oklch(0.45 0.10 50 / 0.15)" strokeWidth="1" />
          </pattern>
        </defs>
        <path d={outerPath} fill="url(#woodGrad)" filter="url(#woodShadow)" />
        <path d={outerPath} fill="url(#woodGrain)" />
        {/* 木紋細節 */}
        {[0.3, 0.5, 0.7].map((t, i) => (
          <path
            key={i}
            d={`M ${cx - rx * (0.8 - t * 0.1)} ${cy - ry * (0.8 - t * 0.4)} Q ${cx} ${cy - ry * (0.9 - t * 0.4)} ${cx + rx * (0.8 - t * 0.1)} ${cy - ry * (0.8 - t * 0.4)}`}
            stroke="oklch(0.45 0.10 50 / 0.2)"
            strokeWidth="0.8"
            fill="none"
          />
        ))}
        {/* 邊緣高光 */}
        <path
          d={`M ${cx - rx * 0.7} ${cy - ry * 0.2} Q ${cx - rx * 0.8} ${cy - ry * 0.6} ${cx} ${cy - ry * 0.9}`}
          stroke="oklch(0.75 0.10 60 / 0.5)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // 特殊（立筊）：金色
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="oklch(0.92 0.18 82)" />
          <stop offset="40%" stopColor="oklch(0.82 0.22 70)" />
          <stop offset="100%" stopColor="oklch(0.88 0.16 85)" />
        </linearGradient>
        <filter id="goldGlow">
          <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="oklch(0.82 0.22 70 / 0.8)" />
        </filter>
      </defs>
      <path d={outerPath} fill="url(#goldGrad)" filter="url(#goldGlow)" />
      <path
        d={`M ${cx - rx * 0.7} ${cy - ry * 0.2} Q ${cx - rx * 0.8} ${cy - ry * 0.6} ${cx} ${cy - ry * 0.9}`}
        stroke="oklch(0.98 0.10 85 / 0.7)"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default MoonBlock;
