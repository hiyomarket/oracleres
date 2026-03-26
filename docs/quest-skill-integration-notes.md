# 天命考核技能系統 — 整合架構筆記

## 現有技能系統架構

### 技能定義層（兩套並行）
1. **skillTemplates** — 技能模板表（主要用於戰鬥引擎）
   - id: varchar(20), 如 S_Wd001
   - element, category, rarity, tier, mpCost, cooldown, effectValue
   - statusEffect, statusChance, targetType, comboTags
   - acquireMethod: shop/quest/drop/trigger

2. **gameSkillCatalog** — 技能圖鑑表（CMS 管理用）
   - skillId, name, wuxing, category, rarity, tier
   - mpCost, cooldown, powerPercent, learnLevel
   - acquireType: shop/drop/quest/craft/hidden
   - skillType: attack/heal/buff/debuff/passive/special

### 技能持有層
- **agentSkills** — 角色已習得技能（agentId + skillId + awakeTier + installedSlot）
- **skillBooks** — 技能書道具（掉落後需使用才習得）

### 技能裝備層
- **gameAgents** — skillSlot1~4 + passiveSlot1~2（6 格）
- agentSkills.installedSlot 指向具體槽位

### 戰鬥引擎讀取流程
1. processCombatEvent 從 agentSkills 讀取已裝備技能
2. 從 gameSkillCatalog 讀取技能數據（powerPercent, mpCost, wuxing, cooldown）
3. calcSkillCombo 計算 Combo 加成和命格加成
4. resolveCombat 使用技能進行戰鬥

## 天命考核技能的整合方案

### 核心設計決策
1. **天命考核技能 = 特殊的 skillTemplate** — 不建新的技能系統，而是擴展現有系統
2. **任務鏈 = 新的獨立系統** — 建立 questChain 表管理任務鏈
3. **NPC = 新的獨立圖鑑** — 建立 npcCatalog 表管理 NPC
4. **習得後走同一條路** — 習得後寫入 agentSkills，可裝備到 skillSlot，戰鬥引擎自動生效

### 新增資料表
1. **gameQuestSkillCatalog** — 天命考核技能圖鑑（22 個技能定義）
2. **gameQuestChain** — 任務鏈定義（每個技能的 3 步驟 + 最終確認）
3. **gameQuestStep** — 任務步驟定義（每步的目標、獎勵、地點）
4. **gameNpcCatalog** — NPC 圖鑑（任務鏈中的 NPC）
5. **playerQuestProgress** — 玩家任務進度追蹤

### 技能分類對應
- 攻擊系 S1-S8 → skillType: attack
- 戰鬥輔助系 A1-A8 → skillType: heal/buff/special
- 特殊功能系 X1-X3 → skillType: special
- 生產系 C1-C3 → skillType: life（非戰鬥技能，不進入戰鬥引擎）

### 前置條件系統
- questChain 表有 prerequisiteSkillId 欄位
- 習得技能前檢查 agentSkills 是否已有前置技能
