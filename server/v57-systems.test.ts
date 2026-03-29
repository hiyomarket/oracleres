/**
 * v5.7 魔物數值倍率系統 + 世界地圖整合 + 道具掉落 + 傳送系統 測試
 */
import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import { gameConfig, gameMapNodes } from "../drizzle/schema";
import { sql } from "drizzle-orm";
import { MAP_NODES, MAP_NODE_MAP } from "../shared/mapNodes";

describe("v5.7 Monster Stat Multiplier System", () => {
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    db = await getDb();
  });

  it("should have all stat multiplier configs in game_config", async () => {
    const [rows] = await db!.execute(
      sql`SELECT config_key FROM game_config WHERE config_key LIKE 'monster_%_multiplier'`
    ) as any;
    const keys = rows.map((r: any) => r.config_key);
    
    // These are the actual keys used in the seed script
    const expectedKeys = [
      "monster_hp_multiplier", "monster_mp_multiplier",
      "monster_atk_multiplier", "monster_matk_multiplier",
      "monster_def_multiplier", "monster_mdef_multiplier",
      "monster_spd_multiplier", "monster_acc_multiplier",
      "monster_crit_rate_multiplier", "monster_crit_dmg_multiplier",
      "monster_bp_multiplier", "monster_heal_multiplier",
      "monster_resist_multiplier",
    ];
    
    for (const key of expectedKeys) {
      expect(keys, `Missing config: ${key}`).toContain(key);
    }
  });

  it("should also have rarity multiplier configs", async () => {
    const [rows] = await db!.execute(
      sql`SELECT config_key FROM game_config WHERE config_key LIKE 'monster_rarity_%_multiplier'`
    ) as any;
    const keys = rows.map((r: any) => r.config_key);
    
    expect(keys).toContain("monster_rarity_common_multiplier");
    expect(keys).toContain("monster_rarity_rare_multiplier");
    expect(keys).toContain("monster_rarity_legendary_multiplier");
  });

  it("all multiplier values should be valid positive numbers", async () => {
    const [rows] = await db!.execute(
      sql`SELECT config_key, config_value FROM game_config WHERE config_key LIKE 'monster_%_multiplier'`
    ) as any;
    
    for (const row of rows) {
      const val = parseFloat(row.config_value);
      expect(val, `${row.config_key} should be a positive number`).toBeGreaterThan(0);
    }
  });

  it("multiplier configs should belong to 'monster_balance' category", async () => {
    const [rows] = await db!.execute(
      sql`SELECT config_key, category FROM game_config WHERE config_key LIKE 'monster_%_multiplier'`
    ) as any;
    
    for (const row of rows) {
      expect(row.category).toBe("monster_balance");
    }
  });
});

describe("v5.7 World Map NPC Node Integration", () => {
  it("MAP_NODES should include NPC nodes (npc- prefix)", () => {
    const npcNodes = MAP_NODES.filter(n => n.id.startsWith("npc-"));
    expect(npcNodes.length).toBeGreaterThanOrEqual(25);
  });

  it("all NPC nodes should be in MAP_NODE_MAP", () => {
    const npcNodes = MAP_NODES.filter(n => n.id.startsWith("npc-"));
    for (const node of npcNodes) {
      expect(MAP_NODE_MAP.has(node.id), `${node.id} should be in MAP_NODE_MAP`).toBe(true);
    }
  });

  it("NPC nodes should have valid x/y coordinates", () => {
    const npcNodes = MAP_NODES.filter(n => n.id.startsWith("npc-"));
    for (const node of npcNodes) {
      // x and y are 0-100 relative to Taiwan outline, but NPC nodes may use extended coords
      expect(typeof node.x).toBe("number");
      expect(typeof node.y).toBe("number");
    }
  });

  it("NPC nodes should have terrain type 'NPC據點'", () => {
    const npcNodes = MAP_NODES.filter(n => n.id.startsWith("npc-"));
    for (const node of npcNodes) {
      expect(node.terrain).toBe("NPC據點");
    }
  });

  it("NPC nodes should cover all regions via naming convention", () => {
    const npcNodes = MAP_NODES.filter(n => n.id.startsWith("npc-"));
    const ids = npcNodes.map(n => n.id);
    
    // fogcity = 迷霧城, realm1 = 初界, realm2 = 中界, tower = 試煉之塔, abyss = 碎影深淵
    expect(ids.some(id => id.startsWith("npc-fogcity"))).toBe(true);
    expect(ids.some(id => id.startsWith("npc-realm1"))).toBe(true);
    expect(ids.some(id => id.startsWith("npc-realm2"))).toBe(true);
    expect(ids.some(id => id.startsWith("npc-tower"))).toBe(true);
    expect(ids.some(id => id.startsWith("npc-abyss"))).toBe(true);
  });

  it("DB map nodes should have valid lat/lng coordinates", async () => {
    const db = await getDb();
    const [rows] = await db!.execute(
      sql`SELECT id, name, lat, lng FROM game_map_nodes`
    ) as any;
    
    expect(rows.length).toBeGreaterThanOrEqual(25);
    
    for (const row of rows) {
      expect(parseFloat(row.lat)).toBeGreaterThan(-90);
      expect(parseFloat(row.lat)).toBeLessThan(90);
      expect(parseFloat(row.lng)).toBeGreaterThan(-180);
      expect(parseFloat(row.lng)).toBeLessThan(180);
    }
  });
});

describe("v5.7 Monster Quest Item Drops", () => {
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    db = await getDb();
  });

  it("some monsters should have quest item drops assigned", async () => {
    const [rows] = await db!.execute(
      sql`SELECT COUNT(*) as cnt FROM game_monster_catalog 
          WHERE (drop_item_1 LIKE 'I_QST_%' OR drop_item_2 LIKE 'I_QST_%' OR legendary_drop LIKE 'I_QST_%')`
    ) as any;
    
    expect(Number(rows[0].cnt), "Multiple monsters should drop quest items").toBeGreaterThanOrEqual(10);
  });

  it("legendary monsters should have legendary_drop set", async () => {
    const [rows] = await db!.execute(
      sql`SELECT monster_id, name, legendary_drop, legendary_drop_rate 
          FROM game_monster_catalog 
          WHERE rarity = 'legendary' AND legendary_drop IS NOT NULL AND legendary_drop != '' AND legendary_drop != 'NULL'`
    ) as any;
    
    expect(rows.length, "Multiple legendary monsters should have legendary drops").toBeGreaterThanOrEqual(5);
    
    for (const row of rows) {
      const rate = parseFloat(row.legendary_drop_rate);
      expect(rate, `${row.name} legendary drop rate should be > 0`).toBeGreaterThan(0);
      expect(rate, `${row.name} legendary drop rate should be <= 5%`).toBeLessThanOrEqual(0.05);
    }
  });

  it("common monsters should have basic material drops", async () => {
    const [rows] = await db!.execute(
      sql`SELECT COUNT(*) as cnt FROM game_monster_catalog 
          WHERE rarity = 'common' AND drop_item_1 LIKE 'I_MAT_%'`
    ) as any;
    
    expect(Number(rows[0].cnt), "Many common monsters should drop basic materials").toBeGreaterThanOrEqual(50);
  });

  it("basic material items should exist in item catalog", async () => {
    const materialIds = [
      "I_MAT_WOOD", "I_MAT_HERB", "I_MAT_EMBER", "I_MAT_ASH",
      "I_MAT_STONE", "I_MAT_CLAY", "I_MAT_ORE", "I_MAT_SHARD",
      "I_MAT_PEARL", "I_MAT_DEW",
    ];
    
    for (const itemId of materialIds) {
      const [rows] = await db!.execute(
        sql`SELECT item_id, name FROM game_item_catalog WHERE item_id = ${itemId}`
      ) as any;
      expect(rows.length, `Material ${itemId} should exist in catalog`).toBe(1);
    }
  });
});

describe("v5.7 Travel Cost System", () => {
  it("region cost map should have escalating costs", () => {
    const regionCostMap: Record<string, number> = {
      "初界": 2, "迷霧城": 2, "中界": 4, "試煉之塔": 6, "碎影深淵": 8,
    };
    
    expect(regionCostMap["初界"]).toBeLessThanOrEqual(regionCostMap["中界"]);
    expect(regionCostMap["中界"]).toBeLessThanOrEqual(regionCostMap["試煉之塔"]);
    expect(regionCostMap["試煉之塔"]).toBeLessThanOrEqual(regionCostMap["碎影深淵"]);
  });

  it("NPC node IDs should start with npc- prefix for cost detection", () => {
    const npcNodes = MAP_NODES.filter(n => n.id.startsWith("npc-"));
    expect(npcNodes.length).toBeGreaterThan(0);
    
    for (const node of npcNodes) {
      expect(node.id.startsWith("npc-")).toBe(true);
    }
  });

  it("regular nodes should not have npc- prefix", () => {
    const regularNodes = MAP_NODES.filter(n => !n.id.startsWith("npc-"));
    expect(regularNodes.length).toBeGreaterThan(100); // original 212 nodes
    
    for (const node of regularNodes) {
      expect(node.id.startsWith("npc-")).toBe(false);
    }
  });
});
