/**
 * CombatPlayer.tsx
 * 玩家角色立繪渲染組件
 * PROPOSAL-20260323-GAME-虛相戰鬥介面與角色立繪
 *
 * 關鍵技術：
 * - 使用 absolute bottom-0 對齊腳底，確保切換狀態時角色不跳動
 * - 美術 Agent 已將所有圖片的腳底站立點對齊在 Y=900 或 Y=901
 */

import React from "react";

// ─── TASK-008 立繪 CDN URL ────────────────────────────────────
const PLAYER_SPRITES = {
  male: {
    idle:   "https://d2xsxph8kpxj0f.cloudfront.net/310519663104688923/MLF7bLVZzzxdGTPVXTct3c/player_male_idle_956e678d.png",
    attack: "https://d2xsxph8kpxj0f.cloudfront.net/310519663104688923/MLF7bLVZzzxdGTPVXTct3c/player_male_attack_4a69b57b.png",
    hit:    "https://d2xsxph8kpxj0f.cloudfront.net/310519663104688923/MLF7bLVZzzxdGTPVXTct3c/player_male_hit_c51563b7.png",
  },
  female: {
    idle:   "https://d2xsxph8kpxj0f.cloudfront.net/310519663104688923/MLF7bLVZzzxdGTPVXTct3c/player_female_idle_00c1da48.png",
    attack: "https://d2xsxph8kpxj0f.cloudfront.net/310519663104688923/MLF7bLVZzzxdGTPVXTct3c/player_female_attack_5df16cf8.png",
    hit:    "https://d2xsxph8kpxj0f.cloudfront.net/310519663104688923/MLF7bLVZzzxdGTPVXTct3c/player_female_hit_b4cf2e89.png",
  },
};

export type PlayerState = "idle" | "attack" | "hit";
export type PlayerGender = "male" | "female";

interface CombatPlayerProps {
  gender: PlayerGender;
  state: PlayerState;
  /** 是否翻轉（敵方面向左，玩家面向右） */
  flip?: boolean;
  className?: string;
}

const CombatPlayer: React.FC<CombatPlayerProps> = ({
  gender,
  state,
  flip = false,
  className = "",
}) => {
  const sprites = PLAYER_SPRITES[gender];
  const src = sprites[state];

  // 攻擊時輕微前傾，受傷時後退閃爍
  const animClass =
    state === "attack"
      ? "scale-x-110 brightness-125"
      : state === "hit"
        ? "brightness-75 animate-pulse"
        : "";

  return (
    <div
      className={`relative w-full h-full ${className}`}
      style={{ minHeight: "200px" }}
    >
      <img
        src={src}
        alt={`${gender} ${state}`}
        className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-full max-h-full w-auto object-contain transition-all duration-150 select-none ${animClass}`}
        style={{
          transform: `translateX(-50%) ${flip ? "scaleX(-1)" : ""}`,
          imageRendering: "auto",
          // 確保切換時不因圖片尺寸差異造成跳動
          maxWidth: "100%",
        }}
        draggable={false}
      />
    </div>
  );
};

export default CombatPlayer;
