/**
 * gameShop.ts
 * 虛擬服裝商城 tRPC Router
 * PROPOSAL-20260323-GAME-虛擬服裝商城
 *
 * Procedures:
 * - getItems: 取得商城上架商品列表（依貨幣類型分區）
 * - purchaseItem: 購買商品（DB Transaction 確保扣款與發放原子性）
 * - getBalance: 取得用戶天命幣與靈石餘額
 */

import { z } from "zod";
import { eq, and, ne } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { users, gameItems, gameWardrobe } from "../../drizzle/schema";

// ─── 商城商品列表 ─────────────────────────────────────────────
export const gameShopRouter = router({

  /**
   * 取得商城上架商品列表
   * 回傳依 currencyType 分區的商品清單
   */
  getItems: protectedProcedure
    .input(z.object({
      currencyType: z.enum(["coins", "stones", "all"]).default("all"),
      layer: z.string().optional(),
      wuxing: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料庫連線失敗" });

      // 查詢上架商品（isOnSale = 1，排除初始道具）
      const allItems = await db
        .select()
        .from(gameItems)
        .where(
          and(
            eq(gameItems.isOnSale, 1),
            eq(gameItems.isInitial, 0)
          )
        );

      // 依 currencyType 篩選
      let filtered = allItems;
      if (input?.currencyType && input.currencyType !== "all") {
        filtered = allItems.filter((i) => i.currencyType === input.currencyType);
      }
      if (input?.layer) {
        filtered = filtered.filter((i) => i.layer === input.layer);
      }
      if (input?.wuxing) {
        filtered = filtered.filter((i) => i.wuxing === input.wuxing);
      }

      // 查詢用戶已擁有的道具 ID（避免重複購買）
      const owned = await db
        .select({ itemId: gameWardrobe.itemId })
        .from(gameWardrobe)
        .where(eq(gameWardrobe.userId, ctx.user.id));
      const ownedIds = new Set(owned.map((o) => o.itemId));

      // 分區回傳
      const coinsItems = filtered
        .filter((i) => i.currencyType === "coins")
        .map((i) => ({ ...i, isOwned: ownedIds.has(i.id) }));
      const stonesItems = filtered
        .filter((i) => i.currencyType === "stones")
        .map((i) => ({ ...i, isOwned: ownedIds.has(i.id) }));

      return { coinsItems, stonesItems, total: filtered.length };
    }),

  /**
   * 取得用戶天命幣與靈石餘額
   */
  getBalance: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料庫連線失敗" });

    const [user] = await db
      .select({
        gameCoins: users.gameCoins,
        gameStones: users.gameStones,
      })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "用戶不存在" });

    return {
      gameCoins: user.gameCoins,
      gameStones: user.gameStones,
    };
  }),

  /**
   * 購買商品
   * 使用 DB Transaction 確保扣款與發放的原子性
   */
  purchaseItem: protectedProcedure
    .input(z.object({
      itemId: z.number().int().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料庫連線失敗" });

      // 1. 查詢商品
      const [item] = await db
        .select()
        .from(gameItems)
        .where(
          and(
            eq(gameItems.id, input.itemId),
            eq(gameItems.isOnSale, 1)
          )
        )
        .limit(1);

      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "商品不存在或已下架" });
      }

      // 2. 確認未重複購買
      const [existing] = await db
        .select({ id: gameWardrobe.id })
        .from(gameWardrobe)
        .where(
          and(
            eq(gameWardrobe.userId, ctx.user.id),
            eq(gameWardrobe.itemId, input.itemId)
          )
        )
        .limit(1);

      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "您已擁有此道具" });
      }

      // 3. 查詢用戶餘額
      const [user] = await db
        .select({
          gameCoins: users.gameCoins,
          gameStones: users.gameStones,
        })
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "用戶不存在" });

      // 4. 確認餘額充足
      if (item.currencyType === "coins") {
        if (user.gameCoins < item.price) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `天命幣不足（需要 ${item.price}，目前 ${user.gameCoins}）`,
          });
        }
      } else if (item.currencyType === "stones") {
        if (user.gameStones < item.price) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `靈石不足（需要 ${item.price}，目前 ${user.gameStones}）`,
          });
        }
      }

      // 5. Transaction：扣款 + 發放道具
      await db.transaction(async (tx) => {
        // 扣款
        if (item.currencyType === "coins") {
          await tx
            .update(users)
            .set({ gameCoins: user.gameCoins - item.price })
            .where(eq(users.id, ctx.user.id));
        } else if (item.currencyType === "stones") {
          await tx
            .update(users)
            .set({ gameStones: user.gameStones - item.price })
            .where(eq(users.id, ctx.user.id));
        }

        // 發放道具至衣櫃
        await tx.insert(gameWardrobe).values({
          userId: ctx.user.id,
          itemId: item.id,
          layer: item.layer,
          imageUrl: item.imageUrl,
          wuxing: item.wuxing,
          rarity: item.rarity,
          isEquipped: 0,
        });
      });

      // 6. 查詢更新後的餘額
      const [updated] = await db
        .select({ gameCoins: users.gameCoins, gameStones: users.gameStones })
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      return {
        success: true,
        itemName: item.name,
        currencyType: item.currencyType,
        price: item.price,
        newBalance: {
          gameCoins: updated?.gameCoins ?? 0,
          gameStones: updated?.gameStones ?? 0,
        },
      };
    }),
});
