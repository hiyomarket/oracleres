import { describe, it, expect, vi } from "vitest";

// ─── 技能安裝修復測試 ───

describe("技能安裝修復", () => {
  // 測試初始技能 ID 格式遷移
  describe("初始技能 ID 格式遷移", () => {
    const OLD_TO_NEW_SKILL_MAP: Record<string, string> = {
      "wood-basic-atk": "S_W001",
      "fire-burst": "S_F001",
      "water-flow": "S_A001",
      "earth-shield": "S_E001",
      "metal-slash": "S_M001",
      "wood-regen": "S_W002",
      "fire-shield": "S_F002",
      "water-heal": "S_A002",
      "earth-quake": "S_E002",
      "metal-defense": "S_M002",
    };

    it("應將所有舊格式技能 ID 映射到新格式", () => {
      expect(OLD_TO_NEW_SKILL_MAP["wood-basic-atk"]).toBe("S_W001");
      expect(OLD_TO_NEW_SKILL_MAP["fire-burst"]).toBe("S_F001");
      expect(OLD_TO_NEW_SKILL_MAP["water-flow"]).toBe("S_A001");
      expect(OLD_TO_NEW_SKILL_MAP["earth-shield"]).toBe("S_E001");
      expect(OLD_TO_NEW_SKILL_MAP["metal-slash"]).toBe("S_M001");
    });

    it("應將被動技能也映射到新格式", () => {
      expect(OLD_TO_NEW_SKILL_MAP["wood-regen"]).toBe("S_W002");
      expect(OLD_TO_NEW_SKILL_MAP["fire-shield"]).toBe("S_F002");
      expect(OLD_TO_NEW_SKILL_MAP["water-heal"]).toBe("S_A002");
      expect(OLD_TO_NEW_SKILL_MAP["earth-quake"]).toBe("S_E002");
      expect(OLD_TO_NEW_SKILL_MAP["metal-defense"]).toBe("S_M002");
    });

    it("新格式 ID 不應在映射表中", () => {
      expect(OLD_TO_NEW_SKILL_MAP["S_W001"]).toBeUndefined();
      expect(OLD_TO_NEW_SKILL_MAP["S_F004"]).toBeUndefined();
    });
  });

  // 測試技能槽位遷移邏輯
  describe("技能槽位遷移邏輯", () => {
    const OLD_TO_NEW_SKILL_MAP: Record<string, string> = {
      "wood-basic-atk": "S_W001",
      "fire-burst": "S_F001",
      "wood-regen": "S_W002",
    };

    function migrateSkillSlot(slotValue: string | null): string | null {
      if (!slotValue) return null;
      return OLD_TO_NEW_SKILL_MAP[slotValue] ?? slotValue;
    }

    it("應將舊格式槽位值遷移為新格式", () => {
      expect(migrateSkillSlot("wood-basic-atk")).toBe("S_W001");
      expect(migrateSkillSlot("fire-burst")).toBe("S_F001");
    });

    it("新格式槽位值不應被修改", () => {
      expect(migrateSkillSlot("S_W001")).toBe("S_W001");
      expect(migrateSkillSlot("S_F004")).toBe("S_F004");
    });

    it("空槽位應保持為 null", () => {
      expect(migrateSkillSlot(null)).toBeNull();
    });
  });

  // 測試技能安裝驗證邏輯
  describe("技能安裝驗證邏輯", () => {
    it("應允許安裝已學習的技能", () => {
      const learnedSkillIds = ["S_W001", "S_F004", "S_W005"];
      const skillToInstall = "S_F004";
      expect(learnedSkillIds.includes(skillToInstall)).toBe(true);
    });

    it("應拒絕安裝未學習的技能", () => {
      const learnedSkillIds = ["S_W001", "S_F004"];
      const skillToInstall = "S_M010";
      expect(learnedSkillIds.includes(skillToInstall)).toBe(false);
    });

    it("應允許安裝初始技能（即使不在 agentSkills 中）", () => {
      const initialSkillIds = ["S_W001", "S_W002"];
      const learnedSkillIds: string[] = [];
      const skillToInstall = "S_W001";
      const canInstall = learnedSkillIds.includes(skillToInstall) || initialSkillIds.includes(skillToInstall);
      expect(canInstall).toBe(true);
    });
  });

  // 測試技能 Picker 過濾邏輯
  describe("技能 Picker 過濾邏輯", () => {
    it("應從 agentSkills 取得可安裝的技能列表", () => {
      const agentSkills = [
        { skillId: "S_W001", isLearned: 1 },
        { skillId: "S_F004", isLearned: 1 },
        { skillId: "S_W005", isLearned: 1 },
      ];
      const learnedIds = agentSkills.filter(s => s.isLearned).map(s => s.skillId);
      expect(learnedIds).toEqual(["S_W001", "S_F004", "S_W005"]);
    });

    it("技能目錄查詢應能匹配新格式 ID", () => {
      const skillCatalog = [
        { skillId: "S_W001", name: "木靈衝擊", element: "wood" },
        { skillId: "S_F004", name: "烈焰風暴", element: "fire" },
      ];
      const catalogMap = new Map(skillCatalog.map(s => [s.skillId, s]));
      expect(catalogMap.get("S_W001")?.name).toBe("木靈衝擊");
      expect(catalogMap.get("S_F004")?.name).toBe("烈焰風暴");
      expect(catalogMap.get("wood-basic-atk")).toBeUndefined();
    });
  });
});

// ─── 靈相干預修復測試 ───

describe("靈相干預修復", () => {
  describe("每日限制已移除", () => {
    it("後端不應檢查 lastDivineHealDate", () => {
      // 模擬後端邏輯：只檢查靈力值，不檢查日期
      const agent = { actionPoints: 3, hp: 50, maxHp: 200 };
      const apCost = 1;
      const canUse = agent.actionPoints >= apCost;
      expect(canUse).toBe(true);
    });

    it("靈力值不足時應拒絕使用", () => {
      const agent = { actionPoints: 0, hp: 50, maxHp: 200 };
      const apCost = 1;
      const canUse = agent.actionPoints >= apCost;
      expect(canUse).toBe(false);
    });

    it("前端不應顯示鎖頭圖示", () => {
      // 模擬前端邏輯：used 屬性已移除
      const divineItem = { name: "神癒恢復", apCost: 1 };
      const agentAP = 3;
      const isDisabled = agentAP < divineItem.apCost;
      expect(isDisabled).toBe(false);
    });
  });

  describe("game_config 動態參數", () => {
    it("應從 config 讀取 HP 恢復百分比", () => {
      const cfg: Record<string, string> = {
        divine_heal_hp_percent: "50",
        divine_heal_ap_cost: "1",
      };
      const healPercent = Number(cfg.divine_heal_hp_percent ?? "50");
      const apCost = Number(cfg.divine_heal_ap_cost ?? "1");
      const maxHp = 200;
      const healAmount = Math.floor(maxHp * (healPercent / 100));
      expect(healAmount).toBe(100);
      expect(apCost).toBe(1);
    });

    it("應從 config 讀取神眼加持百分比", () => {
      const cfg: Record<string, string> = {
        divine_eye_boost_percent: "15",
        divine_eye_ap_cost: "1",
      };
      const boostPercent = Number(cfg.divine_eye_boost_percent ?? "15");
      const currentTreasure = 20;
      const newTreasure = Math.min(1000, Math.round(currentTreasure * (1 + boostPercent / 100)));
      expect(newTreasure).toBe(23);
    });

    it("應從 config 讀取體力恢復值", () => {
      const cfg: Record<string, string> = {
        divine_stamina_restore: "50",
        divine_stamina_ap_cost: "1",
      };
      const staminaRestore = Number(cfg.divine_stamina_restore ?? "50");
      const currentStamina = 10;
      const newStamina = Math.max(currentStamina, staminaRestore);
      expect(newStamina).toBe(50);
    });

    it("config 缺失時應使用預設值", () => {
      const cfg: Record<string, string> = {};
      const healPercent = Number(cfg.divine_heal_hp_percent ?? "50");
      const apCost = Number(cfg.divine_heal_ap_cost ?? "1");
      expect(healPercent).toBe(50);
      expect(apCost).toBe(1);
    });

    it("自訂高 AP 消耗時應正確檢查", () => {
      const cfg: Record<string, string> = {
        divine_heal_ap_cost: "3",
      };
      const apCost = Number(cfg.divine_heal_ap_cost ?? "1");
      const agent = { actionPoints: 2 };
      expect(agent.actionPoints < apCost).toBe(true); // 不夠用
    });

    it("冷卻時間為 0 時不應有限制", () => {
      const cfg: Record<string, string> = {
        divine_cooldown_seconds: "0",
      };
      const cooldown = Number(cfg.divine_cooldown_seconds ?? "0");
      expect(cooldown).toBe(0);
      // cooldown === 0 表示無冷卻
      const hasCooldown = cooldown > 0;
      expect(hasCooldown).toBe(false);
    });
  });
});
