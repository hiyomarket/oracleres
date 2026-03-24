#!/usr/bin/env python3
"""
批量匯入怪物圖鑑資料到 game_monster_catalog
解析 GD-011A~E 的 Markdown 表格格式
"""
import re
import json
import os

# 五行對應
WUXING_MAP = {
    "A": "wood",
    "B": "fire",
    "C": "earth",
    "D": "metal",
    "E": "water",
}

WUXING_ZH_MAP = {
    "wood": "木",
    "fire": "火",
    "earth": "土",
    "metal": "金",
    "water": "水",
}

# 稀有度對應
RARITY_MAP = {
    "普通": "common",
    "精英": "elite",
    "Boss": "boss",
    "世界Boss": "legendary",
    "世界BOSS": "legendary",
}

# 成長率對應
GROWTH_MAP = {
    "普通": 1.0,
    "良好": 1.05,
    "優秀": 1.1,
    "天賦": 1.15,
    "傳說": 1.2,
}

def parse_monster_block(lines, wuxing):
    """解析一個怪物的表格區塊"""
    monster = {}
    
    for line in lines:
        line = line.strip()
        if not line.startswith("|") or "---" in line or "欄位" in line:
            continue
        
        # 解析 | 欄位 | 數值 | 欄位 | 數值 | 格式
        cells = [c.strip() for c in line.split("|")]
        cells = [c for c in cells if c]  # 移除空字串
        
        if len(cells) >= 4:
            key1, val1, key2, val2 = cells[0], cells[1], cells[2], cells[3]
            monster[key1] = val1
            monster[key2] = val2
        elif len(cells) >= 2:
            monster[cells[0]] = cells[1]
    
    if not monster.get("monster_code"):
        return None
    
    # 解析金幣範圍
    gold_str = monster.get("掉落金幣", "50-100")
    gold_parts = re.findall(r'\d+', gold_str)
    gold_min = int(gold_parts[0]) if len(gold_parts) >= 1 else 50
    gold_max = int(gold_parts[1]) if len(gold_parts) >= 2 else gold_min * 2
    
    # 解析掉落素材
    drop_str = monster.get("掉落素材", "")
    drop_item = ""
    drop_match = re.match(r'(I_\w+)', drop_str)
    if drop_match:
        drop_item = drop_match.group(1)
    
    # 解析掉落機率
    drop_rate_str = monster.get("掉落機率%", "10%")
    drop_rate = float(re.findall(r'[\d.]+', drop_rate_str)[0]) if re.findall(r'[\d.]+', drop_rate_str) else 10
    
    # 解析技能
    skill1 = ""
    skill1_raw = monster.get("skill_id_1", "—")
    sk_match = re.match(r'(SK_M\d+)', skill1_raw)
    if sk_match:
        skill1 = sk_match.group(1)
    
    skill2 = ""
    skill2_raw = monster.get("skill_id_2", "—")
    sk_match2 = re.match(r'(SK_M\d+)', skill2_raw)
    if sk_match2:
        skill2 = sk_match2.group(1)
    
    skill3 = ""
    skill3_raw = monster.get("skill_id_3", "—")
    sk_match3 = re.match(r'(SK_M\d+)', skill3_raw)
    if sk_match3:
        skill3 = sk_match3.group(1)
    
    # 等級範圍
    level = int(monster.get("等級", "1"))
    if level <= 10:
        level_range = "1-10"
    elif level <= 25:
        level_range = "11-25"
    elif level <= 50:
        level_range = "26-50"
    else:
        level_range = "51-60"
    
    rarity = RARITY_MAP.get(monster.get("稀有度", "普通"), "common")
    growth = GROWTH_MAP.get(monster.get("成長率", "普通"), 1.0)
    
    def safe_int(val, default=0):
        try:
            return int(re.findall(r'\d+', str(val))[0])
        except (ValueError, IndexError):
            return default

    return {
        "monster_id": monster.get("monster_code", ""),
        "name": "",  # 從標題取
        "wuxing": wuxing,
        "level_range": level_range,
        "rarity": rarity,
        "base_hp": safe_int(monster.get("HP", "50"), 50),
        "base_attack": safe_int(monster.get("攻擊", "10"), 10),
        "base_defense": safe_int(monster.get("防禦", "5"), 5),
        "base_speed": safe_int(monster.get("速度", "10"), 10),
        "base_accuracy": safe_int(monster.get("命中力", "80"), 80),
        "base_magic_attack": safe_int(monster.get("魔法攻擊", "8"), 8),
        "resist_wood": safe_int(monster.get("抗木%", "0")),
        "resist_fire": safe_int(monster.get("抗火%", "0")),
        "resist_earth": safe_int(monster.get("抗土%", "0")),
        "resist_metal": safe_int(monster.get("抗金%", "0")),
        "resist_water": safe_int(monster.get("抗水%", "0")),
        "counter_bonus": safe_int(monster.get("被剛制加成%", "20"), 20),
        "skill_id_1": skill1,
        "skill_id_2": skill2,
        "skill_id_3": skill3,
        "race": "",
        "ai_level": safe_int(monster.get("AI 等級", "1"), 1),
        "growth_rate": growth,
        "drop_item_1": drop_item,
        "drop_rate_1": drop_rate,
        "drop_gold": json.dumps({"min": gold_min, "max": gold_max}),
        "exp_reward": safe_int(monster.get("經驗值", "30"), 30),
    }


def parse_file(filepath, wuxing_key):
    """解析一個怪物圖鑑 Markdown 文件"""
    wuxing = WUXING_MAP[wuxing_key]
    
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    monsters = []
    
    # 找到所有 ### M_Xnnn 名稱 的區塊
    pattern = r'### (M_\w+)\s+(.+?)(?=\n)'
    blocks = re.split(r'### M_\w+\s+.+?\n', content)
    headers = re.findall(pattern, content)
    
    for i, (code, name) in enumerate(headers):
        if i + 1 < len(blocks):
            block_lines = blocks[i + 1].strip().split("\n")
            m = parse_monster_block(block_lines, wuxing)
            if m:
                # 清理名稱（移除括號內的描述）
                clean_name = re.sub(r'[（(].+?[）)]', '', name).strip()
                m["name"] = clean_name
                m["monster_id"] = code
                monsters.append(m)
    
    return monsters


def escape_sql(val):
    """SQL 字串轉義"""
    if val is None:
        return "NULL"
    s = str(val).replace("'", "''").replace("\\", "\\\\")
    return f"'{s}'"


def generate_sql(monsters):
    """生成 INSERT SQL"""
    sqls = []
    
    for m in monsters:
        sql = f"""INSERT INTO game_monster_catalog 
(monster_id, name, wuxing, level_range, rarity, 
 base_hp, base_attack, base_defense, base_speed, base_accuracy, base_magic_attack,
 resist_wood, resist_fire, resist_earth, resist_metal, resist_water, counter_bonus,
 skill_id_1, skill_id_2, skill_id_3, race, ai_level, growth_rate,
 drop_item_1, drop_rate_1, drop_gold, created_at)
VALUES (
  {escape_sql(m['monster_id'])}, {escape_sql(m['name'])}, {escape_sql(m['wuxing'])}, 
  {escape_sql(m['level_range'])}, {escape_sql(m['rarity'])},
  {m['base_hp']}, {m['base_attack']}, {m['base_defense']}, {m['base_speed']}, 
  {m['base_accuracy']}, {m['base_magic_attack']},
  {m['resist_wood']}, {m['resist_fire']}, {m['resist_earth']}, 
  {m['resist_metal']}, {m['resist_water']}, {m['counter_bonus']},
  {escape_sql(m['skill_id_1'])}, {escape_sql(m['skill_id_2'])}, {escape_sql(m['skill_id_3'])},
  {escape_sql(m['race'])}, {m['ai_level']}, {m['growth_rate']},
  {escape_sql(m['drop_item_1'])}, {m['drop_rate_1']}, {escape_sql(m['drop_gold'])},
  {int(import_time)}
) ON DUPLICATE KEY UPDATE 
  name=VALUES(name), base_hp=VALUES(base_hp), base_attack=VALUES(base_attack),
  base_defense=VALUES(base_defense), base_speed=VALUES(base_speed),
  base_accuracy=VALUES(base_accuracy), base_magic_attack=VALUES(base_magic_attack),
  resist_wood=VALUES(resist_wood), resist_fire=VALUES(resist_fire),
  resist_earth=VALUES(resist_earth), resist_metal=VALUES(resist_metal),
  resist_water=VALUES(resist_water), counter_bonus=VALUES(counter_bonus),
  skill_id_1=VALUES(skill_id_1), skill_id_2=VALUES(skill_id_2), skill_id_3=VALUES(skill_id_3),
  ai_level=VALUES(ai_level), growth_rate=VALUES(growth_rate),
  drop_item_1=VALUES(drop_item_1), drop_rate_1=VALUES(drop_rate_1),
  drop_gold=VALUES(drop_gold);"""
        sqls.append(sql)
    
    return sqls


import time
import_time = time.time() * 1000

# 解析所有 5 個文件
all_monsters = []
files = {
    "A": "GD-011A-木屬性怪物圖鑑.md",
    "B": "GD-011B-火屬性怪物圖鑑.md",
    "C": "GD-011C-土屬性怪物圖鑑.md",
    "D": "GD-011D-金屬性怪物圖鑑.md",
    "E": "GD-011E-水屬性怪物圖鑑.md",
}

base_dir = "/home/ubuntu/oracle-resonance"

for key, filename in files.items():
    filepath = os.path.join(base_dir, filename)
    if os.path.exists(filepath):
        monsters = parse_file(filepath, key)
        print(f"[{key}] {filename}: 解析到 {len(monsters)} 隻怪物")
        all_monsters.extend(monsters)
    else:
        print(f"[{key}] {filename}: 文件不存在")

print(f"\n總共解析到 {len(all_monsters)} 隻怪物")

# 生成 SQL
sqls = generate_sql(all_monsters)

# 寫入 SQL 文件
output_path = os.path.join(base_dir, "import-monsters.sql")
with open(output_path, "w", encoding="utf-8") as f:
    for sql in sqls:
        f.write(sql + "\n\n")

print(f"SQL 已寫入 {output_path}")

# 也輸出前 3 筆作為預覽
for m in all_monsters[:3]:
    print(f"  {m['monster_id']} {m['name']} ({m['wuxing']}) Lv.{m['level_range']} HP:{m['base_hp']} ATK:{m['base_attack']}")
