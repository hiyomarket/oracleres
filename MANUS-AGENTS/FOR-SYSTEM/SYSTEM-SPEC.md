# 天命主系統 — 技術規範天書

> **這是天命共振系統的核心技術文件。**
> 所有想要協助這個系統的 Agent，都必須先讀懂這份文件，才能提出合規的提案。
> 最後更新：2026/03/22 | Checkpoint：ae7c8ed4

---

## 一、系統概覽

天命共振（oracleres.com）是一個以八字命理為核心的個人化命理系統，為特定用戶（甲木日主，1990/09/05 生）提供每日運勢、擲筊問卦、天命問卜、刷刷樂選號等功能。

| 項目 | 說明 |
|------|------|
| **線上網址** | https://oracleres.com |
| **目前版本** | ae7c8ed4（2026/03/22） |
| **總測試數** | 414 項全部通過 |
| **程式碼位置** | 天命主系統本地（不在 GitHub） |

---

## 二、技術棧（不可更動）

這個系統使用固定的技術棧。**任何提案都不能引入這個清單以外的框架或套件。**

| 層次 | 技術 | 版本 | 說明 |
|------|------|------|------|
| **前端框架** | React | 19 | 使用 hooks 和 functional components |
| **樣式系統** | Tailwind CSS | 4 | 使用 OKLCH 色彩格式，不用 HSL |
| **UI 元件** | shadcn/ui | 最新 | 從 `@/components/ui/*` 引入 |
| **路由** | Wouter | — | 不用 React Router |
| **API 層** | tRPC | 11 | 所有 API 都是 tRPC procedures |
| **後端框架** | Express | 4 | — |
| **資料庫 ORM** | Drizzle ORM | — | Schema-first，用 `pnpm db:push` 遷移 |
| **資料庫** | MySQL/TiDB | — | 連線字串在環境變數 `DATABASE_URL` |
| **LLM 整合** | invokeLLM | 內建 | 從 `server/_core/llm` 引入，不用 OpenAI SDK |
| **圖片生成** | generateImage | 內建 | 從 `server/_core/imageGeneration` 引入 |
| **檔案儲存** | S3 | 內建 | 從 `server/storage` 引入 `storagePut` |
| **測試框架** | Vitest | — | 測試檔案放在 `server/*.test.ts` |

---

## 三、專案目錄結構

```
oracle-resonance/
├── client/
│   ├── src/
│   │   ├── pages/          ← 頁面元件（每個功能一個檔案）
│   │   ├── components/     ← 共用元件（含 shadcn/ui）
│   │   ├── contexts/       ← React contexts
│   │   ├── hooks/          ← 自定義 hooks
│   │   ├── lib/trpc.ts     ← tRPC 客戶端
│   │   ├── App.tsx         ← 路由設定
│   │   └── index.css       ← 全域樣式 + 設計 token
│   └── index.html
├── server/
│   ├── routers.ts          ← 所有 tRPC procedures（核心）
│   ├── db.ts               ← 資料庫查詢函數
│   ├── lib/                ← 命理算法函數庫
│   │   ├── userProfile.ts  ← 命格核心常數（最重要）
│   │   ├── lunarCalendar.ts
│   │   ├── tenGods.ts
│   │   ├── warRoomEngine.ts
│   │   └── ...
│   └── _core/              ← 框架核心（不要修改）
├── drizzle/
│   └── schema.ts           ← 資料庫 schema（核心）
└── shared/                 ← 前後端共用常數
```

---

## 四、命格核心常數（最重要）

所有命理計算都基於以下固定的命格資料，集中在 `server/lib/userProfile.ts`。**任何提案都不能修改這些核心常數。**

| 項目 | 值 |
|------|-----|
| **日主** | 甲木 |
| **生日** | 1990/09/05 |
| **四柱** | 庚午年 / 庚申月 / 甲子日 / 甲子時 |
| **五行比例** | 木42% / 水35% / 火11% / 土9% / 金4% |
| **用神** | 火 > 土 > 金 |
| **忌神** | 水、木 |
| **財星** | 土（甲木日主，我尅者為財） |
| **生命靈數** | 外在5 / 中間10 / 內在6 / 主要靈魂數5 |

---

## 五、現有功能清單（v2.15+）

| 路由 | 功能 | tRPC Router |
|------|------|-------------|
| `/` | 首頁（未登入）/ 作戰室（已登入） | — |
| `/war-room` | 今日作戰室（核心頁面） | `warRoom` |
| `/oracle` | 擲筊問卦 | `oracle` |
| `/divination` | 天命問卜 | `warRoom.topicAdvice` |
| `/lottery` | 刷刷樂選號 | `lottery` |
| `/calendar` | 命理日曆 | `calendar` |
| `/weekly` | 命理週報 | `weeklyReport` |
| `/stats` | 年度統計 | `oracle.stats` |
| `/profile` | 命格身份證 | 靜態頁面 |
| `/landing` | 首頁（強制顯示） | — |

---

## 六、資料庫 Schema 概覽

目前的資料表（詳細欄位請見 `SYSTEM-BACKUP/schema.snapshot.ts`）：

| 資料表 | 用途 |
|--------|------|
| `users` | 用戶資料（含 role, gender） |
| `oracle_sessions` | 擲筊記錄 |
| `lottery_sessions` | 選號記錄 |
| `lottery_results` | 開獎對照記錄 |
| `scratch_logs` | 刷刷樂購買日誌 |
| `favorite_stores` | 收藏彩券行 |
| `bracelet_wear_logs` | 手串佩戴記錄 |

---

## 七、設計系統規範

完整的設計 token 請見 `SYSTEM-BACKUP/index-css.snapshot.css`。以下是最重要的規則：

**色彩系統**：使用 OKLCH 格式（Tailwind 4 要求），不用 HEX 或 HSL。

**主色調**：
- 金色主色：`oklch(0.72 0.20 45)`（橙金）
- 深藍背景：`oklch(0.07 0.03 222)`
- 玻璃卡片：`oklch(0.16 0.04 215 / 0.7)`

**自定義 CSS 類別**（必須使用，不能重新定義）：
- `.glass-card`：玻璃擬態卡片（含 hover 金光效果）
- `.text-gold-gradient`：金色漸層文字
- `.text-holographic`：全息動效文字
- `.gold-pulse`：金色脈衝發光動效
- `.orb-float`：漂浮動效
- `.oracle-text-gradient`：命理橙金漸層文字
- `.flame-button`：火焰按鈕

**主題**：預設深色主題（`defaultTheme="dark"`），支援淺色主題切換。

---

## 八、tRPC API 規範

所有 API 都在 `server/routers.ts`（或 `server/routers/` 子目錄）。

```typescript
// 公開 API（不需登入）
publicProcedure

// 需要登入的 API
protectedProcedure

// 只有 admin 可用的 API
adminProcedure（需自行加 role 檢查）
```

**重要**：所有 API 都必須有對應的 Vitest 測試，放在 `server/*.test.ts`。

---

## 九、掃描安裝流程

當天命主系統收到 Boss 通知「有新提案或素材待處理」時，執行以下流程：

```
1. 讀 MANUS-AGENTS/FOR-ASSISTANT/PROPOSALS/ 或 FOR-GAME/PROPOSALS/
   → 找到 status: "pending" 的提案文件

2. 評估提案合格性（見下方合格標準）
   → 不合格：在提案文件中回寫 status: "rejected" + 退回原因
   → 合格：繼續

3. 評估技術可行性
   → 確認不會與現有功能衝突
   → 確認不需要引入新的技術棧

4. 執行整合
   → 按照提案文件中的規格實作
   → 完成後在提案文件回寫 status: "integrated" + 完成說明

5. 儲存 checkpoint + 執行 SYSTEM-BACKUP 備份
```

**提案合格標準**：
- 必須使用 `PROPOSALS/PROPOSAL-TEMPLATE.md` 格式
- 必須說明「影響哪些現有檔案」
- 必須說明「新增哪些檔案」
- 必須說明「資料庫是否有異動」
- 如有程式碼，必須符合現有技術棧
- 不能自創新的設計系統或引入新 UI 框架

---

## 十、SYSTEM-BACKUP 備份規則

天命主系統在每次儲存 checkpoint 後，必須執行以下備份：

```bash
# 複製核心檔案到 SYSTEM-BACKUP/
cp server/routers.ts        → SYSTEM-BACKUP/routers.snapshot.ts
cp drizzle/schema.ts        → SYSTEM-BACKUP/schema.snapshot.ts
cp server/lib/userProfile.ts → SYSTEM-BACKUP/userProfile.snapshot.ts
cp client/src/App.tsx       → SYSTEM-BACKUP/App.snapshot.tsx
cp client/src/index.css     → SYSTEM-BACKUP/index-css.snapshot.css

# 更新 LAST-UPDATED.md（記錄備份時間和 checkpoint 版本）
# git push 到 GitHub
```

備份的目的是讓其他 Agent 能讀懂主系統的現況，提出更準確的提案。
