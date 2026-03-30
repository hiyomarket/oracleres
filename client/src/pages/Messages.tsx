/**
 * /messages?bookingId=123
 * 訂單訊息聊天室 - 用戶與專家在訂單成立後的溝通頻道
 * v5.25: WebSocket 即時訊息（替代 5 秒輪詢）
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft, Send, MessageCircle, Calendar, Clock, Lock, Info, ImagePlus, Loader2, Wifi, WifiOff,
} from "lucide-react";
import { BOOKING_STATUS_LABEL as STATUS_LABEL, BOOKING_STATUS_COLOR as STATUS_COLOR } from "@/lib/expertConstants";
import { useChatWebSocket, type ChatMessage } from "@/hooks/useChatWebSocket";

export default function Messages() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const search = useSearch();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Parse bookingId from query string
  const params = new URLSearchParams(search ?? window.location.search ?? "");
  const bookingIdStr = params.get("bookingId");
  const bookingId = bookingIdStr ? parseInt(bookingIdStr, 10) : null;

  // Fetch messages (initial load only, no polling)
  const {
    data: serverMessages = [],
    isLoading,
    refetch,
  } = trpc.expert.getMessages.useQuery(
    { bookingId: bookingId! },
    { enabled: !!bookingId && !!user, refetchInterval: false }
  );

  // Local messages state (for optimistic + WS updates)
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);

  // Sync server messages to local state on initial load
  useEffect(() => {
    if (serverMessages.length > 0) {
      setLocalMessages(serverMessages.map((m) => ({
        id: m.id,
        bookingId: bookingId!,
        senderId: m.senderId,
        senderName: m.senderName ?? "對方",
        content: m.content,
        imageUrl: m.imageUrl,
        createdAt: typeof m.createdAt === "string" ? m.createdAt : new Date(m.createdAt).toISOString(),
        isRead: m.isRead ?? 0,
        readAt: m.readAt ? (typeof m.readAt === "string" ? m.readAt : new Date(m.readAt).toISOString()) : null,
      })));
    }
  }, [serverMessages, bookingId]);

  // WebSocket: receive real-time messages
  const handleWsNewMessage = useCallback((msg: ChatMessage) => {
    setLocalMessages((prev) => {
      // 避免重複（用 id 或 createdAt+senderId 去重）
      const exists = prev.some(
        (m) => m.id === msg.id || (m.senderId === msg.senderId && m.createdAt === msg.createdAt && m.content === msg.content)
      );
      if (exists) return prev;
      return [...prev, msg];
    });
  }, []);

  const handleWsReadNotify = useCallback((payload: { bookingId: number; readerId: number }) => {
    if (payload.bookingId === bookingId) {
      // 標記所有自己發送的訊息為已讀
      setLocalMessages((prev) =>
        prev.map((m) =>
          m.senderId === user?.id && !m.isRead
            ? { ...m, isRead: 1, readAt: new Date().toISOString() }
            : m
        )
      );
    }
  }, [bookingId, user?.id]);

  const { status: wsStatus } = useChatWebSocket({
    userId: user?.id ?? null,
    userName: user?.name,
    bookingId,
    enabled: !!bookingId && !!user,
    onNewMessage: handleWsNewMessage,
    onReadNotify: handleWsReadNotify,
  });

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
    onMutate: (variables) => {
      // 樂觀更新：立即顯示自己的訊息
      const optimisticMsg: ChatMessage = {
        id: Date.now(),
        bookingId: variables.bookingId,
        senderId: user!.id,
        senderName: user!.name ?? "我",
        content: variables.content,
        imageUrl: null,
        createdAt: new Date().toISOString(),
        isRead: 0,
      };
      setLocalMessages((prev) => [...prev, optimisticMsg]);
      setText("");
    },
    onError: (e) => {
      toast.error("發送失敗: " + e.message);
      // 移除樂觀更新的訊息
      refetch();
    },
  });

  const uploadImageMutation = trpc.expert.uploadChatImage.useMutation({
    onMutate: () => {
      // 樂觀更新：顯示上傳中的圖片佔位
      const optimisticMsg: ChatMessage = {
        id: Date.now(),
        bookingId: bookingId!,
        senderId: user!.id,
        senderName: user!.name ?? "我",
        content: "🖼️ 圖片上傳中...",
        imageUrl: null,
        createdAt: new Date().toISOString(),
        isRead: 0,
      };
      setLocalMessages((prev) => [...prev, optimisticMsg]);
    },
    onSuccess: () => {
      toast.success("圖片已發送");
      // 重新載入以取得正確的圖片 URL
      refetch();
    },
    onError: (e) => {
      toast.error("圖片發送失敗: " + e.message);
      refetch();
    },
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !bookingId) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("圖片大小不得超過 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadImageMutation.mutate({
        bookingId,
        imageBase64: base64,
        mimeType: file.type || "image/jpeg",
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, [bookingId, uploadImageMutation]);

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages]);

  // Fallback polling: if WebSocket disconnected, poll every 10s
  useEffect(() => {
    if (wsStatus !== "connected" && bookingId && user) {
      const interval = setInterval(() => refetch(), 10000);
      return () => clearInterval(interval);
    }
  }, [wsStatus, bookingId, user, refetch]);

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
  const displayMessages = localMessages;

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
            {/* WebSocket 連線狀態指示 */}
            <div className="flex-shrink-0" title={wsStatus === "connected" ? "即時連線中" : "連線中斷，使用備援輪詢"}>
              {wsStatus === "connected" ? (
                <Wifi className="w-4 h-4 text-emerald-400" />
              ) : wsStatus === "connecting" ? (
                <Wifi className="w-4 h-4 text-amber-400 animate-pulse" />
              ) : (
                <WifiOff className="w-4 h-4 text-muted-foreground/50" />
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
        ) : displayMessages.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground/20" />
            <p className="text-muted-foreground text-sm">尚無訊息</p>
            <p className="text-xs text-muted-foreground/60">
              您可以在此詢問命理師關於服務的問題
            </p>
          </div>
        ) : (
          displayMessages.map((msg) => {
            const isMe = msg.senderId === user.id;
            const timeStr = new Date(msg.createdAt).toLocaleTimeString("zh-TW", {
              hour: "2-digit", minute: "2-digit",
            });
            const dateStr = new Date(msg.createdAt).toLocaleDateString("zh-TW", {
              month: "short", day: "numeric",
            });
            return (
              <div key={msg.id} className={`flex items-end gap-2 ${
                isMe ? "justify-end" : "justify-start"
              }`}>
                {!isMe && (
                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-bold shrink-0 mb-0.5 text-foreground">
                    {(msg.senderName ?? "專")?.[0]}
                  </div>
                )}
                <div className={`max-w-[72%] space-y-0.5 flex flex-col ${
                  isMe ? "items-end" : "items-start"
                }`}>
                  {!isMe && (
                    <p className="text-xs text-muted-foreground px-1">{msg.senderName ?? "對方"}</p>
                  )}
                  {msg.imageUrl && (
                    <div className={`rounded-2xl overflow-hidden max-w-[240px] ${
                      isMe ? "rounded-br-sm" : "rounded-bl-sm"
                    }`}>
                      <img
                        src={msg.imageUrl}
                        alt="聊天圖片"
                        className="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(msg.imageUrl!, "_blank")}
                        loading="lazy"
                      />
                    </div>
                  )}
                  {(!msg.imageUrl || (msg.content && msg.content !== "🖼️ 圖片訊息")) && (
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isMe
                          ? "bg-amber-500 text-black rounded-br-sm"
                          : "bg-accent text-foreground rounded-bl-sm"
                      }`}
                    >
                      {msg.content}
                    </div>
                  )}
                  <div className={`flex items-center gap-1.5 px-1 ${
                    isMe ? "justify-end" : "justify-start"
                  }`}>
                    <p className="text-[11px] text-muted-foreground/50">
                      {dateStr} {timeStr}
                    </p>
                    {isMe && (
                      <span className={`text-[11px] font-medium ${
                        msg.isRead ? "text-amber-400" : "text-muted-foreground/40"
                      }`}>
                        {msg.isRead ? "已讀" : "✓"}
                      </span>
                    )}
                  </div>
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
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <Button
                variant="outline"
                size="icon"
                className="flex-shrink-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadImageMutation.isPending}
                title="發送圖片"
              >
                {uploadImageMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ImagePlus className="w-4 h-4" />
                )}
              </Button>
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
