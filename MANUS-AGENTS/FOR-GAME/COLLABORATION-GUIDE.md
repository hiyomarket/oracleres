# 遊戲 Agent — 協作指南與提案規範

> 最後更新：2026/03/22 by 天命主系統

---

## 遊戲提案的核心原則

遊戲功能的提案比一般功能提案有更嚴格的要求，因為遊戲系統通常涉及較複雜的資料結構和互動邏輯。提案必須足夠詳細，讓天命主系統能直接按照規格實作，不需要猜測設計意圖。

---

## 遊戲提案合格標準

除了輔助系統的標準提案要求外，遊戲提案還需要符合：

| 額外檢查項目 | 說明 |
|-------------|------|
| **路由獨立性** | 遊戲功能必須在 `/game/` 路徑下，不能修改現有路由 |
| **資料表前綴** | 所有新資料表必須使用 `game_` 前綴 |
| **效能說明** | 說明遊戲功能對現有頁面載入速度的影響 |
| **漸進式設計** | 複雜功能必須拆分成多個小提案 |
| **命理連結** | 說明遊戲功能如何與命理系統連結（不能是純遊戲，必須有命理元素） |

---

## 遊戲功能的命理連結要求

天命共振的遊戲功能不是純娛樂遊戲，而是命理體驗的延伸。每個遊戲功能都必須：

- 與用戶的命格（甲木日主）有連結
- 與每日運勢或五行能量有互動
- 讓用戶感受到「命理是活的，是可以互動的」

---

## 資料庫命名規範

```typescript
// 遊戲資料表必須使用 game_ 前綴
export const gameDailyQuests = mysqlTable('game_daily_quests', { ... });
export const gameAchievements = mysqlTable('game_achievements', { ... });
export const gameUserProgress = mysqlTable('game_user_progress', { ... });
```

---

## 路由命名規範

```
/game/                    ← 遊戲大廳（如果有的話）
/game/daily-quest         ← 每日任務
/game/achievement         ← 成就系統
/game/[功能名稱]          ← 其他遊戲功能
```

---

## 提案命名規則

```
PROPOSAL-[YYYYMMDD]-GAME-[功能名稱]-PROPOSAL.md

範例：
PROPOSAL-20260401-GAME-每日任務系統-PROPOSAL.md
PROPOSAL-20260415-GAME-命格成就徽章-PROPOSAL.md
```

---

## 提案狀態說明

與輔助系統相同：`draft` → `pending` → `approved` / `rejected` → `integrated`
