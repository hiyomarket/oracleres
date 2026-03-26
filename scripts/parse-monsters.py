#!/usr/bin/env python3
"""
解析 GD-011A~E 怪物圖鑑 Markdown，生成 SQL INSERT 語句
"""
import re
import json
import os

FILES = [
    ("GD-011A-木屬性怪物圖鑑.md", "木"),
    ("GD-011B-火屬性怪物圖鑑.md", "火"),
    ("GD-011C-土屬性怪物圖鑑.md", "土"),
    ("GD-011D-金屬性怪物圖鑑.md", "金"),
    ("GD-011E-水屬性怪物圖鑑.md", "水"),
]

RARITY_MAP = {
    "普通": "common",
    "精英": "rare",
    "Boss": "epic",
    "世界Boss": "legendary",
}

GROWTH_MAP = {
    "普通": 1.0,
    "良好": 1.2,
    "優秀": 1.5,
    "天賦": 2.0,
    "傳說": 3.0,
}

def parse_table(lines):
    """Parse a 4-column markdown table into a dict of field->value"""
    data = {}
    for line in lines:
        line = line.strip()
        if not line.startswith("|") or "---" in line or "欄位" in line:
            continue
        cells = [c.strip() for c in line.split("|")]
        cells = [c for c in cells if c]
        if len(cells) >= 4:
            data[cells[0]] = cells[1]
            data[cells[2]] = cells[3]
        elif len(cells) >= 2:
            data[cells[0]] = cells[1]
    return data

def extract_id(text, prefix="SK_"):
    """Extract ID like SK_M001 or I_W001 from text like 'SK_M001（藤蔓鞭擊）'"""
    if not text or text == "—" or text == "—":
        return ""
    match = re.match(r'([A-Z_]+\d+)', text)
    return match.group(1) if match else ""

def parse_gold(text):
    """Parse gold range like '80–150' or '80-150' or '50000–100000'"""
    if not text:
        return {"min": 5, "max": 15}
    text = text.replace("–", "-").replace("—", "-").replace(",", "")
    match = re.match(r'(\d+)\s*-\s*(\d+)', text)
    if match:
        return {"min": int(match.group(1)), "max": int(match.group(2))}
    return {"min": 5, "max": 15}

def parse_drop_rate(text):
    """Parse drop rate like '15%' or '100%（必掉線索）'"""
    if not text:
        return 0
    match = re.match(r'(\d+(?:\.\d+)?)', text)
    return float(match.group(1)) if match else 0

def parse_monster(lines, wuxing):
    """Parse a single monster block into a dict"""
    data = parse_table(lines)
    if not data:
        return None
    
    monster_code = data.get("monster_code", "")
    if not monster_code:
        return None
    
    name_line = ""
    for line in lines:
        if line.strip().startswith("### "):
            name_line = line.strip()
            break
    
    # Extract name from ### M_W001 葉刃狐 or ### M_W021 遠古參神（Boss）
    name = ""
    if name_line:
        match = re.match(r'### M_\w+\s+(.+)', name_line)
        if match:
            name = match.group(1).strip()
            # Remove (Boss) suffix
            name = re.sub(r'[（(]Boss[）)]', '', name).strip()
            name = re.sub(r'[（(]世界Boss[）)]', '', name).strip()
    
    if not name:
        name = data.get("monster_code", "Unknown")
    
    try:
        level = int(data.get("等級", "1"))
    except (ValueError, TypeError):
        level = 1
    rarity_raw = data.get("稀有度", "普通")
    rarity = RARITY_MAP.get(rarity_raw, "common")
    
    growth_raw = data.get("成長率", "普通")
    growth = GROWTH_MAP.get(growth_raw, 1.0)
    
    skill1 = extract_id(data.get("skill_id_1", ""))
    skill2 = extract_id(data.get("skill_id_2", ""))
    skill3 = extract_id(data.get("skill_id_3", ""))
    
    drop_item1 = extract_id(data.get("掉落素材", ""))
    drop_rate1 = parse_drop_rate(data.get("掉落機率%", "0"))
    
    gold = parse_gold(data.get("掉落金幣", ""))
    
    legendary_drop = extract_id(data.get("傳說掉落", ""))
    legendary_rate = parse_drop_rate(data.get("傳說掉落機率%", "0"))
    
    ai_raw = data.get("AI 等級", "1")
    try:
        ai_level = int(ai_raw)
    except (ValueError, TypeError):
        ai_level = 1
    
    return {
        "monsterId": monster_code,
        "name": name,
        "wuxing": wuxing,
        "levelRange": f"{level}-{level}",
        "rarity": rarity,
        "baseHp": int(data.get("HP", "50")),
        "baseAttack": int(data.get("攻擊", "10")),
        "baseDefense": int(data.get("防禦", "5")),
        "baseSpeed": int(data.get("速度", "10")),
        "baseAccuracy": int(data.get("命中力", "80")),
        "baseMagicAttack": int(data.get("魔法攻擊", "8")),
        "resistWood": int(data.get("抗木%", "0")),
        "resistFire": int(data.get("抗火%", "0")),
        "resistEarth": int(data.get("抗土%", "0")),
        "resistMetal": int(data.get("抗金%", "0")),
        "resistWater": int(data.get("抗水%", "0")),
        "counterBonus": int(data.get("被剋制加成%", "50")),
        "skillId1": skill1,
        "skillId2": skill2,
        "skillId3": skill3,
        "aiLevel": ai_level,
        "growthRate": growth,
        "dropItem1": drop_item1,
        "dropRate1": drop_rate1,
        "dropGold": gold,
        "legendaryDrop": legendary_drop,
        "legendaryDropRate": legendary_rate,
    }

def parse_file(filepath, wuxing):
    """Parse all monsters from a single file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    monsters = []
    # Split by ### M_ headers
    blocks = re.split(r'(?=^### M_)', content, flags=re.MULTILINE)
    
    for block in blocks:
        if not block.strip().startswith("### M_"):
            continue
        lines = block.strip().split("\n")
        monster = parse_monster(lines, wuxing)
        if monster:
            monsters.append(monster)
    
    return monsters

def escape_sql(val):
    """Escape a value for SQL"""
    if val is None:
        return "NULL"
    if isinstance(val, (int, float)):
        return str(val)
    if isinstance(val, dict) or isinstance(val, list):
        return "'" + json.dumps(val, ensure_ascii=False).replace("'", "\\'") + "'"
    s = str(val).replace("'", "\\'")
    return f"'{s}'"

def generate_sql(monsters):
    """Generate SQL INSERT statements"""
    sqls = []
    for m in monsters:
        sql = f"""INSERT INTO game_monster_catalog (
  monster_id, name, wuxing, level_range, rarity,
  base_hp, base_attack, base_defense, base_speed, base_accuracy, base_magic_attack,
  resist_wood, resist_fire, resist_earth, resist_metal, resist_water, counter_bonus,
  skill_id_1, skill_id_2, skill_id_3,
  ai_level, growth_rate,
  drop_item_1, drop_rate_1, drop_gold,
  legendary_drop, legendary_drop_rate,
  is_active, created_at
) VALUES (
  {escape_sql(m['monsterId'])}, {escape_sql(m['name'])}, {escape_sql(m['wuxing'])}, {escape_sql(m['levelRange'])}, {escape_sql(m['rarity'])},
  {m['baseHp']}, {m['baseAttack']}, {m['baseDefense']}, {m['baseSpeed']}, {m['baseAccuracy']}, {m['baseMagicAttack']},
  {m['resistWood']}, {m['resistFire']}, {m['resistEarth']}, {m['resistMetal']}, {m['resistWater']}, {m['counterBonus']},
  {escape_sql(m['skillId1'])}, {escape_sql(m['skillId2'])}, {escape_sql(m['skillId3'])},
  {m['aiLevel']}, {m['growthRate']},
  {escape_sql(m['dropItem1'])}, {m['dropRate1']}, {escape_sql(json.dumps(m['dropGold'], ensure_ascii=False))},
  {escape_sql(m['legendaryDrop'])}, {m['legendaryDropRate']},
  1, {int(__import__('time').time() * 1000)}
) ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  wuxing = VALUES(wuxing),
  level_range = VALUES(level_range),
  rarity = VALUES(rarity),
  base_hp = VALUES(base_hp),
  base_attack = VALUES(base_attack),
  base_defense = VALUES(base_defense),
  base_speed = VALUES(base_speed),
  base_accuracy = VALUES(base_accuracy),
  base_magic_attack = VALUES(base_magic_attack),
  resist_wood = VALUES(resist_wood),
  resist_fire = VALUES(resist_fire),
  resist_earth = VALUES(resist_earth),
  resist_metal = VALUES(resist_metal),
  resist_water = VALUES(resist_water),
  counter_bonus = VALUES(counter_bonus),
  skill_id_1 = VALUES(skill_id_1),
  skill_id_2 = VALUES(skill_id_2),
  skill_id_3 = VALUES(skill_id_3),
  ai_level = VALUES(ai_level),
  growth_rate = VALUES(growth_rate),
  drop_item_1 = VALUES(drop_item_1),
  drop_rate_1 = VALUES(drop_rate_1),
  drop_gold = VALUES(drop_gold),
  legendary_drop = VALUES(legendary_drop),
  legendary_drop_rate = VALUES(legendary_drop_rate);"""
        sqls.append(sql)
    return sqls

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    all_monsters = []
    
    for filename, wuxing in FILES:
        filepath = os.path.join(base_dir, filename)
        if not os.path.exists(filepath):
            print(f"⚠️ 找不到 {filename}")
            continue
        monsters = parse_file(filepath, wuxing)
        print(f"✅ {filename}: 解析到 {len(monsters)} 隻怪物")
        all_monsters.extend(monsters)
    
    print(f"\n📊 總計: {len(all_monsters)} 隻怪物")
    
    # Generate SQL
    sqls = generate_sql(all_monsters)
    
    # Write to file
    output_path = os.path.join(base_dir, "scripts", "import-monsters.sql")
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("-- 自動生成的怪物圖鑑匯入 SQL\n")
        f.write(f"-- 總計 {len(all_monsters)} 隻怪物\n\n")
        for sql in sqls:
            f.write(sql + "\n\n")
    
    print(f"✅ SQL 已寫入 {output_path}")
    
    # Also output JSON for verification
    json_path = os.path.join(base_dir, "scripts", "parsed-monsters.json")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(all_monsters, f, ensure_ascii=False, indent=2)
    
    print(f"✅ JSON 已寫入 {json_path}")

if __name__ == "__main__":
    main()
