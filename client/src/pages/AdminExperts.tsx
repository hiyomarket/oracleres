import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Search, CheckCircle, XCircle, Clock, Star, Eye, Ban, RefreshCw } from "lucide-react";

type ExpertStatus = "active" | "inactive" | "pending_review";
const STATUS_COLOR: Record<ExpertStatus, string> = {
  pending_review: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  inactive: "bg-red-500/20 text-red-400 border-red-500/30",
};
const STATUS_LABEL: Record<ExpertStatus, string> = {
  pending_review: "審核中",
  active: "已上架",
  inactive: "已停用",
};
const STATUS_ICON: Record<ExpertStatus, React.ReactNode> = {
  pending_review: <Clock className="w-3.5 h-3.5" />,
  active: <CheckCircle className="w-3.5 h-3.5" />,
  inactive: <XCircle className="w-3.5 h-3.5" />,
};

const BOOKING_STATUS_COLOR: Record<string, string> = {
  pending_payment: "bg-yellow-500/20 text-yellow-400",
  confirmed: "bg-green-500/20 text-green-400",
  completed: "bg-blue-500/20 text-blue-400",
  cancelled: "bg-red-500/20 text-red-400",
};
const BOOKING_STATUS_LABEL: Record<string, string> = {
  pending_payment: "待付款",
  confirmed: "已確認",
  completed: "已完成",
  cancelled: "已取消",
};

export default function AdminExperts() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "pending_review" | "all">("all");
  const [selectedExpert, setSelectedExpert] = useState<number | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ExpertStatus>("active");
  const [adminNote, setAdminNote] = useState("");
  const [activeTab, setActiveTab] = useState<"experts" | "bookings">("experts");

  const { data: experts = [], isLoading, refetch } = trpc.expert.adminListExperts.useQuery({ status: statusFilter });
  const { data: bookingsData = [], isLoading: bookingsLoading } = trpc.expert.adminListAllBookings.useQuery({ status: "all" });

  const updateStatusMutation = trpc.expert.adminUpdateExpertStatus.useMutation({
    onSuccess: () => {
      toast.success("專家狀態已更新");
      setShowStatusDialog(false);
      setAdminNote("");
      refetch();
      utils.expert.adminListExperts.invalidate();
    },
    onError: (e: { message: string }) => toast.error("更新失敗: " + e.message),
  });

  const updateBookingStatusMutation = trpc.expert.adminUpdateBookingStatus.useMutation({
    onSuccess: () => {
      toast.success("訂單狀態已更新");
      utils.expert.adminListAllBookings.invalidate();
    },
    onError: (e: { message: string }) => toast.error("更新失敗: " + e.message),
  });

  const [revokeExpertTarget, setRevokeExpertTarget] = useState<{ expertId: number; userId: number; name: string } | null>(null);
  const revokeExpertMutation = trpc.expert.adminRevokeExpertRole.useMutation({
    onSuccess: () => {
      toast.success("已撤銷命理師資格，該用戶已回归一般用戶");
      setRevokeExpertTarget(null);
      refetch();
    },
    onError: (e: { message: string }) => toast.error("撤銷失敗: " + e.message),
  });

  const handleStatusChange = (expertId: number, newStatus: ExpertStatus) => {
    setSelectedExpert(expertId);
    setPendingStatus(newStatus);
    setShowStatusDialog(true);
  };

  const confirmStatusChange = () => {
    if (!selectedExpert) return;
    updateStatusMutation.mutate({
      expertId: selectedExpert,
      status: pendingStatus,
    });
  };

  const filteredExperts = experts.filter((e) => {
    return !search || e.publicName.toLowerCase().includes(search.toLowerCase());
  });

  const pendingCount = experts.filter((e) => e.status === "pending_review").length;
  const pendingBookings = bookingsData.filter((b) => b.status === "pending_payment").length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-amber-400" />
              專家管理
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              審核專家申請、管理上架狀態、監控預約訂單
            </p>
          </div>
          <div className="flex gap-2">
            {pendingCount > 0 && (
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 border">
                {pendingCount} 待審核
              </Badge>
            )}
            {pendingBookings > 0 && (
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 border">
                {pendingBookings} 待確認訂單
              </Badge>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border/50">
          {[
            { key: "experts", label: "專家列表" },
            { key: "bookings", label: "預約訂單" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as "experts" | "bookings")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-amber-500 text-amber-400"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "experts" && (
          <>
            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="搜尋專家名稱…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部狀態</SelectItem>
                  <SelectItem value="pending_review">審核中</SelectItem>
                  <SelectItem value="active">已上架</SelectItem>
                  <SelectItem value="inactive">已停用</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            {/* Expert List */}
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-20 rounded-xl bg-accent/30 animate-pulse" />
                ))}
              </div>
            ) : filteredExperts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>目前沒有符合條件的專家</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredExperts.map((expert) => {
                  const st = expert.status as ExpertStatus;
                  return (
                  <Card key={expert.id} className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500/30 to-amber-700/30 flex-shrink-0 flex items-center justify-center text-lg font-bold">
                            {expert.publicName[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{expert.publicName}</span>
                              <Badge className={`text-xs border ${STATUS_COLOR[st] ?? ""}`}>
                                <span className="flex items-center gap-1">
                                  {STATUS_ICON[st]}
                                  {STATUS_LABEL[st] ?? st}
                                </span>
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-amber-400" />
                                {expert.ratingAvg ? Number(expert.ratingAvg).toFixed(1) : "新"} ({expert.ratingCount ?? 0})
                              </span>
                              <span>ID: {expert.id}</span>
                              <span>用戶: {expert.userName ?? expert.userId}</span>
                              <span className="opacity-60">{expert.userEmail}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {st === "pending_review" && (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handleStatusChange(expert.id, "active")}
                            >
                              <CheckCircle className="w-3.5 h-3.5 mr-1" /> 通過審核
                            </Button>
                          )}
                          {st === "active" && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleStatusChange(expert.id, "inactive")}
                            >
                              <Ban className="w-3.5 h-3.5 mr-1" /> 停用
                            </Button>
                          )}
                          {st === "inactive" && (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handleStatusChange(expert.id, "active")}
                            >
                              <CheckCircle className="w-3.5 h-3.5 mr-1" /> 恢復上架
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRevokeExpertTarget({ expertId: expert.id, userId: expert.userId, name: expert.publicName })}
                            className="border-red-600/50 text-red-400 hover:bg-red-600/20 bg-transparent text-xs"
                          >
                            ✕ 撤銷資格
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            )}
          </>
        )}

        {activeTab === "bookings" && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">共 {bookingsData.length} 筆預約訂單</p>
              <Button variant="outline" size="sm" onClick={() => utils.expert.adminListAllBookings.invalidate()}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            {bookingsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-20 rounded-xl bg-accent/30 animate-pulse" />
                ))}
              </div>
            ) : bookingsData.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Eye className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>目前沒有預約訂單</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {bookingsData.map((booking) => (
                  <Card key={booking.id} className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">訂單 #{booking.id}</span>
                            <Badge className={`text-xs ${BOOKING_STATUS_COLOR[booking.status] ?? ""}`}>
                              {BOOKING_STATUS_LABEL[booking.status] ?? booking.status}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <p>用戶: {booking.userName ?? "—"} → 專家: {booking.expertName ?? "—"}</p>
                            <p>服務: {booking.serviceTitle ?? "—"} | 金額: NT$ {booking.servicePrice?.toLocaleString() ?? "—"}</p>
                            <p>預約時間: {new Date(booking.bookingTime).toLocaleString("zh-TW")}</p>
                            <p>建立時間: {new Date(booking.createdAt).toLocaleString("zh-TW")}</p>
                            {booking.paymentProofUrl && (
                              <a
                                href={booking.paymentProofUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-amber-400 hover:underline flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" /> 查看付款憑證
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {booking.status === "pending_payment" && (
                            <>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => updateBookingStatusMutation.mutate({ bookingId: booking.id, status: "confirmed" })}
                              >
                                確認付款
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => updateBookingStatusMutation.mutate({ bookingId: booking.id, status: "cancelled" })}
                              >
                                取消
                              </Button>
                            </>
                          )}
                          {booking.status === "confirmed" && (
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={() => updateBookingStatusMutation.mutate({ bookingId: booking.id, status: "completed" })}
                            >
                              標記完成
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Status Change Confirmation Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認狀態變更</DialogTitle>
            <DialogDescription>
              將此專家狀態更改為「{STATUS_LABEL[pendingStatus]}」
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">管理員備注（選填）</label>
              <Input
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="例如：資料不完整，請補充…"
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>取消</Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-black"
              onClick={confirmStatusChange}
              disabled={updateStatusMutation.isPending}
            >
              確認
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 撤銷命理師資格確認 */}
      <Dialog open={!!revokeExpertTarget} onOpenChange={(open) => { if (!open) setRevokeExpertTarget(null); }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-200 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400">撤銷命理師資格</DialogTitle>
            <DialogDescription className="text-slate-400">
              此操作將該用戶的 role 改回 "user"，專家後台將無法登入。
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-slate-300">
              確定要撤銷 <span className="text-amber-300 font-semibold">{revokeExpertTarget?.name}</span> 的命理師資格？
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRevokeExpertTarget(null)} className="border-slate-700 text-slate-300 bg-transparent hover:bg-slate-800">取消</Button>
            <Button
              onClick={() => revokeExpertTarget && revokeExpertMutation.mutate({ userId: revokeExpertTarget.userId })}
              disabled={revokeExpertMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {revokeExpertMutation.isPending ? "處理中..." : "確認撤銷"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
