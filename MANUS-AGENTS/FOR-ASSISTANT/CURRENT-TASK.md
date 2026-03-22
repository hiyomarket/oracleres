# 天命輔助系統 — 目前任務

> 最後更新：2026/03/22 by 天命輔助系統（提案完成）

---

## 目前狀態

**系統版本**：ae7c8ed4（2026/03/22）
**輔助系統狀態**：🟡 提案已提交，等待主系統審核

---

## 已完成的工作

### 提案工作（2026/03/22）

| 提案 ID | 檔案 | 狀態 |
|---------|------|------|
| PROPOSAL-001 | `PROPOSALS/20260322-PROPOSAL-001-性別設定功能.md` | `pending` 等待審核 |
| PROPOSAL-002 | `PROPOSALS/20260322-PROPOSAL-002-功能開發優先序建議.md` | `pending` 等待審核 |

### 初始化學習（2026/03/22）

已依序讀完以下所有文件：

| # | 文件 | 學習重點 |
|---|------|---------|
| 1 | `MANUS-AGENTS/README.md` | 四 Agent 分工、工作流程、素材與提案狀態流程、SYSTEM-BACKUP 唯讀規則 |
| 2 | `FOR-ASSISTANT/README.md` | 輔助系統角色定義：只能提案、不能改程式碼、不能自建網站 |
| 3 | `FOR-ASSISTANT/COLLABORATION-GUIDE.md` | 提案合格標準（7 項）、技術棧限制、設計語言規範、命名規則、狀態流程 |
| 4 | `SYSTEM-BACKUP/LAST-UPDATED.md` | 目前版本 v1.3，Checkpoint ae7c8ed4，2026/03/22 備份 |
| 5 | `SYSTEM-BACKUP/schema.snapshot.ts` | 資料庫結構：users、plans、modules、userSubscriptions、oracleSessions、lotterySessions 等核心資料表 |
| 6 | `SYSTEM-BACKUP/App.snapshot.tsx` | 前端路由：LandingPage（/）、WarRoom（/war-room）、Home/Oracle（/oracle）、Lottery（/lottery）、Calendar（/calendar）、Profile（/profile）等 30+ 頁面 |
| 7 | `SYSTEM-BACKUP/userProfile.snapshot.ts` | 核心命格：蘇祐震，1984/11/26，四柱甲子年乙亥月甲子日己巳時，日主甲木，水木極旺（77%），喜火土 |
| 8 | `CLAW-TEAM/FEATURE-LIST.md` | 已完成功能 v1.3、規劃中功能（日間模式、性別設定、手串記錄、遊戲化） |
| 9 | `FOR-ASSISTANT/INSTRUCTIONS/20260322-天命輔助系統初始化指令-第一版-INSTRUCTION.md` | 初始化完整流程確認 |
| 10 | `CLAW-TEAM/ARCHITECTURE/20260322-GitHub多Agent協作架構-ARCHITECTURE.md` | 多 Agent 協作模型、倉庫資料夾結構、工作流程 |
| 11 | `CLAW-TEAM/DECISIONS/20260322-MultiAgent自動化協作決策-DECISION.md` | 採用 Cron Job 方案（每 60 分鐘巡邏 MANIFEST.json）而非 Webhook |
| 12 | `RESPONSES/20260322-主系統回應輔助系統初始化補充.md` | 主系統確認三個缺口均為真實問題，指派提案任務 |
| 13 | `SYSTEM-BACKUP/routers.snapshot.ts`（重點段落） | 確認 `userProfiles.gender` 欄位已存在，`auth.me`、`userProfile` router 結構，`braceletWear` router 已有後端實作 |

---

## 系統架構摘要（初始化學習成果）

### 技術棧
- **前端**：React 19 + Tailwind 4 + Wouter（路由）+ shadcn/ui
- **後端**：Express 4 + tRPC 11
- **資料庫**：MySQL / TiDB + Drizzle ORM
- **AI**：invokeLLM（內建 Forge API）

### 核心設計語言
- 主色：天命金（`#C9A227`）+ 電青（`#00CED1`）
- 背景：夜間 `#1A1A2A` / 日間 `#E8D8F0`（規劃中）
- 卡片：`.glass-card`（玻璃擬態）
- 文字：`.text-gold-gradient`、`.text-holographic`

### 已完成功能（v1.3）
作戰室、擲筊問卦、天命問卜、命理日曆、命理週報、刷刷樂選號、命格身份證、分享卡、年度統計、娛樂城、專家市場、穿搭/飲食/手串建議

### 規劃中功能（待開發）
日間模式、性別設定、手串佩戴記錄、遊戲化功能（每日任務、成就系統）

---

## 待處理任務

- [ ] 等待主系統審核 PROPOSAL-001（性別設定功能）
- [ ] 等待主系統審核 PROPOSAL-002（功能開發優先序建議）
- [ ] 審核通過後，依主系統指示準備 PROPOSAL-003（日間模式切換）

---

## 備注

1. **SYSTEM-BACKUP 版本差異**：LAST-UPDATED.md 顯示版本 ae7c8ed4（v1.3），但 oracle-resonance 的 Manus Checkpoint 最新為 bb400d90，兩者為不同快照時間點，提案時應以 SYSTEM-BACKUP 為準。
2. **braceletWear 後端已存在**：`routers.snapshot.ts` 中已有 `braceletWear` router 的完整後端（4 個 procedures），但 FEATURE-LIST.md 仍列為「規劃中」。已在 PROPOSAL-002 中標記此觀察，請主系統確認。
3. **工作邊界確認**：「幫主系統想清楚邏輯」= 不需要提案；「幫主系統做一個新東西」= 需要提案。

---

## 重要提醒

在開始任何提案工作前，請先確認：
1. `SYSTEM-BACKUP/LAST-UPDATED.md` — 確認系統版本是否有更新
2. `SYSTEM-BACKUP/routers.snapshot.ts` — 確認現有 API 結構（避免重複建置）
3. `COLLABORATION-GUIDE.md` — 提案格式和 7 項合格標準
