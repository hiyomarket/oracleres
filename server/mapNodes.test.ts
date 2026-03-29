/**
 * v5.6 地圖節點 + NPC 關聯 + 道具代價 測試
 */
import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import { gameMapNodes, gameNpcCatalog, gameUnifiedSkillCatalog, gameItemCatalog } from "../drizzle/schema";
import { eq, sql, inArray } from "drizzle-orm";

describe("v5.6 Map Nodes System", () => {
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    db = await getDb();
  });

  describe("Map Nodes", () => {
    it("should have at least 30 map nodes", async () => {
      const nodes = await db!.select().from(gameMapNodes);
      expect(nodes.length).toBeGreaterThanOrEqual(30);
    });

    it("should have nodes in all 5 regions", async () => {
      const [result] = await db!.execute(
        sql`SELECT DISTINCT region FROM game_map_nodes ORDER BY region`
      ) as any;
      const regions = result.map((r: any) => r.region);
      expect(regions).toContain("初界");
      expect(regions).toContain("中界");
      expect(regions).toContain("迷霧城");
      expect(regions).toContain("試煉之塔");
      expect(regions).toContain("碎影深淵");
    });

    it("each node should have valid lat/lng coordinates", async () => {
      const nodes = await db!.select().from(gameMapNodes);
      for (const node of nodes) {
        expect(node.lat).toBeGreaterThan(-90);
        expect(node.lat).toBeLessThan(90);
        expect(node.lng).toBeGreaterThan(-180);
        expect(node.lng).toBeLessThan(180);
      }
    });

    it("each node should have a real world name", async () => {
      const nodes = await db!.select().from(gameMapNodes);
      for (const node of nodes) {
        expect(node.realWorldName).toBeTruthy();
      }
    });

    it("should have correct region distribution", async () => {
      const [result] = await db!.execute(
        sql`SELECT region, COUNT(*) as cnt FROM game_map_nodes GROUP BY region`
      ) as any;
      const regionMap: Record<string, number> = {};
      for (const r of result) regionMap[r.region] = Number(r.cnt);
      
      expect(regionMap["迷霧城"]).toBeGreaterThanOrEqual(8);  // 主城
      expect(regionMap["初界"]).toBeGreaterThanOrEqual(8);     // 新手區
      expect(regionMap["中界"]).toBeGreaterThanOrEqual(8);     // 進階區
      expect(regionMap["試煉之塔"]).toBeGreaterThanOrEqual(1);
      expect(regionMap["碎影深淵"]).toBeGreaterThanOrEqual(1);
    });
  });

  describe("NPC ↔ Map Node Links", () => {
    it("all 32 NPCs should have mapNodeId set", async () => {
      const npcs = await db!.select().from(gameNpcCatalog);
      expect(npcs.length).toBe(32);
      const withNode = npcs.filter((n: any) => n.mapNodeId != null);
      expect(withNode.length).toBe(32);
    });

    it("each NPC mapNodeId should reference a valid node", async () => {
      const npcs = await db!.select().from(gameNpcCatalog);
      const nodes = await db!.select({ id: gameMapNodes.id }).from(gameMapNodes);
      const nodeIds = new Set(nodes.map(n => n.id));
      
      for (const npc of npcs) {
        if ((npc as any).mapNodeId) {
          expect(nodeIds.has((npc as any).mapNodeId)).toBe(true);
        }
      }
    });

    it("NPC location should match node name", async () => {
      const npcs = await db!.select().from(gameNpcCatalog);
      const nodes = await db!.select().from(gameMapNodes);
      const nodeMap = new Map(nodes.map(n => [n.id, n]));
      
      for (const npc of npcs) {
        if ((npc as any).mapNodeId) {
          const node = nodeMap.get((npc as any).mapNodeId);
          expect(node).toBeTruthy();
          // NPC location should contain the node name
          expect((npc as any).location).toBe(node!.name);
        }
      }
    });
  });

  describe("Quest Item Costs for Epic/Legendary Skills", () => {
    it("all epic skills should have at least 1 item in learn_cost", async () => {
      const [skills] = await db!.execute(
        sql`SELECT id, name, learn_cost FROM game_unified_skill_catalog WHERE usable_by_player = 1 AND rarity = 'epic'`
      ) as any;
      
      for (const skill of skills) {
        const cost = typeof skill.learn_cost === "string" ? JSON.parse(skill.learn_cost) : skill.learn_cost;
        expect(cost.items, `Epic skill ${skill.name} (ID ${skill.id}) should have items`).toBeDefined();
        expect(cost.items.length, `Epic skill ${skill.name} should have >= 1 item`).toBeGreaterThanOrEqual(1);
      }
    });

    it("all legendary skills should have at least 2 items in learn_cost", async () => {
      const [skills] = await db!.execute(
        sql`SELECT id, name, learn_cost FROM game_unified_skill_catalog WHERE usable_by_player = 1 AND rarity = 'legendary'`
      ) as any;
      
      for (const skill of skills) {
        const cost = typeof skill.learn_cost === "string" ? JSON.parse(skill.learn_cost) : skill.learn_cost;
        expect(cost.items, `Legendary skill ${skill.name} (ID ${skill.id}) should have items`).toBeDefined();
        expect(cost.items.length, `Legendary skill ${skill.name} should have >= 2 items`).toBeGreaterThanOrEqual(2);
      }
    });

    it("all referenced item IDs should exist in game_item_catalog", async () => {
      const [skills] = await db!.execute(
        sql`SELECT id, name, learn_cost FROM game_unified_skill_catalog WHERE usable_by_player = 1 AND rarity IN ('epic', 'legendary')`
      ) as any;
      
      const allItemIds = new Set<string>();
      for (const skill of skills) {
        const cost = typeof skill.learn_cost === "string" ? JSON.parse(skill.learn_cost) : skill.learn_cost;
        if (cost.items) {
          for (const item of cost.items) {
            allItemIds.add(item.itemId);
          }
        }
      }
      
      const [items] = await db!.execute(
        sql`SELECT item_id FROM game_item_catalog WHERE category = 'quest'`
      ) as any;
      const existingIds = new Set(items.map((i: any) => i.item_id));
      
      for (const itemId of allItemIds) {
        expect(existingIds.has(itemId), `Item ${itemId} should exist in catalog`).toBe(true);
      }
    });

    it("quest items should have correct category and rarity", async () => {
      const [items] = await db!.execute(
        sql`SELECT item_id, name, category, rarity FROM game_item_catalog WHERE category = 'quest'`
      ) as any;
      
      expect(items.length).toBeGreaterThanOrEqual(30); // 32 quest items + 1 pre-existing
      
      for (const item of items) {
        expect(item.category).toBe("quest");
        expect(["common", "epic", "legendary"]).toContain(item.rarity);
      }
    });
  });
});
