# 天命共振 — tRPC API 參考文件

> 最後更新：2026/03/22 | Checkpoint：ae7c8ed4
> 這份文件列出目前系統的主要 tRPC API，供 ClawTeam 了解可調用的介面。

---

## API 使用說明

天命共振使用 tRPC 11 作為 API 層。所有 API 都在 `/api/trpc` 路徑下。

**前端調用方式**：
```typescript
// 查詢
const { data } = trpc.warRoom.dailyReport.useQuery();

// 變更
const mutation = trpc.oracle.cast.useMutation();
```

---

## 認證相關（`auth`）

| Procedure | 類型 | 說明 |
|-----------|------|------|
| `auth.me` | query | 取得目前登入用戶資料 |
| `auth.logout` | mutation | 登出 |

---

## 作戰室（`warRoom`）

| Procedure | 類型 | 說明 |
|-----------|------|------|
| `warRoom.dailyReport` | query | 取得今日完整運勢報告（含塔羅牌、五行能量、宜忌） |
| `warRoom.topicAdvice` | mutation | 天命問卜（輸入主題，回傳 AI 分析） |
| `warRoom.weeklyReport` | query | 取得本週運勢報告 |

### `warRoom.dailyReport` 回傳結構

```typescript
{
  date: string,           // 今日日期
  lunarDate: string,      // 農曆日期
  dayPillar: string,      // 日柱（例：甲子）
  tarot: {
    cardNumber: number,   // 塔羅牌號碼（0-21）
    name: string,         // 塔羅牌名稱
    keywords: string[],   // 關鍵字
    energy: string,       // 能量說明
    advice: string,       // 今日建議
  },
  fiveElements: {
    wood: number,         // 木的能量值（0-100）
    fire: number,
    earth: number,
    metal: number,
    water: number,
  },
  dayRating: number,      // 今日評分（1-5）
  auspicious: string[],   // 今日宜
  inauspicious: string[], // 今日忌
  aiReport: string,       // AI 生成的今日運勢報告
}
```

### `warRoom.topicAdvice` 輸入/回傳

```typescript
// 輸入
{
  topic: string,          // 問卜主題（例：感情、事業）
  question: string,       // 具體問題
}

// 回傳
{
  advice: string,         // AI 分析結果
  context: {
    tarotCard: string,    // 流日塔羅牌名稱
    tarotCardNumber: number, // 流日塔羅牌號碼
    dayPillar: string,    // 今日日柱
    dominantElement: string, // 今日主導五行
  }
}
```

---

## 擲筊（`oracle`）

| Procedure | 類型 | 說明 |
|-----------|------|------|
| `oracle.cast` | mutation | 執行擲筊（輸入問題，回傳結果） |
| `oracle.history` | query | 取得擲筊歷史記錄 |
| `oracle.stats` | query | 取得擲筊統計數據 |

### `oracle.cast` 輸入/回傳

```typescript
// 輸入
{
  question: string,       // 問題
}

// 回傳
{
  result: 'sheng' | 'yin' | 'xiao', // 聖筊/陰筊/笑筊
  interpretation: string, // AI 解析
  advice: string,         // 建議
}
```

---

## 選號（`lottery`）

| Procedure | 類型 | 說明 |
|-----------|------|------|
| `lottery.generate` | mutation | 生成幸運號碼 |
| `lottery.history` | query | 取得選號歷史 |
| `lottery.recordResult` | mutation | 記錄開獎結果 |

---

## 系統（`system`）

| Procedure | 類型 | 說明 |
|-----------|------|------|
| `system.notifyOwner` | mutation | 發送通知給系統擁有者 |

---

## 注意事項

1. 所有 `protectedProcedure` 都需要登入才能調用
2. 目前沒有公開的 REST API，所有介面都是 tRPC
3. 詳細的完整 API 定義請見 `SYSTEM-BACKUP/routers.snapshot.ts`
