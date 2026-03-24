/**
 * 拍賣行系統 Router
 * 全服公用市場：玩家可上架/下架道具，其他玩家可購買
 * 每位玩家最多同時上架 3 件
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  auctionListings,
  gameAgents,
  agentInventory,
  gameInventoryItems,
} from "../../drizzle/schema";

const MAX_LISTINGS_PER_PLAYER = 3;

export const auctionRouter = router({
  // ─── 取得全服在售列表 ───
  getListings: protectedProcedure
    .input(z.object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(50).default(20),
      element: z.string().optional(),
      rarity: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { listings: [], total: 0 };
      const { page, pageSize } = input;
      const offset = (page - 1) * pageSize;

      const rows = await db.select().from(auctionListings)
        .where(eq(auctionListings.status, "active"))
        .orderBy(desc(auctionListings.createdAt))
        .limit(pageSize)
        .offset(offset);

      const countRows = await db.select({ id: auctionListings.id })
        .from(auctionListings)
        .where(eq(auctionListings.status, "active"));

      return { listings: rows, total: countRows.length };
    }),

  // ─── 取得我的上架列表 ───
  getMyListings: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { listings: [], activeCount: 0 };
      const myUserId = String(ctx.user.id);

      const [agent] = await db.select({ id: gameAgents.id })
        .from(gameAgents)
        .where(eq(gameAgents.userId, myUserId))
        .limit(1);
      if (!agent) return { listings: [], activeCount: 0 };

      const listings = await db.select().from(auctionListings)
        .where(eq(auctionListings.sellerAgentId, agent.id))
        .orderBy(desc(auctionListings.createdAt))
        .limit(50);

      const activeCount = listings.filter(l => l.status === "active").length;
      return { listings, activeCount };
    }),

  // ─── 上架道具 ───
  listItem: protectedProcedure
    .input(z.object({
      inventoryId: z.number().int(),
      quantity: z.number().int().min(1),
      price: z.number().int().min(1).max(9999999),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const myUserId = String(ctx.user.id);

      const [agent] = await db.select()
        .from(gameAgents)
        .where(eq(gameAgents.userId, myUserId))
        .limit(1);
      if (!agent) throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });

      // 檢查上架數量限制
      const activeListings = await db.select().from(auctionListings)
        .where(and(
          eq(auctionListings.sellerAgentId, agent.id),
          eq(auctionListings.status, "active")
        ));
      if (activeListings.length >= MAX_LISTINGS_PER_PLAYER) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `每位旅人最多同時上架 ${MAX_LISTINGS_PER_PLAYER} 件道具`,
        });
      }

      // 取得背包道具
      const [invItem] = await db.select()
        .from(agentInventory)
        .where(and(
          eq(agentInventory.id, input.inventoryId),
          eq(agentInventory.agentId, agent.id)
        ))
        .limit(1);
      if (!invItem) throw new TRPCError({ code: "NOT_FOUND", message: "道具不存在" });
      if (invItem.quantity < input.quantity) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "道具數量不足" });
      }

      // 取得道具資訊（從 gameInventoryItems 目錄）
      const [itemInfo] = await db.select()
        .from(gameInventoryItems)
        .where(eq(gameInventoryItems.itemKey, invItem.itemId))
        .limit(1);

      const itemName = itemInfo?.name ?? invItem.itemId;
      const itemRarity = itemInfo?.rarity ?? "common";
      const itemElement = itemInfo?.wuxing ?? "";

      // 從背包扣除道具
      if (invItem.quantity === input.quantity) {
        await db.delete(agentInventory).where(eq(agentInventory.id, invItem.id));
      } else {
        await db.update(agentInventory)
          .set({ quantity: invItem.quantity - input.quantity })
          .where(eq(agentInventory.id, invItem.id));
      }

      // 建立拍賣行上架記錄
      const now = Date.now();
      await db.insert(auctionListings).values({
        sellerAgentId: agent.id,
        sellerName: agent.agentName ?? "旅人",
        itemId: invItem.itemId,
        itemName,
        itemRarity,
        itemElement,
        quantity: input.quantity,
        price: input.price,
        status: "active",
        createdAt: now,
        updatedAt: now,
      });

      return { success: true, itemName };
    }),

  // ─── 下架道具（退回背包） ───
  cancelListing: protectedProcedure
    .input(z.object({ listingId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const myUserId = String(ctx.user.id);

      const [agent] = await db.select({ id: gameAgents.id })
        .from(gameAgents)
        .where(eq(gameAgents.userId, myUserId))
        .limit(1);
      if (!agent) throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });

      const [listing] = await db.select().from(auctionListings)
        .where(and(
          eq(auctionListings.id, input.listingId),
          eq(auctionListings.sellerAgentId, agent.id),
          eq(auctionListings.status, "active")
        ))
        .limit(1);
      if (!listing) throw new TRPCError({ code: "NOT_FOUND", message: "上架記錄不存在或已售出" });

      // 退回背包
      const [existing] = await db.select().from(agentInventory)
        .where(and(
          eq(agentInventory.agentId, agent.id),
          eq(agentInventory.itemId, listing.itemId)
        ))
        .limit(1);

      const now = Date.now();
      if (existing) {
        await db.update(agentInventory)
          .set({ quantity: existing.quantity + listing.quantity, updatedAt: now })
          .where(eq(agentInventory.id, existing.id));
      } else {
        await db.insert(agentInventory).values({
          agentId: agent.id,
          itemId: listing.itemId,
          itemType: "material",
          quantity: listing.quantity,
          obtainedAt: now,
          acquiredAt: now,
          updatedAt: now,
        });
      }

      await db.update(auctionListings)
        .set({ status: "cancelled", updatedAt: now })
        .where(eq(auctionListings.id, input.listingId));

      return { success: true, itemName: listing.itemName };
    }),

  // ─── 購買道具 ───
  buyListing: protectedProcedure
    .input(z.object({ listingId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const myUserId = String(ctx.user.id);

      const [buyer] = await db.select()
        .from(gameAgents)
        .where(eq(gameAgents.userId, myUserId))
        .limit(1);
      if (!buyer) throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });

      const [listing] = await db.select().from(auctionListings)
        .where(and(
          eq(auctionListings.id, input.listingId),
          eq(auctionListings.status, "active")
        ))
        .limit(1);
      if (!listing) throw new TRPCError({ code: "NOT_FOUND", message: "商品不存在或已售出" });

      if (listing.sellerAgentId === buyer.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "不能購買自己上架的商品" });
      }

      if ((buyer.gold ?? 0) < listing.price) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `金幣不足，需要 ${listing.price} 金幣` });
      }

      const now = Date.now();

      // 扣除買家金幣
      await db.update(gameAgents)
        .set({ gold: (buyer.gold ?? 0) - listing.price })
        .where(eq(gameAgents.id, buyer.id));

      // 增加賣家金幣
      const [seller] = await db.select({ id: gameAgents.id, gold: gameAgents.gold })
        .from(gameAgents)
        .where(eq(gameAgents.id, listing.sellerAgentId))
        .limit(1);
      if (seller) {
        await db.update(gameAgents)
          .set({ gold: (seller.gold ?? 0) + listing.price })
          .where(eq(gameAgents.id, seller.id));
      }

      // 道具加入買家背包
      const [existing] = await db.select().from(agentInventory)
        .where(and(
          eq(agentInventory.agentId, buyer.id),
          eq(agentInventory.itemId, listing.itemId)
        ))
        .limit(1);

      if (existing) {
        await db.update(agentInventory)
          .set({ quantity: existing.quantity + listing.quantity, updatedAt: now })
          .where(eq(agentInventory.id, existing.id));
      } else {
        await db.insert(agentInventory).values({
          agentId: buyer.id,
          itemId: listing.itemId,
          itemType: "material",
          quantity: listing.quantity,
          obtainedAt: now,
          acquiredAt: now,
          updatedAt: now,
        });
      }

      // 更新拍賣記錄
      await db.update(auctionListings)
        .set({
          status: "sold",
          buyerAgentId: buyer.id,
          buyerName: buyer.agentName ?? "旅人",
          soldAt: now,
          updatedAt: now,
        })
        .where(eq(auctionListings.id, input.listingId));

      return {
        success: true,
        itemName: listing.itemName,
        price: listing.price,
        sellerName: listing.sellerName,
      };
    }),
});
