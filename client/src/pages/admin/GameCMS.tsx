import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { MonsterCatalogV2Tab, ItemCatalogV2Tab, EquipCatalogV2Tab, SkillCatalogV2Tab, AchievementCatalogTab } from "@/components/admin/CatalogTabs";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { MonsterPreview, ItemPreview, SkillPreview, AchievementPreview } from "@/components/CatalogPreview";
import { lazy, Suspense } from "react";
const AdminGameTheaterInline = lazy(() => import("./AdminGameTheaterInline"));
const MonsterMultiplierTab = lazy(() => import("@/components/admin/MonsterMultiplierTab"));

const WUXING_OPTIONS = ["木", "火", "土", "金", "水"] as const;
const WUXING_COLORS: Record<string, string> = {
  木: "#2E8B57",
  火: "#DC143C",
  土: "#CD853F",
  金: "#C9A227",
  水: "#00CED1",
};

function WuxingBadge({ wuxing }: { wuxing: string }) {
  return (
    <Badge
      style={{ backgroundColor: WUXING_COLORS[wuxing] ?? "#888", color: "#fff" }}
      className="text-xs"
    >
      {wuxing}
    </Badge>
  );
}

// [REMOVED] Old MonstersTab/SkillsTab/AchievementsTab - replaced by V2 catalog tabs
// See: MonsterCatalogV2Tab, SkillCatalogV2Tab, AchievementCatalogTab

// ─── Game Items Tab ────────────────────────────────────────────────────────────
function GameItemsTab() {
  const utils = trpc.useUtils();
  const { data: items = [], isLoading } = trpc.gameAdmin.getGameItems.useQuery();
  const updateMutation = trpc.gameAdmin.updateGameItem.useMutation({
    onSuccess: () => { utils.gameAdmin.getGameItems.invalidate(); toast.success("已更新"); },
    onError: (e) => toast.error(e.message),
  });

  const RARITY_COLORS: Record<string, string> = { common: "#888", rare: "#3B82F6", epic: "#8B5CF6", legendary: "#F59E0B" };

  const toggleSale = (item: any) => {
    updateMutation.mutate({ id: item.id, data: { isOnSale: item.isOnSale ? 0 : 1 } });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">商城道具管理（{items.length} 筆）</h2>
        <p className="text-xs text-muted-foreground">點擊「上架/下架」切換販售狀態</p>
      </div>
      {isLoading ? <p className="text-muted-foreground">載入中…</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2 px-3">ID</th>
                <th className="text-left py-2 px-3">名稱</th>
                <th className="text-left py-2 px-3">五行</th>
                <th className="text-left py-2 px-3">稀有度</th>
                <th className="text-left py-2 px-3">價格</th>
                <th className="text-left py-2 px-3">貨幣</th>
                <th className="text-left py-2 px-3">狀態</th>
                <th className="text-left py-2 px-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any) => (
                <tr key={item.id} className="border-b hover:bg-muted/30">
                  <td className="py-2 px-3 text-muted-foreground">{item.id}</td>
                  <td className="py-2 px-3 font-medium">{item.name}</td>
                  <td className="py-2 px-3"><WuxingBadge wuxing={item.wuxing} /></td>
                  <td className="py-2 px-3">
                    <Badge style={{ backgroundColor: RARITY_COLORS[item.rarity] ?? "#888", color: "#fff" }} className="text-xs">
                      {item.rarity}
                    </Badge>
                  </td>
                  <td className="py-2 px-3">{item.price}</td>
                  <td className="py-2 px-3 text-xs">{item.currencyType}</td>
                  <td className="py-2 px-3">
                    <Badge variant={item.isOnSale ? "default" : "outline"}>
                      {item.isOnSale ? "上架中" : "未上架"}
                    </Badge>
                  </td>
                  <td className="py-2 px-3">
                    <Button size="sm" variant="outline" onClick={() => toggleSale(item)} disabled={updateMutation.isPending}>
                      {item.isOnSale ? "下架" : "上架"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main GameCMS Page ─────────────────────────────────────────────────────────
export default function GameCMS() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">驗證中…</p>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-80">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive font-semibold mb-4">需要管理員權限</p>
            <Button onClick={() => navigate("/")}>返回首頁</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">靈相世界 · 遊戲內容管理</h1>
            <p className="text-muted-foreground text-sm mt-1">管理怪物、技能、成就等遊戲內容資料，變更即時生效。</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => navigate("/game")} className="shrink-0">
              🌏 返回遊戲
            </Button>
          </div>
        </div>

        <Tabs defaultValue="catalog">
          <TabsList className="mb-4 flex-wrap h-auto gap-1">
            <TabsTrigger value="catalog">📚 圖鑑管理</TabsTrigger>
            <TabsTrigger value="shop">🏪 商店管理</TabsTrigger>
            <TabsTrigger value="ai">🤖 AI 工具</TabsTrigger>
            <TabsTrigger value="battle">⚔️ 戰鬥平衡</TabsTrigger>
            <TabsTrigger value="world">🌍 世界管理</TabsTrigger>
            <TabsTrigger value="system">⚙️ 系統管理</TabsTrigger>
          </TabsList>

          {/* ═══ 📚 圖鑑管理 ═══ */}
          <TabsContent value="catalog">
            <Card>
              <CardContent className="pt-6">
                <Tabs defaultValue="catalog-monsters">
                  <TabsList className="mb-4 flex-wrap h-auto gap-1">
                    <TabsTrigger value="catalog-monsters">🐉 魔物建製</TabsTrigger>
                    <TabsTrigger value="catalog-items">🎒 道具圖鑑</TabsTrigger>
                    <TabsTrigger value="catalog-equipment">⚔️ 裝備圖鑑</TabsTrigger>
                    <TabsTrigger value="catalog-skills">✨ 統一技能</TabsTrigger>
                    <TabsTrigger value="catalog-achievements">🏆 成就系統</TabsTrigger>
                    <TabsTrigger value="pet-catalog">🐾 寵物圖鑑</TabsTrigger>
                    <TabsTrigger value="catalog-stats">📊 圖鑑統計</TabsTrigger>
                    <TabsTrigger value="monster-multiplier">⚖️ 數值倍率</TabsTrigger>
                  </TabsList>
                  <TabsContent value="catalog-monsters"><MonsterCatalogV2Tab /></TabsContent>
                  <TabsContent value="catalog-items"><ItemCatalogV2Tab /></TabsContent>
                  <TabsContent value="catalog-equipment"><EquipCatalogV2Tab /></TabsContent>
                  <TabsContent value="catalog-skills"><SkillCatalogV2Tab /></TabsContent>
                  <TabsContent value="catalog-achievements"><AchievementCatalogTab /></TabsContent>
                  <TabsContent value="pet-catalog"><PetCatalogTab /></TabsContent>
                  <TabsContent value="catalog-stats"><CatalogStatsTab /></TabsContent>
                  <TabsContent value="monster-multiplier"><Suspense fallback={<div className="py-8 text-center text-muted-foreground">載入中...</div>}><MonsterMultiplierTab /></Suspense></TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ 🏪 商店管理 ═══ */}
          <TabsContent value="shop">
            <Card>
              <CardContent className="pt-6">
                <Tabs defaultValue="inv-items">
                  <TabsList className="mb-4 flex-wrap h-auto gap-1">
                    <TabsTrigger value="inv-items">🎒 遊戲道具</TabsTrigger>
                    <TabsTrigger value="virtual-shop">🌀 虛界商店</TabsTrigger>
                    <TabsTrigger value="spirit-shop">👻 靈相商店</TabsTrigger>
                    <TabsTrigger value="hidden-shop">🔮 密店商品池</TabsTrigger>
                    <TabsTrigger value="items">👗 紙娃娃商城</TabsTrigger>
                    <TabsTrigger value="theater-shop">🏪 商店綜合管理</TabsTrigger>
                  </TabsList>
                  <TabsContent value="inv-items"><InventoryItemsTab /></TabsContent>
                  <TabsContent value="virtual-shop"><VirtualShopTab /></TabsContent>
                  <TabsContent value="spirit-shop"><SpiritShopTab /></TabsContent>
                  <TabsContent value="hidden-shop"><HiddenShopTab /></TabsContent>
                  <TabsContent value="items"><GameItemsTab /></TabsContent>
                  <TabsContent value="theater-shop"><Suspense fallback={<p className="text-muted-foreground p-4">載入中…</p>}><AdminGameTheaterInline section="shop" /></Suspense></TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ 🤖 AI 工具 ═══ */}
          <TabsContent value="ai">
            <Card>
              <CardContent className="pt-6">
                <Tabs defaultValue="ai-tools">
                  <TabsList className="mb-4 flex-wrap h-auto gap-1">
                    <TabsTrigger value="ai-tools">🤖 AI 圖鑑工具</TabsTrigger>
                    <TabsTrigger value="pet-ai">🧬 寵物 AI</TabsTrigger>
                    <TabsTrigger value="ai-shop-layout">🏪 AI 商店佈局</TabsTrigger>
                  </TabsList>
                  <TabsContent value="ai-tools"><AIToolsTab /></TabsContent>
                  <TabsContent value="pet-ai"><PetAIToolsTab /></TabsContent>
                  <TabsContent value="ai-shop-layout"><AIShopLayoutTab /></TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ ⚔️ 戰鬥平衡 ═══ */}
          <TabsContent value="battle">
            <Card>
              <CardContent className="pt-6">
                <Tabs defaultValue="balance">
                  <TabsList className="mb-4 flex-wrap h-auto gap-1">
                    <TabsTrigger value="balance">⚖️ 數值平衡</TabsTrigger>
                    <TabsTrigger value="value-engine">💎 價值引擎</TabsTrigger>
                    <TabsTrigger value="roaming-boss">👹 Boss 管理</TabsTrigger>
                    <TabsTrigger value="combat-sim">⚔️ 戰鬥模擬</TabsTrigger>
                  </TabsList>
                  <TabsContent value="balance"><BalanceDashboardTab /></TabsContent>
                  <TabsContent value="value-engine"><ValueEngineTab /></TabsContent>
                  <TabsContent value="roaming-boss"><RoamingBossTab /></TabsContent>
                  <TabsContent value="combat-sim"><CombatSimulatorPanel /></TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ 🌍 世界管理 (從 Theater 合併) ═══ */}
          <TabsContent value="world">
            <Card>
              <CardContent className="pt-6">
                <Suspense fallback={<p className="text-muted-foreground p-4">載入中…</p>}>
                  <AdminGameTheaterInline section="world" />
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ ⚙️ 系統管理 ═══ */}
          <TabsContent value="system">
            <Card>
              <CardContent className="pt-6">
                <Tabs defaultValue="game-guide">
                  <TabsList className="mb-4 flex-wrap h-auto gap-1">
                    <TabsTrigger value="game-guide">📖 遊戲指南</TabsTrigger>
                    <TabsTrigger value="broadcast">📢 全服廣播</TabsTrigger>
                    <TabsTrigger value="sys-reset" className="text-red-400">🔴 世界重置</TabsTrigger>
                  </TabsList>
                  <TabsContent value="game-guide"><GameGuideTab /></TabsContent>
                  <TabsContent value="broadcast"><Suspense fallback={<p className="text-muted-foreground p-4">載入中…</p>}><AdminGameTheaterInline section="broadcast" /></Suspense></TabsContent>
                  <TabsContent value="sys-reset"><Suspense fallback={<p className="text-muted-foreground p-4">載入中…</p>}><AdminGameTheaterInline section="reset" /></Suspense></TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ─── Inventory Items Tab ───────────────────────────────────────────────────────
function InventoryItemsTab() {
  const utils = trpc.useUtils();
  const { data: items = [], isLoading } = trpc.gameAdmin.getInventoryItems.useQuery();
  const createMutation = trpc.gameAdmin.createInventoryItem.useMutation({
    onSuccess: () => { utils.gameAdmin.getInventoryItems.invalidate(); toast.success("道具已新增"); setOpen(false); setForm(defaultForm); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.gameAdmin.deleteInventoryItem.useMutation({
    onSuccess: () => { utils.gameAdmin.getInventoryItems.invalidate(); toast.success("已刪除"); },
    onError: (e) => toast.error(e.message),
  });

  const [open, setOpen] = useState(false);
  const defaultForm = { itemKey: "", name: "", description: "", itemType: "consumable" as "consumable" | "equipment" | "weapon" | "material" | "special", subType: "", wuxing: "", rarity: "common" as "common" | "rare" | "epic" | "legendary", emoji: "📦", equipSlot: "", maxStack: 99, isTradable: 1 as number, isActive: 1 as number };
  const [form, setForm] = useState(defaultForm);

  const RARITY_COLORS: Record<string, string> = { common: "#888", rare: "#3B82F6", epic: "#8B5CF6", legendary: "#F59E0B" };
  const RARITY_ZH: Record<string, string> = { common: "普通", rare: "稀有", epic: "史詩", legendary: "傳說" };
  const TYPE_ZH: Record<string, string> = { consumable: "消耗品", equipment: "裝備", weapon: "武器", material: "材料", special: "特殊" };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">遊戲道具管理（{items.length} 筆）</h2>
        <Button onClick={() => setOpen(true)} size="sm">+ 新增道具</Button>
      </div>
      {isLoading ? <p className="text-muted-foreground">載入中…</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2 px-2">ID</th>
                <th className="text-left py-2 px-2">圖示</th>
                <th className="text-left py-2 px-2">名稱</th>
                <th className="text-left py-2 px-2">Key</th>
                <th className="text-left py-2 px-2">類型</th>
                <th className="text-left py-2 px-2">五行</th>
                <th className="text-left py-2 px-2">稀有度</th>
                <th className="text-left py-2 px-2">狀態</th>
                <th className="text-left py-2 px-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any) => (
                <tr key={item.id} className="border-b hover:bg-muted/30">
                  <td className="py-2 px-2 text-muted-foreground">{item.id}</td>
                  <td className="py-2 px-2 text-xl">{item.emoji}</td>
                  <td className="py-2 px-2 font-medium">{item.name}</td>
                  <td className="py-2 px-2 text-xs text-muted-foreground font-mono">{item.itemKey}</td>
                  <td className="py-2 px-2 text-xs">{TYPE_ZH[item.itemType] ?? item.itemType}</td>
                  <td className="py-2 px-2">{item.wuxing ? <WuxingBadge wuxing={item.wuxing} /> : "-"}</td>
                  <td className="py-2 px-2">
                    <Badge style={{ backgroundColor: RARITY_COLORS[item.rarity] ?? "#888", color: "#fff" }} className="text-xs">
                      {RARITY_ZH[item.rarity] ?? item.rarity}
                    </Badge>
                  </td>
                  <td className="py-2 px-2">
                    <Badge variant={item.isActive ? "default" : "outline"}>{item.isActive ? "啟用" : "停用"}</Badge>
                  </td>
                  <td className="py-2 px-2">
                    <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate({ id: item.id })}>刪除</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>新增遊戲道具</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="道具 Key（如 herb-001）" value={form.itemKey} onChange={e => setForm(f => ({ ...f, itemKey: e.target.value }))} />
              <Input placeholder="道具名稱" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <Textarea placeholder="道具描述" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            <div className="grid grid-cols-3 gap-2">
              <Select value={form.itemType} onValueChange={(v) => setForm(f => ({ ...f, itemType: v as any }))}>
                <SelectTrigger><SelectValue placeholder="類型" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="consumable">消耗品</SelectItem>
                  <SelectItem value="equipment">裝備</SelectItem>
                  <SelectItem value="weapon">武器</SelectItem>
                  <SelectItem value="material">材料</SelectItem>
                  <SelectItem value="special">特殊</SelectItem>
                </SelectContent>
              </Select>
              <Select value={form.rarity} onValueChange={(v) => setForm(f => ({ ...f, rarity: v as any }))}>
                <SelectTrigger><SelectValue placeholder="稀有度" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="common">普通</SelectItem>
                  <SelectItem value="rare">稀有</SelectItem>
                  <SelectItem value="epic">史詩</SelectItem>
                  <SelectItem value="legendary">傳說</SelectItem>
                </SelectContent>
              </Select>
              <Select value={form.wuxing} onValueChange={(v) => setForm(f => ({ ...f, wuxing: v }))}>
                <SelectTrigger><SelectValue placeholder="五行（可選）" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">無</SelectItem>
                  {WUXING_OPTIONS.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="圖示 Emoji" value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} />
              <Input placeholder="裝備槽（如 weapon）" value={form.equipSlot} onChange={e => setForm(f => ({ ...f, equipSlot: e.target.value }))} />
              <Input type="number" placeholder="最大堆疊" value={form.maxStack} onChange={e => setForm(f => ({ ...f, maxStack: +e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Virtual Shop Tab ──────────────────────────────────────────────────────────
function VirtualShopTab() {
  const utils = trpc.useUtils();
  const { data: shopItems = [], isLoading } = trpc.gameAdmin.getVirtualShop.useQuery();
  const createMutation = trpc.gameAdmin.createVirtualShopItem.useMutation({
    onSuccess: () => { utils.gameAdmin.getVirtualShop.invalidate(); toast.success("商品已新增"); setOpen(false); setForm(defaultForm); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.gameAdmin.deleteVirtualShopItem.useMutation({
    onSuccess: () => { utils.gameAdmin.getVirtualShop.invalidate(); toast.success("已刪除"); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.gameAdmin.updateVirtualShopItem.useMutation({
    onSuccess: () => { utils.gameAdmin.getVirtualShop.invalidate(); toast.success("已更新"); },
    onError: (e) => toast.error(e.message),
  });
  const toggleLockMutation = trpc.gameAdmin.toggleVirtualShopLock.useMutation({
    onSuccess: () => { utils.gameAdmin.getVirtualShop.invalidate(); toast.success("鎖定狀態已更新"); },
    onError: (e) => toast.error(e.message),
  });

  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const defaultForm = { itemKey: "", displayName: "", description: "", priceCoins: 100, quantity: 1, stock: -1, nodeId: "", sortOrder: 0, isOnSale: 1 as number, maxPerOrder: 1 };
  const [form, setForm] = useState(defaultForm);
  const [editForm, setEditForm] = useState<any>({});
  const handleEdit = (item: any) => {
    setEditItem(item);
    setEditForm({ displayName: item.displayName, description: item.description ?? "", priceCoins: item.priceCoins, quantity: item.quantity, stock: item.stock, nodeId: item.nodeId ?? "", sortOrder: item.sortOrder ?? 0, maxPerOrder: item.maxPerOrder ?? 1 });
    setEditOpen(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold">虛界商店管理（{shopItems.length} 筆）</h2>
          <p className="text-xs text-muted-foreground mt-0.5">玩家使用「遊戲幣」購買，可綁定特定節點或全圖可用（nodeId 留空）</p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm">+ 新增商品</Button>
      </div>
      {isLoading ? <p className="text-muted-foreground">載入中…</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2 px-2">ID</th>
                <th className="text-left py-2 px-2">名稱</th>
                <th className="text-left py-2 px-2">Key</th>
                <th className="text-left py-2 px-2">遊戲幣</th>
                <th className="text-left py-2 px-2">數量</th>
                <th className="text-left py-2 px-2">庫存</th>
                <th className="text-left py-2 px-2">節點</th>
                <th className="text-left py-2 px-2">狀態</th>
                <th className="text-left py-2 px-2">鎖定</th>
                <th className="text-left py-2 px-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {shopItems.map((item: any) => (
                <tr key={item.id} className={`border-b hover:bg-muted/30 ${item.isLocked ? 'bg-amber-500/10' : ''}`}>
                  <td className="py-2 px-2 text-muted-foreground">{item.id}</td>
                  <td className="py-2 px-2 font-medium">{item.displayName}</td>
                  <td className="py-2 px-2 text-xs font-mono text-muted-foreground">{item.itemKey}</td>
                  <td className="py-2 px-2 text-yellow-500 font-bold">{item.priceCoins} 幣</td>
                  <td className="py-2 px-2">{item.quantity}</td>
                  <td className="py-2 px-2">{item.stock === -1 ? "∞" : item.stock}</td>
                  <td className="py-2 px-2 text-xs">{item.nodeId || "全圖"}</td>
                  <td className="py-2 px-2">
                    <Badge variant={item.isOnSale ? "default" : "outline"}>{item.isOnSale ? "上架" : "下架"}</Badge>
                  </td>
                  <td className="py-2 px-2">
                    <Button size="sm" variant={item.isLocked ? "default" : "outline"}
                      className={item.isLocked ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
                      onClick={() => toggleLockMutation.mutate({ id: item.id, isLocked: item.isLocked ? 0 : 1 })}>
                      {item.isLocked ? '🔒 已鎖' : '🔓 未鎖'}
                    </Button>
                  </td>
                  <td className="py-2 px-2 flex gap-1">
                    <Button size="sm" variant="secondary" onClick={() => handleEdit(item)}>編輯</Button>
                    <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: item.id, data: { isOnSale: item.isOnSale ? 0 : 1 } })}>
                      {item.isOnSale ? "下架" : "上架"}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate({ id: item.id })}>刪</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 新增 Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>新增虛界商店商品</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="道具 Key（對應遊戲道具）" value={form.itemKey} onChange={e => setForm(f => ({ ...f, itemKey: e.target.value }))} />
              <Input placeholder="顯示名稱" value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} />
            </div>
            <Textarea placeholder="商品描述" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            <div className="grid grid-cols-3 gap-2">
              <Input type="number" placeholder="遊戲幣價格" value={form.priceCoins} onChange={e => setForm(f => ({ ...f, priceCoins: +e.target.value }))} />
              <Input type="number" placeholder="購買數量" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: +e.target.value }))} />
              <Input type="number" placeholder="庫存（-1=無限）" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: +e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="綁定節點 ID（留空=全圖）" value={form.nodeId} onChange={e => setForm(f => ({ ...f, nodeId: e.target.value }))} />
              <Input type="number" placeholder="排序順序" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: +e.target.value }))} />
              <Input type="number" placeholder="單次最多購買" value={form.maxPerOrder} onChange={e => setForm(f => ({ ...f, maxPerOrder: +e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* 編輯 Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>編輯商品：{editItem?.displayName}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-muted-foreground">顯示名稱</label><Input value={editForm.displayName ?? ""} onChange={e => setEditForm((f: any) => ({ ...f, displayName: e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground">道具 Key（唯讀）</label><Input value={editItem?.itemKey ?? ""} disabled className="opacity-50" /></div>
            </div>
            <div><label className="text-xs text-muted-foreground">商品描述</label><Textarea value={editForm.description ?? ""} onChange={e => setEditForm((f: any) => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div><label className="text-xs text-muted-foreground">遊戲幣價格</label><Input type="number" value={editForm.priceCoins ?? 0} onChange={e => setEditForm((f: any) => ({ ...f, priceCoins: +e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground">購買數量</label><Input type="number" value={editForm.quantity ?? 1} onChange={e => setEditForm((f: any) => ({ ...f, quantity: +e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground">庫存（-1=無限）</label><Input type="number" value={editForm.stock ?? -1} onChange={e => setEditForm((f: any) => ({ ...f, stock: +e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><label className="text-xs text-muted-foreground">綁定節點（留空=全圖）</label><Input value={editForm.nodeId ?? ""} onChange={e => setEditForm((f: any) => ({ ...f, nodeId: e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground">排序順序</label><Input type="number" value={editForm.sortOrder ?? 0} onChange={e => setEditForm((f: any) => ({ ...f, sortOrder: +e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground">單次最多購買</label><Input type="number" value={editForm.maxPerOrder ?? 1} onChange={e => setEditForm((f: any) => ({ ...f, maxPerOrder: +e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>取消</Button>
            <Button onClick={() => updateMutation.mutate({ id: editItem.id, data: editForm }, { onSuccess: () => { setEditOpen(false); setEditItem(null); } })} disabled={updateMutation.isPending}>儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Spirit Shop Tab ───────────────────────────────────────────────────────────
function SpiritShopTab() {
  const utils = trpc.useUtils();
  const { data: shopItems = [], isLoading } = trpc.gameAdmin.getSpiritShop.useQuery();
  const createMutation = trpc.gameAdmin.createSpiritShopItem.useMutation({
    onSuccess: () => { utils.gameAdmin.getSpiritShop.invalidate(); toast.success("商品已新增"); setOpen(false); setForm(defaultForm); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.gameAdmin.deleteSpiritShopItem.useMutation({
    onSuccess: () => { utils.gameAdmin.getSpiritShop.invalidate(); toast.success("已刪除"); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.gameAdmin.updateSpiritShopItem.useMutation({
    onSuccess: () => { utils.gameAdmin.getSpiritShop.invalidate(); toast.success("已更新"); },
    onError: (e) => toast.error(e.message),
  });
  const toggleLockMutation = trpc.gameAdmin.toggleSpiritShopLock.useMutation({
    onSuccess: () => { utils.gameAdmin.getSpiritShop.invalidate(); toast.success("鎖定狀態已更新"); },
    onError: (e) => toast.error(e.message),
  });

  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const defaultForm = { itemKey: "", displayName: "", description: "", priceStones: 50, quantity: 1, rarity: "rare" as "common" | "rare" | "epic" | "legendary", sortOrder: 0, isOnSale: 1 as number, maxPerOrder: 1 };
  const [form, setForm] = useState(defaultForm);
  const [editForm, setEditForm] = useState<any>({});
  const RARITY_COLORS: Record<string, string> = { common: "#888", rare: "#3B82F6", epic: "#8B5CF6", legendary: "#F59E0B" };
  const RARITY_ZH: Record<string, string> = { common: "普通", rare: "稀有", epic: "史詩", legendary: "傳說" };
  const handleEdit = (item: any) => {
    setEditItem(item);
    setEditForm({ displayName: item.displayName, description: item.description ?? "", priceStones: item.priceStones, quantity: item.quantity, rarity: item.rarity, sortOrder: item.sortOrder ?? 0, maxPerOrder: item.maxPerOrder ?? 1 });
    setEditOpen(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold">靈相商店管理（{shopItems.length} 筆）</h2>
          <p className="text-xs text-muted-foreground mt-0.5">玩家使用「靈石」購買，用於虛相世界的特殊道具（非紙娃娃）</p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm">+ 新增商品</Button>
      </div>
      {isLoading ? <p className="text-muted-foreground">載入中…</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2 px-2">ID</th>
                <th className="text-left py-2 px-2">名稱</th>
                <th className="text-left py-2 px-2">Key</th>
                <th className="text-left py-2 px-2">靈石</th>
                <th className="text-left py-2 px-2">稀有度</th>
                <th className="text-left py-2 px-2">狀態</th>
                <th className="text-left py-2 px-2">鎖定</th>
                <th className="text-left py-2 px-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {shopItems.map((item: any) => (
                <tr key={item.id} className={`border-b hover:bg-muted/30 ${item.isLocked ? 'bg-amber-500/10' : ''}`}>
                  <td className="py-2 px-2 text-muted-foreground">{item.id}</td>
                  <td className="py-2 px-2 font-medium">{item.displayName}</td>
                  <td className="py-2 px-2 text-xs font-mono text-muted-foreground">{item.itemKey}</td>
                  <td className="py-2 px-2 text-purple-400 font-bold">💎 {item.priceStones}</td>
                  <td className="py-2 px-2">
                    <Badge style={{ backgroundColor: RARITY_COLORS[item.rarity] ?? "#888", color: "#fff" }} className="text-xs">
                      {RARITY_ZH[item.rarity] ?? item.rarity}
                    </Badge>
                  </td>
                  <td className="py-2 px-2">
                    <Badge variant={item.isOnSale ? "default" : "outline"}>{item.isOnSale ? "上架" : "下架"}</Badge>
                  </td>
                  <td className="py-2 px-2">
                    <Button size="sm" variant={item.isLocked ? "default" : "outline"}
                      className={item.isLocked ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
                      onClick={() => toggleLockMutation.mutate({ id: item.id, isLocked: item.isLocked ? 0 : 1 })}>
                      {item.isLocked ? '🔒 已鎖' : '🔓 未鎖'}
                    </Button>
                  </td>
                  <td className="py-2 px-2 flex gap-1">
                    <Button size="sm" variant="secondary" onClick={() => handleEdit(item)}>編輯</Button>
                    <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: item.id, data: { isOnSale: item.isOnSale ? 0 : 1 } })}>
                      {item.isOnSale ? "下架" : "上架"}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate({ id: item.id })}>刪</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>新增靈相商店商品</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="道具 Key" value={form.itemKey} onChange={e => setForm(f => ({ ...f, itemKey: e.target.value }))} />
              <Input placeholder="顯示名稱" value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} />
            </div>
            <Textarea placeholder="商品描述" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            <div className="grid grid-cols-3 gap-2">
              <Input type="number" placeholder="靈石價格" value={form.priceStones} onChange={e => setForm(f => ({ ...f, priceStones: +e.target.value }))} />
              <Input type="number" placeholder="購買數量" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: +e.target.value }))} />
              <Select value={form.rarity} onValueChange={(v) => setForm(f => ({ ...f, rarity: v as any }))}>
                <SelectTrigger><SelectValue placeholder="稀有度" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="common">普通</SelectItem>
                  <SelectItem value="rare">稀有</SelectItem>
                  <SelectItem value="epic">史詩</SelectItem>
                  <SelectItem value="legendary">傳說</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* 編輯 Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>編輯靈相商品：{editItem?.displayName}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-muted-foreground">顯示名稱</label><Input value={editForm.displayName ?? ""} onChange={e => setEditForm((f: any) => ({ ...f, displayName: e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground">道具 Key（唯讀）</label><Input value={editItem?.itemKey ?? ""} disabled className="opacity-50" /></div>
            </div>
            <div><label className="text-xs text-muted-foreground">商品描述</label><Textarea value={editForm.description ?? ""} onChange={e => setEditForm((f: any) => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div><label className="text-xs text-muted-foreground">靈石價格</label><Input type="number" value={editForm.priceStones ?? 0} onChange={e => setEditForm((f: any) => ({ ...f, priceStones: +e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground">購買數量</label><Input type="number" value={editForm.quantity ?? 1} onChange={e => setEditForm((f: any) => ({ ...f, quantity: +e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground">單次最多購買</label><Input type="number" value={editForm.maxPerOrder ?? 1} onChange={e => setEditForm((f: any) => ({ ...f, maxPerOrder: +e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-muted-foreground">排序順序</label><Input type="number" value={editForm.sortOrder ?? 0} onChange={e => setEditForm((f: any) => ({ ...f, sortOrder: +e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground">稀有度</label>
                <Select value={editForm.rarity ?? "rare"} onValueChange={(v) => setEditForm((f: any) => ({ ...f, rarity: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="common">普通</SelectItem>
                    <SelectItem value="rare">稀有</SelectItem>
                    <SelectItem value="epic">史詩</SelectItem>
                    <SelectItem value="legendary">傳說</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>取消</Button>
            <Button onClick={() => updateMutation.mutate({ id: editItem.id, data: editForm }, { onSuccess: () => { setEditOpen(false); setEditItem(null); } })} disabled={updateMutation.isPending}>儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Hidden Shop Pool Tab ──────────────────────────────────────────────────────
function HiddenShopTab() {
  const utils = trpc.useUtils();
  const { data: poolItems = [], isLoading } = trpc.gameAdmin.getHiddenShopPool.useQuery();
  const createMutation = trpc.gameAdmin.createHiddenShopItem.useMutation({
    onSuccess: () => { utils.gameAdmin.getHiddenShopPool.invalidate(); toast.success("密店商品已新增"); setOpen(false); setForm(defaultForm); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.gameAdmin.deleteHiddenShopItem.useMutation({
    onSuccess: () => { utils.gameAdmin.getHiddenShopPool.invalidate(); toast.success("已刪除"); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.gameAdmin.updateHiddenShopItem.useMutation({
    onSuccess: () => { utils.gameAdmin.getHiddenShopPool.invalidate(); toast.success("已更新"); },
    onError: (e) => toast.error(e.message),
  });
  const toggleLockMutation = trpc.gameAdmin.toggleHiddenShopLock.useMutation({
    onSuccess: () => { utils.gameAdmin.getHiddenShopPool.invalidate(); toast.success("鎖定狀態已更新"); },
    onError: (e) => toast.error(e.message),
  });

  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const defaultForm = { itemKey: "", displayName: "", description: "", currencyType: "coins" as "coins" | "stones", price: 200, quantity: 1, weight: 10, rarity: "rare" as "common" | "rare" | "epic" | "legendary", isActive: 1 as number, maxPerOrder: 1 };
  const [form, setForm] = useState(defaultForm);
  const [editForm, setEditForm] = useState<any>({});
  const handleEdit = (item: any) => {
    setEditItem(item);
    setEditForm({ displayName: item.displayName, description: item.description ?? "", currencyType: item.currencyType, price: item.price, quantity: item.quantity, weight: item.weight, rarity: item.rarity, maxPerOrder: item.maxPerOrder ?? 1 });
    setEditOpen(true);
  };
  const RARITY_COLORS: Record<string, string> = { common: "#888", rare: "#3B82F6", epic: "#8B5CF6", legendary: "#F59E0B" };
  const RARITY_ZH: Record<string, string> = { common: "普通", rare: "稀有", epic: "史詩", legendary: "傳說" };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold">密店商品池（{poolItems.length} 筆）</h2>
          <p className="text-xs text-muted-foreground mt-0.5">密店商品隨機出現，玩家需洞察力才能發現。「權重」越高，出現機率越大。</p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm">+ 新增商品</Button>
      </div>
      {isLoading ? <p className="text-muted-foreground">載入中…</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2 px-2">ID</th>
                <th className="text-left py-2 px-2">名稱</th>
                <th className="text-left py-2 px-2">貨幣</th>
                <th className="text-left py-2 px-2">價格</th>
                <th className="text-left py-2 px-2">稀有度</th>
                <th className="text-left py-2 px-2">權重</th>
                <th className="text-left py-2 px-2">狀態</th>
                <th className="text-left py-2 px-2">鎖定</th>
                <th className="text-left py-2 px-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {poolItems.map((item: any) => (
                <tr key={item.id} className={`border-b hover:bg-muted/30 ${item.isLocked ? 'bg-amber-500/10' : ''}`}>
                  <td className="py-2 px-2 text-muted-foreground">{item.id}</td>
                  <td className="py-2 px-2 font-medium">{item.displayName}</td>
                  <td className="py-2 px-2 text-xs">{item.currencyType === "coins" ? "🪙 遊戲幣" : "💎 靈石"}</td>
                  <td className="py-2 px-2 font-bold">{item.price}</td>
                  <td className="py-2 px-2">
                    <Badge style={{ backgroundColor: RARITY_COLORS[item.rarity] ?? "#888", color: "#fff" }} className="text-xs">
                      {RARITY_ZH[item.rarity] ?? item.rarity}
                    </Badge>
                  </td>
                  <td className="py-2 px-2">{item.weight}</td>
                  <td className="py-2 px-2">
                    <Badge variant={item.isActive ? "default" : "outline"}>{item.isActive ? "啟用" : "停用"}</Badge>
                  </td>
                  <td className="py-2 px-2">
                    <Button size="sm" variant={item.isLocked ? "default" : "outline"}
                      className={item.isLocked ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
                      onClick={() => toggleLockMutation.mutate({ id: item.id, isLocked: item.isLocked ? 0 : 1 })}>
                      {item.isLocked ? '🔒 已鎖' : '🔓 未鎖'}
                    </Button>
                  </td>
                  <td className="py-2 px-2 flex gap-1">
                    <Button size="sm" variant="secondary" onClick={() => handleEdit(item)}>編輯</Button>
                    <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: item.id, data: { isActive: item.isActive ? 0 : 1 } })}>{item.isActive ? "停用" : "啟用"}</Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate({ id: item.id })}>刪除</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>新增密店商品</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="道具 Key" value={form.itemKey} onChange={e => setForm(f => ({ ...f, itemKey: e.target.value }))} />
              <Input placeholder="顯示名稱" value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} />
            </div>
            <Textarea placeholder="商品描述" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={form.currencyType} onValueChange={(v) => setForm(f => ({ ...f, currencyType: v as any }))}>
                <SelectTrigger><SelectValue placeholder="貨幣類型" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="coins">🪙 遊戲幣</SelectItem>
                  <SelectItem value="stones">💎 靈石</SelectItem>
                </SelectContent>
              </Select>
              <Input type="number" placeholder="價格" value={form.price} onChange={e => setForm(f => ({ ...f, price: +e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Input type="number" placeholder="購買數量" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: +e.target.value }))} />
              <Input type="number" placeholder="出現權重（越高越常見）" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: +e.target.value }))} />
              <Select value={form.rarity} onValueChange={(v) => setForm(f => ({ ...f, rarity: v as any }))}>
                <SelectTrigger><SelectValue placeholder="稀有度" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="common">普通</SelectItem>
                  <SelectItem value="rare">稀有</SelectItem>
                  <SelectItem value="epic">史詩</SelectItem>
                  <SelectItem value="legendary">傳說</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* 編輯 Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>編輯密店商品：{editItem?.displayName}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-muted-foreground">顯示名稱</label><Input value={editForm.displayName ?? ""} onChange={e => setEditForm((f: any) => ({ ...f, displayName: e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground">道具 Key（唯讀）</label><Input value={editItem?.itemKey ?? ""} disabled className="opacity-50" /></div>
            </div>
            <div><label className="text-xs text-muted-foreground">商品描述</label><Textarea value={editForm.description ?? ""} onChange={e => setEditForm((f: any) => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div><label className="text-xs text-muted-foreground">貨幣類型</label>
                <Select value={editForm.currencyType ?? "coins"} onValueChange={(v) => setEditForm((f: any) => ({ ...f, currencyType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coins">🪙 遊戲幣</SelectItem>
                    <SelectItem value="stones">💎 靈石</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><label className="text-xs text-muted-foreground">價格</label><Input type="number" value={editForm.price ?? 0} onChange={e => setEditForm((f: any) => ({ ...f, price: +e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground">購買數量</label><Input type="number" value={editForm.quantity ?? 1} onChange={e => setEditForm((f: any) => ({ ...f, quantity: +e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><label className="text-xs text-muted-foreground">出現權重</label><Input type="number" value={editForm.weight ?? 10} onChange={e => setEditForm((f: any) => ({ ...f, weight: +e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground">單次最多購買</label><Input type="number" value={editForm.maxPerOrder ?? 1} onChange={e => setEditForm((f: any) => ({ ...f, maxPerOrder: +e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground">稀有度</label>
                <Select value={editForm.rarity ?? "rare"} onValueChange={(v) => setEditForm((f: any) => ({ ...f, rarity: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="common">普通</SelectItem>
                    <SelectItem value="rare">稀有</SelectItem>
                    <SelectItem value="epic">史詩</SelectItem>
                    <SelectItem value="legendary">傳說</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>取消</Button>
            <Button onClick={() => updateMutation.mutate({ id: editItem.id, data: editForm }, { onSuccess: () => { setEditOpen(false); setEditItem(null); } })} disabled={updateMutation.isPending}>儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Monster Catalog Tab（怪物圖鑑 GD-011A~E）────────────────────────────────
const WUXING_FILTER_OPTS = ["", "wood", "fire", "earth", "metal", "water"];
const WUXING_ZH_MAP: Record<string, string> = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };
const WUXING_EMOJI_MAP: Record<string, string> = { wood: "🌿", fire: "🔥", earth: "🪨", metal: "⚡", water: "💧" };

function MonsterCatalogTab() {
  const [wuxing, setWuxing] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const { data, isLoading } = trpc.gameAdmin.getMonsterCatalog.useQuery({ wuxing: wuxing || undefined, search: search || undefined });
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">怪物圖鑑（{data?.length ?? 0} 隻）</h2>
        <p className="text-xs text-muted-foreground mt-0.5">GD-011A~E 五行怪物圖鑑，共 100 隻。</p>
      </div>
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <div className="flex gap-1 flex-wrap">
          {WUXING_FILTER_OPTS.map(w => (
            <button key={w} onClick={() => setWuxing(w)}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${wuxing === w ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {w ? `${WUXING_EMOJI_MAP[w]}${WUXING_ZH_MAP[w]}` : "全部"}
            </button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          <Input placeholder="搜尋怪物名稱…" value={searchInput} onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && setSearch(searchInput)} className="w-40 h-8 text-xs" />
          <Button size="sm" variant="outline" onClick={() => setSearch(searchInput)}>搜尋</Button>
          {search && <Button size="sm" variant="ghost" onClick={() => { setSearch(""); setSearchInput(""); }}>清除</Button>}
        </div>
      </div>
      {isLoading ? <p className="text-muted-foreground">載入中…</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-muted-foreground text-xs">
                <th className="text-left py-2 px-2">ID</th>
                <th className="text-left py-2 px-2">名稱</th>
                <th className="text-left py-2 px-2">五行</th>
                <th className="text-left py-2 px-2">等級</th>
                <th className="text-left py-2 px-2">HP</th>
                <th className="text-left py-2 px-2">攻擊</th>
                <th className="text-left py-2 px-2">防禦</th>
                <th className="text-left py-2 px-2">稀有度</th>
                <th className="text-left py-2 px-2">描述</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((m: any) => (
                <tr key={m.id} className="border-b hover:bg-muted/30">
                  <td className="py-2 px-2 text-muted-foreground text-xs font-mono">{m.monsterId}</td>
                  <td className="py-2 px-2 font-medium">{m.name}</td>
                  <td className="py-2 px-2 text-xs">{WUXING_EMOJI_MAP[m.wuxing] ?? ""}{WUXING_ZH_MAP[m.wuxing] ?? m.wuxing}</td>
                  <td className="py-2 px-2 text-xs">Lv.{m.levelRange}</td>
                  <td className="py-2 px-2">{m.baseHp}</td>
                  <td className="py-2 px-2">{m.baseAttack}</td>
                  <td className="py-2 px-2">{m.baseDefense}</td>
                  <td className="py-2 px-2 text-xs">{m.rarity}</td>
                  <td className="py-2 px-2 text-xs text-muted-foreground max-w-xs truncate">{m.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Item Catalog Tab（道具圖鑑 GD-014）──────────────────────────────────────
const ITEM_CAT_LABELS: Record<string, string> = {
  material_basic: "基礎素材", material_drop: "怪物掉落", consumable: "消耗品", quest: "任務道具", treasure: "珍寶天命",
};

function ItemCatalogTab() {
  const [wuxing, setWuxing] = useState("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const { data, isLoading } = trpc.gameAdmin.getItemCatalog.useQuery({ wuxing: wuxing || undefined, category: category || undefined, search: search || undefined });
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">道具圖鑑（{data?.length ?? 0} 種）</h2>
        <p className="text-xs text-muted-foreground mt-0.5">GD-014 完整道具資料庫，共 83 種。</p>
      </div>
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <div className="flex gap-1 flex-wrap">
          {WUXING_FILTER_OPTS.map(w => (
            <button key={w} onClick={() => setWuxing(w)}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${wuxing === w ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {w ? `${WUXING_EMOJI_MAP[w]}${WUXING_ZH_MAP[w]}` : "全部"}
            </button>
          ))}
        </div>
        <div className="flex gap-1 flex-wrap">
          {["", ...Object.keys(ITEM_CAT_LABELS)].map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-2 py-1 rounded-full text-xs border transition-all ${category === c ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}`}>
              {c ? ITEM_CAT_LABELS[c] : "全分類"}
            </button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          <Input placeholder="搜尋道具名稱…" value={searchInput} onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && setSearch(searchInput)} className="w-40 h-8 text-xs" />
          <Button size="sm" variant="outline" onClick={() => setSearch(searchInput)}>搜尋</Button>
          {search && <Button size="sm" variant="ghost" onClick={() => { setSearch(""); setSearchInput(""); }}>清除</Button>}
        </div>
      </div>
      {isLoading ? <p className="text-muted-foreground">載入中…</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-muted-foreground text-xs">
                <th className="text-left py-2 px-2">ID</th>
                <th className="text-left py-2 px-2">名稱</th>
                <th className="text-left py-2 px-2">五行</th>
                <th className="text-left py-2 px-2">分類</th>
                <th className="text-left py-2 px-2">稀有度</th>
                <th className="text-left py-2 px-2">來源</th>
                <th className="text-left py-2 px-2">效果</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((item: any) => (
                <tr key={item.id} className="border-b hover:bg-muted/30">
                  <td className="py-2 px-2 text-muted-foreground text-xs font-mono">{item.itemId}</td>
                  <td className="py-2 px-2 font-medium">{item.name}</td>
                  <td className="py-2 px-2 text-xs">{WUXING_EMOJI_MAP[item.wuxing] ?? ""}{WUXING_ZH_MAP[item.wuxing] ?? item.wuxing}</td>
                  <td className="py-2 px-2 text-xs">{ITEM_CAT_LABELS[item.category] ?? item.category}</td>
                  <td className="py-2 px-2 text-xs">{item.rarity}</td>
                  <td className="py-2 px-2 text-xs text-muted-foreground max-w-[120px] truncate">{item.source}</td>
                  <td className="py-2 px-2 text-xs text-muted-foreground max-w-xs truncate">{item.effect}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Equipment Catalog Tab（裝備圖鑑 GD-015）─────────────────────────────────
const EQUIP_SLOT_LABELS: Record<string, string> = {
  weapon: "主武器", helmet: "頭盔", armor: "護甲", shoes: "鞋子", accessory: "飾品", offhand: "副手",
};

function EquipmentCatalogTab() {
  const [wuxing, setWuxing] = useState("");
  const [slot, setSlot] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const { data, isLoading } = trpc.gameAdmin.getEquipmentCatalog.useQuery({ wuxing: wuxing || undefined, slot: slot || undefined, search: search || undefined });
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">裝備圖鑑（{data?.length ?? 0} 種）</h2>
        <p className="text-xs text-muted-foreground mt-0.5">GD-015 完整裝備資料庫，共 39 種。</p>
      </div>
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <div className="flex gap-1 flex-wrap">
          {WUXING_FILTER_OPTS.map(w => (
            <button key={w} onClick={() => setWuxing(w)}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${wuxing === w ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {w ? `${WUXING_EMOJI_MAP[w]}${WUXING_ZH_MAP[w]}` : "全部"}
            </button>
          ))}
        </div>
        <div className="flex gap-1 flex-wrap">
          {["", ...Object.keys(EQUIP_SLOT_LABELS)].map(s => (
            <button key={s} onClick={() => setSlot(s)}
              className={`px-2 py-1 rounded-full text-xs border transition-all ${slot === s ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}`}>
              {s ? EQUIP_SLOT_LABELS[s] : "全部位"}
            </button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          <Input placeholder="搜尋裝備名稱…" value={searchInput} onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && setSearch(searchInput)} className="w-40 h-8 text-xs" />
          <Button size="sm" variant="outline" onClick={() => setSearch(searchInput)}>搜尋</Button>
          {search && <Button size="sm" variant="ghost" onClick={() => { setSearch(""); setSearchInput(""); }}>清除</Button>}
        </div>
      </div>
      {isLoading ? <p className="text-muted-foreground">載入中…</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-muted-foreground text-xs">
                <th className="text-left py-2 px-2">ID</th>
                <th className="text-left py-2 px-2">名稱</th>
                <th className="text-left py-2 px-2">五行</th>
                <th className="text-left py-2 px-2">部位</th>
                <th className="text-left py-2 px-2">階級</th>
                <th className="text-left py-2 px-2">等級需求</th>
                <th className="text-left py-2 px-2">基礎屬性</th>
                <th className="text-left py-2 px-2">特殊效果</th>
                <th className="text-left py-2 px-2">鍛造素材</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((e: any) => (
                <tr key={e.id} className="border-b hover:bg-muted/30">
                  <td className="py-2 px-2 text-muted-foreground text-xs font-mono">{e.equipId}</td>
                  <td className="py-2 px-2 font-medium">{e.name}</td>
                  <td className="py-2 px-2 text-xs">{WUXING_EMOJI_MAP[e.wuxing] ?? ""}{WUXING_ZH_MAP[e.wuxing] ?? e.wuxing}</td>
                  <td className="py-2 px-2 text-xs">{EQUIP_SLOT_LABELS[e.slot] ?? e.slot}</td>
                  <td className="py-2 px-2 text-xs">{e.tier}</td>
                  <td className="py-2 px-2 text-xs">Lv.{e.levelRequired}</td>
                  <td className="py-2 px-2 text-xs text-muted-foreground max-w-[120px] truncate">{e.baseStats}</td>
                  <td className="py-2 px-2 text-xs text-muted-foreground max-w-[120px] truncate">{e.specialEffect}</td>
                  <td className="py-2 px-2 text-xs text-muted-foreground max-w-[120px] truncate">{e.craftMaterials}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Skill Catalog Tab（技能圖鑑 GD-016）─────────────────────────────────────
const SKILL_CAT_LABELS: Record<string, string> = {
  active_combat: "戰鬥主動", passive_combat: "戰鬥被動", life_gather: "生活採集", craft_forge: "鍛造精煉",
};
const SKILL_TYPE_LABELS: Record<string, string> = {
  attack: "攻擊", heal: "治療", buff: "增益", debuff: "減益", passive: "被動", special: "特殊",
};

function SkillCatalogTab() {
  const [wuxing, setWuxing] = useState("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const { data, isLoading } = trpc.gameAdmin.getSkillCatalog.useQuery({ wuxing: wuxing || undefined, category: category || undefined, search: search || undefined });
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">技能圖鑑（{data?.length ?? 0} 種）</h2>
        <p className="text-xs text-muted-foreground mt-0.5">GD-016 完整技能資料庫，共 109 種。</p>
      </div>
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <div className="flex gap-1 flex-wrap">
          {WUXING_FILTER_OPTS.map(w => (
            <button key={w} onClick={() => setWuxing(w)}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${wuxing === w ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {w ? `${WUXING_EMOJI_MAP[w]}${WUXING_ZH_MAP[w]}` : "全部"}
            </button>
          ))}
        </div>
        <div className="flex gap-1 flex-wrap">
          {["", ...Object.keys(SKILL_CAT_LABELS)].map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-2 py-1 rounded-full text-xs border transition-all ${category === c ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}`}>
              {c ? SKILL_CAT_LABELS[c] : "全分類"}
            </button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          <Input placeholder="搜尋技能名稱…" value={searchInput} onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && setSearch(searchInput)} className="w-40 h-8 text-xs" />
          <Button size="sm" variant="outline" onClick={() => setSearch(searchInput)}>搜尋</Button>
          {search && <Button size="sm" variant="ghost" onClick={() => { setSearch(""); setSearchInput(""); }}>清除</Button>}
        </div>
      </div>
      {isLoading ? <p className="text-muted-foreground">載入中…</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-muted-foreground text-xs">
                <th className="text-left py-2 px-2">ID</th>
                <th className="text-left py-2 px-2">名稱</th>
                <th className="text-left py-2 px-2">五行</th>
                <th className="text-left py-2 px-2">類別</th>
                <th className="text-left py-2 px-2">階級</th>
                <th className="text-left py-2 px-2">類型</th>
                <th className="text-left py-2 px-2">MP</th>
                <th className="text-left py-2 px-2">效果說明</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((s: any) => (
                <tr key={s.id} className="border-b hover:bg-muted/30">
                  <td className="py-2 px-2 text-muted-foreground text-xs font-mono">{s.skillId}</td>
                  <td className="py-2 px-2 font-medium">{s.name}</td>
                  <td className="py-2 px-2 text-xs">{WUXING_EMOJI_MAP[s.wuxing] ?? ""}{WUXING_ZH_MAP[s.wuxing] ?? s.wuxing}</td>
                  <td className="py-2 px-2 text-xs">{SKILL_CAT_LABELS[s.category] ?? s.category}</td>
                  <td className="py-2 px-2 text-xs">{s.tier}</td>
                  <td className="py-2 px-2 text-xs">{SKILL_TYPE_LABELS[s.skillType] ?? s.skillType}</td>
                  <td className="py-2 px-2 text-center">{s.mpCost}</td>
                  <td className="py-2 px-2 text-xs text-muted-foreground max-w-xs truncate">{s.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


// ─── Balance Dashboard Tab ───────────────────────────────────────────────────────────────────
import BalanceRulesEditor from "@/components/admin/BalanceRulesEditor";

function BalanceDashboardTab() {
  const { data, isLoading, refetch } = trpc.gameCatalog.getBalanceAnalysis.useQuery();
  const previewAll = trpc.valueRebalance.previewAll.useQuery(undefined, { enabled: false });
  const [valuePreview, setValuePreview] = useState<any>(null);

  const SEVERITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    "嚴重": { bg: "bg-red-500/20", text: "text-red-400", label: "嚴重" },
    "警告": { bg: "bg-amber-500/20", text: "text-amber-400", label: "警告" },
    "提示": { bg: "bg-blue-500/20", text: "text-blue-400", label: "提示" },
  };

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">分析遊戲數值中…</div>;
  }
  if (!data) {
    return <div className="text-center py-12 text-muted-foreground">無法載入平衡分析資料</div>;
  }

  const scoreColor = data.healthScore >= 80 ? "text-green-400" : data.healthScore >= 50 ? "text-amber-400" : "text-red-400";
  const scoreLabel = data.healthScore >= 80 ? "良好" : data.healthScore >= 50 ? "需注意" : "失衡";
  const scoreBg = data.healthScore >= 80 ? "from-green-500/20 to-green-900/10" : data.healthScore >= 50 ? "from-amber-500/20 to-amber-900/10" : "from-red-500/20 to-red-900/10";

  return (
    <div className="space-y-6">
      {/* 健康分數卡片 */}
      <div className={`rounded-2xl border border-white/10 bg-gradient-to-br ${scoreBg} p-6 text-center`}>
        <div className="text-sm text-muted-foreground mb-2">遊戲數值平衡健康分數</div>
        <div className={`text-6xl font-black ${scoreColor}`}>{data.healthScore}</div>
        <div className={`text-lg font-bold mt-1 ${scoreColor}`}>{scoreLabel}</div>
        <div className="text-xs text-muted-foreground mt-2">
          異常總數：{data.totalAnomalies} 項
        </div>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
          重新分析
        </Button>
      </div>

      {/* 總覽卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
          <div className="text-xs text-muted-foreground">魔物圖鑑</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{data.summary.monsters.total}</div>
          <div className="text-xs mt-1">
            {data.summary.monsters.anomalies > 0
              ? <span className="text-red-400">{data.summary.monsters.anomalies} 項異常</span>
              : <span className="text-green-400">全部正常</span>}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
          <div className="text-xs text-muted-foreground">道具圖鑑</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{data.summary.items.total}</div>
          <div className="text-xs mt-1">
            {data.summary.items.anomalies > 0
              ? <span className="text-red-400">{data.summary.items.anomalies} 項異常</span>
              : <span className="text-green-400">全部正常</span>}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
          <div className="text-xs text-muted-foreground">裝備圖鑑</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{data.summary.equipment.total}</div>
          <div className="text-xs mt-1">
            {data.summary.equipment.anomalies > 0
              ? <span className="text-red-400">{data.summary.equipment.anomalies} 項異常</span>
              : <span className="text-green-400">全部正常</span>}
          </div>
        </div>
      </div>

      {/* 怪物異常列表 */}
      {data.monsterAnomalies.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <span>🐉</span> 怪物數值異常 ({data.monsterAnomalies.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10 text-muted-foreground">
                  <th className="text-left py-2 px-2">名稱</th>
                  <th className="text-left py-2 px-2">ID</th>
                  <th className="text-center py-2 px-2">等級</th>
                  <th className="text-left py-2 px-2">異常欄位</th>
                  <th className="text-right py-2 px-2">當前值</th>
                  <th className="text-right py-2 px-2">同級平均</th>
                  <th className="text-center py-2 px-2">嚴重度</th>
                </tr>
              </thead>
              <tbody>
                {data.monsterAnomalies.map((a, i) => {
                  const style = SEVERITY_STYLES[a.severity] ?? SEVERITY_STYLES["提示"];
                  return (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 px-2 font-medium">{a.name}</td>
                      <td className="py-2 px-2 text-muted-foreground">{a.monsterId}</td>
                      <td className="py-2 px-2 text-center">{a.level}</td>
                      <td className="py-2 px-2">{a.field}</td>
                      <td className="py-2 px-2 text-right font-bold text-amber-400">{a.value}</td>
                      <td className="py-2 px-2 text-right text-muted-foreground">{a.avg}</td>
                      <td className="py-2 px-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 道具異常列表 */}
      {data.itemAnomalies.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <span>🎒</span> 道具數值異常 ({data.itemAnomalies.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10 text-muted-foreground">
                  <th className="text-left py-2 px-2">名稱</th>
                  <th className="text-left py-2 px-2">ID</th>
                  <th className="text-left py-2 px-2">異常類型</th>
                  <th className="text-right py-2 px-2">當前值</th>
                  <th className="text-left py-2 px-2">閾值</th>
                  <th className="text-center py-2 px-2">嚴重度</th>
                </tr>
              </thead>
              <tbody>
                {data.itemAnomalies.map((a, i) => {
                  const style = SEVERITY_STYLES[a.severity] ?? SEVERITY_STYLES["提示"];
                  return (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 px-2 font-medium">{a.name}</td>
                      <td className="py-2 px-2 text-muted-foreground">{a.itemId}</td>
                      <td className="py-2 px-2">{a.field}</td>
                      <td className="py-2 px-2 text-right font-bold text-amber-400">{a.value}</td>
                      <td className="py-2 px-2">{a.threshold}</td>
                      <td className="py-2 px-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 裝備異常列表 */}
      {data.equipAnomalies.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <span>⚔️</span> 裝備數值異常 ({data.equipAnomalies.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10 text-muted-foreground">
                  <th className="text-left py-2 px-2">名稱</th>
                  <th className="text-left py-2 px-2">ID</th>
                  <th className="text-left py-2 px-2">異常欄位</th>
                  <th className="text-right py-2 px-2">當前值</th>
                  <th className="text-right py-2 px-2">同品質平均</th>
                  <th className="text-center py-2 px-2">嚴重度</th>
                </tr>
              </thead>
              <tbody>
                {data.equipAnomalies.map((a, i) => {
                  const style = SEVERITY_STYLES[a.severity] ?? SEVERITY_STYLES["提示"];
                  return (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 px-2 font-medium">{a.name}</td>
                      <td className="py-2 px-2 text-muted-foreground">{a.equipId}</td>
                      <td className="py-2 px-2">{a.field}</td>
                      <td className="py-2 px-2 text-right font-bold text-amber-400">{a.value}</td>
                      <td className="py-2 px-2 text-right text-muted-foreground">{a.avg}</td>
                      <td className="py-2 px-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 全部正常的提示 */}
      {data.totalAnomalies === 0 && (
        <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-8 text-center">
          <div className="text-4xl mb-3">✅</div>
          <div className="text-lg font-bold text-green-400">遊戲數值全部平衡</div>
          <div className="text-sm text-muted-foreground mt-1">所有怪物、道具、裝備的數值均在合理範圍內</div>
        </div>
      )}

      {/* 價值引擎快速概覽 */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <span>💎</span> 價值引擎快速概覽
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => previewAll.refetch().then(r => r.data && setValuePreview(r.data))}
            disabled={previewAll.isFetching}
          >
            {previewAll.isFetching ? "⚙️ 分析中..." : "🔍 執行價值評估"}
          </Button>
        </div>
        {!valuePreview ? (
          <p className="text-xs text-muted-foreground">點擊上方按鈕執行 ValueEngine 全圖鑑價值評估，查看 S/A/B/C/D 品質分布。完整功能請前往「💎 價值引擎」分頁。</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-2 rounded bg-muted/30">
                <p className="text-xs text-muted-foreground">道具</p>
                <p className="text-lg font-bold text-amber-400">{valuePreview.summary.items}</p>
              </div>
              <div className="p-2 rounded bg-muted/30">
                <p className="text-xs text-muted-foreground">裝備</p>
                <p className="text-lg font-bold text-amber-400">{valuePreview.summary.equipment}</p>
              </div>
              <div className="p-2 rounded bg-muted/30">
                <p className="text-xs text-muted-foreground">技能</p>
                <p className="text-lg font-bold text-amber-400">{valuePreview.summary.skills}</p>
              </div>
            </div>
            {/* 品質分布統計 */}
            {(() => {
              const allItems = [
                ...(valuePreview.items || []).map((i: any) => ({ ...i, _type: "道具" })),
                ...(valuePreview.equipment || []).map((i: any) => ({ ...i, _type: "裝備" })),
                ...(valuePreview.skills || []).map((i: any) => ({ ...i, _type: "技能" })),
              ];
              const gradeCount: Record<string, number> = { S: 0, A: 0, B: 0, C: 0, D: 0 };
              for (const item of allItems) {
                const g = item.qualityGrade || "C";
                gradeCount[g] = (gradeCount[g] || 0) + 1;
              }
              const gradeColors: Record<string, string> = { S: "#EF4444", A: "#F97316", B: "#EAB308", C: "#22C55E", D: "#6B7280" };
              return (
                <div className="flex gap-2 justify-center">
                  {Object.entries(gradeCount).map(([g, count]) => (
                    <div key={g} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/30">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: gradeColors[g] }}>{g}</span>
                      <span className="text-sm font-bold">{count}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
            <p className="text-[10px] text-muted-foreground text-center">品質分布：S(前10%) A(10~30%) B(30~60%) C(60~85%) D(後15%)</p>
          </div>
        )}
      </div>

      {/* 平衡規則自訂編輯器 */}
      <div className="mt-8 pt-6 border-t border-white/10">
        <BalanceRulesEditor />
      </div>

      {/* 屬性平衡設定面板 */}
      <div className="mt-8 pt-6 border-t border-white/10">
        <StatBalancePanel />
      </div>

      {/* GD-028 職業/命格/寵物/經驗值/戰鬥係數設定 */}
      <div className="mt-8 pt-6 border-t border-white/10">
        <GD028ConfigPanel />
      </div>
    </div>
  );
}

/** 屬性平衡設定面板（管理員可調等級基礎、注靈加成、抗性上限等） */
function StatBalancePanel() {
  const { data: cfg, refetch } = trpc.gameAdmin.getEngineConfig.useQuery();
  const updateMut = trpc.gameAdmin.updateEngineConfig.useMutation({ onSuccess: () => refetch() });

  const [form, setForm] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState(false);

  // 初始化表單
  useEffect(() => {
    if (cfg) {
      setForm({
        statLvHpMult:    cfg.statLvHpMult    ?? 12,
        statLvHpBase:    cfg.statLvHpBase    ?? 80,
        statLvAtkMult:   cfg.statLvAtkMult   ?? 8,
        statLvAtkBase:   cfg.statLvAtkBase   ?? 15,
        statLvDefMult:   cfg.statLvDefMult   ?? 8,
        statLvDefBase:   cfg.statLvDefBase   ?? 15,
        statLvSpdMult:   cfg.statLvSpdMult   ?? 6,
        statLvSpdBase:   cfg.statLvSpdBase   ?? 10,
        statLvMpMult:    cfg.statLvMpMult    ?? 8,
        statLvMpBase:    cfg.statLvMpBase    ?? 40,
        infuseHpPer100:  cfg.infuseHpPer100  ?? 30,
        infuseAtkPer100: cfg.infuseAtkPer100 ?? 20,
        infuseDefPer100: cfg.infuseDefPer100 ?? 20,
        infuseSpdPer100: cfg.infuseSpdPer100 ?? 15,
        infuseMpPer100:  cfg.infuseMpPer100  ?? 20,
        resistMaxPct:    cfg.resistMaxPct    ?? 50,
        combatAtkCoeff:  cfg.combatAtkCoeff  ?? 1.5,
        combatDefCoeff:  cfg.combatDefCoeff  ?? 0.5,
        // 屬性上限
        statCapHp:       cfg.statCapHp       ?? 99999,
        statCapMp:       cfg.statCapMp       ?? 9999,
        statCapAtk:      cfg.statCapAtk      ?? 1500,
        statCapDef:      cfg.statCapDef      ?? 1500,
        statCapSpd:      cfg.statCapSpd      ?? 1500,
        statCapMatk:     cfg.statCapMatk     ?? 1500,
        statCapMdef:     cfg.statCapMdef     ?? 1500,
        wuxingCap:       cfg.wuxingCap       ?? 100,
        // 潛能點數
        potentialPointsPerLevel: cfg.potentialPointsPerLevel ?? 5,
      });
    }
  }, [cfg]);

  const handleSave = () => {
    updateMut.mutate(form as any, {
      onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2000); },
    });
  };

  const field = (key: string, label: string, step = 1, min = 0, max = 999) => (
    <div key={key} className="flex flex-col gap-1">
      <label className="text-[11px] text-muted-foreground">{label}</label>
      <input
        type="number"
        step={step}
        min={min}
        max={max}
        value={form[key] ?? ""}
        onChange={e => setForm(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
        className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-sm text-white"
      />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2"><span>📊</span> 屬性平衡設定</h3>
        <Button size="sm" onClick={handleSave} disabled={updateMut.isPending}>
          {saved ? "✅ 已儲存" : updateMut.isPending ? "儲存中..." : "💾 儲存設定"}
        </Button>
      </div>

      {/* 等級基礎倍率 */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h4 className="text-xs font-bold text-amber-400 mb-3">等級基礎倍率（Lv × N）</h4>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {field("statLvHpMult",  "HP 倍率", 1, 1, 100)}
          {field("statLvAtkMult", "ATK 倍率", 1, 1, 100)}
          {field("statLvDefMult", "DEF 倍率", 1, 1, 100)}
          {field("statLvSpdMult", "SPD 倍率", 1, 1, 100)}
          {field("statLvMpMult",  "MP 倍率", 1, 1, 100)}
        </div>
      </div>

      {/* 等級基礎常數 */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h4 className="text-xs font-bold text-amber-400 mb-3">等級基礎常數（+常數）</h4>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {field("statLvHpBase",  "HP 常數", 5, 0, 1000)}
          {field("statLvAtkBase", "ATK 常數", 1, 0, 500)}
          {field("statLvDefBase", "DEF 常數", 1, 0, 500)}
          {field("statLvSpdBase", "SPD 常數", 1, 0, 500)}
          {field("statLvMpBase",  "MP 常數", 1, 0, 500)}
        </div>
      </div>

      {/* 注靈加成（每 100 點） */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h4 className="text-xs font-bold text-amber-400 mb-3">注靈加成（每 100 點）</h4>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {field("infuseHpPer100",  "🌿 木→HP", 1, 0, 500)}
          {field("infuseAtkPer100", "🔥 火→ATK", 1, 0, 500)}
          {field("infuseDefPer100", "⛰️ 土→DEF", 1, 0, 500)}
          {field("infuseSpdPer100", "⚔️ 金→SPD", 1, 0, 500)}
          {field("infuseMpPer100",  "💧 水→MP", 1, 0, 500)}
        </div>
      </div>

      {/* 戰鬥公式和抗性上限 */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h4 className="text-xs font-bold text-amber-400 mb-3">戰鬥公式和抗性上限</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {field("combatAtkCoeff", "傷害 ATK 係數 A", 0.1, 0.1, 10)}
          {field("combatDefCoeff", "傷害 DEF 係數 B", 0.1, 0.1, 10)}
          {field("resistMaxPct",   "五行抗性上限 (%)", 1, 1, 90)}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">公式：傷害 = ATK × A - DEF × B，抗性上限為注靈最高可獲得的抗性%</p>
      </div>

      {/* 屬性上限 */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h4 className="text-xs font-bold text-amber-400 mb-3">🛡️ 屬性上限</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {field("statCapHp",   "HP 上限", 1000, 1000, 999999)}
          {field("statCapMp",   "MP 上限", 100, 100, 99999)}
          {field("statCapAtk",  "ATK 上限", 100, 100, 99999)}
          {field("statCapDef",  "DEF 上限", 100, 100, 99999)}
          {field("statCapSpd",  "SPD 上限", 100, 100, 99999)}
          {field("statCapMatk", "MATK 上限", 100, 100, 99999)}
          {field("statCapMdef", "MDEF 上限", 100, 100, 99999)}
          {field("wuxingCap",   "五行上限", 10, 10, 1000)}
        </div>
      </div>

      {/* 潛能點數 */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h4 className="text-xs font-bold text-amber-400 mb-3">⭐ 潛能配置</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {field("potentialPointsPerLevel", "每級獲得潛能點數", 1, 1, 50)}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">每次升級獲得的自由潛能點數，可分配到五行元素</p>
      </div>

      {/* 預覽計算結果 */}
      {cfg && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h4 className="text-xs font-bold text-amber-400 mb-3">🔮 Lv.50 屬性預覽（無注靈）</h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            {[
              { label: "HP",  val: Math.floor(50 * (form.statLvHpMult ?? 12)  + (form.statLvHpBase  ?? 80)) },
              { label: "ATK", val: Math.floor(50 * (form.statLvAtkMult ?? 8)  + (form.statLvAtkBase ?? 15)) },
              { label: "DEF", val: Math.floor(50 * (form.statLvDefMult ?? 8)  + (form.statLvDefBase ?? 15)) },
              { label: "SPD", val: Math.floor(50 * (form.statLvSpdMult ?? 6)  + (form.statLvSpdBase ?? 10)) },
              { label: "MP",  val: Math.floor(50 * (form.statLvMpMult ?? 8)   + (form.statLvMpBase  ?? 40)) },
            ].map(({ label, val }) => (
              <div key={label} className="p-2 rounded bg-white/5">
                <div className="text-[10px] text-muted-foreground">{label}</div>
                <div className="text-lg font-bold text-amber-300">{val}</div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">注靈满分（注靈=1000）時：HP+{(form.infuseHpPer100 ?? 30) * 10} / ATK+{(form.infuseAtkPer100 ?? 20) * 10} / DEF+{(form.infuseDefPer100 ?? 20) * 10} / SPD+{(form.infuseSpdPer100 ?? 15) * 10} / MP+{(form.infuseMpPer100 ?? 20) * 10}</p>
        </div>
      )}
    </div>
  );
}


/** GD-028 職業/命格/寵物協同/經驗值曲線/戰鬥係數設定面板 */
function GD028ConfigPanel() {
  const { data: cfg, refetch } = trpc.gameAdmin.getEngineConfig.useQuery();
  const updateMut = trpc.gameAdmin.updateEngineConfig.useMutation({ onSuccess: () => refetch() });

  const [form, setForm] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (cfg) {
      setForm({
        expCurveBase: cfg.expCurveBase ?? 80,
        expCurveLogScale: cfg.expCurveLogScale ?? 0.5,
        // V3 經驗曲線可調參數
        expCurveA: cfg.expCurveA ?? 2,
        expCurveB: cfg.expCurveB ?? 1.6,
        expCurveC: cfg.expCurveC ?? 0.25,
        maxLevel: cfg.maxLevel ?? 99,
        // 五行潛能加成
        potWoodHp: cfg.potWoodHp ?? 2,
        potWoodHeal: cfg.potWoodHeal ?? 0.5,
        potFireAtk: cfg.potFireAtk ?? 0.5,
        potFireMatk: cfg.potFireMatk ?? 0.5,
        potFireCritDmg: cfg.potFireCritDmg ?? 0.2,
        potEarthDef: cfg.potEarthDef ?? 0.5,
        potEarthMdef: cfg.potEarthMdef ?? 0.3,
        potMetalSpd: cfg.potMetalSpd ?? 0.3,
        potMetalCrit: cfg.potMetalCrit ?? 0.1,
        potMetalHit: cfg.potMetalHit ?? 0.3,
        potWaterMp: cfg.potWaterMp ?? 1,
        potWaterSpr: cfg.potWaterSpr ?? 0.3,
        profHunterAtk: cfg.profHunterAtk ?? 0.12,
        profHunterSpd: cfg.profHunterSpd ?? 0.08,
        profMageMatk: cfg.profMageMatk ?? 0.15,
        profMageMp: cfg.profMageMp ?? 0.10,
        profTankHp: cfg.profTankHp ?? 0.15,
        profTankDef: cfg.profTankDef ?? 0.12,
        profThiefSpd: cfg.profThiefSpd ?? 0.15,
        profThiefCrit: cfg.profThiefCrit ?? 5,
        profWizardMatk: cfg.profWizardMatk ?? 0.10,
        profWizardSpr: cfg.profWizardSpr ?? 0.12,
        fateWoodHp: cfg.fateWoodHp ?? 0.10,
        fateFireAtk: cfg.fateFireAtk ?? 0.10,
        fateFireMatk: cfg.fateFireMatk ?? 0.10,
        fateEarthDef: cfg.fateEarthDef ?? 0.10,
        fateEarthMdef: cfg.fateEarthMdef ?? 0.10,
        fateMetalSpd: cfg.fateMetalSpd ?? 0.10,
        fateMetalCrit: cfg.fateMetalCrit ?? 5,
        fateWaterMp: cfg.fateWaterMp ?? 0.10,
        fateWaterSpr: cfg.fateWaterSpr ?? 0.05,
        petSynergySame: cfg.petSynergySame ?? 0.15,
        petSynergyGenerate: cfg.petSynergyGenerate ?? 0.08,
        petSynergyOvercome: cfg.petSynergyOvercome ?? -0.05,
        wuxingOvercomeMult: cfg.wuxingOvercomeMult ?? 1.5,
        wuxingGenerateMult: cfg.wuxingGenerateMult ?? 0.8,
      });
    }
  }, [cfg]);

  const handleSave = () => {
    updateMut.mutate(form as any, {
      onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2000); },
    });
  };

  const field = (key: string, label: string, step = 0.01, min = -1, max = 5) => (
    <div key={key} className="flex flex-col gap-1">
      <label className="text-[11px] text-muted-foreground">{label}</label>
      <input
        type="number"
        step={step}
        min={min}
        max={max}
        value={form[key] ?? ""}
        onChange={e => setForm(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
        className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-sm text-white"
      />
    </div>
  );

  // 經驗值曲線預覽（使用可調參數）
  const expA = form.expCurveA ?? 2;
  const expB = form.expCurveB ?? 1.6;
  const expC = form.expCurveC ?? 0.25;
  const maxLv = form.maxLevel ?? 99;
  const expPreview = [1, 5, 10, 20, 30, 50, 70, 90, Math.floor(maxLv)].map(lv => {
    const exp = lv <= 0 ? 1 : lv >= maxLv ? 999999 : Math.floor(expA * Math.pow(lv, expB + expC * Math.log(lv)));
    return { lv, exp };
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2"><span>⚙️</span> GD-028 進階平衡設定</h3>
        <Button size="sm" onClick={handleSave} disabled={updateMut.isPending}>
          {saved ? "✅ 已儲存" : updateMut.isPending ? "儲存中..." : "💾 儲存設定"}
        </Button>
      </div>

      {/* 經驗值曲線可調參數 */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h4 className="text-xs font-bold text-cyan-400 mb-3">📈 經驗值曲線（V3 變指數公式）</h4>
        <p className="text-[10px] text-muted-foreground mb-3">公式：A × level^(B + C × ln(level))，滿級 Lv.{Math.floor(maxLv)}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          {field("expCurveA", "A 係數", 0.1, 0.1, 100)}
          {field("expCurveB", "B 指數", 0.1, 0.1, 10)}
          {field("expCurveC", "C 對數係數", 0.01, 0, 5)}
          {field("maxLevel", "最高等級", 1, 10, 999)}
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-9 gap-2 text-center">
          {expPreview.map(({ lv, exp }) => (
            <div key={lv} className="p-1.5 rounded bg-white/5">
              <div className="text-[10px] text-muted-foreground">Lv.{lv}</div>
              <div className="text-xs font-bold text-cyan-300">{exp >= 999999 ? "MAX" : exp.toLocaleString()}</div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">目標：Lv.1→10 累計 ~1,000 / Lv.90→99 累計 ~5,000,000</p>
      </div>

      {/* 五行潛能加成參數 */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h4 className="text-xs font-bold text-emerald-400 mb-3">✨ 五行潛能加成（每點效果）</h4>
        <div className="space-y-3">
          <div>
            <div className="text-[10px] text-green-300 mb-1">🌿 木（生命系）</div>
            <div className="grid grid-cols-2 gap-3">
              {field("potWoodHp", "HP +", 0.1, 0, 50)}
              {field("potWoodHeal", "治癒力 +", 0.1, 0, 20)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-red-300 mb-1">🔥 火（攻擊系）</div>
            <div className="grid grid-cols-3 gap-3">
              {field("potFireAtk", "ATK +", 0.1, 0, 20)}
              {field("potFireMatk", "MATK +", 0.1, 0, 20)}
              {field("potFireCritDmg", "暴擊傷害 +%", 0.01, 0, 5)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-yellow-300 mb-1">⛰️ 土（防禦系）</div>
            <div className="grid grid-cols-2 gap-3">
              {field("potEarthDef", "DEF +", 0.1, 0, 20)}
              {field("potEarthMdef", "MDEF +", 0.1, 0, 20)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-gray-300 mb-1">⚔️ 金（速度系）</div>
            <div className="grid grid-cols-3 gap-3">
              {field("potMetalSpd", "SPD +", 0.1, 0, 20)}
              {field("potMetalCrit", "暴擊率 +%", 0.01, 0, 5)}
              {field("potMetalHit", "命中率 +", 0.1, 0, 20)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-blue-300 mb-1">💧 水（魔力系）</div>
            <div className="grid grid-cols-2 gap-3">
              {field("potWaterMp", "MP +", 0.1, 0, 50)}
              {field("potWaterSpr", "SPR +", 0.1, 0, 20)}
            </div>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">每點潛能分配到該五行元素時的屬性加成量，例如：10點火 = ATK+{(10 * (form.potFireAtk ?? 0.5)).toFixed(1)}, MATK+{(10 * (form.potFireMatk ?? 0.5)).toFixed(1)}</p>
      </div>

      {/* 職業加成 */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h4 className="text-xs font-bold text-emerald-400 mb-3">⚔️ 職業屬性加成</h4>
        <div className="space-y-3">
          <div>
            <div className="text-[10px] text-amber-300 mb-1">🏹 獵人</div>
            <div className="grid grid-cols-2 gap-3">
              {field("profHunterAtk", "ATK +%", 0.01, 0, 1)}
              {field("profHunterSpd", "SPD +%", 0.01, 0, 1)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-blue-300 mb-1">🔮 法師</div>
            <div className="grid grid-cols-2 gap-3">
              {field("profMageMatk", "MATK +%", 0.01, 0, 1)}
              {field("profMageMp", "MP +%", 0.01, 0, 1)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-red-300 mb-1">🛡️ 鬥士</div>
            <div className="grid grid-cols-2 gap-3">
              {field("profTankHp", "HP +%", 0.01, 0, 1)}
              {field("profTankDef", "DEF +%", 0.01, 0, 1)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-purple-300 mb-1">🗡️ 盜賊</div>
            <div className="grid grid-cols-2 gap-3">
              {field("profThiefSpd", "SPD +%", 0.01, 0, 1)}
              {field("profThiefCrit", "暴擊率 +", 1, 0, 50)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-indigo-300 mb-1">🪄 巫師</div>
            <div className="grid grid-cols-2 gap-3">
              {field("profWizardMatk", "MATK +%", 0.01, 0, 1)}
              {field("profWizardSpr", "SPR +%", 0.01, 0, 1)}
            </div>
          </div>
        </div>
      </div>

      {/* 命格加成 */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h4 className="text-xs font-bold text-amber-400 mb-3">✨ 命格屬性加成</h4>
        <div className="space-y-3">
          <div>
            <div className="text-[10px] text-green-300 mb-1">🐲 青龍命（木）</div>
            <div className="grid grid-cols-1 gap-3">
              {field("fateWoodHp", "HP +%", 0.01, 0, 1)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-red-300 mb-1">🔥 朱雀命（火）</div>
            <div className="grid grid-cols-2 gap-3">
              {field("fateFireAtk", "ATK +%", 0.01, 0, 1)}
              {field("fateFireMatk", "MATK +%", 0.01, 0, 1)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-yellow-300 mb-1">🦄 麒麟命（土）</div>
            <div className="grid grid-cols-2 gap-3">
              {field("fateEarthDef", "DEF +%", 0.01, 0, 1)}
              {field("fateEarthMdef", "MDEF +%", 0.01, 0, 1)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-gray-300 mb-1">🐯 白虎命（金）</div>
            <div className="grid grid-cols-2 gap-3">
              {field("fateMetalSpd", "SPD +%", 0.01, 0, 1)}
              {field("fateMetalCrit", "暴擊率 +", 1, 0, 50)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-blue-300 mb-1">🐢 玄武命（水）</div>
            <div className="grid grid-cols-2 gap-3">
              {field("fateWaterMp", "MP +%", 0.01, 0, 1)}
              {field("fateWaterSpr", "SPR +%", 0.01, 0, 1)}
            </div>
          </div>
        </div>
      </div>

      {/* 寵物命格協同 */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h4 className="text-xs font-bold text-pink-400 mb-3">🐾 寵物命格協同加成</h4>
        <div className="grid grid-cols-3 gap-3">
          {field("petSynergySame", "同五行 +%", 0.01, 0, 1)}
          {field("petSynergyGenerate", "相生 +%", 0.01, 0, 1)}
          {field("petSynergyOvercome", "相剣 -%", 0.01, -1, 0)}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">寵物五行與主人命格的關係決定全屬性加成倍率</p>
      </div>

      {/* 戰鬥傷害係數 */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h4 className="text-xs font-bold text-red-400 mb-3">💥 五行戰鬥傷害係數</h4>
        <div className="grid grid-cols-2 gap-3">
          {field("wuxingOvercomeMult", "相剣傷害倍率", 0.1, 1, 5)}
          {field("wuxingGenerateMult", "相生傷害倍率", 0.1, 0.1, 1)}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">相剣倍率越高越強，相生倍率越低越弱（預設：相剣 1.5x / 相生 0.8x）</p>
      </div>
    </div>
  );
}

// ─── Combat Simulator Panel ────────────────────────────────────────────────────────────────────────────────────────────────────
const PROFESSIONS_LIST = [
  { value: "none", label: "無職業" },
  { value: "hunter", label: "🏹 獵人" },
  { value: "mage", label: "🔮 法師" },
  { value: "tank", label: "🛡️ 鬥士" },
  { value: "thief", label: "🗡️ 盜賊" },
  { value: "wizard", label: "🪄 巫師" },
];
const FATES_LIST = [
  { value: "", label: "無命格" },
  { value: "wood", label: "🐲 青龍命" },
  { value: "fire", label: "🔥 朱雀命" },
  { value: "earth", label: "🦄 麒麟命" },
  { value: "metal", label: "🐯 白虎命" },
  { value: "water", label: "🐢 玄武命" },
];
const RACES_LIST = [
  { value: "human", label: "人族" },
  { value: "elf", label: "精靈" },
  { value: "beastkin", label: "獸族" },
  { value: "undead", label: "不死族" },
  { value: "demon", label: "魔族" },
];

function CombatSimulatorPanel() {
  const simMut = trpc.gameAdmin.simulateCombat.useMutation();
  const [rounds, setRounds] = useState(10);
  const [showLog, setShowLog] = useState(false);

  const defaultAgent = {
    level: 10,
    race: "human",
    profession: "none",
    fateElement: "",
    wuxing: { wood: 20, fire: 20, earth: 20, metal: 20, water: 20 },
    potential: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
    equipBonus: { hp: 0, mp: 0, atk: 0, def: 0, spd: 0, matk: 0, mdef: 0, spr: 0, healPower: 0, hitRate: 0, critRate: 0, critDamage: 0 },
  };
  const [agentA, setAgentA] = useState({ ...defaultAgent });
  const [agentB, setAgentB] = useState({ ...defaultAgent, level: 10 });

  const handleSimulate = () => {
    simMut.mutate({ agentA, agentB, rounds });
  };

  const AgentForm = ({ agent, setAgent, label, color }: { agent: typeof defaultAgent; setAgent: (a: typeof defaultAgent) => void; label: string; color: string }) => (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
      <h4 className="text-sm font-bold" style={{ color }}>{label}</h4>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] text-muted-foreground">等級</label>
          <input type="number" min={1} max={99} value={agent.level}
            onChange={e => setAgent({ ...agent, level: parseInt(e.target.value) || 1 })}
            className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-sm text-white" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">種族</label>
          <select value={agent.race} onChange={e => setAgent({ ...agent, race: e.target.value })}
            className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-sm text-white">
            {RACES_LIST.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">職業</label>
          <select value={agent.profession} onChange={e => setAgent({ ...agent, profession: e.target.value })}
            className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-sm text-white">
            {PROFESSIONS_LIST.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="text-[10px] text-muted-foreground">命格</label>
        <select value={agent.fateElement} onChange={e => setAgent({ ...agent, fateElement: e.target.value })}
          className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-sm text-white">
          {FATES_LIST.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>
      <div>
        <label className="text-[10px] text-muted-foreground">五行點數（合計 100）</label>
        <div className="grid grid-cols-5 gap-1">
          {(["wood", "fire", "earth", "metal", "water"] as const).map(el => (
            <div key={el} className="text-center">
              <div className="text-[9px] text-muted-foreground">{{
                wood: "木", fire: "火", earth: "土", metal: "金", water: "水"
              }[el]}</div>
              <input type="number" min={0} max={100} value={agent.wuxing[el]}
                onChange={e => setAgent({ ...agent, wuxing: { ...agent.wuxing, [el]: parseInt(e.target.value) || 0 } })}
                className="w-full px-1 py-0.5 rounded bg-white/5 border border-white/10 text-xs text-white text-center" />
            </div>
          ))}
        </div>
      </div>
      <div>
        <label className="text-[10px] text-muted-foreground">潛能五行分配</label>
        <div className="grid grid-cols-5 gap-1">
          {(["wood", "fire", "earth", "metal", "water"] as const).map(el => {
            const labels: Record<string, string> = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };
            return (
              <div key={el} className="text-center">
                <div className="text-[9px] text-muted-foreground">{labels[el]}</div>
                <input type="number" min={0} max={500} value={agent.potential[el]}
                  onChange={e => setAgent({ ...agent, potential: { ...agent.potential, [el]: parseInt(e.target.value) || 0 } })}
                  className="w-full px-1 py-0.5 rounded bg-white/5 border border-white/10 text-xs text-white text-center" />
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <label className="text-[10px] text-muted-foreground">裝備加成（模擬裝備提供的額外屬性）</label>
        <div className="grid grid-cols-4 gap-1">
          {([
            { k: "hp", l: "HP" }, { k: "mp", l: "MP" }, { k: "atk", l: "ATK" }, { k: "def", l: "DEF" },
            { k: "spd", l: "SPD" }, { k: "matk", l: "MATK" }, { k: "mdef", l: "MDEF" }, { k: "spr", l: "SPR" },
            { k: "healPower", l: "回復力" }, { k: "hitRate", l: "命中%" }, { k: "critRate", l: "暴擊%" }, { k: "critDamage", l: "暴傷%" },
          ] as { k: keyof typeof agent.equipBonus; l: string }[]).map(({ k, l }) => (
            <div key={k} className="text-center">
              <div className="text-[9px] text-muted-foreground">{l}</div>
              <input type="number" min={0} max={9999}
                value={agent.equipBonus[k]}
                onChange={e => setAgent({ ...agent, equipBonus: { ...agent.equipBonus, [k]: parseInt(e.target.value) || 0 } })}
                className="w-full px-1 py-0.5 rounded bg-white/5 border border-white/10 text-xs text-white text-center" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const result = simMut.data;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2">⚔️ GM 戰鬥模擬器</h3>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-muted-foreground">模擬場數</label>
          <input type="number" min={1} max={100} value={rounds}
            onChange={e => setRounds(parseInt(e.target.value) || 10)}
            className="w-16 px-2 py-1 rounded bg-white/5 border border-white/10 text-sm text-white" />
          <Button size="sm" onClick={handleSimulate} disabled={simMut.isPending}>
            {simMut.isPending ? "模擬中..." : "🎮 開始模擬"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AgentForm agent={agentA} setAgent={setAgentA} label="🔵 角色 A" color="#3b82f6" />
        <AgentForm agent={agentB} setAgent={setAgentB} label="🔴 角色 B" color="#ef4444" />
      </div>

      {result && (
        <div className="space-y-4">
          {/* 勝率統計 */}
          <div className="rounded-xl border border-white/10 bg-gradient-to-r from-blue-500/10 via-transparent to-red-500/10 p-4">
            <div className="text-center mb-3">
              <div className="text-xs text-muted-foreground">模擬 {result.summary.total} 場戰鬥</div>
            </div>
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <div className="text-3xl font-black text-blue-400">{result.summary.winRateA}%</div>
                <div className="text-xs text-blue-300">角色 A 勝率</div>
                <div className="text-[10px] text-muted-foreground">{result.summary.winsA} 勝</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-500">VS</div>
                <div className="text-[10px] text-muted-foreground">{result.summary.draws} 平</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black text-red-400">{result.summary.winRateB}%</div>
                <div className="text-xs text-red-300">角色 B 勝率</div>
                <div className="text-[10px] text-muted-foreground">{result.summary.winsB} 勝</div>
              </div>
            </div>
          </div>

          {/* 屬性對比 */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <h4 className="text-xs font-bold text-amber-400 mb-3">📊 屬性對比</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {([
                { key: "hp", label: "HP", color: "#22c55e" },
                { key: "mp", label: "MP", color: "#38bdf8" },
                { key: "atk", label: "ATK", color: "#ef4444" },
                { key: "def", label: "DEF", color: "#f59e0b" },
                { key: "spd", label: "SPD", color: "#e2e8f0" },
                { key: "matk", label: "MATK", color: "#a855f7" },
                { key: "mdef", label: "MDEF", color: "#14b8a6" },
                { key: "spr", label: "SPR", color: "#6366f1" },
                { key: "critRate", label: "暴擊%", color: "#f97316" },
                { key: "critDamage", label: "暴傷%", color: "#f97316" },
                { key: "healPower", label: "回復力", color: "#10b981" },
                { key: "hitRate", label: "命中%", color: "#84cc16" },
              ] as const).map(({ key, label, color }) => {
                const vA = (result.statsA as any)[key] ?? 0;
                const vB = (result.statsB as any)[key] ?? 0;
                const winner = vA > vB ? "A" : vB > vA ? "B" : "";
                return (
                  <div key={key} className="flex items-center justify-between py-0.5">
                    <span className={`text-xs font-mono ${winner === "A" ? "text-blue-400 font-bold" : "text-gray-400"}`}>{vA}</span>
                    <span className="text-[10px] px-2" style={{ color }}>{label}</span>
                    <span className={`text-xs font-mono ${winner === "B" ? "text-red-400 font-bold" : "text-gray-400"}`}>{vB}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 戰鬥日誌 */}
          {result.sampleBattles.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <button onClick={() => setShowLog(!showLog)}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors">
                {showLog ? "▼" : "▶"} 戰鬥日誌樣本（前 {result.sampleBattles.length} 場）
              </button>
              {showLog && (
                <div className="mt-3 space-y-3">
                  {result.sampleBattles.map((b: any, i: number) => (
                    <div key={i} className="rounded-lg bg-black/30 p-3">
                      <div className="text-xs font-bold mb-1" style={{ color: b.winner === "A" ? "#3b82f6" : b.winner === "B" ? "#ef4444" : "#64748b" }}>
                        第 {i + 1} 場：{b.winner === "A" ? "角色A勝" : b.winner === "B" ? "角色B勝" : "平手"}（{b.rounds} 回合）
                      </div>
                      <div className="space-y-0.5 max-h-40 overflow-y-auto">
                        {b.log.map((line: string, j: number) => (
                          <div key={j} className="text-[10px] text-gray-400 font-mono">{line}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Catalog Stats Tab ────────────────────────────────────────────────────────────────────────────────────────────────────
function CatalogStatsTab() {
  const { data, isLoading } = trpc.gameCatalog.getCatalogStats.useQuery();

  const WUXING_EMOJI: Record<string, string> = { "木": "🌿", "火": "🔥", "土": "🏔️", "金": "⚔️", "水": "💧" };
  const WUXING_COLORS_BAR: Record<string, string> = {
    "木": "#22c55e", "火": "#ef4444", "土": "#eab308", "金": "#94a3b8", "水": "#3b82f6",
  };
  const RARITY_COLORS: Record<string, string> = {
    common: "#94a3b8", rare: "#3b82f6", elite: "#a855f7", boss: "#ef4444", legendary: "#f59e0b", epic: "#a855f7",
  };
  const RARITY_LABELS: Record<string, string> = {
    common: "普通", rare: "稀有", elite: "精英", boss: "首領", legendary: "傳說", epic: "史詩",
  };

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">載入統計資料中…</div>;
  }
  if (!data) {
    return <div className="text-center py-12 text-muted-foreground">無法載入統計資料</div>;
  }

  const catalogs = [
    { key: "monsters", label: "🐉 魔物圖鑑", total: data.monsters.total, byWuxing: data.monsters.byWuxing, byRarity: data.monsters.byRarity },
    { key: "items", label: "🎒 道具圖鑑", total: data.items.total, byWuxing: data.items.byWuxing, byRarity: data.items.byRarity },
    { key: "equipment", label: "⚔️ 裝備圖鑑", total: data.equipment.total, byWuxing: data.equipment.byWuxing, byRarity: data.equipment.byRarity },
    { key: "skills", label: "✨ 技能圖鑑", total: data.skills.total, byWuxing: data.skills.byWuxing, byRarity: undefined },
    { key: "monsterSkills", label: "🐲 魔物技能", total: data.monsterSkills.total, byWuxing: data.monsterSkills.byWuxing, byRarity: undefined },
    { key: "achievements", label: "🏆 成就系統", total: data.achievements.total, byWuxing: undefined, byRarity: undefined },
  ];

  const grandTotal = catalogs.reduce((sum, c) => sum + c.total, 0);

  return (
    <div className="space-y-6">
      {/* 總覽卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {catalogs.map((c) => (
          <div key={c.key} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
            <div className="text-2xl font-black text-amber-400">{c.total}</div>
            <div className="text-xs text-muted-foreground mt-1">{c.label}</div>
          </div>
        ))}
      </div>
      <div className="text-center text-sm text-muted-foreground">
        圖鑑總資料量：<span className="text-amber-400 font-bold">{grandTotal}</span> 筆
      </div>

      {/* 各圖鑑詳細統計 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {catalogs.filter(c => c.byWuxing).map((catalog) => (
          <div key={catalog.key} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <h3 className="text-sm font-bold mb-3">{catalog.label} — 五行分布</h3>
            <div className="space-y-2">
              {(catalog.byWuxing ?? []).map((item: { wuxing: string; count: number }) => {
                const maxCount = Math.max(...(catalog.byWuxing ?? []).map((w: { count: number }) => w.count), 1);
                const pct = (item.count / maxCount) * 100;
                return (
                  <div key={item.wuxing} className="flex items-center gap-2">
                    <span className="w-8 text-center text-sm">{WUXING_EMOJI[item.wuxing] ?? "?"}</span>
                    <span className="w-8 text-xs text-muted-foreground">{item.wuxing}</span>
                    <div className="flex-1 h-5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: WUXING_COLORS_BAR[item.wuxing] ?? "#888" }}
                      />
                    </div>
                    <span className="w-8 text-right text-xs font-bold" style={{ color: WUXING_COLORS_BAR[item.wuxing] ?? "#888" }}>
                      {item.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 稀有度分布 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {catalogs.filter(c => c.byRarity && (c.byRarity as { rarity: string; count: number }[]).length > 0).map((catalog) => (
          <div key={catalog.key + "-rarity"} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <h3 className="text-sm font-bold mb-3">{catalog.label} — 稀有度分布</h3>
            <div className="space-y-2">
              {(catalog.byRarity as { rarity: string; count: number }[] ?? []).map((item) => {
                const maxCount = Math.max(...(catalog.byRarity as { rarity: string; count: number }[]).map(r => r.count), 1);
                const pct = (item.count / maxCount) * 100;
                return (
                  <div key={item.rarity} className="flex items-center gap-2">
                    <span className="w-12 text-xs" style={{ color: RARITY_COLORS[item.rarity] ?? "#888" }}>
                      {RARITY_LABELS[item.rarity] ?? item.rarity}
                    </span>
                    <div className="flex-1 h-5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: RARITY_COLORS[item.rarity] ?? "#888" }}
                      />
                    </div>
                    <span className="w-8 text-right text-xs font-bold" style={{ color: RARITY_COLORS[item.rarity] ?? "#888" }}>
                      {item.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


// ─── 寵物圖鑑管理 Tab ──────────────────────────────────────────────────────────
function PetCatalogTab() {
  const utils = trpc.useUtils();
  const { data: catalogData, isLoading } = trpc.gamePet.getPetCatalog.useQuery({});
  const catalog = catalogData?.items ?? [];
  const { data: innateSkillsAll = [] } = trpc.gamePet.getInnateSkills.useQuery({ petCatalogId: 0 });
  const createMut = trpc.gamePet.createPetCatalog.useMutation({
    onSuccess: () => { utils.gamePet.getPetCatalog.invalidate(); toast.success("寵物已新增"); setOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.gamePet.updatePetCatalog.useMutation({
    onSuccess: () => { utils.gamePet.getPetCatalog.invalidate(); toast.success("已更新"); setOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.gamePet.deletePetCatalog.useMutation({
    onSuccess: () => { utils.gamePet.getPetCatalog.invalidate(); toast.success("已刪除"); },
    onError: (e) => toast.error(e.message),
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    name: "", description: "", race: "normal" as const, wuxing: "wood" as const, rarity: "common" as const,
    growthType: "balanced" as const, baseBpConstitution: 20, baseBpStrength: 20, baseBpDefense: 20,
    baseBpAgility: 20, baseBpMagic: 20, minLevel: 1, maxLevel: 50, baseCaptureRate: 30,
    imageUrl: "", isActive: 1, sortOrder: 0,
    // GD-028 新增
    species: "beast", realm: "初界", realmMultiplier: 1.0,
    wuxingWood: 20, wuxingFire: 20, wuxingEarth: 20, wuxingMetal: 20, wuxingWater: 20,
    baseMp: 20, baseMagicDefense: 5, baseHealPower: 0, baseCritRate: 5, baseCritDamage: 150,
    linkedMonsterId: "",
  });
  const [filter, setFilter] = useState<{ wuxing?: string; rarity?: string }>({});

  const openCreate = () => { setEditing(null); setForm({ name: "", description: "", race: "normal" as const, wuxing: "wood" as const, rarity: "common" as const, growthType: "balanced" as const, baseBpConstitution: 20, baseBpStrength: 20, baseBpDefense: 20, baseBpAgility: 20, baseBpMagic: 20, minLevel: 1, maxLevel: 50, baseCaptureRate: 30, imageUrl: "", isActive: 1, sortOrder: 0, species: "beast", realm: "初界", realmMultiplier: 1.0, wuxingWood: 20, wuxingFire: 20, wuxingEarth: 20, wuxingMetal: 20, wuxingWater: 20, baseMp: 20, baseMagicDefense: 5, baseHealPower: 0, baseCritRate: 5, baseCritDamage: 150, linkedMonsterId: "" }); setOpen(true); };
  const openEdit = (p: any) => { setEditing(p); setForm({ name: p.name, description: p.description ?? "", race: p.race as any, wuxing: p.wuxing as any, rarity: p.rarity as any, growthType: p.growthType as any, baseBpConstitution: p.baseBpConstitution, baseBpStrength: p.baseBpStrength, baseBpDefense: p.baseBpDefense, baseBpAgility: p.baseBpAgility, baseBpMagic: p.baseBpMagic, minLevel: p.minLevel, maxLevel: p.maxLevel, baseCaptureRate: p.baseCaptureRate, imageUrl: p.imageUrl ?? "", isActive: p.isActive, sortOrder: p.sortOrder ?? 0, species: p.species ?? "beast", realm: p.realm ?? "初界", realmMultiplier: p.realmMultiplier ?? 1.0, wuxingWood: p.wuxingWood ?? 20, wuxingFire: p.wuxingFire ?? 20, wuxingEarth: p.wuxingEarth ?? 20, wuxingMetal: p.wuxingMetal ?? 20, wuxingWater: p.wuxingWater ?? 20, baseMp: p.baseMp ?? 20, baseMagicDefense: p.baseMagicDefense ?? 5, baseHealPower: p.baseHealPower ?? 0, baseCritRate: p.baseCritRate ?? 5, baseCritDamage: p.baseCritDamage ?? 150, linkedMonsterId: p.linkedMonsterId ?? "" }); setOpen(true); };

  const filteredCatalog = catalog.filter((p: any) => {
    if (filter.wuxing && p.wuxing !== filter.wuxing) return false;
    if (filter.rarity && p.rarity !== filter.rarity) return false;
    return true;
  });

  const WUXING_MAP: Record<string, string> = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };
  const RARITY_MAP: Record<string, string> = { common: "普通", rare: "稀有", epic: "史詩", legendary: "傳說" };
  const RACE_MAP: Record<string, string> = { dragon: "龍族", undead: "不死族", normal: "一般", insect: "蟲族", plant: "植物族", flying: "飛行族" };
  const GROWTH_MAP: Record<string, string> = { fighter: "力量型", guardian: "防禦型", swift: "敏捷型", mage: "魔法型", balanced: "均衡型" };
  const RARITY_COLORS: Record<string, string> = { common: "#9ca3af", rare: "#3b82f6", epic: "#a855f7", legendary: "#f59e0b" };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">🐾 寵物圖鑑管理 ({filteredCatalog.length})</h3>
        <div className="flex gap-2">
          <Select value={filter.wuxing ?? "all"} onValueChange={v => setFilter(f => ({ ...f, wuxing: v === "all" ? undefined : v }))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部五行</SelectItem>
              {Object.entries(WUXING_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filter.rarity ?? "all"} onValueChange={v => setFilter(f => ({ ...f, rarity: v === "all" ? undefined : v }))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部稀有</SelectItem>
              {Object.entries(RARITY_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={openCreate}>+ 新增寵物</Button>
        </div>
      </div>

      {isLoading ? <p className="text-muted-foreground">載入中...</p> : (
        <div className="border rounded-lg overflow-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">名稱</th>
              <th className="px-3 py-2 text-left">五行</th>
              <th className="px-3 py-2 text-left">稀有度</th>
              <th className="px-3 py-2 text-left">種族</th>
              <th className="px-3 py-2 text-left">成長型</th>
              <th className="px-3 py-2 text-center">BP 總和</th>
              <th className="px-3 py-2 text-center">捕捉率</th>
              <th className="px-3 py-2 text-center">天生技能</th>
              <th className="px-3 py-2 text-center">操作</th>
            </tr></thead>
            <tbody>
              {filteredCatalog.map((p: any) => {
                const totalBp = p.baseBpConstitution + p.baseBpStrength + p.baseBpDefense + p.baseBpAgility + p.baseBpMagic;
                const skillCount = (innateSkillsAll as any[]).filter((s: any) => s.petCatalogId === p.id).length;
                return (
                  <tr key={p.id} className="border-b hover:bg-muted/30">
                    <td className="px-3 py-2">{p.id}</td>
                    <td className="px-3 py-2 font-medium">
                      {p.imageUrl && <img src={p.imageUrl} alt="" className="w-6 h-6 inline mr-1 rounded" />}
                      {p.name}
                    </td>
                    <td className="px-3 py-2"><WuxingBadge wuxing={WUXING_MAP[p.wuxing] ?? p.wuxing} /></td>
                    <td className="px-3 py-2"><Badge style={{ backgroundColor: RARITY_COLORS[p.rarity], color: "#fff" }}>{RARITY_MAP[p.rarity]}</Badge></td>
                    <td className="px-3 py-2">{RACE_MAP[p.race] ?? p.race}</td>
                    <td className="px-3 py-2">{GROWTH_MAP[p.growthType] ?? p.growthType}</td>
                    <td className="px-3 py-2 text-center font-mono">{totalBp}</td>
                    <td className="px-3 py-2 text-center">{p.baseCaptureRate}%</td>
                    <td className="px-3 py-2 text-center">{skillCount}/3</td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex gap-1 justify-center">
                        <Button size="sm" variant="outline" onClick={() => openEdit(p)}>編輯</Button>
                        <Button size="sm" variant="destructive" onClick={() => { if (confirm(`確定刪除「${p.name}」？`)) deleteMut.mutate({ id: p.id }); }}>刪除</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 新增/編輯 Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "編輯寵物" : "新增寵物"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-xs text-muted-foreground">名稱</label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><label className="text-xs text-muted-foreground">描述</label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">五行</label>
                <Select value={form.wuxing} onValueChange={v => setForm(f => ({ ...f, wuxing: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(WUXING_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><label className="text-xs text-muted-foreground">稀有度</label>
                <Select value={form.rarity} onValueChange={v => setForm(f => ({ ...f, rarity: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(RARITY_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><label className="text-xs text-muted-foreground">種族</label>
                <Select value={form.race} onValueChange={v => setForm(f => ({ ...f, race: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(RACE_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><label className="text-xs text-muted-foreground">成長型態</label>
                <Select value={form.growthType} onValueChange={v => setForm(f => ({ ...f, growthType: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(GROWTH_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select></div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {(["baseBpConstitution", "baseBpStrength", "baseBpDefense", "baseBpAgility", "baseBpMagic"] as const).map(k => (
                <div key={k}><label className="text-xs text-muted-foreground">{k.replace("baseBp", "")}</label>
                  <Input type="number" value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: Number(e.target.value) }))} /></div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-xs text-muted-foreground">最低等級</label><Input type="number" value={form.minLevel} onChange={e => setForm(f => ({ ...f, minLevel: Number(e.target.value) }))} /></div>
              <div><label className="text-xs text-muted-foreground">最高等級</label><Input type="number" value={form.maxLevel} onChange={e => setForm(f => ({ ...f, maxLevel: Number(e.target.value) }))} /></div>
              <div><label className="text-xs text-muted-foreground">捕捉率(%)</label><Input type="number" value={form.baseCaptureRate} onChange={e => setForm(f => ({ ...f, baseCaptureRate: Number(e.target.value) }))} /></div>
            </div>
            {/* GD-028 新增欄位 */}
            <div className="border-t pt-3 mt-2">
              <p className="text-xs font-semibold text-muted-foreground mb-2">種族 / 境界</p>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-xs text-muted-foreground">種族</label>
                  <Select value={form.species} onValueChange={v => setForm(f => ({ ...f, species: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="humanoid">人形</SelectItem>
                      <SelectItem value="beast">獸類</SelectItem>
                      <SelectItem value="plant">植物</SelectItem>
                      <SelectItem value="undead">不死</SelectItem>
                      <SelectItem value="dragon">龍族</SelectItem>
                      <SelectItem value="flying">飛行</SelectItem>
                      <SelectItem value="insect">蟲類</SelectItem>
                      <SelectItem value="special">特殊</SelectItem>
                      <SelectItem value="metal">金屬</SelectItem>
                      <SelectItem value="demon">邪魔</SelectItem>
                    </SelectContent>
                  </Select></div>
                <div><label className="text-xs text-muted-foreground">境界</label>
                  <Select value={form.realm} onValueChange={v => setForm(f => ({ ...f, realm: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="初界">初界</SelectItem>
                      <SelectItem value="中界">中界</SelectItem>
                      <SelectItem value="高界">高界</SelectItem>
                    </SelectContent>
                  </Select></div>
                <div><label className="text-xs text-muted-foreground">境界倍率</label><Input type="number" step={0.1} min={0.5} max={5} value={form.realmMultiplier} onChange={e => setForm(f => ({ ...f, realmMultiplier: Number(e.target.value) }))} /></div>
              </div>
            </div>
            <div className="border-t pt-3 mt-2">
              <p className="text-xs font-semibold text-muted-foreground mb-2">五行分配（合計應為100%）</p>
              <div className="grid grid-cols-5 gap-2">
                {(["wuxingWood","wuxingFire","wuxingEarth","wuxingMetal","wuxingWater"] as const).map(k => {
                  const label = { wuxingWood: "🌿木", wuxingFire: "🔥火", wuxingEarth: "🪨土", wuxingMetal: "⚔️金", wuxingWater: "💧水" }[k];
                  return <div key={k}><label className="text-xs text-muted-foreground">{label}%</label><Input type="number" min={0} max={100} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: Number(e.target.value) }))} /></div>;
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">合計: {form.wuxingWood + form.wuxingFire + form.wuxingEarth + form.wuxingMetal + form.wuxingWater}%</p>
            </div>
            <div className="border-t pt-3 mt-2">
              <p className="text-xs font-semibold text-muted-foreground mb-2">進階屬性</p>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-xs text-muted-foreground">MP</label><Input type="number" value={form.baseMp} onChange={e => setForm(f => ({ ...f, baseMp: Number(e.target.value) }))} /></div>
                <div><label className="text-xs text-muted-foreground">魔防</label><Input type="number" value={form.baseMagicDefense} onChange={e => setForm(f => ({ ...f, baseMagicDefense: Number(e.target.value) }))} /></div>
                <div><label className="text-xs text-muted-foreground">回復力</label><Input type="number" value={form.baseHealPower} onChange={e => setForm(f => ({ ...f, baseHealPower: Number(e.target.value) }))} /></div>
                <div><label className="text-xs text-muted-foreground">暴擊率%</label><Input type="number" step={0.1} value={form.baseCritRate} onChange={e => setForm(f => ({ ...f, baseCritRate: Number(e.target.value) }))} /></div>
                <div><label className="text-xs text-muted-foreground">暴擊傷害%</label><Input type="number" value={form.baseCritDamage} onChange={e => setForm(f => ({ ...f, baseCritDamage: Number(e.target.value) }))} /></div>
                <div><label className="text-xs text-muted-foreground">關聯魔物ID</label><Input value={form.linkedMonsterId} onChange={e => setForm(f => ({ ...f, linkedMonsterId: e.target.value }))} placeholder="如 M_W001" /></div>
              </div>
            </div>
            <div><label className="text-xs text-muted-foreground">圖片 URL</label><Input value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button onClick={() => { if (editing) { updateMut.mutate({ id: editing.id, data: form }); } else { createMut.mutate(form); } }} disabled={createMut.isPending || updateMut.isPending}>
              {editing ? "更新" : "新增"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── 寵物 AI 工具 Tab ──────────────────────────────────────────────────────────
function PetAIToolsTab() {
  const utils = trpc.useUtils();
  const [selectedPetId, setSelectedPetId] = useState("");

  const { data: petCatalogData } = trpc.gamePet.getPetCatalog.useQuery({});
  const petCatalog = petCatalogData?.items ?? [];

  // AI 批量生成寵物
  const aiBatchGenPets = trpc.gameAI.aiBatchGeneratePets.useMutation({
    onSuccess: (data) => { toast.success(data.message); utils.gamePet.getPetCatalog.invalidate(); },
    onError: (e) => toast.error(e.message || "AI 寵物生成失敗"),
  });

  // AI 為指定寵物生成天生技能
  const aiGenInnateSkills = trpc.gameAI.aiGeneratePetInnateSkills.useMutation({
    onSuccess: (data) => { toast.success(data.message); utils.gamePet.getInnateSkills.invalidate(); utils.gamePet.getPetCatalog.invalidate(); },
    onError: (e) => toast.error(e.message || "AI 技能生成失敗"),
  });

  // AI 批量補齊天生技能
  const aiBatchFillSkills = trpc.gameAI.aiBatchFillPetSkills.useMutation({
    onSuccess: (data) => { toast.success(data.message); utils.gamePet.getInnateSkills.invalidate(); utils.gamePet.getPetCatalog.invalidate(); },
    onError: (e) => toast.error(e.message || "AI 批量補齊失敗"),
  });

  // AI 審核全部寵物
  const aiAuditPets = trpc.gameAI.aiAuditAllPets.useMutation({
    onSuccess: (data) => { toast.success(data.message); utils.gamePet.getPetCatalog.invalidate(); },
    onError: (e) => toast.error(e.message || "AI 審核失敗"),
  });

  // AI 單隻圖片生成（使用 regenerate 支援覆蓋已有圖片）
  const aiGenPetImage = trpc.gameAI.aiRegeneratePetImage.useMutation({
    onSuccess: (data) => { toast.success(`${data.petName} 圖片生成成功`); utils.gamePet.getPetCatalog.invalidate(); },
    onError: (e) => toast.error(e.message || "AI 圖片生成失敗"),
  });

  // AI 批量圖片生成
  const aiBatchGenImages = trpc.gameAI.aiBatchGeneratePetImages.useMutation({
    onSuccess: (data) => { toast.success((data as any).message); utils.gamePet.getPetCatalog.invalidate(); },
    onError: (e) => toast.error(e.message || "AI 批量圖片生成失敗"),
  });

  const WUXING_MAP: Record<string, string> = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };
  const isGenerating = aiBatchGenPets.isPending;

  return (
    <div className="space-y-8">
      {/* 區塊 1：AI 批量生成寵物 */}
      <div>
        <h3 className="text-lg font-bold mb-1 flex items-center gap-2">🧬 AI 批量生成寵物</h3>
        <p className="text-sm text-muted-foreground mb-4">
          AI 自動生成 10 隻新寵物，確保名稱不重複、五行分布均衡、BP 數值符合稀有度規範。
        </p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => aiBatchGenPets.mutate({ count: 10 })} disabled={isGenerating} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700">
            {isGenerating ? "⏳ AI 生成中..." : "🧬 一鍵生成 10 隻寵物"}
          </Button>
          <Button variant="outline" onClick={() => aiBatchGenPets.mutate({ count: 5 })} disabled={isGenerating}>
            {isGenerating ? "⏳..." : "生成 5 隻"}
          </Button>
        </div>
        {aiBatchGenPets.data && (
          <div className="mt-3 p-3 rounded-lg border bg-purple-50 dark:bg-purple-950/30 text-sm">
            <p className="font-medium text-purple-700 dark:text-purple-400">✅ {aiBatchGenPets.data.message}</p>
            {aiBatchGenPets.data.insertedNames.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {aiBatchGenPets.data.insertedNames.map((name: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs">{name}</Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <hr className="border-border" />

      {/* 區塊 2：AI 天生技能生成 */}
      <div>
        <h3 className="text-lg font-bold mb-1 flex items-center gap-2">🎯 AI 天生技能生成</h3>
        <p className="text-sm text-muted-foreground mb-4">
          為指定寵物生成天生技能（最多 3 個），或一鍵補齊所有缺少技能的寵物。
        </p>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground mb-1 block">選擇寵物</label>
            <Select value={selectedPetId} onValueChange={setSelectedPetId}>
              <SelectTrigger><SelectValue placeholder="選擇一隻寵物..." /></SelectTrigger>
              <SelectContent className="max-h-60">
                {(petCatalog as any[]).map((p: any) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name} ({WUXING_MAP[p.wuxing] ?? p.wuxing}/{p.rarity})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => { if (selectedPetId) aiGenInnateSkills.mutate({ petCatalogId: Number(selectedPetId) }); }} disabled={!selectedPetId || aiGenInnateSkills.isPending} className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700">
            {aiGenInnateSkills.isPending ? "⏳ AI 生成中..." : "🧠 為這隻寵物生成技能"}
          </Button>
          <Button variant="outline" onClick={() => aiBatchFillSkills.mutate()} disabled={aiBatchFillSkills.isPending}>
            {aiBatchFillSkills.isPending ? "⏳ 批量處理中..." : "🔄 一鍵補齊所有寵物技能"}
          </Button>
        </div>
        {aiGenInnateSkills.data && (
          <div className="mt-3 p-3 rounded-lg border bg-emerald-50 dark:bg-emerald-950/30 text-sm">
            <p className="font-medium text-emerald-700 dark:text-emerald-400">✅ {aiGenInnateSkills.data.message}</p>
            {aiGenInnateSkills.data.insertedNames.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {aiGenInnateSkills.data.insertedNames.map((name: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs">{name}</Badge>
                ))}
              </div>
            )}
          </div>
        )}
        {aiBatchFillSkills.data && (
          <div className="mt-3 p-3 rounded-lg border bg-teal-50 dark:bg-teal-950/30 text-sm">
            <p className="font-medium text-teal-700 dark:text-teal-400">✅ {aiBatchFillSkills.data.message}</p>
            {(aiBatchFillSkills.data as any).results?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {(aiBatchFillSkills.data as any).results.map((r: any, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs">{r.petName} (+{r.skillCount}技能)</Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <hr className="border-border" />

      {/* 區塊 3：AI 審核全部寵物 */}
      <div>
        <h3 className="text-lg font-bold mb-1 flex items-center gap-2">⚖️ AI 寵物平衡審核</h3>
        <p className="text-sm text-muted-foreground mb-4">
          掃描所有寵物圖鑑，檢查 BP 數值、捕捉率、等級範圍是否符合稀有度規範，自動修正可修正的問題。
        </p>
        <Button onClick={() => aiAuditPets.mutate()} disabled={aiAuditPets.isPending} className="bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-700 hover:to-orange-700">
          {aiAuditPets.isPending ? "⏳ 審核中..." : "🔍 一鍵審核全部寵物"}
        </Button>
        {aiAuditPets.data && (
          <div className="mt-3 p-3 rounded-lg border bg-amber-50 dark:bg-amber-950/20 text-sm">
            <p className="font-medium text-amber-700 dark:text-amber-400">✅ {aiAuditPets.data.message}</p>
            {(aiAuditPets.data as any).results?.length > 0 && (
              <div className="mt-2 max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-amber-200 dark:border-amber-800">
                    <th className="text-left py-1 px-1">ID</th>
                    <th className="text-left py-1 px-1">名稱</th>
                    <th className="text-left py-1 px-1">問題</th>
                    <th className="text-center py-1 px-1">已修正</th>
                  </tr></thead>
                  <tbody>
                    {(aiAuditPets.data as any).results.map((r: any) => (
                      <tr key={r.id} className="border-b border-amber-100 dark:border-amber-900/30">
                        <td className="py-1 px-1">{r.id}</td>
                        <td className="py-1 px-1 font-medium">{r.name}</td>
                        <td className="py-1 px-1 text-red-500">{r.warnings.join("; ")}</td>
                        <td className="py-1 px-1 text-center">{r.autoFixed ? "✅" : "❌"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <hr className="border-border" />

      {/* 區塊 4：AI 圖片生成 */}
      <div>
        <h3 className="text-lg font-bold mb-1 flex items-center gap-2">🎨 AI 寵物圖片生成</h3>
        <p className="text-sm text-muted-foreground mb-4">
          為寵物圖鑑生成中國古風水墨畫風格的寵物立繪，可單隻生成或批量補齊。
        </p>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground mb-1 block">選擇寵物（單隻生成）</label>
            <Select value={selectedPetId} onValueChange={setSelectedPetId}>
              <SelectTrigger><SelectValue placeholder="選擇一隻寵物..." /></SelectTrigger>
              <SelectContent className="max-h-60">
                {(petCatalog as any[]).map((p: any) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.imageUrl ? "✅" : "❌"} {p.name} ({WUXING_MAP[p.wuxing] ?? p.wuxing}/{p.rarity})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => { if (selectedPetId) aiGenPetImage.mutate({ petCatalogId: Number(selectedPetId) }); }}
            disabled={!selectedPetId || aiGenPetImage.isPending}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700"
          >
            {aiGenPetImage.isPending ? "⏳ 生成中..." : "🎨 生成/重新生成圖片"}
          </Button>
          <Button
            variant="outline"
            onClick={() => aiBatchGenImages.mutate()}
            disabled={aiBatchGenImages.isPending}
          >
            {aiBatchGenImages.isPending ? "⏳ 批量生成中..." : "🖼️ 一鍵補齊所有無圖寵物"}
          </Button>
        </div>
        {aiGenPetImage.data && (
          <div className="mt-3 p-3 rounded-lg border bg-cyan-50 dark:bg-cyan-950/30 text-sm">
            <p className="font-medium text-cyan-700 dark:text-cyan-400">✅ {aiGenPetImage.data.petName} 圖片生成成功</p>
            {aiGenPetImage.data.imageUrl && (
              <img src={aiGenPetImage.data.imageUrl} alt="" className="mt-2 w-32 h-32 object-contain rounded-lg border" />
            )}
          </div>
        )}
        {aiBatchGenImages.data && (
          <div className="mt-3 p-3 rounded-lg border bg-blue-50 dark:bg-blue-950/30 text-sm">
            <p className="font-medium text-blue-700 dark:text-blue-400">✅ {(aiBatchGenImages.data as any).message}</p>
            {(aiBatchGenImages.data as any).results?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {(aiBatchGenImages.data as any).results.filter((r: any) => r.success).map((r: any) => (
                  <div key={r.id} className="text-center">
                    {r.imageUrl && <img src={r.imageUrl} alt="" className="w-16 h-16 object-contain rounded border" />}
                    <p className="text-[10px] text-muted-foreground mt-0.5">{r.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <hr className="border-border" />

      {/* 使用說明 */}
      <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
        <h4 className="font-semibold mb-2">💡 寵物 AI 工具使用說明</h4>
        <ul className="space-y-1 list-disc list-inside">
          <li><strong>AI 生成寵物</strong>：每次生成 5-10 隻，AI 自動分配五行、稀有度、BP 數值</li>
          <li><strong>AI 天生技能</strong>：根據寵物五行和種族特色生成 3 個天生技能（Lv.1/20/50 解鎖）</li>
          <li><strong>AI 圖片生成</strong>：根據寵物名稱、種族、屬性、稀有度生成古風水墨畫立繪</li>
          <li><strong>AI 審核</strong>：掃描所有寵物的 BP、捕捉率、等級範圍，自動修正不合規的數值</li>
          <li>寵物 BP 總和規範：common 60-80, rare 80-100, epic 100-120, legendary 120-150</li>
          <li>捕捉率規範：common 25-45%, rare 15-30%, epic 8-20%, legendary 3-10%</li>
        </ul>
      </div>
    </div>
  );
}

// ─── AI 工具 Tab ──────────────────────────────────────────────────────────────────
function AIToolsTab() {
  const utils = trpc.useUtils();
  const [selectedMonsterId, setSelectedMonsterId] = useState("");
  const [balanceResults, setBalanceResults] = useState<Record<string, any>>({});
  const [activeBalanceTab, setActiveBalanceTab] = useState("all");

  // AI 商店上架
  const aiRefreshShop = trpc.gameAI.aiRefreshShop.useMutation({
    onSuccess: (data) => { toast.success(data.message); utils.gameAdmin.getVirtualShop.invalidate(); utils.gameAdmin.getHiddenShopPool.invalidate(); },
    onError: (e) => toast.error(e.message || "AI 商店上架失敗"),
  });

  // AI 批量生成
  const aiBatchGenerate = trpc.gameAI.aiBatchGenerate.useMutation({
    onSuccess: (data) => { toast.success(data.message); utils.gameCatalog.invalidate(); },
    onError: (e) => toast.error(e.message || "AI 生成失敗"),
  });

  // AI 怪物技能生成
  const aiGenMonsterSkills = trpc.gameAI.aiGenerateMonsterSkills.useMutation({
    onSuccess: (data) => { toast.success(data.message); utils.gameCatalog.invalidate(); },
    onError: (e) => toast.error(e.message || "AI 怪物技能生成失敗"),
  });

  // AI 批量補齊怪物技能
  const aiBatchFillSkills = trpc.gameAI.aiBatchFillMonsterSkills.useMutation({
    onSuccess: (data) => { toast.success(data.message); utils.gameCatalog.invalidate(); },
    onError: (e) => toast.error(e.message || "AI 批量補齊失敗"),
  });

  // AI 天命考核技能生成
  const aiGenQuestSkill = trpc.gameAI.aiGenerateQuestSkill.useMutation({
    onSuccess: (data) => { toast.success(data.message); utils.questSkillNpc.invalidate(); },
    onError: (e) => toast.error(e.message || "AI 技能學習技能生成失敗"),
  });

  // AI 技能學習技能平衡
  const balanceQuestSkills = trpc.gameAIBalance.balanceQuestSkills.useMutation({
    onSuccess: (data) => { setBalanceResults(prev => ({ ...prev, questSkills: data })); data.dryRun ? toast.success(`預覽：發現 ${data.totalChanges} 項需修正`) : toast.success(data.message); utils.questSkillNpc.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  // === AI 平衡 Mutations ===
  const balanceMonsters = trpc.gameAIBalance.balanceMonsters.useMutation({
    onSuccess: (data) => { setBalanceResults(prev => ({ ...prev, monsters: data })); data.dryRun ? toast.success(`預覽：發現 ${data.totalChanges} 項需修正`) : toast.success(data.message); utils.gameCatalog.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const balanceMonsterSkills = trpc.gameAIBalance.balanceMonsterSkills.useMutation({
    onSuccess: (data) => { setBalanceResults(prev => ({ ...prev, monsterSkills: data })); data.dryRun ? toast.success(`預覽：發現 ${data.totalChanges} 項需修正`) : toast.success(data.message); utils.gameCatalog.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const balanceItems = trpc.gameAIBalance.balanceItems.useMutation({
    onSuccess: (data) => { setBalanceResults(prev => ({ ...prev, items: data })); data.dryRun ? toast.success(`預覽：發現 ${data.totalChanges} 項需修正`) : toast.success(data.message); utils.gameCatalog.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const balanceEquipment = trpc.gameAIBalance.balanceEquipment.useMutation({
    onSuccess: (data) => { setBalanceResults(prev => ({ ...prev, equipment: data })); data.dryRun ? toast.success(`預覽：發現 ${data.totalChanges} 項需修正`) : toast.success(data.message); utils.gameCatalog.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const balanceSkills = trpc.gameAIBalance.balanceSkills.useMutation({
    onSuccess: (data) => { setBalanceResults(prev => ({ ...prev, skills: data })); data.dryRun ? toast.success(`預覽：發現 ${data.totalChanges} 項需修正`) : toast.success(data.message); utils.gameCatalog.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const balanceAchievements = trpc.gameAIBalance.balanceAchievements.useMutation({
    onSuccess: (data) => { setBalanceResults(prev => ({ ...prev, achievements: data })); data.dryRun ? toast.success(`預覽：發現 ${data.totalChanges} 項需修正`) : toast.success(data.message); utils.gameCatalog.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const balanceAll = trpc.gameAIBalance.balanceAll.useMutation({
    onSuccess: (data) => { setBalanceResults(prev => ({ ...prev, all: data })); toast.success(data.message); },
    onError: (e) => toast.error(e.message),
  });

  const { data: monsterList = [] } = trpc.gameAdmin.getMonsterCatalog.useQuery({});

  const catalogTypes = [
    { key: "monster" as const, label: "魔物", icon: "🐉", color: "#DC143C", desc: "生成 10 隻新魔物" },
    { key: "item" as const, label: "道具", icon: "🎒", color: "#2E8B57", desc: "生成 10 種新道具" },
    { key: "equipment" as const, label: "裝備", icon: "⚔️", color: "#C9A227", desc: "生成 10 件新裝備" },
    { key: "skill" as const, label: "技能", icon: "✨", color: "#8B5CF6", desc: "生成 10 個新技能" },
    { key: "achievement" as const, label: "成就", icon: "🏆", color: "#F59E0B", desc: "生成 10 個新成就" },
  ];

  const balanceCatalogs = [
    { key: "monsters", label: "怪物", icon: "🐉", color: "#DC143C", desc: "HP/ATK/DEF/SPD + AI等級", mutate: balanceMonsters },
    { key: "monsterSkills", label: "怪物技能", icon: "💥", color: "#FF6347", desc: "威力%/MP/冷卻", mutate: balanceMonsterSkills },
    { key: "items", label: "道具", icon: "🎒", color: "#2E8B57", desc: "售價校準", mutate: balanceItems },
    { key: "equipment", label: "裝備", icon: "⚔️", color: "#C9A227", desc: "ATK/DEF/HP/SPD加成", mutate: balanceEquipment },
    { key: "skills", label: "人物技能", icon: "✨", color: "#8B5CF6", desc: "威力%/MP/冷卻/售價", mutate: balanceSkills },
    { key: "achievements", label: "成就", icon: "🏆", color: "#F59E0B", desc: "獎勵數量校準", mutate: balanceAchievements },
    { key: "questSkills", label: "技能學習技能", icon: "🌟", color: "#EC4899", desc: "威力/MP/冷却/金幣/魂晶", mutate: balanceQuestSkills },
  ];

  const isGenerating = aiBatchGenerate.isPending;
  const isRefreshing = aiRefreshShop.isPending;
  const isAnyBalancing = balanceMonsters.isPending || balanceMonsterSkills.isPending || balanceItems.isPending || balanceEquipment.isPending || balanceSkills.isPending || balanceAchievements.isPending || balanceQuestSkills.isPending || balanceAll.isPending;

  // 平衡結果顯示元件
  const BalanceResultPanel = ({ data }: { data: any }) => {
    if (!data) return null;
    const changes = data.changes || [];
    return (
      <div className="mt-3 p-3 rounded-lg border bg-amber-50 dark:bg-amber-950/20 text-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="font-medium text-amber-700 dark:text-amber-400">
            {data.dryRun ? "🔍 預覽模式" : "✅ 已執行"}：掃描 {data.totalScanned} 項，{data.totalChanges} 項需修正
          </p>
        </div>
        {changes.length > 0 && (
          <div className="max-h-48 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-amber-200 dark:border-amber-800">
                  <th className="text-left py-1 px-1">名稱</th>
                  <th className="text-left py-1 px-1">欄位</th>
                  <th className="text-right py-1 px-1">原值</th>
                  <th className="text-center py-1 px-1">→</th>
                  <th className="text-right py-1 px-1">新值</th>
                  <th className="text-left py-1 px-1">原因</th>
                </tr>
              </thead>
              <tbody>
                {changes.slice(0, 50).map((c: any, i: number) => (
                  <tr key={i} className="border-b border-amber-100 dark:border-amber-900/30">
                    <td className="py-1 px-1 font-medium">{c.name}</td>
                    <td className="py-1 px-1 text-muted-foreground">{c.field}</td>
                    <td className="py-1 px-1 text-right text-red-500">{c.oldValue}</td>
                    <td className="py-1 px-1 text-center">→</td>
                    <td className="py-1 px-1 text-right text-green-500">{c.newValue}</td>
                    <td className="py-1 px-1 text-muted-foreground">{c.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {changes.length > 50 && <p className="text-xs text-muted-foreground mt-1">…及其他 {changes.length - 50} 項</p>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* === 區塊 1：AI 商店自動上架 === */}
      <div>
        <h3 className="text-lg font-bold mb-1 flex items-center gap-2">🏪 AI 商店自動上架</h3>
        <p className="text-sm text-muted-foreground mb-4">
          AI 從圖鑑中智慧挑選合適的道具、裝備、技能書上架到商店。已鎖定商品不會被覆蓋。
        </p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => aiRefreshShop.mutate({ shopType: "both" })} disabled={isRefreshing} className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700">
            {isRefreshing ? "⏳ AI 分析中..." : "🤖 一鍵上架全部商店"}
          </Button>
          <Button variant="outline" onClick={() => aiRefreshShop.mutate({ shopType: "normal" })} disabled={isRefreshing}>
            {isRefreshing ? "⏳..." : "🏪 只刷新一般商店"}
          </Button>
          <Button variant="outline" onClick={() => aiRefreshShop.mutate({ shopType: "hidden" })} disabled={isRefreshing}>
            {isRefreshing ? "⏳..." : "🔮 只刷新隱藏商店"}
          </Button>
        </div>
        {aiRefreshShop.data && (
          <div className="mt-3 p-3 rounded-lg border bg-emerald-50 dark:bg-emerald-950/30 text-sm">
            <p className="font-medium text-emerald-700 dark:text-emerald-400">✅ {aiRefreshShop.data.message}</p>
          </div>
        )}
      </div>

      <hr className="border-border" />

      {/* === 區塊 2：AI 批量生成圖鑑 === */}
      <div>
        <h3 className="text-lg font-bold mb-1 flex items-center gap-2">🧠 AI 批量生成圖鑑</h3>
        <p className="text-sm text-muted-foreground mb-4">
          AI 自動生成 10 筆新資料，確保不重複名稱、不破壞數值平衡、五行分布均衡。
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {catalogTypes.map((ct) => (
            <div key={ct.key} className="border rounded-xl p-4 hover:shadow-md transition-shadow" style={{ borderColor: ct.color + "40" }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{ct.icon}</span>
                <span className="font-bold" style={{ color: ct.color }}>{ct.label}圖鑑</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{ct.desc}</p>
              <Button size="sm" onClick={() => aiBatchGenerate.mutate({ catalogType: ct.key })} disabled={isGenerating} className="w-full" style={{ backgroundColor: ct.color, color: "#fff" }}>
                {isGenerating ? "⏳ AI 生成中..." : `🤖 一鍵生成 10 個${ct.label}`}
              </Button>
            </div>
          ))}
        </div>
        {aiBatchGenerate.data && (
          <div className="mt-4 p-3 rounded-lg border bg-blue-50 dark:bg-blue-950/30 text-sm">
            <p className="font-medium text-blue-700 dark:text-blue-400">✅ {aiBatchGenerate.data.message}</p>
            {aiBatchGenerate.data.insertedNames.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {aiBatchGenerate.data.insertedNames.map((name, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{name}</Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <hr className="border-border" />

      {/* === 區塊 3：AI 怪物技能生成 === */}
      <div>
        <h3 className="text-lg font-bold mb-1 flex items-center gap-2">🐉 AI 怪物技能生成</h3>
        <p className="text-sm text-muted-foreground mb-4">
          為指定怪物生成專屬技能，或一鍵補齊所有缺少技能的怪物。技能現在真正影響戰鬥！
        </p>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground mb-1 block">選擇怪物</label>
            <Select value={selectedMonsterId} onValueChange={setSelectedMonsterId}>
              <SelectTrigger><SelectValue placeholder="選擇一隻怪物..." /></SelectTrigger>
              <SelectContent className="max-h-60">
                {monsterList.map((m: any) => (
                  <SelectItem key={m.monsterId} value={m.monsterId}>
                    {m.monsterId} - {m.name} ({m.wuxing}/{m.rarity})
                    {m.skillId1 ? ' ✅' : ' ❌缺技能'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => { if (selectedMonsterId) aiGenMonsterSkills.mutate({ monsterId: selectedMonsterId }); }} disabled={!selectedMonsterId || aiGenMonsterSkills.isPending} className="bg-gradient-to-r from-red-600 to-orange-600 text-white hover:from-red-700 hover:to-orange-700">
            {aiGenMonsterSkills.isPending ? "⏳ AI 生成中..." : "🧠 為這隻怪物生成技能"}
          </Button>
          <Button variant="outline" onClick={() => aiBatchFillSkills.mutate()} disabled={aiBatchFillSkills.isPending}>
            {aiBatchFillSkills.isPending ? "⏳ 批量處理中..." : "🔄 一鍵補齊所有怪物技能"}
          </Button>
        </div>
        {aiGenMonsterSkills.data && (
          <div className="mt-3 p-3 rounded-lg border bg-red-50 dark:bg-red-950/30 text-sm">
            <p className="font-medium text-red-700 dark:text-red-400">✅ {aiGenMonsterSkills.data.message}</p>
            {aiGenMonsterSkills.data.skillIds.length > 0 && <p className="mt-1 text-xs text-muted-foreground">技能 ID: {aiGenMonsterSkills.data.skillIds.join(", ")}</p>}
          </div>
        )}
        {aiBatchFillSkills.data && (
          <div className="mt-3 p-3 rounded-lg border bg-orange-50 dark:bg-orange-950/30 text-sm">
            <p className="font-medium text-orange-700 dark:text-orange-400">✅ {aiBatchFillSkills.data.message}</p>
            {(aiBatchFillSkills.data as any).results?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {(aiBatchFillSkills.data as any).results.map((r: any, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs">{r.monsterName} (+{r.skillCount}技能)</Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <hr className="border-border" />

      {/* === 區塊 3.5：AI 技能學習技能生成 === */}
      <div>
        <h3 className="text-lg font-bold mb-1 flex items-center gap-2">🌟 AI 技能學習技能生成</h3>
        <p className="text-sm text-muted-foreground mb-4">
          AI 根據遊戲世界觀和五行屬性，自動生成技能學習專屬技能。按技能類型分類生成，稀有度由 AI 自動分配。
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(["physical", "magic", "status", "support", "special", "production"] as const).map((cat) => {
            const catConfig: Record<string, { label: string; color: string; icon: string; desc: string }> = {
              physical: { label: "物理", color: "#DC143C", icon: "⚔️", desc: "近戰攻擊、力量技" },
              magic: { label: "法術", color: "#8B5CF6", icon: "✨", desc: "元素攻擊、五行術法" },
              status: { label: "狀態", color: "#F59E0B", icon: "💠", desc: "增益/減益、狀態變化" },
              support: { label: "輔助", color: "#10B981", icon: "💚", desc: "治療、防禦、強化" },
              special: { label: "特殊", color: "#EC4899", icon: "🌟", desc: "絕招、天命專屬" },
              production: { label: "生產", color: "#6366F1", icon: "🔨", desc: "製作、採集、煉化" },
            };
            const cfg = catConfig[cat];
            return (
              <div key={cat} className="border rounded-xl p-4 hover:shadow-md transition-shadow" style={{ borderColor: cfg.color + "40" }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{cfg.icon}</span>
                  <span className="font-bold" style={{ color: cfg.color }}>{cfg.label}技能</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{cfg.desc}</p>
                <Button
                  size="sm"
                  onClick={() => aiGenQuestSkill.mutate({ count: 3, category: cat })}
                  disabled={aiGenQuestSkill.isPending}
                  className="w-full"
                  style={{ backgroundColor: cfg.color, color: "#fff" }}
                >
                  {aiGenQuestSkill.isPending ? "⏳ AI 生成中..." : `🧠 生成 3 個${cfg.label}技能`}
                </Button>
              </div>
            );
          })}
        </div>
        {aiGenQuestSkill.data && (
          <div className="mt-4 p-3 rounded-lg border bg-pink-50 dark:bg-pink-950/30 text-sm">
            <p className="font-medium text-pink-700 dark:text-pink-400">✅ {aiGenQuestSkill.data.message}</p>
            {(aiGenQuestSkill.data as any).generatedNames?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {(aiGenQuestSkill.data as any).generatedNames.map((name: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs">{name}</Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <hr className="border-border" />

      {/* === 區塊 4：AI 全圖鑑平衡系統 === */}
      <div>
        <h3 className="text-lg font-bold mb-1 flex items-center gap-2">⚖️ AI 全圖鑑平衡系統</h3>
        <p className="text-sm text-muted-foreground mb-4">
          AI 掃描所有圖鑑數值，找出異常值並自動修正。先「預覽」查看修正報告，確認後再「執行」寫入資料庫。
        </p>

        {/* 一鍵全圖鑑平衡 */}
        <div className="mb-4 p-4 rounded-xl border-2 border-dashed border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/20">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-bold text-indigo-700 dark:text-indigo-300">🌐 一鍵全圖鑑平衡掃描</p>
              <p className="text-xs text-muted-foreground">同時掃描六個圖鑑，產生統一報告</p>
            </div>
            <Button onClick={() => balanceAll.mutate({ dryRun: true })} disabled={isAnyBalancing} className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700">
              {balanceAll.isPending ? "⏳ 掃描中..." : "🔍 一鍵全圖鑑預覽"}
            </Button>
          </div>
          {balanceResults.all && (
            <div className="mt-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
                {balanceResults.all.summary?.map((s: any) => (
                  <div key={s.catalog} className="rounded-lg px-3 py-2 text-center" style={{ background: s.changes > 0 ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)", border: `1px solid ${s.changes > 0 ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}` }}>
                    <p className="text-xs text-muted-foreground">{s.catalog}</p>
                    <p className={`font-bold text-sm ${s.changes > 0 ? "text-red-500" : "text-green-500"}`}>
                      {s.changes > 0 ? `${s.changes} 項異常` : "✅ 平衡"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">共 {s.scanned} 項</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">總計：掃描 {balanceResults.all.totalScanned} 項，{balanceResults.all.totalChanges} 項需修正</p>
            </div>
          )}
        </div>

        {/* 單圖鑑平衡 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {balanceCatalogs.map((bc) => (
            <div key={bc.key} className="border rounded-xl p-4 hover:shadow-md transition-shadow" style={{ borderColor: bc.color + "40" }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{bc.icon}</span>
                <span className="font-bold" style={{ color: bc.color }}>{bc.label}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">校準：{bc.desc}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => bc.mutate.mutate({ dryRun: true })} disabled={isAnyBalancing} className="flex-1">
                  {bc.mutate.isPending ? "⏳..." : "🔍 預覽"}
                </Button>
                <Button size="sm" onClick={() => { if (confirm(`確定要執行 ${bc.label} 平衡修正？此操作會寫入資料庫。`)) bc.mutate.mutate({ dryRun: false }); }} disabled={isAnyBalancing} className="flex-1" style={{ backgroundColor: bc.color, color: "#fff" }}>
                  {bc.mutate.isPending ? "⏳..." : "✅ 執行"}
                </Button>
              </div>
              <BalanceResultPanel data={balanceResults[bc.key]} />
            </div>
          ))}
        </div>
      </div>

      <hr className="border-border" />

      {/* 使用說明 */}
      <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
        <h4 className="font-semibold mb-2">💡 使用說明</h4>
        <ul className="space-y-1 list-disc list-inside">
          <li><strong>AI 生成</strong>：每次新增 10 筆，AI 自動避免重複名稱和破壞平衡的數值</li>
          <li><strong>AI 平衡</strong>：根據稀有度/品質/等級定義合理數值區間，超出範圍的自動修正</li>
          <li>平衡操作建議先「預覽」查看修正報告，確認無誤後再「執行」</li>
          <li>怪物技能現在真正影響戰鬥：使用 powerPercent 計算傷害、MP 消耗、冷卻、附加效果</li>
          <li>怪物 AI 等級會根據稀有度自動分配（common=1, rare/elite=2, boss/legendary=3）</li>
          <li>商店中「已鎖定」的商品不會被 AI 刷新覆蓋</li>
        </ul>
      </div>
    </div>
  );
}


// ─── AI Shop Layout Tab ──────────────────────────────────────────────────────
function AIShopLayoutTab() {
  const utils = trpc.useUtils();
  const [shopType, setShopType] = useState<"normal" | "spirit" | "secret">("normal");
  const [maxItems, setMaxItems] = useState(20);
  const [result, setResult] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [updatePrices, setUpdatePrices] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  const analyzeMutation = trpc.gameCatalog.aiShopLayoutAnalyze.useMutation({
    onSuccess: (data) => {
      setResult(data);
      // 預設全選推薦的商品
      const ids = new Set<string>((data.recommendations || []).map((r: any) => `${r.type}-${r.id}`));
      setSelectedIds(ids);
      toast.success("AI 分析完成");
    },
    onError: (err) => toast.error(`分析失敗：${err.message}`),
  });

  const applyMutation = trpc.gameCatalog.aiShopLayoutApply.useMutation({
    onSuccess: (data) => {
      toast.success(`佈局套用完成：上架 ${data.enabled} 件${data.pricesUpdated ? `，更新 ${data.pricesUpdated} 筆售價` : ""}`);
      // 刷新圖鑑快取
      utils.gameCatalog.invalidate();
    },
    onError: (err) => toast.error(`套用失敗：${err.message}`),
  });

  const shopTypeLabel = shopType === "normal" ? "一般商店（金幣）" : shopType === "spirit" ? "靈相商店（靈石）" : "密店（隨機出現）";

  const handleApply = () => {
    if (!result?.recommendations) return;
    const toEnable = result.recommendations
      .filter((r: any) => selectedIds.has(`${r.type}-${r.id}`))
      .map((r: any) => ({ type: r.type, id: r.id, suggestedPrice: r.suggestedPrice }));
    applyMutation.mutate({ shopType, toEnable, updatePrices });
  };

  const toggleItem = (key: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">🏪 AI 商店佈局</h2>
      </div>

      {/* 設定區 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg bg-muted/50">
        <div>
          <label className="text-sm font-medium mb-1 block">商店類型</label>
          <Select value={shopType} onValueChange={(v: any) => { setShopType(v); setResult(null); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">一般商店（金幣）</SelectItem>
              <SelectItem value="spirit">靈相商店（靈石）</SelectItem>
              <SelectItem value="secret">密店（隨機出現）</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">推薦商品數量上限</label>
          <Input type="number" min={5} max={50} value={maxItems} onChange={e => setMaxItems(Number(e.target.value))} />
        </div>
        <div className="flex items-end">
          <Button onClick={() => analyzeMutation.mutate({ shopType, maxItems })} disabled={analyzeMutation.isPending} className="w-full">
            {analyzeMutation.isPending ? "🔄 AI 分析中..." : "🤖 開始 AI 分析"}
          </Button>
        </div>
      </div>

      {/* 玩家統計 */}
      {result?.playerStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "總玩家數", value: result.playerStats.totalPlayers },
            { label: "平均等級", value: result.playerStats.avgLevel },
            { label: "最高等級", value: result.playerStats.maxLevel },
            { label: "平均金幣", value: result.playerStats.avgGold?.toLocaleString() },
            { label: "等級分佈", value: Object.keys(result.playerStats.levelDist || {}).length + " 段" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-3 text-center">
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="text-lg font-bold">{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* AI 分析結果 */}
      {result?.analysis && (
        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <h3 className="font-semibold text-blue-400 mb-2">📊 AI 分析報告</h3>
          <p className="text-sm whitespace-pre-wrap">{result.analysis}</p>
        </div>
      )}

      {/* 推薦商品列表 */}
      {result?.recommendations?.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">📦 推薦上架商品（{selectedIds.size}/{result.recommendations.length}）</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set(result.recommendations.map((r: any) => `${r.type}-${r.id}`)))}>全選</Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())}>全不選</Button>
            </div>
          </div>
          <div className="border rounded-lg overflow-auto max-h-[400px]">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="p-2 text-left w-10">✓</th>
                  <th className="p-2 text-left">類型</th>
                  <th className="p-2 text-left">名稱</th>
                  <th className="p-2 text-right">建議售價</th>
                  <th className="p-2 text-left">推薦理由</th>
                </tr>
              </thead>
              <tbody>
                {result.recommendations.map((r: any, i: number) => {
                  const key = `${r.type}-${r.id}`;
                  return (
                    <tr key={i} className={`border-t cursor-pointer hover:bg-muted/30 ${selectedIds.has(key) ? "bg-green-500/10" : ""}`} onClick={() => toggleItem(key)}>
                      <td className="p-2"><input type="checkbox" checked={selectedIds.has(key)} onChange={() => toggleItem(key)} /></td>
                      <td className="p-2"><Badge variant="outline">{r.type === "item" ? "道具" : r.type === "equip" ? "裝備" : "技能"}</Badge></td>
                      <td className="p-2 font-medium">{r.name}</td>
                      <td className="p-2 text-right text-amber-400">{r.suggestedPrice?.toLocaleString()}</td>
                      <td className="p-2 text-muted-foreground text-xs">{r.reason}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 售價調整建議 */}
      {result?.priceAdjustments?.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold">💰 售價調整建議</h3>
          <div className="border rounded-lg overflow-auto max-h-[300px]">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="p-2 text-left">類型</th>
                  <th className="p-2 text-left">名稱</th>
                  <th className="p-2 text-right">現有售價</th>
                  <th className="p-2 text-center">→</th>
                  <th className="p-2 text-right">建議售價</th>
                  <th className="p-2 text-left">原因</th>
                </tr>
              </thead>
              <tbody>
                {result.priceAdjustments.map((p: any, i: number) => (
                  <tr key={i} className="border-t">
                    <td className="p-2"><Badge variant="outline">{p.type === "item" ? "道具" : p.type === "equip" ? "裝備" : "技能"}</Badge></td>
                    <td className="p-2 font-medium">{p.name}</td>
                    <td className="p-2 text-right text-muted-foreground">{p.currentPrice?.toLocaleString()}</td>
                    <td className="p-2 text-center">→</td>
                    <td className="p-2 text-right text-amber-400">{p.suggestedPrice?.toLocaleString()}</td>
                    <td className="p-2 text-xs text-muted-foreground">{p.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 套用按鈕 */}
      {result?.recommendations?.length > 0 && (
        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={updatePrices} onChange={e => setUpdatePrices(e.target.checked)} />
            同時更新售價
          </label>
          <Button variant="outline" onClick={() => setShowPreview(true)} className="ml-auto mr-2">
            👁️ 預覽商店效果
          </Button>
          <Button onClick={handleApply} disabled={applyMutation.isPending || selectedIds.size === 0}>
            {applyMutation.isPending ? "⏳ 套用中..." : `✅ 一鍵套用（${selectedIds.size} 件）`}
          </Button>
        </div>
      )}

      {/* 商店預覽模式 */}
      {showPreview && result?.recommendations && (
        <ShopPreviewModal
          recommendations={result.recommendations.filter((r: any) => selectedIds.has(`${r.type}-${r.id}`))}
          shopType={shopType}
          onClose={() => setShowPreview(false)}
        />
      )}

      {/* 使用說明 */}
      <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
        <h4 className="font-semibold mb-2">💡 使用說明</h4>
        <ul className="space-y-1 list-disc list-inside">
          <li>AI 會根據玩家等級分佈和經濟數據，推薦最適合的商品組合</li>
          <li>推薦結果可逐一勾選或全選，再一鍵套用到圖鑑的 inShop 欄位</li>
          <li>勾選「同時更新售價」會將 AI 建議的售價寫入圖鑑的 shopPrice</li>
          <li>套用後需要到各商店管理 Tab 手動刷新或等待自動刷新才會生效</li>
          <li>已鎖定的商店商品不會被 AI 刷新覆蓋</li>
        </ul>
      </div>
    </div>
  );
}


// ─── Shop Preview Modal ──────────────────────────────────────────────────────
const PREVIEW_RARITY_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  common:    { bg: "rgba(100,116,139,0.15)", border: "rgba(100,116,139,0.4)",  text: "#94a3b8", glow: "none" },
  rare:      { bg: "rgba(59,130,246,0.15)",  border: "rgba(59,130,246,0.5)",   text: "#60a5fa", glow: "0 0 8px rgba(59,130,246,0.3)" },
  epic:      { bg: "rgba(139,92,246,0.15)",  border: "rgba(139,92,246,0.5)",   text: "#a78bfa", glow: "0 0 10px rgba(139,92,246,0.4)" },
  legendary: { bg: "rgba(245,158,11,0.15)",  border: "rgba(245,158,11,0.5)",   text: "#fbbf24", glow: "0 0 14px rgba(245,158,11,0.5)" },
};
const PREVIEW_RARITY_LABEL: Record<string, string> = {
  common: "普通", rare: "稀有", epic: "史詩", legendary: "傳說",
};

function ShopPreviewModal({
  recommendations,
  shopType,
  onClose,
}: {
  recommendations: any[];
  shopType: "normal" | "spirit" | "secret";
  onClose: () => void;
}) {
  const shopConfig = {
    normal: { title: "一般商店", icon: "🛒", currency: "🪙 金幣", currencyColor: "#fbbf24", headerGradient: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)" },
    spirit: { title: "靈相商店", icon: "💎", currency: "💎 靈石", currencyColor: "#a78bfa", headerGradient: "linear-gradient(135deg, #1a1a2e 0%, #2d1b69 100%)" },
    secret: { title: "密店", icon: "🔮", currency: "🪙 金幣", currencyColor: "#fbbf24", headerGradient: "linear-gradient(135deg, #1a1a2e 0%, #3d1f1f 100%)" },
  };
  const cfg = shopConfig[shopType];

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.8)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(420px, 95vw)",
          maxHeight: "85vh",
          borderRadius: "20px",
          overflow: "hidden",
          background: "#0f172a",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* 商店標題 */}
        <div style={{ background: cfg.headerGradient, padding: "20px 16px 16px", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "24px" }}>{cfg.icon}</span>
              <div>
                <h3 style={{ color: "#e2e8f0", fontSize: "18px", fontWeight: 700, margin: 0 }}>{cfg.title}</h3>
                <p style={{ color: "#64748b", fontSize: "11px", margin: "2px 0 0" }}>
                  {recommendations.length} 件商品 · 預覽模式
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: "32px", height: "32px", borderRadius: "8px",
                background: "rgba(255,255,255,0.1)", border: "none",
                color: "#94a3b8", fontSize: "18px", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              ✕
            </button>
          </div>
          {/* 模擬餘額 */}
          <div style={{
            marginTop: "12px", display: "flex", gap: "12px",
            padding: "8px 12px", borderRadius: "10px",
            background: "rgba(0,0,0,0.3)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ fontSize: "14px" }}>🪙</span>
              <span style={{ color: "#fbbf24", fontSize: "14px", fontWeight: 700 }}>99,999</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ fontSize: "14px" }}>💎</span>
              <span style={{ color: "#a78bfa", fontSize: "14px", fontWeight: 700 }}>999</span>
            </div>
          </div>
          {/* 預覽標籤 */}
          <div style={{
            position: "absolute", top: "8px", right: "52px",
            padding: "2px 8px", borderRadius: "4px",
            background: "rgba(245,158,11,0.2)", border: "1px solid rgba(245,158,11,0.4)",
            fontSize: "10px", fontWeight: 700, color: "#fbbf24",
          }}>
            PREVIEW
          </div>
        </div>

        {/* 商品網格 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
          {recommendations.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#475569" }}>
              <p style={{ fontSize: "14px" }}>尚未選取任何商品</p>
              <p style={{ fontSize: "12px", color: "#334155" }}>請在推薦列表中勾選要上架的商品</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {recommendations.map((item: any, i: number) => {
                const rarity = item.rarity ?? "common";
                const rc = PREVIEW_RARITY_COLORS[rarity] ?? PREVIEW_RARITY_COLORS.common;
                const isGold = shopType !== "spirit";
                return (
                  <div
                    key={i}
                    style={{
                      borderRadius: "12px",
                      border: `1px solid ${rc.border}`,
                      background: rc.bg,
                      padding: "12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      boxShadow: rc.glow,
                      transition: "transform 0.15s",
                    }}
                  >
                    {/* 頂部：名稱 + 稀有度 */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "16px" }}>
                        {item.type === "item" ? "📦" : item.type === "equip" ? "🗡️" : "✨"}
                      </span>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.name}
                      </span>
                      <span style={{
                        fontSize: "9px", padding: "1px 5px", borderRadius: "3px",
                        background: rc.bg, border: `1px solid ${rc.border}`,
                        color: rc.text, fontWeight: 700,
                      }}>
                        {PREVIEW_RARITY_LABEL[rarity] ?? rarity}
                      </span>
                    </div>
                    {/* 類型標籤 */}
                    <div style={{ display: "flex", gap: "4px" }}>
                      <span style={{
                        fontSize: "10px", padding: "1px 6px", borderRadius: "4px",
                        background: "rgba(255,255,255,0.05)", color: "#64748b",
                      }}>
                        {item.type === "item" ? "道具" : item.type === "equip" ? "裝備" : "技能"}
                      </span>
                    </div>
                    {/* 推薦理由（截短） */}
                    {item.reason && (
                      <p style={{ fontSize: "11px", color: "#94a3b8", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" } as React.CSSProperties}>
                        {item.reason}
                      </p>
                    )}
                    {/* 底部：價格 + 購買按鈕 */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: isGold ? "#fbbf24" : "#a78bfa" }}>
                        {isGold ? "🪙" : "💎"} {(item.suggestedPrice ?? 0).toLocaleString()}
                      </span>
                      <button
                        style={{
                          padding: "5px 14px", borderRadius: "6px", border: "none",
                          background: isGold
                            ? "linear-gradient(135deg, #d97706, #f59e0b)"
                            : "linear-gradient(135deg, #7c3aed, #a78bfa)",
                          color: "#fff", fontSize: "12px", fontWeight: 700,
                          cursor: "default", opacity: 0.7,
                        }}
                      >
                        購買
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 底部提示 */}
        <div style={{
          padding: "12px 16px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          textAlign: "center",
          background: "rgba(0,0,0,0.2)",
        }}>
          <p style={{ color: "#475569", fontSize: "11px", margin: 0 }}>
            此為預覽模式，實際效果以套用後的商店頁面為準
          </p>
        </div>
      </div>
    </div>
  );
}


// ─── Value Engine Tab ──────────────────────────────────────────────────────
function ValueEngineTab() {
  const utils = trpc.useUtils();
  const [previewData, setPreviewData] = useState<any>(null);
  const [dropPreview, setDropPreview] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<"rebalance" | "drops" | "images">("rebalance");
  const [batchForceRegen, setBatchForceRegen] = useState(false);

  // 預覽所有圖鑑的價值評估
  const previewAll = trpc.valueRebalance.previewAll.useQuery(undefined, { enabled: false });
  // 執行批量重新評估
  const applyAll = trpc.valueRebalance.applyAll.useMutation({
    onSuccess: (data) => {
      toast.success(`✅ 重新評估完成：道具 ${data.updated.items} 件、裝備 ${data.updated.equipment} 件、技能 ${data.updated.skills} 件`);
      utils.gameCatalog.invalidate();
    },
    onError: (e) => toast.error(e.message || "重新評估失敗"),
  });
  // AI 掉落分配
  const aiAssignDrops = trpc.valueRebalance.aiAssignDrops.useMutation({
    onSuccess: (data) => {
      setDropPreview(data);
      if (!data.dryRun) {
        toast.success(data.message);
        utils.gameCatalog.invalidate();
      }
    },
    onError: (e) => toast.error(e.message || "掉落分配失敗"),
  });
  // 批量 AI 生圖
  const batchGenImages = trpc.gameAI.aiBatchGenerateImages.useMutation({
    onSuccess: (data: any) => {
      toast.success(`✅ 批量生圖完成：成功 ${data.success} 件、失敗 ${data.failed} 件`);
      utils.gameCatalog.invalidate();
    },
    onError: (e: any) => toast.error(e.message || "批量生圖失敗"),
  });

  const rarityColors: Record<string, string> = {
    common: "#9CA3AF", rare: "#3B82F6", epic: "#A855F7", legendary: "#F59E0B",
  };
  const qualityColors: Record<string, string> = {
    S: "#EF4444", A: "#F97316", B: "#EAB308", C: "#22C55E", D: "#6B7280",
  };

  return (
    <div className="space-y-6">
      {/* 標題區 */}
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">💎 價值評估引擎</h2>
        <p className="text-sm text-muted-foreground mt-1">
          根據「稀有度 → 價值性 → 實用性 → 影響程度」四層邏輯，自動計算所有道具/裝備/技能書的品質等級（S/A/B/C/D）、合理價格、流通權限和怪物掉落分配。
        </p>
      </div>

      {/* 切換區 */}
      <div className="flex gap-2">
        <Button
          variant={activeSection === "rebalance" ? "default" : "outline"}
          onClick={() => setActiveSection("rebalance")}
          className={activeSection === "rebalance" ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white" : ""}
        >
          ⚖️ 全圖鑑重新評估
        </Button>
        <Button
          variant={activeSection === "drops" ? "default" : "outline"}
          onClick={() => setActiveSection("drops")}
          className={activeSection === "drops" ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white" : ""}
        >
          🎯 怪物掉落分配
        </Button>
        <Button
          variant={activeSection === "images" ? "default" : "outline"}
          onClick={() => setActiveSection("images")}
          className={activeSection === "images" ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white" : ""}
        >
          🎨 批量 AI 生圖
        </Button>
      </div>

      {activeSection === "rebalance" && (
        <div className="space-y-6">
          {/* 說明卡片 */}
          <div className="p-4 rounded-xl border bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20">
            <h3 className="font-bold text-violet-700 dark:text-violet-400 mb-2">📐 評估規則</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold mb-1">品質等級（同稀有度內排名）</p>
                <div className="space-y-1">
                  {[
                    { g: "S", desc: "前 10%，價格 ×4，限制流通", color: "#EF4444" },
                    { g: "A", desc: "10~30%，價格 ×2.5，限靈石/密店", color: "#F97316" },
                    { g: "B", desc: "30~60%，價格 ×1.5，一般/靈石商店", color: "#EAB308" },
                    { g: "C", desc: "60~85%，基準價格", color: "#22C55E" },
                    { g: "D", desc: "後 15%，價格 ×0.6", color: "#6B7280" },
                  ].map(q => (
                    <div key={q.g} className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: q.color }}>{q.g}</span>
                      <span>{q.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-semibold mb-1">流通權限</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>🏪 一般商店：C/D 級的 common/rare</li>
                  <li>💎 靈石商店：B/C 級的 rare/epic</li>
                  <li>🔮 密店：A/B 級的 epic，S 級非傳說</li>
                  <li>🏛️ 拍賣行：所有可交易物品</li>
                  <li>🚫 傳說技能書：完全禁止交易</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 操作按鈕 */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => previewAll.refetch().then(r => r.data && setPreviewData(r.data))}
              disabled={previewAll.isFetching}
              variant="outline"
              className="border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-400"
            >
              {previewAll.isFetching ? "⏳ 分析中..." : "🔍 預覽評估結果"}
            </Button>
            <Button
              onClick={() => {
                if (confirm("確定要執行全圖鑑重新評估？這會修改所有道具/裝備/技能的價格、品質、流通權限。")) {
                  applyAll.mutate();
                }
              }}
              disabled={applyAll.isPending}
              className="bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700"
            >
              {applyAll.isPending ? "⏳ 執行中..." : "🚀 執行全圖鑑重新評估"}
            </Button>
          </div>

          {/* 評估結果 */}
          {applyAll.data && (
            <div className="p-4 rounded-xl border bg-green-50 dark:bg-green-950/20">
              <p className="font-bold text-green-700 dark:text-green-400">✅ 重新評估完成</p>
              <div className="flex gap-4 mt-2 text-sm">
                <span>道具：{applyAll.data.updated.items} 件</span>
                <span>裝備：{applyAll.data.updated.equipment} 件</span>
                <span>技能：{applyAll.data.updated.skills} 件</span>
              </div>
            </div>
          )}

          {/* 預覽結果表格 */}
          {previewData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">📊 評估預覽</h3>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>道具：{previewData.summary.items} 件</span>
                  <span>裝備：{previewData.summary.equipment} 件</span>
                  <span>技能：{previewData.summary.skills} 件</span>
                </div>
              </div>

              {/* 合併顯示所有結果 */}
              <div className="max-h-[500px] overflow-y-auto rounded-lg border">
                <table className="w-full text-sm border-collapse">
                  <thead className="sticky top-0 bg-background z-10">
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">類型</th>
                      <th className="text-left py-2 px-3">名稱</th>
                      <th className="text-left py-2 px-3">五行</th>
                      <th className="text-center py-2 px-3">稀有度</th>
                      <th className="text-center py-2 px-3">品質</th>
                      <th className="text-right py-2 px-3">價值分</th>
                      <th className="text-right py-2 px-3">建議價</th>
                      <th className="text-center py-2 px-3">掉落等級</th>
                      <th className="text-center py-2 px-3">流通</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ...(previewData.items || []),
                      ...(previewData.equipment || []),
                      ...(previewData.skills || []),
                    ]
                      .sort((a: any, b: any) => b.evaluation.valueScore - a.evaluation.valueScore)
                      .map((item: any, i: number) => {
                        const e = item.evaluation;
                        return (
                          <tr key={`${item.type}-${item.id}-${i}`} className="border-b hover:bg-muted/30">
                            <td className="py-1.5 px-3">
                              <span className="text-xs px-1.5 py-0.5 rounded" style={{
                                background: item.type === "item" ? "#2E8B5720" : item.type === "equipment" ? "#C9A22720" : "#8B5CF620",
                                color: item.type === "item" ? "#2E8B57" : item.type === "equipment" ? "#C9A227" : "#8B5CF6",
                              }}>
                                {item.type === "item" ? "道具" : item.type === "equipment" ? "裝備" : "技能"}
                              </span>
                            </td>
                            <td className="py-1.5 px-3 font-medium">{item.name}</td>
                            <td className="py-1.5 px-3">{item.wuxing}</td>
                            <td className="py-1.5 px-3 text-center">
                              <span className="text-xs px-1.5 py-0.5 rounded" style={{
                                background: (rarityColors[e.correctedRarity] || "#999") + "20",
                                color: rarityColors[e.correctedRarity] || "#999",
                              }}>
                                {e.correctedRarity}
                              </span>
                            </td>
                            <td className="py-1.5 px-3 text-center">
                              <span className="w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold text-white" style={{
                                background: qualityColors[e.qualityGrade] || "#999",
                              }}>
                                {e.qualityGrade}
                              </span>
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono">{e.valueScore}</td>
                            <td className="py-1.5 px-3 text-right font-mono">{e.suggestedCoinPrice}💰</td>
                            <td className="py-1.5 px-3 text-center text-xs">
                              Lv{e.dropLevelRange[0]}~{e.dropLevelRange[1]}
                            </td>
                            <td className="py-1.5 px-3 text-center">
                              <div className="flex gap-0.5 justify-center">
                                {e.tradeRules.normalShop && <span title="一般商店" className="text-xs">🏪</span>}
                                {e.tradeRules.spiritShop && <span title="靈石商店" className="text-xs">💎</span>}
                                {e.tradeRules.secretShop && <span title="密店" className="text-xs">🔮</span>}
                                {e.tradeRules.auctionHouse && <span title="拍賣行" className="text-xs">🏛️</span>}
                                {!e.tradeRules.tradeable && <span title="禁止交易" className="text-xs">🚫</span>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeSection === "drops" && (
        <div className="space-y-6">
          {/* 說明卡片 */}
          <div className="p-4 rounded-xl border bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
            <h3 className="font-bold text-amber-700 dark:text-amber-400 mb-2">🎯 掉落分配規則</h3>
            <div className="text-sm space-y-1 text-muted-foreground">
              <p>根據 ValueEngine 的掉落等級範圍，自動為每個怪物分配合適的掉落物品：</p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li>common 物品 → Lv1~15 怪物</li>
                <li>rare 物品 → Lv8~30 怪物</li>
                <li>epic 物品 → Lv20~45 怪物</li>
                <li>legendary 物品 → Lv35~50 怪物</li>
                <li>同五行優先分配，確保類型多樣性（道具+裝備+技能書）</li>
                <li>傳說級技能書不會出現在掉落池中</li>
                <li>epic/boss/legendary 怪物額外有傳說掉落欄位</li>
              </ul>
            </div>
          </div>

          {/* 操作按鈕 */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => aiAssignDrops.mutate({ dryRun: true })}
              disabled={aiAssignDrops.isPending}
              variant="outline"
              className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400"
            >
              {aiAssignDrops.isPending ? "⏳ 分析中..." : "🔍 預覽掉落分配"}
            </Button>
            <Button
              onClick={() => {
                if (confirm("確定要執行怪物掉落分配？這會覆蓋所有怪物的掉落設定。")) {
                  aiAssignDrops.mutate({ dryRun: false });
                }
              }}
              disabled={aiAssignDrops.isPending}
              className="bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-700 hover:to-orange-700"
            >
              {aiAssignDrops.isPending ? "⏳ 執行中..." : "🚀 執行掉落分配"}
            </Button>
          </div>

          {/* 掉落分配結果 */}
          {dropPreview && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg border bg-amber-50 dark:bg-amber-950/20">
                <p className="font-bold text-amber-700 dark:text-amber-400">
                  {dropPreview.dryRun ? "🔍 預覽模式" : "✅ 已執行"}：{dropPreview.message}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  掉落池：{dropPreview.totalDropPool} 種物品
                </p>
              </div>

              <div className="max-h-[500px] overflow-y-auto rounded-lg border">
                <table className="w-full text-sm border-collapse">
                  <thead className="sticky top-0 bg-background z-10">
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">怪物</th>
                      <th className="text-center py-2 px-3">等級</th>
                      <th className="text-center py-2 px-3">稀有度</th>
                      <th className="text-left py-2 px-3">掉落 1</th>
                      <th className="text-left py-2 px-3">掉落 2</th>
                      <th className="text-left py-2 px-3">掉落 3</th>
                      <th className="text-left py-2 px-3">掉落 4</th>
                      <th className="text-left py-2 px-3">掉落 5</th>
                      <th className="text-left py-2 px-3">傳說掉落</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dropPreview.assignments || []).map((a: any, i: number) => (
                      <tr key={i} className="border-b hover:bg-muted/30">
                        <td className="py-1.5 px-3 font-medium">{a.monsterName}</td>
                        <td className="py-1.5 px-3 text-center text-xs">{a.monsterLevel}</td>
                        <td className="py-1.5 px-3 text-center">
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{
                            background: (rarityColors[a.monsterRarity] || "#999") + "20",
                            color: rarityColors[a.monsterRarity] || "#999",
                          }}>
                            {a.monsterRarity}
                          </span>
                        </td>
                        {[0, 1, 2, 3, 4].map(slot => {
                          const drop = a.drops[slot];
                          if (!drop) return <td key={slot} className="py-1.5 px-3 text-muted-foreground text-xs">-</td>;
                          const typeIcon = drop.type === "item" ? "🎒" : drop.type === "equipment" ? "⚔️" : "📖";
                          return (
                            <td key={slot} className="py-1.5 px-3 text-xs">
                              <span title={`${drop.itemName} (${(drop.rate * 100).toFixed(1)}%)`}>
                                {typeIcon} {drop.itemName.slice(0, 6)}{drop.itemName.length > 6 ? "…" : ""} <span className="text-muted-foreground">{(drop.rate * 100).toFixed(1)}%</span>
                              </span>
                            </td>
                          );
                        })}
                        <td className="py-1.5 px-3 text-xs">
                          {a.legendaryDrop ? (
                            <span className="text-amber-600" title={`${a.legendaryDrop.itemName} (${(a.legendaryDrop.rate * 100).toFixed(2)}%)`}>
                              ⭐ {a.legendaryDrop.itemName.slice(0, 6)}{a.legendaryDrop.itemName.length > 6 ? "…" : ""} <span className="text-muted-foreground">{(a.legendaryDrop.rate * 100).toFixed(2)}%</span>
                            </span>
                          ) : <span className="text-muted-foreground">-</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeSection === "images" && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl border bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
            <h3 className="font-bold text-lg">🎨 批量 AI 生圖</h3>
            <p className="text-sm text-muted-foreground mt-1">自動為所有缺少圖片的圖鑑生成圖片。每次最多處理 10 件。勾選「強制重新生成」可覆蓋已有圖片。</p>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="checkbox" checked={batchForceRegen} onChange={e => setBatchForceRegen(e.target.checked)} className="rounded" />
              <span className="text-amber-600 font-medium">強制重新生成（覆蓋已有圖片）</span>
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { type: "item" as const, label: "🎒 道具", from: "from-emerald-600", to: "to-teal-600" },
              { type: "equipment" as const, label: "⚔️ 裝備", from: "from-blue-600", to: "to-indigo-600" },
              { type: "skill" as const, label: "📖 技能書", from: "from-purple-600", to: "to-pink-600" },
              { type: "monster" as const, label: "🐉 魔物", from: "from-red-600", to: "to-orange-600" },
              { type: "achievement" as const, label: "🏆 成就", from: "from-amber-600", to: "to-yellow-600" },
              { type: "boss" as const, label: "💀 Boss", from: "from-rose-700", to: "to-red-600" },
            ].map(cfg => (
              <div key={cfg.type} className="p-4 rounded-xl border bg-card">
                <h4 className="font-semibold mb-3">{cfg.label}生圖</h4>
                <Button
                  className={`w-full bg-gradient-to-r ${cfg.from} ${cfg.to} text-white`}
                  disabled={batchGenImages.isPending}
                  onClick={() => batchGenImages.mutate({ type: cfg.type, limit: 10, forceRegenerate: batchForceRegen })}
                >
                  {batchGenImages.isPending ? "⚙️ 生成中..." : `一鍵生成${cfg.label.slice(2)}圖片（10件）`}
                </Button>
              </div>
            ))}
          </div>
          {batchGenImages.data && (
            <div className="mt-3 p-3 rounded-lg border bg-emerald-50 dark:bg-emerald-950/30 text-sm">
              <p className="font-medium text-emerald-700 dark:text-emerald-400">✅ {(batchGenImages.data as any).message}</p>
              {(batchGenImages.data as any).results?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {(batchGenImages.data as any).results.map((r: any) => (
                    <div key={r.id} className="text-center">
                      {r.imageUrl && <img src={r.imageUrl} alt="" className="w-16 h-16 object-contain rounded border" />}
                      <p className="text-[10px] text-muted-foreground mt-0.5">{r.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground">提示：每次點擊會為最多 10 件缺少圖片的物品生成圖片，可多次點擊直到所有物品都有圖片。也可以在各圖鑑的操作欄中點擊 🎨 按鈕單獨生成。</p>
        </div>
      )}
    </div>
  );
}


// ─── 遊戲指南管理 Tab ───
function GameGuideTab() {
  const utils = trpc.useUtils();
  const sections = trpc.gameGuide.getAllSections.useQuery();
  const config = trpc.gameGuide.getConfig.useQuery();
  const updateConfig = trpc.gameGuide.updateConfig.useMutation({
    onSuccess: () => { utils.gameGuide.getConfig.invalidate(); toast.success("全域設定已更新"); },
  });
  const createSection = trpc.gameGuide.createSection.useMutation({
    onSuccess: () => { utils.gameGuide.getAllSections.invalidate(); toast.success("章節已新增"); setEditingSection(null); },
  });
  const updateSection = trpc.gameGuide.updateSection.useMutation({
    onSuccess: () => { utils.gameGuide.getAllSections.invalidate(); toast.success("章節已更新"); setEditingSection(null); },
  });
  const deleteSection = trpc.gameGuide.deleteSection.useMutation({
    onSuccess: () => { utils.gameGuide.getAllSections.invalidate(); toast.success("章節已刪除"); },
  });
  const reorderSections = trpc.gameGuide.reorderSections.useMutation({
    onSuccess: () => { utils.gameGuide.getAllSections.invalidate(); toast.success("排序已更新"); },
  });
  const aiGenerate = trpc.gameGuide.aiGenerateGuide.useMutation({
    onSuccess: (data) => { utils.gameGuide.getAllSections.invalidate(); toast.success(`AI 已生成 ${data.count} 個章節`); },
    onError: (err) => { toast.error(`AI 生成失敗：${err.message}`); },
  });

  const [editingSection, setEditingSection] = useState<any>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newIcon, setNewIcon] = useState("📖");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [editIcon, setEditIcon] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState("");

  // 全域設定
  const [cfgTabIcon, setCfgTabIcon] = useState("");
  const [cfgTabLabel, setCfgTabLabel] = useState("");
  const [cfgPageTitle, setCfgPageTitle] = useState("");
  const [cfgPageSubtitle, setCfgPageSubtitle] = useState("");
  const [cfgDirty, setCfgDirty] = useState(false);

  // 初始化全域設定
  const cfgData = config.data;
  React.useEffect(() => {
    if (cfgData) {
      setCfgTabIcon(cfgData.tabIcon || "📖");
      setCfgTabLabel(cfgData.tabLabel || "指南");
      setCfgPageTitle(cfgData.pageTitle || "冒險者指南");
      setCfgPageSubtitle(cfgData.pageSubtitle || "歡迎來到天命共振的世界！這份指南將帶你了解所有遊戲機制。");
      setCfgDirty(false);
    }
  }, [cfgData]);

  const handleSaveConfig = () => {
    updateConfig.mutate({
      tabIcon: cfgTabIcon,
      tabLabel: cfgTabLabel,
      pageTitle: cfgPageTitle,
      pageSubtitle: cfgPageSubtitle,
    });
    setCfgDirty(false);
  };

  const handleCreateSection = () => {
    if (!newTitle.trim()) { toast.error("請輸入章節標題"); return; }
    createSection.mutate({
      icon: newIcon,
      title: newTitle,
      content: newContent,
      category: newCategory,
      sortOrder: (sections.data?.length ?? 0) * 10,
    });
    setShowNewForm(false);
    setNewIcon("📖"); setNewTitle(""); setNewContent(""); setNewCategory("general");
  };

  const handleStartEdit = (s: any) => {
    setEditingSection(s);
    setEditIcon(s.icon);
    setEditTitle(s.title);
    setEditContent(s.content);
    setEditCategory(s.category || "general");
  };

  const handleSaveEdit = () => {
    if (!editingSection) return;
    updateSection.mutate({
      id: editingSection.id,
      icon: editIcon,
      title: editTitle,
      content: editContent,
      category: editCategory,
    });
  };

  const handleMoveUp = (index: number) => {
    if (!sections.data || index <= 0) return;
    const items = [...sections.data];
    const orders = items.map((s, i) => ({ id: s.id, sortOrder: i * 10 }));
    // 交換
    const temp = orders[index].sortOrder;
    orders[index].sortOrder = orders[index - 1].sortOrder;
    orders[index - 1].sortOrder = temp;
    reorderSections.mutate({ orders });
  };

  const handleMoveDown = (index: number) => {
    if (!sections.data || index >= sections.data.length - 1) return;
    const items = [...sections.data];
    const orders = items.map((s, i) => ({ id: s.id, sortOrder: i * 10 }));
    const temp = orders[index].sortOrder;
    orders[index].sortOrder = orders[index + 1].sortOrder;
    orders[index + 1].sortOrder = temp;
    reorderSections.mutate({ orders });
  };

  const CATEGORY_OPTIONS = [
    { value: "basic", label: "基礎入門" },
    { value: "combat", label: "戰鬥系統" },
    { value: "growth", label: "成長養成" },
    { value: "social", label: "社交交易" },
    { value: "advanced", label: "進階技巧" },
    { value: "general", label: "一般" },
  ];

  return (
    <div className="space-y-6">
      {/* 頂部操作列 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold">📖 遊戲規則指南管理</h3>
          <p className="text-sm text-muted-foreground">管理遊戲規則指南的章節內容，玩家可在底部「指南」Tab 中查看。</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNewForm(true)}
          >
            ➕ 新增章節
          </Button>
          <Button
            size="sm"
            className="bg-gradient-to-r from-violet-600 to-blue-600 text-white"
            disabled={aiGenerate.isPending}
            onClick={() => {
              if (sections.data && sections.data.length > 0) {
                if (!confirm("一鍵生成將覆蓋所有現有章節，確定要繼續嗎？")) return;
              }
              aiGenerate.mutate();
            }}
          >
            {aiGenerate.isPending ? "🤖 AI 生成中..." : "🤖 一鍵 AI 生成規則"}
          </Button>
        </div>
      </div>

      {/* 全域設定區 */}
      <div className="p-4 rounded-xl border bg-card space-y-4">
        <h4 className="font-semibold text-sm">⚙️ 全域設定（底端功能表 & 頁面標題）</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Tab Icon</label>
            <Input value={cfgTabIcon} onChange={e => { setCfgTabIcon(e.target.value); setCfgDirty(true); }} placeholder="📖" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Tab 標籤</label>
            <Input value={cfgTabLabel} onChange={e => { setCfgTabLabel(e.target.value); setCfgDirty(true); }} placeholder="指南" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">頁面標題</label>
            <Input value={cfgPageTitle} onChange={e => { setCfgPageTitle(e.target.value); setCfgDirty(true); }} placeholder="冒險者指南" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">頁面副標題</label>
            <Input value={cfgPageSubtitle} onChange={e => { setCfgPageSubtitle(e.target.value); setCfgDirty(true); }} placeholder="歡迎來到天命共振..." />
          </div>
        </div>
        {cfgDirty && (
          <Button size="sm" onClick={handleSaveConfig} disabled={updateConfig.isPending}>
            {updateConfig.isPending ? "儲存中..." : "💾 儲存設定"}
          </Button>
        )}
      </div>

      {/* 新增章節表單 */}
      {showNewForm && (
        <div className="p-4 rounded-xl border-2 border-dashed border-primary/30 bg-card space-y-3">
          <h4 className="font-semibold text-sm">➕ 新增章節</h4>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Icon</label>
              <Input value={newIcon} onChange={e => setNewIcon(e.target.value)} placeholder="📖" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">標題</label>
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="章節標題" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">分類</label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">內容（Markdown 格式）</label>
            <Textarea value={newContent} onChange={e => setNewContent(e.target.value)} rows={8} placeholder="使用 Markdown 格式撰寫章節內容..." />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreateSection} disabled={createSection.isPending}>
              {createSection.isPending ? "新增中..." : "✅ 確認新增"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowNewForm(false)}>取消</Button>
          </div>
        </div>
      )}

      {/* 章節列表 */}
      <div className="space-y-2">
        <h4 className="font-semibold text-sm">📋 章節列表（{sections.data?.length ?? 0} 個）</h4>
        {sections.isLoading && <p className="text-sm text-muted-foreground">載入中...</p>}
        {sections.data?.map((s, idx) => (
          <div key={s.id} className={`p-3 rounded-lg border ${s.enabled ? "bg-card" : "bg-muted/30 opacity-60"} flex items-start gap-3`}>
            {/* 排序按鈕 */}
            <div className="flex flex-col gap-0.5 shrink-0">
              <button
                className="text-xs px-1 py-0.5 rounded hover:bg-accent disabled:opacity-30"
                disabled={idx === 0}
                onClick={() => handleMoveUp(idx)}
              >▲</button>
              <button
                className="text-xs px-1 py-0.5 rounded hover:bg-accent disabled:opacity-30"
                disabled={idx === (sections.data?.length ?? 0) - 1}
                onClick={() => handleMoveDown(idx)}
              >▼</button>
            </div>

            {/* 內容 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg">{s.icon}</span>
                <span className="font-semibold text-sm">{s.title}</span>
                <Badge variant="outline" className="text-[10px]">{s.category}</Badge>
                {!s.enabled && <Badge variant="secondary" className="text-[10px]">已停用</Badge>}
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.content.substring(0, 120)}...</p>
            </div>

            {/* 操作按鈕 */}
            <div className="flex gap-1 shrink-0">
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => handleStartEdit(s)}>✏️</Button>
              <Button
                size="sm" variant="ghost" className="h-7 px-2 text-xs"
                onClick={() => updateSection.mutate({ id: s.id, enabled: !s.enabled })}
              >
                {s.enabled ? "🔒" : "🔓"}
              </Button>
              <Button
                size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive"
                onClick={() => { if (confirm(`確定刪除「${s.title}」？`)) deleteSection.mutate({ id: s.id }); }}
              >🗑️</Button>
            </div>
          </div>
        ))}
        {sections.data?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-sm">尚無任何章節，點擊「一鍵 AI 生成規則」快速建立完整指南！</p>
          </div>
        )}
      </div>

      {/* 編輯章節 Dialog */}
      <Dialog open={!!editingSection} onOpenChange={(open) => { if (!open) setEditingSection(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>✏️ 編輯章節</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Icon</label>
                <Input value={editIcon} onChange={e => setEditIcon(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">標題</label>
                <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">分類</label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">內容（Markdown 格式）</label>
              <Textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={16} className="font-mono text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSection(null)}>取消</Button>
            <Button onClick={handleSaveEdit} disabled={updateSection.isPending}>
              {updateSection.isPending ? "儲存中..." : "💾 儲存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
 * 👹 RoamingBossTab — 移動式 Boss 管理
 * ═══════════════════════════════════════════════════ */
function RoamingBossTab() {
  const [activeSection, setActiveSection] = useState<"catalog" | "instances" | "config" | "stats">("catalog");
  const [editingBoss, setEditingBoss] = useState<any>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // 查詢 Boss 圖鑑
  const { data: bossCatalog, refetch: refetchCatalog } = trpc.roamingBoss.getCatalogList.useQuery();
  // 查詢活躍實例
  const { data: activeInstances, refetch: refetchInstances } = trpc.roamingBoss.getActiveBosses.useQuery();
  // 查詢擊殺排行
  const { data: rankings } = trpc.roamingBoss.getKillRanking.useQuery({ limit: 50 });

  // Mutations
  const updateBoss = trpc.roamingBoss.upsertCatalog.useMutation({
    onSuccess: () => { refetchCatalog(); setEditingBoss(null); },
  });
  const toggleBossActive = trpc.roamingBoss.toggleActive.useMutation({
    onSuccess: () => { refetchCatalog(); },
    onError: (e: any) => toast.error(`停用失敗：${e.message}`),
  });
  const createBoss = trpc.roamingBoss.upsertCatalog.useMutation({
    onSuccess: () => { refetchCatalog(); setShowCreateDialog(false); },
  });
  const spawnBossMut = trpc.roamingBoss.spawnBoss.useMutation({
    onSuccess: () => { refetchInstances(); },
  });
  const despawnBossMut = trpc.roamingBoss.despawnBoss.useMutation({
    onSuccess: () => { refetchInstances(); },
  });

  const TIER_LABELS: Record<number, string> = { 1: "T1 遊蕩精英", 2: "T2 區域守護者", 3: "T3 天命凶獸" };
  const WX_EMOJI: Record<string, string> = { wood: "🌿", fire: "🔥", earth: "🪨", metal: "⚔️", water: "💧" };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-amber-400">👹 移動式 Boss 管理</h3>
        <div className="flex gap-2">
          {(["catalog", "instances", "config", "stats"] as const).map(s => (
            <Button key={s} size="sm" variant={activeSection === s ? "default" : "outline"}
              onClick={() => setActiveSection(s)}>
              {s === "catalog" ? "📋 圖鑑" : s === "instances" ? "🗺️ 活躍" : s === "config" ? "⚙️ 設定" : "📊 統計"}
            </Button>
          ))}
        </div>
      </div>

      {/* ═══ 圖鑑管理 ═══ */}
      {activeSection === "catalog" && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">管理 Boss 圖鑑：新增/編輯/啟用停用 Boss</p>
            <Button size="sm" onClick={() => setShowCreateDialog(true)}>➕ 新增 Boss</Button>
          </div>

          {bossCatalog?.map((boss: any) => (
            <Card key={boss.id} className="bg-background/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={boss.isActive ? "default" : "secondary"}>
                        {boss.isActive ? "✅ 啟用" : "⏸ 停用"}
                      </Badge>
                      <Badge className="bg-amber-600 text-white">{TIER_LABELS[boss.tier] || `T${boss.tier}`}</Badge>
                      <span className="font-bold">{WX_EMOJI[boss.wuxing] || "❓"} {boss.name}</span>
                      {boss.title && <span className="text-xs text-muted-foreground">「{boss.title}」</span>}
                    </div>
                    <div className="text-xs text-muted-foreground flex gap-3 flex-wrap">
                      <span>Lv.{boss.level}</span>
                      <span>HP:{boss.baseHp?.toLocaleString()}</span>
                      <span>ATK:{boss.baseAttack}</span>
                      <span>DEF:{boss.baseDefense}</span>
                      <span>SPD:{boss.baseSpeed}</span>
                      <span>MATK:{boss.baseMagicAttack}</span>
                      <span>MDEF:{boss.baseMagicDefense}</span>
                    </div>
                    <div className="text-xs text-muted-foreground flex gap-3 flex-wrap">
                      <span>移動間隔:{boss.moveIntervalSec}s</span>
                      <span>存活:{boss.lifetimeMinutes}m</span>
                      <span>體力:{boss.staminaCost}</span>
                      <span>EXP×{boss.expMultiplier}</span>
                      <span>Gold×{boss.goldMultiplier}</span>
                    </div>
                    {boss.description && (
                      <p className="text-xs text-muted-foreground/70 mt-1">{boss.description}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button size="sm" variant="outline" onClick={() => setEditingBoss(boss)}>✏️ 編輯</Button>
                    <Button size="sm" variant={boss.isActive ? "outline" : "default"}
                      onClick={() => toggleBossActive.mutate({ id: boss.id, isActive: boss.isActive ? 0 : 1 })}
                      disabled={toggleBossActive.isPending}>
                      {boss.isActive ? "⏸ 停用" : "▶️ 啟用"}
                    </Button>
                    <Button size="sm" className="bg-red-600 hover:bg-red-700"
                      onClick={() => spawnBossMut.mutate({ catalogId: boss.id })}
                      disabled={spawnBossMut.isPending}>
                      🎯 手動召喚
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ═══ 活躍實例 ═══ */}
      {activeSection === "instances" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">目前在地圖上活躍的 Boss 實例</p>
          {!activeInstances || activeInstances.length === 0 ? (
            <Card className="bg-background/50"><CardContent className="py-8 text-center text-muted-foreground">目前沒有活躍的 Boss</CardContent></Card>
          ) : activeInstances.map((inst: any) => (
            <Card key={inst.instanceId} className="bg-background/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-amber-600 text-white">{TIER_LABELS[inst.tier] || `T${inst.tier}`}</Badge>
                      <span className="font-bold">{inst.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground flex gap-3 flex-wrap">
                      <span>📍 {inst.currentNodeName || inst.currentNodeId}</span>
                      <span>HP: {inst.currentHp?.toLocaleString()}/{inst.maxHp?.toLocaleString()}</span>
                      <span>移動次數: {inst.moveCount}</span>
                      {inst.expiresAt && <span>剩餘: {Math.max(0, Math.round((inst.expiresAt - Date.now()) / 60000))}m</span>}
                    </div>
                  </div>
                  <Button size="sm" variant="destructive"
                    onClick={() => despawnBossMut.mutate({ instanceId: inst.instanceId })}
                    disabled={despawnBossMut.isPending}>
                    ❌ 強制消滅
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ═══ 全域設定 ═══ */}
      {activeSection === "config" && <BossConfigPanel />}

      {/* ═══ 統計 ═══ */}
      {activeSection === "stats" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Boss 擊殺排行榜與統計</p>
          {!rankings || rankings.length === 0 ? (
            <Card className="bg-background/50"><CardContent className="py-8 text-center text-muted-foreground">尚無擊殺記錄</CardContent></Card>
          ) : (
            <Card className="bg-background/50 border-border/50">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="grid grid-cols-4 text-xs font-bold text-muted-foreground border-b pb-2">
                    <span>排名</span><span>角色</span><span>擊殺數</span><span>總傷害</span>
                  </div>
                  {rankings.map((r: any, i: number) => (
                    <div key={i} className="grid grid-cols-4 text-sm py-1">
                      <span className={i < 3 ? "text-amber-400 font-bold" : "text-muted-foreground"}>#{i + 1}</span>
                      <span>{r.agentName}</span>
                      <span className="text-red-400">{r.kills}</span>
                      <span className="text-muted-foreground">{Number(r.totalDamage).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ═══ 編輯 Boss 對話框 ═══ */}
      {editingBoss && <BossEditDialog boss={editingBoss} onClose={() => setEditingBoss(null)} onSave={(data: any) => updateBoss.mutate({ id: editingBoss.id, bossCode: editingBoss.bossCode || editingBoss.name, ...data })} saving={updateBoss.isPending} />}

      {/* ═══ 新增 Boss 對話框 ═══ */}
      {showCreateDialog && <BossCreateDialog onClose={() => setShowCreateDialog(false)} onSave={(data: any) => createBoss.mutate(data)} saving={createBoss.isPending} />}
    </div>
  );
}

/* Boss 全域設定面板 */
function BossConfigPanel() {
  const { data: bossConfig, refetch } = trpc.roamingBoss.getConfig.useQuery();
  const updateConfig = trpc.roamingBoss.updateConfig.useMutation({
    onSuccess: () => { refetch(); toast.success("Boss 系統設定已更新"); },
  });
  const resetConfigMut = trpc.roamingBoss.resetConfig.useMutation({
    onSuccess: () => { refetch(); toast.success("Boss 系統設定已重置為預設值"); },
  });

  const [enabled, setEnabled] = useState(true);
  const [t1Max, setT1Max] = useState("5");
  const [t2Max, setT2Max] = useState("1");
  const [t3Max, setT3Max] = useState("1");
  const [t3TriggerKills, setT3TriggerKills] = useState("100");
  const [firstKillExp, setFirstKillExp] = useState("2");
  const [firstKillGold, setFirstKillGold] = useState("2");

  useEffect(() => {
    if (bossConfig) {
      setEnabled(bossConfig.enabled !== false);
      setT1Max(String(bossConfig.tier1MaxInstances ?? 5));
      setT2Max(String(bossConfig.tier2MaxInstances ?? 1));
      setT3Max(String(bossConfig.tier3MaxInstances ?? 1));
      setT3TriggerKills(String(bossConfig.tier3TriggerKillCount ?? 100));
      setFirstKillExp(String(bossConfig.firstKillExpBonus ?? 2));
      setFirstKillGold(String(bossConfig.firstKillGoldBonus ?? 2));
    }
  }, [bossConfig]);

  const handleSave = () => {
    updateConfig.mutate({
      enabled,
      tier1MaxInstances: Number(t1Max),
      tier2MaxInstances: Number(t2Max),
      tier3MaxInstances: Number(t3Max),
      tier3TriggerKillCount: Number(t3TriggerKills),
      firstKillExpBonus: Number(firstKillExp),
      firstKillGoldBonus: Number(firstKillGold),
    });
  };

  return (
    <div className="space-y-4">
      <Card className="bg-background/50 border-border/50">
        <CardContent className="p-4 space-y-4">
          <h4 className="font-bold text-amber-400">⚙️ Boss 系統全域設定</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Boss 系統開關</label>
              <div className="flex items-center gap-2 mt-1">
                <Button size="sm" variant={enabled ? "default" : "outline"} onClick={() => setEnabled(true)}>啟用</Button>
                <Button size="sm" variant={!enabled ? "destructive" : "outline"} onClick={() => setEnabled(false)}>停用</Button>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">T1 同時最大數量</label>
              <Input value={t1Max} onChange={e => setT1Max(e.target.value)} type="number" min={0} max={20} className="mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">T2 同時最大數量</label>
              <Input value={t2Max} onChange={e => setT2Max(e.target.value)} type="number" min={0} max={10} className="mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">T3 同時最大數量</label>
              <Input value={t3Max} onChange={e => setT3Max(e.target.value)} type="number" min={0} max={5} className="mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">T3 觸發條件（T1 累計擊殺數）</label>
              <Input value={t3TriggerKills} onChange={e => setT3TriggerKills(e.target.value)} type="number" min={1} className="mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">首殺經驗倍率</label>
              <Input value={firstKillExp} onChange={e => setFirstKillExp(e.target.value)} type="number" min={1} max={10} step={0.5} className="mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">首殺金幣倍率</label>
              <Input value={firstKillGold} onChange={e => setFirstKillGold(e.target.value)} type="number" min={1} max={10} step={0.5} className="mt-1" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={updateConfig.isPending}>
              {updateConfig.isPending ? "儲存中..." : "💾 儲存設定"}
            </Button>
            <Button variant="outline" onClick={() => { if (confirm("確定要重置為預設值嗎？")) resetConfigMut.mutate(); }}
              disabled={resetConfigMut.isPending}>
              🔄 重置預設
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Boss 統計快覽 */}
      <BossStatsPanel />
    </div>
  );
}

/* Boss 統計快覽面板 */
function BossStatsPanel() {
  const { data: stats } = trpc.roamingBoss.getStats.useQuery();

  if (!stats) return null;

  return (
    <Card className="bg-background/50 border-border/50">
      <CardContent className="p-4 space-y-3">
        <h4 className="font-bold text-amber-400">📊 Boss 系統統計</h4>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-red-950/30 border border-red-800/30">
            <p className="text-2xl font-bold text-red-400">{stats.totalKills}</p>
            <p className="text-[10px] text-muted-foreground">總擊殺數</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-amber-950/30 border border-amber-800/30">
            <p className="text-2xl font-bold text-amber-400">{stats.totalChallenges}</p>
            <p className="text-[10px] text-muted-foreground">總挑戰數</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-green-950/30 border border-green-800/30">
            <p className="text-2xl font-bold text-green-400">{stats.activeInstances}</p>
            <p className="text-[10px] text-muted-foreground">活躍 Boss</p>
          </div>
        </div>
        {stats.topKillers && stats.topKillers.length > 0 && (
          <div>
            <p className="text-xs font-bold text-muted-foreground mb-1">擊殺排行 TOP 5</p>
            <div className="space-y-1">
              {stats.topKillers.slice(0, 5).map((k: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className={i < 3 ? "text-amber-400 font-bold" : "text-muted-foreground"}>#{i + 1} {k.agentName}</span>
                  <span className="text-red-400">{k.kills} 殺</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* Boss 編輯對話框 */
// 技能編輯器用的型別
interface BossSkill {
  id: string;
  name: string;
  skillType: "physical" | "magical" | "support";
  wuxing: string;
  damageMultiplier: number;
  mpCost: number;
  cooldown: number;
  description: string;
}

const BOSS_WUXING_OPTIONS = [
  { value: "水", label: "💧 水" },
  { value: "木", label: "🌿 木" },
  { value: "火", label: "🔥 火" },
  { value: "土", label: "🪨 土" },
  { value: "金", label: "⚔️ 金" },
];

function BossSkillEditor({ skills, onChange }: { skills: BossSkill[]; onChange: (s: BossSkill[]) => void }) {
  const addSkill = () => onChange([...skills, {
    id: `skill_${Date.now()}`, name: "", skillType: "physical", wuxing: "水",
    damageMultiplier: 1.5, mpCost: 10, cooldown: 2, description: "",
  }]);
  const removeSkill = (i: number) => onChange(skills.filter((_, idx) => idx !== i));
  const updateSkill = (i: number, field: keyof BossSkill, val: any) => {
    const updated = [...skills];
    updated[i] = { ...updated[i], [field]: val };
    onChange(updated);
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-muted-foreground font-medium">技能列表 ({skills.length} 個)</label>
        <Button size="sm" variant="outline" onClick={addSkill} className="h-6 text-xs px-2">+ 新增技能</Button>
      </div>
      {skills.length === 0 && (
        <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded">尚未設定技能，點擊新增</div>
      )}
      {skills.map((sk, i) => (
        <div key={i} className="border border-border/50 rounded p-2 space-y-2 bg-background/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-400">技能 {i + 1}</span>
            <Button size="sm" variant="ghost" onClick={() => removeSkill(i)} className="h-5 w-5 p-0 text-red-400 hover:text-red-300">×</Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs text-muted-foreground">技能名稱</label>
              <Input value={sk.name} onChange={e => updateSkill(i, "name", e.target.value)} className="h-7 text-xs" placeholder="如：暗影突襲" /></div>
            <div><label className="text-xs text-muted-foreground">類型</label>
              <Select value={sk.skillType} onValueChange={v => updateSkill(i, "skillType", v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="physical">⚔️ 物理</SelectItem>
                  <SelectItem value="magical">✨ 法術</SelectItem>
                  <SelectItem value="support">🛡️ 輔助</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><label className="text-xs text-muted-foreground">五行屬性</label>
              <Select value={sk.wuxing} onValueChange={v => updateSkill(i, "wuxing", v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{BOSS_WUXING_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-xs text-muted-foreground">傷害倍率</label>
              <Input type="number" step="0.1" value={sk.damageMultiplier} onChange={e => updateSkill(i, "damageMultiplier", Number(e.target.value))} className="h-7 text-xs" /></div>
            <div><label className="text-xs text-muted-foreground">MP 消耗</label>
              <Input type="number" value={sk.mpCost} onChange={e => updateSkill(i, "mpCost", Number(e.target.value))} className="h-7 text-xs" /></div>
            <div><label className="text-xs text-muted-foreground">冷卻回合</label>
              <Input type="number" value={sk.cooldown} onChange={e => updateSkill(i, "cooldown", Number(e.target.value))} className="h-7 text-xs" /></div>
          </div>
          <div><label className="text-xs text-muted-foreground">技能說明</label>
            <Input value={sk.description} onChange={e => updateSkill(i, "description", e.target.value)} className="h-7 text-xs" placeholder="技能效果說明" /></div>
        </div>
      ))}
    </div>
  );
}

function BossEditDialog({ boss, onClose, onSave, saving }: { boss: any; onClose: () => void; onSave: (data: any) => void; saving: boolean }) {
  const [name, setName] = useState(boss.name);
  const [title, setTitle] = useState(boss.title || "");
  const [tier, setTier] = useState(String(boss.tier));
  const [wuxing, setWuxing] = useState(boss.wuxing || "水");
  const [level, setLevel] = useState(String(boss.level));
  const [baseHp, setBaseHp] = useState(String(boss.baseHp));
  const [baseAttack, setBaseAttack] = useState(String(boss.baseAttack));
  const [baseDefense, setBaseDefense] = useState(String(boss.baseDefense));
  const [baseSpeed, setBaseSpeed] = useState(String(boss.baseSpeed));
  const [baseMagicAttack, setBaseMagicAttack] = useState(String(boss.baseMagicAttack));
  const [baseMagicDefense, setBaseMagicDefense] = useState(String(boss.baseMagicDefense));
  const [moveIntervalSec, setMoveIntervalSec] = useState(String(boss.moveIntervalSec));
  const [lifetimeMinutes, setLifetimeMinutes] = useState(String(boss.lifetimeMinutes));
  const [staminaCost, setStaminaCost] = useState(String(boss.staminaCost));
  const [expMultiplier, setExpMultiplier] = useState(String(boss.expMultiplier));
  const [goldMultiplier, setGoldMultiplier] = useState(String(boss.goldMultiplier));
  const [description, setDescription] = useState(boss.description || "");
  const [skills, setSkills] = useState<BossSkill[]>(() => {
    try { return Array.isArray(boss.skills) ? boss.skills : []; } catch { return []; }
  });
  // 掉落表結構化
  interface DropItem { itemId: string; itemName: string; dropRate: number; minQty: number; maxQty: number; }
  const [dropItems, setDropItems] = useState<DropItem[]>(() => {
    try { return Array.isArray(boss.dropTable) ? boss.dropTable : []; } catch { return []; }
  });
  const addDropItem = () => setDropItems(d => [...d, { itemId: "", itemName: "", dropRate: 0.1, minQty: 1, maxQty: 1 }]);
  const removeDropItem = (i: number) => setDropItems(d => d.filter((_, idx) => idx !== i));
  const updateDropItem = (i: number, field: keyof DropItem, val: any) => setDropItems(d => d.map((x, idx) => idx === i ? { ...x, [field]: val } : x));

  // 巡邏區域結構化
  const TW_COUNTIES = ["台北市","新北市","桃園市","台中市","台南市","高雄市","基隆市","新竹市","新竹縣","苗栗縣","苗栗市","彰化縣","南投縣","雲林縣","嘉義市","嘉義縣","台東縣","花蓮縣","屏東縣","金門縣","連江縣","澎湖縣"];
  const [patrolRegion, setPatrolRegion] = useState<string[]>(() => {
    try { return Array.isArray(boss.patrolRegion) ? boss.patrolRegion : []; } catch { return []; }
  });
  const toggleRegion = (county: string) => setPatrolRegion(r => r.includes(county) ? r.filter(x => x !== county) : [...r, county]);

  // 狂暴設定結構化
  interface EnrageThreshold { hpPercent: number; atkBoost: number; spdBoost: number; message: string; }
  const [enrageThresholds, setEnrageThresholds] = useState<EnrageThreshold[]>(() => {
    try { const cfg = boss.enrageConfig || {}; return Array.isArray(cfg.hpThresholds) ? cfg.hpThresholds : []; } catch { return []; }
  });
  const addEnrage = () => setEnrageThresholds(t => [...t, { hpPercent: 50, atkBoost: 0.2, spdBoost: 0.1, message: "進入狂暴狀態！" }]);
  const removeEnrage = (i: number) => setEnrageThresholds(t => t.filter((_, idx) => idx !== i));
  const updateEnrage = (i: number, field: keyof EnrageThreshold, val: any) => setEnrageThresholds(t => t.map((x, idx) => idx === i ? { ...x, [field]: val } : x));

  // 排程設定結構化
  const [scheduleType, setScheduleType] = useState<"always" | "scheduled">(() => {
    try { return (boss.scheduleConfig?.type === "scheduled") ? "scheduled" : "always"; } catch { return "always"; }
  });
  const [maxInstances, setMaxInstances] = useState(String(boss.scheduleConfig?.maxInstances ?? 1));
  const [scheduleCron, setScheduleCron] = useState(boss.scheduleConfig?.cron ?? "0 0 12 * * *");
  const [scheduleDuration, setScheduleDuration] = useState(String(boss.scheduleConfig?.duration ?? 30));
  // 新增欄位
  const [baseMP, setBaseMP] = useState(String(boss.baseMP ?? 200));
  const [goldDrop, setGoldDrop] = useState(String(boss.goldDrop ?? 0));
  const [minionIds, setMinionIds] = useState<string[]>(() => {
    try { return Array.isArray(boss.minionIds) ? boss.minionIds : []; } catch { return []; }
  });
  const [resistWood, setResistWood] = useState(String(boss.resistWood ?? 0));
  const [resistFire, setResistFire] = useState(String(boss.resistFire ?? 0));
  const [resistEarth, setResistEarth] = useState(String(boss.resistEarth ?? 0));
  const [resistMetal, setResistMetal] = useState(String(boss.resistMetal ?? 0));
  const [resistWater, setResistWater] = useState(String(boss.resistWater ?? 0));

  const handleSubmit = () => {
    onSave({
      name, title, tier: Number(tier), wuxing, level: Number(level),
      baseHp: Number(baseHp), baseAttack: Number(baseAttack), baseDefense: Number(baseDefense),
      baseSpeed: Number(baseSpeed), baseMagicAttack: Number(baseMagicAttack), baseMagicDefense: Number(baseMagicDefense),
      moveIntervalSec: Number(moveIntervalSec), lifetimeMinutes: Number(lifetimeMinutes),
      staminaCost: Number(staminaCost), expMultiplier: Number(expMultiplier), goldMultiplier: Number(goldMultiplier),
      description, skills,
      dropTable: dropItems,
      patrolRegion,
      baseMP: Number(baseMP), goldDrop: Number(goldDrop), minionIds,
      resistWood: Number(resistWood), resistFire: Number(resistFire),
      resistEarth: Number(resistEarth), resistMetal: Number(resistMetal), resistWater: Number(resistWater),
      enrageConfig: { hpThresholds: enrageThresholds },
      scheduleConfig: scheduleType === "always"
        ? { type: "always", maxInstances: Number(maxInstances) }
        : { type: "scheduled", cron: scheduleCron, duration: Number(scheduleDuration), maxInstances: Number(maxInstances) },
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>✏️ 編輯 Boss：{boss.name}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs text-muted-foreground">名稱</label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div><label className="text-xs text-muted-foreground">稱號</label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div><label className="text-xs text-muted-foreground">Tier</label>
            <Select value={tier} onValueChange={setTier}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">T1 遊走精英</SelectItem>
                <SelectItem value="2">T2 區域守護者</SelectItem>
                <SelectItem value="3">T3 天命凶獸</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><label className="text-xs text-muted-foreground">五行屬性</label>
            <Select value={wuxing} onValueChange={setWuxing}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{BOSS_WUXING_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><label className="text-xs text-muted-foreground">等級</label><Input type="number" value={level} onChange={e => setLevel(e.target.value)} /></div>
          <div><label className="text-xs text-muted-foreground">HP</label><Input type="number" value={baseHp} onChange={e => setBaseHp(e.target.value)} /></div>
          <div><label className="text-xs text-muted-foreground">ATK</label><Input type="number" value={baseAttack} onChange={e => setBaseAttack(e.target.value)} /></div>
          <div><label className="text-xs text-muted-foreground">DEF</label><Input type="number" value={baseDefense} onChange={e => setBaseDefense(e.target.value)} /></div>
          <div><label className="text-xs text-muted-foreground">SPD</label><Input type="number" value={baseSpeed} onChange={e => setBaseSpeed(e.target.value)} /></div>
          <div><label className="text-xs text-muted-foreground">MATK</label><Input type="number" value={baseMagicAttack} onChange={e => setBaseMagicAttack(e.target.value)} /></div>
          <div><label className="text-xs text-muted-foreground">MDEF</label><Input type="number" value={baseMagicDefense} onChange={e => setBaseMagicDefense(e.target.value)} /></div>
          <div><label className="text-xs text-muted-foreground">移動間隔(秒)</label><Input type="number" value={moveIntervalSec} onChange={e => setMoveIntervalSec(e.target.value)} /></div>
          <div><label className="text-xs text-muted-foreground">存活時間(分)</label><Input type="number" value={lifetimeMinutes} onChange={e => setLifetimeMinutes(e.target.value)} /></div>
          <div><label className="text-xs text-muted-foreground">體力消耗</label><Input type="number" value={staminaCost} onChange={e => setStaminaCost(e.target.value)} /></div>
          <div><label className="text-xs text-muted-foreground">EXP 倍率</label><Input type="number" step="0.1" value={expMultiplier} onChange={e => setExpMultiplier(e.target.value)} /></div>
          <div><label className="text-xs text-muted-foreground">Gold 倍率</label><Input type="number" step="0.1" value={goldMultiplier} onChange={e => setGoldMultiplier(e.target.value)} /></div>
          <div><label className="text-xs text-muted-foreground">MP</label><Input type="number" value={baseMP} onChange={e => setBaseMP(e.target.value)} /></div>
          <div><label className="text-xs text-muted-foreground">金幣掉落</label><Input type="number" value={goldDrop} onChange={e => setGoldDrop(e.target.value)} /></div>
        </div>
        {/* 五行抗性 */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground font-medium">五行抗性（0-50%）</label>
          <div className="grid grid-cols-5 gap-2">
            <div><label className="text-xs text-muted-foreground">抗木%</label><Input type="number" min="0" max="50" value={resistWood} onChange={e => setResistWood(e.target.value)} className="h-7 text-xs" /></div>
            <div><label className="text-xs text-muted-foreground">抗火%</label><Input type="number" min="0" max="50" value={resistFire} onChange={e => setResistFire(e.target.value)} className="h-7 text-xs" /></div>
            <div><label className="text-xs text-muted-foreground">抗土%</label><Input type="number" min="0" max="50" value={resistEarth} onChange={e => setResistEarth(e.target.value)} className="h-7 text-xs" /></div>
            <div><label className="text-xs text-muted-foreground">抗金%</label><Input type="number" min="0" max="50" value={resistMetal} onChange={e => setResistMetal(e.target.value)} className="h-7 text-xs" /></div>
            <div><label className="text-xs text-muted-foreground">抗水%</label><Input type="number" min="0" max="50" value={resistWater} onChange={e => setResistWater(e.target.value)} className="h-7 text-xs" /></div>
          </div>
        </div>
        {/* 護衛小兵 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground font-medium">護衛小兵 ID（來自怪物圖鑑）</label>
            <Button size="sm" variant="outline" onClick={() => setMinionIds(m => [...m, ""])} className="h-6 text-xs px-2">+ 新增</Button>
          </div>
          {minionIds.length === 0 && <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded">未設定護衛小兵</div>}
          {minionIds.map((id, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input value={id} onChange={e => setMinionIds(m => m.map((x, idx) => idx === i ? e.target.value : x))} className="h-7 text-xs" placeholder="怪物圖鑑 ID，如：slime_01" />
              <Button size="sm" variant="ghost" onClick={() => setMinionIds(m => m.filter((_, idx) => idx !== i))} className="h-7 w-7 p-0 text-red-400">×</Button>
            </div>
          ))}
        </div>
        <div><label className="text-xs text-muted-foreground">描述</label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} /></div>
        <BossSkillEditor skills={skills} onChange={setSkills} />

        {/* 掉落表結構化 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground font-medium">掉落表 ({dropItems.length} 項)</label>
            <Button size="sm" variant="outline" onClick={addDropItem} className="h-6 text-xs px-2">+ 新增掉落</Button>
          </div>
          {dropItems.length === 0 && <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded">尚未設定掉落，點擊新增</div>}
          {dropItems.map((item, i) => (
            <div key={i} className="border border-border/50 rounded p-2 bg-background/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-amber-400">掉落 {i + 1}</span>
                <Button size="sm" variant="ghost" onClick={() => removeDropItem(i)} className="h-5 w-5 p-0 text-red-400">×</Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-muted-foreground">物品 ID</label><Input value={item.itemId} onChange={e => updateDropItem(i, "itemId", e.target.value)} className="h-7 text-xs" placeholder="e.g. ancient_stone" /></div>
                <div><label className="text-xs text-muted-foreground">物品名稱</label><Input value={item.itemName} onChange={e => updateDropItem(i, "itemName", e.target.value)} className="h-7 text-xs" placeholder="如：遠古岩石" /></div>
                <div><label className="text-xs text-muted-foreground">掉落機率 (0-1)</label><Input type="number" step="0.01" min="0" max="1" value={item.dropRate} onChange={e => updateDropItem(i, "dropRate", Number(e.target.value))} className="h-7 text-xs" /></div>
                <div><label className="text-xs text-muted-foreground">最少數量</label><Input type="number" min="1" value={item.minQty} onChange={e => updateDropItem(i, "minQty", Number(e.target.value))} className="h-7 text-xs" /></div>
                <div><label className="text-xs text-muted-foreground">最多數量</label><Input type="number" min="1" value={item.maxQty} onChange={e => updateDropItem(i, "maxQty", Number(e.target.value))} className="h-7 text-xs" /></div>
              </div>
            </div>
          ))}
        </div>

        {/* 巡邏區域結構化 */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground font-medium">巡邏區域 ({patrolRegion.length} 個縣市)</label>
          <div className="flex flex-wrap gap-1.5">
            {TW_COUNTIES.map(county => (
              <button key={county} type="button"
                onClick={() => toggleRegion(county)}
                className={`text-xs px-2 py-1 rounded border transition-colors ${
                  patrolRegion.includes(county)
                    ? "bg-amber-600 border-amber-500 text-white"
                    : "bg-background/30 border-border/50 text-muted-foreground hover:border-amber-500/50"
                }`}>
                {county}
              </button>
            ))}
          </div>
          {patrolRegion.length === 0 && <p className="text-xs text-muted-foreground">未選區域表示全區巡邏</p>}
        </div>

        {/* 狂暴設定結構化 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground font-medium">狂暴閥値 ({enrageThresholds.length} 階段)</label>
            <Button size="sm" variant="outline" onClick={addEnrage} className="h-6 text-xs px-2">+ 新增閥値</Button>
          </div>
          {enrageThresholds.length === 0 && <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded">尚未設定狂暴閥値</div>}
          {enrageThresholds.map((t, i) => (
            <div key={i} className="border border-border/50 rounded p-2 bg-background/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-red-400">閥値 {i + 1}</span>
                <Button size="sm" variant="ghost" onClick={() => removeEnrage(i)} className="h-5 w-5 p-0 text-red-400">×</Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-muted-foreground">HP 百分比 (%)</label><Input type="number" min="1" max="99" value={t.hpPercent} onChange={e => updateEnrage(i, "hpPercent", Number(e.target.value))} className="h-7 text-xs" /></div>
                <div><label className="text-xs text-muted-foreground">攻擊加成 (0.2=+20%)</label><Input type="number" step="0.05" min="0" value={t.atkBoost} onChange={e => updateEnrage(i, "atkBoost", Number(e.target.value))} className="h-7 text-xs" /></div>
                <div><label className="text-xs text-muted-foreground">速度加成 (0.1=+10%)</label><Input type="number" step="0.05" min="0" value={t.spdBoost} onChange={e => updateEnrage(i, "spdBoost", Number(e.target.value))} className="h-7 text-xs" /></div>
                <div><label className="text-xs text-muted-foreground">狂暴訊息</label><Input value={t.message} onChange={e => updateEnrage(i, "message", e.target.value)} className="h-7 text-xs" placeholder="進入狂暴！" /></div>
              </div>
            </div>
          ))}
        </div>

        {/* 排程設定結構化 */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground font-medium">排程設定</label>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs text-muted-foreground">出現模式</label>
              <Select value={scheduleType} onValueChange={(v: any) => setScheduleType(v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="always">常駐出現</SelectItem>
                  <SelectItem value="scheduled">排程出現</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><label className="text-xs text-muted-foreground">最大同時實例數</label><Input type="number" min="1" max="10" value={maxInstances} onChange={e => setMaxInstances(e.target.value)} className="h-8 text-xs" /></div>
            {scheduleType === "scheduled" && (
              <>
                <div className="col-span-2"><label className="text-xs text-muted-foreground">Cron 表達式（6欄）</label><Input value={scheduleCron} onChange={e => setScheduleCron(e.target.value)} className="h-8 text-xs font-mono" placeholder="0 0 12 * * *" /></div>
                <div><label className="text-xs text-muted-foreground">持續時間(分)</label><Input type="number" min="5" value={scheduleDuration} onChange={e => setScheduleDuration(e.target.value)} className="h-8 text-xs" /></div>
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? "儲存中..." : "💾 儲存"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* Boss 新增對話框 */
function BossCreateDialog({ onClose, onSave, saving }: { onClose: () => void; onSave: (data: any) => void; saving: boolean }) {
  const [bossCode, setBossCode] = useState("");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [tier, setTier] = useState("1");
  const [wuxing, setWuxing] = useState("水");
  const [level, setLevel] = useState("30");
  const [baseHp, setBaseHp] = useState("10000");
  const [baseAttack, setBaseAttack] = useState("120");
  const [baseDefense, setBaseDefense] = useState("60");
  const [baseSpeed, setBaseSpeed] = useState("25");
  const [baseMagicAttack, setBaseMagicAttack] = useState("100");
  const [baseMagicDefense, setBaseMagicDefense] = useState("50");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState<BossSkill[]>([]);

  const handleSubmit = () => {
    if (!bossCode || !name) { alert("Boss 代碼和名稱必填"); return; }
    onSave({
      bossCode, name, title, tier: Number(tier), wuxing, level: Number(level),
      baseHp: Number(baseHp), baseAttack: Number(baseAttack), baseDefense: Number(baseDefense),
      baseSpeed: Number(baseSpeed), baseMagicAttack: Number(baseMagicAttack), baseMagicDefense: Number(baseMagicDefense),
      moveIntervalSec: tier === "1" ? 300 : tier === "2" ? 600 : 900,
      lifetimeMinutes: tier === "1" ? 0 : tier === "2" ? 30 : 60,
      staminaCost: tier === "1" ? 15 : tier === "2" ? 25 : 40,
      expMultiplier: tier === "1" ? 2.0 : tier === "2" ? 3.0 : 5.0,
      goldMultiplier: tier === "1" ? 2.0 : tier === "2" ? 3.0 : 5.0,
      description, skills,
      dropTable: [], patrolRegion: [],
      enrageConfig: { hpThresholds: [{ hpPercent: 50, atkBoost: 0.2, spdBoost: 0.1, message: "Boss 進入狂暴！" }] },
      scheduleConfig: tier === "1" ? { type: "permanent" } : { type: "scheduled", cron: "0 0 12 * * *", duration: 30, maxInstances: 1 },
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>➕ 新增 Boss</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs text-muted-foreground">Boss 代碼（英文）</label><Input value={bossCode} onChange={e => setBossCode(e.target.value)} placeholder="e.g. shadow_wolf" /></div>
          <div><label className="text-xs text-muted-foreground">名稱 *</label><Input value={name} onChange={e => setName(e.target.value)} placeholder="如：魔狼王" /></div>
          <div><label className="text-xs text-muted-foreground">稱號</label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="如：暗影之王" /></div>
          <div><label className="text-xs text-muted-foreground">Tier 等階</label>
            <Select value={tier} onValueChange={setTier}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">T1 遊走精英</SelectItem>
                <SelectItem value="2">T2 區域守護者</SelectItem>
                <SelectItem value="3">T3 天命凶獸</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><label className="text-xs text-muted-foreground">五行屬性</label>
            <Select value={wuxing} onValueChange={setWuxing}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{BOSS_WUXING_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><label className="text-xs text-muted-foreground">等級</label><Input type="number" value={level} onChange={e => setLevel(e.target.value)} /></div>
          <div><label className="text-xs text-muted-foreground">HP</label><Input type="number" value={baseHp} onChange={e => setBaseHp(e.target.value)} /></div>
          <div><label className="text-xs text-muted-foreground">ATK</label><Input type="number" value={baseAttack} onChange={e => setBaseAttack(e.target.value)} /></div>
          <div><label className="text-xs text-muted-foreground">DEF</label><Input type="number" value={baseDefense} onChange={e => setBaseDefense(e.target.value)} /></div>
          <div><label className="text-xs text-muted-foreground">SPD</label><Input type="number" value={baseSpeed} onChange={e => setBaseSpeed(e.target.value)} /></div>
          <div><label className="text-xs text-muted-foreground">MATK</label><Input type="number" value={baseMagicAttack} onChange={e => setBaseMagicAttack(e.target.value)} /></div>
          <div><label className="text-xs text-muted-foreground">MDEF</label><Input type="number" value={baseMagicDefense} onChange={e => setBaseMagicDefense(e.target.value)} /></div>
        </div>
        <div><label className="text-xs text-muted-foreground">描述</label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="描述這隻 Boss 的背景與特性" /></div>
        <BossSkillEditor skills={skills} onChange={setSkills} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? "建立中..." : "✅ 建立 Boss"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
