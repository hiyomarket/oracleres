/**
 * 師資後台 - 訂單管理 v10.1
 * - 訂單詳情展開
 * - 確認訂單（expertConfirmBooking）
 * - 取消訂單（expertCancelBooking）
 * - 標記完成（completeBooking）
 * - 進入聊天室
 */
import { useState } from "react";
import { ExpertLayout } from "@/components/ExpertLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  CheckCircle, XCircle, Eye, MessageCircle, ChevronDown, ChevronUp,
  Calendar, Clock, User, DollarSign, FileText, AlertCircle, Loader2, Search,
} from "lucide-react";
import { useLocation } from "wouter";
import { BOOKING_STATUS_COLOR as STATUS_COLOR, BOOKING_STATUS_LABEL as STATUS_LABEL, formatDateTime, formatPrice } from "@/lib/expertConstants";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { TableSkeleton } from "@/components/ExpertSkeleton";

type StatusFilter = "all" | "pending_payment" | "confirmed" | "completed" | "cancelled";

export default function ExpertOrders() {
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cancelTargetId, setCancelTargetId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [confirmTargetId, setConfirmTargetId] = useState<number | null>(null);
  const [confirmMessage, setConfirmMessage] = useState("");

  const { data: orders, isLoading } = trpc.expert.listMyBookings.useQuery({ status: statusFilter });

  // 前端搜尋過濾（用戶名、服務名稱）
  const filteredOrders = (orders ?? []).filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (o.userName ?? "").toLowerCase().includes(q) ||
      (o.serviceTitle ?? "").toLowerCase().includes(q) ||
      String(o.id).includes(q)
    );
  });
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const pagedOrders = filteredOrders.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const confirmMutation = trpc.expert.expertConfirmBooking.useMutation({
    onSuccess: () => {
      toast.success("✅ 已確認預約，系統已通知用戶");
      setConfirmTargetId(null);
      setConfirmMessage("");
      utils.expert.listMyBookings.invalidate();
    },
    onError: (e) => toast.error("操作失敗: " + e.message),
  });

  const cancelMutation = trpc.expert.expertCancelBooking.useMutation({
    onSuccess: () => {
      toast.success("訂單已取消，系統已通知用戶");
      setCancelTargetId(null);
      setCancelReason("");
      utils.expert.listMyBookings.invalidate();
    },
    onError: (e) => toast.error("取消失敗: " + e.message),
  });

  const completeMutation = trpc.expert.completeBooking.useMutation({
    onSuccess: () => {
      toast.success("✅ 已標記為完成");
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

  const pendingCount = orders?.filter((o) => o.status === "pending_payment").length ?? 0;

  return (
    <ExpertLayout pageTitle="訂單管理">
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4 md:space-y-6">
        <div className="hidden md:flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">訂單管理</h1>
            <p className="text-muted-foreground text-sm mt-1">管理用戶的預約訂單</p>
          </div>
          {pendingCount > 0 && (
            <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30">
              {pendingCount} 筆待確認
            </Badge>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="搜尋用戶名稱、服務名稱或訂單編號..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
            className="w-full px-4 py-2.5 pl-10 rounded-xl bg-accent/30 border border-border/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
              {t.value === "pending_payment" && pendingCount > 0 && (
                <span className="ml-1.5 bg-amber-500 text-black text-xs rounded-full px-1.5 py-0.5">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Orders List */}
        {isLoading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : !filteredOrders || filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              目前沒有符合條件的訂單
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pagedOrders.map((order) => {
              const isExpanded = expandedId === order.id;
              const canConfirm = order.status === "pending_payment";
              const canCancel = order.status === "pending_payment" || order.status === "confirmed";
              const canComplete = order.status === "confirmed";
              const canMessage = order.status !== "cancelled";

              return (
                <Card
                  key={order.id}
                  className={`border transition-all ${
                    order.status === "pending_payment"
                      ? "border-amber-500/30 bg-amber-500/3"
                      : "border-border/50"
                  }`}
                >
                  <CardContent className="p-0">
                    {/* Status bar */}
                    <div className={`h-0.5 rounded-t-xl ${
                      order.status === "pending_payment" ? "bg-amber-500" :
                      order.status === "confirmed" ? "bg-green-500" :
                      order.status === "completed" ? "bg-blue-500" : "bg-red-500/50"
                    }`} />

                    <div className="p-4">
                      {/* Header Row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{order.serviceTitle}</span>
                            <Badge className={`text-xs border flex-shrink-0 ${STATUS_COLOR[order.status] ?? ""}`}>
                              {STATUS_LABEL[order.status] ?? order.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {order.userName || "用戶"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(order.bookingTime).toLocaleDateString("zh-TW")}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(order.bookingTime).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {order.servicePrice != null && (
                            <span className="text-sm font-bold text-amber-400">
                              NT$ {order.servicePrice.toLocaleString()}
                            </span>
                          )}
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : order.id)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Detail */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
                          {/* Order ID */}
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>訂單編號</span>
                            <span className="font-mono">#{order.id}</span>
                          </div>

                          {/* Notes */}
                          {order.notes && (
                            <div className="flex items-start gap-2 text-xs">
                              <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-muted-foreground mb-0.5">用戶備註</p>
                                <p>{order.notes}</p>
                              </div>
                            </div>
                          )}

                          {/* Payment Proof */}
                          {order.paymentProofUrl && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">付款憑證：</span>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() => setPreviewUrl(order.paymentProofUrl!)}
                              >
                                <Eye className="w-3 h-3" /> 查看憑證
                              </Button>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex gap-2 flex-wrap pt-1">
                            {canConfirm && (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white gap-1.5 text-xs"
                                onClick={() => { setConfirmTargetId(order.id); setConfirmMessage(""); }}
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> 確認預約
                              </Button>
                            )}
                            {canComplete && (
                              <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-xs"
                                onClick={() => completeMutation.mutate({ bookingId: order.id })}
                                disabled={completeMutation.isPending}
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> 標記完成
                              </Button>
                            )}
                            {canMessage && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-xs"
                                onClick={() => navigate(`/messages?bookingId=${order.id}`)}
                              >
                                <MessageCircle className="w-3.5 h-3.5" /> 與用戶溝通
                              </Button>
                            )}
                            {canCancel && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-xs text-red-400 border-red-500/30 hover:border-red-500/60 hover:bg-red-500/10"
                                onClick={() => { setCancelTargetId(order.id); setCancelReason(""); }}
                              >
                                <XCircle className="w-3.5 h-3.5" /> 取消訂單
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="text-xs"
            >
              上一頁
            </Button>
            <span className="text-xs text-muted-foreground">
              {page + 1} / {totalPages}（共 {filteredOrders.length} 筆）
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="text-xs"
            >
              下一頁
            </Button>
          </div>
        )}
      </div>

      {/* Confirm Booking Dialog */}
      <Dialog open={confirmTargetId !== null} onOpenChange={(open) => !open && setConfirmTargetId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-5 h-5" /> 確認預約
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">確認後系統將自動通知用戶，並在聊天室發送確認訊息。</p>
            <Textarea
              placeholder="附加訊息給用戶（選填）例：請準備好出生日期資料"
              value={confirmMessage}
              onChange={(e) => setConfirmMessage(e.target.value)}
              rows={3}
              className="text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmTargetId(null)}>取消</Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => confirmTargetId && confirmMutation.mutate({
                bookingId: confirmTargetId,
                message: confirmMessage || undefined,
              })}
              disabled={confirmMutation.isPending}
            >
              {confirmMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "確認預約"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Booking Dialog */}
      <Dialog open={cancelTargetId !== null} onOpenChange={(open) => !open && setCancelTargetId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5" /> 確認取消訂單
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">取消後無法恢復，系統將自動通知用戶。</p>
            <Textarea
              placeholder="取消原因（選填，將通知用戶）"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              className="text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTargetId(null)}>保留訂單</Button>
            <Button
              variant="destructive"
              onClick={() => cancelTargetId && cancelMutation.mutate({
                bookingId: cancelTargetId,
                reason: cancelReason || undefined,
              })}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "確認取消"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Proof Preview */}
      {previewUrl && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <img src={previewUrl} alt="付款憑證" className="w-full rounded-lg" />
            <Button variant="outline" className="mt-3 w-full" onClick={() => setPreviewUrl(null)}>
              關閉
            </Button>
          </div>
        </div>
      )}
    </ExpertLayout>
  );
}
