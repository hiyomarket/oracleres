# 技能系統 + 道具裝備系統 測試發現

## 主帳號角色資料
- 角色 ID: 8, 用戶 ID: 1
- 角色名: 凜冬月
- 等級: 11, 五行: 木 (wood)
- 所有裝備欄位: 全部 NULL（未裝備任何東西）
- 背包: 27 材料 + 5 消耗品，0 裝備，0 技能書

## 技能系統問題

### BUG-1: installSkill 不清除舊槽位的 agentSkills.installedSlot
- 兩個技能 S_W005 和 S_F004 的 installed_slot 都是 "skillSlot3"
- 原因: installSkill (gameWorld.ts:1519) 只更新 gameAgents 表的槽位欄位和當前技能的 agentSkills.installedSlot
- 但沒有清除被替換技能的 agentSkills.installedSlot
- 例如: 先安裝 S_W005 到 slot3，再安裝 S_F004 到 slot3 時，S_W005 的 installedSlot 仍然是 "skillSlot3"

### BUG-2: installSkill 和 equipSkill 是兩套獨立系統
- gameWorld.installSkill: 寫入 gameAgents 的 skillSlot1-4 欄位，同時更新 agentSkills.installedSlot
- gameSkillSystem.equipSkill: 只更新 agentSkills.installedSlot，不更新 gameAgents 的 skillSlot 欄位
- 這兩套系統不同步！SkillCatalogPage 用 equipSkill，VirtualWorldPage 用 installSkill

### BUG-3: equipSkill 的 slot 清除邏輯有問題
- equipSkill (gameSkillSystem.ts:199) 在安裝新技能到 slot 前，會清除該 slot 的舊技能
- 但它只清除 agentSkills 表的 installedSlot，不清除 gameAgents 表的 skillSlot 欄位
- 導致 gameAgents 和 agentSkills 的資料不一致

### BUG-4: SkillCatalogPage 裝備只能裝到 skillSlot1
- SkillCatalogPage.tsx:442 硬編碼 slot: "skillSlot1"
- 沒有讓玩家選擇要裝到哪個槽位

## 道具裝備系統問題

### BUG-5: 兩套裝備系統並存
- equipItem (gameWorld.ts:1707): 從 gameEquipmentCatalog 查裝備，寫入 gameAgents 的 equipped_* 欄位
- equipDroppedItem (gameWorld.ts:2012): 從 agentInventory 查裝備，更新 agentInventory 的 isEquipped/equippedSlot
- 這兩套系統完全獨立！equipItem 不檢查背包，equipDroppedItem 不更新 gameAgents

### BUG-6: equipDroppedItem 計算了裝備加成但沒有寫入 gameAgents
- 計算了 equipBonuses (hp/atk/def/spd/matk/mp) 但只 console.log
- 沒有實際更新角色屬性

### BUG-7: sellInventoryItem 的 isEquipped 檢查
- 正確檢查了 isEquipped 防止販售裝備中的裝備
- 但 equipItem 系統的裝備不在 agentInventory 中標記 isEquipped
- 所以如果用 equipItem 裝備的東西，sellInventoryItem 無法正確阻擋

### BUG-8: 掉落物 itemType 判斷
- tickEngine.ts:1309-1315 用 itemId 前綴判斷類型
- 但 rollEquipmentDrops 產生的裝備 ID 格式可能不以 "equip" 開頭
- 需要確認 rollEquipmentDrops 產生的 ID 格式

## 修復計畫
1. 統一技能安裝系統: installSkill 應同時更新 gameAgents 和 agentSkills，並清除被替換技能
2. 統一裝備系統: 以 agentInventory 為主，equipItem 也應更新 agentInventory
3. equipDroppedItem 應實際寫入裝備加成到 gameAgents
4. SkillCatalogPage 應讓玩家選擇槽位
