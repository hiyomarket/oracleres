/**
 * Boss 種子資料腳本
 * 預設 Tier 1 五隻 + Tier 2 兩隻 + Tier 3 兩隻
 * 執行: node seed-bosses.mjs
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════
// Tier 1 Boss：遊蕩精英（常駐，縣市內巡迴）
// ═══════════════════════════════════════════════════════════════

const TIER1_BOSSES = [
  {
    bossCode: "boss_kete",
    name: "克特",
    title: "暗影獵手",
    tier: 1,
    wuxing: "水",
    level: 25,
    baseHp: 4500,
    baseAttack: 75,
    baseDefense: 35,
    baseSpeed: 30,
    baseMagicAttack: 55,
    baseMagicDefense: 30,
    skills: JSON.stringify([
      { id: "kete_slash", name: "暗影斬", skillType: "attack", damageMultiplier: 1.3, mpCost: 8, wuxing: "水", cooldown: 2, additionalEffect: { type: "bleed", chance: 30, duration: 3, value: 15 } },
      { id: "kete_mist", name: "迷霧術", skillType: "debuff", damageMultiplier: 0.8, mpCost: 12, wuxing: "水", cooldown: 4, additionalEffect: { type: "blind", chance: 50, duration: 2 } },
    ]),
    dropTable: JSON.stringify([
      { itemId: "boss_kete_fang", itemName: "克特之牙", dropRate: 0.15, minQty: 1, maxQty: 1 },
      { itemId: "shadow_essence", itemName: "暗影精華", dropRate: 0.30, minQty: 1, maxQty: 3 },
    ]),
    expMultiplier: 2.0,
    goldMultiplier: 2.0,
    moveIntervalSec: 300,
    lifetimeMinutes: 0,
    staminaCost: 15,
    patrolRegion: JSON.stringify(["台北市", "新北市"]),
    description: "潛伏在都市暗巷中的影殺者，擅長水系暗影攻擊，行蹤不定。",
    enrageConfig: JSON.stringify({
      hpThresholds: [
        { hpPercent: 50, atkBoost: 1.2, spdBoost: 1.1, message: "克特的眼神變得更加銳利！" },
        { hpPercent: 25, atkBoost: 1.5, spdBoost: 1.3, message: "克特進入暴走狀態！暗影之力爆發！" },
      ],
    }),
    scheduleConfig: JSON.stringify({ type: "always", maxInstances: 1 }),
  },
  {
    bossCode: "boss_dark_elder",
    name: "黑長老",
    title: "深淵祭司",
    tier: 1,
    wuxing: "土",
    level: 28,
    baseHp: 5500,
    baseAttack: 60,
    baseDefense: 50,
    baseSpeed: 20,
    baseMagicAttack: 80,
    baseMagicDefense: 45,
    skills: JSON.stringify([
      { id: "elder_curse", name: "深淵詛咒", skillType: "debuff", damageMultiplier: 1.1, mpCost: 15, wuxing: "土", cooldown: 3, additionalEffect: { type: "curse", chance: 40, duration: 4, value: 20 } },
      { id: "elder_drain", name: "生命汲取", skillType: "attack", damageMultiplier: 1.0, mpCost: 10, cooldown: 2, additionalEffect: { type: "lifesteal", chance: 100, value: 30 } },
      { id: "elder_shield", name: "土盾術", skillType: "heal", damageMultiplier: 0, mpCost: 20, cooldown: 5 },
    ]),
    dropTable: JSON.stringify([
      { itemId: "boss_elder_staff", itemName: "黑長老法杖", dropRate: 0.10, minQty: 1, maxQty: 1 },
      { itemId: "dark_crystal", itemName: "暗黑水晶", dropRate: 0.25, minQty: 1, maxQty: 2 },
    ]),
    expMultiplier: 2.2,
    goldMultiplier: 2.0,
    moveIntervalSec: 360,
    lifetimeMinutes: 0,
    staminaCost: 15,
    patrolRegion: JSON.stringify(["台中市", "彰化縣", "南投縣"]),
    description: "隱居在中部山林的古老祭司，精通土系法術和詛咒之力。",
    enrageConfig: JSON.stringify({
      hpThresholds: [
        { hpPercent: 50, atkBoost: 1.3, spdBoost: 1.0, message: "黑長老開始吟唱古老咒語！" },
        { hpPercent: 25, atkBoost: 1.6, spdBoost: 1.2, message: "黑長老召喚深淵之力！大地震動！" },
      ],
    }),
    scheduleConfig: JSON.stringify({ type: "always", maxInstances: 1 }),
  },
  {
    bossCode: "boss_ancient_bull",
    name: "古牛",
    title: "鐵蹄巨獸",
    tier: 1,
    wuxing: "土",
    level: 30,
    baseHp: 7000,
    baseAttack: 90,
    baseDefense: 60,
    baseSpeed: 15,
    baseMagicAttack: 30,
    baseMagicDefense: 35,
    skills: JSON.stringify([
      { id: "bull_charge", name: "鐵蹄衝鋒", skillType: "attack", damageMultiplier: 1.5, mpCost: 10, cooldown: 3, additionalEffect: { type: "stun", chance: 25, duration: 1 } },
      { id: "bull_stomp", name: "地震踐踏", skillType: "attack", damageMultiplier: 1.2, mpCost: 8, wuxing: "土", cooldown: 2, additionalEffect: { type: "slow", chance: 40, duration: 2, value: 30 } },
    ]),
    dropTable: JSON.stringify([
      { itemId: "boss_bull_horn", itemName: "古牛之角", dropRate: 0.12, minQty: 1, maxQty: 1 },
      { itemId: "iron_hide", itemName: "鐵皮碎片", dropRate: 0.35, minQty: 1, maxQty: 3 },
    ]),
    expMultiplier: 2.5,
    goldMultiplier: 2.5,
    moveIntervalSec: 420,
    lifetimeMinutes: 0,
    staminaCost: 18,
    patrolRegion: JSON.stringify(["高雄市", "屏東縣"]),
    description: "南部平原上的遠古巨獸，擁有堅不可摧的鐵皮和毀滅性的衝鋒。",
    enrageConfig: JSON.stringify({
      hpThresholds: [
        { hpPercent: 50, atkBoost: 1.3, spdBoost: 1.2, message: "古牛怒吼！地面開始震動！" },
        { hpPercent: 25, atkBoost: 1.8, spdBoost: 1.5, message: "古牛狂暴化！鐵蹄踏碎大地！" },
      ],
    }),
    scheduleConfig: JSON.stringify({ type: "always", maxInstances: 1 }),
  },
  {
    bossCode: "boss_reverse_walker",
    name: "逆位行者",
    title: "命運逆轉者",
    tier: 1,
    wuxing: "金",
    level: 27,
    baseHp: 4000,
    baseAttack: 70,
    baseDefense: 30,
    baseSpeed: 35,
    baseMagicAttack: 75,
    baseMagicDefense: 40,
    skills: JSON.stringify([
      { id: "walker_reverse", name: "命運逆轉", skillType: "debuff", damageMultiplier: 1.0, mpCost: 18, wuxing: "金", cooldown: 4, additionalEffect: { type: "confuse", chance: 35, duration: 2 } },
      { id: "walker_blade", name: "逆刃斬", skillType: "attack", damageMultiplier: 1.4, mpCost: 10, wuxing: "金", cooldown: 2, additionalEffect: { type: "bleed", chance: 25, duration: 3, value: 12 } },
      { id: "walker_mirror", name: "鏡像反射", skillType: "debuff", damageMultiplier: 0.6, mpCost: 15, cooldown: 5, additionalEffect: { type: "reflect", chance: 100, duration: 2, value: 30 } },
    ]),
    dropTable: JSON.stringify([
      { itemId: "boss_walker_card", itemName: "逆位塔羅牌", dropRate: 0.12, minQty: 1, maxQty: 1 },
      { itemId: "fate_shard", itemName: "命運碎片", dropRate: 0.28, minQty: 1, maxQty: 2 },
    ]),
    expMultiplier: 2.0,
    goldMultiplier: 2.0,
    moveIntervalSec: 240,
    lifetimeMinutes: 0,
    staminaCost: 15,
    patrolRegion: JSON.stringify(["桃園市", "新竹市", "新竹縣"]),
    description: "在北部科技走廊遊蕩的神秘行者，能逆轉命運的金系高手。",
    enrageConfig: JSON.stringify({
      hpThresholds: [
        { hpPercent: 50, atkBoost: 1.2, spdBoost: 1.3, message: "逆位行者的塔羅牌開始旋轉！" },
        { hpPercent: 25, atkBoost: 1.5, spdBoost: 1.5, message: "逆位行者啟動命運逆轉！所有數值反轉！" },
      ],
    }),
    scheduleConfig: JSON.stringify({ type: "always", maxInstances: 1 }),
  },
  {
    bossCode: "boss_azure_dragon",
    name: "蒼龍",
    title: "東方守護龍",
    tier: 1,
    wuxing: "木",
    level: 32,
    baseHp: 6000,
    baseAttack: 85,
    baseDefense: 45,
    baseSpeed: 28,
    baseMagicAttack: 90,
    baseMagicDefense: 50,
    skills: JSON.stringify([
      { id: "dragon_breath", name: "蒼龍吐息", skillType: "attack", damageMultiplier: 1.6, mpCost: 20, wuxing: "木", cooldown: 3, additionalEffect: { type: "poison", chance: 35, duration: 3, value: 18 } },
      { id: "dragon_claw", name: "龍爪擊", skillType: "attack", damageMultiplier: 1.3, mpCost: 8, cooldown: 1 },
      { id: "dragon_roar", name: "龍嘯", skillType: "debuff", damageMultiplier: 0.5, mpCost: 15, cooldown: 4, additionalEffect: { type: "fear", chance: 30, duration: 2 } },
    ]),
    dropTable: JSON.stringify([
      { itemId: "boss_dragon_scale", itemName: "蒼龍鱗片", dropRate: 0.10, minQty: 1, maxQty: 1 },
      { itemId: "dragon_essence", itemName: "龍氣精華", dropRate: 0.25, minQty: 1, maxQty: 2 },
      { itemId: "wood_crystal", itemName: "木靈結晶", dropRate: 0.40, minQty: 1, maxQty: 3 },
    ]),
    expMultiplier: 2.5,
    goldMultiplier: 2.5,
    moveIntervalSec: 360,
    lifetimeMinutes: 0,
    staminaCost: 20,
    patrolRegion: JSON.stringify(["宜蘭縣", "花蓮縣", "台東縣"]),
    description: "守護東部山脈的遠古蒼龍，木系之力源源不絕，是五行守護獸之首。",
    enrageConfig: JSON.stringify({
      hpThresholds: [
        { hpPercent: 50, atkBoost: 1.3, spdBoost: 1.2, message: "蒼龍仰天長嘯！木靈之力覺醒！" },
        { hpPercent: 25, atkBoost: 1.7, spdBoost: 1.4, message: "蒼龍進入狂暴狀態！龍氣席捲四方！" },
      ],
    }),
    scheduleConfig: JSON.stringify({ type: "always", maxInstances: 1 }),
  },
];

// ═══════════════════════════════════════════════════════════════
// Tier 2 Boss：區域守護者（定時刷新，跨縣市移動）
// ═══════════════════════════════════════════════════════════════

const TIER2_BOSSES = [
  {
    bossCode: "boss_death_knight",
    name: "死亡騎士",
    title: "冥界將軍",
    tier: 2,
    wuxing: "金",
    level: 40,
    baseHp: 15000,
    baseAttack: 120,
    baseDefense: 70,
    baseSpeed: 25,
    baseMagicAttack: 100,
    baseMagicDefense: 55,
    skills: JSON.stringify([
      { id: "dk_execute", name: "斬首之刃", skillType: "attack", damageMultiplier: 2.0, mpCost: 25, wuxing: "金", cooldown: 4, additionalEffect: { type: "bleed", chance: 50, duration: 3, value: 25 } },
      { id: "dk_aura", name: "死亡光環", skillType: "debuff", damageMultiplier: 0.8, mpCost: 20, cooldown: 3, additionalEffect: { type: "weaken", chance: 60, duration: 3, value: 20 } },
      { id: "dk_summon", name: "亡靈召喚", skillType: "attack", damageMultiplier: 1.5, mpCost: 30, cooldown: 5, additionalEffect: { type: "fear", chance: 40, duration: 2 } },
      { id: "dk_shield", name: "冥界護盾", skillType: "heal", damageMultiplier: 0, mpCost: 25, cooldown: 6 },
    ]),
    dropTable: JSON.stringify([
      { itemId: "boss_dk_sword", itemName: "冥界斷罪劍", dropRate: 0.05, minQty: 1, maxQty: 1 },
      { itemId: "boss_dk_armor", itemName: "死亡騎士鎧甲碎片", dropRate: 0.08, minQty: 1, maxQty: 1 },
      { itemId: "death_essence", itemName: "冥界精華", dropRate: 0.20, minQty: 1, maxQty: 3 },
      { itemId: "gold_crystal", itemName: "金靈結晶", dropRate: 0.30, minQty: 2, maxQty: 5 },
    ]),
    expMultiplier: 4.0,
    goldMultiplier: 4.0,
    moveIntervalSec: 600,
    lifetimeMinutes: 120,
    staminaCost: 30,
    patrolRegion: JSON.stringify(["台北市", "新北市", "桃園市", "基隆市"]),
    description: "從冥界歸來的將軍，率領亡靈軍團在北部都會區巡迴，金系斬擊威力驚人。每兩小時出現一次。",
    enrageConfig: JSON.stringify({
      hpThresholds: [
        { hpPercent: 50, atkBoost: 1.4, spdBoost: 1.2, message: "死亡騎士舉起斷罪劍！冥界之門微啟！" },
        { hpPercent: 25, atkBoost: 1.8, spdBoost: 1.5, message: "死亡騎士狂暴化！冥界之力全開！亡靈軍團降臨！" },
      ],
    }),
    scheduleConfig: JSON.stringify({
      type: "scheduled",
      fixedTimes: ["08:00", "12:00", "18:00", "22:00"],
      maxInstances: 1,
    }),
  },
  {
    bossCode: "boss_ruby",
    name: "露比",
    title: "烈焰女皇",
    tier: 2,
    wuxing: "火",
    level: 42,
    baseHp: 13000,
    baseAttack: 100,
    baseDefense: 55,
    baseSpeed: 30,
    baseMagicAttack: 130,
    baseMagicDefense: 65,
    skills: JSON.stringify([
      { id: "ruby_inferno", name: "烈焰風暴", skillType: "attack", damageMultiplier: 1.8, mpCost: 25, wuxing: "火", cooldown: 3, additionalEffect: { type: "burn", chance: 60, duration: 3, value: 20 } },
      { id: "ruby_charm", name: "魅惑之眼", skillType: "debuff", damageMultiplier: 0.5, mpCost: 20, cooldown: 4, additionalEffect: { type: "confuse", chance: 45, duration: 2 } },
      { id: "ruby_meteor", name: "隕石召喚", skillType: "attack", damageMultiplier: 2.2, mpCost: 35, wuxing: "火", cooldown: 5 },
      { id: "ruby_heal", name: "鳳凰重生", skillType: "heal", damageMultiplier: 0, mpCost: 30, cooldown: 8 },
    ]),
    dropTable: JSON.stringify([
      { itemId: "boss_ruby_gem", itemName: "露比之心", dropRate: 0.05, minQty: 1, maxQty: 1 },
      { itemId: "boss_ruby_robe", itemName: "烈焰女皇法袍碎片", dropRate: 0.08, minQty: 1, maxQty: 1 },
      { itemId: "fire_essence", itemName: "烈焰精華", dropRate: 0.22, minQty: 1, maxQty: 3 },
      { itemId: "fire_crystal", itemName: "火靈結晶", dropRate: 0.30, minQty: 2, maxQty: 5 },
    ]),
    expMultiplier: 4.5,
    goldMultiplier: 4.0,
    moveIntervalSec: 480,
    lifetimeMinutes: 120,
    staminaCost: 30,
    patrolRegion: JSON.stringify(["台南市", "高雄市", "嘉義市", "嘉義縣"]),
    description: "統治南部火山地帶的烈焰女皇，火系法術毀天滅地。每兩小時出現一次。",
    enrageConfig: JSON.stringify({
      hpThresholds: [
        { hpPercent: 50, atkBoost: 1.5, spdBoost: 1.3, message: "露比的火焰變為深紅色！溫度急劇上升！" },
        { hpPercent: 25, atkBoost: 2.0, spdBoost: 1.5, message: "露比進入鳳凰形態！烈焰席捲一切！" },
      ],
    }),
    scheduleConfig: JSON.stringify({
      type: "scheduled",
      fixedTimes: ["10:00", "14:00", "20:00", "00:00"],
      maxInstances: 1,
    }),
  },
];

// ═══════════════════════════════════════════════════════════════
// Tier 3 Boss：天命凶獸（條件觸發，全島巡迴）
// ═══════════════════════════════════════════════════════════════

const TIER3_BOSSES = [
  {
    bossCode: "boss_chaos_emperor",
    name: "混沌帝王",
    title: "天命終焉者",
    tier: 3,
    wuxing: "火",
    level: 55,
    baseHp: 50000,
    baseAttack: 180,
    baseDefense: 100,
    baseSpeed: 35,
    baseMagicAttack: 200,
    baseMagicDefense: 90,
    skills: JSON.stringify([
      { id: "chaos_annihilate", name: "混沌湮滅", skillType: "attack", damageMultiplier: 2.5, mpCost: 40, wuxing: "火", cooldown: 4, additionalEffect: { type: "burn", chance: 70, duration: 4, value: 30 } },
      { id: "chaos_void", name: "虛空裂隙", skillType: "attack", damageMultiplier: 2.0, mpCost: 35, cooldown: 3, additionalEffect: { type: "curse", chance: 50, duration: 3, value: 25 } },
      { id: "chaos_drain", name: "天命吞噬", skillType: "debuff", damageMultiplier: 1.5, mpCost: 30, cooldown: 5, additionalEffect: { type: "weaken", chance: 80, duration: 4, value: 30 } },
      { id: "chaos_regen", name: "混沌再生", skillType: "heal", damageMultiplier: 0, mpCost: 50, cooldown: 8 },
      { id: "chaos_ultimate", name: "終焉審判", skillType: "attack", damageMultiplier: 3.0, mpCost: 60, wuxing: "火", cooldown: 7 },
    ]),
    dropTable: JSON.stringify([
      { itemId: "boss_chaos_crown", itemName: "混沌帝冠", dropRate: 0.02, minQty: 1, maxQty: 1 },
      { itemId: "boss_chaos_orb", itemName: "混沌之球", dropRate: 0.05, minQty: 1, maxQty: 1 },
      { itemId: "chaos_essence", itemName: "混沌精華", dropRate: 0.15, minQty: 1, maxQty: 3 },
      { itemId: "legendary_crystal", itemName: "傳說結晶", dropRate: 0.10, minQty: 1, maxQty: 2 },
      { itemId: "destiny_shard", itemName: "天命碎片", dropRate: 0.20, minQty: 2, maxQty: 5 },
    ]),
    expMultiplier: 8.0,
    goldMultiplier: 8.0,
    moveIntervalSec: 900,
    lifetimeMinutes: 60,
    staminaCost: 50,
    patrolRegion: JSON.stringify("all"),
    description: "當全島累計擊殺足夠多的精英怪物後，天命終焉者將從混沌中降臨。牠是五行之力的扭曲體現，全島巡迴，挑戰者需集結最強戰力方能一戰。",
    enrageConfig: JSON.stringify({
      hpThresholds: [
        { hpPercent: 75, atkBoost: 1.2, spdBoost: 1.1, message: "混沌帝王微微皺眉...牠開始認真了。" },
        { hpPercent: 50, atkBoost: 1.5, spdBoost: 1.3, message: "混沌帝王怒吼！天地變色！五行紊亂！" },
        { hpPercent: 25, atkBoost: 2.0, spdBoost: 1.5, message: "混沌帝王進入終焉形態！毀滅之力席捲全島！" },
        { hpPercent: 10, atkBoost: 2.5, spdBoost: 2.0, message: "混沌帝王瀕死狂暴！天命共振達到極限！" },
      ],
    }),
    scheduleConfig: JSON.stringify({
      type: "triggered",
      triggerCondition: "全服累計擊殺 Tier 1 Boss 達到 100 次",
      maxInstances: 1,
    }),
  },
  {
    bossCode: "boss_void_serpent",
    name: "虛無巨蛇",
    title: "深淵吞噬者",
    tier: 3,
    wuxing: "水",
    level: 50,
    baseHp: 40000,
    baseAttack: 150,
    baseDefense: 80,
    baseSpeed: 40,
    baseMagicAttack: 170,
    baseMagicDefense: 85,
    skills: JSON.stringify([
      { id: "serpent_devour", name: "虛無吞噬", skillType: "attack", damageMultiplier: 2.2, mpCost: 35, wuxing: "水", cooldown: 3, additionalEffect: { type: "poison", chance: 60, duration: 4, value: 25 } },
      { id: "serpent_coil", name: "纏繞束縛", skillType: "debuff", damageMultiplier: 1.0, mpCost: 25, cooldown: 4, additionalEffect: { type: "stun", chance: 40, duration: 1 } },
      { id: "serpent_venom", name: "劇毒之霧", skillType: "debuff", damageMultiplier: 0.8, mpCost: 20, wuxing: "水", cooldown: 3, additionalEffect: { type: "poison", chance: 80, duration: 5, value: 20 } },
      { id: "serpent_regen", name: "蛻皮再生", skillType: "heal", damageMultiplier: 0, mpCost: 40, cooldown: 7 },
      { id: "serpent_ultimate", name: "深淵漩渦", skillType: "attack", damageMultiplier: 2.8, mpCost: 50, wuxing: "水", cooldown: 6 },
    ]),
    dropTable: JSON.stringify([
      { itemId: "boss_serpent_fang", itemName: "虛無巨蛇之牙", dropRate: 0.03, minQty: 1, maxQty: 1 },
      { itemId: "boss_serpent_scale", itemName: "深淵鱗甲", dropRate: 0.06, minQty: 1, maxQty: 1 },
      { itemId: "void_essence", itemName: "虛無精華", dropRate: 0.15, minQty: 1, maxQty: 3 },
      { itemId: "legendary_crystal", itemName: "傳說結晶", dropRate: 0.08, minQty: 1, maxQty: 2 },
      { itemId: "water_crystal", itemName: "水靈結晶", dropRate: 0.25, minQty: 2, maxQty: 5 },
    ]),
    expMultiplier: 7.0,
    goldMultiplier: 7.0,
    moveIntervalSec: 720,
    lifetimeMinutes: 90,
    staminaCost: 45,
    patrolRegion: JSON.stringify("all"),
    description: "潛伏在虛無深淵中的遠古巨蛇，當世界的平衡被打破時便會現身。全島巡迴，以劇毒和束縛聞名。",
    enrageConfig: JSON.stringify({
      hpThresholds: [
        { hpPercent: 75, atkBoost: 1.2, spdBoost: 1.2, message: "虛無巨蛇的瞳孔收縮...牠感受到了威脅。" },
        { hpPercent: 50, atkBoost: 1.5, spdBoost: 1.4, message: "虛無巨蛇發出嘶吼！劇毒之霧瀰漫！" },
        { hpPercent: 25, atkBoost: 1.8, spdBoost: 1.6, message: "虛無巨蛇進入深淵形態！虛空裂隙擴大！" },
      ],
    }),
    scheduleConfig: JSON.stringify({
      type: "triggered",
      triggerCondition: "全服累計擊殺 Tier 1 Boss 達到 150 次",
      maxInstances: 1,
    }),
  },
];

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);
  console.log("Connected to database");

  const now = Date.now();
  const allBosses = [...TIER1_BOSSES, ...TIER2_BOSSES, ...TIER3_BOSSES];

  for (const boss of allBosses) {
    // Check if boss already exists
    const [existing] = await conn.execute(
      "SELECT id FROM roaming_boss_catalog WHERE boss_code = ?",
      [boss.bossCode]
    );

    if (Array.isArray(existing) && existing.length > 0) {
      console.log(`Boss ${boss.name} (${boss.bossCode}) already exists, updating...`);
      await conn.execute(
        `UPDATE roaming_boss_catalog SET
          name = ?, title = ?, tier = ?, wuxing = ?, level = ?,
          base_hp = ?, base_attack = ?, base_defense = ?, base_speed = ?,
          base_magic_attack = ?, base_magic_defense = ?,
          skills = ?, drop_table = ?,
          exp_multiplier = ?, gold_multiplier = ?,
          move_interval_sec = ?, lifetime_minutes = ?, stamina_cost = ?,
          patrol_region = ?, description = ?,
          enrage_config = ?, schedule_config = ?,
          is_active = 1, updated_at = ?
        WHERE boss_code = ?`,
        [
          boss.name, boss.title, boss.tier, boss.wuxing, boss.level,
          boss.baseHp, boss.baseAttack, boss.baseDefense, boss.baseSpeed,
          boss.baseMagicAttack, boss.baseMagicDefense,
          boss.skills, boss.dropTable,
          boss.expMultiplier, boss.goldMultiplier,
          boss.moveIntervalSec, boss.lifetimeMinutes, boss.staminaCost,
          boss.patrolRegion, boss.description,
          boss.enrageConfig, boss.scheduleConfig,
          now, boss.bossCode,
        ]
      );
    } else {
      console.log(`Creating Boss: ${boss.name} (${boss.bossCode}) - Tier ${boss.tier}`);
      await conn.execute(
        `INSERT INTO roaming_boss_catalog (
          boss_code, name, title, tier, wuxing, level,
          base_hp, base_attack, base_defense, base_speed,
          base_magic_attack, base_magic_defense,
          skills, drop_table,
          exp_multiplier, gold_multiplier,
          move_interval_sec, lifetime_minutes, stamina_cost,
          patrol_region, description,
          enrage_config, schedule_config,
          is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [
          boss.bossCode, boss.name, boss.title, boss.tier, boss.wuxing, boss.level,
          boss.baseHp, boss.baseAttack, boss.baseDefense, boss.baseSpeed,
          boss.baseMagicAttack, boss.baseMagicDefense,
          boss.skills, boss.dropTable,
          boss.expMultiplier, boss.goldMultiplier,
          boss.moveIntervalSec, boss.lifetimeMinutes, boss.staminaCost,
          boss.patrolRegion, boss.description,
          boss.enrageConfig, boss.scheduleConfig,
          now, now,
        ]
      );
    }
  }

  console.log(`\nDone! Seeded ${allBosses.length} bosses:`);
  console.log(`  Tier 1: ${TIER1_BOSSES.length} (克特、黑長老、古牛、逆位行者、蒼龍)`);
  console.log(`  Tier 2: ${TIER2_BOSSES.length} (死亡騎士、露比)`);
  console.log(`  Tier 3: ${TIER3_BOSSES.length} (混沌帝王、虛無巨蛇 - 條件觸發)`);

  await conn.end();
}

main().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
