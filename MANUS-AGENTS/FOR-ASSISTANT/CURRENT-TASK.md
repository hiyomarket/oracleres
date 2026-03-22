# 天命輔助系統 — 目前任務

> 最後更新：2026/03/22 by 天命輔助系統（初始化完成）

---

## 目前狀態

**系統版本**：ae7c8ed4（2026/03/22）
**輔助系統狀態**：🟢 初始化完成，已了解系統架構，待 Boss 分配任務

---

## 已完成的工作

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

目前無待處理任務。等待 Boss 分配功能規劃任務。

---

## 備注（初始化過程中的觀察）

1. **SYSTEM-BACKUP 版本差異**：LAST-UPDATED.md 顯示版本 ae7c8ed4（v1.3），但 oracle-resonance 的 Manus Checkpoint 最新為 bb400d90，兩者為不同快照時間點，提案時應以 SYSTEM-BACKUP 為準。
2. **功能豐富度**：系統已相當完整（30+ 頁面），輔助系統的提案應聚焦在「規劃中功能」或「現有功能的體驗優化」，避免重複建置。
3. **命格個人化**：所有功能均以蘇祐震的甲木命格為核心計算基礎，提案時需考慮與 `userProfile.snapshot.ts` 的整合。

---

## 重要提醒

在開始任何提案工作前，請先確認：
1. `SYSTEM-BACKUP/LAST-UPDATED.md` — 確認系統版本是否有更新
2. `SYSTEM-BACKUP/routers.snapshot.ts` — 確認現有 API 結構（避免重複建置）
3. `COLLABORATION-GUIDE.md` — 提案格式和 7 項合格標準
