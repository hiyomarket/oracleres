/**
 * 地圖節點管理 Tab
 * 顯示所有世界地圖節點，支援 CRUD、篩選、NPC 關聯查看
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const WUXING_COLORS: Record<string, string> = {
  木: "#2E8B57", 火: "#DC143C", 土: "#CD853F", 金: "#C9A227", 水: "#00CED1",
};
const REGION_COLORS: Record<string, string> = {
  初界: "#4CAF50", 中界: "#2196F3", 迷霧城: "#9C27B0", 試煉之塔: "#FF5722", 碎影深淵: "#F44336", 高界: "#FF9800",
};
const NODE_TYPES = ["city", "guild", "tower", "dungeon", "forest", "water", "market", "temple", "mountain", "village", "camp", "lab", "academy"];
const REGIONS = ["初界", "中界", "高界", "迷霧城", "試煉之塔", "碎影深淵"];
const WUXING_OPTIONS = ["木", "火", "土", "金", "水"];

type NodeFormData = {
  name: string;
  lat: number;
  lng: number;
  nodeType: string;
  wuxing: string;
  region: string;
  subRegion: string;
  description: string;
  levelMin: number;
  levelMax: number;
  realWorldName: string;
  sortOrder: number;
  isActive: number;
};

const defaultForm: NodeFormData = {
  name: "", lat: 25.033, lng: 121.565, nodeType: "city", wuxing: "金",
  region: "初界", subRegion: "", description: "", levelMin: 1, levelMax: 99,
  realWorldName: "", sortOrder: 0, isActive: 1,
};

export function MapNodesTab() {
  const utils = trpc.useUtils();
  const { data: nodes = [], isLoading } = trpc.gameAdmin.getMapNodes.useQuery();
  const createMutation = trpc.gameAdmin.createMapNode.useMutation({
    onSuccess: () => { utils.gameAdmin.getMapNodes.invalidate(); toast.success("節點已建立"); setDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.gameAdmin.updateMapNode.useMutation({
    onSuccess: () => { utils.gameAdmin.getMapNodes.invalidate(); toast.success("節點已更新"); setDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.gameAdmin.deleteMapNode.useMutation({
    onSuccess: () => { utils.gameAdmin.getMapNodes.invalidate(); toast.success("節點已刪除"); },
    onError: (e) => toast.error(e.message),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<NodeFormData>(defaultForm);
  const [filterRegion, setFilterRegion] = useState("__all__");
  const [search, setSearch] = useState("");
  const [npcDialogOpen, setNpcDialogOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);

  const filteredNodes = useMemo(() => {
    return nodes.filter((n: any) => {
      if (filterRegion !== "__all__" && n.region !== filterRegion) return false;
      if (search && !n.name.includes(search) && !(n.realWorldName || "").includes(search)) return false;
      return true;
    });
  }, [nodes, filterRegion, search]);

  const regionStats = useMemo(() => {
    const stats: Record<string, number> = {};
    for (const n of nodes) {
      stats[(n as any).region || "未知"] = (stats[(n as any).region || "未知"] || 0) + 1;
    }
    return stats;
  }, [nodes]);

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEdit = (node: any) => {
    setEditingId(node.id);
    setForm({
      name: node.name, lat: node.lat, lng: node.lng, nodeType: node.nodeType,
      wuxing: node.wuxing, region: node.region || "初界", subRegion: node.subRegion || "",
      description: node.description || "", levelMin: node.levelMin || 1, levelMax: node.levelMax || 99,
      realWorldName: node.realWorldName || "", sortOrder: node.sortOrder || 0, isActive: node.isActive ?? 1,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error("請輸入節點名稱"); return; }
    const data = {
      ...form,
      subRegion: form.subRegion || null,
      description: form.description || null,
      realWorldName: form.realWorldName || null,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data as any);
    }
  };

  const showNpcs = (nodeId: number) => {
    setSelectedNodeId(nodeId);
    setNpcDialogOpen(true);
  };

  return (
    <div>
      {/* 統計卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-4">
        <Card className="bg-card/50">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold">{nodes.length}</div>
            <div className="text-xs text-muted-foreground">總節點數</div>
          </CardContent>
        </Card>
        {REGIONS.map(r => (
          <Card key={r} className="bg-card/50">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold" style={{ color: REGION_COLORS[r] }}>{regionStats[r] || 0}</div>
              <div className="text-xs text-muted-foreground">{r}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 篩選列 */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Input
          placeholder="搜尋節點名稱/真實地名..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={filterRegion} onValueChange={setFilterRegion}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全部區域</SelectItem>
            {REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={openCreate} size="sm">+ 新增節點</Button>
      </div>

      {/* 節點列表 */}
      {isLoading ? <p className="text-muted-foreground">載入中…</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2 px-2">ID</th>
                <th className="text-left py-2 px-2">名稱</th>
                <th className="text-left py-2 px-2">區域</th>
                <th className="text-left py-2 px-2">類型</th>
                <th className="text-left py-2 px-2">五行</th>
                <th className="text-left py-2 px-2">等級</th>
                <th className="text-left py-2 px-2">真實地名</th>
                <th className="text-center py-2 px-2">NPC</th>
                <th className="text-left py-2 px-2">狀態</th>
                <th className="text-right py-2 px-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredNodes.map((node: any) => (
                <tr key={node.id} className="border-b hover:bg-accent/30 transition-colors">
                  <td className="py-2 px-2 text-muted-foreground">{node.id}</td>
                  <td className="py-2 px-2 font-medium">{node.name}</td>
                  <td className="py-2 px-2">
                    <Badge style={{ backgroundColor: REGION_COLORS[node.region] || "#888", color: "#fff" }} className="text-xs">
                      {node.region}
                    </Badge>
                  </td>
                  <td className="py-2 px-2 text-muted-foreground">{node.nodeType}</td>
                  <td className="py-2 px-2">
                    <Badge style={{ backgroundColor: WUXING_COLORS[node.wuxing] || "#888", color: "#fff" }} className="text-xs">
                      {node.wuxing}
                    </Badge>
                  </td>
                  <td className="py-2 px-2 text-muted-foreground">Lv.{node.levelMin}-{node.levelMax}</td>
                  <td className="py-2 px-2 text-xs text-muted-foreground max-w-[150px] truncate">{node.realWorldName || "-"}</td>
                  <td className="py-2 px-2 text-center">
                    {node.npcCount > 0 ? (
                      <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={() => showNpcs(node.id)}>
                        {node.npcCount} 人
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-xs">0</span>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    <Badge variant={node.isActive ? "default" : "secondary"} className="text-xs">
                      {node.isActive ? "啟用" : "停用"}
                    </Badge>
                  </td>
                  <td className="py-2 px-2 text-right">
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => openEdit(node)}>編輯</Button>
                    <Button variant="ghost" size="sm" className="text-xs h-7 text-red-400" onClick={() => {
                      if (confirm(`確定刪除「${node.name}」？`)) deleteMutation.mutate({ id: node.id });
                    }}>刪除</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredNodes.length === 0 && <p className="text-center text-muted-foreground py-8">沒有符合條件的節點</p>}
        </div>
      )}

      {/* 新增/編輯 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "編輯節點" : "新增節點"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <label className="text-xs text-muted-foreground">節點名稱</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如：迷霧城・戰士公會大廳" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">區域</label>
                <Select value={form.region} onValueChange={(v) => setForm({ ...form, region: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">子區域</label>
                <Input value={form.subRegion} onChange={(e) => setForm({ ...form, subRegion: e.target.value })} placeholder="如：戰士公會大廳" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">緯度</label>
                <Input type="number" step="0.0001" value={form.lat} onChange={(e) => setForm({ ...form, lat: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">經度</label>
                <Input type="number" step="0.0001" value={form.lng} onChange={(e) => setForm({ ...form, lng: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">節點類型</label>
                <Select value={form.nodeType} onValueChange={(v) => setForm({ ...form, nodeType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NODE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">五行</label>
                <Select value={form.wuxing} onValueChange={(v) => setForm({ ...form, wuxing: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WUXING_OPTIONS.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">排序</label>
                <Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">最低等級</label>
                <Input type="number" value={form.levelMin} onChange={(e) => setForm({ ...form, levelMin: parseInt(e.target.value) || 1 })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">最高等級</label>
                <Input type="number" value={form.levelMax} onChange={(e) => setForm({ ...form, levelMax: parseInt(e.target.value) || 99 })} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">真實世界地名</label>
              <Input value={form.realWorldName} onChange={(e) => setForm({ ...form, realWorldName: e.target.value })} placeholder="如：台北市信義區・台北101" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">描述</label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">狀態</label>
              <Select value={String(form.isActive)} onValueChange={(v) => setForm({ ...form, isActive: parseInt(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">啟用</SelectItem>
                  <SelectItem value="0">停用</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? "儲存中…" : "儲存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NPC 列表 Dialog */}
      <NpcListDialog open={npcDialogOpen} onOpenChange={setNpcDialogOpen} nodeId={selectedNodeId} />
    </div>
  );
}

function NpcListDialog({ open, onOpenChange, nodeId }: { open: boolean; onOpenChange: (v: boolean) => void; nodeId: number | null }) {
  const { data: npcs = [], isLoading } = trpc.gameAdmin.getNpcsByNode.useQuery(
    { nodeId: nodeId! },
    { enabled: !!nodeId && open }
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>節點 NPC 列表</DialogTitle>
        </DialogHeader>
        {isLoading ? <p className="text-muted-foreground">載入中…</p> : (
          <div className="space-y-2">
            {npcs.map((npc: any) => (
              <div key={npc.id} className="flex items-center gap-3 p-2 rounded bg-accent/20">
                {npc.avatarUrl ? (
                  <img src={npc.avatarUrl} alt={npc.name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-sm">
                    {npc.name?.[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{npc.name}</div>
                  <div className="text-xs text-muted-foreground">{npc.title || "無稱號"}</div>
                </div>
                <Badge variant="outline" className="text-xs">{npc.region}</Badge>
              </div>
            ))}
            {npcs.length === 0 && <p className="text-center text-muted-foreground py-4">此節點沒有 NPC</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
