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
  | "pvp_challenge"       // PVP 挑戰請求（發送給被挑戰者）
  | "pvp_challenge_response" // PVP 挑戰回應（接受/拒絕/逾時）
  | "pvp_challenge_cancelled" // PVP 挑戰取消（逾時自動取消）
  | "live_feed"       // 全服即時動態（升級/成就/傳說掉落/PvP勝利/週冠軍）
  | "achievement_unlock" // 專屬成就解鎖通知（僅發送給解鎖者）
  | "expert_chat_new"   // 專家聊天室新訊息通知
  | "expert_chat_read"  // 專家聊天室已讀通知
  | "expert_chat_join"  // 加入專家聊天室房間
  | "expert_chat_leave" // 離開專家聊天室房間
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
  userId: number | null;  // 用戶 ID（用於專家聊天室）
  isAlive: boolean;
  /** 已加入的聊天室房間（bookingId set） */
  chatRooms: Set<number>;
}

// 全域連線表（agentId → client）
const clients = new Map<string, ConnectedClient>();
// 匿名連線（尚未認證）
const anonClients = new Set<ConnectedClient>();
// 用戶 ID → client 映射（用於專家聊天室）
const userClients = new Map<number, Set<ConnectedClient>>();
// 聊天室房間（bookingId → Set<ConnectedClient>）
const chatRooms = new Map<number, Set<ConnectedClient>>();

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
      userId: null,
      isAlive: true,
      chatRooms: new Set(),
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
      cleanupClient(client);
    });

    ws.on("error", () => {
      cleanupClient(client);
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
      // 客戶端認證：帶入 agentId 和/或 userId
      const { agentId, agentName, userId } = msg.payload as { agentId?: number; agentName?: string; userId?: number };
      if (agentId && agentName) {
        client.agentId = agentId;
        client.agentName = agentName;
        anonClients.delete(client);
        clients.set(String(agentId), client);
      }
      if (userId) {
        client.userId = userId;
        anonClients.delete(client);
        if (!userClients.has(userId)) userClients.set(userId, new Set());
        userClients.get(userId)!.add(client);
      }
      break;
    }

    case "expert_chat_join": {
      const { bookingId } = msg.payload as { bookingId: number };
      if (bookingId && client.userId) {
        client.chatRooms.add(bookingId);
        if (!chatRooms.has(bookingId)) chatRooms.set(bookingId, new Set());
        chatRooms.get(bookingId)!.add(client);
      }
      break;
    }

    case "expert_chat_leave": {
      const { bookingId: leaveId } = msg.payload as { bookingId: number };
      if (leaveId) {
        client.chatRooms.delete(leaveId);
        chatRooms.get(leaveId)?.delete(client);
        if (chatRooms.get(leaveId)?.size === 0) chatRooms.delete(leaveId);
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

/**
 * 清理斷線的 client（從所有映射表中移除）
 */
function cleanupClient(client: ConnectedClient) {
  if (client.agentId !== null) {
    clients.delete(String(client.agentId));
  }
  if (client.userId !== null) {
    const userSet = userClients.get(client.userId);
    if (userSet) {
      userSet.delete(client);
      if (userSet.size === 0) userClients.delete(client.userId);
    }
  }
  // 從所有聊天室移除
  for (const roomId of client.chatRooms) {
    const room = chatRooms.get(roomId);
    if (room) {
      room.delete(client);
      if (room.size === 0) chatRooms.delete(roomId);
    }
  }
  client.chatRooms.clear();
  anonClients.delete(client);
}

/**
 * 向特定聊天室（bookingId）中的所有 client 廣播訊息
 * excludeUserId: 排除發送者自己（避免重複顯示）
 */
export function broadcastToChatRoom(bookingId: number, msg: WsMessage, excludeUserId?: number) {
  const room = chatRooms.get(bookingId);
  if (!room) return;
  for (const client of room) {
    if (excludeUserId && client.userId === excludeUserId) continue;
    sendToClient(client, msg);
  }
}

/**
 * 向特定 userId 的所有連線發送訊息（用於通知不在聊天室的用戶有新訊息）
 */
export function sendToUser(userId: number, msg: WsMessage) {
  const userSet = userClients.get(userId);
  if (!userSet) return;
  for (const client of userSet) {
    sendToClient(client, msg);
  }
}
