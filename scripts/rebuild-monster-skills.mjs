/**
 * 魔物技能重建 + 200隻魔物技能分配腳本
 * 
 * 1. 清空舊的 96 個魔物技能（嚴重偏水）
 * 2. 重建 100 個新魔物技能（五行均衡，每屬性 20 個）
 * 3. 為 200 隻魔物分配 2-3 個技能（依種族+五行+稀有度）
 */

import fs from 'fs';

const NOW = Date.now();

// ====== Part 1: 100 個新魔物技能 ======
// 每個五行 20 個：12 attack + 2 debuff + 2 support + 2 heal + 1 defense + 1 buff
const monsterSkills = [];
let skillIdx = 1;

function pad(n) { return String(n).padStart(3, '0'); }
function esc(s) { return s.replace(/'/g, "''"); }
function jsonStr(obj) { return obj ? `'${esc(JSON.stringify(obj))}'` : 'NULL'; }

// 五行技能模板
const WUXING_SKILLS = {
  '土': {
    attacks: [
      { name: '碎石拳', power: 85, mp: 4, cd: 0, acc: 100, effect: null, desc: '以土石之力揮拳攻擊' },
      { name: '巨石投擲', power: 100, mp: 6, cd: 0, acc: 95, effect: null, desc: '投擲巨石造成物理傷害' },
      { name: '地裂衝擊', power: 110, mp: 8, cd: 1, acc: 90, effect: { type: 'stun', chance: 20, duration: 1 }, desc: '震裂大地，有機率暈眩' },
      { name: '山崩地裂', power: 130, mp: 15, cd: 3, acc: 85, effect: { type: 'stun', chance: 30, duration: 1 }, desc: '引發山崩，高傷害附帶暈眩' },
      { name: '沙暴襲擊', power: 95, mp: 6, cd: 1, acc: 80, effect: { type: 'accuracy_down', chance: 40, duration: 2, value: 20 }, desc: '捲起沙暴降低敵方命中' },
      { name: '泥沼陷阱', power: 75, mp: 5, cd: 1, acc: 100, effect: { type: 'slow', chance: 50, duration: 2 }, desc: '製造泥沼減速敵人' },
      { name: '岩石碎擊', power: 90, mp: 5, cd: 0, acc: 100, effect: null, desc: '以岩石碎片攻擊' },
      { name: '土石流', power: 120, mp: 12, cd: 2, acc: 85, effect: { type: 'stun', chance: 25, duration: 1 }, desc: '引發土石流衝擊' },
      { name: '地脈震動', power: 105, mp: 10, cd: 2, acc: 90, effect: { type: 'slow', chance: 35, duration: 2 }, desc: '震動地脈造成傷害並減速' },
      { name: '黃沙吞噬', power: 140, mp: 18, cd: 3, acc: 80, effect: { type: 'poison', chance: 40, duration: 3 }, desc: '黃沙吞噬敵人，附帶毒素' },
      { name: '土刺突襲', power: 115, mp: 10, cd: 2, acc: 95, effect: null, desc: '從地面突出土刺攻擊' },
      { name: '大地之怒', power: 150, mp: 20, cd: 4, acc: 80, effect: { type: 'stun', chance: 40, duration: 2 }, desc: '大地之怒降臨，毀滅性打擊' },
    ],
    debuffs: [
      { name: '石化凝視', power: 0, mp: 12, cd: 3, acc: 70, effect: { type: 'petrify', chance: 60, duration: 2 }, desc: '石化凝視使敵人無法行動' },
      { name: '沙塵迷眼', power: 0, mp: 8, cd: 2, acc: 85, effect: { type: 'accuracy_down', chance: 80, duration: 2, value: 30 }, desc: '沙塵迷眼降低敵方命中率' },
    ],
    supports: [
      { name: '大地護甲', power: 0, mp: 10, cd: 3, acc: 100, effect: { type: 'def_up', duration: 3, value: 25 }, desc: '土石凝聚為護甲提升防禦' },
      { name: '岩壁守護', power: 0, mp: 15, cd: 4, acc: 100, effect: { type: 'shield', duration: 2, value: 30 }, desc: '召喚岩壁護盾吸收傷害' },
    ],
    heals: [
      { name: '大地回春', power: 60, mp: 10, cd: 2, acc: 100, effect: { type: 'heal', healType: 'instant' }, desc: '大地之力治癒傷口' },
      { name: '土壤滋養', power: 30, mp: 8, cd: 3, acc: 100, effect: { type: 'heal', healType: 'hot', duration: 3 }, desc: '土壤滋養持續回復生命' },
    ],
    defense: [
      { name: '磐石不動', power: 0, mp: 8, cd: 3, acc: 100, effect: { type: 'def_up', duration: 2, value: 40 }, desc: '化身磐石大幅提升防禦' },
    ],
    buff: [
      { name: '厚土祝福', power: 0, mp: 12, cd: 4, acc: 100, effect: { type: 'atk_up', duration: 3, value: 20 }, desc: '大地祝福提升攻擊力' },
    ],
  },
  '木': {
    attacks: [
      { name: '藤鞭抽擊', power: 85, mp: 4, cd: 0, acc: 100, effect: null, desc: '以藤蔓鞭打敵人' },
      { name: '荊棘射擊', power: 100, mp: 6, cd: 0, acc: 95, effect: { type: 'poison', chance: 20, duration: 2 }, desc: '射出毒荊棘' },
      { name: '花粉爆發', power: 90, mp: 6, cd: 1, acc: 85, effect: { type: 'sleep', chance: 25, duration: 1 }, desc: '散發催眠花粉' },
      { name: '根系纏繞', power: 95, mp: 7, cd: 1, acc: 90, effect: { type: 'slow', chance: 40, duration: 2 }, desc: '根系纏繞減速敵人' },
      { name: '毒孢子雲', power: 80, mp: 8, cd: 2, acc: 80, effect: { type: 'poison', chance: 50, duration: 3 }, desc: '釋放毒孢子雲' },
      { name: '巨木撞擊', power: 115, mp: 10, cd: 2, acc: 90, effect: null, desc: '以巨木之力撞擊' },
      { name: '落葉飛刃', power: 105, mp: 8, cd: 1, acc: 95, effect: null, desc: '落葉化為飛刃攻擊' },
      { name: '森林怒吼', power: 130, mp: 15, cd: 3, acc: 85, effect: { type: 'poison', chance: 35, duration: 3 }, desc: '森林之怒降臨' },
      { name: '寄生種子', power: 70, mp: 10, cd: 2, acc: 90, effect: { type: 'poison', chance: 60, duration: 3 }, desc: '植入寄生種子持續吸取生命' },
      { name: '千年古木擊', power: 140, mp: 18, cd: 3, acc: 80, effect: { type: 'stun', chance: 30, duration: 1 }, desc: '千年古木之力的毀滅打擊' },
      { name: '竹林亂舞', power: 110, mp: 10, cd: 2, acc: 90, effect: null, desc: '竹林之力亂舞攻擊' },
      { name: '世界樹之怒', power: 150, mp: 20, cd: 4, acc: 80, effect: { type: 'poison', chance: 50, duration: 3 }, desc: '世界樹降怒，毀滅性毒素' },
    ],
    debuffs: [
      { name: '催眠花香', power: 0, mp: 12, cd: 3, acc: 70, effect: { type: 'sleep', chance: 60, duration: 2 }, desc: '散發催眠花香使敵人昏睡' },
      { name: '毒藤纏身', power: 0, mp: 8, cd: 2, acc: 85, effect: { type: 'poison', chance: 80, duration: 3 }, desc: '毒藤纏身持續造成毒傷' },
    ],
    supports: [
      { name: '光合作用', power: 0, mp: 10, cd: 3, acc: 100, effect: { type: 'atk_up', duration: 3, value: 20 }, desc: '光合作用提升攻擊力' },
      { name: '森林庇護', power: 0, mp: 15, cd: 4, acc: 100, effect: { type: 'shield', duration: 2, value: 25 }, desc: '森林之力形成護盾' },
    ],
    heals: [
      { name: '草木回春', power: 65, mp: 10, cd: 2, acc: 100, effect: { type: 'heal', healType: 'instant' }, desc: '草木之力治癒傷口' },
      { name: '生命之泉', power: 35, mp: 8, cd: 3, acc: 100, effect: { type: 'heal', healType: 'hot', duration: 3 }, desc: '生命之泉持續回復' },
    ],
    defense: [
      { name: '樹皮護體', power: 0, mp: 8, cd: 3, acc: 100, effect: { type: 'def_up', duration: 2, value: 35 }, desc: '樹皮覆蓋提升防禦' },
    ],
    buff: [
      { name: '春風化雨', power: 0, mp: 12, cd: 4, acc: 100, effect: { type: 'spd_up', duration: 3, value: 20 }, desc: '春風加持提升速度' },
    ],
  },
  '水': {
    attacks: [
      { name: '水彈射擊', power: 85, mp: 4, cd: 0, acc: 100, effect: null, desc: '射出水彈攻擊' },
      { name: '冰牙撕咬', power: 100, mp: 6, cd: 0, acc: 95, effect: { type: 'freeze', chance: 15, duration: 1 }, desc: '冰冷的撕咬攻擊' },
      { name: '寒冰箭', power: 110, mp: 8, cd: 1, acc: 90, effect: { type: 'freeze', chance: 25, duration: 1 }, desc: '射出寒冰箭' },
      { name: '海嘯衝擊', power: 130, mp: 15, cd: 3, acc: 85, effect: { type: 'slow', chance: 40, duration: 2 }, desc: '引發海嘯衝擊' },
      { name: '泡沫凍結', power: 90, mp: 6, cd: 1, acc: 90, effect: { type: 'freeze', chance: 30, duration: 1 }, desc: '泡沫凍結敵人' },
      { name: '深海漩渦', power: 120, mp: 12, cd: 2, acc: 85, effect: { type: 'slow', chance: 50, duration: 2 }, desc: '深海漩渦吞噬' },
      { name: '冰錐術', power: 115, mp: 10, cd: 2, acc: 90, effect: { type: 'freeze', chance: 20, duration: 1 }, desc: '召喚冰錐攻擊' },
      { name: '暴風雪', power: 140, mp: 18, cd: 3, acc: 80, effect: { type: 'freeze', chance: 35, duration: 2 }, desc: '引發暴風雪' },
      { name: '水流噴射', power: 95, mp: 5, cd: 0, acc: 100, effect: null, desc: '高壓水流噴射' },
      { name: '極寒嚎叫', power: 105, mp: 10, cd: 2, acc: 85, effect: { type: 'freeze', chance: 25, duration: 1 }, desc: '極寒之力嚎叫' },
      { name: '墨汁迷霧', power: 80, mp: 8, cd: 2, acc: 80, effect: { type: 'accuracy_down', chance: 50, duration: 2, value: 25 }, desc: '噴出墨汁迷霧' },
      { name: '深淵之怒', power: 150, mp: 20, cd: 4, acc: 80, effect: { type: 'freeze', chance: 40, duration: 2 }, desc: '深淵之怒降臨，極致冰封' },
    ],
    debuffs: [
      { name: '冰封凝視', power: 0, mp: 12, cd: 3, acc: 70, effect: { type: 'freeze', chance: 60, duration: 2 }, desc: '冰封凝視使敵人凍結' },
      { name: '水霧迷惑', power: 0, mp: 8, cd: 2, acc: 85, effect: { type: 'confusion', chance: 50, duration: 2 }, desc: '水霧迷惑使敵人混亂' },
    ],
    supports: [
      { name: '潮汐之力', power: 0, mp: 10, cd: 3, acc: 100, effect: { type: 'mtk_up', duration: 3, value: 25 }, desc: '潮汐之力提升魔攻' },
      { name: '水幕護體', power: 0, mp: 15, cd: 4, acc: 100, effect: { type: 'shield', duration: 2, value: 30 }, desc: '水幕形成護盾' },
    ],
    heals: [
      { name: '清泉治癒', power: 70, mp: 10, cd: 2, acc: 100, effect: { type: 'heal', healType: 'instant' }, desc: '清泉之力治癒傷口' },
      { name: '水之恩澤', power: 35, mp: 8, cd: 3, acc: 100, effect: { type: 'heal', healType: 'hot', duration: 3 }, desc: '水之恩澤持續回復' },
    ],
    defense: [
      { name: '冰甲凝聚', power: 0, mp: 8, cd: 3, acc: 100, effect: { type: 'def_up', duration: 2, value: 35 }, desc: '冰甲凝聚提升防禦' },
    ],
    buff: [
      { name: '水流加速', power: 0, mp: 12, cd: 4, acc: 100, effect: { type: 'spd_up', duration: 3, value: 25 }, desc: '水流加持提升速度' },
    ],
  },
  '火': {
    attacks: [
      { name: '火焰噴射', power: 85, mp: 4, cd: 0, acc: 100, effect: null, desc: '噴射火焰攻擊' },
      { name: '烈焰撕咬', power: 100, mp: 6, cd: 0, acc: 95, effect: { type: 'burn', chance: 20, duration: 2 }, desc: '烈焰撕咬附帶灼燒' },
      { name: '火球術', power: 110, mp: 8, cd: 1, acc: 90, effect: { type: 'burn', chance: 30, duration: 2 }, desc: '發射火球攻擊' },
      { name: '熔岩爆發', power: 130, mp: 15, cd: 3, acc: 85, effect: { type: 'burn', chance: 40, duration: 3 }, desc: '引發熔岩爆發' },
      { name: '火星噴射', power: 90, mp: 5, cd: 0, acc: 95, effect: { type: 'burn', chance: 15, duration: 2 }, desc: '噴射火星' },
      { name: '爆炎衝擊', power: 120, mp: 12, cd: 2, acc: 85, effect: { type: 'burn', chance: 35, duration: 2 }, desc: '爆炎衝擊' },
      { name: '灼熱吐息', power: 115, mp: 10, cd: 2, acc: 90, effect: { type: 'burn', chance: 25, duration: 2 }, desc: '灼熱吐息攻擊' },
      { name: '業火焚天', power: 140, mp: 18, cd: 3, acc: 80, effect: { type: 'burn', chance: 45, duration: 3 }, desc: '業火焚天的毀滅攻擊' },
      { name: '火焰旋風', power: 105, mp: 8, cd: 1, acc: 90, effect: { type: 'burn', chance: 20, duration: 2 }, desc: '火焰旋風席捲' },
      { name: '地獄烈焰', power: 150, mp: 20, cd: 4, acc: 80, effect: { type: 'burn', chance: 50, duration: 3 }, desc: '地獄烈焰降臨，極致灼燒' },
      { name: '火山噴發', power: 135, mp: 16, cd: 3, acc: 85, effect: { type: 'burn', chance: 35, duration: 3 }, desc: '火山噴發造成大範圍灼燒' },
      { name: '赤焰拳', power: 95, mp: 5, cd: 0, acc: 100, effect: null, desc: '燃燒的拳頭攻擊' },
    ],
    debuffs: [
      { name: '灼燒凝視', power: 0, mp: 12, cd: 3, acc: 70, effect: { type: 'burn', chance: 80, duration: 3 }, desc: '灼燒凝視使敵人持續燃燒' },
      { name: '煙霧迷障', power: 0, mp: 8, cd: 2, acc: 85, effect: { type: 'accuracy_down', chance: 70, duration: 2, value: 25 }, desc: '煙霧迷障降低敵方命中' },
    ],
    supports: [
      { name: '烈焰鼓舞', power: 0, mp: 10, cd: 3, acc: 100, effect: { type: 'atk_up', duration: 3, value: 25 }, desc: '烈焰鼓舞提升攻擊力' },
      { name: '火焰護盾', power: 0, mp: 15, cd: 4, acc: 100, effect: { type: 'shield', duration: 2, value: 25 }, desc: '火焰護盾吸收傷害' },
    ],
    heals: [
      { name: '鳳凰之淚', power: 65, mp: 10, cd: 2, acc: 100, effect: { type: 'heal', healType: 'instant' }, desc: '鳳凰之淚治癒傷口' },
      { name: '溫泉療癒', power: 30, mp: 8, cd: 3, acc: 100, effect: { type: 'heal', healType: 'hot', duration: 3 }, desc: '溫泉之力持續回復' },
    ],
    defense: [
      { name: '烈焰護體', power: 0, mp: 8, cd: 3, acc: 100, effect: { type: 'def_up', duration: 2, value: 30 }, desc: '烈焰護體提升防禦' },
    ],
    buff: [
      { name: '火焰之心', power: 0, mp: 12, cd: 4, acc: 100, effect: { type: 'atk_up', duration: 3, value: 30 }, desc: '火焰之心大幅提升攻擊' },
    ],
  },
  '金': {
    attacks: [
      { name: '金屬啃咬', power: 85, mp: 4, cd: 0, acc: 100, effect: null, desc: '金屬利齒啃咬' },
      { name: '金剛重擊', power: 100, mp: 6, cd: 0, acc: 95, effect: null, desc: '金剛之力重擊' },
      { name: '震盪波', power: 110, mp: 8, cd: 1, acc: 90, effect: { type: 'stun', chance: 20, duration: 1 }, desc: '發出震盪波攻擊' },
      { name: '鋼鐵風暴', power: 130, mp: 15, cd: 3, acc: 85, effect: { type: 'stun', chance: 30, duration: 1 }, desc: '鋼鐵風暴席捲' },
      { name: '利刃斬擊', power: 95, mp: 5, cd: 0, acc: 100, effect: null, desc: '鋒利刃斬擊' },
      { name: '金光閃爍', power: 90, mp: 6, cd: 1, acc: 85, effect: { type: 'accuracy_down', chance: 40, duration: 2, value: 20 }, desc: '金光閃爍迷惑敵人' },
      { name: '鐵壁衝撞', power: 115, mp: 10, cd: 2, acc: 90, effect: null, desc: '鐵壁衝撞造成重傷' },
      { name: '金屬風刃', power: 105, mp: 8, cd: 1, acc: 95, effect: null, desc: '金屬風刃切割' },
      { name: '白銀穿刺', power: 120, mp: 12, cd: 2, acc: 90, effect: { type: 'stun', chance: 20, duration: 1 }, desc: '白銀穿刺攻擊' },
      { name: '金剛破碎拳', power: 140, mp: 18, cd: 3, acc: 80, effect: { type: 'stun', chance: 35, duration: 1 }, desc: '金剛破碎拳的毀滅打擊' },
      { name: '聖光斬', power: 135, mp: 16, cd: 3, acc: 85, effect: null, desc: '聖光之力斬擊' },
      { name: '天罰之劍', power: 150, mp: 20, cd: 4, acc: 80, effect: { type: 'stun', chance: 40, duration: 2 }, desc: '天罰之劍降臨，極致打擊' },
    ],
    debuffs: [
      { name: '金屬共鳴', power: 0, mp: 12, cd: 3, acc: 70, effect: { type: 'stun', chance: 60, duration: 2 }, desc: '金屬共鳴使敵人暈眩' },
      { name: '銀光刺眼', power: 0, mp: 8, cd: 2, acc: 85, effect: { type: 'accuracy_down', chance: 70, duration: 2, value: 30 }, desc: '銀光刺眼降低命中率' },
    ],
    supports: [
      { name: '金甲加持', power: 0, mp: 10, cd: 3, acc: 100, effect: { type: 'def_up', duration: 3, value: 30 }, desc: '金甲加持提升防禦' },
      { name: '金光護盾', power: 0, mp: 15, cd: 4, acc: 100, effect: { type: 'shield', duration: 2, value: 35 }, desc: '金光護盾吸收傷害' },
    ],
    heals: [
      { name: '自我修復', power: 60, mp: 10, cd: 2, acc: 100, effect: { type: 'heal', healType: 'instant' }, desc: '金屬自我修復' },
      { name: '金屬再生', power: 30, mp: 8, cd: 3, acc: 100, effect: { type: 'heal', healType: 'hot', duration: 3 }, desc: '金屬再生持續回復' },
    ],
    defense: [
      { name: '鐵壁防禦', power: 0, mp: 8, cd: 3, acc: 100, effect: { type: 'def_up', duration: 2, value: 45 }, desc: '鐵壁防禦大幅提升防禦' },
    ],
    buff: [
      { name: '金剛不壞', power: 0, mp: 12, cd: 4, acc: 100, effect: { type: 'def_up', duration: 3, value: 25 }, desc: '金剛不壞提升全面防禦' },
    ],
  },
};

// Generate all 100 monster skills
for (const [wuxing, templates] of Object.entries(WUXING_SKILLS)) {
  // 12 attacks
  for (const atk of templates.attacks) {
    monsterSkills.push({
      monster_skill_id: `SK_M${pad(skillIdx)}`,
      name: atk.name,
      wuxing,
      skill_type: 'attack',
      rarity: atk.power >= 140 ? 'legendary' : atk.power >= 120 ? 'epic' : atk.power >= 100 ? 'rare' : 'common',
      power_percent: atk.power,
      mp_cost: atk.mp,
      cooldown: atk.cd,
      accuracy_mod: atk.acc,
      additional_effect: atk.effect,
      ai_condition: atk.power >= 120 ? { hp_threshold: 0.6, priority: 'high' } : null,
      description: atk.desc,
    });
    skillIdx++;
  }
  // 2 debuffs
  for (const deb of templates.debuffs) {
    monsterSkills.push({
      monster_skill_id: `SK_M${pad(skillIdx)}`,
      name: deb.name,
      wuxing,
      skill_type: 'debuff',
      rarity: 'rare',
      power_percent: deb.power,
      mp_cost: deb.mp,
      cooldown: deb.cd,
      accuracy_mod: deb.acc,
      additional_effect: deb.effect,
      ai_condition: { hp_threshold: 0.8, priority: 'medium' },
      description: deb.desc,
    });
    skillIdx++;
  }
  // 2 supports
  for (const sup of templates.supports) {
    monsterSkills.push({
      monster_skill_id: `SK_M${pad(skillIdx)}`,
      name: sup.name,
      wuxing,
      skill_type: 'support',
      rarity: 'rare',
      power_percent: sup.power,
      mp_cost: sup.mp,
      cooldown: sup.cd,
      accuracy_mod: sup.acc,
      additional_effect: sup.effect,
      ai_condition: { hp_threshold: 0.5, priority: 'medium' },
      description: sup.desc,
    });
    skillIdx++;
  }
  // 2 heals
  for (const heal of templates.heals) {
    monsterSkills.push({
      monster_skill_id: `SK_M${pad(skillIdx)}`,
      name: heal.name,
      wuxing,
      skill_type: 'heal',
      rarity: 'uncommon',
      power_percent: heal.power,
      mp_cost: heal.mp,
      cooldown: heal.cd,
      accuracy_mod: heal.acc,
      additional_effect: heal.effect,
      ai_condition: { hp_threshold: 0.4, priority: 'high' },
      description: heal.desc,
    });
    skillIdx++;
  }
  // 1 defense
  for (const def of templates.defense) {
    monsterSkills.push({
      monster_skill_id: `SK_M${pad(skillIdx)}`,
      name: def.name,
      wuxing,
      skill_type: 'defense',
      rarity: 'uncommon',
      power_percent: def.power,
      mp_cost: def.mp,
      cooldown: def.cd,
      accuracy_mod: def.acc,
      additional_effect: def.effect,
      ai_condition: { hp_threshold: 0.3, priority: 'high' },
      description: def.desc,
    });
    skillIdx++;
  }
  // 1 buff
  for (const buf of templates.buff) {
    monsterSkills.push({
      monster_skill_id: `SK_M${pad(skillIdx)}`,
      name: buf.name,
      wuxing,
      skill_type: 'buff',
      rarity: 'rare',
      power_percent: buf.power,
      mp_cost: buf.mp,
      cooldown: buf.cd,
      accuracy_mod: buf.acc,
      additional_effect: buf.effect,
      ai_condition: { hp_threshold: 0.7, priority: 'medium' },
      description: buf.desc,
    });
    skillIdx++;
  }
}

console.log(`Generated ${monsterSkills.length} monster skills`);

// ====== Part 2: Generate SQL for monster skills ======
const skillSqlLines = [];
skillSqlLines.push('DELETE FROM game_monster_skill_catalog;');

for (let i = 0; i < monsterSkills.length; i += 10) {
  const batch = monsterSkills.slice(i, i + 10);
  const values = batch.map(s => {
    return `('${s.monster_skill_id}', '${esc(s.name)}', '${s.wuxing}', '${s.skill_type}', '${s.rarity}', ${s.power_percent}, ${s.mp_cost}, ${s.cooldown}, ${s.accuracy_mod}, ${jsonStr(s.additional_effect)}, ${jsonStr(s.ai_condition)}, '${esc(s.description)}', 1, ${NOW})`;
  }).join(',\n');
  skillSqlLines.push(`INSERT INTO game_monster_skill_catalog (monster_skill_id, name, wuxing, skill_type, rarity, power_percent, mp_cost, cooldown, accuracy_mod, additional_effect, ai_condition, description, is_active, created_at) VALUES\n${values};`);
}

// ====== Part 3: Monster skill assignment ======
// Strategy: Each monster gets 2-3 skills based on rarity
// - common: 2 skills (1 attack + 1 utility)
// - uncommon: 2 skills (1 attack + 1 utility)
// - rare: 3 skills (2 attack + 1 utility)
// - epic: 3 skills (2 attack + 1 utility/special)
// - legendary: 3 skills (2 attack + 1 special)

// Build skill lookup by wuxing and type
const skillsByWuxingType = {};
for (const s of monsterSkills) {
  const key = `${s.wuxing}_${s.skill_type}`;
  if (!skillsByWuxingType[key]) skillsByWuxingType[key] = [];
  skillsByWuxingType[key].push(s);
}

// Deterministic pseudo-random based on monster_id
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function pickSkill(pool, hash, offset) {
  if (!pool || pool.length === 0) return null;
  return pool[(hash + offset) % pool.length];
}

// All 200 monsters (M_D001-M_D040, M_E001-M_E040, M_F001-M_F040, M_M001-M_M040, M_W001-M_W040)
const WUXING_PREFIX = { '土': 'M_D', '木': 'M_E', '火': 'M_F', '金': 'M_M', '水': 'M_W' };
const RARITIES_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

// We need to fetch actual monster data. Since we can't query DB from script,
// we'll generate UPDATE statements that work based on monster_id patterns.
// From the DB query, we know:
// - M_D001-M_D040 = 土
// - M_E001-M_E040 = 木
// - M_F001-M_F040 = 火
// - M_M001-M_M040 = 金
// - M_W001-M_W040 = 水
// Each has 10 species cycling, rarities distributed

const WUXING_MAP = { 'M_D': '土', 'M_E': '木', 'M_F': '火', 'M_M': '金', 'M_W': '水' };

// Rarity distribution per 40 monsters (from our rebuild):
// common: 12, uncommon: 10, rare: 10, epic: 5, legendary: 3
const RARITY_BY_INDEX = [];
for (let i = 0; i < 12; i++) RARITY_BY_INDEX.push('common');
for (let i = 0; i < 10; i++) RARITY_BY_INDEX.push('uncommon');
for (let i = 0; i < 10; i++) RARITY_BY_INDEX.push('rare');
for (let i = 0; i < 5; i++) RARITY_BY_INDEX.push('epic');
for (let i = 0; i < 3; i++) RARITY_BY_INDEX.push('legendary');

const assignmentSql = [];

for (const [prefix, wuxing] of Object.entries(WUXING_MAP)) {
  for (let i = 1; i <= 40; i++) {
    const monsterId = `${prefix}${pad(i)}`;
    const rarity = RARITY_BY_INDEX[i - 1] || 'common';
    const hash = hashCode(monsterId);
    
    // Get attack skills for this wuxing
    const attacks = skillsByWuxingType[`${wuxing}_attack`] || [];
    const debuffs = skillsByWuxingType[`${wuxing}_debuff`] || [];
    const supports = skillsByWuxingType[`${wuxing}_support`] || [];
    const heals = skillsByWuxingType[`${wuxing}_heal`] || [];
    const defenses = skillsByWuxingType[`${wuxing}_defense`] || [];
    const buffs = skillsByWuxingType[`${wuxing}_buff`] || [];
    
    let skill1, skill2, skill3;
    
    // Skill 1: Always an attack (pick based on rarity)
    const strongAttacks = attacks.filter(a => a.power_percent >= 100);
    const weakAttacks = attacks.filter(a => a.power_percent < 100);
    
    if (rarity === 'legendary' || rarity === 'epic') {
      skill1 = pickSkill(strongAttacks, hash, 0) || pickSkill(attacks, hash, 0);
    } else {
      skill1 = pickSkill(attacks, hash, i);
    }
    
    // Skill 2: Depends on rarity
    if (rarity === 'legendary') {
      // Legendary: strong attack or debuff
      skill2 = pickSkill(strongAttacks, hash, 3) || pickSkill(debuffs, hash, 0);
    } else if (rarity === 'epic') {
      skill2 = pickSkill(debuffs, hash, 0) || pickSkill(strongAttacks, hash, 2);
    } else if (rarity === 'rare') {
      skill2 = pickSkill(attacks, hash, i + 5);
    } else {
      // common/uncommon: utility skill
      const utilPool = [...heals, ...supports, ...defenses, ...buffs];
      skill2 = pickSkill(utilPool, hash, i);
    }
    
    // Skill 3: Only for rare+ (null for common/uncommon)
    if (rarity === 'legendary') {
      const specialPool = [...supports, ...buffs, ...heals];
      skill3 = pickSkill(specialPool, hash, 1);
    } else if (rarity === 'epic') {
      const specialPool = [...supports, ...heals, ...buffs];
      skill3 = pickSkill(specialPool, hash, 2);
    } else if (rarity === 'rare') {
      const utilPool = [...heals, ...debuffs, ...supports];
      skill3 = pickSkill(utilPool, hash, i);
    } else {
      skill3 = null;
    }
    
    // Ensure no duplicate skills
    const skillIds = [skill1?.monster_skill_id, skill2?.monster_skill_id, skill3?.monster_skill_id];
    if (skillIds[1] === skillIds[0]) {
      // Pick a different skill2
      const altPool = [...attacks, ...debuffs, ...supports, ...heals];
      for (let j = 0; j < altPool.length; j++) {
        if (altPool[j].monster_skill_id !== skillIds[0]) {
          skillIds[1] = altPool[j].monster_skill_id;
          break;
        }
      }
    }
    if (skillIds[2] && (skillIds[2] === skillIds[0] || skillIds[2] === skillIds[1])) {
      const altPool = [...heals, ...buffs, ...defenses, ...supports];
      for (let j = 0; j < altPool.length; j++) {
        if (altPool[j].monster_skill_id !== skillIds[0] && altPool[j].monster_skill_id !== skillIds[1]) {
          skillIds[2] = altPool[j].monster_skill_id;
          break;
        }
      }
    }
    
    assignmentSql.push(
      `UPDATE game_monster_catalog SET skill_id_1 = '${skillIds[0] || ''}', skill_id_2 = '${skillIds[1] || ''}', skill_id_3 = '${skillIds[2] || ''}' WHERE monster_id = '${monsterId}';`
    );
  }
}

// ====== Write SQL files ======
const outputDir = '/home/ubuntu/oracle-resonance/scripts';

// Skill insert SQL
fs.writeFileSync(`${outputDir}/sql-monster-skills.sql`, skillSqlLines.join('\n\n'), 'utf8');

// Monster assignment SQL (batch into files of 50)
for (let i = 0; i < assignmentSql.length; i += 50) {
  const batch = assignmentSql.slice(i, i + 50);
  const batchNum = Math.floor(i / 50) + 1;
  fs.writeFileSync(`${outputDir}/sql-monster-assign-${batchNum}.sql`, batch.join('\n'), 'utf8');
}

console.log(`\n=== Summary ===`);
console.log(`Monster skills: ${monsterSkills.length} (${Object.keys(WUXING_SKILLS).map(w => `${w}:${monsterSkills.filter(s => s.wuxing === w).length}`).join(', ')})`);
console.log(`Skill types: ${[...new Set(monsterSkills.map(s => s.skill_type))].join(', ')}`);
console.log(`Assignment SQLs: ${assignmentSql.length} monsters`);
console.log(`SQL files written to ${outputDir}/`);

// Verify distribution
const typeCounts = {};
for (const s of monsterSkills) {
  typeCounts[s.skill_type] = (typeCounts[s.skill_type] || 0) + 1;
}
console.log(`\nSkill type distribution:`, typeCounts);
