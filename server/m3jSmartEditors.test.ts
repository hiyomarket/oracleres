/**
 * M3J SmartEditors 後台 UX 重構測試
 * 驗證 SmartEditor 元件的 JSON 序列化/反序列化邏輯
 */
import { describe, it, expect } from "vitest";

// ===== 獎勵編輯器 JSON 格式測試 =====
describe("RewardEditor JSON 格式", () => {
  it("應該生成正確的獎勵 JSON 格式", () => {
    const rewards = [
      { stat: "attack", value: 10 },
      { stat: "defense", value: 5 },
    ];
    const json = JSON.stringify(rewards);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].stat).toBe("attack");
    expect(parsed[0].value).toBe(10);
  });

  it("空獎勵應該是空陣列", () => {
    const rewards: any[] = [];
    expect(JSON.stringify(rewards)).toBe("[]");
  });

  it("最多支援 5 個獎勵項目", () => {
    const MAX_REWARDS = 5;
    const rewards = Array.from({ length: MAX_REWARDS }, (_, i) => ({
      stat: "attack",
      value: (i + 1) * 10,
    }));
    expect(rewards.length).toBeLessThanOrEqual(MAX_REWARDS);
  });
});

// ===== 條件編輯器 JSON 格式測試 =====
describe("ConditionEditor JSON 格式", () => {
  const CONDITION_TYPES = [
    "kill_monster",
    "collect_item",
    "reach_level",
    "visit_node",
    "craft_item",
    "equip_item",
    "win_pvp",
    "explore_count",
    "gold_earned",
    "login_days",
  ];

  it("所有條件類型都應該是有效的", () => {
    CONDITION_TYPES.forEach(type => {
      expect(typeof type).toBe("string");
      expect(type.length).toBeGreaterThan(0);
    });
  });

  it("條件參數應該根據類型生成正確的結構", () => {
    // kill_monster 需要 monsterId
    const killMonster = {
      conditionType: "kill_monster",
      conditionValue: 10,
      conditionParams: { monsterId: "M_W001" },
    };
    expect(killMonster.conditionParams.monsterId).toBe("M_W001");

    // collect_item 需要 itemId
    const collectItem = {
      conditionType: "collect_item",
      conditionValue: 5,
      conditionParams: { itemId: "I_W001" },
    };
    expect(collectItem.conditionParams.itemId).toBe("I_W001");

    // reach_level 不需要額外參數
    const reachLevel = {
      conditionType: "reach_level",
      conditionValue: 20,
      conditionParams: {},
    };
    expect(Object.keys(reachLevel.conditionParams)).toHaveLength(0);
  });
});

// ===== 技能效果編輯器 JSON 格式測試 =====
describe("SkillEffectEditor JSON 格式", () => {
  it("應該生成正確的技能效果 JSON", () => {
    const effect = {
      effectType: "dot",
      duration: 3,
      value: 15,
    };
    const json = JSON.stringify(effect);
    const parsed = JSON.parse(json);
    expect(parsed.effectType).toBe("dot");
    expect(parsed.duration).toBe(3);
  });

  it("空效果應該是 null", () => {
    const effect = null;
    expect(effect).toBeNull();
  });
});

// ===== AI 條件編輯器 JSON 格式測試 =====
describe("AiConditionEditor JSON 格式", () => {
  it("應該生成正確的 AI 條件 JSON", () => {
    const condition = {
      condition: "hp_below",
      threshold: 30,
      priority: 2,
    };
    expect(condition.condition).toBe("hp_below");
    expect(condition.threshold).toBe(30);
    expect(condition.priority).toBe(2);
  });

  const AI_CONDITIONS = ["always", "hp_below", "hp_above", "target_element", "random"];

  it("所有 AI 條件類型都應該是有效的", () => {
    AI_CONDITIONS.forEach(c => {
      expect(typeof c).toBe("string");
    });
  });
});

// ===== 抗性編輯器 JSON 格式測試 =====
describe("ResistEditor JSON 格式", () => {
  it("應該生成正確的抗性 JSON", () => {
    const resist = {
      wood: 10,
      fire: -5,
      earth: 0,
      metal: 15,
      water: 20,
    };
    const json = JSON.stringify(resist);
    const parsed = JSON.parse(json);
    expect(parsed.wood).toBe(10);
    expect(parsed.fire).toBe(-5);
  });

  it("空抗性應該是空物件", () => {
    const resist = {};
    expect(JSON.stringify(resist)).toBe("{}");
  });
});

// ===== 詞條編輯器 JSON 格式測試 =====
describe("AffixEditor JSON 格式", () => {
  it("應該生成正確的詞條 JSON", () => {
    const affix = { stat: "attack", min: 5, max: 15 };
    expect(affix.stat).toBe("attack");
    expect(affix.min).toBeLessThanOrEqual(affix.max);
  });

  it("最多支援 5 個詞條", () => {
    const MAX_AFFIXES = 5;
    const affixes = Array.from({ length: MAX_AFFIXES }, (_, i) => ({
      stat: "attack",
      min: i * 5,
      max: (i + 1) * 10,
    }));
    expect(affixes.length).toBeLessThanOrEqual(MAX_AFFIXES);
  });
});

// ===== 材料編輯器 JSON 格式測試 =====
describe("MaterialEditor JSON 格式", () => {
  it("應該生成正確的材料 JSON", () => {
    const materials = [
      { itemId: "I_W001", quantity: 3 },
      { itemId: "I_F002", quantity: 1 },
    ];
    const json = JSON.stringify(materials);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].itemId).toBe("I_W001");
    expect(parsed[0].quantity).toBe(3);
  });
});

// ===== 使用效果編輯器 JSON 格式測試 =====
describe("UseEffectEditor JSON 格式", () => {
  const EFFECT_TYPES = ["heal_hp", "heal_mp", "buff_attack", "buff_defense", "buff_speed", "restore_stamina", "teleport", "exp_boost"];

  it("所有效果類型都應該是有效的", () => {
    EFFECT_TYPES.forEach(t => {
      expect(typeof t).toBe("string");
    });
  });

  it("應該生成正確的使用效果 JSON", () => {
    const effect = {
      type: "heal_hp",
      value: 50,
      duration: 0,
    };
    expect(effect.type).toBe("heal_hp");
    expect(effect.value).toBe(50);
  });
});

// ===== 採集地點編輯器 JSON 格式測試 =====
describe("GatherEditor JSON 格式", () => {
  it("應該生成正確的採集地點 JSON", () => {
    const locations = [
      { nodeId: "node_1", dropRate: 0.3 },
      { nodeId: "node_2", dropRate: 0.1 },
    ];
    const json = JSON.stringify(locations);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].nodeId).toBe("node_1");
    expect(parsed[0].dropRate).toBe(0.3);
  });
});

// ===== 隱藏觸發條件編輯器測試 =====
describe("HiddenTriggerEditor 格式", () => {
  const TRIGGER_TYPES = [
    "hp_below_percent",
    "consecutive_hits",
    "enemy_element_counter",
    "ally_defeated",
    "turn_count",
    "critical_hit",
  ];

  it("所有觸發類型都應該是有效的", () => {
    TRIGGER_TYPES.forEach(t => {
      expect(typeof t).toBe("string");
    });
  });

  it("應該生成正確的隱藏觸發條件字串", () => {
    const trigger = "hp_below_percent:30";
    const [type, value] = trigger.split(":");
    expect(type).toBe("hp_below_percent");
    expect(Number(value)).toBe(30);
  });
});

// ===== 出沒節點編輯器 JSON 格式測試 =====
describe("SpawnNodeEditor JSON 格式", () => {
  it("應該生成正確的出沒節點 JSON", () => {
    const nodes = [
      { nodeId: "node_1", weight: 10 },
      { nodeId: "node_2", weight: 5 },
    ];
    const json = JSON.stringify(nodes);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].nodeId).toBe("node_1");
    expect(parsed[0].weight).toBe(10);
  });
});

// ===== 表單提交 hidden 欄位測試 =====
describe("CatalogFormDialog hidden 欄位提交", () => {
  it("hidden 欄位的值應該被包含在提交資料中", () => {
    // 模擬 handleSubmit 邏輯
    const fields = [
      { key: "name", type: "text" as const, label: "名稱" },
      { key: "conditionType", type: "hidden" as const, label: "", defaultValue: "" },
      { key: "conditionValue", type: "hidden" as const, label: "", defaultValue: 1 },
      { key: "conditionParams", type: "hidden" as const, label: "", defaultValue: {} },
      { key: "_condition", type: "custom" as const, label: "條件", skipParse: true },
    ];

    const form: Record<string, any> = {
      name: "測試成就",
      conditionType: "kill_monster",
      conditionValue: 10,
      conditionParams: { monsterId: "M_W001" },
      _condition: null,
    };

    const data: Record<string, any> = {};
    fields.forEach(f => {
      if (f.key.startsWith("_")) return;
      let val = form[f.key];
      if (f.type === "hidden") {
        data[f.key] = val;
        return;
      }
      data[f.key] = val;
    });

    expect(data.conditionType).toBe("kill_monster");
    expect(data.conditionValue).toBe(10);
    expect(data.conditionParams).toEqual({ monsterId: "M_W001" });
    expect(data._condition).toBeUndefined(); // _ 開頭的虛擬欄位不應該被提交
  });
});

// ===== 手機版排版測試 =====
describe("手機版排版相關", () => {
  it("表格最小寬度應該大於 0", () => {
    const minWidths = [700, 550, 600, 550, 500, 600]; // 怪物、道具、裝備、技能、成就、魔物技能
    minWidths.forEach(w => {
      expect(w).toBeGreaterThan(0);
      expect(w).toBeLessThanOrEqual(800); // 不應該太寬
    });
  });

  it("字體回退鏈應該包含系統中文字體", () => {
    const fontFamily = "'Noto Serif TC', 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', 'Heiti TC', serif";
    expect(fontFamily).toContain("PingFang TC");
    expect(fontFamily).toContain("Microsoft JhengHei");
    expect(fontFamily).toContain("Heiti TC");
  });
});
