/**
 * AdminDestinyShop.tsx
 * 天命小舖後台管理頁面
 * - AI 功能天命幣費用設定（統一管理，含原 marketing 的問卜費用）
 * - 方案贈幣設定（首次訂閱 / 每月續訂）
 * - 充值套餐說明
 * - 天命幣使用統計
 */
import { useAdminRole } from "@/hooks/useAdminRole";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { AdminLayout } from "@/components/AdminLayout";
import { toast } from "sonner";
import { Coins, Zap, Package, BarChart3, Edit2, Check, X } from "lucide-react";

// ─── 功能費用列 ────────────────────────────────────────────────────────────────
function FeatureCostRow({
  featureId,
  featureName,
  currentCost,
  onSave,
  saving,
  readOnly,
}: {
  featureId: string;
  featureName: string;
  currentCost: number;
  onSave: (featureId: string, cost: number) => void;
  saving: boolean;
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(String(currentCost));

  const isAI = currentCost > 0;
  const FEATURE_ICONS: Record<string, string> = {
    warroom_divination: "🔮",
    oracle: "🎋",
    warroom_dietary: "🍽️",
    warroom_outfit: "👗",
    ai_report: "📊",
    monthly_report: "📅",
    warroom: "⚔️",
    lottery: "🎰",
    calendar: "📆",
    profile: "👤",
    stats: "📈",
    warroom_wealth: "💰",
    weekly: "🎫",
  };
  const icon = FEATURE_ICONS[featureId] ?? "⚙️";

  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-700/30 last:border-0">
      <span className="text-xl w-8 shrink-0 text-center">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-200">{featureName}</div>
        <div className="text-xs text-slate-500">{featureId}</div>
      </div>
      {editing ? (
        <div className="flex items-center gap-2 shrink-0">
          <input
            type="number"
            min="0"
            max="9999"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            className="w-20 bg-slate-700 border border-amber-500/50 text-white text-sm rounded-lg px-2 py-1 text-center focus:outline-none focus:ring-1 focus:ring-amber-500"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSave(featureId, Number(inputVal));
                setEditing(false);
              }
              if (e.key === "Escape") {
                setInputVal(String(currentCost));
                setEditing(false);
              }
            }}
          />
          <button
            onClick={() => { onSave(featureId, Number(inputVal)); setEditing(false); }}
            disabled={saving || readOnly}
            title={readOnly ? "唯讀模式" : undefined}
            className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { setInputVal(String(currentCost)); setEditing(false); }}
            className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-400 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            {currentCost > 0 ? (
              <span className="text-sm font-bold text-amber-400">{currentCost} 幣</span>
            ) : (
              <span className="text-xs text-slate-500 bg-slate-700/40 px-2 py-0.5 rounded-full">免費</span>
            )}
          </div>
          <button
            onClick={() => { setInputVal(String(currentCost)); setEditing(true); }}
            disabled={readOnly}
            title={readOnly ? "唯讀模式" : undefined}
            className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-400 hover:text-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── 方案贈幣列 ────────────────────────────────────────────────────────────────
function PlanBonusRow({
  planId,
  planName,
  price,
  firstBonus,
  renewalBonus,
  onSave,
  saving,
  readOnly,
}: {
  planId: string;
  planName: string;
  price: string;
  firstBonus: number;
  renewalBonus: number;
  onSave: (planId: string, first: number, renewal: number) => void;
  saving: boolean;
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [firstInput, setFirstInput] = useState(String(firstBonus));
  const [renewalInput, setRenewalInput] = useState(String(renewalBonus));

  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-700/30 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-200">{planName}</span>
          <span className="text-xs text-slate-500 bg-slate-700/40 px-1.5 py-0.5 rounded">
            NT${Number(price).toLocaleString()}/月
          </span>
        </div>
        <div className="text-xs text-slate-500 mt-0.5">{planId}</div>
      </div>
      {editing ? (
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 w-12 text-right">首次</span>
              <input
                type="number" min="0" max="99999"
                value={firstInput}
                onChange={(e) => setFirstInput(e.target.value)}
                className="w-20 bg-slate-700 border border-amber-500/50 text-white text-xs rounded px-2 py-1 text-center focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 w-12 text-right">續訂</span>
              <input
                type="number" min="0" max="99999"
                value={renewalInput}
                onChange={(e) => setRenewalInput(e.target.value)}
                className="w-20 bg-slate-700 border border-sky-500/50 text-white text-xs rounded px-2 py-1 text-center focus:outline-none"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => { onSave(planId, Number(firstInput), Number(renewalInput)); setEditing(false); }}
              disabled={saving || readOnly}
              title={readOnly ? "唯讀模式" : undefined}
              className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setFirstInput(String(firstBonus)); setRenewalInput(String(renewalBonus)); setEditing(false); }}
              className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-400 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right space-y-0.5">
            <div className="text-xs">
              <span className="text-slate-500">首次 </span>
              <span className={firstBonus > 0 ? "text-amber-400 font-semibold" : "text-slate-500"}>{firstBonus > 0 ? `+${firstBonus}` : "0"}</span>
            </div>
            <div className="text-xs">
              <span className="text-slate-500">續訂 </span>
              <span className={renewalBonus > 0 ? "text-sky-400 font-semibold" : "text-slate-500"}>{renewalBonus > 0 ? `+${renewalBonus}` : "0"}</span>
            </div>
          </div>
          <button
            onClick={() => setEditing(true)}
            disabled={readOnly}
            title={readOnly ? "唯讀模式" : undefined}
            className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-400 hover:text-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── 主頁面 ─────────────────────────────────────────────────────────────────
export default function AdminDestinyShop() {
  const { readOnly } = useAdminRole();
  const utils = trpc.useUtils();

  // 功能列表（含 coinCostPerUse）
  const { data: featuresData, isLoading: featuresLoading } = trpc.coins.getFeaturePricingAdmin.useQuery();
  // 方案列表
  const { data: plansData, isLoading: plansLoading } = trpc.coins.getPlansWithBonusCoins.useQuery();
  // 使用統計
  const { data: usageStats } = trpc.coins.adminGetUsageStats.useQuery();

  const updateFeaturePricing = trpc.coins.adminUpdateFeaturePricing.useMutation({
    onSuccess: () => {
      toast.success("費用已更新");
      utils.coins.getFeaturePricingAdmin.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updatePlanBonus = trpc.coins.adminUpdatePlanBonusCoins.useMutation({
    onSuccess: () => {
      toast.success("方案贈幣已更新");
      utils.coins.getPlansWithBonusCoins.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const TOPUP_PACKAGES = [
    { id: "coins_100", label: "100 天命幣", price: "NT$30", bonus: "" },
    { id: "coins_550", label: "550 天命幣", price: "NT$150", bonus: "贈 10%" },
    { id: "coins_1200", label: "1,200 天命幣", price: "NT$300", bonus: "贈 20%" },
    { id: "coins_5000", label: "5,000 天命幣", price: "NT$1,000", bonus: "贈 25%" },
  ];

  // 統計數字
  const totalTopup = Number((usageStats?.topupStats as any)?.[0]?.totalTopup ?? 0);
  const totalSpent = Array.isArray(usageStats?.todayStats)
    ? (usageStats.todayStats as any[]).reduce((sum: number, r: any) => sum + Number(r.totalCoins ?? 0), 0)
    : 0;

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* ── 標題 ── */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-amber-400 mb-1 flex items-center gap-2">
            <Coins className="w-6 h-6" />
            天命小舖管理
          </h1>
          <p className="text-slate-400 text-sm">統一管理 AI 功能天命幣費用、方案贈幣設定與充值套餐</p>
        </div>

        {/* ── 統計卡片 ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "今日 AI 消耗", value: totalSpent, unit: "幣", color: "text-rose-400", icon: "🔥" },
            { label: "歷史充值總量", value: totalTopup, unit: "幣", color: "text-emerald-400", icon: "💎" },
            { label: "AI 功能數", value: featuresData?.length ?? 0, unit: "項", color: "text-sky-400", icon: "⚡" },
            { label: "方案數", value: plansData?.length ?? 0, unit: "個", color: "text-violet-400", icon: "📦" },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-slate-800/60 rounded-2xl p-5 border border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">{kpi.label}</span>
                <span className="text-xl">{kpi.icon}</span>
              </div>
              <div className={`text-2xl font-bold ${kpi.color} tabular-nums`}>{kpi.value.toLocaleString()}</div>
              <div className="text-xs text-slate-500 mt-1">{kpi.unit}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* ── 左側：AI 功能費用設定 ── */}
          <div className="bg-slate-800/60 rounded-2xl p-5 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-slate-200">AI 功能天命幣費用</h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">點擊鉛筆圖示即可修改，設為 0 表示免費使用</p>

            {featuresLoading ? (
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-slate-700/40 rounded-lg animate-pulse" />)}
              </div>
            ) : (featuresData ?? []).length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">尚無功能資料</div>
            ) : (
              <div>
                {(featuresData ?? []).map((f) => (
                  <FeatureCostRow
                    key={f.id}
                    featureId={f.id}
                    featureName={f.name}
                    currentCost={f.coinCostPerUse ?? 0}
                    onSave={(fId, cost) => updateFeaturePricing.mutate({ featureId: fId, coinCostPerUse: cost })}
                    saving={updateFeaturePricing.isPending}
                    readOnly={readOnly}
                  />
                ))}
              </div>
            )}

            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300/80">
              ⚠️ 費用修改後即時生效，影響所有用戶的天命幣消耗
            </div>
          </div>

          {/* ── 右側：方案贈幣 + 充值套餐 ── */}
          <div className="space-y-6">

            {/* 方案贈幣設定 */}
            <div className="bg-slate-800/60 rounded-2xl p-5 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-4 h-4 text-sky-400" />
                <h2 className="text-sm font-semibold text-slate-200">方案贈幣設定</h2>
              </div>
              <p className="text-xs text-slate-500 mb-4">設定各方案訂閱時贈送的天命幣數量</p>

              {plansLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-slate-700/40 rounded-lg animate-pulse" />)}
                </div>
              ) : (plansData ?? []).length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-sm">尚無方案資料</div>
              ) : (
                <div>
                  {(plansData ?? []).map((p) => (
                    <PlanBonusRow
                      key={p.id}
                      planId={p.id}
                      planName={p.name}
                      price={String(p.price)}
                      firstBonus={p.firstSubscriptionBonusCoins ?? 0}
                      renewalBonus={p.monthlyRenewalBonusCoins ?? 0}
                      onSave={(pId, first, renewal) =>
                        updatePlanBonus.mutate({ planId: pId, firstSubscriptionBonusCoins: first, monthlyRenewalBonusCoins: renewal })
                      }
                      saving={updatePlanBonus.isPending}
                      readOnly={readOnly}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* 充值套餐說明 */}
            <div className="bg-slate-800/60 rounded-2xl p-5 border border-slate-700/50">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-violet-400" />
                  <h2 className="text-sm font-semibold text-slate-200">充值套餐定價</h2>
                </div>
                <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  金流串接後啟用
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-4">目前充值功能預留金流串接口，確認金流方案後可正式開放</p>
              <div className="grid grid-cols-2 gap-2">
                {TOPUP_PACKAGES.map((pkg) => (
                  <div key={pkg.id} className="bg-slate-700/40 rounded-xl p-3 border border-slate-700/60">
                    <div className="text-sm font-semibold text-amber-400">{pkg.label}</div>
                    <div className="text-xs text-slate-300 mt-0.5">{pkg.price}</div>
                    {pkg.bonus && (
                      <div className="text-xs text-emerald-400 mt-0.5">{pkg.bonus}</div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-3 p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-xs text-sky-300/80">
                💡 金流串接口已預留於 <code className="bg-slate-700 px-1 rounded">/api/payment/topup</code> 與 <code className="bg-slate-700 px-1 rounded">/api/payment/webhook</code>，確認金流方案後告知即可串接
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
