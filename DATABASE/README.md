# Oracle Resonance 資料庫備份

**匯出時間**: 2026-03-25T16:27:14.180Z
**資料表數量**: 104

## 資料表統計

| 資料表 | 筆數 |
|:---|---:|
| __drizzle_migrations | 19 |
| access_tokens | 1 |
| achievements | 20 |
| admin_game_control | 1 |
| agent_achievements | 170 |
| agent_drop_counters | 0 |
| agent_events | 1,741 |
| agent_inventory | 66 |
| agent_pvp_stats | 0 |
| agent_set_progress | 0 |
| agent_skills | 2 |
| agent_titles | 2 |
| auction_listings | 0 |
| aura_engine_config | 15 |
| aura_rule_history | 0 |
| awake_materials | 0 |
| bookings | 6 |
| bracelet_wear_logs | 12 |
| campaigns | 2 |
| chat_messages | 19 |
| currency_exchange_logs | 0 |
| custom_bracelets | 11 |
| daily_energy_logs | 0 |
| dietary_logs | 0 |
| divination_sessions | 48 |
| equipment_templates | 6 |
| expert_applications | 0 |
| expert_availability | 14 |
| expert_calendar_events | 0 |
| expert_services | 3 |
| experts | 2 |
| favorite_stores | 0 |
| feature_plans | 7 |
| feature_redemptions | 1 |
| features | 13 |
| game_achievements | 0 |
| game_agents | 4 |
| game_broadcast | 105 |
| game_config | 28 |
| game_daily_aura | 0 |
| game_equipment_catalog | 39 |
| game_gatherables | 0 |
| game_hidden_events | 2 |
| game_hidden_shop_pool | 19 |
| game_inventory_items | 0 |
| game_item_catalog | 93 |
| game_items | 140 |
| game_map_nodes | 0 |
| game_merchant_pool | 0 |
| game_monster_catalog | 115 |
| game_monster_skill_catalog | 0 |
| game_monsters | 0 |
| game_random_quests | 0 |
| game_rogue_events | 12 |
| game_skill_catalog | 109 |
| game_skills | 0 |
| game_spirit_shop | 5 |
| game_titles | 8 |
| game_virtual_shop | 10 |
| game_wardrobe | 32 |
| game_world | 1 |
| global_first_triggers | 0 |
| hidden_shop_instances | 9 |
| hidden_skill_trackers | 0 |
| invite_codes | 29 |
| lottery_results | 3 |
| lottery_sessions | 39 |
| marketing_config | 5 |
| modules | 13 |
| monster_drop_tables | 21 |
| oracle_sessions | 159 |
| plan_modules | 39 |
| plans | 5 |
| points_transactions | 351 |
| private_messages | 9 |
| purchase_orders | 0 |
| pvp_challenges | 0 |
| redemption_codes | 0 |
| restaurant_categories | 19 |
| reviews | 0 |
| scratch_logs | 5 |
| site_banners | 1 |
| skill_books | 0 |
| skill_templates | 10 |
| strategy_thresholds | 5 |
| subscription_logs | 151 |
| system_settings | 3 |
| team_messages | 0 |
| token_access_logs | 73 |
| user_achievements | 0 |
| user_diet_preferences | 3 |
| user_group_members | 61 |
| user_groups | 3 |
| user_notifications | 989 |
| user_permissions | 220 |
| user_profiles | 51 |
| user_subscriptions | 51 |
| users | 47 |
| wardrobe_items | 8 |
| wbc_bets | 16 |
| wbc_matches | 45 |
| wealth_journal | 0 |
| weekly_champions | 0 |
| world_events | 54 |

## 目錄結構

```
DATABASE/
├── README.md               # 本說明文件
├── schema.sql              # 所有資料表的 CREATE TABLE 語句（MySQL DDL）
├── drizzle-schema.ts       # Drizzle ORM TypeScript Schema 定義（原始碼）
├── full-dump.sql           # 完整備份（Schema + 所有資料，2.2 MB）
├── migrations/             # Drizzle 遷移歷史（84 個版本）
│   └── 0000_*.sql ~ 0083_*.sql
├── tables/                 # 各資料表的 INSERT 語句（71 個有資料的表）
│   └── {table_name}.sql
└── json/                   # 各資料表的 JSON 格式資料（104 個表）
    └── {table_name}.json
```

## 還原方式

### 方式一：完整還原（推薦）

```sql
-- 使用 full-dump.sql 一次還原所有 Schema + 資料
mysql -u {user} -p {database} < full-dump.sql
```

### 方式二：僅還原 Schema

```sql
-- 只建立資料表結構，不匯入資料
mysql -u {user} -p {database} < schema.sql
```

### 方式三：還原特定資料表

```sql
-- 先確保 Schema 已建立，再匯入特定表的資料
mysql -u {user} -p {database} < tables/game_monster_catalog.sql
```

### 方式四：使用 Drizzle 遷移

```bash
# 使用 Drizzle Kit 重建資料庫結構
pnpm db:push
```

---

*由 Oracle Resonance 自動匯出腳本生成*
*腳本位置: `oracle-resonance/scripts/export-db.mjs`*