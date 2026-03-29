# Bug Investigation Notes

## Root Causes Found

### Bug 1: All shop purchases store itemType as "consumable"
- `buyGameShopItem` in `server/routers/gameWorld.ts` lines 2280 and 2322
- Both coin shop and spirit shop hardcode `itemType: "consumable"` when inserting into `agentInventory`
- This means equipment (E_M001 鐵劍), scrolls (I_SCR_WPN), quest items (I_M001 戰士之證) all become "consumable"

### Bug 2: getInventory only queries equipment catalog for items with itemType === 'equipment'
- Line 1342: `const equipItemIds = items.filter(i => i.itemType === 'equipment').map(i => i.itemId);`
- Since all shop items are stored as "consumable", equipment names are never resolved from equipment catalog
- Items like "iron_sword" and "E_M001" show raw IDs instead of Chinese names

### Bug 3: Frontend shows "使用" button for all consumable items
- CharacterPanel.tsx line 694: `(item.itemType === "consumable" || item.itemType === "potion")`
- Since everything is "consumable", scrolls, quest items, and equipment all show "使用" button
- useItem backend (line 1913) only checks `invItem.itemType !== "consumable"` - since they're all consumable, it proceeds
- For items without use_effect (quest items, scrolls), it just decrements quantity with no actual effect

### Bug 4: iron_sword is not in any catalog
- iron_sword exists in purchase logs from shop_item_id 33472 (now deleted from shop)
- It's not in game_item_catalog or game_equipment_catalog
- So getInventory falls back to showing raw itemId "iron_sword"

## Fix Plan

### 1. Fix buyGameShopItem to determine correct itemType
- Check game_item_catalog for the itemKey -> map category to itemType
- Check game_equipment_catalog for the itemKey -> set itemType to "equipment"
- Fallback to "consumable" only for items not in any catalog

### 2. Fix getInventory to resolve names for ALL items (not just equipment-typed ones)
- Always check both item catalog AND equipment catalog regardless of stored itemType
- Also set correct itemType in the return based on catalog data

### 3. Fix useItem to validate that the item actually has a use_effect
- Don't just check itemType === "consumable"
- Also check that the item has a valid use_effect in the catalog
- Reject items that are scrolls, quest items, or have no use_effect

### 4. Fix frontend to only show "使用" for truly usable items
- Backend should return a `canUse` flag based on catalog data
- Frontend should check this flag instead of just itemType

### 5. Fix existing corrupted inventory data
- Update existing items in agent_inventory to correct itemType based on catalog
