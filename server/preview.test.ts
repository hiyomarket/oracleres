/**
 * preview.test.ts
 * 測試 /api/preview 公開體驗 API 端點
 * 確認命格推算、錯誤處理、回傳結構正確
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { handlePreviewRequest } from "./routes/preview";

// 建立測試用 Express app
function createTestApp() {
  const app = express();
  app.get("/api/preview", handlePreviewRequest);
  return app;
}

describe("/api/preview 公開體驗 API", () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    app = createTestApp();
  });

  describe("參數驗證", () => {
    it("缺少 birth 參數時應回傳 400", async () => {
      const res = await request(app).get("/api/preview");
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("missing_birth");
    });

    it("birth 格式錯誤時應回傳 400", async () => {
      const res = await request(app).get("/api/preview?birth=invalid");
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("invalid_birth_format");
    });

    it("birth 格式不完整時應回傳 400", async () => {
      const res = await request(app).get("/api/preview?birth=1990-05");
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("invalid_birth_format");
    });

    it("年份超出範圍（2020年）時應回傳 400", async () => {
      const res = await request(app).get("/api/preview?birth=2020-01-01");
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("birth_out_of_range");
    });

    it("年份超出範圍（1919年）時應回傳 400", async () => {
      const res = await request(app).get("/api/preview?birth=1919-12-31");
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("birth_out_of_range");
    });
  });

  describe("正常命格推算", () => {
    it("1984-11-26 應成功推算甲木命格", async () => {
      const res = await request(app).get("/api/preview?birth=1984-11-26");
      expect(res.status).toBe(200);

      const body = res.body;
      expect(body.birth).toBe("1984-11-26");

      // 八字四柱
      expect(body.bazi).toBeDefined();
      expect(body.bazi.yearPillar).toBe("甲子");
      expect(body.bazi.monthPillar).toBe("乙亥");
      expect(body.bazi.dayPillar).toBe("甲子");
      expect(body.bazi.hourPillar).toContain("??");

      // 日主
      expect(body.dayMaster).toBeDefined();
      expect(body.dayMaster.stem).toBe("甲");
      expect(body.dayMaster.element).toBe("木");
      expect(body.dayMaster.description).toContain("甲");

      // 命格關鍵字
      expect(body.destinyKeyword).toBeTruthy();
      expect(typeof body.destinyKeyword).toBe("string");
    });

    it("1990-05-15 應成功推算庚金命格", async () => {
      const res = await request(app).get("/api/preview?birth=1990-05-15");
      expect(res.status).toBe(200);

      const body = res.body;
      expect(body.dayMaster.element).toBe("金");
      expect(body.dayMaster.stem).toBe("庚");
    });

    it("回傳資料應包含今日運勢", async () => {
      const res = await request(app).get("/api/preview?birth=1985-06-20");
      expect(res.status).toBe(200);

      const body = res.body;
      expect(body.todayEnergy).toBeDefined();
      expect(body.todayEnergy.level).toMatch(/^(excellent|good|neutral|challenging|complex)$/);
      expect(body.todayEnergy.description).toBeTruthy();
      expect(body.todayEnergy.date).toMatch(/\d{4}年\d{1,2}月\d{1,2}日/);
      expect(body.todayEnergy.dayPillar).toHaveLength(2);
    });

    it("回傳資料應包含五行比例（前三強）", async () => {
      const res = await request(app).get("/api/preview?birth=1975-03-10");
      expect(res.status).toBe(200);

      const body = res.body;
      expect(body.elementBalance).toBeDefined();
      expect(body.elementBalance.dominant).toBeInstanceOf(Array);
      expect(body.elementBalance.dominant.length).toBeLessThanOrEqual(3);

      for (const item of body.elementBalance.dominant) {
        expect(item.element).toMatch(/^[木火土金水]$/);
        expect(typeof item.percent).toBe("number");
        expect(item.percent).toBeGreaterThanOrEqual(0);
        expect(item.percent).toBeLessThanOrEqual(100);
      }
    });

    it("回傳資料應包含幸運五行", async () => {
      const res = await request(app).get("/api/preview?birth=1992-08-08");
      expect(res.status).toBe(200);

      const body = res.body;
      expect(body.luckyElement).toBeDefined();
      expect(body.luckyElement.element).toMatch(/^[木火土金水]$/);
      expect(body.luckyElement.color).toBeTruthy();
      expect(body.luckyElement.direction).toBeTruthy();
    });

    it("回傳資料應包含引導 CTA", async () => {
      const res = await request(app).get("/api/preview?birth=1988-12-25");
      expect(res.status).toBe(200);

      const body = res.body;
      expect(body.teaser).toBeTruthy();
      expect(body.cta).toBeDefined();
      expect(body.cta.message).toBeTruthy();
      expect(body.cta.registerUrl).toBeTruthy();
    });

    it("回傳資料應包含今日建議", async () => {
      const res = await request(app).get("/api/preview?birth=1995-01-01");
      expect(res.status).toBe(200);

      const body = res.body;
      expect(body.todayAdvice).toBeTruthy();
      expect(typeof body.todayAdvice).toBe("string");
    });
  });

  describe("邊界條件", () => {
    it("1920-01-01 邊界年份應正常推算", async () => {
      const res = await request(app).get("/api/preview?birth=1920-01-01");
      expect(res.status).toBe(200);
      expect(res.body.birth).toBe("1920-01-01");
    });

    it("2010-12-31 邊界年份應正常推算", async () => {
      const res = await request(app).get("/api/preview?birth=2010-12-31");
      expect(res.status).toBe(200);
      expect(res.body.birth).toBe("2010-12-31");
    });

    it("不同年份的命格應有不同的年柱", async () => {
      const res1 = await request(app).get("/api/preview?birth=1984-01-01");
      const res2 = await request(app).get("/api/preview?birth=1985-01-01");
      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(res1.body.bazi.yearPillar).not.toBe(res2.body.bazi.yearPillar);
    });
  });
});
