/**
 * FeatureLockedCard.tsx
 * 功能鎖定提示卡片
 * 當使用者沒有某功能的權限時顯示
 */
import { Lock } from "lucide-react";
import { FEATURE_LABELS, type FeatureId } from "@/hooks/usePermissions";

interface FeatureLockedCardProps {
  feature: FeatureId;
  description?: string;
  className?: string;
}

export function FeatureLockedCard({ feature, description, className = "" }: FeatureLockedCardProps) {
  const label = FEATURE_LABELS[feature] ?? feature;

  return (
    <div className={`flex flex-col items-center justify-center min-h-[60vh] px-6 ${className}`}>
      <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-10 max-w-sm w-full text-center backdrop-blur-sm">
        {/* 鎖頭圖示 */}
        <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center mx-auto mb-5">
          <Lock className="w-7 h-7 text-slate-500" />
        </div>

        {/* 標題 */}
        <h2 className="text-lg font-bold text-white mb-2">
          {label}
        </h2>

        {/* 說明 */}
        <p className="text-sm text-slate-400 leading-relaxed mb-6">
          {description ?? `您目前尚未開通「${label}」功能的使用權限。請聯繫客服開通此功能。`}
        </p>

        {/* 裝飾線 */}
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <div className="flex-1 h-px bg-slate-700/50" />
          <span>天命共振系統</span>
          <div className="flex-1 h-px bg-slate-700/50" />
        </div>
      </div>
    </div>
  );
}
