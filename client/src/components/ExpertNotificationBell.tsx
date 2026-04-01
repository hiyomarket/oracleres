import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck } from "lucide-react";

export function ExpertNotificationBell() {
  const [open, setOpen] = useState(false);
  const { data } = trpc.expert.getNotifications.useQuery({ limit: 10, offset: 0 });
  const utils = trpc.useUtils();
  const markRead = trpc.expert.markNotificationRead.useMutation({
    onSuccess: () => utils.expert.getNotifications.invalidate(),
  });
  const markAll = trpc.expert.markAllNotificationsRead.useMutation({
    onSuccess: () => utils.expert.getNotifications.invalidate(),
  });
  const unread = data?.unreadCount ?? 0;
  const items = data?.items ?? [];
  return (
    <div className="relative">
      <Button variant="ghost" size="icon" className="relative" onClick={() => setOpen(!open)}>
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-popover text-popover-foreground border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between p-3 border-b">
            <span className="font-semibold text-sm">通知</span>
            {unread > 0 && (
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => markAll.mutate()}>
                <CheckCheck className="w-3 h-3 mr-1" /> 全部已讀
              </Button>
            )}
          </div>
          {items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">暫無通知</div>
          ) : items.map(n => (
            <div key={n.id}
              className={"p-3 border-b last:border-0 cursor-pointer hover:bg-accent/50 transition-colors " + (!n.isRead ? "bg-primary/5" : "")}
              onClick={() => { if (!n.isRead) markRead.mutate({ notificationId: n.id }); }}>
              <div className="flex items-start gap-2">
                {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString("zh-TW")}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
