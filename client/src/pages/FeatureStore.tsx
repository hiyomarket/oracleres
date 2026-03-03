import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { toast } from "sonner";
import { Coins, ShoppingCart, Clock, CheckCircle, AlertTriangle, ExternalLink, History, Package, ArrowLeft, Crown, Star, CalendarDays, Zap } from "lucide-react";
import { SharedNav } from "@/components/SharedNav";

type DurationDays = 3 | 7 | 15 | 30;
type PurchaseDays = 15 | 30;

interface FeaturePlan {
  id: string;
  moduleId: string;
  name: string;
  description: string | null;
  points3Days: number | null;
  points7Days: number | null;
  points15Days: number | null;
  points30Days: number | null;
  shopUrl: string | null;
  allowPointsRedemption: number;
  allowPurchase: number;
  isActive: number;
  sortOrder: number;
  module: { id: string; name: string; description: string | null; icon: string | null } | null;
  userStatus: {
    includedInPlan: boolean;
    expiresAt: string | null;
    isActive: boolean;
    currentPoints: number;
  };
}

const DURATION_LABELS: Record<DurationDays, string> = {
  3: "3 天",
  7: "7 天",
  15: "15 天",
  30: "30 天",
};

export default function FeatureStore() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // 兌換流程狀態
  const [selectedPlan, setSelectedPlan] = useState<FeaturePlan | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<DurationDays | null>(null);
  const [showRedeemDialog, setShowRedeemDialog] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<{
    type: string;
    message: string;
    expiresAt: string | null;
  } | null>(null);

  // 付費訂單狀態
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [selectedPurchasePlan, setSelectedPurchasePlan] = useState<FeaturePlan | null>(null);
  const [selectedPurchaseDays, setSelectedPurchaseDays] = useState<PurchaseDays | null>(null);
  const [externalOrderId, setExternalOrderId] = useState("");
  const [userNote, setUserNote] = useState("");

  // 查詢
  const { data: plans = [], isLoading, refetch } = trpc.featureStore.list.useQuery();
  const { data: history } = trpc.featureStore.myHistory.useQuery();
  const { data: planInfo } = trpc.featureStore.myPlanInfo.useQuery();

  // Mutations
  const redeemMutation = trpc.featureStore.redeem.useMutation({
    onSuccess: (data) => {
      toast.success(`兌換成功！功能已延長 ${data.durationDays} 天，剩餘積分：${data.remainingPoints} 點`);
      setShowRedeemDialog(false);
      setShowConflictDialog(false);
      setSelectedPlan(null);
      setSelectedDuration(null);
      refetch();
    },
    onError: (err) => {
      toast.error(`兌換失敗：${err.message}`);
    },
  });

  const createOrderMutation = trpc.featureStore.createOrder.useMutation({
    onSuccess: () => {
      toast.success("訂單已提交！管理員將盡快審核，通過後功能自動開通");
      setShowOrderDialog(false);
      setExternalOrderId("");
      setUserNote("");
      refetch();
    },
    onError: (err) => {
      toast.error(`提交失敗：${err.message}`);
    },
  });

  // 積分兌換流程
  const handleRedeemClick = async (plan: FeaturePlan, days: DurationDays) => {
    setSelectedPlan(plan);
    setSelectedDuration(days);

    // 先做衝突檢查 - 使用 useQuery 方式，這裡直接用 plan 的 userStatus 判斷
    const { userStatus } = plan;
    if (userStatus.includedInPlan || userStatus.isActive) {
      let conflictType = "none";
      let conflictMessage = "";
      if (userStatus.includedInPlan && userStatus.isActive) {
        conflictType = "plan_and_custom";
        conflictMessage = "您目前的方案已包含此功能，且您也有單獨購買的有效期限。兌換後將累加到期時間。";
      } else if (userStatus.includedInPlan) {
        conflictType = "included_in_plan";
        conflictMessage = "您目前的方案已包含此功能。您仍可兌換以延長到期保障，但方案有效期間內無需額外購買。";
      } else if (userStatus.isActive && userStatus.expiresAt) {
        conflictType = "already_active";
        conflictMessage = `此功能目前仍在有效期內（到期：${new Date(userStatus.expiresAt).toLocaleDateString("zh-TW")}）。兌換後將累加到期時間。`;
      }
      if (conflictType !== "none") {
        setConflictInfo({ type: conflictType, message: conflictMessage, expiresAt: userStatus.expiresAt });
        setShowConflictDialog(true);
        return;
      }
    }
    setShowRedeemDialog(true);
  };

  const confirmRedeem = (confirmedConflict = false) => {
    if (!selectedPlan || !selectedDuration) return;
    redeemMutation.mutate({
      featurePlanId: selectedPlan.id,
      durationDays: selectedDuration,
      confirmedConflict,
    });
  };

  // 付費購買流程
  const handlePurchaseClick = (plan: FeaturePlan, days: PurchaseDays) => {
    if (plan.shopUrl) {
      window.open(plan.shopUrl, "_blank");
    }
    setSelectedPurchasePlan(plan);
    setSelectedPurchaseDays(days);
    setShowOrderDialog(true);
  };

  const submitOrder = () => {
    if (!selectedPurchasePlan || !selectedPurchaseDays || !externalOrderId.trim()) return;
    createOrderMutation.mutate({
      featurePlanId: selectedPurchasePlan.id,
      durationDays: selectedPurchaseDays,
      externalOrderId: externalOrderId.trim(),
      userNote: userNote.trim() || undefined,
    });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Package className="w-12 h-12 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">請先登入以使用功能兌換中心</p>
        </div>
      </div>
    );
  }

  const currentPoints = (plans[0] as FeaturePlan | undefined)?.userStatus.currentPoints ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <SharedNav currentPage="feature-store" />
    <div className="container py-6 max-w-4xl">
      {/* 頁首 */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回首頁
        </button>
      </div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6 text-amber-400" />
            功能兌換中心
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            使用積分兌換或付費購買進階功能模塊
          </p>
        </div>
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2">
          <Coins className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium text-amber-400">{currentPoints.toLocaleString()} 積分</span>
        </div>
      </div>

      {/* 我的方案資訊卡 - 始終顯示 */}
      <div className="mb-6 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent p-4">
        {planInfo ? (
          <>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Crown className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{planInfo.planName}</span>
                    <Badge className="text-xs bg-amber-500/20 text-amber-300 border-amber-500/30 border">
                      目前方案
                    </Badge>
                    {planInfo.planId === 'basic' && (
                      <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground">
                        免費方案
                      </Badge>
                    )}
                  </div>
                  {planInfo.planExpiresAt ? (
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" />
                      方案到期：{new Date(planInfo.planExpiresAt).toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5">方案效期：永久有效</p>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground">我的積分</p>
                <p className="text-base font-bold text-amber-400">{(planInfo.pointsBalance ?? currentPoints).toLocaleString()} <span className="text-xs font-normal">點</span></p>
              </div>
            </div>

            {planInfo.subscribedFeatures.length > 0 ? (
              <div className="mt-3 pt-3 border-t border-amber-500/20">
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  已啟用功能（{planInfo.subscribedFeatures.length} 項）
                </p>
                <div className="flex flex-wrap gap-2">
                  {planInfo.subscribedFeatures.map((f) => (
                    <div
                      key={f.moduleId}
                      className="flex items-center gap-1.5 text-xs bg-background/60 border border-border rounded-lg px-2.5 py-1.5"
                    >
                      {f.icon && <span>{f.icon}</span>}
                      <span className="font-medium">{f.name}</span>
                      {f.source === "custom" && f.expiresAt && (
                        <span className="text-amber-300/80 ml-1 flex items-center gap-0.5">
                          <CalendarDays className="w-2.5 h-2.5" />
                          {new Date(f.expiresAt).toLocaleDateString("zh-TW", { year: "numeric", month: "numeric", day: "numeric" })} 到期
                        </span>
                      )}
                      {f.source === "custom" && !f.expiresAt && (
                        <span className="text-emerald-400/80 ml-1">永久</span>
                      )}
                      {f.source === "plan" && (
                        <span className="flex items-center gap-0.5 text-amber-400/80 ml-1">
                          <Star className="w-2.5 h-2.5" />
                          方案含
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-2">
                目前尚未啟用任何進階功能，可在下方選擇方案兌換或購買
              </p>
            )}
          </>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted/50 animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-3 w-24 bg-muted/50 animate-pulse rounded" />
              <div className="h-2.5 w-36 bg-muted/50 animate-pulse rounded" />
            </div>
          </div>
        )}
      </div>

      <Tabs defaultValue="store">
        <TabsList className="mb-6">
          <TabsTrigger value="store">
            <Package className="w-4 h-4 mr-1" />
            功能商城
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="w-4 h-4 mr-1" />
            兌換紀錄
          </TabsTrigger>
        </TabsList>

        {/* 功能商城 */}
        <TabsContent value="store">
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>目前沒有可兌換的功能</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {(plans as FeaturePlan[]).map((plan) => (
                <FeaturePlanCard
                  key={plan.id}
                  plan={plan}
                  currentPoints={currentPoints}
                  onRedeem={handleRedeemClick}
                  onPurchase={handlePurchaseClick}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* 兌換紀錄 */}
        <TabsContent value="history">
          <div className="space-y-6">
            {/* 積分兌換紀錄 */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                積分兌換紀錄
              </h3>
              {!history?.redemptions.length ? (
                <p className="text-muted-foreground text-sm">尚無兌換紀錄</p>
              ) : (
                <div className="space-y-2">
                  {history.redemptions.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border text-sm">
                      <div>
                        <span className="font-medium">{r.planName}</span>
                        <span className="text-muted-foreground ml-2">+{r.durationDays}天</span>
                        {r.source === "admin" && <Badge variant="secondary" className="ml-2 text-xs">管理員核發</Badge>}
                        {r.source === "purchase" && <Badge variant="outline" className="ml-2 text-xs">付費購買</Badge>}
                      </div>
                      <div className="text-right">
                        {r.pointsSpent > 0 && (
                          <span className="text-amber-400 text-xs">-{r.pointsSpent} 積分</span>
                        )}
                        <p className="text-muted-foreground text-xs">
                          到期：{new Date(r.newExpiresAt).toLocaleDateString("zh-TW")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 付費訂單紀錄 */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-blue-400" />
                付費訂單紀錄
              </h3>
              {!history?.orders.length ? (
                <p className="text-muted-foreground text-sm">尚無訂單紀錄</p>
              ) : (
                <div className="space-y-2">
                  {history.orders.map((o) => (
                    <div key={o.id} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border text-sm">
                      <div>
                        <span className="font-medium">{o.planName}</span>
                        <span className="text-muted-foreground ml-2">+{o.durationDays}天</span>
                        <p className="text-muted-foreground text-xs mt-0.5">訂單號：{o.externalOrderId}</p>
                      </div>
                      <OrderStatusBadge status={o.status} rejectReason={o.rejectReason} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* 積分兌換確認 Dialog */}
      <Dialog open={showRedeemDialog} onOpenChange={setShowRedeemDialog}>
        <DialogContent className="mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle>確認兌換</DialogTitle>
            <DialogDescription>
              即將兌換 <strong>{selectedPlan?.name}</strong> — {selectedDuration ? DURATION_LABELS[selectedDuration] : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">所需積分</span>
              <span className="font-semibold text-amber-400">
                {selectedPlan && selectedDuration
                  ? (selectedDuration === 3 ? selectedPlan.points3Days :
                     selectedDuration === 7 ? selectedPlan.points7Days :
                     selectedDuration === 15 ? selectedPlan.points15Days :
                     selectedPlan.points30Days) ?? 0
                  : 0} 點
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">目前積分</span>
              <span>{currentPoints.toLocaleString()} 點</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">兌換後積分</span>
              <span>
                {selectedPlan && selectedDuration
                  ? currentPoints - ((selectedDuration === 3 ? selectedPlan.points3Days :
                     selectedDuration === 7 ? selectedPlan.points7Days :
                     selectedDuration === 15 ? selectedPlan.points15Days :
                     selectedPlan.points30Days) ?? 0)
                  : currentPoints} 點
              </span>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowRedeemDialog(false)}>取消</Button>
            <Button
              onClick={() => confirmRedeem(false)}
              disabled={redeemMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {redeemMutation.isPending ? "兌換中..." : "確認兌換"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 衝突警告 Dialog */}
      <Dialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <DialogContent className="mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              注意：方案衝突提醒
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground leading-relaxed">{conflictInfo?.message}</p>
            {conflictInfo?.expiresAt && (
              <p className="text-sm mt-3">
                目前到期日：<strong>{new Date(conflictInfo.expiresAt).toLocaleDateString("zh-TW")}</strong>
              </p>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowConflictDialog(false)}>取消</Button>
            <Button
              onClick={() => {
                setShowConflictDialog(false);
                setShowRedeemDialog(true);
              }}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              我了解，繼續兌換
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 付費訂單 Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle>填入訂單資訊</DialogTitle>
            <DialogDescription>
              請先前往商城完成購買，再將訂單號填入此處等待審核
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
              <p><span className="text-muted-foreground">功能：</span><strong>{selectedPurchasePlan?.name}</strong></p>
              <p><span className="text-muted-foreground">時長：</span><strong>{selectedPurchaseDays ? DURATION_LABELS[selectedPurchaseDays as DurationDays] : ""}</strong></p>
            </div>
            {selectedPurchasePlan?.shopUrl && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => window.open(selectedPurchasePlan.shopUrl!, "_blank")}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                前往商城購買
              </Button>
            )}
            <div className="space-y-2">
              <Label htmlFor="orderId">商城訂單號 *</Label>
              <Input
                id="orderId"
                placeholder="請輸入您在商城的訂單號"
                value={externalOrderId}
                onChange={(e) => setExternalOrderId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">備註（選填）</Label>
              <Textarea
                id="note"
                placeholder="如有任何說明，請填寫於此"
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowOrderDialog(false)}>取消</Button>
            <Button
              onClick={submitOrder}
              disabled={!externalOrderId.trim() || createOrderMutation.isPending}
            >
              {createOrderMutation.isPending ? "提交中..." : "提交訂單"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}

// 功能方案卡片元件
function FeaturePlanCard({
  plan,
  currentPoints,
  onRedeem,
  onPurchase,
}: {
  plan: FeaturePlan;
  currentPoints: number;
  onRedeem: (plan: FeaturePlan, days: DurationDays) => void;
  onPurchase: (plan: FeaturePlan, days: PurchaseDays) => void;
}) {
  const { userStatus } = plan;
  const redeemDurations: DurationDays[] = [3, 7, 15, 30];
  const purchaseDurations: PurchaseDays[] = [15, 30];

  const getPointsForDays = (days: DurationDays): number | null => {
    if (days === 3) return plan.points3Days;
    if (days === 7) return plan.points7Days;
    if (days === 15) return plan.points15Days;
    return plan.points30Days;
  };

  return (
    <Card className="relative overflow-hidden border-border bg-card hover:border-amber-500/40 transition-colors">
      {/* 狀態標籤 */}
      <div className="absolute top-3 right-3 flex gap-1">
        {userStatus.includedInPlan && (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
            <CheckCircle className="w-3 h-3 mr-1" />
            方案已含
          </Badge>
        )}
        {userStatus.isActive && !userStatus.includedInPlan && (
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
            <Clock className="w-3 h-3 mr-1" />
            使用中
          </Badge>
        )}
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          {plan.module?.icon && (
            <span className="text-2xl">{plan.module.icon}</span>
          )}
          <div>
            <CardTitle className="text-base">{plan.name}</CardTitle>
            {plan.description && (
              <CardDescription className="text-xs mt-0.5">{plan.description}</CardDescription>
            )}
          </div>
        </div>
        {userStatus.expiresAt && (
          <p className="text-xs text-muted-foreground mt-2">
            到期日：{new Date(userStatus.expiresAt).toLocaleDateString("zh-TW")}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 積分兌換 */}
        {plan.allowPointsRedemption === 1 && (
          <div>
            <p className="text-xs font-medium text-amber-400 mb-2 flex items-center gap-1">
              <Coins className="w-3 h-3" />
              積分兌換
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {redeemDurations.map((days) => {
                const cost = getPointsForDays(days);
                if (!cost || cost <= 0) return null;
                const canAfford = currentPoints >= cost;
                return (
                  <Button
                    key={days}
                    variant="outline"
                    size="sm"
                    className={`text-xs h-9 flex-col gap-0 ${canAfford ? "hover:border-amber-500/60" : "opacity-50"}`}
                    disabled={!canAfford}
                    onClick={() => onRedeem(plan, days)}
                  >
                    <span>{days}天</span>
                    <span className="text-amber-400">{cost.toLocaleString()}積分</span>
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* 付費購買 */}
        {plan.allowPurchase === 1 && (
          <div>
            <p className="text-xs font-medium text-blue-400 mb-2 flex items-center gap-1">
              <ShoppingCart className="w-3 h-3" />
              付費購買
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {purchaseDurations.map((days) => (
                <Button
                  key={days}
                  variant="outline"
                  size="sm"
                  className="text-xs h-9 hover:border-blue-500/60"
                  onClick={() => onPurchase(plan, days)}
                >
                  {days === 15 ? "15天" : "30天"}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 訂單狀態標籤
function OrderStatusBadge({ status, rejectReason }: { status: string; rejectReason?: string | null }) {
  if (status === "pending") return <Badge variant="secondary" className="text-xs">審核中</Badge>;
  if (status === "approved") return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">已通過</Badge>;
  if (status === "rejected") return (
    <div className="text-right">
      <Badge variant="destructive" className="text-xs">已拒絕</Badge>
      {rejectReason && <p className="text-xs text-muted-foreground mt-0.5 max-w-[120px] text-right">{rejectReason}</p>}
    </div>
  );
  return null;
}
