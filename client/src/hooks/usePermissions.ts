/**
 * usePermissions.ts
 * 前端功能權限 hook
 * 
 * 使用方式：
 *   const { hasFeature, isAdmin, isLoading } = usePermissions();
 *   if (!hasFeature('lottery')) return <FeatureLockedCard feature="lottery" />;
 */
import { useMemo } from "react";
import { trpc } from "@/lib/trpc";

export type FeatureId =
  | "oracle"
  | "lottery"
  | "calendar"
  | "warroom"
  | "warroom_divination"
  | "warroom_outfit"
  | "warroom_wealth"
  | "warroom_dietary"
  | "weekly"
  | "stats"
  | "profile";

export const FEATURE_LABELS: Record<FeatureId, string> = {
  oracle:             "擲筊",
  lottery:            "選號",
  calendar:           "日曆",
  warroom:            "作戰室",
  warroom_divination: "天命問掛",
  warroom_outfit:     "穿搭手串",
  warroom_wealth:     "財運羅盤",
  warroom_dietary:    "飲食建議",
  weekly:             "週報",
  stats:              "統計",
  profile:            "命格資料",
};

export function usePermissions() {
  const { data, isLoading } = trpc.permissions.myFeatures.useQuery(undefined, {
    staleTime: 30000,
    retry: 1,
  });

  const hasFeature = useMemo(() => {
    return (feature: FeatureId): boolean => {
      if (!data) return false;
      if (data.isAdmin) return true;
      return data.features.includes(feature);
    };
  }, [data]);

  return {
    hasFeature,
    isAdmin: data?.isAdmin ?? false,
    features: data?.features ?? [],
    isLoading,
  };
}
