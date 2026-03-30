/**
 * AdminAccessTokens - 特殊存取 Token 管理頁面
 * 管理員可生成（含模組勾選）、廢止、刪除供 AI 渠道使用的存取 Token
 * v11.7：加入模組勾選、到期警示標籤、使用次數顯示
 */
import { useAdminRole } from "@/hooks/useAdminRole";
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { AdminLayout } from "@/components/AdminLayout";
import { useConfirmDialog } from "@/components/admin/ConfirmDialog";
import { TableSkeleton } from "@/components/admin/AdminSkeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Copy, Key, CheckCircle, XCircle, Clock, Zap, AlertTriangle, ChevronDown, ChevronUp, Activity } from "lucide-react";

type ModuleId = "daily" | "tarot" | "wealth" | "hourly";
/** 身分類型為字串：'ai_readonly' | 'ai_full' | 方案 ID */
type IdentityType = string;

const MODULE_OPTIONS: { id: ModuleId; label: string; emoji: string }[] = [
  { id: "daily", label: "運勢摘要", emoji: "☀️" },
  { id: "tarot", label: "塔羅指引", emoji: "🃃" },
  { id: "wealth", label: "偶財指數", emoji: "💰" },
  { id: "hourly", label: "時辰能量", emoji: "⏰" },
];

/** 固定的特殊身分選項（後台方案圖動態讀取） */
const FIXED_IDENTITY_OPTIONS = [
  { id: "ai_readonly", label: "AI 全站唯讀", emoji: "🤖", desc: "AI 系統使用，無虛擬命盤，純簻資料讀取", color: "gray" },
  { id: "ai_full", label: "AI 全功能（含虛擬命盤）", emoji: "🤖✨", desc: "AI 可體驗完整前台，自動生成虛擬命盤", color: "emerald" },
];

interface AccessToken {
  id: number;
  token: string;
  name: string;
  description: string | null;
  isActive: number;
  createdBy: number;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  useCount: number;
  createdAt: Date;
  allowedModules: ModuleId[] | null;
  identityType?: string;
  guestName?: string | null;
  guestGender?: "male" | "female" | null;
  guestBirthYear?: number | null;
  guestBirthMonth?: number | null;
  guestBirthDay?: number | null;
  guestBirthHour?: number | null;
}

const EMPTY_FORM = {
  name: "",
  description: "",
  expiresAt: "",
  allowedModules: [] as ModuleId[], // 空陣列 = 全部開放
  accessMode: "daily_view" as "daily_view" | "admin_view",
  identityType: "ai_readonly" as IdentityType,
};

/** 距到期天數（負數表示已過期） */
function daysUntilExpiry(expiresAt: Date | null): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function AdminAccessTokens() {
  const { confirm: confirmDialog, ConfirmDialogElement } = useConfirmDialog();
  const { readOnly } = useAdminRole();
  const utils = trpc.useUtils();
  const { data: tokens = [], isLoading } = trpc.accessTokens.list.useQuery();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "expired">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Client-side filtering
  const filteredTokens = useMemo(() => {
    let result = (tokens as AccessToken[]);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(t => t.name.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q));
    }
    if (statusFilter !== "all") {
      result = result.filter(t => {
        const expired = t.expiresAt !== null && new Date(t.expiresAt) < new Date();
        if (statusFilter === "active") return t.isActive === 1 && !expired;
        if (statusFilter === "inactive") return t.isActive !== 1;
        if (statusFilter === "expired") return expired;
        return true;
      });
    }
    return result;
  }, [tokens, searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredTokens.length / PAGE_SIZE);
  const paginatedTokens = filteredTokens.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showNewTokenDialog, setShowNewTokenDialog] = useState(false);
  const [newTokenValue, setNewTokenValue] = useState("");
  const [newTokenName, setNewTokenName] = useState("");
  const [newTokenMode, setNewTokenMode] = useState<"daily_view" | "admin_view">("daily_view");
  const [newTokenIdentity, setNewTokenIdentity] = useState<IdentityType>("ai_readonly");
  const [newTokenGuestName, setNewTokenGuestName] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [expandedLogs, setExpandedLogs] = useState<number | null>(null);

  // 後台方案清單（供身分類型下拉選單）
  const { data: plansData = [] } = trpc.accessTokens.listPlans.useQuery();

  // 存取紀錄查詢（僅展開時載入）
  const { data: logsData, isLoading: logsLoading } = trpc.accessTokens.getLogs.useQuery(
    { tokenId: expandedLogs ?? 0, limit: 10 },
    { enabled: expandedLogs !== null }
  );

  const createMutation = trpc.accessTokens.create.useMutation({
    onSuccess: (data) => {
      setNewTokenValue(data.token);
      setNewTokenName(data.name);
      setNewTokenMode(form.accessMode);
      setNewTokenIdentity(data.identityType ?? "ai_readonly");
      setNewTokenGuestName(data.guestName ?? null);
      setShowCreateDialog(false);
      setShowNewTokenDialog(true);
      utils.accessTokens.list.invalidate();
    },
    onError: (e) => toast.error(`建立失敗：${e.message}`),
  });

  const setActiveMutation = trpc.accessTokens.setActive.useMutation({
    onSuccess: () => utils.accessTokens.list.invalidate(),
    onError: (e) => toast.error(`操作失敗：${e.message}`),
  });

  const deleteMutation = trpc.accessTokens.delete.useMutation({
    onSuccess: () => { toast.success("Token 已刪除"); utils.accessTokens.list.invalidate(); },
    onError: (e) => toast.error(`刪除失敗：${e.message}`),
  });

  const handleCreate = () => {
    if (!form.name.trim()) {
      toast.error("Token 名稱為必填");
      return;
    }
    createMutation.mutate({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).getTime() : undefined,
      allowedModules: form.allowedModules.length > 0 ? form.allowedModules : undefined,
      accessMode: form.accessMode,
      identityType: form.identityType,
    });
  };

  const toggleModule = (id: ModuleId) => {
    setForm(prev => ({
      ...prev,
      allowedModules: prev.allowedModules.includes(id)
        ? prev.allowedModules.filter(m => m !== id)
        : [...prev.allowedModules, id],
    }));
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token)
      .then(() => toast.success("Token 已複製到剪貼簿"))
      .catch(() => toast.error("複製失敗，請手動複製"));
  };

  const handleCopyUrl = (token: string, mode?: string) => {
    const path = mode === "admin_view" ? "/ai-entry" : "/ai-view";
    const url = `${window.location.origin}${path}?token=${token}`;
    navigator.clipboard.writeText(url)
      .then(() => toast.success("存取連結已複製"))
      .catch(() => toast.error("複製失敗，請手動複製"));
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleString("zh-TW", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const isExpired = (token: AccessToken) =>
    token.expiresAt !== null && new Date(token.expiresAt) < new Date();

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 頁面標題 */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <Key className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">特殊存取 Token</h1>
            <p className="text-white/40 text-xs">管理 AI 渠道與特殊存取權限</p>
          </div>
        </div>

        {/* 說明區塊 */}
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
          <div className="flex items-start gap-3">
            <Key className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-blue-300 font-semibold text-sm mb-1">特殊存取 Token 說明</p>
              <p className="text-blue-200/70 text-xs leading-relaxed">
                此功能供 AI 系統或無法完成 OAuth 登入的特殊渠道使用。支援兩種存取模式：
                <strong className="text-blue-300">今日運勢</strong>（<code className="mx-1 px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-300 font-mono text-xs">/ai-view?token=xxx</code>）僅顯示今日運勢摘要；
                <strong className="text-emerald-300">全站唯讀</strong>（<code className="mx-1 px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-300 font-mono text-xs">/ai-entry?token=xxx</code>）可瀏覽前台、後台、專家後台所有頁面，但不能執行任何操作。
              </p>
            </div>
          </div>
        </div>

        {/* 搜尋和篩選 */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <Input
            placeholder="搜尋 Token 名稱或說明..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 flex-1"
          />
          <div className="flex gap-2">
            {(["all", "active", "inactive", "expired"] as const).map(s => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? s === "active" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : s === "inactive" ? "bg-red-500/20 text-red-300 border border-red-500/40"
                    : s === "expired" ? "bg-orange-500/20 text-orange-300 border border-orange-500/40"
                    : "bg-white/10 text-white/80 border border-white/20"
                    : "bg-white/5 text-white/40 border border-transparent hover:bg-white/10"
                }`}
              >
                {s === "all" ? "全部" : s === "active" ? "啟用中" : s === "inactive" ? "已停用" : "已過期"}
              </button>
            ))}
          </div>
        </div>

        {/* 操作列 */}
        <div className="flex items-center justify-between">
          <p className="text-white/50 text-sm">
            {searchTerm || statusFilter !== "all" ? `符合條件 ${filteredTokens.length} 個` : `共 ${tokens.length} 個 Token`}
          </p>
          <Button
            onClick={() => { setForm({ ...EMPTY_FORM }); setShowCreateDialog(true); }}
            disabled={readOnly}
            className="flex items-center gap-2"
            size="sm"
          >
            <Plus className="w-4 h-4" />
            生成新 Token
          </Button>
        </div>

        {/* Token 列表 */}
        {isLoading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : tokens.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            <Key className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>尚未建立任何 Token</p>
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedTokens.map((token) => {
              const expired = isExpired(token);
              const active = token.isActive === 1 && !expired;
              const days = daysUntilExpiry(token.expiresAt);
              const expiringSoon = days !== null && days > 0 && days <= 7;
              return (
                <div
                  key={token.id}
                  className={`rounded-xl border p-4 transition-all ${
                    active
                      ? expiringSoon
                        ? "border-orange-500/40 bg-orange-500/5"
                        : "border-emerald-500/30 bg-emerald-500/5"
                      : "border-white/10 bg-white/3 opacity-70"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* 名稱 + 狀態標籤 */}
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-white">{token.name}</span>
                        {active ? (
                          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" /> 啟用中
                          </Badge>
                        ) : expired ? (
                          <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30 text-xs">
                            <Clock className="w-3 h-3 mr-1" /> 已過期
                          </Badge>
                        ) : (
                          <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs">
                            <XCircle className="w-3 h-3 mr-1" /> 已停用
                          </Badge>
                        )}
                        {/* 7 天內到期警示 */}
                        {expiringSoon && (
                          <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/40 text-xs">
                            <AlertTriangle className="w-3 h-3 mr-1" /> {days} 天後到期
                          </Badge>
                        )}
                      </div>

                      {token.description && (
                        <p className="text-white/50 text-xs mb-2">{token.description}</p>
                      )}

                      {/* Token 值（遮蔽） */}
                      <div className="flex items-center gap-2 mb-2">
                        <code className="text-xs font-mono text-white/40 bg-white/5 px-2 py-1 rounded truncate max-w-[200px] sm:max-w-xs">
                          {token.token.slice(0, 16)}...{token.token.slice(-8)}
                        </code>
                        <button
                          onClick={() => handleCopyToken(token.token)}
                          className="text-white/40 hover:text-white/70 transition-colors"
                          title="複製 Token"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* 存取模式 + 身分類型標籤 */}
                      <div className="flex flex-wrap gap-1 mb-1">
                        {(token as AccessToken & { accessMode?: string }).accessMode === "admin_view" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                            🏠 全站唯讀
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300/60 text-xs">
                            ☀️ 今日運勢
                          </span>
                        )}
                        {token.identityType === "ai_full" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs">
                            🤖✨ AI 全功能
                          </span>
                        )}
                        {token.identityType && token.identityType !== "ai_readonly" && token.identityType !== "ai_full" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs">
                            📍 {
                              plansData.find(p => p.id === token.identityType)?.name ?? token.identityType
                            } 體驗
                          </span>
                        )}
                        {token.guestName && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300/80 text-xs">
                            👤 虛擬命盤：{token.guestName}
                            {token.guestBirthYear && (
                              <span className="opacity-60">
                                {token.guestBirthYear}/{token.guestBirthMonth}/{token.guestBirthDay}
                              </span>
                            )}
                          </span>
                        )}
                      </div>

                      {/* 開放模組標籤（仅今日運勢模式顯示） */}
                      {(token as AccessToken & { accessMode?: string }).accessMode !== "admin_view" && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {token.allowedModules === null ? (
                          <span className="text-xs text-white/30 italic">全部模組開放</span>
                        ) : token.allowedModules.length === 0 ? (
                          <span className="text-xs text-white/30 italic">全部模組開放</span>
                        ) : (
                          token.allowedModules.map(m => {
                            const opt = MODULE_OPTIONS.find(o => o.id === m);
                            return opt ? (
                              <span key={m} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                                {opt.emoji} {opt.label}
                              </span>
                            ) : null;
                          })
                        )}
                      </div>
                      )}

                      {/* 統計資訊 */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/40">
                        <span>建立：{formatDate(token.createdAt)}</span>
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          使用 {token.useCount} 次
                        </span>
                        <span>最後使用：{formatDate(token.lastUsedAt)}</span>
                        {token.expiresAt && (
                          <span className={expired ? "text-orange-400" : expiringSoon ? "text-orange-300 font-semibold" : ""}>
                            到期：{formatDate(token.expiresAt)}
                          </span>
                        )}
                      </div>

                      {/* 存取紀錄展開按鈕 */}
                      <button
                        onClick={() => setExpandedLogs(expandedLogs === token.id ? null : token.id)}
                        className="mt-2 flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
                      >
                        <Activity className="w-3 h-3" />
                        存取紀錄
                        {expandedLogs === token.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      {/* 存取紀錄面板 */}
                      {expandedLogs === token.id && (
                        <div className="mt-2 rounded-lg border border-white/10 bg-black/20 p-3">
                          {logsLoading ? (
                            <div className="py-2 space-y-1">{[...Array(2)].map((_,i) => <div key={i} className="h-3 bg-white/10 rounded animate-pulse" />)}</div>
                          ) : !logsData || logsData.length === 0 ? (
                            <p className="text-xs text-white/30 text-center py-2">尚無存取紀錄</p>
                          ) : (
                            <div className="space-y-1">
                              <p className="text-xs text-white/30 mb-2">最近 {logsData.length} 次存取</p>
                              {logsData.map((log) => (
                                <div key={log.id} className="flex items-center justify-between text-xs">
                                  <span className="text-white/50 font-mono">{log.ip ?? "未知 IP"}</span>
                                  <span className="text-white/30 text-xs">{log.path}</span>
                                  <span className="text-white/30">
                                    {log.accessedAt ? new Date(log.accessedAt).toLocaleString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* 複製存取連結 */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyUrl(token.token, (token as AccessToken & { accessMode?: string }).accessMode)}
                        className="text-xs h-8 px-2"
                        title="複製存取連結"
                      >
                        <Copy className="w-3.5 h-3.5 mr-1" />
                        複製連結
                      </Button>
                      {/* 啟用/停用切換 */}
                      <Switch
                        checked={token.isActive === 1}
                        disabled={readOnly || expired}
                        onCheckedChange={(checked) =>
                          setActiveMutation.mutate({ id: token.id, isActive: checked })
                        }
                      />
                      {/* 刪除 */}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={readOnly}
                        onClick={() => {
                          confirmDialog({ title: "刪除 Token", description: `確定要刪除 Token「${token.name}」嗎？此操作無法復原。` }).then(ok => {
                            if (ok) deleteMutation.mutate({ id: token.id });
                          });
                        }}
                        className="text-red-400 border-red-500/30 hover:bg-red-500/10 h-8 w-8 p-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 建立 Token 對話框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md flex flex-col max-h-[90vh]">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-400" />
              生成新存取 Token
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 overflow-y-auto flex-1 pr-1">
            <div className="space-y-1.5">
              <Label>Token 名稱 <span className="text-red-400">*</span></Label>
              <Input
                placeholder="例如：Claude AI 助手、GPT 分析機器人"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>用途說明（選填）</Label>
              <Textarea
                placeholder="說明此 Token 的用途或使用者..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label>到期時間（選填，留空 = 永不過期）</Label>
              <Input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              />
            </div>
            {/* 存取模式 */}
            <div className="space-y-2">
              <Label>存取模式</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, accessMode: "daily_view" })}
                  className={`flex flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    form.accessMode === "daily_view"
                      ? "border-amber-500/60 bg-amber-500/10 text-amber-300"
                      : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  <span className="text-base">☀️ 今日運勢</span>
                  <span className="text-xs opacity-70">只看今日運勢摘要頁</span>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, accessMode: "admin_view" })}
                  className={`flex flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    form.accessMode === "admin_view"
                      ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
                      : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  <span className="text-base">🏠 全站唯讀</span>
                  <span className="text-xs opacity-70">可瀏覽前台+後台所有頁面</span>
                </button>
              </div>
              {form.accessMode === "admin_view" && (
                <p className="text-emerald-400/60 text-xs">💡 全站唯讀模式：AI 系統可瀏覽前台、後台、專家後台所有頁面，但不能執行任何操作</p>
              )}
            </div>

            {/* 身分類型選擇 */}
            <div className="space-y-2">
              <Label>身分類型</Label>

              {/* 固定特殊選項：AI 全站唯讀 / AI 全功能 */}
              <div className="space-y-1">
                <p className="text-white/30 text-xs">AI 系統用</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {FIXED_IDENTITY_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setForm({ ...form, identityType: opt.id })}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                        form.identityType === opt.id
                          ? opt.color === "emerald"
                            ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
                            : "border-white/20 bg-white/10 text-white/80"
                          : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                      }`}
                    >
                      <span className="text-base">{opt.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{opt.label}</p>
                        <p className="text-xs opacity-60">{opt.desc}</p>
                      </div>
                      {form.identityType === opt.id && (
                        <CheckCircle className="w-4 h-4 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* 訪客體驗方案：從後台動態讀取 */}
              {plansData.length > 0 && (
                <div className="space-y-1">
                  <p className="text-white/30 text-xs">訪客體驗方案（含虛擬命盤）</p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {plansData.map(plan => (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setForm({ ...form, identityType: plan.id })}
                        className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                          form.identityType === plan.id
                            ? "border-amber-500/60 bg-amber-500/10 text-amber-300"
                            : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                        }`}
                      >
                        <span className="text-base">📍</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{plan.name}</p>
                          <p className="text-xs opacity-60">體驗此方案的完整功能，自動生成虛擬命盤</p>
                        </div>
                        {form.identityType === plan.id && (
                          <CheckCircle className="w-4 h-4 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {form.identityType !== "ai_readonly" && (
                <p className="text-amber-400/60 text-xs">
                  🎲 系統將自動隨機生成虛擬命盤：姓名、性別、出生日期，讓體驗用戶不需輸入即可看到完整系統內容。
                </p>
              )}
            </div>

            {/* 模組勾選（僅今日運勢模式有效） */}
            {form.accessMode === "daily_view" && (
            <div className="space-y-2">
              <Label>開放模組（不勾選 = 全部開放）</Label>
              <div className="grid grid-cols-2 gap-2">
                {MODULE_OPTIONS.map(opt => (
                  <label
                    key={opt.id}
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    <Checkbox
                      checked={form.allowedModules.includes(opt.id)}
                      onCheckedChange={() => toggleModule(opt.id)}
                    />
                    <span className="text-sm text-white/80">{opt.emoji} {opt.label}</span>
                  </label>
                ))}
              </div>
              {form.allowedModules.length === 0 && (
                <p className="text-white/30 text-xs">未勾選任何模組，將開放全部內容</p>
              )}
            </div>
            )}
          </div>
          <DialogFooter className="shrink-0 pt-2 border-t border-white/10">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "生成中..." : "生成 Token"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 新 Token 顯示對話框（僅顯示一次） */}
      <Dialog open={showNewTokenDialog} onOpenChange={setShowNewTokenDialog}>
        <DialogContent className="sm:max-w-lg flex flex-col max-h-[90vh]">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2 text-emerald-400">
              <CheckCircle className="w-5 h-5" />
              Token 已生成：{newTokenName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 overflow-y-auto flex-1 pr-1">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
              <p className="text-amber-300 text-xs font-semibold mb-1">⚠️ 請立即複製並妥善保存</p>
              <p className="text-amber-200/70 text-xs">此 Token 只會顯示一次，關閉後無法再查看完整值。</p>
            </div>
            <div className="space-y-2">
              <Label className="text-white/60 text-xs">Token 值</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono text-emerald-300 bg-emerald-900/20 border border-emerald-500/30 px-3 py-2 rounded-lg break-all">
                  {newTokenValue}
                </code>
                <Button variant="outline" size="sm" onClick={() => handleCopyToken(newTokenValue)} className="shrink-0">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white/60 text-xs">
                存取連結
                <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-normal ${newTokenMode === "admin_view" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
                  {newTokenMode === "admin_view" ? "🏠 全站唯讀" : "☀️ 今日運勢"}
                </span>
                {newTokenIdentity === "ai_full" && (
                  <span className="ml-1 px-1.5 py-0.5 rounded text-xs font-normal bg-emerald-500/20 text-emerald-300">
                    🤖✨ AI 全功能
                  </span>
                )}
                {newTokenIdentity !== "ai_readonly" && newTokenIdentity !== "ai_full" && (
                  <span className="ml-1 px-1.5 py-0.5 rounded text-xs font-normal bg-amber-500/20 text-amber-300">
                    📍 {plansData.find(p => p.id === newTokenIdentity)?.name ?? newTokenIdentity} 體驗
                  </span>
                )}
              </Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono text-blue-300 bg-blue-900/20 border border-blue-500/30 px-3 py-2 rounded-lg break-all">
                  {window.location.origin}{newTokenMode === "admin_view" ? "/ai-entry" : "/ai-view"}?token={newTokenValue}
                </code>
                <Button variant="outline" size="sm" onClick={() => handleCopyUrl(newTokenValue, newTokenMode)} className="shrink-0">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            {/* 虛擬命盤資訊顯示 */}
            {newTokenGuestName && (
              <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3">
                <p className="text-purple-300 text-xs font-semibold mb-1">👤 已自動生成虛擬命盤</p>
                <p className="text-purple-200/70 text-xs">
                  示範命盤姓名：<span className="text-purple-300 font-semibold">{newTokenGuestName}</span>，體驗用戶進入後將看到此命盤的完整天命內容。
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="shrink-0 pt-2 border-t border-white/10">
            <Button onClick={() => setShowNewTokenDialog(false)}>我已複製，關閉</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* 分頁控制 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="text-white/60 border-white/20 hover:bg-white/10 bg-transparent"
          >
            ← 上一頁
          </Button>
          <span className="text-sm text-white/50">
            第 <span className="text-amber-400 font-medium">{currentPage}</span> / {totalPages} 頁
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="text-white/60 border-white/20 hover:bg-white/10 bg-transparent"
          >
            下一頁 →
          </Button>
        </div>
      )}
      {ConfirmDialogElement}
    </AdminLayout>
  );
}
