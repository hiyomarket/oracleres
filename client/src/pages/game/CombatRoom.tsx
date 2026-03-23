/**
 * CombatRoom.tsx
 * 虛相戰鬥介面主頁面（測試版）
 * 路由：/game/combat
 * PROPOSAL-20260323-GAME-虛相戰鬥介面與角色立繪
 *
 * 本次實作範圍：
 * - 左右橫式佈局（左側敵方預留區 / 右側玩家區）
 * - 玩家角色立繪狀態切換（idle / attack / hit）
 * - 下方操作選單（攻擊測試 / 受傷測試）
 * - 不含真實戰鬥數值計算與怪物 AI
 */

import React, { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import CombatPlayer, { type PlayerState, type PlayerGender } from "@/components/game/CombatPlayer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sword, Shield, Zap, SkullIcon } from "lucide-react";

// ─── 戰鬥訊息類型 ─────────────────────────────────────────────
interface CombatMessage {
  id: number;
  text: string;
  type: "info" | "attack" | "hit" | "system";
}

let msgId = 0;

const CombatRoom: React.FC = () => {
  const [playerState, setPlayerState] = useState<PlayerState>("idle");
  const [messages, setMessages] = useState<CombatMessage[]>([
    { id: ++msgId, text: "⚔️ 進入虛相戰場，準備戰鬥！", type: "system" },
    { id: ++msgId, text: "🔮 敵方區域尚未開放（TASK-006 魔物立繪待整合）", type: "info" },
  ]);

  // 取得用戶資料（性別）
  const { data: me } = trpc.auth.me.useQuery();
  const gender: PlayerGender = (me as any)?.gender === "male" ? "male" : "female";

  // ─── 狀態切換（0.5 秒後自動回 idle） ─────────────────────
  const triggerState = useCallback((state: PlayerState, msg: string, msgType: CombatMessage["type"]) => {
    setPlayerState(state);
    setMessages((prev) => [
      ...prev.slice(-9), // 保留最後 9 條
      { id: ++msgId, text: msg, type: msgType },
    ]);
    setTimeout(() => setPlayerState("idle"), 500);
  }, []);

  const handleAttack = () => {
    triggerState("attack", "⚔️ 你發動了攻擊！", "attack");
  };

  const handleHit = () => {
    triggerState("hit", "💥 你受到了傷害！", "hit");
  };

  // ─── 訊息顏色 ─────────────────────────────────────────────
  const msgColor: Record<CombatMessage["type"], string> = {
    info:   "text-gray-400",
    attack: "text-amber-300",
    hit:    "text-red-400",
    system: "text-cyan-300",
  };

  return (
    <div
      className="min-h-screen flex flex-col overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #0a0f1a 0%, #0f1a2e 60%, #1a0f0a 100%)",
      }}
    >
      {/* ── 頂部導覽列 ─────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <Link href="/game/avatar">
          <button className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={18} />
            <span className="text-sm">靈相空間</span>
          </button>
        </Link>
        <h1 className="text-base font-semibold tracking-wider" style={{ color: "#C9A227" }}>
          ⚔ 虛相戰場
        </h1>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse inline-block" />
          測試版
        </div>
      </div>

      {/* ── 主戰鬥區域 ─────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0">

        {/* 左側：敵方區域（預留） */}
        <div className="flex-1 relative flex items-end justify-center pb-4 border-r border-white/10">
          {/* 地面線 */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-white/10" />

          {/* 敵方 Placeholder */}
          <div className="flex flex-col items-center gap-2 mb-8 opacity-30">
            <SkullIcon size={48} className="text-gray-600" />
            <div className="text-xs text-gray-600 text-center px-4">
              敵方區域<br />
              <span className="text-[10px]">TASK-006 魔物立繪待整合</span>
            </div>
          </div>

          {/* 左側裝飾光效 */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at 50% 80%, rgba(220,20,60,0.05) 0%, transparent 70%)",
            }}
          />
        </div>

        {/* 右側：玩家區域 */}
        <div className="flex-1 relative flex items-end justify-center pb-4">
          {/* 地面線 */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-white/10" />

          {/* 玩家立繪容器 */}
          <div className="relative w-full" style={{ height: "min(60vh, 400px)" }}>
            <CombatPlayer
              gender={gender}
              state={playerState}
              flip={false}
              className="w-full h-full"
            />
          </div>

          {/* 玩家名稱標籤 */}
          <div
            className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-medium border"
            style={{ borderColor: "#C9A227", color: "#C9A227", background: "rgba(0,0,0,0.6)" }}
          >
            {me?.name ?? "旅人"} · {gender === "female" ? "女" : "男"}
          </div>

          {/* 右側裝飾光效 */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at 50% 80%, rgba(201,162,39,0.08) 0%, transparent 70%)",
            }}
          />
        </div>
      </div>

      {/* ── 戰鬥訊息欄 ─────────────────────────────────────── */}
      <div
        className="shrink-0 h-24 overflow-y-auto px-4 py-2 border-t border-white/10 bg-black/40"
        style={{ scrollbarWidth: "none" }}
      >
        {messages.map((msg) => (
          <div key={msg.id} className={`text-xs py-0.5 ${msgColor[msg.type]}`}>
            {msg.text}
          </div>
        ))}
      </div>

      {/* ── 操作選單 ─────────────────────────────────────────── */}
      <div className="shrink-0 px-4 py-3 border-t border-white/10 bg-[#0a0f1a]">
        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
          <Button
            onClick={handleAttack}
            className="h-12 font-semibold text-sm flex items-center gap-2 border"
            style={{
              background: "linear-gradient(135deg, #7c2d12, #b45309)",
              borderColor: "#C9A227",
              color: "#fef3c7",
            }}
          >
            <Sword size={18} />
            攻擊測試
          </Button>
          <Button
            onClick={handleHit}
            className="h-12 font-semibold text-sm flex items-center gap-2 border"
            style={{
              background: "linear-gradient(135deg, #1e1b4b, #4c1d95)",
              borderColor: "#7c3aed",
              color: "#e9d5ff",
            }}
          >
            <Shield size={18} />
            受傷測試
          </Button>
        </div>

        {/* 說明文字 */}
        <p className="text-center text-[10px] text-gray-600 mt-2">
          測試版 · 真實戰鬥數值與怪物 AI 將於後續版本整合
        </p>
      </div>
    </div>
  );
};

export default CombatRoom;
