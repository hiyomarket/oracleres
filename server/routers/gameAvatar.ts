/**
 * gameAvatar.ts
 * 靈相換裝系統 tRPC Router
 * PROPOSAL-20260323-GAME-靈相換裝系統
 *
 * 四個 Procedures：
 *   gameAvatar.getEquipped       - 取得用戶當前裝備中的所有部件
 *   gameAvatar.getInventory      - 取得用戶擁有的所有虛擬服裝（含裝備狀態）
 *   gameAvatar.saveOutfit        - 儲存換裝設定（切換 isEquipped 旗標）
 *   gameAvatar.submitDailyAura   - 提交每日穿搭並計算 Aura Score
 *
 * Aura Score 計算直接 import 現有 wuxingEngine.ts，不重複建立五行邏輯。
 */

import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb, getUserProfileForEngine } from "../db";
import { users, gameWardrobe, gameDailyAura, gameItems } from "../../drizzle/schema";
import { generateDailyQuest, checkQuestCompletion, QUEST_REWARD } from "../utils/questEngine";
import {
  calculateEnvironmentElements,
  calculateWeightedElements,
  SUPPLEMENT_PRIORITY,
} from "../lib/wuxingEngine";
import { getFullDateInfo, getTaiwanDate } from "../lib/lunarCalendar";

/** 取得台灣時間的 YYYY-MM-DD 字串 */
function getTaiwanDateStr(): string {
  const tw = getTaiwanDate();
  const y = tw.getUTCFullYear();
  const m = String(tw.getUTCMonth() + 1).padStart(2, "0");
  const d = String(tw.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// // ─── 五行屬性 → 中文對照 ───────────────────────────────
const WUXING_ZH: Record<string, string> = {
  wood: "木",
  fire: "火",
  earth: "土",
  metal: "金",
  water: "水",
};

// ─── 中文五行 → 英文 key ───────────────────────────────
const WUXING_ZH_TO_EN: Record<string, string> = {
  "木": "wood",
  "火": "fire",
  "土": "earth",
  "金": "metal",
  "水": "water",
};

// ─── 命盤連動初始化層別（TASK-004 種子資料支援的圖層） ─────────────
const INITIAL_LAYERS = ["top", "bottom", "shoes", "bracelet"] as const;

// ─── 圖層順序（渲染時由下至上疊加） ──────────────────────────────
export const LAYER_ORDER = [
  "background",
  "body",
  "bottom",
  "top",
  "shoes",
  "hair",
  "accessory",
] as const;
export type AvatarLayer = (typeof LAYER_ORDER)[number];

// ─── 計算 Aura Score ──────────────────────────────────────────
/**
 * 根據裝備的五行屬性陣列與今日建議五行，計算 Aura Score（0-100）
 *
 * 計分規則：
 *   - 每件裝備的五行與「補運優先級」（火>土>金）的契合度決定基礎分
 *   - 今日加權五行最高的元素若與裝備吻合，給予額外加成
 *   - 裝備數量（7 件齊全）給予完整度加成
 */
function computeAuraScore(
  equippedWuxingList: string[],
  supplementPriority: readonly string[],
  todayTopElement: string
): number {
  if (equippedWuxingList.length === 0) return 0;

  // 補運優先級分數映射（火=1st=40, 土=2nd=25, 金=3rd=15, 其餘=5）
  const priorityScore: Record<string, number> = {};
  supplementPriority.forEach((el, idx) => {
    priorityScore[el] = idx === 0 ? 40 : idx === 1 ? 25 : 15;
  });

  let baseScore = 0;
  for (const wuxing of equippedWuxingList) {
    const zhEl = WUXING_ZH[wuxing] ?? wuxing;
    baseScore += priorityScore[zhEl] ?? 5;
  }
  // 平均分（避免堆砌同一件衣服刷分）
  const avgScore = baseScore / equippedWuxingList.length;

  // 今日最旺元素加成（最多 +20）
  const todayBonus = equippedWuxingList.some(
    (w) => (WUXING_ZH[w] ?? w) === todayTopElement
  )
    ? 20
    : 0;

  // 裝備完整度加成（7 件齊全 +10，5-6 件 +5）
  const completenessBonus =
    equippedWuxingList.length >= 7 ? 10 : equippedWuxingList.length >= 5 ? 5 : 0;

  return Math.min(100, Math.round(avgScore + todayBonus + completenessBonus));
}

// ─── 祝福等級判定 ─────────────────────────────────────────────
function getBlessingLevel(score: number): "none" | "normal" | "good" | "destiny" {
  if (score >= 80) return "destiny";
  if (score >= 60) return "good";
  if (score >= 30) return "normal";
  return "none";
}

// ─── 祝福等級說明 ─────────────────────────────────────────────
export const BLESSING_DESCRIPTIONS: Record<string, { label: string; effects: string[] }> = {
  none: {
    label: "無祝福",
    effects: ["未完成穿搭或五行嚴重失調，今日無加成"],
  },
  normal: {
    label: "普通祝福",
    effects: ["今日 HP 上限 +10%", "今日採集數量 +1", "今日逃跑率 +30%"],
  },
  good: {
    label: "良好祝福",
    effects: ["今日全屬性 +8%", "今日怪物掉落率 +15%", "今日捕捉率 +20%"],
  },
  destiny: {
    label: "天命祝福",
    effects: ["今日全屬性 +15%", "今日稀有掉落 +30%", "今日可視範圍 +1 格"],
  },
};

// ─── 預設示範服裝（無任何道具時的 fallback） ─────────────────────
const DEFAULT_ITEMS: Array<{
  layer: AvatarLayer;
  imageUrl: string;
  wuxing: string;
  rarity: string;
  itemId: number;
}> = [
  {
    layer: "body",
    imageUrl: "https://placehold.co/200x400/1a2a3a/gold?text=素體",
    wuxing: "wood",
    rarity: "common",
    itemId: 0,
  },
  {
    layer: "hair",
    imageUrl: "https://placehold.co/200x400/1a2a3a/gold?text=髮型",
    wuxing: "wood",
    rarity: "common",
    itemId: 0,
  },
  {
    layer: "top",
    imageUrl: "https://placehold.co/200x400/1a2a3a/gold?text=上衣",
    wuxing: "fire",
    rarity: "common",
    itemId: 0,
  },
  {
    layer: "bottom",
    imageUrl: "https://placehold.co/200x400/1a2a3a/gold?text=下衣",
    wuxing: "earth",
    rarity: "common",
    itemId: 0,
  },
  {
    layer: "shoes",
    imageUrl: "https://placehold.co/200x400/1a2a3a/gold?text=鞋子",
    wuxing: "metal",
    rarity: "common",
    itemId: 0,
  },
  {
    layer: "accessory",
    imageUrl: "https://placehold.co/200x400/1a2a3a/gold?text=飾品",
    wuxing: "water",
    rarity: "common",
    itemId: 0,
  },
  {
    layer: "background",
    imageUrl: "https://placehold.co/400x500/0d1b2a/1a3a5a?text=背景",
    wuxing: "water",
    rarity: "common",
    itemId: 0,
  },
];

// ─── Router ───────────────────────────────────────────────────
export const gameAvatarRouter = router({
  /**
   * 取得用戶當前裝備中的所有部件（isEquipped = 1）
   *
   * 命盤連動初始化邏輯（PROPOSAL-20260323-GAME-命盤連動初始外觀）：
   *   當 game_wardrobe 完全空白時，讀取用戶日主五行，自動從 game_items
   *   中選取對應五行的 4 件初始服裝，寫入 game_wardrobe 並裝備。
   *   回傳 isFirstTime: true 讓前端播放靈相覺醒動畫。
   */
  getEquipped: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    // 檢查用戶是否已有任何服裝道具（含未裝備的）
    const allWardrobe = await db
      .select()
      .from(gameWardrobe)
      .where(eq(gameWardrobe.userId, ctx.user.id));

    // ─── 命盤連動初始化：用戶首次進入靈相空間 ─────────────
    if (allWardrobe.length === 0) {
      // 1. 取得用戶日主五行 + 性別
      const profile = await getUserProfileForEngine(ctx.user.id);
      const dayMasterZh = profile.dayMasterElement; // 中文（木/火/土/金/水）
      const dayMasterEn = WUXING_ZH_TO_EN[dayMasterZh] ?? "wood";
      // 性別：從 userProfiles.gender 讀取，未填寫時預設 female
      const userGender = profile.gender === "male" ? "male" : "female";

      // 2. 從 game_items 查詢對應五行 + 性別的初始部件（front 視角為主）
      const initialItems = await db
        .select()
        .from(gameItems)
        .where(
          and(
            eq(gameItems.isInitial, 1),
            eq(gameItems.wuxing, dayMasterEn),
            eq(gameItems.view, "front"),
            eq(gameItems.gender, userGender)
          )
        );

      // 3. 從初始道具中選取指定圖層（每層取一件）
      const selectedItems: typeof initialItems = [];
      for (const layer of INITIAL_LAYERS) {
        const match = initialItems.find((i) => i.layer === layer);
        if (match) selectedItems.push(match);
      }

      // 4. 寫入 game_wardrobe
      let isFirstTime = false;
      if (selectedItems.length > 0) {
        for (const item of selectedItems) {
          await db.insert(gameWardrobe).values({
            userId: ctx.user.id,
            itemId: item.id,
            layer: item.layer,
            imageUrl: item.imageUrl,
            wuxing: item.wuxing,
            rarity: item.rarity,
            isEquipped: 1,
            acquiredAt: new Date(),
          });
        }
        isFirstTime = true;
      }

      // 5. 重新查詢已裝備的道具
      const newEquipped = await db
        .select()
        .from(gameWardrobe)
        .where(
          and(
            eq(gameWardrobe.userId, ctx.user.id),
            eq(gameWardrobe.isEquipped, 1)
          )
        );

      // 五行能力値：木=HP、火=攻擊、土=防御、金=速度、水=MP
      const nr = profile.natalElementRatio;
      const natalStats = {
        hp: Math.round((nr["木"] ?? 0.2) * 500),
        atk: Math.round((nr["火"] ?? 0.2) * 100),
        def: Math.round((nr["土"] ?? 0.2) * 100),
        spd: Math.round((nr["金"] ?? 0.2) * 100),
        mp: Math.round((nr["水"] ?? 0.2) * 300),
      };

      // 若 game_items 尚無對應五行的初始道具，回傳預設示範服裝
      if (newEquipped.length === 0) {
        return {
          items: DEFAULT_ITEMS.map((item, idx) => ({
            id: -(idx + 1),
            userId: ctx.user.id,
            itemId: item.itemId,
            layer: item.layer,
            imageUrl: item.imageUrl,
            wuxing: item.wuxing,
            rarity: item.rarity,
            isEquipped: 1,
            acquiredAt: new Date(),
            isDefault: true,
          })),
          isFirstTime: false,
          dayMasterElement: dayMasterZh,
          dayMasterElementEn: dayMasterEn,
          userGender,
          natalStats,
        };
      }

      return {
        items: newEquipped.map((item) => ({ ...item, isDefault: false })),
        isFirstTime,
        dayMasterElement: dayMasterZh,
        dayMasterElementEn: dayMasterEn,
        userGender,
        natalStats,
      };
    }

    // ─── 回訪用戶：直接返回裝備中的道具 + 命格資料 ──────────────
    const equipped = allWardrobe.filter((i) => i.isEquipped === 1);
    // 回訪用戶也讀取命格資料（五行能力値 + 性別）
    const revisitProfile = await getUserProfileForEngine(ctx.user.id);
    const revisitGender = revisitProfile.gender === "male" ? "male" : "female";
    const revisitNr = revisitProfile.natalElementRatio;
    const revisitStats = {
      hp: Math.round((revisitNr["木"] ?? 0.2) * 500),
      atk: Math.round((revisitNr["火"] ?? 0.2) * 100),
      def: Math.round((revisitNr["土"] ?? 0.2) * 100),
      spd: Math.round((revisitNr["金"] ?? 0.2) * 100),
      mp: Math.round((revisitNr["水"] ?? 0.2) * 300),
    };
    return {
      items: equipped.map((item) => ({ ...item, isDefault: false })),
      isFirstTime: false,
      dayMasterElement: revisitProfile.dayMasterElement,
      dayMasterElementEn: WUXING_ZH_TO_EN[revisitProfile.dayMasterElement] ?? null,
      userGender: revisitGender,
      natalStats: revisitStats,
    };
  }),

  /**
   * 取得用戶擁有的所有虛擬服裝（含裝備狀態）
   * 依圖層分組返回，方便前端衣櫃面板渲染
   */
  getInventory: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    const items = await db
      .select()
      .from(gameWardrobe)
      .where(eq(gameWardrobe.userId, ctx.user.id));

    // 依圖層分組
    const grouped: Record<string, typeof items> = {};
    for (const layer of LAYER_ORDER) {
      grouped[layer] = items.filter((i) => i.layer === layer);
    }

    return { items, grouped };
  }),

  /**
   * 儲存換裝設定
   * 傳入 equippedIds（要裝備的 ID 陣列），系統會：
   *   1. 將該用戶所有 isEquipped 設為 0
   *   2. 將 equippedIds 中的 ID 設為 1
   *   注意：每個圖層只能裝備一件（由前端保證，後端不重複驗證）
   */
  saveOutfit: protectedProcedure
    .input(
      z.object({
        equippedIds: z.array(z.number()).max(7, "最多 7 件裝備"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      // 先全部取消裝備
      await db
        .update(gameWardrobe)
        .set({ isEquipped: 0 })
        .where(eq(gameWardrobe.userId, ctx.user.id));

      // 再裝備選中的
      if (input.equippedIds.length > 0) {
        // 逐一更新（避免 IN 語法的 Drizzle 複雜性）
        for (const id of input.equippedIds) {
          await db
            .update(gameWardrobe)
            .set({ isEquipped: 1 })
            .where(
              and(
                eq(gameWardrobe.id, id),
                eq(gameWardrobe.userId, ctx.user.id) // 安全驗證：只能更新自己的道具
              )
            );
        }
      }

      return { success: true, equippedCount: input.equippedIds.length };
    }),

  /**
   * 提交每日穿搭並計算 Aura Score
   * 每日只能提交一次（以台灣時間 YYYY-MM-DD 為 key）
   * 計算邏輯直接使用 wuxingEngine.ts，確保與全站五行邏輯一致
   */
  submitDailyAura: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    // 取得台灣今日日期
    const todayStr = getTaiwanDateStr();

    // 檢查今日是否已提交
    const existing = await db
      .select()
      .from(gameDailyAura)
      .where(
        and(
          eq(gameDailyAura.userId, ctx.user.id),
          eq(gameDailyAura.recordDate, todayStr)
        )
      );

    if (existing.length > 0) {
      return {
        alreadySubmitted: true,
        score: existing[0].score,
        blessingLevel: existing[0].blessingLevel,
        blessing: BLESSING_DESCRIPTIONS[existing[0].blessingLevel] ?? BLESSING_DESCRIPTIONS.none,
        recordDate: todayStr,
      };
    }

    // 取得當前裝備的五行屬性
    const equipped = await db
      .select({ wuxing: gameWardrobe.wuxing })
      .from(gameWardrobe)
      .where(
        and(
          eq(gameWardrobe.userId, ctx.user.id),
          eq(gameWardrobe.isEquipped, 1)
        )
      );

    const equippedWuxingList = equipped.map((e) => e.wuxing);

    // 使用 wuxingEngine 計算今日最旺五行（作為建議方向）
    const now = new Date();
    const dateInfo = getFullDateInfo(now);
    const env = calculateEnvironmentElements(
      dateInfo.yearPillar.stem,
      dateInfo.yearPillar.branch,
      dateInfo.monthPillar.stem,
      dateInfo.monthPillar.branch,
      dateInfo.dayPillar.stem,
      dateInfo.dayPillar.branch
    );
    const weighted = calculateWeightedElements(env, undefined, undefined, undefined, now);

    // 找出今日加權最高的五行
    const todayTopElement = Object.entries(weighted.weighted).reduce(
      (best, [el, val]) => (val > best.val ? { el, val } : best),
      { el: "火", val: 0 }
    ).el;

    // 計算 Aura Score
    const score = computeAuraScore(equippedWuxingList, SUPPLEMENT_PRIORITY, todayTopElement);
    const blessingLevel = getBlessingLevel(score);

    // 寫入資料庫
    await db.insert(gameDailyAura).values({
      userId: ctx.user.id,
      recordDate: todayStr,
      score,
      blessingLevel,
      equippedWuxing: JSON.stringify(equippedWuxingList),
      recommendedWuxing: todayTopElement,
      createdAt: new Date(),
    });

    // ─── 每日穿搭任務判定 ─────────────────────────────────────
    const quest = generateDailyQuest(now);
    const questCompleted = checkQuestCompletion(equippedWuxingList, quest.targetWuxing, quest.minItems);
    let earnedStones = 0;
    if (questCompleted) {
      earnedStones = QUEST_REWARD.stones;
      const [currentUser] = await db
        .select({ gameStones: users.gameStones })
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);
      if (currentUser) {
        await db
          .update(users)
          .set({ gameStones: (currentUser.gameStones ?? 0) + earnedStones })
          .where(eq(users.id, ctx.user.id));
      }
      await db
        .update(gameDailyAura)
        .set({ questCompleted: 1, earnedStones })
        .where(
          and(
            eq(gameDailyAura.userId, ctx.user.id),
            eq(gameDailyAura.recordDate, todayStr)
          )
        );
    }

    return {
      alreadySubmitted: false,
      score,
      blessingLevel,
      blessing: BLESSING_DESCRIPTIONS[blessingLevel],
      todayTopElement,
      equippedCount: equippedWuxingList.length,
      recordDate: todayStr,
      questCompleted,
      earnedStones,
      questTargetWuxing: quest.targetWuxing,
    };
  }),

  /**
   * 取得今日穿搭任務
   * 生成今日挑戰五行，並回傳是否已完成
   */
  getDailyQuest: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const todayStr = getTaiwanDateStr();
    const quest = generateDailyQuest();
    const [record] = await db
      .select({ questCompleted: gameDailyAura.questCompleted, earnedStones: gameDailyAura.earnedStones })
      .from(gameDailyAura)
      .where(
        and(
          eq(gameDailyAura.userId, ctx.user.id),
          eq(gameDailyAura.recordDate, todayStr)
        )
      )
      .limit(1);
    return {
      ...quest,
      alreadyCompleted: record?.questCompleted === 1,
      earnedStones: record?.earnedStones ?? 0,
    };
  }),

  /**
   * 取得今日 Aura Score 狀態（用於頁面初始化顯示）
   */
  getTodayAura: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;

    const todayStr = getTaiwanDateStr();

    const [record] = await db
      .select()
      .from(gameDailyAura)
      .where(
        and(
          eq(gameDailyAura.userId, ctx.user.id),
          eq(gameDailyAura.recordDate, todayStr)
        )
      );

    if (!record) return null;

    return {
      ...record,
      blessing: BLESSING_DESCRIPTIONS[record.blessingLevel] ?? BLESSING_DESCRIPTIONS.none,
    };
  }),

  /**
   * 取得 game_items 中的服裝道具（依視角筛選）
   * 用於前端衣櫫面板顯示可用服裝
   */
  getItemsByView: protectedProcedure
    .input(
      z.object({
        view: z.enum(["front", "left45", "right45"]).default("front"),
        gender: z.enum(["female", "male", "unisex"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const conditions = [eq(gameItems.view, input.view)];
      if (input.gender) {
        conditions.push(eq(gameItems.gender, input.gender));
      }

      const items = await db
        .select()
        .from(gameItems)
        .where(and(...conditions));

      // 依圖層分組
      const grouped: Record<string, typeof items> = {};
      for (const item of items) {
        if (!grouped[item.layer]) grouped[item.layer] = [];
        grouped[item.layer].push(item);
      }

      return { items, grouped };
    }),

  /**
   * 取得 game_items 中所有初始道具（is_initial = 1）
   * 包含三視角，並將同一部件的三視角圖片對映為 viewImages
   */
  getAllInitialItems: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    const items = await db
      .select()
      .from(gameItems)
      .where(eq(gameItems.isInitial, 1));

    // 將三視角圖片對映到同一部件（以 layer+wuxing+gender 為 key）
    type ItemWithViews = (typeof items)[0] & { viewImages: Record<string, string> };
    const mergedMap: Record<string, ItemWithViews> = {};

    for (const item of items) {
      const key = `${item.layer}-${item.wuxing}-${item.gender}`;
      if (!mergedMap[key]) {
        mergedMap[key] = { ...item, viewImages: {} };
      }
      mergedMap[key].viewImages[item.view] = item.imageUrl;
      // 以 front 視角的資料為主要代表
      if (item.view === "front") {
        mergedMap[key] = { ...item, viewImages: mergedMap[key].viewImages };
      }
    }

    const merged = Object.values(mergedMap);
    const grouped: Record<string, typeof merged> = {};
    for (const item of merged) {
      if (!grouped[item.layer]) grouped[item.layer] = [];
      grouped[item.layer].push(item);
    }

    return { items: merged, grouped };
  }),

  /**
   * 取得今日五行建議（供換裝頁面頂部顯示）
   */
  getDailyAdvice: protectedProcedure.query(async () => {
    const now = new Date();
    const dateInfo = getFullDateInfo(now);
    const env = calculateEnvironmentElements(
      dateInfo.yearPillar.stem,
      dateInfo.yearPillar.branch,
      dateInfo.monthPillar.stem,
      dateInfo.monthPillar.branch,
      dateInfo.dayPillar.stem,
      dateInfo.dayPillar.branch
    );
    const weighted = calculateWeightedElements(env, undefined, undefined, undefined, now);

    // 補運優先級（用神）
    const supplementPriority = [...SUPPLEMENT_PRIORITY];

    // 今日最旺五行
    const sorted = Object.entries(weighted.weighted).sort(([, a], [, b]) => b - a);
    const topElement = sorted[0][0];
    const weakElement = sorted[sorted.length - 1][0];

    return {
      topElement,
      weakElement,
      supplementPriority,
      dayPillar: dateInfo.dayPillar,
      advice: `今日${topElement}能量旺盛，建議穿搭${supplementPriority[0]}、${supplementPriority[1]}屬性服裝以補運`,
    };
  }),
});
