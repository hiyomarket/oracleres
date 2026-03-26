/**
 * CatalogPreview.tsx — 後台圖鑑表單即時預覽組件
 * 在新增/編輯圖鑑時，右側顯示遊戲內呈現效果
 */

const WX_COLOR: Record<string, string> = {
  "木": "#22c55e", "火": "#ef4444", "土": "#eab308", "金": "#94a3b8", "水": "#3b82f6",
};
const TIER_COLOR: Record<string, string> = {
  "傳說": "#f59e0b", "高階": "#a78bfa", "中階": "#38bdf8", "初階": "#94a3b8",
};
const RARITY_COLOR: Record<string, string> = {
  "legendary": "#f59e0b", "epic": "#a78bfa", "rare": "#38bdf8", "uncommon": "#22c55e", "common": "#94a3b8",
};
const RARITY_LABEL: Record<string, string> = {
  "legendary": "傳說", "epic": "史詩", "rare": "稀有", "uncommon": "優良", "common": "普通",
};

// ─── 怪物預覽卡片 ───
export function MonsterPreview({ data }: { data: { name?: string; wuxing?: string; baseHp?: number; baseAttack?: number; baseDefense?: number; baseSpeed?: number; catchRate?: number; imageUrl?: string } }) {
  const wx = data.wuxing ?? "木";
  const color = WX_COLOR[wx] ?? "#94a3b8";
  const hp = data.baseHp ?? 0;
  const atk = data.baseAttack ?? 0;
  const def = data.baseDefense ?? 0;
  const spd = data.baseSpeed ?? 0;
  const total = hp + atk + def + spd;
  const maxStat = Math.max(hp, atk, def, spd, 1);

  return (
    <div className="w-full max-w-[220px] mx-auto">
      <p className="text-[9px] text-center text-slate-600 mb-2 tracking-widest">遊戲內預覽</p>
      <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #0f172a, #1e293b)", border: `2px solid ${color}40` }}>
        {/* 頭部 */}
        <div className="px-4 pt-3 pb-2 flex items-center justify-between" style={{ borderBottom: `1px solid ${color}20` }}>
          <span className="text-sm font-bold" style={{ color }}>{data.name || "未命名魔物"}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${color}20`, color }}>{wx}</span>
        </div>
        {/* 圖片區 */}
        <div className="h-24 flex items-center justify-center" style={{ background: `${color}08` }}>
          {data.imageUrl ? (
            <img src={data.imageUrl} alt="" className="h-20 w-20 object-contain" />
          ) : (
            <span className="text-4xl opacity-30">👹</span>
          )}
        </div>
        {/* 屬性條 */}
        <div className="px-3 py-2 space-y-1.5">
          {[
            { label: "HP", val: hp, barColor: "#ef4444" },
            { label: "攻擊", val: atk, barColor: "#f59e0b" },
            { label: "防禦", val: def, barColor: "#3b82f6" },
            { label: "速度", val: spd, barColor: "#22c55e" },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2">
              <span className="text-[9px] w-6 text-right text-slate-500">{s.label}</span>
              <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min((s.val / maxStat) * 100, 100)}%`, background: s.barColor }} />
              </div>
              <span className="text-[9px] w-8 text-right font-mono" style={{ color: s.barColor }}>{s.val}</span>
            </div>
          ))}
        </div>
        {/* 底部 */}
        <div className="px-3 pb-2 flex items-center justify-between">
          <span className="text-[9px] text-slate-600">總戰力 {total}</span>
          <span className="text-[9px] text-slate-600">捕捉率 {((data.catchRate ?? 0) * 100).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}

// ─── 道具預覽卡片 ───
export function ItemPreview({ data }: { data: { name?: string; wuxing?: string; rarity?: string; category?: string; description?: string; sellPrice?: number; imageUrl?: string } }) {
  const wx = data.wuxing ?? "木";
  const wxColor = WX_COLOR[wx] ?? "#94a3b8";
  const rarity = data.rarity ?? "common";
  const rarityColor = RARITY_COLOR[rarity] ?? "#94a3b8";
  const rarityLabel = RARITY_LABEL[rarity] ?? "普通";

  return (
    <div className="w-full max-w-[220px] mx-auto">
      <p className="text-[9px] text-center text-slate-600 mb-2 tracking-widest">遊戲內預覽</p>
      <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #0f172a, #1e293b)", border: `2px solid ${rarityColor}40` }}>
        <div className="px-4 pt-3 pb-2 flex items-center justify-between" style={{ borderBottom: `1px solid ${rarityColor}20` }}>
          <span className="text-sm font-bold" style={{ color: rarityColor }}>{data.name || "未命名道具"}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${rarityColor}20`, color: rarityColor }}>{rarityLabel}</span>
        </div>
        <div className="h-20 flex items-center justify-center" style={{ background: `${rarityColor}08` }}>
          {data.imageUrl ? (
            <img src={data.imageUrl} alt="" className="h-16 w-16 object-contain" />
          ) : (
            <span className="text-3xl opacity-30">📦</span>
          )}
        </div>
        <div className="px-3 py-2 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${wxColor}20`, color: wxColor }}>{wx}</span>
            {data.category && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{data.category}</span>}
          </div>
          {data.description && (
            <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">{data.description}</p>
          )}
          {(data.sellPrice ?? 0) > 0 && (
            <p className="text-[10px] text-amber-500">💰 售價 {data.sellPrice} 金</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 裝備預覽卡片 ───
export function EquipmentPreview({ data }: { data: { name?: string; wuxing?: string; slot?: string; tier?: string; quality?: string; hpBonus?: number; attackBonus?: number; defenseBonus?: number; speedBonus?: number; specialEffect?: string; imageUrl?: string } }) {
  const wx = data.wuxing ?? "木";
  const wxColor = WX_COLOR[wx] ?? "#94a3b8";
  const tier = data.tier ?? "初階";
  const tierColor = TIER_COLOR[tier] ?? "#94a3b8";
  const SLOT_LABEL: Record<string, string> = {
    weapon: "武器", offhand: "副手", helmet: "頭盔", armor: "盔甲",
    gloves: "手套", shoes: "鞋子", ringA: "戒指A", ringB: "戒指B",
    necklace: "項鍊", amulet: "護符",
  };

  return (
    <div className="w-full max-w-[220px] mx-auto">
      <p className="text-[9px] text-center text-slate-600 mb-2 tracking-widest">遊戲內預覽</p>
      <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #0f172a, #1e293b)", border: `2px solid ${tierColor}40` }}>
        <div className="px-4 pt-3 pb-2" style={{ borderBottom: `1px solid ${tierColor}20` }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold truncate" style={{ color: tierColor }}>{data.name || "未命名裝備"}</span>
          </div>
          <div className="flex gap-1 mt-1">
            <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${tierColor}20`, color: tierColor }}>{tier}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${wxColor}20`, color: wxColor }}>{wx}</span>
            {data.slot && <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{SLOT_LABEL[data.slot] ?? data.slot}</span>}
            {data.quality && <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{data.quality}</span>}
          </div>
        </div>
        <div className="h-20 flex items-center justify-center" style={{ background: `${tierColor}08` }}>
          {data.imageUrl ? (
            <img src={data.imageUrl} alt="" className="h-16 w-16 object-contain" />
          ) : (
            <span className="text-3xl opacity-30">⚔️</span>
          )}
        </div>
        <div className="px-3 py-2 space-y-1">
          {[
            { label: "HP", val: data.hpBonus ?? 0, color: "#ef4444" },
            { label: "攻擊", val: data.attackBonus ?? 0, color: "#f59e0b" },
            { label: "防禦", val: data.defenseBonus ?? 0, color: "#3b82f6" },
            { label: "速度", val: data.speedBonus ?? 0, color: "#22c55e" },
          ].filter(s => s.val !== 0).map(s => (
            <div key={s.label} className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500">{s.label}</span>
              <span className="text-[10px] font-bold" style={{ color: s.color }}>+{s.val}</span>
            </div>
          ))}
          {data.specialEffect && (
            <div className="mt-1 px-2 py-1 rounded-lg" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.15)" }}>
              <p className="text-[9px]" style={{ color: "#fbbf24" }}>✨ {data.specialEffect}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 技能預覽卡片 ───
export function SkillPreview({ data }: { data: { name?: string; wuxing?: string; category?: string; basePower?: number; mpCost?: number; description?: string; cooldown?: number } }) {
  const wx = data.wuxing ?? "木";
  const wxColor = WX_COLOR[wx] ?? "#94a3b8";
  const CAT_LABEL: Record<string, string> = { active: "主動", passive: "被動", ultimate: "奧義" };
  const CAT_COLOR: Record<string, string> = { active: "#ef4444", passive: "#3b82f6", ultimate: "#f59e0b" };
  const cat = data.category ?? "active";
  const catColor = CAT_COLOR[cat] ?? "#94a3b8";

  return (
    <div className="w-full max-w-[220px] mx-auto">
      <p className="text-[9px] text-center text-slate-600 mb-2 tracking-widest">遊戲內預覽</p>
      <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #0f172a, #1e293b)", border: `2px solid ${catColor}40` }}>
        <div className="px-4 pt-3 pb-2 flex items-center justify-between" style={{ borderBottom: `1px solid ${catColor}20` }}>
          <span className="text-sm font-bold" style={{ color: catColor }}>{data.name || "未命名技能"}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${catColor}20`, color: catColor }}>{CAT_LABEL[cat] ?? cat}</span>
        </div>
        <div className="px-3 py-3 space-y-2">
          <div className="flex gap-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${wxColor}20`, color: wxColor }}>{wx}</span>
          </div>
          {data.description && (
            <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-3">{data.description}</p>
          )}
          <div className="grid grid-cols-3 gap-1">
            {(data.basePower ?? 0) > 0 && (
              <div className="text-center px-1 py-1 rounded-lg" style={{ background: "rgba(239,68,68,0.08)" }}>
                <p className="text-[8px] text-slate-600">威力</p>
                <p className="text-xs font-bold text-red-400">{data.basePower}</p>
              </div>
            )}
            {(data.mpCost ?? 0) > 0 && (
              <div className="text-center px-1 py-1 rounded-lg" style={{ background: "rgba(59,130,246,0.08)" }}>
                <p className="text-[8px] text-slate-600">MP</p>
                <p className="text-xs font-bold text-blue-400">{data.mpCost}</p>
              </div>
            )}
            {(data.cooldown ?? 0) > 0 && (
              <div className="text-center px-1 py-1 rounded-lg" style={{ background: "rgba(148,163,184,0.08)" }}>
                <p className="text-[8px] text-slate-600">CD</p>
                <p className="text-xs font-bold text-slate-400">{data.cooldown}s</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 成就預覽卡片 ───
export function AchievementPreview({ data }: { data: { name?: string; description?: string; category?: string; tier?: string; rewardGold?: number; rewardExp?: number; iconUrl?: string } }) {
  const TIER_ACH_COLOR: Record<string, string> = { gold: "#f59e0b", silver: "#94a3b8", bronze: "#cd7f32", platinum: "#e5e7eb" };
  const TIER_ACH_LABEL: Record<string, string> = { gold: "金", silver: "銀", bronze: "銅", platinum: "白金" };
  const tier = data.tier ?? "bronze";
  const tierColor = TIER_ACH_COLOR[tier] ?? "#94a3b8";

  return (
    <div className="w-full max-w-[220px] mx-auto">
      <p className="text-[9px] text-center text-slate-600 mb-2 tracking-widest">遊戲內預覽</p>
      <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #0f172a, #1e293b)", border: `2px solid ${tierColor}40` }}>
        <div className="px-4 pt-3 pb-2 flex items-center gap-2" style={{ borderBottom: `1px solid ${tierColor}20` }}>
          <span className="text-2xl">{data.iconUrl ? "🏆" : "🏅"}</span>
          <div>
            <span className="text-sm font-bold" style={{ color: tierColor }}>{data.name || "未命名成就"}</span>
            <div className="flex gap-1 mt-0.5">
              <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${tierColor}20`, color: tierColor }}>{TIER_ACH_LABEL[tier] ?? tier}</span>
              {data.category && <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{data.category}</span>}
            </div>
          </div>
        </div>
        <div className="px-3 py-2 space-y-1.5">
          {data.description && (
            <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">{data.description}</p>
          )}
          <div className="flex gap-2">
            {(data.rewardGold ?? 0) > 0 && <span className="text-[10px] text-amber-500">💰 {data.rewardGold} 金</span>}
            {(data.rewardExp ?? 0) > 0 && <span className="text-[10px] text-emerald-500">✨ {data.rewardExp} 經驗</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
