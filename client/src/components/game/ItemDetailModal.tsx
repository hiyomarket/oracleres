/**
 * ItemDetailModal.tsx
 * 商店商品詳情彈窗 — 點擊商品卡片後顯示完整數值和能力資訊
 * 使用公開的 gameWorld.getItemDetail API
 */
import React from "react";
import { trpc } from "@/lib/trpc";
import { X, Swords, Shield, Heart, Zap, Sparkles, Package, BookOpen } from "lucide-react";

// ─── 五行配色 ─────────────────────────────────────────────
const WUXING_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  "木": { color: "#4ade80", bg: "rgba(74,222,128,0.1)", label: "木" },
  "火": { color: "#f87171", bg: "rgba(248,113,113,0.1)", label: "火" },
  "土": { color: "#fbbf24", bg: "rgba(251,191,36,0.1)", label: "土" },
  "金": { color: "#e2e8f0", bg: "rgba(226,232,240,0.1)", label: "金" },
  "水": { color: "#38bdf8", bg: "rgba(56,189,248,0.1)", label: "水" },
  "wood": { color: "#4ade80", bg: "rgba(74,222,128,0.1)", label: "木" },
  "fire": { color: "#f87171", bg: "rgba(248,113,113,0.1)", label: "火" },
  "earth": { color: "#fbbf24", bg: "rgba(251,191,36,0.1)", label: "土" },
  "metal": { color: "#e2e8f0", bg: "rgba(226,232,240,0.1)", label: "金" },
  "water": { color: "#38bdf8", bg: "rgba(56,189,248,0.1)", label: "水" },
};

const RARITY_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  common:    { color: "#94a3b8", bg: "rgba(148,163,184,0.1)", label: "普通" },
  rare:      { color: "#60a5fa", bg: "rgba(96,165,250,0.15)", label: "稀有" },
  epic:      { color: "#a78bfa", bg: "rgba(167,139,250,0.15)", label: "史詩" },
  legendary: { color: "#fbbf24", bg: "rgba(251,191,36,0.15)", label: "傳說" },
};

const SLOT_LABEL: Record<string, string> = {
  weapon: "武器", helmet: "頭盔", armor: "鎧甲", shoes: "鞋子", accessory: "飾品", offhand: "副手",
};

const CATEGORY_LABEL: Record<string, string> = {
  material_basic: "基礎材料", material_drop: "掉落材料", consumable: "消耗品",
  quest: "任務道具", treasure: "寶物", skillbook: "技能書", equipment_material: "裝備材料",
  active_combat: "主動戰鬥", passive_combat: "被動戰鬥", life_gather: "生活採集", craft_forge: "鍛造製作",
};

const SKILL_TYPE_LABEL: Record<string, string> = {
  attack: "攻擊", heal: "治療", buff: "增益", debuff: "減益", passive: "被動", special: "特殊",
};

interface ItemDetailModalProps {
  itemKey: string;
  onClose: () => void;
}

const ItemDetailModal: React.FC<ItemDetailModalProps> = ({ itemKey, onClose }) => {
  const { data, isLoading } = trpc.gameWorld.getItemDetail.useQuery(
    { itemKey },
    { staleTime: 60000 }
  );

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 250,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          margin: "0 16px", width: "100%", maxWidth: "380px", maxHeight: "80vh",
          borderRadius: "16px", border: "1px solid rgba(255,255,255,0.12)",
          background: "linear-gradient(180deg, #0f1a2e 0%, #0a1220 100%)",
          overflow: "hidden", display: "flex", flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 頂部關閉按鈕 */}
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 12px 0" }}>
          <button
            onClick={onClose}
            style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#94a3b8" }}
          >
            <X size={14} />
          </button>
        </div>

        {/* 內容區域 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px" }}>
          {isLoading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>載入中...</div>
          ) : !data?.data ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <Package size={32} style={{ color: "#334155", margin: "0 auto 12px" }} />
              <p style={{ color: "#64748b", fontSize: "14px" }}>無法取得詳細資訊</p>
              <p style={{ color: "#475569", fontSize: "12px" }}>道具代碼：{itemKey}</p>
            </div>
          ) : data.type === "item" ? (
            <ItemDetail item={data.data} />
          ) : data.type === "equip" ? (
            <EquipDetail equip={data.data} />
          ) : data.type === "skill" ? (
            <SkillDetail skill={data.data} />
          ) : null}
        </div>
      </div>
    </div>
  );
};

// ─── 道具詳情 ─────────────────────────────────────────────
const ItemDetail: React.FC<{ item: any }> = ({ item }) => {
  const wuxing = WUXING_STYLE[item.wuxing] ?? WUXING_STYLE["木"];
  const rarity = RARITY_STYLE[item.rarity] ?? RARITY_STYLE.common;

  return (
    <>
      <div style={{ textAlign: "center", marginBottom: "16px" }}>
        <h3 style={{ fontSize: "18px", fontWeight: 700, color: rarity.color, margin: "0 0 8px" }}>
          {item.name}
        </h3>
        <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
          <TagBadge bg={wuxing.bg} color={wuxing.color} text={wuxing.label} />
          <TagBadge bg={rarity.bg} color={rarity.color} text={rarity.label} />
          <TagBadge bg="rgba(255,255,255,0.05)" color="#94a3b8" text={CATEGORY_LABEL[item.category] ?? item.category} />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
        <InfoRow label="道具代碼" value={item.itemId} />
        <InfoRow label="疊加上限" value={`${item.stackLimit ?? 99}`} />
        {item.shopPrice > 0 && <InfoRow label="商店售價" value={`🪙 ${item.shopPrice}`} highlight />}
      </div>

      {item.useEffect && (
        <DetailSection title="使用效果" icon={<Sparkles size={14} />}>
          <UseEffectDisplay useEffect={item.useEffect} />
        </DetailSection>
      )}

      {item.effect && (
        <DetailSection title="效果說明" icon={<BookOpen size={14} />}>
          <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0, lineHeight: 1.6 }}>{item.effect}</p>
        </DetailSection>
      )}

      {item.source && (
        <DetailSection title="獲取途徑" icon={<Package size={14} />}>
          <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>{item.source}</p>
        </DetailSection>
      )}

      {item.isMonsterDrop === 1 && (
        <DetailSection title="怪物掉落" icon={<Swords size={14} />}>
          <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
            掉落來源：{item.dropMonsterId || "未指定"} · 掉落率：{item.dropRate ?? 0}%
          </p>
        </DetailSection>
      )}
    </>
  );
};

// ─── 裝備詳情 ─────────────────────────────────────────────
const EquipDetail: React.FC<{ equip: any }> = ({ equip }) => {
  const wuxing = WUXING_STYLE[equip.wuxing] ?? WUXING_STYLE["木"];
  const rarity = RARITY_STYLE[equip.rarity] ?? RARITY_STYLE.common;
  const affixes = [equip.affix1, equip.affix2, equip.affix3, equip.affix4, equip.affix5].filter(Boolean);

  return (
    <>
      <div style={{ textAlign: "center", marginBottom: "16px" }}>
        <h3 style={{ fontSize: "18px", fontWeight: 700, color: rarity.color, margin: "0 0 8px" }}>
          {equip.name}
        </h3>
        <div style={{ display: "flex", justifyContent: "center", gap: "6px", flexWrap: "wrap" }}>
          <TagBadge bg={wuxing.bg} color={wuxing.color} text={wuxing.label} />
          <TagBadge bg={rarity.bg} color={rarity.color} text={rarity.label} />
          <TagBadge bg="rgba(255,255,255,0.05)" color="#94a3b8" text={SLOT_LABEL[equip.slot] ?? equip.slot} />
          <TagBadge bg="rgba(255,255,255,0.05)" color="#94a3b8" text={equip.tier} />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
        <InfoRow label="裝備代碼" value={equip.equipId} />
        <InfoRow label="等級需求" value={`Lv.${equip.levelRequired}`} />
        {equip.shopPrice > 0 && <InfoRow label="商店售價" value={`🪙 ${equip.shopPrice}`} highlight />}
      </div>

      <DetailSection title="數值加成" icon={<Swords size={14} />}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
          {equip.hpBonus > 0 && <StatCard icon={<Heart size={12} />} label="生命" value={`+${equip.hpBonus}`} color="#ef4444" />}
          {equip.attackBonus > 0 && <StatCard icon={<Swords size={12} />} label="攻擊" value={`+${equip.attackBonus}`} color="#f97316" />}
          {equip.defenseBonus > 0 && <StatCard icon={<Shield size={12} />} label="防禦" value={`+${equip.defenseBonus}`} color="#3b82f6" />}
          {equip.speedBonus > 0 && <StatCard icon={<Zap size={12} />} label="速度" value={`+${equip.speedBonus}`} color="#22c55e" />}
        </div>
        {equip.hpBonus === 0 && equip.attackBonus === 0 && equip.defenseBonus === 0 && equip.speedBonus === 0 && (
          <p style={{ fontSize: "12px", color: "#475569", margin: 0 }}>無基礎數值加成</p>
        )}
      </DetailSection>

      {equip.resistBonus && Object.values(equip.resistBonus as Record<string, number>).some(v => v > 0) && (
        <DetailSection title="五行抗性" icon={<Shield size={14} />}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {Object.entries(equip.resistBonus as Record<string, number>).filter(([, v]) => v > 0).map(([key, val]) => {
              const ws = WUXING_STYLE[key] ?? WUXING_STYLE["木"];
              return (
                <span key={key} style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "4px", background: ws.bg, color: ws.color, fontWeight: 600 }}>
                  {ws.label} +{val}%
                </span>
              );
            })}
          </div>
        </DetailSection>
      )}

      {affixes.length > 0 && (
        <DetailSection title="詞條效果" icon={<Sparkles size={14} />}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {affixes.map((affix: any, i: number) => (
              <div key={i} style={{ padding: "6px 10px", borderRadius: "6px", background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)" }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#a78bfa" }}>{affix.name}</div>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>{affix.description}</div>
              </div>
            ))}
          </div>
        </DetailSection>
      )}

      {equip.specialEffect && (
        <DetailSection title="特殊效果" icon={<Sparkles size={14} />}>
          <p style={{ fontSize: "12px", color: "#fbbf24", margin: 0, fontStyle: "italic" }}>{equip.specialEffect}</p>
        </DetailSection>
      )}
    </>
  );
};

// ─── 技能詳情 ─────────────────────────────────────────────
const SkillDetail: React.FC<{ skill: any }> = ({ skill }) => {
  const wuxing = WUXING_STYLE[skill.wuxing] ?? WUXING_STYLE["木"];
  const rarity = RARITY_STYLE[skill.rarity] ?? RARITY_STYLE.common;

  return (
    <>
      <div style={{ textAlign: "center", marginBottom: "16px" }}>
        <h3 style={{ fontSize: "18px", fontWeight: 700, color: rarity.color, margin: "0 0 8px" }}>
          {skill.name}
        </h3>
        <div style={{ display: "flex", justifyContent: "center", gap: "6px", flexWrap: "wrap" }}>
          <TagBadge bg={wuxing.bg} color={wuxing.color} text={wuxing.label} />
          <TagBadge bg={rarity.bg} color={rarity.color} text={rarity.label} />
          <TagBadge bg="rgba(255,255,255,0.05)" color="#94a3b8" text={SKILL_TYPE_LABEL[skill.skillType] ?? skill.skillType} />
          <TagBadge bg="rgba(255,255,255,0.05)" color="#94a3b8" text={skill.tier} />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
        <InfoRow label="技能代碼" value={skill.skillId} />
        <InfoRow label="習得等級" value={`Lv.${skill.learnLevel}`} />
        {skill.shopPrice > 0 && <InfoRow label="商店售價" value={`🪙 ${skill.shopPrice}`} highlight />}
      </div>

      <DetailSection title="戰鬥數值" icon={<Swords size={14} />}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
          <MiniStat label="威力" value={`${skill.powerPercent}%`} />
          <MiniStat label="MP 消耗" value={`${skill.mpCost}`} />
          <MiniStat label="冷卻" value={`${skill.cooldown} 回合`} />
        </div>
      </DetailSection>

      {skill.description && (
        <DetailSection title="效果說明" icon={<BookOpen size={14} />}>
          <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0, lineHeight: 1.6 }}>{skill.description}</p>
        </DetailSection>
      )}
    </>
  );
};

// ─── 使用效果顯示 ─────────────────────────────────────────────
const UseEffectDisplay: React.FC<{ useEffect: any }> = ({ useEffect: ue }) => {
  if (typeof ue === "string") return <p style={{ fontSize: "12px", color: "#e2e8f0", margin: 0 }}>{ue}</p>;
  return (
    <>
      {ue.description && <p style={{ fontSize: "12px", color: "#e2e8f0", margin: "0 0 6px" }}>{ue.description}</p>}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {ue.type && <MiniStat label="類型" value={ue.type} />}
        {ue.value && <MiniStat label="數值" value={`${ue.value}`} />}
        {ue.duration && <MiniStat label="持續" value={`${ue.duration} 回合`} />}
      </div>
    </>
  );
};

// ─── 共用小組件 ─────────────────────────────────────────────
const TagBadge: React.FC<{ bg: string; color: string; text: string }> = ({ bg, color, text }) => (
  <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "4px", background: bg, color, border: `1px solid ${color}40`, fontWeight: 600 }}>
    {text}
  </span>
);

const InfoRow: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    <span style={{ fontSize: "12px", color: "#64748b" }}>{label}</span>
    <span style={{ fontSize: "12px", fontWeight: highlight ? 700 : 500, color: highlight ? "#fbbf24" : "#e2e8f0" }}>{value}</span>
  </div>
);

const DetailSection: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div style={{ marginBottom: "16px" }}>
    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
      <span style={{ color: "#64748b" }}>{icon}</span>
      <span style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8" }}>{title}</span>
    </div>
    {children}
  </div>
);

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; color: string }> = ({ icon, label, value, color }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 10px", borderRadius: "8px", background: `${color}10`, border: `1px solid ${color}30` }}>
    <span style={{ color }}>{icon}</span>
    <span style={{ fontSize: "11px", color: "#94a3b8" }}>{label}</span>
    <span style={{ fontSize: "12px", fontWeight: 700, color, marginLeft: "auto" }}>{value}</span>
  </div>
);

const MiniStat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ textAlign: "center", padding: "6px 4px", borderRadius: "6px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
    <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "2px" }}>{label}</div>
    <div style={{ fontSize: "13px", fontWeight: 700, color: "#e2e8f0" }}>{value}</div>
  </div>
);

export default ItemDetailModal;
