/**
 * /messages?bookingId=123
 * 訂單訊息聊天室 - 用戶與專家在訂單成立後的溝通頻道
 * 初期版本：僅限下單後師生溝通；未來可擴充為全站訊息系統
 */
import { useState, useEffect, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft, Send, MessageCircle, Calendar, Clock, Lock, Info,
} from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "待付款",
  confirmed: "已確認",
  completed: "已完成",
  cancelled: "已取消",
};
const STATUS_COLOR: Record<string, string> = {
  pending_payment: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  confirmed: "bg-green-500/20 text-green-400 border-green-500/30",
  completed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function Messages() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const search = useSearch(); // wouter v3: useSearch() returns the query string
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Parse bookingId from query string using wouter's useSearch
  const params = new URLSearchParams(search ?? window.location.search ?? "");
  const bookingIdStr = params.get("bookingId");
  const bookingId = bookingIdStr ? parseInt(bookingIdStr, 10) : null;

  // Fetch messages
  const {
    data: messages = [],
    isLoading,
    refetch,
  } = trpc.expert.getMessages.useQuery(
    { bookingId: bookingId! },
    { enabled: !!bookingId && !!user, refetchInterval: 5000 }
  );

  // Fetch booking info (from myBookings)
  const { data: allBookings = [] } = trpc.expert.myBookings.useQuery(
    { status: "all" },
    { enabled: !!user }
  );
  const booking = allBookings.find((b) => b.id === bookingId);

  // Expert side: fetch from expert bookings
  const { data: expertBookings = [] } = trpc.expert.listMyBookings.useQuery(
    { status: "all" },
    { enabled: !!user && (user.role === "expert" || user.role === "admin") }
  );
  const expertBooking = expertBookings.find((b: { id: number }) => b.id === bookingId);
  const activeBooking = booking ?? expertBooking;

  const sendMutation = trpc.expert.sendMessage.useMutation({
    onSuccess: () => {
      setText("");
      refetch();
    },
    onError: (e) => toast.error("發送失敗: " + e.message),
  });

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!text.trim() || !bookingId) return;
    sendMutation.mutate({ bookingId, content: text.trim() });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <MessageCircle className="w-16 h-16 mx-auto text-muted-foreground/30" />
          <p className="text-muted-foreground">請先登入以查看訊息</p>
          <Button asChild className="bg-amber-500 hover:bg-amber-600 text-black">
            <a href={getLoginUrl()}>立即登入</a>
          </Button>
        </div>
      </div>
    );
  }

  if (!bookingId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <MessageCircle className="w-16 h-16 mx-auto text-muted-foreground/30" />
          <p className="text-muted-foreground">請從訂單頁面進入聊天室</p>
          <Button variant="outline" onClick={() => navigate("/my-bookings")}>
            前往我的預約
          </Button>
        </div>
      </div>
    );
  }

  const isCancelled = activeBooking?.status === "cancelled";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 flex-shrink-0"
              onClick={() => navigate("/my-bookings")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-bold truncate">
                  {activeBooking ? `與 ${(activeBooking as { expertName?: string | null }).expertName ?? "專家"} 的訊息` : "訂單訊息"}
                </h1>
                {activeBooking && (
                  <Badge
                    className={`text-xs border flex-shrink-0 ${STATUS_COLOR[activeBooking.status] ?? ""}`}
                  >
                    {STATUS_LABEL[activeBooking.status] ?? activeBooking.status}
                  </Badge>
                )}
              </div>
              {activeBooking && (
                <p className="text-xs text-muted-foreground truncate">
                  {activeBooking.serviceTitle}
                  {activeBooking.bookingTime && (
                    <>
                      {" · "}
                      <Calendar className="w-2.5 h-2.5 inline" />{" "}
                      {new Date(activeBooking.bookingTime).toLocaleDateString("zh-TW")}
                      {" "}
                      <Clock className="w-2.5 h-2.5 inline" />{" "}
                      {new Date(activeBooking.bookingTime).toLocaleTimeString("zh-TW", {
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto max-w-2xl mx-auto w-full px-4 py-4 space-y-3">
        {/* Info Banner */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/15 text-blue-400 text-xs">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>
            此聊天室為訂單專屬頻道，僅您與命理師可以查看。
            如有付款問題，請在此與命理師溝通確認。
          </span>
        </div>

        {/* 15-day retention notice */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-amber-400/80 text-xs">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>
            <strong className="text-amber-400">訊息保留說明：</strong>
            聊天記錄僅保留 <strong className="text-amber-400">15 天</strong>，請自行截圖或記錄重要溝通內容，以便日後查閱。
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
              >
                <div className="h-10 w-48 rounded-2xl bg-accent/30 animate-pulse" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground/20" />
            <p className="text-muted-foreground text-sm">尚無訊息</p>
            <p className="text-xs text-muted-foreground/60">
              您可以在此詢問命理師關於服務的問題
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === user.id;
            const timeStr = new Date(msg.createdAt).toLocaleTimeString("zh-TW", {
              hour: "2-digit", minute: "2-digit",
            });
            const dateStr = new Date(msg.createdAt).toLocaleDateString("zh-TW", {
              month: "short", day: "numeric",
            });
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] space-y-1 ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                  {!isMe && (
                    <p className="text-xs text-muted-foreground px-1">{msg.senderName ?? "對方"}</p>
                  )}
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isMe
                        ? "bg-amber-500 text-black rounded-br-sm"
                        : "bg-accent text-foreground rounded-bl-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                  <p className="text-xs text-muted-foreground/50 px-1">
                    {dateStr} {timeStr}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="sticky bottom-0 bg-background/90 backdrop-blur border-t border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-3">
          {isCancelled ? (
            <div className="flex items-center gap-2 justify-center text-muted-foreground text-sm py-2">
              <Lock className="w-4 h-4" />
              <span>此訂單已取消，無法發送訊息</span>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="輸入訊息…"
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                maxLength={2000}
              />
              <Button
                onClick={handleSend}
                disabled={!text.trim() || sendMutation.isPending}
                className="bg-amber-500 hover:bg-amber-600 text-black flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
