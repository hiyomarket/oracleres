import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { sendMorningBriefing } from "../lib/morningBriefing";
import { checkAndNotifyFestival } from "../lib/festivalNotification";
import { checkExpiringSubscriptions } from "../lib/expiryReminder";
import { checkAndLockWbcMatches } from "../lib/wbcMatchLock";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);

/**
 * 每日晨報排程：台灣時間早上 7:00（UTC 23:00）
 * 每分鐘檢查一次，判斷是否到達台灣時間 07:00
 */
let lastBriefingDate = "";

function startMorningBriefingScheduler() {
  console.log("[MorningBriefing] Scheduler started. Will send daily at 07:00 Taiwan time.");
  setInterval(async () => {
    try {
      // 取得台灣時間
      const twNow = new Date(Date.now() + 8 * 60 * 60 * 1000);
      const twHour = twNow.getUTCHours();
      const twMinute = twNow.getUTCMinutes();
      const twDateStr = twNow.toISOString().split('T')[0];

      // 台灣時間 07:00 ~ 07:04 且今日尚未發送
      if (twHour === 7 && twMinute < 5 && lastBriefingDate !== twDateStr) {
        lastBriefingDate = twDateStr;
        console.log(`[MorningBriefing] Triggering morning briefing for ${twDateStr}`);
        await sendMorningBriefing();
      }
    } catch (err) {
      console.error("[MorningBriefing] Scheduler error:", err);
    }
  }, 60 * 1000); // 每分鐘檢查
}

startMorningBriefingScheduler();

/**
 * 農曆節日通知排程：台灣時間每日 23:00 檢查明天是否為農曆節日
 * 若是則發送 Mail 通知
 */
let lastFestivalCheckDate = "";

function startFestivalNotificationScheduler() {
  console.log("[FestivalNotification] Scheduler started. Will check daily at 23:00 Taiwan time.");
  setInterval(async () => {
    try {
      const twNow = new Date(Date.now() + 8 * 60 * 60 * 1000);
      const twHour = twNow.getUTCHours();
      const twMinute = twNow.getUTCMinutes();
      const twDateStr = twNow.toISOString().split('T')[0];
      // 台灣時間 23:00 ~ 23:04 且今日尚未檢查
      if (twHour === 23 && twMinute < 5 && lastFestivalCheckDate !== twDateStr) {
        lastFestivalCheckDate = twDateStr;
        console.log(`[FestivalNotification] Checking festival for tomorrow (${twDateStr})`);
        await checkAndNotifyFestival();
      }
    } catch (err) {
      console.error("[FestivalNotification] Scheduler error:", err);
    }
  }, 60 * 1000); // 每分鐘檢查
}

startFestivalNotificationScheduler();

/**
 * 訂閱到期提醒：台灣時間每日 09:00 檢查 7 天內即將到期用戶
 */
let lastExpiryCheckDate = "";

function startExpiryReminderScheduler() {
  console.log("[ExpiryReminder] Scheduler started. Will check daily at 09:00 Taiwan time.");
  setInterval(async () => {
    try {
      const twNow = new Date(Date.now() + 8 * 60 * 60 * 1000);
      const twHour = twNow.getUTCHours();
      const twMinute = twNow.getUTCMinutes();
      const twDateStr = twNow.toISOString().split('T')[0];
      // 台灣時間 09:00 ~ 09:04 且今日尚未檢查
      if (twHour === 9 && twMinute < 5 && lastExpiryCheckDate !== twDateStr) {
        lastExpiryCheckDate = twDateStr;
        console.log(`[ExpiryReminder] Running expiry check for ${twDateStr}`);
        await checkExpiringSubscriptions();
      }
    } catch (err) {
      console.error("[ExpiryReminder] Scheduler error:", err);
    }
  }, 60 * 1000); // 每分鐘檢查
}

startExpiryReminderScheduler();

/**
 * WBC 賽事下注截止排程：每分鐘掃描 pending 賽事
 * 比賽開始前 30 分鐘自動將狀態改為 live（鎖定下注）
 */
function startWbcMatchLockScheduler() {
  console.log("[WbcMatchLock] Scheduler started. Will lock matches 30 min before start.");
  setInterval(async () => {
    try {
      await checkAndLockWbcMatches();
    } catch (err) {
      console.error("[WbcMatchLock] Scheduler error:", err);
    }
  }, 60 * 1000); // 每分鐘檢查
}

startWbcMatchLockScheduler();
