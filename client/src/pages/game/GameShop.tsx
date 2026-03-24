/**
 * GameShop.tsx
 * 虛相世界商店頁面
 * 路由：/game/gameshop
 * 包含：
 *   - 一般商店（金幣購買）：消耗品、基礎素材
 *   - 靈石專區（靈石購買）：稀有道具、特殊素材
 *   - 密店（感知觸發）：隨機稀有商品
 */
import React, { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import GameTabLayout from "@/components/GameTabLayout";
import { ArrowLeft, RefreshCw, ShoppingBag, Gem, Eye, Sparkles, PackageOpen } from "lucide-react";
import { getItemInfo, RARITY_COLORS as SHARED_RARITY_COLORS } from "../../../../shared/itemNames";

// ─── 稀有度顏色 ─────────────────────────────────────────────
const RARITY_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  common:    { bg: "rgba(100,116,139,0.15)", border: "rgba(100,116,139,0.4)",  text: "#94a3b8", glow: "none" },
  rare:      { bg: "rgba(59,130,246,0.15)",  border: "rgba(59,130,246,0.5)",   text: "#60a5fa", glow: "0 0 8px rgba(59,130,246,0.3)" },
  epic:      { bg: "rgba(139,92,246,0.15)",  border: "rgba(139,92,246,0.5)",   text: "#a78bfa", glow: "0 0 10px rgba(139,92,246,0.4)" },
  legendary: { bg: "rgba(245,158,11,0.15)",  border: "rgba(245,158,11,0.5)",   text: "#fbbf24", glow: "0 0 14px rgba(245,158,11,0.5)" },
};

const RARITY_LABEL: Record<string, string> = {
  common: "普通", rare: "稀有", epic: "史詩", legendary: "傳說",
};

// ─── 購買確認彈窗 ─────────────────────────────────────────────
interface ConfirmModalProps {
  item: { displayName: string; description?: string | null; price: number; currency: "gold" | "stones"; rarity?: string } | null;
  balance: { gold: number; gameStones: number };
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}
const ConfirmModal: React.FC<ConfirmModalProps> = ({ item, balance, onConfirm, onCancel, isPending }) => {
  if (!item) return null;
  const isGold = item.currency === "gold";
  const currentBalance = isGold ? balance.gold : balance.gameStones;
  const canAfford = currentBalance >= item.price;
  const afterBalance = currentBalance - item.price;
  const rarity = item.rarity ?? "common";
  const rc = RARITY_COLORS[rarity] ?? RARITY_COLORS.common;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.75)" }}
      onClick={onCancel}
    >
      <div
        style={{ margin: "0 16px", width: "100%", maxWidth: "340px", borderRadius: "16px", border: `1px solid ${rc.border}`, background: "#0f1a2e", padding: "24px", boxShadow: rc.glow }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#e2e8f0", textAlign: "center", marginBottom: "16px" }}>確認購買</h3>
        {/* 商品資訊 */}
        <div style={{ padding: "12px", borderRadius: "10px", background: rc.bg, border: `1px solid ${rc.border}`, marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ fontSize: "18px" }}>{isGold ? "🛒" : "💎"}</span>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#e2e8f0" }}>{item.displayName}</span>
            <span style={{ marginLeft: "auto", fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: rc.bg, border: `1px solid ${rc.border}`, color: rc.text, fontWeight: 700 }}>
              {RARITY_LABEL[rarity] ?? rarity}
            </span>
          </div>
          {item.description && (
            <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>{item.description}</p>
          )}
        </div>
        {/* 餘額資訊 */}
        <div style={{ marginBottom: "16px", fontSize: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8" }}>
            <span>目前{isGold ? "金幣" : "靈石"}</span>
            <span style={{ color: "#e2e8f0" }}>{isGold ? "🪙" : "💎"} {currentBalance.toLocaleString()}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8" }}>
            <span>購買費用</span>
            <span style={{ color: canAfford ? "#ef4444" : "#f87171" }}>
              - {isGold ? "🪙" : "💎"} {item.price.toLocaleString()}
            </span>
          </div>
          <div style={{ height: "1px", background: "rgba(255,255,255,0.1)" }} />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#94a3b8" }}>購買後餘額</span>
            <span style={{ color: canAfford ? "#4ade80" : "#ef4444", fontWeight: 700 }}>
              {isGold ? "🪙" : "💎"} {afterBalance.toLocaleString()}
            </span>
          </div>
        </div>
        {!canAfford && (
          <p style={{ fontSize: "12px", color: "#ef4444", textAlign: "center", marginBottom: "12px" }}>
            {isGold ? "金幣" : "靈石"}不足，無法購買
          </p>
        )}
        {/* 按鈕 */}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={onCancel}
            style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#94a3b8", fontSize: "14px", cursor: "pointer" }}
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={!canAfford || isPending}
            style={{
              flex: 1, padding: "10px", borderRadius: "8px", border: "none",
              background: canAfford ? (isGold ? "linear-gradient(135deg, #d97706, #f59e0b)" : "linear-gradient(135deg, #7c3aed, #a78bfa)") : "rgba(100,116,139,0.3)",
              color: canAfford ? "#fff" : "#64748b", fontSize: "14px", fontWeight: 700,
              cursor: canAfford && !isPending ? "pointer" : "not-allowed",
              opacity: isPending ? 0.7 : 1,
            }}
          >
            {isPending ? "購買中..." : "確認購買"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── 商品卡片 ─────────────────────────────────────────────────
interface ShopItemCardProps {
  name: string;
  description?: string | null;
  price: number;
  currency: "gold" | "stones";
  rarity?: string;
  canAfford: boolean;
  onBuy: () => void;
}
const ShopItemCard: React.FC<ShopItemCardProps> = ({ name, description, price, currency, rarity = "common", canAfford, onBuy }) => {
  const rc = RARITY_COLORS[rarity] ?? RARITY_COLORS.common;
  const isGold = currency === "gold";
  return (
    <div
      style={{
        borderRadius: "12px",
        border: `1px solid ${rc.border}`,
        background: rc.bg,
        padding: "12px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        boxShadow: rc.glow,
      }}
    >
      {/* 頂部：名稱 + 稀有度 */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ fontSize: "16px" }}>{isGold ? "🛒" : "💎"}</span>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0", flex: 1 }}>{name}</span>
        <span style={{ fontSize: "9px", padding: "1px 5px", borderRadius: "3px", background: rc.bg, border: `1px solid ${rc.border}`, color: rc.text, fontWeight: 700 }}>
          {RARITY_LABEL[rarity] ?? rarity}
        </span>
      </div>
      {/* 描述 */}
      {description && (
        <p style={{ fontSize: "11px", color: "#94a3b8", lineHeight: 1.4 }}>{description}</p>
      )}
      {/* 底部：價格 + 購買按鈕 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
        <span style={{ fontSize: "13px", fontWeight: 700, color: isGold ? "#fbbf24" : "#a78bfa" }}>
          {isGold ? "🪙" : "💎"} {price.toLocaleString()}
        </span>
        <button
          onClick={onBuy}
          disabled={!canAfford}
          style={{
            padding: "5px 14px",
            borderRadius: "6px",
            border: "none",
            background: canAfford
              ? (isGold ? "linear-gradient(135deg, #d97706, #f59e0b)" : "linear-gradient(135deg, #7c3aed, #a78bfa)")
              : "rgba(100,116,139,0.3)",
            color: canAfford ? "#fff" : "#64748b",
            fontSize: "12px",
            fontWeight: 700,
            cursor: canAfford ? "pointer" : "not-allowed",
          }}
        >
          {canAfford ? "購買" : "不足"}
        </button>
      </div>
    </div>
  );
};

// ─── 主頁面 ─────────────────────────────────────────────
type ShopTab = "coin" | "stone" | "hidden" | "sell";

export default function GameShop() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<ShopTab>("coin");
  const [confirmItem, setConfirmItem] = useState<{
    id: number;
    displayName: string;
    description?: string | null;
    price: number;
    currency: "gold" | "stones";
    rarity?: string;
    shopType: "coin" | "stone" | "hidden";
  } | null>(null);

  // ─── 資料查詢 ───
  const { data, isLoading, refetch } = trpc.gameWorld.getGameShopItems.useQuery(undefined, {
    staleTime: 30000,
  });
  const { data: hiddenData, isLoading: hiddenLoading, refetch: refetchHidden } = trpc.gameWorld.getHiddenShopItems.useQuery(undefined, {
    enabled: activeTab === "hidden",
    staleTime: 0,
  });

  // ─── 購買 Mutation ───
  const buyGameItem = trpc.gameWorld.buyGameShopItem.useMutation({
    onSuccess: (res) => {
      toast.success(`✅ 購買成功！獲得「${res.itemName}」x${res.quantity}`);
      refetch();
      setConfirmItem(null);
    },
    onError: (err) => {
      toast.error(`❌ 購買失敗：${err.message}`);
      setConfirmItem(null);
    },
  });
  const buyHiddenItem = trpc.gameWorld.buyHiddenShopItem.useMutation({
    onSuccess: (res) => {
      toast.success(`🔮 密店購買成功！獲得「${res.itemName}」x${res.quantity}`);
      refetchHidden();
      setConfirmItem(null);
    },
    onError: (err) => {
      toast.error(`❌ 購買失敗：${err.message}`);
      setConfirmItem(null);
    },
  });

  const handleConfirmBuy = useCallback(() => {
    if (!confirmItem) return;
    if (confirmItem.shopType === "hidden") {
      buyHiddenItem.mutate({ itemId: confirmItem.id });
    } else {
      buyGameItem.mutate({ shopType: confirmItem.shopType, itemId: confirmItem.id });
    }
  }, [confirmItem, buyGameItem, buyHiddenItem]);

  const gold = data?.gold ?? 0;
  const gameStones = data?.gameStones ?? 0;
  const coinItems = data?.coinItems ?? [];
  const stoneItems = data?.stoneItems ?? [];

  // ─── Tab 設定 ───
  // ─── 背包道具查詢（販售用） ───
  const { data: invData, isLoading: invLoading, refetch: refetchInv } = trpc.gameWorld.getInventory.useQuery(undefined, {
    enabled: activeTab === "sell",
    staleTime: 0,
  });

  // ─── 販售 Mutation ───
  const sellItem = trpc.gameWorld.sellInventoryItem.useMutation({
    onSuccess: (res) => {
      toast.success(`💰 販售成功！「${res.itemName}」 x${res.quantity}，獲得 ${res.goldEarned} 金幣`);
      refetchInv();
      refetch();
    },
    onError: (err) => {
      toast.error(`❌ 販售失敗：${err.message}`);
    },
  });

  const TABS: { id: ShopTab; icon: string; label: string; color: string }[] = [
    { id: "coin",   icon: "🪙", label: "一般商店",  color: "#f59e0b" },
    { id: "stone",  icon: "💎", label: "靈石專區",  color: "#a78bfa" },
    { id: "hidden", icon: "🔮", label: "密店",       color: "#38bdf8" },
    { id: "sell",   icon: "📦", label: "販售道具", color: "#4ade80" },
  ];

  return (
    <GameTabLayout activeTab="shop">
      {/* 確認彈窗 */}
      {confirmItem && (
        <ConfirmModal
          item={confirmItem}
          balance={{ gold, gameStones }}
          onConfirm={handleConfirmBuy}
          onCancel={() => setConfirmItem(null)}
          isPending={buyGameItem.isPending || buyHiddenItem.isPending}
        />
      )}

      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background: "radial-gradient(ellipse at 50% 20%, #1E3A5F 0%, #050d14 65%)",
        }}
      >
        {/* ── 頂部標題列 ── */}
        <div
          style={{
            padding: "12px 16px 8px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => navigate("/game")}
            style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center" }}
          >
            <ArrowLeft size={20} />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#e2e8f0", margin: 0 }}>虛相世界商店</h1>
            <p style={{ fontSize: "11px", color: "#64748b", margin: 0 }}>購買冒險所需的道具與素材</p>
          </div>
          <button
            onClick={() => { refetch(); if (activeTab === "hidden") refetchHidden(); }}
            style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center" }}
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {/* ── 貨幣狀態列 ── */}
        <div
          style={{
            padding: "8px 16px",
            display: "flex",
            gap: "12px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            flexShrink: 0,
          }}
        >
          {/* 金幣 */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "8px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)" }}>
            <span style={{ fontSize: "14px" }}>🪙</span>
            <div>
              <div style={{ fontSize: "9px", color: "#f59e0b", fontWeight: 600, letterSpacing: "0.05em" }}>金幣</div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#fbbf24" }}>{gold.toLocaleString()}</div>
            </div>
          </div>
          {/* 靈石 */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "8px", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.3)" }}>
            <span style={{ fontSize: "14px" }}>💎</span>
            <div>
              <div style={{ fontSize: "9px", color: "#a78bfa", fontWeight: 600, letterSpacing: "0.05em" }}>靈石</div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#c4b5fd" }}>{gameStones.toLocaleString()}</div>
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
            <span style={{ fontSize: "10px", color: "#475569" }}>虛相世界專用貨幣</span>
          </div>
        </div>

        {/* ── 分頁 Tab ── */}
        <div
          style={{
            display: "flex",
            padding: "8px 16px",
            gap: "8px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            flexShrink: 0,
          }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: "8px 4px",
                borderRadius: "8px",
                border: `1px solid ${activeTab === tab.id ? tab.color + "60" : "rgba(255,255,255,0.08)"}`,
                background: activeTab === tab.id ? tab.color + "18" : "transparent",
                color: activeTab === tab.id ? tab.color : "#64748b",
                fontSize: "12px",
                fontWeight: activeTab === tab.id ? 700 : 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: "14px" }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── 商品列表 ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
          {/* 一般商店（金幣） */}
          {activeTab === "coin" && (
            <>
              <div style={{ marginBottom: "12px" }}>
                <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                  使用 <span style={{ color: "#fbbf24" }}>🪙 金幣</span> 購買消耗品與素材，打怪、採集均可獲得金幣。
                </p>
              </div>
              {isLoading ? (
                <div style={{ textAlign: "center", color: "#475569", padding: "40px 0" }}>載入中...</div>
              ) : coinItems.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <ShoppingBag size={36} style={{ color: "#334155", margin: "0 auto 12px" }} />
                  <p style={{ color: "#475569", fontSize: "14px" }}>目前無商品上架</p>
                  <p style={{ color: "#334155", fontSize: "12px" }}>管理員尚未新增商品，請稍後再來</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  {coinItems.map((item) => (
                    <ShopItemCard
                      key={item.id}
                      name={item.displayName}
                      description={item.description}
                      price={item.priceCoins}
                      currency="gold"
                      canAfford={gold >= item.priceCoins}
                      onBuy={() => setConfirmItem({
                        id: item.id,
                        displayName: item.displayName,
                        description: item.description,
                        price: item.priceCoins,
                        currency: "gold",
                        shopType: "coin",
                      })}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* 靈石專區 */}
          {activeTab === "stone" && (
            <>
              <div style={{ marginBottom: "12px" }}>
                <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                  使用 <span style={{ color: "#c4b5fd" }}>💎 靈石</span> 購買稀有道具，靈石可從天命商城或活動獲得。
                </p>
              </div>
              {isLoading ? (
                <div style={{ textAlign: "center", color: "#475569", padding: "40px 0" }}>載入中...</div>
              ) : stoneItems.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <Gem size={36} style={{ color: "#334155", margin: "0 auto 12px" }} />
                  <p style={{ color: "#475569", fontSize: "14px" }}>靈石專區暫無商品</p>
                  <p style={{ color: "#334155", fontSize: "12px" }}>稀有道具即將上架，敬請期待</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  {stoneItems.map((item) => (
                    <ShopItemCard
                      key={item.id}
                      name={item.displayName}
                      description={item.description}
                      price={item.priceStones}
                      currency="stones"
                      rarity={item.rarity}
                      canAfford={gameStones >= item.priceStones}
                      onBuy={() => setConfirmItem({
                        id: item.id,
                        displayName: item.displayName,
                        description: item.description,
                        price: item.priceStones,
                        currency: "stones",
                        rarity: item.rarity,
                        shopType: "stone",
                      })}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* 販售道具 */}
          {activeTab === "sell" && (
            <>
              <div style={{ marginBottom: "12px" }}>
                <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                  選擇背包中不需要的道具販售换取 <span style={{ color: "#fbbf24" }}>🪙 金幣</span>。販售價格依稾有度而定。
                </p>
              </div>
              {invLoading ? (
                <div style={{ textAlign: "center", color: "#475569", padding: "40px 0" }}>載入中...</div>
              ) : !(invData as unknown[])?.length ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <PackageOpen size={36} style={{ color: "#334155", margin: "0 auto 12px" }} />
                  <p style={{ color: "#475569", fontSize: "14px" }}>背包是空的</p>
                  <p style={{ color: "#334155", fontSize: "12px" }}>先去探索獲得道具吧！</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {(invData as Array<{ id: number; itemId: string; quantity: number; isEquipped: number | null }>).filter(i => !i.isEquipped).map((item) => {
                    const info = getItemInfo(item.itemId);
                    const rarityPrice: Record<string, number> = { common: 20, uncommon: 60, rare: 150, epic: 500, legendary: 2000 };
                    const unitPrice = rarityPrice[info.rarity] ?? 20;
                    const totalGold = unitPrice * item.quantity;
                    const rarityColor = {
                      common: "#94a3b8", uncommon: "#4ade80", rare: "#60a5fa", epic: "#a78bfa", legendary: "#fbbf24",
                    }[info.rarity] ?? "#94a3b8";
                    return (
                      <div key={item.id} style={{
                        display: "flex", alignItems: "center", gap: "10px",
                        padding: "10px 12px", borderRadius: "10px",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}>
                        <span style={{ fontSize: "20px" }}>{info.emoji}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "13px", fontWeight: 600, color: rarityColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {info.name}
                          </div>
                          <div style={{ fontSize: "11px", color: "#64748b" }}>
                            x{item.quantity} · 單價 {unitPrice} 金幣
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: "12px", fontWeight: 700, color: "#fbbf24", marginBottom: "4px" }}>
                            🪙 {totalGold}
                          </div>
                          <button
                            onClick={() => sellItem.mutate({ inventoryId: item.id, quantity: item.quantity })}
                            disabled={sellItem.isPending}
                            style={{
                              padding: "4px 10px", borderRadius: "6px", border: "none",
                              background: "linear-gradient(135deg, #16a34a, #4ade80)",
                              color: "#fff", fontSize: "11px", fontWeight: 700,
                              cursor: sellItem.isPending ? "not-allowed" : "pointer",
                              opacity: sellItem.isPending ? 0.6 : 1,
                            }}
                          >
                            全販
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {(invData as Array<{ id: number; itemId: string; quantity: number; isEquipped: number | null }>).filter(i => i.isEquipped).length > 0 && (
                    <p style={{ fontSize: "11px", color: "#475569", textAlign: "center", marginTop: "8px" }}>
                      裝備中的裝備無法販售，請先卸下裝備再販售
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* 密店 */}
          {activeTab === "hidden" && (
            <>
              <div style={{ marginBottom: "12px" }}>
                <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                  密店商品隨機出現，受 <span style={{ color: "#38bdf8" }}>洞察力</span> 影響感知機率（最低 5%）。
                </p>
              </div>
              {hiddenLoading ? (
                <div style={{ textAlign: "center", color: "#475569", padding: "40px 0" }}>感知中...</div>
              ) : !hiddenData?.found ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <Eye size={36} style={{ color: "#334155", margin: "0 auto 12px" }} />
                  <p style={{ color: "#475569", fontSize: "14px" }}>未感知到密店</p>
                  <p style={{ color: "#334155", fontSize: "12px" }}>提升洞察力可增加感知機率</p>
                  <button
                    onClick={() => refetchHidden()}
                    style={{
                      marginTop: "16px",
                      padding: "8px 20px",
                      borderRadius: "8px",
                      border: "1px solid rgba(56,189,248,0.4)",
                      background: "rgba(56,189,248,0.1)",
                      color: "#38bdf8",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    🔮 再次感知
                  </button>
                </div>
              ) : hiddenData.items.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <Sparkles size={36} style={{ color: "#334155", margin: "0 auto 12px" }} />
                  <p style={{ color: "#475569", fontSize: "14px" }}>密店今日無貨</p>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: "12px", padding: "8px 12px", borderRadius: "8px", background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.3)" }}>
                    <p style={{ fontSize: "12px", color: "#38bdf8", margin: 0, fontWeight: 600 }}>
                      🔮 密店已出現！共 {hiddenData.items.length} 件商品
                    </p>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    {hiddenData.items.map((item) => {
                      const isGold = item.currencyType === "coins";
                      const balance = isGold ? (hiddenData.gold ?? 0) : (hiddenData.gameStones ?? 0);
                      return (
                        <ShopItemCard
                          key={item.id}
                          name={item.displayName}
                          description={item.description}
                          price={item.price}
                          currency={isGold ? "gold" : "stones"}
                          rarity={item.rarity}
                          canAfford={balance >= item.price}
                          onBuy={() => setConfirmItem({
                            id: item.id,
                            displayName: item.displayName,
                            description: item.description,
                            price: item.price,
                            currency: isGold ? "gold" : "stones",
                            rarity: item.rarity,
                            shopType: "hidden",
                          })}
                        />
                      );
                    })}
                  </div>
                  <button
                    onClick={() => refetchHidden()}
                    style={{
                      marginTop: "16px",
                      width: "100%",
                      padding: "8px",
                      borderRadius: "8px",
                      border: "1px solid rgba(56,189,248,0.3)",
                      background: "transparent",
                      color: "#38bdf8",
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    🔄 重新感知密店
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </GameTabLayout>
  );
}
