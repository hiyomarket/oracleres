import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { applyTheme, DEFAULT_THEME_ID } from "@/lib/themes";

/**
 * ThemeInitializer
 * 在 App 啟動時從 system_settings 讀取 active_theme，
 * 並動態注入對應的 CSS 變數。
 * 先從 localStorage 快取立即套用（避免閃爍），再從伺服器確認。
 */
export function ThemeInitializer() {
  // 立即從 localStorage 套用快取主題（避免白屏閃爍）
  useEffect(() => {
    const cached = localStorage.getItem("oracle_theme") ?? DEFAULT_THEME_ID;
    applyTheme(cached);
  }, []);

  // 從伺服器讀取最新主題設定
  const { data } = trpc.expert.getSystemSetting.useQuery(
    { key: "active_theme" },
    { staleTime: 5 * 60 * 1000 } // 5 分鐘快取
  );

  useEffect(() => {
    if (data?.settingValue) {
      applyTheme(data.settingValue);
    }
  }, [data]);

  return null;
}
