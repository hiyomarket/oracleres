/**
 * 為 74 個天命考核技能設定前置條件
 * 
 * 設計原則：
 * - 每個分類內，common 技能無前置條件（入門技能）
 * - rare 技能需要先學會同分類的 common 技能
 * - epic 技能需要先學會同分類的 rare 技能
 * - legendary 技能需要先學會同分類的 epic 技能
 * - 同系列（如火焰→烈焰→業火）形成線性鏈
 * - 部分跨分類前置（如吸血攻擊需要連擊+吸血魔法）
 */

import fs from 'fs';

// Skill IDs from DB (id: 65-138)
const SKILLS = {
  // Physical (65-79)
  連擊: 65, 諸刃: 66, 反擊: 67, 崩擊: 68, 亂射: 69,
  乾坤一擲: 70, 迅速果斷: 71, 毒擊: 72, 氣功彈: 73,
  吸血攻擊: 74, 雙重斬: 75, 戰慄襲心: 76, 護衛: 77, 陽炎: 78, 騎士之譽: 79,

  // Magic (80-96)
  火焰魔法: 80, 烈焰魔法: 81, 業火魔法: 82,
  冰凍魔法: 83, 暴風雪魔法: 84, 極寒魔法: 85,
  風刃魔法: 86, 暴風魔法: 87, 龍捲魔法: 88,
  隕石魔法: 89, 地裂魔法: 90, 天崩地裂: 91,
  金光斬: 92, 金光陣: 93, 金光天罰: 94,
  吸血魔法: 95, 超強吸血魔法: 96,

  // Status (97-108)
  昏睡術: 97, 群體昏睡: 98,
  石化術: 99, 群體石化: 100,
  混亂術: 101, 群體混亂: 102,
  中毒術: 103, 群體中毒: 104,
  遺忘術: 105, 群體遺忘: 106,
  酒醉術: 107, 群體酒醉: 108,

  // Support (109-126)
  補血術: 109, 強力補血: 110, 超強補血: 111,
  氣絕回復: 112, 潔淨: 113,
  攻擊增益: 114, 防禦增益: 115, 魔攻增益: 116, 速度增益: 117,
  攻擊弱化: 118, 防禦弱化: 119,
  聖盾: 120, 攻擊吸收: 121, 魔法吸收: 122,
  明鏡止水: 123, 恢復魔法: 124,
  持續回復: 125, 魔防增益: 126,

  // Special (127-132)
  暗殺: 127, 偷竊: 128, 挑釁: 129, 捨身: 130, 五行封印: 131, 天命共振: 132,

  // Resistance (133-138)
  昏睡抵抗: 133, 石化抵抗: 134, 混亂抵抗: 135,
  中毒抵抗: 136, 遺忘抵抗: 137, 酒醉抵抗: 138,
};

// Prerequisites mapping: skillId -> { prereqIds: number[], prereqLevel: number }
const PREREQS = {
  // ─── Physical chains ───
  // 連擊(65) = entry, no prereq
  [SKILLS.諸刃]: { ids: [SKILLS.連擊], level: 3 },        // 諸刃 ← 連擊
  [SKILLS.崩擊]: { ids: [SKILLS.連擊], level: 5 },        // 崩擊 ← 連擊
  [SKILLS.亂射]: { ids: [SKILLS.連擊], level: 3 },        // 亂射 ← 連擊
  [SKILLS.乾坤一擲]: { ids: [SKILLS.崩擊], level: 10 },   // 乾坤一擲 ← 崩擊
  [SKILLS.雙重斬]: { ids: [SKILLS.連擊], level: 5 },      // 雙重斬 ← 連擊
  [SKILLS.吸血攻擊]: { ids: [SKILLS.連擊], level: 8 },    // 吸血攻擊 ← 連擊
  [SKILLS.毒擊]: { ids: [SKILLS.連擊], level: 5 },        // 毒擊 ← 連擊
  [SKILLS.氣功彈]: { ids: [SKILLS.連擊], level: 5 },      // 氣功彈 ← 連擊
  [SKILLS.迅速果斷]: { ids: [SKILLS.連擊], level: 8 },    // 迅速果斷 ← 連擊
  [SKILLS.戰慄襲心]: { ids: [SKILLS.諸刃, SKILLS.崩擊], level: 15 }, // 戰慄襲心 ← 諸刃+崩擊
  [SKILLS.反擊]: { ids: [], level: 5 },                    // 反擊 = Lv5 entry
  [SKILLS.護衛]: { ids: [], level: 5 },                    // 護衛 = Lv5 entry
  [SKILLS.陽炎]: { ids: [SKILLS.反擊], level: 10 },       // 陽炎 ← 反擊
  [SKILLS.騎士之譽]: { ids: [SKILLS.護衛, SKILLS.陽炎], level: 20 }, // 騎士之譽 ← 護衛+陽炎

  // ─── Magic chains (fire) ───
  [SKILLS.烈焰魔法]: { ids: [SKILLS.火焰魔法], level: 5 },
  [SKILLS.業火魔法]: { ids: [SKILLS.烈焰魔法], level: 12 },

  // ─── Magic chains (water) ───
  [SKILLS.暴風雪魔法]: { ids: [SKILLS.冰凍魔法], level: 5 },
  [SKILLS.極寒魔法]: { ids: [SKILLS.暴風雪魔法], level: 12 },

  // ─── Magic chains (wood) ───
  [SKILLS.暴風魔法]: { ids: [SKILLS.風刃魔法], level: 5 },
  [SKILLS.龍捲魔法]: { ids: [SKILLS.暴風魔法], level: 12 },

  // ─── Magic chains (earth) ───
  [SKILLS.地裂魔法]: { ids: [SKILLS.隕石魔法], level: 5 },
  [SKILLS.天崩地裂]: { ids: [SKILLS.地裂魔法], level: 12 },

  // ─── Magic chains (metal) ───
  [SKILLS.金光陣]: { ids: [SKILLS.金光斬], level: 5 },
  [SKILLS.金光天罰]: { ids: [SKILLS.金光陣], level: 12 },

  // ─── Magic (vampire) ───
  [SKILLS.吸血魔法]: { ids: [SKILLS.火焰魔法], level: 8 },  // 需要任一基礎魔法
  [SKILLS.超強吸血魔法]: { ids: [SKILLS.吸血魔法], level: 15 },

  // ─── Status chains ───
  [SKILLS.群體昏睡]: { ids: [SKILLS.昏睡術], level: 8 },
  [SKILLS.群體石化]: { ids: [SKILLS.石化術], level: 8 },
  [SKILLS.群體混亂]: { ids: [SKILLS.混亂術], level: 8 },
  [SKILLS.群體中毒]: { ids: [SKILLS.中毒術], level: 8 },
  [SKILLS.群體遺忘]: { ids: [SKILLS.遺忘術], level: 8 },
  [SKILLS.群體酒醉]: { ids: [SKILLS.酒醉術], level: 8 },

  // ─── Support chains ───
  [SKILLS.強力補血]: { ids: [SKILLS.補血術], level: 5 },
  [SKILLS.超強補血]: { ids: [SKILLS.強力補血], level: 12 },
  [SKILLS.氣絕回復]: { ids: [SKILLS.強力補血], level: 10 },
  [SKILLS.潔淨]: { ids: [SKILLS.補血術], level: 8 },
  [SKILLS.持續回復]: { ids: [SKILLS.補血術], level: 5 },
  [SKILLS.恢復魔法]: { ids: [SKILLS.補血術], level: 8 },
  [SKILLS.聖盾]: { ids: [SKILLS.防禦增益], level: 10 },
  [SKILLS.攻擊吸收]: { ids: [SKILLS.聖盾], level: 15 },
  [SKILLS.魔法吸收]: { ids: [SKILLS.聖盾], level: 15 },
  [SKILLS.明鏡止水]: { ids: [SKILLS.魔法吸收], level: 20 },
  [SKILLS.魔防增益]: { ids: [SKILLS.防禦增益], level: 5 },

  // ─── Special chains ───
  [SKILLS.暗殺]: { ids: [SKILLS.迅速果斷], level: 15 },
  [SKILLS.偷竊]: { ids: [], level: 5 },
  [SKILLS.挑釁]: { ids: [SKILLS.護衛], level: 8 },
  [SKILLS.捨身]: { ids: [SKILLS.護衛, SKILLS.騎士之譽], level: 20 },
  [SKILLS.五行封印]: { ids: [SKILLS.火焰魔法, SKILLS.冰凍魔法], level: 15 },
  [SKILLS.天命共振]: { ids: [SKILLS.五行封印], level: 25 },

  // ─── Resistance (no chain, just level) ───
  [SKILLS.昏睡抵抗]: { ids: [], level: 5 },
  [SKILLS.石化抵抗]: { ids: [], level: 5 },
  [SKILLS.混亂抵抗]: { ids: [], level: 5 },
  [SKILLS.中毒抵抗]: { ids: [], level: 5 },
  [SKILLS.遺忘抵抗]: { ids: [], level: 5 },
  [SKILLS.酒醉抵抗]: { ids: [], level: 5 },
};

// Generate SQL
const sqlLines = [];
for (const [skillId, prereq] of Object.entries(PREREQS)) {
  const prereqJson = prereq.ids.length > 0 ? JSON.stringify(prereq.ids) : null;
  const prereqStr = prereqJson ? `'${prereqJson}'` : 'NULL';
  sqlLines.push(
    `UPDATE game_quest_skill_catalog SET prerequisites = ${prereqStr}, prerequisite_level = ${prereq.level} WHERE id = ${skillId};`
  );
}

fs.writeFileSync('/home/ubuntu/oracle-resonance/scripts/sql-prerequisites.sql', sqlLines.join('\n'), 'utf8');

console.log(`Generated ${sqlLines.length} prerequisite updates`);
console.log('SQL file: scripts/sql-prerequisites.sql');

// Verify chains
const chains = {};
for (const [skillId, prereq] of Object.entries(PREREQS)) {
  for (const pid of prereq.ids) {
    if (!chains[pid]) chains[pid] = [];
    chains[pid].push(parseInt(skillId));
  }
}
console.log('\nSkill dependency tree (parent -> children):');
for (const [parent, children] of Object.entries(chains)) {
  const parentName = Object.entries(SKILLS).find(([, v]) => v === parseInt(parent))?.[0] || parent;
  const childNames = children.map(c => Object.entries(SKILLS).find(([, v]) => v === c)?.[0] || c);
  console.log(`  ${parentName} (${parent}) -> ${childNames.join(', ')}`);
}
