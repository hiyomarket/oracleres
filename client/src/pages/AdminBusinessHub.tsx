import { useState, useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AdminLayout } from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────────────
type Module = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: "core" | "addon";
  sortOrder: number;
  containedFeatures: string[];
  isActive: number;
  navPath?: string | null;
  isCentral?: number;
  parentId?: string | null;
};

type Plan = {
  id: string;
  name: string;
  price: string;
  level: number;
  description: string | null;
  isActive: number;
  modules: Module[];
};

type Campaign = {
  id: number;
  name: string;
  startDate: Date;
  endDate: Date;
  isActive: number;
  isDefaultOnboarding: number;
  ruleType: "discount" | "giveaway";
  ruleTarget: { target_type: string; target_id?: string };
  ruleValue: Record<string, unknown>;
};

// ─── Sortable Module Row Component ───────────────────────────────────────────
function SortableModuleRow({
  m,
  depth,
  allModules,
  onEdit,
  onToggle,
}: {
  m: Module;
  depth: number;
  allModules: Module[];
  onEdit: (m: Module) => void;
  onToggle: (m: Module) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: m.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const parentName = m.parentId ? allModules.find(x => x.id === m.parentId)?.name : null;
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
        isDragging ? "border-amber-500 bg-slate-700" : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
      } ${!m.isActive ? "opacity-40" : ""}`}
      {...(depth > 0 ? {} : {})}
    >
      {/* 層級縮排 */}
      {depth > 0 && <div className="w-6 shrink-0 flex items-center">
        <div className="w-3 h-px bg-slate-600" />
        <div className="w-0 h-3 border-l border-slate-600" style={{ marginLeft: -1, marginTop: -12 }} />
      </div>}
      {/* 拖拽手柄 */}
      <div
        className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 shrink-0"
        {...attributes}
        {...listeners}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
        </svg>
      </div>
      <span className="text-2xl w-8 text-center shrink-0">{m.icon || "📦"}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-white">{m.name}</span>
          <Badge
            variant="outline"
            className={m.category === "core" ? "border-blue-500 text-blue-400 text-xs" : "border-purple-500 text-purple-400 text-xs"}
          >
            {m.category === "core" ? "核心" : "加値"}
          </Badge>
          {m.isCentral ? <Badge variant="outline" className="border-amber-500 text-amber-400 text-xs">☀️中心</Badge> : null}
          {parentName && <span className="text-[10px] text-slate-500">└ 屬於 {parentName}</span>}
        </div>
        <p className="text-xs text-slate-400 truncate">{m.description}</p>
        <div className="flex gap-3 text-xs text-slate-500">
          {m.navPath && <span className="text-indigo-400">{m.navPath}</span>}
          <span>關聯: {(m.containedFeatures as string[]).join(", ") || "無"}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Switch checked={!!m.isActive} onCheckedChange={() => onToggle(m)} />
        <Button variant="ghost" size="sm" onClick={() => onEdit(m)} className="text-slate-400 hover:text-white">
          編輯
        </Button>
      </div>
    </div>
  );
}

// ─── Module Manager Tab ──────────────────────────────────────────────────────
function ModuleManagerTab() {
  const utils = trpc.useUtils();
  const { data: modules = [], isLoading } = trpc.businessHub.listModules.useQuery();
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newModule, setNewModule] = useState({
    id: "",
    name: "",
    description: "",
    icon: "",
    category: "addon" as "core" | "addon",
    containedFeatures: "",
  });

  const reorderMutation = trpc.businessHub.reorderModules.useMutation();
  const updateMutation = trpc.businessHub.updateModule.useMutation({
    onSuccess: () => {
      utils.businessHub.listModules.invalidate();
      toast.success("已更新模塊");
    },
  });
  const createMutation = trpc.businessHub.createModule.useMutation({
    onSuccess: () => {
      utils.businessHub.listModules.invalidate();
      setShowCreateDialog(false);
      toast.success("已新增模塊");
    },
  });

  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const allModules = modules as Module[];
  const displayIds = orderedIds.length > 0 ? orderedIds : allModules.map(m => m.id);
  const orderedModules = displayIds.map(id => allModules.find(m => m.id === id)).filter(Boolean) as Module[];

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = displayIds.indexOf(active.id as string);
    const newIndex = displayIds.indexOf(over.id as string);
    const newIds = arrayMove(displayIds, oldIndex, newIndex);
    setOrderedIds(newIds);
    const updates = newIds.map((id, i) => ({ id, sortOrder: i + 1 }));
    await reorderMutation.mutateAsync(updates);
    utils.businessHub.listModules.invalidate();
  };

  const toggleActive = (m: Module) => {
    updateMutation.mutate({ id: m.id, isActive: m.isActive ? 0 : 1 });
  };

  // Build tree: roots first, then children indented
  const roots = orderedModules.filter(m => !m.parentId);
  const children = (parentId: string) => orderedModules.filter(m => m.parentId === parentId);
  const flatTree: Array<{ m: Module; depth: number }> = [];
  for (const root of roots) {
    flatTree.push({ m: root, depth: 0 });
    for (const child of children(root.id)) {
      flatTree.push({ m: child, depth: 1 });
    }
  }
  // Modules with unknown parents (orphans)
  const orphans = orderedModules.filter(m => m.parentId && !allModules.find(x => x.id === m.parentId));
  for (const o of orphans) flatTree.push({ m: o, depth: 0 });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-amber-400">功能模塊管理器</h2>
          <p className="text-sm text-slate-400">拖拽調整排序，支持父子層級結構</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="bg-amber-500 hover:bg-amber-600 text-black">
          + 新增模塊
        </Button>
      </div>

      {isLoading ? (
        <div className="text-slate-400 text-center py-8">載入中...</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={displayIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-1.5">
              {flatTree.map(({ m, depth }) => (
                <div key={m.id} style={{ paddingLeft: depth * 24 }}>
                  <SortableModuleRow
                    m={m}
                    depth={depth}
                    allModules={allModules}
                    onEdit={setEditingModule}
                    onToggle={toggleActive}
                  />
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingModule} onOpenChange={() => setEditingModule(null)}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-amber-400">編輯模塊</DialogTitle>
          </DialogHeader>
          {editingModule && (
            <div className="space-y-3">
              <div>
                <label className="text-sm text-slate-400">名稱</label>
                <Input
                  value={editingModule.name}
                  onChange={(e) =>
                    setEditingModule({ ...editingModule, name: e.target.value })
                  }
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400">描述</label>
                <Input
                  value={editingModule.description || ""}
                  onChange={(e) =>
                    setEditingModule({ ...editingModule, description: e.target.value })
                  }
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400">圖示 (Emoji)</label>
                <Input
                  value={editingModule.icon || ""}
                  onChange={(e) =>
                    setEditingModule({ ...editingModule, icon: e.target.value })
                  }
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400">分類</label>
                <select
                  value={editingModule.category}
                  onChange={(e) =>
                    setEditingModule({
                      ...editingModule,
                      category: e.target.value as "core" | "addon",
                    })
                  }
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white"
                >
                  <option value="core">核心（免費）</option>
                  <option value="addon">加值（付費）</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-400">關聯功能 ID（逗號分隔）</label>
                <Input
                  value={(editingModule.containedFeatures as string[]).join(", ")}
                  onChange={(e) =>
                    setEditingModule({
                      ...editingModule,
                      containedFeatures: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400">導航路徑 (navPath)，如 /oracle</label>
                <Input
                  value={editingModule.navPath || ""}
                  onChange={(e) =>
                    setEditingModule({ ...editingModule, navPath: e.target.value })
                  }
                  placeholder="/oracle（空白=不顯示於主導航）"
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-slate-400">是否為中央焦點（眾星拱月「太陽」）</label>
                <input
                  type="checkbox"
                  checked={!!editingModule.isCentral}
                  onChange={(e) =>
                    setEditingModule({ ...editingModule, isCentral: e.target.checked ? 1 : 0 })
                  }
                  className="w-4 h-4 accent-amber-500"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400">父模塊（層級歸屬）</label>
                <select
                  value={editingModule.parentId || ""}
                  onChange={(e) =>
                    setEditingModule({ ...editingModule, parentId: e.target.value || null })
                  }
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                >
                  <option value="">無（頂層模塊）</option>
                  {allModules
                    .filter(x => x.id !== editingModule.id)
                    .map(x => (
                      <option key={x.id} value={x.id}>{x.icon} {x.name}</option>
                    ))}
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingModule(null)}>
              取消
            </Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-black"
              onClick={() => {
                if (!editingModule) return;
                updateMutation.mutate({
                  id: editingModule.id,
                  name: editingModule.name,
                  description: editingModule.description || undefined,
                  icon: editingModule.icon || undefined,
                  category: editingModule.category,
                  containedFeatures: editingModule.containedFeatures as string[],
                  navPath: editingModule.navPath || undefined,
                  isCentral: editingModule.isCentral,
                  parentId: editingModule.parentId ?? null,
                });
                setEditingModule(null);
              }}
            >
              儲存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-amber-400">新增功能模塊</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-slate-400">ID（英文，如 module_xxx）</label>
              <Input
                value={newModule.id}
                onChange={(e) => setNewModule({ ...newModule, id: e.target.value })}
                placeholder="module_example"
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400">名稱</label>
              <Input
                value={newModule.name}
                onChange={(e) => setNewModule({ ...newModule, name: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400">描述</label>
              <Input
                value={newModule.description}
                onChange={(e) =>
                  setNewModule({ ...newModule, description: e.target.value })
                }
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400">圖示 (Emoji)</label>
              <Input
                value={newModule.icon}
                onChange={(e) => setNewModule({ ...newModule, icon: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400">分類</label>
              <select
                value={newModule.category}
                onChange={(e) =>
                  setNewModule({
                    ...newModule,
                    category: e.target.value as "core" | "addon",
                  })
                }
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white"
              >
                <option value="core">核心（免費）</option>
                <option value="addon">加值（付費）</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-400">關聯功能 ID（逗號分隔）</label>
              <Input
                value={newModule.containedFeatures}
                onChange={(e) =>
                  setNewModule({ ...newModule, containedFeatures: e.target.value })
                }
                placeholder="lottery, calendar"
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-black"
              onClick={() => {
                createMutation.mutate({
                  id: newModule.id,
                  name: newModule.name,
                  description: newModule.description || undefined,
                  icon: newModule.icon || undefined,
                  category: newModule.category,
                  containedFeatures: newModule.containedFeatures
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                });
              }}
            >
              新增
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Plans & Pricing Tab ─────────────────────────────────────────────────────
function PlansTab() {
  const utils = trpc.useUtils();
  const { data: plans = [], isLoading } = trpc.businessHub.listPlans.useQuery();
  const { data: allModules = [] } = trpc.businessHub.listModules.useQuery();
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPlan, setNewPlan] = useState({
    id: "",
    name: "",
    price: "0",
    level: 1,
    description: "",
    moduleIds: [] as string[],
  });

  const updateMutation = trpc.businessHub.updatePlan.useMutation({
    onSuccess: () => {
      utils.businessHub.listPlans.invalidate();
      toast.success("方案已更新");
    },
  });
  const createMutation = trpc.businessHub.createPlan.useMutation({
    onSuccess: () => {
      utils.businessHub.listPlans.invalidate();
      setShowCreateDialog(false);
      toast.success("方案已新增");
    },
  });

  const toggleModule = (moduleId: string, currentIds: string[]) => {
    if (currentIds.includes(moduleId)) {
      return currentIds.filter((id) => id !== moduleId);
    }
    return [...currentIds, moduleId];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-amber-400">方案與定價</h2>
          <p className="text-sm text-slate-400">設定每個方案包含的功能模塊</p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-amber-500 hover:bg-amber-600 text-black"
        >
          + 新增方案
        </Button>
      </div>

      {isLoading ? (
        <div className="text-slate-400 text-center py-8">載入中...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(plans as Plan[]).map((plan) => (
            <div
              key={plan.id}
              className={`rounded-xl border p-4 space-y-3 transition-all ${
                plan.isActive
                  ? "border-amber-500/40 bg-slate-800/60"
                  : "border-slate-700 bg-slate-800/30 opacity-50"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-white">{plan.name}</h3>
                  <p className="text-xs text-slate-400">{plan.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-amber-400">
                    NT${plan.price}
                  </div>
                  <div className="text-xs text-slate-500">Lv.{plan.level}</div>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-400 mb-1">包含模塊：</p>
                <div className="flex flex-wrap gap-1">
                  {plan.modules.length === 0 ? (
                    <span className="text-xs text-slate-500">無</span>
                  ) : (
                    plan.modules.map((m) => (
                      <Badge
                        key={m.id}
                        variant="outline"
                        className="text-xs border-slate-600 text-slate-300"
                      >
                        {m.icon} {m.name}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-slate-600 text-slate-300 hover:text-white"
                  onClick={() =>
                    setEditingPlan({
                      ...plan,
                      modules: plan.modules,
                    })
                  }
                >
                  編輯
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={`border-slate-600 ${
                    plan.isActive ? "text-red-400 hover:text-red-300" : "text-green-400 hover:text-green-300"
                  }`}
                  onClick={() =>
                    updateMutation.mutate({
                      id: plan.id,
                      isActive: plan.isActive ? 0 : 1,
                    })
                  }
                >
                  {plan.isActive ? "停用" : "啟用"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Plan Dialog */}
      <Dialog open={!!editingPlan} onOpenChange={() => setEditingPlan(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-amber-400">編輯方案</DialogTitle>
          </DialogHeader>
          {editingPlan && (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-400">方案名稱</label>
                  <Input
                    value={editingPlan.name}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, name: e.target.value })
                    }
                    className="bg-slate-800 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400">價格 (NT$)</label>
                  <Input
                    value={editingPlan.price}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, price: e.target.value })
                    }
                    className="bg-slate-800 border-slate-600 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-400">描述</label>
                <Input
                  value={editingPlan.description || ""}
                  onChange={(e) =>
                    setEditingPlan({ ...editingPlan, description: e.target.value })
                  }
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 block mb-2">包含模塊</label>
                <div className="space-y-2">
                  {(allModules as Module[]).map((m) => {
                    const isIncluded = editingPlan.modules.some((em) => em.id === m.id);
                    return (
                      <label
                        key={m.id}
                        className="flex items-center gap-3 p-2 rounded-lg border border-slate-700 cursor-pointer hover:border-slate-600"
                      >
                        <input
                          type="checkbox"
                          checked={isIncluded}
                          onChange={() => {
                            const currentIds = editingPlan.modules.map((em) => em.id);
                            const newIds = toggleModule(m.id, currentIds);
                            const newModules = (allModules as Module[]).filter((am) =>
                              newIds.includes(am.id)
                            );
                            setEditingPlan({ ...editingPlan, modules: newModules });
                          }}
                          className="accent-amber-500"
                        />
                        <span className="text-lg">{m.icon}</span>
                        <div>
                          <p className="text-sm text-white">{m.name}</p>
                          <p className="text-xs text-slate-400">{m.description}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`ml-auto text-xs ${
                            m.category === "core"
                              ? "border-blue-500 text-blue-400"
                              : "border-purple-500 text-purple-400"
                          }`}
                        >
                          {m.category === "core" ? "核心" : "加值"}
                        </Badge>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingPlan(null)}>
              取消
            </Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-black"
              onClick={() => {
                if (!editingPlan) return;
                updateMutation.mutate({
                  id: editingPlan.id,
                  name: editingPlan.name,
                  price: editingPlan.price,
                  description: editingPlan.description || undefined,
                  moduleIds: editingPlan.modules.map((m) => m.id),
                });
                setEditingPlan(null);
              }}
            >
              儲存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Plan Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-amber-400">新增方案</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-slate-400">方案 ID（英文）</label>
                <Input
                  value={newPlan.id}
                  onChange={(e) => setNewPlan({ ...newPlan, id: e.target.value })}
                  placeholder="advanced_599"
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400">等級</label>
                <Input
                  type="number"
                  value={newPlan.level}
                  onChange={(e) =>
                    setNewPlan({ ...newPlan, level: parseInt(e.target.value) || 1 })
                  }
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-slate-400">方案名稱</label>
                <Input
                  value={newPlan.name}
                  onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400">價格 (NT$)</label>
                <Input
                  value={newPlan.price}
                  onChange={(e) => setNewPlan({ ...newPlan, price: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-400">描述</label>
              <Input
                value={newPlan.description}
                onChange={(e) =>
                  setNewPlan({ ...newPlan, description: e.target.value })
                }
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 block mb-2">包含模塊</label>
              <div className="space-y-2">
                {(allModules as Module[]).map((m) => (
                  <label
                    key={m.id}
                    className="flex items-center gap-3 p-2 rounded-lg border border-slate-700 cursor-pointer hover:border-slate-600"
                  >
                    <input
                      type="checkbox"
                      checked={newPlan.moduleIds.includes(m.id)}
                      onChange={() => {
                        setNewPlan({
                          ...newPlan,
                          moduleIds: toggleModule(m.id, newPlan.moduleIds),
                        });
                      }}
                      className="accent-amber-500"
                    />
                    <span className="text-lg">{m.icon}</span>
                    <p className="text-sm text-white">{m.name}</p>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-black"
              onClick={() => {
                createMutation.mutate({
                  id: newPlan.id,
                  name: newPlan.name,
                  price: newPlan.price,
                  level: newPlan.level,
                  description: newPlan.description || undefined,
                  moduleIds: newPlan.moduleIds,
                });
              }}
            >
              新增
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Redemption Codes Panel ─────────────────────────────────────────
function RedemptionCodesPanel({ campaignId, campaignName }: { campaignId: number; campaignName: string }) {
  const utils = trpc.useUtils();
  const { data: codes = [], isLoading } = trpc.businessHub.listRedemptionCodes.useQuery({ campaignId });
  const [prefix, setPrefix] = useState("");
  const [count, setCount] = useState("1");
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);

  const generateMutation = trpc.businessHub.generateRedemptionCodes.useMutation({
    onSuccess: (data) => {
      utils.businessHub.listRedemptionCodes.invalidate({ campaignId });
      setGeneratedCodes(data.codes);
      toast.success(`已產生 ${data.codes.length} 組兌換碼`);
    },
    onError: (err) => toast.error(`產生失敗：${err.message}`),
  });

  const voidMutation = trpc.businessHub.voidRedemptionCode.useMutation({
    onSuccess: () => {
      utils.businessHub.listRedemptionCodes.invalidate({ campaignId });
      toast.success("已作廢兌換碼");
    },
  });

  const usedCount = codes.filter(c => c.isUsed).length;
  const voidedCount = codes.filter(c => c.isVoided).length;
  const availableCount = codes.filter(c => !c.isUsed && !c.isVoided).length;

  return (
    <div className="mt-4 border-t border-slate-700/50 pt-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-medium text-amber-300">🎫 兌換碼管理</p>
          <p className="text-xs text-slate-500">活動：{campaignName}</p>
        </div>
        <div className="flex gap-3 text-xs">
          <span className="text-green-400">可用 {availableCount}</span>
          <span className="text-amber-400">已用 {usedCount}</span>
          <span className="text-slate-600">作廢 {voidedCount}</span>
        </div>
      </div>

      {/* CSV 匯出按鈕 */}
      {codes.length > 0 && (
        <div className="flex justify-end mb-2">
          <button
            onClick={() => {
              const rows = [["code", "status", "usedAt", "usedBy"]];
              codes.forEach(c => rows.push([
                c.code,
                c.isVoided ? "已作廢" : c.isUsed ? "已使用" : "可用",
                c.usedAt ? new Date(c.usedAt).toLocaleString("zh-TW") : "",
                String(c.usedBy ?? ""),
              ]));
              const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
              const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = `${campaignName}-兌換碼.csv`; a.click();
              URL.revokeObjectURL(url);
              toast.success("已匯出 CSV");
            }}
            className="text-xs text-slate-400 hover:text-amber-400 transition-colors flex items-center gap-1"
          >
            ↓ 匯出 CSV
          </button>
        </div>
      )}

      {/* 產生碼區塊 */}
      <div className="flex gap-2 mb-3">
        <Input
          placeholder="前置碼（選填）"
          value={prefix}
          onChange={e => setPrefix(e.target.value.toUpperCase())}
          className="bg-slate-900/60 border-slate-700 text-slate-200 text-xs w-32"
        />
        <Input
          type="number"
          min="1"
          max="100"
          value={count}
          onChange={e => setCount(e.target.value)}
          className="bg-slate-900/60 border-slate-700 text-slate-200 text-xs w-20"
        />
        <Button
          size="sm"
          onClick={() => generateMutation.mutate({ campaignId, prefix, count: parseInt(count) || 1 })}
          disabled={generateMutation.isPending}
          className="bg-amber-600 hover:bg-amber-700 text-black text-xs shrink-0"
        >
          {generateMutation.isPending ? "產生中..." : "產生碼"}
        </Button>
      </div>

      {/* 剛產生的碼（方便複製） */}
      {generatedCodes.length > 0 && (
        <div className="mb-3 p-3 bg-green-900/20 border border-green-700/40 rounded-lg">
          <p className="text-xs text-green-400 font-medium mb-2">剛產生的兌換碼：</p>
          <div className="flex flex-wrap gap-1.5">
            {generatedCodes.map(code => (
              <code
                key={code}
                className="text-xs bg-slate-900 px-2 py-1 rounded font-mono text-green-300 cursor-pointer hover:bg-slate-800"
                onClick={() => { navigator.clipboard.writeText(code); toast.success("已複製"); }}
              >
                {code}
              </code>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">點擊碼可複製</p>
        </div>
      )}

      {/* 碼列表 */}
      {isLoading ? (
        <div className="text-xs text-slate-500 py-2">載入中...</div>
      ) : codes.length === 0 ? (
        <div className="text-xs text-slate-600 italic py-2">尚無兌換碼</div>
      ) : (
        <div className="max-h-48 overflow-y-auto space-y-1">
          {codes.map(c => (
            <div key={c.id} className={`flex items-center justify-between px-2 py-1 rounded text-xs ${
              c.isVoided ? "opacity-30" : c.isUsed ? "opacity-60" : ""
            }`}>
              <code className={`font-mono ${
                c.isVoided ? "text-slate-600 line-through" : c.isUsed ? "text-slate-400" : "text-slate-200"
              }`}>{c.code}</code>
              <div className="flex items-center gap-2">
                {c.isUsed && <span className="text-amber-400">已使用</span>}
                {c.isVoided && <span className="text-slate-600">已作廢</span>}
                {!c.isUsed && !c.isVoided && (
                  <button
                    onClick={() => voidMutation.mutate({ id: c.id })}
                    className="text-red-500 hover:text-red-400 text-[10px]"
                  >
                    作廢
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Campaigns Tab ───────────────────────────────────────────────
function CampaignsTab() {
  const utils = trpc.useUtils();
  const { data: campaigns = [], isLoading } = trpc.businessHub.listCampaigns.useQuery();
  const { data: allModules = [] } = trpc.businessHub.listModules.useQuery();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    startDate: "",
    endDate: "",
    ruleType: "giveaway" as "discount" | "giveaway",
    targetType: "all_users",
    giveawayModuleId: "",
    discountPercentage: "80",
    durationDays: "30",
  });

  const createMutation = trpc.businessHub.createCampaign.useMutation({
    onSuccess: () => {
      utils.businessHub.listCampaigns.invalidate();
      setShowCreateDialog(false);
      toast.success("行銷活動已建立");
    },
  });
  const updateMutation = trpc.businessHub.updateCampaign.useMutation({
    onSuccess: () => {
      utils.businessHub.listCampaigns.invalidate();
      toast.success("已更新");
    },
  });
  const setDefaultOnboardingMutation = trpc.businessHub.setDefaultOnboarding.useMutation({
    onSuccess: () => {
      utils.businessHub.listCampaigns.invalidate();
      toast.success("✨ 已設定為默認迎新活動！新用戶首次登錄將自動獲得此活動獎勵。");
    },
  });
  const clearDefaultOnboardingMutation = trpc.businessHub.clearDefaultOnboarding.useMutation({
    onSuccess: () => {
      utils.businessHub.listCampaigns.invalidate();
      toast.success("已取消默認迎新活動設定");
    },
  });
  const formatDate = (d: Date) =>
    new Date(d).toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

  const isActive = (c: Campaign) => {
    const now = new Date();
    return c.isActive && new Date(c.startDate) <= now && new Date(c.endDate) >= now;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-amber-400">行銷活動</h2>
          <p className="text-sm text-slate-400">設定折扣或贈送規則</p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-amber-500 hover:bg-amber-600 text-black"
        >
          + 新增活動
        </Button>
      </div>

      {isLoading ? (
        <div className="text-slate-400 text-center py-8">載入中...</div>
      ) : (campaigns as Campaign[]).length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <p className="text-4xl mb-3">🎪</p>
          <p>尚無行銷活動</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(campaigns as Campaign[]).map((c) => {
            const active = isActive(c);
            const ruleValue = c.ruleValue as Record<string, unknown>;
            return (
              <div
                key={c.id}
                className={`rounded-xl border p-4 transition-all ${
                  active
                    ? "border-green-500/40 bg-slate-800/60"
                    : "border-slate-700 bg-slate-800/30 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white">{c.name}</span>
                      <Badge
                        variant="outline"
                        className={
                          active
                            ? "border-green-500 text-green-400 text-xs"
                            : "border-slate-600 text-slate-400 text-xs"
                        }
                      >
                        {active ? "進行中" : "未啟用"}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          c.ruleType === "discount"
                            ? "border-orange-500 text-orange-400"
                            : "border-blue-500 text-blue-400"
                        }`}
                      >
                        {c.ruleType === "discount" ? "折扣" : "贈送"}
                      </Badge>
                      {c.isDefaultOnboarding === 1 && (
                        <Badge className="bg-amber-500/20 border border-amber-500 text-amber-300 text-xs">
                          🎟️ 迎新活動
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      {formatDate(c.startDate)} — {formatDate(c.endDate)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {c.ruleType === "discount"
                        ? `折扣 ${Math.round((1 - Number(ruleValue.discount_percentage ?? 0.8)) * 100)}%`
                        : `贈送模塊: ${ruleValue.giveaway_module_id ?? "—"} / ${ruleValue.duration_days ?? "∞"} 天`}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className={`border-slate-600 ${
                        c.isActive ? "text-red-400 hover:text-red-300" : "text-green-400 hover:text-green-300"
                      }`}
                      onClick={() =>
                        updateMutation.mutate({ id: c.id, isActive: c.isActive ? 0 : 1 })
                      }
                    >
                      {c.isActive ? "停用" : "啟用"}
                    </Button>
                    {c.isDefaultOnboarding === 1 ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-amber-600 text-amber-400 hover:text-amber-300 text-xs"
                        onClick={() => clearDefaultOnboardingMutation.mutate({ id: c.id })}
                      >
                        取消迎新
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-600 text-slate-400 hover:text-amber-300 hover:border-amber-500 text-xs"
                        onClick={() => setDefaultOnboardingMutation.mutate({ id: c.id })}
                      >
                        設為迎新
                      </Button>
                    )}
                  </div>
                </div>
                {/* 兌換碼管理區塊 */}
                <RedemptionCodesPanel campaignId={c.id} campaignName={c.name} />
              </div>
            );
          })}
        </div>
      )}

      {/* Create Campaign Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-amber-400">新增行銷活動</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-slate-400">活動名稱</label>
              <Input
                value={newCampaign.name}
                onChange={(e) =>
                  setNewCampaign({ ...newCampaign, name: e.target.value })
                }
                placeholder="周年慶特惠"
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-slate-400">開始日期</label>
                <Input
                  type="date"
                  value={newCampaign.startDate}
                  onChange={(e) =>
                    setNewCampaign({ ...newCampaign, startDate: e.target.value })
                  }
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400">結束日期</label>
                <Input
                  type="date"
                  value={newCampaign.endDate}
                  onChange={(e) =>
                    setNewCampaign({ ...newCampaign, endDate: e.target.value })
                  }
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-400">規則類型</label>
              <select
                value={newCampaign.ruleType}
                onChange={(e) =>
                  setNewCampaign({
                    ...newCampaign,
                    ruleType: e.target.value as "discount" | "giveaway",
                  })
                }
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white"
              >
                <option value="giveaway">贈送模塊</option>
                <option value="discount">折扣</option>
              </select>
            </div>

            {newCampaign.ruleType === "giveaway" ? (
              <>
                <div>
                  <label className="text-sm text-slate-400">贈送模塊</label>
                  <select
                    value={newCampaign.giveawayModuleId}
                    onChange={(e) =>
                      setNewCampaign({
                        ...newCampaign,
                        giveawayModuleId: e.target.value,
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white"
                  >
                    <option value="">選擇模塊...</option>
                    {(allModules as Module[]).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.icon} {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-slate-400">贈送天數（0 = 永久）</label>
                  <Input
                    type="number"
                    value={newCampaign.durationDays}
                    onChange={(e) =>
                      setNewCampaign({ ...newCampaign, durationDays: e.target.value })
                    }
                    className="bg-slate-800 border-slate-600 text-white"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="text-sm text-slate-400">折扣後價格百分比（如 80 = 八折）</label>
                <Input
                  type="number"
                  value={newCampaign.discountPercentage}
                  onChange={(e) =>
                    setNewCampaign({
                      ...newCampaign,
                      discountPercentage: e.target.value,
                    })
                  }
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-black"
              onClick={() => {
                const ruleValue =
                  newCampaign.ruleType === "giveaway"
                    ? {
                        giveaway_module_id: newCampaign.giveawayModuleId,
                        duration_days: parseInt(newCampaign.durationDays) || 0,
                      }
                    : {
                        discount_percentage:
                          parseInt(newCampaign.discountPercentage) / 100,
                      };
                createMutation.mutate({
                  name: newCampaign.name,
                  startDate: new Date(newCampaign.startDate).toISOString(),
                  endDate: new Date(newCampaign.endDate).toISOString(),
                  ruleType: newCampaign.ruleType,
                  ruleTarget: { target_type: newCampaign.targetType },
                  ruleValue,
                });
              }}
            >
              建立活動
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function AdminBusinessHub() {
  const { user } = useAuth();

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        需要管理員權限
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-amber-400">商業中心</h1>
          <p className="text-slate-400 text-sm mt-1">
            管理功能模塊、訂閱方案與行銷活動
          </p>
        </div>

        <Tabs defaultValue="modules" className="space-y-4">
          <TabsList className="bg-slate-800 border border-slate-700">
            <TabsTrigger
              value="modules"
              className="data-[state=active]:bg-amber-500 data-[state=active]:text-black"
            >
              🧩 模塊管理器
            </TabsTrigger>
            <TabsTrigger
              value="plans"
              className="data-[state=active]:bg-amber-500 data-[state=active]:text-black"
            >
              💎 方案與定價
            </TabsTrigger>
            <TabsTrigger
              value="campaigns"
              className="data-[state=active]:bg-amber-500 data-[state=active]:text-black"
            >
              🎪 行銷活動
            </TabsTrigger>
          </TabsList>

          <TabsContent value="modules">
            <ModuleManagerTab />
          </TabsContent>
          <TabsContent value="plans">
            <PlansTab />
          </TabsContent>
          <TabsContent value="campaigns">
            <CampaignsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
