# 虛相世界 · 資料庫 Schema 完整規格

**版本**：v1.0  
**日期**：2026-03-23  
**負責人**：遊戲 Agent（虛相世界沙盒）  
**狀態**：已實作並部署，資料庫遷移完成

> 本文件描述虛相世界沙盒系統的完整資料庫結構。最終移轉至主系統時，這些表格應整合進主系統的 MySQL 資料庫，並與 `userProfiles`、`game_items` 等現有表格建立外鍵關聯。

---

## 一、資料庫總覽

虛相世界目前使用 **4 張核心表格**，以 Drizzle ORM + MySQL 實作。

| 表格名稱 | 用途 | 關聯 |
|---|---|---|
| `users` | 用戶身份（OAuth 登入） | 主系統應以 `openId` 對齊 |
| `game_agents` | 旅人角色狀態（核心） | 每個 user 對應一個 agent |
| `agent_events` | 冒險事件日誌 | 每個 agent 有多筆事件 |
| `agent_inventory` | 旅人背包 | 每個 agent 有多個物品格 |
| `game_world` | 全服 Tick 狀態 | 全服共用一筆記錄 |

---

## 二、表格詳細規格

### 2.1 `game_agents`（旅人角色 — 核心表格）

這是整個虛相世界最重要的表格，記錄每個玩家的旅人在世界中的完整狀態。

```sql
CREATE TABLE game_agents (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  userId          INT NOT NULL,           -- 對應 users.id（移轉後對應主系統 userId）
  name            VARCHAR(64) DEFAULT '旅人',
  gender          ENUM('male','female') DEFAULT 'male',

  -- 當前位置
  currentNodeId   VARCHAR(32) DEFAULT 'taipei-zhongzheng',  -- 對應地圖節點 ID
  movingToNodeId  VARCHAR(32),            -- 移動目標節點（NULL = 未在移動）
  moveArrivesAt   TIMESTAMP,             -- 預計抵達時間

  -- 生命值與魔力
  hp              INT DEFAULT 100,
  maxHp           INT DEFAULT 100,
  mp              INT DEFAULT 50,
  maxMp           INT DEFAULT 50,

  -- 基礎能力值（由命格五行 % 數換算）
  attack          INT DEFAULT 20,        -- 來自火屬性 %
  defense         INT DEFAULT 15,        -- 來自土屬性 %
  speed           INT DEFAULT 10,        -- 來自金屬性 %

  -- 五行屬性百分比（從主系統 natalStats 同步）
  wuxingWood      INT DEFAULT 20,        -- 木屬性 %（影響 maxHp）
  wuxingFire      INT DEFAULT 20,        -- 火屬性 %（影響 attack）
  wuxingEarth     INT DEFAULT 20,        -- 土屬性 %（影響 defense）
  wuxingMetal     INT DEFAULT 20,        -- 金屬性 %（影響 speed）
  wuxingWater     INT DEFAULT 20,        -- 水屬性 %（影響 maxMp）

  -- 主命五行（五行中 % 最高者）
  dominantElement ENUM('wood','fire','earth','metal','water') DEFAULT 'wood',

  -- 等級與經驗
  level           INT DEFAULT 1,
  exp             INT DEFAULT 0,
  expToNext       INT DEFAULT 100,

  -- 貨幣（虛相世界內部貨幣）
  gold            INT DEFAULT 50,        -- 遊戲內金幣（不等同天命幣）
  spiritStone     INT DEFAULT 10,        -- 靈石（用於神明干預）
  destinyCoins    INT DEFAULT 0,         -- 天命幣（從主系統同步，只讀）

  -- 行為策略（玩家設定的神明指令）
  strategy        ENUM('explore','farm','merchant','rest') DEFAULT 'explore',

  -- 角色狀態
  status          ENUM('idle','moving','fighting','gathering','resting','dead') DEFAULT 'idle',
  isActive        BOOLEAN DEFAULT TRUE,

  createdAt       TIMESTAMP DEFAULT NOW(),
  updatedAt       TIMESTAMP DEFAULT NOW() ON UPDATE NOW()
);
```

**五行能力值換算公式**：

| 五行 | 對應能力 | 換算公式 |
|---|---|---|
| 木 (wood) | maxHp | `wood% × 5 + 50` |
| 火 (fire) | attack | `fire% × 0.8 + 5` |
| 土 (earth) | defense | `earth% × 0.6 + 5` |
| 金 (metal) | speed | `metal% × 0.4 + 3` |
| 水 (water) | maxMp | `water% × 3 + 20` |

**範例**（以 Boss 命格為例，木42/水35/火11/土9/金4）：
- maxHp = 42×5+50 = **260**
- attack = 11×0.8+5 = **13.8 ≈ 14**
- defense = 9×0.6+5 = **10.4 ≈ 10**
- speed = 4×0.4+3 = **4.6 ≈ 5**
- maxMp = 35×3+20 = **125**

---

### 2.2 `agent_events`（冒險事件日誌）

記錄旅人在虛相世界中的每一個行動，是前端事件日誌面板的資料來源。

```sql
CREATE TABLE agent_events (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  agentId     INT NOT NULL,              -- 對應 game_agents.id
  tick        INT NOT NULL,              -- 發生時的全服 Tick 編號
  eventType   ENUM(
    'move',       -- 移動
    'combat',     -- 戰鬥
    'loot',       -- 撿取戰利品
    'gather',     -- 採集素材
    'trade',      -- 交易
    'rest',       -- 休息
    'levelup',    -- 升級
    'divine',     -- 神明干預（玩家主動觸發）
    'weather',    -- 天氣事件
    'encounter',  -- 特殊遭遇
    'death',      -- 角色死亡
    'system'      -- 系統訊息
  ) NOT NULL,
  message     TEXT NOT NULL,            -- 事件文字描述（中文）
  data        JSON,                     -- 額外資料（怪物ID、物品ID、數值等）
  nodeId      VARCHAR(32),              -- 發生地點的節點 ID
  createdAt   TIMESTAMP DEFAULT NOW()
);
```

**`data` 欄位 JSON 範例**：

```json
// combat 事件
{
  "monsterId": "wood-003",
  "monsterName": "山豬精",
  "won": true,
  "expGained": 35,
  "goldGained": 15,
  "hpLost": 22
}

// loot 事件
{
  "itemId": "mat-wood-002",
  "itemName": "野豬皮",
  "quantity": 1
}

// levelup 事件
{
  "oldLevel": 4,
  "newLevel": 5,
  "statsGained": { "maxHp": 10, "attack": 2 }
}
```

---

### 2.3 `agent_inventory`（旅人背包）

```sql
CREATE TABLE agent_inventory (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  agentId      INT NOT NULL,
  itemId       VARCHAR(32) NOT NULL,    -- 對應 shared/items 資料庫的 ID
  itemType     ENUM('consumable','material','equipment','quest') NOT NULL,
  quantity     INT DEFAULT 1,
  equippedSlot VARCHAR(16),             -- 'weapon'/'armor'/'accessory' 或 NULL
  createdAt    TIMESTAMP DEFAULT NOW()
);
```

---

### 2.4 `game_world`（全服 Tick 狀態）

全服共用一筆記錄，記錄當前 Tick 編號與今日流日資訊。

```sql
CREATE TABLE game_world (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  currentTick      INT DEFAULT 0,
  dailyElement     ENUM('wood','fire','earth','metal','water') DEFAULT 'wood',
  dailyStem        VARCHAR(4) DEFAULT '甲',    -- 天干
  dailyBranch      VARCHAR(4) DEFAULT '子',    -- 地支
  weatherModifier  FLOAT DEFAULT 1.0,          -- 天氣加成係數
  updatedAt        TIMESTAMP DEFAULT NOW() ON UPDATE NOW()
);
```

---

## 三、地圖節點規格（共 72 個節點）

地圖節點以 TypeScript 靜態資料儲存（`shared/mapNodes.ts`），不存入資料庫。每個節點的結構如下：

```typescript
type MapNode = {
  id: string;           // 唯一識別碼，例如 "taipei-daan"
  name: string;         // 顯示名稱，例如 "大安森林公園"
  county: string;       // 所屬縣市
  element: WuXing;      // 五行屬性
  terrain: string;      // 地形類型
  description: string;  // 場景描述文字
  dangerLevel: 1|2|3|4|5;  // 危險等級（影響怪物強度）
  connections: string[];    // 可直接移動的相鄰節點 ID 列表
  travelTime: number;       // 移動所需秒數
  monsterLevel: [number, number];  // 怪物等級範圍 [min, max]
  x: number;            // 視覺化座標 X（0-100，相對台灣輪廓）
  y: number;            // 視覺化座標 Y（0-100，相對台灣輪廓）
};
```

**節點分佈統計**：

| 縣市 | 節點數 | 主要五行 | 危險等級範圍 |
|---|---|---|---|
| 台北市 | 8 | 土/木/金 | 1-2 |
| 新北市 | 6 | 木/水 | 1-3 |
| 桃園市 | 3 | 金/木 | 2-3 |
| 台中市 | 4 | 火/土 | 2-3 |
| 台南市 | 4 | 火/土 | 2-3 |
| 高雄市 | 4 | 火/金 | 2-4 |
| 宜蘭縣 | 3 | 水/木 | 2-3 |
| 花蓮縣 | 4 | 木/水 | 3-4 |
| 台東縣 | 3 | 水/木 | 3-4 |
| 玉山/中央山脈 | 5 | 金/木 | 4-5（Boss 區） |
| 其他縣市 | 28 | 混合 | 1-4 |

---

## 四、怪物資料庫規格（共 50 隻）

怪物以 TypeScript 靜態資料儲存（`shared/monsters.ts`），不存入資料庫。

```typescript
type Monster = {
  id: string;           // 例如 "wood-001"
  name: string;
  element: WuXing;
  level: number;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  expReward: number;
  goldReward: [number, number];  // [min, max]
  dropItems: Array<{ itemId: string; chance: number }>;
  skills: string[];
  description: string;
  isBoss: boolean;
};
```

**怪物分佈**：五行各 10 隻（含 1 隻 Boss），等級範圍 1-38。

| 五行 | Boss 名稱 | Boss 等級 | Boss HP |
|---|---|---|---|
| 木 | 木靈神獸・青龍 | 35 | 5,000 |
| 火 | 火靈神獸・朱雀 | 38 | 6,000 |
| 土 | 土靈神獸・黃龍 | 36 | 5,500 |
| 金 | 金靈神獸・白虎 | 37 | 5,200 |
| 水 | 水靈神獸・玄武 | 40 | 7,000 |

---

## 五、Tick 引擎規格

### 5.1 執行週期

Tick 引擎在伺服器啟動時自動啟動，每 **5 秒**執行一次（`setInterval`）。

### 5.2 每個 Tick 的處理流程

```
1. 從 DB 讀取所有 isActive=true 的 game_agents
2. 對每個 agent 執行行動結算：
   a. 若 status='moving' 且 moveArrivesAt <= now → 抵達目標節點
   b. 若 status='idle' → 根據 strategy 決定下一個行動
      - explore: 隨機移動到相鄰節點
      - farm: 在當前節點戰鬥
      - gather: 在當前節點採集
      - rest: 在當前節點休息（恢復 HP/MP）
   c. 若 status='fighting' → 執行戰鬥結算
   d. 若 status='gathering' → 執行採集結算
3. 更新 game_world.currentTick + 1
4. 每 1440 個 Tick（約 2 小時）更新今日流日
```

### 5.3 五行戰鬥計算公式

```typescript
// 五行相剋關係
const WUXING_OVERCOME = {
  wood: "earth",   // 木剋土
  earth: "water",  // 土剋水
  water: "fire",   // 水剋火
  fire: "metal",   // 火剋金
  metal: "wood",   // 金剋木
};

// 五行相生關係
const WUXING_GENERATE = {
  wood: "fire",    // 木生火
  fire: "earth",   // 火生土
  earth: "metal",  // 土生金
  metal: "water",  // 金生水
  water: "wood",   // 水生木
};

// 傷害倍率
function calcWuxingMultiplier(attacker, defender) {
  if (WUXING_OVERCOME[attacker] === defender) return 1.5;  // 相剋 +50%
  if (WUXING_OVERCOME[defender] === attacker) return 0.7;  // 被剋 -30%
  if (WUXING_GENERATE[attacker] === defender) return 1.2;  // 相生 +20%
  return 1.0;  // 無關係
}
```

---

## 六、tRPC API 端點規格

虛相世界透過 tRPC 提供以下端點（路徑前綴：`/api/trpc/game.*`）：

| 端點 | 類型 | 說明 |
|---|---|---|
| `game.getMyAgent` | query | 取得當前用戶的旅人狀態 |
| `game.createAgent` | mutation | 建立旅人（首次進入時呼叫） |
| `game.getRecentEvents` | query | 取得最近 50 筆事件日誌 |
| `game.setStrategy` | mutation | 切換旅人行為策略 |
| `game.divineHeal` | mutation | 神蹟治癒（消耗 5 靈石，恢復 50% HP） |
| `game.divineTeleport` | mutation | 神蹟傳送（消耗 10 靈石，傳送至指定節點） |
| `game.getWorldState` | query | 取得全服 Tick 狀態與今日流日 |

---

## 七、移轉至主系統的注意事項

當虛相世界沙盒移轉至主系統時，需要處理以下對接點：

**1. 用戶身份對齊**：`game_agents.userId` 目前對應沙盒的 `users.id`，移轉後需改為對應主系統的用戶 ID（建議以 `openId` 作為橋接鍵）。

**2. 命格資料注入**：目前 `createAgent` 使用 Mock 五行比例（木35/火25/土20/金12/水8），移轉後需從主系統的 `natalStats` 讀取真實數值。注入點在 `server/routers/game.ts` 的 `createAgent` procedure，只需替換以下這段：

```typescript
// 目前（Mock）
const natalStats = { wood: 35, fire: 25, earth: 20, metal: 12, water: 8 };

// 移轉後（從主系統取得）
const natalStats = await fetchNatalStats(ctx.user.openId);
```

**3. 靈石/天命幣同步**：目前靈石是遊戲內部貨幣，移轉後需與主系統的靈石餘額同步。建議在每次神明干預前，先呼叫主系統 API 確認餘額，扣款後再執行遊戲邏輯。

**4. 道具掉落同步**：目前掉落物品只記錄在 `agent_inventory`，移轉後需同步至主系統的背包系統（如果主系統有統一的 `game_items` 背包）。
