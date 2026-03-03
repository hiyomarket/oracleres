/**
 * AdminMarketing.tsx
 * 行銷中心 - 天命娛樂城後台管理
 * - 經濟系統配置（兌換比率、每日限額）
 * - WBC 賽事管理（新增、編輯、結算）
 * - 一鍵匯入 WBC 2026 預設賽程
 */
import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showSettleDialog, setShowSettleDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingMatch, setEditingMatch] = useState<any>(null);
  const [settlingMatch, setSettlingMatch] = useState<any>(null);
  const [form, setForm] = useState<MatchForm>(EMPTY_FORM);
  const [settleForm, setSettleForm] = useState({ winningTeam: "A" as "A" | "B" | "draw", finalScore: "", scoreDiff: "0" });

  function handleSaveConfig() {
    updateConfig.mutate({
      pointsToCoinsRate: Number(p2cRate || economyConfig?.pointsToCoinsRate || 20),
      coinsToPointsRate: Number(c2pRate || economyConfig?.coinsToPointsRate || 50),
      dailyCoinsToPointsLimit: Number(dailyLimit || economyConfig?.dailyCoinsToPointsLimit || 100),
    });
  }

  function handleCreateMatch() {
    if (!form.teamA || !form.teamB || !form.matchTime) {
      toast.error("請填寫隊伍名稱和比賽時間");
      return;
    }
    createMatch.mutate({
      ...form,
      matchTime: new Date(form.matchTime).getTime(),
      rateA: Number(form.rateA),
      rateB: Number(form.rateB),
    });
  }

  function handleEditMatch() {
    if (!editingMatch) return;
    updateMatch.mutate({
      id: editingMatch.id,
      ...form,
      matchTime: new Date(form.matchTime).getTime(),
      rateA: Number(form.rateA),
      rateB: Number(form.rateB),
    });
  }

  function openEdit(match: any) {
    setEditingMatch(match);
    setForm({
      teamA: match.teamA,
      teamB: match.teamB,
      teamAFlag: match.teamAFlag,
      teamBFlag: match.teamBFlag,
      matchTime: new Date(match.matchTime).toISOString().slice(0, 16),
      venue: match.venue,
      poolGroup: match.poolGroup,
      rateA: String(match.rateA),
      rateB: String(match.rateB),
    });
    setShowEditDialog(true);
  }

  function openSettle(match: any) {
    setSettlingMatch(match);
    setSettleForm({ winningTeam: "A", finalScore: "", scoreDiff: "0" });
    setShowSettleDialog(true);
  }

  function handleSettle() {
    if (!settlingMatch) return;
    settleMatch.mutate({
      matchId: settlingMatch.id,
      winningTeam: settleForm.winningTeam,
      finalScore: settleForm.finalScore,
      scoreDiff: Number(settleForm.scoreDiff),
    });
    setShowSettleDialog(false);
  }

  const MatchFormFields = ({ value, onChange }: { value: MatchForm; onChange: (f: MatchForm) => void }) => (
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

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-amber-400">🎰 行銷中心</h1>
          <p className="text-slate-400 text-sm mt-1">天命娛樂城經濟系統配置與 WBC 賽事管理</p>
        </div>

        {/* 經濟系統配置 */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-amber-300 text-lg">💱 雙軌貨幣兌換比率</CardTitle>
            <CardDescription className="text-slate-400">
              設定積分與遊戲點之間的兌換比率及每日限額
            </CardDescription>
          </CardHeader>
          <CardContent>
            {configLoading ? (
              <div className="text-slate-400 text-sm">載入中...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-slate-300 text-sm">積分 → 遊戲點比率</Label>
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
                  <Label className="text-slate-300 text-sm">遊戲點 → 積分比率</Label>
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
            <div className="mt-4 flex gap-2">
              <Button
                onClick={handleSaveConfig}
                disabled={updateConfig.isPending}
                className="bg-amber-600 hover:bg-amber-500 text-black font-semibold"
              >
                {updateConfig.isPending ? "儲存中..." : "儲存配置"}
              </Button>
              <div className="text-xs text-slate-500 self-center">
                ⚠️ 修改比率會即時影響所有用戶的兌換操作
              </div>
            </div>
          </CardContent>
        </Card>

        {/* WBC 賽事管理 */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-amber-300 text-lg">⚾ WBC 2026 賽事管理</CardTitle>
                <CardDescription className="text-slate-400">新增、編輯、結算 WBC 比賽</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowImportDialog(true)}
                  disabled={importSchedule.isPending}
                  className="border-amber-600 text-amber-400 hover:bg-amber-600/10 text-sm"
                >
                  {importSchedule.isPending ? "匯入中..." : "📥 匯入完整賽程（40場）"}
                </Button>
                <Button
                  onClick={() => { setForm(EMPTY_FORM); setShowCreateDialog(true); }}
                  className="bg-amber-600 hover:bg-amber-500 text-black font-semibold text-sm"
                >
                  + 新增賽事
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {matchesLoading ? (
              <div className="text-slate-400 text-sm">載入中...</div>
            ) : !matches || matches.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <div className="text-4xl mb-2">⚾</div>
                <div>尚無賽事，點擊「匯入預設賽程」快速建立 WBC 2026 賽事</div>
              </div>
            ) : (
              <div className="space-y-2">
                {matches.map((match) => {
                  const statusInfo = STATUS_LABELS[match.status] ?? STATUS_LABELS.pending;
                  const matchDate = new Date(match.matchTime);
                  return (
                    <div key={match.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                      <div className="text-xs text-slate-500 w-16 shrink-0">
                        <div>{matchDate.toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" })}</div>
                        <div>{matchDate.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm font-medium text-white">
                          <span>{match.teamAFlag} {match.teamA}</span>
                          <span className="text-slate-500">vs</span>
                          <span>{match.teamBFlag} {match.teamB}</span>
                          <span className="text-xs text-slate-500">({match.poolGroup})</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {match.venue} · 賠率 {match.rateA} / {match.rateB}
                          {match.finalScore && <span className="ml-2 text-amber-400">最終比分：{match.finalScore}</span>}
                        </div>
                      </div>
                      <Badge className={`text-xs border ${statusInfo.color}`}>{statusInfo.label}</Badge>
                      <div className="flex gap-1 shrink-0">
                        {match.status === "pending" && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => openEdit(match)}
                              className="text-slate-400 hover:text-white h-7 px-2 text-xs">編輯</Button>
                            <Button size="sm" variant="ghost" onClick={() => openSettle(match)}
                              className="text-green-400 hover:text-green-300 h-7 px-2 text-xs">結算</Button>
                          </>
                        )}
                        {match.status !== "finished" && (
                          <Button size="sm" variant="ghost"
                            onClick={() => { if (confirm("確定刪除此賽事？")) deleteMatch.mutate({ id: match.id }); }}
                            className="text-red-400 hover:text-red-300 h-7 px-2 text-xs">刪除</Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 新增賽事 Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-amber-400">新增 WBC 賽事</DialogTitle>
          </DialogHeader>
          <MatchFormFields value={form} onChange={setForm} />
          <DialogFooter>
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
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-amber-400">編輯賽事</DialogTitle>
          </DialogHeader>
          <MatchFormFields value={form} onChange={setForm} />
          <DialogFooter>
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
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-400">結算賽事</DialogTitle>
          </DialogHeader>
          {settlingMatch && (
            <div className="space-y-4">
              <div className="text-center text-white font-medium">
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
          <DialogFooter>
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
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-300">📥 匯入 WBC 2026 完整賽程</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-slate-300">
            <p>即將匯入 <span className="text-amber-400 font-bold">40 場</span> WBC 2026 小組賽賽事，涵蓋：</p>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>A 組（聖胡安）：波多黎各、哥倫比亞、尼加拉瓜、巴拿馬</li>
              <li>B 組（休士頓）：美國、墨西哥、巴西、古巴</li>
              <li>C 組（東京）：日本、中華臺北、南韓、澳大利亞、捷克</li>
              <li>D 組（邁阿密）：多明尼加、委內瑞拉、荷蘭、以色列</li>
            </ul>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded p-2 text-amber-300 text-xs">
              ⚠️ 此操作將清除所有現有「待開賽」狀態的賽事，已結算的歷史記錄不受影響。
            </div>
            <p className="text-slate-400">所有賽事均已預設賠率，匯入後可在管理介面逐一調整。</p>
          </div>
          <DialogFooter>
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
