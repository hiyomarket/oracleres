import { useAdminRole } from "@/hooks/useAdminRole";
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
import { Users, Search, CheckCircle, XCircle, Clock, Star, Eye, Ban, RefreshCw, UserPlus, Pencil, Edit3, MessageSquare, Send } from "lucide-react";
import { EXPERT_STATUS_COLOR, EXPERT_STATUS_LABEL, BOOKING_STATUS_COLOR, BOOKING_STATUS_LABEL } from "@/lib/expertConstants";

type ExpertStatus = "active" | "inactive" | "pending_review";
const STATUS_COLOR = EXPERT_STATUS_COLOR as Record<ExpertStatus, string>;
const STATUS_LABEL = EXPERT_STATUS_LABEL as Record<ExpertStatus, string>;
const STATUS_ICON: Record<ExpertStatus, React.ReactNode> = {
  pending_review: <Clock className="w-3.5 h-3.5" />,
  active: <CheckCircle className="w-3.5 h-3.5" />,
  inactive: <XCircle className="w-3.5 h-3.5" />,
};

export default function AdminExperts() {
  const { readOnly } = useAdminRole();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "pending_review" | "all">("all");
  const [selectedExpert, setSelectedExpert] = useState<number | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ExpertStatus>("active");
  const [adminNote, setAdminNote] = useState("");
  const [activeTab, setActiveTab] = useState<"experts" | "bookings" | "applications" | "team_messages" | "alliance_settings">("experts");
  const [reviewTarget, setReviewTarget] = useState<{ id: number; publicName: string; userName: string; motivation?: string | null | undefined } | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");
  const { data: applications = [], refetch: refetchApps } = trpc.expert.adminListApplications.useQuery({ status: "all" });
  const reviewMutation = trpc.expert.adminReviewApplication.useMutation({
    onSuccess: () => {
      toast.success(reviewAction === "approve" ? "已核准申請，用戶已升為命理師" : "已拒絕申請");
      setReviewTarget(null);
      setReviewNote("");
      refetchApps();
    },
    onError: (e: { message: string }) => toast.error("操作失敗: " + e.message),
  });

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
  // 天命聯盟名稱管理
  const [allianceNameEdit, setAllianceNameEdit] = useState("");
  const [showAllianceNameEdit, setShowAllianceNameEdit] = useState(false);
  const { data: allianceNameData, refetch: refetchAllianceName } = trpc.expert.getAllianceName.useQuery();
  const updateAllianceNameMutation = trpc.expert.adminUpdateAllianceName.useMutation({
    onSuccess: () => {
      toast.success("天命聯盟名稱已更新！");
      setShowAllianceNameEdit(false);
      refetchAllianceName();
      utils.expert.getAllianceName.invalidate();
    },
    onError: (e: { message: string }) => toast.error("更新失敗: " + e.message),
  });
  // 用戶傳訊給團隊管理
  const [activeTeamMsgUserId, setActiveTeamMsgUserId] = useState<number | null>(null);
  const [teamReplyContent, setTeamReplyContent] = useState("");
  const { data: teamConversations = [], refetch: refetchTeamMsgs } = trpc.expert.adminListTeamMessages.useQuery();
  const replyTeamMutation = trpc.expert.adminReplyTeamMessage.useMutation({
    onSuccess: () => {
      toast.success("回覆已發送");
      setTeamReplyContent("");
      refetchTeamMsgs();
    },
    onError: (e: { message: string }) => toast.error("發送失敗: " + e.message),
  });
  const markTeamReadMutation = trpc.expert.adminMarkTeamMessageRead.useMutation({
    onSuccess: () => refetchTeamMsgs(),
  });
  // 編輯專家資料
  const [editProfileTarget, setEditProfileTarget] = useState<{ expertId: number; publicName: string; title: string } | null>(null);
  const [editPublicName, setEditPublicName] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const updateProfileMutation = trpc.expert.adminUpdateExpertProfile.useMutation({
    onSuccess: () => {
      toast.success("專家資料已更新");
      setEditProfileTarget(null);
      refetch();
    },
    onError: (e: { message: string }) => toast.error("更新失敗: " + e.message),
  });
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
        <div className="flex gap-1 border-b border-border/50 flex-wrap">
          {[
            { key: "experts", label: "專家列表" },
            { key: "bookings", label: "預約訂單" },
            { key: "applications", label: applications.filter(a => a.status === "pending").length > 0 ? `命理師申請 (${applications.filter(a => a.status === "pending").length})` : "命理師申請" },
            { key: "team_messages", label: teamConversations.reduce((acc, c) => acc + c.unreadCount, 0) > 0 ? `用戶訊息 (${teamConversations.reduce((acc, c) => acc + c.unreadCount, 0)})` : "用戶訊息" },
            { key: "alliance_settings", label: "聯盟設定" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as "experts" | "bookings" | "applications" | "team_messages" | "alliance_settings")}
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
                            onClick={() => {
                              setEditProfileTarget({ expertId: expert.id, publicName: expert.publicName, title: expert.title ?? "" });
                              setEditPublicName(expert.publicName);
                              setEditTitle(expert.title ?? "");
                            }}
                            className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10 bg-transparent text-xs"
                          >
                            <Pencil className="w-3.5 h-3.5 mr-1" /> 編輯資料
                          </Button>
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
                                disabled={readOnly}
                                title={readOnly ? "唯讀模式，無法操作" : undefined}
                                onClick={() => updateBookingStatusMutation.mutate({ bookingId: booking.id, status: "confirmed" })}
                              >
                                確認付款
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={readOnly}
                                title={readOnly ? "唯讀模式，無法操作" : undefined}
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
                              disabled={readOnly}
                              title={readOnly ? "唯讀模式，無法操作" : undefined}
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
              disabled={readOnly || revokeExpertMutation.isPending}
              title={readOnly ? "唯讀模式，無法操作" : undefined}
              onClick={() => revokeExpertTarget && revokeExpertMutation.mutate({ userId: revokeExpertTarget.userId })}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {revokeExpertMutation.isPending ? "處理中..." : "確認撤銷"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        {activeTab === "applications" && (
          <div className="space-y-3">
            {applications.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <UserPlus className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>目前沒有命理師申請</p>
                </CardContent>
              </Card>
            ) : (
              applications.map((app) => (
                <Card key={app.id} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
                          {app.publicName[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{app.publicName}</span>
                            <Badge className={`text-xs border ${
                              app.status === "pending" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                              app.status === "approved" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                              "bg-red-500/20 text-red-400 border-red-500/30"
                            }`}>
                              {app.status === "pending" ? "待審核" : app.status === "approved" ? "已核准" : "已拒絕"}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">用戶：{app.userName}</div>
                          {app.motivation && (
                            <div className="text-xs text-muted-foreground mt-1 max-w-xs">申請理由：{app.motivation}</div>
                          )}
                          {app.adminNote && (
                            <div className="text-xs text-amber-400/70 mt-1">管理員備註：{app.adminNote}</div>
                          )}
                        </div>
                      </div>
                      {app.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => { setReviewTarget({ id: app.id, publicName: app.publicName, userName: app.userName ?? "", motivation: app.motivation }); setReviewAction("approve"); }}
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> 核准
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => { setReviewTarget({ id: app.id, publicName: app.publicName, userName: app.userName ?? "", motivation: app.motivation }); setReviewAction("reject"); }}
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" /> 拒絕
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
           </div>
        )}

        {/* 用戶訊息 Tab */}
        {activeTab === "team_messages" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 用戶列表 */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> 用戶對話列表
              </h3>
              {teamConversations.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground text-sm">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>目前沒有用戶訊息</p>
                  </CardContent>
                </Card>
              ) : (
                teamConversations.map((conv) => (
                  <Card
                    key={conv.userId}
                    className={`border transition-colors ${
                      readOnly ? 'cursor-default opacity-60' : 'cursor-pointer'
                    } ${
                      activeTeamMsgUserId === conv.userId
                        ? "border-amber-500/50 bg-amber-500/5"
                        : "border-border/50 hover:border-border"
                    }`}
                    onClick={() => {
                      if (readOnly) return;
                      setActiveTeamMsgUserId(conv.userId);
                      if (conv.unreadCount > 0) markTeamReadMutation.mutate({ userId: conv.userId });
                    }}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-sm font-bold">
                            {(conv.userName || "?")[0]}
                          </div>
                          <div>
                            <div className="text-sm font-medium">{conv.userName}</div>
                            <div className="text-xs text-muted-foreground">{conv.messages[conv.messages.length - 1]?.content.slice(0, 20)}...</div>
                          </div>
                        </div>
                        {conv.unreadCount > 0 && (
                          <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-5 text-center">{conv.unreadCount}</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* 對話內容 */}
            <div className="md:col-span-2">
              {activeTeamMsgUserId === null ? (
                <Card className="h-full">
                  <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
                    <div className="text-center">
                      <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">選擇左側用戶查看對話</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (() => {
                const conv = teamConversations.find(c => c.userId === activeTeamMsgUserId);
                if (!conv) return null;
                return (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-semibold">{conv.userName}</h4>
                          <p className="text-xs text-muted-foreground">{conv.userEmail}</p>
                        </div>
                        <Badge className="text-xs bg-amber-500/20 text-amber-600 border-amber-500/30 border">
                          訊息保存至 {new Date(conv.messages[conv.messages.length - 1]?.expiresAt ?? Date.now()).toLocaleDateString()}
                        </Badge>
                      </div>
                      {/* 對話記錄 */}
                      <div className="space-y-3 max-h-72 overflow-y-auto mb-4 pr-1">
                        {conv.messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${
                              msg.direction === "team_to_user" ? "justify-end" : "justify-start"
                            }`}
                          >
                            <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                              msg.direction === "team_to_user"
                                ? "bg-amber-500/20 text-foreground rounded-br-sm"
                                : "bg-muted text-foreground rounded-bl-sm"
                            }`}>
                              {msg.direction === "user_to_team" && (
                                <div className="text-xs text-muted-foreground mb-1 font-medium">{conv.userName}</div>
                              )}
                              {msg.direction === "team_to_user" && (
                                <div className="text-xs text-amber-600 mb-1 font-medium">天命管理團隊</div>
                              )}
                              <p>{msg.content}</p>
                              <div className="text-xs text-muted-foreground mt-1 text-right">
                                {new Date(msg.createdAt).toLocaleString()}
                                {msg.direction === "team_to_user" && (
                                  <span className="ml-1">{msg.isRead ? " ✓✓" : " ✓"}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* 回覆輸入框 */}
                      <div className="flex gap-2">
                        <Input
                          value={teamReplyContent}
                          onChange={(e) => setTeamReplyContent(e.target.value)}
                          placeholder="以天命管理團隊身份回覆..."
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey && teamReplyContent.trim()) {
                              e.preventDefault();
                              replyTeamMutation.mutate({ userId: activeTeamMsgUserId, content: teamReplyContent.trim() });
                            }
                          }}
                        />
                        <Button
                          className="bg-amber-500 hover:bg-amber-600 text-black"
                          disabled={readOnly || !teamReplyContent.trim() || replyTeamMutation.isPending}
                          title={readOnly ? "唯讀模式，無法操作" : undefined}
                          onClick={() => replyTeamMutation.mutate({ userId: activeTeamMsgUserId, content: teamReplyContent.trim() })}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">回覆將以「天命管理團隊」身份顯示給用戶</p>
                    </CardContent>
                  </Card>
                );
              })()}
            </div>
          </div>
        )}

        {/* 聯盟設定 Tab */}
        {activeTab === "alliance_settings" && (
          <div className="space-y-4 max-w-lg">
            <Card className="border-border/50">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Edit3 className="w-5 h-5 text-amber-400" />
                  <h3 className="font-semibold">天命聯盟名稱設定</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  修改此名稱後，前台「天命聯盟」頁面標題、用戶下拉選單、專家後台等位置的顯示名稱將同步更新。
                </p>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 mb-4">
                  <span className="text-sm text-muted-foreground">目前名稱：</span>
                  <span className="font-semibold text-amber-600">{allianceNameData?.name ?? "天命聯盟"}</span>
                </div>
                {showAllianceNameEdit ? (
                  <div className="space-y-3">
                    <Input
                      value={allianceNameEdit}
                      onChange={(e) => setAllianceNameEdit(e.target.value)}
                      placeholder="輸入新名稱（最多 50 字）"
                      maxLength={50}
                    />
                    <div className="flex gap-2">
                      <Button
                        className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                        disabled={readOnly || !allianceNameEdit.trim() || updateAllianceNameMutation.isPending}
                        title={readOnly ? "唯讀模式，無法操作" : undefined}
                        onClick={() => updateAllianceNameMutation.mutate({ name: allianceNameEdit.trim() })}
                      >
                        {updateAllianceNameMutation.isPending ? "儲存中…" : "確認更新"}
                      </Button>
                      <Button variant="outline" onClick={() => setShowAllianceNameEdit(false)}>取消</Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => { setAllianceNameEdit(allianceNameData?.name ?? "天命聯盟"); setShowAllianceNameEdit(true); }}
                  >
                    <Edit3 className="w-4 h-4 mr-2" /> 修改名稱
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}

      {/* 編輯專家資料 Dialog */}
      <Dialog open={!!editProfileTarget} onOpenChange={(open) => { if (!open) setEditProfileTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="w-4 h-4 text-amber-400" /> 編輯專家資料</DialogTitle>
            <DialogDescription>修改專家公開名稱與頭銜</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">公開顯示名稱 *</label>
              <Input
                value={editPublicName}
                onChange={(e) => setEditPublicName(e.target.value)}
                placeholder="例如：命理師 陳天命"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">頭銜/職稱</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="例如：紫微斗數命理師・20年經驗"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditProfileTarget(null)}>取消</Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              disabled={readOnly || updateProfileMutation.isPending || !editPublicName.trim()}
              title={readOnly ? "唯讀模式，無法操作" : undefined}
              onClick={() => editProfileTarget && updateProfileMutation.mutate({
                expertId: editProfileTarget.expertId,
                publicName: editPublicName.trim(),
                title: editTitle.trim() || undefined,
              })}
            >
              {updateProfileMutation.isPending ? "儲存中…" : "儲存變更"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 申請審核 Dialog */}
      <Dialog open={!!reviewTarget} onOpenChange={(open) => { if (!open) { setReviewTarget(null); setReviewNote(""); } }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-200 max-w-sm">
          <DialogHeader>
            <DialogTitle className={reviewAction === "approve" ? "text-green-400" : "text-red-400"}>
              {reviewAction === "approve" ? "核准命理師申請" : "拒絕命理師申請"}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {reviewAction === "approve"
                ? "核准後用戶將升為命理師角色，可登入專家後台。"
                : "拒絕後用戶可重新申請。"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-300">申請人：<span className="text-amber-300 font-semibold">{reviewTarget?.publicName}</span>（{reviewTarget?.userName}）</p>
            {reviewTarget?.motivation && (
              <div className="bg-slate-800 rounded-lg p-3 text-xs text-slate-400">申請理由：{reviewTarget.motivation}</div>
            )}
            <div>
              <label className="text-sm text-slate-400 mb-1 block">管理員備註（可選）</label>
              <Input
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="例如：歡迎加入天命聯盟！"
                className="bg-slate-800 border-slate-600 text-slate-200"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setReviewTarget(null); setReviewNote(""); }} className="border-slate-700 text-slate-300 bg-transparent hover:bg-slate-800">取消</Button>
            <Button
              disabled={readOnly || reviewMutation.isPending}
              title={readOnly ? "唯讀模式，無法操作" : undefined}
              onClick={() => reviewTarget && reviewMutation.mutate({ applicationId: reviewTarget.id, action: reviewAction, adminNote: reviewNote || undefined })}
              className={reviewAction === "approve" ? "bg-green-600 hover:bg-green-700 text-white" : "bg-red-600 hover:bg-red-700 text-white"}
            >
              {reviewMutation.isPending ? "處理中..." : reviewAction === "approve" ? "確認核准" : "確認拒絕"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
