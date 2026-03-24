/**
 * WebSocket 伺服器
 * 負責：連線管理、認證、房間廣播、心跳機制
 *
 * 訊息類型：
 *   chat_message    - 全服聊天訊息
 *   map_update      - 地圖玩家狀態更新
 *   tick_event      - Tick 執行事件（升級/傳說掉落/成就）
 *   world_event     - 世界事件廣播
 *   achievement     - 成就解鎖通知
 *   pvp_result      - PvP 挑戰結果
 *   ping / pong     - 心跳
 */

import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";

export type WsMessageType =
  | "chat_message"
  | "map_update"
  | "tick_event"
  | "world_event"
  | "achievement"
  | "pvp_result"
  | "live_feed"       // 全服即時動態（升級/成就/傳說掉落/PvP勝利/週冠軍）
  | "achievement_unlock" // 專屬成就解鎖通知（僅發送給解鎖者）
  | "ping"
  | "pong"
  | "connected"
  | "error";

export interface WsMessage {
  type: WsMessageType;
  payload: unknown;
  ts?: number;
}

interface ConnectedClient {
  ws: WebSocket;
  agentId: number | null;
  agentName: string | null;
  isAlive: boolean;
}

// 全域連線表（agentId → client）
const clients = new Map<string, ConnectedClient>();
// 匿名連線（尚未認證）
const anonClients = new Set<ConnectedClient>();

let wss: WebSocketServer | null = null;

/**
 * 初始化 WebSocket 伺服器，掛載在既有 HTTP server 上
 */
export function initWsServer(httpServer: Server): WebSocketServer {
  wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws: WebSocket) => {
    const client: ConnectedClient = {
      ws,
      agentId: null,
      agentName: null,
      isAlive: true,
    };
    anonClients.add(client);

    // 發送歡迎訊息
    sendToClient(client, { type: "connected", payload: { message: "WebSocket 連線成功" } });

    ws.on("message", (raw) => {
      try {
        const msg: WsMessage = JSON.parse(raw.toString());
        handleMessage(client, msg);
      } catch {
        // 忽略非 JSON 訊息
      }
    });

    ws.on("pong", () => {
      client.isAlive = true;
    });

    ws.on("close", () => {
      // 清除連線
      if (client.agentId !== null) {
        clients.delete(String(client.agentId));
      }
      anonClients.delete(client);
    });

    ws.on("error", () => {
      if (client.agentId !== null) {
        clients.delete(String(client.agentId));
      }
      anonClients.delete(client);
    });
  });

  // 心跳機制：每 30 秒 ping 所有連線
  const heartbeatInterval = setInterval(() => {
    const allClients: ConnectedClient[] = [
      ...Array.from(clients.values()),
      ...Array.from(anonClients.values()),
    ];
    for (const client of allClients) {
      if (!client.isAlive) {
        client.ws.terminate();
        if (client.agentId !== null) clients.delete(String(client.agentId));
        anonClients.delete(client);
        continue;
      }
      client.isAlive = false;
      try {
        client.ws.ping();
      } catch {
        // 忽略
      }
    }
  }, 30_000);

  wss.on("close", () => clearInterval(heartbeatInterval));

  console.log("[WsServer] WebSocket 伺服器已啟動，路徑：/ws");
  return wss;
}

/**
 * 處理收到的訊息
 */
function handleMessage(client: ConnectedClient, msg: WsMessage) {
  switch (msg.type) {
    case "ping":
      sendToClient(client, { type: "pong", payload: { ts: Date.now() } });
      break;

    case "connected": {
      // 客戶端認證：帶入 agentId
      const { agentId, agentName } = msg.payload as { agentId?: number; agentName?: string };
      if (agentId && agentName) {
        client.agentId = agentId;
        client.agentName = agentName;
        anonClients.delete(client);
        clients.set(String(agentId), client);
      }
      break;
    }

    default:
      break;
  }
}

/**
 * 向單一 client 發送訊息
 */
function sendToClient(client: ConnectedClient, msg: WsMessage) {
  if (client.ws.readyState === WebSocket.OPEN) {
    try {
      client.ws.send(JSON.stringify({ ...msg, ts: msg.ts ?? Date.now() }));
    } catch {
      // 忽略發送錯誤
    }
  }
}

/**
 * 向特定 agentId 發送訊息
 */
export function sendToAgent(agentId: number, msg: WsMessage) {
  const client = clients.get(String(agentId));
  if (client) sendToClient(client, msg);
}

/**
 * 向所有已認證的連線廣播訊息
 */
export function broadcastToAll(msg: WsMessage) {
  for (const client of Array.from(clients.values())) {
    sendToClient(client, msg);
  }
}

/**
 * 向所有連線（含未認證）廣播訊息（用於聊天等公開訊息）
 */
export function broadcastToAllIncludingAnon(msg: WsMessage) {
  const allClients: ConnectedClient[] = [
    ...Array.from(clients.values()),
    ...Array.from(anonClients.values()),
  ];
  for (const client of allClients) {
    sendToClient(client, msg);
  }
}

/**
 * 取得目前在線人數
 */
export function getOnlineCount(): number {
  return clients.size;
}

/**
 * 取得目前在線 agentId 列表
 */
export function getOnlineAgentIds(): number[] {
  return Array.from(clients.keys()).map(Number);
}
