/**
 * ProfileIncompleteBanner.tsx
 * 命格資料完整性提示橫幅
 * 當用戶的命格資料不完整時，在功能頁面頂部顯示提示，引導用戶前往填寫
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { AlertTriangle, X, ArrowRight } from "lucide-react";

interface ProfileIncompleteBannerProps {
  /** 提示的功能名稱，例如「作戰室」、「選號系統」 */
  featureName?: string;
}

export function ProfileIncompleteBanner({ featureName }: ProfileIncompleteBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const { data: profile, isLoading } = trpc.account.getProfile.useQuery();
  const { data: status, isLoading: statusLoading } = trpc.account.getStatus.useQuery(undefined, { staleTime: 60000 });

  // 載入中或已關閉不顯示
  if (isLoading || statusLoading || dismissed) return null;

  // 主帳號不顯示提示（主帳號的命格資料已內建於系統中）
  if (status?.isOwner) return null;

  // 判斷命格資料是否完整（至少需要 dayMasterElement 和 favorableElements）
  const isComplete = !!(profile?.dayMasterElement && profile?.favorableElements);

  if (isComplete) return null;

  // 判斷缺少哪些資料
  const missing: string[] = [];
  if (!profile?.birthDate) missing.push("出生日期");
  if (!profile?.dayMasterElement) missing.push("日主五行");
  if (!profile?.favorableElements) missing.push("喜用神");

  if (missing.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="mx-4 mt-3 mb-1 rounded-2xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 flex items-start gap-3"
      >
        <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-amber-300 font-medium">
            命格資料未完整，{featureName ?? "本功能"}分析精準度受限
          </p>
          <p className="text-xs text-amber-400/70 mt-0.5">
            缺少：{missing.join("、")}。完整填寫後，系統將根據您的個人命格提供精準分析。
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/my-profile">
            <span className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors cursor-pointer whitespace-nowrap">
              前往填寫
              <ArrowRight className="w-3 h-3" />
            </span>
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="text-amber-500/50 hover:text-amber-400 transition-colors"
            aria-label="關閉提示"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
