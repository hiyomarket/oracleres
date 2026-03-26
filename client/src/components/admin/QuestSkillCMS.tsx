/**
 * M3O: 天命考核技能任務鏈 CMS 管理組件
 * 包含：NPC 管理、天命技能圖鑑管理、任務鏈步驟管理
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const WUXING_OPTIONS = ["wood", "fire", "earth", "metal", "water"] as const;
const WUXING_LABELS: Record<string, string> = { wood: "🌿 木", fire: "🔥 火", earth: "🪨 土", metal: "⚔️ 金", water: "💧 水" };
const CATEGORY_LABELS: Record<string, string> = { attack: "⚔️ 攻擊系", support: "🛡️ 戰鬥輔助系", special: "✨ 特殊功能系", production: "🔨 生產系" };
const SKILL_TYPE_LABELS: Record<string, string> = { attack: "攻擊", heal: "治療", buff: "增益", debuff: "減益", utility: "功能" };
const RARITY_LABELS: Record<string, string> = { common: "普通", rare: "稀有", epic: "史詩", legendary: "傳說" };
const RARITY_COLORS: Record<string, string> = { common: "bg-gray-500", rare: "bg-blue-500", epic: "bg-purple-500", legendary: "bg-amber-500" };

// ═══════════════════════════════════════════════════════════════════════
// NPC 管理 Tab
// ═══════════════════════════════════════════════════════════════════════
export function NPCManagementTab() {
  const npcs = trpc.questSkillNpc.list.useQuery();
  const createNpc = trpc.questSkillNpc.create.useMutation({ onSuccess: () => { npcs.refetch(); toast.success("NPC 已建立"); } });
  const updateNpc = trpc.questSkillNpc.update.useMutation({ onSuccess: () => { npcs.refetch(); toast.success("NPC 已更新"); } });
  const deleteNpc = trpc.questSkillNpc.delete.useMutation({ onSuccess: () => { npcs.refetch(); toast.success("NPC 已刪除"); } });

  const [editingNpc, setEditingNpc] = useState<any>(null);
  const [form, setForm] = useState({
    code: "", name: "", title: "", location: "", description: "", avatarUrl: "",
  });
  const [searchInput, setSearchInput] = useState("");
  const [showDialog, setShowDialog] = useState(false);

  const filteredNpcs = useMemo(() => {
    if (!npcs.data) return [];
    const q = searchInput.toLowerCase();
    return npcs.data.filter((n: any) => n.name.toLowerCase().includes(q) || (n.location ?? "").toLowerCase().includes(q));
  }, [npcs.data, searchInput]);

  const openCreate = () => {
    setEditingNpc(null);
    setForm({ code: "", name: "", title: "", location: "", description: "", avatarUrl: "" });
    setShowDialog(true);
  };

  const openEdit = (npc: any) => {
    setEditingNpc(npc);
    setForm({
      code: npc.code ?? "", name: npc.name, title: npc.title ?? "", location: npc.location ?? "",
      description: npc.description ?? "", avatarUrl: npc.avatarUrl ?? "",
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("NPC 名稱不能為空"); return; }
    if (!form.code.trim()) { toast.error("NPC 代碼不能為空"); return; }
    if (editingNpc) {
      await updateNpc.mutateAsync({ id: editingNpc.id, ...form });
    } else {
      await createNpc.mutateAsync(form);
    }
    setShowDialog(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input placeholder="搜尋 NPC 名稱/地點…" value={searchInput} onChange={e => setSearchInput(e.target.value)} className="max-w-xs" />
        <Button onClick={openCreate}>+ 新增 NPC</Button>
        <span className="text-sm text-muted-foreground">共 {npcs.data?.length ?? 0} 位 NPC</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredNpcs.map((npc: any) => (
          <Card key={npc.id} className="relative">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                {npc.avatarUrl && <img src={npc.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />}
                {npc.name}
                {npc.title && <span className="text-xs text-muted-foreground">（{npc.title}）</span>}
              </CardTitle>
              {npc.location && <CardDescription>📍 {npc.location}</CardDescription>}
            </CardHeader>
            <CardContent className="pt-0">
              {npc.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{npc.description}</p>}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(npc)}>編輯</Button>
                <Button size="sm" variant="destructive" onClick={() => { if (confirm("確定刪除此 NPC？")) deleteNpc.mutate({ id: npc.id }); }}>刪除</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingNpc ? "編輯 NPC" : "新增 NPC"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="NPC 代碼 *（如 npc-blacksmith）" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
              <Input placeholder="NPC 名稱 *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <Input placeholder="稱號（如：武器大師）" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <Input placeholder="所在地點（如：虛界·鍛冶之谷）" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            <Textarea placeholder="NPC 描述" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            <Input placeholder="頭像圖片 URL" value={form.avatarUrl} onChange={e => setForm(f => ({ ...f, avatarUrl: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button>
            <Button onClick={handleSave} disabled={createNpc.isPending || updateNpc.isPending}>
              {createNpc.isPending || updateNpc.isPending ? "儲存中…" : "儲存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 天命技能圖鑑管理 Tab
// ═══════════════════════════════════════════════════════════════════════
export function QuestSkillCatalogTab() {
  const skills = trpc.questSkillCatalog.list.useQuery();
  const createSkill = trpc.questSkillCatalog.create.useMutation({ onSuccess: () => { skills.refetch(); toast.success("技能已建立"); } });
  const updateSkill = trpc.questSkillCatalog.update.useMutation({ onSuccess: () => { skills.refetch(); toast.success("技能已更新"); } });
  const deleteSkill = trpc.questSkillCatalog.delete.useMutation({ onSuccess: () => { skills.refetch(); toast.success("技能已刪除"); } });

  const [editingSkill, setEditingSkill] = useState<any>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const emptyForm = {
    code: "", name: "", description: "", category: "attack" as string, skillType: "attack" as string,
    wuxing: "fire" as string, rarity: "common" as string, powerPercent: 100, mpCost: 10,
    cooldown: 3, additionalEffect: "", iconUrl: "", npcId: undefined as number | undefined,
  };
  const [form, setForm] = useState(emptyForm);

  const filteredSkills = useMemo(() => {
    if (!skills.data) return [];
    const q = searchInput.toLowerCase();
    return skills.data.filter((s: any) => {
      const matchSearch = s.name.toLowerCase().includes(q) || (s.skillKey ?? "").toLowerCase().includes(q);
      const matchCategory = filterCategory === "all" || s.category === filterCategory;
      return matchSearch && matchCategory;
    });
  }, [skills.data, searchInput, filterCategory]);

  const openCreate = () => {
    setEditingSkill(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = (skill: any) => {
    setEditingSkill(skill);
    setForm({
      code: skill.code ?? "", name: skill.name, description: skill.description ?? "",
      category: skill.category, skillType: skill.skillType ?? "attack", wuxing: skill.wuxing ?? "fire",
      rarity: skill.rarity ?? "common", powerPercent: skill.powerPercent ?? 100,
      mpCost: skill.mpCost ?? 10, cooldown: skill.cooldown ?? 3,
      additionalEffect: skill.additionalEffect ?? "", iconUrl: skill.iconUrl ?? "",
      npcId: skill.npcId ?? undefined,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("技能名稱不能為空"); return; }
    if (editingSkill) {
      await updateSkill.mutateAsync({ id: editingSkill.id, ...form });
    } else {
      await createSkill.mutateAsync(form);
    }
    setShowDialog(false);
  };

  // 按分類分組
  const groupedSkills = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const s of filteredSkills) {
      const cat = s.category ?? "attack";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(s);
    }
    return groups;
  }, [filteredSkills]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Input placeholder="搜尋技能名稱/Key…" value={searchInput} onChange={e => setSearchInput(e.target.value)} className="max-w-xs" />
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分類</SelectItem>
            <SelectItem value="attack">⚔️ 攻擊系</SelectItem>
            <SelectItem value="support">🛡️ 戰鬥輔助系</SelectItem>
            <SelectItem value="special">✨ 特殊功能系</SelectItem>
            <SelectItem value="production">🔨 生產系</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={openCreate}>+ 新增天命技能</Button>
        <span className="text-sm text-muted-foreground">共 {skills.data?.length ?? 0} 個技能</span>
      </div>

      {Object.entries(groupedSkills).map(([cat, items]) => (
        <div key={cat}>
          <h3 className="text-sm font-semibold mb-2">{CATEGORY_LABELS[cat] ?? cat}（{items.length}）</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((skill: any) => (
              <Card key={skill.id} className="relative">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Badge className={`${RARITY_COLORS[skill.rarity] ?? "bg-gray-500"} text-white text-[10px]`}>
                      {RARITY_LABELS[skill.rarity] ?? skill.rarity}
                    </Badge>
                    {skill.name}
                    {skill.wuxing && <span className="text-xs">{WUXING_LABELS[skill.wuxing] ?? skill.wuxing}</span>}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {SKILL_TYPE_LABELS[skill.skillType] ?? skill.skillType} · 威力 {skill.powerPercent}% · MP {skill.mpCost} · CD {skill.cooldown}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {skill.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{skill.description}</p>}
                  {skill.additionalEffect && <p className="text-xs text-amber-400 mb-2">附加效果：{skill.additionalEffect}</p>}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(skill)}>編輯</Button>
                    <Button size="sm" variant="destructive" onClick={() => { if (confirm("確定刪除此技能？")) deleteSkill.mutate({ id: skill.id }); }}>刪除</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSkill ? "編輯天命技能" : "新增天命技能"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="技能代碼 *（如 S1-fire-slash）" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
              <Input placeholder="技能名稱 *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <Textarea placeholder="技能描述" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            <div className="grid grid-cols-3 gap-2">
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue placeholder="分類" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="attack">⚔️ 攻擊系</SelectItem>
                  <SelectItem value="support">🛡️ 戰鬥輔助系</SelectItem>
                  <SelectItem value="special">✨ 特殊功能系</SelectItem>
                  <SelectItem value="production">🔨 生產系</SelectItem>
                </SelectContent>
              </Select>
              <Select value={form.skillType} onValueChange={v => setForm(f => ({ ...f, skillType: v }))}>
                <SelectTrigger><SelectValue placeholder="技能類型" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="attack">攻擊</SelectItem>
                  <SelectItem value="heal">治療</SelectItem>
                  <SelectItem value="buff">增益</SelectItem>
                  <SelectItem value="debuff">減益</SelectItem>
                  <SelectItem value="utility">功能</SelectItem>
                </SelectContent>
              </Select>
              <Select value={form.rarity} onValueChange={v => setForm(f => ({ ...f, rarity: v }))}>
                <SelectTrigger><SelectValue placeholder="稀有度" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="common">普通</SelectItem>
                  <SelectItem value="rare">稀有</SelectItem>
                  <SelectItem value="epic">史詩</SelectItem>
                  <SelectItem value="legendary">傳說</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select value={form.wuxing} onValueChange={v => setForm(f => ({ ...f, wuxing: v }))}>
                <SelectTrigger><SelectValue placeholder="五行屬性" /></SelectTrigger>
                <SelectContent>
                  {WUXING_OPTIONS.map(w => <SelectItem key={w} value={w}>{WUXING_LABELS[w]}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={form.npcId?.toString() ?? "none"} onValueChange={v => setForm(f => ({ ...f, npcId: v === "none" ? undefined : Number(v) }))}>
                <SelectTrigger><SelectValue placeholder="指派 NPC" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">無 NPC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Input type="number" placeholder="威力 %" value={form.powerPercent} onChange={e => setForm(f => ({ ...f, powerPercent: +e.target.value }))} />
              <Input type="number" placeholder="MP 消耗" value={form.mpCost} onChange={e => setForm(f => ({ ...f, mpCost: +e.target.value }))} />
              <Input type="number" placeholder="冷卻回合" value={form.cooldown} onChange={e => setForm(f => ({ ...f, cooldown: +e.target.value }))} />
            </div>
            <Input placeholder="附加效果（如 burn:20:3 = 灼燒20傷害持續3回合）" value={form.additionalEffect} onChange={e => setForm(f => ({ ...f, additionalEffect: e.target.value }))} />
            <Input placeholder="技能圖示 URL" value={form.iconUrl} onChange={e => setForm(f => ({ ...f, iconUrl: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button>
            <Button onClick={handleSave} disabled={createSkill.isPending || updateSkill.isPending}>
              {createSkill.isPending || updateSkill.isPending ? "儲存中…" : "儲存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 任務鏈步驟管理 Tab
// ═══════════════════════════════════════════════════════════════════════
export function QuestStepManagementTab() {
  const skills = trpc.questSkillCatalog.list.useQuery();
  const npcs = trpc.questSkillNpc.list.useQuery();
  const [selectedSkillId, setSelectedSkillId] = useState<string>("none");
  const steps = trpc.questSkillStep.listBySkill.useQuery(
    { skillId: Number(selectedSkillId) },
    { enabled: selectedSkillId !== "none" }
  );
  const createStep = trpc.questSkillStep.create.useMutation({ onSuccess: () => { steps.refetch(); toast.success("步驟已建立"); } });
  const updateStep = trpc.questSkillStep.update.useMutation({ onSuccess: () => { steps.refetch(); toast.success("步驟已更新"); } });
  const deleteStep = trpc.questSkillStep.delete.useMutation({ onSuccess: () => { steps.refetch(); toast.success("步驟已刪除"); } });

  const [editingStep, setEditingStep] = useState<any>(null);
  const [showDialog, setShowDialog] = useState(false);

  const emptyStepForm = {
    stepOrder: 1, title: "", description: "",    npcId: undefined as number | undefined,
    dialogue: "", objective: "", location: "",};
  const [form, setForm] = useState(emptyStepForm);

  const openCreate = () => {
    setEditingStep(null);
    const nextOrder = (steps.data?.length ?? 0) + 1;
    setForm({ ...emptyStepForm, stepOrder: nextOrder });
    setShowDialog(true);
  };

  const openEdit = (step: any) => {
    setEditingStep(step);
    setForm({
      stepOrder: step.stepNumber ?? step.stepOrder ?? 1, title: step.title ?? "",
      description: step.description ?? "", npcId: step.npcId ?? undefined, dialogue: step.dialogue ?? "",
      objective: step.objective ?? "", location: step.location ?? "",
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("步驟標題不能為空"); return; }
    if (selectedSkillId === "none") { toast.error("請先選擇技能"); return; }
    if (editingStep) {
      const { stepOrder, npcId, ...rest } = form;
      await updateStep.mutateAsync({ id: editingStep.id, stepNumber: stepOrder, npcId: npcId ?? undefined, ...rest });
    } else {
      const { stepOrder, npcId, ...rest } = form;
      await createStep.mutateAsync({ skillId: Number(selectedSkillId), stepNumber: stepOrder, title: rest.title, npcId: npcId ?? undefined, dialogue: rest.dialogue, objective: rest.objective, location: rest.location });
    }
    setShowDialog(false);
  };

  const selectedSkill = skills.data?.find((s: any) => s.id === Number(selectedSkillId));
  const npcMap = useMemo(() => {
    const m: Record<number, string> = {};
    for (const n of npcs.data ?? []) m[n.id] = n.name;
    return m;
  }, [npcs.data]);

  const TASK_TYPE_LABELS: Record<string, string> = {
    combat: "⚔️ 戰鬥", collect: "🎒 收集", explore: "🗺️ 探索", talk: "💬 對話",
    craft: "🔨 製作", special: "⭐ 特殊", trial: "🏆 試煉",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedSkillId} onValueChange={setSelectedSkillId}>
          <SelectTrigger className="w-64"><SelectValue placeholder="選擇天命技能" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">-- 請選擇技能 --</SelectItem>
            {(skills.data ?? []).map((s: any) => (
              <SelectItem key={s.id} value={s.id.toString()}>
                {CATEGORY_LABELS[s.category] ?? s.category} {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedSkillId !== "none" && (
          <Button onClick={openCreate}>+ 新增步驟</Button>
        )}
      </div>

      {selectedSkill && (
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Badge className={`${RARITY_COLORS[selectedSkill.rarity] ?? "bg-gray-500"} text-white text-[10px]`}>
                {RARITY_LABELS[selectedSkill.rarity] ?? selectedSkill.rarity}
              </Badge>
              {CATEGORY_LABELS[selectedSkill.category] ?? selectedSkill.category} · {selectedSkill.name}
              {selectedSkill.wuxing && <span className="text-xs">{WUXING_LABELS[selectedSkill.wuxing]}</span>}
            </CardTitle>
            <CardDescription className="text-xs">
              {SKILL_TYPE_LABELS[selectedSkill.skillType]} · 威力 {selectedSkill.powerPercent}% · MP {selectedSkill.mpCost} · CD {selectedSkill.cooldown}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {selectedSkillId !== "none" && (
        <div className="space-y-3">
          {(steps.data ?? []).sort((a: any, b: any) => a.stepOrder - b.stepOrder).map((step: any, idx: number) => (
            <Card key={step.id} className="relative">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                    {step.stepOrder}
                  </span>
                  {step.title}
                  <Badge variant="outline" className="text-[10px]">{TASK_TYPE_LABELS[step.taskType] ?? step.taskType}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-1">
                {step.objective && <p className="text-xs text-muted-foreground">{step.objective}</p>}
                {step.npcId && <p className="text-xs">NPC：{npcMap[step.npcId] ?? `#${step.npcId}`}</p>}
                {step.dialogue && <p className="text-xs italic text-amber-400">「{step.dialogue}」</p>}
                {step.location && <p className="text-xs text-muted-foreground">📍 {step.location}</p>}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => openEdit(step)}>編輯</Button>
                  <Button size="sm" variant="destructive" onClick={() => { if (confirm("確定刪除此步驟？")) deleteStep.mutate({ id: step.id }); }}>刪除</Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {(steps.data ?? []).length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              此技能尚未設定任務步驟，點擊「+ 新增步驟」開始建立任務鏈
            </div>
          )}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingStep ? "編輯任務步驟" : "新增任務步驟"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="步驟順序" value={form.stepOrder} onChange={e => setForm(f => ({ ...f, stepOrder: +e.target.value }))} />
              <Input placeholder="步驟標題 *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <Textarea placeholder="步驟描述" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            <Select value={form.npcId?.toString() ?? "none"} onValueChange={v => setForm(f => ({ ...f, npcId: v === "none" ? undefined : Number(v) }))}>
              <SelectTrigger><SelectValue placeholder="指派 NPC" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">無 NPC</SelectItem>
                {(npcs.data ?? []).map((n: any) => (
                  <SelectItem key={n.id} value={n.id.toString()}>{n.name}{n.location ? ` (${n.location})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea placeholder="NPC 對話（任務說明台詞）" value={form.dialogue} onChange={e => setForm(f => ({ ...f, dialogue: e.target.value }))} rows={2} />
            <Input placeholder="任務目標描述" value={form.objective} onChange={e => setForm(f => ({ ...f, objective: e.target.value }))} />
            <Input placeholder="地點（如：虛界·火山口）" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button>
            <Button onClick={handleSave} disabled={createStep.isPending || updateStep.isPending}>
              {createStep.isPending || updateStep.isPending ? "儲存中…" : "儲存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 天命考核管理主組件（整合三個子 Tab）
// ═══════════════════════════════════════════════════════════════════════
export function QuestSkillCMSTab() {
  return (
    <Tabs defaultValue="skills" className="w-full">
      <TabsList>
        <TabsTrigger value="skills">🌟 天命技能</TabsTrigger>
        <TabsTrigger value="steps">📋 任務鏈步驟</TabsTrigger>
        <TabsTrigger value="npcs">👤 NPC 管理</TabsTrigger>
      </TabsList>
      <TabsContent value="skills"><QuestSkillCatalogTab /></TabsContent>
      <TabsContent value="steps"><QuestStepManagementTab /></TabsContent>
      <TabsContent value="npcs"><NPCManagementTab /></TabsContent>
    </Tabs>
  );
}
