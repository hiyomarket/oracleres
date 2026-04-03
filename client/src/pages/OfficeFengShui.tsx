import { useState, useRef, useEffect, useCallback } from "react";
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
  ThumbsUp, ThumbsDown, Camera, Upload, X, ImageIcon,
  Share2, Copy, AlertCircle, Navigation, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

// ─── 社群分享元件 ───────────────────────────────────────────────
function ShareButtons({ score, detectionCount, mainIssue }: {
  score: number;
  detectionCount: number;
  mainIssue?: string;
}) {
  const buildText = () => {
    if (detectionCount === 0) {
      return `我的辦公座位環境分數 ${score}/100 🎉 沒有發現環境問題，繼續保持！\n\n透過天命共振辦公室風水診斷`;
    }
    const issue = mainIssue ? `主要問題：${mainIssue}` : `發現 ${detectionCount} 個環境問題`;
    return `我的辦公座位環境分數 ${score}/100\n${issue}\n\n透過天命共振辦公室風水診斷`;
  };
  const url = typeof window !== 'undefined' ? `${window.location.origin}/office-fengshui` : 'https://oracleres.com/office-fengshui';
  const text = buildText();

  const shareToLine = () => {
    window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
  };
  const shareToFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`, '_blank');
  };
  const copyLink = () => {
    navigator.clipboard.writeText(`${text}\n${url}`).then(() => {
      toast.success("已複製分享內容！");
    }).catch(() => toast.error("複製失敗，請手動複製"));
  };

  return (
    <div className="pt-4 border-t">
      <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
        <Share2 className="w-4 h-4" /> 分享診斷結果
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm"
          className="gap-1.5 border-green-500/30 text-green-400 hover:bg-green-500/10"
          onClick={shareToLine}>
          <span className="font-bold">L</span> LINE 分享
        </Button>
        <Button variant="outline" size="sm"
          className="gap-1.5 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
          onClick={shareToFacebook}>
          <span className="font-bold">f</span> Facebook
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={copyLink}>
          <Copy className="w-3.5 h-3.5" /> 複製連結
        </Button>
      </div>
    </div>
  );
}

// ─── 上傳/分析等待動畫 ──────────────────────────────────────────
function AnalyzingOverlay({ phase }: { phase: 'uploading' | 'analyzing' }) {
  const [idx, setIdx] = useState(0);
  const uploadMsgs = ['正在上傳照片...', '處理圖片中...', '準備 AI 分析...'];
  const analyzeMsgs = [
    'AI 正在掃描你的辦公環境...',
    '識別座位背後的支撐情況...',
    '檢查頭頂是否有壓迫物...',
    '分析門口與座位的關係...',
    '評估整體環境能量...',
    '生成改善建議中...',
  ];
  const msgs = phase === 'uploading' ? uploadMsgs : analyzeMsgs;
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % msgs.length), 1800);
    return () => clearInterval(t);
  }, [msgs.length]);
  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-amber-500/20" />
        <div className="absolute inset-0 rounded-full border-4 border-t-amber-400 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          {phase === 'uploading' ? <Upload className="w-6 h-6 text-amber-400" /> : <Sparkles className="w-6 h-6 text-amber-400" />}
        </div>
      </div>
      <div className="text-center">
        <p className="text-amber-400 font-medium">{msgs[idx]}</p>
        {phase === 'analyzing' && (
          <p className="text-xs text-muted-foreground mt-1">通常需要 10–20 秒</p>
        )}
      </div>
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-2 h-2 rounded-full bg-amber-400/60 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}

// ─── 手機羅盤元件 ────────────────────────────────────────────────
const DIRECTIONS_8 = ['北', '東北', '東', '東南', '南', '西南', '西', '西北'];
const DIRECTIONS_LABELS: Record<string, string> = {
  '北': 'N', '東北': 'NE', '東': 'E', '東南': 'SE',
  '南': 'S', '西南': 'SW', '西': 'W', '西北': 'NW',
};

function getDirectionName(heading: number): string {
  const idx = Math.round(heading / 45) % 8;
  return DIRECTIONS_8[idx];
}

function CompassWidget({ onSelect }: { onSelect: (dir: string) => void }) {
  const [heading, setHeading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');
  const [manualMode, setManualMode] = useState(false);

  const startCompass = useCallback(async () => {
    setPermissionState('requesting');
    setError(null);

    // iOS 13+ requires explicit permission
    if (typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
      try {
        const perm = await (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
        if (perm !== 'granted') {
          setPermissionState('denied');
          setError('請在手機設定中允許方向感應器存取');
          return;
        }
      } catch {
        setPermissionState('denied');
        setError('無法取得方向感應器權限');
        return;
      }
    }

    setPermissionState('granted');

    const handler = (e: DeviceOrientationEvent) => {
      // webkitCompassHeading for iOS, alpha for Android (need to convert)
      const ios = (e as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;
      if (ios !== undefined && ios !== null) {
        setHeading(ios);
      } else if (e.alpha !== null) {
        // Android: alpha is degrees from north, but counter-clockwise
        setHeading((360 - e.alpha) % 360);
      }
    };

    window.addEventListener('deviceorientation', handler, true);
    return () => window.removeEventListener('deviceorientation', handler, true);
  }, []);

  const currentDir = heading !== null ? getDirectionName(heading) : null;

  if (manualMode) {
    return (
      <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium flex items-center gap-2">
            <Compass className="w-4 h-4 text-amber-400" /> 手動選擇座位朝向
          </p>
          <Button variant="ghost" size="sm" onClick={() => setManualMode(false)} className="text-xs">
            <Navigation className="w-3 h-3 mr-1" /> 用羅盤偵測
          </Button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {DIRECTIONS_8.map(dir => (
            <Button key={dir} variant="outline" size="sm"
              className="flex flex-col h-12 gap-0.5"
              onClick={() => onSelect(dir)}>
              <span className="text-xs text-muted-foreground">{DIRECTIONS_LABELS[dir]}</span>
              <span className="font-medium">{dir}</span>
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium flex items-center gap-2">
          <Navigation className="w-4 h-4 text-amber-400" /> 手機羅盤偵測
        </p>
        <Button variant="ghost" size="sm" onClick={() => setManualMode(true)} className="text-xs">
          手動選擇
        </Button>
      </div>

      {permissionState === 'idle' && (
        <div className="text-center py-4 space-y-3">
          <div className="w-16 h-16 rounded-full border-2 border-amber-500/30 flex items-center justify-center mx-auto">
            <Compass className="w-8 h-8 text-amber-400/60" />
          </div>
          <p className="text-sm text-muted-foreground">讓手機羅盤自動偵測你的座位朝向</p>
          <Button onClick={startCompass} size="sm" className="gap-2">
            <Navigation className="w-4 h-4" /> 開啟羅盤
          </Button>
        </div>
      )}

      {permissionState === 'requesting' && (
        <div className="text-center py-4">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">正在請求感應器權限...</p>
        </div>
      )}

      {permissionState === 'denied' && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {error}
          <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => setManualMode(true)}>
            改用手動選擇
          </Button>
        </div>
      )}

      {permissionState === 'granted' && (
        <div className="space-y-3">
          {heading !== null ? (
            <>
              {/* 羅盤視覺 */}
              <div className="relative w-40 h-40 mx-auto">
                <svg viewBox="0 0 160 160" className="w-full h-full">
                  {/* 外圈 */}
                  <circle cx="80" cy="80" r="75" fill="none" stroke="hsl(var(--border))" strokeWidth="2" />
                  {/* 方位標記 */}
                  {DIRECTIONS_8.map((dir, i) => {
                    const angle = (i * 45 - 90) * (Math.PI / 180);
                    const x = 80 + 60 * Math.cos(angle);
                    const y = 80 + 60 * Math.sin(angle);
                    return (
                      <text key={dir} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
                        fontSize="9" fill={dir === currentDir ? '#f59e0b' : 'hsl(var(--muted-foreground))'}
                        fontWeight={dir === currentDir ? 'bold' : 'normal'}>
                        {dir}
                      </text>
                    );
                  })}
                  {/* 指針 - 旋轉到 heading 方向 */}
                  <g transform={`rotate(${heading}, 80, 80)`}>
                    <polygon points="80,20 76,80 80,85 84,80" fill="#ef4444" />
                    <polygon points="80,140 76,80 80,85 84,80" fill="hsl(var(--muted-foreground))" />
                  </g>
                  {/* 中心點 */}
                  <circle cx="80" cy="80" r="5" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="2" />
                </svg>
              </div>

              <div className="text-center">
                <p className="text-2xl font-bold text-amber-400">{currentDir}</p>
                <p className="text-xs text-muted-foreground">{Math.round(heading)}° — 你目前面對的方向</p>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => onSelect(currentDir!)} className="flex-1" size="sm">
                  <CheckCircle2 className="w-4 h-4 mr-1" /> 確認是 {currentDir}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setHeading(null)}>
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                請面向你的座位坐好，讓手機平放，等指針穩定後確認
              </p>
            </>
          ) : (
            <div className="text-center py-4">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">等待感應器回應...</p>
              <p className="text-xs text-muted-foreground mt-1">請確認手機未鎖定方向</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 問卷題目定義 ────────────────────────────────────────────────
type QuizQuestion = {
  id: string;
  label: string;
  hint?: string;
  options: string[];
  multi?: boolean;   // 複選題
  highlight?: boolean;
};

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'door_position',
    label: '門在你座位的哪個方向？',
    hint: '這是最重要的問題！門的位置決定了氣流進出方向，直接影響你的工作狀態和注意力',
    options: ['正前方', '正後方', '左前方', '右前方', '左後方', '右後方', '看不到門'],
    highlight: true,
  },
  {
    id: 'back_support',
    label: '你的座位背後是什麼？',
    hint: '背後有沒有實牆支撐，影響你的安全感和穩定度',
    options: ['實牆', '走道/通道', '窗戶', '矮隔板', '其他同事'],
  },
  {
    id: 'above_head',
    label: '你的頭頂上方有什麼？',
    hint: '頭頂有橫樑或管線會造成無形的壓迫感',
    options: ['平整天花板', '橫樑', '管線/風管', '吊燈/吊扇', '冷氣出風口'],
  },
  {
    id: 'desk_facing',
    label: '你的桌面正對什麼？',
    hint: '桌面朝向影響你的工作氣場',
    options: ['牆壁', '窗戶', '走道', '門口', '其他同事的背'],
  },
  {
    id: 'toilet_position',
    label: '廁所在你辦公室的哪個方向？',
    hint: '廁所的位置和方向對工作運勢有影響，特別是在你的正前方或正後方時',
    options: ['沒有廁所/不知道', '正前方', '正後方', '左方', '右方', '斜對角'],
  },
  {
    id: 'mirror_situation',
    label: '辦公室有沒有鏡子對著你？',
    hint: '鏡子正對人會讓人容易分心，也容易引起不必要的衝突',
    options: ['沒有鏡子', '有，正面對著我', '有，在我側面', '有，在我背後'],
  },
  {
    id: 'fish_tank',
    label: '辦公室有沒有魚缸？',
    hint: '魚缸放對位置可以聚財，放錯位置反而破財，還可能引起感情問題',
    options: ['沒有魚缸', '有，在我的左邊', '有，在我的右邊', '有，在我的正前方', '有，在我的正後方', '有，但位置不確定'],
  },
  {
    id: 'sharp_corners',
    label: '附近有沒有尖角對著你？（柱子角、牆角、桌角）',
    hint: '尖角對著人會造成無形的壓力，可以選多個',
    options: ['沒有', '有，在前方', '有，在側面', '有，在後方'],
    multi: true,
  },
  {
    id: 'environment_issues',
    label: '你的辦公環境還有哪些狀況？（可多選）',
    hint: '多選，選出所有符合你環境的狀況',
    options: ['有枯萎的植物', '桌面很雜亂', '光線昏暗', '噪音很大', '空氣不流通', '以上都沒有'],
    multi: true,
  },
];

// ─── 主元件 ─────────────────────────────────────────────────────
export default function OfficeFengShui() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("daily");

  // 單選答案
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  // 複選答案
  const [quizMultiAnswers, setQuizMultiAnswers] = useState<Record<string, string[]>>({});
  // 羅盤偵測到的方向
  const [compassDetected, setCompassDetected] = useState<string | null>(null);
  const [showCompass, setShowCompass] = useState(false);

  // 照片上傳狀態
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoContext, setPhotoContext] = useState("辦公桌");
  const [uploadPhase, setUploadPhase] = useState<'idle' | 'uploading' | 'analyzing'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dailyQuery = trpc.yangzhai.getDailyDirections.useQuery(undefined, { enabled: !!user });
  const quizMutation = trpc.yangzhai.diagnoseFormShaQuiz.useMutation();
  const uploadPhotoMutation = trpc.yangzhai.uploadPhoto.useMutation();
  const photoMutation = trpc.yangzhai.analyzeOfficePhoto.useMutation();
  const historyQuery = trpc.yangzhai.getAnalysisHistory.useQuery(undefined, { enabled: !!user });
  const feedbackMutation = trpc.yangzhai.submitFeedback.useMutation();

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SharedNav currentPage="office-fengshui" />
        <div className="container max-w-4xl py-20 text-center">
          <Compass className="w-16 h-16 mx-auto mb-6 text-amber-400" />
          <h1 className="text-3xl font-bold mb-4">辦公室開運風水</h1>
          <p className="text-muted-foreground mb-8">
            透過每日方位分析和環境診斷，優化你的工作環境，提升職場運勢
          </p>
          <Button asChild size="lg">
            <a href={getLoginUrl()}>登入開始分析</a>
          </Button>
        </div>
      </div>
    );
  }

  // 計算答題進度
  const singleQuestions = QUIZ_QUESTIONS.filter(q => !q.multi);
  const multiQuestions = QUIZ_QUESTIONS.filter(q => q.multi);
  const singleAnswered = singleQuestions.filter(q => !!quizAnswers[q.id]).length;
  const multiAnswered = multiQuestions.filter(q => (quizMultiAnswers[q.id]?.length ?? 0) > 0).length;
  const totalAnswered = singleAnswered + multiAnswered;
  const totalQuestions = QUIZ_QUESTIONS.length;
  const allAnswered = totalAnswered === totalQuestions;

  const handleSingleSelect = (qId: string, opt: string) => {
    setQuizAnswers(prev => ({ ...prev, [qId]: opt }));
  };

  const handleMultiToggle = (qId: string, opt: string) => {
    setQuizMultiAnswers(prev => {
      const cur = prev[qId] ?? [];
      // 如果選了「以上都沒有」或「沒有」，清除其他選項
      if (opt === '以上都沒有' || opt === '沒有') {
        return { ...prev, [qId]: [opt] };
      }
      // 如果已選了「以上都沒有」，先清除它
      const filtered = cur.filter(o => o !== '以上都沒有' && o !== '沒有');
      if (filtered.includes(opt)) {
        return { ...prev, [qId]: filtered.filter(o => o !== opt) };
      }
      return { ...prev, [qId]: [...filtered, opt] };
    });
  };

  const handleQuizSubmit = () => {
    if (!allAnswered) return;
    // 合併單選和複選答案
    const mergedAnswers: Record<string, string> = { ...quizAnswers };
    for (const [k, v] of Object.entries(quizMultiAnswers)) {
      mergedAnswers[k] = v.join('、');
    }
    quizMutation.mutate({ answers: mergedAnswers });
  };

  const handleCompassSelect = (dir: string) => {
    setCompassDetected(dir);
    setShowCompass(false);
    // 自動填入座位朝向（desk_facing 用方向描述）
    toast.success(`已偵測到你面向 ${dir}，已自動填入`);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("照片大小不能超過 10MB"); return; }
    setPhotoFile(file);
    photoMutation.reset();
    setPhotoPreview(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoBase64(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handlePhotoAnalyze = async () => {
    if (!photoFile || !photoBase64) return;
    setUploadPhase('uploading');
    try {
      const { url: fileUrl } = await uploadPhotoMutation.mutateAsync({
        imageBase64: photoBase64,
        mimeType: photoFile.type,
      });
      setUploadPhase('analyzing');
      await photoMutation.mutateAsync({ photoUrl: fileUrl, context: photoContext });
      toast.success("照片分析完成！");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '分析失敗，請稍後再試';
      toast.error(msg);
    } finally {
      setUploadPhase('idle');
    }
  };

  const report = dailyQuery.data;
  const doorBehind = quizAnswers['door_position'] === '正後方';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SharedNav currentPage="office-fengshui" />
      <div className="container max-w-5xl py-8">
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
          <TabsList className="mb-6 flex flex-wrap gap-1 h-auto">
            <TabsTrigger value="daily" className="gap-1.5">
              <Compass className="w-4 h-4" /> 今日方位
            </TabsTrigger>
            <TabsTrigger value="compass" className="gap-1.5">
              <Navigation className="w-4 h-4" /> 羅盤
            </TabsTrigger>
            <TabsTrigger value="quiz" className="gap-1.5">
              <HelpCircle className="w-4 h-4" /> 座位診斷
            </TabsTrigger>
            <TabsTrigger value="photo" className="gap-1.5">
              <Camera className="w-4 h-4" /> 拍照分析
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
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">你的個人能量數</p>
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

                {report.dailySummary && (
                  <Card><CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">{report.dailySummary}</p>
                  </CardContent></Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">今日八方位吉凶</CardTitle>
                    <CardDescription>根據你的個人能量數和今日流日計算</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {report.directions?.map((dir) => {
                        const isGood = dir.finalScore > 0;
                        const isBad = dir.finalScore < -30;
                        return (
                          <div key={dir.direction} className={`p-3 rounded-lg border text-center transition-all ${
                            isBad ? 'bg-red-500/10 border-red-500/30' :
                            isGood ? 'bg-green-500/10 border-green-500/30' : 'bg-muted/30 border-border'
                          }`}>
                            <p className="font-bold text-lg">{dir.direction}</p>
                            <p className={`text-sm font-medium ${isBad ? 'text-red-400' : isGood ? 'text-green-400' : 'text-muted-foreground'}`}>
                              {dir.star}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {dir.finalScore > 0 ? `+${dir.finalScore}` : dir.finalScore}
                            </p>
                            {dir.isClashed && (
                              <Badge variant="destructive" className="mt-1 text-xs">
                                <AlertTriangle className="w-3 h-3 mr-1" /> 沖煞
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {report.bestDirection && (
                    <Card className="border-green-500/30">
                      <CardContent className="pt-4">
                        <p className="text-sm font-medium text-green-400 mb-1">
                          今日最佳：{report.bestDirection.direction}（{report.bestDirection.star}）
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {report.bestDirection.officeAdvice || '今日適合在此方位進行重要會議或決策'}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                  {report.worstDirection && (
                    <Card className="border-red-500/30">
                      <CardContent className="pt-4">
                        <p className="text-sm font-medium text-red-400 mb-1">
                          今日避開：{report.worstDirection.direction}（{report.worstDirection.star}）
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {report.worstDirection.officeAdvice || '今日避免在此方位進行重要決策或與人爭執'}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {report.seatAdvice && (
                  <Card><CardContent className="pt-4">
                    <p className="text-sm font-medium text-amber-400 mb-1">座位建議</p>
                    <p className="text-sm text-muted-foreground">{report.seatAdvice}</p>
                  </CardContent></Card>
                )}
              </div>
            ) : (
              <Card className="p-8 text-center text-muted-foreground">
                <Compass className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>無法取得方位資料，請確認已設定個人資料（出生年份）</p>
              </Card>
            )}
          </TabsContent>

          {/* ===== 羅盤 Tab ===== */}
          <TabsContent value="compass">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Navigation className="w-5 h-5 text-amber-400" />
                    手機羅盤方位偵測
                  </CardTitle>
                  <CardDescription>
                    用手機感應器偵測你目前面對的方向，不需要手動輸入
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-sm">
                    <p className="font-medium text-amber-400 mb-1">使用方式</p>
                    <ol className="text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>坐在你的辦公座位上，面向你平常工作的方向</li>
                      <li>將手機平放在桌上（螢幕朝上）</li>
                      <li>點「開啟羅盤」，等待指針穩定</li>
                      <li>確認方向後，可直接帶入座位診斷</li>
                    </ol>
                  </div>

                  <CompassWidget onSelect={(dir) => {
                    setCompassDetected(dir);
                    toast.success(`已記錄你的座位朝向：${dir}`);
                  }} />

                  {compassDetected && (
                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                        <p className="font-medium text-green-400">已記錄座位朝向：{compassDetected}</p>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        你的座位面向{compassDetected}方。前往「座位診斷」可以根據這個方向進行完整分析。
                      </p>
                      <Button size="sm" onClick={() => setActiveTab('quiz')}>
                        <HelpCircle className="w-4 h-4 mr-1" /> 前往座位診斷
                      </Button>
                    </div>
                  )}

                  {/* 方位說明 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">各方位對辦公的影響</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        {[
                          { dir: '北', desc: '適合需要冷靜思考的工作，有助於專注', type: 'neutral' },
                          { dir: '東', desc: '充滿活力，適合創意工作和新計畫', type: 'good' },
                          { dir: '南', desc: '熱情外向，適合需要表現和溝通的工作', type: 'good' },
                          { dir: '西', desc: '適合需要收斂和整理的工作', type: 'neutral' },
                          { dir: '東北', desc: '學習和考試方位，適合需要學習的工作', type: 'good' },
                          { dir: '東南', desc: '財運方位，適合業務和財務相關工作', type: 'good' },
                          { dir: '西南', desc: '人際關係方位，適合需要協調的工作', type: 'neutral' },
                          { dir: '西北', desc: '領導力方位，適合管理職和決策工作', type: 'good' },
                        ].map(({ dir, desc, type }) => (
                          <div key={dir} className={`p-3 rounded-lg border ${
                            type === 'good' ? 'border-green-500/20 bg-green-500/5' : 'border-border bg-muted/20'
                          }`}>
                            <p className="font-medium mb-1">{dir}方</p>
                            <p className="text-muted-foreground text-xs">{desc}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ===== 座位診斷 Tab ===== */}
          <TabsContent value="quiz">
            <div className="space-y-6">
              {compassDetected && (
                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 flex items-center gap-2 text-sm">
                  <Navigation className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-muted-foreground">
                    羅盤已偵測到你的座位面向 <span className="text-amber-400 font-medium">{compassDetected}</span>，可作為參考
                  </span>
                </div>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-amber-400" />
                    辦公座位快速診斷
                  </CardTitle>
                  <CardDescription>
                    回答 {totalQuestions} 個問題（部分可多選），AI 會分析你的座位環境並給出改善建議
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {QUIZ_QUESTIONS.map((q, idx) => {
                    const isDoor = q.id === 'door_position';
                    const showDoorWarning = isDoor && quizAnswers['door_position'] === '正後方';
                    const isMulti = q.multi === true;
                    const multiSelected = quizMultiAnswers[q.id] ?? [];
                    const singleSelected = quizAnswers[q.id];

                    return (
                      <div key={q.id}>
                        <div className={isDoor ? 'p-4 rounded-lg border-2 border-amber-500/40 bg-amber-500/5' : ''}>
                          <Label className="text-sm font-medium mb-1 block">
                            {idx + 1}. {q.label}
                            {isDoor && (
                              <Badge className="ml-2 text-xs bg-amber-500/20 text-amber-400 border-amber-500/30">
                                最重要
                              </Badge>
                            )}
                            {isMulti && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                可多選
                              </Badge>
                            )}
                          </Label>
                          {q.hint && <p className="text-xs text-muted-foreground mb-2">{q.hint}</p>}
                          <div className="flex flex-wrap gap-2">
                            {q.options.map((opt) => {
                              const selected = isMulti
                                ? multiSelected.includes(opt)
                                : singleSelected === opt;
                              return (
                                <Button
                                  key={opt}
                                  variant={selected ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => isMulti
                                    ? handleMultiToggle(q.id, opt)
                                    : handleSingleSelect(q.id, opt)
                                  }
                                  className={selected && isMulti ? 'ring-2 ring-amber-500/50' : ''}
                                >
                                  {isMulti && selected && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                  {opt}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                        {/* 門在正後方即時警示 */}
                        {showDoorWarning && (
                          <div className="mt-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-red-400">注意！門在背後是最需要改善的情況</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                背後有門會讓你無法掌握進出情況，容易被突然進入的人嚇到，也難以集中注意力。
                                建議盡量換到有實牆的座位，或在椅背放一件深色外套作為「靠山」。
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div className="pt-4 border-t">
                    <Button
                      onClick={handleQuizSubmit}
                      disabled={!allAnswered || quizMutation.isPending}
                      className="w-full"
                      size="lg"
                    >
                      {quizMutation.isPending ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />AI 正在分析你的座位環境...</>
                      ) : (
                        <><Zap className="w-4 h-4 mr-2" />開始分析（{totalAnswered}/{totalQuestions}）</>
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
                      座位環境分析報告
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">環境分數：</span>
                      <Badge variant={quizMutation.data.overallScore >= 70 ? "default" : quizMutation.data.overallScore >= 40 ? "secondary" : "destructive"}>
                        {quizMutation.data.overallScore} / 100
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 門在正後方特別警示 */}
                    {doorBehind && (
                      <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="w-5 h-5 text-red-400" />
                          <p className="font-medium text-red-400">重要提醒：門在你的背後</p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          這是辦公環境中最需要優先改善的問題。門在背後會讓你長期處於「無法掌控進出」的狀態，
                          容易分心、緊張，也影響工作效率。建議優先換到有實牆的座位。
                        </p>
                      </div>
                    )}

                    {quizMutation.data.detections?.filter((d) => d.detected).length === 0 && (
                      <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20 text-center">
                        <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                        <p className="text-green-300 font-medium">你的座位環境整體不錯！</p>
                        <p className="text-sm text-muted-foreground mt-1">沒有發現明顯的環境問題</p>
                      </div>
                    )}

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
                          <Badge variant={sha.priority === 'critical' || sha.priority === 'high' ? 'destructive' : sha.priority === 'medium' ? 'secondary' : 'outline'}>
                            {sha.priority === 'critical' ? '需要立即處理' :
                             sha.priority === 'high' ? '建議盡快處理' :
                             sha.priority === 'medium' ? '可以改善' : '小調整'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{sha.description}</p>
                        {sha.remedy && (
                          <div className="p-2 rounded bg-green-500/5 border border-green-500/20">
                            <p className="text-sm text-green-300">
                              <CheckCircle2 className="w-3 h-3 inline mr-1" />
                              改善方法：{sha.remedy}
                            </p>
                          </div>
                        )}
                        {sha.urgencyMessage && <p className="text-xs text-amber-400 mt-1">{sha.urgencyMessage}</p>}
                      </div>
                    ))}

                    {quizMutation.data.prioritizedActions?.length > 0 && (
                      <div className="space-y-2">
                        <p className="font-medium text-sm">建議改善順序：</p>
                        {quizMutation.data.prioritizedActions.map((action, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                            <span className="text-muted-foreground">{action}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {quizMutation.data.overallAdvice && (
                      <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
                        <p className="text-sm font-medium text-amber-400 mb-1">綜合建議</p>
                        <p className="text-sm text-muted-foreground">{quizMutation.data.overallAdvice}</p>
                      </div>
                    )}

                    <ShareButtons
                      score={quizMutation.data.overallScore}
                      detectionCount={quizMutation.data.detections?.filter(d => d.detected).length ?? 0}
                      mainIssue={quizMutation.data.detections?.find(d => d.detected)?.shaName}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ===== 拍照分析 Tab ===== */}
          <TabsContent value="photo">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Camera className="w-5 h-5 text-amber-400" />
                    拍照環境分析
                  </CardTitle>
                  <CardDescription>
                    拍一張你的辦公桌或座位照片，AI 會直接識別環境問題並給出改善建議
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 照片上傳區 */}
                  <div
                    className={`relative border-2 border-dashed rounded-xl overflow-hidden cursor-pointer transition-all ${
                      photoPreview ? 'border-amber-500/50' : 'border-border hover:border-amber-500/30 hover:bg-muted/20'
                    }`}
                    onClick={() => uploadPhase === 'idle' && fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handlePhotoSelect}
                    />
                    {photoPreview ? (
                      <div className="relative">
                        <img src={photoPreview} alt="預覽" className="w-full max-h-64 object-cover" />
                        {uploadPhase === 'idle' && (
                          <button
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 hover:bg-background transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPhotoFile(null);
                              setPhotoPreview(null);
                              setPhotoBase64(null);
                              photoMutation.reset();
                            }}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        <div className="absolute bottom-2 left-2 bg-background/80 rounded px-2 py-0.5 text-xs text-muted-foreground">
                          {photoFile?.name}
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center space-y-3">
                        <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
                          <ImageIcon className="w-8 h-8 text-amber-400" />
                        </div>
                        <div>
                          <p className="font-medium">點擊拍照或選擇照片</p>
                          <p className="text-sm text-muted-foreground mt-1">支援 JPG、PNG，最大 10MB</p>
                        </div>
                        <div className="flex justify-center gap-4">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Camera className="w-3.5 h-3.5" /> 直接拍照
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Upload className="w-3.5 h-3.5" /> 從相簿選取
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 場景選擇 */}
                  {photoPreview && uploadPhase === 'idle' && (
                    <div>
                      <Label className="text-sm font-medium mb-2 block">這張照片是什麼場景？</Label>
                      <div className="flex flex-wrap gap-2">
                        {['辦公桌', '整個座位區域', '辦公室全景', '租屋房間', '書桌'].map((ctx) => (
                          <Button
                            key={ctx}
                            variant={photoContext === ctx ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPhotoContext(ctx)}
                          >
                            {ctx}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 拍照小技巧 */}
                  {!photoPreview && (
                    <div className="p-3 rounded-lg bg-muted/20 border border-border text-xs text-muted-foreground space-y-1">
                      <p className="font-medium text-foreground">拍照小技巧：</p>
                      <p>• 盡量拍到座位背後的環境（牆/走道/窗戶）</p>
                      <p>• 包含頭頂上方（有沒有橫樑、管線）</p>
                      <p>• 桌面和周圍環境一起拍進去</p>
                      <p>• 如果有魚缸或鏡子，也一起拍進去</p>
                    </div>
                  )}

                  {/* 上傳/分析動畫 */}
                  {uploadPhase !== 'idle' && <AnalyzingOverlay phase={uploadPhase} />}

                  {/* 分析按鈕 */}
                  {uploadPhase === 'idle' && photoFile && (
                    <Button onClick={handlePhotoAnalyze} className="w-full" size="lg">
                      <Sparkles className="w-4 h-4 mr-2" />
                      開始 AI 照片分析
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* 照片分析結果 */}
              {photoMutation.data && uploadPhase === 'idle' && (
                <Card className="border-amber-500/30">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Eye className="w-5 h-5 text-amber-400" />
                      照片環境分析報告
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">環境分數：</span>
                      <Badge variant={photoMutation.data.overallScore >= 70 ? "default" : photoMutation.data.overallScore >= 40 ? "secondary" : "destructive"}>
                        {photoMutation.data.overallScore} / 100
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {photoMutation.data.detections?.filter((d) => d.detected).length === 0 && (
                      <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20 text-center">
                        <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                        <p className="text-green-300 font-medium">照片中沒有發現明顯的環境問題！</p>
                      </div>
                    )}

                    {photoMutation.data.detections?.filter((d) => d.detected).map((sha, i: number) => (
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
                          <Badge variant={sha.priority === 'critical' || sha.priority === 'high' ? 'destructive' : sha.priority === 'medium' ? 'secondary' : 'outline'}>
                            {sha.priority === 'critical' ? '需要立即處理' :
                             sha.priority === 'high' ? '建議盡快處理' :
                             sha.priority === 'medium' ? '可以改善' : '小調整'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">位置：{sha.location}</p>
                        <p className="text-sm text-muted-foreground mb-2">{sha.description}</p>
                        {sha.remedy && (
                          <div className="p-2 rounded bg-green-500/5 border border-green-500/20">
                            <p className="text-sm text-green-300">
                              <CheckCircle2 className="w-3 h-3 inline mr-1" />
                              改善方法：{sha.remedy}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}

                    {photoMutation.data.prioritizedActions?.length > 0 && (
                      <div className="space-y-2">
                        <p className="font-medium text-sm">建議改善順序：</p>
                        {photoMutation.data.prioritizedActions.map((action, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                            <span className="text-muted-foreground">{action}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {photoMutation.data.overallAdvice && (
                      <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
                        <p className="text-sm font-medium text-amber-400 mb-1">綜合建議</p>
                        <p className="text-sm text-muted-foreground">{photoMutation.data.overallAdvice}</p>
                      </div>
                    )}

                    <ShareButtons
                      score={photoMutation.data.overallScore}
                      detectionCount={photoMutation.data.detections?.filter(d => d.detected).length ?? 0}
                      mainIssue={photoMutation.data.detections?.find(d => d.detected)?.shaName}
                    />
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
                <p className="text-sm mt-2">使用「今日方位」、「座位診斷」或「拍照分析」後，記錄會出現在這裡</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {historyQuery.data.map((record) => (
                  <Card key={record.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {record.analysisType === 'daily_direction' ? '今日方位' :
                             record.analysisType === 'form_sha_photo' ? '照片分析' :
                             record.analysisType === 'form_sha_quiz' ? '座位診斷' : '完整報告'}
                          </Badge>
                          {record.score !== null && (
                            <span className="text-sm text-muted-foreground">分數: {record.score}</span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(record.createdAt).toLocaleDateString('zh-TW')}
                        </span>
                      </div>
                      {!record.feedback && (
                        <div className="flex gap-2 mt-3">
                          <Button variant="outline" size="sm"
                            onClick={() => feedbackMutation.mutate(
                              { analysisId: record.id, feedback: 'helpful' },
                              { onSuccess: () => historyQuery.refetch() }
                            )}>
                            <ThumbsUp className="w-3 h-3 mr-1" /> 有幫助
                          </Button>
                          <Button variant="outline" size="sm"
                            onClick={() => feedbackMutation.mutate(
                              { analysisId: record.id, feedback: 'not_helpful' },
                              { onSuccess: () => historyQuery.refetch() }
                            )}>
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
