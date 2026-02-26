/**
 * AdminUserGroups.tsx
 * 管理後台 — 客群分組管理 (/admin/user-groups)
 * 功能：建立/管理分組、新增/移除成員、批量調整方案與積分
 */
import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ChevronDown, Plus, Trash2, Users, Settings, UserMinus } from "lucide-react";

const GROUP_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  amber:  { bg: "bg-amber-500/15",  border: "border-amber-500/40",  text: "text-amber-400" },
  purple: { bg: "bg-purple-500/15", border: "border-purple-500/40", text: "text-purple-400" },
  blue:   { bg: "bg-blue-500/15",   border: "border-blue-500/40",   text: "text-blue-400" },
  green:  { bg: "bg-green-500/15",  border: "border-green-500/40",  text: "text-green-400" },
  red:    { bg: "bg-red-500/15",    border: "border-red-500/40",    text: "text-red-400" },
  pink:   { bg: "bg-pink-500/15",   border: "border-pink-500/40",   text: "text-pink-400" },
  slate:  { bg: "bg-slate-500/15",  border: "border-slate-500/40",  text: "text-slate-400" },
};

const COLOR_OPTIONS = Object.keys(GROUP_COLORS);
const ICON_OPTIONS = ["👥", "👨‍👩‍👧‍👦", "⭐", "🌙", "🔮", "💎", "🎯", "🌟", "🏆", "💫", "🌸", "🦋"];

function formatRelative(dateStr: string | Date | null | undefined) {
  if (!dateStr) return "從未";
  const diff = Date.now() - new Date(dateStr).getTime();
  const absDiff = Math.abs(diff);
  const days = Math.floor(absDiff / 86400000);
  const hours = Math.floor(absDiff / 3600000);
  if (hours < 1) return "剛剛";
  if (hours < 24) return `${hours} 小時前`;
  if (days === 1) return "昨天";
  if (days < 7) return `${days} 天前`;
  if (days < 30) return `${Math.floor(days / 7)} 週前`;
  return `${Math.floor(days / 30)} 個月前`;
}

// ─── 建立/編輯分組 Modal ──────────────────────────────────────────────────────
interface GroupFormModalProps {
  group?: { id: number; name: string; description?: string | null; color?: string | null; icon?: string | null };
  onClose: () => void;
  onSuccess: () => void;
}
function GroupFormModal({ group, onClose, onSuccess }: GroupFormModalProps) {
  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const [color, setColor] = useState(group?.color ?? "amber");
  const [icon, setIcon] = useState(group?.icon ?? "👥");

  const createMutation = trpc.userGroups.createGroup.useMutation({
    onSuccess: () => { toast.success("分組建立成功"); onSuccess(); onClose(); },
    onError: (e) => toast.error(`建立失敗：${e.message}`),
  });
  const updateMutation = trpc.userGroups.updateGroup.useMutation({
    onSuccess: () => { toast.success("分組更新成功"); onSuccess(); onClose(); },
    onError: (e) => toast.error(`更新失敗：${e.message}`),
  });

  const handleSubmit = () => {
    if (!name.trim()) { toast.error("請輸入分組名稱"); return; }
    if (group) {
      updateMutation.mutate({ groupId: group.id, name: name.trim(), description: description || undefined, color, icon });
    } else {
      createMutation.mutate({ name: name.trim(), description: description || undefined, color, icon });
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-200 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-amber-400">{group ? "編輯分組" : "建立新分組"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">分組名稱 *</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="例：家人群組、靈數1群組..." className="bg-slate-800 border-slate-700 text-slate-200" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">描述（選填）</label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="分組用途說明..." className="bg-slate-800 border-slate-700 text-slate-200" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">顏色</label>
              <Select value={color} onValueChange={setColor}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  {COLOR_OPTIONS.map(c => (
                    <SelectItem key={c} value={c} className="text-slate-200 focus:bg-slate-800">
                      <span className={`inline-block w-3 h-3 rounded-full mr-2 ${GROUP_COLORS[c].bg}`} />
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">圖示</label>
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  {ICON_OPTIONS.map(ic => (
                    <SelectItem key={ic} value={ic} className="text-slate-200 focus:bg-slate-800">{ic}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* 預覽 */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${GROUP_COLORS[color]?.border ?? "border-amber-500/40"} ${GROUP_COLORS[color]?.bg ?? "bg-amber-500/15"}`}>
            <span className="text-lg">{icon}</span>
            <span className={`font-medium text-sm ${GROUP_COLORS[color]?.text ?? "text-amber-400"}`}>{name || "分組名稱預覽"}</span>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-slate-700 text-slate-300 bg-transparent hover:bg-slate-800">取消</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="bg-amber-600 hover:bg-amber-700 text-black font-semibold">
            {group ? "儲存變更" : "建立分組"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── 批量調整方案 Modal ───────────────────────────────────────────────────────
interface BatchPlanModalProps {
  groupId: number;
  groupName: string;
  memberCount: number;
  onClose: () => void;
  onSuccess: () => void;
}
function BatchPlanModal({ groupId, groupName, memberCount, onClose, onSuccess }: BatchPlanModalProps) {
  const [planId, setPlanId] = useState("basic");
  const [expiresAt, setExpiresAt] = useState("");
  const [note, setNote] = useState("");
  const { data: plansData } = trpc.businessHub.listPlans.useQuery();
  const mutation = trpc.userGroups.batchUpdatePlan.useMutation({
    onSuccess: (res) => { toast.success(`已成功更新 ${res.count} 位成員的方案`); onSuccess(); onClose(); },
    onError: (e) => toast.error(`更新失敗：${e.message}`),
  });
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-200 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-amber-400">批量調整方案 — {groupName}（{memberCount} 位成員）</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">訂閱方案</label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                {(plansData ?? []).map(p => (
                  <SelectItem key={p.id} value={p.id} className="text-slate-200 focus:bg-slate-800">{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">到期日（留空表示永久有效）</label>
            <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="bg-slate-800 border-slate-700 text-slate-200" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">備注（選填）</label>
            <Input placeholder="例：家人年度方案..." value={note} onChange={e => setNote(e.target.value)} className="bg-slate-800 border-slate-700 text-slate-200" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-slate-700 text-slate-300 bg-transparent hover:bg-slate-800">取消</Button>
          <Button onClick={() => mutation.mutate({ groupId, planId, planExpiresAt: expiresAt || null, note: note || undefined })} disabled={mutation.isPending} className="bg-amber-600 hover:bg-amber-700 text-black font-semibold">
            {mutation.isPending ? "更新中..." : `確認更新 ${memberCount} 位`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── 批量調整積分 Modal ───────────────────────────────────────────────────────
interface BatchPointsModalProps {
  groupId: number;
  groupName: string;
  memberCount: number;
  onClose: () => void;
  onSuccess: () => void;
}
function BatchPointsModal({ groupId, groupName, memberCount, onClose, onSuccess }: BatchPointsModalProps) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const mutation = trpc.userGroups.batchAdjustPoints.useMutation({
    onSuccess: (res) => { toast.success(`已成功調整 ${res.count} 位成員的積分`); onSuccess(); onClose(); },
    onError: (e) => toast.error(`調整失敗：${e.message}`),
  });
  const parsedAmount = parseInt(amount);
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-200 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-amber-400">批量調整積分 — {groupName}（{memberCount} 位成員）</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">積分數量（正數為增加，負數為扣除）</label>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="例：100 或 -50" className="bg-slate-800 border-slate-700 text-slate-200" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">原因（選填）</label>
            <Input placeholder="例：節日贈點..." value={reason} onChange={e => setReason(e.target.value)} className="bg-slate-800 border-slate-700 text-slate-200" />
          </div>
          {!isNaN(parsedAmount) && parsedAmount !== 0 && (
            <div className={`text-xs px-3 py-2 rounded-lg ${parsedAmount > 0 ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
              將為每位成員 {parsedAmount > 0 ? "增加" : "扣除"} {Math.abs(parsedAmount)} 積分
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-slate-700 text-slate-300 bg-transparent hover:bg-slate-800">取消</Button>
          <Button onClick={() => mutation.mutate({ groupId, amount: parsedAmount, reason: reason || undefined })} disabled={mutation.isPending || isNaN(parsedAmount) || parsedAmount === 0} className="bg-amber-600 hover:bg-amber-700 text-black font-semibold">
            {mutation.isPending ? "調整中..." : `確認調整 ${memberCount} 位`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── 新增成員 Modal ───────────────────────────────────────────────────────────
interface AddMemberModalProps {
  groupId: number;
  groupName: string;
  onClose: () => void;
  onSuccess: () => void;
}
function AddMemberModal({ groupId, groupName, onClose, onSuccess }: AddMemberModalProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // 預設顯示所有用戶，搜尋時過濾
  const { data: usersData } = trpc.dashboard.listUsersFiltered.useQuery(
    { page: 1, pageSize: 50, searchName: debouncedSearch || undefined },
    { staleTime: 30000 }
  );
  const addMutation = trpc.userGroups.addMembers.useMutation({
    onSuccess: (res) => { toast.success(`已新增 ${res.added} 位成員`); onSuccess(); onClose(); },
    onError: (e) => toast.error(`新增失敗：${e.message}`),
  });

  const handleSearchChange = (val: string) => {
    setSearch(val);
    clearTimeout((handleSearchChange as unknown as { _t?: ReturnType<typeof setTimeout> })._t);
    const t = setTimeout(() => setDebouncedSearch(val), 400);
    (handleSearchChange as unknown as { _t?: ReturnType<typeof setTimeout> })._t = t;
  };

  const toggleUser = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-200 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-amber-400">新增成員到「{groupName}」</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Input
            placeholder="搜尋用戶名稱..."
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            className="bg-slate-800 border-slate-700 text-slate-200"
          />
          <div className="max-h-64 overflow-y-auto space-y-1 border border-slate-700/50 rounded-lg p-1">
            {!usersData ? (
              <div className="text-center py-4 text-slate-500 text-sm">載入中...</div>
            ) : (usersData?.users ?? []).length === 0 ? (
              <div className="text-center py-4 text-slate-500 text-sm">
                {debouncedSearch ? "找不到符合的用戶" : "目前沒有用戶"}
              </div>
            ) : (
              (usersData?.users ?? []).map(u => (
                <div
                  key={u.id}
                  onClick={() => toggleUser(u.id)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    selectedIds.has(u.id) ? "bg-amber-500/20 border border-amber-500/40" : "bg-slate-800/60 hover:bg-slate-700/60"
                  }`}
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                    selectedIds.has(u.id) ? "bg-amber-500 border-amber-500" : "border-slate-500"
                  }`}>
                    {selectedIds.has(u.id) && <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-xs font-bold text-black shrink-0">
                    {(u.name ?? "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-200 truncate">{u.name ?? "未知用戶"}</div>
                    <div className="text-xs text-slate-500 truncate">{u.email ?? "—"}</div>
                  </div>
                  <div className="text-xs text-slate-500 shrink-0">{u.planId ?? "basic"}</div>
                </div>
              ))
            )}
          </div>
          {selectedIds.size > 0 && (
            <div className="text-xs text-amber-400">已選 {selectedIds.size} 位用戶</div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-slate-700 text-slate-300 bg-transparent hover:bg-slate-800">取消</Button>
          <Button
            onClick={() => addMutation.mutate({ groupId, userIds: Array.from(selectedIds) })}
            disabled={addMutation.isPending || selectedIds.size === 0}
            className="bg-amber-600 hover:bg-amber-700 text-black font-semibold"
          >
            {addMutation.isPending ? "新增中..." : `新增 ${selectedIds.size} 位`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── 分組詳情面板 ─────────────────────────────────────────────────────────────
interface GroupDetailPanelProps {
  groupId: number;
  onRefreshGroups: () => void;
}
function GroupDetailPanel({ groupId, onRefreshGroups }: GroupDetailPanelProps) {
  const { data: group, refetch } = trpc.userGroups.getGroup.useQuery({ groupId });
  const [batchPlanOpen, setBatchPlanOpen] = useState(false);
  const [batchPointsOpen, setBatchPointsOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  const removeMutation = trpc.userGroups.removeMember.useMutation({
    onSuccess: () => { toast.success("已移除成員"); refetch(); onRefreshGroups(); },
    onError: (e) => toast.error(`移除失敗：${e.message}`),
  });

  if (!group) return <div className="text-center py-8 text-slate-500">載入中...</div>;

  const colorStyle = GROUP_COLORS[group.color ?? "amber"] ?? GROUP_COLORS.amber;

  return (
    <div className="space-y-4">
      {/* 分組標題 */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${colorStyle.border} ${colorStyle.bg}`}>
        <span className="text-2xl">{group.icon}</span>
        <div className="flex-1">
          <div className={`font-semibold ${colorStyle.text}`}>{group.name}</div>
          {group.description && <div className="text-xs text-slate-400 mt-0.5">{group.description}</div>}
        </div>
        <div className="text-xs text-slate-500">{group.members.length} 位成員</div>
      </div>

      {/* 操作按鈕 */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setAddMemberOpen(true)} className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs gap-1.5">
          <Plus className="w-3.5 h-3.5" /> 新增成員
        </Button>
        <Button size="sm" onClick={() => setBatchPlanOpen(true)} disabled={group.members.length === 0} className="bg-amber-600/80 hover:bg-amber-600 text-black text-xs gap-1.5">
          🎫 批量調整方案
        </Button>
        <Button size="sm" onClick={() => setBatchPointsOpen(true)} disabled={group.members.length === 0} className="bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs gap-1.5">
          💎 批量調整積分
        </Button>
      </div>

      {/* 成員列表 */}
      {group.members.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm">此分組尚無成員，點擊「新增成員」開始建立</div>
      ) : (
        <div className="space-y-1.5">
          {group.members.map(m => (
            <div key={m.memberId} className="flex items-center gap-3 bg-slate-800/60 rounded-xl px-3 py-2.5 border border-slate-700/40">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-xs font-bold text-black shrink-0">
                {(m.name ?? "?")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-slate-200 truncate">{m.name ?? "未知用戶"}</span>
                  {m.lifePathNumber && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-600/60 text-indigo-200">靈數 {m.lifePathNumber}</span>
                  )}
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-600/60 text-slate-300">{m.planId ?? "basic"}</span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5 flex gap-3">
                  <span>{m.email ?? "—"}</span>
                  <span>上線：{formatRelative(m.lastSignedIn)}</span>
                  {m.note && <span className="text-amber-400/70">備注：{m.note}</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold text-amber-400">{(m.pointsBalance ?? 0).toLocaleString()}</div>
                <div className="text-[10px] text-slate-500">積分</div>
              </div>
              <button
                onClick={() => removeMutation.mutate({ groupId, userId: m.userId })}
                className="text-slate-500 hover:text-red-400 transition-colors ml-1"
                title="移除成員"
              >
                <UserMinus className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {batchPlanOpen && (
        <BatchPlanModal
          groupId={groupId}
          groupName={group.name}
          memberCount={group.members.length}
          onClose={() => setBatchPlanOpen(false)}
          onSuccess={() => { refetch(); onRefreshGroups(); }}
        />
      )}
      {batchPointsOpen && (
        <BatchPointsModal
          groupId={groupId}
          groupName={group.name}
          memberCount={group.members.length}
          onClose={() => setBatchPointsOpen(false)}
          onSuccess={() => { refetch(); onRefreshGroups(); }}
        />
      )}
      {addMemberOpen && (
        <AddMemberModal
          groupId={groupId}
          groupName={group.name}
          onClose={() => setAddMemberOpen(false)}
          onSuccess={() => { refetch(); onRefreshGroups(); }}
        />
      )}
    </div>
  );
}

// ─── 主頁面 ─────────────────────────────────────────────────────────────────
export default function AdminUserGroups() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<{ id: number; name: string; description?: string | null; color?: string | null; icon?: string | null } | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  const { data: groups, isLoading, refetch } = trpc.userGroups.listGroups.useQuery();
  const deleteMutation = trpc.userGroups.deleteGroup.useMutation({
    onSuccess: () => { toast.success("分組已刪除"); setSelectedGroupId(null); refetch(); },
    onError: (e) => toast.error(`刪除失敗：${e.message}`),
  });

  const handleDeleteGroup = (groupId: number, groupName: string) => {
    if (!confirm(`確定要刪除分組「${groupName}」嗎？此操作無法復原，但不會影響成員帳號。`)) return;
    deleteMutation.mutate({ groupId });
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 標題 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-amber-400 mb-1">客群分組管理</h1>
            <p className="text-slate-400 text-sm">建立分組、批量管理成員方案與積分</p>
          </div>
          <Button onClick={() => setCreateModalOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-black font-semibold gap-1.5">
            <Plus className="w-4 h-4" /> 建立分組
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 分組列表 */}
          <div className="space-y-2">
            <div className="text-xs text-slate-500 mb-3">
              共 <span className="text-amber-400 font-medium">{groups?.length ?? 0}</span> 個分組
            </div>
            {isLoading ? (
              [...Array(4)].map((_, i) => <div key={i} className="h-16 bg-slate-800/40 rounded-xl animate-pulse" />)
            ) : (groups ?? []).length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <div className="text-sm">尚無分組</div>
                <div className="text-xs mt-1">點擊右上角「建立分組」開始</div>
              </div>
            ) : (
              (groups ?? []).map(g => {
                const colorStyle = GROUP_COLORS[g.color ?? "amber"] ?? GROUP_COLORS.amber;
                const isSelected = selectedGroupId === g.id;
                return (
                  <div
                    key={g.id}
                    onClick={() => setSelectedGroupId(isSelected ? null : g.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? `${colorStyle.border} ${colorStyle.bg}`
                        : "border-slate-700/50 bg-slate-800/60 hover:bg-slate-700/40"
                    }`}
                  >
                    <span className="text-xl">{g.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium text-sm ${isSelected ? colorStyle.text : "text-slate-200"}`}>{g.name}</div>
                      <div className="text-xs text-slate-500">{g.memberCount} 位成員</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditGroup(g); }}
                        className="text-slate-500 hover:text-amber-400 transition-colors p-1"
                        title="編輯分組"
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteGroup(g.id, g.name); }}
                        className="text-slate-500 hover:text-red-400 transition-colors p-1"
                        title="刪除分組"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 分組詳情 */}
          <div className="lg:col-span-2">
            {selectedGroupId ? (
              <GroupDetailPanel groupId={selectedGroupId} onRefreshGroups={refetch} />
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                <ChevronDown className="w-8 h-8 mb-2 opacity-40 rotate-[-90deg]" />
                <div className="text-sm">選擇左側分組以查看詳情</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 建立分組 Modal */}
      {createModalOpen && (
        <GroupFormModal onClose={() => setCreateModalOpen(false)} onSuccess={refetch} />
      )}
      {/* 編輯分組 Modal */}
      {editGroup && (
        <GroupFormModal group={editGroup} onClose={() => setEditGroup(null)} onSuccess={refetch} />
      )}
    </AdminLayout>
  );
}
