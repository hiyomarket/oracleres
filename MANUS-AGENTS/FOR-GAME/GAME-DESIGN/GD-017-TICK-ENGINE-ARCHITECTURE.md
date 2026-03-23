# GD-017 後台 Tick 引擎架構規劃
**版本**：v1.0
**最後更新**：2026-03-23
**負責人**：主系統 Agent
**狀態**：`架構規劃完成，待 Sprint 排程`

---

## 一、架構總覽

虛相世界的 Tick 引擎採用**後台定時任務 + 事件日誌 + 前端 SSE 推送**的三層架構。

```
┌─────────────────────────────────────────────────────────────┐
│  前端（React）                                               │
│  ├── VirtualWorldPage.tsx（主介面：事件日誌 + 策略台）       │
│  └── SSE 訂閱 /api/world/events/stream（即時推送）          │
├─────────────────────────────────────────────────────────────┤
│  後台 Tick 引擎（server/world/）                             │
│  ├── tickEngine.ts（核心排程器，每 5 秒執行一次）            │
│  ├── combatResolver.ts（戰鬥結算：五行相剋 + 傷害公式）      │
│  ├── mapNavigator.ts（節點式移動：A→B 消耗時間）            │
│  ├── eventGenerator.ts（文字事件生成：LLM 增色）            │
│  └── worldStateSync.ts（全服狀態同步：天氣/流日連動）       │
├─────────────────────────────────────────────────────────────┤
│  資料庫（新增 4 張表）                                       │
│  ├── game_world_sessions（玩家世界狀態）                     │
│  ├── game_event_logs（事件日誌，保留 7 天）                  │
│  ├── game_map_nodes（地圖節點，沿用 gameMapNodes）           │
│  └── game_world_state（全服狀態：天氣/流日/全服事件）        │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、資料庫 Schema 設計

### 2.1 game_world_sessions（玩家世界狀態）

```typescript
// drizzle/schema.ts 新增
export const gameWorldSessions = mysqlTable("game_world_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  // 目前位置
  currentNodeId: int("current_node_id").notNull().default(1),
  // 移動狀態：idle / moving / fighting / resting
  status: varchar("status", { length: 20 }).notNull().default("idle"),
  // 目標節點（移動中才有值）
  targetNodeId: int("target_node_id"),
  // 預計抵達時間（UTC ms）
  arrivalAt: bigint("arrival_at", { mode: "number" }),
  // 目前 HP / 最大 HP
  currentHp: int("current_hp").notNull().default(100),
  maxHp: int("max_hp").notNull().default(100),
  // 目前 MP / 最大 MP
  currentMp: int("current_mp").notNull().default(60),
  maxMp: int("max_mp").notNull().default(60),
  // 玩家策略：aggressive / balanced / farming / merchant
  strategy: varchar("strategy", { length: 20 }).notNull().default("balanced"),
  // 上次 Tick 時間（UTC ms）
  lastTickAt: bigint("last_tick_at", { mode: "number" }),
  // 是否在線（玩家開著頁面）
  isOnline: tinyint("is_online").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
```

### 2.2 game_event_logs（事件日誌）

```typescript
export const gameEventLogs = mysqlTable("game_event_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // 事件類型：move / combat / collect / rest / divine / system
  eventType: varchar("event_type", { length: 20 }).notNull(),
  // 事件文字（中文，可含 HTML 標籤高亮）
  message: text("message").notNull(),
  // 關聯資料（JSON：怪物ID、道具ID、傷害數值等）
  metadata: json("metadata"),
  // 重要度：normal / important / critical
  importance: varchar("importance", { length: 10 }).notNull().default("normal"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
// 索引：userId + createdAt（查詢最近 100 條）
```

### 2.3 game_world_state（全服狀態）

```typescript
export const gameWorldState = mysqlTable("game_world_state", {
  id: int("id").autoincrement().primaryKey(),
  // 今日流日（來自 wuxingEngine）
  todayDayPillar: varchar("today_day_pillar", { length: 10 }),
  todayDayElement: varchar("today_day_element", { length: 10 }),
  // 全服天氣（台灣，來自 Open-Meteo API）
  weatherCode: int("weather_code"),
  weatherElement: varchar("weather_element", { length: 10 }),
  // 全服 Buff（JSON：{ fire: 1.2, wood: 0.8 }）
  elementMultipliers: json("element_multipliers"),
  // 全服事件文字（最新一條）
  globalEventMessage: text("global_event_message"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
```

---

## 三、Tick 引擎核心邏輯

### 3.1 tickEngine.ts（每 5 秒執行）

```typescript
// server/world/tickEngine.ts
export async function runWorldTick() {
  const db = await getDb();
  if (!db) return;

  // 1. 取得所有「進行中」的世界會話
  const activeSessions = await db
    .select()
    .from(gameWorldSessions)
    .where(
      or(
        eq(gameWorldSessions.status, "moving"),
        eq(gameWorldSessions.status, "fighting"),
        eq(gameWorldSessions.status, "idle")
      )
    );

  // 2. 並行處理每個玩家的 Tick
  await Promise.allSettled(
    activeSessions.map((session) => processPlayerTick(session, db))
  );

  // 3. 每 60 秒更新全服狀態（天氣 + 流日）
  if (Date.now() % 60000 < 5000) {
    await updateWorldState(db);
  }
}

async function processPlayerTick(session: WorldSession, db: DB) {
  const now = Date.now();

  switch (session.status) {
    case "moving":
      // 檢查是否抵達目標節點
      if (session.arrivalAt && now >= session.arrivalAt) {
        await handleArrival(session, db);
      }
      break;

    case "idle":
      // 根據策略決定下一步行動
      await decideNextAction(session, db);
      break;

    case "fighting":
      // 執行一輪戰鬥結算
      await resolveCombatTick(session, db);
      break;
  }
}
```

### 3.2 combatResolver.ts（五行相剋傷害公式）

```typescript
// 五行相剋表（攻擊方 → 被攻擊方 → 倍率）
const WUXING_MULTIPLIER: Record<string, Record<string, number>> = {
  wood:  { earth: 1.5, water: 0.8, fire: 1.0, metal: 0.7, wood: 1.0 },
  fire:  { metal: 1.5, wood: 0.8, earth: 1.0, water: 0.7, fire: 1.0 },
  earth: { water: 1.5, fire: 0.8, metal: 1.0, wood: 0.7, earth: 1.0 },
  metal: { wood: 1.5, earth: 0.8, water: 1.0, fire: 0.7, metal: 1.0 },
  water: { fire: 1.5, metal: 0.8, wood: 1.0, earth: 0.7, water: 1.0 },
};

export function calculateDamage(
  attackerAtk: number,
  attackerElement: string,
  defenderDef: number,
  defenderElement: string,
  worldMultipliers: Record<string, number>
): { damage: number; isCrit: boolean; multiplierText: string } {
  const baseMultiplier = WUXING_MULTIPLIER[attackerElement]?.[defenderElement] ?? 1.0;
  const worldBonus = worldMultipliers[attackerElement] ?? 1.0;
  const finalMultiplier = baseMultiplier * worldBonus;
  const rawDamage = Math.max(1, attackerAtk * finalMultiplier - defenderDef);
  const isCrit = Math.random() < 0.1; // 10% 暴擊率
  const damage = Math.round(isCrit ? rawDamage * 1.5 : rawDamage);

  let multiplierText = "";
  if (baseMultiplier > 1.2) multiplierText = "【屬性克制！】";
  else if (baseMultiplier < 0.9) multiplierText = "【屬性不利】";

  return { damage, isCrit, multiplierText };
}
```

---

## 四、前端 SSE 推送設計

### 4.1 Server-Sent Events 端點

```typescript
// server/routers/gameWorld.ts 新增
// GET /api/world/events/stream（需認證）
app.get("/api/world/events/stream", authenticateRequest, (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const userId = req.user.id;
  // 訂閱用戶的事件佇列
  const unsubscribe = eventBus.subscribe(userId, (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  });

  req.on("close", () => {
    unsubscribe();
  });
});
```

### 4.2 前端事件日誌組件

```tsx
// client/src/pages/game/VirtualWorldPage.tsx
function EventLog({ userId }: { userId: number }) {
  const [events, setEvents] = useState<WorldEvent[]>([]);

  useEffect(() => {
    const es = new EventSource("/api/world/events/stream");
    es.onmessage = (e) => {
      const event = JSON.parse(e.data) as WorldEvent;
      setEvents((prev) => [event, ...prev].slice(0, 200));
    };
    return () => es.close();
  }, []);

  return (
    <div className="font-mono text-sm space-y-1 overflow-y-auto h-full">
      {events.map((e) => (
        <EventLine key={e.id} event={e} />
      ))}
    </div>
  );
}
```

---

## 五、Sprint 排程建議

| Sprint | 任務 | 預估工時 |
|--------|------|----------|
| Sprint 1 | Schema 設計 + db:push + 基礎 tRPC procedures | 2h |
| Sprint 2 | tickEngine.ts + combatResolver.ts 核心邏輯 | 4h |
| Sprint 3 | VirtualWorldPage.tsx 前端介面（事件日誌 + 策略台） | 3h |
| Sprint 4 | SSE 推送 + 即時事件流 | 2h |
| Sprint 5 | 天氣 API 連動 + 流日連動 | 2h |
| Sprint 6 | 測試 + 平衡調整 + Seed 資料匯入 | 3h |

**總計**：約 16 小時開發工時

---

## 六、前置條件確認

在開始 Tick 引擎開發前，需確認以下前置條件已完成：

- [x] P0：`getEquipped` 已回傳 `userGender` + `natalStats`（五行能力值）
- [x] P1：商城圖片已上傳 S3 CDN，`game_items` 已有 20 筆商城道具
- [x] P2：五行場景背景圖已整合至 CharacterProfile
- [ ] **Seed Script**：遊戲 Agent 提供完整的怪物/道具/裝備/技能 Seed Script
- [ ] **gameMapNodes**：地圖節點資料需要填充（目前表已建立，但無資料）
- [ ] **策略 UI**：VirtualWorldPage.tsx 頁面骨架需要建立
