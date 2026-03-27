/**
 * IdleSessionPanel.tsx — 掛機模式收益統計面板
 * 
 * 顯示：
 * 1. 掛機時長（即時計時器）
 * 2. 累計經驗/金幣/戰鬥次數
 * 3. 掛機效率（每小時收益）
 * 4. 寵物掛機 BP 成長
 * 5. 8 小時封頂提示
 */
import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";

const MAX_IDLE_HOURS = 8;

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

interface IdleSessionPanelProps {
  agentId?: number;
  strategy?: string;
  onClose?: () => void;
}

export function IdleSessionPanel({ agentId, strategy, onClose }: IdleSessionPanelProps) {
  const [now, setNow] = useState(Date.now());

  // 每秒更新計時器
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 查詢掛機 session
  const { data: session } = trpc.gameBattle.getIdleSession.useQuery(undefined, {
    enabled: !!agentId,
    refetchInterval: 10000,
  });

  const isIdle = strategy === "combat" || strategy === "explore" || strategy === "gather";
  const isInfuse = strategy === "infuse";

  // 計算掛機時長
  const idleDuration = useMemo(() => {
    if (!session?.startedAt) return 0;
    return now - new Date(session.startedAt).getTime();
  }, [session?.startedAt, now]);

  const idleHours = idleDuration / (1000 * 60 * 60);
  const isCapped = idleHours >= MAX_IDLE_HOURS;

  // 每小時效率
  const hourlyExp = useMemo(() => {
    if (!session?.totalExp || idleHours < 0.01) return 0;
    return Math.round(session.totalExp / idleHours);
  }, [session?.totalExp, idleHours]);

  const hourlyGold = useMemo(() => {
    if (!session?.totalGold || idleHours < 0.01) return 0;
    return Math.round(session.totalGold / idleHours);
  }, [session?.totalGold, idleHours]);

  if (!session && !isIdle && !isInfuse) return null;

  return (
    <div className="rounded-xl border overflow-hidden"
      style={{
        background: "rgba(6,10,22,0.95)",
        backdropFilter: "blur(16px)",
        borderColor: isCapped ? "rgba(239,68,68,0.4)" : "rgba(245,158,11,0.3)",
        boxShadow: isCapped ? "0 0 20px rgba(239,68,68,0.15)" : "0 0 20px rgba(245,158,11,0.1)",
      }}>
      {/* 標題列 */}
      <div className="flex items-center justify-between px-3 py-2 border-b"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{isInfuse ? "✨" : "⏰"}</span>
          <span className="text-sm font-bold" style={{ color: "#f59e0b" }}>
            {isInfuse ? "注靈掛機" : "掛機收益"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold tabular-nums"
            style={{ color: isCapped ? "#ef4444" : "#22c55e" }}>
            {formatDuration(idleDuration)}
          </span>
          {onClose && (
            <button onClick={onClose}
              className="text-slate-500 hover:text-slate-300 text-xs">✕</button>
          )}
        </div>
      </div>

      {/* 收益統計 */}
      <div className="p-3 space-y-2">
        {/* 8 小時封頂警告 */}
        {isCapped && (
          <div className="px-2 py-1.5 rounded-lg text-xs text-center"
            style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>
            已達 8 小時掛機上限，收益已停止累積
          </div>
        )}

        {/* 戰鬥統計 */}
        {session && (
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="text-xs text-slate-500">戰鬥次數</div>
              <div className="text-sm font-bold text-slate-200">{session.totalBattles ?? 0}</div>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="text-xs text-slate-500">累計經驗</div>
              <div className="text-sm font-bold" style={{ color: "#60a5fa" }}>{session.totalExp ?? 0}</div>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="text-xs text-slate-500">累計金幣</div>
              <div className="text-sm font-bold" style={{ color: "#f59e0b" }}>{session.totalGold ?? 0}</div>
            </div>
          </div>
        )}

        {/* 每小時效率 */}
        {session && idleHours >= 0.05 && (
          <div className="flex items-center justify-between px-2 py-1.5 rounded-lg text-xs"
            style={{ background: "rgba(255,255,255,0.03)" }}>
            <span className="text-slate-500">每小時效率</span>
            <div className="flex items-center gap-3">
              <span style={{ color: "#60a5fa" }}>{hourlyExp} 經驗/hr</span>
              <span style={{ color: "#f59e0b" }}>{hourlyGold} 金幣/hr</span>
            </div>
          </div>
        )}

        {/* 寵物 BP 成長預估 */}
        {session && (
          <div className="px-2 py-1.5 rounded-lg text-xs"
            style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.15)" }}>
            <div className="flex items-center justify-between">
              <span className="text-purple-400 flex items-center gap-1">
                <span>🐾</span> 寵物 BP 成長
              </span>
              <span className="font-bold text-purple-300">
                +{Math.floor(idleHours * 5)} BP
              </span>
            </div>
            <div className="text-[10px] text-purple-400/60 mt-0.5">
              每小時 +5 BP，結算時自動分配到寵物五維屬性
            </div>
          </div>
        )}

        {/* 掛機模式說明 */}
        <div className="text-[10px] text-slate-600 text-center pt-1">
          {isInfuse
            ? "注靈模式：五行屬性成長 + 寵物固定 BP"
            : "掛機獎勵 ×0.33 | 不扣體力 | 8 小時封頂"}
        </div>
      </div>
    </div>
  );
}

export default IdleSessionPanel;
