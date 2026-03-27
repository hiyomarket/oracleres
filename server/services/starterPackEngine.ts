/**
 * 新人禮包引擎
 * 首次建立角色時自動發放：
 * - 人物：2 件隨機白色裝備（不重複部位）
 * - 技能：根據角色最高屬性分配 1 個基本技能到技能欄
 * - 寵物：1 隻隨機普通級別魔物 + 1 個基本技能
 * - 道具：基本消耗品（回復藥水等）
 */
import { getDb } from "../db";
import {
  gameEquipmentCatalog,
  agentInventory,
  gameSkillCatalog,
  agentSkills,
  gamePetCatalog,
  gamePlayerPets,
  gamePetInnateSkills,
  gamePetLearnedSkills,
  agentEvents,
  gameItemCatalog,
} from "../../drizzle/schema";
import { eq, and, inArray } from "drizzle-orm";
import type { WuXing } from "../../shared/types";

// ─── 工具函數 ───
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function pickRandomN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// ─── 裝備部位列表 ───
const EQUIP_SLOTS = ["weapon", "helmet", "armor", "shoes", "accessory", "offhand"];

/**
 * 發放新人禮包
 * @param agentId 角色 ID
 * @param dominantElement 角色主屬性
 * @param nodeId 角色所在節點 ID
 */
export async function grantStarterPack(
  agentId: number,
  dominantElement: WuXing,
  nodeId: string,
): Promise<{ success: boolean; items: string[] }> {
  const db = await getDb();
  if (!db) return { success: false, items: [] };

  const grantedItems: string[] = [];
  const now = Date.now();

  try {
    // ═══════════════════════════════════════════════════
    // 1. 兩件隨機白色裝備（不重複部位）
    // ═══════════════════════════════════════════════════
    const whiteEquips = await db
      .select()
      .from(gameEquipmentCatalog)
      .where(
        and(
          eq(gameEquipmentCatalog.quality, "white"),
          eq(gameEquipmentCatalog.isActive, 1),
        ),
      );

    if (whiteEquips.length > 0) {
      // 按部位分組
      const bySlot: Record<string, typeof whiteEquips> = {};
      for (const e of whiteEquips) {
        const s = e.slot || "weapon";
        if (!bySlot[s]) bySlot[s] = [];
        bySlot[s].push(e);
      }

      // 隨機選 2 個不重複部位
      const availableSlots = Object.keys(bySlot);
      const selectedSlots = pickRandomN(availableSlots, Math.min(2, availableSlots.length));

      for (const slot of selectedSlots) {
        const equip = pickRandom(bySlot[slot]);
        await db.insert(agentInventory).values({
          agentId,
          itemId: equip.equipId,
          itemType: "equipment",
          quantity: 1,
          itemData: JSON.stringify({ enhanceLevel: 0, quality: "white" }),
          isEquipped: 0,
          obtainedAt: now,
          acquiredAt: now,
          updatedAt: now,
        });
        grantedItems.push(`🛡️ ${equip.name}（${slot}）`);
      }
    }

    // ═══════════════════════════════════════════════════
    // 2. 根據主屬性分配 1 個基本技能
    // ═══════════════════════════════════════════════════
    // 從技能圖鑑中找到對應屬性的最基本技能
    const elementSkills = await db
      .select()
      .from(gameSkillCatalog)
      .where(
        and(
          eq(gameSkillCatalog.wuxing, dominantElement),
          eq(gameSkillCatalog.isActive, 1),
        ),
      );

    // 找等級需求最低的技能
    const basicSkills = elementSkills
      .filter((s) => (s.learnLevel ?? 1) <= 1)
      .sort((a, b) => (a.learnLevel ?? 1) - (b.learnLevel ?? 1));

    if (basicSkills.length > 0) {
      const skill = basicSkills[0];
      // 檢查是否已有此技能
      const existing = await db
        .select()
        .from(agentSkills)
        .where(
          and(
            eq(agentSkills.agentId, agentId),
            eq(agentSkills.skillId, skill.skillId),
          ),
        )
        .limit(1);

      if (existing.length === 0) {
        await db.insert(agentSkills).values({
          agentId,
          skillId: skill.skillId,
          awakeTier: 0,
          useCount: 0,
          installedSlot: null,
        });
        grantedItems.push(`📜 ${skill.name}（${skill.wuxing}系技能）`);
      }
    }

    // ═══════════════════════════════════════════════════
    // 3. 隨機一隻普通級別魔物 + 基本技能
    // ═══════════════════════════════════════════════════
    const commonPets = await db
      .select()
      .from(gamePetCatalog)
      .where(
        and(
          eq(gamePetCatalog.rarity, "common"),
          eq(gamePetCatalog.isActive, 1),
        ),
      );

    if (commonPets.length > 0) {
      const pet = pickRandom(commonPets);

      // 建立玩家寵物
      const petResult = await db.insert(gamePlayerPets).values({
        agentId,
        petCatalogId: pet.id,
        nickname: pet.name,
        level: 1,
        exp: 0,
        tier: "C",
        bpConstitution: pet.baseBpConstitution ?? 20,
        bpStrength: pet.baseBpStrength ?? 20,
        bpDefense: pet.baseBpDefense ?? 20,
        bpAgility: pet.baseBpAgility ?? 20,
        bpMagic: pet.baseBpMagic ?? 20,
        bpUnallocated: 0,
        hp: 50,
        maxHp: 50,
        mp: 30,
        maxMp: 30,
        attack: 10,
        defense: 10,
        speed: 10,
        magicAttack: 10,
        growthType: pet.growthType ?? "balanced",
        isActive: 1, // 自動設為出戰寵物
        friendship: 10,
        capturedAt: now,
        updatedAt: now,
      });

      // 取得新建寵物的 ID
      const newPetId = (petResult as any)[0]?.insertId ?? (petResult as any).insertId;

      if (newPetId) {
        // 查找這隻寵物的天生技能（解鎖等級 = 1 的）
        const innateSkills = await db
          .select()
          .from(gamePetInnateSkills)
          .where(
            and(
              eq(gamePetInnateSkills.petCatalogId, pet.id),
              eq(gamePetInnateSkills.unlockLevel, 1),
            ),
          );

        // 如果有天生技能，學習第一個
        if (innateSkills.length > 0) {
          const innate = innateSkills[0];
          await db.insert(gamePetLearnedSkills).values({
            playerPetId: newPetId,
            skillName: innate.name,
            skillType: innate.skillType ?? "attack",
            skillKey: innate.name.toLowerCase().replace(/\s+/g, "_"),
            wuxing: innate.wuxing ?? pet.wuxing,
            powerPercent: innate.powerPercent ?? 100,
            mpCost: innate.mpCost ?? 5,
            cooldown: innate.cooldown ?? 2,
            skillLevel: 1,
            usageCount: 0,
          });
        }
      }

      grantedItems.push(`🐾 ${pet.name}（${pet.rarity}級寵物）`);
    }

    // ═══════════════════════════════════════════════════
    // 4. 基本消耗品道具
    // ═══════════════════════════════════════════════════
    const starterItems: Array<{ itemIdPattern: string; quantity: number; fallbackName: string }> = [
      { itemIdPattern: "I_POT_HP", quantity: 5, fallbackName: "生命藥水" },
      { itemIdPattern: "I_POT_MP", quantity: 3, fallbackName: "靈力藥水" },
      { itemIdPattern: "I_POT_STA", quantity: 2, fallbackName: "體力藥水" },
    ];

    for (const starter of starterItems) {
      // 嘗試從道具圖鑑找到匹配的道具
      const items = await db
        .select()
        .from(gameItemCatalog)
        .where(eq(gameItemCatalog.isActive, 1));

      const matched = items.find(
        (i) =>
          i.itemId === starter.itemIdPattern ||
          i.itemId.startsWith(starter.itemIdPattern) ||
          i.name.includes(starter.fallbackName),
      );

      if (matched) {
        // 檢查背包是否已有
        const existing = await db
          .select()
          .from(agentInventory)
          .where(
            and(
              eq(agentInventory.agentId, agentId),
              eq(agentInventory.itemId, matched.itemId),
            ),
          )
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(agentInventory)
            .set({
              quantity: existing[0].quantity + starter.quantity,
              updatedAt: now,
            })
            .where(eq(agentInventory.id, existing[0].id));
        } else {
          await db.insert(agentInventory).values({
            agentId,
            itemId: matched.itemId,
            itemType: "consumable",
            quantity: starter.quantity,
            obtainedAt: now,
            acquiredAt: now,
            updatedAt: now,
          });
        }
        grantedItems.push(`🧪 ${matched.name} x${starter.quantity}`);
      }
    }

    // ═══════════════════════════════════════════════════
    // 5. 記錄新人禮包事件
    // ═══════════════════════════════════════════════════
    if (grantedItems.length > 0) {
      await db.insert(agentEvents).values({
        agentId,
        eventType: "system",
        nodeId,
        message: `🎁 新人禮包已發放！\n${grantedItems.join("\n")}`,
        detail: { type: "starter_pack", items: grantedItems },
        createdAt: now,
      });
    }

    return { success: true, items: grantedItems };
  } catch (error) {
    console.error("[StarterPack] 發放失敗:", error);
    return { success: false, items: grantedItems };
  }
}
