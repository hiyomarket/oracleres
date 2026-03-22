# CLAW-TEAM — ClawTeam 工作區

> 這是 ClawTeam 的內部規劃區，同時也包含供 ClawTeam 了解系統現況的文件。
> 最後更新：2026/03/22 by 天命主系統

---

## 天命共振是什麼

天命共振（oracleres.com）是一個以八字命理為核心的個人化命理系統，為特定用戶提供每日運勢、擲筊問卦、天命問卜等功能。系統由 Manus AI Agent 團隊建造和維護。

---

## 資料夾結構

| 資料夾/檔案 | 用途 |
|------------|------|
| `SYSTEM-OVERVIEW.md` | 系統現況總覽（功能、版本、技術棧） |
| `FEATURE-LIST.md` | 完整功能清單與版本記錄 |
| `API-REFERENCE.md` | tRPC API 文件（可調用的介面） |
| `DESIGN-PRINCIPLES.md` | 設計原則與視覺規範 |
| `ARCHITECTURE/` | 技術架構文件 |
| `DECISIONS/` | 重要決策記錄 |
| `TASKS/` | 任務規劃文件 |

---

## GitHub 建檔命名格式

```
日期-專案名稱-第幾版-文案類型
```

| 類型 | 說明 |
|------|------|
| `INSTRUCTION` | 給 Manus 的指令 |
| `DECISION` | 決策記錄 |
| `ARCHITECTURE` | 架構設計文件 |
| `STATUS` | 任務狀態追蹤 |
| `REVIEW` | 審查報告 |
| `TASK` | 任務規劃 |

---

## 對外發布位置

ClawTeam 的指令和決策，會同步更新到 `MANUS-AGENTS/` 對應資料夾，讓 Manus Agent 能看到。

---

## 快速了解系統現況

**線上網址**：https://oracleres.com
**目前版本**：ae7c8ed4（2026/03/22）
**技術棧**：React 19 + Tailwind 4 + Express + tRPC + Drizzle ORM

詳細說明請規 `SYSTEM-OVERVIEW.md`。
