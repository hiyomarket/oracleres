/**
 * NotificationsPage.tsx
 * 用戶個人通知中心
 * - 顯示所有通知（WBC 競猜結算、系統公告、獎勵）
 * - 標記單則 / 全部已讀
 * - 點擊跳轉相關頁面
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SharedNav } from "@/components/SharedNav";
import { toast } from "sonner";

const TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  wbc_result: { icon: "⚾", color: "text-amber-400", label: "WBC 競猜" },
  system: { icon: "🔔", color: "text-blue-400", label: "系統通知" },
  reward: { icon: "🎁", color: "text-green-400", label: "獎勵" },
  announcement: { icon: "📢", color: "text-purple-400", label: "公告" },
};

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const { data: notifications, isLoading } = trpc.notifications.getMyNotifications.useQuery(
    { limit: 50, offset: 0, unreadOnly: showUnreadOnly },
    { enabled: !!user }
  );
  const { data: unreadData } = trpc.notifications.getUnreadCount.useQuery(undefined, { enabled: !!user });

  const markAsRead = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.getMyNotifications.invalidate();
      utils.notifications.getUnreadCount.invalidate();
    },
  });

  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      toast.success("已全部標記為已讀");
      utils.notifications.getMyNotifications.invalidate();
      utils.notifications.getUnreadCount.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="text-slate-400">載入中...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-4xl">🔔</div>
          <p className="text-slate-400">請先登入查看通知</p>
          <Button onClick={() => window.location.href = getLoginUrl()}>登入</Button>
        </div>
      </div>
    );
  }

  const unreadCount = unreadData?.count ?? 0;

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white pb-24">
      <SharedNav currentPage="notifications" />

      {/* 頂部 */}
      <div className="bg-gradient-to-b from-slate-800/40 to-[#0a0e1a] border-b border-slate-700/40">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔔</span>
              <div>
                <h1 className="text-xl font-bold text-white">通知中心</h1>
                <p className="text-slate-400 text-xs">
                  {unreadCount > 0 ? `${unreadCount} 則未讀通知` : "所有通知已讀"}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="text-xs border-slate-600 text-slate-400 hover:text-white"
              >
                全部已讀
              </Button>
            )}
          </div>

          {/* 篩選 */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setShowUnreadOnly(false)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                !showUnreadOnly ? "bg-amber-600 text-black" : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >全部</button>
            <button
              onClick={() => setShowUnreadOnly(true)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
                showUnreadOnly ? "bg-amber-600 text-black" : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              未讀
              {unreadCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${showUnreadOnly ? "bg-black/30" : "bg-red-500 text-white"}`}>
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 通知列表 */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-2">
        {isLoading ? (
          <div className="text-slate-400 text-sm text-center py-12">載入中...</div>
        ) : !notifications || notifications.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="text-5xl opacity-30">🔔</div>
            <p className="text-slate-500 text-sm">
              {showUnreadOnly ? "沒有未讀通知" : "目前沒有通知"}
            </p>
            <p className="text-slate-600 text-xs">參與 WBC 競猜後，結算結果會在此顯示</p>
          </div>
        ) : (
          notifications.map((notif) => {
            const typeConfig = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.system;
            const isUnread = !notif.isRead;
            const timeAgo = (() => {
              const diff = Date.now() - new Date(notif.createdAt).getTime();
              const mins = Math.floor(diff / 60000);
              const hours = Math.floor(diff / 3600000);
              const days = Math.floor(diff / 86400000);
              if (days > 0) return `${days} 天前`;
              if (hours > 0) return `${hours} 小時前`;
              if (mins > 0) return `${mins} 分鐘前`;
              return "剛剛";
            })();

            return (
              <div
                key={notif.id}
                onClick={() => {
                  if (isUnread) markAsRead.mutate({ id: notif.id });
                  if (notif.linkUrl) navigate(notif.linkUrl);
                }}
                className={`
                  relative p-4 rounded-xl border transition-all cursor-pointer
                  ${isUnread
                    ? "bg-slate-800/60 border-amber-700/30 hover:border-amber-600/50"
                    : "bg-slate-900/40 border-slate-700/30 hover:border-slate-600/50 opacity-70"
                  }
                `}
              >
                {/* 未讀指示點 */}
                {isUnread && (
                  <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                )}

                <div className="flex items-start gap-3">
                  <div className={`text-2xl mt-0.5 ${typeConfig.color}`}>{typeConfig.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border-current ${typeConfig.color}`}>
                        {typeConfig.label}
                      </Badge>
                      <span className="text-xs text-slate-500">{timeAgo}</span>
                    </div>
                    <div className={`text-sm font-semibold mb-0.5 ${isUnread ? "text-white" : "text-slate-400"}`}>
                      {notif.title}
                    </div>
                    <div className="text-xs text-slate-500 leading-relaxed">{notif.content}</div>
                    {notif.linkUrl && (
                      <div className="text-xs text-amber-500/70 mt-1.5">點擊查看詳情 →</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
