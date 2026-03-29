/**
 * AdminGameTheaterInline — 將 AdminGameTheater 的各 Tab 組件以 section prop 方式嵌入 GameCMS
 * 
 * section 對應：
 * - "world" → 角色管理 + 全域參數 + Tick 引擎 + 引擎調控 + 世界事件 + 奇遇事件
 * - "shop" → 商店管理
 * - "broadcast" → 全服廣播
 * - "reset" → 世界重置
 */
import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

// Re-export all tab components from AdminGameTheater
// We'll dynamically import and re-render them

export default function AdminGameTheaterInline({ section }: { section: "world" | "shop" | "broadcast" | "reset" }) {
  if (section === "world") return <WorldSection />;
  if (section === "shop") return <ShopManagementTab />;
  if (section === "broadcast") return <BroadcastTab />;
  if (section === "reset") return <WorldResetTab />;
  return null;
}

function WorldSection() {
  return (
    <Tabs defaultValue="agents">
      <TabsList className="mb-4 flex-wrap h-auto gap-1">
        <TabsTrigger value="agents">👤 角色管理</TabsTrigger>
        <TabsTrigger value="configs">⚙️ 全域參數</TabsTrigger>
        <TabsTrigger value="tick">⚡ Tick 引擎</TabsTrigger>
        <TabsTrigger value="engine">🌟 引擎調控</TabsTrigger>
        <TabsTrigger value="world">🌍 世界事件</TabsTrigger>
        <TabsTrigger value="rogue">🎲 奇遇事件</TabsTrigger>
      </TabsList>
      <TabsContent value="agents"><AgentManagementTab /></TabsContent>
      <TabsContent value="configs"><GameConfigTab /></TabsContent>
      <TabsContent value="tick"><TickEngineTab /></TabsContent>
      <TabsContent value="engine"><EngineControlTab /></TabsContent>
      <TabsContent value="world"><WorldEventTab /></TabsContent>
      <TabsContent value="rogue"><RogueEventTab /></TabsContent>
    </Tabs>
  );
}

// ─── 以下從 AdminGameTheater.tsx 複製所有 Tab 組件 ───────────────────────────

// ─── 世界重置 Tab ───────────────────────────────────────────────────────────
function WorldResetTab() {
  const [confirmText, setConfirmText] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const resetWorld = trpc.gameTheater.resetWorld.useMutation({
    onSuccess: (data) => {
      toast.success(`世界重置完成！已重置 ${data.agentsReset} 位角色`);
      setConfirmText("");
      setIsResetting(false);
    },
    onError: (e) => {
      toast.error(e.message);
      setIsResetting(false);
    },
  });

  const resetAgentSkills = trpc.gameTheater.resetAgentSkills.useMutation({
    onSuccess: (data) => {
      toast.success(`技能重置完成！已重置 ${data.agentsReset} 位角色的技能`);
    },
    onError: (e) => toast.error(e.message),
  });

  const resetAgentEquipment = trpc.gameTheater.resetAgentEquipment.useMutation({
    onSuccess: (data) => {
      toast.success(`裝備重置完成！已重置 ${data.agentsReset} 位角色的裝備`);
    },
    onError: (e) => toast.error(e.message),
  });

  const resetAgentInventory = trpc.gameTheater.resetAgentInventory.useMutation({
    onSuccess: (data) => {
      toast.success(`背包重置完成！已重置 ${data.agentsReset} 位角色的背包`);
    },
    onError: (e) => toast.error(e.message),
  });

  const resetAgentPets = trpc.gameTheater.resetAgentPets.useMutation({
    onSuccess: (data) => {
      toast.success(`寵物重置完成！已重置 ${data.agentsReset} 位角色的寵物`);
    },
    onError: (e) => toast.error(e.message),
  });

  const resetAgentAchievements = trpc.gameTheater.resetAgentAchievements.useMutation({
    onSuccess: (data) => {
      toast.success(`成就重置完成！已重置 ${data.agentsReset} 位角色的成就`);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="bg-red-950/30 border border-red-800/50 rounded-lg p-6">
        <h3 className="text-lg font-bold text-red-400 mb-2">🔴 危險區域 — 世界完全重置</h3>
        <p className="text-sm text-muted-foreground mb-4">
          此操作將重置所有角色的等級、金幣、靈石、經驗值、技能、裝備、背包、寵物和成就。<br />
          <strong className="text-red-400">此操作不可逆！</strong>
        </p>
        <div className="flex gap-2 items-center">
          <Input
            placeholder='輸入「確認重置世界」以啟用按鈕'
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="max-w-xs"
          />
          <Button
            variant="destructive"
            disabled={confirmText !== "確認重置世界" || isResetting}
            onClick={() => {
              setIsResetting(true);
              resetWorld.mutate();
            }}
          >
            {isResetting ? "重置中…" : "🔴 執行世界重置"}
          </Button>
        </div>
      </div>

      <div className="bg-yellow-950/20 border border-yellow-800/30 rounded-lg p-6">
        <h3 className="text-lg font-bold text-yellow-400 mb-2">⚠️ 個別重置</h3>
        <p className="text-sm text-muted-foreground mb-4">
          以下操作可單獨重置特定系統，不影響其他數據。
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Button variant="outline" className="border-yellow-800/50 text-yellow-400" onClick={() => resetAgentSkills.mutate()}>
            重置全部技能
          </Button>
          <Button variant="outline" className="border-yellow-800/50 text-yellow-400" onClick={() => resetAgentEquipment.mutate()}>
            重置全部裝備
          </Button>
          <Button variant="outline" className="border-yellow-800/50 text-yellow-400" onClick={() => resetAgentInventory.mutate()}>
            重置全部背包
          </Button>
          <Button variant="outline" className="border-yellow-800/50 text-yellow-400" onClick={() => resetAgentPets.mutate()}>
            重置全部寵物
          </Button>
          <Button variant="outline" className="border-yellow-800/50 text-yellow-400" onClick={() => resetAgentAchievements.mutate()}>
            重置全部成就
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── 角色管理 Tab ───────────────────────────────────────────────────────────
function AgentManagementTab() {
  const [search, setSearch] = useState("");
  const { data: agents = [], isLoading, refetch } = trpc.gameTheater.listAgents.useQuery({ search });
  const adjustMutation = trpc.gameTheater.adjustAgent.useMutation({
    onSuccess: () => { toast.success("已調整"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const setMaxMutation = trpc.gameTheater.setAgentMax.useMutation({
    onSuccess: () => { toast.success("已設定滿值"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [adjustDialog, setAdjustDialog] = useState<{ agentId: number; field: string; current: number } | null>(null);
  const [adjustValue, setAdjustValue] = useState("");

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input placeholder="搜尋角色名稱…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Button variant="outline" size="sm" onClick={() => refetch()}>重新整理</Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">載入中…</p>
      ) : agents.length === 0 ? (
        <p className="text-muted-foreground">無角色</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2 px-3">角色</th>
                <th className="text-left py-2 px-3">等級</th>
                <th className="text-left py-2 px-3">金幣</th>
                <th className="text-left py-2 px-3">靈石</th>
                <th className="text-left py-2 px-3">遊戲幣</th>
                <th className="text-left py-2 px-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a: any) => (
                <tr key={a.id} className="border-b hover:bg-muted/30">
                  <td className="py-2 px-3 font-medium">{a.name}</td>
                  <td className="py-2 px-3">{a.level}</td>
                  <td className="py-2 px-3">{a.gold?.toLocaleString()}</td>
                  <td className="py-2 px-3">{a.spiritStones?.toLocaleString()}</td>
                  <td className="py-2 px-3">{a.gameCurrency?.toLocaleString()}</td>
                  <td className="py-2 px-3">
                    <div className="flex gap-1 flex-wrap">
                      {["gold", "spiritStones", "gameCurrency", "level", "exp"].map((field) => (
                        <Button
                          key={field}
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => {
                            setAdjustDialog({ agentId: a.id, field, current: a[field] ?? 0 });
                            setAdjustValue("");
                          }}
                        >
                          調整{field === "gold" ? "金幣" : field === "spiritStones" ? "靈石" : field === "gameCurrency" ? "遊戲幣" : field === "level" ? "等級" : "經驗"}
                        </Button>
                      ))}
                      <Button variant="ghost" size="sm" className="text-xs h-7 text-yellow-400" onClick={() => setMaxMutation.mutate({ agentId: a.id })}>
                        設為滿值
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adjustDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setAdjustDialog(null)}>
          <div className="bg-card border rounded-lg p-6 w-80" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold mb-2">調整 {adjustDialog.field}</h3>
            <p className="text-sm text-muted-foreground mb-3">目前值：{adjustDialog.current?.toLocaleString()}</p>
            <Input
              type="number"
              placeholder="輸入調整量（正數增加，負數減少）"
              value={adjustValue}
              onChange={(e) => setAdjustValue(e.target.value)}
            />
            <div className="flex gap-2 mt-4">
              <Button
                size="sm"
                onClick={() => {
                  adjustMutation.mutate({ agentId: adjustDialog.agentId, field: adjustDialog.field, delta: Number(adjustValue) });
                  setAdjustDialog(null);
                }}
                disabled={!adjustValue || Number(adjustValue) === 0}
              >
                確認
              </Button>
              <Button variant="outline" size="sm" onClick={() => setAdjustDialog(null)}>取消</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 全域參數 Tab ───────────────────────────────────────────────────────────
function GameConfigTab() {
  const { data: configs = [], isLoading, refetch } = trpc.gameTheater.getConfigs.useQuery();
  const updateMutation = trpc.gameTheater.updateConfig.useMutation({
    onSuccess: () => { toast.success("已更新"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold">全域參數設定</h3>
        <Button variant="outline" size="sm" onClick={() => refetch()}>重新整理</Button>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">載入中…</p>
      ) : (
        <div className="grid gap-3">
          {configs.map((c: any) => (
            <div key={c.key} className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{c.key}</p>
                <p className="text-xs text-muted-foreground truncate">{c.description ?? "無說明"}</p>
              </div>
              {editingKey === c.key ? (
                <div className="flex gap-2 items-center">
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-32 h-8 text-sm"
                  />
                  <Button size="sm" className="h-8" onClick={() => { updateMutation.mutate({ key: c.key, value: editValue }); setEditingKey(null); }}>
                    儲存
                  </Button>
                  <Button variant="outline" size="sm" className="h-8" onClick={() => setEditingKey(null)}>取消</Button>
                </div>
              ) : (
                <div className="flex gap-2 items-center">
                  <Badge variant="secondary" className="font-mono">{c.value}</Badge>
                  <Button variant="ghost" size="sm" className="h-8" onClick={() => { setEditingKey(c.key); setEditValue(c.value); }}>
                    編輯
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tick 引擎 Tab ───────────────────────────────────────────────────────────
function TickEngineTab() {
  const { data: status, isLoading, refetch } = trpc.gameTheater.getTickStatus.useQuery(undefined, { refetchInterval: 5000 });
  const triggerTick = trpc.gameTheater.triggerTick.useMutation({
    onSuccess: () => { toast.success("已觸發 Tick"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold">Tick 引擎狀態</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>重新整理</Button>
          <Button size="sm" onClick={() => triggerTick.mutate()} disabled={triggerTick.isPending}>
            {triggerTick.isPending ? "觸發中…" : "手動觸發 Tick"}
          </Button>
        </div>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">載入中…</p>
      ) : status ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">狀態</p>
              <p className="text-lg font-bold">{status.running ? "🟢 運行中" : "🔴 已停止"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">間隔</p>
              <p className="text-lg font-bold">{status.intervalMs ? `${status.intervalMs / 1000}s` : "N/A"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">總 Tick 數</p>
              <p className="text-lg font-bold">{status.totalTicks?.toLocaleString() ?? "N/A"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">最後 Tick</p>
              <p className="text-lg font-bold text-xs">{status.lastTickAt ? new Date(status.lastTickAt).toLocaleString() : "N/A"}</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <p className="text-muted-foreground">無法取得狀態</p>
      )}
    </div>
  );
}

// ─── 全服廣播 Tab ───────────────────────────────────────────────────────────
function BroadcastTab() {
  const [message, setMessage] = useState("");
  const [broadcastType, setBroadcastType] = useState<"info" | "warning" | "event">("info");
  const broadcast = trpc.gameTheater.broadcast.useMutation({
    onSuccess: () => { toast.success("廣播已發送"); setMessage(""); },
    onError: (e) => toast.error(e.message),
  });
  const { data: history = [], refetch } = trpc.gameTheater.getBroadcastHistory.useQuery();

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h3 className="font-bold">發送全服廣播</h3>
        <div className="flex gap-2">
          {(["info", "warning", "event"] as const).map((t) => (
            <Button
              key={t}
              variant={broadcastType === t ? "default" : "outline"}
              size="sm"
              onClick={() => setBroadcastType(t)}
            >
              {t === "info" ? "📢 公告" : t === "warning" ? "⚠️ 警告" : "🎉 活動"}
            </Button>
          ))}
        </div>
        <Input
          placeholder="輸入廣播內容…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <Button
          onClick={() => broadcast.mutate({ message, type: broadcastType })}
          disabled={!message.trim() || broadcast.isPending}
        >
          {broadcast.isPending ? "發送中…" : "發送廣播"}
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="font-bold">廣播歷史</h3>
          <Button variant="outline" size="sm" onClick={() => refetch()}>重新整理</Button>
        </div>
        {history.length === 0 ? (
          <p className="text-muted-foreground text-sm">暫無廣播記錄</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {history.map((h: any) => (
              <div key={h.id} className="p-3 border rounded-lg text-sm">
                <div className="flex justify-between">
                  <Badge variant={h.type === "warning" ? "destructive" : "secondary"}>{h.type}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(h.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-1">{h.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 引擎調控 Tab ───────────────────────────────────────────────────────────
function EngineControlTab() {
  const { data: engineStatus, isLoading, refetch } = trpc.gameTheater.getEngineStatus.useQuery(undefined, { refetchInterval: 10000 });
  const toggleEngine = trpc.gameTheater.toggleEngine.useMutation({
    onSuccess: () => { toast.success("已切換"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold">引擎調控面板</h3>
        <Button variant="outline" size="sm" onClick={() => refetch()}>重新整理</Button>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">載入中…</p>
      ) : engineStatus ? (
        <div className="space-y-4">
          {Object.entries(engineStatus.engines || {}).map(([key, engine]: [string, any]) => (
            <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">{engine.label || key}</p>
                <p className="text-xs text-muted-foreground">{engine.description || ""}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={engine.enabled ? "default" : "secondary"}>
                  {engine.enabled ? "🟢 啟用" : "🔴 停用"}
                </Badge>
                <Switch
                  checked={engine.enabled}
                  onCheckedChange={() => toggleEngine.mutate({ engine: key, enabled: !engine.enabled })}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">無法取得引擎狀態</p>
      )}
    </div>
  );
}

// ─── 奇遇事件 Tab ───────────────────────────────────────────────────────────
function RogueEventTab() {
  const { data: events = [], isLoading, refetch } = trpc.gameTheater.getRogueEvents.useQuery();
  const createEvent = trpc.gameTheater.createRogueEvent.useMutation({
    onSuccess: () => { toast.success("已建立"); refetch(); setShowCreate(false); },
    onError: (e) => toast.error(e.message),
  });
  const toggleEvent = trpc.gameTheater.toggleRogueEvent.useMutation({
    onSuccess: () => { toast.success("已切換"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", weight: 10, effectType: "gold", effectValue: 100 });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold">奇遇事件管理</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>重新整理</Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>+ 新增事件</Button>
        </div>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">載入中…</p>
      ) : events.length === 0 ? (
        <p className="text-muted-foreground">暫無奇遇事件</p>
      ) : (
        <div className="space-y-2">
          {events.map((e: any) => (
            <div key={e.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">{e.name}</p>
                <p className="text-xs text-muted-foreground">{e.description}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="secondary">權重: {e.weight}</Badge>
                  <Badge variant="secondary">{e.effectType}: {e.effectValue}</Badge>
                </div>
              </div>
              <Switch
                checked={e.isActive === 1}
                onCheckedChange={() => toggleEvent.mutate({ id: e.id, isActive: e.isActive === 1 ? 0 : 1 })}
              />
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-card border rounded-lg p-6 w-96" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold mb-4">新增奇遇事件</h3>
            <div className="space-y-3">
              <Input placeholder="事件名稱" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="事件描述" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <Input type="number" placeholder="權重" value={form.weight} onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })} />
              <Input placeholder="效果類型" value={form.effectType} onChange={(e) => setForm({ ...form, effectType: e.target.value })} />
              <Input type="number" placeholder="效果值" value={form.effectValue} onChange={(e) => setForm({ ...form, effectValue: Number(e.target.value) })} />
            </div>
            <div className="flex gap-2 mt-4">
              <Button size="sm" onClick={() => createEvent.mutate(form)} disabled={!form.name}>建立</Button>
              <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>取消</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 世界事件 Tab ───────────────────────────────────────────────────────────
function WorldEventTab() {
  const { data: events = [], isLoading, refetch } = trpc.gameTheater.getWorldEvents.useQuery();
  const createEvent = trpc.gameTheater.createWorldEvent.useMutation({
    onSuccess: () => { toast.success("已建立"); refetch(); setShowCreate(false); },
    onError: (e) => toast.error(e.message),
  });
  const toggleEvent = trpc.gameTheater.toggleWorldEvent.useMutation({
    onSuccess: () => { toast.success("已切換"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", eventType: "buff", effectValue: 10, duration: 60 });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold">世界事件管理</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>重新整理</Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>+ 新增事件</Button>
        </div>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">載入中…</p>
      ) : events.length === 0 ? (
        <p className="text-muted-foreground">暫無世界事件</p>
      ) : (
        <div className="space-y-2">
          {events.map((e: any) => (
            <div key={e.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">{e.name}</p>
                <p className="text-xs text-muted-foreground">{e.description}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="secondary">{e.eventType}</Badge>
                  <Badge variant="secondary">效果: {e.effectValue}</Badge>
                  <Badge variant="secondary">持續: {e.duration}分</Badge>
                </div>
              </div>
              <Switch
                checked={e.isActive === 1}
                onCheckedChange={() => toggleEvent.mutate({ id: e.id, isActive: e.isActive === 1 ? 0 : 1 })}
              />
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-card border rounded-lg p-6 w-96" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold mb-4">新增世界事件</h3>
            <div className="space-y-3">
              <Input placeholder="事件名稱" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="事件描述" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <Input placeholder="事件類型" value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })} />
              <Input type="number" placeholder="效果值" value={form.effectValue} onChange={(e) => setForm({ ...form, effectValue: Number(e.target.value) })} />
              <Input type="number" placeholder="持續時間(分)" value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} />
            </div>
            <div className="flex gap-2 mt-4">
              <Button size="sm" onClick={() => createEvent.mutate(form)} disabled={!form.name}>建立</Button>
              <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>取消</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 商店管理 Tab ───────────────────────────────────────────────────────────
function ShopManagementTab() {
  const { data: shopStatus, isLoading, refetch } = trpc.gameTheater.getShopStatus.useQuery();
  const refreshShop = trpc.gameTheater.refreshShop.useMutation({
    onSuccess: () => { toast.success("商店已刷新"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold">商店綜合管理</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>重新整理</Button>
          <Button size="sm" onClick={() => refreshShop.mutate()} disabled={refreshShop.isPending}>
            {refreshShop.isPending ? "刷新中…" : "🔄 強制刷新商店"}
          </Button>
        </div>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">載入中…</p>
      ) : shopStatus ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(shopStatus).map(([key, value]: [string, any]) => (
            <Card key={key}>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">{key}</p>
                <p className="text-lg font-bold">{typeof value === "number" ? value.toLocaleString() : String(value)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">無法取得商店狀態</p>
      )}
    </div>
  );
}
