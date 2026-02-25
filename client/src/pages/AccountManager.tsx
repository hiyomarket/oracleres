/**
 * AccountManager.tsx
 * 帳號管理頁面（主帳號專屬）：
 * - 邀請碼產生與管理
 * - 使用者列表（含方案、積分顯示）
 * - 進階篩選器（生命靈數/方案/最後上線）+ 分頁
 * - 各使用者命格資料查看
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  Users, Key, Plus, Trash2, Copy, Check, ChevronDown, ChevronUp,
  Shield, UserCheck, UserX, Calendar, Clock, Loader2, ArrowLeft, AlertTriangle,
  Filter, ChevronLeft, ChevronRight, Star, Coins,
} from "lucide-react";
import { Link } from "wouter";

const PLAN_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  basic:        { label: "基礎", color: "text-slate-400",  bg: "bg-slate-700/40" },
  advanced:     { label: "進階", color: "text-orange-400", bg: "bg-orange-500/20" },
  professional: { label: "專業", color: "text-violet-400", bg: "bg-violet-500/20" },
};

const LIFE_PATH_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const LAST_ACTIVE_OPTIONS = [
  { value: "7d",          label: "7 天內" },
  { value: "30d",         label: "30 天內" },
  { value: "90d",         label: "90 天內" },
  { value: "inactive90d", label: "90 天未登入" },
];

export default function AccountManager() {
  const { user } = useAuth();
  const { data: status } = trpc.account.getStatus.useQuery();
  const { data: invites = [], refetch: refetchInvites } = trpc.account.listInviteCodes.useQuery(
    undefined, { enabled: status?.isOwner }
  );

  // 篩選狀態
  const [filterLifePath, setFilterLifePath] = useState<number | undefined>(undefined);
  const [filterPlan, setFilterPlan] = useState<"basic" | "advanced" | "professional" | undefined>(undefined);
  const [filterLastActive, setFilterLastActive] = useState<"7d" | "30d" | "90d" | "inactive90d" | undefined>(undefined);
  const [searchName, setSearchName] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  // 進階篩選用戶列表
  const { data: filteredResult, isLoading: usersLoading } = trpc.dashboard.listUsersFiltered.useQuery(
    {
      page,
      pageSize: PAGE_SIZE,
      lifePathNumber: filterLifePath,
      planId: filterPlan,
      lastActiveFilter: filterLastActive,
      searchName: searchName.trim() || undefined,
    },
    { enabled: status?.isOwner }
  );

  const userList = filteredResult?.users ?? [];
  const totalUsers = filteredResult?.total ?? 0;
  const totalPages = filteredResult?.totalPages ?? 1;

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [expiresInDays, setExpiresInDays] = useState<number | undefined>(undefined);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<number | null>(null);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<number | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const utils = trpc.useUtils();

  const deleteUser = trpc.account.deleteUser.useMutation({
    onSuccess: () => {
      toast.success(`帳號「${confirmDeleteName}」已刪除`);
      setConfirmDeleteUserId(null);
      utils.dashboard.listUsersFiltered.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const createCode = trpc.account.createInviteCode.useMutation({
    onSuccess: (res) => {
      toast.success(`邀請碼已產生：${res.code}`);
      refetchInvites();
      setShowCreateForm(false);
      setNewLabel("");
      setExpiresInDays(undefined);
    },
    onError: (err) => toast.error(err.message),
  });

  const revokeCode = trpc.account.revokeInviteCode.useMutation({
    onSuccess: () => { toast.success("邀請碼已撤銷"); refetchInvites(); },
    onError: (err) => toast.error(err.message),
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("邀請碼已複製");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const resetFilters = () => {
    setFilterLifePath(undefined);
    setFilterPlan(undefined);
    setFilterLastActive(undefined);
    setSearchName("");
    setPage(1);
  };

  const hasActiveFilters = filterLifePath !== undefined || filterPlan !== undefined || filterLastActive !== undefined || searchName.trim() !== "";

  // 非主帳號
  if (!status?.isOwner) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <Shield className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="text-slate-400">此頁面僅限主帳號存取</p>
          <Link href="/" className="text-amber-400 text-sm hover:underline">← 返回首頁</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="border-b border-slate-800/60 px-4 py-4 sticky top-0 bg-[#0a0a0f]/95 backdrop-blur-sm z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/" className="p-2 rounded-xl hover:bg-slate-800/60 transition-colors">
            <ArrowLeft className="w-4 h-4 text-slate-400" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white">帳號管理</h1>
            <p className="text-xs text-slate-500">主帳號：{user?.name}</p>
          </div>
          <Link href="/admin/dashboard" className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-400 text-xs border border-amber-500/30 hover:bg-amber-500/30 transition-colors">
            儀表板
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* ── 邀請碼管理 ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-semibold text-white">邀請碼管理</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">
                {invites.filter(i => !i.isUsed).length} 個可用
              </span>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 text-purple-300 text-xs border border-purple-500/30 hover:bg-purple-600/30 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              產生邀請碼
            </button>
          </div>

          {/* 產生表單 */}
          <AnimatePresence>
            {showCreateForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 space-y-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">備註（選填，例：給誰的邀請碼）</label>
                    <input
                      type="text"
                      value={newLabel}
                      onChange={e => setNewLabel(e.target.value)}
                      placeholder="例：給小明的邀請碼"
                      maxLength={100}
                      className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">有效天數（選填，留空表示永不過期）</label>
                    <input
                      type="number"
                      value={expiresInDays ?? ""}
                      onChange={e => setExpiresInDays(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="例：30"
                      min={1}
                      max={365}
                      className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowCreateForm(false)}
                      className="flex-1 py-2 rounded-xl bg-slate-700/50 text-slate-400 text-sm hover:bg-slate-700 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={() => createCode.mutate({ label: newLabel || undefined, expiresInDays })}
                      disabled={createCode.isPending}
                      className="flex-1 py-2 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {createCode.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                      產生
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 邀請碼列表 */}
          <div className="space-y-2">
            {invites.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-4">尚無邀請碼，點擊「產生邀請碼」建立</p>
            )}
            {invites.map(invite => (
              <div
                key={invite.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm ${
                  invite.isUsed
                    ? "bg-slate-800/20 border-slate-700/30 opacity-60"
                    : "bg-slate-800/50 border-slate-700/50"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-base tracking-widest text-white">{invite.code}</span>
                    {invite.isUsed ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">已使用</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">可用</span>
                    )}
                  </div>
                  {invite.label && <p className="text-xs text-slate-500 mt-0.5">{invite.label}</p>}
                  {invite.expiresAt && (
                    <p className="text-xs text-slate-600 mt-0.5">
                      到期：{new Date(invite.expiresAt).toLocaleDateString("zh-TW")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {!invite.isUsed && (
                    <>
                      <button
                        onClick={() => copyCode(invite.code)}
                        className="p-2 rounded-xl hover:bg-slate-700/60 transition-colors text-slate-400 hover:text-white"
                        title="複製邀請碼"
                      >
                        {copiedCode === invite.code ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => revokeCode.mutate({ id: invite.id })}
                        className="p-2 rounded-xl hover:bg-red-500/20 transition-colors text-slate-500 hover:text-red-400"
                        title="撤銷邀請碼"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 使用者列表（含篩選器） ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-white">使用者列表</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">
                {totalUsers} 位
              </span>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border transition-colors ${
                hasActiveFilters
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  : "bg-slate-800/50 text-slate-400 border-slate-700/50 hover:bg-slate-700/50"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              篩選{hasActiveFilters ? " ●" : ""}
            </button>
          </div>

          {/* 篩選器面板 */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 space-y-4">
                  {/* 搜尋名稱 */}
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">搜尋命格名稱</label>
                    <input
                      type="text"
                      value={searchName}
                      onChange={e => { setSearchName(e.target.value); setPage(1); }}
                      placeholder="輸入命格顯示名稱..."
                      className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/60"
                    />
                  </div>

                  {/* 生命靈數篩選 */}
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">生命靈數</label>
                    <div className="flex flex-wrap gap-2">
                      {LIFE_PATH_NUMBERS.map(n => (
                        <button
                          key={n}
                          onClick={() => { setFilterLifePath(filterLifePath === n ? undefined : n); setPage(1); }}
                          className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${
                            filterLifePath === n
                              ? "bg-amber-500 text-black"
                              : "bg-slate-700/50 text-slate-400 hover:bg-slate-600/50"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 方案篩選 */}
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">會員方案</label>
                    <div className="flex gap-2 flex-wrap">
                      {(["basic", "advanced", "professional"] as const).map(planId => {
                        const p = PLAN_LABELS[planId];
                        return (
                          <button
                            key={planId}
                            onClick={() => { setFilterPlan(filterPlan === planId ? undefined : planId); setPage(1); }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                              filterPlan === planId
                                ? `${p.bg} ${p.color} border-current`
                                : "bg-slate-700/30 text-slate-400 border-slate-600/30 hover:bg-slate-700/50"
                            }`}
                          >
                            {p.label}方案
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 最後上線篩選 */}
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">最後上線</label>
                    <div className="flex gap-2 flex-wrap">
                      {LAST_ACTIVE_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setFilterLastActive(filterLastActive === opt.value as typeof filterLastActive ? undefined : opt.value as typeof filterLastActive);
                            setPage(1);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs border transition-all ${
                            filterLastActive === opt.value
                              ? "bg-sky-500/20 text-sky-400 border-sky-500/30"
                              : "bg-slate-700/30 text-slate-400 border-slate-600/30 hover:bg-slate-700/50"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 重置按鈕 */}
                  {hasActiveFilters && (
                    <button
                      onClick={resetFilters}
                      className="text-xs text-slate-500 hover:text-slate-300 transition-colors underline"
                    >
                      清除所有篩選條件
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 用戶列表 */}
          <div className="space-y-2">
            {usersLoading ? (
              <div className="flex items-center justify-center py-8 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                載入中...
              </div>
            ) : userList.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                {hasActiveFilters ? "沒有符合篩選條件的用戶" : "尚無用戶"}
              </div>
            ) : (
              userList.map(u => (
                <div key={u.id} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
                  <div
                    onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-800/60 transition-colors cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setExpandedUser(expandedUser === u.id ? null : u.id)}
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-white shrink-0">
                      {(u.name ?? "?")[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white truncate">{u.name ?? "未命名"}</span>
                        {u.isActivated ? (
                          <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <UserX className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        )}
                        {/* 方案標籤 */}
                        {u.planId && PLAN_LABELS[u.planId] && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${PLAN_LABELS[u.planId].bg} ${PLAN_LABELS[u.planId].color} border-current/30`}>
                            {PLAN_LABELS[u.planId].label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <p className="text-xs text-slate-500 truncate">{u.email ?? "無郵件"}</p>
                        {/* 積分餘額 */}
                        {u.pointsBalance > 0 && (
                          <span className="text-xs text-amber-400 flex items-center gap-0.5 shrink-0">
                            ✦ {u.pointsBalance}
                          </span>
                        )}
                      </div>
                      {u.lastSignedIn && (
                        <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 shrink-0" />
                          最後登入：{new Date(u.lastSignedIn).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteUserId(u.id);
                          setConfirmDeleteName(u.name ?? "未命名");
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors text-slate-600 hover:text-red-400"
                        title="刪除此帳號"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {expandedUser === u.id ? (
                        <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                      )}
                    </div>
                  </div>
                  <AnimatePresence>
                    {expandedUser === u.id && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <UserProfileDetail userId={u.id} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
            )}
          </div>

          {/* 分頁控制 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-slate-400">
                第 <span className="text-white font-medium">{page}</span> / {totalPages} 頁
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </section>
      </div>

      {/* ── 刪除確認對話框 ── */}
      <AnimatePresence>
        {confirmDeleteUserId !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
            onClick={() => setConfirmDeleteUserId(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-red-500/30 rounded-2xl p-6 max-w-sm w-full space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">確認刪除帳號</h3>
                  <p className="text-xs text-slate-400 mt-0.5">此操作無法復原</p>
                </div>
              </div>
              <p className="text-sm text-slate-300">
                確定要刪除 <span className="text-red-400 font-semibold">「{confirmDeleteName}」</span> 的帳號嗎？
                <br />
                <span className="text-xs text-slate-500">包含所有命格資料、擲筊記錄、選號記錄等將一併刪除。</span>
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDeleteUserId(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-700/50 text-slate-300 text-sm hover:bg-slate-700 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => deleteUser.mutate({ userId: confirmDeleteUserId! })}
                  disabled={deleteUser.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {deleteUser.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  確認刪除
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** 展開後顯示使用者的命格資料 */
function UserProfileDetail({ userId }: { userId: number }) {
  const { data: profile, isLoading } = trpc.account.getProfileByUserId.useQuery({ userId });
  if (isLoading) return <div className="px-4 pb-3 text-xs text-slate-500">載入中...</div>;
  if (!profile) return <div className="px-4 pb-3 text-xs text-slate-500">此使用者尚未填寫命格資料</div>;
  const ELEMENT_LABELS: Record<string, string> = {
    fire: "火", earth: "土", metal: "金", wood: "木", water: "水",
  };
  return (
    <div className="px-4 pb-4 border-t border-slate-700/40 pt-3 space-y-2">
      <p className="text-xs text-slate-400 font-medium">命格資料</p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {profile.displayName && <div><span className="text-slate-500">姓名：</span><span className="text-white">{profile.displayName}</span></div>}
        {profile.birthDate && <div><span className="text-slate-500">生日：</span><span className="text-white">{profile.birthDate}</span></div>}
        {profile.birthTime && <div><span className="text-slate-500">生時：</span><span className="text-white">{profile.birthTime}</span></div>}
        {profile.birthPlace && <div><span className="text-slate-500">出生地：</span><span className="text-white">{profile.birthPlace}</span></div>}
        {profile.dayPillar && <div><span className="text-slate-500">日柱：</span><span className="text-white">{profile.dayPillar}</span></div>}
        {profile.dayMasterElement && (
          <div><span className="text-slate-500">日主五行：</span><span className="text-amber-400">{ELEMENT_LABELS[profile.dayMasterElement] ?? profile.dayMasterElement}</span></div>
        )}
        {profile.lifePathNumber && (
          <div><span className="text-slate-500">生命靈數：</span><span className="text-violet-400 font-bold">{profile.lifePathNumber}</span></div>
        )}
        {profile.favorableElements && (
          <div className="col-span-2"><span className="text-slate-500">喜用神：</span><span className="text-emerald-400">{profile.favorableElements}</span></div>
        )}
        {profile.unfavorableElements && (
          <div className="col-span-2"><span className="text-slate-500">忌神：</span><span className="text-red-400">{profile.unfavorableElements}</span></div>
        )}
        {profile.notes && (
          <div className="col-span-2"><span className="text-slate-500">備註：</span><span className="text-slate-300">{profile.notes}</span></div>
        )}
      </div>
    </div>
  );
}
