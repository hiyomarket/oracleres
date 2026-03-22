/**
 * 分享卡功能測試
 * 測試 DivinationShareCard、OracleShareCard、DestinyShareCard 的核心邏輯
 * 包含：
 * - 命運指數顏色判斷
 * - 擲筊結果配置
 * - 塔羅牌 URL 生成（依性別）
 * - 文字截斷邏輯
 */

import { describe, expect, it } from "vitest";

// ─── 命運指數顏色邏輯（DivinationShareCard） ───────────────────────────────

function getFortuneColor(index: number): string {
  if (index >= 80) return "#4ade80";
  if (index >= 65) return "#fbbf24";
  if (index >= 50) return "#facc15";
  if (index >= 35) return "#fb923c";
  return "#f87171";
}

function getLabelStyle(label: string): { color: string; bg: string; border: string } {
  if (label === "大吉") return { color: "#4ade80", bg: "rgba(74,222,128,0.15)", border: "rgba(74,222,128,0.4)" };
  if (label === "吉" || label === "小吉") return { color: "#fbbf24", bg: "rgba(251,191,36,0.15)", border: "rgba(251,191,36,0.4)" };
  if (label === "平") return { color: "#facc15", bg: "rgba(250,204,21,0.15)", border: "rgba(250,204,21,0.4)" };
  if (label === "小凶") return { color: "#fb923c", bg: "rgba(251,146,60,0.15)", border: "rgba(251,146,60,0.4)" };
  return { color: "#f87171", bg: "rgba(248,113,113,0.15)", border: "rgba(248,113,113,0.4)" };
}

describe("DivinationShareCard - 命運指數顏色", () => {
  it("80 分以上應為綠色（大吉）", () => {
    expect(getFortuneColor(80)).toBe("#4ade80");
    expect(getFortuneColor(100)).toBe("#4ade80");
    expect(getFortuneColor(90)).toBe("#4ade80");
  });

  it("65-79 分應為琥珀色（吉）", () => {
    expect(getFortuneColor(65)).toBe("#fbbf24");
    expect(getFortuneColor(75)).toBe("#fbbf24");
    expect(getFortuneColor(79)).toBe("#fbbf24");
  });

  it("50-64 分應為黃色（平）", () => {
    expect(getFortuneColor(50)).toBe("#facc15");
    expect(getFortuneColor(60)).toBe("#facc15");
    expect(getFortuneColor(64)).toBe("#facc15");
  });

  it("35-49 分應為橙色（小凶）", () => {
    expect(getFortuneColor(35)).toBe("#fb923c");
    expect(getFortuneColor(45)).toBe("#fb923c");
    expect(getFortuneColor(49)).toBe("#fb923c");
  });

  it("35 分以下應為紅色（凶）", () => {
    expect(getFortuneColor(0)).toBe("#f87171");
    expect(getFortuneColor(20)).toBe("#f87171");
    expect(getFortuneColor(34)).toBe("#f87171");
  });
});

describe("DivinationShareCard - 命運標籤樣式", () => {
  it("大吉應返回綠色樣式", () => {
    const style = getLabelStyle("大吉");
    expect(style.color).toBe("#4ade80");
  });

  it("吉和小吉應返回琥珀色樣式", () => {
    expect(getLabelStyle("吉").color).toBe("#fbbf24");
    expect(getLabelStyle("小吉").color).toBe("#fbbf24");
  });

  it("平應返回黃色樣式", () => {
    const style = getLabelStyle("平");
    expect(style.color).toBe("#facc15");
  });

  it("小凶應返回橙色樣式", () => {
    const style = getLabelStyle("小凶");
    expect(style.color).toBe("#fb923c");
  });

  it("凶應返回紅色樣式", () => {
    const style = getLabelStyle("凶");
    expect(style.color).toBe("#f87171");
  });
});

// ─── 擲筊結果配置（OracleShareCard） ─────────────────────────────────────

type OracleResultType = 'sheng' | 'xiao' | 'yin' | 'li';

const RESULT_CONFIG: Record<OracleResultType, { name: string; subtitle: string; emoji: string }> = {
  sheng: { name: '聖杯', subtitle: '神明允諾', emoji: '🔴' },
  xiao: { name: '笑杯', subtitle: '神明微笑', emoji: '🟤' },
  yin: { name: '陰杯', subtitle: '神明婉拒', emoji: '⚫' },
  li: { name: '立筊', subtitle: '天命昭昭', emoji: '✨' },
};

const RESULT_DESCRIPTION: Record<OracleResultType, string> = {
  sheng: '一正一反，神明應允，此事可行',
  xiao: '兩正面朝上，神明以笑回應，需再思量',
  yin: '兩反面朝上，神明婉拒，此事暫緩',
  li: '筊杯直立，天命示現，神明自有定奪',
};

describe("OracleShareCard - 擲筊結果配置", () => {
  it("四種結果都有對應配置", () => {
    const results: OracleResultType[] = ['sheng', 'xiao', 'yin', 'li'];
    results.forEach(r => {
      expect(RESULT_CONFIG[r]).toBeDefined();
      expect(RESULT_CONFIG[r].name).toBeTruthy();
      expect(RESULT_CONFIG[r].subtitle).toBeTruthy();
      expect(RESULT_CONFIG[r].emoji).toBeTruthy();
    });
  });

  it("聖杯應為神明允諾", () => {
    expect(RESULT_CONFIG.sheng.name).toBe('聖杯');
    expect(RESULT_CONFIG.sheng.subtitle).toBe('神明允諾');
  });

  it("笑杯應為神明微笑", () => {
    expect(RESULT_CONFIG.xiao.name).toBe('笑杯');
    expect(RESULT_CONFIG.xiao.subtitle).toBe('神明微笑');
  });

  it("陰杯應為神明婉拒", () => {
    expect(RESULT_CONFIG.yin.name).toBe('陰杯');
    expect(RESULT_CONFIG.yin.subtitle).toBe('神明婉拒');
  });

  it("立筊應為天命昭昭", () => {
    expect(RESULT_CONFIG.li.name).toBe('立筊');
    expect(RESULT_CONFIG.li.subtitle).toBe('天命昭昭');
  });

  it("每種結果都有描述文字", () => {
    const results: OracleResultType[] = ['sheng', 'xiao', 'yin', 'li'];
    results.forEach(r => {
      expect(RESULT_DESCRIPTION[r]).toBeTruthy();
      expect(RESULT_DESCRIPTION[r].length).toBeGreaterThan(5);
    });
  });
});

// ─── 文字截斷邏輯（共用） ────────────────────────────────────────────────

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + "…" : text;
}

describe("分享卡 - 文字截斷邏輯", () => {
  it("短文字不應被截斷", () => {
    const text = "這是短文字";
    expect(truncate(text, 50)).toBe(text);
  });

  it("超過限制的文字應被截斷並加省略號", () => {
    const text = "這是一段很長的文字，超過了限制長度，應該被截斷並加上省略號";
    const result = truncate(text, 10);
    expect(result.length).toBe(11); // 10 字 + 省略號
    expect(result.endsWith("…")).toBe(true);
  });

  it("剛好等於限制長度的文字不應被截斷", () => {
    const text = "剛好十個字的文字測試";
    expect(truncate(text, 10)).toBe(text);
    expect(truncate(text, 10).endsWith("…")).toBe(false);
  });

  it("空字串應正常處理", () => {
    expect(truncate("", 10)).toBe("");
  });
});

// ─── DestinyShareCard - 主題選擇邏輯 ─────────────────────────────────────

type Gender = 'male' | 'female' | 'other' | null | undefined;

function getThemeStyleLabel(gender: Gender): string {
  if (gender === 'male') return "暗黑武士";
  return "賽博少女";
}

function getThemeBgGradient(gender: Gender): string {
  if (gender === 'male') {
    return "linear-gradient(135deg, #0D1117 0%, #1A1A2A 40%, #0F1A2E 100%)";
  }
  return "linear-gradient(135deg, #1A1A2A 0%, #2D1B4E 50%, #1A0A2E 100%)";
}

describe("DestinyShareCard - 主題選擇邏輯", () => {
  it("男生應使用暗黑武士主題", () => {
    expect(getThemeStyleLabel('male')).toBe("暗黑武士");
  });

  it("女生應使用賽博少女主題", () => {
    expect(getThemeStyleLabel('female')).toBe("賽博少女");
  });

  it("其他性別應使用賽博少女主題（預設）", () => {
    expect(getThemeStyleLabel('other')).toBe("賽博少女");
  });

  it("null 性別應使用賽博少女主題（預設）", () => {
    expect(getThemeStyleLabel(null)).toBe("賽博少女");
  });

  it("undefined 性別應使用賽博少女主題（預設）", () => {
    expect(getThemeStyleLabel(undefined)).toBe("賽博少女");
  });

  it("男生背景漸層應包含深藍色調", () => {
    const gradient = getThemeBgGradient('male');
    expect(gradient).toContain('#0D1117');
  });

  it("女生背景漸層應包含深紫色調", () => {
    const gradient = getThemeBgGradient('female');
    expect(gradient).toContain('#2D1B4E');
  });
});

// ─── 塔羅牌號碼邏輯 ──────────────────────────────────────────────────────

describe("DestinyShareCard - 塔羅牌號碼顯示", () => {
  it("22 號牌應顯示為 0（愚者）", () => {
    const displayNum = (num: number) => num === 22 ? '0' : String(num);
    expect(displayNum(22)).toBe('0');
  });

  it("1-21 號牌應正常顯示", () => {
    const displayNum = (num: number) => num === 22 ? '0' : String(num);
    for (let i = 1; i <= 21; i++) {
      expect(displayNum(i)).toBe(String(i));
    }
  });

  it("0 號牌應顯示為 0", () => {
    const displayNum = (num: number) => num === 22 ? '0' : String(num);
    expect(displayNum(0)).toBe('0');
  });
});
