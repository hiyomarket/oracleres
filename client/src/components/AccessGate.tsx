/**
 * AccessGate.tsx
 * 全站存取守衛：
 * 1. 未登入 → 顯示登入頁
 * 2. 已登入 → 顯示子頁面（開放式，不需邀請碼）
 * 3. 首次登入未填命格 → 顯示 OnboardingModal
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Loader2, ShieldCheck, LogIn } from "lucide-react";
import { OnboardingModal } from "./OnboardingModal";
import { trpc } from "@/lib/trpc";

interface AccessGateProps {
  children: React.ReactNode;
}

export function AccessGate({ children }: AccessGateProps) {
  const { user, loading: authLoading } = useAuth();
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  const { data: profileData, isLoading: profileLoading } = trpc.account.getProfile.useQuery(
    undefined,
    { enabled: !!user && !authLoading }
  );

  // 載入中
  if (authLoading) {
    return (
      <div className="min-h-screen oracle-page flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  // 未登入
  if (!user) {
    return (
      <div className="min-h-screen oracle-page flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm text-center space-y-6"
        >
          <div className="space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-8 h-8 text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">天命共振</h1>
            <p className="text-slate-400 text-sm">請先登入以開始使用系統</p>
          </div>
          <a
            href={getLoginUrl()}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <LogIn className="w-4 h-4" />
            使用 Manus 帳號登入
          </a>
        </motion.div>
      </div>
    );
  }

  // 已登入：首次登入且未填命格（且非主帳號）→ 顯示 OnboardingModal
  const isOwner = user.role === "admin";
  const needsOnboarding =
    !isOwner &&
    !profileLoading &&
    !onboardingDismissed &&
    profileData !== undefined &&
    !profileData?.displayName;

  return (
    <>
      {children}
      {needsOnboarding && (
        <OnboardingModal onComplete={() => setOnboardingDismissed(true)} />
      )}
    </>
  );
}
