/**
 * CasinoPage.tsx
 * 天命娛樂城門戶頁
 * - 雙軌貨幣餘額顯示（積分 ↔ 遊戲點）
 * - 貨幣兌換面板
 * - 遊戲入口卡片（WBC 競猜 + 未來遊戲）
 * - 兌換歷史
 */
import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function CasinoPage() {
  const { user, loading: authLoading } = useAuth();
  const utils = trpc.useUtils();

  const { data: balance, isLoading: balanceLoading } = trpc.exchange.getBalance.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 10000,
  });
  const { data: rates } = trpc.exchange.getRates.useQuery();
  const { data: history } = trpc.exchange.getHistory.useQuery({ limit: 10 }, { enabled: !!user });
  const { data: upcomingMatches } = trpc.wbc.getMatches.useQuery({ status: "pending" });
  const { data: leaderboard } = trpc.wbc.getLeaderboard.useQuery({ limit: 10 });

  const [p2cAmount, setP2cAmount] = useState("");
  const [c2pAmount, setC2pAmount] = useState("");

  const pointsToCoins = trpc.exchange.pointsToCoins.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setP2cAmount("");
      utils.exchange.getBalance.invalidate();
      utils.exchange.getHistory.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const coinsToPoints = trpc.exchange.coinsToPoints.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setC2pAmount("");
      utils.exchange.getBalance.invalidate();
      utils.exchange.getHistory.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const p2cPreview = p2cAmount ? Math.floor(Number(p2cAmount) * (rates?.pointsToCoinsRate ?? 20)) : null;
  const c2pPreview = c2pAmount ? Math.floor(Number(c2pAmount) / (rates?.coinsToPointsRate ?? 50)) : null;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="text-amber-400 animate-pulse">載入中...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex flex-col items-center justify-center gap-6 px-4">
        <div className="text-6xl">🎰</div>
        <h1 className="text-3xl font-bold text-amber-400">天命娛樂城</h1>
        <p className="text-slate-400 text-center max-w-sm">登入後即可使用遊戲點參與 WBC 世界棒球經典賽競猜，贏取豐厚遊戲點獎勵</p>
        <a href={getLoginUrl()} className="bg-amber-600 hover:bg-amber-500 text-black font-bold px-8 py-3 rounded-lg text-lg transition-colors">
          登入開始遊戲
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      {/* 頂部 Hero */}
      <div className="relative overflow-hidden bg-gradient-to-b from-amber-900/30 to-[#0a0e1a] border-b border-amber-800/30">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-600/10 via-transparent to-transparent" />
        <div className="relative max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">🎰</span>
            <div>
              <h1 className="text-2xl font-bold text-amber-400">天命娛樂城</h1>
              <p className="text-slate-400 text-sm">以天命積分換取遊戲點，參與趣味競猜</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 餘額卡片 */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-amber-900/30 to-amber-800/10 border-amber-700/40">
            <CardContent className="p-4">
              <div className="text-xs text-amber-400/70 mb-1">天命積分</div>
              <div className="text-2xl font-bold text-amber-300">
                {balanceLoading ? "..." : (balance?.pointsBalance ?? 0).toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-1">可用於兌換遊戲點</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-900/30 to-purple-800/10 border-purple-700/40">
            <CardContent className="p-4">
              <div className="text-xs text-purple-400/70 mb-1">遊戲點</div>
              <div className="text-2xl font-bold text-purple-300">
                {balanceLoading ? "..." : (balance?.gameCoins ?? 0).toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-1">用於下注競猜</div>
            </CardContent>
          </Card>
        </div>

        {/* 貨幣兌換 */}
        <Card className="bg-slate-900/60 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-amber-300 text-base">💱 貨幣兌換</CardTitle>
            <div className="text-xs text-slate-500">
              比率：1 積分 = {rates?.pointsToCoinsRate ?? 20} 遊戲點 ｜ {rates?.coinsToPointsRate ?? 50} 遊戲點 = 1 積分
              （每日最多兌換回 {rates?.dailyCoinsToPointsLimit ?? 100} 積分）
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 積分 → 遊戲點 */}
            <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
              <div className="text-xs text-amber-400 font-medium mb-2">積分 → 遊戲點</div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="number" min="1" placeholder="輸入積分數量"
                    value={p2cAmount}
                    onChange={e => setP2cAmount(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white text-sm"
                  />
                  {p2cPreview !== null && (
                    <div className="text-xs text-amber-400 mt-1">
                      → 可獲得 <span className="font-bold">{p2cPreview.toLocaleString()}</span> 遊戲點
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => pointsToCoins.mutate({ pointsAmount: Number(p2cAmount) })}
                  disabled={!p2cAmount || Number(p2cAmount) <= 0 || pointsToCoins.isPending}
                  className="bg-amber-600 hover:bg-amber-500 text-black font-semibold shrink-0"
                >
                  {pointsToCoins.isPending ? "兌換中..." : "兌換"}
                </Button>
              </div>
            </div>

            {/* 遊戲點 → 積分 */}
            <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
              <div className="text-xs text-purple-400 font-medium mb-2">遊戲點 → 積分（每日限額）</div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="number" min="1" placeholder="輸入遊戲點數量"
                    value={c2pAmount}
                    onChange={e => setC2pAmount(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white text-sm"
                  />
                  {c2pPreview !== null && (
                    <div className="text-xs text-purple-400 mt-1">
                      → 可獲得 <span className="font-bold">{c2pPreview}</span> 積分
                      （實際扣除 {c2pPreview * (rates?.coinsToPointsRate ?? 50)} 遊戲點）
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => coinsToPoints.mutate({ gameCoinsAmount: Number(c2pAmount) })}
                  disabled={!c2pAmount || Number(c2pAmount) <= 0 || coinsToPoints.isPending}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-semibold shrink-0"
                >
                  {coinsToPoints.isPending ? "兌換中..." : "兌換"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 遊戲入口 */}
        <div>
          <h2 className="text-amber-300 font-semibold mb-3">🎮 遊戲大廳</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* WBC 競猜 */}
            <Link href="/casino/wbc">
              <Card className="bg-gradient-to-br from-green-900/40 to-slate-900/60 border-green-700/40 hover:border-green-500/60 transition-all cursor-pointer group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-3xl">⚾</div>
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">NEW</Badge>
                  </div>
                  <h3 className="text-white font-bold text-lg mb-1 group-hover:text-green-300 transition-colors">WBC 世界棒球競猜</h3>
                  <p className="text-slate-400 text-sm mb-3">押注 WBC 2026 賽事，三種玩法：單場勝負、分差競猜、天命組合</p>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-green-400">
                      {upcomingMatches?.length ?? 0} 場待開賽
                    </div>
                    <div className="text-xs text-slate-500">· 最高賠率 8.0x</div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* 未來遊戲（佔位） */}
            <Card className="bg-slate-900/40 border-slate-700/40 opacity-60">
              <CardContent className="p-5">
                <div className="text-3xl mb-3">🔮</div>
                <h3 className="text-slate-400 font-bold text-lg mb-1">天命牌局</h3>
                <p className="text-slate-500 text-sm mb-3">以五行能量為基礎的策略牌局，即將推出</p>
                <Badge className="bg-slate-700 text-slate-400 border-slate-600 text-xs">即將推出</Badge>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 兌換歷史 */}
        {history && history.length > 0 && (
          <Card className="bg-slate-900/60 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-slate-300 text-sm">最近兌換記錄</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {history.map((log) => (
                  <div key={log.id} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800 last:border-0">
                    <div className="text-slate-400">
                      {log.direction === "points_to_coins" ? "積分 → 遊戲點" : "遊戲點 → 積分"}
                    </div>
                    <div className={log.direction === "points_to_coins" ? "text-amber-400" : "text-purple-400"}>
                      {log.direction === "points_to_coins"
                        ? `${Math.abs(log.pointsAmount)} 積分 → +${log.gameCoinsAmount} 遊戲點`
                        : `${Math.abs(log.gameCoinsAmount)} 遊戲點 → +${log.pointsAmount} 積分`}
                    </div>
                    <div className="text-slate-600">
                      {new Date(log.createdAt).toLocaleDateString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 本週競猜王排行榜 */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        <Card className="bg-slate-900/60 border-slate-700">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏆</span>
              <div>
                <CardTitle className="text-amber-300 text-lg">本週 WBC 競猜王</CardTitle>
                <p className="text-slate-500 text-xs mt-0.5">本週（週一至今）贏得遊戲點最多的玩家</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!leaderboard || leaderboard.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">⚾</div>
                <p className="text-slate-500 text-sm">本週還沒有競猜記錄</p>
                <p className="text-slate-600 text-xs mt-1">成為第一位 WBC 競猜王！</p>
                <Link href="/casino/wbc">
                  <Button className="mt-4 bg-amber-600 hover:bg-amber-500 text-black font-semibold text-sm">
                    前往競猜
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry) => (
                  <div key={entry.userId}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      entry.rank === 1 ? "bg-amber-500/10 border-amber-500/30" :
                      entry.rank === 2 ? "bg-slate-400/10 border-slate-400/20" :
                      entry.rank === 3 ? "bg-orange-700/10 border-orange-700/20" :
                      "bg-slate-800/40 border-slate-700/30"
                    }`}
                  >
                    {/* 名次 */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      entry.rank === 1 ? "bg-amber-500 text-black" :
                      entry.rank === 2 ? "bg-slate-400 text-black" :
                      entry.rank === 3 ? "bg-orange-700 text-white" :
                      "bg-slate-700 text-slate-400"
                    }`}>
                      {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : entry.rank}
                    </div>
                    {/* 用戶名 */}
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium text-sm truncate">{entry.name}</div>
                      <div className="text-slate-500 text-xs">
                        {entry.winCount} 場得獎／{entry.totalBetCount} 場下注（勝率 {entry.winRate}%）
                      </div>
                    </div>
                    {/* 獲得遠戲點 */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-amber-400 font-bold text-sm">+{entry.totalWin.toLocaleString()}</div>
                      <div className="text-slate-600 text-xs">遊戲點</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
