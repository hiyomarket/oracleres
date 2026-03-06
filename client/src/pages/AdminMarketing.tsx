/**
 * AdminMarketing.tsx
 * 行銷中心 - 天命娛樂城後台管理
 * 重構版：活動卡片化架構，支援多個行銷活動並排，手機版友善
 */
import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "待開賽", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  live: { label: "進行中", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  finished: { label: "已結束", color: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
  cancelled: { label: "已取消", color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

interface MatchForm {
  teamA: string;
  teamB: string;
  teamAFlag: string;
  teamBFlag: string;
  matchTime: string;
  venue: string;
  poolGroup: string;
  rateA: string;
  rateB: string;
}

const EMPTY_FORM: MatchForm = {
  teamA: "", teamB: "", teamAFlag: "🏳️", teamBFlag: "🏳️",
  matchTime: "", venue: "", poolGroup: "", rateA: "1.90", rateB: "1.90",
};

function MatchFormFields({ value, onChange }: { value: MatchForm; onChange: (v: MatchForm) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <Label className="text-slate-300 text-xs">客場旗幟</Label>
        <Input value={value.teamAFlag} onChange={e => onChange({ ...value, teamAFlag: e.target.value })}
          className="bg-slate-800 border-slate-600 text-white" placeholder="🏳️" />
      </div>
      <div>
        <Label className="text-slate-300 text-xs">主場旗幟</Label>
        <Input value={value.teamBFlag} onChange={e => onChange({ ...value, teamBFlag: e.target.value })}
          className="bg-slate-800 border-slate-600 text-white" placeholder="🏳️" />
      </div>
      <div>
        <Label className="text-slate-300 text-xs">客場隊伍 *</Label>
        <Input value={value.teamA} onChange={e => onChange({ ...value, teamA: e.target.value })}
          className="bg-slate-800 border-slate-600 text-white" placeholder="中華臺北" />
      </div>
      <div>
        <Label className="text-slate-300 text-xs">主場隊伍 *</Label>
        <Input value={value.teamB} onChange={e => onChange({ ...value, teamB: e.target.value })}
          className="bg-slate-800 border-slate-600 text-white" placeholder="日本" />
      </div>
      <div className="col-span-2">
        <Label className="text-slate-300 text-xs">比賽時間（台灣時間）*</Label>
        <Input type="datetime-local" value={value.matchTime} onChange={e => onChange({ ...value, matchTime: e.target.value })}
          className="bg-slate-800 border-slate-600 text-white" />
      </div>
      <div>
        <Label className="text-slate-300 text-xs">場地</Label>
        <Input value={value.venue} onChange={e => onChange({ ...value, venue: e.target.value })}
          className="bg-slate-800 border-slate-600 text-white" placeholder="東京巨蛋" />
      </div>
      <div>
        <Label className="text-slate-300 text-xs">分組</Label>
        <Input value={value.poolGroup} onChange={e => onChange({ ...value, poolGroup: e.target.value })}
          className="bg-slate-800 border-slate-600 text-white" placeholder="C組" />
      </div>
      <div>
        <Label className="text-slate-300 text-xs">客場賠率</Label>
        <Input type="number" step="0.01" min="1" max="99" value={value.rateA}
          onChange={e => onChange({ ...value, rateA: e.target.value })}
          className="bg-slate-800 border-slate-600 text-white" />
      </div>
      <div>
        <Label className="text-slate-300 text-xs">主場賠率</Label>
        <Input type="number" step="0.01" min="1" max="99" value={value.rateB}
          onChange={e => onChange({ ...value, rateB: e.target.value })}
          className="bg-slate-800 border-slate-600 text-white" />
      </div>
    </div>
  );
}

export default function AdminMarketing() {
  const utils = trpc.useUtils();

  // Economy config
  const { data: economyConfig, isLoading: configLoading } = trpc.marketing.getEconomyConfig.useQuery();
  const [p2cRate, setP2cRate] = useState("");
  const [c2pRate, setC2pRate] = useState("");
  const [dailyLimit, setDailyLimit] = useState("");
  const updateConfig = trpc.marketing.updateEconomyConfig.useMutation({
    onSuccess: () => {
      toast.success("經濟配置已更新");
      utils.marketing.getEconomyConfig.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // WBC matches
  const { data: matches, isLoading: matchesLoading } = trpc.marketing.getAdminMatches.useQuery();
  const importSchedule = trpc.marketing.importWbcSchedule.useMutation({
    onSuccess: (data) => {
      toast.success(`已匯入 ${data.count} 場 WBC 2026 賽事`);
      utils.marketing.getAdminMatches.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const createMatch = trpc.marketing.createMatch.useMutation({
    onSuccess: () => {
      toast.success("賽事已建立");
      utils.marketing.getAdminMatches.invalidate();
      setShowCreateDialog(false);
      setForm(EMPTY_FORM);
    },
    onError: (e) => toast.error(e.message),
  });
  const updateMatch = trpc.marketing.updateMatch.useMutation({
    onSuccess: () => {
      toast.success("賽事已更新");
      utils.marketing.getAdminMatches.invalidate();
      setShowEditDialog(false);
      setEditingMatch(null);
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteMatch = trpc.marketing.deleteMatch.useMutation({
    onSuccess: () => {
      toast.success("賽事已刪除");
      utils.marketing.getAdminMatches.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const settleMatch = trpc.wbc.settleMatch.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.marketing.getAdminMatches.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const updateMatchDeadline = trpc.wbc.updateMatchDeadline.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.marketing.getAdminMatches.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const updateAllMatchDeadlines = trpc.wbc.updateAllMatchDeadlines.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.marketing.getAdminMatches.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const [globalDeadlineMinutes, setGlobalDeadlineMinutes] = useState("30");

  // WBC 開關
  const { data: wbcEnabledData } = trpc.marketing.getWbcEnabled.useQuery();
  const setWbcEnabled = trpc.marketing.setWbcEnabled.useMutation({
    onSuccess: (data) => {
      toast.success(data.enabled ? "WBC 活動已開啟" : "WBC 活動已關閉，前台橫幅和彈窗已隐藏");
      utils.marketing.getWbcEnabled.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // 問卜積分費用
  const { data: divinationCostData } = trpc.marketing.getDivinationCost.useQuery();
  const [divinationCostInput, setDivinationCostInput] = useState("");
  const setDivinationCost = trpc.marketing.setDivinationCost.useMutation({
    onSuccess: (data) => {
      toast.success(`問卜費用已設為 ${data.cost} 點`);
      utils.marketing.getDivinationCost.invalidate();
      setDivinationCostInput("");
    },
    onError: (e) => toast.error(e.message),
  });

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showSettleDialog, setShowSettleDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingMatch, setEditingMatch] = useState<any>(null);
  const [settlingMatch, setSettlingMatch] = useState<any>(null);
  const [form, setForm] = useState<MatchForm>(EMPTY_FORM);
  const [settleForm, setSettleForm] = useState({ winningTeam: "A" as "A" | "B" | "draw", finalScore: "", scoreDiff: "0" });

  // WBC panel expand state
  const [wbcExpanded, setWbcExpanded] = useState(false);
  const [wbcStatusFilter, setWbcStatusFilter] = useState<"all" | "pending" | "finished">("pending");

  function handleSaveConfig() {
    updateConfig.mutate({
      pointsToCoinsRate: Number(p2cRate || economyConfig?.pointsToCoinsRate || 20),
      coinsToPointsRate: Number(c2pRate || economyConfig?.coinsToPointsRate || 50),
      dailyCoinsToPointsLimit: Number(dailyLimit || economyConfig?.dailyCoinsToPointsLimit || 100),
    });
  }

  function handleCreateMatch() {
    if (!form.teamA || !form.teamB || !form.matchTime) {
      toast.error("請填寫必填欄位（客場、主場、比賽時間）");
      return;
    }
    createMatch.mutate({
      teamA: form.teamA, teamB: form.teamB,
      teamAFlag: form.teamAFlag, teamBFlag: form.teamBFlag,
      matchTime: new Date(form.matchTime).getTime(),
      venue: form.venue, poolGroup: form.poolGroup,
      rateA: Number(form.rateA), rateB: Number(form.rateB),
    });
  }

  function handleEditMatch() {
    if (!editingMatch || !form.teamA || !form.teamB || !form.matchTime) {
      toast.error("請填寫必填欄位");
      return;
    }
    updateMatch.mutate({
      id: editingMatch.id,
      teamA: form.teamA, teamB: form.teamB,
      teamAFlag: form.teamAFlag, teamBFlag: form.teamBFlag,
      matchTime: new Date(form.matchTime).getTime(),
      venue: form.venue, poolGroup: form.poolGroup,
      rateA: Number(form.rateA), rateB: Number(form.rateB),
    });
  }

  function handleSettle() {
    if (!settlingMatch) return;
    settleMatch.mutate({
      matchId: settlingMatch.id,
      winningTeam: settleForm.winningTeam,
      finalScore: settleForm.finalScore || undefined,
      scoreDiff: Number(settleForm.scoreDiff),
    });
    setShowSettleDialog(false);
    setSettlingMatch(null);
  }

  function openEdit(match: any) {
    setEditingMatch(match);
    const dt = new Date(match.matchTime);
    const pad = (n: number) => String(n).padStart(2, "0");
    const localStr = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    setForm({
      teamA: match.teamA, teamB: match.teamB,
      teamAFlag: match.teamAFlag, teamBFlag: match.teamBFlag,
      matchTime: localStr, venue: match.venue ?? "",
      poolGroup: match.poolGroup ?? "", rateA: String(match.rateA), rateB: String(match.rateB),
    });
    setShowEditDialog(true);
  }

  function openSettle(match: any) {
    setSettlingMatch(match);
    setSettleForm({ winningTeam: "A", finalScore: "", scoreDiff: "0" });
    setShowSettleDialog(true);
  }

  // Filtered matches
  const filteredMatches = matches?.filter(m => {
    if (wbcStatusFilter === "all") return true;
    if (wbcStatusFilter === "pending") return m.status === "pending" || m.status === "live";
    if (wbcStatusFilter === "finished") return m.status === "finished" || m.status === "cancelled";
    return true;
  }) ?? [];

  const pendingCount = matches?.filter(m => m.status === "pending" || m.status === "live").length ?? 0;
  const finishedCount = matches?.filter(m => m.status === "finished").length ?? 0;

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* 頁首 */}
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-amber-400">🎰 行銷中心</h1>
          <p className="text-slate-400 text-sm mt-1">管理各項行銷活動與娛樂城經濟系統</p>
        </div>

        {/* 活動卡片區 - 橫向排列，手機版垂直 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-slate-300 font-semibold text-sm">進行中的行銷活動</h2>
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">1 個活動</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* WBC 2026 活動卡片 */}
            <Card className="bg-slate-900 border-slate-700 hover:border-amber-600/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">⚾</span>
                    <div>
                      <CardTitle className="text-amber-300 text-base">WBC 2026</CardTitle>
                      <CardDescription className="text-slate-500 text-xs">世界棒球經典賽競猜</CardDescription>
                    </div>
                  </div>
                  <button
                    onClick={() => setWbcEnabled.mutate({ enabled: !(wbcEnabledData?.enabled ?? true) })}
                    disabled={setWbcEnabled.isPending}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${
                      (wbcEnabledData?.enabled ?? true) ? 'bg-green-500' : 'bg-slate-600'
                    }`}
                    title={(wbcEnabledData?.enabled ?? true) ? '點擊關閉 WBC 活動' : '點擊開啟 WBC 活動'}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                      (wbcEnabledData?.enabled ?? true) ? 'translate-x-4' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {/* 統計摘要 */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-slate-800/60 rounded-lg p-2.5 text-center">
                    <div className="text-amber-400 font-bold text-lg">{pendingCount}</div>
                    <div className="text-slate-500 text-xs">待開賽</div>
                  </div>
                  <div className="bg-slate-800/60 rounded-lg p-2.5 text-center">
                    <div className="text-slate-300 font-bold text-lg">{finishedCount}</div>
                    <div className="text-slate-500 text-xs">已結算</div>
                  </div>
                </div>
                {/* 操作按鈕 */}
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => setWbcExpanded(!wbcExpanded)}
                    variant="outline"
                    className="w-full border-slate-600 text-slate-300 hover:text-white hover:border-amber-600/50 text-sm h-9"
                  >
                    {wbcExpanded ? "▲ 收起賽事列表" : "▼ 展開賽事列表"}
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => { setForm(EMPTY_FORM); setShowCreateDialog(true); }}
                      className="flex-1 bg-amber-600 hover:bg-amber-500 text-black font-semibold text-xs h-8"
                    >
                      + 新增賽事
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowImportDialog(true)}
                      disabled={importSchedule.isPending}
                      className="flex-1 border-amber-600/50 text-amber-400 hover:bg-amber-600/10 text-xs h-8"
                    >
                      📥 匯入賽程
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 未來活動佔位卡片 */}
            <Card className="bg-slate-900/40 border-slate-700/40 border-dashed opacity-50">
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <div className="text-3xl mb-2">➕</div>
                <div className="text-slate-500 text-sm font-medium">新增行銷活動</div>
                <div className="text-slate-600 text-xs mt-1">即將支援更多活動類型</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* WBC 賽事列表（可展開/收起） */}
        {wbcExpanded && (
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-amber-300 text-base">⚾ WBC 2026 賽事列表</CardTitle>
                  <CardDescription className="text-slate-400 text-xs">共 {matches?.length ?? 0} 場賽事</CardDescription>
                </div>
                {/* 狀態篩選 */}
                <div className="flex gap-1 flex-wrap">
                  {(["all", "pending", "finished"] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setWbcStatusFilter(f)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        wbcStatusFilter === f
                          ? "bg-amber-600 text-black"
                          : "bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {f === "all" ? `全部 (${matches?.length ?? 0})` : f === "pending" ? `待開賽 (${pendingCount})` : `已結算 (${finishedCount})`}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {matchesLoading ? (
                <div className="text-slate-400 text-sm py-4 text-center">載入中...</div>
              ) : filteredMatches.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <div className="text-3xl mb-2">⚾</div>
                  <div className="text-sm">
                    {wbcStatusFilter === "pending" ? "目前沒有待開賽的賽事" :
                     wbcStatusFilter === "finished" ? "尚無已結算的賽事" :
                     "尚無賽事，點擊「匯入賽程」快速建立"}
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredMatches.map((match) => {
                    const statusInfo = STATUS_LABELS[match.status] ?? STATUS_LABELS.pending;
                    const matchDate = new Date(match.matchTime);
                    return (
                      <div key={match.id}
                        className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/60 hover:border-slate-600/60 transition-colors"
                      >
                        {/* 日期 */}
                        <div className="text-xs text-slate-500 w-12 shrink-0 text-center">
                          <div className="font-medium text-slate-400">
                            {matchDate.toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" })}
                          </div>
                          <div>{matchDate.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}</div>
                        </div>
                        {/* 賽事資訊 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-sm font-medium text-white flex-wrap">
                            <span className="whitespace-nowrap">{match.teamAFlag} {match.teamA}</span>
                            <span className="text-slate-500 text-xs">vs</span>
                            <span className="whitespace-nowrap">{match.teamBFlag} {match.teamB}</span>
                            {match.poolGroup && (
                              <span className="text-xs text-slate-500 hidden sm:inline">({match.poolGroup})</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 truncate">
                            {match.venue && <span>{match.venue} · </span>}
                            <span>賠率 {match.rateA}/{match.rateB}</span>
                            {match.finalScore && <span className="ml-1.5 text-amber-400">比分：{match.finalScore}</span>}
                            {match.status === "pending" && (
                              <span className="ml-1.5 text-blue-400">截止：{(match as any).bettingDeadlineMinutes ?? 30}分前</span>
                            )}
                          </div>
                        </div>
                        {/* 狀態 */}
                        <Badge className={`text-xs border shrink-0 hidden sm:flex ${statusInfo.color}`}>
                          {statusInfo.label}
                        </Badge>
                        {/* 操作按鈕 */}
                        <div className="flex gap-1 shrink-0">
                          {match.status === "pending" && (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => openEdit(match)}
                                className="text-slate-400 hover:text-white h-7 px-1.5 text-xs">編輯</Button>
                              <Button size="sm" variant="ghost" onClick={() => {
                                const current = (match as any).bettingDeadlineMinutes ?? 30;
                                const mins = prompt(
                                  `設定「${match.teamA} vs ${match.teamB}」的下注截止時間\n（比賽開始前幾分鐘截止，輸入 0 表示比賽開始時才截止）`,
                                  String(current)
                                );
                                if (mins !== null && !isNaN(Number(mins)) && Number(mins) >= 0) {
                                  updateMatchDeadline.mutate({ matchId: match.id, bettingDeadlineMinutes: Number(mins) });
                                }
                              }}
                                className="text-blue-400 hover:text-blue-300 h-7 px-1.5 text-xs">截止</Button>
                              <Button size="sm" variant="ghost" onClick={() => openSettle(match)}
                                className="text-green-400 hover:text-green-300 h-7 px-1.5 text-xs">結算</Button>
                            </>
                          )}
                          {match.status !== "finished" && (
                            <Button size="sm" variant="ghost"
                              onClick={() => { if (confirm("確定刪除此賽事？")) deleteMatch.mutate({ id: match.id }); }}
                              className="text-red-400 hover:text-red-300 h-7 px-1.5 text-xs">刪除</Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* 批量設定截止時間 */}
              {pendingCount > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-700/50 flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <span className="text-slate-400 text-xs whitespace-nowrap">批量設定待開賽截止時間：</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number" min="0" max="1440"
                      value={globalDeadlineMinutes}
                      onChange={e => setGlobalDeadlineMinutes(e.target.value)}
                      className="bg-slate-800 border-slate-600 text-white h-7 text-xs w-20"
                      placeholder="30"
                    />
                    <span className="text-slate-500 text-xs">分鐘前截止</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirm(`確定將所有待開賽比賽的截止時間設為 ${globalDeadlineMinutes} 分鐘？`)) {
                          updateAllMatchDeadlines.mutate({ bettingDeadlineMinutes: Number(globalDeadlineMinutes) });
                        }
                      }}
                      disabled={updateAllMatchDeadlines.isPending}
                      className="border-blue-600/50 text-blue-400 hover:bg-blue-600/10 text-xs h-7"
                    >
                      {updateAllMatchDeadlines.isPending ? "套用中..." : "套用全部"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 經濟系統配置 */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-amber-300 text-base">💱 雙軌貨幣兌換比率</CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              設定積分與遊戲點之間的兌換比率及每日限額
            </CardDescription>
          </CardHeader>
          <CardContent>
            {configLoading ? (
              <div className="text-slate-400 text-sm">載入中...</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-slate-300 text-sm">積分 → 遊戲點</Label>
                  <div className="text-xs text-slate-500 mb-1">1 積分 = N 遊戲點（目前：{economyConfig?.pointsToCoinsRate}）</div>
                  <Input
                    type="number" min="1" max="1000"
                    placeholder={String(economyConfig?.pointsToCoinsRate ?? 20)}
                    value={p2cRate}
                    onChange={e => setP2cRate(e.target.value)}
                    className="bg-slate-800 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300 text-sm">遊戲點 → 積分</Label>
                  <div className="text-xs text-slate-500 mb-1">N 遊戲點 = 1 積分（目前：{economyConfig?.coinsToPointsRate}）</div>
                  <Input
                    type="number" min="1" max="1000"
                    placeholder={String(economyConfig?.coinsToPointsRate ?? 50)}
                    value={c2pRate}
                    onChange={e => setC2pRate(e.target.value)}
                    className="bg-slate-800 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300 text-sm">每日兌換積分上限</Label>
                  <div className="text-xs text-slate-500 mb-1">每日最多兌換回 N 積分（目前：{economyConfig?.dailyCoinsToPointsLimit}）</div>
                  <Input
                    type="number" min="1" max="10000"
                    placeholder={String(economyConfig?.dailyCoinsToPointsLimit ?? 100)}
                    value={dailyLimit}
                    onChange={e => setDailyLimit(e.target.value)}
                    className="bg-slate-800 border-slate-600 text-white"
                  />
                </div>
              </div>
            )}
          <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-center">
              <Button
                onClick={handleSaveConfig}
                disabled={updateConfig.isPending}
                className="bg-amber-600 hover:bg-amber-500 text-black font-semibold"
              >
                {updateConfig.isPending ? "儲存中..." : "儲存配置"}
              </Button>
              <div className="text-xs text-slate-500">
                ⚠️ 修改比率會即時影響所有用戶的尌換操作
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 問卜費用控制 — 已移至天命小舖管理 */}
        <Card className="bg-slate-900 border-amber-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-amber-300 text-base">🪙 AI 功能天命幣費用設定</CardTitle>
            <CardDescription className="text-slate-400 text-sm">此功能已統一移至「天命小舖管理」頁面集中管理</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <span className="text-2xl">🪙</span>
              <div className="flex-1">
                <p className="text-sm text-amber-300 font-medium">已移至天命小舖管理</p>
                <p className="text-xs text-slate-400 mt-0.5">問卜、深度解讀、穿搞揃描、天命菜單等所有 AI 功能的天命幣費用，現在在天命小舖管理頁面統一設定</p>
              </div>
              <a href="/admin/destiny-shop">
                <Button size="sm" className="bg-amber-600 hover:bg-amber-500 text-black font-semibold shrink-0">
                  前往設定 →
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 新增賽事 Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg mx-4">
          <DialogHeader>
            <DialogTitle className="text-amber-400">新增 WBC 賽事</DialogTitle>
          </DialogHeader>
          <MatchFormFields value={form} onChange={setForm} />
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="ghost" onClick={() => setShowCreateDialog(false)} className="text-slate-400">取消</Button>
            <Button onClick={handleCreateMatch} disabled={createMatch.isPending}
              className="bg-amber-600 hover:bg-amber-500 text-black font-semibold">
              {createMatch.isPending ? "建立中..." : "建立賽事"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 編輯賽事 Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg mx-4">
          <DialogHeader>
            <DialogTitle className="text-amber-400">編輯賽事</DialogTitle>
          </DialogHeader>
          <MatchFormFields value={form} onChange={setForm} />
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="ghost" onClick={() => setShowEditDialog(false)} className="text-slate-400">取消</Button>
            <Button onClick={handleEditMatch} disabled={updateMatch.isPending}
              className="bg-amber-600 hover:bg-amber-500 text-black font-semibold">
              {updateMatch.isPending ? "儲存中..." : "儲存變更"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 結算 Dialog */}
      <Dialog open={showSettleDialog} onOpenChange={setShowSettleDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="text-amber-400">結算賽事</DialogTitle>
          </DialogHeader>
          {settlingMatch && (
            <div className="space-y-4">
              <div className="text-center text-white font-medium text-sm">
                {settlingMatch.teamAFlag} {settlingMatch.teamA} vs {settlingMatch.teamBFlag} {settlingMatch.teamB}
              </div>
              <div>
                <Label className="text-slate-300 text-sm">獲勝方</Label>
                <Select value={settleForm.winningTeam} onValueChange={v => setSettleForm(f => ({ ...f, winningTeam: v as "A" | "B" | "draw" }))}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="A" className="text-white">{settlingMatch.teamAFlag} {settlingMatch.teamA}（客場）</SelectItem>
                    <SelectItem value="B" className="text-white">{settlingMatch.teamBFlag} {settlingMatch.teamB}（主場）</SelectItem>
                    <SelectItem value="draw" className="text-white">平局</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300 text-sm">最終比分（選填）</Label>
                <Input value={settleForm.finalScore} onChange={e => setSettleForm(f => ({ ...f, finalScore: e.target.value }))}
                  className="bg-slate-800 border-slate-600 text-white mt-1" placeholder="例如：3-2" />
              </div>
              <div>
                <Label className="text-slate-300 text-sm">分差（用於分差競猜結算）</Label>
                <Input type="number" min="0" value={settleForm.scoreDiff}
                  onChange={e => setSettleForm(f => ({ ...f, scoreDiff: e.target.value }))}
                  className="bg-slate-800 border-slate-600 text-white mt-1" />
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="ghost" onClick={() => setShowSettleDialog(false)} className="text-slate-400">取消</Button>
            <Button onClick={handleSettle} disabled={settleMatch.isPending}
              className="bg-green-600 hover:bg-green-500 text-white font-semibold">
              {settleMatch.isPending ? "結算中..." : "確認結算"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 匯入確認對話框 */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="text-amber-300">📥 匯入 WBC 2026 完整賽程</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-slate-300">
            <p>即將匯入 <span className="text-amber-400 font-bold">40 場</span> WBC 2026 小組賽賽事，涵蓋：</p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 text-xs">
              <li>A 組（聖胡安）：波多黎各、哥倫比亞、尼加拉瓜、巴拿馬</li>
              <li>B 組（休士頓）：美國、墨西哥、巴西、古巴</li>
              <li>C 組（東京）：日本、中華臺北、南韓、澳大利亞、捷克</li>
              <li>D 組（邁阿密）：多明尼加、委內瑞拉、荷蘭、以色列</li>
            </ul>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded p-2 text-amber-300 text-xs">
              ⚠️ 此操作將清除所有現有「待開賽」狀態的賽事，已結算的歷史記錄不受影響。
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="ghost" onClick={() => setShowImportDialog(false)} className="text-slate-400">取消</Button>
            <Button
              onClick={() => { importSchedule.mutate(); setShowImportDialog(false); }}
              disabled={importSchedule.isPending}
              className="bg-amber-600 hover:bg-amber-500 text-black font-semibold"
            >
              {importSchedule.isPending ? "匯入中..." : "確認匯入"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
