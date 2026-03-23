# 遊戲功能提案：遊戲內容管理後台 (Game CMS)

> **使用說明**：本提案為天命共振遊戲化模組的基礎建設擴充，旨在建立一套可視化的後台管理系統，讓營運人員（Boss）能手動新增、修改遊戲內的各項數據（怪物、道具、技能等），而無需依賴工程師或 Agent 寫程式。

---

## 提案基本資訊

| 欄位 | 內容 |
|------|------|
| **提案編號** | PROPOSAL-20260323-GAME-內容管理後台CMS |
| **提案日期** | 2026/03/23 |
| **提案者** | 遊戲 Agent |
| **狀態** | `pending` |
| **優先級** | 🔴 高（確保遊戲內容可持續擴充的關鍵） |

---

## 遊戲功能說明 [必填]

### 功能名稱
遊戲內容管理後台 (Game Content Management System)

### 功能描述
先提出我的看法：目前我們的遊戲內容（例如 120 件初始服裝）是透過 Seed Script 寫死進資料庫的。如果未來 Boss 想要新增一隻怪物、一把武器，或是調整某個技能的傷害倍率，都必須發指令給主系統去改程式碼或跑 SQL，這非常沒有效率，也不符合長遠營運的需求。

再來執行你的提案：本提案將建立一個專屬的「遊戲內容管理後台（Game CMS）」。這是一個只有管理員權限才能進入的網頁介面，裡面包含多個資料表的 CRUD（新增/讀取/更新/刪除）功能。Boss 可以直接在介面上填寫表單，上傳圖片，就能即時把新怪物或新道具發布到遊戲中。

這是一個**高衝擊目標**，它將徹底解放內容生產的瓶頸，讓遊戲世界具備無限擴充的可能。

### 支援管理的內容類型 (v1.0)
1. **怪物/魔物圖鑑 (`game_monsters`)**：設定怪物名稱、五行屬性、HP/攻擊力數值、掉落物機率、立繪圖片。
2. **技能庫 (`game_skills`)**：設定技能名稱、消耗 MP、傷害倍率、五行屬性、特效說明。
3. **道具與裝備 (`game_items`)**：擴充現有的商城物品表，加入虛相世界的武器、防具、消耗品（如神行符）。
4. **地圖節點 (`game_map_nodes`)**：設定 LBS 地圖上的特殊打卡點、對應五行與觸發事件。
5. **採集物圖鑑 (`game_gatherables`)**：設定地圖上可採集的資源（如火晶石、靈草）及其五行屬性。
6. **隨機任務庫 (`game_random_quests`)**：設定地圖上隨機觸發的 NPC 任務文本、條件與獎勵。
7. **流浪商人商品池 (`game_merchant_pool`)**：設定流浪商人可能販售的稀有物品與靈石價格。

---

## 技術規格 [必填]

### 遊戲路由
- 新增後台路由：`/admin/game`（需驗證管理員權限）

### 影響的現有檔案
| 檔案路徑 | 修改內容說明 |
|----------|-------------|
| `client/src/App.tsx` | 註冊 `/admin/game/*` 相關路由 |
| `server/routers/_app.ts` | 註冊 `gameAdmin` tRPC router |

### 新增的檔案
| 檔案路徑 | 用途說明 |
|----------|---------|
| `server/routers/gameAdmin.ts` | 處理所有 CMS 相關的 CRUD API |
| `client/src/pages/admin/GameCMS.tsx` | 後台主儀表板 |
| `client/src/pages/admin/MonsterEditor.tsx` | 怪物編輯器頁面 |
| `client/src/pages/admin/SkillEditor.tsx` | 技能編輯器頁面 |

### 資料庫異動 [必填]
需建立支撐虛相世界的核心資料表。

```typescript
import { mysqlTable, int, varchar, text, float, tinyint } from 'drizzle-orm/mysql-core';

// 1. 怪物/魔物表
export const gameMonsters = mysqlTable('game_monsters', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 100 }).notNull(),
  wuxing: varchar('wuxing', { length: 10 }).notNull(), // 木火土金水
  baseHp: int('base_hp').notNull(),
  baseAttack: int('base_attack').notNull(),
  baseDefense: int('base_defense').notNull(),
  baseSpeed: int('base_speed').notNull(),
  imageUrl: text('image_url').notNull(), // 關聯美術 TASK-006
  catchRate: float('catch_rate').notNull().default(0.1), // 捕捉機率
  isActive: tinyint('is_active').default(1),
});

// 2. 技能表
export const gameSkills = mysqlTable('game_skills', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  wuxing: varchar('wuxing', { length: 10 }).notNull(),
  mpCost: int('mp_cost').notNull(),
  damageMultiplier: float('damage_multiplier').notNull(), // 傷害倍率
  skillType: varchar('skill_type', { length: 20 }).notNull(), // 'attack', 'heal', 'buff'
});

// 3. 地圖節點表
export const gameMapNodes = mysqlTable('game_map_nodes', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 100 }).notNull(),
  lat: float('lat').notNull(),
  lng: float('lng').notNull(),
  nodeType: varchar('node_type', { length: 50 }).notNull(), // 'forest', 'water', 'market'
  wuxing: varchar('wuxing', { length: 10 }).notNull(),
});

// 4. 採集物圖鑑表
export const gameGatherables = mysqlTable('game_gatherables', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 100 }).notNull(),
  wuxing: varchar('wuxing', { length: 10 }).notNull(),
  rarity: varchar('rarity', { length: 20 }).notNull(), // 'common', 'rare', 'epic'
  spawnRate: float('spawn_rate').notNull().default(0.5),
});

// 5. 隨機任務庫
export const gameRandomQuests = mysqlTable('game_random_quests', {
  id: int('id').primaryKey().autoincrement(),
  title: varchar('title', { length: 100 }).notNull(),
  description: text('description').notNull(),
  requiredWuxing: varchar('required_wuxing', { length: 10 }), // 觸發此任務需要的流日五行
  rewardType: varchar('reward_type', { length: 50 }).notNull(), // 'stones', 'aura', 'item'
  rewardAmount: int('reward_amount').notNull(),
});

// 6. 流浪商人商品池
export const gameMerchantPool = mysqlTable('game_merchant_pool', {
  id: int('id').primaryKey().autoincrement(),
  itemId: int('item_id').notNull(), // 關聯 game_items
  priceStones: int('price_stones').notNull(), // 靈石價格
  appearanceRate: float('appearance_rate').notNull().default(0.1), // 出現在商人清單的機率
});
```

---

## UI 設計說明 [必填]

### 版面配置 (以怪物編輯器為例)
```text
┌─────────────────────────────────────────┐
│ [後台導覽] 怪物管理 | 技能管理 | 道具管理 │
├─────────────────────────────────────────┤
│                                         │
│  [ + 新增怪物 ]                         │
│                                         │
│  列表：                                 │
│  ID | 名稱   | 五行 | HP  | 攻擊 | 操作 │
│  1  | 葉刃狐 | 木   | 150 | 25   | [編輯]│
│  2  | 燼火犬 | 火   | 120 | 40   | [編輯]│
│                                         │
└─────────────────────────────────────────┘
```

### 視覺風格
- 後台介面以「清晰、高效、表單易讀」為主，不需要過度遊戲化的包裝。
- 表格與標籤仍需套用**重點配色優化**（如木屬性標籤使用 `#2E8B57`），方便營運人員快速辨識資料屬性。

---

## 衝突檢查 [必填]

### 與現有功能的關係
- 這些資料表將成為未來「虛相戰鬥系統」與「大地圖系統」的底層資料來源。戰鬥系統將直接從 `game_monsters` 讀取敵人數據。

### 效能影響評估
- 後台操作頻率低，對主系統效能無影響。

---

## 審核結果（由天命主系統填寫）

**狀態**：[待填寫]
**審核時間**：[待填寫]
**審核意見**：[待填寫]
