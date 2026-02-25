/**
 * PermissionManager.tsx
 * 功能權限管理工作台 (/permission-manager)
 * 升級：即時搜尋、統一截止日期控制器、快速續約、緊湊網格佈局、分類篩選+批量勾選
 */
import { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { usePermissions } from "@/hooks/usePermissions";
import { AdminLayout } from "@/components/AdminLayout";
import { SharedNav } from "@/components/SharedNav";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ShieldCheck, Users, ChevronDown, ChevronRight,
  Calendar, X, Zap, Shield, Search, CheckSquare, Square
} from "lucide-react";

// ─── 功能分類顏色 ─────────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  "主功能": "text-amber-400 bg-amber-900/20 border-amber-700/30",
  "作戰室": "text-purple-400 bg-purple-900/20 border-purple-700/30",
};

// ─── 緊湊功能項（網格用）─────────────────────────────────────────────────────
function FeatureChip({
  perm,
  onToggle,
  onSetExpiry,
  isPending,
  unifiedDate,
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
  onToggle: (feature: string, enabled: boolean, expiresAt?: string | null) => void;
  onSetExpiry: (feature: string, expiresAt: string | null) => void;
  isPending: boolean;
  unifiedDate: string;
}) {
  const isExpired = perm.expiresAt && new Date(perm.expiresAt) < new Date();
  const isOn = perm.enabled && !isExpired;

  const handleToggle = () => {
    const newEnabled = !perm.enabled;
    // 開啟時自動套用統一截止日期（若有設定）
    if (newEnabled && unifiedDate) {
      onToggle(perm.feature, newEnabled, unifiedDate);
    } else {
      onToggle(perm.feature, newEnabled);
    }
  };

  return (
    <div
      className={`relative flex items-center justify-between gap-2 px-3 py-2 rounded-xl border transition-all cursor-pointer select-none ${
        isOn
          ? "bg-slate-800/60 border-slate-600/50"
          : "bg-slate-900/40 border-slate-800/40 opacity-60"
      }`}
      onClick={!isPending ? handleToggle : undefined}
    >
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-white truncate">{perm.label}</div>
        {perm.expiresAt && (
          <div className={`text-[10px] mt-0.5 ${isExpired ? "text-red-400" : "text-slate-500"}`}>
            {isExpired ? "⚠ 已到期" : `到 ${new Date(perm.expiresAt).toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit" })}`}
          </div>
        )}
      </div>

      {/* 開關 */}
      <div
        className={`relative w-9 h-5 rounded-full transition-all shrink-0 ${isOn ? "bg-amber-500/80" : "bg-slate-700/60"}`}
        style={{ minWidth: "36px", height: "20px" }}
      >
        <span
          className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all ${
            isOn ? "left-[18px]" : "left-0.5"
          }`}
        />
      </div>
    </div>
  );
}

// ─── 用戶權限面板 ─────────────────────────────────────────────────────────────
function UserPermissionPanel({
  userId,
  userName,
  unifiedDate,
}: {
  userId: number;
  userName: string;
  unifiedDate: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("全部");

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

  const handleToggle = useCallback((feature: string, enabled: boolean, expiresAt?: string | null) => {
    toggleMutation.mutate({ userId, feature, enabled, expiresAt: expiresAt ?? null });
  }, [toggleMutation, userId]);

  const handleSetExpiry = useCallback((feature: string, expiresAt: string | null) => {
    const currentPerm = perms?.find(p => p.feature === feature);
    toggleMutation.mutate({
      userId,
      feature,
      enabled: currentPerm?.enabled ?? true,
      expiresAt,
    });
  }, [toggleMutation, userId, perms]);

  const handlePreset = (preset: "basic" | "full" | "none") => {
    presetMutation.mutate({ userId, preset });
  };

  // 快速續約：把所有已開啟功能的截止日期設為統一日期
  const handleBulkRenew = () => {
    if (!unifiedDate || !perms) {
      toast.error("請先設定統一截止日期");
      return;
    }
    const enabledPerms = perms.filter(p => p.enabled);
    if (enabledPerms.length === 0) {
      toast.error("沒有已開啟的功能");
      return;
    }
    Promise.all(
      enabledPerms.map(p =>
        toggleMutation.mutateAsync({ userId, feature: p.feature, enabled: true, expiresAt: unifiedDate })
      )
    ).then(() => {
      refetch();
      toast.success(`已為 ${enabledPerms.length} 項功能設定截止日期`);
    }).catch(() => toast.error("批量更新失敗"));
  };

  // 依分類分組
  const categories = useMemo(() => {
    if (!perms) return [];
    const cats = Array.from(new Set(perms.map(p => p.category)));
    return ["全部", ...cats];
  }, [perms]);

  const filteredPerms = useMemo(() => {
    if (!perms) return [];
    if (categoryFilter === "全部") return perms;
    return perms.filter(p => p.category === categoryFilter);
  }, [perms, categoryFilter]);

  // 批量勾選當前分類
  const handleBulkToggleCategory = (category: string, enable: boolean) => {
    if (!perms) return;
    const items = category === "全部" ? perms : perms.filter(p => p.category === category);
    Promise.all(
      items.map(p =>
        toggleMutation.mutateAsync({
          userId,
          feature: p.feature,
          enabled: enable,
          expiresAt: enable && unifiedDate ? unifiedDate : null,
        })
      )
    ).then(() => {
      refetch();
      toast.success(`已${enable ? "開啟" : "關閉"} ${items.length} 項功能`);
    }).catch(() => toast.error("批量操作失敗"));
  };

  const enabledCount = perms?.filter(p => p.enabled).length ?? 0;
  const totalCount = perms?.length ?? 0;

  return (
    <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl overflow-hidden">
      {/* 用戶標頭 */}
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
              已開通 <span className="text-amber-400">{enabledCount}</span> / {totalCount} 項功能
            </p>
          )}
        </div>
        {expanded
          ? <ChevronDown className="w-4 h-4 text-slate-500" />
          : <ChevronRight className="w-4 h-4 text-slate-500" />
        }
      </button>

      {/* 展開的權限工作台 */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-slate-800/60">
          {/* 快速套用方案 + 快速續約 */}
          <div className="flex flex-wrap items-center gap-2 py-3 mb-3 border-b border-slate-800/40">
            <span className="text-xs text-slate-500 shrink-0">快速套用：</span>
            <button
              onClick={() => handlePreset("basic")}
              disabled={presetMutation.isPending}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-blue-900/30 border border-blue-700/40 text-blue-300 hover:bg-blue-900/50 transition-colors"
            >
              <Shield className="w-3 h-3" /> 基礎
            </button>
            <button
              onClick={() => handlePreset("full")}
              disabled={presetMutation.isPending}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-amber-900/30 border border-amber-700/40 text-amber-300 hover:bg-amber-900/50 transition-colors"
            >
              <Zap className="w-3 h-3" /> 完整
            </button>
            <button
              onClick={() => handlePreset("none")}
              disabled={presetMutation.isPending}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-slate-800/40 border border-slate-700/40 text-slate-400 hover:bg-slate-800/60 transition-colors"
            >
              <X className="w-3 h-3" /> 全關
            </button>
            {unifiedDate && (
              <button
                onClick={handleBulkRenew}
                disabled={toggleMutation.isPending}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-green-900/30 border border-green-700/40 text-green-300 hover:bg-green-900/50 transition-colors ml-auto"
              >
                <Calendar className="w-3 h-3" /> 快速續約至 {unifiedDate}
              </button>
            )}
          </div>

          {/* 分類篩選按鈕 */}
          {perms && categories.length > 2 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {categories.map(cat => (
                <div key={cat} className="flex items-center gap-1">
                  <button
                    onClick={() => setCategoryFilter(cat)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                      categoryFilter === cat
                        ? "bg-amber-600/30 border-amber-600/50 text-amber-300"
                        : "bg-slate-800/40 border-slate-700/40 text-slate-400 hover:bg-slate-800/60"
                    }`}
                  >
                    {cat}
                  </button>
                  {/* 全選此分類 */}
                  <button
                    onClick={() => handleBulkToggleCategory(cat, true)}
                    disabled={toggleMutation.isPending}
                    className="p-1 rounded text-slate-600 hover:text-green-400 transition-colors"
                    title={`全選 ${cat}`}
                  >
                    <CheckSquare className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleBulkToggleCategory(cat, false)}
                    disabled={toggleMutation.isPending}
                    className="p-1 rounded text-slate-600 hover:text-red-400 transition-colors"
                    title={`全關 ${cat}`}
                  >
                    <Square className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 功能網格 */}
          {perms ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filteredPerms.map(perm => (
                <FeatureChip
                  key={perm.feature}
                  perm={perm}
                  onToggle={handleToggle}
                  onSetExpiry={handleSetExpiry}
                  isPending={toggleMutation.isPending}
                  unifiedDate={unifiedDate}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500 text-sm">載入中...</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 主頁面 ───────────────────────────────────────────────────────────────────
export default function PermissionManager() {
  const { isAdmin } = usePermissions();
  const [searchQuery, setSearchQuery] = useState("");
  const [unifiedDate, setUnifiedDate] = useState("");

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

  // 過濾掉管理員自己，並套用搜尋
  const subUsers = useMemo(() => {
    const base = usersData?.filter(u => u.role !== "admin") ?? [];
    if (!searchQuery.trim()) return base;
    const q = searchQuery.toLowerCase();
    return base.filter(u =>
      (u.name ?? "").toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q)
    );
  }, [usersData, searchQuery]);

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* 頁面標題 */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-green-900/30 border border-green-700/40 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">功能權限管理</h1>
            <p className="text-sm text-slate-400 mt-0.5">設定每位用戶可使用的功能模組與截止日期</p>
          </div>
        </div>

        {/* 工具列：搜尋 + 統一截止日期 */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* 即時搜尋 */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="搜尋用戶名稱或 Email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-900/60 border-slate-700 text-slate-200 placeholder:text-slate-500 text-sm"
              />
            </div>

            {/* 統一截止日期控制器 */}
            <div className="flex items-center gap-2 shrink-0">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs text-slate-400 shrink-0 hidden sm:block">統一截止日期：</span>
              <input
                type="date"
                value={unifiedDate}
                onChange={(e) => setUnifiedDate(e.target.value)}
                className="bg-slate-900/60 border border-slate-700/60 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/60"
              />
              {unifiedDate && (
                <button
                  onClick={() => setUnifiedDate("")}
                  className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
                  title="清除統一日期"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {unifiedDate && (
            <p className="text-xs text-amber-400/80 mt-2">
              💡 開啟功能時將自動套用此截止日期；也可對已展開的用戶點擊「快速續約」批量更新
            </p>
          )}
        </div>

        {/* 用戶列表 */}
        {isLoading ? (
          <div className="text-center py-12 text-slate-500">載入使用者清單中...</div>
        ) : subUsers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">
              {searchQuery ? "找不到符合的用戶" : "尚無子帳號"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-500 mb-2">
              顯示 <span className="text-amber-400">{subUsers.length}</span> 位用戶
            </p>
            {subUsers.map(u => (
              <UserPermissionPanel
                key={u.id}
                userId={u.id}
                userName={u.name ?? `使用者 #${u.id}`}
                unifiedDate={unifiedDate}
              />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
