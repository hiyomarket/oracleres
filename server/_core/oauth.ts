import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      // 在 upsert 前先查詢是否為新用戶（用於迎新活動觸發）
      const existingUser = await db.getUserByOpenId(userInfo.openId);
      const isNewUser = !existingUser;

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      // 新用戶：自動套用默認迎新活動
      if (isNewUser) {
        // 取得剛建立的用戶 ID
        const newUser = await db.getUserByOpenId(userInfo.openId);
        if (newUser) {
          // 首先嘗試套用活動方案
          const result = await db.applyDefaultOnboardingCampaign(newUser.id);
          if (result.applied) {
            console.log(`[OAuth] New user #${newUser.id} received onboarding campaign: ${result.campaignName}`);
          } else {
            // 沒有活動時，預設分配基礎方案
            await db.setUserPlan(newUser.id, 'basic', null);
            console.log(`[OAuth] New user #${newUser.id} assigned default basic plan`);
          }
        }
      }

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
