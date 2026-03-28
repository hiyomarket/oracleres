/**
 * ProfessionPanel — 職業選擇/轉職面板
 * 顯示所有可選職業及其加成，支援轉職操作
 */
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { PROFESSION_LABELS } from "./constants";

type ProfessionId = "none" | "hunter" | "mage" | "tank" | "thief" | "wizard";

const PROFESSION_BONUSES: Record<ProfessionId, { stats: string[]; desc: string }> = {
  none:   { stats: [], desc: "尚未選擇職業" },
  hunter: { stats: ["ATK +8%", "SPD +5%", "暴擊率 +3", "治癒力 +5%"], desc: "放置效率型，採集力和尋寶力加成" },
  mage:   { stats: ["MATK +15%", "MP +10%", "精神 +8%", "暴擊傷害 +10"], desc: "魔法攻擊型，元素傷害極強" },
  tank:   { stats: ["HP +15%", "DEF +12%", "MDEF +8%"], desc: "肉盾型，高 HP 高防禦" },
  thief:  { stats: ["暴擊率 +8", "暴擊傷害 +20", "SPD +10%", "ATK +5%"], desc: "暴擊型，高暴擊率和暴擊傷害" },
  wizard: { stats: ["治癒力 +15%", "精神 +12%", "MP +8%", "MDEF +5%"], desc: "輔助型，治癒力和精神力極強" },
};

const PROFESSIONS: ProfessionId[] = ["hunter", "mage", "tank", "thief", "wizard"];

export function ProfessionPanel({
  currentProfession,
  agentLevel,
  agentGold,
  onClose,
}: {
  currentProfession: string;
  agentLevel: number;
  agentGold: number;
  onClose: () => void;
}) {
  const [selectedProf, setSelectedProf] = useState<ProfessionId | null>(null);
  const [confirming, setConfirming] = useState(false);
  const utils = trpc.useUtils();

  const changeProfession = trpc.gameWorld.changeProfession.useMutation({
    onSuccess: (data) => {
      toast.success(data.message ?? "轉職成功！");
      utils.gameWorld.getOrCreateAgent.invalidate();
      onClose();
    },
    onError: (err) => {
      toast.error(err.message ?? "轉職失敗");
      setConfirming(false);
    },
  });

  const canChange = agentLevel >= 10;
  const minGold = 1000;

  const handleConfirm = () => {
    if (!selectedProf || selectedProf === currentProfession) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }
    changeProfession.mutate({ profession: selectedProf });
  };

  return (
    <div className="rounded-xl p-3 space-y-3" style={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(100,116,139,0.3)" }}>
      {/* 標題 */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
          <span>⚔️</span> 轉職系統
        </h3>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xs px-2 py-0.5 rounded"
          style={{ background: "rgba(100,116,139,0.15)" }}>
          收起
        </button>
      </div>

      {/* 條件提示 */}
      {!canChange && (
        <div className="text-xs text-amber-400 px-2 py-1.5 rounded" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
          需要等級 10 以上才能轉職（目前 Lv.{agentLevel}）
        </div>
      )}

      {/* 職業列表 */}
      <div className="grid grid-cols-1 gap-2">
        {PROFESSIONS.map((profId) => {
          const info = PROFESSION_LABELS[profId];
          const bonus = PROFESSION_BONUSES[profId];
          const isCurrent = currentProfession === profId;
          const isSelected = selectedProf === profId;
          
          return (
            <button
              key={profId}
              onClick={() => {
                if (!canChange || isCurrent) return;
                setSelectedProf(profId);
                setConfirming(false);
              }}
              disabled={!canChange || isCurrent}
              className="flex items-start gap-3 p-2.5 rounded-lg text-left transition-all"
              style={{
                background: isSelected
                  ? `${info.color}15`
                  : isCurrent
                    ? "rgba(34,197,94,0.08)"
                    : "rgba(30,41,59,0.6)",
                border: isSelected
                  ? `2px solid ${info.color}60`
                  : isCurrent
                    ? "2px solid rgba(34,197,94,0.3)"
                    : "1px solid rgba(100,116,139,0.15)",
                opacity: !canChange && !isCurrent ? 0.5 : 1,
              }}
            >
              <span className="text-2xl mt-0.5">{info.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold" style={{ color: info.color }}>{info.label}</span>
                  {isCurrent && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">
                      目前職業
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">{bonus.desc}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {bonus.stats.map((s, i) => (
                    <span key={i} className="text-[9px] px-1.5 py-0.5 rounded"
                      style={{ background: `${info.color}15`, color: info.color, border: `1px solid ${info.color}25` }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 轉職按鈕 */}
      {canChange && selectedProf && selectedProf !== currentProfession && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="text-slate-400">轉職費用</span>
            <span className={agentGold >= minGold ? "text-amber-400" : "text-red-400"}>
              💰 {minGold} 金幣 {agentGold < minGold && `（不足，目前 ${agentGold}）`}
            </span>
          </div>
          <button
            onClick={handleConfirm}
            disabled={agentGold < minGold || changeProfession.isPending}
            className="w-full py-2 rounded-lg text-sm font-bold transition-all"
            style={{
              background: confirming
                ? "rgba(239,68,68,0.3)"
                : `${PROFESSION_LABELS[selectedProf].color}25`,
              color: confirming ? "#ef4444" : PROFESSION_LABELS[selectedProf].color,
              border: confirming
                ? "1px solid rgba(239,68,68,0.4)"
                : `1px solid ${PROFESSION_LABELS[selectedProf].color}40`,
              opacity: agentGold < minGold ? 0.5 : 1,
            }}
          >
            {changeProfession.isPending
              ? "轉職中..."
              : confirming
                ? `確認轉職為 ${PROFESSION_LABELS[selectedProf].label}？（再點一次確認）`
                : `轉職為 ${PROFESSION_LABELS[selectedProf].label}`
            }
          </button>
        </div>
      )}
    </div>
  );
}
