/**
 * PvpChallengeSystem.tsx
 * PVP 挑戰系統前端組件
 * 包含：
 * 1. PvpChallengeButton - 在線玩家列表中的「⚔ 挑戰」按鈕
 * 2. PvpIncomingChallenge - 被挑戰時的彈窗（接受/拒絕 + 5秒倒數）
 * 3. PvpWaitingOverlay - 等待對方回應的遮罩
 * 4. PvpResultModal - 戰鬥結果彈窗
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";

const WX_EMOJI: Record<string, string> = { wood: "🌿", fire: "🔥", earth: "🏔️", metal: "⚔️", water: "💧" };
const WX_ZH: Record<string, string> = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };
const WX_HEX: Record<string, string> = { wood: "#22c55e", fire: "#ef4444", earth: "#eab308", metal: "#94a3b8", water: "#3b82f6" };

// ─── 挑戰按鈕（嵌入在線玩家列表） ───
export function PvpChallengeButton({
  targetAgentId,
  targetName,
  myAgentId,
}: {
  targetAgentId: number;
  targetName: string;
  myAgentId: number | undefined;
}) {
  const utils = trpc.useUtils();
  const { data: cooldown } = trpc.gameWorld.getPvpCooldown.useQuery(
    { targetAgentId },
    { enabled: !!myAgentId, staleTime: 10000 }
  );
  const sendChallenge = trpc.gameWorld.sendPvpChallenge.useMutation({
    onSuccess: () => {
      toast.info(`⚔ 已向 ${targetName} 發起挑戰，等待回應…`);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const onCooldown = cooldown?.onCooldown ?? false;
  const remainMin = cooldown ? Math.ceil(cooldown.remainingMs / 60000) : 0;

  if (!myAgentId) return null;

  return (
    <button
      disabled={onCooldown || sendChallenge.isPending}
      onClick={(e) => {
        e.stopPropagation();
        sendChallenge.mutate({ defenderAgentId: targetAgentId });
      }}
      className="shrink-0 text-[9px] px-1.5 py-0.5 rounded transition-all"
      style={{
        background: onCooldown ? "rgba(100,100,100,0.3)" : "rgba(239,68,68,0.2)",
        color: onCooldown ? "#666" : "#ef4444",
        border: `1px solid ${onCooldown ? "rgba(100,100,100,0.2)" : "rgba(239,68,68,0.3)"}`,
        cursor: onCooldown ? "not-allowed" : "pointer",
      }}
      title={onCooldown ? `冷卻中（${remainMin} 分鐘）` : `向 ${targetName} 發起 PVP 挑戰`}
    >
      {sendChallenge.isPending ? "…" : onCooldown ? `⏳${remainMin}m` : "⚔"}
    </button>
  );
}

// ─── 被挑戰彈窗（5秒倒數） ───
export function PvpIncomingChallenge({
  challengeId,
  challengerName,
  challengerLevel,
  challengerElement,
  onDismiss,
}: {
  challengeId: number;
  challengerName: string;
  challengerLevel?: number;
  challengerElement?: string;
  onDismiss: () => void;
}) {
  const [countdown, setCountdown] = useState(5);
  const [responded, setResponded] = useState(false);
  const [, navigate] = useLocation();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const respond = trpc.gameWorld.respondPvpChallenge.useMutation({
    onSuccess: (data) => {
      setResponded(true);
      if (data.accepted && data.result) {
        // 戰鬥完成，顯示結果
        toast.success(
          data.result === "challenger_win"
            ? `${data.challengerName} 獲勝！`
            : data.result === "defender_win"
            ? `你擊敗了 ${data.challengerName}！`
            : "平手！",
          { duration: 3000 }
        );
        onDismiss();
      } else {
        toast.info("已拒絕挑戰");
        onDismiss();
      }
    },
    onError: (err) => {
      toast.error(err.message);
      onDismiss();
    },
  });

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // 倒數結束，自動關閉
          if (timerRef.current) clearInterval(timerRef.current);
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const elColor = WX_HEX[challengerElement ?? "metal"] ?? "#94a3b8";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="relative rounded-2xl p-6 text-center max-w-sm w-full mx-4"
        style={{
          background: "linear-gradient(135deg, rgba(15,18,30,0.95), rgba(30,20,10,0.95))",
          border: `2px solid ${elColor}`,
          boxShadow: `0 0 40px ${elColor}40`,
        }}
      >
        {/* 倒數環 */}
        <div className="absolute -top-4 -right-4 w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: countdown <= 2 ? "#ef4444" : "#f59e0b", boxShadow: "0 0 12px rgba(245,158,11,0.5)" }}
        >
          <span className="text-white font-black text-lg">{countdown}</span>
        </div>

        <div className="text-3xl mb-2">⚔️</div>
        <h3 className="text-lg font-bold text-amber-300 mb-1">PVP 挑戰！</h3>
        <p className="text-sm text-slate-300 mb-3">
          <span className="font-bold" style={{ color: elColor }}>{challengerName}</span>
          {challengerLevel && <span className="text-xs text-slate-500 ml-1">Lv.{challengerLevel}</span>}
          {challengerElement && <span className="ml-1">{WX_EMOJI[challengerElement]}</span>}
          <br />向你發起了挑戰！
        </p>

        <div className="flex gap-3 justify-center">
          <button
            disabled={responded || respond.isPending}
            onClick={() => {
              if (timerRef.current) clearInterval(timerRef.current);
              respond.mutate({ challengeId, accept: true });
            }}
            className="px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
            style={{
              background: "linear-gradient(135deg, #22c55e, #16a34a)",
              color: "#fff",
              boxShadow: "0 4px 12px rgba(34,197,94,0.3)",
              opacity: responded ? 0.5 : 1,
            }}
          >
            {respond.isPending ? "戰鬥中…" : "⚔ 應戰"}
          </button>
          <button
            disabled={responded || respond.isPending}
            onClick={() => {
              if (timerRef.current) clearInterval(timerRef.current);
              respond.mutate({ challengeId, accept: false });
            }}
            className="px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
            style={{
              background: "rgba(100,100,100,0.3)",
              color: "#94a3b8",
              border: "1px solid rgba(100,100,100,0.3)",
              opacity: responded ? 0.5 : 1,
            }}
          >
            拒絕
          </button>
        </div>

        {/* 進度條 */}
        <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
          <div
            className="h-full rounded-full transition-all duration-1000 ease-linear"
            style={{
              width: `${(countdown / 5) * 100}%`,
              background: countdown <= 2 ? "#ef4444" : "#f59e0b",
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── 玩家資訊卡片（點擊頭像彈出） ───
export function PlayerInfoCard({
  player,
  onClose,
  myAgentId,
}: {
  player: {
    id: number;
    agentName: string;
    element?: string | null;
    level: number;
    hp?: number;
    maxHp?: number;
    status?: string | null;
    strategy?: string | null;
    avatarUrl?: string | null;
    nodeId?: string;
  };
  onClose: () => void;
  myAgentId: number | undefined;
}) {
  const elColor = WX_HEX[player.element ?? "metal"] ?? "#94a3b8";
  const hpPct = player.maxHp && player.maxHp > 0 ? Math.min(100, ((player.hp ?? 0) / player.maxHp) * 100) : 100;

  const statusLabels: Record<string, string> = {
    idle: "閒置", explore: "探索中", combat: "戰鬥中", rest: "休息中", gathering: "採集中",
  };
  const strategyLabels: Record<string, string> = {
    balanced: "均衡", aggressive: "攻擊", defensive: "防禦", gathering: "採集", rest: "休息",
  };

  return (
    <div
      className="fixed inset-0 z-[8000] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl p-5 max-w-xs w-full mx-4"
        style={{
          background: "linear-gradient(135deg, rgba(10,14,28,0.97), rgba(20,15,10,0.97))",
          border: `1px solid ${elColor}40`,
          boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 20px ${elColor}20`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 頭像 + 名稱 */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shrink-0"
            style={{
              background: `linear-gradient(135deg, ${elColor}30, ${elColor}10)`,
              border: `2px solid ${elColor}60`,
            }}
          >
            {player.avatarUrl ? (
              <img src={player.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              WX_EMOJI[player.element ?? "metal"] ?? "👤"
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-200 truncate">{player.agentName}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-semibold" style={{ color: elColor }}>
                {WX_EMOJI[player.element ?? "metal"]} {WX_ZH[player.element ?? "metal"]}
              </span>
              <span className="text-xs text-amber-400 font-bold">Lv.{player.level}</span>
            </div>
          </div>
        </div>

        {/* HP 條 */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
            <span>❤️ HP</span>
            <span>{player.hp ?? "?"}/{player.maxHp ?? "?"}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${hpPct}%`, background: hpPct > 50 ? "#22c55e" : hpPct > 25 ? "#f59e0b" : "#ef4444" }}
            />
          </div>
        </div>

        {/* 狀態 */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] text-slate-500">狀態：</span>
          <span className="text-xs text-slate-300">{statusLabels[player.status ?? "idle"] ?? player.status ?? "未知"}</span>
          <span className="text-[10px] text-slate-600">|</span>
          <span className="text-[10px] text-slate-500">策略：</span>
          <span className="text-xs text-slate-300">{strategyLabels[player.strategy ?? "balanced"] ?? player.strategy ?? "均衡"}</span>
        </div>

        {/* 挑戰按鈕 */}
        {myAgentId && myAgentId !== player.id && (
          <div className="flex justify-center">
            <PvpChallengeButton
              targetAgentId={player.id}
              targetName={player.agentName}
              myAgentId={myAgentId}
            />
          </div>
        )}
      </div>
    </div>
  );
}
