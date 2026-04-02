import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { SharedNav } from "@/components/SharedNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Compass, Shield, AlertTriangle, HelpCircle,
  Sparkles, Eye, Zap, Loader2, CheckCircle2,
  ThumbsUp, ThumbsDown,
} from "lucide-react";

export default function OfficeFengShui() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("daily");
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});

  // 每日方位查詢 - API 從 user profile 讀取 birthYear/gender
  const dailyQuery = trpc.yangzhai.getDailyDirections.useQuery(
    undefined,
    { enabled: !!user }
  );

  // 形煞問答分析
  const quizMutation = trpc.yangzhai.diagnoseFormShaQuiz.useMutation();

  // 歷史記錄
  const historyQuery = trpc.yangzhai.getAnalysisHistory.useQuery(
    undefined,
    { enabled: !!user }
  );

  // 反饋
  const feedbackMutation = trpc.yangzhai.submitFeedback.useMutation();

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SharedNav currentPage="office-fengshui" />
        <div className="container max-w-4xl py-20 text-center">
          <Compass className="w-16 h-16 mx-auto mb-6 text-amber-400" />
          <h1 className="text-3xl font-bold mb-4">辦公室開運風水</h1>
          <p className="text-muted-foreground mb-8">
            透過八宅命理和每日方位分析，優化你的工作環境，提升職場運勢
          </p>
          <Button asChild size="lg">
            <a href={getLoginUrl()}>登入開始分析</a>
          </Button>
        </div>
      </div>
    );
  }

  const quizQuestions = [
    { id: 'back_support', label: '你的座位背後是什麼？', options: ['實牆', '走道/通道', '窗戶', '矮隔板', '其他同事'] },
    { id: 'above_head', label: '你的頭頂上方有什麼？', options: ['平整天花板', '橫樑', '管線/風管', '吊燈/吊扇', '冷氣出風口'] },
    { id: 'desk_facing', label: '你的桌面正對什麼？', options: ['牆壁', '窗戶', '走道', '門口', '其他同事的背'] },
    { id: 'left_side', label: '你的左手邊（青龍位）是什麼？', options: ['實牆', '走道', '窗戶', '較高的櫃子/隔板', '空曠'] },
    { id: 'right_side', label: '你的右手邊（白虎位）是什麼？', options: ['實牆', '走道', '窗戶', '較低的區域', '空曠'] },
    { id: 'door_position', label: '辦公室的門在你的哪個方向？', options: ['正前方', '正後方', '左前方', '右前方', '左後方', '右後方', '看不到門'] },
    { id: 'sharp_corners', label: '附近有沒有尖角對著你？（柱子角、牆角、桌角）', options: ['沒有', '有，在前方', '有，在側面', '有，在後方'] },
    { id: 'plants', label: '桌上或附近有沒有植物？', options: ['沒有', '有小盆栽', '有大型植物', '有枯萎的植物'] },
  ];

  const handleQuizSubmit = () => {
    if (Object.keys(quizAnswers).length < quizQuestions.length) return;
    quizMutation.mutate({ answers: quizAnswers });
  };

  const report = dailyQuery.data;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SharedNav currentPage="office-fengshui" />

      <div className="container max-w-5xl py-8">
        {/* 頁面標題 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Compass className="w-6 h-6 text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold">辦公室開運風水</h1>
          </div>
          <p className="text-muted-foreground ml-12">
            專為上班族和租屋族設計，用最簡單的方式改善工作環境運勢
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="daily" className="gap-1.5">
              <Compass className="w-4 h-4" /> 今日方位
            </TabsTrigger>
            <TabsTrigger value="quiz" className="gap-1.5">
              <HelpCircle className="w-4 h-4" /> 座位診斷
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <Eye className="w-4 h-4" /> 分析記錄
            </TabsTrigger>
          </TabsList>

          {/* ===== 今日方位 Tab ===== */}
          <TabsContent value="daily">
            {dailyQuery.isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
                <span className="ml-3 text-muted-foreground">正在計算今日方位吉凶...</span>
              </div>
            ) : report ? (
              <div className="space-y-6">
                {/* 命卦資訊 */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">你的命卦</p>
                        <p className="text-2xl font-bold text-amber-400">{String(report.kuaNumber)}</p>
                      </div>
                      {report.villainAdvice && (
                        <Badge variant="outline" className="border-red-500/30 text-red-400 gap-1">
                          <Shield className="w-3 h-3" /> 避小人提醒
                        </Badge>
                      )}
                    </div>
                    {report.villainAdvice && (
                      <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20 text-sm">
                        <p className="text-red-300">{report.villainAdvice}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 每日摘要 */}
                {report.dailySummary && (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">{report.dailySummary}</p>
                    </CardContent>
                  </Card>
                )}

                {/* 八方位吉凶 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">今日八方位吉凶</CardTitle>
                    <CardDescription>結合你的命卦和今日流日計算</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {report.directions?.map((dir) => {
                        const isGood = dir.finalScore > 0;
                        const isBad = dir.finalScore < -30;
                        return (
                          <div
                            key={dir.direction}
                            className={`p-3 rounded-lg border text-center transition-all ${
                              isBad
                                ? 'bg-red-500/10 border-red-500/30'
                                : isGood
                                ? 'bg-green-500/10 border-green-500/30'
                                : 'bg-muted/30 border-border'
                            }`}
                          >
                            <p className="font-bold text-lg">{dir.direction}</p>
                            <p className={`text-sm font-medium ${
                              isBad ? 'text-red-400' : isGood ? 'text-green-400' : 'text-muted-foreground'
                            }`}>
                              {dir.star}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              分數: {dir.finalScore}
                            </p>
                            {dir.isClashed && (
                              <Badge variant="destructive" className="mt-1 text-xs">
                                <AlertTriangle className="w-3 h-3 mr-1" /> 六沖
                              </Badge>
                            )}
                            {dir.isThreeKilling && (
                              <Badge variant="secondary" className="mt-1 text-xs">
                                三煞
                              </Badge>
                            )}
                            {dir.officeAdvice && (
                              <p className="text-xs mt-2 text-muted-foreground">{dir.officeAdvice}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* 今日辦公建議 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-400" />
                      今日辦公開運建議
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {report.bestDirection && (
                      <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                        <p className="font-medium text-green-400 mb-1">
                          最佳方位：{report.bestDirection.direction}（{report.bestDirection.star}）
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {report.bestDirection.officeAdvice || '開會、談判、面試盡量選擇面向此方位的座位'}
                        </p>
                      </div>
                    )}
                    {report.worstDirection && (
                      <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                        <p className="font-medium text-red-400 mb-1">
                          避開方位：{report.worstDirection.direction}（{report.worstDirection.star}）
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {report.worstDirection.officeAdvice || '今日避免在此方位進行重要決策或與人爭執'}
                        </p>
                      </div>
                    )}
                    {report.seatAdvice && (
                      <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
                        <p className="text-sm font-medium text-amber-400 mb-1">座位建議</p>
                        <p className="text-sm text-muted-foreground">{report.seatAdvice}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="p-8 text-center text-muted-foreground">
                <Compass className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>無法取得方位資料，請確認已設定個人資料</p>
              </Card>
            )}
          </TabsContent>

          {/* ===== 座位診斷 Tab ===== */}
          <TabsContent value="quiz">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-blue-400" />
                    辦公座位快速診斷
                  </CardTitle>
                  <CardDescription>
                    回答 8 個問題，AI 會分析你的座位風水並給出化解建議
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {quizQuestions.map((q, idx) => (
                    <div key={q.id}>
                      <Label className="text-sm font-medium mb-2 block">
                        {idx + 1}. {q.label}
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {q.options.map((opt) => (
                          <Button
                            key={opt}
                            variant={quizAnswers[q.id] === opt ? "default" : "outline"}
                            size="sm"
                            onClick={() => setQuizAnswers(prev => ({ ...prev, [q.id]: opt }))}
                          >
                            {opt}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="pt-4 border-t">
                    <Button
                      onClick={handleQuizSubmit}
                      disabled={Object.keys(quizAnswers).length < quizQuestions.length || quizMutation.isPending}
                      className="w-full"
                      size="lg"
                    >
                      {quizMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          AI 正在分析你的座位風水...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          開始分析（{Object.keys(quizAnswers).length}/{quizQuestions.length}）
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 問答分析結果 */}
              {quizMutation.data && (
                <Card className="border-amber-500/30">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Eye className="w-5 h-5 text-amber-400" />
                      座位風水分析報告
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">環境分數：</span>
                      <Badge variant={quizMutation.data.overallScore >= 70 ? "default" : quizMutation.data.overallScore >= 40 ? "secondary" : "destructive"}>
                        {quizMutation.data.overallScore} / 100
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 形煞列表 */}
                    {quizMutation.data.detections?.filter((d) => d.detected).map((sha, i: number) => (
                      <div key={i} className="p-4 rounded-lg border bg-muted/20">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className={`w-4 h-4 ${
                              sha.priority === 'critical' ? 'text-red-400' :
                              sha.priority === 'high' ? 'text-orange-400' :
                              sha.priority === 'medium' ? 'text-yellow-400' : 'text-blue-400'
                            }`} />
                            <span className="font-medium">{sha.shaName}</span>
                          </div>
                          <Badge variant={
                            sha.priority === 'critical' || sha.priority === 'high' ? 'destructive' :
                            sha.priority === 'medium' ? 'secondary' : 'outline'
                          }>
                            {sha.priority === 'critical' ? '嚴重' :
                             sha.priority === 'high' ? '高' :
                             sha.priority === 'medium' ? '中等' : '輕微'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{sha.description}</p>
                        {sha.remedy && (
                          <div className="p-2 rounded bg-green-500/5 border border-green-500/20">
                            <p className="text-sm text-green-300">
                              <CheckCircle2 className="w-3 h-3 inline mr-1" />
                              化解方法：{sha.remedy}
                            </p>
                          </div>
                        )}
                        {sha.urgencyMessage && (
                          <p className="text-xs text-amber-400 mt-1">{sha.urgencyMessage}</p>
                        )}
                      </div>
                    ))}

                    {/* 優先行動清單 */}
                    {quizMutation.data.prioritizedActions?.length > 0 && (
                      <div className="space-y-2">
                        <p className="font-medium text-sm">優先行動清單：</p>
                        {quizMutation.data.prioritizedActions.map((action, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                            <span className="text-muted-foreground">{action}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 整體建議 */}
                    {quizMutation.data.overallAdvice && (
                      <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
                        <p className="text-sm font-medium text-amber-400 mb-1">綜合建議</p>
                        <p className="text-sm text-muted-foreground">{quizMutation.data.overallAdvice}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ===== 分析記錄 Tab ===== */}
          <TabsContent value="history">
            {historyQuery.isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
              </div>
            ) : !historyQuery.data || historyQuery.data.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>還沒有分析記錄</p>
                <p className="text-sm mt-2">使用「今日方位」或「座位診斷」功能後，記錄會出現在這裡</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {historyQuery.data.map((record) => (
                  <Card key={record.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {record.analysisType === 'daily_direction' ? '每日方位' :
                             record.analysisType === 'form_sha_photo' ? '照片分析' :
                             record.analysisType === 'form_sha_quiz' ? '問答診斷' : '完整報告'}
                          </Badge>
                          {record.score !== null && (
                            <span className="text-sm text-muted-foreground">分數: {record.score}</span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(record.createdAt).toLocaleDateString('zh-TW')}
                        </span>
                      </div>
                      {record.sceneDescription && (
                        <p className="text-sm text-muted-foreground mb-2">{record.sceneDescription}</p>
                      )}
                      {!record.feedback && (
                        <div className="flex gap-2 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => feedbackMutation.mutate(
                              { analysisId: record.id, feedback: 'helpful' },
                              { onSuccess: () => historyQuery.refetch() }
                            )}
                          >
                            <ThumbsUp className="w-3 h-3 mr-1" /> 有幫助
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => feedbackMutation.mutate(
                              { analysisId: record.id, feedback: 'not_helpful' },
                              { onSuccess: () => historyQuery.refetch() }
                            )}
                          >
                            <ThumbsDown className="w-3 h-3 mr-1" /> 沒幫助
                          </Button>
                        </div>
                      )}
                      {record.feedback && (
                        <Badge variant="secondary" className="mt-2">
                          {record.feedback === 'helpful' ? '已標記有幫助' : '已標記沒幫助'}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
