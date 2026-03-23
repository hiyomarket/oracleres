/**
 * ShopItemCard.tsx
 * 商城商品展示卡片
 * PROPOSAL-20260323-GAME-虛擬服裝商城
 */

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Check, Coins } from "lucide-react";

// ─── 五行配色（TASK-004 指定重點配色） ────────────────────────
const WUXING_COLORS: Record<string, { bg: string; text: string; label: string; hex: string }> = {
  wood:  { bg: "bg-emerald-900/40",  text: "text-emerald-300", label: "木", hex: "#2E8B57" },
  fire:  { bg: "bg-red-900/40",      text: "text-red-300",     label: "火", hex: "#DC143C" },
  earth: { bg: "bg-amber-900/40",    text: "text-amber-300",   label: "土", hex: "#CD853F" },
  metal: { bg: "bg-yellow-900/40",   text: "text-yellow-300",  label: "金", hex: "#C9A227" },
  water: { bg: "bg-cyan-900/40",     text: "text-cyan-300",    label: "水", hex: "#00CED1" },
};

const RARITY_STYLES: Record<string, { border: string; glow: string; label: string }> = {
  common:    { border: "border-gray-600",   glow: "",                        label: "普通" },
  rare:      { border: "border-blue-500",   glow: "shadow-blue-500/20",      label: "稀有" },
  epic:      { border: "border-purple-500", glow: "shadow-purple-500/20",    label: "史詩" },
  legendary: { border: "border-yellow-400", glow: "shadow-yellow-400/30",    label: "傳說" },
};

const LAYER_LABELS: Record<string, string> = {
  top: "上衣", bottom: "下裝", shoes: "鞋子", bracelet: "手環",
  hair: "髮型", body: "體型", background: "背景", accessory: "配件",
};

export interface ShopItem {
  id: number;
  name: string;
  layer: string;
  wuxing: string;
  rarity: string;
  currencyType: string;
  price: number;
  imageUrl: string;
  isOwned: boolean;
}

interface ShopItemCardProps {
  item: ShopItem;
  onPurchase: (item: ShopItem) => void;
  isPurchasing: boolean;
}

const ShopItemCard: React.FC<ShopItemCardProps> = ({ item, onPurchase, isPurchasing }) => {
  const wuxing = WUXING_COLORS[item.wuxing] ?? WUXING_COLORS.wood;
  const rarity = RARITY_STYLES[item.rarity] ?? RARITY_STYLES.common;
  const currencyIcon = item.currencyType === "coins" ? "🪙" : "💎";
  const currencyLabel = item.currencyType === "coins" ? "天命幣" : "靈石";

  return (
    <div
      className={`relative flex flex-col rounded-xl border overflow-hidden transition-all hover:scale-[1.02] ${rarity.border} ${rarity.glow ? `shadow-lg ${rarity.glow}` : ""} bg-[#0f1a2e]`}
    >
      {/* 商品圖片 */}
      <div className="relative aspect-square overflow-hidden bg-[#0a1220]">
        <img
          src={item.imageUrl}
          alt={item.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              `https://placehold.co/200x200/0a1220/444?text=${LAYER_LABELS[item.layer] ?? item.layer}`;
          }}
        />
        {/* 五行標籤 */}
        <div
          className={`absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${wuxing.bg} ${wuxing.text} border border-current`}
        >
          {wuxing.label}
        </div>
        {/* 稀有度標籤（非普通才顯示） */}
        {item.rarity !== "common" && (
          <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${rarity.border} border bg-black/60`}
            style={{ color: item.rarity === "legendary" ? "#fbbf24" : item.rarity === "epic" ? "#a78bfa" : "#60a5fa" }}
          >
            {rarity.label}
          </div>
        )}
        {/* 已擁有遮罩 */}
        {item.isOwned && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="flex flex-col items-center gap-1">
              <Check size={24} className="text-emerald-400" />
              <span className="text-xs text-emerald-300 font-medium">已擁有</span>
            </div>
          </div>
        )}
      </div>

      {/* 商品資訊 */}
      <div className="p-2.5 flex flex-col gap-1.5">
        <div className="text-xs font-medium text-white truncate">{item.name}</div>
        <div className="text-[10px] text-gray-400">{LAYER_LABELS[item.layer] ?? item.layer}</div>

        {/* 價格 + 購買按鈕 */}
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1">
            <span className="text-sm">{currencyIcon}</span>
            <span className="text-sm font-bold" style={{ color: item.currencyType === "coins" ? "#C9A227" : "#00CED1" }}>
              {item.price}
            </span>
            <span className="text-[10px] text-gray-500">{currencyLabel}</span>
          </div>
          <Button
            size="sm"
            disabled={item.isOwned || isPurchasing}
            onClick={() => !item.isOwned && onPurchase(item)}
            className={`h-7 px-2 text-[11px] font-semibold ${
              item.isOwned
                ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                : item.currencyType === "coins"
                  ? "bg-gradient-to-r from-amber-600 to-yellow-600 text-black hover:from-amber-500 hover:to-yellow-500"
                  : "bg-gradient-to-r from-cyan-700 to-blue-700 text-white hover:from-cyan-600 hover:to-blue-600"
            }`}
          >
            {item.isOwned ? (
              <Check size={12} />
            ) : (
              <>
                <ShoppingCart size={12} className="mr-1" />
                購買
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ShopItemCard;
