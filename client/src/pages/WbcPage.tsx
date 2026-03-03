/**
 * WbcPage.tsx
 * WBC 世界棒球競猜頁面
 * - 三種玩法：單場勝負 / 分差競猜 / 天命組合
 * - 天命羅盤建議（依今日財運指數推薦下注策略）
 * - 下注流程：選賽事 → 選玩法 → 輸入金額 → 確認
 * - 我的下注記錄
 */
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { SharedNav } from "@/components/SharedNav";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "待開賽", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  live: { label: "進行中", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  finished: { label: "已結束", color: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
  cancelled: { label: "已取消", color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const BET_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  placed: { label: "待結算", color: "text-amber-400" },
  won: { label: "已獲勝", color: "text-green-400" },
  lost: { label: "未中", color: "text-slate-500" },
  cancelled: { label: "已取消", color: "text-red-400" },
};

const SPREAD_OPTIONS = [
  { key: "spread_1_3", label: "1-3 分差", rate: 1.5 },
  { key: "spread_4_6", label: "4-6 分差", rate: 2.5 },
  { key: "spread_7plus", label: "7+ 分差", rate: 4.0 },
  { key: "draw", label: "平局", rate: 8.0 },
];

type BetMode = "winlose" | "spread" | "combo";

interface BetState {
  matchId: number | null;
  betType: BetMode;
  betOn: string;
  amount: string;
  comboMatchIds: number[];
  comboPicks: Record<number, "A" | "B">;
}

const EMPTY_BET: BetState = {
  matchId: null,
  betType: "winlose",
  betOn: "",
  amount: "",
  comboMatchIds: [],
  comboPicks: {},
};

export default function WbcPage() {
  const { user, loading: authLoading } = useAuth();
  const utils = trpc.useUtils();

  const { data: allMatches, isLoading: matchesLoading } = trpc.wbc.getMatches.useQuery({ status: "all" });
  const { data: myBets } = trpc.wbc.getMyBets.useQuery({ limit: 30 }, { enabled: !!user });
  const { data: balance } = trpc.exchange.getBalance.useQuery(undefined, { enabled: !!user });
  const { data: warRoomData } = trpc.warRoom.dailyReport.useQuery(undefined, { enabled: !!user });

  const [betState, setBetState] = useState<BetState>(EMPTY_BET);
  const [showBetDialog, setShowBetDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("matches");
  // 篩選器狀態
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("all");

  const placeBet = trpc.wbc.placeBet.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setShowBetDialog(false);
      setBetState(EMPTY_BET);
      utils.exchange.getBalance.invalidate();
      utils.wbc.getMyBets.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // 取得所有日期選項
  const availableDates = useMemo(() => {
    if (!allMatches) return [];
    const dates = new Set(allMatches.map(m => {
      const d = new Date(m.matchTime);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    }));
    return Array.from(dates).sort();
  }, [allMatches]);

  // 取得所有分組選項
  const availableGroups = useMemo(() => {
    if (!allMatches) return [];
    const groups = new Set(allMatches.map(m => m.poolGroup ?? "").filter(Boolean));
    return Array.from(groups).sort();
  }, [allMatches]);

  // 篩選後的賽事
  const filteredMatches = useMemo(() => {
    if (!allMatches) return [];
    return allMatches.filter(m => {
      const matchDate = new Date(m.matchTime);
      const dateStr = `${matchDate.getMonth() + 1}/${matchDate.getDate()}`;
      const groupOk = filterGroup === "all" || m.poolGroup === filterGroup;
      const dateOk = filterDate === "all" || dateStr === filterDate;
      return groupOk && dateOk;
    });
  }, [allMatches, filterGroup, filterDate]);

  const pendingMatches = useMemo(() => filteredMatches.filter(m => m.status === "pending"), [filteredMatches]);
  const finishedMatches = useMemo(() => filteredMatches.filter(m => m.status === "finished"), [filteredMatches]);

  // 天命羅盤建議
  const lotteryScore = (warRoomData?.wealthCompass as any)?.lotteryIndex ?? 5;
  const compassAdvice = useMemo(() => {
    if (lotteryScore >= 8) return { text: "今日財運旺盛，天命建議大膽出手！可考慮組合投注放大獲利", color: "text-amber-400", icon: "🔥" };
    if (lotteryScore >= 6) return { text: "今日財運平穩，建議以單場勝負為主，穩健獲利", color: "text-green-400", icon: "✨" };
    if (lotteryScore >= 4) return { text: "今日財運中等，建議小額試水，控制風險", color: "text-blue-400", icon: "💧" };
    return { text: "今日財運偏弱，天命建議今日觀望，等待更好時機", color: "text-slate-400", icon: "🌙" };
  }, [lotteryScore]);

  // 計算組合賠率
  const comboRate = useMemo(() => {
    if (betState.betType !== "combo" || Object.keys(betState.comboPicks).length < 2) return null;
    let rate = 1;
    for (const [mId, side] of Object.entries(betState.comboPicks)) {
      const match = pendingMatches.find(m => m.id === Number(mId));
      if (!match) continue;
      rate *= side === "A" ? Number(match.rateA) : Number(match.rateB);
    }
    return Math.round(rate * 100) / 100;
  }, [betState.comboPicks, pendingMatches]);

  function openBetDialog(match: any, mode: BetMode) {
    setBetState({ ...EMPTY_BET, matchId: match.id, betType: mode });
    setShowBetDialog(true);
  }

  function handlePlaceBet() {
    if (!betState.matchId || !betState.amount) return;
    const amount = Number(betState.amount);
    if (amount < 10) { toast.error("最低下注 10 遊戲點"); return; }

    let betOn = betState.betOn;
    let comboMatchIds: number[] = [];

    if (betState.betType === "combo") {
      const picks = Object.entries(betState.comboPicks);
      if (picks.length < 2) { toast.error("組合投注至少選擇 2 場賽事"); return; }
      betOn = picks.map(([mId, side]) => `${side}:${mId}`).join(",");
      comboMatchIds = picks.filter(([mId]) => Number(mId) !== betState.matchId).map(([mId]) => Number(mId));
    }

    if (!betOn) { toast.error("請選擇下注選項"); return; }

    placeBet.mutate({
      matchId: betState.matchId,
      betType: betState.betType,
      betOn,
      amount,
      comboMatchIds: comboMatchIds.length > 0 ? comboMatchIds : undefined,
    });
  }

  const selectedMatch = allMatches?.find(m => m.id === betState.matchId);
  const potentialWin = useMemo(() => {
    if (!betState.amount || !betState.betOn) return null;
    const amount = Number(betState.amount);
    if (betState.betType === "winlose") {
      const rate = betState.betOn === "A" ? Number(selectedMatch?.rateA) : Number(selectedMatch?.rateB);
      return Math.floor(amount * rate);
    }
    if (betState.betType === "spread") {
      const opt = SPREAD_OPTIONS.find(o => o.key === betState.betOn);
      return opt ? Math.floor(amount * opt.rate) : null;
    }
    if (betState.betType === "combo" && comboRate) {
      return Math.floor(amount * comboRate);
    }
    return null;
  }, [betState, selectedMatch, comboRate]);

  if (authLoading) {
    return <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center"><div className="text-amber-400 animate-pulse">載入中...</div></div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex flex-col items-center justify-center gap-6 px-4">
        <div className="text-6xl">⚾</div>
        <h1 className="text-2xl font-bold text-amber-400">WBC 世界棒球競猜</h1>
        <p className="text-slate-400 text-center max-w-sm">登入後即可參與 WBC 2026 世界棒球經典賽競猜</p>
        <a href={getLoginUrl()} className="bg-amber-600 hover:bg-amber-500 text-black font-bold px-8 py-3 rounded-lg transition-colors">登入開始</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white pb-24">
      <SharedNav currentPage="casino" />
      {/* 頂部 */}
      <div className="bg-gradient-to-b from-green-900/20 to-[#0a0e1a] border-b border-green-800/30">
        <div className="max-w-4xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/casino" className="text-slate-500 hover:text-slate-300 text-sm">← 娛樂城</Link>
              <span className="text-slate-600">/</span>
              <h1 className="text-xl font-bold text-white">⚾ WBC 世界棒球競猜</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-slate-400">遊戲點</div>
              <div className="text-amber-400 font-bold">{(balance?.gameCoins ?? 0).toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-5 space-y-5">
        {/* 天命羅盤建議 */}
        <Card className="bg-slate-900/60 border-amber-800/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">{compassAdvice.icon}</div>
              <div>
                <div className="text-xs text-amber-400/70 mb-1">天命羅盤今日建議 · 財運指數 {lotteryScore}/10</div>
                <div className={`text-sm font-medium ${compassAdvice.color}`}>{compassAdvice.text}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 三種玩法說明 */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: "🏆", title: "單場勝負", desc: "猜哪隊獲勝，賠率依強弱而定", color: "border-amber-700/40" },
            { icon: "📊", title: "分差競猜", desc: "猜最終分差區間，賠率更高", color: "border-blue-700/40" },
            { icon: "🔗", title: "天命組合", desc: "串連多場賽事，賠率相乘暴增", color: "border-purple-700/40" },
          ].map(item => (
            <div key={item.title} className={`p-3 rounded-lg bg-slate-900/40 border ${item.color}`}>
              <div className="text-xl mb-1">{item.icon}</div>
              <div className="text-xs font-semibold text-white">{item.title}</div>
              <div className="text-xs text-slate-500 mt-0.5">{item.desc}</div>
            </div>
          ))}
        </div>

        {/* 篩選列 */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">分組：</span>
            <div className="flex gap-1">
              <button
                onClick={() => setFilterGroup("all")}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  filterGroup === "all" ? "bg-amber-600 text-black" : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >全部</button>
              {availableGroups.map(g => (
                <button
                  key={g}
                  onClick={() => setFilterGroup(g)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    filterGroup === g ? "bg-amber-600 text-black" : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >{g}組</button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">日期：</span>
            <div className="flex gap-1 flex-wrap">
              <button
                onClick={() => setFilterDate("all")}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  filterDate === "all" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >全部</button>
              {availableDates.map(d => (
                <button
                  key={d}
                  onClick={() => setFilterDate(d)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    filterDate === d ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >{d}</button>
              ))}
            </div>
          </div>
          {(filterGroup !== "all" || filterDate !== "all") && (
            <button
              onClick={() => { setFilterGroup("all"); setFilterDate("all"); }}
              className="px-2 py-1 rounded text-xs text-slate-500 hover:text-red-400 transition-colors"
            >清除篩選 ×</button>
          )}
        </div>

        {/* 主要內容 Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-800 border border-slate-700">
            <TabsTrigger value="matches" className="data-[state=active]:bg-amber-600 data-[state=active]:text-black">
              待開賽 ({pendingMatches.length})
            </TabsTrigger>
            <TabsTrigger value="mybets" className="data-[state=active]:bg-amber-600 data-[state=active]:text-black">
              我的下注 ({myBets?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="results" className="data-[state=active]:bg-amber-600 data-[state=active]:text-black">
              已結束 ({finishedMatches.length})
            </TabsTrigger>
          </TabsList>

          {/* 待開賽 */}
          <TabsContent value="matches" className="space-y-3 mt-4">
            {matchesLoading ? (
              <div className="text-slate-400 text-sm text-center py-8">載入中...</div>
            ) : pendingMatches.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <div className="text-4xl mb-2">⚾</div>
                <div>目前無待開賽賽事</div>
                <div className="text-xs mt-1">管理員將陸續新增 WBC 2026 賽程</div>
              </div>
            ) : (
              pendingMatches.map(match => {
                const matchDate = new Date(match.matchTime);
                const isUpcoming = matchDate > new Date();
                return (
                  <Card key={match.id} className="bg-slate-900/60 border-slate-700 hover:border-slate-600 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{match.poolGroup}</span>
                          <span>·</span>
                          <span>{match.venue}</span>
                          <span>·</span>
                          <span>{matchDate.toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" })} {matchDate.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <Badge className={`text-xs border ${STATUS_LABELS[match.status]?.color}`}>
                          {STATUS_LABELS[match.status]?.label}
                        </Badge>
                      </div>

                      {/* 隊伍對陣 */}
                      <div className="flex items-center justify-center gap-4 mb-4">
                        <div className="text-center flex-1">
                          <div className="text-2xl mb-1">{match.teamAFlag}</div>
                          <div className="text-sm font-semibold text-white">{match.teamA}</div>
                          <div className="text-xs text-slate-500">客場</div>
                        </div>
                        <div className="text-center">
                          <div className="text-slate-500 font-bold text-lg">VS</div>
                          {!isUpcoming && <div className="text-xs text-red-400 mt-1">已截止</div>}
                        </div>
                        <div className="text-center flex-1">
                          <div className="text-2xl mb-1">{match.teamBFlag}</div>
                          <div className="text-sm font-semibold text-white">{match.teamB}</div>
                          <div className="text-xs text-slate-500">主場</div>
                        </div>
                      </div>

                      {/* 賠率顯示 */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex-1 text-center text-xs text-amber-400">
                          勝率 {match.rateA}x
                        </div>
                        <div className="text-xs text-slate-600">賠率</div>
                        <div className="flex-1 text-center text-xs text-amber-400">
                          勝率 {match.rateB}x
                        </div>
                      </div>

                      {/* 下注按鈕 */}
                      {isUpcoming && (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => openBetDialog(match, "winlose")}
                            className="flex-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 border border-amber-600/30 text-xs h-8">
                            🏆 單場勝負
                          </Button>
                          <Button size="sm" onClick={() => openBetDialog(match, "spread")}
                            className="flex-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-600/30 text-xs h-8">
                            📊 分差競猜
                          </Button>
                          <Button size="sm" onClick={() => openBetDialog(match, "combo")}
                            className="flex-1 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 border border-purple-600/30 text-xs h-8">
                            🔗 組合
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* 我的下注 */}
          <TabsContent value="mybets" className="mt-4">
            {!myBets || myBets.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <div className="text-4xl mb-2">📋</div>
                <div>尚無下注記錄</div>
              </div>
            ) : (
              <div className="space-y-2">
                {myBets.map(bet => {
                  const match = allMatches?.find(m => m.id === bet.matchId);
                  const statusInfo = BET_STATUS_LABELS[bet.status] ?? BET_STATUS_LABELS.placed;
                  const betTypeLabel = bet.betType === "winlose" ? "單場勝負" : bet.betType === "spread" ? "分差競猜" : "天命組合";
                  return (
                    <div key={bet.id} className="p-3 rounded-lg bg-slate-900/40 border border-slate-700 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-white font-medium">
                          {match ? `${match.teamAFlag} ${match.teamA} vs ${match.teamBFlag} ${match.teamB}` : `賽事 #${bet.matchId}`}
                        </div>
                        <span className={`text-xs font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>{betTypeLabel}</span>
                        <span>·</span>
                        <span>下注 {bet.amount} 遊戲點</span>
                        <span>·</span>
                        <span>賠率 {bet.appliedRate}x</span>
                        {bet.status === "won" && (
                          <span className="text-green-400 font-medium">+{bet.actualWin} 遊戲點</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* 已結束 */}
          <TabsContent value="results" className="mt-4">
            {finishedMatches.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <div className="text-4xl mb-2">🏁</div>
                <div>尚無已結束賽事</div>
              </div>
            ) : (
              <div className="space-y-2">
                {finishedMatches.map(match => (
                  <div key={match.id} className="p-3 rounded-lg bg-slate-900/40 border border-slate-700">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-white">
                        {match.teamAFlag} {match.teamA} vs {match.teamBFlag} {match.teamB}
                      </div>
                      <div className="text-right">
                        {match.finalScore && <div className="text-amber-400 font-bold text-sm">{match.finalScore}</div>}
                        <div className="text-xs text-slate-500">
                          {match.winningTeam === "A" ? `${match.teamA} 勝` : match.winningTeam === "B" ? `${match.teamB} 勝` : "平局"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* 下注 Dialog */}
      <Dialog open={showBetDialog} onOpenChange={setShowBetDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-400">
              {betState.betType === "winlose" ? "🏆 單場勝負" : betState.betType === "spread" ? "📊 分差競猜" : "🔗 天命組合投注"}
            </DialogTitle>
          </DialogHeader>

          {selectedMatch && (
            <div className="space-y-4">
              {/* 賽事資訊 */}
              <div className="text-center p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="text-sm text-white font-medium">
                  {selectedMatch.teamAFlag} {selectedMatch.teamA} vs {selectedMatch.teamBFlag} {selectedMatch.teamB}
                </div>
                <div className="text-xs text-slate-500 mt-1">{selectedMatch.poolGroup} · {selectedMatch.venue}</div>
              </div>

              {/* 單場勝負選項 */}
              {betState.betType === "winlose" && (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "A", label: `${selectedMatch.teamAFlag} ${selectedMatch.teamA}`, rate: selectedMatch.rateA, desc: "客場" },
                    { key: "B", label: `${selectedMatch.teamBFlag} ${selectedMatch.teamB}`, rate: selectedMatch.rateB, desc: "主場" },
                  ].map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setBetState(s => ({ ...s, betOn: opt.key }))}
                      className={`p-3 rounded-lg border text-center transition-all ${betState.betOn === opt.key
                        ? "border-amber-500 bg-amber-500/20"
                        : "border-slate-600 bg-slate-800/50 hover:border-slate-500"
                      }`}
                    >
                      <div className="text-sm font-medium text-white">{opt.label}</div>
                      <div className="text-xs text-slate-500">{opt.desc}</div>
                      <div className="text-amber-400 font-bold mt-1">{opt.rate}x</div>
                    </button>
                  ))}
                </div>
              )}

              {/* 分差競猜選項 */}
              {betState.betType === "spread" && (
                <div className="grid grid-cols-2 gap-2">
                  {SPREAD_OPTIONS.map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setBetState(s => ({ ...s, betOn: opt.key }))}
                      className={`p-3 rounded-lg border text-center transition-all ${betState.betOn === opt.key
                        ? "border-blue-500 bg-blue-500/20"
                        : "border-slate-600 bg-slate-800/50 hover:border-slate-500"
                      }`}
                    >
                      <div className="text-sm font-medium text-white">{opt.label}</div>
                      <div className="text-blue-400 font-bold mt-1">{opt.rate}x</div>
                    </button>
                  ))}
                </div>
              )}

              {/* 天命組合選項 */}
              {betState.betType === "combo" && (
                <div className="space-y-2">
                  <div className="text-xs text-slate-400">選擇此場押注方向，再選其他場次串聯：</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: "A", label: `${selectedMatch.teamAFlag} ${selectedMatch.teamA}`, rate: selectedMatch.rateA },
                      { key: "B", label: `${selectedMatch.teamBFlag} ${selectedMatch.teamB}`, rate: selectedMatch.rateB },
                    ].map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => setBetState(s => ({
                          ...s,
                          comboPicks: { ...s.comboPicks, [selectedMatch.id]: opt.key as "A" | "B" },
                        }))}
                        className={`p-2 rounded-lg border text-center text-sm transition-all ${betState.comboPicks[selectedMatch.id] === opt.key
                          ? "border-purple-500 bg-purple-500/20"
                          : "border-slate-600 bg-slate-800/50"
                        }`}
                      >
                        <div className="text-white text-xs">{opt.label}</div>
                        <div className="text-purple-400 font-bold">{opt.rate}x</div>
                      </button>
                    ))}
                  </div>
                  {pendingMatches.filter(m => m.id !== selectedMatch.id).length > 0 && (
                    <div>
                      <div className="text-xs text-slate-400 mb-2">串聯其他賽事（至少再選 1 場）：</div>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {pendingMatches.filter(m => m.id !== selectedMatch.id).map(m => (
                          <div key={m.id} className="flex items-center gap-2 p-2 rounded bg-slate-800/50 border border-slate-700">
                            <div className="flex-1 text-xs text-white">{m.teamAFlag} {m.teamA} vs {m.teamBFlag} {m.teamB}</div>
                            <div className="flex gap-1">
                              {[{ k: "A", label: m.teamAFlag, rate: m.rateA }, { k: "B", label: m.teamBFlag, rate: m.rateB }].map(opt => (
                                <button
                                  key={opt.k}
                                  onClick={() => setBetState(s => ({
                                    ...s,
                                    comboPicks: { ...s.comboPicks, [m.id]: opt.k as "A" | "B" },
                                    comboMatchIds: Array.from(new Set([...s.comboMatchIds, m.id])),
                                  }))}
                                  className={`px-2 py-1 rounded text-xs border transition-all ${betState.comboPicks[m.id] === opt.k
                                    ? "border-purple-500 bg-purple-500/20 text-purple-300"
                                    : "border-slate-600 text-slate-400"
                                  }`}
                                >
                                  {opt.label} {opt.rate}x
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {comboRate && (
                    <div className="text-center text-purple-400 font-bold text-sm">
                      組合賠率：{comboRate}x（{Object.keys(betState.comboPicks).length} 場串聯）
                    </div>
                  )}
                </div>
              )}

              {/* 下注金額 */}
              <div>
                <div className="text-xs text-slate-400 mb-1">下注遊戲點（最低 10，餘額 {(balance?.gameCoins ?? 0).toLocaleString()}）</div>
                <Input
                  type="number" min="10" step="10"
                  placeholder="輸入下注金額"
                  value={betState.amount}
                  onChange={e => setBetState(s => ({ ...s, amount: e.target.value }))}
                  className="bg-slate-800 border-slate-600 text-white"
                />
                {/* 快速金額 */}
                <div className="flex gap-2 mt-2">
                  {[50, 100, 200, 500].map(v => (
                    <button key={v} onClick={() => setBetState(s => ({ ...s, amount: String(v) }))}
                      className="flex-1 text-xs py-1 rounded border border-slate-600 text-slate-400 hover:border-amber-500 hover:text-amber-400 transition-colors">
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* 潛在獲利 */}
              {potentialWin !== null && betState.amount && (
                <div className="p-3 rounded-lg bg-amber-900/20 border border-amber-700/30 text-center">
                  <div className="text-xs text-slate-400">潛在獲利</div>
                  <div className="text-xl font-bold text-amber-400">{potentialWin.toLocaleString()} 遊戲點</div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowBetDialog(false)} className="text-slate-400">取消</Button>
            <Button
              onClick={handlePlaceBet}
              disabled={placeBet.isPending || !betState.amount || Number(betState.amount) < 10}
              className="bg-amber-600 hover:bg-amber-500 text-black font-bold"
            >
              {placeBet.isPending ? "下注中..." : "確認下注"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
