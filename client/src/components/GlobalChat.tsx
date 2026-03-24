/**
 * GlobalChat.tsx — 全服聊天室組件
 * WebSocket 即時接收 + HTTP fallback 輪詢
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, MessageCircle, ChevronDown, ChevronUp, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { useGameWebSocket } from "@/hooks/useGameWebSocket";

// 五行顏色映射
const ELEMENT_COLORS: Record<string, string> = {
  wood: "text-green-400",
  fire: "text-red-400",
  earth: "text-yellow-500",
  metal: "text-gray-300",
  water: "text-blue-400",
};

const ELEMENT_BADGE: Record<string, string> = {
  wood: "bg-green-900/60 text-green-300 border-green-700",
  fire: "bg-red-900/60 text-red-300 border-red-700",
  earth: "bg-yellow-900/60 text-yellow-300 border-yellow-700",
  metal: "bg-gray-700/60 text-gray-200 border-gray-500",
  water: "bg-blue-900/60 text-blue-300 border-blue-700",
};

const ELEMENT_LABELS: Record<string, string> = {
  wood: "木", fire: "火", earth: "土", metal: "金", water: "水",
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
}

interface ChatMessageItem {
  id: number;
  agentId: number;
  agentName: string;
  agentElement: string;
  agentLevel: number;
  content: string;
  msgType: "normal" | "system" | "world_event";
  createdAt: number;
  agentTitle?: string | null;
}

interface GlobalChatProps {
  collapsed?: boolean;
  agentId?: number | null;
  agentName?: string | null;
}

export function GlobalChat({ collapsed: initCollapsed = false, agentId, agentName }: GlobalChatProps) {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(initCollapsed);
  const [input, setInput] = useState("");
  const [wsMessages, setWsMessages] = useState<ChatMessageItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();
  const isAtBottomRef = useRef(true);

  // WebSocket 連線
  const handleWsMessage = useCallback((msg: { type: string; payload: unknown }) => {
    if (msg.type === "chat_message") {
      const chatMsg = msg.payload as ChatMessageItem;
      setWsMessages((prev) => {
        if (prev.some((m) => m.id === chatMsg.id)) return prev;
        return [...prev.slice(-99), chatMsg];
      });
    }
    // live_feed 事件：轉化為聊天室系統訊息（讓全服動態在聊天室也能看到）
    if (msg.type === "live_feed") {
      const feed = msg.payload as {
        feedType: string; agentName: string; detail: string; ts: number;
      };
      if (!feed?.feedType || !feed?.agentName) return;
      const feedIcons: Record<string, string> = {
        level_up: "⬆️", achievement_unlock: "🏅", legendary_drop: "💎",
        pvp_win: "⚔️", weekly_champion: "👑", world_event: "🌍",
      };
      const icon = feedIcons[feed.feedType] ?? "✨";
      const syntheticMsg: ChatMessageItem = {
        id: -(feed.ts + Math.floor(Math.random() * 10000)),
        agentId: 0,
        agentName: `${icon} 天命廣播`,
        agentElement: "water",
        agentLevel: 0,
        agentTitle: null,
        content: `${feed.agentName} ${feed.detail}`,
        msgType: "world_event",
        createdAt: feed.ts,
      };
      setWsMessages((prev) => {
        if (prev.some((m) => m.id === syntheticMsg.id)) return prev;
        return [...prev.slice(-99), syntheticMsg];
      });
    }
  }, []);

  const { status: wsStatus } = useGameWebSocket({
    agentId,
    agentName,
    onMessage: handleWsMessage,
    enabled: true,
  });

  const isWsConnected = wsStatus === "connected";

  // HTTP 初始載入（最近 50 條）
  const { data: initialMessages = [] } = trpc.gameWorld.getChatMessages.useQuery(
    { since: undefined },
    {
      // WS 已連線時降低輪詢頻率；斷線時每 5 秒輪詢
      refetchInterval: isWsConnected ? 30000 : 5000,
      staleTime: 3000,
    }
  );

  // 合併 HTTP 初始訊息和 WS 即時訊息
  const allMessages = (() => {
    const map = new Map<number, ChatMessageItem>();
    for (const m of initialMessages as ChatMessageItem[]) map.set(m.id, m);
    for (const m of wsMessages) map.set(m.id, m);
    return Array.from(map.values()).sort((a, b) => a.createdAt - b.createdAt).slice(-50);
  })();

  // 追蹤是否在底部
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 40;
  };

  // 新訊息到達時自動滾到底部（若已在底部）
  useEffect(() => {
    if (!collapsed && scrollRef.current && isAtBottomRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [allMessages, collapsed]);

  // 發送訊息
  const sendMsg = trpc.gameWorld.sendChatMessage.useMutation({
    onSuccess: () => {
      setInput("");
      utils.gameWorld.getChatMessages.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "發送失敗");
    },
  });

  const handleSend = () => {
    const content = input.trim();
    if (!content) return;
    if (content.length > 100) {
      toast.error("訊息最多 100 字");
      return;
    }
    sendMsg.mutate({ content });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col bg-black/40 border border-white/10 rounded-xl overflow-hidden backdrop-blur-sm">
      {/* 標題列 */}
      <button
        className="flex items-center justify-between px-4 py-2.5 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium text-amber-300">全服聊天室</span>
          <span className="text-xs text-white/40">{allMessages.length} 則</span>
          {/* WS 連線狀態指示 */}
          {isWsConnected ? (
            <span className="flex items-center gap-1 text-[10px] text-green-400">
              <Wifi className="w-3 h-3" />
              即時
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-yellow-500">
              <WifiOff className="w-3 h-3" />
              輪詢
            </span>
          )}
        </div>
        {collapsed ? (
          <ChevronDown className="w-4 h-4 text-white/40" />
        ) : (
          <ChevronUp className="w-4 h-4 text-white/40" />
        )}
      </button>

      {/* 聊天內容 */}
      {!collapsed && (
        <>
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="h-48 overflow-y-auto px-3 py-2 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10"
          >
            {allMessages.length === 0 ? (
              <p className="text-center text-white/30 text-xs py-8">尚無訊息，成為第一個發言的旅人！</p>
            ) : (
              allMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2 text-xs ${
                    msg.msgType === "system" || msg.msgType === "world_event"
                      ? "bg-amber-900/20 border border-amber-700/30 rounded px-2 py-1"
                      : ""
                  }`}
                >
                  {msg.msgType === "normal" ? (
                    <>
                      <span className="text-white/30 shrink-0 mt-0.5">{formatTime(msg.createdAt)}</span>
                      <span className={`shrink-0 font-medium ${ELEMENT_COLORS[msg.agentElement] ?? "text-white"}`}>
                        {msg.agentName}
                      </span>
                      <span className={`shrink-0 text-[10px] px-1 py-0.5 rounded border ${ELEMENT_BADGE[msg.agentElement] ?? ""}`}>
                        Lv.{msg.agentLevel} {ELEMENT_LABELS[msg.agentElement] ?? ""}
                      </span>
                      {msg.agentTitle && (
                        <span className="shrink-0 text-[10px] px-1 py-0.5 rounded border bg-purple-900/40 text-purple-300 border-purple-700/50">
                          {msg.agentTitle}
                        </span>
                      )}
                      <span className="text-white/80 break-all">{msg.content}</span>
                    </>
                  ) : msg.msgType === "world_event" ? (
                    // 全服動態（live_feed）樣式：金色橫幅
                    <>
                      <span className="shrink-0 text-amber-300 font-bold text-[10px] px-1.5 py-0.5 rounded bg-amber-900/40 border border-amber-600/40">
                        {msg.agentName}
                      </span>
                      <span className="text-amber-200/90 break-all font-medium">{msg.content}</span>
                    </>
                  ) : (
                    // 系統訊息（system）樣式
                    <>
                      <span className="text-amber-400">🌐</span>
                      <span className="text-amber-300 break-all">{msg.content}</span>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          {/* 輸入列 */}
          <div className="flex gap-2 px-3 py-2 border-t border-white/10">
            {user ? (
              <>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="輸入訊息（最多100字）..."
                  maxLength={100}
                  className="flex-1 h-8 text-xs bg-white/5 border-white/20 text-white placeholder:text-white/30 focus:border-amber-500/50"
                />
                <Button
                  size="sm"
                  onClick={handleSend}
                  disabled={!input.trim() || sendMsg.isPending}
                  className="h-8 w-8 p-0 bg-amber-600 hover:bg-amber-500 text-white shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </>
            ) : (
              <p className="text-xs text-white/30 py-1">請先登入才能發言</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
