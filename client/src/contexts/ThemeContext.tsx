import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme?: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  switchable = false,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    // 如果已有 oracle_theme 快取，從中判斷深/淺色
    const oracleTheme = localStorage.getItem("oracle_theme");
    if (oracleTheme) {
      return oracleTheme.endsWith("_light") ? "light" : "dark";
    }
    if (switchable) {
      const stored = localStorage.getItem("theme");
      return (stored as Theme) || defaultTheme;
    }
    return defaultTheme;
  });

  useEffect(() => {
    // 注意：ThemeContext 不再直接管理 dark class
    // dark class 由 applyTheme() 統一負責，避免競爭條件
    // ThemeContext 只負責儲存主題狀態供其他元件讀取
    if (switchable) {
      localStorage.setItem("theme", theme);
    }
  }, [theme, switchable]);

  // 監聴 oracle_theme 變化，同步更新 theme state
  useEffect(() => {
    const handleStorageChange = () => {
      const oracleTheme = localStorage.getItem("oracle_theme");
      if (oracleTheme) {
        const newMode = oracleTheme.endsWith("_light") ? "light" : "dark";
        setTheme(newMode);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const toggleTheme = switchable
    ? () => {
        setTheme(prev => (prev === "light" ? "dark" : "light"));
      }
    : undefined;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, switchable }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
