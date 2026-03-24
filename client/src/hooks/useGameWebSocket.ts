/**
 * useGameWebSocket.ts
 * WebSocket 客戶端 Hook（V33 升級版）
 *
 * 新增功能：
 * - latestMessage：最新收到的訊息（供 LiveFeedContainer/AchievementToast 使用）
 * - 指數退避重連（1s → 2s → 4s → 8s → 16s，最長 30s）
 * - 連線狀態指示（connecting/connected/disconnected/error）
 * - live_feed 事件自動分發
 * - 頁面可見性感知（切換回前景時立即重連）
 */
import { useEffect, useRef, useState, useCallback } from "react";

export type WsStatus = "connecting" | "connected" | "disconnected" | "error";

export interface WsMessage {
  type: string;
  payload: unknown;
  ts?: number;
}

interface UseGameWebSocketOptions {
  agentId?: number | null;
  agentName?: string | null;
  onMessage?: (msg: WsMessage) => void;
  enabled?: boolean;
}

const BASE_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 30000;

export function useGameWebSocket({
  agentId,
  agentName,
  onMessage,
  enabled = true,
}: UseGameWebSocketOptions) {
  const [status, setStatus] = useState<WsStatus>("disconnected");
  const [latestMessage, setLatestMessage] = useState<WsMessage | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  // 計算退避延遲
  const getReconnectDelay = () => {
    const delay = Math.min(
      BASE_RECONNECT_MS * Math.pow(2, reconnectAttemptsRef.current),
      MAX_RECONNECT_MS
    );
    return delay + Math.random() * 500; // 加入 jitter 避免雷群效應
  };

  const connect = useCallback(() => {
    if (!enabled) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) return;

    // 建立 WebSocket URL（同域，路徑 /ws）
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    setStatus("connecting");
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      reconnectAttemptsRef.current = 0; // 重置退避計數

      // 認證：發送 agentId
      if (agentId && agentName) {
        ws.send(JSON.stringify({
          type: "connected",
          payload: { agentId, agentName },
        }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);

        // 處理 ping/pong
        if (msg.type === "ping") {
          ws.send(JSON.stringify({ type: "pong", payload: {} }));
          return;
        }

        // 更新最新訊息（供 LiveFeedContainer/AchievementToast 使用）
        setLatestMessage({ ...msg, ts: msg.ts ?? Date.now() });

        // 分發給外部 onMessage handler
        onMessageRef.current?.(msg);
      } catch {
        // 忽略非 JSON
      }
    };

    ws.onclose = () => {
      setStatus("disconnected");
      wsRef.current = null;

      // 指數退避重連
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
  }, [enabled, agentId, agentName]);

  // 初始連線
  useEffect(() => {
    if (enabled) {
      connect();
    }
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect, enabled]);

  // agentId 變更時重新認證
  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && agentId && agentName) {
      wsRef.current.send(JSON.stringify({
        type: "connected",
        payload: { agentId, agentName },
      }));
    }
  }, [agentId, agentName]);

  // 頁面可見性感知：切換回前景時立即重連
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
          if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
          reconnectAttemptsRef.current = 0; // 重置退避，立即重連
          connect();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [enabled, connect]);

  const send = useCallback((msg: WsMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { status, send, latestMessage };
}
