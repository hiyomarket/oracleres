# 移動式小 Boss 系統設計文檔

**版本**：v1.0｜**作者**：Manus AI｜**日期**：2026-03-27

---

## 一、系統概述

移動式小 Boss 是一種在台灣地圖上**自主巡迴移動**的強力怪物。它們不像普通怪物固定在某個節點，而是依照預設的巡迴路徑，每隔一段時間自動移動到下一個地圖節點。玩家必須追蹤 Boss 的位置，前往該節點才能發起挑戰。這套機制的核心目標是讓地圖探索更有動態感，鼓勵玩家主動移動、追蹤和協作。

.

本系統設計涵蓋三大層面：**Boss 的生成與移動邏輯**、**玩家的觸發與戰鬥機制**、**擊敗後的獎勵體系**。同時，所有關鍵參數（移動間隔、生成數量、獎勵倍率等）都將納入後台 `gameEngineConfig` 可調控，讓營運端能即時調整而不需要改程式碼。

---

## 二、與現有系統的整合點

在開始設計之前，先確認目前系統中可以直接利用的基礎設施：

| 現有系統 | 可利用的部分 | 整合方式 |
|---------|------------|---------|
| **地圖系統** | 213 個節點、22 個縣市、五行屬性、connections 路徑、dangerLevel 1-5 | Boss 沿著 `connections` 移動，dangerLevel 決定 Boss 可出現的區域 |
| **combatEngineV2** | 已預留 `boss` 模式（獎勵倍率 2.0x）、完整回合制引擎 | Boss 戰直接使用 `mode: "boss"` 啟動戰鬥 |
| **怪物圖鑑** | 10 隻 legendary 怪物（含 5 隻世界 Boss）、3 隻 elite 怪物 | 小 Boss 從 elite/legendary 圖鑑中選取，或新增專屬 Boss 圖鑑 |
| **afkTickEngine** | 每 15 秒執行一次的伺服器端循環 | Boss 移動邏輯掛載在此循環中 |
| **hiddenEventEngine** | 隨機事件生成、節點選取、有效期管理 | Boss 生成邏輯參考此模式 |
| **WebSocket** | `broadcastToAll`、`sendToAgent`、`broadcastToAllIncludingAnon` | Boss 出現/移動/被擊敗的全服廣播 |
| **liveFeedBroadcast** | 動態消息系統（升級、PvP、傳說掉落等） | 新增 `boss_spawn`、`boss_defeated` 動態類型 |
| **gameBattles 表** | 已有 `mode` 欄位支援 `boss` 模式 | Boss 戰鬥記錄直接寫入現有表 |
| **gameEngineConfig** | 後台可調的引擎配置系統 | 新增 Boss 相關配置項 |

---

## 三、Boss 定義與分級

### 3.1 Boss 分級體系

系統設計三個等級的 Boss，對應不同的挑戰難度和獎勵層級：

| 等級 | 名稱 | 出現條件 | 移動速度 | 停留時間 | 戰鬥難度 | 獎勵倍率 |
|-----|------|---------|---------|---------|---------|---------|
| **Tier 1** | 遊蕩精英 | 常駐，全地圖巡迴 | 每 5 分鐘移動一次 | 無限（直到被擊敗） | 同等級怪物 ×2 倍數值 | 2.0x |
| **Tier 2** | 區域守護者 | 定時刷新，限定區域 | 每 10 分鐘移動一次 | 30 分鐘後消失 | 同等級怪物 ×3 倍數值 | 3.0x |
| **Tier 3** | 天命凶獸 | 特殊條件觸發 | 每 15 分鐘移動一次 | 60 分鐘後消失 | 同等級怪物 ×5 倍數值 | 5.0x |

.

**Tier 1 遊蕩精英**是最基礎的移動式 Boss。它們常駐在地圖上，沿著固定路線巡迴，被擊敗後會在一段冷卻時間後重新生成。適合單人挑戰，是玩家日常練等和獲取裝備的穩定來源。

**Tier 2 區域守護者**是限時出現的中階 Boss。它們只在特定縣市或五行區域內移動，有 30 分鐘的存活時限。如果沒有被擊敗就會自行消失。獎勵更豐厚，但需要玩家在時限內追蹤到它。

**Tier 3 天命凶獸**是最稀有的頂級 Boss。它們只在特殊條件下觸發（例如全服累計擊敗 100 隻 Tier 1 Boss、特定節氣時段、管理員手動觸發），移動範圍跨越整個台灣，獎勵極為豐厚，可能掉落獨有的傳說裝備。

### 3.2 Boss 數據結構

每隻移動式 Boss 在資料庫中的核心欄位：

```
roaming_boss {
  id                  INT AUTO_INCREMENT PRIMARY KEY
  boss_id             VARCHAR(64) UNIQUE       -- 唯一識別碼，如 "rb-fire-phoenix"
  tier                ENUM(1, 2, 3)            -- Boss 等級
  name                VARCHAR(100)             -- 顯示名稱
  wuxing              ENUM(木,火,土,金,水)      -- 五行屬性
  level               INT                      -- Boss 等級
  base_hp             INT                      -- 基礎 HP
  base_attack         INT                      -- 基礎攻擊
  base_defense        INT                      -- 基礎防禦
  base_speed          INT                      -- 基礎速度
  base_matk           INT                      -- 基礎魔攻
  skills              JSON                     -- Boss 專屬技能列表
  loot_table          JSON                     -- 掉落物品表
  image_url           TEXT                     -- Boss 立繪圖片
  description         TEXT                     -- Boss 背景故事
  
  -- 移動相關
  current_node_id     VARCHAR(50)              -- 當前所在節點
  patrol_route        JSON                     -- 巡迴路徑（節點 ID 陣列）
  patrol_index        INT DEFAULT 0            -- 當前在路徑中的位置
  move_interval_ms    BIGINT                   -- 移動間隔（毫秒）
  last_moved_at       BIGINT                   -- 上次移動時間
  
  -- 狀態相關
  status              ENUM(active, defeated, despawned, cooldown)
  spawned_at          BIGINT                   -- 生成時間
  expires_at          BIGINT                   -- 過期時間（Tier 2/3）
  defeated_by         INT                      -- 擊敗者 agentId
  defeated_at         BIGINT                   -- 被擊敗時間
  respawn_at          BIGINT                   -- 重生時間（Tier 1）
  
  -- 統計
  total_defeats       INT DEFAULT 0            -- 累計被擊敗次數
  total_challengers   INT DEFAULT 0            -- 累計挑戰者數
}
```

---

## 四、移動路徑系統

### 4.1 路徑生成策略

Boss 的移動路徑不是隨機亂跑，而是依照地圖的 `connections`（節點連接關係）生成有意義的巡迴路線。三種等級的 Boss 使用不同的路徑生成策略：

**Tier 1 — 縣市內巡迴**

遊蕩精英在單一縣市內的所有節點之間巡迴。系統會根據 Boss 的五行屬性，優先選擇同屬性的縣市。路徑生成時，從該縣市的某個節點出發，沿著 `connections` 做深度優先遍歷，形成一條覆蓋該縣市大部分節點的環形路線。

```
範例：火屬性 Tier 1 Boss
→ 選擇台南市（火屬性節點最多的縣市之一）
→ 生成路徑：安平古堡 → 赤崁樓 → 孔廟商圈 → 新營糖廠 → 關子嶺溫泉 → 安平古堡（循環）
→ 每 5 分鐘沿路徑移動到下一個節點
```

**Tier 2 — 跨縣市區域巡迴**

區域守護者在 2-3 個相鄰縣市之間移動。系統選取地理上相鄰的縣市群（例如「北北基」、「中彰投」、「雲嘉南」、「高屏」），在這些縣市的高危險度節點（dangerLevel ≥ 3）之間規劃路線。

```
範例：水屬性 Tier 2 Boss
→ 選擇「北北基」區域（台北市 + 新北市 + 基隆市）
→ 篩選 dangerLevel ≥ 3 的節點
→ 生成路徑：基隆港灣 → 九份山城 → 陽明山 → 淡水河口 → 基隆港灣（循環）
→ 每 10 分鐘移動，30 分鐘後消失
```

**Tier 3 — 全島巡迴**

天命凶獸的路徑橫跨整個台灣。系統從北到南（或反向）選取各縣市的代表性高危險度節點，形成一條貫穿全島的路線。

```
範例：土屬性 Tier 3 Boss
→ 路徑：基隆港灣 → 陽明山 → 九份山城 → 太魯閣 → 日月潭 → 阿里山 → 墾丁 → 台東三仙台
→ 每 15 分鐘移動，60 分鐘後消失
```

### 4.2 移動邏輯（掛載在 afkTickEngine）

Boss 的移動邏輯會整合進現有的伺服器端循環。每次 afkTickEngine 執行時（預設每 15 秒），檢查所有活躍 Boss 是否到了移動時間：

```
每次 afkTick 執行時：
1. 查詢所有 status = "active" 的 roaming_boss
2. 對每隻 Boss：
   a. 如果 (now - last_moved_at) >= move_interval_ms：
      - patrol_index = (patrol_index + 1) % patrol_route.length
      - current_node_id = patrol_route[patrol_index]
      - last_moved_at = now
      - WebSocket 廣播：{ type: "boss_moved", bossId, fromNode, toNode }
   b. 如果 Tier 2/3 且 now > expires_at：
      - status = "despawned"
      - WebSocket 廣播：{ type: "boss_despawned", bossId }
   c. 如果 status = "cooldown" 且 now > respawn_at（Tier 1）：
      - status = "active"
      - 重新生成路徑
      - WebSocket 廣播：{ type: "boss_spawn", bossId, nodeId }
```

### 4.3 移動視覺化

前端地圖上，Boss 的位置會即時更新。當 Boss 移動時，地圖上會顯示：
- Boss 當前所在節點的特殊標記（紅色脈動光環 + Boss 圖示）
- Boss 移動路徑的預覽線（虛線，顯示接下來 2-3 個節點）
- 移動倒數計時器（顯示 Boss 還有多久會移動到下一個節點）

---

## 五、觸發與戰鬥機制

### 5.1 觸發條件

玩家要挑戰移動式 Boss，必須滿足以下條件：

| 條件 | Tier 1 | Tier 2 | Tier 3 |
|------|--------|--------|--------|
| 玩家必須在 Boss 所在節點 | 是 | 是 | 是 |
| 最低等級要求 | Boss 等級 - 5 | Boss 等級 - 3 | Boss 等級 |
| 體力消耗 | 10 點 | 20 點 | 30 點 |
| 冷卻時間（同一隻 Boss） | 5 分鐘 | 15 分鐘 | 30 分鐘 |
| 每日挑戰次數限制 | 無限 | 5 次/天 | 2 次/天 |

.

當玩家進入 Boss 所在的節點時，前端會顯示一個醒目的 Boss 遭遇提示，包含 Boss 的名稱、等級、五行屬性、剩餘停留時間（Tier 2/3），以及「發起挑戰」按鈕。

### 5.2 戰鬥流程

Boss 戰鬥使用現有的 `combatEngineV2` 回合制引擎，但有以下特殊規則：

**Boss 專屬機制：**
- **Boss 技能強化**：Boss 擁有 3-5 個專屬技能，比普通怪物更多。技能池包含範圍攻擊（同時打角色和寵物）、自我回復、增益 buff、debuff 施加。
- **階段轉換**：Tier 2/3 Boss 在 HP 降到 50% 和 25% 時觸發「狂暴化」，攻擊力提升 30%/50%，並解鎖新技能。
- **回合上限**：Boss 戰的最大回合數為 30 回合（普通戰鬥為 20 回合）。超過回合上限視為「Boss 逃離」，玩家不獲得獎勵但不扣體力。
- **Boss 不可捕捉**：Boss 戰鬥中禁用「捕捉」指令。

**戰鬥模式整合：**

```
startBattle({
  mode: "boss",
  monsterId: boss.monster_catalog_id,  // 對應怪物圖鑑
  bossInstanceId: boss.id,             // 新增：Boss 實例 ID
})
```

Boss 戰鬥結束後，`submitCommand` 的結算邏輯會額外處理：
1. 更新 `roaming_boss` 的狀態（defeated / cooldown）
2. 記錄擊敗者資訊
3. 發放 Boss 專屬獎勵
4. 全服廣播擊敗消息

### 5.3 Boss 戰鬥 AI 增強

現有的 `aiDecide` 函數對普通怪物已經足夠，但 Boss 需要更聰明的 AI：

| AI 行為 | 觸發條件 | 動作 |
|---------|---------|------|
| 優先攻擊低 HP 目標 | 角色或寵物 HP < 30% | 集中火力擊殺 |
| 自我回復 | Boss HP < 40% 且回復技能未冷卻 | 使用回復技能 |
| 範圍攻擊 | 角色和寵物都存活 | 使用範圍技能 |
| 狂暴衝鋒 | HP < 25%（Tier 2/3） | 連續兩次攻擊 |
| 屬性剋制優先 | 目標有被剋屬性 | 優先使用剋制屬性技能 |

---

## 六、獎勵體系

### 6.1 基礎獎勵

Boss 戰鬥的獎勵倍率已在 `combatEngineV2` 中預設為 2.0x。不同 Tier 的 Boss 在此基礎上再乘以額外倍率：

| 獎勵類型 | Tier 1（×2.0） | Tier 2（×3.0） | Tier 3（×5.0） |
|---------|---------------|---------------|---------------|
| 經驗值 | 普通怪物 ×2.0 | 普通怪物 ×3.0 | 普通怪物 ×5.0 |
| 金幣 | 普通怪物 ×2.0 | 普通怪物 ×3.0 | 普通怪物 ×5.0 |
| 掉落率 | 普通怪物 ×2.0 | 普通怪物 ×3.0 | 普通怪物 ×5.0 |
| 寵物經驗 | 普通怪物 ×2.0 | 普通怪物 ×3.0 | 普通怪物 ×5.0 |

### 6.2 Boss 專屬掉落

除了基礎獎勵外，每隻 Boss 有自己的專屬掉落表。掉落表使用權重隨機系統：

```
Boss 專屬掉落表範例（火鳳凰 — Tier 2）：
┌──────────────────────┬────────┬──────────┐
│ 物品                  │ 權重   │ 掉落率    │
├──────────────────────┼────────┼──────────┤
│ 鳳凰羽毛（材料）       │ 40     │ ~40%     │
│ 火靈精華（材料）       │ 30     │ ~30%     │
│ 鳳凰之翼（裝備・紫）   │ 15     │ ~15%     │
│ 涅槃之心（飾品・紫）   │ 10     │ ~10%     │
│ 不死鳳凰蛋（寵物蛋）   │ 5      │ ~5%      │
└──────────────────────┴────────┴──────────┘
```

### 6.3 首殺獎勵

每隻 Boss 的**全服首殺**和**個人首殺**都有額外獎勵：

**全服首殺**（該 Boss 第一次被任何玩家擊敗）：
- 額外 ×2.0 獎勵倍率（疊加在 Tier 倍率之上）
- 專屬稱號：「{Boss名} 終結者」
- 全服廣播 + 動態消息
- 首殺者名字永久記錄在 Boss 資訊面板上

**個人首殺**（該玩家第一次擊敗這隻 Boss）：
- 額外 50% 經驗加成
- 保底掉落一件 Boss 專屬裝備（最低品質）
- 解鎖成就：「{Boss名} 獵人」

### 6.4 排行榜獎勵

每週結算一次 Boss 擊殺排行榜：

| 排名 | 獎勵 |
|------|------|
| 第 1 名 | 500 金幣 + 專屬稱號「Boss 獵人」+ 隨機傳說裝備 |
| 第 2-3 名 | 300 金幣 + 隨機史詩裝備 |
| 第 4-10 名 | 150 金幣 + 隨機稀有裝備 |
| 參與獎（至少擊敗 1 隻） | 50 金幣 |

---

## 七、後台管理系統

### 7.1 gameEngineConfig 新增配置項

所有 Boss 相關的核心參數都納入 `gameEngineConfig`，讓營運端可以即時調整：

| 配置項 | 預設值 | 說明 |
|-------|-------|------|
| `bossSystemEnabled` | `true` | Boss 系統總開關 |
| `bossMaxActive` | `5` | 同時存在的最大 Boss 數量 |
| `bossTier1Count` | `3` | Tier 1 Boss 常駐數量 |
| `bossTier1MoveIntervalMs` | `300000`（5 分鐘） | Tier 1 移動間隔 |
| `bossTier1RespawnMs` | `1800000`（30 分鐘） | Tier 1 被擊敗後重生時間 |
| `bossTier1RewardMult` | `2.0` | Tier 1 獎勵倍率 |
| `bossTier2SpawnIntervalMs` | `3600000`（1 小時） | Tier 2 生成間隔 |
| `bossTier2MoveIntervalMs` | `600000`（10 分鐘） | Tier 2 移動間隔 |
| `bossTier2DurationMs` | `1800000`（30 分鐘） | Tier 2 存活時間 |
| `bossTier2RewardMult` | `3.0` | Tier 2 獎勵倍率 |
| `bossTier3RewardMult` | `5.0` | Tier 3 獎勵倍率 |
| `bossStaminaCostTier1` | `10` | Tier 1 體力消耗 |
| `bossStaminaCostTier2` | `20` | Tier 2 體力消耗 |
| `bossStaminaCostTier3` | `30` | Tier 3 體力消耗 |
| `bossEnrageHpPercent` | `50` | Boss 狂暴化 HP 門檻（%） |
| `bossMaxRounds` | `30` | Boss 戰最大回合數 |

### 7.2 後台管理介面

在 AdminGameTheater（遊戲劇院）中新增「Boss 管理」Tab，包含以下功能：

**Boss 圖鑑管理**：新增/編輯/刪除 Boss 定義（名稱、五行、等級、數值、技能、掉落表、立繪）。

**活躍 Boss 監控面板**：即時顯示所有活躍 Boss 的位置、HP 狀態、剩餘時間、挑戰者數量。支援手動傳送 Boss 到指定節點、手動擊殺/重生。

**手動觸發**：管理員可以手動生成任意 Tier 的 Boss，指定初始節點和巡迴路徑。這對於活動營運和 Tier 3 Boss 的觸發尤其重要。

**Boss 統計儀表板**：擊殺次數統計、平均挑戰時間、掉落物品分布、玩家參與率。

---

## 八、技術實作規劃

### 8.1 資料庫變更

需要新增兩張表：

```sql
-- Boss 定義表（圖鑑）
CREATE TABLE game_boss_catalog (
  id INT AUTO_INCREMENT PRIMARY KEY,
  boss_id VARCHAR(64) NOT NULL UNIQUE,
  tier TINYINT NOT NULL DEFAULT 1,
  name VARCHAR(100) NOT NULL,
  wuxing ENUM('木','火','土','金','水') NOT NULL,
  level INT NOT NULL,
  base_hp INT NOT NULL,
  base_attack INT NOT NULL,
  base_defense INT NOT NULL,
  base_speed INT NOT NULL,
  base_matk INT NOT NULL,
  skills JSON NOT NULL,
  loot_table JSON NOT NULL,
  image_url TEXT,
  description TEXT,
  patrol_region JSON,          -- 巡迴區域（縣市列表或節點列表）
  enabled TINYINT NOT NULL DEFAULT 1,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- Boss 實例表（活躍中的 Boss）
CREATE TABLE game_boss_instances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  catalog_id INT NOT NULL,     -- 對應 game_boss_catalog.id
  boss_id VARCHAR(64) NOT NULL,
  current_node_id VARCHAR(50) NOT NULL,
  patrol_route JSON NOT NULL,
  patrol_index INT NOT NULL DEFAULT 0,
  move_interval_ms BIGINT NOT NULL,
  last_moved_at BIGINT NOT NULL,
  status ENUM('active','defeated','despawned','cooldown') NOT NULL DEFAULT 'active',
  spawned_at BIGINT NOT NULL,
  expires_at BIGINT,
  defeated_by INT,
  defeated_at BIGINT,
  respawn_at BIGINT,
  total_defeats INT NOT NULL DEFAULT 0,
  total_challengers INT NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL
);
```

### 8.2 後端模組規劃

| 檔案 | 職責 |
|------|------|
| `server/services/bossEngine.ts` | Boss 移動邏輯、路徑生成、生成/消亡管理 |
| `server/routers/gameBoss.ts` | Boss 相關 API（查詢活躍 Boss、發起挑戰、Boss 圖鑑管理） |
| `server/routers/adminBoss.ts` | 後台管理 API（CRUD、手動觸發、統計） |

Boss 移動邏輯掛載在 `afkTickEngine` 中：

```typescript
// afkTickEngine.ts 中新增
import { processRoamingBosses } from "./services/bossEngine";

// 在 processAllAgents() 結束後：
await processRoamingBosses();  // 處理 Boss 移動、過期、重生
```

### 8.3 前端模組規劃

| 檔案 | 職責 |
|------|------|
| `client/src/components/game/BossMarker.tsx` | 地圖上的 Boss 標記組件（脈動動畫 + 倒數計時） |
| `client/src/components/game/BossEncounter.tsx` | Boss 遭遇提示面板（Boss 資訊 + 挑戰按鈕） |
| `client/src/pages/game/BossTracker.tsx` | Boss 追蹤頁面（全服活躍 Boss 列表 + 地圖定位） |
| `client/src/pages/admin/AdminBoss.tsx` | 後台 Boss 管理頁面 |

### 8.4 WebSocket 事件

| 事件類型 | 觸發時機 | 資料內容 |
|---------|---------|---------|
| `boss_spawn` | Boss 生成時 | `{ bossId, name, tier, wuxing, nodeId, nodeName }` |
| `boss_moved` | Boss 移動時 | `{ bossId, name, fromNodeId, toNodeId, toNodeName, nextMoveAt }` |
| `boss_enraged` | Boss 狂暴化時 | `{ bossId, name, hpPercent }` |
| `boss_defeated` | Boss 被擊敗時 | `{ bossId, name, defeatedBy, agentName }` |
| `boss_despawned` | Boss 過期消失時 | `{ bossId, name }` |

---

## 九、開發優先順序

建議分三個階段實作：

**第一階段（核心）**：資料庫建表 → bossEngine（移動邏輯）→ gameBoss router（查詢/挑戰 API）→ 前端 Boss 標記和遭遇面板。這個階段完成後，Tier 1 Boss 就能在地圖上移動並被挑戰。

**第二階段（增強）**：Tier 2/3 Boss 的定時生成和特殊觸發 → Boss AI 增強 → 專屬掉落和首殺獎勵 → Boss 追蹤頁面 → 全服廣播。

**第三階段（管理）**：後台 Boss 管理 Tab → 手動觸發功能 → 統計儀表板 → 排行榜系統 → gameEngineConfig 整合。

| 階段 | 預估工作量 | 產出 |
|------|----------|------|
| 第一階段 | 核心功能 | Tier 1 Boss 可移動、可挑戰、基礎獎勵 |
| 第二階段 | 進階功能 | 三種 Tier 完整運作、專屬獎勵、全服互動 |
| 第三階段 | 營運工具 | 後台完整管理、數據分析、排行榜 |

---

## 十、未來擴展：惡魔城系統

移動式小 Boss 系統是惡魔城系統的前置基礎。惡魔城的設計方向是：

> 惡魔城是一座在地圖上移動的特殊「區域」，內部有多層樓層，每層有不同的怪物和一個守關 Boss。玩家需要逐層攻略，進度會保存。惡魔城每週重置一次，排行榜記錄最高攻略層數。

移動式 Boss 系統為惡魔城提供的基礎：
- **移動邏輯**：惡魔城本身就是一個在地圖上移動的實體，直接複用 Boss 的移動引擎
- **戰鬥引擎**：每層守關 Boss 使用 `mode: "boss"` 的回合制戰鬥
- **獎勵體系**：每層的獎勵遞增，複用 Boss 的掉落表和倍率系統
- **WebSocket 廣播**：惡魔城出現/被攻略的全服通知

這些都可以在移動式 Boss 系統穩定運行後，再行擴展。
