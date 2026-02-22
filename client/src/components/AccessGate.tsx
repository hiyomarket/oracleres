/**
 * AccessGate.tsx
 * 全站存取守衛：
 * 1. 未登入 → 顯示登入頁
 * 2. 已登入但未啟用邀請碼 → 顯示邀請碼輸入頁
 * 3. 已啟用（或主帳號）→ 顯示子頁面
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { KeyRound, LogIn, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { OnboardingModal } from "./OnboardingModal";

interface AccessGateProps {
  children: React.ReactNode;
}

export function AccessGate({ children }: AccessGateProps) {
  const { user, loading: authLoading } = useAuth();
  const { data: accountStatus, isLoading: statusLoading, refetch: refetchStatus } =
    trpc.account.getStatus.useQuery(undefined, { retry: false });
  const [inviteCode, setInviteCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  // ✅ 所有 Hook 必須在條件式 return 之前呼叫
  const isActivated = !!(accountStatus?.isActivated || accountStatus?.isOwner);
  const { data: profileData, isLoading: profileLoading } = trpc.account.getProfile.useQuery(
    undefined,
    { enabled: isActivated && !authLoading && !statusLoading }
  );

  const useCodeMutation = trpc.account.useInviteCode.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      refetchStatus();
    },
    onError: (err) => {
      toast.error(err.message);
      setSubmitting(false);
    },
  });

  const handleUseCode = () => {
    const code = inviteCode.trim().toUpperCase();
    if (code.length < 6) { toast.error("請輸入有效的邀請碼"); return; }
    setSubmitting(true);
    useCodeMutation.mutate({ code });
  };

  // 載入中
  if (authLoading || statusLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  // 未登入
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
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
            <p className="text-slate-400 text-sm">此系統為私密使用，請先登入以繼續</p>
          </div>
          <a
            href={getLoginUrl()}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <LogIn className="w-4 h-4" />
            使用 Manus 帳號登入
          </a>
          <p className="text-slate-600 text-xs">需要邀請碼才能使用本系統</p>
        </motion.div>
      </div>
    );
  }

  // 已登入但未啟用邀請碼（且非主帳號）
  if (accountStatus && !accountStatus.isActivated) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-6"
        >
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mx-auto">
              <KeyRound className="w-8 h-8 text-purple-400" />
            </div>
            <h1 className="text-xl font-bold text-white">輸入邀請碼</h1>
            <p className="text-slate-400 text-sm">
              您好，{user.name ?? "訪客"}。<br />
              請輸入邀請碼以啟用帳號存取權限。
            </p>
          </div>
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 space-y-4">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">邀請碼</label>
              <input
                type="text"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === "Enter" && handleUseCode()}
                placeholder="例：ABCD1234"
                maxLength={16}
                className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-4 py-3 text-white text-center text-lg font-mono tracking-widest placeholder-slate-600 focus:outline-none focus:border-purple-500/60"
              />
            </div>
            <button
              onClick={handleUseCode}
              disabled={submitting || inviteCode.length < 6}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {submitting ? "驗證中..." : "啟用帳號"}
            </button>
          </div>
          <p className="text-slate-600 text-xs text-center">
            沒有邀請碼？請聯繫客服取得
          </p>
        </motion.div>
      </div>
    );
  }

  // 已啟用且命格未填寫（且未被略過）；主帳號不需要 Onboarding
  const needsOnboarding =
    isActivated &&
    !accountStatus?.isOwner &&
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
