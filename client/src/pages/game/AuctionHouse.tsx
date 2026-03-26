/**
 * 拍賣行頁面
 * 全服公用市場：玩家可上架/下架道具，其他玩家可購買
 * 每位玩家最多同時上架 3 件
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ItemDetailModal from "@/components/ItemDetailModal";

// ─── 稀有度顏色 ───
const RARITY_COLORS: Record<string, { text: string; border: string; bg: string }> = {
  common:    { text: "#94a3b8", border: "rgba(148,163,184,0.3)", bg: "rgba(148,163,184,0.08)" },
  rare:      { text: "#60a5fa", border: "rgba(96,165,250,0.4)",  bg: "rgba(96,165,250,0.08)" },
  epic:      { text: "#c084fc", border: "rgba(192,132,252,0.4)", bg: "rgba(192,132,252,0.08)" },
  legendary: { text: "#fbbf24", border: "rgba(251,191,36,0.5)",  bg: "rgba(251,191,36,0.1)" },
};

const RARITY_LABELS: Record<string, string> = {
  common: "普通", rare: "稀有", epic: "史詩", legendary: "傳說",
};

const ELEMENT_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
  wood:  { label: "木", color: "#22c55e", emoji: "🌿" },
  fire:  { label: "火", color: "#ef4444", emoji: "🔥" },
  earth: { label: "土", color: "#eab308", emoji: "⛰️" },
  metal: { label: "金", color: "#94a3b8", emoji: "⚔️" },
  water: { label: "水", color: "#3b82f6", emoji: "💧" },
};

// ─── 拍賣列表卡片 ───
function ListingCard({
  listing,
  isOwn,
  myGold,
  onBuy,
  onCancel,
  isBuying,
  isCancelling,
}: {
  listing: {
    id: number;
    itemId: string;
    itemName: string;
    itemRarity: string;
    itemElement: string;
    quantity: number;
    price: number;
    sellerName: string;
    status: string;
    createdAt: number;
  };
  isOwn: boolean;
  myGold: number;
  onBuy: (id: number) => void;
  onCancel: (id: number) => void;
  isBuying: boolean;
  isCancelling: boolean;
}) {
  const rc = RARITY_COLORS[listing.itemRarity] ?? RARITY_COLORS.common;
  const el = listing.itemElement ? ELEMENT_LABELS[listing.itemElement] : null;
  const canAfford = myGold >= listing.price;

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg transition-all"
      style={{
        background: rc.bg,
        border: `1px solid ${rc.border}`,
      }}
    >
      {/* 五行標籤 */}
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0"
        style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${rc.border}` }}
      >
        {el ? el.emoji : "📦"}
      </div>

      {/* 道具資訊 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-semibold truncate" style={{ color: rc.text }}>
            {listing.itemName}
          </span>
          {listing.quantity > 1 && (
            <span className="text-xs text-slate-500">×{listing.quantity}</span>
          )}
          <Badge
            variant="outline"
            className="text-[10px] px-1 py-0 h-4"
            style={{ color: rc.text, borderColor: rc.border }}
          >
            {RARITY_LABELS[listing.itemRarity] ?? listing.itemRarity}
          </Badge>
          {el && (
            <span className="text-[10px]" style={{ color: el.color }}>
              {el.label}系
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-slate-500">賣家：{listing.sellerName}</span>
        </div>
      </div>

      {/* 價格 + 操作 */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <div className="flex items-center gap-1">
          <span className="text-amber-400 text-xs">🪙</span>
          <span className="text-amber-300 font-bold text-sm">{listing.price.toLocaleString()}</span>
        </div>
        {isOwn ? (
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[11px] px-2"
            style={{ borderColor: "rgba(239,68,68,0.4)", color: "#ef4444" }}
            onClick={() => onCancel(listing.id)}
            disabled={isCancelling}
          >
            {isCancelling ? "下架中..." : "下架"}
          </Button>
        ) : (
          <Button
            size="sm"
            className="h-6 text-[11px] px-2"
            style={{
              background: canAfford ? "rgba(245,158,11,0.2)" : "rgba(100,100,100,0.2)",
              color: canAfford ? "#fbbf24" : "#64748b",
              border: `1px solid ${canAfford ? "rgba(245,158,11,0.4)" : "rgba(100,100,100,0.3)"}`,
            }}
            onClick={() => onBuy(listing.id)}
            disabled={!canAfford || isBuying}
          >
            {isBuying ? "購買中..." : canAfford ? "購買" : "金幣不足"}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── 主頁面 ───
export default function AuctionHouse() {
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const [filterElement, setFilterElement] = useState<string>("");
  const [filterRarity, setFilterRarity] = useState<string>("");
  const [showListDialog, setShowListDialog] = useState(false);
  const [selectedInvId, setSelectedInvId] = useState<number | null>(null);
  const [listQty, setListQty] = useState(1);
  const [listPrice, setListPrice] = useState("");
  const [buyingId, setBuyingId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  const [detailItemMeta, setDetailItemMeta] = useState<{ name?: string; rarity?: string } | null>(null);

  const utils = trpc.useUtils();

  // ─── 查詢 ───
  const { data: listingsData, isLoading: listingsLoading } = trpc.auction.getListings.useQuery(
    { page, pageSize: 20, element: filterElement || undefined, rarity: filterRarity || undefined },
    { refetchInterval: 30000 }
  );
  const { data: myListingsData } = trpc.auction.getMyListings.useQuery(undefined, { refetchInterval: 30000 });
  const { data: statusData } = trpc.gameWorld.getAgentStatus.useQuery(undefined, { refetchInterval: 30000 });
  const { data: invData } = trpc.gameWorld.getInventory.useQuery(undefined, { refetchInterval: 60000 });

  const myGold = (statusData as { agent?: { gold?: number } } | undefined)?.agent?.gold ?? 0;
  const myActiveCount = myListingsData?.activeCount ?? 0;
  const inventory = (Array.isArray(invData) ? invData : []) as Array<{ id: number; itemId: string; itemName?: string; quantity: number; itemType?: string }>;

  // ─── Mutations ───
  const buyMutation = trpc.auction.buyListing.useMutation({
    onSuccess: (data) => {
      const feeInfo = data.feeAmount > 0 ? `（賣家實得 ${data.sellerReceives.toLocaleString()} 金幣，手續費 ${data.feeAmount.toLocaleString()}）` : "";
      toast.success(`✨ 購買成功！獲得「${data.itemName}」，花費 ${data.price.toLocaleString()} 金幣${feeInfo}`);
      setBuyingId(null);
      utils.auction.getListings.invalidate();
      utils.auction.getMyListings.invalidate();
      utils.gameWorld.getAgentStatus.invalidate();
      utils.gameWorld.getInventory.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
      setBuyingId(null);
    },
  });

  const cancelMutation = trpc.auction.cancelListing.useMutation({
    onSuccess: (data) => {
      toast.success(`已下架「${data.itemName}」，道具已退回背包`);
      setCancellingId(null);
      utils.auction.getMyListings.invalidate();
      utils.auction.getListings.invalidate();
      utils.gameWorld.getInventory.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
      setCancellingId(null);
    },
  });

  const listMutation = trpc.auction.listItem.useMutation({
    onSuccess: (data) => {
      toast.success(`✨ 已上架「${data.itemName}」到拍賣行！`);
      setShowListDialog(false);
      setSelectedInvId(null);
      setListQty(1);
      setListPrice("");
      utils.auction.getMyListings.invalidate();
      utils.auction.getListings.invalidate();
      utils.gameWorld.getInventory.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleBuy = (id: number) => {
    setBuyingId(id);
    buyMutation.mutate({ listingId: id });
  };

  const handleCancel = (id: number) => {
    setCancellingId(id);
    cancelMutation.mutate({ listingId: id });
  };

  const handleList = () => {
    if (!selectedInvId) return;
    const price = parseInt(listPrice);
    if (isNaN(price) || price < 1) {
      toast.error("請輸入有效的售價");
      return;
    }
    listMutation.mutate({ inventoryId: selectedInvId, quantity: listQty, price });
  };

  const selectedItem = useMemo(
    () => inventory.find(i => i.id === selectedInvId),
    [inventory, selectedInvId]
  );

  const listings = listingsData?.listings ?? [];
  const total = listingsData?.total ?? 0;
  const totalPages = Math.ceil(total / 20);
  const myListings = myListingsData?.listings ?? [];

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: "linear-gradient(135deg, #060a16 0%, #0d1426 50%, #060a16 100%)",
        color: "#e2e8f0",
        fontFamily: "'Noto Serif TC', serif",
      }}
    >
      {/* 頂部欄位 */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b"
        style={{ borderColor: "rgba(245,158,11,0.2)", background: "rgba(6,10,22,0.9)" }}
      >
        <button
          onClick={() => setLocation("/game")}
          className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 transition-colors"
        >
          <span>←</span>
          <span className="text-sm">返回虛相世界</span>
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          <span className="text-amber-400">🪙</span>
          <span className="text-amber-300 font-bold">{myGold.toLocaleString()}</span>
        </div>
      </div>

      {/* 標題 */}
      <div className="text-center py-6">
        <h1
          className="text-2xl font-bold mb-1"
          style={{ color: "#fbbf24", textShadow: "0 0 20px rgba(251,191,36,0.4)" }}
        >
          🏪 天命拍賣行
        </h1>
        <p className="text-sm text-slate-500">全服公用市場 · 每位旅人最多上架 3 件</p>
      </div>

      {/* 主體 */}
      <div className="flex-1 px-4 pb-8 max-w-2xl mx-auto w-full">
        <Tabs defaultValue="market">
          <TabsList className="w-full mb-4" style={{ background: "rgba(0,0,0,0.4)" }}>
            <TabsTrigger value="market" className="flex-1">市場</TabsTrigger>
            <TabsTrigger value="mine" className="flex-1">
              我的上架
              {myActiveCount > 0 && (
                <Badge className="ml-1.5 h-4 text-[10px] px-1" style={{ background: "rgba(245,158,11,0.3)", color: "#fbbf24" }}>
                  {myActiveCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* 市場 Tab */}
          <TabsContent value="market">
            {/* 篩選列 */}
            <div className="flex gap-2 mb-4">
              <Select value={filterElement || "all"} onValueChange={v => { setFilterElement(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="flex-1 h-8 text-xs" style={{ background: "rgba(0,0,0,0.4)", borderColor: "rgba(245,158,11,0.2)" }}>
                  <SelectValue placeholder="五行篩選" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部五行</SelectItem>
                  {Object.entries(ELEMENT_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.emoji} {v.label}系</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterRarity || "all"} onValueChange={v => { setFilterRarity(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="flex-1 h-8 text-xs" style={{ background: "rgba(0,0,0,0.4)", borderColor: "rgba(245,158,11,0.2)" }}>
                  <SelectValue placeholder="稀有度" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部稀有度</SelectItem>
                  {Object.entries(RARITY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {listingsLoading ? (
              <div className="text-center text-slate-500 py-12">載入中...</div>
            ) : listings.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">🏪</div>
                <p className="text-slate-500">目前沒有在售商品</p>
                <p className="text-xs text-slate-600 mt-1">成為第一位上架道具的旅人！</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {listings.map(l => (
                  <div key={l.id} className="relative">
                    {/* 點擊道具名稱區域彈出詳細說明 */}
                    <div
                      className="absolute top-2 left-2 z-10 cursor-pointer"
                      onClick={() => { setDetailItemId(l.itemId); setDetailItemMeta({ name: l.itemName, rarity: l.itemRarity }); }}
                      title="點擊查看道具詳細"
                    >
                      <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.08)", color: "#64748b" }}>ℹ</span>
                    </div>
                    <ListingCard
                      listing={l}
                      isOwn={false}
                      myGold={myGold}
                      onBuy={handleBuy}
                      onCancel={handleCancel}
                      isBuying={buyingId === l.id}
                      isCancelling={false}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* 分頁 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{ borderColor: "rgba(245,158,11,0.3)", color: "#fbbf24" }}
                >
                  上一頁
                </Button>
                <span className="text-sm text-slate-400">{page} / {totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{ borderColor: "rgba(245,158,11,0.3)", color: "#fbbf24" }}
                >
                  下一頁
                </Button>
              </div>
            )}
          </TabsContent>

          {/* 我的上架 Tab */}
          <TabsContent value="mine">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-slate-400">
                已上架 <span className="text-amber-400 font-bold">{myActiveCount}</span> / 3 件
              </span>
              <Button
                size="sm"
                onClick={() => setShowListDialog(true)}
                disabled={myActiveCount >= 3}
                style={{
                  background: myActiveCount >= 3 ? "rgba(100,100,100,0.2)" : "rgba(245,158,11,0.2)",
                  color: myActiveCount >= 3 ? "#64748b" : "#fbbf24",
                  border: `1px solid ${myActiveCount >= 3 ? "rgba(100,100,100,0.3)" : "rgba(245,158,11,0.4)"}`,
                }}
              >
                + 上架道具
              </Button>
            </div>

            {myListings.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">📦</div>
                <p className="text-slate-500">尚未上架任何道具</p>
                <p className="text-xs text-slate-600 mt-1">點擊「上架道具」開始交易</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {myListings.map(l => (
                  <div key={l.id} className="relative">
                    {l.status !== "active" && (
                      <div
                        className="absolute inset-0 rounded-lg flex items-center justify-center z-10"
                        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)" }}
                      >
                        <span className="text-sm font-bold" style={{ color: l.status === "sold" ? "#22c55e" : "#94a3b8" }}>
                          {l.status === "sold" ? "✅ 已售出" : "已下架"}
                        </span>
                      </div>
                    )}
                    <ListingCard
                      listing={l}
                      isOwn={l.status === "active"}
                      myGold={myGold}
                      onBuy={handleBuy}
                      onCancel={handleCancel}
                      isBuying={false}
                      isCancelling={cancellingId === l.id}
                    />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* 道具詳細說明彈窗 */}
      <ItemDetailModal
        itemId={detailItemId}
        itemName={detailItemMeta?.name}
        rarity={detailItemMeta?.rarity}
        onClose={() => { setDetailItemId(null); setDetailItemMeta(null); }}
      />

      {/* 上架道具 Dialog */}
      <Dialog open={showListDialog} onOpenChange={setShowListDialog}>
        <DialogContent style={{ background: "#0d1426", border: "1px solid rgba(245,158,11,0.3)", color: "#e2e8f0" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#fbbf24" }}>上架道具到拍賣行</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            {/* 選擇道具 */}
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">選擇道具</label>
              {inventory.length === 0 ? (
                <p className="text-sm text-slate-500">背包中沒有可上架的道具</p>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                  {inventory.map(item => (
                    <button
                      key={item.id}
                      onClick={() => { setSelectedInvId(item.id); setListQty(1); }}
                      className="flex items-center gap-2 p-2 rounded-lg text-left transition-all"
                      style={{
                        background: selectedInvId === item.id ? "rgba(245,158,11,0.15)" : "rgba(0,0,0,0.3)",
                        border: `1px solid ${selectedInvId === item.id ? "rgba(245,158,11,0.5)" : "rgba(255,255,255,0.08)"}`,
                      }}
                    >
                      <span className="text-lg">📦</span>
                      <div className="flex-1">
                        <div className="text-sm" style={{ color: selectedInvId === item.id ? "#fbbf24" : "#e2e8f0" }}>
                          {item.itemName ?? item.itemId}
                        </div>
                        <div className="text-xs text-slate-500">數量：{item.quantity}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedItem && (
              <>
                {/* 數量 */}
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">上架數量（最多 {selectedItem.quantity}）</label>
                  <Input
                    type="number"
                    min={1}
                    max={selectedItem.quantity}
                    value={listQty}
                    onChange={e => setListQty(Math.min(selectedItem.quantity, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="h-8 text-sm"
                    style={{ background: "rgba(0,0,0,0.4)", borderColor: "rgba(245,158,11,0.3)", color: "#e2e8f0" }}
                  />
                </div>

                {/* 售價 */}
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">售價（金幣）</label>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400">🪙</span>
                    <Input
                      type="number"
                      min={1}
                      max={9999999}
                      value={listPrice}
                      onChange={e => setListPrice(e.target.value)}
                      placeholder="輸入售價..."
                      className="h-8 text-sm flex-1"
                      style={{ background: "rgba(0,0,0,0.4)", borderColor: "rgba(245,158,11,0.3)", color: "#e2e8f0" }}
                    />
                  </div>
                  {listPrice && !isNaN(parseInt(listPrice)) && parseInt(listPrice) > 0 && (
                    <div className="mt-1.5 text-xs" style={{ color: "#94a3b8" }}>
                      手續費 5%：<span style={{ color: "#ef4444" }}>-{Math.floor(parseInt(listPrice) * 0.05).toLocaleString()}</span> 金幣 ·
                      實得：<span style={{ color: "#22c55e" }}>{(parseInt(listPrice) - Math.floor(parseInt(listPrice) * 0.05)).toLocaleString()}</span> 金幣
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowListDialog(false)}
              style={{ borderColor: "rgba(255,255,255,0.2)", color: "#94a3b8" }}
            >
              取消
            </Button>
            <Button
              onClick={handleList}
              disabled={!selectedInvId || !listPrice || listMutation.isPending}
              style={{
                background: "rgba(245,158,11,0.2)",
                color: "#fbbf24",
                border: "1px solid rgba(245,158,11,0.4)",
              }}
            >
              {listMutation.isPending ? "上架中..." : "確認上架"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
