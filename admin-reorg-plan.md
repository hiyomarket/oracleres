# Admin Reorganization Plan

## Current State: 25 tabs in GameCMS + 9 tabs in AdminGameTheater = 34 total tabs

## Old tabs to REMOVE (replaced by V2 catalog):
- `monsters` (MonstersTab) → replaced by `catalog-monsters` (MonsterCatalogV2Tab)
- `skills` (SkillsTab) → replaced by `catalog-skills` (SkillCatalogV2Tab)
- `achievements` (AchievementsTab) → replaced by `catalog-achievements` (AchievementCatalogTab)
- `catalog-monster-skills` (MonsterSkillCatalogTab) → merged into unified skills

## New Category Structure (using nested Tabs):

### 📚 圖鑑管理 (Catalog)
- catalog-monsters → 🐉 魔物建製
- catalog-items → 🎒 道具圖鑑
- catalog-equipment → ⚔️ 裝備圖鑑
- catalog-skills → ✨ 統一技能
- catalog-achievements → 🏆 成就系統
- pet-catalog → 🐾 寵物圖鑑
- catalog-stats → 📊 圖鑑統計

### 🏪 商店管理 (Shop)
- inv-items → 🎒 遊戲道具
- virtual-shop → 🌀 虛界商店
- spirit-shop → 👻 靈相商店
- hidden-shop → 🔮 密店商品池
- items → 👗 紙娃娃商城
- shop (from theater) → 🏪 商店管理

### 🤖 AI 工具 (AI)
- ai-tools → 🤖 AI 工具
- pet-ai → 🧬 寵物 AI
- ai-shop-layout → 🏪 AI 商店佈局

### ⚔️ 戰鬥與平衡 (Battle)
- balance → ⚖️ 數值平衡
- value-engine → 💎 價值引擎
- roaming-boss → 👹 Boss 管理
- combat-sim → ⚔️ 戰鬥模擬

### 🌍 世界管理 (World) - from Theater
- agents → 👤 角色管理
- configs → ⚙️ 全域參數
- tick → ⚡ Tick 引擎
- engine → 🌟 引擎調控
- world → 🌍 世界事件
- rogue → 🎲 奇遇事件

### 📢 系統管理 (System)
- broadcast → 📢 全服廣播
- game-guide → 📖 遊戲指南
- quest-skills → 🌟 天命考核
- reset → 🔴 世界重置
