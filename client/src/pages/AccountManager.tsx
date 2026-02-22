/**
 * AccountManager.tsx
 * 帳號管理頁面（主帳號專屬）：
 * - 邀請碼產生與管理
 * - 使用者列表
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
} from "lucide-react";
import { Link } from "wouter";

export default function AccountManager() {
  const { user } = useAuth();
  const { data: status } = trpc.account.getStatus.useQuery();
  const { data: invites = [], refetch: refetchInvites } = trpc.account.listInviteCodes.useQuery(
    undefined, { enabled: status?.isOwner }
  );
  const { data: userList = [] } = trpc.account.listUsers.useQuery(
    undefined, { enabled: status?.isOwner }
  );
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [expiresInDays, setExpiresInDays] = useState<number | undefined>(undefined);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<number | null>(null);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<number | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState<string>("");
  const utils = trpc.useUtils();

  const deleteUser = trpc.account.deleteUser.useMutation({
    onSuccess: () => {
      toast.success(`帳號「${confirmDeleteName}」已刪除`);
      setConfirmDeleteUserId(null);
      utils.account.listUsers.invalidate();
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
      <div className="border-b border-slate-800/60 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/" className="p-2 rounded-xl hover:bg-slate-800/60 transition-colors">
            <ArrowLeft className="w-4 h-4 text-slate-400" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white">帳號管理</h1>
            <p className="text-xs text-slate-500">主帳號：{user?.name}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

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

        {/* ── 使用者列表 ── */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-white">使用者列表</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">
              {userList.length} 位
            </span>
          </div>
          <div className="space-y-2">
            {userList.map(u => (
              <div key={u.id} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-800/60 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {(u.name ?? "?")[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">{u.name ?? "未命名"}</span>
                      {u.isActivated ? (
                        <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <UserX className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{u.email ?? "無郵件"}</p>
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
                </button>
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
            ))}
          </div>
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
