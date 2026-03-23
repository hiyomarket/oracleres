/**
 * Shop.tsx
 * 虛擬服裝商城主頁面
 * 路由：/game/shop
 * PROPOSAL-20260323-GAME-虛擬服裝商城
 */

import React, { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import GameTabLayout from "@/components/GameTabLayout";
import ShopItemCard, { type ShopItem } from "@/components/game/ShopItemCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, RefreshCw, Coins, Gem, ShoppingBag, Filter } from "lucide-react";

// ─── 篩選選項 ─────────────────────────────────────────────────
const LAYER_OPTIONS = [
  { value: "", label: "全部部件" },
  { value: "top", label: "上衣" },
  { value: "bottom", label: "下裝" },
  { value: "shoes", label: "鞋子" },
  { value: "bracelet", label: "手環" },
  { value: "hair", label: "髮型" },
  { value: "accessory", label: "配件" },
  { value: "background", label: "背景" },
];

const WUXING_OPTIONS = [
  { value: "", label: "全部五行" },
  { value: "wood",  label: "木", color: "#2E8B57" },
  { value: "fire",  label: "火", color: "#DC143C" },
  { value: "earth", label: "土", color: "#CD853F" },
  { value: "metal", label: "金", color: "#C9A227" },
  { value: "water", label: "水", color: "#00CED1" },
];

// ─── 購買確認彈窗 ─────────────────────────────────────────────
const PurchaseConfirmModal: React.FC<{
  item: ShopItem | null;
  balance: { gameCoins: number; gameStones: number };
  onConfirm: () => void;
  onCancel: () => void;
  isPurchasing: boolean;
}> = ({ item, balance, onConfirm, onCancel, isPurchasing }) => {
  if (!item) return null;

  const currentBalance = item.currencyType === "coins" ? balance.gameCoins : balance.gameStones;
  const canAfford = currentBalance >= item.price;
  const currencyIcon = item.currencyType === "coins" ? "🪙" : "💎";
  const currencyLabel = item.currencyType === "coins" ? "天命幣" : "靈石";
  const afterBalance = currentBalance - item.price;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-white/20 bg-[#0f1a2e] p-6 shadow-2xl">
        <h3 className="text-base font-semibold text-white mb-4 text-center">確認購買</h3>

        {/* 商品預覽 */}
        <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-white/5">
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-16 h-16 rounded-lg object-cover border border-white/10"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://placehold.co/64x64/0a1220/444?text=?`;
            }}
          />
          <div>
            <div className="text-sm font-medium text-white">{item.name}</div>
            <div className="text-xs text-gray-400 mt-0.5">
              {currencyIcon} {item.price} {currencyLabel}
            </div>
          </div>
        </div>

        {/* 餘額資訊 */}
        <div className="space-y-1.5 mb-4 text-xs">
          <div className="flex justify-between text-gray-400">
            <span>目前{currencyLabel}</span>
            <span className="text-white">{currencyIcon} {currentBalance}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>扣除費用</span>
            <span className="text-red-400">- {item.price}</span>
          </div>
          <div className="flex justify-between font-medium border-t border-white/10 pt-1.5">
            <span className="text-gray-300">購買後餘額</span>
            <span className={canAfford ? "text-white" : "text-red-400"}>
              {currencyIcon} {canAfford ? afterBalance : "不足"}
            </span>
          </div>
        </div>

        {!canAfford && (
          <p className="text-xs text-red-400 text-center mb-3">
            {currencyLabel}不足，無法購買此商品
          </p>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-white/20 text-gray-300"
            onClick={onCancel}
            disabled={isPurchasing}
          >
            取消
          </Button>
          <Button
            size="sm"
            className={`flex-1 font-semibold ${
              canAfford
                ? item.currencyType === "coins"
                  ? "bg-gradient-to-r from-amber-600 to-yellow-600 text-black"
                  : "bg-gradient-to-r from-cyan-700 to-blue-700 text-white"
                : "bg-gray-700 text-gray-500 cursor-not-allowed"
            }`}
            onClick={canAfford ? onConfirm : undefined}
            disabled={!canAfford || isPurchasing}
          >
            {isPurchasing ? (
              <RefreshCw size={14} className="animate-spin mr-1" />
            ) : null}
            {canAfford ? "確認購買" : "餘額不足"}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── 主頁面 ───────────────────────────────────────────────────
const Shop: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"coins" | "stones">("coins");
  // Note: activeTab above is for coins/stones filter; GameTabLayout uses its own activeTab prop
  const [filterLayer, setFilterLayer] = useState("");
  const [filterWuxing, setFilterWuxing] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [confirmItem, setConfirmItem] = useState<ShopItem | null>(null);

  // ─── tRPC 查詢 ─────────────────────────────────────────────
  const { data: shopData, isLoading: shopLoading, refetch: refetchShop } =
    trpc.gameShop.getItems.useQuery({
      currencyType: "all",
      layer: filterLayer || undefined,
      wuxing: filterWuxing || undefined,
    });

  const { data: balance, refetch: refetchBalance } =
    trpc.gameShop.getBalance.useQuery();

  const purchaseMutation = trpc.gameShop.purchaseItem.useMutation({
    onSuccess: (data) => {
      toast.success(`購買成功！`, {
        description: `已獲得「${data.itemName}」，${
          data.currencyType === "coins" ? "天命幣" : "靈石"
        }餘額：${data.currencyType === "coins" ? data.newBalance.gameCoins : data.newBalance.gameStones}`,
      });
      refetchShop();
      refetchBalance();
      setConfirmItem(null);
    },
    onError: (err) => {
      toast.error("購買失敗", { description: err.message });
      setConfirmItem(null);
    },
  });

  // ─── 依分頁篩選商品 ────────────────────────────────────────
  const displayItems = activeTab === "coins"
    ? (shopData?.coinsItems ?? [])
    : (shopData?.stonesItems ?? []);

  return (
    <GameTabLayout activeTab="shop">
    <div className="min-h-screen bg-[#0a0f1a] text-white flex flex-col pb-20">

      {/* 購買確認彈窗 */}
      {confirmItem && (
        <PurchaseConfirmModal
          item={confirmItem}
          balance={balance ?? { gameCoins: 0, gameStones: 0 }}
          onConfirm={() => purchaseMutation.mutate({ itemId: confirmItem.id })}
          onCancel={() => setConfirmItem(null)}
          isPurchasing={purchaseMutation.isPending}
        />
      )}

      {/* ── 頂部導覽列 ─────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <Link href="/game/avatar">
          <button className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={18} />
            <span className="text-sm">靈相空間</span>
          </button>
        </Link>
        <h1 className="text-base font-semibold tracking-wider text-amber-300">
          ✦ 虛擬服裝商城
        </h1>
        <button
          className="flex items-center gap-1 text-gray-400 hover:text-amber-300 transition-colors"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={18} />
          <span className="text-sm">篩選</span>
        </button>
      </div>

      {/* ── 餘額橫幅 ─────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-6 px-4 py-2.5 bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-1.5">
          <span className="text-base">🪙</span>
          <span className="text-sm font-bold text-amber-300">{balance?.gameCoins ?? 0}</span>
          <span className="text-xs text-gray-500">天命幣</span>
        </div>
        <div className="w-px h-4 bg-white/20" />
        <div className="flex items-center gap-1.5">
          <span className="text-base">💎</span>
          <span className="text-sm font-bold text-cyan-300">{balance?.gameStones ?? 0}</span>
          <span className="text-xs text-gray-500">靈石</span>
        </div>
      </div>

      {/* ── 篩選面板（可收折） ─────────────────────────────────── */}
      {showFilters && (
        <div className="px-4 py-3 bg-white/5 border-b border-white/10 space-y-2">
          {/* 部件篩選 */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {LAYER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilterLayer(opt.value)}
                className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  filterLayer === opt.value
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/50"
                    : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {/* 五行篩選 */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {WUXING_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilterWuxing(opt.value)}
                className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                  filterWuxing === opt.value
                    ? "border-current bg-black/30"
                    : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
                style={filterWuxing === opt.value && opt.color ? { color: opt.color, borderColor: opt.color } : {}}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 分頁標籤 ─────────────────────────────────────────── */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab("coins")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-all ${
            activeTab === "coins"
              ? "text-amber-300 border-b-2 border-amber-400"
              : "text-gray-400 hover:text-white"
          }`}
        >
          🪙 天命幣專區
          {shopData && (
            <span className="text-xs text-gray-500">({shopData.coinsItems.length})</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("stones")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-all ${
            activeTab === "stones"
              ? "text-cyan-300 border-b-2 border-cyan-400"
              : "text-gray-400 hover:text-white"
          }`}
        >
          💎 靈石專區
          {shopData && (
            <span className="text-xs text-gray-500">({shopData.stonesItems.length})</span>
          )}
        </button>
      </div>

      {/* ── 商品列表 ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4">
        {shopLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-white/5 animate-pulse aspect-[3/4]" />
            ))}
          </div>
        ) : displayItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-gray-500">
            <ShoppingBag size={40} className="mb-3 opacity-30" />
            <p className="text-sm">此分區暫無商品</p>
            <p className="text-xs mt-1 text-gray-600">
              {activeTab === "coins" ? "天命幣" : "靈石"}專區商品即將上架
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {displayItems.map((item) => (
              <ShopItemCard
                key={item.id}
                item={item as ShopItem}
                onPurchase={(i) => setConfirmItem(i)}
                isPurchasing={purchaseMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
    </GameTabLayout>
  );
};

export default Shop;
