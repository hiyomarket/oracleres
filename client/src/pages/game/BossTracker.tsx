/**
 * BossTracker.tsx
 * 移動式 Boss 追蹤頁面
 * 顯示所有活躍 Boss 的位置、Tier、五行、倒計時
 * 支援挑戰 Boss、查看排行榜和個人戰鬥記錄
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import GameTabLayout from "@/components/GameTabLayout";
import { BattleWindow } from "@/components/BattleWindow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const WX_COLORS: Record<string, string> = {
  wood: "text-green-400", "木": "text-green-400",
  fire: "text-red-400",  "火": "text-red-400",
  earth: "text-yellow-400", "土": "text-yellow-400",
  metal: "text-gray-300", "金": "text-gray-300",
  water: "text-blue-400", "水": "text-blue-400",
};
const WX_BG: Record<string, string> = {
  wood: "bg-green-900/30 border-green-700/50", "木": "bg-green-900/30 border-green-700/50",
  fire: "bg-red-900/30 border-red-700/50",    "火": "bg-red-900/30 border-red-700/50",
  earth: "bg-yellow-900/30 border-yellow-700/50", "土": "bg-yellow-900/30 border-yellow-700/50",
  metal: "bg-gray-800/30 border-gray-600/50",  "金": "bg-gray-800/30 border-gray-600/50",
  water: "bg-blue-900/30 border-blue-700/50",  "水": "bg-blue-900/30 border-blue-700/50",
};
const WX_EMOJI: Record<string, string> = {
  wood: "🌿", "木": "🌿", fire: "🔥", "火": "🔥",
  earth: "🪨", "土": "🪨", metal: "⚔️", "金": "⚔️", water: "💧", "水": "💧",
};
const TIER_LABELS: Record<number, { label: string; color: string; badge: string }> = {
  1: { label: "遊蕩精英", color: "text-blue-400", badge: "bg-blue-600" },
  2: { label: "區域守護者", color: "text-purple-400", badge: "bg-purple-600" },
  3: { label: "天命凶獸", color: "text-red-400", badge: "bg-red-600" },
};

function formatTimeLeft(expiresAt: number | null): string {
  if (!expiresAt) return "常駐";
  const diff = expiresAt - Date.now();
  if (diff <= 0) return "即將消失";
  const min = Math.floor(diff / 60000);
  const sec = Math.floor((diff % 60000) / 1000);
  if (min > 60) return `${Math.floor(min / 60)}h ${min % 60}m`;
  return `${min}m ${sec}s`;
}

export default function BossTracker() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState("tracker");
  const [activeBattleId, setActiveBattleId] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<number | null>(null);

  // 查詢活躍 Boss
  const { data: activeBosses, isLoading: bossLoading, refetch: refetchBosses } = trpc.roamingBoss.getActiveBosses.useQuery(undefined, {
    refetchInterval: 15000, // 每 15 秒刷新
  });

  // 查詢排行榜
  const { data: rankings } = trpc.roamingBoss.getKillRanking.useQuery({ limit: 20 });

  // 查詢我的戰鬥記錄
  const { data: myHistory } = trpc.roamingBoss.getMyBattleHistory.useQuery(
    { limit: 20 },
    { enabled: !!user }
  );

  // 查詢角色狀態
  const { data: agentStatus } = trpc.gameWorld.getAgentStatus.useQuery(undefined, { enabled: !!user });

  // 開始 Boss 戰鬥
  const startBattleMut = trpc.gameBattle.startBattle.useMutation({
    onSuccess: (data) => {
      setActiveBattleId(data.battleId);
    },
    onError: (err) => {
      toast.error(err.message || "無法挑戰");
    },
  });

  const filteredBosses = useMemo(() => {
    if (!activeBosses) return [];
    if (selectedTier === null) return activeBosses;
    return activeBosses.filter((b: any) => b.tier === selectedTier);
  }, [activeBosses, selectedTier]);

  const handleChallenge = (boss: any) => {
    if (!user) {
      toast.error("請先登入");
      return;
    }
    if (!agentStatus?.agent) {
      toast.error("請先創建角色");
      return;
    }
    startBattleMut.mutate({
      mode: "boss",
      monsterId: `boss_${boss.instanceId}`,
    });
  };

  if (activeBattleId) {
    return (
      <GameTabLayout activeTab="boss">
        <BattleWindow
          battleId={activeBattleId}
          onClose={() => {
            setActiveBattleId(null);
            refetchBosses();
          }}
          onBattleEnd={() => {
            setActiveBattleId(null);
            refetchBosses();
          }}
        />
      </GameTabLayout>
    );
  }

  return (
    <GameTabLayout activeTab="boss">
      <div className="container max-w-4xl py-4 pb-24 space-y-4">
        {/* 頁面標題 */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-amber-400">👹 Boss 追蹤系統</h1>
          <p className="text-sm text-muted-foreground">追蹤移動式 Boss 的位置，挑戰強敵獲取豐厚獎勵</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 bg-background/50">
            <TabsTrigger value="tracker">🗺️ Boss 追蹤</TabsTrigger>
            <TabsTrigger value="ranking">🏆 排行榜</TabsTrigger>
            <TabsTrigger value="history">📜 戰鬥記錄</TabsTrigger>
          </TabsList>

          {/* ═══ Boss 追蹤 Tab ═══ */}
          <TabsContent value="tracker" className="space-y-4">
            {/* Tier 篩選 */}
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant={selectedTier === null ? "default" : "outline"}
                onClick={() => setSelectedTier(null)}
              >
                全部
              </Button>
              {[1, 2, 3].map(tier => (
                <Button
                  key={tier}
                  size="sm"
                  variant={selectedTier === tier ? "default" : "outline"}
                  onClick={() => setSelectedTier(tier)}
                  className={selectedTier === tier ? TIER_LABELS[tier].badge : ""}
                >
                  {TIER_LABELS[tier].label}
                </Button>
              ))}
            </div>

            {/* Boss 列表 */}
            {bossLoading ? (
              <div className="text-center py-8 text-muted-foreground">載入中...</div>
            ) : !filteredBosses.length ? (
              <Card className="bg-background/50 border-border/50">
                <CardContent className="py-12 text-center">
                  <p className="text-4xl mb-2">🌙</p>
                  <p className="text-muted-foreground">目前沒有活躍的 Boss</p>
                  <p className="text-xs text-muted-foreground mt-1">Boss 會定時在地圖上出現，請稍後再來</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredBosses.map((boss: any) => {
                  const tierInfo = TIER_LABELS[boss.tier] || TIER_LABELS[1];
                  const wxColor = WX_COLORS[boss.wuxing] || "text-gray-400";
                  const wxBg = WX_BG[boss.wuxing] || "bg-gray-800/30 border-gray-600/50";
                  const wxEmoji = WX_EMOJI[boss.wuxing] || "❓";

                  return (
                    <Card key={boss.instanceId} className={`border ${wxBg} transition-all hover:scale-[1.01]`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          {/* 左側：Boss 資訊 */}
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={`${tierInfo.badge} text-white text-xs`}>
                                T{boss.tier} {tierInfo.label}
                              </Badge>
                              <span className={`text-lg font-bold ${wxColor}`}>
                                {wxEmoji} {boss.name}
                              </span>
                              {boss.title && (
                                <span className="text-xs text-muted-foreground">「{boss.title}」</span>
                              )}
                            </div>

                            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                              <span>Lv.{boss.level}</span>
                              <span>HP: {boss.currentHp?.toLocaleString() || "?"}/{boss.maxHp?.toLocaleString() || "?"}</span>
                              <span>⏱ {formatTimeLeft(boss.expiresAt)}</span>
                            </div>

                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-amber-400">📍 {boss.currentNodeName || boss.currentNodeId}</span>
                              {boss.moveCount > 0 && (
                                <span className="text-muted-foreground">已移動 {boss.moveCount} 次</span>
                              )}
                            </div>

                            {/* Boss 專屬掉落預覽 */}
                            {boss.dropPreview && boss.dropPreview.length > 0 && (
                              <div className="flex gap-1 flex-wrap">
                                {boss.dropPreview.slice(0, 3).map((drop: any, i: number) => (
                                  <Badge key={i} variant="outline" className="text-xs bg-background/30">
                                    {drop.itemName} ({Math.round(drop.dropRate * 100)}%)
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* 右側：挑戰按鈕 */}
                          <div className="flex flex-col items-end gap-2">
                            <div className="text-right">
                              <div className="text-xs text-amber-400">
                                獎勵 ×{boss.expMultiplier || 2.0}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                體力 {boss.staminaCost || 15}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              className="bg-red-600 hover:bg-red-700 text-white"
                              onClick={() => handleChallenge(boss)}
                              disabled={startBattleMut.isPending || !user || !agentStatus?.agent}
                            >
                              {startBattleMut.isPending ? "準備中..." : "⚔️ 挑戰"}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* 統計摘要 */}
            {activeBosses && activeBosses.length > 0 && (
              <Card className="bg-background/50 border-border/50">
                <CardContent className="p-3">
                  <div className="flex justify-around text-center text-xs">
                    <div>
                      <div className="text-lg font-bold text-amber-400">{activeBosses.length}</div>
                      <div className="text-muted-foreground">活躍 Boss</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-blue-400">
                        {activeBosses.filter((b: any) => b.tier === 1).length}
                      </div>
                      <div className="text-muted-foreground">T1 精英</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-purple-400">
                        {activeBosses.filter((b: any) => b.tier === 2).length}
                      </div>
                      <div className="text-muted-foreground">T2 守護者</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-red-400">
                        {activeBosses.filter((b: any) => b.tier === 3).length}
                      </div>
                      <div className="text-muted-foreground">T3 凶獸</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ═══ 排行榜 Tab ═══ */}
          <TabsContent value="ranking" className="space-y-4">
            <Card className="bg-background/50 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-amber-400">🏆 Boss 擊殺排行榜</CardTitle>
              </CardHeader>
              <CardContent>
                {!rankings || rankings.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">尚無擊殺記錄</p>
                ) : (
                  <div className="space-y-2">
                    {rankings.map((r: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded bg-background/30">
                        <div className="flex items-center gap-3">
                          <span className={`text-lg font-bold ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-amber-600" : "text-muted-foreground"}`}>
                            #{i + 1}
                          </span>
                          <span className="font-medium">{r.agentName}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-red-400">{r.kills} 殺</span>
                          <span className="text-muted-foreground">{Number(r.totalDamage).toLocaleString()} 傷害</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ 戰鬥記錄 Tab ═══ */}
          <TabsContent value="history" className="space-y-4">
            {!user ? (
              <Card className="bg-background/50 border-border/50">
                <CardContent className="py-8 text-center text-muted-foreground">
                  請先登入以查看戰鬥記錄
                </CardContent>
              </Card>
            ) : !myHistory || myHistory.length === 0 ? (
              <Card className="bg-background/50 border-border/50">
                <CardContent className="py-8 text-center text-muted-foreground">
                  尚無 Boss 戰鬥記錄，去挑戰一隻 Boss 吧！
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {myHistory.map((log: any, i: number) => {
                  const tierInfo = TIER_LABELS[log.bossTier] || TIER_LABELS[1];
                  return (
                    <Card key={i} className="bg-background/50 border-border/50">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge className={`${tierInfo.badge} text-white text-xs`}>T{log.bossTier}</Badge>
                              <span className="font-medium">{log.bossName}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(log.battleAt).toLocaleString()} · 傷害 {log.damageDealt.toLocaleString()}
                            </div>
                          </div>
                          <Badge variant={log.result === "win" ? "default" : "destructive"}>
                            {log.result === "win" ? "✅ 勝利" : log.result === "flee" ? "🏃 逃跑" : "❌ 失敗"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </GameTabLayout>
  );
}
