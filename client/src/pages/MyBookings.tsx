import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Calendar, Clock, Star, MessageCircle, Upload } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

const STATUS_COLOR: Record<string, string> = {
  pending_payment: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  confirmed: "bg-green-500/20 text-green-400 border-green-500/30",
  completed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};
const STATUS_LABEL: Record<string, string> = {
  pending_payment: "待付款",
  confirmed: "已確認",
  completed: "已完成",
  cancelled: "已取消",
};

type StatusFilter = "all" | "pending_payment" | "confirmed" | "completed" | "cancelled";

export default function MyBookings() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [reviewBookingId, setReviewBookingId] = useState<number | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  const { data: bookings = [], isLoading } = trpc.expert.myBookings.useQuery({ status: statusFilter });

  const submitReviewMutation = trpc.expert.submitReview.useMutation({
    onSuccess: () => {
      toast.success("評價已送出，感謝您的回饋！");
      setReviewBookingId(null);
      setReviewComment("");
      setReviewRating(5);
      utils.expert.myBookings.invalidate();
    },
    onError: (e: { message: string }) => toast.error("送出失敗: " + e.message),
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">請先登入以查看預約記錄</p>
          <Button asChild className="bg-amber-500 hover:bg-amber-600 text-black">
            <a href={getLoginUrl()}>立即登入</a>
          </Button>
        </div>
      </div>
    );
  }

  const tabs: { label: string; value: StatusFilter }[] = [
    { label: "全部", value: "all" },
    { label: "待付款", value: "pending_payment" },
    { label: "已確認", value: "confirmed" },
    { label: "已完成", value: "completed" },
    { label: "已取消", value: "cancelled" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/experts">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="w-4 h-4" /> 返回
            </Button>
          </Link>
          <h1 className="font-bold text-lg">我的預約</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Status Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors flex-shrink-0 ${
                statusFilter === tab.value
                  ? "bg-amber-500 text-black font-medium"
                  : "bg-accent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Booking List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-accent/30 animate-pulse" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">目前沒有預約記錄</p>
              <Button asChild className="mt-4 bg-amber-500 hover:bg-amber-600 text-black">
                <Link href="/experts">瀏覽專家</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <Card key={booking.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold truncate">{booking.expertName ?? "專家"}</span>
                        <Badge className={`text-xs border flex-shrink-0 ${STATUS_COLOR[booking.status] ?? ""}`}>
                          {STATUS_LABEL[booking.status] ?? booking.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {booking.serviceTitle ?? "服務"}
                        {booking.servicePrice != null && ` · NT$ ${booking.servicePrice.toLocaleString()}`}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(booking.bookingTime).toLocaleDateString("zh-TW")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(booking.bookingTime).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {booking.serviceDuration && (
                          <span>{booking.serviceDuration} 分鐘</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {booking.status === "pending_payment" && (
                        <Button
                          size="sm"
                          className="bg-amber-500 hover:bg-amber-600 text-black text-xs"
                          asChild
                        >
                          <Link href={`/experts/${booking.expertId}`}>
                            <Upload className="w-3 h-3 mr-1" /> 上傳付款
                          </Link>
                        </Button>
                      )}
                      {booking.status === "confirmed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          asChild
                        >
                          <Link href={`/experts/${booking.expertId}`}>
                            <MessageCircle className="w-3 h-3 mr-1" /> 聯絡專家
                          </Link>
                        </Button>
                      )}
                      {booking.status === "completed" && (
                        <Button
                          size="sm"
                          className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 text-xs"
                          onClick={() => setReviewBookingId(booking.id)}
                        >
                          <Star className="w-3 h-3 mr-1" /> 評價
                        </Button>
                      )}
                    </div>
                  </div>
                  {booking.notes && (
                    <p className="mt-2 text-xs text-muted-foreground bg-accent/30 rounded p-2">
                      備註：{booking.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={reviewBookingId !== null} onOpenChange={(open) => !open && setReviewBookingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>為這次服務留下評價</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">評分</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewRating(star)}
                    className={`text-2xl transition-transform hover:scale-110 ${
                      star <= reviewRating ? "text-amber-400" : "text-muted-foreground/30"
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">評論（選填）</label>
              <Textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="分享您的諮詢體驗…"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewBookingId(null)}>取消</Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-black"
              onClick={() => {
                if (!reviewBookingId) return;
                submitReviewMutation.mutate({
                  bookingId: reviewBookingId,
                  rating: reviewRating,
                  comment: reviewComment.trim() || undefined,
                });
              }}
              disabled={submitReviewMutation.isPending}
            >
              送出評價
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
