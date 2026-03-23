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
        <div className="mb-6">
          <h1 className="text-2xl font-bold">靈相世界 · 遊戲內容管理</h1>
          <p className="text-muted-foreground text-sm mt-1">管理怪物、技能、成就等遊戲內容資料，變更即時生效。</p>
        </div>

        <Tabs defaultValue="monsters">
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="monsters">怪物</TabsTrigger>
            <TabsTrigger value="skills">技能</TabsTrigger>
            <TabsTrigger value="achievements">成就</TabsTrigger>
            <TabsTrigger value="items">商城道具</TabsTrigger>
          </TabsList>

          <Card>
            <CardContent className="pt-6">
              <TabsContent value="monsters"><MonstersTab /></TabsContent>
              <TabsContent value="skills"><SkillsTab /></TabsContent>
              <TabsContent value="achievements"><AchievementsTab /></TabsContent>
              <TabsContent value="items"><GameItemsTab /></TabsContent>
            </CardContent>
          </Card>
        </Tabs>
      </div>
    </div>
  );
}
