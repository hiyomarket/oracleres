import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { MonsterCatalogV2Tab, ItemCatalogV2Tab, EquipCatalogV2Tab, SkillCatalogV2Tab, AchievementCatalogTab, MonsterSkillCatalogTab } from "@/components/admin/CatalogTabs";
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
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "編輯怪物" : "新增怪物"}</DialogTitle></DialogHeader>
          <div className="flex gap-4">
            <div className="flex-1 space-y-3">
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
            <div className="w-[240px] shrink-0 hidden md:block">
              <MonsterPreview data={form} />
            </div>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>新增技能</DialogTitle></DialogHeader>
          <div className="flex gap-4">
            <div className="flex-1 space-y-3">
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
            <div className="w-[240px] shrink-0 hidden md:block">
              <SkillPreview data={{ name: form.name, wuxing: form.wuxing, category: "active", basePower: Math.round((form.damageMultiplier ?? 1) * 100), mpCost: form.mpCost, description: form.description }} />
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
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>新增成就</DialogTitle></DialogHeader>
          <div className="flex gap-4">
            <div className="flex-1 space-y-3">
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
            <div className="w-[240px] shrink-0 hidden md:block">
              <AchievementPreview data={{ name: form.title, description: form.description, category: form.category, tier: "bronze", rewardGold: form.rewardType === "coins" ? form.rewardAmount : 0, rewardExp: 0 }} />
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
          <div className="flex gap-2 shrink-0">
            {/* Bug 4 fix: 返回遊戲世界按鈕 */}
            <Button variant="outline" size="sm" onClick={() => navigate("/game")} className="shrink-0">
              🌏 返回遊戲
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/game-theater")} className="shrink-0">
              🎭 遊戲劇院
            </Button>
          </div>
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
            <TabsTrigger value="catalog-monsters">🐉 魔物建製</TabsTrigger>
            <TabsTrigger value="catalog-items">🎒 道具圖鑑</TabsTrigger>
            <TabsTrigger value="catalog-equipment">⚔️ 裝備圖鑑</TabsTrigger>
            <TabsTrigger value="catalog-skills">✨ 技能圖鑑</TabsTrigger>
            <TabsTrigger value="catalog-achievements">🏆 成就系統</TabsTrigger>
            <TabsTrigger value="catalog-monster-skills">🐲 魔物技能</TabsTrigger>
            <TabsTrigger value="catalog-stats">📊 圖鑑統計</TabsTrigger>
            <TabsTrigger value="balance">⚖️ 數值平衡</TabsTrigger>
            <TabsTrigger value="ai-tools">🤖 AI 工具</TabsTrigger>
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
              <TabsContent value="catalog-monsters"><MonsterCatalogV2Tab /></TabsContent>
              <TabsContent value="catalog-items"><ItemCatalogV2Tab /></TabsContent>
              <TabsContent value="catalog-equipment"><EquipCatalogV2Tab /></TabsContent>
              <TabsContent value="catalog-skills"><SkillCatalogV2Tab /></TabsContent>
              <TabsContent value="catalog-achievements"><AchievementCatalogTab /></TabsContent>
              <TabsContent value="catalog-monster-skills"><MonsterSkillCatalogTab /></TabsContent>
              <TabsContent value="catalog-stats"><CatalogStatsTab /></TabsContent>
              <TabsContent value="balance"><BalanceDashboardTab /></TabsContent>
              <TabsContent value="ai-tools"><AIToolsTab /></TabsContent>
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
  const toggleLockMutation = trpc.gameAdmin.toggleVirtualShopLock.useMutation({
    onSuccess: () => { utils.gameAdmin.getVirtualShop.invalidate(); toast.success("鎖定狀態已更新"); },
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
  const toggleLockMutation = trpc.gameAdmin.toggleSpiritShopLock.useMutation({
    onSuccess: () => { utils.gameAdmin.getSpiritShop.invalidate(); toast.success("鎖定狀態已更新"); },
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
  const toggleLockMutation = trpc.gameAdmin.toggleHiddenShopLock.useMutation({
    onSuccess: () => { utils.gameAdmin.getHiddenShopPool.invalidate(); toast.success("鎖定狀態已更新"); },
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


// ─── Balance Dashboard Tab ───────────────────────────────────────────────────────────────────
import BalanceRulesEditor from "@/components/admin/BalanceRulesEditor";

function BalanceDashboardTab() {
  const { data, isLoading, refetch } = trpc.gameCatalog.getBalanceAnalysis.useQuery();

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

      {/* 平衡規則自訂編輯器 */}
      <div className="mt-8 pt-6 border-t border-white/10">
        <BalanceRulesEditor />
      </div>
    </div>
  );
}


// ─── Catalog Stats Tab ────────────────────────────────────────────────────────────────────────
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


// ─── AI 工具 Tab ──────────────────────────────────────────────────────────────
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
  ];

  const isGenerating = aiBatchGenerate.isPending;
  const isRefreshing = aiRefreshShop.isPending;
  const isAnyBalancing = balanceMonsters.isPending || balanceMonsterSkills.isPending || balanceItems.isPending || balanceEquipment.isPending || balanceSkills.isPending || balanceAchievements.isPending || balanceAll.isPending;

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
