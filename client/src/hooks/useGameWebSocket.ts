/**
 * useGameWebSocket.ts
 * WebSocket 客戶端 Hook
 * - 自動連線/重連
 * - 認證（帶入 agentId）
 * - 訊息事件分發
 * - 降級：斷線時回到輪詢模式
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

export function useGameWebSocket({
  agentId,
  agentName,
  onMessage,
  enabled = true,
}: UseGameWebSocketOptions) {
  const [status, setStatus] = useState<WsStatus>("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    if (!enabled) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    // 建立 WebSocket URL（同域，路徑 /ws）
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    setStatus("connecting");
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
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
        if (msg.type === "ping") {
          ws.send(JSON.stringify({ type: "pong", payload: {} }));
          return;
        }
        onMessageRef.current?.(msg);
      } catch {
        // 忽略非 JSON
      }
    };

    ws.onclose = () => {
      setStatus("disconnected");
      wsRef.current = null;
      // 5 秒後重連
      if (enabled) {
        reconnectTimerRef.current = setTimeout(connect, 5000);
      }
    };

    ws.onerror = () => {
      setStatus("error");
      ws.close();
    };
  }, [enabled, agentId, agentName]);

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

  const send = useCallback((msg: WsMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { status, send };
}
