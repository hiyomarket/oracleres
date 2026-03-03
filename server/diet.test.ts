/**
 * 飲食羅盤 V10 後端測試
 * 測試 detectMealScene、diet router 資料結構
 */
import { describe, it, expect } from "vitest";
import { detectMealScene } from "./routers/diet";

describe("detectMealScene", () => {
  it("早晨時辰（6-9點）應為 breakfast", () => {
    expect(detectMealScene(6)).toBe("breakfast");
    expect(detectMealScene(8)).toBe("breakfast");
  });

  it("午間時辰（11-13點）應為 lunch", () => {
    expect(detectMealScene(11)).toBe("lunch");
    expect(detectMealScene(12)).toBe("lunch");
    expect(detectMealScene(13)).toBe("lunch");
  });

  it("傍晚時辰（17-20點）應為 dinner", () => {
    expect(detectMealScene(17)).toBe("dinner");
    expect(detectMealScene(19)).toBe("dinner");
  });

  it("其他時辰應為 snack", () => {
    expect(detectMealScene(10)).toBe("snack");
    expect(detectMealScene(15)).toBe("snack");
    expect(detectMealScene(22)).toBe("snack");
    expect(detectMealScene(3)).toBe("snack");
  });
});
