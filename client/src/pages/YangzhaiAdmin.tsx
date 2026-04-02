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
  Settings, Database, Plus, Save, Loader2, Package, Compass,
  Shield, BarChart3,
} from "lucide-react";

export default function YangzhaiAdmin() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("config");

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
    onSuccess: () => {
      toast("設定已更新");
      configQuery.refetch();
    },
  });

  const initDefaultsMutation = trpc.yangzhai.admin.initDefaults.useMutation({
    onSuccess: (data) => {
      toast(`已初始化 ${data.created} 項預設設定`);
      configQuery.refetch();
    },
  });

  // createRemedyItem is the correct API name
  const addRemedyMutation = trpc.yangzhai.admin.createRemedyItem.useMutation({
    onSuccess: () => {
      toast("化解物品已新增");
      remedyQuery.refetch();
    },
  });

  const updateRemedyMutation = trpc.yangzhai.admin.updateRemedyItem.useMutation({
    onSuccess: () => {
      toast("化解物品已更新");
      remedyQuery.refetch();
    },
  });

  // 新增化解物品表單
  const [newRemedy, setNewRemedy] = useState({
    name: '', element: '木', category: 'plant', description: '',
    priceRange: '', applicableScene: 'both', sortOrder: 0,
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
              <Button onClick={() => initDefaultsMutation.mutate()}>
                初始化預設值
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {/* 按 category 分組 */}
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
                            let value: any = editingConfig[item.configKey];
                            try { value = JSON.parse(value); } catch { /* keep as string */ }
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
          {/* 新增表單 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="w-4 h-4" /> 新增化解物品
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">名稱</Label>
                  <Input
                    value={newRemedy.name}
                    onChange={(e) => setNewRemedy(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="如：小盆栽"
                  />
                </div>
                <div>
                  <Label className="text-xs">五行屬性</Label>
                  <Select value={newRemedy.element} onValueChange={(v) => setNewRemedy(prev => ({ ...prev, element: v }))}>
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
                  <Select value={newRemedy.category} onValueChange={(v) => setNewRemedy(prev => ({ ...prev, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="plant">植物</SelectItem>
                      <SelectItem value="color">顏色物品</SelectItem>
                      <SelectItem value="furniture">家具/擺設</SelectItem>
                      <SelectItem value="accessory">隨身配件</SelectItem>
                      <SelectItem value="lighting">燈光</SelectItem>
                      <SelectItem value="water">水相關</SelectItem>
                      <SelectItem value="other">其他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">說明</Label>
                  <Input
                    value={newRemedy.description}
                    onChange={(e) => setNewRemedy(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="化解原理和使用方式"
                  />
                </div>
                <div>
                  <Label className="text-xs">價格區間</Label>
                  <Input
                    value={newRemedy.priceRange}
                    onChange={(e) => setNewRemedy(prev => ({ ...prev, priceRange: e.target.value }))}
                    placeholder="如：50-200元"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">適用場景</Label>
                  <Select value={newRemedy.applicableScene} onValueChange={(v) => setNewRemedy(prev => ({ ...prev, applicableScene: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="office">辦公室</SelectItem>
                      <SelectItem value="home">租屋</SelectItem>
                      <SelectItem value="both">兩者皆可</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={() => {
                      addRemedyMutation.mutate({
                        name: newRemedy.name,
                        element: newRemedy.element,
                        category: newRemedy.category,
                        description: newRemedy.description || undefined,
                        priceRange: newRemedy.priceRange || undefined,
                        applicableScene: newRemedy.applicableScene,
                        sortOrder: newRemedy.sortOrder,
                      });
                      setNewRemedy({ name: '', element: '木', category: 'plant', description: '', priceRange: '', applicableScene: 'both', sortOrder: 0 });
                    }}
                    disabled={!newRemedy.name || addRemedyMutation.isPending}
                    className="w-full"
                  >
                    {addRemedyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                    新增
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 物品列表 */}
          {remedyQuery.isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {remedyQuery.data?.map((item) => (
                <Card key={item.id} className={item.isActive ? '' : 'opacity-50'}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{item.element}</Badge>
                        <span className="font-medium">{item.name}</span>
                        <Badge variant="secondary">{item.category}</Badge>
                        {item.priceRange && (
                          <span className="text-xs text-muted-foreground">{item.priceRange}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!!item.isActive}
                          onCheckedChange={(checked) => {
                            updateRemedyMutation.mutate({
                              id: item.id,
                              isActive: checked ? 1 : 0,
                            });
                          }}
                        />
                      </div>
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-2">{item.description}</p>
                    )}
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

              {/* 按類型統計 */}
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
    </div>
  );
}
