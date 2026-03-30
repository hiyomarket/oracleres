/**
 * AdminUsers.tsx
 * 管理後台 — 用戶管理頁面 (/admin/users)
 * 職責：查看所有用戶、篩選方案/生命靈數/活躍時間、管理訂閱
 */
import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { AdminLayout } from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ChevronDown, Star } from "lucide-react";

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  basic:        { label: "基礎", color: "bg-slate-600 text-slate-200" },
  advanced:     { label: "進階", color: "bg-orange-600/80 text-orange-100" },
  professional: { label: "專業", color: "bg-purple-600/80 text-purple-100" },
};

const LAST_ACTIVE_OPTIONS = [
  { value: "all",         label: "全部時間" },
  { value: "7d",          label: "7 天內活躍" },
  { value: "30d",         label: "30 天內活躍" },
  { value: "90d",         label: "90 天內活躍" },
  { value: "inactive90d", label: "90 天未活躍" },
];

const TAROT_NAMES: Record<number, string> = {
  0: "小愚者", 1: "魔術師", 2: "女祭司", 3: "女皇", 4: "皇帝",
  5: "教皇", 6: "戀人", 7: "戰車", 8: "力量", 9: "隱者",
  10: "命運之輪", 11: "正義", 12: "倒吊人", 13: "死神", 14: "節制",
  15: "惡魔", 16: "塔", 17: "星星", 18: "月亮", 19: "太陽",
  20: "審判", 21: "世界",
};
const LIFE_PATH_OPTIONS = [
  { value: "all", label: "全部靈數" },
  { value: "0",   label: "靈數 0（小愚者）" },
  ...Array.from({ length: 22 }, (_, i) => ({
    value: String(i + 1),
    label: `靈數 ${i + 1}（${TAROT_NAMES[i + 1] ?? ""}）`,
  })),
];

const PAGE_SIZE_OPTIONS = [
  { value: 10, label: "每頁 10 人" },
  { value: 20, label: "每頁 20 人" },
  { value: 50, label: "每頁 50 人" },
  { value: 100, label: "每頁 100 人" },
];

function formatDate(dateStr: string | Date | null | undefined, includeTime = false) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const date = d.toLocaleDateString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" });
  if (!includeTime) return date;
  const time = d.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date} ${time}`;
}

function formatRelative(dateStr: string | Date | null | undefined) {
  if (!dateStr) return "從未";
  const diff = Date.now() - new Date(dateStr).getTime();
  const absDiff = Math.abs(diff);
  const minutes = Math.floor(absDiff / 60000);
  const hours = Math.floor(absDiff / 3600000);
  const days = Math.floor(absDiff / 86400000);
  if (minutes < 5) return "剛剛";
  if (hours < 1) return `${minutes} 分鐘前`;
  if (hours < 24) return `${hours} 小時前`;
  if (days === 1) return "昨天";
  if (days < 7) return `${days} 天前`;
  if (days < 30) return `${Math.floor(days / 7)} 週前`;
  if (days < 365) return `${Math.floor(days / 30)} 個月前`;
  return `${Math.floor(days / 365)} 年前`;
}

// ─── 訂閱管理 Modal ─────────────────────────────────────────────────────────

/** 訂閱日誌展開面板 */
function SubscriptionLogsPanel({ userId }: { userId: number }) {
  const [open, setOpen] = useState(false);
  const { data: logs, isLoading } = trpc.businessHub.listSubscriptionLogs.useQuery(
    { targetUserId: userId, limit: 20 },
    { enabled: open, staleTime: 10000 }
  );

  const actionLabel: Record<string, string> = {
    assign_plan: "指派方案",
    remove_plan: "移除方案",
    add_module: "加模塊",
    remove_module: "移模塊",
    redeem: "兌換碼",
  };

  return (
    <div className="flex-1">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
      >
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        訂閱記錄
      </button>
      {open && (
        <div className="mt-2 bg-slate-800/60 rounded-xl border border-slate-700/40 overflow-hidden">
          {isLoading ? (
            <div className="px-3 py-2 space-y-1.5">{[...Array(2)].map((_,i) => <div key={i} className="h-4 bg-slate-700/40 rounded animate-pulse" />)}</div>
          ) : !logs || logs.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-500">尚無訂閱記錄</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700/40">
                  <th className="px-3 py-1.5 text-left text-slate-500 font-normal">時間</th>
                  <th className="px-3 py-1.5 text-left text-slate-500 font-normal">動作</th>
                  <th className="px-3 py-1.5 text-left text-slate-500 font-normal">詳情</th>
                  <th className="px-3 py-1.5 text-left text-slate-500 font-normal">備注</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-700/20 last:border-0">
                    <td className="px-3 py-1.5 text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-3 py-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 text-[10px]">
                        {actionLabel[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-slate-300 max-w-[120px] truncate">
                      {log.details ? JSON.stringify(log.details).slice(0, 40) : "-"}
                    </td>
                    <td className="px-3 py-1.5 text-slate-500 max-w-[100px] truncate">
                      {(log.details as { note?: string } | null)?.note ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

interface SubscriptionModalProps {
  user: { id: number; name: string | null; planId: string | null; planExpiresAt: Date | null };
  onClose: () => void;
  onSuccess: () => void;
}

function SubscriptionModal({ user, onClose, onSuccess }: SubscriptionModalProps) {
  const [planId, setPlanId] = useState<string>(user.planId ?? "basic");
  const [expiresAt, setExpiresAt] = useState<string>(
    user.planExpiresAt
      ? new Date(user.planExpiresAt).toISOString().slice(0, 10)
      : ""
  );
  const [note, setNote] = useState("");
  const [customModuleInput, setCustomModuleInput] = useState("");
  const [customModules, setCustomModules] = useState<Array<{ module_id: string; expires_at: string | null }>>([]);

  const { data: modules } = trpc.businessHub.listModules.useQuery();
  const { data: plansData } = trpc.businessHub.listPlans.useQuery();
  const { data: currentSub } = trpc.businessHub.getUserSubscription.useQuery({ userId: user.id });

  // 初始化 customModules（從現有訂閱載入）
  const [initialized, setInitialized] = useState(false);
  if (currentSub && !initialized) {
    const existing = (currentSub.customModules as Array<{ module_id: string; expires_at: string | null }> | null) ?? [];
    setCustomModules(existing);
    setInitialized(true);
  }

  const assignMutation = trpc.businessHub.assignSubscription.useMutation({
    onSuccess: () => {
      toast.success(`${user.name ?? "用戶"} 的訂閱方案已成功指派`);
      onSuccess();
      onClose();
    },
    onError: (err) => {
      toast.error(`更新失敗：${err.message}`);
    },
  });

  const handleAddModule = () => {
    const id = customModuleInput.trim();
    if (!id) return;
    if (customModules.find(m => m.module_id === id)) {
      toast.error("模塊已存在");
      return;
    }
    setCustomModules(prev => [...prev, { module_id: id, expires_at: null }]);
    setCustomModuleInput("");
  };

  const handleRemoveModule = (moduleId: string) => {
    setCustomModules(prev => prev.filter(m => m.module_id !== moduleId));
  };

  const handleSubmit = () => {
    assignMutation.mutate({
      userId: user.id,
      planId,
      planExpiresAt: expiresAt || null,
      customModules,
      note: note || undefined,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-200 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-amber-400">
            管理訂閱 — {user.name ?? "用戶 #" + user.id}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 方案選擇 */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">訂閱方案</label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                {(plansData ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-slate-200 focus:bg-slate-800">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 到期日 */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">到期日（留空表示永久有效）</label>
            <Input
              type="date"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
              className="bg-slate-800 border-slate-700 text-slate-200"
            />
          </div>

          {/* 自訂模塊 */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">額外模塊（不在方案內的個別授權）</label>
            <div className="flex gap-2 mb-2">
              {modules && modules.length > 0 ? (
                <Select value={customModuleInput} onValueChange={setCustomModuleInput}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200 flex-1">
                    <SelectValue placeholder="選擇模塊..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    {modules.map(m => (
                      <SelectItem key={m.id} value={m.id} className="text-slate-200 focus:bg-slate-800">
                        {m.icon} {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="輸入模塊 ID..."
                  value={customModuleInput}
                  onChange={e => setCustomModuleInput(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-slate-200 flex-1"
                />
              )}
              <Button
                size="sm"
                onClick={handleAddModule}
                className="bg-amber-600 hover:bg-amber-700 text-black shrink-0"
              >
                新增
              </Button>
            </div>
            {customModules.length > 0 ? (
              <div className="space-y-1">
                {customModules.map(m => (
                  <div key={m.module_id} className="flex items-center justify-between bg-slate-800/60 rounded px-3 py-1.5 text-xs">
                    <span className="text-slate-300 font-mono">{m.module_id}</span>
                    <button
                      onClick={() => handleRemoveModule(m.module_id)}
                      className="text-red-400 hover:text-red-300 ml-2"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-600 italic">無額外模塊授權</div>
            )}
          </div>

          {/* 備注 */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">操作備注（選填，記入審計日誌）</label>
            <Input
              placeholder="例：年度合作夥伴優惠..."
              value={note}
              onChange={e => setNote(e.target.value)}
              className="bg-slate-800 border-slate-700 text-slate-200"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-slate-700 text-slate-300 bg-transparent hover:bg-slate-800">
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={assignMutation.isPending}
            className="bg-amber-600 hover:bg-amber-700 text-black font-semibold"
          >
            {assignMutation.isPending ? "更新中..." : "確認更新"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── 積分調整 Modal ─────────────────────────────────────────────────────────
function PointsAdjustModal({
  user,
  onClose,
  onSuccess,
}: {
  user: { id: number; name: string | null; balance: number };
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [mode, setMode] = useState<'add' | 'subtract' | 'set'>('add');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const adjustMutation = trpc.dashboard.adminAdjustPoints.useMutation({
    onSuccess: (data) => {
      toast.success(`積分已更新，新餘額：${data.newBalance} 點`);
      onSuccess();
    },
    onError: (err) => toast.error(`調整失敗：${err.message}`),
  });

  const modeLabels = { add: '贈送積分', subtract: '扣除積分', set: '直接設定' };
  const modeColors = { add: 'bg-green-600 hover:bg-green-700', subtract: 'bg-red-600 hover:bg-red-700', set: 'bg-blue-600 hover:bg-blue-700' };

  const handleSubmit = () => {
    const amt = parseInt(amount);
    if (isNaN(amt) || amt < 0) { toast.error('請輸入有效數字'); return; }
    adjustMutation.mutate({ userId: user.id, mode, amount: amt, reason: reason || undefined });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-200 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-amber-400">💰 調整積分 — {user.name ?? '用戶 #' + user.id}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-slate-800/60 rounded-xl px-4 py-3 text-center">
            <div className="text-xs text-slate-400 mb-1">目前積分餘額</div>
            <div className="text-2xl font-bold text-amber-400">{user.balance.toLocaleString()} 點</div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">操作類型</label>
            <div className="flex gap-2">
              {(['add', 'subtract', 'set'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    mode === m ? (m === 'add' ? 'bg-green-600 text-white' : m === 'subtract' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white') : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {modeLabels[m]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">
              {mode === 'add' ? '贈送點數' : mode === 'subtract' ? '扣除點數' : '設定為'}
            </label>
            <Input
              type="number"
              min="0"
              placeholder="輸入數量..."
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="bg-slate-800 border-slate-700 text-slate-200"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">原因備注（選填）</label>
            <Input
              placeholder="例：活動獎勵、補償..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="bg-slate-800 border-slate-700 text-slate-200"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-slate-700 text-slate-300 bg-transparent hover:bg-slate-800">取消</Button>
          <Button
            onClick={handleSubmit}
            disabled={adjustMutation.isPending || !amount}
            className={`${modeColors[mode]} text-white font-semibold`}
          >
            {adjustMutation.isPending ? '處理中...' : '確認'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/// ─── 遊戲幣贈送 Modal ──────────────────────────────────────────────────────────
function CoinsGrantModal({
  user,
  onClose,
  onSuccess,
}: {
  user: { id: number; name: string | null; gameCoins: number };
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [mode, setMode] = useState<'add' | 'subtract'>('add');
  const grantMutation = trpc.dashboard.adminAdjustCoins.useMutation({
    onSuccess: (data) => {
      toast.success(mode === 'add'
        ? `🎮 遊戲幣已贈送！新餘額：${data.newCoins} 枚`
        : `🎮 遊戲幣已扣除！新餘額：${data.newCoins} 枚`);
      onSuccess();
    },
    onError: (err) => toast.error(`操作失敗：${err.message}`),
  });
  const parsedAmount = parseInt(amount) || 0;
  const previewBalance = mode === 'add'
    ? user.gameCoins + parsedAmount
    : Math.max(0, user.gameCoins - parsedAmount);
  const handleSubmit = () => {
    const amt = parseInt(amount);
    if (isNaN(amt) || amt <= 0) { toast.error('請輸入有效正整數'); return; }
    grantMutation.mutate({ userId: user.id, mode, amount: amt, reason: reason || undefined });
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-200 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-purple-400">🎮 調整遊戲幣 — {user.name ?? '用戶 #' + user.id}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-slate-800/60 rounded-xl px-4 py-3 text-center">
            <div className="text-xs text-slate-400 mb-1">目前遊戲幣餘額</div>
            <div className="text-2xl font-bold text-purple-400">{user.gameCoins.toLocaleString()} 枚</div>
          </div>
          {/* 模式切換 */}
          <div className="flex gap-2">
            <button
              onClick={() => setMode('add')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === 'add'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
              }`}
            >
              ➕ 贈送
            </button>
            <button
              onClick={() => setMode('subtract')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === 'subtract'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
              }`}
            >
              ➖ 扣除
            </button>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">{mode === 'add' ? '贈送' : '扣除'}數量</label>
            <Input
              type="number"
              min="1"
              placeholder={`輸入${mode === 'add' ? '贈送' : '扣除'}數量...`}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="bg-slate-800 border-slate-700 text-slate-200"
            />
          </div>
          {parsedAmount > 0 && (
            <div className="bg-slate-800/40 rounded-lg px-3 py-2 flex items-center justify-between">
              <span className="text-xs text-slate-400">預計新餘額</span>
              <span className={`text-sm font-bold ${mode === 'add' ? 'text-emerald-400' : 'text-red-400'}`}>
                {previewBalance.toLocaleString()} 枚
                <span className="text-xs ml-1 opacity-60">({mode === 'add' ? '+' : '-'}{parsedAmount.toLocaleString()})</span>
              </span>
            </div>
          )}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">原因備注（選填）</label>
            <Input
              placeholder="例：活動獎勵、補償、違規扣除..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="bg-slate-800 border-slate-700 text-slate-200"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-slate-700 text-slate-300 bg-transparent hover:bg-slate-800">取消</Button>
          <Button
            onClick={handleSubmit}
            disabled={grantMutation.isPending || !amount}
            className={mode === 'add'
              ? 'bg-purple-600 hover:bg-purple-700 text-white font-semibold'
              : 'bg-red-600 hover:bg-red-700 text-white font-semibold'
            }
          >
            {grantMutation.isPending ? '處理中...' : mode === 'add' ? '確認贈送' : '確認扣除'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
/// ─── 批量重算生命靈數按鈕 ────────────────────────────────────────────────────
function RecalcLifePathButton() {
  const utils = trpc.useUtils();
  const recalcMutation = trpc.dashboard.batchRecalcLifePathNumbers.useMutation({
    onSuccess: (data) => {
      toast.success(`靈數補全完成：更新 ${data.updated} 人，跳過 ${data.skipped} 人`);
      utils.dashboard.listUsersFiltered.invalidate();
    },
    onError: (err) => toast.error(`補全失敗：${err.message}`),
  });
  return (
    <Button
      size="sm"
      variant="outline"
      className="border-amber-500/50 text-amber-400 hover:bg-amber-900/30 shrink-0"
      onClick={() => recalcMutation.mutate({ onlyMissing: true })}
      disabled={recalcMutation.isPending}
    >
      {recalcMutation.isPending ? '計算中…' : '🔢 補全生命靈數'}
    </Button>
  );
}

// ─── 主頁面 ─────────────────────────────────────────────────────────────────
export default function AdminUsers() {
  const { readOnly } = useAdminRole();
  const [, navigate] = useLocation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchName, setSearchName] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [lifePathFilter, setLifePathFilter] = useState("all");
  const [lastActiveFilter, setLastActiveFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  // 動態載入方案列表
  const { data: plansData } = trpc.businessHub.listPlans.useQuery();
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [subscriptionModalUser, setSubscriptionModalUser] = useState<{
    id: number;
    name: string | null;
    planId: string | null;
    planExpiresAt: Date | null;
  } | null>(null);
  const [pointsModalUser, setPointsModalUser] = useState<{
    id: number;
    name: string | null;
    balance: number;
  } | null>(null);
  const [coinsModalUser, setCoinsModalUser] = useState<{
    id: number;
    name: string | null;
    gameCoins: number;
  } | null>(null);
  // 提升/撤銷命理師
  const [promoteExpertModal, setPromoteExpertModal] = useState<{ id: number; name: string | null } | null>(null);
  const [promotePublicName, setPromotePublicName] = useState("");
  const [revokeConfirmUser, setRevokeConfirmUser] = useState<{ id: number; name: string | null } | null>(null);
  const utils = trpc.useUtils();
  const grantExpertMutation = trpc.expert.adminGrantExpertRole.useMutation({
    onSuccess: () => {
      toast.success("已成功提升為命理師！");
      setPromoteExpertModal(null);
      setPromotePublicName("");
      refetch();
      utils.expert.adminListExperts.invalidate();
    },
    onError: (e) => toast.error(`提升失敗：${e.message}`),
  });
  const revokeExpertMutation = trpc.expert.adminRevokeExpertRole.useMutation({
    onSuccess: () => {
      toast.success("已撤销命理師資格");
      setRevokeConfirmUser(null);
      refetch();
      utils.expert.adminListExperts.invalidate();
    },
    onError: (e) => toast.error(`撤销失敗：${e.message}`),
  });

  // 角色切換
  const setRoleMutation = trpc.account.setUserRole.useMutation({
    onSuccess: (res) => {
      const roleLabel: Record<string, string> = { admin: '管理員', viewer: '唯讀觀察員', user: '一般用戶' };
      toast.success(`角色已變更為「${roleLabel[res.newRole] ?? res.newRole}」`);
      refetch();
    },
    onError: (e) => toast.error(`角色變更失敗：${e.message}`),
  });

  // 批量選取
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchPlanId, setBatchPlanId] = useState("basic");
  const [batchExpiresAt, setBatchExpiresAt] = useState("");
  const [batchNote, setBatchNote] = useState("");
  const batchAssign = trpc.businessHub.batchAssignSubscription.useMutation({
    onSuccess: (res) => {
      toast.success(`已成功指派 ${res.count} 位用戶的訂閱方案`);
      setBatchModalOpen(false);
      setSelectedUserIds(new Set());
      refetch();
    },
    onError: (err) => toast.error(`批量指派失敗：${err.message}`),
  });
  const toggleSelect = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Debounce search
  const handleSearchChange = useCallback((val: string) => {
    setSearchName(val);
    clearTimeout((handleSearchChange as unknown as { _t?: ReturnType<typeof setTimeout> })._t);
    const t = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 400);
    (handleSearchChange as unknown as { _t?: ReturnType<typeof setTimeout> })._t = t;
  }, []);

  const { data, isLoading, refetch } = trpc.dashboard.listUsersFiltered.useQuery(
    {
      page,
      pageSize,
      planId: planFilter === "all" ? undefined : planFilter,
      lifePathNumber: lifePathFilter === "all" ? undefined : Number(lifePathFilter),
      lastActiveFilter: lastActiveFilter === "all" ? undefined : lastActiveFilter as "7d" | "30d" | "90d" | "inactive90d",
      searchName: debouncedSearch || undefined,
      roleFilter: roleFilter === "all" ? undefined : roleFilter as "user" | "expert" | "admin",
    },
    {}
  );

  const users = data?.users ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  const handleFilterChange = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* 標題 */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-amber-400 mb-1">用戶管理</h1>
            <p className="text-slate-400 text-sm">查看所有用戶、篩選方案與活躍狀態、管理訂閱權益</p>
          </div>
          <div className="flex gap-2 items-center">
            {/* Bug 4 fix: 返回遊戲世界按鈕 */}
            <button
              onClick={() => navigate("/game")}
              className="text-xs bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-400 px-3 py-1.5 rounded-lg transition-colors shrink-0">
              🌏 返回遊戲
            </button>
            <RecalcLifePathButton />
          </div>
        </div>

        {/* 批量操作工具列 */}
        {selectedUserIds.size > 0 && (
          <div className="flex items-center gap-3 mb-4 bg-amber-900/30 border border-amber-500/40 rounded-xl px-4 py-2.5">
            <span className="text-amber-300 text-sm font-medium">已選 {selectedUserIds.size} 位用戶</span>
            <Button
              size="sm"
              onClick={() => setBatchModalOpen(true)}
              disabled={readOnly}
              title={readOnly ? "唯讀模式，無法操作" : undefined}
              className="bg-amber-600 hover:bg-amber-700 text-black text-xs h-7 px-3 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              批量指派訂閱
            </Button>
            <button
              onClick={() => setSelectedUserIds(new Set())}
              className="text-xs text-slate-400 hover:text-slate-200 ml-auto"
            >
              取消選取
            </button>
          </div>
        )}
        {/* 笛選器 */}
        <div className="bg-slate-800/50 rounded-xl p-4 mb-5 border border-slate-700/50">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <Input
              placeholder="搜尋名稱..."
              value={searchName}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="bg-slate-900/60 border-slate-700 text-slate-200 placeholder:text-slate-500 text-sm"
            />
            <Select value={planFilter} onValueChange={handleFilterChange(setPlanFilter)}>
              <SelectTrigger className="bg-slate-900/60 border-slate-700 text-slate-200 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                <SelectItem value="all" className="text-slate-200 focus:bg-slate-800">全部方案</SelectItem>
                {(plansData ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-slate-200 focus:bg-slate-800">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={lifePathFilter} onValueChange={handleFilterChange(setLifePathFilter)}>
              <SelectTrigger className="bg-slate-900/60 border-slate-700 text-slate-200 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                {LIFE_PATH_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-slate-200 focus:bg-slate-800">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={lastActiveFilter} onValueChange={handleFilterChange(setLastActiveFilter)}>
              <SelectTrigger className="bg-slate-900/60 border-slate-700 text-slate-200 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                {LAST_ACTIVE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-slate-200 focus:bg-slate-800">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={handleFilterChange(setRoleFilter)}>
              <SelectTrigger className="bg-slate-900/60 border-slate-700 text-slate-200 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                <SelectItem value="all" className="text-slate-200 focus:bg-slate-800">全部角色</SelectItem>
                <SelectItem value="user" className="text-slate-200 focus:bg-slate-800">一般用戶</SelectItem>
                <SelectItem value="expert" className="text-slate-200 focus:bg-slate-800">⭐ 命理師</SelectItem>
                <SelectItem value="admin" className="text-slate-200 focus:bg-slate-800">🛡️ 管理員</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* 全選此頁 */}
              <div
                className="flex items-center gap-1.5 cursor-pointer group"
                onClick={() => {
                  const allIds = users.map(u => u.id);
                  const allSelected = allIds.every(id => selectedUserIds.has(id));
                  setSelectedUserIds(prev => {
                    const next = new Set(prev);
                    if (allSelected) {
                      allIds.forEach(id => next.delete(id));
                    } else {
                      allIds.forEach(id => next.add(id));
                    }
                    return next;
                  });
                }}
              >
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                  users.length > 0 && users.every(u => selectedUserIds.has(u.id))
                    ? "bg-amber-500 border-amber-500"
                    : users.some(u => selectedUserIds.has(u.id))
                    ? "bg-amber-500/40 border-amber-400"
                    : "border-slate-500 group-hover:border-amber-400"
                }`}>
                  {users.length > 0 && users.every(u => selectedUserIds.has(u.id)) && (
                    <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {users.some(u => selectedUserIds.has(u.id)) && !users.every(u => selectedUserIds.has(u.id)) && (
                    <div className="w-2 h-0.5 bg-amber-400" />
                  )}
                </div>
                <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors">全選此頁</span>
              </div>
              <div className="text-xs text-slate-500">
                共 <span className="text-amber-400 font-medium">{total}</span> 位用戶符合篩選條件
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">每頁顯示</span>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="bg-slate-900/60 border-slate-700 text-slate-200 text-xs h-7 w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  {PAGE_SIZE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)} className="text-slate-200 focus:bg-slate-800 text-xs">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* 用戶列表 */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-800/40 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <div className="text-4xl mb-3">🔍</div>
            <div>沒有符合條件的用戶</div>
          </div>
        ) : (
          <div className="space-y-2">
            {users.map((u) => {
              const dynamicPlan = (plansData ?? []).find(p => p.id === (u.planId ?? 'basic'));
              const planInfo = PLAN_LABELS[u.planId ?? "basic"] ?? { label: dynamicPlan?.name ?? u.planId ?? 'basic', color: 'bg-slate-600 text-slate-200' };
              const isExpanded = expandedUserId === u.id;
              return (
                <div
                  key={u.id}
                  className="bg-slate-800/60 rounded-xl border border-slate-700/50 overflow-hidden"
                >
                  {/* 列表行 */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-700/40 transition-colors"
                    onClick={() => setExpandedUserId(isExpanded ? null : u.id)}
                  >
                    {/* Checkbox */}
                    <div
                      className="shrink-0"
                      onClick={(e) => toggleSelect(u.id, e)}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                        selectedUserIds.has(u.id)
                          ? "bg-amber-500 border-amber-500"
                          : "border-slate-500 hover:border-amber-400"
                      }`}>
                        {selectedUserIds.has(u.id) && (
                          <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                    {/* 頭像 */}
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-sm font-bold text-black shrink-0">
                      {(u.name ?? "?")[0].toUpperCase()}
                    </div>

                    {/* 名稱 + 方案 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-200 truncate">
                          {u.name ?? "未知用戶"}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${planInfo.color}`}>
                          {planInfo.label}
                        </span>
                        {u.profile?.lifePathNumber && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-600/60 text-indigo-200">
                            靈數 {u.profile.lifePathNumber}
                          </span>
                        )}
                        {u.role === "expert" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/25 text-amber-300 font-medium flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5" /> 命理師
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">
                        {u.email ?? "—"}
                      </div>
                    </div>

                    {/* 積分 */}
                    <div className="text-right shrink-0 hidden sm:block">
                      <div className="text-sm font-semibold text-amber-400">
                        {(u.pointsBalance ?? 0).toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-500">積分</div>
                    </div>

                    {/* 最後上線 */}
                    <div className="text-right shrink-0 w-24">
                      <div className="text-xs font-medium text-slate-200">
                        {formatRelative(u.lastSignedIn)}
                      </div>
                      <div className="text-[10px] text-slate-400">最後上線</div>
                    </div>

                    {/* 展開箭頭 */}
                    <span className={`text-slate-500 text-xs transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}>
                      ›
                    </span>
                  </div>

                  {/* 展開詳情 */}
                  {isExpanded && (
                    <div className="border-t border-slate-700/50 bg-slate-900/40 px-4 py-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
                        <div>
                          <div className="text-slate-500 mb-0.5">用戶 ID</div>
                          <div className="text-slate-300 font-mono">#{u.id}</div>
                        </div>
                        <div>
                          <div className="text-slate-500 mb-0.5">方案</div>
                          <div className={`font-medium ${
                            u.planId === 'professional' ? 'text-purple-400' :
                            u.planId === 'advanced' ? 'text-orange-400' : 'text-slate-300'
                          }`}>
                            {(plansData ?? []).find(p => p.id === (u.planId ?? 'basic'))?.name ?? (u.planId ?? 'basic')}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-500 mb-0.5">積分餘額</div>
                          <div className="text-amber-400 font-semibold">
                            {(u.pointsBalance ?? 0).toLocaleString()} 分
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-500 mb-0.5">遊戲幣</div>
                          <div className="text-purple-400 font-semibold">
                            {(u.gameCoins ?? 0).toLocaleString()} 枚
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-500 mb-0.5">方案到期</div>
                          <div className="text-slate-300">
                            {u.planExpiresAt ? formatDate(u.planExpiresAt) : "無到期日"}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-500 mb-0.5">加入日期</div>
                          <div className="text-slate-300">{formatDate(u.createdAt)}</div>
                        </div>
                        <div>
                          <div className="text-slate-500 mb-0.5">最後上線</div>
                          <div className="text-slate-300">{formatDate(u.lastSignedIn, true)}</div>
                        </div>
                        <div>
                          <div className="text-slate-500 mb-0.5">生命靈數</div>
                          <div className="text-slate-300">
                            {u.profile?.lifePathNumber ? `靈數 ${u.profile.lifePathNumber}` : "未計算"}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-500 mb-0.5">角色</div>
                          {/* 角色切換下拉選單（僅主帳號可操作） */}
                          {u.role === "expert" ? (
                            <span className="text-amber-300 font-medium">⭐ 命理師</span>
                          ) : (
                            <Select
                              value={u.role ?? "user"}
                              disabled={readOnly || setRoleMutation.isPending}
                              onValueChange={(newRole) => {
                                setRoleMutation.mutate({ userId: u.id, role: newRole as "admin" | "viewer" | "user" });
                              }}
                            >
                              <SelectTrigger
                                className="h-7 text-xs w-32 bg-slate-800 border-slate-600"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-900 border-slate-700">
                                <SelectItem value="admin" className="text-amber-400 focus:bg-slate-800">👑 管理員</SelectItem>
                                <SelectItem value="viewer" className="text-blue-300 focus:bg-slate-800">👁️ 唯讀觀察員</SelectItem>
                                <SelectItem value="user" className="text-slate-300 focus:bg-slate-800">👤 一般用戶</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>
                      {/* 操作列 */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <SubscriptionLogsPanel userId={u.id} />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={readOnly}
                            title={readOnly ? "唯讀模式" : undefined}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPointsModalUser({ id: u.id, name: u.name ?? null, balance: Number(u.pointsBalance ?? 0) });
                            }}
                            className="border-amber-600/50 text-amber-400 hover:bg-amber-600/20 bg-transparent text-xs font-semibold shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            💰 調整積分
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={readOnly}
                            title={readOnly ? "唯讀模式" : undefined}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCoinsModalUser({ id: u.id, name: u.name ?? null, gameCoins: Number(u.gameCoins ?? 0) });
                            }}
                            className="border-purple-600/50 text-purple-400 hover:bg-purple-600/20 bg-transparent text-xs font-semibold shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            🎮 贈送遊戲幣
                          </Button>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSubscriptionModalUser({
                                id: u.id,
                                name: u.name ?? null,
                                planId: u.planId ?? null,
                                planExpiresAt: u.planExpiresAt ? new Date(u.planExpiresAt) : null,
                              });
                            }}
                            disabled={readOnly}
                            title={readOnly ? "唯讀模式" : undefined}
                            className="bg-amber-600/80 hover:bg-amber-600 text-black text-xs font-semibold shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            🎫 管理訂閱
                          </Button>
                          {u.role === "user" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPromotePublicName(u.name ?? "");
                                setPromoteExpertModal({ id: u.id, name: u.name ?? null });
                              }}
                              disabled={readOnly}
                              title={readOnly ? "唯讀模式" : undefined}
                              className="border-yellow-600/50 text-yellow-400 hover:bg-yellow-600/20 bg-transparent text-xs font-semibold shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              ⭐ 提升命理師
                            </Button>
                          )}
                          {u.role === "expert" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRevokeConfirmUser({ id: u.id, name: u.name ?? null });
                              }}
                              disabled={readOnly}
                              title={readOnly ? "唯讀模式" : undefined}
                              className="border-red-600/50 text-red-400 hover:bg-red-600/20 bg-transparent text-xs font-semibold shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              ✕ 撤銷命理師
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 分頁 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 bg-transparent"
            >
              ← 上一頁
            </Button>
            <span className="text-sm text-slate-400 px-2">
              第 <span className="text-amber-400 font-medium">{page}</span> / {totalPages} 頁
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 bg-transparent"
            >
              下一頁 →
            </Button>
          </div>
        )}
      </div>

      {/* 訂閱管理 Modal */}
      {subscriptionModalUser && (
        <SubscriptionModal
          user={subscriptionModalUser}
          onClose={() => setSubscriptionModalUser(null)}
          onSuccess={() => refetch()}
        />
      )}
      {/* 積分調整 Modal */}
      {pointsModalUser && (
        <PointsAdjustModal
          user={pointsModalUser}
          onClose={() => setPointsModalUser(null)}
          onSuccess={() => { refetch(); setPointsModalUser(null); }}
        />
      )}
      {coinsModalUser && (
        <CoinsGrantModal
          user={coinsModalUser}
          onClose={() => setCoinsModalUser(null)}
          onSuccess={() => { refetch(); setCoinsModalUser(null); }}
        />
      )}
      {/* 提升命理師 Modal */}
      <Dialog open={!!promoteExpertModal} onOpenChange={(open) => { if (!open) { setPromoteExpertModal(null); setPromotePublicName(""); } }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-200 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-amber-400">⭐ 提升為命理師</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-400">
              將 <span className="text-slate-200 font-medium">{promoteExpertModal?.name ?? "用戶 #" + promoteExpertModal?.id}</span> 提升為命理師角色，將可以登入專家後台建立個人品牌與提供服務。
            </p>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">公開名稱（展示在專家列表）</label>
              <Input
                value={promotePublicName}
                onChange={(e) => setPromotePublicName(e.target.value)}
                placeholder="輸入命理師公開名稱..."
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setPromoteExpertModal(null); setPromotePublicName(""); }} className="border-slate-700 text-slate-300 bg-transparent hover:bg-slate-800">取消</Button>
            <Button
              onClick={() => {
                if (!promoteExpertModal || !promotePublicName.trim()) {
                  toast.error("請輸入公開名稱");
                  return;
                }
                grantExpertMutation.mutate({ userId: promoteExpertModal.id, publicName: promotePublicName.trim() });
              }}
              disabled={grantExpertMutation.isPending || !promotePublicName.trim()}
              className="bg-amber-600 hover:bg-amber-700 text-black font-semibold"
            >
              {grantExpertMutation.isPending ? "處理中..." : "確認提升"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 撤銷命理師確認 Dialog */}
      <Dialog open={!!revokeConfirmUser} onOpenChange={(open) => { if (!open) setRevokeConfirmUser(null); }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-200 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400">撤銷命理師資格</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-slate-400">
              確定要撤銷 <span className="text-slate-200 font-medium">{revokeConfirmUser?.name ?? "用戶 #" + revokeConfirmUser?.id}</span> 的命理師資格？撤銷後該用戶將回归一般用戶，專家後台將無法登入。
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRevokeConfirmUser(null)} className="border-slate-700 text-slate-300 bg-transparent hover:bg-slate-800">取消</Button>
            <Button
              onClick={() => revokeConfirmUser && revokeExpertMutation.mutate({ userId: revokeConfirmUser.id })}
              disabled={revokeExpertMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {revokeExpertMutation.isPending ? "處理中..." : "確認撤銷"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量訂閱 Modal */}
      <Dialog open={batchModalOpen} onOpenChange={setBatchModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-200 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-400">批量指派訂閱 — {selectedUserIds.size} 位用戶</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">訂閱方案</label>
              <Select value={batchPlanId} onValueChange={setBatchPlanId}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  {(plansData ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-slate-200 focus:bg-slate-800">{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">到期日（留空表示永久有效）</label>
              <Input type="date" value={batchExpiresAt} onChange={e => setBatchExpiresAt(e.target.value)} className="bg-slate-800 border-slate-700 text-slate-200" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">操作備注（選填）</label>
              <Input placeholder="例：批量年度會員優惠..." value={batchNote} onChange={e => setBatchNote(e.target.value)} className="bg-slate-800 border-slate-700 text-slate-200" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBatchModalOpen(false)} className="border-slate-700 text-slate-300 bg-transparent hover:bg-slate-800">取消</Button>
            <Button
              onClick={() => batchAssign.mutate({ userIds: Array.from(selectedUserIds), planId: batchPlanId, planExpiresAt: batchExpiresAt || null, note: batchNote || undefined })}
              disabled={batchAssign.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-black font-semibold"
            >
              {batchAssign.isPending ? "指派中..." : `確認指派 ${selectedUserIds.size} 位`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
