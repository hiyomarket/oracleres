/**
 * AdminUsers.tsx
 * 管理後台 — 用戶管理頁面 (/admin/users)
 * 職責：查看所有用戶、篩選方案/生命靈數/活躍時間、管理訂閱
 */
import { useState, useCallback } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
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
import { ChevronDown } from "lucide-react";

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

const PLAN_OPTIONS = [
  { value: "all",          label: "全部方案" },
  { value: "basic",        label: "基礎方案" },
  { value: "advanced",     label: "進階方案" },
  { value: "professional", label: "專業方案" },
];

const PLAN_SELECT_OPTIONS = [
  { value: "basic",        label: "基礎方案" },
  { value: "advanced",     label: "進階方案" },
  { value: "professional", label: "專業方案" },
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
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "今天";
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
            <div className="px-3 py-2 text-xs text-slate-500">載入中...</div>
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
                {PLAN_SELECT_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value} className="text-slate-200 focus:bg-slate-800">
                    {o.label}
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

// ─── 主頁面 ─────────────────────────────────────────────────────────────────

export default function AdminUsers() {
  const [page, setPage] = useState(1);
  const [searchName, setSearchName] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [lifePathFilter, setLifePathFilter] = useState("all");
  const [lastActiveFilter, setLastActiveFilter] = useState("all");
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [subscriptionModalUser, setSubscriptionModalUser] = useState<{
    id: number;
    name: string | null;
    planId: string | null;
    planExpiresAt: Date | null;
  } | null>(null);
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
      pageSize: 15,
      planId: planFilter === "all" ? undefined : planFilter as "basic" | "advanced" | "professional",
      lifePathNumber: lifePathFilter === "all" ? undefined : Number(lifePathFilter),
      lastActiveFilter: lastActiveFilter === "all" ? undefined : lastActiveFilter as "7d" | "30d" | "90d" | "inactive90d",
      searchName: debouncedSearch || undefined,
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
        <div className="mb-6">
          <h1 className="text-xl font-bold text-amber-400 mb-1">用戶管理</h1>
          <p className="text-slate-400 text-sm">查看所有用戶、篩選方案與活躍狀態、管理訂閱權益</p>
        </div>

        {/* 批量操作工具列 */}
        {selectedUserIds.size > 0 && (
          <div className="flex items-center gap-3 mb-4 bg-amber-900/30 border border-amber-500/40 rounded-xl px-4 py-2.5">
            <span className="text-amber-300 text-sm font-medium">已選 {selectedUserIds.size} 位用戶</span>
            <Button
              size="sm"
              onClick={() => setBatchModalOpen(true)}
              className="bg-amber-600 hover:bg-amber-700 text-black text-xs h-7 px-3"
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                {PLAN_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-slate-200 focus:bg-slate-800">
                    {o.label}
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
          </div>
          <div className="mt-2 text-xs text-slate-500">
            共 <span className="text-amber-400 font-medium">{total}</span> 位用戶符合篩選條件
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
              const planInfo = PLAN_LABELS[u.planId ?? "basic"] ?? PLAN_LABELS.basic;
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
                    <div className="text-right shrink-0 hidden md:block w-20">
                      <div className="text-xs text-slate-400">
                        {formatRelative(u.lastSignedIn)}
                      </div>
                      <div className="text-[10px] text-slate-600">最後上線</div>
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
                          <div className="text-slate-500 mb-0.5">已啟用</div>
                          <div className="text-slate-300">{u.isActivated ? "✅ 已啟用" : "❌ 未啟用"}</div>
                        </div>
                        <div>
                          <div className="text-slate-500 mb-0.5">積分餘額</div>
                          <div className="text-amber-400 font-semibold">
                            {(u.pointsBalance ?? 0).toLocaleString()} 分
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
                          <div className={u.role === "admin" ? "text-amber-400 font-medium" : "text-slate-300"}>
                            {u.role === "admin" ? "管理員" : "一般用戶"}
                          </div>
                        </div>
                      </div>
                      {/* 操作列 */}
                      <div className="flex items-center justify-between gap-2">
                        <SubscriptionLogsPanel userId={u.id} />
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
                          className="bg-amber-600/80 hover:bg-amber-600 text-black text-xs font-semibold shrink-0"
                        >
                          🎫 管理訂閱
                        </Button>
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
                  {PLAN_SELECT_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-slate-200 focus:bg-slate-800">{o.label}</SelectItem>
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
