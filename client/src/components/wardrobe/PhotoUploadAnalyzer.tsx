/**
 * PhotoUploadAnalyzer
 * 拍照/上傳衣物照片 → AI 五行分析 → 確認加入虛擬衣樻
 *
 * Props:
 *   onSuccess(item) - 成功加入後回調
 *   onClose()       - 關閉面板
 *   favorableWuxing / unfavorableWuxing - 今日用神（可選，提升分析準確度）
 *   defaultCategory - 預設衣物類型（可選）
 *   mode            - "wardrobe"（用戶衣樻）| "admin"（後台手串管理）
 */
import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, Upload, Loader2, CheckCircle2, X, RotateCcw, Sparkles } from "lucide-react";
import { InsufficientCoinsModal, parseInsufficientCoinsError } from "@/components/InsufficientCoinsModal";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
type Category = "upper" | "lower" | "shoes" | "outer" | "accessory" | "bracelet";

interface AnalysisResult {
  name: string;
  category: string;
  color: string;
  wuxing: string;
  auraBoost: number;
  energyExplanation: string;
  detectedColors: Array<{ part: string; color: string; wuxing: string }>;
}

interface Props {
  onSuccess?: (item: AnalysisResult) => void;
  onClose?: () => void;
  favorableWuxing?: string[];
  unfavorableWuxing?: string[];
  defaultCategory?: Category;
  mode?: "wardrobe" | "admin";
}

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────
const CATEGORY_LABELS: Record<Category, string> = {
  upper: "上衣",
  lower: "下裝/褲子",
  shoes: "鞋子",
  outer: "外套",
  accessory: "配件",
  bracelet: "手串/手鍊",
};

const WUXING_COLORS: Record<string, string> = {
  木: "text-green-400",
  火: "text-red-400",
  土: "text-yellow-400",
  金: "text-gray-300",
  水: "text-blue-400",
};

const WUXING_BG: Record<string, string> = {
  木: "bg-green-500/20 border-green-500/40",
  火: "bg-red-500/20 border-red-500/40",
  土: "bg-yellow-500/20 border-yellow-500/40",
  金: "bg-gray-400/20 border-gray-400/40",
  水: "bg-blue-500/20 border-blue-500/40",
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function compressImage(file: File, maxWidth = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────
export default function PhotoUploadAnalyzer({
  onSuccess,
  onClose,
  favorableWuxing = [],
  unfavorableWuxing = [],
  defaultCategory,
  mode = "wardrobe",
}: Props) {
  const [step, setStep] = useState<"upload" | "analyzing" | "result" | "saving">("upload");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>(defaultCategory);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const analyzeAndAdd = trpc.wardrobe.analyzeAndAdd.useMutation();
  const utils = trpc.useUtils();
  const { data: coinsData } = trpc.coins.getBalance.useQuery(undefined, { staleTime: 30000 });
  const { data: pricingData } = trpc.coins.getFeaturePricing.useQuery(undefined, { staleTime: 60000 });
  const wardrobeCost = pricingData?.['wardrobe_ai'] ?? 15;
  const currentCoins = coinsData?.balance ?? 0;
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  const [insufficientRequired, setInsufficientRequired] = useState(0);
  const [insufficientCurrent, setInsufficientCurrent] = useState(0);

  // ── File selection ──────────────────────────
  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("請選擇圖片檔案");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("圖片大小不能超過 20MB");
      return;
    }
    try {
      const compressed = await compressImage(file);
      setPreviewUrl(compressed);
      setImageBase64(compressed);
      setError(null);
    } catch {
      toast.error("圖片處理失敗，請重試");
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  // ── Drag & drop ─────────────────────────────
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  // ── Analyze ─────────────────────────────────
  const handleAnalyze = async () => {
    if (!imageBase64) return;
    setStep("analyzing");
    setError(null);

    try {
      const res = await analyzeAndAdd.mutateAsync({
        imageBase64,
        category: selectedCategory,
        favorableWuxing: favorableWuxing.length ? favorableWuxing : undefined,
        unfavorableWuxing: unfavorableWuxing.length ? unfavorableWuxing : undefined,
      });

      if (res.success) {
        setResult(res.item);
        setStep("result");
        // Invalidate wardrobe list
        utils.wardrobe.list.invalidate();
      }
    } catch (err: unknown) {
      const { isInsufficientCoins, required, current } = parseInsufficientCoinsError(err);
      if (isInsufficientCoins) {
        setInsufficientRequired(required || wardrobeCost);
        setInsufficientCurrent(current || currentCoins);
        setShowInsufficientModal(true);
        setStep("upload");
      } else {
        const msg = err instanceof Error ? err.message : "AI 分析失敗，請重試";
        setError(msg);
        setStep("upload");
        toast.error(msg);
      }
    }
  };

  // ── Reset ────────────────────────────────────
  const handleReset = () => {
    setStep("upload");
    setPreviewUrl(null);
    setImageBase64(null);
    setResult(null);
    setError(null);
  };

  // ── Confirm ──────────────────────────────────
  const handleConfirm = () => {
    if (!result) return;
    toast.success(`✨ 已加入虛擬衣樻：${result.name}`);
    onSuccess?.(result);
    onClose?.();
  };

  // ── Render ───────────────────────────────────────────
  return (
    <>
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            {mode === "admin" ? "拍照新增手串/配飾" : "拍照新增衣物"}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            上傳照片，AI 即時分析五行屬性與能量加成
          </p>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* ── Step: Upload ── */}
      {step === "upload" && (
        <div className="flex flex-col gap-3">
          {/* Category selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground shrink-0">物品類型</span>
            <Select
              value={selectedCategory ?? ""}
              onValueChange={(v) => setSelectedCategory(v as Category)}
            >
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="讓 AI 自動判斷" />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(CATEGORY_LABELS) as [Category, string][]).map(([val, label]) => (
                  <SelectItem key={val} value={val} className="text-xs">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCategory && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setSelectedCategory(undefined)}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>

          {/* Drop zone / preview */}
          {previewUrl ? (
            <div className="relative rounded-lg overflow-hidden border border-border">
              <img
                src={previewUrl}
                alt="預覽"
                className="w-full max-h-64 object-contain bg-black/20"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
                onClick={handleReset}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                拖曳圖片到此處，或點擊選擇檔案
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                支援 JPG、PNG、HEIC，最大 20MB
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="w-4 h-4" />
              拍照
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4" />
              選擇照片
            </Button>
          </div>

          {imageBase64 && (
            <Button
              size="sm"
              className="w-full gap-2 bg-primary hover:bg-primary/90"
              onClick={handleAnalyze}
            >
              <Sparkles className="w-4 h-4" />
              開始 AI 五行分析
            </Button>
          )}

          {error && (
            <p className="text-xs text-destructive text-center">{error}</p>
          )}

          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* ── Step: Analyzing ── */}
      {step === "analyzing" && (
        <div className="flex flex-col items-center gap-4 py-8">
          {previewUrl && (
            <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-border">
              <img src={previewUrl} alt="分析中" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            </div>
          )}
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">AI 正在分析五行能量...</p>
            <p className="text-xs text-muted-foreground mt-1">
              識別顏色 → 對應五行 → 計算加成分數
            </p>
          </div>
          {/* Animated steps */}
          <div className="flex flex-col gap-1.5 w-full max-w-xs">
            {["識別衣物顏色與材質", "對應五行能量屬性", "計算 Aura Score 加成", "生成能量說明"].map(
              (label, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin text-primary shrink-0" />
                  {label}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* ── Step: Result ── */}
      {step === "result" && result && (
        <div className="flex flex-col gap-3">
          {/* Success header */}
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium">分析完成！</span>
          </div>

          {/* Result card */}
          <div className={`rounded-lg border p-4 ${WUXING_BG[result.wuxing] ?? "bg-card border-border"}`}>
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <p className="font-semibold text-foreground">{result.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {CATEGORY_LABELS[result.category as Category] ?? result.category}
                  {" · "}
                  {result.color}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-2xl font-bold ${WUXING_COLORS[result.wuxing] ?? ""}`}>
                  {result.wuxing}
                </p>
                <p className="text-xs text-muted-foreground">五行</p>
              </div>
            </div>

            {/* Aura boost */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-muted-foreground">Aura 加成</span>
              <div className="flex-1 h-2 bg-black/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${(result.auraBoost / 10) * 100}%` }}
                />
              </div>
              <span className="text-sm font-bold text-primary">+{result.auraBoost}</span>
            </div>

            {/* Detected colors */}
            {result.detectedColors.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {result.detectedColors.map((c, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className={`text-xs ${WUXING_COLORS[c.wuxing] ?? ""}`}
                  >
                    {c.part}: {c.color}（{c.wuxing}）
                  </Badge>
                ))}
              </div>
            )}

            {/* Energy explanation */}
            <p className="text-xs text-muted-foreground leading-relaxed">
              {result.energyExplanation}
            </p>
          </div>

          {/* Note: photo deleted */}
          <p className="text-xs text-muted-foreground/60 text-center">
            ✓ 原始照片已自動刪除，僅保留分析結果
          </p>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
              onClick={handleReset}
            >
              <RotateCcw className="w-4 h-4" />
              重新拍照
            </Button>
            <Button
              size="sm"
              className="flex-1 gap-2 bg-primary hover:bg-primary/90"
              onClick={handleConfirm}
            >
              <CheckCircle2 className="w-4 h-4" />
              加入衣樻
            </Button>
          </div>
        </div>
      )}
    </div>
    <InsufficientCoinsModal
      open={showInsufficientModal}
      onOpenChange={setShowInsufficientModal}
      required={insufficientRequired}
      current={insufficientCurrent}
      featureName="AI 穿搞分析"
    />
    </>
  );
}
