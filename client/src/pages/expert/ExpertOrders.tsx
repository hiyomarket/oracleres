import { useState } from "react";
import { ExpertLayout } from "@/components/ExpertLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, XCircle, Eye } from "lucide-react";

const STATUS_COLOR: Record<string, string> = {
  pending_payment: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  confirmed: "bg-green-500/20 text-green-400 border-green-500/30",
  completed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};
const STATUS_LABEL: Record<string, string> = {
  pending_payment: "待確認付款",
  confirmed: "已確認",
  completed: "已完成",
  cancelled: "已取消",
};

type StatusFilter = "all" | "pending_payment" | "confirmed" | "completed" | "cancelled";

export default function ExpertOrders() {
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: orders, isLoading } = trpc.expert.listMyBookings.useQuery({ status: statusFilter });

  const confirmMutation = trpc.expert.confirmPayment.useMutation({
    onSuccess: () => {
      toast("✅ 已確認付款，預約成立");
      utils.expert.listMyBookings.invalidate();
    },
    onError: (e) => toast.error("操作失敗: " + e.message),
  });

  const completeMutation = trpc.expert.completeBooking.useMutation({
    onSuccess: () => {
      toast("✅ 已標記為完成");
      utils.expert.listMyBookings.invalidate();
    },
    onError: (e) => toast.error("操作失敗: " + e.message),
  });

  const tabs: { label: string; value: StatusFilter }[] = [
    { label: "全部", value: "all" },
    { label: "待確認", value: "pending_payment" },
    { label: "已確認", value: "confirmed" },
    { label: "已完成", value: "completed" },
    { label: "已取消", value: "cancelled" },
  ];

  return (
    <ExpertLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">訂單管理</h1>
          <p className="text-muted-foreground text-sm mt-1">管理用戶的預約訂單</p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.value}
              onClick={() => setStatusFilter(t.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                statusFilter === t.value
                  ? "bg-amber-500 text-black"
                  : "bg-accent/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Orders List */}
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">載入中…</p>
        ) : !orders || orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              目前沒有符合條件的訂單
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="border border-border/50">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{order.serviceTitle}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {order.userName || "用戶"} · {new Date(order.bookingTime).toLocaleString("zh-TW")}
                      </p>
                    </div>
                    <Badge className={`text-xs border flex-shrink-0 ${STATUS_COLOR[order.status] ?? ""}`}>
                      {STATUS_LABEL[order.status] ?? order.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {order.notes && (
                    <p className="text-sm text-muted-foreground bg-accent/30 rounded-lg p-2.5">
                      備註：{order.notes}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">金額：</span>
                    <span className="text-sm font-medium text-amber-400">NT$ {order.servicePrice?.toLocaleString() ?? "—"}</span>
                  </div>
                  {order.paymentProofUrl && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">付款憑證：</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => setPreviewUrl(order.paymentProofUrl!)}
                      >
                        <Eye className="w-3 h-3" /> 查看
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    {order.status === "pending_payment" && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                        onClick={() => confirmMutation.mutate({ bookingId: order.id })}
                        disabled={confirmMutation.isPending}
                      >
                        <CheckCircle className="w-4 h-4" /> 確認付款
                      </Button>
                    )}
                    {order.status === "confirmed" && (
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                        onClick={() => completeMutation.mutate({ bookingId: order.id })}
                        disabled={completeMutation.isPending}
                      >
                        <CheckCircle className="w-4 h-4" /> 標記完成
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Payment Proof Preview Modal */}
        {previewUrl && (
          <div
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setPreviewUrl(null)}
          >
            <div className="max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
              <img src={previewUrl} alt="付款憑證" className="w-full rounded-lg" />
              <Button
                variant="outline"
                className="mt-3 w-full"
                onClick={() => setPreviewUrl(null)}
              >
                關閉
              </Button>
            </div>
          </div>
        )}
      </div>
    </ExpertLayout>
  );
}
