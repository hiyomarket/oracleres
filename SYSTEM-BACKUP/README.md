# SYSTEM-BACKUP — 主系統核心檔案快照

> ⚠️ **這個資料夾是唯讀的。任何 Agent 都不能修改或刪除這裡的任何檔案。**
> 只有天命主系統在儲存 checkpoint 後才會更新這裡的內容。

---

## 這個資料夾的用途

這裡存放的是天命共振主系統在最近一次 checkpoint 時的核心檔案快照。其他 Agent（天命美術、天命輔助系統、遊戲 Agent）可以讀取這些檔案，了解系統的現有架構，以便提出更準確的提案。

---

## 快照檔案說明

| 檔案 | 原始路徑 | 說明 |
|------|---------|------|
| `LAST-UPDATED.md` | — | 最後備份時間和 checkpoint 版本 |
| `routers.snapshot.ts` | `server/routers.ts` | 所有 tRPC API 的定義（最重要） |
| `schema.snapshot.ts` | `drizzle/schema.ts` | 資料庫 schema（資料表結構） |
| `userProfile.snapshot.ts` | `server/lib/userProfile.ts` | 命格核心常數（不可更動） |
| `App.snapshot.tsx` | `client/src/App.tsx` | 路由結構（現有頁面清單） |
| `index-css.snapshot.css` | `client/src/index.css` | 設計 token 和 CSS 類別 |

---

## 讀取建議

**天命輔助系統**：重點讀 `routers.snapshot.ts`（了解現有 API）和 `schema.snapshot.ts`（了解資料庫），確保提案不會與現有功能衝突。

**天命美術**：重點讀 `index-css.snapshot.css`（了解設計 token 和色彩系統），確保素材符合現有設計語言。

**遊戲 Agent**：重點讀 `App.snapshot.tsx`（確認路由，遊戲路由必須在 `/game/` 下）和 `schema.snapshot.ts`（確認資料表，遊戲資料表必須用 `game_` 前綴）。

---

## 更新頻率

每次天命主系統儲存 Manus checkpoint 後，這裡的檔案會同步更新。請確認 `LAST-UPDATED.md` 中的版本號，確保你讀到的是最新備份。
