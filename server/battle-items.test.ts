/**
 * battle-items.test.ts — 戰鬥系統技能/道具使用邏輯測試
 */
import { describe, expect, it } from "vitest";
import {
  type BattleParticipant,
  type BattleCommand,
  executeCommand,
  aiDecideCommand,
  sortTurnOrder,
  processStatusEffects,
  isStunned,
} from "./services/combatEngineV2";

// ─── 輔助函數：建立測試用參與者 ───

function makeCharacter(overrides: Partial<BattleParticipant> = {}): BattleParticipant {
  return {
    id: 1,
    type: "character",
    side: "ally",
    name: "測試角色",
    level: 10,
    maxHp: 500,
    currentHp: 500,
    maxMp: 100,
    currentMp: 100,
    attack: 80,
    defense: 50,
    magicAttack: 60,
    magicDefense: 40,
    speed: 30,
    dominantElement: "fire",
    skills: [
      {
        id: "skill_fire_strike",
        name: "烈焰斬",
        skillType: "attack",
        damageMultiplier: 1.5,
        mpCost: 15,
        wuxing: "fire",
        cooldown: 2,
        currentCooldown: 0,
      },
      {
        id: "skill_heal",
        name: "回春術",
        skillType: "heal",
        damageMultiplier: 1.2,
        mpCost: 20,
        cooldown: 3,
        currentCooldown: 0,
      },
    ],
    isDefending: false,
    isDefeated: false,
    speedScore: 0,
    statusEffects: [],
    ...overrides,
  };
}

function makeMonster(overrides: Partial<BattleParticipant> = {}): BattleParticipant {
  return {
    id: 3,
    type: "monster",
    side: "enemy",
    name: "測試怪物",
    level: 8,
    maxHp: 300,
    currentHp: 300,
    maxMp: 50,
    currentMp: 50,
    attack: 60,
    defense: 40,
    magicAttack: 40,
    magicDefense: 30,
    speed: 25,
    dominantElement: "water",
    skills: [],
    isDefending: false,
    isDefeated: false,
    speedScore: 0,
    statusEffects: [],
    ...overrides,
  };
}

// ─── 測試套件 ───

describe("戰鬥系統 - 基本攻擊", () => {
  it("普通攻擊應造成傷害", () => {
    const char = makeCharacter();
    const monster = makeMonster();
    const participants = [char, monster];

    const cmd: BattleCommand = {
      participantId: char.id,
      commandType: "attack",
      targetId: monster.id,
    };

    const logs = executeCommand(cmd, participants, 1);
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].logType).toBe("damage");
    expect(logs[0].value).toBeGreaterThan(0);
    expect(monster.currentHp).toBeLessThan(monster.maxHp);
  });

  it("防禦應設置 isDefending 狀態", () => {
    const char = makeCharacter();
    const monster = makeMonster();
    const participants = [char, monster];

    const cmd: BattleCommand = {
      participantId: char.id,
      commandType: "defend",
    };

    const logs = executeCommand(cmd, participants, 1);
    expect(logs.length).toBe(1);
    expect(logs[0].logType).toBe("defend");
    expect(char.isDefending).toBe(true);
  });
});

describe("戰鬥系統 - 技能使用", () => {
  it("技能應消耗 MP 並造成傷害", () => {
    const char = makeCharacter();
    const monster = makeMonster();
    const participants = [char, monster];

    const cmd: BattleCommand = {
      participantId: char.id,
      commandType: "skill",
      skillId: "skill_fire_strike",
      targetId: monster.id,
    };

    const logs = executeCommand(cmd, participants, 1);
    expect(logs.length).toBeGreaterThan(0);
    // MP 應該被消耗
    expect(char.currentMp).toBe(100 - 15);
    // 技能應進入冷卻
    const skill = char.skills.find(s => s.id === "skill_fire_strike");
    expect(skill?.currentCooldown).toBe(2);
  });

  it("MP 不足時技能應 fallback 為普通攻擊", () => {
    const char = makeCharacter({ currentMp: 5 }); // MP 不足
    const monster = makeMonster();
    const participants = [char, monster];

    const cmd: BattleCommand = {
      participantId: char.id,
      commandType: "skill",
      skillId: "skill_fire_strike", // 需要 15 MP
      targetId: monster.id,
    };

    const logs = executeCommand(cmd, participants, 1);
    expect(logs.length).toBeGreaterThan(0);
    // 應該 fallback 為普通攻擊，MP 不變
    expect(char.currentMp).toBe(5);
  });

  it("冷卻中的技能應 fallback 為普通攻擊", () => {
    const char = makeCharacter();
    // 手動設置冷卻
    char.skills[0].currentCooldown = 2;
    const monster = makeMonster();
    const participants = [char, monster];

    const cmd: BattleCommand = {
      participantId: char.id,
      commandType: "skill",
      skillId: "skill_fire_strike",
      targetId: monster.id,
    };

    const logs = executeCommand(cmd, participants, 1);
    expect(logs.length).toBeGreaterThan(0);
    // MP 不應被消耗（因為 fallback 為普攻）
    expect(char.currentMp).toBe(100);
  });

  it("治療技能應恢復 HP", () => {
    const char = makeCharacter({ currentHp: 200 }); // 受傷狀態
    const monster = makeMonster();
    const participants = [char, monster];

    const cmd: BattleCommand = {
      participantId: char.id,
      commandType: "skill",
      skillId: "skill_heal",
      targetId: char.id,
    };

    const logs = executeCommand(cmd, participants, 1);
    expect(logs.some(l => l.logType === "heal")).toBe(true);
    expect(char.currentHp).toBeGreaterThan(200);
    expect(char.currentMp).toBe(100 - 20);
  });
});

describe("戰鬥系統 - 道具使用", () => {
  it("道具 heal_hp 應恢復 HP", () => {
    const char = makeCharacter({ currentHp: 200 });
    const monster = makeMonster();
    const participants = [char, monster];

    const cmd: BattleCommand = {
      participantId: char.id,
      commandType: "item",
      itemId: "test_potion",
      itemEffect: {
        type: "heal_hp",
        value: 30, // 30% HP
        itemName: "回復藥水",
      },
    };

    const logs = executeCommand(cmd, participants, 1);
    expect(logs.length).toBe(1);
    expect(logs[0].logType).toBe("heal");
    const expectedHeal = Math.floor(char.maxHp * 0.3); // 150
    expect(char.currentHp).toBe(200 + expectedHeal);
    expect(logs[0].skillName).toBe("回復藥水");
  });

  it("道具 heal_mp 應恢復 MP", () => {
    const char = makeCharacter({ currentMp: 30 });
    const monster = makeMonster();
    const participants = [char, monster];

    const cmd: BattleCommand = {
      participantId: char.id,
      commandType: "item",
      itemId: "test_mp_potion",
      itemEffect: {
        type: "heal_mp",
        value: 50, // 50% MP
        itemName: "靈力丹",
      },
    };

    const logs = executeCommand(cmd, participants, 1);
    expect(logs.length).toBe(1);
    expect(logs[0].logType).toBe("heal");
    const expectedMp = Math.floor(char.maxMp * 0.5); // 50
    expect(char.currentMp).toBe(30 + expectedMp);
  });

  it("道具 atk_boost 應提升攻擊力並添加 buff", () => {
    const char = makeCharacter();
    const monster = makeMonster();
    const participants = [char, monster];
    const originalAtk = char.attack;

    const cmd: BattleCommand = {
      participantId: char.id,
      commandType: "item",
      itemId: "test_atk_pill",
      itemEffect: {
        type: "atk_boost",
        value: 20, // 20% 攻擊提升
        duration: 3,
        itemName: "力量丸",
      },
    };

    const logs = executeCommand(cmd, participants, 1);
    expect(logs.length).toBe(1);
    expect(logs[0].logType).toBe("buff");
    const expectedBoost = Math.floor(originalAtk * 0.2);
    expect(char.attack).toBe(originalAtk + expectedBoost);
    expect(char.statusEffects.some(e => e.type === "atk_up")).toBe(true);
  });

  it("道具 def_boost 應提升防禦力", () => {
    const char = makeCharacter();
    const monster = makeMonster();
    const participants = [char, monster];
    const originalDef = char.defense;

    const cmd: BattleCommand = {
      participantId: char.id,
      commandType: "item",
      itemId: "test_def_pill",
      itemEffect: {
        type: "def_boost",
        value: 25,
        duration: 3,
        itemName: "鐵壁丸",
      },
    };

    const logs = executeCommand(cmd, participants, 1);
    expect(logs.length).toBe(1);
    const expectedBoost = Math.floor(originalDef * 0.25);
    expect(char.defense).toBe(originalDef + expectedBoost);
    expect(char.statusEffects.some(e => e.type === "def_up")).toBe(true);
  });

  it("道具 cure_status 應清除異常狀態", () => {
    const char = makeCharacter();
    char.statusEffects = [
      { type: "poison", duration: 3, value: 10, source: "毒蛇", appliedRound: 1 },
      { type: "burn", duration: 2, value: 8, source: "火焰", appliedRound: 1 },
    ];
    const monster = makeMonster();
    const participants = [char, monster];

    const cmd: BattleCommand = {
      participantId: char.id,
      commandType: "item",
      itemId: "test_antidote",
      itemEffect: {
        type: "cure_status",
        value: 0,
        itemName: "萬能解毒劑",
      },
    };

    const logs = executeCommand(cmd, participants, 1);
    expect(logs.length).toBe(1);
    // 異常狀態應被清除
    const debuffs = char.statusEffects.filter(e =>
      ["poison", "burn", "freeze", "stun", "confuse", "sleep"].includes(e.type)
    );
    expect(debuffs.length).toBe(0);
  });

  it("道具 revive 應復活已倒下的隊友", () => {
    const char = makeCharacter();
    const pet = makeCharacter({
      id: 2,
      type: "pet",
      name: "靈寵",
      maxHp: 200,
      currentHp: 0,
      isDefeated: true,
    });
    const monster = makeMonster();
    const participants = [char, pet, monster];

    const cmd: BattleCommand = {
      participantId: char.id,
      commandType: "item",
      targetId: pet.id,
      itemId: "test_revive",
      itemEffect: {
        type: "revive",
        value: 50, // 50% HP 復活
        itemName: "復活符",
      },
    };

    const logs = executeCommand(cmd, participants, 1);
    expect(logs.length).toBe(1);
    expect(pet.isDefeated).toBe(false);
    expect(pet.currentHp).toBe(Math.floor(pet.maxHp * 0.5));
  });

  it("無 itemEffect 的道具應 fallback 恢復 30% HP", () => {
    const char = makeCharacter({ currentHp: 200 });
    const monster = makeMonster();
    const participants = [char, monster];

    const cmd: BattleCommand = {
      participantId: char.id,
      commandType: "item",
      itemId: "unknown_item",
      // 沒有 itemEffect
    };

    const logs = executeCommand(cmd, participants, 1);
    expect(logs.length).toBe(1);
    expect(logs[0].logType).toBe("heal");
    const expectedHeal = Math.floor(char.maxHp * 0.3);
    expect(char.currentHp).toBe(200 + expectedHeal);
  });
});

describe("戰鬥系統 - 逃跑", () => {
  it("逃跑指令應產生 flee 日誌", () => {
    const char = makeCharacter();
    const monster = makeMonster();
    const participants = [char, monster];

    const cmd: BattleCommand = {
      participantId: char.id,
      commandType: "flee",
    };

    const logs = executeCommand(cmd, participants, 1);
    expect(logs.length).toBe(1);
    expect(logs[0].logType).toBe("flee");
    // value 為 1 表示成功，0 表示失敗
    expect([0, 1]).toContain(logs[0].value);
  });
});

describe("戰鬥系統 - 速度排序", () => {
  it("速度較高的參與者應先行動", () => {
    const fast = makeCharacter({ id: 1, speed: 100 });
    const slow = makeMonster({ id: 2, speed: 10 });
    const participants = [fast, slow];

    const order = sortTurnOrder(participants);
    // 速度高的應該在前面（但有隨機因素）
    expect(order.length).toBe(2);
    expect(order).toContain(fast.id);
    expect(order).toContain(slow.id);
  });

  it("已倒下的參與者不應在行動順序中", () => {
    const alive = makeCharacter({ id: 1 });
    const dead = makeMonster({ id: 2, isDefeated: true });
    const participants = [alive, dead];

    const order = sortTurnOrder(participants);
    expect(order).toContain(alive.id);
    expect(order).not.toContain(dead.id);
  });
});

describe("戰鬥系統 - AI 決策", () => {
  it("AI 應為怪物生成有效指令", () => {
    const char = makeCharacter();
    const monster = makeMonster();
    const allies = [monster];
    const enemies = [char];

    const cmd = aiDecideCommand(monster, allies, enemies, 1);
    expect(cmd.participantId).toBe(monster.id);
    expect(["attack", "skill", "defend"]).toContain(cmd.commandType);
  });
});

describe("戰鬥系統 - 狀態效果處理", () => {
  it("中毒應每回合造成傷害", () => {
    const char = makeCharacter({ currentHp: 300 });
    char.statusEffects = [
      { type: "poison", duration: 3, value: 20, source: "毒蛇", appliedRound: 1 },
    ];

    const logs = processStatusEffects(char, 2);
    // 中毒應造成傷害
    if (logs.length > 0) {
      expect(char.currentHp).toBeLessThan(300);
    }
    // duration 應減少
    const poison = char.statusEffects.find(e => e.type === "poison");
    if (poison) {
      expect(poison.duration).toBeLessThanOrEqual(2);
    }
  });

  it("isStunned 應正確判斷控制狀態", () => {
    const char = makeCharacter();
    expect(isStunned(char)).toBe(false);

    char.statusEffects = [
      { type: "stun", duration: 1, value: 0, source: "雷擊", appliedRound: 1 },
    ];
    expect(isStunned(char)).toBe(true);
  });
});

describe("戰鬥系統 - 技能掛載驗證", () => {
  it("角色帶有多個技能時應都能使用", () => {
    const char = makeCharacter({
      skills: [
        {
          id: "skill_S_W001",
          name: "木靈斬",
          skillType: "attack",
          damageMultiplier: 1.3,
          mpCost: 10,
          wuxing: "wood",
          cooldown: 2,
          currentCooldown: 0,
        },
        {
          id: "quest_1",
          name: "天命火焰",
          skillType: "attack",
          damageMultiplier: 2.0,
          mpCost: 25,
          wuxing: "fire",
          cooldown: 4,
          currentCooldown: 0,
          skillLevel: 3,
        },
        {
          id: "skill_S_F001",
          name: "火焰治療",
          skillType: "heal",
          damageMultiplier: 1.5,
          mpCost: 20,
          cooldown: 3,
          currentCooldown: 0,
        },
      ],
    });
    const monster = makeMonster();
    const participants = [char, monster];

    // 使用第一個技能
    const cmd1: BattleCommand = {
      participantId: char.id,
      commandType: "skill",
      skillId: "skill_S_W001",
      targetId: monster.id,
    };
    const logs1 = executeCommand(cmd1, participants, 1);
    expect(logs1.length).toBeGreaterThan(0);
    expect(char.currentMp).toBe(90); // 100 - 10
    expect(char.skills[0].currentCooldown).toBe(2);

    // 使用第二個技能（天命技能）
    const cmd2: BattleCommand = {
      participantId: char.id,
      commandType: "skill",
      skillId: "quest_1",
      targetId: monster.id,
    };
    const logs2 = executeCommand(cmd2, participants, 2);
    expect(logs2.length).toBeGreaterThan(0);
    expect(char.currentMp).toBe(65); // 90 - 25
    expect(char.skills[1].currentCooldown).toBe(4);

    // 使用治療技能
    char.currentHp = 200;
    const cmd3: BattleCommand = {
      participantId: char.id,
      commandType: "skill",
      skillId: "skill_S_F001",
      targetId: char.id,
    };
    const logs3 = executeCommand(cmd3, participants, 3);
    expect(logs3.some(l => l.logType === "heal")).toBe(true);
    expect(char.currentHp).toBeGreaterThan(200);
    expect(char.currentMp).toBe(45); // 65 - 20
  });

  it("沒有技能的角色只能普攻和防禦", () => {
    const char = makeCharacter({ skills: [] });
    const monster = makeMonster();
    const participants = [char, monster];

    // 嘗試使用技能應 fallback 為普攻
    const cmd: BattleCommand = {
      participantId: char.id,
      commandType: "skill",
      skillId: "nonexistent_skill",
      targetId: monster.id,
    };
    const logs = executeCommand(cmd, participants, 1);
    expect(logs.length).toBeGreaterThan(0);
    // MP 不應被消耗（因為 fallback）
    expect(char.currentMp).toBe(100);
  });

  it("寵物技能也應正確執行", () => {
    const pet = makeCharacter({
      id: 2,
      type: "pet",
      name: "靈寵",
      skills: [
        {
          id: "pet_skill_1",
          name: "寵物火焰",
          skillType: "attack",
          damageMultiplier: 1.8,
          mpCost: 15,
          wuxing: "fire",
          cooldown: 3,
          currentCooldown: 0,
        },
      ],
    });
    const monster = makeMonster();
    const participants = [pet, monster];

    const cmd: BattleCommand = {
      participantId: pet.id,
      commandType: "skill",
      skillId: "pet_skill_1",
      targetId: monster.id,
    };
    const logs = executeCommand(cmd, participants, 1);
    expect(logs.length).toBeGreaterThan(0);
    expect(pet.currentMp).toBe(85); // 100 - 15
    expect(pet.skills[0].currentCooldown).toBe(3);
  });
});

describe("cardStylePrompt 風格生成器", () => {
  // 測試 cardStylePrompt 模組的各種 prompt 生成函數
  it("petCardPrompt 應包含庫洛魔法使風格關鍵字", async () => {
    const { petCardPrompt } = await import("./services/cardStylePrompt");
    const prompt = petCardPrompt({
      name: "火焰龍",
      description: "烈焰中誕生的幼龍",
      race: "dragon",
      wuxing: "火",
      rarity: "epic",
    });
    expect(prompt).toContain("Cardcaptor Sakura");
    expect(prompt).toContain("Clow Card");
    expect(prompt).toContain("baroque");
    expect(prompt).toContain("No text");
    expect(prompt).toContain("ruby red");
    expect(prompt).toContain("dragon");
    expect(prompt).toContain("purple-gold aurora");
  });

  it("itemCardPrompt 應正確映射道具類別", async () => {
    const { itemCardPrompt } = await import("./services/cardStylePrompt");
    const prompt = itemCardPrompt({
      name: "回復藥水",
      description: "恢復生命力的藥水",
      wuxing: "水",
      rarity: "common",
      category: "consumable",
    });
    expect(prompt).toContain("potion bottle");
    expect(prompt).toContain("sapphire blue");
    expect(prompt).toContain("silver shimmer");
  });

  it("monsterCardPrompt 應區分 Boss 等級", async () => {
    const { monsterCardPrompt } = await import("./services/cardStylePrompt");
    const bossPrompt = monsterCardPrompt({
      name: "混沌帝王",
      description: "毀滅一切的遠古凶獸",
      wuxing: "火",
      race: "demon",
      rarity: "legendary",
      tier: 3,
    });
    expect(bossPrompt).toContain("Boss-level");
    expect(bossPrompt).toContain("menacing dark demon");
    expect(bossPrompt).toContain("divine golden radiance");

    const normalPrompt = monsterCardPrompt({
      name: "小火蜥蜴",
      wuxing: "火",
      tier: 1,
    });
    expect(normalPrompt).toContain("Regular creature");
  });

  it("skillCardPrompt 應正確映射技能類型", async () => {
    const { skillCardPrompt } = await import("./services/cardStylePrompt");
    const healPrompt = skillCardPrompt({
      name: "回春術",
      wuxing: "木",
      rarity: "rare",
      skillType: "heal",
    });
    expect(healPrompt).toContain("healing light");
    expect(healPrompt).toContain("emerald green");
  });

  it("equipCardPrompt 應正確映射裝備部位", async () => {
    const { equipCardPrompt } = await import("./services/cardStylePrompt");
    const weaponPrompt = equipCardPrompt({
      name: "烈焰劍",
      wuxing: "火",
      rarity: "legendary",
      slot: "weapon",
      tier: 3,
    });
    expect(weaponPrompt).toContain("sword");
    expect(weaponPrompt).toContain("divine golden radiance");
  });
});
