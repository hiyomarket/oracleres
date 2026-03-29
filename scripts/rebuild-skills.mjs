/**
 * 墟界技能系統 v2.0 — 完整 74 技能重建腳本
 * 生成 SQL 插入語句，包含完整的戰鬥引擎欄位
 */
import fs from 'fs';

const NOW = Date.now();

function esc(s) { return s.replace(/'/g, "''"); }
function json(obj) { return esc(JSON.stringify(obj)); }

// ============================================================
// 全部 74 個技能定義
// ============================================================
const skills = [

  // ============================================================
  // A. 物理戰鬥系 (P01~P15) — 基於 ATK
  // ============================================================
  {
    code: 'P01', name: '連擊', questTitle: '碎影雙刃・連環之路',
    category: 'physical', skillType: 'attack', wuxing: '金',
    powerPercent: 55, mpCost: 15, cooldown: 2, maxLevel: 10, levelUpBonus: 5,
    targetType: 'single', scaleStat: 'atk', rarity: 'common',
    description: '對敵方單體發動連續攻擊，隨機攻擊2~5次，每次造成55%ATK傷害。每次攻擊獨立判定目標，可能打到場上不同敵人。',
    additionalEffect: null,
    specialMechanic: { hitCount: [2, 5], multiTargetHit: true, aoe: 'single', aoeDescription: '單體（多段隨機目標）' },
    sortOrder: 101
  },
  {
    code: 'P02', name: '諸刃', questTitle: '斷鋼裂甲・諸刃之道',
    category: 'physical', skillType: 'attack', wuxing: '金',
    powerPercent: 180, mpCost: 20, cooldown: 3, maxLevel: 10, levelUpBonus: 12,
    targetType: 'single', scaleStat: 'atk', rarity: 'rare',
    description: '集中全力的單體強力一擊，造成180%ATK傷害。高等級時傷害極為可觀。',
    additionalEffect: null,
    specialMechanic: { aoe: 'single', aoeDescription: '單體' },
    sortOrder: 102
  },
  {
    code: 'P03', name: '反擊', questTitle: '以牙還牙・反擊之心',
    category: 'physical', skillType: 'passive', wuxing: '金',
    powerPercent: 100, mpCost: 0, cooldown: 0, maxLevel: 10, levelUpBonus: 0,
    targetType: 'self', scaleStat: 'atk', rarity: 'rare',
    description: '被動技能。被物理攻擊時有機率自動反擊，造成100%ATK傷害。觸發機率隨等級提升（每級+5%）。',
    additionalEffect: null,
    specialMechanic: { isPassive: true, passiveType: 'counter', passiveTriggerChance: 5, passiveChancePerLevel: 5, aoe: 'self', aoeDescription: '被動（自身）' },
    sortOrder: 103
  },
  {
    code: 'P04', name: '崩擊', questTitle: '山崩地裂・崩擊之力',
    category: 'physical', skillType: 'attack', wuxing: '土',
    powerPercent: 250, mpCost: 18, cooldown: 4, maxLevel: 10, levelUpBonus: 15,
    targetType: 'single', scaleStat: 'atk', rarity: 'epic',
    description: '以沉重一擊砸向敵人，造成250%ATK傷害，並100%降低目標防禦30%，持續3回合。',
    additionalEffect: { type: 'defDown', chance: 100, value: 30, duration: 3, stackable: false },
    specialMechanic: { aoe: 'single', aoeDescription: '單體' },
    sortOrder: 104
  },
  {
    code: 'P05', name: '亂射', questTitle: '萬箭齊發・亂射之術',
    category: 'physical', skillType: 'attack', wuxing: '木',
    powerPercent: 80, mpCost: 22, cooldown: 4, maxLevel: 10, levelUpBonus: 6,
    targetType: 'all_enemy', scaleStat: 'atk', rarity: 'rare',
    description: '向敵方全體發射箭矢，對所有敵人造成80%ATK傷害。',
    additionalEffect: null,
    specialMechanic: { aoe: 'all_enemy', aoeDescription: '敵方全體' },
    sortOrder: 105
  },
  {
    code: 'P06', name: '乾坤一擲', questTitle: '孤注一擲・乾坤之賭',
    category: 'physical', skillType: 'attack', wuxing: '火',
    powerPercent: 350, mpCost: 25, cooldown: 5, maxLevel: 10, levelUpBonus: 20,
    targetType: 'single', scaleStat: 'atk', rarity: 'legendary',
    description: '傾注全力的致命一擊，造成350%ATK傷害，但命中率降低40%。高風險高回報的賭博型技能。',
    additionalEffect: null,
    specialMechanic: { accuracyMod: -40, aoe: 'single', aoeDescription: '單體' },
    sortOrder: 106
  },
  {
    code: 'P07', name: '迅速果斷', questTitle: '疾風迅雷・果斷之刃',
    category: 'physical', skillType: 'attack', wuxing: '金',
    powerPercent: 150, mpCost: 12, cooldown: 3, maxLevel: 10, levelUpBonus: 8,
    targetType: 'single', scaleStat: 'atk', rarity: 'rare',
    description: '先制攻擊，無視速度順序最先行動，且無視護盾直接造成150%ATK傷害。',
    additionalEffect: null,
    specialMechanic: { priority: true, ignoreShield: true, aoe: 'single', aoeDescription: '單體（先制）' },
    sortOrder: 107
  },
  {
    code: 'P08', name: '毒擊', questTitle: '蝕骨噬魂・毒擊之技',
    category: 'physical', skillType: 'attack', wuxing: '木',
    powerPercent: 100, mpCost: 12, cooldown: 2, maxLevel: 10, levelUpBonus: 5,
    targetType: 'single', scaleStat: 'atk', rarity: 'common',
    description: '帶有劇毒的攻擊，造成100%ATK傷害，80%機率使目標中毒5回合（每回合損失10%ATK的HP）。',
    additionalEffect: { type: 'poison', chance: 80, value: 10, duration: 5, stackable: false },
    specialMechanic: { aoe: 'single', aoeDescription: '單體' },
    sortOrder: 108
  },
  {
    code: 'P09', name: '氣功彈', questTitle: '內勁外放・氣功之道',
    category: 'physical', skillType: 'attack', wuxing: '火',
    powerPercent: 130, mpCost: 16, cooldown: 2, maxLevel: 10, levelUpBonus: 8,
    targetType: 'single', scaleStat: 'atk', rarity: 'common',
    description: '將內力凝聚為氣彈射出，造成130%ATK傷害，無視目標30%防禦。遠程物理攻擊。',
    additionalEffect: null,
    specialMechanic: { ignoreDefPercent: 30, aoe: 'single', aoeDescription: '單體（遠程）' },
    sortOrder: 109
  },
  {
    code: 'P10', name: '吸血攻擊', questTitle: '血族之吻・吸血之爪',
    category: 'physical', skillType: 'attack', wuxing: '水',
    powerPercent: 120, mpCost: 18, cooldown: 3, maxLevel: 10, levelUpBonus: 8,
    targetType: 'single', scaleStat: 'atk', rarity: 'rare',
    description: '帶有吸血效果的攻擊，造成120%ATK傷害，並將造成傷害的30%回復為自身HP。',
    additionalEffect: null,
    specialMechanic: { lifesteal: 30, aoe: 'single', aoeDescription: '單體' },
    sortOrder: 110
  },
  {
    code: 'P11', name: '雙重斬', questTitle: '雙刃交錯・連斬之技',
    category: 'physical', skillType: 'attack', wuxing: '金',
    powerPercent: 90, mpCost: 14, cooldown: 2, maxLevel: 10, levelUpBonus: 6,
    targetType: 'single', scaleStat: 'atk', rarity: 'common',
    description: '快速的雙刀連斬，攻擊同一目標2次。第一擊90%ATK，第二擊108%ATK（+20%加成）。',
    additionalEffect: null,
    specialMechanic: { hitCount: [2, 2], multiTargetHit: false, secondHitBonus: 20, aoe: 'single', aoeDescription: '單體（2連擊）' },
    sortOrder: 111
  },
  {
    code: 'P12', name: '戰慄襲心', questTitle: '恐懼之握・襲心之術',
    category: 'physical', skillType: 'attack', wuxing: '火',
    powerPercent: 100, mpCost: 20, cooldown: 3, maxLevel: 10, levelUpBonus: 5,
    targetType: 'single', scaleStat: 'atk', rarity: 'rare',
    description: '帶有恐懼效果的攻擊，造成100%ATK傷害，50%機率使目標暈眩（下回合無法行動）。',
    additionalEffect: { type: 'stun', chance: 50, value: 0, duration: 1, stackable: false },
    specialMechanic: { aoe: 'single', aoeDescription: '單體' },
    sortOrder: 112
  },
  {
    code: 'P13', name: '護衛', questTitle: '鐵壁守護・護衛之盾',
    category: 'physical', skillType: 'passive', wuxing: '土',
    powerPercent: 0, mpCost: 0, cooldown: 0, maxLevel: 10, levelUpBonus: 0,
    targetType: 'self', scaleStat: 'none', rarity: 'rare',
    description: '被動技能。當隊友受到攻擊時，有機率自動替隊友承受傷害，且傷害減半。觸發機率隨等級提升。',
    additionalEffect: null,
    specialMechanic: { isPassive: true, passiveType: 'guard', passiveTriggerChance: 10, passiveChancePerLevel: 5, guardDamageReduction: 50, aoe: 'self', aoeDescription: '被動（護衛隊友）' },
    sortOrder: 113
  },
  {
    code: 'P14', name: '陽炎', questTitle: '幻影殘像・陽炎之舞',
    category: 'physical', skillType: 'passive', wuxing: '火',
    powerPercent: 0, mpCost: 0, cooldown: 0, maxLevel: 10, levelUpBonus: 0,
    targetType: 'self', scaleStat: 'none', rarity: 'rare',
    description: '被動技能。有機率完全迴避物理攻擊。觸發機率隨等級提升（每級+3%）。',
    additionalEffect: null,
    specialMechanic: { isPassive: true, passiveType: 'dodge', passiveTriggerChance: 3, passiveChancePerLevel: 3, aoe: 'self', aoeDescription: '被動（迴避）' },
    sortOrder: 114
  },
  {
    code: 'P15', name: '騎士之譽', questTitle: '背水一戰・騎士之魂',
    category: 'physical', skillType: 'passive', wuxing: '土',
    powerPercent: 0, mpCost: 0, cooldown: 0, maxLevel: 10, levelUpBonus: 0,
    targetType: 'self', scaleStat: 'none', rarity: 'epic',
    description: '被動技能。當HP低於30%時，ATK和DEF各提升25%。背水一戰的騎士精神。',
    additionalEffect: null,
    specialMechanic: { isPassive: true, passiveType: 'lowHpBoost', lowHpThreshold: 30, lowHpBoostPercent: 25, lowHpBoostStats: ['atk', 'def'], aoe: 'self', aoeDescription: '被動（低血量增強）' },
    sortOrder: 115
  },

  // ============================================================
  // B. 五行元素魔法系 (M01~M17) — 基於 MTK
  // ============================================================
  // --- 火系 ---
  {
    code: 'M01', name: '火焰魔法', questTitle: '烈焰初燃・火之啟蒙',
    category: 'magic', skillType: 'attack', wuxing: '火',
    powerPercent: 130, mpCost: 8, cooldown: 1, maxLevel: 10, levelUpBonus: 10,
    targetType: 'single', scaleStat: 'mtk', rarity: 'common',
    description: '召喚火焰攻擊單一敵人，造成130%MTK傷害，15%機率使目標灼燒3回合。',
    additionalEffect: { type: 'burn', chance: 15, value: 8, duration: 3, stackable: false },
    specialMechanic: { aoe: 'single', aoeDescription: '單體' },
    sortOrder: 201
  },
  {
    code: 'M02', name: '烈焰魔法', questTitle: '焚天烈焰・火之進階',
    category: 'magic', skillType: 'attack', wuxing: '火',
    powerPercent: 110, mpCost: 18, cooldown: 3, maxLevel: 10, levelUpBonus: 8,
    targetType: 't_shape', scaleStat: 'mtk', rarity: 'rare',
    description: '召喚烈焰攻擊T字形3個敵人，每個造成110%MTK傷害，15%機率灼燒。',
    additionalEffect: { type: 'burn', chance: 15, value: 8, duration: 3, stackable: false },
    specialMechanic: { aoe: 't_shape_3', aoeDescription: 'T字形3體' },
    sortOrder: 202
  },
  {
    code: 'M03', name: '業火魔法', questTitle: '業火焚世・火之極致',
    category: 'magic', skillType: 'attack', wuxing: '火',
    powerPercent: 100, mpCost: 28, cooldown: 5, maxLevel: 10, levelUpBonus: 8,
    targetType: 'cross', scaleStat: 'mtk', rarity: 'epic',
    description: '召喚業火攻擊十字形5個敵人，每個造成100%MTK傷害，20%機率灼燒。',
    additionalEffect: { type: 'burn', chance: 20, value: 10, duration: 3, stackable: false },
    specialMechanic: { aoe: 'cross_5', aoeDescription: '十字形5體' },
    sortOrder: 203
  },
  // --- 水系 ---
  {
    code: 'M04', name: '冰凍魔法', questTitle: '寒冰初凝・水之啟蒙',
    category: 'magic', skillType: 'attack', wuxing: '水',
    powerPercent: 125, mpCost: 10, cooldown: 1, maxLevel: 10, levelUpBonus: 10,
    targetType: 'single', scaleStat: 'mtk', rarity: 'common',
    description: '召喚寒冰攻擊單一敵人，造成125%MTK傷害，20%機率冰凍2回合（無法行動，受物理傷害+50%）。',
    additionalEffect: { type: 'freeze', chance: 20, value: 50, duration: 2, stackable: false },
    specialMechanic: { aoe: 'single', aoeDescription: '單體' },
    sortOrder: 204
  },
  {
    code: 'M05', name: '暴風雪魔法', questTitle: '冰封暴風・水之進階',
    category: 'magic', skillType: 'attack', wuxing: '水',
    powerPercent: 105, mpCost: 20, cooldown: 3, maxLevel: 10, levelUpBonus: 8,
    targetType: 't_shape', scaleStat: 'mtk', rarity: 'rare',
    description: '召喚暴風雪攻擊T字形3個敵人，每個造成105%MTK傷害，15%機率冰凍。',
    additionalEffect: { type: 'freeze', chance: 15, value: 50, duration: 2, stackable: false },
    specialMechanic: { aoe: 't_shape_3', aoeDescription: 'T字形3體' },
    sortOrder: 205
  },
  {
    code: 'M06', name: '極寒魔法', questTitle: '絕對零度・水之極致',
    category: 'magic', skillType: 'attack', wuxing: '水',
    powerPercent: 95, mpCost: 30, cooldown: 5, maxLevel: 10, levelUpBonus: 8,
    targetType: 'cross', scaleStat: 'mtk', rarity: 'epic',
    description: '召喚極寒攻擊十字形5個敵人，每個造成95%MTK傷害，20%機率冰凍。',
    additionalEffect: { type: 'freeze', chance: 20, value: 50, duration: 2, stackable: false },
    specialMechanic: { aoe: 'cross_5', aoeDescription: '十字形5體' },
    sortOrder: 206
  },
  // --- 木系 ---
  {
    code: 'M07', name: '風刃魔法', questTitle: '疾風之刃・木之啟蒙',
    category: 'magic', skillType: 'attack', wuxing: '木',
    powerPercent: 120, mpCost: 8, cooldown: 1, maxLevel: 10, levelUpBonus: 10,
    targetType: 'single', scaleStat: 'mtk', rarity: 'common',
    description: '召喚風刃攻擊單一敵人，造成120%MTK傷害，15%機率降低目標防禦20%持續2回合。',
    additionalEffect: { type: 'defDown', chance: 15, value: 20, duration: 2, stackable: false },
    specialMechanic: { aoe: 'single', aoeDescription: '單體' },
    sortOrder: 207
  },
  {
    code: 'M08', name: '暴風魔法', questTitle: '狂風怒號・木之進階',
    category: 'magic', skillType: 'attack', wuxing: '木',
    powerPercent: 100, mpCost: 18, cooldown: 3, maxLevel: 10, levelUpBonus: 8,
    targetType: 't_shape', scaleStat: 'mtk', rarity: 'rare',
    description: '召喚暴風攻擊T字形3個敵人，每個造成100%MTK傷害，15%機率降防。',
    additionalEffect: { type: 'defDown', chance: 15, value: 20, duration: 2, stackable: false },
    specialMechanic: { aoe: 't_shape_3', aoeDescription: 'T字形3體' },
    sortOrder: 208
  },
  {
    code: 'M09', name: '龍捲魔法', questTitle: '天旋地轉・木之極致',
    category: 'magic', skillType: 'attack', wuxing: '木',
    powerPercent: 90, mpCost: 28, cooldown: 5, maxLevel: 10, levelUpBonus: 8,
    targetType: 'cross', scaleStat: 'mtk', rarity: 'epic',
    description: '召喚龍捲風攻擊十字形5個敵人，每個造成90%MTK傷害，20%機率降防。',
    additionalEffect: { type: 'defDown', chance: 20, value: 25, duration: 2, stackable: false },
    specialMechanic: { aoe: 'cross_5', aoeDescription: '十字形5體' },
    sortOrder: 209
  },
  // --- 土系 ---
  {
    code: 'M10', name: '隕石魔法', questTitle: '天降隕石・土之啟蒙',
    category: 'magic', skillType: 'attack', wuxing: '土',
    powerPercent: 135, mpCost: 12, cooldown: 1, maxLevel: 10, levelUpBonus: 10,
    targetType: 'single', scaleStat: 'mtk', rarity: 'common',
    description: '召喚隕石砸向單一敵人，造成135%MTK傷害，10%機率暈眩1回合。',
    additionalEffect: { type: 'stun', chance: 10, value: 0, duration: 1, stackable: false },
    specialMechanic: { aoe: 'single', aoeDescription: '單體' },
    sortOrder: 210
  },
  {
    code: 'M11', name: '地裂魔法', questTitle: '大地震裂・土之進階',
    category: 'magic', skillType: 'attack', wuxing: '土',
    powerPercent: 115, mpCost: 22, cooldown: 3, maxLevel: 10, levelUpBonus: 8,
    targetType: 't_shape', scaleStat: 'mtk', rarity: 'rare',
    description: '使大地裂開攻擊T字形3個敵人，每個造成115%MTK傷害，10%機率暈眩。',
    additionalEffect: { type: 'stun', chance: 10, value: 0, duration: 1, stackable: false },
    specialMechanic: { aoe: 't_shape_3', aoeDescription: 'T字形3體' },
    sortOrder: 211
  },
  {
    code: 'M12', name: '天崩地裂', questTitle: '天崩地裂・土之極致',
    category: 'magic', skillType: 'attack', wuxing: '土',
    powerPercent: 105, mpCost: 32, cooldown: 5, maxLevel: 10, levelUpBonus: 8,
    targetType: 'cross', scaleStat: 'mtk', rarity: 'epic',
    description: '引發天崩地裂攻擊十字形5個敵人，每個造成105%MTK傷害，15%機率暈眩。',
    additionalEffect: { type: 'stun', chance: 15, value: 0, duration: 1, stackable: false },
    specialMechanic: { aoe: 'cross_5', aoeDescription: '十字形5體' },
    sortOrder: 212
  },
  // --- 金系 ---
  {
    code: 'M13', name: '金光斬', questTitle: '金光萬丈・金之啟蒙',
    category: 'magic', skillType: 'attack', wuxing: '金',
    powerPercent: 128, mpCost: 10, cooldown: 1, maxLevel: 10, levelUpBonus: 10,
    targetType: 'single', scaleStat: 'mtk', rarity: 'common',
    description: '凝聚金光斬向單一敵人，造成128%MTK傷害，15%機率降低目標速度20%持續2回合。',
    additionalEffect: { type: 'spdDown', chance: 15, value: 20, duration: 2, stackable: false },
    specialMechanic: { aoe: 'single', aoeDescription: '單體' },
    sortOrder: 213
  },
  {
    code: 'M14', name: '金光陣', questTitle: '金光萬道・金之進階',
    category: 'magic', skillType: 'attack', wuxing: '金',
    powerPercent: 108, mpCost: 20, cooldown: 3, maxLevel: 10, levelUpBonus: 8,
    targetType: 't_shape', scaleStat: 'mtk', rarity: 'rare',
    description: '展開金光陣攻擊T字形3個敵人，每個造成108%MTK傷害，15%機率降速。',
    additionalEffect: { type: 'spdDown', chance: 15, value: 20, duration: 2, stackable: false },
    specialMechanic: { aoe: 't_shape_3', aoeDescription: 'T字形3體' },
    sortOrder: 214
  },
  {
    code: 'M15', name: '金光天罰', questTitle: '天罰降臨・金之極致',
    category: 'magic', skillType: 'attack', wuxing: '金',
    powerPercent: 98, mpCost: 30, cooldown: 5, maxLevel: 10, levelUpBonus: 8,
    targetType: 'cross', scaleStat: 'mtk', rarity: 'epic',
    description: '降下金光天罰攻擊十字形5個敵人，每個造成98%MTK傷害，20%機率降速。',
    additionalEffect: { type: 'spdDown', chance: 20, value: 25, duration: 2, stackable: false },
    specialMechanic: { aoe: 'cross_5', aoeDescription: '十字形5體' },
    sortOrder: 215
  },
  // --- 吸血魔法 ---
  {
    code: 'M16', name: '吸血魔法', questTitle: '暗夜吸魂・吸血之術',
    category: 'magic', skillType: 'attack', wuxing: '水',
    powerPercent: 100, mpCost: 15, cooldown: 2, maxLevel: 10, levelUpBonus: 8,
    targetType: 'single', scaleStat: 'mtk', rarity: 'rare',
    description: '以暗黑魔法攻擊敵人，造成100%MTK傷害，並將造成傷害的50%回復為自身HP。',
    additionalEffect: null,
    specialMechanic: { lifesteal: 50, aoe: 'single', aoeDescription: '單體（吸血）' },
    sortOrder: 216
  },
  {
    code: 'M17', name: '超強吸血魔法', questTitle: '血族禁咒・超吸之術',
    category: 'magic', skillType: 'attack', wuxing: '水',
    powerPercent: 80, mpCost: 25, cooldown: 4, maxLevel: 10, levelUpBonus: 6,
    targetType: 't_shape', scaleStat: 'mtk', rarity: 'epic',
    description: '以強力暗黑魔法攻擊T字形3個敵人，每個造成80%MTK傷害，將總傷害的40%回復HP。',
    additionalEffect: null,
    specialMechanic: { lifesteal: 40, aoe: 't_shape_3', aoeDescription: 'T字形3體（吸血）' },
    sortOrder: 217
  },

  // ============================================================
  // C. 咒術/狀態控制系 (S01~S12) — 基於 MTK
  // ============================================================
  {
    code: 'S01', name: '昏睡魔法', questTitle: '夢境之門・昏睡之咒',
    category: 'status', skillType: 'debuff', wuxing: '水',
    powerPercent: 0, mpCost: 15, cooldown: 3, maxLevel: 10, levelUpBonus: 0,
    targetType: 'single', scaleStat: 'mtk', rarity: 'common',
    description: '對單一敵人施放昏睡咒術，70%機率使目標昏睡5回合。昏睡中無法行動，被攻擊時解除。',
    additionalEffect: { type: 'sleep', chance: 70, value: 0, duration: 5, stackable: false },
    specialMechanic: { statusChancePerLevel: 3, aoe: 'single', aoeDescription: '單體' },
    sortOrder: 301
  },
  {
    code: 'S02', name: '昏睡群體', questTitle: '沉夢領域・昏睡擴散',
    category: 'status', skillType: 'debuff', wuxing: '水',
    powerPercent: 0, mpCost: 30, cooldown: 5, maxLevel: 10, levelUpBonus: 0,
    targetType: 't_shape', scaleStat: 'mtk', rarity: 'rare',
    description: '對T字形3個敵人施放昏睡咒術，50%機率使目標昏睡4回合。',
    additionalEffect: { type: 'sleep', chance: 50, value: 0, duration: 4, stackable: false },
    specialMechanic: { statusChancePerLevel: 3, aoe: 't_shape_3', aoeDescription: 'T字形3體' },
    sortOrder: 302
  },
  {
    code: 'S03', name: '石化魔法', questTitle: '化石凝望・石化之眼',
    category: 'status', skillType: 'debuff', wuxing: '土',
    powerPercent: 0, mpCost: 18, cooldown: 4, maxLevel: 10, levelUpBonus: 0,
    targetType: 'single', scaleStat: 'mtk', rarity: 'rare',
    description: '對單一敵人施放石化咒術，60%機率使目標石化3回合。石化中無法行動但DEF+50%。',
    additionalEffect: { type: 'petrify', chance: 60, value: 50, duration: 3, stackable: false },
    specialMechanic: { statusChancePerLevel: 3, aoe: 'single', aoeDescription: '單體' },
    sortOrder: 303
  },
  {
    code: 'S04', name: '石化群體', questTitle: '石化領域・化石擴散',
    category: 'status', skillType: 'debuff', wuxing: '土',
    powerPercent: 0, mpCost: 35, cooldown: 6, maxLevel: 10, levelUpBonus: 0,
    targetType: 't_shape', scaleStat: 'mtk', rarity: 'epic',
    description: '對T字形3個敵人施放石化咒術，40%機率使目標石化2回合。',
    additionalEffect: { type: 'petrify', chance: 40, value: 50, duration: 2, stackable: false },
    specialMechanic: { statusChancePerLevel: 3, aoe: 't_shape_3', aoeDescription: 'T字形3體' },
    sortOrder: 304
  },
  {
    code: 'S05', name: '混亂魔法', questTitle: '心智崩壞・混亂之咒',
    category: 'status', skillType: 'debuff', wuxing: '火',
    powerPercent: 0, mpCost: 20, cooldown: 4, maxLevel: 10, levelUpBonus: 0,
    targetType: 'single', scaleStat: 'mtk', rarity: 'rare',
    description: '對單一敵人施放混亂咒術，65%機率使目標混亂4回合。混亂中隨機攻擊友方或敵方。',
    additionalEffect: { type: 'confuse', chance: 65, value: 0, duration: 4, stackable: false },
    specialMechanic: { statusChancePerLevel: 3, aoe: 'single', aoeDescription: '單體' },
    sortOrder: 305
  },
  {
    code: 'S06', name: '混亂群體', questTitle: '混沌領域・混亂擴散',
    category: 'status', skillType: 'debuff', wuxing: '火',
    powerPercent: 0, mpCost: 38, cooldown: 6, maxLevel: 10, levelUpBonus: 0,
    targetType: 't_shape', scaleStat: 'mtk', rarity: 'epic',
    description: '對T字形3個敵人施放混亂咒術，45%機率使目標混亂3回合。',
    additionalEffect: { type: 'confuse', chance: 45, value: 0, duration: 3, stackable: false },
    specialMechanic: { statusChancePerLevel: 3, aoe: 't_shape_3', aoeDescription: 'T字形3體' },
    sortOrder: 306
  },
  {
    code: 'S07', name: '中毒魔法', questTitle: '蝕骨毒霧・中毒之咒',
    category: 'status', skillType: 'debuff', wuxing: '木',
    powerPercent: 0, mpCost: 10, cooldown: 2, maxLevel: 10, levelUpBonus: 0,
    targetType: 'single', scaleStat: 'mtk', rarity: 'common',
    description: '對單一敵人施放中毒咒術，75%機率使目標中毒5回合（每回合損失8%最大HP）。',
    additionalEffect: { type: 'poison', chance: 75, value: 8, duration: 5, stackable: false },
    specialMechanic: { statusChancePerLevel: 3, aoe: 'single', aoeDescription: '單體' },
    sortOrder: 307
  },
  {
    code: 'S08', name: '中毒群體', questTitle: '瘴氣蔓延・毒霧擴散',
    category: 'status', skillType: 'debuff', wuxing: '木',
    powerPercent: 0, mpCost: 25, cooldown: 4, maxLevel: 10, levelUpBonus: 0,
    targetType: 't_shape', scaleStat: 'mtk', rarity: 'rare',
    description: '對T字形3個敵人施放中毒咒術，55%機率使目標中毒4回合。',
    additionalEffect: { type: 'poison', chance: 55, value: 8, duration: 4, stackable: false },
    specialMechanic: { statusChancePerLevel: 3, aoe: 't_shape_3', aoeDescription: 'T字形3體' },
    sortOrder: 308
  },
  {
    code: 'S09', name: '遺忘魔法', questTitle: '記憶封印・遺忘之咒',
    category: 'status', skillType: 'debuff', wuxing: '水',
    powerPercent: 0, mpCost: 22, cooldown: 4, maxLevel: 10, levelUpBonus: 0,
    targetType: 'single', scaleStat: 'mtk', rarity: 'rare',
    description: '對單一敵人施放遺忘咒術，55%機率使目標遺忘3回合（無法使用技能，只能普攻）。',
    additionalEffect: { type: 'forget', chance: 55, value: 0, duration: 3, stackable: false },
    specialMechanic: { statusChancePerLevel: 3, aoe: 'single', aoeDescription: '單體' },
    sortOrder: 309
  },
  {
    code: 'S10', name: '遺忘群體', questTitle: '失憶領域・遺忘擴散',
    category: 'status', skillType: 'debuff', wuxing: '水',
    powerPercent: 0, mpCost: 40, cooldown: 6, maxLevel: 10, levelUpBonus: 0,
    targetType: 't_shape', scaleStat: 'mtk', rarity: 'epic',
    description: '對T字形3個敵人施放遺忘咒術，35%機率使目標遺忘2回合。',
    additionalEffect: { type: 'forget', chance: 35, value: 0, duration: 2, stackable: false },
    specialMechanic: { statusChancePerLevel: 3, aoe: 't_shape_3', aoeDescription: 'T字形3體' },
    sortOrder: 310
  },
  {
    code: 'S11', name: '酒醉魔法', questTitle: '醉仙迷蹤・酒醉之咒',
    category: 'status', skillType: 'debuff', wuxing: '水',
    powerPercent: 0, mpCost: 18, cooldown: 3, maxLevel: 10, levelUpBonus: 0,
    targetType: 'single', scaleStat: 'mtk', rarity: 'common',
    description: '對單一敵人施放酒醉咒術，70%機率使目標酒醉5回合（命中率-30%，但ATK+20%）。',
    additionalEffect: { type: 'drunk', chance: 70, value: 30, duration: 5, stackable: false },
    specialMechanic: { statusChancePerLevel: 3, drunkAtkBoost: 20, aoe: 'single', aoeDescription: '單體' },
    sortOrder: 311
  },
  {
    code: 'S12', name: '酒醉群體', questTitle: '醉夢領域・酒醉擴散',
    category: 'status', skillType: 'debuff', wuxing: '水',
    powerPercent: 0, mpCost: 35, cooldown: 5, maxLevel: 10, levelUpBonus: 0,
    targetType: 't_shape', scaleStat: 'mtk', rarity: 'rare',
    description: '對T字形3個敵人施放酒醉咒術，50%機率使目標酒醉4回合。',
    additionalEffect: { type: 'drunk', chance: 50, value: 30, duration: 4, stackable: false },
    specialMechanic: { statusChancePerLevel: 3, drunkAtkBoost: 20, aoe: 't_shape_3', aoeDescription: 'T字形3體' },
    sortOrder: 312
  },

  // ============================================================
  // D. 治療/輔助系 (A01~A18) — 基於 MTK
  // ============================================================
  {
    code: 'A01', name: '補血魔法', questTitle: '生命之泉・初級治癒',
    category: 'support', skillType: 'heal', wuxing: '水',
    powerPercent: 80, mpCost: 12, cooldown: 1, maxLevel: 10, levelUpBonus: 8,
    targetType: 'single', scaleStat: 'mtk', rarity: 'common',
    description: '對單一隊友施放治癒魔法，回復80%MTK的HP。最基礎的治療技能。',
    additionalEffect: null,
    specialMechanic: { healType: 'instant', aoe: 'single', aoeDescription: '單體（友方）' },
    sortOrder: 401
  },
  {
    code: 'A02', name: '強效補血魔法', questTitle: '生命洪流・強效治癒',
    category: 'support', skillType: 'heal', wuxing: '水',
    powerPercent: 120, mpCost: 20, cooldown: 2, maxLevel: 10, levelUpBonus: 10,
    targetType: 'single', scaleStat: 'mtk', rarity: 'rare',
    description: '對單一隊友施放強效治癒魔法，回復120%MTK的HP。',
    additionalEffect: null,
    specialMechanic: { healType: 'instant', aoe: 'single', aoeDescription: '單體（友方）' },
    sortOrder: 402
  },
  {
    code: 'A03', name: '超強補血魔法', questTitle: '生命之雨・全體治癒',
    category: 'support', skillType: 'heal', wuxing: '水',
    powerPercent: 80, mpCost: 30, cooldown: 4, maxLevel: 10, levelUpBonus: 6,
    targetType: 'all_ally', scaleStat: 'mtk', rarity: 'epic',
    description: '對全體隊友施放治癒魔法，每人回復80%MTK的HP。強力的全體回復技能。',
    additionalEffect: null,
    specialMechanic: { healType: 'instant', aoe: 'all_ally', aoeDescription: '友方全體' },
    sortOrder: 403
  },
  {
    code: 'A04', name: '氣絕回復', questTitle: '起死回生・復活之術',
    category: 'support', skillType: 'heal', wuxing: '木',
    powerPercent: 30, mpCost: 30, cooldown: 6, maxLevel: 10, levelUpBonus: 5,
    targetType: 'single', scaleStat: 'mtk', rarity: 'epic',
    description: '復活一名倒地的隊友，回復其30%最大HP。等級越高回復越多。',
    additionalEffect: null,
    specialMechanic: { healType: 'revive', aoe: 'single', aoeDescription: '單體（倒地友方）' },
    sortOrder: 404
  },
  {
    code: 'A05', name: '恢復魔法', questTitle: '生生不息・持續回復',
    category: 'support', skillType: 'heal', wuxing: '木',
    powerPercent: 8, mpCost: 22, cooldown: 4, maxLevel: 10, levelUpBonus: 2,
    targetType: 'single', scaleStat: 'mtk', rarity: 'rare',
    description: '對單一隊友施放持續回復，每回合回復8%MTK的HP，持續5回合。',
    additionalEffect: null,
    specialMechanic: { healType: 'hot', hotDuration: 5, aoe: 'single', aoeDescription: '單體（友方，持續回復）' },
    sortOrder: 405
  },
  {
    code: 'A06', name: '潔淨魔法', questTitle: '清風拂塵・潔淨之光',
    category: 'support', skillType: 'buff', wuxing: '水',
    powerPercent: 0, mpCost: 15, cooldown: 2, maxLevel: 10, levelUpBonus: 0,
    targetType: 'single', scaleStat: 'none', rarity: 'rare',
    description: '解除單一隊友身上的所有異常狀態（中毒/灼燒/冰凍/昏睡/石化/混亂/酒醉/遺忘）。',
    additionalEffect: null,
    specialMechanic: { healType: 'cleanse', cleanseCount: -1, aoe: 'single', aoeDescription: '單體（友方）' },
    sortOrder: 406
  },
  {
    code: 'A07', name: '全體潔淨', questTitle: '淨化領域・全體潔淨',
    category: 'support', skillType: 'buff', wuxing: '水',
    powerPercent: 0, mpCost: 28, cooldown: 4, maxLevel: 10, levelUpBonus: 0,
    targetType: 'all_ally', scaleStat: 'none', rarity: 'epic',
    description: '解除全體隊友身上的所有異常狀態。',
    additionalEffect: null,
    specialMechanic: { healType: 'cleanse', cleanseCount: -1, aoe: 'all_ally', aoeDescription: '友方全體' },
    sortOrder: 407
  },
  {
    code: 'A08', name: '攻擊吸收', questTitle: '鐵壁吸收・物理護盾',
    category: 'support', skillType: 'buff', wuxing: '土',
    powerPercent: 0, mpCost: 18, cooldown: 4, maxLevel: 10, levelUpBonus: 0,
    targetType: 'single', scaleStat: 'none', rarity: 'rare',
    description: '為單一隊友施加物理吸收護盾，3回合內受到物理傷害的30%轉化為HP回復。',
    additionalEffect: null,
    specialMechanic: { absorb: { type: 'physical', percent: 30, duration: 3 }, aoe: 'single', aoeDescription: '單體（友方）' },
    sortOrder: 408
  },
  {
    code: 'A09', name: '魔法吸收', questTitle: '魔力吸收・魔法護盾',
    category: 'support', skillType: 'buff', wuxing: '火',
    powerPercent: 0, mpCost: 20, cooldown: 4, maxLevel: 10, levelUpBonus: 0,
    targetType: 'single', scaleStat: 'none', rarity: 'rare',
    description: '為單一隊友施加魔法吸收護盾，3回合內受到魔法傷害的30%轉化為HP回復。',
    additionalEffect: null,
    specialMechanic: { absorb: { type: 'magical', percent: 30, duration: 3 }, aoe: 'single', aoeDescription: '單體（友方）' },
    sortOrder: 409
  },
  {
    code: 'A10', name: '明鏡止水', questTitle: '心如止水・明鏡之境',
    category: 'support', skillType: 'heal', wuxing: '水',
    powerPercent: 40, mpCost: 0, cooldown: 1, maxLevel: 10, levelUpBonus: 5,
    targetType: 'self', scaleStat: 'mtk', rarity: 'epic',
    description: '防禦時自動觸發，回復40%MTK的HP並恢復50%最大MP。只能在選擇「防禦」指令時發動。',
    additionalEffect: null,
    specialMechanic: { onDefend: true, defendHealPercent: 40, defendMpPercent: 50, aoe: 'self', aoeDescription: '自身（防禦時觸發）' },
    sortOrder: 410
  },
  {
    code: 'A11', name: '攻擊增幅', questTitle: '戰意高昂・攻擊強化',
    category: 'support', skillType: 'buff', wuxing: '火',
    powerPercent: 0, mpCost: 15, cooldown: 3, maxLevel: 10, levelUpBonus: 0,
    targetType: 'single', scaleStat: 'none', rarity: 'common',
    description: '增強單一隊友的ATK 30%，持續3回合。等級越高持續時間越長。',
    additionalEffect: null,
    specialMechanic: { buff: { stat: 'atk', percent: 30, duration: 3, isDebuff: false }, buffDurationPerLevel: 0.2, aoe: 'single', aoeDescription: '單體（友方）' },
    sortOrder: 411
  },
  {
    code: 'A12', name: '防禦增幅', questTitle: '銅牆鐵壁・防禦強化',
    category: 'support', skillType: 'buff', wuxing: '土',
    powerPercent: 0, mpCost: 15, cooldown: 3, maxLevel: 10, levelUpBonus: 0,
    targetType: 'single', scaleStat: 'none', rarity: 'common',
    description: '增強單一隊友的DEF 30%，持續3回合。',
    additionalEffect: null,
    specialMechanic: { buff: { stat: 'def', percent: 30, duration: 3, isDebuff: false }, buffDurationPerLevel: 0.2, aoe: 'single', aoeDescription: '單體（友方）' },
    sortOrder: 412
  },
  {
    code: 'A13', name: '魔力增幅', questTitle: '魔力覺醒・魔攻強化',
    category: 'support', skillType: 'buff', wuxing: '木',
    powerPercent: 0, mpCost: 15, cooldown: 3, maxLevel: 10, levelUpBonus: 0,
    targetType: 'single', scaleStat: 'none', rarity: 'common',
    description: '增強單一隊友的MTK 30%，持續3回合。',
    additionalEffect: null,
    specialMechanic: { buff: { stat: 'mtk', percent: 30, duration: 3, isDebuff: false }, buffDurationPerLevel: 0.2, aoe: 'single', aoeDescription: '單體（友方）' },
    sortOrder: 413
  },
  {
    code: 'A14', name: '速度增幅', questTitle: '疾風之力・速度強化',
    category: 'support', skillType: 'buff', wuxing: '金',
    powerPercent: 0, mpCost: 15, cooldown: 3, maxLevel: 10, levelUpBonus: 0,
    targetType: 'single', scaleStat: 'none', rarity: 'common',
    description: '增強單一隊友的SPD 30%，持續3回合。',
    additionalEffect: null,
    specialMechanic: { buff: { stat: 'spd', percent: 30, duration: 3, isDebuff: false }, buffDurationPerLevel: 0.2, aoe: 'single', aoeDescription: '單體（友方）' },
    sortOrder: 414
  },
  {
    code: 'A15', name: '全體攻擊增幅', questTitle: '戰吼鼓舞・全體攻擊強化',
    category: 'support', skillType: 'buff', wuxing: '火',
    powerPercent: 0, mpCost: 30, cooldown: 5, maxLevel: 10, levelUpBonus: 0,
    targetType: 'all_ally', scaleStat: 'none', rarity: 'epic',
    description: '增強全體隊友的ATK 20%，持續3回合。',
    additionalEffect: null,
    specialMechanic: { buff: { stat: 'atk', percent: 20, duration: 3, isDebuff: false }, aoe: 'all_ally', aoeDescription: '友方全體' },
    sortOrder: 415
  },
  {
    code: 'A16', name: '全體防禦增幅', questTitle: '堅壁清野・全體防禦強化',
    category: 'support', skillType: 'buff', wuxing: '土',
    powerPercent: 0, mpCost: 30, cooldown: 5, maxLevel: 10, levelUpBonus: 0,
    targetType: 'all_ally', scaleStat: 'none', rarity: 'epic',
    description: '增強全體隊友的DEF 20%，持續3回合。',
    additionalEffect: null,
    specialMechanic: { buff: { stat: 'def', percent: 20, duration: 3, isDebuff: false }, aoe: 'all_ally', aoeDescription: '友方全體' },
    sortOrder: 416
  },
  {
    code: 'A17', name: '魔法恢復', questTitle: '靈泉湧動・魔力再生',
    category: 'support', skillType: 'heal', wuxing: '木',
    powerPercent: 0, mpCost: 0, cooldown: 0, maxLevel: 10, levelUpBonus: 0,
    targetType: 'self', scaleStat: 'none', rarity: 'rare',
    description: '被動技能。每回合自動恢復5%最大MP。等級越高恢復越多（每級+0.5%）。',
    additionalEffect: null,
    specialMechanic: { isPassive: true, passiveType: 'mpRegen', mpRestorePercent: 5, mpRestorePerLevel: 0.5, aoe: 'self', aoeDescription: '被動（自身）' },
    sortOrder: 417
  },
  {
    code: 'A18', name: '聖盾', questTitle: '神聖守護・聖盾之光',
    category: 'support', skillType: 'buff', wuxing: '土',
    powerPercent: 0, mpCost: 25, cooldown: 5, maxLevel: 10, levelUpBonus: 0,
    targetType: 'single', scaleStat: 'none', rarity: 'legendary',
    description: '為單一隊友施加聖盾，3回合內完全免疫一次攻擊（物理或魔法皆可）。',
    additionalEffect: null,
    specialMechanic: { shield: { type: 'all', charges: 1, duration: 3, absorbPercent: 100 }, aoe: 'single', aoeDescription: '單體（友方）' },
    sortOrder: 418
  },

  // ============================================================
  // E. 特殊技能系 (X01~X06)
  // ============================================================
  {
    code: 'X01', name: '暗殺', questTitle: '影殺無形・暗殺之道',
    category: 'special', skillType: 'attack', wuxing: '金',
    powerPercent: 500, mpCost: 25, cooldown: 8, maxLevel: 10, levelUpBonus: 0,
    targetType: 'single', scaleStat: 'atk', rarity: 'legendary',
    description: '從暗處發動致命一擊，50%命中率。命中時造成500%ATK傷害，且有機率即死（BOSS無效）。',
    additionalEffect: null,
    specialMechanic: { accuracyMod: -50, instantKill: true, instantKillChance: 50, bossImmune: true, aoe: 'single', aoeDescription: '單體' },
    sortOrder: 501
  },
  {
    code: 'X02', name: '偷竊', questTitle: '妙手空空・偷竊之技',
    category: 'special', skillType: 'utility', wuxing: '木',
    powerPercent: 0, mpCost: 15, cooldown: 3, maxLevel: 10, levelUpBonus: 0,
    targetType: 'single', scaleStat: 'none', rarity: 'rare',
    description: '嘗試偷取敵方道具，30%機率成功。等級越高成功率越高（每級+3%）。',
    additionalEffect: null,
    specialMechanic: { steal: true, stealChance: 30, stealChancePerLevel: 3, aoe: 'single', aoeDescription: '單體（敵方）' },
    sortOrder: 502
  },
  {
    code: 'X03', name: '挑釁', questTitle: '怒火引燃・挑釁之術',
    category: 'special', skillType: 'utility', wuxing: '火',
    powerPercent: 0, mpCost: 10, cooldown: 4, maxLevel: 10, levelUpBonus: 0,
    targetType: 'single', scaleStat: 'none', rarity: 'common',
    description: '挑釁單一敵人，強制其在接下來3回合內只能攻擊自己。坦克型角色的核心技能。',
    additionalEffect: null,
    specialMechanic: { taunt: { duration: 3 }, tauntDurationPerLevel: 0.2, aoe: 'single', aoeDescription: '單體（敵方）' },
    sortOrder: 503
  },
  {
    code: 'X04', name: '捨身', questTitle: '捨身取義・自爆之術',
    category: 'special', skillType: 'attack', wuxing: '火',
    powerPercent: 400, mpCost: 0, cooldown: 8, maxLevel: 10, levelUpBonus: 20,
    targetType: 'single', scaleStat: 'atk', rarity: 'legendary',
    description: '消耗自身50%當前HP，對敵人造成400%ATK傷害。高風險高回報的自傷技能。',
    additionalEffect: null,
    specialMechanic: { selfDamagePercent: 50, aoe: 'single', aoeDescription: '單體' },
    sortOrder: 504
  },
  {
    code: 'X05', name: '五行封印', questTitle: '封印禁術・五行封鎖',
    category: 'special', skillType: 'debuff', wuxing: '無',
    powerPercent: 0, mpCost: 35, cooldown: 6, maxLevel: 10, levelUpBonus: 0,
    targetType: 'single', scaleStat: 'mtk', rarity: 'legendary',
    description: '封印目標的五行屬性3回合，使其五行攻擊和五行抗性全部歸零。',
    additionalEffect: null,
    specialMechanic: { sealWuxing: true, sealDuration: 3, sealDurationPerLevel: 0.2, aoe: 'single', aoeDescription: '單體（敵方）' },
    sortOrder: 505
  },
  {
    code: 'X06', name: '天命共振', questTitle: '天命共振・終極奧義',
    category: 'special', skillType: 'buff', wuxing: '無',
    powerPercent: 20, mpCost: 50, cooldown: 10, maxLevel: 10, levelUpBonus: 2,
    targetType: 'party', scaleStat: 'mtk', rarity: 'legendary',
    description: '發動天命共振的終極奧義，全體隊友HP/MP各回復20%，並提升ATK/DEF/MTK 15%持續5回合。',
    additionalEffect: null,
    specialMechanic: {
      healType: 'instant',
      healHpPercent: 20,
      healMpPercent: 20,
      buff: { stat: 'all', percent: 15, duration: 5, isDebuff: false },
      aoe: 'party', aoeDescription: '全體（己方含自身）'
    },
    sortOrder: 506
  },

  // ============================================================
  // F. 抵抗系被動 (R01~R06)
  // ============================================================
  {
    code: 'R01', name: '石化抵抗', questTitle: '堅石之心・石化免疫',
    category: 'resistance', skillType: 'passive', wuxing: '土',
    powerPercent: 0, mpCost: 0, cooldown: 0, maxLevel: 10, levelUpBonus: 0,
    targetType: 'self', scaleStat: 'none', rarity: 'common',
    description: '被動技能。有機率抵抗石化狀態。每級增加10%抵抗機率（Lv10=100%免疫）。',
    additionalEffect: null,
    specialMechanic: { isPassive: true, passiveType: 'statusResist', resistType: 'petrify', resistChancePerLevel: 10, aoe: 'self', aoeDescription: '被動（自身）' },
    sortOrder: 601
  },
  {
    code: 'R02', name: '昏睡抵抗', questTitle: '清醒之志・昏睡免疫',
    category: 'resistance', skillType: 'passive', wuxing: '水',
    powerPercent: 0, mpCost: 0, cooldown: 0, maxLevel: 10, levelUpBonus: 0,
    targetType: 'self', scaleStat: 'none', rarity: 'common',
    description: '被動技能。有機率抵抗昏睡狀態。每級增加10%抵抗機率。',
    additionalEffect: null,
    specialMechanic: { isPassive: true, passiveType: 'statusResist', resistType: 'sleep', resistChancePerLevel: 10, aoe: 'self', aoeDescription: '被動（自身）' },
    sortOrder: 602
  },
  {
    code: 'R03', name: '混亂抵抗', questTitle: '心志堅定・混亂免疫',
    category: 'resistance', skillType: 'passive', wuxing: '火',
    powerPercent: 0, mpCost: 0, cooldown: 0, maxLevel: 10, levelUpBonus: 0,
    targetType: 'self', scaleStat: 'none', rarity: 'common',
    description: '被動技能。有機率抵抗混亂狀態。每級增加10%抵抗機率。',
    additionalEffect: null,
    specialMechanic: { isPassive: true, passiveType: 'statusResist', resistType: 'confuse', resistChancePerLevel: 10, aoe: 'self', aoeDescription: '被動（自身）' },
    sortOrder: 603
  },
  {
    code: 'R04', name: '中毒抵抗', questTitle: '百毒不侵・中毒免疫',
    category: 'resistance', skillType: 'passive', wuxing: '木',
    powerPercent: 0, mpCost: 0, cooldown: 0, maxLevel: 10, levelUpBonus: 0,
    targetType: 'self', scaleStat: 'none', rarity: 'common',
    description: '被動技能。有機率抵抗中毒狀態。每級增加10%抵抗機率。',
    additionalEffect: null,
    specialMechanic: { isPassive: true, passiveType: 'statusResist', resistType: 'poison', resistChancePerLevel: 10, aoe: 'self', aoeDescription: '被動（自身）' },
    sortOrder: 604
  },
  {
    code: 'R05', name: '遺忘抵抗', questTitle: '記憶之錨・遺忘免疫',
    category: 'resistance', skillType: 'passive', wuxing: '水',
    powerPercent: 0, mpCost: 0, cooldown: 0, maxLevel: 10, levelUpBonus: 0,
    targetType: 'self', scaleStat: 'none', rarity: 'common',
    description: '被動技能。有機率抵抗遺忘狀態。每級增加10%抵抗機率。',
    additionalEffect: null,
    specialMechanic: { isPassive: true, passiveType: 'statusResist', resistType: 'forget', resistChancePerLevel: 10, aoe: 'self', aoeDescription: '被動（自身）' },
    sortOrder: 605
  },
  {
    code: 'R06', name: '酒醉抵抗', questTitle: '千杯不醉・酒醉免疫',
    category: 'resistance', skillType: 'passive', wuxing: '水',
    powerPercent: 0, mpCost: 0, cooldown: 0, maxLevel: 10, levelUpBonus: 0,
    targetType: 'self', scaleStat: 'none', rarity: 'common',
    description: '被動技能。有機率抵抗酒醉狀態。每級增加10%抵抗機率。',
    additionalEffect: null,
    specialMechanic: { isPassive: true, passiveType: 'statusResist', resistType: 'drunk', resistChancePerLevel: 10, aoe: 'self', aoeDescription: '被動（自身）' },
    sortOrder: 606
  },
];

// ============================================================
// 生成 SQL
// ============================================================
console.log(`Total skills: ${skills.length}`);

// Validate
const codes = skills.map(s => s.code);
const uniqueCodes = new Set(codes);
if (uniqueCodes.size !== codes.length) {
  console.error('DUPLICATE CODES FOUND!');
  process.exit(1);
}

// Category distribution
const catCount = {};
skills.forEach(s => { catCount[s.category] = (catCount[s.category] || 0) + 1; });
console.log('Category distribution:', catCount);

// Wuxing distribution
const wxCount = {};
skills.forEach(s => { wxCount[s.wuxing] = (wxCount[s.wuxing] || 0) + 1; });
console.log('Wuxing distribution:', wxCount);

// Generate SQL batches (10 per batch to avoid size limits)
const BATCH_SIZE = 10;
const batches = [];
for (let i = 0; i < skills.length; i += BATCH_SIZE) {
  batches.push(skills.slice(i, i + BATCH_SIZE));
}

const sqlDir = '/home/ubuntu/oracle-resonance/scripts/sql-skills';
fs.mkdirSync(sqlDir, { recursive: true });

batches.forEach((batch, idx) => {
  const values = batch.map(s => {
    const ae = s.additionalEffect ? `'${json(s.additionalEffect)}'` : 'NULL';
    const sm = s.specialMechanic ? `'${json(s.specialMechanic)}'` : 'NULL';
    const lc = `'${json({ gold: 500, soulCrystal: 10 })}'`;
    const prereq = 'NULL';
    return `('${esc(s.code)}', '${esc(s.name)}', ${s.questTitle ? `'${esc(s.questTitle)}'` : 'NULL'}, '${s.category}', '${s.skillType}', '${esc(s.description)}', '${esc(s.wuxing)}', ${s.powerPercent}, ${s.mpCost}, ${s.cooldown}, ${s.maxLevel}, ${s.levelUpBonus}, ${ae}, ${sm}, ${lc}, ${prereq}, NULL, '${s.targetType}', '${s.scaleStat}', '${s.rarity}', 1, 1, NULL, ${s.sortOrder}, ${NOW}, ${NOW})`;
  });

  const sql = `INSERT INTO game_quest_skill_catalog (code, name, quest_title, category, skill_type, description, wuxing, power_percent, mp_cost, cooldown, max_level, level_up_bonus, additional_effect, special_mechanic, learn_cost, prerequisites, npc_id, target_type, scale_stat, rarity, pet_learnable, player_learnable, icon_url, sort_order, created_at, updated_at) VALUES\n${values.join(',\n')};\n`;

  fs.writeFileSync(`${sqlDir}/batch-${String(idx + 1).padStart(2, '0')}.sql`, sql);
});

console.log(`Generated ${batches.length} SQL batch files in ${sqlDir}`);
console.log('Done!');
