/**
 * VirtualWorldPage.tsx
 * 靈相虛界主畫面 — 放置型文字冒險遊戲入口
 * 路由：/game（取代原 GameLobby）
 *
 * 三欄佈局（桌面版）/ 單欄滑動（手機版）：
 *   左欄：旅人狀態面板
 *   中欄：冒險事件日誌
 *   右欄：神明策略台
 */
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import GameTabLayout from "@/components/GameTabLayout";

// ─── 五行顏色 ────────────────────────────────────────────────
const WUXING_HEX: Record<string, string> = {
  wood:  "#2E8B57",
  fire:  "#DC143C",
  earth: "#CD853F",
  metal: "#C9A227",
  water: "#00CED1",
};
const WUXING_ZH: Record<string, string> = {
  wood: "木", fire: "火", earth: "土", metal: "金", water: "水",
};

// ─── 策略選項 ────────────────────────────────────────────────
type Strategy = "explore" | "farm" | "gather" | "rest";
const STRATEGIES: { id: Strategy; icon: string; label: string; desc: string }[] = [
  { id: "explore", icon: "🗺️", label: "探索",  desc: "前往未知節點" },
  { id: "farm",    icon: "⚔️", label: "刷怪",  desc: "在當前區域戰鬥" },
  { id: "gather",  icon: "🌿", label: "採集",  desc: "收集材料道具" },
  { id: "rest",    icon: "😴", label: "休息",  desc: "恢復 HP / MP" },
];

// ─── 示範事件日誌（靜態骨架，等待 Tick 引擎串接）────────────
type EventLog = {
  id: number;
  time: string;
  icon: string;
  text: string;
  type: "combat" | "move" | "collect" | "rest" | "system";
  highlight?: boolean;
};
const DEMO_EVENTS: EventLog[] = [
  { id: 1,  time: "10:05:22", icon: "⚔️", text: "遭遇了【木屬性・竹林幽靈】(Lv.3)！", type: "combat" },
  { id: 2,  time: "10:05:27", icon: "✅", text: "擊敗竹林幽靈！獲得 18 點經驗、8 枚金幣。", type: "combat", highlight: true },
  { id: 3,  time: "10:05:32", icon: "🚶", text: "啟程前往【大安森林公園】，預計 3 分鐘後抵達。", type: "move" },
  { id: 4,  time: "10:06:12", icon: "🌿", text: "在路途中採集到了【青草藥】x2。", type: "collect" },
  { id: 5,  time: "10:08:35", icon: "📍", text: "抵達【大安森林公園】。危險等級：中等。", type: "move", highlight: true },
  { id: 6,  time: "10:08:40", icon: "⚔️", text: "遭遇了【木屬性・山豬精】(Lv.5)！", type: "combat" },
  { id: 7,  time: "10:08:45", icon: "💥", text: "屬性克制！造成 150% 巨額傷害 → 45 點！", type: "combat", highlight: true },
  { id: 8,  time: "10:08:50", icon: "✅", text: "擊敗山豬精！獲得 35 點經驗、15 枚金幣。", type: "combat" },
  { id: 9,  time: "10:09:01", icon: "⬆️", text: "等級提升！Lv.4 → Lv.5。HP 上限 +10。", type: "system", highlight: true },
  { id: 10, time: "10:09:05", icon: "🗺️", text: "根據探索策略，正在評估下一個目標節點…", type: "move" },
];

// ─── 事件顏色 ────────────────────────────────────────────────
const EVENT_COLOR: Record<EventLog["type"], string> = {
  combat:  "#ef4444",
  move:    "#60a5fa",
  collect: "#34d399",
  rest:    "#a78bfa",
  system:  "#f59e0b",
};

// ─── 主組件 ──────────────────────────────────────────────────
export default function VirtualWorldPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [strategy, setStrategy] = useState<Strategy>("explore");
  const logRef = useRef<HTMLDivElement>(null);

  // 取得命格資料（用於旅人狀態面板）
  const { data: equippedData } = trpc.gameAvatar.getEquipped.useQuery(undefined, {
    enabled: !!user,
    staleTime: 60000,
  });

  // 取得靈石/天命幣餘額
  const { data: balanceData } = trpc.gameShop.getBalance.useQuery(undefined, {
    enabled: !!user,
    staleTime: 30000,
  });

  // 取得今日流日（從 dailyEnergy）
  const { data: dailyData } = trpc.oracle.dailyEnergy.useQuery(undefined, {
    enabled: !!user,
    staleTime: 300000,
  });

  // 自動滾動到最新事件
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, []);

  // ── 未登入 ──────────────────────────────────────────────────
  if (!user) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-6 px-4"
        style={{ background: "radial-gradient(ellipse at 50% 30%, #1a2a3a 0%, #050d14 70%)" }}
      >
        <div className="text-6xl">🌏</div>
        <h1 className="text-2xl font-bold text-amber-300 tracking-widest">靈相虛界</h1>
        <p className="text-slate-400 text-sm text-center max-w-xs">
          登入後即可派遣你的命格旅人，踏上台灣大地的放置冒險之旅
        </p>
        <a
          href={getLoginUrl()}
          className="px-8 py-3 rounded-xl font-bold text-black text-sm transition-all hover:scale-105"
          style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}
        >
          登入開始
        </a>
      </div>
    );
  }

  // ── 資料解析 ─────────────────────────────────────────────────
  const natalStats = equippedData?.natalStats;
  const userGender = equippedData?.userGender ?? "female";
  const dayMasterEn = equippedData?.dayMasterElementEn ?? "metal";
  const elementColor = WUXING_HEX[dayMasterEn] ?? "#C9A227";
  const elementZh = WUXING_ZH[dayMasterEn] ?? "金";

  const hp = natalStats?.hp ?? 100;
  const mp = natalStats?.mp ?? 60;
  const atk = natalStats?.atk ?? 15;
  const def = natalStats?.def ?? 10;
  const spd = natalStats?.spd ?? 8;

  const gameCoins = balanceData?.gameCoins ?? 0;
  const gameStones = balanceData?.gameStones ?? 0;

  const todayStem = dailyData?.dayPillar?.stem ?? "甲";
  const todayBranch = dailyData?.dayPillar?.branch ?? "子";
  const todayElement = dailyData?.dayPillar?.stemElement ?? "木";
  const todayElementEn = ["木","火","土","金","水"].includes(todayElement)
    ? ({"木":"wood","火":"fire","土":"earth","金":"metal","水":"water"} as Record<string,string>)[todayElement] ?? "wood"
    : "wood";
  const todayColor = WUXING_HEX[todayElementEn] ?? "#2E8B57";

  const userName = user?.name ?? "旅人";

  return (
    <GameTabLayout activeTab="world">
      {/* ── 頂部標題列 ─────────────────────────────────────── */}
      <div className="px-4 pt-6 pb-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🌏</span>
            <h1
              className="text-lg font-bold tracking-widest"
              style={{
                background: "linear-gradient(135deg, #f59e0b, #ef4444)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              靈相虛界
            </h1>
          </div>
          <p className="text-slate-500 text-[10px] tracking-widest pl-7">VIRTUAL WORLD · ORACLE RESONANCE</p>
        </div>
        {/* 今日流日 */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium"
          style={{
            borderColor: `${todayColor}40`,
            background: `${todayColor}10`,
            color: todayColor,
          }}
        >
          <span>今日</span>
          <span className="font-bold">{todayStem}{todayBranch}</span>
          <span className="opacity-60">({todayElement}旺)</span>
        </div>
      </div>

      {/* ── 主體三欄（桌面）/ 單欄（手機）────────────────────── */}
      <div className="px-4 pb-4 grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── 左欄：旅人狀態面板 ─────────────────────────────── */}
        <div
          className="rounded-2xl p-4 border flex flex-col gap-3"
          style={{
            background: "rgba(255,255,255,0.03)",
            borderColor: `${elementColor}30`,
            boxShadow: `0 0 20px ${elementColor}10`,
          }}
        >
          {/* 旅人名稱 + 等級 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-300 font-bold text-sm">{userName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{ background: `${elementColor}25`, color: elementColor }}
                >
                  {elementZh}命
                </span>
                <span className="text-[10px] text-slate-500">Lv.5</span>
              </div>
            </div>
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl border"
              style={{
                background: `radial-gradient(circle, ${elementColor}20, transparent)`,
                borderColor: `${elementColor}40`,
              }}
            >
              {userGender === "male" ? "🧙" : "🧝"}
            </div>
          </div>

          {/* 位置 */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>📍</span>
            <span>大安森林公園</span>
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400">探索中</span>
          </div>

          {/* HP / MP 條 */}
          <div className="space-y-2">
            <StatBar label="HP" value={hp} max={hp} color="#ef4444" icon="❤️" />
            <StatBar label="MP" value={mp} max={mp} color="#60a5fa" icon="💧" />
          </div>

          {/* 五行能力值 */}
          <div className="border-t pt-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <p className="text-[10px] text-slate-500 mb-2 tracking-widest">命格能力值</p>
            <div className="space-y-1.5">
              <MiniStat icon="🌿" label="木 HP"  value={hp}  color="#2E8B57" />
              <MiniStat icon="🔥" label="火 攻"  value={atk} color="#DC143C" />
              <MiniStat icon="🪨" label="土 防"  value={def} color="#CD853F" />
              <MiniStat icon="⚡" label="金 速"  value={spd} color="#C9A227" />
              <MiniStat icon="💧" label="水 MP"  value={mp}  color="#00CED1" />
            </div>
          </div>

          {/* 貨幣 */}
          <div className="border-t pt-3 flex gap-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-1.5 text-xs">
              <span>🪙</span>
              <span className="text-amber-300 font-bold">{gameCoins.toLocaleString()}</span>
              <span className="text-slate-500">天命幣</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span>💎</span>
              <span className="text-cyan-300 font-bold">{gameStones}</span>
              <span className="text-slate-500">靈石</span>
            </div>
          </div>
        </div>

        {/* ── 中欄：冒險事件日誌 ─────────────────────────────── */}
        <div
          className="rounded-2xl border flex flex-col lg:col-span-1"
          style={{
            background: "rgba(255,255,255,0.02)",
            borderColor: "rgba(255,255,255,0.07)",
            minHeight: "360px",
          }}
        >
          {/* 標題 */}
          <div
            className="px-4 py-3 border-b flex items-center justify-between"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">📜</span>
              <span className="text-sm font-bold text-slate-200">冒險日誌</span>
            </div>
            {/* 即時指示燈 */}
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] text-green-400">自動進行中</span>
            </div>
          </div>

          {/* 日誌列表 */}
          <div
            ref={logRef}
            className="flex-1 overflow-y-auto px-4 py-3 space-y-2 font-mono"
            style={{ maxHeight: "320px" }}
          >
            {DEMO_EVENTS.map((event) => (
              <div
                key={event.id}
                className={`flex gap-2 text-xs leading-relaxed transition-all ${
                  event.highlight ? "opacity-100" : "opacity-75"
                }`}
              >
                <span className="text-slate-600 shrink-0 tabular-nums">[{event.time}]</span>
                <span className="shrink-0">{event.icon}</span>
                <span
                  style={{
                    color: event.highlight
                      ? EVENT_COLOR[event.type]
                      : "rgba(148,163,184,0.85)",
                    fontWeight: event.highlight ? "600" : "400",
                  }}
                >
                  {event.text}
                </span>
              </div>
            ))}
          </div>

          {/* 底部：等待 Tick 引擎串接提示 */}
          <div
            className="px-4 py-2.5 border-t flex items-center gap-2"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}
          >
            <div className="flex gap-0.5">
              {[0,1,2].map(i => (
                <div
                  key={i}
                  className="w-1 h-1 rounded-full bg-amber-400"
                  style={{ animationDelay: `${i * 0.2}s`, animation: "pulse 1.5s infinite" }}
                />
              ))}
            </div>
            <span className="text-[10px] text-slate-600">Tick 引擎串接中，目前顯示示範日誌</span>
          </div>
        </div>

        {/* ── 右欄：神明策略台 ───────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {/* 策略切換 */}
          <div
            className="rounded-2xl p-4 border"
            style={{
              background: "rgba(255,255,255,0.03)",
              borderColor: "rgba(255,255,255,0.07)",
            }}
          >
            <p className="text-[10px] text-slate-500 mb-3 tracking-widest">神明策略台</p>
            <div className="grid grid-cols-2 gap-2">
              {STRATEGIES.map((s) => (
                <button
                  key={s.id}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl border transition-all text-center"
                  onClick={() => setStrategy(s.id)}
                  style={{
                    background: strategy === s.id
                      ? "rgba(245,158,11,0.12)"
                      : "rgba(255,255,255,0.02)",
                    borderColor: strategy === s.id
                      ? "rgba(245,158,11,0.4)"
                      : "rgba(255,255,255,0.06)",
                    boxShadow: strategy === s.id
                      ? "0 0 12px rgba(245,158,11,0.15)"
                      : "none",
                  }}
                >
                  <span className="text-xl">{s.icon}</span>
                  <span
                    className="text-xs font-bold"
                    style={{ color: strategy === s.id ? "#f59e0b" : "rgba(148,163,184,0.8)" }}
                  >
                    {s.label}
                  </span>
                  <span className="text-[9px] text-slate-600">{s.desc}</span>
                </button>
              ))}
            </div>
            <div
              className="mt-3 px-3 py-2 rounded-lg text-xs text-center"
              style={{ background: "rgba(245,158,11,0.08)", color: "rgba(245,158,11,0.8)" }}
            >
              🎯 目前策略：{STRATEGIES.find(s => s.id === strategy)?.label}
            </div>
          </div>

          {/* 神明干預 */}
          <div
            className="rounded-2xl p-4 border"
            style={{
              background: "rgba(255,255,255,0.03)",
              borderColor: "rgba(255,255,255,0.07)",
            }}
          >
            <p className="text-[10px] text-slate-500 mb-3 tracking-widest">神明干預</p>
            <div className="space-y-2">
              <DivineButton
                icon="💊"
                label="神蹟治癒"
                cost={5}
                desc="恢復 50% HP"
                stones={gameStones}
                onClick={() => {/* TODO: 串接 gameWorld.spendStones */}}
              />
              <DivineButton
                icon="🌀"
                label="神蹟傳送"
                cost={10}
                desc="傳送至指定節點"
                stones={gameStones}
                onClick={() => {/* TODO: 串接 gameWorld.spendStones */}}
              />
            </div>
          </div>

          {/* 今日流日加成 */}
          <div
            className="rounded-2xl p-4 border"
            style={{
              background: `${todayColor}08`,
              borderColor: `${todayColor}25`,
            }}
          >
            <p className="text-[10px] text-slate-500 mb-2 tracking-widest">今日流日加成</p>
            <p className="text-sm font-bold mb-1" style={{ color: todayColor }}>
              {todayStem}{todayBranch}（{todayElement}旺）
            </p>
            <p className="text-xs text-slate-400">
              {todayElement}屬性怪物掉落率 +30%
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {todayElement}屬性技能傷害 +20%
            </p>
          </div>

          {/* 快速入口 */}
          <div className="grid grid-cols-2 gap-2">
            <button
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all hover:scale-105"
              onClick={() => navigate("/game/profile")}
              style={{
                background: "rgba(155,89,182,0.08)",
                borderColor: "rgba(155,89,182,0.25)",
              }}
            >
              <span className="text-xl">👤</span>
              <span className="text-xs text-slate-300">靈相空間</span>
            </button>
            <button
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all hover:scale-105"
              onClick={() => navigate("/game/shop")}
              style={{
                background: "rgba(0,206,209,0.08)",
                borderColor: "rgba(0,206,209,0.25)",
              }}
            >
              <span className="text-xl">🛒</span>
              <span className="text-xs text-slate-300">天命商城</span>
            </button>
          </div>
        </div>
      </div>
    </GameTabLayout>
  );
}

// ─── 子組件 ──────────────────────────────────────────────────

function StatBar({
  label, value, max, color, icon,
}: {
  label: string; value: number; max: number; color: string; icon: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-3">{icon}</span>
      <span className="text-[10px] text-slate-500 w-5">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-[10px] text-slate-400 tabular-nums w-14 text-right">
        {value}/{max}
      </span>
    </div>
  );
}

function MiniStat({
  icon, label, value, color,
}: {
  icon: string; label: string; value: number; color: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span>{icon}</span>
      <span className="text-slate-500 w-10">{label}</span>
      <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(100, (value / 200) * 100)}%`,
            background: color,
          }}
        />
      </div>
      <span className="text-slate-300 font-bold tabular-nums w-8 text-right">{value}</span>
    </div>
  );
}

function DivineButton({
  icon, label, cost, desc, stones, onClick,
}: {
  icon: string; label: string; cost: number; desc: string; stones: number; onClick: () => void;
}) {
  const canAfford = stones >= cost;
  return (
    <button
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left"
      onClick={onClick}
      disabled={!canAfford}
      style={{
        background: canAfford ? "rgba(245,158,11,0.06)" : "rgba(255,255,255,0.02)",
        borderColor: canAfford ? "rgba(245,158,11,0.25)" : "rgba(255,255,255,0.05)",
        opacity: canAfford ? 1 : 0.5,
      }}
    >
      <span className="text-xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-200">{label}</p>
        <p className="text-[10px] text-slate-500">{desc}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[10px] text-cyan-400 font-bold">{cost}</span>
        <span className="text-[10px] text-slate-600">靈石</span>
      </div>
    </button>
  );
}
