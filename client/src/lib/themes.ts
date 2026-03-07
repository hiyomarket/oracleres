/**
 * 天命共振 - 全站主題色系定義 v2.0
 * 每個主題包含完整的 CSS 變數值（OKLCH 格式）
 * 後台可選擇並儲存至 system_settings，前端啟動時動態套用
 *
 * 修復重點：
 * - 各主題背景色差異更明顯（色相角度差距 > 60°）
 * - 新增 navBg / navBorder 導覽列專用變數
 * - 新增 pageBg 頁面背景（比 background 稍深）
 * - 新增 tooltipBg 圖表 tooltip 背景
 */

export interface ThemeVars {
  // 主色調
  primary: string;
  primaryForeground: string;
  // 背景
  background: string;
  foreground: string;
  // 卡片
  card: string;
  cardForeground: string;
  // 彈出層
  popover: string;
  popoverForeground: string;
  // 次要
  secondary: string;
  secondaryForeground: string;
  // 靜音
  muted: string;
  mutedForeground: string;
  // 強調
  accent: string;
  accentForeground: string;
  // 危險
  destructive: string;
  destructiveForeground: string;
  // 邊框/輸入
  border: string;
  input: string;
  ring: string;
  // 側邊欄
  sidebar: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  sidebarRing: string;
  // 圖表
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
  // 特殊組件色
  oracleBg: string;
  flameButtonGradient: string;
  glassCard: string;
  glassCardBorder: string;
  textGradient: string;
  scrollbarTrack: string;
  scrollbarThumb: string;
  selectionBg: string;
  // 新增：導覽列 / 頁面 / tooltip 專用
  navBg: string;
  navBorder: string;
  pageBg: string;
  tooltipBg: string;
  tooltipBorder: string;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
  emoji: string;
  previewColors: string[]; // 4 preview swatches
  vars: ThemeVars;
}

export const THEMES: ThemeDefinition[] = [
  // ─── 1. 神秘紫羅蘭（預設）────────────────────────────────────────────────
  {
    id: "mystic_violet",
    name: "神秘紫羅蘭",
    description: "深紫 · 薰衣草 · 玫瑰金，靈性而優雅，最適合女性用戶",
    emoji: "💜",
    previewColors: ["#1a0d2e", "#7c3aed", "#c084fc", "#f0abfc"],
    vars: {
      primary: "oklch(0.68 0.22 310)",
      primaryForeground: "oklch(0.98 0.01 310)",
      background: "oklch(0.12 0.05 290)",
      foreground: "oklch(0.93 0.02 310)",
      card: "oklch(0.17 0.06 285)",
      cardForeground: "oklch(0.92 0.02 310)",
      popover: "oklch(0.15 0.05 288)",
      popoverForeground: "oklch(0.92 0.02 310)",
      secondary: "oklch(0.22 0.07 285)",
      secondaryForeground: "oklch(0.88 0.04 310)",
      muted: "oklch(0.20 0.05 285)",
      mutedForeground: "oklch(0.62 0.07 300)",
      accent: "oklch(0.72 0.18 340)",
      accentForeground: "oklch(0.10 0.02 290)",
      destructive: "oklch(0.55 0.22 25)",
      destructiveForeground: "oklch(0.98 0 0)",
      border: "oklch(0.28 0.07 285)",
      input: "oklch(0.22 0.06 285)",
      ring: "oklch(0.68 0.20 310)",
      sidebar: "oklch(0.14 0.06 285)",
      sidebarForeground: "oklch(0.92 0.02 310)",
      sidebarPrimary: "oklch(0.68 0.22 310)",
      sidebarPrimaryForeground: "oklch(0.98 0.01 310)",
      sidebarAccent: "oklch(0.22 0.07 285)",
      sidebarAccentForeground: "oklch(0.92 0.02 310)",
      sidebarBorder: "oklch(0.28 0.07 285)",
      sidebarRing: "oklch(0.68 0.20 310)",
      chart1: "oklch(0.68 0.22 310)",
      chart2: "oklch(0.72 0.18 340)",
      chart3: "oklch(0.60 0.16 270)",
      chart4: "oklch(0.75 0.15 60)",
      chart5: "oklch(0.55 0.12 200)",
      oracleBg: "radial-gradient(ellipse at 30% 20%, oklch(0.25 0.12 290 / 0.9) 0%, oklch(0.16 0.08 285 / 0.95) 40%, oklch(0.10 0.05 290) 100%)",
      flameButtonGradient: "linear-gradient(135deg, oklch(0.75 0.22 320) 0%, oklch(0.65 0.26 300) 50%, oklch(0.70 0.24 310) 100%)",
      glassCard: "oklch(0.18 0.06 285 / 0.75)",
      glassCardBorder: "oklch(0.38 0.10 285 / 0.5)",
      textGradient: "linear-gradient(135deg, oklch(0.88 0.16 60), oklch(0.72 0.22 310), oklch(0.68 0.24 340))",
      scrollbarTrack: "oklch(0.12 0.05 290)",
      scrollbarThumb: "oklch(0.32 0.09 285)",
      selectionBg: "oklch(0.68 0.22 310 / 0.4)",
      navBg: "oklch(0.10 0.05 288 / 0.92)",
      navBorder: "oklch(0.30 0.08 285 / 0.4)",
      pageBg: "oklch(0.09 0.04 290)",
      tooltipBg: "oklch(0.17 0.06 285)",
      tooltipBorder: "oklch(0.32 0.08 285 / 0.6)",
    },
  },
  // ─── 2. 天命深邃（原版）────────────────────────────────────────────────────
  {
    id: "destiny_deep",
    name: "天命深邃",
    description: "深藍 · 墨綠 · 琥珀金，神秘而深沉，原版經典配色",
    emoji: "🌊",
    previewColors: ["#0a1628", "#1a4a5c", "#c8a84b", "#e8d5a3"],
    vars: {
      primary: "oklch(0.72 0.20 45)",
      primaryForeground: "oklch(0.10 0.02 220)",
      background: "oklch(0.11 0.04 222)",
      foreground: "oklch(0.92 0.02 60)",
      card: "oklch(0.15 0.05 218)",
      cardForeground: "oklch(0.90 0.02 60)",
      popover: "oklch(0.14 0.04 220)",
      popoverForeground: "oklch(0.90 0.02 60)",
      secondary: "oklch(0.21 0.06 210)",
      secondaryForeground: "oklch(0.85 0.04 60)",
      muted: "oklch(0.19 0.04 215)",
      mutedForeground: "oklch(0.58 0.04 200)",
      accent: "oklch(0.65 0.20 40)",
      accentForeground: "oklch(0.10 0.02 220)",
      destructive: "oklch(0.55 0.22 25)",
      destructiveForeground: "oklch(0.98 0 0)",
      border: "oklch(0.27 0.05 215)",
      input: "oklch(0.21 0.05 215)",
      ring: "oklch(0.72 0.18 45)",
      sidebar: "oklch(0.13 0.05 220)",
      sidebarForeground: "oklch(0.90 0.02 60)",
      sidebarPrimary: "oklch(0.72 0.20 45)",
      sidebarPrimaryForeground: "oklch(0.10 0.02 220)",
      sidebarAccent: "oklch(0.21 0.06 210)",
      sidebarAccentForeground: "oklch(0.90 0.02 60)",
      sidebarBorder: "oklch(0.27 0.05 215)",
      sidebarRing: "oklch(0.72 0.18 45)",
      chart1: "oklch(0.72 0.20 45)",
      chart2: "oklch(0.55 0.15 200)",
      chart3: "oklch(0.45 0.12 150)",
      chart4: "oklch(0.65 0.20 30)",
      chart5: "oklch(0.50 0.10 270)",
      oracleBg: "radial-gradient(ellipse at 30% 20%, oklch(0.22 0.08 165 / 0.8) 0%, oklch(0.13 0.05 225 / 0.9) 40%, oklch(0.08 0.03 220) 100%)",
      flameButtonGradient: "linear-gradient(135deg, oklch(0.75 0.22 50) 0%, oklch(0.68 0.24 35) 50%, oklch(0.72 0.20 45) 100%)",
      glassCard: "oklch(0.17 0.04 215 / 0.7)",
      glassCardBorder: "oklch(0.36 0.06 215 / 0.5)",
      textGradient: "linear-gradient(135deg, oklch(0.88 0.18 80), oklch(0.72 0.20 45), oklch(0.65 0.22 35))",
      scrollbarTrack: "oklch(0.11 0.04 222)",
      scrollbarThumb: "oklch(0.31 0.06 215)",
      selectionBg: "oklch(0.72 0.20 45 / 0.4)",
      navBg: "oklch(0.08 0.03 220 / 0.92)",
      navBorder: "oklch(0.28 0.05 215 / 0.4)",
      pageBg: "oklch(0.07 0.03 222)",
      tooltipBg: "oklch(0.15 0.05 218)",
      tooltipBorder: "oklch(0.30 0.05 215 / 0.6)",
    },
  },
  // ─── 3. 柔粉晨曦────────────────────────────────────────────────────────────
  {
    id: "rose_dawn",
    name: "柔粉晨曦",
    description: "玫瑰粉 · 奶油白 · 淡金，溫柔浪漫，適合輕盈氛圍",
    emoji: "🌸",
    previewColors: ["#2a0f18", "#9d4e6a", "#f4a7b9", "#fde8ee"],
    vars: {
      primary: "oklch(0.68 0.20 355)",
      primaryForeground: "oklch(0.98 0.01 355)",
      background: "oklch(0.13 0.04 355)",
      foreground: "oklch(0.94 0.02 355)",
      card: "oklch(0.18 0.05 350)",
      cardForeground: "oklch(0.93 0.02 355)",
      popover: "oklch(0.16 0.04 352)",
      popoverForeground: "oklch(0.93 0.02 355)",
      secondary: "oklch(0.24 0.06 350)",
      secondaryForeground: "oklch(0.90 0.04 355)",
      muted: "oklch(0.21 0.04 350)",
      mutedForeground: "oklch(0.63 0.06 345)",
      accent: "oklch(0.78 0.16 60)",
      accentForeground: "oklch(0.10 0.02 355)",
      destructive: "oklch(0.55 0.22 25)",
      destructiveForeground: "oklch(0.98 0 0)",
      border: "oklch(0.30 0.07 350)",
      input: "oklch(0.23 0.05 350)",
      ring: "oklch(0.68 0.18 355)",
      sidebar: "oklch(0.15 0.05 350)",
      sidebarForeground: "oklch(0.93 0.02 355)",
      sidebarPrimary: "oklch(0.68 0.20 355)",
      sidebarPrimaryForeground: "oklch(0.98 0.01 355)",
      sidebarAccent: "oklch(0.24 0.06 350)",
      sidebarAccentForeground: "oklch(0.93 0.02 355)",
      sidebarBorder: "oklch(0.30 0.07 350)",
      sidebarRing: "oklch(0.68 0.18 355)",
      chart1: "oklch(0.68 0.20 355)",
      chart2: "oklch(0.78 0.16 60)",
      chart3: "oklch(0.65 0.16 320)",
      chart4: "oklch(0.70 0.14 200)",
      chart5: "oklch(0.60 0.12 270)",
      oracleBg: "radial-gradient(ellipse at 30% 20%, oklch(0.28 0.10 350 / 0.85) 0%, oklch(0.18 0.07 355 / 0.92) 40%, oklch(0.11 0.04 355) 100%)",
      flameButtonGradient: "linear-gradient(135deg, oklch(0.78 0.20 10) 0%, oklch(0.68 0.22 355) 50%, oklch(0.72 0.18 345) 100%)",
      glassCard: "oklch(0.20 0.05 350 / 0.75)",
      glassCardBorder: "oklch(0.42 0.09 350 / 0.5)",
      textGradient: "linear-gradient(135deg, oklch(0.90 0.16 60), oklch(0.75 0.20 355), oklch(0.70 0.22 340))",
      scrollbarTrack: "oklch(0.13 0.04 355)",
      scrollbarThumb: "oklch(0.34 0.09 350)",
      selectionBg: "oklch(0.68 0.20 355 / 0.4)",
      navBg: "oklch(0.11 0.04 355 / 0.92)",
      navBorder: "oklch(0.32 0.08 350 / 0.4)",
      pageBg: "oklch(0.10 0.04 355)",
      tooltipBg: "oklch(0.18 0.05 350)",
      tooltipBorder: "oklch(0.35 0.08 350 / 0.6)",
    },
  },
  // ─── 4. 神秘月夜────────────────────────────────────────────────────────────
  {
    id: "midnight_moon",
    name: "神秘月夜",
    description: "深靛 · 星空紫 · 月光銀，神秘而浪漫，充滿靈性感",
    emoji: "🌙",
    previewColors: ["#0d0d1f", "#2d1b69", "#7c6bc4", "#c8c4e8"],
    vars: {
      primary: "oklch(0.65 0.22 270)",
      primaryForeground: "oklch(0.98 0.01 270)",
      background: "oklch(0.10 0.05 265)",
      foreground: "oklch(0.94 0.02 280)",
      card: "oklch(0.15 0.06 260)",
      cardForeground: "oklch(0.93 0.02 280)",
      popover: "oklch(0.13 0.05 262)",
      popoverForeground: "oklch(0.93 0.02 280)",
      secondary: "oklch(0.21 0.07 260)",
      secondaryForeground: "oklch(0.90 0.04 280)",
      muted: "oklch(0.19 0.05 260)",
      mutedForeground: "oklch(0.60 0.07 270)",
      accent: "oklch(0.72 0.16 200)",
      accentForeground: "oklch(0.10 0.02 265)",
      destructive: "oklch(0.55 0.22 25)",
      destructiveForeground: "oklch(0.98 0 0)",
      border: "oklch(0.27 0.07 260)",
      input: "oklch(0.21 0.06 260)",
      ring: "oklch(0.65 0.20 270)",
      sidebar: "oklch(0.12 0.06 260)",
      sidebarForeground: "oklch(0.93 0.02 280)",
      sidebarPrimary: "oklch(0.65 0.22 270)",
      sidebarPrimaryForeground: "oklch(0.98 0.01 270)",
      sidebarAccent: "oklch(0.21 0.07 260)",
      sidebarAccentForeground: "oklch(0.93 0.02 280)",
      sidebarBorder: "oklch(0.27 0.07 260)",
      sidebarRing: "oklch(0.65 0.20 270)",
      chart1: "oklch(0.65 0.22 270)",
      chart2: "oklch(0.72 0.16 200)",
      chart3: "oklch(0.62 0.18 310)",
      chart4: "oklch(0.78 0.14 60)",
      chart5: "oklch(0.55 0.12 150)",
      oracleBg: "radial-gradient(ellipse at 30% 20%, oklch(0.24 0.12 265 / 0.85) 0%, oklch(0.15 0.08 260 / 0.92) 40%, oklch(0.09 0.05 265) 100%)",
      flameButtonGradient: "linear-gradient(135deg, oklch(0.72 0.22 280) 0%, oklch(0.62 0.26 260) 50%, oklch(0.68 0.24 270) 100%)",
      glassCard: "oklch(0.17 0.06 260 / 0.75)",
      glassCardBorder: "oklch(0.38 0.10 260 / 0.5)",
      textGradient: "linear-gradient(135deg, oklch(0.90 0.12 280), oklch(0.75 0.22 270), oklch(0.68 0.24 300))",
      scrollbarTrack: "oklch(0.10 0.05 265)",
      scrollbarThumb: "oklch(0.30 0.09 260)",
      selectionBg: "oklch(0.65 0.22 270 / 0.4)",
      navBg: "oklch(0.08 0.04 265 / 0.92)",
      navBorder: "oklch(0.28 0.08 260 / 0.4)",
      pageBg: "oklch(0.07 0.04 265)",
      tooltipBg: "oklch(0.15 0.06 260)",
      tooltipBorder: "oklch(0.32 0.08 260 / 0.6)",
    },
  },
  // ─── 5. 珊瑚暖陽────────────────────────────────────────────────────────────
  {
    id: "coral_sun",
    name: "珊瑚暖陽",
    description: "珊瑚橙 · 桃粉 · 暖金，活力溫暖，充滿正能量",
    emoji: "🌺",
    previewColors: ["#2a0d08", "#c4522a", "#f4a07a", "#fde8d8"],
    vars: {
      primary: "oklch(0.68 0.24 35)",
      primaryForeground: "oklch(0.98 0.01 35)",
      background: "oklch(0.12 0.05 30)",
      foreground: "oklch(0.94 0.02 40)",
      card: "oklch(0.17 0.06 28)",
      cardForeground: "oklch(0.93 0.02 40)",
      popover: "oklch(0.15 0.05 30)",
      popoverForeground: "oklch(0.93 0.02 40)",
      secondary: "oklch(0.23 0.07 28)",
      secondaryForeground: "oklch(0.90 0.04 40)",
      muted: "oklch(0.20 0.05 28)",
      mutedForeground: "oklch(0.62 0.07 35)",
      accent: "oklch(0.78 0.18 60)",
      accentForeground: "oklch(0.10 0.02 30)",
      destructive: "oklch(0.55 0.22 25)",
      destructiveForeground: "oklch(0.98 0 0)",
      border: "oklch(0.28 0.07 28)",
      input: "oklch(0.22 0.06 28)",
      ring: "oklch(0.68 0.22 35)",
      sidebar: "oklch(0.14 0.06 28)",
      sidebarForeground: "oklch(0.93 0.02 40)",
      sidebarPrimary: "oklch(0.68 0.24 35)",
      sidebarPrimaryForeground: "oklch(0.98 0.01 35)",
      sidebarAccent: "oklch(0.23 0.07 28)",
      sidebarAccentForeground: "oklch(0.93 0.02 40)",
      sidebarBorder: "oklch(0.28 0.07 28)",
      sidebarRing: "oklch(0.68 0.22 35)",
      chart1: "oklch(0.68 0.24 35)",
      chart2: "oklch(0.78 0.18 60)",
      chart3: "oklch(0.65 0.20 15)",
      chart4: "oklch(0.72 0.16 320)",
      chart5: "oklch(0.55 0.12 200)",
      oracleBg: "radial-gradient(ellipse at 30% 20%, oklch(0.26 0.12 30 / 0.85) 0%, oklch(0.16 0.08 28 / 0.92) 40%, oklch(0.10 0.05 30) 100%)",
      flameButtonGradient: "linear-gradient(135deg, oklch(0.80 0.24 50) 0%, oklch(0.68 0.28 30) 50%, oklch(0.74 0.26 40) 100%)",
      glassCard: "oklch(0.19 0.06 28 / 0.75)",
      glassCardBorder: "oklch(0.40 0.10 28 / 0.5)",
      textGradient: "linear-gradient(135deg, oklch(0.90 0.20 70), oklch(0.75 0.24 35), oklch(0.70 0.26 20))",
      scrollbarTrack: "oklch(0.12 0.05 30)",
      scrollbarThumb: "oklch(0.32 0.09 28)",
      selectionBg: "oklch(0.68 0.24 35 / 0.4)",
      navBg: "oklch(0.10 0.04 30 / 0.92)",
      navBorder: "oklch(0.30 0.08 28 / 0.4)",
      pageBg: "oklch(0.09 0.04 30)",
      tooltipBg: "oklch(0.17 0.06 28)",
      tooltipBorder: "oklch(0.34 0.08 28 / 0.6)",
    },
  },
  // ─── 6. 翡翠靜心────────────────────────────────────────────────────────────
  {
    id: "jade_serenity",
    name: "翡翠靜心",
    description: "深翠綠 · 薄荷 · 象牙白，清新靜謐，適合冥想氛圍",
    emoji: "🍃",
    previewColors: ["#0a1a12", "#1a5c3a", "#4caf7d", "#c8e8d8"],
    vars: {
      primary: "oklch(0.65 0.20 155)",
      primaryForeground: "oklch(0.98 0.01 155)",
      background: "oklch(0.11 0.05 160)",
      foreground: "oklch(0.94 0.02 155)",
      card: "oklch(0.16 0.06 158)",
      cardForeground: "oklch(0.93 0.02 155)",
      popover: "oklch(0.14 0.05 160)",
      popoverForeground: "oklch(0.93 0.02 155)",
      secondary: "oklch(0.22 0.07 158)",
      secondaryForeground: "oklch(0.90 0.04 155)",
      muted: "oklch(0.20 0.05 158)",
      mutedForeground: "oklch(0.60 0.07 155)",
      accent: "oklch(0.75 0.18 75)",
      accentForeground: "oklch(0.10 0.02 160)",
      destructive: "oklch(0.55 0.22 25)",
      destructiveForeground: "oklch(0.98 0 0)",
      border: "oklch(0.28 0.07 158)",
      input: "oklch(0.22 0.06 158)",
      ring: "oklch(0.65 0.18 155)",
      sidebar: "oklch(0.13 0.06 158)",
      sidebarForeground: "oklch(0.93 0.02 155)",
      sidebarPrimary: "oklch(0.65 0.20 155)",
      sidebarPrimaryForeground: "oklch(0.98 0.01 155)",
      sidebarAccent: "oklch(0.22 0.07 158)",
      sidebarAccentForeground: "oklch(0.93 0.02 155)",
      sidebarBorder: "oklch(0.28 0.07 158)",
      sidebarRing: "oklch(0.65 0.18 155)",
      chart1: "oklch(0.65 0.20 155)",
      chart2: "oklch(0.75 0.18 75)",
      chart3: "oklch(0.62 0.16 200)",
      chart4: "oklch(0.72 0.14 310)",
      chart5: "oklch(0.55 0.12 40)",
      oracleBg: "radial-gradient(ellipse at 30% 20%, oklch(0.26 0.12 158 / 0.85) 0%, oklch(0.16 0.08 160 / 0.92) 40%, oklch(0.10 0.05 160) 100%)",
      flameButtonGradient: "linear-gradient(135deg, oklch(0.75 0.20 165) 0%, oklch(0.65 0.24 150) 50%, oklch(0.70 0.22 158) 100%)",
      glassCard: "oklch(0.18 0.06 158 / 0.75)",
      glassCardBorder: "oklch(0.38 0.10 158 / 0.5)",
      textGradient: "linear-gradient(135deg, oklch(0.90 0.16 75), oklch(0.75 0.20 155), oklch(0.68 0.22 170))",
      scrollbarTrack: "oklch(0.11 0.05 160)",
      scrollbarThumb: "oklch(0.32 0.09 158)",
      selectionBg: "oklch(0.65 0.20 155 / 0.4)",
      navBg: "oklch(0.09 0.04 160 / 0.92)",
      navBorder: "oklch(0.30 0.08 158 / 0.4)",
      pageBg: "oklch(0.08 0.04 160)",
      tooltipBg: "oklch(0.16 0.06 158)",
      tooltipBorder: "oklch(0.32 0.08 158 / 0.6)",
    },
  },
];

export const DEFAULT_THEME_ID = "mystic_violet";

export function getThemeById(id: string): ThemeDefinition {
  return THEMES.find(t => t.id === id) ?? THEMES[0];
}

/**
 * 將主題變數注入到 :root CSS 變數
 */
export function applyTheme(themeId: string) {
  const theme = getThemeById(themeId);
  const v = theme.vars;
  const root = document.documentElement;

  root.style.setProperty("--primary", v.primary);
  root.style.setProperty("--primary-foreground", v.primaryForeground);
  root.style.setProperty("--background", v.background);
  root.style.setProperty("--foreground", v.foreground);
  root.style.setProperty("--card", v.card);
  root.style.setProperty("--card-foreground", v.cardForeground);
  root.style.setProperty("--popover", v.popover);
  root.style.setProperty("--popover-foreground", v.popoverForeground);
  root.style.setProperty("--secondary", v.secondary);
  root.style.setProperty("--secondary-foreground", v.secondaryForeground);
  root.style.setProperty("--muted", v.muted);
  root.style.setProperty("--muted-foreground", v.mutedForeground);
  root.style.setProperty("--accent", v.accent);
  root.style.setProperty("--accent-foreground", v.accentForeground);
  root.style.setProperty("--destructive", v.destructive);
  root.style.setProperty("--destructive-foreground", v.destructiveForeground);
  root.style.setProperty("--border", v.border);
  root.style.setProperty("--input", v.input);
  root.style.setProperty("--ring", v.ring);
  root.style.setProperty("--sidebar", v.sidebar);
  root.style.setProperty("--sidebar-foreground", v.sidebarForeground);
  root.style.setProperty("--sidebar-primary", v.sidebarPrimary);
  root.style.setProperty("--sidebar-primary-foreground", v.sidebarPrimaryForeground);
  root.style.setProperty("--sidebar-accent", v.sidebarAccent);
  root.style.setProperty("--sidebar-accent-foreground", v.sidebarAccentForeground);
  root.style.setProperty("--sidebar-border", v.sidebarBorder);
  root.style.setProperty("--sidebar-ring", v.sidebarRing);
  root.style.setProperty("--chart-1", v.chart1);
  root.style.setProperty("--chart-2", v.chart2);
  root.style.setProperty("--chart-3", v.chart3);
  root.style.setProperty("--chart-4", v.chart4);
  root.style.setProperty("--chart-5", v.chart5);

  // 特殊組件 CSS 變數
  root.style.setProperty("--oracle-bg", v.oracleBg);
  root.style.setProperty("--flame-button-gradient", v.flameButtonGradient);
  root.style.setProperty("--glass-card-bg", v.glassCard);
  root.style.setProperty("--glass-card-border", v.glassCardBorder);
  root.style.setProperty("--text-gradient", v.textGradient);
  root.style.setProperty("--scrollbar-track", v.scrollbarTrack);
  root.style.setProperty("--scrollbar-thumb", v.scrollbarThumb);
  root.style.setProperty("--selection-bg", v.selectionBg);

  // 新增：導覽列 / 頁面 / tooltip 專用
  root.style.setProperty("--nav-bg", v.navBg);
  root.style.setProperty("--nav-border", v.navBorder);
  root.style.setProperty("--page-bg", v.pageBg);
  root.style.setProperty("--tooltip-bg", v.tooltipBg);
  root.style.setProperty("--tooltip-border", v.tooltipBorder);

  // 儲存到 localStorage 作為即時快取
  localStorage.setItem("oracle_theme", themeId);
}

/**
 * 從 localStorage 快取初始化主題（App 啟動時使用，避免閃爍）
 * 後端主題設定讀取後再呼叫 applyTheme 覆蓋
 */
export function initThemeFromStorage(): string {
  const stored = localStorage.getItem("oracle_theme");
  const themeId = stored && THEMES.find(t => t.id === stored) ? stored : DEFAULT_THEME_ID;
  applyTheme(themeId);
  return themeId;
}
