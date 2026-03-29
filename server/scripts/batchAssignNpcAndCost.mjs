/**
 * 批量分配 NPC 和學習代價到統一技能表
 * 
 * NPC 分配邏輯：
 * - 根據技能類別(category)和稀有度(rarity)分配對應的教導 NPC
 * - 初界 NPC → common 技能
 * - 中界 NPC → rare/epic 技能
 * - 迷霧城/碎影深淵 NPC → epic/legendary 技能
 * 
 * 學習代價邏輯：
 * - common: 金幣 100-500, 靈晶 0-10
 * - rare: 金幣 500-2000, 靈晶 10-50
 * - epic: 金幣 2000-5000, 靈晶 50-200
 * - legendary: 金幣 5000-15000, 靈晶 200-500
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not found");
  process.exit(1);
}

// Parse MySQL URL
const url = new URL(DATABASE_URL);
const connOpts = {
  host: url.hostname,
  port: parseInt(url.port) || 3306,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
};

// ─── NPC 分配映射 ───
// 戰鬥類 NPC
const PHYSICAL_NPCS = {
  common: [44, 49],    // 艾爾文・赤焰(初界), 格雷(初界)
  rare: [36, 40],      // 席拉(迷霧城), 艾拉(迷霧城)
  epic: [37, 41],      // 沃克恩(迷霧城), 托里戈(迷霧城)
  legendary: [39, 38], // 赫格莫斯(試煉之塔), 費蓮娜(碎影深淵)
};

// 魔法類 NPC
const MAGIC_NPCS = {
  common: [48, 46],    // 哈拉爾德(初界), 嵐德(初界)
  rare: [47, 50],      // 星見(中界), 尼克(中界)
  epic: [60, 58],      // 艾莉絲(中界), 蓮娜(中界)
  legendary: [60, 59], // 艾莉絲(中界), 塔洛斯(中界)
};

// 支援類 NPC
const SUPPORT_NPCS = {
  common: [45, 57],    // 菲莉亞(初界), 索菲亞(初界)
  rare: [54, 55],      // 艾文(初界), 琳娜(初界)
  epic: [56, 61],      // 馬修(中界), 靜源(中界)
  legendary: [64, 56], // 雷納德(中界), 馬修(中界)
};

// 狀態類 NPC
const STATUS_NPCS = {
  common: [51, 52],    // 米莉亞(初界), 艾爾文幽靈(初界)
  rare: [42, 43],      // 暮(迷霧城), 維克多(迷霧城)
  epic: [62, 59],      // 夜歌(中界), 塔洛斯(中界)
  legendary: [62, 42], // 夜歌(中界), 暮(迷霧城)
};

// 抗性類 NPC
const RESISTANCE_NPCS = {
  common: [49, 45],    // 格雷(初界), 菲莉亞(初界)
  rare: [56, 61],      // 馬修(中界), 靜源(中界)
  epic: [64, 39],      // 雷納德(中界), 赫格莫斯(試煉之塔)
  legendary: [64, 39], // 雷納德(中界), 赫格莫斯(試煉之塔)
};

// 特殊類 NPC
const SPECIAL_NPCS = {
  common: [46, 53],    // 嵐德(初界), 卡洛斯(初界)
  rare: [63, 42],      // 洛克斯(初界), 暮(迷霧城)
  epic: [38, 59],      // 費蓮娜(碎影深淵), 塔洛斯(中界)
  legendary: [38, 59], // 費蓮娜(碎影深淵), 塔洛斯(中界)
};

const NPC_MAP = {
  physical: PHYSICAL_NPCS,
  magic: MAGIC_NPCS,
  support: SUPPORT_NPCS,
  status: STATUS_NPCS,
  resistance: RESISTANCE_NPCS,
  special: SPECIAL_NPCS,
};

// ─── 學習代價配置 ───
const COST_CONFIG = {
  common: { goldMin: 100, goldMax: 500, stoneMin: 0, stoneMax: 10, reputationMin: 0, reputationMax: 50 },
  rare: { goldMin: 500, goldMax: 2000, stoneMin: 10, stoneMax: 50, reputationMin: 50, reputationMax: 200 },
  epic: { goldMin: 2000, goldMax: 5000, stoneMin: 50, stoneMax: 200, reputationMin: 200, reputationMax: 500 },
  legendary: { goldMin: 5000, goldMax: 15000, stoneMin: 200, stoneMax: 500, reputationMin: 500, reputationMax: 1000 },
};

// ─── 前置等級配置 ───
const LEVEL_CONFIG = {
  common: { min: 1, max: 10 },
  rare: { min: 10, max: 25 },
  epic: { min: 20, max: 40 },
  legendary: { min: 35, max: 50 },
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function roundTo50(n) {
  return Math.round(n / 50) * 50;
}

async function main() {
  const conn = await mysql.createConnection(connOpts);
  console.log("Connected to database");

  // Get all player-usable skills that need NPC assignment
  const [skills] = await conn.execute(
    `SELECT id, skill_id, name, category, rarity, wuxing, npc_id, learn_cost, prerequisite_level
     FROM game_unified_skill_catalog 
     WHERE usable_by_player = 1 
     ORDER BY category, rarity, id`
  );

  console.log(`Found ${skills.length} player-usable skills`);

  let npcAssigned = 0;
  let costAssigned = 0;
  let levelAssigned = 0;

  for (const skill of skills) {
    const updates = {};
    
    // ─── 1. Assign NPC ───
    if (!skill.npc_id) {
      const categoryNpcs = NPC_MAP[skill.category] || NPC_MAP.physical;
      const rarityNpcs = categoryNpcs[skill.rarity] || categoryNpcs.common;
      // Round-robin based on skill id
      const npcId = rarityNpcs[skill.id % rarityNpcs.length];
      updates.npc_id = npcId;
      npcAssigned++;
    }

    // ─── 2. Assign Learn Cost ───
    let existingCost = null;
    try {
      existingCost = skill.learn_cost ? JSON.parse(skill.learn_cost) : null;
    } catch { existingCost = null; }
    
    if (!existingCost || (existingCost.gold === 0 && existingCost.stones === 0)) {
      const cfg = COST_CONFIG[skill.rarity] || COST_CONFIG.common;
      const cost = {
        gold: roundTo50(randInt(cfg.goldMin, cfg.goldMax)),
        stones: randInt(cfg.stoneMin, cfg.stoneMax),
        reputation: randInt(cfg.reputationMin, cfg.reputationMax),
        items: [],
      };
      updates.learn_cost = JSON.stringify(cost);
      costAssigned++;
    }

    // ─── 3. Assign Prerequisite Level ───
    if (!skill.prerequisite_level || skill.prerequisite_level === 0) {
      const lvlCfg = LEVEL_CONFIG[skill.rarity] || LEVEL_CONFIG.common;
      updates.prerequisite_level = randInt(lvlCfg.min, lvlCfg.max);
      levelAssigned++;
    }

    // ─── Apply Updates ───
    if (Object.keys(updates).length > 0) {
      const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(", ");
      const values = Object.values(updates);
      await conn.execute(
        `UPDATE game_unified_skill_catalog SET ${setClauses} WHERE id = ?`,
        [...values, skill.id]
      );
      console.log(`  [${skill.skill_id}] ${skill.name}: ${Object.keys(updates).join(", ")}`);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`NPC assigned: ${npcAssigned}`);
  console.log(`Learn cost assigned: ${costAssigned}`);
  console.log(`Prerequisite level assigned: ${levelAssigned}`);

  await conn.end();
  console.log("Done!");
}

main().catch(e => { console.error(e); process.exit(1); });
