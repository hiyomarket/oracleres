/**
 * PartyBattleInviteModal — 組隊戰鬥邀請彈窗
 * 
 * 隊長發起 Boss 戰後，隊員會看到此彈窗，可以接受或拒絕參戰。
 * 隊長可以在所有人回應後（或直接）確認開始戰鬥。
 */
import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Swords, Shield, Clock, CheckCircle2, XCircle, Users } from "lucide-react";
import { toast } from "sonner";

interface PartyBattleInviteModalProps {
  open: boolean;
  onClose: () => void;
  onBattleStarted?: (battleId: string) => void;
}

export default function PartyBattleInviteModal({ open, onClose, onBattleStarted }: PartyBattleInviteModalProps) {
  const [pollingEnabled, setPollingEnabled] = useState(false);

  const { data: invite, refetch } = trpc.gameParty.getPendingBattleInvite.useQuery(undefined, {
    enabled: open,
    refetchInterval: pollingEnabled ? 3000 : false, // 每 3 秒輪詢
  });

  useEffect(() => {
    if (invite && invite.myResponse === undefined) {
      setPollingEnabled(true);
    }
  }, [invite]);

  const respondMutation = trpc.gameParty.respondBattleInvite.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const startBattleMutation = trpc.gameParty.startPartyBattle.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setPollingEnabled(false);
      onBattleStarted?.(data.battleId);
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleRespond = useCallback((response: "accepted" | "declined") => {
    if (!invite) return;
    respondMutation.mutate({ inviteId: invite.id, response });
  }, [invite, respondMutation]);

  const handleStartBattle = useCallback(() => {
    if (!invite) return;
    startBattleMutation.mutate({ inviteId: invite.id });
  }, [invite, startBattleMutation]);

  // 倒計時
  const [timeLeft, setTimeLeft] = useState(0);
  useEffect(() => {
    if (!invite?.expiresAt) return;
    const update = () => {
      const left = Math.max(0, Math.floor((invite.expiresAt - Date.now()) / 1000));
      setTimeLeft(left);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [invite?.expiresAt]);

  if (!invite) {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-md bg-gray-900/95 border-amber-700/40 text-gray-100">
          <DialogHeader>
            <DialogTitle className="text-amber-400">⚔️ 組隊戰鬥</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <p className="text-gray-400">目前沒有待處理的戰鬥邀請</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const responses = invite.responses as Record<string, string>;
  const acceptedCount = Object.values(responses).filter(r => r === "accepted").length;
  const declinedCount = Object.values(responses).filter(r => r === "declined").length;
  const pendingCount = invite.totalMembers - acceptedCount - declinedCount;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md bg-gray-900/95 border-amber-700/40 text-gray-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-400">
            <Swords className="w-5 h-5" />
            組隊戰鬥邀請
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            隊長發起了 Boss 挑戰
          </DialogDescription>
        </DialogHeader>

        {/* 怪物資訊 */}
        <div className="bg-gray-800/60 rounded-lg p-4 border border-red-900/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-red-400">{invite.monsterName}</h3>
              <p className="text-sm text-gray-400 mt-1">目標怪物</p>
            </div>
            <div className="flex items-center gap-1 text-amber-400">
              <Clock className="w-4 h-4" />
              <span className={`font-mono text-sm ${timeLeft <= 10 ? "text-red-400 animate-pulse" : ""}`}>
                {timeLeft}s
              </span>
            </div>
          </div>
        </div>

        {/* 隊員回應狀態 */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-1">
            <Users className="w-4 h-4" />
            隊員回應狀態
          </h4>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-green-900/30 rounded-lg p-2 border border-green-700/30">
              <CheckCircle2 className="w-4 h-4 text-green-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-green-400">{acceptedCount}</div>
              <div className="text-xs text-gray-400">已接受</div>
            </div>
            <div className="bg-red-900/30 rounded-lg p-2 border border-red-700/30">
              <XCircle className="w-4 h-4 text-red-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-red-400">{declinedCount}</div>
              <div className="text-xs text-gray-400">已拒絕</div>
            </div>
            <div className="bg-yellow-900/30 rounded-lg p-2 border border-yellow-700/30">
              <Clock className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-yellow-400">{pendingCount}</div>
              <div className="text-xs text-gray-400">等待中</div>
            </div>
          </div>
        </div>

        {/* 前後排說明 */}
        <div className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/30">
          <p className="text-xs text-gray-400">
            <Shield className="w-3 h-3 inline mr-1" />
            戰鬥陣型：<span className="text-amber-400">寵物在前排</span>承受攻擊，<span className="text-cyan-400">玩家在後排</span>進行指揮。
            每位玩家有 <span className="text-yellow-400">30 秒</span> 思考時間下達指令。
          </p>
        </div>

        {/* 操作按鈕 */}
        <div className="flex gap-2 pt-2">
          {!invite.myResponse ? (
            <>
              <Button
                className="flex-1 bg-green-700 hover:bg-green-600"
                onClick={() => handleRespond("accepted")}
                disabled={respondMutation.isPending || timeLeft === 0}
              >
                {respondMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                接受參戰
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-red-700/50 text-red-400 hover:bg-red-900/30"
                onClick={() => handleRespond("declined")}
                disabled={respondMutation.isPending}
              >
                <XCircle className="w-4 h-4 mr-1" />
                拒絕
              </Button>
            </>
          ) : invite.myResponse === "accepted" ? (
            invite.isLeader ? (
              <Button
                className="flex-1 bg-amber-700 hover:bg-amber-600"
                onClick={handleStartBattle}
                disabled={startBattleMutation.isPending || acceptedCount < 1}
              >
                {startBattleMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Swords className="w-4 h-4 mr-1" />}
                開始戰鬥（{acceptedCount} 人參戰）
              </Button>
            ) : (
              <div className="flex-1 text-center py-2">
                <Badge variant="outline" className="border-green-600 text-green-400">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  已接受，等待隊長開始...
                </Badge>
              </div>
            )
          ) : (
            <div className="flex-1 text-center py-2">
              <Badge variant="outline" className="border-red-600 text-red-400">
                <XCircle className="w-3 h-3 mr-1" />
                已拒絕參戰
              </Badge>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
