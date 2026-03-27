/**
 * seed-battle-items.mjs
 * 為所有消耗品填入 useEffect 並標記 usableInBattle
 */
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// 根據道具名稱推斷效果
const ITEM_EFFECTS = {
  // ─── 木系 ───
  "初級解毒草":    { type: "cure_status", value: 0, description: "清除中毒狀態" },
  "活力樹汁":      { type: "heal_hp", value: 20, description: "恢復 20% HP" },
  "森林精華":      { type: "heal_hp", value: 35, description: "恢復 35% HP" },
  "荊棘護甲藥劑":  { type: "def_boost", value: 15, duration: 3, description: "防禦力提升 15%，持續 3 回合" },
  "疾風草":        { type: "atk_boost", value: 10, duration: 2, description: "攻擊力提升 10%，持續 2 回合" },
  "劇毒塗劑":      { type: "atk_boost", value: 20, duration: 3, description: "武器附毒，攻擊力提升 20%，持續 3 回合" },
  "迷幻花粉":      { type: "atk_boost", value: 5, duration: 1, description: "使敵人混亂（戰鬥用增益）" },
  "復甦之風":      { type: "revive", value: 30, description: "復活倒下的隊友，恢復 30% HP" },
  "萬能解毒劑":    { type: "cure_status", value: 0, description: "清除所有異常狀態" },
  "生命之水":      { type: "heal_hp", value: 50, description: "恢復 50% HP" },
  "小靈泉":        { type: "heal_mp", value: 20, description: "恢復 20% MP" },
  // ─── 火系 ───
  "初級燒傷藥":    { type: "cure_status", value: 0, description: "清除燒傷狀態" },
  "狂暴藥水":      { type: "atk_boost", value: 25, duration: 3, description: "攻擊力提升 25%，持續 3 回合" },
  "烈焰炸彈":      { type: "atk_boost", value: 30, duration: 1, description: "對敵方造成火焰傷害（增益型）" },
  "鳳凰之血":      { type: "revive", value: 50, description: "復活倒下的隊友，恢復 50% HP" },
  // ─── 土系 ───
  "鐵甲藥劑":      { type: "def_boost", value: 20, duration: 3, description: "防禦力提升 20%，持續 3 回合" },
  "磐石護盾":      { type: "def_boost", value: 30, duration: 3, description: "防禦力提升 30%，持續 3 回合" },
  // ─── 金系 ───
  "磨刀石":        { type: "atk_boost", value: 15, duration: 3, description: "攻擊力提升 15%，持續 3 回合" },
  "疾風藥劑":      { type: "atk_boost", value: 10, duration: 2, description: "速度和攻擊提升 10%，持續 2 回合" },
  "煙霧彈":        { type: "def_boost", value: 10, duration: 2, description: "閃避提升（防禦增益），持續 2 回合" },
  // ─── 水系 ───
  "靈泉水":        { type: "heal_mp", value: 30, description: "恢復 30% MP" },
  "冰凍藥劑":      { type: "def_boost", value: 15, duration: 2, description: "冰甲效果，防禦提升 15%，持續 2 回合" },
  "寒冰護盾":      { type: "def_boost", value: 25, duration: 3, description: "寒冰護盾，防禦提升 25%，持續 3 回合" },
  "淨化之水":      { type: "cure_status", value: 0, description: "清除所有異常狀態" },
  "海神之淚":      { type: "heal_hp", value: 60, description: "恢復 60% HP" },
};

// 查詢所有消耗品
const [consumables] = await conn.execute("SELECT id, item_id, name FROM game_item_catalog WHERE category = 'consumable'");
console.log(`Found ${consumables.length} consumables`);

let updated = 0;
for (const item of consumables) {
  const effect = ITEM_EFFECTS[item.name];
  if (effect) {
    await conn.execute(
      "UPDATE game_item_catalog SET use_effect = ?, usable_in_battle = 1 WHERE id = ?",
      [JSON.stringify(effect), item.id]
    );
    updated++;
    console.log(`  ✓ ${item.name} → ${effect.type} (${effect.description})`);
  } else {
    // 根據名稱模糊匹配
    const name = item.name;
    let autoEffect = null;
    if (name.includes("解毒") || name.includes("淨化")) {
      autoEffect = { type: "cure_status", value: 0, description: "清除異常狀態" };
    } else if (name.includes("復甦") || name.includes("復活") || name.includes("鳳凰")) {
      autoEffect = { type: "revive", value: 30, description: "復活倒下的隊友，恢復 30% HP" };
    } else if (name.includes("回復") || name.includes("治療") || name.includes("生命") || name.includes("血")) {
      autoEffect = { type: "heal_hp", value: 25, description: "恢復 25% HP" };
    } else if (name.includes("靈") || name.includes("法力") || name.includes("MP")) {
      autoEffect = { type: "heal_mp", value: 25, description: "恢復 25% MP" };
    } else if (name.includes("狂暴") || name.includes("力量") || name.includes("磨刀") || name.includes("攻擊")) {
      autoEffect = { type: "atk_boost", value: 15, duration: 3, description: "攻擊力提升 15%，持續 3 回合" };
    } else if (name.includes("護盾") || name.includes("鐵甲") || name.includes("防禦") || name.includes("護甲")) {
      autoEffect = { type: "def_boost", value: 15, duration: 3, description: "防禦力提升 15%，持續 3 回合" };
    } else if (name.includes("藥水") || name.includes("藥劑") || name.includes("丹")) {
      autoEffect = { type: "heal_hp", value: 20, description: "恢復 20% HP" };
    }
    
    if (autoEffect) {
      await conn.execute(
        "UPDATE game_item_catalog SET use_effect = ?, usable_in_battle = 1 WHERE id = ?",
        [JSON.stringify(autoEffect), item.id]
      );
      updated++;
      console.log(`  ✓ ${item.name} (auto) → ${autoEffect.type} (${autoEffect.description})`);
    } else {
      console.log(`  ✗ ${item.name} → 無法推斷效果，跳過`);
    }
  }
}

console.log(`\nDone! Updated ${updated}/${consumables.length} consumables with battle effects.`);
await conn.end();
