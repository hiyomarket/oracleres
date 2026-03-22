# 遊戲功能提案：靈相換裝系統

> **使用說明**：本提案為天命共振遊戲化模組的第一階段實作，專注於「靈相世界」的紙娃娃換裝與每日穿搭任務。

---

## 提案基本資訊

| 欄位 | 內容 |
|------|------|
| **提案編號** | PROPOSAL-20260323-GAME-靈相換裝系統 |
| **提案日期** | 2026/03/23 |
| **提案者** | 遊戲 Agent |
| **狀態** | `pending` |
| **優先級** | 🔴 高 |

---

## 遊戲功能說明 [必填]

### 功能名稱
靈相換裝系統（Avatar Wardrobe System）

### 功能描述
本系統為「靈相世界」的核心功能，提供用戶一個 2D 紙娃娃（Avatar）展示與換裝的空間。系統採用 Pop Mart 盲盒公仔風格，支援 7 大圖層（素體、髮型、上衣、下衣、鞋子、飾品、背景）的絕對定位疊加。

用戶可以在此介面中，使用商城購買或任務獲得的虛擬服裝部件為角色換裝。這是整個遊戲化模組中「美與展示」的變現核心，也是連結命理系統的關鍵橋樑。

### 命理連結說明 [必填]
本系統透過「每日穿搭任務」與命理系統深度連結。系統會根據主系統的命理引擎（`wuxingEngine.ts`）給出「今日五行建議」。用戶完成換裝後，系統會計算其服裝五行屬性與今日建議的契合度，得出 **Aura Score（天命氣場分數）**。

Aura Score 將決定用戶當日能獲得何種等級的「來自靈相的祝福」（如：今日採集量+1、全屬性+10%），以此牽引用戶每日登入並參與互動。

### 用戶遊玩流程
1. 用戶點擊主選單進入 `/game/avatar`（靈相空間）。
2. 畫面中央顯示用戶當前的 2D 角色（由多個透明 PNG 圖層疊加而成）。
3. 畫面上方顯示「今日五行建議」（例如：今日水旺，建議穿搭木/火屬性）。
4. 用戶開啟下方衣櫃面板，選擇不同五行屬性的服裝部件進行換裝。
5. 點擊「確認穿搭」按鈕，系統計算並彈出 Aura Score 結算畫面。
6. 根據分數，發放對應的「祝福」Buff，並將狀態記錄於資料庫。

---

## 技術規格 [必填]

### 遊戲路由
```
/game/avatar
```

### 影響的現有檔案
| 檔案路徑 | 修改內容說明 |
|----------|-------------|
| `client/src/App.tsx` | 新增 `/game/avatar` 路由，並加入導覽列入口 |
| `server/routers/appRouter.ts` | 註冊新的 `gameAvatarRouter` |

### 新增的檔案
| 檔案路徑 | 用途說明 |
|----------|---------|
| `client/src/pages/game/AvatarRoom.tsx` | 靈相空間主頁面（包含角色展示與換裝介面） |
| `client/src/components/game/AvatarRenderer.tsx` | 負責 7 大圖層絕對定位疊加的渲染元件 |
| `server/routers/gameAvatar.ts` | 處理換裝、讀取衣櫃、計算 Aura Score 的 tRPC 路由 |

### 資料庫異動 [必填]
> 依據 2026-03-23 技術決策，獨立建立 `game_wardrobe`，不擴充現有 `wardrobe_items`。

```typescript
import { mysqlTable, int, varchar, text, tinyint, timestamp } from 'drizzle-orm/mysql-core';

// 遊戲虛擬服裝庫
export const gameWardrobe = mysqlTable('game_wardrobe', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull(),
  itemId: int('item_id').notNull(),          // 對應商品 ID
  layer: varchar('layer', { length: 20 }).notNull(),  // body/hair/top/bottom/shoes/accessory/background
  imageUrl: text('image_url').notNull(),     // PNG 透明圖層 URL
  wuxing: varchar('wuxing', { length: 10 }).notNull(), // 五行屬性 (wood/fire/earth/metal/water)
  rarity: varchar('rarity', { length: 10 }).notNull(), // common/rare/epic/legendary
  isEquipped: tinyint('is_equipped').default(0),       // 1: 裝備中, 0: 未裝備
  acquiredAt: timestamp('acquired_at').defaultNow(),
});

// 每日穿搭紀錄與 Aura Score
export const gameDailyAura = mysqlTable('game_daily_aura', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull(),
  recordDate: varchar('record_date', { length: 10 }).notNull(), // YYYY-MM-DD
  score: int('score').notNull(),
  blessingLevel: varchar('blessing_level', { length: 20 }), // none/normal/good/destiny
  createdAt: timestamp('created_at').defaultNow(),
});
```

### 新的 tRPC Procedures
```typescript
gameAvatar: {
  // 取得用戶當前裝備中的所有部件
  getEquipped: protectedProcedure.query(...),
  
  // 取得用戶擁有的所有虛擬服裝
  getInventory: protectedProcedure.query(...),
  
  // 儲存換裝設定
  saveOutfit: protectedProcedure.input(z.object({
    equippedIds: z.array(z.number())
  })).mutation(...),
  
  // 提交每日穿搭並計算 Aura Score
  submitDailyAura: protectedProcedure.mutation(...)
}
```

---

## UI 設計說明 [必填]

### 版面配置
```text
┌─────────────────────────────────────────┐
│ [返回]  靈相空間 (自宅)         [商城]  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │      今日建議：宜 木、火 屬性     │  │
│  └───────────────────────────────────┘  │
│                                         │
│             [ 角色展示區 ]              │
│             (7層PNG疊加渲染)            │
│                                         │
│                                         │
│ ─────────────────────────────────────── │
│ [髮型] [上衣] [下衣] [鞋子] [飾品] [背景]│
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐      │
│ │圖示│ │圖示│ │圖示│ │圖示│ │圖示│      │
│ └────┘ └────┘ └────┘ └────┘ └────┘      │
│                                         │
│           [ 確認穿搭並結算 ]            │
└─────────────────────────────────────────┘
```

### 命理視覺元素
- **五行標籤**：衣櫃中的每個服裝部件，右上角需帶有對應的五行顏色圓點（木綠、火紅、土黃、金白、水黑）。
- **Aura 結算特效**：結算時，若分數達標，背景會根據當日主導的五行屬性，播放對應顏色的粒子特效（如火屬性為紅色光暈）。

---

## 衝突檢查 [必填]

### 與現有功能的關係
- **完全獨立**：本系統所有路由與資料表皆為全新建立（`game_` 前綴），不會干擾現有的 `/wardrobe`（真實衣櫥）或 `/oracle`（擲筊）功能。
- **邏輯共用**：Aura Score 的計算將直接 import 主系統現有的 `wuxingEngine.ts`，確保五行生剋邏輯與全站一致。

### 效能影響評估
- **前端渲染**：採用 7 張透明 PNG 絕對定位疊加，不使用 Canvas 或 WebGL，對瀏覽器記憶體與 CPU 負擔極小，不會影響現有頁面的流暢度。
- **圖片載入**：圖片將存放於 S3 並透過 CDN 傳輸，建議前端實作圖片預載（Preload）機制，避免換裝時出現閃爍。

---

## 審核結果（由天命主系統填寫）

**狀態**：[待填寫]
**審核時間**：[待填寫]
**審核意見**：[待填寫]
