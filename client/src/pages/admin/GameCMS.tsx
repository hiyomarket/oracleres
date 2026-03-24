import { useState } from "react";
import { trpc } from "@/lib/trpc";
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

// ─── Monsters Tab ─────────────────────────────────────────────────────────────
function MonstersTab() {
  const utils = trpc.useUtils();
  const { data: monsters = [], isLoading } = trpc.gameAdmin.getMonsters.useQuery();
  const createMutation = trpc.gameAdmin.createMonster.useMutation({
    onSuccess: () => { utils.gameAdmin.getMonsters.invalidate(); toast.success("怪物已新增"); setOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.gameAdmin.updateMonster.useMutation({
    onSuccess: () => { utils.gameAdmin.getMonsters.invalidate(); toast.success("已更新"); setOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.gameAdmin.deleteMonster.useMutation({
    onSuccess: () => { utils.gameAdmin.getMonsters.invalidate(); toast.success("已刪除"); },
    onError: (e) => toast.error(e.message),
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", wuxing: "木" as typeof WUXING_OPTIONS[number], baseHp: 100, baseAttack: 20, baseDefense: 10, baseSpeed: 10, imageUrl: "", catchRate: 0.1 });

  const openCreate = () => { setEditing(null); setForm({ name: "", wuxing: "木", baseHp: 100, baseAttack: 20, baseDefense: 10, baseSpeed: 10, imageUrl: "", catchRate: 0.1 }); setOpen(true); };
  const openEdit = (m: any) => { setEditing(m); setForm({ name: m.name, wuxing: m.wuxing, baseHp: m.baseHp, baseAttack: m.baseAttack, baseDefense: m.baseDefense, baseSpeed: m.baseSpeed, imageUrl: m.imageUrl ?? "", catchRate: m.catchRate }); setOpen(true); };

  const handleSubmit = () => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">怪物管理（{monsters.length} 筆）</h2>
        <Button onClick={openCreate} size="sm">+ 新增怪物</Button>
      </div>
      {isLoading ? <p className="text-muted-foreground">載入中…</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2 px-3">ID</th>
                <th className="text-left py-2 px-3">名稱</th>
                <th className="text-left py-2 px-3">五行</th>
                <th className="text-left py-2 px-3">HP</th>
                <th className="text-left py-2 px-3">攻擊</th>
                <th className="text-left py-2 px-3">防禦</th>
                <th className="text-left py-2 px-3">速度</th>
                <th className="text-left py-2 px-3">捕捉率</th>
                <th className="text-left py-2 px-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {monsters.map((m: any) => (
                <tr key={m.id} className="border-b hover:bg-muted/30">
                  <td className="py-2 px-3 text-muted-foreground">{m.id}</td>
                  <td className="py-2 px-3 font-medium">{m.name}</td>
                  <td className="py-2 px-3"><WuxingBadge wuxing={m.wuxing} /></td>
                  <td className="py-2 px-3">{m.baseHp}</td>
                  <td className="py-2 px-3">{m.baseAttack}</td>
                  <td className="py-2 px-3">{m.baseDefense}</td>
                  <td className="py-2 px-3">{m.baseSpeed}</td>
                  <td className="py-2 px-3">{(m.catchRate * 100).toFixed(0)}%</td>
                  <td className="py-2 px-3 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(m)}>編輯</Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate({ id: m.id })}>刪除</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "編輯怪物" : "新增怪物"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="名稱" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <Select value={form.wuxing} onValueChange={(v) => setForm(f => ({ ...f, wuxing: v as any }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{WUXING_OPTIONS.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="HP" value={form.baseHp} onChange={e => setForm(f => ({ ...f, baseHp: +e.target.value }))} />
              <Input type="number" placeholder="攻擊" value={form.baseAttack} onChange={e => setForm(f => ({ ...f, baseAttack: +e.target.value }))} />
              <Input type="number" placeholder="防禦" value={form.baseDefense} onChange={e => setForm(f => ({ ...f, baseDefense: +e.target.value }))} />
              <Input type="number" placeholder="速度" value={form.baseSpeed} onChange={e => setForm(f => ({ ...f, baseSpeed: +e.target.value }))} />
            </div>
            <Input type="number" step="0.01" min="0" max="1" placeholder="捕捉率 (0-1)" value={form.catchRate} onChange={e => setForm(f => ({ ...f, catchRate: +e.target.value }))} />
            <Input placeholder="圖片 URL（可留空）" value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Skills Tab ───────────────────────────────────────────────────────────────
function SkillsTab() {
  const utils = trpc.useUtils();
  const { data: skills = [], isLoading } = trpc.gameAdmin.getSkills.useQuery();
  const createMutation = trpc.gameAdmin.createSkill.useMutation({
    onSuccess: () => { utils.gameAdmin.getSkills.invalidate(); toast.success("技能已新增"); setOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.gameAdmin.deleteSkill.useMutation({
    onSuccess: () => { utils.gameAdmin.getSkills.invalidate(); toast.success("已刪除"); },
    onError: (e) => toast.error(e.message),
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", wuxing: "木" as typeof WUXING_OPTIONS[number], mpCost: 10, damageMultiplier: 1.0, skillType: "attack" as "attack" | "heal" | "buff" | "debuff" });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">技能管理（{skills.length} 筆）</h2>
        <Button onClick={() => setOpen(true)} size="sm">+ 新增技能</Button>
      </div>
      {isLoading ? <p className="text-muted-foreground">載入中…</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2 px-3">ID</th>
                <th className="text-left py-2 px-3">名稱</th>
                <th className="text-left py-2 px-3">五行</th>
                <th className="text-left py-2 px-3">MP</th>
                <th className="text-left py-2 px-3">倍率</th>
                <th className="text-left py-2 px-3">類型</th>
                <th className="text-left py-2 px-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {skills.map((s: any) => (
                <tr key={s.id} className="border-b hover:bg-muted/30">
                  <td className="py-2 px-3 text-muted-foreground">{s.id}</td>
                  <td className="py-2 px-3 font-medium">{s.name}</td>
                  <td className="py-2 px-3"><WuxingBadge wuxing={s.wuxing} /></td>
                  <td className="py-2 px-3">{s.mpCost}</td>
                  <td className="py-2 px-3">{s.damageMultiplier}x</td>
                  <td className="py-2 px-3">{s.skillType}</td>
                  <td className="py-2 px-3">
                    <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate({ id: s.id })}>刪除</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>新增技能</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="技能名稱" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <Textarea placeholder="技能描述（可留空）" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={form.wuxing} onValueChange={(v) => setForm(f => ({ ...f, wuxing: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{WUXING_OPTIONS.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={form.skillType} onValueChange={(v) => setForm(f => ({ ...f, skillType: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="attack">攻擊</SelectItem>
                  <SelectItem value="heal">治療</SelectItem>
                  <SelectItem value="buff">增益</SelectItem>
                  <SelectItem value="debuff">減益</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="MP 消耗" value={form.mpCost} onChange={e => setForm(f => ({ ...f, mpCost: +e.target.value }))} />
              <Input type="number" step="0.1" placeholder="傷害倍率" value={form.damageMultiplier} onChange={e => setForm(f => ({ ...f, damageMultiplier: +e.target.value }))} />
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

// ─── Achievements Tab ─────────────────────────────────────────────────────────
function AchievementsTab() {
  const utils = trpc.useUtils();
  const { data: achievements = [], isLoading } = trpc.gameAdmin.getAchievements.useQuery();
  const createMutation = trpc.gameAdmin.createAchievement.useMutation({
    onSuccess: () => { utils.gameAdmin.getAchievements.invalidate(); toast.success("成就已新增"); setOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.gameAdmin.deleteAchievement.useMutation({
    onSuccess: () => { utils.gameAdmin.getAchievements.invalidate(); toast.success("已刪除"); },
    onError: (e) => toast.error(e.message),
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    category: "avatar" as "avatar" | "explore" | "combat" | "oracle",
    title: "",
    description: "",
    conditionType: "buy_items",
    conditionValue: 1,
    rewardType: "stones" as "stones" | "coins" | "title" | "item" | "frame",
    rewardAmount: 10,
    iconUrl: "",
  });

  const CATEGORY_LABELS: Record<string, string> = { avatar: "靈相", explore: "探索", combat: "戰鬥", oracle: "問卜" };
  const REWARD_LABELS: Record<string, string> = { stones: "靈石", coins: "天命幣", title: "稱號", item: "道具", frame: "頭像框" };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">成就管理（{achievements.length} 筆）</h2>
        <Button onClick={() => setOpen(true)} size="sm">+ 新增成就</Button>
      </div>
      {isLoading ? <p className="text-muted-foreground">載入中…</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2 px-3">ID</th>
                <th className="text-left py-2 px-3">分類</th>
                <th className="text-left py-2 px-3">名稱</th>
                <th className="text-left py-2 px-3">條件</th>
                <th className="text-left py-2 px-3">獎勵</th>
                <th className="text-left py-2 px-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {achievements.map((a: any) => (
                <tr key={a.id} className="border-b hover:bg-muted/30">
                  <td className="py-2 px-3 text-muted-foreground">{a.id}</td>
                  <td className="py-2 px-3"><Badge variant="outline">{CATEGORY_LABELS[a.category] ?? a.category}</Badge></td>
                  <td className="py-2 px-3 font-medium">{a.title}</td>
                  <td className="py-2 px-3 text-xs text-muted-foreground">{a.conditionType} × {a.conditionValue}</td>
                  <td className="py-2 px-3 text-xs">{REWARD_LABELS[a.rewardType] ?? a.rewardType} +{a.rewardAmount}</td>
                  <td className="py-2 px-3">
                    <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate({ id: a.id })}>刪除</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>新增成就</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="avatar">靈相</SelectItem>
                  <SelectItem value="explore">探索</SelectItem>
                  <SelectItem value="combat">戰鬥</SelectItem>
                  <SelectItem value="oracle">問卜</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="成就名稱" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <Textarea placeholder="成就描述" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="條件類型（如 buy_items）" value={form.conditionType} onChange={e => setForm(f => ({ ...f, conditionType: e.target.value }))} />
              <Input type="number" placeholder="條件數值" value={form.conditionValue} onChange={e => setForm(f => ({ ...f, conditionValue: +e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select value={form.rewardType} onValueChange={(v) => setForm(f => ({ ...f, rewardType: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="stones">靈石</SelectItem>
                  <SelectItem value="coins">天命幣</SelectItem>
                  <SelectItem value="title">稱號</SelectItem>
                  <SelectItem value="item">道具</SelectItem>
                  <SelectItem value="frame">頭像框</SelectItem>
                </SelectContent>
              </Select>
              <Input type="number" placeholder="獎勵數量" value={form.rewardAmount} onChange={e => setForm(f => ({ ...f, rewardAmount: +e.target.value }))} />
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
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/game-theater")} className="shrink-0">
            🎭 遊戲劇院
          </Button>
        </div>

        <Tabs defaultValue="monsters">
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="monsters">怪物</TabsTrigger>
            <TabsTrigger value="skills">技能</TabsTrigger>
            <TabsTrigger value="inv-items">遊戲道具</TabsTrigger>
            <TabsTrigger value="virtual-shop">虛界商店</TabsTrigger>
            <TabsTrigger value="spirit-shop">靈相商店</TabsTrigger>
            <TabsTrigger value="hidden-shop">密店商品池</TabsTrigger>
            <TabsTrigger value="achievements">成就</TabsTrigger>
            <TabsTrigger value="items">紙娃娃商城</TabsTrigger>
            <TabsTrigger value="catalog-monsters">🐉 怪物圖鑑</TabsTrigger>
            <TabsTrigger value="catalog-items">🎒 道具圖鑑</TabsTrigger>
            <TabsTrigger value="catalog-equipment">⚔️ 裝備圖鑑</TabsTrigger>
            <TabsTrigger value="catalog-skills">✨ 技能圖鑑</TabsTrigger>
          </TabsList>

          <Card>
            <CardContent className="pt-6">
              <TabsContent value="monsters"><MonstersTab /></TabsContent>
              <TabsContent value="skills"><SkillsTab /></TabsContent>
              <TabsContent value="inv-items"><InventoryItemsTab /></TabsContent>
              <TabsContent value="virtual-shop"><VirtualShopTab /></TabsContent>
              <TabsContent value="spirit-shop"><SpiritShopTab /></TabsContent>
              <TabsContent value="hidden-shop"><HiddenShopTab /></TabsContent>
              <TabsContent value="achievements"><AchievementsTab /></TabsContent>
              <TabsContent value="items"><GameItemsTab /></TabsContent>
              <TabsContent value="catalog-monsters"><MonsterCatalogTab /></TabsContent>
              <TabsContent value="catalog-items"><ItemCatalogTab /></TabsContent>
              <TabsContent value="catalog-equipment"><EquipmentCatalogTab /></TabsContent>
              <TabsContent value="catalog-skills"><SkillCatalogTab /></TabsContent>
            </CardContent>
          </Card>
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

  const [open, setOpen] = useState(false);
  const defaultForm = { itemKey: "", displayName: "", description: "", priceCoins: 100, quantity: 1, stock: -1, nodeId: "", sortOrder: 0, isOnSale: 1 as number };
  const [form, setForm] = useState(defaultForm);

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
                <th className="text-left py-2 px-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {shopItems.map((item: any) => (
                <tr key={item.id} className="border-b hover:bg-muted/30">
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
                  <td className="py-2 px-2 flex gap-1">
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
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="綁定節點 ID（留空=全圖）" value={form.nodeId} onChange={e => setForm(f => ({ ...f, nodeId: e.target.value }))} />
              <Input type="number" placeholder="排序順序" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: +e.target.value }))} />
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

  const [open, setOpen] = useState(false);
  const defaultForm = { itemKey: "", displayName: "", description: "", priceStones: 50, quantity: 1, rarity: "rare" as "common" | "rare" | "epic" | "legendary", sortOrder: 0, isOnSale: 1 as number };
  const [form, setForm] = useState(defaultForm);
  const RARITY_COLORS: Record<string, string> = { common: "#888", rare: "#3B82F6", epic: "#8B5CF6", legendary: "#F59E0B" };
  const RARITY_ZH: Record<string, string> = { common: "普通", rare: "稀有", epic: "史詩", legendary: "傳說" };

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
                <th className="text-left py-2 px-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {shopItems.map((item: any) => (
                <tr key={item.id} className="border-b hover:bg-muted/30">
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
                  <td className="py-2 px-2 flex gap-1">
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

  const [open, setOpen] = useState(false);
  const defaultForm = { itemKey: "", displayName: "", description: "", currencyType: "coins" as "coins" | "stones", price: 200, quantity: 1, weight: 10, rarity: "rare" as "common" | "rare" | "epic" | "legendary", isActive: 1 as number };
  const [form, setForm] = useState(defaultForm);
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
                <th className="text-left py-2 px-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {poolItems.map((item: any) => (
                <tr key={item.id} className="border-b hover:bg-muted/30">
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
