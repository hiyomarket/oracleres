import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Settings, Database, Plus, Save, Loader2, Package, Compass,
  Shield, BarChart3, Pencil, Trash2, Eye, EyeOff,
} from "lucide-react";

// ─── 化解物品表單預設值 ───────────────────────────────────────
const EMPTY_REMEDY = {
  name: '', element: '木', category: 'plant', description: '',
  priceRange: '', applicableScene: 'both', sortOrder: 0,
};

type RemedyForm = typeof EMPTY_REMEDY;

// ─── 化解物品編輯 Dialog ──────────────────────────────────────
function RemedyFormDialog({
  open, onClose, initialData, onSubmit, isPending, mode,
}: {
  open: boolean;
  onClose: () => void;
  initialData: RemedyForm;
  onSubmit: (data: RemedyForm) => void;
  isPending: boolean;
  mode: 'add' | 'edit';
}) {
  const [form, setForm] = useState<RemedyForm>(initialData);

  // 當 initialData 改變時（切換編輯目標）重設表單
  const handleOpen = (isOpen: boolean) => {
    if (isOpen) setForm(initialData);
    else onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? '新增化解物品' : '編輯化解物品'}</DialogTitle>
          <DialogDescription>
            {mode === 'add' ? '填寫物品資訊後點擊新增' : '修改物品資訊後點擊儲存'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2">
            <Label className="text-xs">名稱 *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="如：小盆栽"
            />
          </div>
          <div>
            <Label className="text-xs">五行屬性</Label>
            <Select value={form.element} onValueChange={(v) => setForm(p => ({ ...p, element: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['木', '火', '土', '金', '水'].map(e => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">類別</Label>
            <Select value={form.category} onValueChange={(v) => setForm(p => ({ ...p, category: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="plant">植物</SelectItem>
                <SelectItem value="color">顏色物品</SelectItem>
                <SelectItem value="furniture">家具/擺設</SelectItem>
                <SelectItem value="accessory">隨身配件</SelectItem>
                <SelectItem value="lighting">燈光</SelectItem>
                <SelectItem value="water">水相關</SelectItem>
                <SelectItem value="crystal">水晶/礦石</SelectItem>
                <SelectItem value="other">其他</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label className="text-xs">說明</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="化解原理和使用方式"
              className="min-h-[60px] text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">價格區間</Label>
            <Input
              value={form.priceRange}
              onChange={(e) => setForm(p => ({ ...p, priceRange: e.target.value }))}
              placeholder="如：50-200元"
            />
          </div>
          <div>
            <Label className="text-xs">適用場景</Label>
            <Select value={form.applicableScene} onValueChange={(v) => setForm(p => ({ ...p, applicableScene: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="office">辦公室</SelectItem>
                <SelectItem value="home">租屋</SelectItem>
                <SelectItem value="both">兩者皆可</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">排序（數字越小越前）</Label>
            <Input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm(p => ({ ...p, sortOrder: Number(e.target.value) }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button
            onClick={() => onSubmit(form)}
            disabled={!form.name || isPending}
          >
            {isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
            {mode === 'add' ? '新增' : '儲存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── 主元件 ─────────────────────────────────────────────────────
export default function YangzhaiAdmin() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("config");

  // Dialog 狀態
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<(typeof EMPTY_REMEDY & { id: number }) | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  // 設定查詢
  const configQuery = trpc.yangzhai.admin.getAllConfig.useQuery(undefined, {
    enabled: !!user && user.role === 'admin',
  });

  // 化解物品查詢
  const remedyQuery = trpc.yangzhai.admin.getAllRemedyItems.useQuery(undefined, {
    enabled: !!user && user.role === 'admin',
  });

  // 統計查詢
  const statsQuery = trpc.yangzhai.admin.getAnalyticsStats.useQuery(undefined, {
    enabled: !!user && user.role === 'admin',
  });

  // Mutations
  const updateConfigMutation = trpc.yangzhai.admin.updateConfig.useMutation({
    onSuccess: () => { toast("設定已更新"); configQuery.refetch(); },
  });

  const initDefaultsMutation = trpc.yangzhai.admin.initDefaults.useMutation({
    onSuccess: (data) => { toast(`已初始化 ${data.created} 項預設設定`); configQuery.refetch(); },
  });

  const addRemedyMutation = trpc.yangzhai.admin.createRemedyItem.useMutation({
    onSuccess: () => {
      toast("化解物品已新增");
      remedyQuery.refetch();
      setAddDialogOpen(false);
    },
  });

  const updateRemedyMutation = trpc.yangzhai.admin.updateRemedyItem.useMutation({
    onSuccess: () => {
      toast("化解物品已更新");
      remedyQuery.refetch();
      setEditTarget(null);
    },
  });

  const toggleRemedyMutation = trpc.yangzhai.admin.toggleRemedyItem.useMutation({
    onSuccess: () => remedyQuery.refetch(),
  });

  const deleteRemedyMutation = trpc.yangzhai.admin.deleteRemedyItem.useMutation({
    onSuccess: () => {
      toast("化解物品已刪除");
      remedyQuery.refetch();
      setDeleteTarget(null);
    },
  });

  // 編輯設定
  const [editingConfig, setEditingConfig] = useState<Record<string, string>>({});

  if (!user || user.role !== 'admin') {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>需要管理員權限</p>
      </div>
    );
  }

  const categoryLabel = (cat: string) => ({
    plant: '植物', color: '顏色物品', furniture: '家具/擺設',
    accessory: '隨身配件', lighting: '燈光', water: '水相關',
    crystal: '水晶/礦石', other: '其他',
  }[cat] ?? cat);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Compass className="w-5 h-5 text-amber-400" />
            陽宅開運管理
          </h2>
          <p className="text-sm text-muted-foreground">管理風水參數、化解物品庫、形煞識別規則</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="config" className="gap-1.5">
            <Settings className="w-4 h-4" /> 參數設定
          </TabsTrigger>
          <TabsTrigger value="remedy" className="gap-1.5">
            <Package className="w-4 h-4" /> 化解物品庫
            {remedyQuery.data && (
              <Badge variant="secondary" className="ml-1 text-xs">{remedyQuery.data.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-1.5">
            <BarChart3 className="w-4 h-4" /> 使用統計
          </TabsTrigger>
        </TabsList>

        {/* ===== 參數設定 Tab ===== */}
        <TabsContent value="config" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              所有風水引擎的可調參數。修改後即時生效。
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => initDefaultsMutation.mutate()}
              disabled={initDefaultsMutation.isPending}
            >
              {initDefaultsMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Database className="w-4 h-4 mr-1" />
              )}
              初始化預設值
            </Button>
          </div>

          {configQuery.isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : !configQuery.data || configQuery.data.length === 0 ? (
            <Card className="p-8 text-center">
              <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground mb-4">尚未初始化設定</p>
              <Button onClick={() => initDefaultsMutation.mutate()}>初始化預設值</Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {Object.entries(
                (configQuery.data || []).reduce((acc: Record<string, typeof configQuery.data>, item) => {
                  const cat = item.category || 'general';
                  if (!acc[cat]) acc[cat] = [];
                  acc[cat]!.push(item);
                  return acc;
                }, {} as Record<string, typeof configQuery.data>)
              ).map(([category, items]) => (
                <Card key={category}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base capitalize">
                      {category === 'bazhai' ? '八宅參數' :
                       category === 'direction' ? '方位參數' :
                       category === 'formsha' ? '形煞參數' :
                       category === 'villain' ? '避小人參數' : category}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {items!.map((item) => (
                      <div key={item.configKey} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{item.configKey}</code>
                            {item.isActive ? (
                              <Badge variant="outline" className="text-green-400 border-green-500/30">啟用</Badge>
                            ) : (
                              <Badge variant="outline" className="text-red-400 border-red-500/30">停用</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{item.description}</p>
                          <Textarea
                            className="text-xs font-mono min-h-[60px]"
                            defaultValue={typeof item.configValue === 'string' ? item.configValue : JSON.stringify(item.configValue, null, 2)}
                            onChange={(e) => setEditingConfig(prev => ({ ...prev, [item.configKey]: e.target.value }))}
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!editingConfig[item.configKey] || updateConfigMutation.isPending}
                          onClick={() => {
                            let value: unknown = editingConfig[item.configKey];
                            try { value = JSON.parse(value as string); } catch { /* keep as string */ }
                            updateConfigMutation.mutate({
                              key: item.configKey,
                              value,
                              category: item.category || undefined,
                            });
                          }}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ===== 化解物品庫 Tab ===== */}
        <TabsContent value="remedy" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              管理系統推薦的化解物品。可新增、編輯、停用或刪除。
            </p>
            <Button size="sm" onClick={() => setAddDialogOpen(true)} className="gap-1.5">
              <Plus className="w-4 h-4" /> 新增物品
            </Button>
          </div>

          {/* 物品列表 */}
          {remedyQuery.isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : !remedyQuery.data || remedyQuery.data.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>尚無化解物品</p>
              <Button className="mt-4" size="sm" onClick={() => setAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-1" /> 新增第一筆
              </Button>
            </Card>
          ) : (
            <div className="space-y-2">
              {remedyQuery.data.map((item) => (
                <Card key={item.id} className={!item.isActive ? 'opacity-50' : ''}>
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-medium">{item.name}</span>
                          <Badge variant="outline" className="text-xs">{item.element}</Badge>
                          <Badge variant="secondary" className="text-xs">{categoryLabel(item.category)}</Badge>
                          <Badge variant="outline" className="text-xs">
                            {item.applicableScene === 'office' ? '辦公室' :
                             item.applicableScene === 'home' ? '租屋' : '通用'}
                          </Badge>
                          {item.priceRange && (
                            <span className="text-xs text-muted-foreground">{item.priceRange}</span>
                          )}
                          {!item.isActive && (
                            <Badge variant="destructive" className="text-xs">已停用</Badge>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {/* 啟停 */}
                        <Button
                          variant="ghost"
                          size="sm"
                          title={item.isActive ? '停用' : '啟用'}
                          onClick={() => toggleRemedyMutation.mutate({
                            id: item.id,
                            isActive: item.isActive ? 0 : 1,
                          })}
                        >
                          {item.isActive
                            ? <Eye className="w-4 h-4 text-green-400" />
                            : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                        </Button>
                        {/* 編輯 */}
                        <Button
                          variant="ghost"
                          size="sm"
                          title="編輯"
                          onClick={() => setEditTarget({
                            id: item.id,
                            name: item.name,
                            element: item.element,
                            category: item.category,
                            description: item.description || '',
                            priceRange: item.priceRange || '',
                            applicableScene: item.applicableScene || 'both',
                            sortOrder: item.sortOrder || 0,
                          })}
                        >
                          <Pencil className="w-4 h-4 text-amber-400" />
                        </Button>
                        {/* 刪除 */}
                        <Button
                          variant="ghost"
                          size="sm"
                          title="刪除"
                          onClick={() => setDeleteTarget({ id: item.id, name: item.name })}
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ===== 使用統計 Tab ===== */}
        <TabsContent value="stats">
          {statsQuery.isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : statsQuery.data ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-3xl font-bold text-amber-400">{statsQuery.data.total}</p>
                  <p className="text-sm text-muted-foreground">總分析次數</p>
                </CardContent>
              </Card>
              {statsQuery.data.byType?.map((item) => (
                <Card key={item.analysisType}>
                  <CardContent className="pt-4">
                    <Badge variant="outline" className="mb-2">
                      {item.analysisType === 'daily_direction' ? '每日方位' :
                       item.analysisType === 'form_sha_photo' ? '照片分析' :
                       item.analysisType === 'form_sha_quiz' ? '問答診斷' : item.analysisType}
                    </Badge>
                    <p className="text-2xl font-bold">{item.count}</p>
                    <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                      <p>平均分數: {item.avgScore ? Math.round(item.avgScore) : 'N/A'}</p>
                      <p className="text-green-400">有幫助: {item.helpfulCount || 0}</p>
                      <p className="text-red-400">沒幫助: {item.notHelpfulCount || 0}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}
        </TabsContent>
      </Tabs>

      {/* ===== 新增 Dialog ===== */}
      <RemedyFormDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        initialData={EMPTY_REMEDY}
        mode="add"
        isPending={addRemedyMutation.isPending}
        onSubmit={(form) => addRemedyMutation.mutate({
          name: form.name,
          element: form.element,
          category: form.category,
          description: form.description || undefined,
          priceRange: form.priceRange || undefined,
          applicableScene: form.applicableScene,
          sortOrder: form.sortOrder,
        })}
      />

      {/* ===== 編輯 Dialog ===== */}
      {editTarget && (
        <RemedyFormDialog
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          initialData={editTarget}
          mode="edit"
          isPending={updateRemedyMutation.isPending}
          onSubmit={(form) => updateRemedyMutation.mutate({
            id: editTarget.id,
            name: form.name,
            element: form.element,
            category: form.category,
            description: form.description || undefined,
            priceRange: form.priceRange || undefined,
            applicableScene: form.applicableScene,
            sortOrder: form.sortOrder,
          })}
        />
      )}

      {/* ===== 刪除確認 Dialog ===== */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>
              確定要刪除「{deleteTarget?.name}」嗎？此操作無法復原。
              如果只是暫時不需要，建議使用「停用」而非刪除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteRemedyMutation.mutate({ id: deleteTarget.id })}
              disabled={deleteRemedyMutation.isPending}
            >
              {deleteRemedyMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              確認刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
