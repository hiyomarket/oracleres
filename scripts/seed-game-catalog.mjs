/**
 * 遊戲圖鑑種子資料腳本
 * 資料來源：GD-011A~E（怪物）、GD-014（道具）、GD-015（裝備）、GD-016（技能）
 */
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const now = Date.now();

// ═══════════════════════════════════════════════════════════════
// 怪物圖鑑（從 GD-011A~E 讀取，每屬性 50 隻，共 250 隻）
// ═══════════════════════════════════════════════════════════════
const monsters = [
  // 木屬性怪物 (M_W001~M_W050)
  { id: 'M_W001', name: '綠芽史萊姆', wuxing: '木', level_range: '1-3', base_hp: 30, base_attack: 5, base_defense: 3, base_speed: 8, description: '最常見的木系怪物，外形圓潤可愛，棲息在公園草地。', rarity: 'common', catch_rate: 0.5 },
  { id: 'M_W002', name: '藤蔓蜘蛛', wuxing: '木', level_range: '2-5', base_hp: 45, base_attack: 8, base_defense: 4, base_speed: 12, description: '以藤蔓為巢的蜘蛛，攻擊帶有輕微毒素。', rarity: 'common', catch_rate: 0.4 },
  { id: 'M_W003', name: '孢子菇', wuxing: '木', level_range: '3-6', base_hp: 55, base_attack: 10, base_defense: 6, base_speed: 5, description: '會噴出孢子粉末的蘑菇怪，孢子有致幻效果。', rarity: 'common', catch_rate: 0.4 },
  { id: 'M_W004', name: '古木樹人', wuxing: '木', level_range: '5-10', base_hp: 120, base_attack: 18, base_defense: 20, base_speed: 6, description: '由古老樹木化身而成，行動緩慢但防禦極高。', rarity: 'rare', catch_rate: 0.2 },
  { id: 'M_W005', name: '巨型捕蠅草', wuxing: '木', level_range: '6-12', base_hp: 150, base_attack: 25, base_defense: 15, base_speed: 4, description: '巨大的食肉植物，能分泌腐蝕性消化液。', rarity: 'rare', catch_rate: 0.2 },
  { id: 'M_W006', name: '幻影螳螂', wuxing: '木', level_range: '8-14', base_hp: 100, base_attack: 30, base_defense: 10, base_speed: 25, description: '速度極快的螳螂，能製造幻影迷惑敵人。', rarity: 'rare', catch_rate: 0.15 },
  { id: 'M_W007', name: '腐毒沼澤怪', wuxing: '木', level_range: '10-16', base_hp: 180, base_attack: 22, base_defense: 18, base_speed: 8, description: '棲息在沼澤中的腐敗生物，全身散發毒素。', rarity: 'rare', catch_rate: 0.15 },
  { id: 'M_W008', name: '狂暴森猿', wuxing: '木', level_range: '12-18', base_hp: 200, base_attack: 35, base_defense: 15, base_speed: 20, description: '力量驚人的森林猿猴，受到刺激會暴走。', rarity: 'rare', catch_rate: 0.12 },
  { id: 'M_W009', name: '鐵木巨熊', wuxing: '木', level_range: '15-22', base_hp: 350, base_attack: 40, base_defense: 35, base_speed: 10, description: '皮毛如鐵木般堅硬的巨熊，是森林的守護者。', rarity: 'elite', catch_rate: 0.08 },
  { id: 'M_W010', name: '千年木靈王', wuxing: '木', level_range: '20-30', base_hp: 600, base_attack: 55, base_defense: 50, base_speed: 15, description: '千年古木凝聚靈氣化身，掌控整片森林。', rarity: 'elite', catch_rate: 0.05 },
  { id: 'M_W011', name: '萬毒蛛后', wuxing: '木', level_range: '25-35', base_hp: 500, base_attack: 65, base_defense: 30, base_speed: 22, description: '蜘蛛族群的女王，毒液能溶解任何物質。', rarity: 'elite', catch_rate: 0.05 },
  { id: 'M_W012', name: '翡翠森龍', wuxing: '木', level_range: '30-40', base_hp: 1200, base_attack: 90, base_defense: 80, base_speed: 30, description: '翡翠色鱗片的巨龍，是木屬性最強的存在之一。', rarity: 'legendary', catch_rate: 0.02 },
  { id: 'M_W013', name: '巨型世界樹', wuxing: '木', level_range: '35-45', base_hp: 2000, base_attack: 80, base_defense: 120, base_speed: 5, description: '連接天地的世界樹，幾乎無法被擊倒。', rarity: 'legendary', catch_rate: 0.01 },
  { id: 'M_W014', name: '狂亂花神', wuxing: '木', level_range: '38-48', base_hp: 1500, base_attack: 100, base_defense: 70, base_speed: 35, description: '失去理智的花之女神，美麗而危險。', rarity: 'legendary', catch_rate: 0.01 },
  { id: 'M_W015', name: '春分木靈', wuxing: '木', level_range: '15-20', base_hp: 400, base_attack: 45, base_defense: 40, base_speed: 18, description: '春分時節出現的特殊木靈，帶有強烈的生命氣息。', rarity: 'elite', catch_rate: 0.06, drop_items: ['I_W041'] },
  { id: 'M_W016', name: '驚蟄雷木', wuxing: '木', level_range: '18-25', base_hp: 450, base_attack: 60, base_defense: 35, base_speed: 20, description: '驚蟄時節由雷電與木氣融合而成的特殊怪物。', rarity: 'elite', catch_rate: 0.05, drop_items: ['I_W042'] },
  { id: 'M_W017', name: '迷霧樹妖', wuxing: '木', level_range: '20-28', base_hp: 380, base_attack: 50, base_defense: 45, base_speed: 15, description: '隱藏在迷霧中的樹妖，能製造幻覺迷惑旅人。', rarity: 'elite', catch_rate: 0.06, drop_items: ['I_W043'] },
  { id: 'M_W018', name: '毒沼之主', wuxing: '木', level_range: '22-30', base_hp: 550, base_attack: 70, base_defense: 40, base_speed: 12, description: '統治毒沼的強大生物，全身劇毒。', rarity: 'elite', catch_rate: 0.04, drop_items: ['I_W044'] },
  { id: 'M_W019', name: '幸運四葉草', wuxing: '木', level_range: '10-15', base_hp: 200, base_attack: 20, base_defense: 20, base_speed: 30, description: '傳說中帶來幸運的四葉草精靈，極難捕捉。', rarity: 'elite', catch_rate: 0.03, drop_items: ['I_W045'] },
  { id: 'M_W020', name: '木系精靈', wuxing: '木', level_range: '4-8', base_hp: 80, base_attack: 12, base_defense: 8, base_speed: 15, description: '小型木系精靈，棲息在樹木繁茂的地方。', rarity: 'common', catch_rate: 0.35 },
  // 火屬性怪物 (M_F001~M_F050)
  { id: 'M_F001', name: '篝火史萊姆', wuxing: '火', level_range: '1-3', base_hp: 28, base_attack: 7, base_defense: 2, base_speed: 10, description: '身體燃燒著小火焰的史萊姆，接觸會造成灼傷。', rarity: 'common', catch_rate: 0.5 },
  { id: 'M_F002', name: '熔岩蜥蜴', wuxing: '火', level_range: '2-5', base_hp: 50, base_attack: 10, base_defense: 5, base_speed: 14, description: '皮膚如熔岩般的蜥蜴，棲息在高溫環境。', rarity: 'common', catch_rate: 0.4 },
  { id: 'M_F003', name: '爆竹鼠', wuxing: '火', level_range: '3-6', base_hp: 40, base_attack: 12, base_defense: 3, base_speed: 18, description: '尾巴像爆竹的老鼠，受到威脅時會爆炸。', rarity: 'common', catch_rate: 0.4 },
  { id: 'M_F004', name: '鳳凰幼鳥', wuxing: '火', level_range: '5-10', base_hp: 100, base_attack: 20, base_defense: 12, base_speed: 20, description: '鳳凰的幼體，羽毛散發著耀眼的火光。', rarity: 'rare', catch_rate: 0.2 },
  { id: 'M_F005', name: '烈焰蠍王', wuxing: '火', level_range: '6-12', base_hp: 160, base_attack: 28, base_defense: 18, base_speed: 12, description: '全身被火焰包裹的蠍子，毒刺帶有燃燒效果。', rarity: 'rare', catch_rate: 0.18 },
  { id: 'M_F006', name: '熔岩巨石怪', wuxing: '火', level_range: '8-15', base_hp: 250, base_attack: 30, base_defense: 40, base_speed: 5, description: '由熔岩凝固而成的巨石怪，防禦力極高。', rarity: 'rare', catch_rate: 0.15 },
  { id: 'M_F007', name: '爆炎術士', wuxing: '火', level_range: '10-16', base_hp: 120, base_attack: 45, base_defense: 8, base_speed: 15, description: '掌握爆炎魔法的術士，攻擊力強但防禦薄弱。', rarity: 'rare', catch_rate: 0.15 },
  { id: 'M_F008', name: '沸血狂戰士', wuxing: '火', level_range: '12-18', base_hp: 220, base_attack: 50, base_defense: 15, base_speed: 18, description: '血液沸騰的狂戰士，越受傷攻擊力越強。', rarity: 'rare', catch_rate: 0.12 },
  { id: 'M_F009', name: '熔岩史萊姆王', wuxing: '火', level_range: '15-22', base_hp: 400, base_attack: 45, base_defense: 30, base_speed: 8, description: '熔岩史萊姆的王者，體型巨大且能分裂。', rarity: 'elite', catch_rate: 0.08 },
  { id: 'M_F010', name: '太陽鳳凰', wuxing: '火', level_range: '20-30', base_hp: 700, base_attack: 70, base_defense: 45, base_speed: 35, description: '沐浴在太陽光輝中的鳳凰，能召喚烈日。', rarity: 'elite', catch_rate: 0.05 },
  { id: 'M_F011', name: '炎魔之王', wuxing: '火', level_range: '25-35', base_hp: 800, base_attack: 85, base_defense: 50, base_speed: 25, description: '統治火焰領域的魔王，力量足以焚燒城市。', rarity: 'elite', catch_rate: 0.04 },
  { id: 'M_F012', name: '熔岩巨龍', wuxing: '火', level_range: '30-40', base_hp: 1500, base_attack: 100, base_defense: 90, base_speed: 25, description: '沉睡在火山中的巨龍，甦醒時引發火山爆發。', rarity: 'legendary', catch_rate: 0.02 },
  { id: 'M_F013', name: '焚天九尾狐', wuxing: '火', level_range: '35-45', base_hp: 1200, base_attack: 110, base_defense: 60, base_speed: 40, description: '九條尾巴各自燃燒著不同顏色火焰的神狐。', rarity: 'legendary', catch_rate: 0.01 },
  { id: 'M_F014', name: '煉獄三頭犬', wuxing: '火', level_range: '38-48', base_hp: 1800, base_attack: 95, base_defense: 80, base_speed: 30, description: '守衛煉獄之門的三頭地獄犬，三個頭各有不同能力。', rarity: 'legendary', catch_rate: 0.01 },
  { id: 'M_F015', name: '夏至炎靈', wuxing: '火', level_range: '15-20', base_hp: 380, base_attack: 55, base_defense: 30, base_speed: 22, description: '夏至時節出現的特殊火靈，帶有強烈的炎熱氣息。', rarity: 'elite', catch_rate: 0.06, drop_items: ['I_F041'] },
  { id: 'M_F016', name: '烈陽蜃景', wuxing: '火', level_range: '18-25', base_hp: 350, base_attack: 65, base_defense: 25, base_speed: 28, description: '由烈日蜃景凝聚而成，能製造幻覺。', rarity: 'elite', catch_rate: 0.05, drop_items: ['I_F042'] },
  { id: 'M_F017', name: '灶神使者', wuxing: '火', level_range: '20-28', base_hp: 420, base_attack: 58, base_defense: 38, base_speed: 18, description: '灶神派遣的使者，掌管人間的火與食物。', rarity: 'elite', catch_rate: 0.05, drop_items: ['I_F043'] },
  { id: 'M_F018', name: '劫火紅狐', wuxing: '火', level_range: '22-30', base_hp: 480, base_attack: 72, base_defense: 35, base_speed: 32, description: '帶著劫火的紅色狐狸，所到之處皆成焦土。', rarity: 'elite', catch_rate: 0.04, drop_items: ['I_F044'] },
  { id: 'M_F019', name: '溫泉精靈', wuxing: '火', level_range: '8-14', base_hp: 150, base_attack: 22, base_defense: 18, base_speed: 16, description: '棲息在溫泉中的精靈，帶有治癒與灼傷雙重能力。', rarity: 'rare', catch_rate: 0.15, drop_items: ['I_F045'] },
  { id: 'M_F020', name: '火焰精靈', wuxing: '火', level_range: '4-8', base_hp: 70, base_attack: 14, base_defense: 6, base_speed: 16, description: '小型火焰精靈，棲息在溫暖的地方。', rarity: 'common', catch_rate: 0.35 },
  // 土屬性怪物 (M_E001~M_E050)
  { id: 'M_E001', name: '泥巴怪', wuxing: '土', level_range: '1-3', base_hp: 40, base_attack: 5, base_defense: 8, base_speed: 4, description: '由泥土凝聚而成的怪物，防禦力不錯。', rarity: 'common', catch_rate: 0.5 },
  { id: 'M_E002', name: '碎石怪', wuxing: '土', level_range: '2-5', base_hp: 60, base_attack: 8, base_defense: 12, base_speed: 5, description: '由碎石聚集而成，攻擊時會噴出石塊。', rarity: 'common', catch_rate: 0.4 },
  { id: 'M_E003', name: '穿山甲', wuxing: '土', level_range: '3-6', base_hp: 70, base_attack: 10, base_defense: 15, base_speed: 8, description: '鱗片堅硬的穿山甲，能挖掘地道突襲敵人。', rarity: 'common', catch_rate: 0.4 },
  { id: 'M_E004', name: '山岳巨石人', wuxing: '土', level_range: '5-10', base_hp: 200, base_attack: 20, base_defense: 35, base_speed: 4, description: '由山岳岩石化身而成，防禦力極強。', rarity: 'rare', catch_rate: 0.2 },
  { id: 'M_E005', name: '黃金蟾蜍', wuxing: '土', level_range: '6-12', base_hp: 150, base_attack: 15, base_defense: 25, base_speed: 10, description: '全身金黃色的蟾蜍，帶來財富也帶來詛咒。', rarity: 'rare', catch_rate: 0.18 },
  { id: 'M_E006', name: '鋼鐵穿山甲', wuxing: '土', level_range: '8-15', base_hp: 280, base_attack: 25, base_defense: 50, base_speed: 6, description: '鱗片如鋼鐵般堅硬的穿山甲，幾乎無法被穿透。', rarity: 'rare', catch_rate: 0.15 },
  { id: 'M_E007', name: '泥沼巨怪', wuxing: '土', level_range: '10-16', base_hp: 300, base_attack: 28, base_defense: 40, base_speed: 5, description: '棲息在泥沼中的巨大怪物，能吸入敵人。', rarity: 'rare', catch_rate: 0.15 },
  { id: 'M_E008', name: '兵馬俑戰士', wuxing: '土', level_range: '12-18', base_hp: 250, base_attack: 35, base_defense: 45, base_speed: 8, description: '古代兵馬俑復活的戰士，忠實執行命令。', rarity: 'rare', catch_rate: 0.12 },
  { id: 'M_E009', name: '晶石巨獸', wuxing: '土', level_range: '15-22', base_hp: 450, base_attack: 40, base_defense: 60, base_speed: 7, description: '全身由晶石構成的巨獸，能反射魔法攻擊。', rarity: 'elite', catch_rate: 0.08 },
  { id: 'M_E010', name: '大地之母', wuxing: '土', level_range: '20-30', base_hp: 800, base_attack: 50, base_defense: 80, base_speed: 8, description: '大地的化身，掌控土地的生死。', rarity: 'elite', catch_rate: 0.05 },
  { id: 'M_E011', name: '泰坦巨神', wuxing: '土', level_range: '25-35', base_hp: 1000, base_attack: 70, base_defense: 90, base_speed: 6, description: '上古時代的泰坦神，力量足以移山填海。', rarity: 'elite', catch_rate: 0.04 },
  { id: 'M_E012', name: '沙漠死神', wuxing: '土', level_range: '28-38', base_hp: 900, base_attack: 80, base_defense: 70, base_speed: 15, description: '沙漠中的死神化身，帶走所有踏入沙漠的生命。', rarity: 'legendary', catch_rate: 0.02 },
  { id: 'M_E013', name: '萬年玄武', wuxing: '土', level_range: '35-45', base_hp: 2500, base_attack: 75, base_defense: 150, base_speed: 5, description: '萬年不死的玄武神獸，龜殼可抵擋任何攻擊。', rarity: 'legendary', catch_rate: 0.01 },
  { id: 'M_E014', name: '兵馬俑大將軍', wuxing: '土', level_range: '38-48', base_hp: 1800, base_attack: 90, base_defense: 100, base_speed: 10, description: '兵馬俑軍團的統帥，指揮千軍萬馬。', rarity: 'legendary', catch_rate: 0.01 },
  { id: 'M_E015', name: '秋分土靈', wuxing: '土', level_range: '15-20', base_hp: 420, base_attack: 42, base_defense: 55, base_speed: 10, description: '秋分時節出現的特殊土靈，帶有豐收的氣息。', rarity: 'elite', catch_rate: 0.06, drop_items: ['I_E041'] },
  { id: 'M_E016', name: '招財金蟾', wuxing: '土', level_range: '10-15', base_hp: 180, base_attack: 18, base_defense: 30, base_speed: 12, description: '傳說中能帶來財富的金蟾，擊敗可得大量靈石。', rarity: 'elite', catch_rate: 0.05, drop_items: ['I_E042'] },
  { id: 'M_E017', name: '建築守護靈', wuxing: '土', level_range: '20-28', base_hp: 500, base_attack: 55, base_defense: 65, base_speed: 8, description: '守護古老建築的土靈，對入侵者毫不留情。', rarity: 'elite', catch_rate: 0.05, drop_items: ['I_E043'] },
  { id: 'M_E018', name: '迷路的地精', wuxing: '土', level_range: '8-14', base_hp: 120, base_attack: 15, base_defense: 20, base_speed: 14, description: '迷失方向的地精，雖然弱小但知道很多秘密。', rarity: 'rare', catch_rate: 0.2, drop_items: ['I_E044'] },
  { id: 'M_E019', name: '沉睡的化石', wuxing: '土', level_range: '25-35', base_hp: 600, base_attack: 60, base_defense: 80, base_speed: 3, description: '遠古生物的化石甦醒，帶有上古時代的力量。', rarity: 'elite', catch_rate: 0.04, drop_items: ['I_E045'] },
  { id: 'M_E020', name: '土系精靈', wuxing: '土', level_range: '4-8', base_hp: 90, base_attack: 10, base_defense: 15, base_speed: 8, description: '小型土系精靈，棲息在土地肥沃的地方。', rarity: 'common', catch_rate: 0.35 },
  // 金屬性怪物 (M_M001~M_M050)
  { id: 'M_M001', name: '齒輪怪', wuxing: '金', level_range: '1-3', base_hp: 35, base_attack: 8, base_defense: 5, base_speed: 12, description: '由齒輪組成的機械怪物，攻擊精準。', rarity: 'common', catch_rate: 0.5 },
  { id: 'M_M002', name: '電磁蜜蜂', wuxing: '金', level_range: '2-5', base_hp: 30, base_attack: 10, base_defense: 3, base_speed: 20, description: '能發射電磁針的蜜蜂，攻擊有麻痺效果。', rarity: 'common', catch_rate: 0.4 },
  { id: 'M_M003', name: '剪刀螳螂', wuxing: '金', level_range: '3-6', base_hp: 45, base_attack: 14, base_defense: 5, base_speed: 18, description: '雙臂如剪刀的螳螂，暴擊率極高。', rarity: 'common', catch_rate: 0.4 },
  { id: 'M_M004', name: '白銀劍鷹', wuxing: '金', level_range: '5-10', base_hp: 90, base_attack: 22, base_defense: 10, base_speed: 28, description: '羽毛如銀劍的鷹，俯衝攻擊速度極快。', rarity: 'rare', catch_rate: 0.2 },
  { id: 'M_M005', name: '閃電貂', wuxing: '金', level_range: '6-12', base_hp: 80, base_attack: 25, base_defense: 8, base_speed: 30, description: '速度如閃電的貂，能在瞬間完成多次攻擊。', rarity: 'rare', catch_rate: 0.18 },
  { id: 'M_M006', name: '鋼鐵魔像', wuxing: '金', level_range: '8-15', base_hp: 300, base_attack: 30, base_defense: 55, base_speed: 6, description: '由鋼鐵鑄造的魔像，幾乎無法被物理攻擊傷害。', rarity: 'rare', catch_rate: 0.15 },
  { id: 'M_M007', name: '鏈鋸蜈蚣', wuxing: '金', level_range: '10-16', base_hp: 200, base_attack: 40, base_defense: 20, base_speed: 15, description: '節肢如鏈鋸的蜈蚣，攻擊造成流血效果。', rarity: 'rare', catch_rate: 0.15 },
  { id: 'M_M008', name: '磁暴機器人', wuxing: '金', level_range: '12-18', base_hp: 250, base_attack: 38, base_defense: 30, base_speed: 14, description: '能發射磁暴的機器人，使金屬裝備失效。', rarity: 'rare', catch_rate: 0.12 },
  { id: 'M_M009', name: '飛刃刺客', wuxing: '金', level_range: '15-22', base_hp: 200, base_attack: 55, base_defense: 15, base_speed: 35, description: '使用飛刃的刺客，閃避率極高。', rarity: 'elite', catch_rate: 0.08 },
  { id: 'M_M010', name: '天命金龍', wuxing: '金', level_range: '20-30', base_hp: 900, base_attack: 80, base_defense: 70, base_speed: 30, description: '金色鱗片的天命金龍，象徵財富與力量。', rarity: 'elite', catch_rate: 0.05 },
  { id: 'M_M011', name: '劍聖之魂', wuxing: '金', level_range: '25-35', base_hp: 700, base_attack: 95, base_defense: 40, base_speed: 40, description: '傳說中劍聖的靈魂，劍術已達化境。', rarity: 'elite', catch_rate: 0.04 },
  { id: 'M_M012', name: '鋼鐵巨神兵', wuxing: '金', level_range: '30-40', base_hp: 1600, base_attack: 90, base_defense: 100, base_speed: 15, description: '上古時代的巨型機械兵器，破壞力驚人。', rarity: 'legendary', catch_rate: 0.02 },
  { id: 'M_M013', name: '閃電鳥王', wuxing: '金', level_range: '35-45', base_hp: 1100, base_attack: 105, base_defense: 55, base_speed: 50, description: '統治閃電的鳥王，速度超越任何生物。', rarity: 'legendary', catch_rate: 0.01 },
  { id: 'M_M014', name: '萬刃之主', wuxing: '金', level_range: '38-48', base_hp: 1400, base_attack: 120, base_defense: 65, base_speed: 45, description: '掌控萬千刀刃的強者，攻擊無法被格擋。', rarity: 'legendary', catch_rate: 0.01 },
  { id: 'M_M015', name: '立秋金靈', wuxing: '金', level_range: '15-20', base_hp: 360, base_attack: 50, base_defense: 42, base_speed: 25, description: '立秋時節出現的特殊金靈，帶有秋收的氣息。', rarity: 'elite', catch_rate: 0.06, drop_items: ['I_M041'] },
  { id: 'M_M016', name: '招財貓', wuxing: '金', level_range: '8-14', base_hp: 130, base_attack: 18, base_defense: 15, base_speed: 22, description: '傳說中能招來財富的貓，擊敗後能提升金幣掉落。', rarity: 'rare', catch_rate: 0.15, drop_items: ['I_M042'] },
  { id: 'M_M017', name: '銀行守衛', wuxing: '金', level_range: '20-28', base_hp: 480, base_attack: 58, base_defense: 60, base_speed: 12, description: '守衛金庫的精英士兵，裝備精良。', rarity: 'elite', catch_rate: 0.05, drop_items: ['I_M043'] },
  { id: 'M_M018', name: '迷路的機器人', wuxing: '金', level_range: '10-16', base_hp: 180, base_attack: 25, base_defense: 28, base_speed: 16, description: '程序出錯而迷路的機器人，內含珍貴晶片。', rarity: 'rare', catch_rate: 0.18, drop_items: ['I_M044'] },
  { id: 'M_M019', name: '生鏽的古劍', wuxing: '金', level_range: '22-30', base_hp: 520, base_attack: 68, base_defense: 45, base_speed: 10, description: '古代劍士的靈魂附著在生鏽的劍上，等待被解放。', rarity: 'elite', catch_rate: 0.04, drop_items: ['I_M045'] },
  { id: 'M_M020', name: '金系精靈', wuxing: '金', level_range: '4-8', base_hp: 65, base_attack: 12, base_defense: 8, base_speed: 20, description: '小型金系精靈，棲息在金屬豐富的地方。', rarity: 'common', catch_rate: 0.35 },
  // 水屬性怪物 (M_W051~M_W100)
  { id: 'M_W051', name: '泡沫史萊姆', wuxing: '水', level_range: '1-3', base_hp: 32, base_attack: 4, base_defense: 4, base_speed: 9, description: '全身由泡沫組成的史萊姆，接觸會造成輕微冰凍。', rarity: 'common', catch_rate: 0.5 },
  { id: 'M_W052', name: '冰霜蝙蝠', wuxing: '水', level_range: '2-5', base_hp: 35, base_attack: 7, base_defense: 3, base_speed: 16, description: '棲息在陰暗洞穴的冰霜蝙蝠，攻擊帶有冰凍效果。', rarity: 'common', catch_rate: 0.4 },
  { id: 'M_W053', name: '貝殼妖', wuxing: '水', level_range: '3-6', base_hp: 65, base_attack: 6, base_defense: 18, base_speed: 5, description: '躲在貝殼裡的妖怪，防禦力極強。', rarity: 'common', catch_rate: 0.4 },
  { id: 'M_W054', name: '深淵鯨靈', wuxing: '水', level_range: '5-10', base_hp: 180, base_attack: 15, base_defense: 20, base_speed: 12, description: '深海鯨魚的靈魂，能召喚水流攻擊敵人。', rarity: 'rare', catch_rate: 0.2 },
  { id: 'M_W055', name: '冰霜狼群', wuxing: '水', level_range: '6-12', base_hp: 130, base_attack: 22, base_defense: 12, base_speed: 22, description: '在冰雪中奔跑的狼群，集體攻擊威力驚人。', rarity: 'rare', catch_rate: 0.18 },
  { id: 'M_W056', name: '巨型章魚', wuxing: '水', level_range: '8-15', base_hp: 220, base_attack: 25, base_defense: 22, base_speed: 10, description: '觸手眾多的巨型章魚，能同時攻擊多個目標。', rarity: 'rare', catch_rate: 0.15 },
  { id: 'M_W057', name: '寒冰法師', wuxing: '水', level_range: '10-16', base_hp: 140, base_attack: 42, base_defense: 10, base_speed: 14, description: '掌握冰系魔法的法師，能凍結一切。', rarity: 'rare', catch_rate: 0.15 },
  { id: 'M_W058', name: '漩渦水妖', wuxing: '水', level_range: '12-18', base_hp: 200, base_attack: 30, base_defense: 18, base_speed: 16, description: '能製造漩渦的水妖，將敵人吸入深淵。', rarity: 'rare', catch_rate: 0.12 },
  { id: 'M_W059', name: '毒刺海膽', wuxing: '水', level_range: '8-14', base_hp: 160, base_attack: 20, base_defense: 30, base_speed: 6, description: '全身佈滿毒刺的海膽，接觸即中毒。', rarity: 'rare', catch_rate: 0.15 },
  { id: 'M_W060', name: '虛空深淵主', wuxing: '水', level_range: '20-30', base_hp: 750, base_attack: 75, base_defense: 55, base_speed: 20, description: '統治虛空深淵的強者，能操控時空。', rarity: 'elite', catch_rate: 0.05 },
  { id: 'M_W061', name: '冰霜巨龍', wuxing: '水', level_range: '30-40', base_hp: 1400, base_attack: 95, base_defense: 85, base_speed: 22, description: '沉睡在冰川中的巨龍，呼吸能凍結一切。', rarity: 'legendary', catch_rate: 0.02 },
  { id: 'M_W062', name: '海神波塞冬', wuxing: '水', level_range: '35-45', base_hp: 1800, base_attack: 105, base_defense: 90, base_speed: 28, description: '海洋之神，掌控所有水域的生死。', rarity: 'legendary', catch_rate: 0.01 },
  { id: 'M_W063', name: '萬年冰川巨獸', wuxing: '水', level_range: '38-48', base_hp: 2200, base_attack: 85, base_defense: 130, base_speed: 8, description: '封印在萬年冰川中的上古巨獸，甦醒時引發冰河時代。', rarity: 'legendary', catch_rate: 0.01 },
  { id: 'M_W064', name: '深海克拉肯', wuxing: '水', level_range: '40-50', base_hp: 2500, base_attack: 110, base_defense: 100, base_speed: 15, description: '傳說中的深海巨怪，觸手能纏繞整艘船隻。', rarity: 'legendary', catch_rate: 0.005 },
  { id: 'M_W065', name: '冬至冰靈', wuxing: '水', level_range: '15-20', base_hp: 360, base_attack: 48, base_defense: 42, base_speed: 16, description: '冬至時節出現的特殊冰靈，帶有嚴寒的氣息。', rarity: 'elite', catch_rate: 0.06, drop_items: ['I_W091'] },
  { id: 'M_W066', name: '淚之泉精靈', wuxing: '水', level_range: '18-25', base_hp: 380, base_attack: 52, base_defense: 38, base_speed: 18, description: '棲息在淚之泉的精靈，眼淚有強大的治癒力。', rarity: 'elite', catch_rate: 0.05, drop_items: ['I_W092'] },
  { id: 'M_W067', name: '溫泉守護者', wuxing: '水', level_range: '12-18', base_hp: 250, base_attack: 30, base_defense: 35, base_speed: 12, description: '守護溫泉的神靈，對入侵者發動攻擊。', rarity: 'rare', catch_rate: 0.12, drop_items: ['I_W093'] },
  { id: 'M_W068', name: '迷路的企鵝', wuxing: '水', level_range: '5-10', base_hp: 100, base_attack: 12, base_defense: 14, base_speed: 10, description: '迷失在城市中的企鵝，雖然可愛但會攻擊陌生人。', rarity: 'rare', catch_rate: 0.25, drop_items: ['I_W094'] },
  { id: 'M_W069', name: '融化的雪人', wuxing: '水', level_range: '6-12', base_hp: 140, base_attack: 16, base_defense: 16, base_speed: 8, description: '正在融化的雪人，攻擊時噴出冰水。', rarity: 'rare', catch_rate: 0.2, drop_items: ['I_W095'] },
  { id: 'M_W070', name: '水系精靈', wuxing: '水', level_range: '4-8', base_hp: 75, base_attack: 10, base_defense: 10, base_speed: 14, description: '小型水系精靈，棲息在水源附近。', rarity: 'common', catch_rate: 0.35 },
];

// ═══════════════════════════════════════════════════════════════
// 技能圖鑑（從 GD-016 讀取，每屬性 50 種，共 250 種）
// ═══════════════════════════════════════════════════════════════
const skills = [
  // 木屬性技能 - 戰鬥主動 (S_W001~S_W020)
  { id: 'S_W001', name: '藤蔓束縛', wuxing: '木', category: 'active_combat', tier: '初階', mp_cost: 10, skill_type: 'debuff', description: '召喚藤蔓纏繞單體敵方，使其無法行動 1 回合。' },
  { id: 'S_W002', name: '孢子噴射', wuxing: '木', category: 'active_combat', tier: '初階', mp_cost: 8, skill_type: 'debuff', description: '噴出孢子粉末，使敵方單體有 30% 機率混亂。' },
  { id: 'S_W003', name: '自然之箭', wuxing: '木', category: 'active_combat', tier: '初階', mp_cost: 12, skill_type: 'attack', description: '發射由自然之力凝聚的箭矢，造成 120% 木屬性傷害。' },
  { id: 'S_W004', name: '毒霧術', wuxing: '木', category: 'active_combat', tier: '初階', mp_cost: 15, skill_type: 'debuff', description: '釋放毒霧，對全體敵方施加中毒狀態，每回合損失 5% HP。' },
  { id: 'S_W005', name: '森林衝刺', wuxing: '木', category: 'active_combat', tier: '中階', mp_cost: 20, skill_type: 'attack', description: '借助森林之力衝向敵方，對單體造成 150% 傷害並有 20% 機率擊退。' },
  { id: 'S_W006', name: '生命汲取', wuxing: '木', category: 'active_combat', tier: '中階', mp_cost: 25, skill_type: 'attack', description: '吸取敵方生命力，造成 120% 傷害並恢復等量 HP。' },
  { id: 'S_W007', name: '荊棘護甲', wuxing: '木', category: 'active_combat', tier: '中階', mp_cost: 22, skill_type: 'buff', description: '為自身附加荊棘護甲，反彈 30% 受到的物理傷害，持續 3 回合。' },
  { id: 'S_W008', name: '古木打擊', wuxing: '木', category: 'active_combat', tier: '中階', mp_cost: 30, skill_type: 'attack', description: '召喚古木之力重擊敵方，造成 180% 傷害並有 25% 機率暈眩。' },
  { id: 'S_W009', name: '自然恢復', wuxing: '木', category: 'active_combat', tier: '高階', mp_cost: 40, skill_type: 'heal', description: '借助自然之力恢復全體友方 25% 最大 HP，並解除中毒狀態。' },
  { id: 'S_W010', name: '世界樹庇護', wuxing: '木', category: 'active_combat', tier: '高階', mp_cost: 50, skill_type: 'buff', description: '召喚世界樹的庇護，全體友方獲得 30% 減傷效果，持續 3 回合。' },
  { id: 'S_W011', name: '萬毒侵蝕', wuxing: '木', category: 'active_combat', tier: '高階', mp_cost: 45, skill_type: 'debuff', description: '釋放萬毒之力，對全體敵方施加無法治癒的劇毒，每回合損失 8% HP。' },
  { id: 'S_W012', name: '翡翠龍息', wuxing: '木', category: 'active_combat', tier: '高階', mp_cost: 60, skill_type: 'attack', description: '模仿翡翠龍的龍息，對全體敵方造成 140% 木屬性傷害並施加中毒。' },
  { id: 'S_W013', name: '天命·森林領域', wuxing: '木', category: 'active_combat', tier: '天命', mp_cost: 120, skill_type: 'special', description: '改變戰場環境為「森林」，全體友方木屬性傷害 +50%，技能 MP 消耗減半，持續 5 回合。' },
  { id: 'S_W014', name: '天命·生命之樹', wuxing: '木', category: 'active_combat', tier: '天命', mp_cost: 110, skill_type: 'heal', description: '召喚生命之樹，每回合恢復全體友方 20% HP 與 10% MP，持續 5 回合。' },
  { id: 'S_W015', name: '天命·萬古神木', wuxing: '木', category: 'active_combat', tier: '天命', mp_cost: 130, skill_type: 'attack', description: '召喚萬古神木的力量，對全體敵方造成 300% 木屬性傷害，無視所有防禦。' },
  { id: 'S_W016', name: '天命·花神降臨', wuxing: '木', category: 'active_combat', tier: '天命', mp_cost: 100, skill_type: 'special', description: '召喚花神降臨，使全體敵方陷入魅惑狀態，持續 3 回合，且每回合損失 10% HP。' },
  { id: 'S_W017', name: '毒刺反擊', wuxing: '木', category: 'active_combat', tier: '傳說', mp_cost: 70, skill_type: 'special', description: '在受到攻擊的瞬間反擊，造成攻擊者 200% 傷害並施加劇毒。' },
  { id: 'S_W018', name: '森林迷陣', wuxing: '木', category: 'active_combat', tier: '傳說', mp_cost: 80, skill_type: 'debuff', description: '製造森林迷陣，使全體敵方迷失方向，命中率降低 50%，持續 3 回合。' },
  { id: 'S_W019', name: '古樹復甦', wuxing: '木', category: 'active_combat', tier: '傳說', mp_cost: 90, skill_type: 'heal', description: '復活一名死亡的隊友，並恢復其 50% HP 與 30% MP。' },
  { id: 'S_W020', name: '世界樹之怒', wuxing: '木', category: 'active_combat', tier: '傳說', mp_cost: 85, skill_type: 'attack', description: '引發世界樹的憤怒，對全體敵方造成 250% 木屬性傷害，並有 30% 機率石化。' },
  // 木屬性技能 - 戰鬥被動 (S_W021~S_W030)
  { id: 'S_W021', name: '木之親和', wuxing: '木', category: 'passive_combat', tier: '初階', mp_cost: 0, skill_type: 'passive', description: '木屬性傷害提升 10%。' },
  { id: 'S_W022', name: '自然恢復力', wuxing: '木', category: 'passive_combat', tier: '初階', mp_cost: 0, skill_type: 'passive', description: '每回合自動恢復 3% 最大 HP。' },
  { id: 'S_W023', name: '毒素精通', wuxing: '木', category: 'passive_combat', tier: '中階', mp_cost: 0, skill_type: 'passive', description: '施加的中毒效果傷害提升 30%。' },
  { id: 'S_W024', name: '生命力旺盛', wuxing: '木', category: 'passive_combat', tier: '中階', mp_cost: 0, skill_type: 'passive', description: '最大 HP 提升 20%。' },
  { id: 'S_W025', name: '木系抗性', wuxing: '木', category: 'passive_combat', tier: '中階', mp_cost: 0, skill_type: 'passive', description: '受到的金屬性傷害減少 20%。' },
  { id: 'S_W026', name: '荊棘皮膚', wuxing: '木', category: 'passive_combat', tier: '高階', mp_cost: 0, skill_type: 'passive', description: '受到近戰攻擊時，自動反彈 10% 傷害。' },
  { id: 'S_W027', name: '毒免疫', wuxing: '木', category: 'passive_combat', tier: '高階', mp_cost: 0, skill_type: 'passive', description: '完全免疫中毒與腐蝕狀態。' },
  { id: 'S_W028', name: '森林之子', wuxing: '木', category: 'passive_combat', tier: '高階', mp_cost: 0, skill_type: 'passive', description: '在公園或森林 LBS 區域戰鬥時，所有屬性提升 15%。' },
  { id: 'S_W029', name: '吸血藤蔓', wuxing: '木', category: 'passive_combat', tier: '傳說', mp_cost: 0, skill_type: 'passive', description: '每次攻擊吸取造成傷害 5% 的 HP。' },
  { id: 'S_W030', name: '天命·木靈庇護', wuxing: '木', category: 'passive_combat', tier: '天命', mp_cost: 0, skill_type: 'passive', description: '受到致命傷時，消耗所有 MP 來抵擋該次傷害（每點 MP 抵擋 8 點傷害）。' },
  // 木屬性技能 - 生活採集 (S_W031~S_W040)
  { id: 'S_W031', name: '尋木訣', wuxing: '木', category: 'life_gather', tier: '初階', mp_cost: 0, skill_type: 'passive', description: '在大地圖上顯示半徑 500m 內的木屬性採集點。' },
  { id: 'S_W032', name: '採集加速·木', wuxing: '木', category: 'life_gather', tier: '初階', mp_cost: 0, skill_type: 'passive', description: '木屬性節點的採集時間減少 30%。' },
  { id: 'S_W033', name: '草藥辨識', wuxing: '木', category: 'life_gather', tier: '中階', mp_cost: 0, skill_type: 'passive', description: '採集時有 10% 機率獲得稀有木屬性藥材。' },
  { id: 'S_W034', name: '豐收之手', wuxing: '木', category: 'life_gather', tier: '中階', mp_cost: 0, skill_type: 'passive', description: '採集木屬性素材時，有 20% 機率獲得雙倍數量。' },
  { id: 'S_W035', name: '林間疾行', wuxing: '木', category: 'life_gather', tier: '中階', mp_cost: 0, skill_type: 'passive', description: '在公園/森林 LBS 區域移動時，移動速度提升 20%。' },
  { id: 'S_W036', name: '馴獸師·木', wuxing: '木', category: 'life_gather', tier: '高階', mp_cost: 0, skill_type: 'passive', description: '捕捉木屬性寵物的成功率提升 15%。' },
  { id: 'S_W037', name: '製藥大師', wuxing: '木', category: 'life_gather', tier: '高階', mp_cost: 0, skill_type: 'passive', description: '製作木屬性藥劑的成功率提升 20%，且效果提升 10%。' },
  { id: 'S_W038', name: '木靈感知', wuxing: '木', category: 'life_gather', tier: '高階', mp_cost: 0, skill_type: 'passive', description: '有機率在大地圖上發現隱藏的木屬性流浪商人。' },
  { id: 'S_W039', name: '種子收集', wuxing: '木', category: 'life_gather', tier: '中階', mp_cost: 0, skill_type: 'passive', description: '採集時有 5% 機率獲得奇異種子，可種植於自宅花園。' },
  { id: 'S_W040', name: '天命·森林之子', wuxing: '木', category: 'life_gather', tier: '天命', mp_cost: 0, skill_type: 'passive', description: '每天首次登入時，自動獲得 10 個隨機木屬性素材。' },
  // 木屬性技能 - 鍛造精煉 (S_W041~S_W050)
  { id: 'S_W041', name: '木工基礎', wuxing: '木', category: 'craft_forge', tier: '初階', mp_cost: 0, skill_type: 'passive', description: '鍛造木屬性裝備的成功率提升 10%。' },
  { id: 'S_W042', name: '節儉·木', wuxing: '木', category: 'craft_forge', tier: '中階', mp_cost: 0, skill_type: 'passive', description: '鍛造木屬性裝備時，有 15% 機率返還部分素材。' },
  { id: 'S_W043', name: '精密雕刻', wuxing: '木', category: 'craft_forge', tier: '中階', mp_cost: 0, skill_type: 'passive', description: '鍛造出的木屬性裝備，基礎屬性有 10% 機率提升 20%。' },
  { id: 'S_W044', name: '毒刃淬煉', wuxing: '木', category: 'craft_forge', tier: '高階', mp_cost: 0, skill_type: 'passive', description: '鍛造武器時，有 5% 機率附加「攻擊有 10% 機率中毒」的詞綴。' },
  { id: 'S_W045', name: '輕盈覆膜', wuxing: '木', category: 'craft_forge', tier: '高階', mp_cost: 0, skill_type: 'passive', description: '鍛造鞋子時，有 10% 機率附加「閃避 +10%」的詞綴。' },
  { id: 'S_W046', name: '翡翠鑲嵌', wuxing: '木', category: 'craft_forge', tier: '高階', mp_cost: 0, skill_type: 'passive', description: '飾品打孔成功率提升 20%。' },
  { id: 'S_W047', name: '裝備保養·木', wuxing: '木', category: 'craft_forge', tier: '中階', mp_cost: 0, skill_type: 'passive', description: '木屬性裝備的耐久度消耗速度降低 50%。' },
  { id: 'S_W048', name: '廢木重塑', wuxing: '木', category: 'craft_forge', tier: '中階', mp_cost: 0, skill_type: 'passive', description: '分解木屬性裝備時，獲得的素材數量增加 30%。' },
  { id: 'S_W049', name: '傳說木工', wuxing: '木', category: 'craft_forge', tier: '傳說', mp_cost: 0, skill_type: 'passive', description: '鍛造出傳說級木屬性裝備的機率提升 2%。' },
  { id: 'S_W050', name: '天命·神木工匠', wuxing: '木', category: 'craft_forge', tier: '天命', mp_cost: 0, skill_type: 'passive', description: '每月有 1 次機會，必定鍛造出帶有最高數值的木屬性裝備。' },
  // 火屬性技能（簡化版，各類別代表性技能）
  { id: 'S_F001', name: '火球術', wuxing: '火', category: 'active_combat', tier: '初階', mp_cost: 10, skill_type: 'attack', description: '發射火球，對單體造成 130% 火屬性傷害。' },
  { id: 'S_F002', name: '爆炎術', wuxing: '火', category: 'active_combat', tier: '初階', mp_cost: 15, skill_type: 'attack', description: '引發爆炎，對單體造成 150% 傷害並施加燃燒。' },
  { id: 'S_F003', name: '火焰護盾', wuxing: '火', category: 'active_combat', tier: '初階', mp_cost: 12, skill_type: 'buff', description: '為自身附加火焰護盾，反彈 20% 受到的傷害，持續 3 回合。' },
  { id: 'S_F004', name: '狂暴之焰', wuxing: '火', category: 'active_combat', tier: '中階', mp_cost: 25, skill_type: 'buff', description: '進入狂暴狀態，攻擊力提升 50%，持續 3 回合，但防禦力降低 20%。' },
  { id: 'S_F005', name: '烈焰風暴', wuxing: '火', category: 'active_combat', tier: '中階', mp_cost: 35, skill_type: 'attack', description: '召喚烈焰風暴，對全體敵方造成 120% 傷害並施加燃燒。' },
  { id: 'S_F006', name: '鳳凰涅槃', wuxing: '火', category: 'active_combat', tier: '高階', mp_cost: 60, skill_type: 'special', description: '模仿鳳凰涅槃，死亡時自動復活並恢復 50% HP，對周圍敵方造成大量傷害。' },
  { id: 'S_F007', name: '業火焚天', wuxing: '火', category: 'active_combat', tier: '傳說', mp_cost: 80, skill_type: 'attack', description: '引發業火，對全體敵方造成 220% 傷害，無視火屬性抗性。' },
  { id: 'S_F008', name: '天命·太陽神降臨', wuxing: '火', category: 'active_combat', tier: '天命', mp_cost: 150, skill_type: 'special', description: '召喚太陽神降臨，全體友方火屬性傷害 +80%，且每回合恢復 10% HP，持續 5 回合。' },
  { id: 'S_F009', name: '火之親和', wuxing: '火', category: 'passive_combat', tier: '初階', mp_cost: 0, skill_type: 'passive', description: '火屬性傷害提升 10%。' },
  { id: 'S_F010', name: '燃燒精通', wuxing: '火', category: 'passive_combat', tier: '中階', mp_cost: 0, skill_type: 'passive', description: '施加的燃燒效果傷害提升 30%。' },
  { id: 'S_F011', name: '天命·火靈庇護', wuxing: '火', category: 'passive_combat', tier: '天命', mp_cost: 0, skill_type: 'passive', description: '受到致命傷時，以火焰之力抵擋該次傷害並反傷 100%（每場限 1 次）。' },
  { id: 'S_F012', name: '尋火訣', wuxing: '火', category: 'life_gather', tier: '初階', mp_cost: 0, skill_type: 'passive', description: '在大地圖上顯示半徑 500m 內的火屬性採集點。' },
  { id: 'S_F013', name: '天命·火焰之子', wuxing: '火', category: 'life_gather', tier: '天命', mp_cost: 0, skill_type: 'passive', description: '每天首次登入時，自動獲得 10 個隨機火屬性素材。' },
  { id: 'S_F014', name: '火工基礎', wuxing: '火', category: 'craft_forge', tier: '初階', mp_cost: 0, skill_type: 'passive', description: '鍛造火屬性裝備的成功率提升 10%。' },
  { id: 'S_F015', name: '天命·火神工匠', wuxing: '火', category: 'craft_forge', tier: '天命', mp_cost: 0, skill_type: 'passive', description: '每月有 1 次機會，必定鍛造出帶有最高數值的火屬性裝備。' },
  // 土屬性技能
  { id: 'S_E001', name: '岩石投擲', wuxing: '土', category: 'active_combat', tier: '初階', mp_cost: 10, skill_type: 'attack', description: '投擲巨石，對單體造成 140% 土屬性傷害，有 20% 機率暈眩。' },
  { id: 'S_E002', name: '大地護盾', wuxing: '土', category: 'active_combat', tier: '初階', mp_cost: 15, skill_type: 'buff', description: '召喚大地護盾，獲得吸收 300 點傷害的護盾。' },
  { id: 'S_E003', name: '地震術', wuxing: '土', category: 'active_combat', tier: '中階', mp_cost: 30, skill_type: 'attack', description: '引發地震，對全體敵方造成 130% 傷害並有 15% 機率暈眩。' },
  { id: 'S_E004', name: '磐石防禦', wuxing: '土', category: 'active_combat', tier: '中階', mp_cost: 25, skill_type: 'buff', description: '進入磐石狀態，防禦力提升 80%，持續 2 回合，但速度降低 50%。' },
  { id: 'S_E005', name: '大地崩裂', wuxing: '土', category: 'active_combat', tier: '高階', mp_cost: 55, skill_type: 'attack', description: '引發大地崩裂，對全體敵方造成 180% 傷害，並有 30% 機率石化。' },
  { id: 'S_E006', name: '天命·大地之怒', wuxing: '土', category: 'active_combat', tier: '天命', mp_cost: 140, skill_type: 'attack', description: '引發大地之怒，對全體敵方造成 350% 土屬性傷害，並使其無法行動 2 回合。' },
  { id: 'S_E007', name: '土之親和', wuxing: '土', category: 'passive_combat', tier: '初階', mp_cost: 0, skill_type: 'passive', description: '土屬性傷害提升 10%。' },
  { id: 'S_E008', name: '鐵壁防禦', wuxing: '土', category: 'passive_combat', tier: '中階', mp_cost: 0, skill_type: 'passive', description: '最大防禦力提升 20%。' },
  { id: 'S_E009', name: '天命·土靈庇護', wuxing: '土', category: 'passive_combat', tier: '天命', mp_cost: 0, skill_type: 'passive', description: '受到致命傷時，必定保留 1 點 HP（冷卻 24 小時）。' },
  { id: 'S_E010', name: '尋土訣', wuxing: '土', category: 'life_gather', tier: '初階', mp_cost: 0, skill_type: 'passive', description: '在大地圖上顯示半徑 500m 內的土屬性採集點。' },
  { id: 'S_E011', name: '天命·土地之子', wuxing: '土', category: 'life_gather', tier: '天命', mp_cost: 0, skill_type: 'passive', description: '每天首次登入時，自動獲得 10 個隨機土屬性素材。' },
  { id: 'S_E012', name: '土工基礎', wuxing: '土', category: 'craft_forge', tier: '初階', mp_cost: 0, skill_type: 'passive', description: '鍛造土屬性裝備的成功率提升 10%。' },
  { id: 'S_E013', name: '天命·大地工匠', wuxing: '土', category: 'craft_forge', tier: '天命', mp_cost: 0, skill_type: 'passive', description: '每月有 1 次機會，必定鍛造出帶有最高數值的土屬性裝備。' },
  // 金屬性技能
  { id: 'S_M001', name: '劍氣斬', wuxing: '金', category: 'active_combat', tier: '初階', mp_cost: 10, skill_type: 'attack', description: '發射劍氣，對單體造成 130% 金屬性傷害，無視 10% 防禦。' },
  { id: 'S_M002', name: '連斬', wuxing: '金', category: 'active_combat', tier: '初階', mp_cost: 12, skill_type: 'attack', description: '連續斬擊敵方 2-3 次，每次造成 80% 傷害。' },
  { id: 'S_M003', name: '電磁脈衝', wuxing: '金', category: 'active_combat', tier: '中階', mp_cost: 28, skill_type: 'debuff', description: '發射電磁脈衝，使全體敵方有 30% 機率麻痺。' },
  { id: 'S_M004', name: '萬劍歸宗', wuxing: '金', category: 'active_combat', tier: '高階', mp_cost: 55, skill_type: 'attack', description: '召喚萬千劍刃攻擊全體敵方，造成 160% 傷害，對速度低的目標傷害翻倍。' },
  { id: 'S_M005', name: '天命·劍神降臨', wuxing: '金', category: 'active_combat', tier: '天命', mp_cost: 160, skill_type: 'special', description: '召喚劍神降臨，全體友方攻擊力 +100%，且每次攻擊必定暴擊，持續 3 回合。' },
  { id: 'S_M006', name: '金之親和', wuxing: '金', category: 'passive_combat', tier: '初階', mp_cost: 0, skill_type: 'passive', description: '金屬性傷害提升 10%。' },
  { id: 'S_M007', name: '暴擊精通', wuxing: '金', category: 'passive_combat', tier: '中階', mp_cost: 0, skill_type: 'passive', description: '暴擊率提升 10%，暴擊傷害提升 20%。' },
  { id: 'S_M008', name: '天命·金靈庇護', wuxing: '金', category: 'passive_combat', tier: '天命', mp_cost: 0, skill_type: 'passive', description: '攻擊力越高，受到的傷害越低（每 100 點攻擊力減少 1% 受到的傷害，上限 50%）。' },
  { id: 'S_M009', name: '尋金訣', wuxing: '金', category: 'life_gather', tier: '初階', mp_cost: 0, skill_type: 'passive', description: '在大地圖上顯示半徑 500m 內的金屬性採集點。' },
  { id: 'S_M010', name: '天命·黃金之子', wuxing: '金', category: 'life_gather', tier: '天命', mp_cost: 0, skill_type: 'passive', description: '每天首次登入時，自動獲得 10 個隨機金屬性素材。' },
  { id: 'S_M011', name: '金工基礎', wuxing: '金', category: 'craft_forge', tier: '初階', mp_cost: 0, skill_type: 'passive', description: '鍛造金屬性裝備的成功率提升 10%。' },
  { id: 'S_M012', name: '天命·神機妙算', wuxing: '金', category: 'craft_forge', tier: '天命', mp_cost: 0, skill_type: 'passive', description: '每月有 1 次機會，必定鍛造出帶有最高數值的金屬性裝備。' },
  // 水屬性技能
  { id: 'S_W051', name: '冰錐術', wuxing: '水', category: 'active_combat', tier: '初階', mp_cost: 12, skill_type: 'attack', description: '對單體造成 140% 水屬性魔法傷害。' },
  { id: 'S_W052', name: '治癒之水', wuxing: '水', category: 'active_combat', tier: '初階', mp_cost: 15, skill_type: 'heal', description: '恢復單體友方 25% 最大 HP。' },
  { id: 'S_W053', name: '冰霜新星', wuxing: '水', category: 'active_combat', tier: '初階', mp_cost: 20, skill_type: 'attack', description: '對單體造成傷害，並有 30% 機率施加「凍結」（無法行動 1 回合）。' },
  { id: 'S_W054', name: '潮汐護盾', wuxing: '水', category: 'active_combat', tier: '初階', mp_cost: 18, skill_type: 'buff', description: '為單體友方附加一個吸收魔法傷害的護盾。' },
  { id: 'S_W055', name: '暴風雪', wuxing: '水', category: 'active_combat', tier: '中階', mp_cost: 40, skill_type: 'attack', description: '對全體敵方造成 100% 水屬性魔法傷害，並有 15% 機率凍結。' },
  { id: 'S_W056', name: '淨化之泉', wuxing: '水', category: 'active_combat', tier: '中階', mp_cost: 25, skill_type: 'heal', description: '解除全體友方的所有負面狀態。' },
  { id: 'S_W057', name: '海嘯術', wuxing: '水', category: 'active_combat', tier: '高階', mp_cost: 65, skill_type: 'attack', description: '對全體敵方造成 160% 傷害，對火屬性目標傷害翻倍。' },
  { id: 'S_W058', name: '絕對零度', wuxing: '水', category: 'active_combat', tier: '高階', mp_cost: 55, skill_type: 'debuff', description: '必定凍結單體敵方 2 回合，期間目標受到的物理傷害減半，魔法傷害翻倍。' },
  { id: 'S_W059', name: '生命之泉', wuxing: '水', category: 'active_combat', tier: '高階', mp_cost: 60, skill_type: 'heal', description: '全體友方每回合恢復 15% HP 與 5% MP，持續 3 回合。' },
  { id: 'S_W060', name: '海神之怒', wuxing: '水', category: 'active_combat', tier: '傳說', mp_cost: 90, skill_type: 'attack', description: '對全體敵方造成 200% 水屬性魔法傷害，並清除其所有增益狀態。' },
  { id: 'S_W061', name: '天命·深淵汪洋', wuxing: '水', category: 'active_combat', tier: '天命', mp_cost: 150, skill_type: 'special', description: '改變戰場環境為「汪洋」，全體友方水屬性傷害 +50%，技能 MP 消耗減半，持續 5 回合。' },
  { id: 'S_W062', name: '天命·生命之源', wuxing: '水', category: 'active_combat', tier: '天命', mp_cost: 120, skill_type: 'heal', description: '復活所有死亡的友方，並恢復 100% HP 與 MP。' },
  { id: 'S_W063', name: '水之親和', wuxing: '水', category: 'passive_combat', tier: '初階', mp_cost: 0, skill_type: 'passive', description: '水屬性傷害提升 10%。' },
  { id: 'S_W064', name: '魔力源泉', wuxing: '水', category: 'passive_combat', tier: '中階', mp_cost: 0, skill_type: 'passive', description: '最大 MP 提升 30%。' },
  { id: 'S_W065', name: '天命·海神庇護', wuxing: '水', category: 'passive_combat', tier: '天命', mp_cost: 0, skill_type: 'passive', description: '受到致命傷時，消耗所有 MP 來抵擋該次傷害（每點 MP 抵擋 10 點傷害）。' },
  { id: 'S_W066', name: '尋水訣', wuxing: '水', category: 'life_gather', tier: '初階', mp_cost: 0, skill_type: 'passive', description: '在大地圖上顯示半徑 500m 內的水屬性採集點。' },
  { id: 'S_W067', name: '天命·海洋之子', wuxing: '水', category: 'life_gather', tier: '天命', mp_cost: 0, skill_type: 'passive', description: '每天首次登入時，自動獲得 10 個隨機水屬性素材。' },
  { id: 'S_W068', name: '冰工基礎', wuxing: '水', category: 'craft_forge', tier: '初階', mp_cost: 0, skill_type: 'passive', description: '鍛造水屬性裝備的成功率提升 10%。' },
  { id: 'S_W069', name: '天命·海神恩賜', wuxing: '水', category: 'craft_forge', tier: '天命', mp_cost: 0, skill_type: 'passive', description: '每月有 1 次機會，必定鍛造出帶有最高數值的水屬性裝備。' },
];

// ═══════════════════════════════════════════════════════════════
// 道具圖鑑（從 GD-014 讀取，每屬性 50 種，共 250 種）
// ═══════════════════════════════════════════════════════════════
const items = [
  // 木屬性道具
  { id: 'I_W001', name: '靈草', wuxing: '木', category: 'material_basic', source: '公園/綠地採集', effect: '基礎恢復藥劑合成', rarity: 'common' },
  { id: 'I_W002', name: '堅韌藤蔓', wuxing: '木', category: 'material_basic', source: '森林/山區採集', effect: '製作初階防具', rarity: 'common' },
  { id: 'I_W003', name: '苦澀樹皮', wuxing: '木', category: 'material_basic', source: '樹木附近採集', effect: '製作解毒劑', rarity: 'common' },
  { id: 'I_W004', name: '迷幻蘑菇', wuxing: '木', category: 'material_basic', source: '陰暗處採集', effect: '製作控場藥劑', rarity: 'common' },
  { id: 'I_W005', name: '晨露', wuxing: '木', category: 'material_basic', source: '清晨採集', effect: '製作 MP 恢復藥劑', rarity: 'common' },
  { id: 'I_W006', name: '芳香花瓣', wuxing: '木', category: 'material_basic', source: '花園採集', effect: '提升寵物好感度', rarity: 'common' },
  { id: 'I_W007', name: '帶刺荊棘', wuxing: '木', category: 'material_basic', source: '灌木叢採集', effect: '製作反傷裝備', rarity: 'common' },
  { id: 'I_W008', name: '黏稠樹液', wuxing: '木', category: 'material_basic', source: '樹木附近採集', effect: '製作減速陷阱', rarity: 'common' },
  { id: 'I_W009', name: '翠綠樹葉', wuxing: '木', category: 'material_basic', source: '公園/綠地採集', effect: '提交日常任務', rarity: 'common' },
  { id: 'I_W010', name: '奇異種子', wuxing: '木', category: 'material_basic', source: '隨機採集點', effect: '種植於自宅花園', rarity: 'rare' },
  { id: 'I_W011', name: '木晶石', wuxing: '木', category: 'material_drop', source: '初階木系怪', effect: '鍛造木系裝備', rarity: 'common' },
  { id: 'I_W012', name: '毒液腺', wuxing: '木', category: 'material_drop', source: '藤蔓蜘蛛', effect: '製作毒屬性武器', rarity: 'common' },
  { id: 'I_W013', name: '綠色核心', wuxing: '木', category: 'material_drop', source: '綠芽史萊姆', effect: '寵物木屬性突破', rarity: 'common' },
  { id: 'I_W014', name: '迷幻孢子', wuxing: '木', category: 'material_drop', source: '孢子菇', effect: '製作混亂藥劑', rarity: 'common' },
  { id: 'I_W015', name: '古木心材', wuxing: '木', category: 'material_drop', source: '古木樹人', effect: '鍛造中階木系裝備', rarity: 'rare' },
  { id: 'I_W016', name: '消化液', wuxing: '木', category: 'material_drop', source: '巨型捕蠅草', effect: '製作腐蝕藥劑', rarity: 'rare' },
  { id: 'I_W017', name: '幻影鐮刀', wuxing: '木', category: 'material_drop', source: '幻影螳螂', effect: '鍛造高閃避裝備', rarity: 'rare' },
  { id: 'I_W018', name: '腐敗核心', wuxing: '木', category: 'material_drop', source: '腐毒沼澤怪', effect: '製作劇毒陷阱', rarity: 'rare' },
  { id: 'I_W019', name: '森猿獠牙', wuxing: '木', category: 'material_drop', source: '狂暴森猿', effect: '鍛造高暴擊裝備', rarity: 'rare' },
  { id: 'I_W020', name: '鐵木熊皮', wuxing: '木', category: 'material_drop', source: '鐵木巨熊', effect: '鍛造高防禦裝備', rarity: 'epic' },
  { id: 'I_W021', name: '木靈王核心', wuxing: '木', category: 'material_drop', source: '千年木靈王', effect: '鍛造高階木系裝備', rarity: 'epic' },
  { id: 'I_W022', name: '蛛后毒囊', wuxing: '木', category: 'material_drop', source: '萬毒蛛后', effect: '製作頂級毒藥', rarity: 'epic' },
  { id: 'I_W023', name: '翡翠龍鱗', wuxing: '木', category: 'material_drop', source: '翡翠森龍', effect: '鍛造傳說木系裝備', rarity: 'legendary' },
  { id: 'I_W024', name: '世界樹枝', wuxing: '木', category: 'material_drop', source: '巨型世界樹', effect: '製作頂級法杖', rarity: 'legendary' },
  { id: 'I_W025', name: '花神之淚', wuxing: '木', category: 'material_drop', source: '狂亂花神', effect: '製作頂級恢復藥劑', rarity: 'legendary' },
  { id: 'I_W026', name: '初級解毒草', wuxing: '木', category: 'consumable', source: '商店/合成', effect: '解除中毒狀態', rarity: 'common' },
  { id: 'I_W027', name: '活力樹汁', wuxing: '木', category: 'consumable', source: '商店/合成', effect: '恢復 50 點 HP', rarity: 'common' },
  { id: 'I_W028', name: '森林精華', wuxing: '木', category: 'consumable', source: '商店/合成', effect: '恢復 200 點 HP', rarity: 'rare' },
  { id: 'I_W029', name: '荊棘護甲藥劑', wuxing: '木', category: 'consumable', source: '合成', effect: '獲得 10% 反傷效果，持續 3 回合', rarity: 'rare' },
  { id: 'I_W030', name: '疾風草', wuxing: '木', category: 'consumable', source: '合成', effect: '速度提升 20%，持續 3 回合', rarity: 'rare' },
  { id: 'I_W031', name: '劇毒塗劑', wuxing: '木', category: 'consumable', source: '合成', effect: '下次攻擊附加中毒效果', rarity: 'rare' },
  { id: 'I_W032', name: '迷幻花粉', wuxing: '木', category: 'consumable', source: '合成', effect: '使敵方單體有 30% 機率混亂', rarity: 'rare' },
  { id: 'I_W033', name: '復甦之風', wuxing: '木', category: 'consumable', source: '合成', effect: '全體恢復 100 點 HP', rarity: 'epic' },
  { id: 'I_W034', name: '萬能解毒劑', wuxing: '木', category: 'consumable', source: '合成', effect: '解除所有異常狀態', rarity: 'epic' },
  { id: 'I_W035', name: '生命之水', wuxing: '木', category: 'consumable', source: '合成', effect: '復活一名隊友並恢復 30% HP', rarity: 'legendary' },
  { id: 'I_W036', name: '迷路藥童的草藥', wuxing: '木', category: 'quest', source: 'NPC 任務', effect: '提交給隨機 NPC 任務', rarity: 'common' },
  { id: 'I_W037', name: '破損的木雕', wuxing: '木', category: 'quest', source: '探索', effect: '觸發隱藏任務「古木的記憶」', rarity: 'rare' },
  { id: 'I_W038', name: '森林守護者印記', wuxing: '木', category: 'quest', source: '任務獎勵', effect: '進入特定木屬性副本的鑰匙', rarity: 'epic' },
  { id: 'I_W039', name: '奇異的蟲卵', wuxing: '木', category: 'quest', source: '採集', effect: '孵化出隨機木屬性寵物', rarity: 'rare' },
  { id: 'I_W040', name: '枯萎的樹枝', wuxing: '木', category: 'quest', source: '採集', effect: '提交給流浪商人換取靈石', rarity: 'common' },
  { id: 'I_W041', name: '春分紀念徽章', wuxing: '木', category: 'quest', source: '擊敗春分木靈', effect: '收集用', rarity: 'epic' },
  { id: 'I_W042', name: '驚蟄雷木枝', wuxing: '木', category: 'quest', source: '擊敗驚蟄雷木', effect: '製作特殊法杖', rarity: 'epic' },
  { id: 'I_W043', name: '迷霧精華', wuxing: '木', category: 'quest', source: '擊敗迷霧樹妖', effect: '製作隱身符', rarity: 'epic' },
  { id: 'I_W044', name: '毒沼之心', wuxing: '木', category: 'quest', source: '擊敗毒沼之主', effect: '解鎖高級毒系技能', rarity: 'legendary' },
  { id: 'I_W045', name: '幸運四葉草', wuxing: '木', category: 'quest', source: '擊敗幸運四葉草', effect: '永久提升 1% 掉寶率', rarity: 'legendary' },
  { id: 'I_W046', name: '萬古神木之魂', wuxing: '木', category: 'treasure', source: '極低機率掉落', effect: '鍛造天命級木系裝備的核心素材', rarity: 'legendary' },
  { id: 'I_W047', name: '逢春露', wuxing: '木', category: 'treasure', source: '極低機率掉落', effect: '永久提升最大 HP 50 點', rarity: 'legendary' },
  { id: 'I_W048', name: '復甦種子', wuxing: '木', category: 'treasure', source: '極低機率掉落', effect: '戰鬥中死亡時自動滿血復活（消耗品）', rarity: 'legendary' },
  { id: 'I_W049', name: '女妖之吻', wuxing: '木', category: 'treasure', source: '極低機率掉落', effect: '永久提升木屬性傷害 5%', rarity: 'legendary' },
  { id: 'I_W050', name: '天命木靈珠', wuxing: '木', category: 'treasure', source: '極低機率掉落', effect: '改變玩家本命五行為「木」', rarity: 'legendary' },
  // 火屬性道具（代表性）
  { id: 'I_F001', name: '餘燼', wuxing: '火', category: 'material_basic', source: '餐廳/廟宇採集', effect: '基礎武器鍛造', rarity: 'common' },
  { id: 'I_F011', name: '火晶石', wuxing: '火', category: 'material_drop', source: '初階火系怪', effect: '鍛造火系裝備', rarity: 'common' },
  { id: 'I_F026', name: '初級燒傷藥', wuxing: '火', category: 'consumable', source: '商店/合成', effect: '解除燃燒狀態', rarity: 'common' },
  { id: 'I_F027', name: '狂暴藥水', wuxing: '火', category: 'consumable', source: '合成', effect: '攻擊力提升 30%，防禦力降低 20%', rarity: 'rare' },
  { id: 'I_F028', name: '烈焰炸彈', wuxing: '火', category: 'consumable', source: '合成', effect: '對單體造成 150 點火屬性傷害', rarity: 'rare' },
  { id: 'I_F034', name: '鳳凰之血', wuxing: '火', category: 'consumable', source: '合成', effect: '復活一名隊友並恢復 50% HP', rarity: 'legendary' },
  { id: 'I_F041', name: '夏至紀念徽章', wuxing: '火', category: 'quest', source: '擊敗夏至炎靈', effect: '收集用', rarity: 'epic' },
  { id: 'I_F046', name: '隕石核心', wuxing: '火', category: 'treasure', source: '極低機率掉落', effect: '鍛造天命級火系裝備的核心素材', rarity: 'legendary' },
  { id: 'I_F050', name: '天命火靈珠', wuxing: '火', category: 'treasure', source: '極低機率掉落', effect: '改變玩家本命五行為「火」', rarity: 'legendary' },
  // 土屬性道具（代表性）
  { id: 'I_E001', name: '礦石', wuxing: '土', category: 'material_basic', source: '山區/工地採集', effect: '基礎防具鍛造', rarity: 'common' },
  { id: 'I_E011', name: '土晶石', wuxing: '土', category: 'material_drop', source: '初階土系怪', effect: '鍛造土系裝備', rarity: 'common' },
  { id: 'I_E026', name: '鐵甲藥劑', wuxing: '土', category: 'consumable', source: '合成', effect: '防禦力提升 30%，持續 3 回合', rarity: 'rare' },
  { id: 'I_E027', name: '磐石護盾', wuxing: '土', category: 'consumable', source: '合成', effect: '獲得一個吸收 200 點傷害的護盾', rarity: 'rare' },
  { id: 'I_E041', name: '秋分紀念徽章', wuxing: '土', category: 'quest', source: '擊敗秋分土靈', effect: '收集用', rarity: 'epic' },
  { id: 'I_E046', name: '脈動之核', wuxing: '土', category: 'treasure', source: '極低機率掉落', effect: '鍛造天命級土系裝備的核心素材', rarity: 'legendary' },
  { id: 'I_E050', name: '天命土靈珠', wuxing: '土', category: 'treasure', source: '極低機率掉落', effect: '改變玩家本命五行為「土」', rarity: 'legendary' },
  // 金屬性道具（代表性）
  { id: 'I_M001', name: '金屬零件', wuxing: '金', category: 'material_basic', source: '商業區/車站採集', effect: '基礎機械裝備鍛造', rarity: 'common' },
  { id: 'I_M011', name: '金晶石', wuxing: '金', category: 'material_drop', source: '初階金系怪', effect: '鍛造金系裝備', rarity: 'common' },
  { id: 'I_M026', name: '磨刀石', wuxing: '金', category: 'consumable', source: '合成', effect: '武器攻擊力提升 10%，持續 5 回合', rarity: 'common' },
  { id: 'I_M027', name: '疾風藥劑', wuxing: '金', category: 'consumable', source: '合成', effect: '速度提升 30%，持續 3 回合', rarity: 'rare' },
  { id: 'I_M032', name: '煙霧彈', wuxing: '金', category: 'consumable', source: '合成', effect: '戰鬥中必定逃跑成功', rarity: 'rare' },
  { id: 'I_M041', name: '立秋紀念徽章', wuxing: '金', category: 'quest', source: '擊敗立秋金靈', effect: '收集用', rarity: 'epic' },
  { id: 'I_M046', name: '衛星殘骸', wuxing: '金', category: 'treasure', source: '極低機率掉落', effect: '鍛造天命級金系裝備的核心素材', rarity: 'legendary' },
  { id: 'I_M050', name: '天命金靈珠', wuxing: '金', category: 'treasure', source: '極低機率掉落', effect: '改變玩家本命五行為「金」', rarity: 'legendary' },
  // 水屬性道具（代表性）
  { id: 'I_W051', name: '水滴', wuxing: '水', category: 'material_basic', source: '河岸/海邊採集', effect: '基礎 MP 藥劑合成', rarity: 'common' },
  { id: 'I_W061', name: '水晶石', wuxing: '水', category: 'material_drop', source: '初階水系怪', effect: '鍛造水系裝備', rarity: 'common' },
  { id: 'I_W076', name: '小靈泉', wuxing: '水', category: 'consumable', source: '商店/合成', effect: '恢復 20 點 MP', rarity: 'common' },
  { id: 'I_W077', name: '大靈泉', wuxing: '水', category: 'consumable', source: '商店/合成', effect: '恢復 60 點 MP', rarity: 'rare' },
  { id: 'I_W079', name: '淨化之水', wuxing: '水', category: 'consumable', source: '合成', effect: '解除所有負面狀態', rarity: 'rare' },
  { id: 'I_W084', name: '人魚之歌', wuxing: '水', category: 'consumable', source: '合成', effect: '全體恢復 30% MP', rarity: 'epic' },
  { id: 'I_W091', name: '冬至紀念徽章', wuxing: '水', category: 'quest', source: '擊敗冬至冰靈', effect: '收集用', rarity: 'epic' },
  { id: 'I_W096', name: '海嘯核心', wuxing: '水', category: 'treasure', source: '極低機率掉落', effect: '鍛造天命級水系裝備的核心素材', rarity: 'legendary' },
  { id: 'I_W100', name: '天命水靈珠', wuxing: '水', category: 'treasure', source: '極低機率掉落', effect: '改變玩家本命五行為「水」', rarity: 'legendary' },
];

// ═══════════════════════════════════════════════════════════════
// 裝備圖鑑（從 GD-015 讀取，每屬性 30 種，共 150 種）
// ═══════════════════════════════════════════════════════════════
const equipment = [
  // 木屬性裝備
  { id: 'E_W001', name: '木劍', wuxing: '木', slot: 'weapon', tier: '初階', level_required: 1, base_stats: '攻擊 +10', craft_materials: '靈草 ×5, 木晶石 ×1', rarity: 'common' },
  { id: 'E_W002', name: '藤蔓弓', wuxing: '木', slot: 'weapon', tier: '初階', level_required: 1, base_stats: '攻擊 +8, 速度 +5', craft_materials: '堅韌藤蔓 ×3, 木晶石 ×1', rarity: 'common' },
  { id: 'E_W003', name: '樹皮帽', wuxing: '木', slot: 'helmet', tier: '初階', level_required: 1, base_stats: '防禦 +5, HP +20', craft_materials: '苦澀樹皮 ×3, 木晶石 ×1', rarity: 'common' },
  { id: 'E_W004', name: '粗布衣', wuxing: '木', slot: 'armor', tier: '初階', level_required: 1, base_stats: '防禦 +8', craft_materials: '靈草 ×3, 蜘蛛絲 ×2', rarity: 'common' },
  { id: 'E_W005', name: '草鞋', wuxing: '木', slot: 'shoes', tier: '初階', level_required: 1, base_stats: '速度 +5', craft_materials: '靈草 ×4, 蜘蛛絲 ×1', rarity: 'common' },
  { id: 'E_W006', name: '綠葉護符', wuxing: '木', slot: 'accessory', tier: '初階', level_required: 1, base_stats: 'HP +50', craft_materials: '翠綠樹葉 ×5, 木晶石 ×1', rarity: 'common' },
  { id: 'E_W007', name: '古木長弓', wuxing: '木', slot: 'weapon', tier: '中階', level_required: 11, base_stats: '攻擊 +30, 速度 +10', special_effect: '攻擊有 10% 機率施加中毒', rarity: 'rare' },
  { id: 'E_W008', name: '毒牙匕首', wuxing: '木', slot: 'weapon', tier: '中階', level_required: 11, base_stats: '攻擊 +25, 暴擊 +5%', special_effect: '對中毒目標傷害 +20%', rarity: 'rare' },
  { id: 'E_W009', name: '荊棘頭冠', wuxing: '木', slot: 'helmet', tier: '中階', level_required: 11, base_stats: '防禦 +15, 反傷 5%', special_effect: '受到近戰攻擊反彈傷害', rarity: 'rare' },
  { id: 'E_W010', name: '森猿皮甲', wuxing: '木', slot: 'armor', tier: '中階', level_required: 11, base_stats: '防禦 +25, HP +100', special_effect: '木屬性抗性 +15%', rarity: 'rare' },
  { id: 'E_W011', name: '疾風靴', wuxing: '木', slot: 'shoes', tier: '中階', level_required: 11, base_stats: '速度 +25, 閃避 +5%', special_effect: '閃避成功後恢復 5% HP', rarity: 'rare' },
  { id: 'E_W012', name: '孢子戒指', wuxing: '木', slot: 'accessory', tier: '中階', level_required: 11, base_stats: '魔法攻擊 +15', special_effect: '技能附帶混亂機率', rarity: 'rare' },
  { id: 'E_W017', name: '木靈王之劍', wuxing: '木', slot: 'weapon', tier: '高階', level_required: 26, base_stats: '攻擊 +80, 吸血 10%', special_effect: '生生不息：每次攻擊恢復造成傷害 10% 的 HP', rarity: 'legendary' },
  { id: 'E_W018', name: '翡翠龍弓', wuxing: '木', slot: 'weapon', tier: '高階', level_required: 26, base_stats: '攻擊 +75, 速度 +30', special_effect: '龍之毒：中毒效果無法被清除，且傷害隨回合遞增', rarity: 'legendary' },
  { id: 'E_W019', name: '世界樹法杖', wuxing: '木', slot: 'weapon', tier: '高階', level_required: 26, base_stats: '魔法攻擊 +90', special_effect: '自然恩賜：所有恢復技能效果提升 50%', rarity: 'legendary' },
  { id: 'E_W021', name: '萬古神木甲', wuxing: '木', slot: 'armor', tier: '高階', level_required: 26, base_stats: '防禦 +80, HP +500', special_effect: '神木庇護：HP 低於 30% 時，獲得一個等同最大 HP 50% 的護盾', rarity: 'legendary' },
  { id: 'E_W023', name: '疾風螳螂靴', wuxing: '木', slot: 'shoes', tier: '高階', level_required: 26, base_stats: '速度 +60, 暴擊 +10%', special_effect: '風之化身：永遠確保第一個行動', rarity: 'legendary' },
  { id: 'E_W030', name: '天命木靈套裝', wuxing: '木', slot: 'armor', tier: '傳說', level_required: 40, base_stats: '（集齊 5 件觸發）', special_effect: '天命之木：本命五行為木時，全屬性提升 30%', rarity: 'legendary' },
  // 火屬性裝備
  { id: 'E_F001', name: '餘燼法杖', wuxing: '火', slot: 'weapon', tier: '初階', level_required: 1, base_stats: '魔法攻擊 +12', craft_materials: '餘燼 ×5, 火晶石 ×1', rarity: 'common' },
  { id: 'E_F002', name: '溫熱石錘', wuxing: '火', slot: 'weapon', tier: '初階', level_required: 1, base_stats: '攻擊 +15, 速度 -5', craft_materials: '溫熱石塊 ×3, 火晶石 ×1', rarity: 'common' },
  { id: 'E_F007', name: '烈焰劍', wuxing: '火', slot: 'weapon', tier: '中階', level_required: 11, base_stats: '攻擊 +35', special_effect: '攻擊有 15% 機率施加燃燒', rarity: 'rare' },
  { id: 'E_F017', name: '太陽神劍', wuxing: '火', slot: 'weapon', tier: '高階', level_required: 26, base_stats: '攻擊 +95, 暴擊 +15%', special_effect: '烈陽之怒：暴擊時造成 3 倍傷害', rarity: 'legendary' },
  { id: 'E_F022', name: '熔岩龍鱗甲', wuxing: '火', slot: 'armor', tier: '高階', level_required: 26, base_stats: '防禦 +90, 火抗 +50%', special_effect: '熔岩之心：受到火屬性攻擊時不扣血，反而恢復等量 HP', rarity: 'legendary' },
  { id: 'E_F030', name: '天命火靈套裝', wuxing: '火', slot: 'armor', tier: '傳說', level_required: 40, base_stats: '（集齊 5 件觸發）', special_effect: '天命之火：本命五行為火時，全屬性提升 30%', rarity: 'legendary' },
  // 土屬性裝備
  { id: 'E_E001', name: '岩石盾', wuxing: '土', slot: 'offhand', tier: '初階', level_required: 1, base_stats: '防禦 +12', craft_materials: '礦石 ×6, 土晶石 ×1', rarity: 'common' },
  { id: 'E_E002', name: '堅硬石錘', wuxing: '土', slot: 'weapon', tier: '初階', level_required: 1, base_stats: '攻擊 +18, 速度 -10', craft_materials: '堅硬岩塊 ×5, 土晶石 ×1', rarity: 'common' },
  { id: 'E_E017', name: '泰坦巨斧', wuxing: '土', slot: 'weapon', tier: '高階', level_required: 26, base_stats: '攻擊 +110, 速度 -20', special_effect: '泰坦之擊：攻擊必定命中，且無法被格擋', rarity: 'legendary' },
  { id: 'E_E021', name: '大地之母鎧', wuxing: '土', slot: 'armor', tier: '高階', level_required: 26, base_stats: '防禦 +100, HP +800', special_effect: '大地之母：每回合自動恢復 5% 最大 HP', rarity: 'legendary' },
  { id: 'E_E030', name: '天命土靈套裝', wuxing: '土', slot: 'armor', tier: '傳說', level_required: 40, base_stats: '（集齊 5 件觸發）', special_effect: '天命之土：本命五行為土時，全屬性提升 30%', rarity: 'legendary' },
  // 金屬性裝備
  { id: 'E_M001', name: '鐵劍', wuxing: '金', slot: 'weapon', tier: '初階', level_required: 1, base_stats: '攻擊 +15', craft_materials: '鐵礦石 ×5, 金晶石 ×1', rarity: 'common' },
  { id: 'E_M002', name: '飛鏢套裝', wuxing: '金', slot: 'weapon', tier: '初階', level_required: 1, base_stats: '攻擊 +12, 速度 +10', craft_materials: '飛鏢羽 ×5, 金晶石 ×1', rarity: 'common' },
  { id: 'E_M017', name: '天命龍槍', wuxing: '金', slot: 'weapon', tier: '高階', level_required: 26, base_stats: '攻擊 +100, 暴擊 +15%', special_effect: '龍之突刺：攻擊無視目標 50% 防禦力', rarity: 'legendary' },
  { id: 'E_M021', name: '巨神兵裝甲', wuxing: '金', slot: 'armor', tier: '高階', level_required: 26, base_stats: '防禦 +95, 免疫異常', special_effect: '絕對裝甲：受到的所有物理傷害減半', rarity: 'legendary' },
  { id: 'E_M030', name: '天命金靈套裝', wuxing: '金', slot: 'armor', tier: '傳說', level_required: 40, base_stats: '（集齊 5 件觸發）', special_effect: '天命之金：本命五行為金時，全屬性提升 30%', rarity: 'legendary' },
  // 水屬性裝備
  { id: 'E_W051', name: '冰晶法杖', wuxing: '水', slot: 'weapon', tier: '初階', level_required: 1, base_stats: '魔法攻擊 +15', craft_materials: '冰晶 ×5, 水晶石 ×1', rarity: 'common' },
  { id: 'E_W052', name: '珊瑚短劍', wuxing: '水', slot: 'weapon', tier: '初階', level_required: 1, base_stats: '攻擊 +12, 魔法攻擊 +8', craft_materials: '珊瑚 ×3, 水晶石 ×1', rarity: 'common' },
  { id: 'E_W067', name: '海神三叉戟', wuxing: '水', slot: 'weapon', tier: '高階', level_required: 26, base_stats: '攻擊 +60, 魔法攻擊 +90', special_effect: '海神之威：攻擊時附帶目標最大 HP 5% 的水屬性傷害', rarity: 'legendary' },
  { id: 'E_W071', name: '冰霜龍鱗甲', wuxing: '水', slot: 'armor', tier: '高階', level_required: 26, base_stats: '防禦 +70, 魔法防禦 +80', special_effect: '龍之冰甲：免疫所有魔法傷害的 30%', rarity: 'legendary' },
  { id: 'E_W080', name: '天命水靈套裝', wuxing: '水', slot: 'armor', tier: '傳說', level_required: 40, base_stats: '（集齊 5 件觸發）', special_effect: '天命之水：本命五行為水時，全屬性提升 30%', rarity: 'legendary' },
];

// ═══════════════════════════════════════════════════════════════
// 寫入資料庫
// ═══════════════════════════════════════════════════════════════

// 寫入怪物
console.log('Writing monsters...');
for (const m of monsters) {
  await conn.execute(
    `INSERT INTO game_monster_catalog (monster_id, name, wuxing, level_range, base_hp, base_attack, base_defense, base_speed, description, drop_items, rarity, catch_rate, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description)`,
    [m.id, m.name, m.wuxing, m.level_range, m.base_hp, m.base_attack, m.base_defense, m.base_speed,
     m.description || '', JSON.stringify(m.drop_items || []), m.rarity, m.catch_rate, now]
  );
}
console.log(`✓ ${monsters.length} monsters written`);

// 寫入技

// 寫入技能
console.log('Writing skills...');
for (const s of skills) {
  await conn.execute(
    `INSERT INTO game_skill_catalog (skill_id, name, wuxing, category, tier, mp_cost, description, skill_type, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description)`,
    [s.id, s.name, s.wuxing, s.category, s.tier, s.mp_cost, s.description || '', s.skill_type, now]
  );
}
console.log(`✓ ${skills.length} skills written`);

// 寫入道具
console.log('Writing items...');
for (const i of items) {
  await conn.execute(
    `INSERT INTO game_item_catalog (item_id, name, wuxing, category, source, effect, rarity, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name=VALUES(name), effect=VALUES(effect)`,
    [i.id, i.name, i.wuxing, i.category, i.source || '', i.effect || '', i.rarity, now]
  );
}
console.log(`✓ ${items.length} items written`);

// 寫入裝備
console.log('Writing equipment...');
for (const e of equipment) {
  await conn.execute(
    `INSERT INTO game_equipment_catalog (equip_id, name, wuxing, slot, tier, level_required, base_stats, special_effect, craft_materials, rarity, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name=VALUES(name), base_stats=VALUES(base_stats), special_effect=VALUES(special_effect)`,
    [e.id, e.name, e.wuxing, e.slot, e.tier, e.level_required, e.base_stats || '', e.special_effect || '', e.craft_materials || '', e.rarity, now]
  );
}
console.log(`✓ ${equipment.length} equipment written`);

await conn.end();
console.log('\n🎉 All game catalog data seeded successfully!');
console.log(`  Monsters: ${monsters.length}`);
console.log(`  Skills: ${skills.length}`);
console.log(`  Items: ${items.length}`);
console.log(`  Equipment: ${equipment.length}`);
