/**
 * useChatWebSocket.ts
 * 專家聊天室 WebSocket Hook
 *
 * 功能：
 * - 自動加入/離開聊天室房間（基於 bookingId）
 * - 接收即時新訊息（expert_chat_new）
 * - 接收已讀通知（expert_chat_read）
 * - 複用現有 /ws 連線，透過 userId 認證
 * - 頁面可見性感知：切回前景時自動重連
 * - 指數退避重連機制
 */
import { useEffect, useRef, useState, useCallback } from "react";

export interface ChatMessage {
  id: number;
  bookingId: number;
  senderId: number;
  senderName: string;
  content: string;
  imageUrl?: string | null;
  createdAt: string;
  isRead?: number;
  readAt?: string | null;
}

type WsStatus = "connecting" | "connected" | "disconnected" | "error";

interface UseChatWebSocketOptions {
  userId: number | null | undefined;
  userName?: string | null;
  bookingId: number | null;
  enabled?: boolean;
  onNewMessage?: (msg: ChatMessage) => void;
  onReadNotify?: (payload: { bookingId: number; readerId: number }) => void;
}

const BASE_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 30000;

export function useChatWebSocket({
  userId,
  userName,
  bookingId,
  enabled = true,
  onNewMessage,
  onReadNotify,
}: UseChatWebSocketOptions) {
  const [status, setStatus] = useState<WsStatus>("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const onNewMessageRef = useRef(onNewMessage);
  const onReadNotifyRef = useRef(onReadNotify);
  onNewMessageRef.current = onNewMessage;
  onReadNotifyRef.current = onReadNotify;

  const bookingIdRef = useRef(bookingId);
  bookingIdRef.current = bookingId;

  const getReconnectDelay = () => {
    const delay = Math.min(
      BASE_RECONNECT_MS * Math.pow(2, reconnectAttemptsRef.current),
      MAX_RECONNECT_MS
    );
    return delay + Math.random() * 500;
  };

  const connect = useCallback(() => {
    if (!enabled || !userId) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    setStatus("connecting");
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      reconnectAttemptsRef.current = 0;

      // 認證：發送 userId
      ws.send(JSON.stringify({
        type: "connected",
        payload: { userId, agentName: userName },
      }));

      // 加入聊天室房間
      if (bookingIdRef.current) {
        ws.send(JSON.stringify({
          type: "expert_chat_join",
          payload: { bookingId: bookingIdRef.current },
        }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "ping") {
          ws.send(JSON.stringify({ type: "pong", payload: {} }));
          return;
        }

        if (msg.type === "expert_chat_new" && msg.payload) {
          const chatMsg = msg.payload as ChatMessage;
          // 只處理當前聊天室的訊息
          if (chatMsg.bookingId === bookingIdRef.current) {
            onNewMessageRef.current?.(chatMsg);
          }
        }

        if (msg.type === "expert_chat_read" && msg.payload) {
          onReadNotifyRef.current?.(msg.payload as { bookingId: number; readerId: number });
        }
      } catch {
        // 忽略非 JSON
      }
    };

    ws.onclose = () => {
      setStatus("disconnected");
      wsRef.current = null;
      if (enabled) {
        const delay = getReconnectDelay();
        reconnectAttemptsRef.current++;
        reconnectTimerRef.current = setTimeout(connect, delay);
      }
    };

    ws.onerror = () => {
      setStatus("error");
      ws.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, userId, userName]);

  // 初始連線
  useEffect(() => {
    if (enabled && userId) {
      connect();
    }
    return () => {
      // 離開聊天室
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && bookingIdRef.current) {
        wsRef.current.send(JSON.stringify({
          type: "expert_chat_leave",
          payload: { bookingId: bookingIdRef.current },
        }));
      }
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect, enabled, userId]);

  // bookingId 變更時切換房間
  useEffect(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    // 加入新房間
    if (bookingId) {
      wsRef.current.send(JSON.stringify({
        type: "expert_chat_join",
        payload: { bookingId },
      }));
    }
    return () => {
      // 離開舊房間
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && bookingId) {
        wsRef.current.send(JSON.stringify({
          type: "expert_chat_leave",
          payload: { bookingId },
        }));
      }
    };
  }, [bookingId]);

  // 頁面可見性感知
  useEffect(() => {
    if (!enabled || !userId) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
          if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
          reconnectAttemptsRef.current = 0;
          connect();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [enabled, userId, connect]);

  return { status };
}
