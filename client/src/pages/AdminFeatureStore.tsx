import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Package, Plus, Pencil, Trash2, CheckCircle, XCircle, Gift, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";

// ==================== 功能方案管理 ====================

interface PlanFormData {
  id: string;
  moduleId: string;
  name: string;
  description: string;
  points3Days: string;
  points7Days: string;
  points15Days: string;
  points30Days: string;
  shopUrl: string;
  allowPointsRedemption: boolean;
  allowPurchase: boolean;
  isActive: boolean;
  sortOrder: string;
}

const emptyPlanForm: PlanFormData = {
  id: "",
  moduleId: "",
  name: "",
  description: "",
  points3Days: "",
  points7Days: "",
  points15Days: "",
  points30Days: "",
  shopUrl: "",
  allowPointsRedemption: true,
  allowPurchase: true,
  isActive: true,
  sortOrder: "0",
};

function PlansTab() {
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState<PlanFormData>(emptyPlanForm);
  const [isEditing, setIsEditing] = useState(false);

  const { data: plans = [], refetch } = trpc.featureStore.adminListPlans.useQuery();
  const { data: modules = [] } = trpc.businessHub.listModules.useQuery();

  const upsertMutation = trpc.featureStore.adminUpsertPlan.useMutation({
    onSuccess: () => {
      toast.success(isEditing ? "功能方案已更新" : "功能方案已新增");
      setShowDialog(false);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.featureStore.adminDeletePlan.useMutation({
    onSuccess: () => { toast.success("已刪除"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const openCreate = () => {
    setForm(emptyPlanForm);
    setIsEditing(false);
    setShowDialog(true);
  };

  const openEdit = (plan: typeof plans[0]) => {
    setForm({
      id: plan.id,
      moduleId: plan.moduleId,
      name: plan.name,
      description: plan.description ?? "",
      points3Days: plan.points3Days?.toString() ?? "",
      points7Days: plan.points7Days?.toString() ?? "",
      points15Days: plan.points15Days?.toString() ?? "",
      points30Days: plan.points30Days?.toString() ?? "",
      shopUrl: plan.shopUrl ?? "",
      allowPointsRedemption: plan.allowPointsRedemption === 1,
      allowPurchase: plan.allowPurchase === 1,
      isActive: plan.isActive === 1,
      sortOrder: plan.sortOrder.toString(),
    });
    setIsEditing(true);
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!form.id || !form.moduleId || !form.name) {
      toast.error("請填寫必填欄位（ID、模塊、名稱）");
      return;
    }
    upsertMutation.mutate({
      id: form.id,
      moduleId: form.moduleId,
      name: form.name,
      description: form.description || undefined,
      points3Days: form.points3Days ? parseInt(form.points3Days) : null,
      points7Days: form.points7Days ? parseInt(form.points7Days) : null,
      points15Days: form.points15Days ? parseInt(form.points15Days) : null,
      points30Days: form.points30Days ? parseInt(form.points30Days) : null,
      shopUrl: form.shopUrl || null,
      allowPointsRedemption: form.allowPointsRedemption,
      allowPurchase: form.allowPurchase,
      isActive: form.isActive,
      sortOrder: parseInt(form.sortOrder) || 0,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">設定可供用戶兌換的功能方案</p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1" />
          新增方案
        </Button>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">尚無功能方案，點擊「新增方案」開始設定</p>
        </div>
      ) : (
        <div className="space-y-2">
          {plans.map((plan) => (
            <div key={plan.id} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{plan.name}</span>
                  <Badge variant="outline" className="text-xs">{plan.id}</Badge>
                  {plan.isActive === 0 && <Badge variant="secondary" className="text-xs">停用</Badge>}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex gap-3 flex-wrap">
                  {plan.allowPointsRedemption === 1 && (
                    <span>積分：{plan.points3Days ?? "-"} / {plan.points7Days ?? "-"} / {plan.points15Days ?? "-"} / {plan.points30Days ?? "-"}</span>
                  )}
                  {plan.allowPurchase === 1 && plan.shopUrl && (
                    <span className="text-blue-400">付費購買已啟用</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 ml-2">
                <Button variant="ghost" size="sm" onClick={() => openEdit(plan)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm(`確定要刪除「${plan.name}」嗎？`)) {
                      deleteMutation.mutate({ id: plan.id });
                    }
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 新增/編輯 Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "編輯功能方案" : "新增功能方案"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>方案 ID *</Label>
                <Input
                  placeholder="例：wbc_casino"
                  value={form.id}
                  onChange={(e) => setForm({ ...form, id: e.target.value })}
                  disabled={isEditing}
                />
              </div>
              <div className="space-y-1">
                <Label>排序</Label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>對應模塊 *</Label>
              <Select value={form.moduleId} onValueChange={(v) => setForm({ ...form, moduleId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇模塊" />
                </SelectTrigger>
                <SelectContent>
                  {(modules as Array<{ id: string; name: string }>).map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>方案名稱 *</Label>
              <Input
                placeholder="例：天命娛樂城競猜"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label>說明（選填）</Label>
              <Textarea
                placeholder="功能說明..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>

            {/* 積分兌換設定 */}
            <div className="border border-border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-amber-400">積分兌換</Label>
                <Switch
                  checked={form.allowPointsRedemption}
                  onCheckedChange={(v) => setForm({ ...form, allowPointsRedemption: v })}
                />
              </div>
              {form.allowPointsRedemption && (
                <div className="grid grid-cols-2 gap-2">
                  {([3, 7, 15, 30] as const).map((days) => {
                    const key = `points${days}Days` as keyof PlanFormData;
                    return (
                      <div key={days} className="space-y-1">
                        <Label className="text-xs">{days}天（積分）</Label>
                        <Input
                          type="number"
                          placeholder="0 = 不開放"
                          value={form[key] as string}
                          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 付費購買設定 */}
            <div className="border border-border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-blue-400">付費購買</Label>
                <Switch
                  checked={form.allowPurchase}
                  onCheckedChange={(v) => setForm({ ...form, allowPurchase: v })}
                />
              </div>
              {form.allowPurchase && (
                <div className="space-y-1">
                  <Label className="text-xs">商城連結</Label>
                  <Input
                    placeholder="https://shop.example.com/..."
                    value={form.shopUrl}
                    onChange={(e) => setForm({ ...form, shopUrl: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Label>啟用此方案</Label>
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button>
            <Button onClick={handleSave} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? "儲存中..." : "儲存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== 訂單審核 ====================

function OrdersTab() {
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const { data: orders = [], refetch } = trpc.featureStore.adminListOrders.useQuery({ status: statusFilter });

  const reviewMutation = trpc.featureStore.adminReviewOrder.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.action === "approve" ? "已核准，功能已開通" : "已拒絕");
      setShowRejectDialog(false);
      setRejectReason("");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {(["pending", "approved", "rejected", "all"] as const).map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(s)}
          >
            {{ pending: "待審核", approved: "已通過", rejected: "已拒絕", all: "全部" }[s]}
          </Button>
        ))}
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          目前沒有{statusFilter === "pending" ? "待審核" : ""}訂單
        </div>
      ) : (
        <div className="space-y-2">
          {(orders as Array<{
            id: number;
            userName: string;
            planName: string;
            durationDays: number;
            externalOrderId: string;
            userNote: string | null;
            status: string;
            rejectReason: string | null;
            createdAt: Date | string;
          }>).map((order) => (
            <div key={order.id} className="p-3 rounded-lg bg-card border border-border space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{order.userName}</span>
                    <Badge variant="outline" className="text-xs">{order.planName}</Badge>
                    <Badge variant="secondary" className="text-xs">+{order.durationDays}天</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    訂單號：<span className="text-foreground font-mono">{order.externalOrderId}</span>
                  </p>
                  {order.userNote && (
                    <p className="text-xs text-muted-foreground mt-0.5">備註：{order.userNote}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    提交時間：{new Date(order.createdAt).toLocaleString("zh-TW")}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  {order.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs"
                        onClick={() => reviewMutation.mutate({ orderId: order.id, action: "approve" })}
                        disabled={reviewMutation.isPending}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        核准
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 text-xs"
                        onClick={() => {
                          setSelectedOrderId(order.id);
                          setShowRejectDialog(true);
                        }}
                      >
                        <XCircle className="w-3 h-3 mr-1" />
                        拒絕
                      </Button>
                    </>
                  )}
                  {order.status === "approved" && (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">已通過</Badge>
                  )}
                  {order.status === "rejected" && (
                    <div className="text-right">
                      <Badge variant="destructive" className="text-xs">已拒絕</Badge>
                      {order.rejectReason && (
                        <p className="text-xs text-muted-foreground mt-0.5 max-w-[100px]">{order.rejectReason}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 拒絕原因 Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle>填寫拒絕原因</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="請說明拒絕原因（選填）"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>取消</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedOrderId) {
                  reviewMutation.mutate({
                    orderId: selectedOrderId,
                    action: "reject",
                    rejectReason: rejectReason || undefined,
                  });
                }
              }}
              disabled={reviewMutation.isPending}
            >
              確認拒絕
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== 手動核發 ====================

function GrantTab() {
  const [userId, setUserId] = useState("");
  const [featurePlanId, setFeaturePlanId] = useState("");
  const [durationDays, setDurationDays] = useState("30");
  const [note, setNote] = useState("");

  const { data: plans = [] } = trpc.featureStore.adminListPlans.useQuery();

  const grantMutation = trpc.featureStore.adminGrantDays.useMutation({
    onSuccess: () => {
      toast.success("已成功核發天數，用戶將收到通知");
      setUserId("");
      setFeaturePlanId("");
      setDurationDays("30");
      setNote("");
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-4 max-w-md">
      <p className="text-sm text-muted-foreground">手動為指定用戶核發功能天數（不扣除積分）</p>

      <div className="space-y-1">
        <Label>用戶 ID</Label>
        <Input
          type="number"
          placeholder="輸入用戶 ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <Label>功能方案</Label>
        <Select value={featurePlanId} onValueChange={setFeaturePlanId}>
          <SelectTrigger>
            <SelectValue placeholder="選擇功能方案" />
          </SelectTrigger>
          <SelectContent>
            {(plans as Array<{ id: string; name: string }>).map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label>核發天數</Label>
        <Input
          type="number"
          min="1"
          max="365"
          value={durationDays}
          onChange={(e) => setDurationDays(e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <Label>備註（選填）</Label>
        <Input
          placeholder="例：客服補償、活動贈送..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <Button
        onClick={() => {
          if (!userId || !featurePlanId || !durationDays) {
            toast.error("請填寫所有必填欄位");
            return;
          }
          grantMutation.mutate({
            userId: parseInt(userId),
            featurePlanId,
            durationDays: parseInt(durationDays),
            note: note || undefined,
          });
        }}
        disabled={grantMutation.isPending}
        className="w-full"
      >
        <Gift className="w-4 h-4 mr-2" />
        {grantMutation.isPending ? "核發中..." : "確認核發"}
      </Button>
    </div>
  );
}

// ==================== 主頁面 ====================

export default function AdminFeatureStore() {
  return (
    <AdminLayout>
      <div className="container py-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6 text-amber-400" />
            功能兌換中心管理
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            設定功能方案、審核付費訂單、手動核發天數
          </p>
        </div>

        <Tabs defaultValue="plans">
          <TabsList className="mb-6">
            <TabsTrigger value="plans">功能方案設定</TabsTrigger>
            <TabsTrigger value="orders">訂單審核</TabsTrigger>
            <TabsTrigger value="grant">手動核發</TabsTrigger>
          </TabsList>
          <TabsContent value="plans"><PlansTab /></TabsContent>
          <TabsContent value="orders"><OrdersTab /></TabsContent>
          <TabsContent value="grant"><GrantTab /></TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
