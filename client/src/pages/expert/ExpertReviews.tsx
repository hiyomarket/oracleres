/**
 * 專家後台 - 評價管理
 * 查看所有用戶評價並回覆
 */
import { useState } from "react";
import { ExpertLayout } from "@/components/ExpertLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CardSkeleton } from "@/components/ExpertSkeleton";
import { formatDateTime } from "@/lib/expertConstants";
import { toast } from "sonner";
import {
  Star, MessageSquare, Send, ChevronDown, ChevronUp,
} from "lucide-react";

export default function ExpertReviews() {
  const utils = trpc.useUtils();
  const { data: reviews, isLoading } = trpc.expert.getMyReviews.useQuery({ limit: 50, offset: 0 });
  const { data: profile } = trpc.expert.getMyProfile.useQuery();

  const [replyingId, setReplyingId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");

  const replyMutation = trpc.expert.replyToReview.useMutation({
    onSuccess: () => {
      toast.success("回覆已送出");
      setReplyingId(null);
      setReplyText("");
      utils.expert.getMyReviews.invalidate();
    },
    onError: (e) => toast.error("回覆失敗: " + e.message),
  });

  // Stats
  const totalReviews = reviews?.length ?? 0;
  const avgRating = totalReviews > 0
    ? (reviews!.reduce((s, r) => s + r.rating, 0) / totalReviews).toFixed(1)
    : "—";
  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews?.filter((r) => r.rating === star).length ?? 0,
  }));
  const unrepliedCount = reviews?.filter((r) => !r.expertReply).length ?? 0;

  return (
    <ExpertLayout pageTitle="評價管理">
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="hidden md:block">
          <h1 className="text-2xl font-bold">評價管理</h1>
          <p className="text-muted-foreground text-sm mt-1">查看用戶評價並回覆</p>
        </div>

        {isLoading ? (
          <CardSkeleton count={4} />
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-amber-500/20">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                    <span className="text-2xl font-bold text-amber-400">{avgRating}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">平均評分</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">{totalReviews}</div>
                  <div className="text-xs text-muted-foreground">總評價數</div>
                </CardContent>
              </Card>
              <Card className={unrepliedCount > 0 ? "border-red-500/20" : ""}>
                <CardContent className="p-4 text-center">
                  <div className={`text-2xl font-bold ${unrepliedCount > 0 ? "text-red-400" : "text-emerald-400"}`}>
                    {unrepliedCount}
                  </div>
                  <div className="text-xs text-muted-foreground">待回覆</div>
                </CardContent>
              </Card>
            </div>

            {/* Rating Distribution */}
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {ratingDistribution.map(({ star, count }) => {
                    const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-2">
                        <span className="text-xs w-6 text-right text-muted-foreground">{star}</span>
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <div className="flex-1 h-2 bg-accent/30 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400/60 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs w-8 text-muted-foreground">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Reviews List */}
            {totalReviews === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>尚無用戶評價</p>
                  <p className="text-xs mt-1">完成更多服務訂單後，用戶即可留下評價</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {reviews!.map((review) => (
                  <Card key={review.id} className={!review.expertReply ? "border-amber-500/20" : ""}>
                    <CardContent className="p-4 space-y-3">
                      {/* Review Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-accent/50 flex items-center justify-center text-sm font-medium">
                            {(review.userName ?? "用")[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{review.userName ?? "匿名用戶"}</p>
                            <p className="text-xs text-muted-foreground">{review.serviceTitle ?? "服務"}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${
                                  i < review.rating
                                    ? "text-amber-400 fill-amber-400"
                                    : "text-zinc-600"
                                }`}
                              />
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDateTime(review.createdAt)}
                          </p>
                        </div>
                      </div>

                      {/* Review Comment */}
                      {review.comment && (
                        <p className="text-sm text-zinc-300 leading-relaxed pl-10">
                          {review.comment}
                        </p>
                      )}

                      {/* Expert Reply */}
                      {review.expertReply && (
                        <div className="ml-10 pl-3 border-l-2 border-amber-500/30 bg-amber-500/5 rounded-r-lg p-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <MessageSquare className="w-3 h-3 text-amber-400" />
                            <span className="text-xs font-medium text-amber-400">
                              {profile?.publicName ?? "老師"} 的回覆
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(review.expertReplyAt)}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-300">{review.expertReply}</p>
                        </div>
                      )}

                      {/* Reply Form */}
                      {!review.expertReply && replyingId === review.id ? (
                        <div className="ml-10 space-y-2">
                          <Textarea
                            placeholder="輸入您的回覆..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            rows={3}
                            className="text-sm"
                          />
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { setReplyingId(null); setReplyText(""); }}
                            >
                              取消
                            </Button>
                            <Button
                              size="sm"
                              className="bg-amber-500 hover:bg-amber-600 text-black gap-1.5"
                              onClick={() => replyMutation.mutate({ reviewId: review.id, reply: replyText })}
                              disabled={!replyText.trim() || replyMutation.isPending}
                            >
                              <Send className="w-3.5 h-3.5" />
                              {replyMutation.isPending ? "送出中..." : "送出回覆"}
                            </Button>
                          </div>
                        </div>
                      ) : !review.expertReply ? (
                        <div className="ml-10">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs gap-1.5"
                            onClick={() => { setReplyingId(review.id); setReplyText(""); }}
                          >
                            <MessageSquare className="w-3.5 h-3.5" /> 回覆此評價
                          </Button>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </ExpertLayout>
  );
}
