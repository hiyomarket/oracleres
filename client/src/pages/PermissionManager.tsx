/**
 * PermissionManager.tsx
 * 主帳號功能權限管理頁面
 * 可對每位使用者設定可用的功能模組與使用截止日期
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { usePermissions } from "@/hooks/usePermissions";
import { SharedNav } from "@/components/SharedNav";
import { toast } from "sonner";
import {
  ShieldCheck, Shield, Users, ChevronDown, ChevronRight,
  Calendar, Check, X, Zap, RotateCcw
} from "lucide-react";

// 功能分類顏色
const CATEGORY_COLORS: Record<string, string> = {
  "主功能": "text-amber-400 bg-amber-900/20 border-amber-700/30",
  "作戰室": "text-purple-400 bg-purple-900/20 border-purple-700/30",
};

function PermissionRow({
  perm,
  onToggle,
  onSetExpiry,
  isPending,
}: {
  perm: {
    feature: string;
    label: string;
    category: string;
    enabled: boolean;
    expiresAt: Date | null;
    note: string | null;
    isDefault: boolean;
  };
  onToggle: (feature: string, enabled: boolean) => void;
  onSetExpiry: (feature: string, expiresAt: string | null) => void;
  isPending: boolean;
}) {
  const [showExpiry, setShowExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState(
    perm.expiresAt ? new Date(perm.expiresAt).toISOString().split("T")[0] : ""
  );

  const isExpired = perm.expiresAt && new Date(perm.expiresAt) < new Date();
  const categoryColor = CATEGORY_COLORS[perm.category] ?? "text-slate-400 bg-slate-800/40 border-slate-700/30";

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
      perm.enabled && !isExpired
        ? "bg-slate-800/40 border-slate-700/40"
        : "bg-slate-900/40 border-slate-800/40 opacity-60"
    }`}>
      {/* 功能名稱 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{perm.label}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${categoryColor}`}>
            {perm.category}
          </span>
          {perm.isDefault && (
            <span className="text-[10px] text-slate-500">（預設）</span>
          )}
        </div>
        {perm.expiresAt && (
          <p className={`text-xs mt-0.5 ${isExpired ? "text-red-400" : "text-slate-500"}`}>
            {isExpired ? "⚠ 已到期：" : "到期："}
            {new Date(perm.expiresAt).toLocaleDateString("zh-TW")}
          </p>
        )}
      </div>

      {/* 截止日期設定 */}
      <button
        onClick={() => setShowExpiry(!showExpiry)}
        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700/40 transition-colors"
        title="設定截止日期"
      >
        <Calendar className="w-3.5 h-3.5" />
      </button>

      {/* 開關按鈕 */}
      <button
        onClick={() => onToggle(perm.feature, !perm.enabled)}
        disabled={isPending}
        className={`relative w-10 h-5.5 rounded-full transition-all ${
          perm.enabled && !isExpired
            ? "bg-amber-500/80"
            : "bg-slate-700/60"
        }`}
        style={{ height: "22px", minWidth: "40px" }}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
            perm.enabled && !isExpired ? "left-5" : "left-0.5"
          }`}
        />
      </button>

      {/* 截止日期輸入（展開） */}
      {showExpiry && (
        <div className="absolute right-0 mt-8 z-20 bg-slate-900 border border-slate-700/60 rounded-xl p-3 shadow-xl min-w-[200px]">
          <p className="text-xs text-slate-400 mb-2">設定使用截止日期</p>
          <input
            type="date"
            value={expiryDate}
            onChange={e => setExpiryDate(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-2 py-1.5 text-xs text-white mb-2"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                onSetExpiry(perm.feature, expiryDate || null);
                setShowExpiry(false);
              }}
              className="flex-1 bg-amber-600/80 hover:bg-amber-600 text-white text-xs py-1.5 rounded-lg transition-colors"
            >
              確認
            </button>
            <button
              onClick={() => {
                setExpiryDate("");
                onSetExpiry(perm.feature, null);
                setShowExpiry(false);
              }}
              className="flex-1 bg-slate-700/60 hover:bg-slate-700 text-slate-300 text-xs py-1.5 rounded-lg transition-colors"
            >
              清除
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function UserPermissionPanel({ userId, userName }: { userId: number; userName: string }) {
  const [expanded, setExpanded] = useState(false);

  const { data: perms, refetch } = trpc.permissions.getUserPermissions.useQuery(
    { userId },
    { enabled: expanded }
  );

  const toggleMutation = trpc.permissions.toggleFeature.useMutation({
    onSuccess: () => { refetch(); toast.success("權限已更新"); },
    onError: () => toast.error("更新失敗，請重試"),
  });

  const presetMutation = trpc.permissions.applyPreset.useMutation({
    onSuccess: () => { refetch(); toast.success("方案已套用"); },
    onError: () => toast.error("套用失敗，請重試"),
  });

  const handleToggle = (feature: string, enabled: boolean) => {
    toggleMutation.mutate({ userId, feature, enabled });
  };

  const handleSetExpiry = (feature: string, expiresAt: string | null) => {
    toggleMutation.mutate({
      userId,
      feature,
      enabled: perms?.find(p => p.feature === feature)?.enabled ?? true,
      expiresAt,
    });
  };

  const handlePreset = (preset: "basic" | "full" | "none") => {
    presetMutation.mutate({ userId, preset });
  };

  // 依分類分組
  const grouped = perms ? {
    "主功能": perms.filter(p => p.category === "主功能"),
    "作戰室": perms.filter(p => p.category === "作戰室"),
  } : {};

  return (
    <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl overflow-hidden">
      {/* 使用者標頭（可折疊） */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-800/40 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-amber-900/40 border border-amber-600/40 flex items-center justify-center text-sm text-amber-400 shrink-0">
          {userName[0] ?? "?"}
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-medium text-white">{userName}</p>
          {perms && (
            <p className="text-xs text-slate-500 mt-0.5">
              已開通 {perms.filter(p => p.enabled).length} / {perms.length} 項功能
            </p>
          )}
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-500" />
        )}
      </button>

      {/* 展開的權限設定 */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-slate-800/60">
          {/* 快速套用方案 */}
          <div className="flex items-center gap-2 py-3 mb-3">
            <span className="text-xs text-slate-500 shrink-0">快速套用：</span>
            <button
              onClick={() => handlePreset("basic")}
              disabled={presetMutation.isPending}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-blue-900/30 border border-blue-700/40 text-blue-300 hover:bg-blue-900/50 transition-colors"
            >
              <Shield className="w-3 h-3" />
              基礎方案
            </button>
            <button
              onClick={() => handlePreset("full")}
              disabled={presetMutation.isPending}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-amber-900/30 border border-amber-700/40 text-amber-300 hover:bg-amber-900/50 transition-colors"
            >
              <Zap className="w-3 h-3" />
              完整方案
            </button>
            <button
              onClick={() => handlePreset("none")}
              disabled={presetMutation.isPending}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-slate-800/40 border border-slate-700/40 text-slate-400 hover:bg-slate-800/60 transition-colors"
            >
              <X className="w-3 h-3" />
              全部關閉
            </button>
          </div>

          {/* 功能列表（依分類） */}
          {perms ? (
            Object.entries(grouped).map(([category, items]) => (
              <div key={category} className="mb-4">
                <p className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wider">{category}</p>
                <div className="space-y-2 relative">
                  {(items as NonNullable<typeof perms>).map(perm => (
                    <PermissionRow
                      key={perm.feature}
                      perm={perm}
                      onToggle={handleToggle}
                      onSetExpiry={handleSetExpiry}
                      isPending={toggleMutation.isPending}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-slate-500 text-sm">載入中...</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PermissionManager() {
  const { isAdmin } = usePermissions();
  const { data: usersData, isLoading } = trpc.account.listUsers.useQuery(undefined, {
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#050d14] text-white">
        <SharedNav currentPage="oracle" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">僅主帳號可存取此頁面</p>
          </div>
        </div>
      </div>
    );
  }

  // 過濾掉主帳號自己（admin 永遠有全部權限，不需要設定）
  const subUsers = usersData?.filter(u => u.role !== "admin") ?? [];

  return (
    <div className="min-h-screen bg-[#050d14] text-white">
      <SharedNav currentPage="oracle" />

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* 頁面標題 */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-green-900/30 border border-green-700/40 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">功能權限管理</h1>
            <p className="text-sm text-slate-400 mt-0.5">控制每位使用者可使用的功能模組與截止日期</p>
          </div>
        </div>

        {/* 說明卡片 */}
        <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4 mb-6">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-blue-900/20 border border-blue-700/30 rounded-xl p-3">
              <p className="text-xs font-medium text-blue-300 mb-1">基礎方案</p>
              <p className="text-[11px] text-slate-400">作戰室 + 命格</p>
            </div>
            <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl p-3">
              <p className="text-xs font-medium text-amber-300 mb-1">完整方案</p>
              <p className="text-[11px] text-slate-400">全部 11 項功能</p>
            </div>
            <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-3">
              <p className="text-xs font-medium text-slate-400 mb-1">自訂方案</p>
              <p className="text-[11px] text-slate-500">逐項開關設定</p>
            </div>
          </div>
        </div>

        {/* 使用者列表 */}
        {isLoading ? (
          <div className="text-center py-12 text-slate-500">載入使用者清單中...</div>
        ) : subUsers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">尚無子帳號</p>
            <p className="text-slate-600 text-xs mt-1">在帳號管理頁產生邀請碼後，受邀者啟用即可在此設定權限</p>
          </div>
        ) : (
          <div className="space-y-3">
            {subUsers.map(u => (
              <UserPermissionPanel
                key={u.id}
                userId={u.id}
                userName={u.name ?? `使用者 #${u.id}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
