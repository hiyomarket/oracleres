/**
 * InsufficientCoinsModal - 天命幣不足提示彈窗
 *
 * 當用戶嘗試使用 AI 功能但天命幣不足時，顯示此彈窗
 * 提供「前往天命小舖充值」的引導按鈕
 */
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface InsufficientCoinsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  required: number;
  current: number;
  featureName?: string;
}

export function InsufficientCoinsModal({
  open,
  onOpenChange,
  required,
  current,
  featureName = "此 AI 功能",
}: InsufficientCoinsModalProps) {
  const [, navigate] = useLocation();

  const shortage = required - current;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="mx-4 sm:mx-auto max-w-sm">
        <DialogHeader>
          <div className="flex items-center justify-center mb-3">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <span className="text-3xl">🪙</span>
            </div>
          </div>
          <DialogTitle className="text-center">天命幣不足</DialogTitle>
          <DialogDescription className="text-center">
            使用 <strong className="text-foreground">{featureName}</strong> 需要{" "}
            <strong className="text-amber-400">{required} 天命幣</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">需要天命幣</span>
            <span className="font-semibold text-amber-400">{required} 枚</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">目前餘額</span>
            <span className="font-semibold text-rose-400">{current} 枚</span>
          </div>
          <div className="border-t border-amber-500/20 pt-2 flex justify-between">
            <span className="text-muted-foreground">尚缺</span>
            <span className="font-bold text-rose-400">{shortage} 枚</span>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            稍後再說
          </Button>
          <Button
            className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            onClick={() => {
              onOpenChange(false);
              navigate("/feature-store");
            }}
          >
            🪙 前往天命小舖充值
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 解析 tRPC 錯誤，判斷是否為天命幣不足錯誤
 * 並提取所需幣數和當前餘額
 */
export function parseInsufficientCoinsError(error: unknown): {
  isInsufficientCoins: boolean;
  required: number;
  current: number;
} {
  if (!error || typeof error !== "object") {
    return { isInsufficientCoins: false, required: 0, current: 0 };
  }

  const err = error as { message?: string; data?: { code?: string } };
  const message = err.message ?? "";

  // 匹配 "天命幣不足，此功能需要 X 天命幣，您目前餘額為 Y 天命幣"
  const match = message.match(/需要\s*(\d+)\s*天命幣.*餘額為\s*(\d+)\s*天命幣/);
  if (match) {
    return {
      isInsufficientCoins: true,
      required: parseInt(match[1]),
      current: parseInt(match[2]),
    };
  }

  // 舊版積分不足訊息相容
  if (message.includes("不足") && (message.includes("天命幣") || message.includes("積分"))) {
    return { isInsufficientCoins: true, required: 0, current: 0 };
  }

  return { isInsufficientCoins: false, required: 0, current: 0 };
}
