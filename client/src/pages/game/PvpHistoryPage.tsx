import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, Sword, Shield, Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function PvpHistoryPage() {
  const { user } = useAuth();

  // 取得玩家角色
  const { data: agentData } = trpc.gameWorld.getOrCreateAgent.useQuery(undefined, { enabled: !!user });
  const agentId = agentData?.agent?.id;
  const agentName = agentData?.agent?.agentName;

  // 取得 PvP 歷史
  const { data: history, isLoading } = trpc.gameWorld.getPvpHistory.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 30000,
  });

  // 取得個人 PvP 戰績
  const { data: myStats } = trpc.gameWorld.getMyPvpStats.useQuery(undefined, {
    enabled: !!user,
  });

  // 計算勝率
  const totalBattles = myStats ? (myStats.wins + myStats.losses + myStats.draws) : 0;
  const winRate = myStats
    ? totalBattles > 0
      ? Math.round((myStats.wins / totalBattles) * 100)
      : 0
    : null;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* 頂部導航 */}
      <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur border-b border-gray-800 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/game/achievements">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-1" />
              返回成就
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white">PvP 對戰記錄</h1>
            <p className="text-xs text-gray-400">最近 20 場對戰詳情</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* 個人戰績卡 */}
        {myStats && (
          <Card className="bg-gradient-to-r from-purple-950/50 to-blue-950/50 border-purple-700/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">我的 PvP 戰績</p>
                  <p className="text-xl font-bold text-white">{agentName ?? "旅人"}</p>
                </div>
                <div className="flex items-center gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-green-400">{myStats.wins}</p>
                    <p className="text-xs text-gray-400">勝</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-400">{myStats.losses}</p>
                    <p className="text-xs text-gray-400">敗</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-400">{myStats.draws}</p>
                    <p className="text-xs text-gray-400">平</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg px-3 py-2">
                    <p className={`text-2xl font-bold ${winRate! >= 60 ? "text-yellow-400" : winRate! >= 40 ? "text-blue-400" : "text-red-400"}`}>
                      {winRate}%
                    </p>
                    <p className="text-xs text-gray-400">勝率</p>
                  </div>
                </div>
              </div>
              {myStats.currentStreak > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-400">連勝 {myStats.currentStreak} 場</span>
                  {myStats.maxStreak > 0 && (
                    <span className="text-xs text-gray-500">（最高連勝 {myStats.maxStreak} 場）</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 對戰記錄列表 */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sword className="w-4 h-4 text-red-400" />
              對戰記錄
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 bg-gray-800/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (history ?? []).length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>尚無對戰記錄</p>
                <p className="text-xs mt-1">前往排行榜挑戰其他旅人！</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {(history ?? []).map(battle => {
                  const isChallenger = battle.challengerAgentId === agentId;
                  const myName = isChallenger ? battle.challengerName : battle.defenderName;
                  const opponentName = isChallenger ? battle.defenderName : battle.challengerName;

                  let outcome: "win" | "lose" | "draw";
                  if (battle.result === "draw") {
                    outcome = "draw";
                  } else if (
                    (battle.result === "challenger_win" && isChallenger) ||
                    (battle.result === "defender_win" && !isChallenger)
                  ) {
                    outcome = "win";
                  } else {
                    outcome = "lose";
                  }

                  const outcomeConfig = {
                    win:  { label: "勝利", color: "text-green-400", bg: "bg-green-950/30 border-green-700/30", icon: TrendingUp },
                    lose: { label: "敗北", color: "text-red-400",   bg: "bg-red-950/30 border-red-700/30",     icon: TrendingDown },
                    draw: { label: "平局", color: "text-yellow-400",bg: "bg-yellow-950/30 border-yellow-700/30",icon: Minus },
                  }[outcome];

                  const OutcomeIcon = outcomeConfig.icon;

                  return (
                    <div key={battle.id} className={`p-4 ${outcomeConfig.bg} border-l-2 ${outcomeConfig.color.replace("text-", "border-")}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <OutcomeIcon className={`w-5 h-5 ${outcomeConfig.color}`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white">{myName}</span>
                              <span className="text-gray-500 text-xs">vs</span>
                              <span className="text-sm text-gray-300">{opponentName}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{formatTime(battle.createdAt)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={`${outcomeConfig.color} border-current text-xs`}
                            variant="outline"
                          >
                            {outcomeConfig.label}
                          </Badge>
                          {outcome === "win" && battle.goldReward > 0 && (
                            <span className="text-xs text-yellow-400">+{battle.goldReward}金</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 前往排行榜 */}
        <div className="text-center">
          <Link href="/game/achievements">
            <Button variant="outline" className="border-gray-700 text-gray-400 hover:text-white">
              <Trophy className="w-4 h-4 mr-2" />
              前往排行榜挑戰
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
