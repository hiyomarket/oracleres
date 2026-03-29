/**
 * NpcDialogueModal — NPC 對話 + 技能學習介面
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { QUALITY_COLOR, QUALITY_ZH, WX_EMOJI, WX_ZH } from "@/pages/game/virtualworld/constants";

interface NpcDialogueModalProps {
  npcId: number;
  onClose: () => void;
}

export function NpcDialogueModal({ npcId, onClose }: NpcDialogueModalProps) {
  const { data, isLoading, refetch } = trpc.world.getNpcDetail.useQuery({ npcId });
  const learnMutation = trpc.world.learnSkillFromNpc.useMutation({
    onSuccess: () => { refetch(); },
  });
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [dialogueStep, setDialogueStep] = useState<"greeting" | "skills" | "learning">("greeting");

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
        <div className="animate-pulse text-slate-400 text-sm">正在與 NPC 建立連結…</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
        <div className="text-red-400 text-sm">無法找到此 NPC</div>
      </div>
    );
  }

  const { npc, greeting, teachableSkills, agentLevel, agentGold } = data;
  const selected = teachableSkills.find(s => s.skillId === selectedSkill);

  const handleLearn = async () => {
    if (!selectedSkill) return;
    setDialogueStep("learning");
    try {
      await learnMutation.mutateAsync({ npcId, skillId: selectedSkill });
      setSelectedSkill(null);
      setDialogueStep("skills");
    } catch {
      setDialogueStep("skills");
    }
  };

  const renderCost = (cost: { gold?: number; stones?: number; reputation?: number; items?: Array<{ itemId: string; qty: number }> }) => {
    const parts: string[] = [];
    if (cost.gold) parts.push(`💰 ${cost.gold}`);
    if (cost.stones) parts.push(`💎 ${cost.stones}`);
    if (cost.reputation) parts.push(`⭐ ${cost.reputation}`);
    if (cost.items?.length) parts.push(`📦 ${cost.items.length} 道具`);
    return parts.length > 0 ? parts.join("  ") : "免費";
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-[95vw] max-w-lg max-h-[85vh] overflow-hidden rounded-2xl border"
        style={{
          background: "linear-gradient(180deg, #0a0f1a 0%, #0d1520 100%)",
          borderColor: "rgba(255,255,255,0.08)",
          boxShadow: "0 0 60px rgba(0,0,0,0.8), 0 0 20px rgba(100,150,255,0.1)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* 頂部 NPC 資訊 */}
        <div className="px-5 pt-5 pb-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shrink-0"
              style={{ background: "rgba(100,150,255,0.12)", border: "2px solid rgba(100,150,255,0.3)" }}>
              {npc.avatarUrl ? <img src={npc.avatarUrl} className="w-full h-full rounded-full object-cover" /> : "👤"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white">{npc.name}</span>
                {npc.title && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(168,85,247,0.15)", color: "#a78bfa" }}>「{npc.title}」</span>}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{npc.region} · {npc.location}</div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors text-lg">✕</button>
          </div>
        </div>

        {/* 對話區域 */}
        <div className="overflow-y-auto" style={{ maxHeight: "calc(85vh - 100px)" }}>
          {/* 對話氣泡 */}
          <div className="px-5 py-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 mt-1"
                style={{ background: "rgba(100,150,255,0.12)", border: "1.5px solid rgba(100,150,255,0.3)" }}>
                {npc.avatarUrl ? <img src={npc.avatarUrl} className="w-full h-full rounded-full object-cover" /> : "👤"}
              </div>
              <div className="flex-1">
                <div className="text-xs text-slate-500 mb-1">{npc.name}</div>
                <div className="text-sm text-slate-300 leading-relaxed px-3 py-2.5 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  {dialogueStep === "greeting" ? greeting : dialogueStep === "learning" ? "讓我看看…嗯，你的資質不錯，仔細看好了…" : `我可以教你 ${teachableSkills.length} 種技能，看看有沒有你需要的。`}
                </div>
              </div>
            </div>
          </div>

          {/* 對話選項 */}
          {dialogueStep === "greeting" && (
            <div className="px-5 pb-3 flex flex-col gap-2">
              <button
                onClick={() => setDialogueStep("skills")}
                className="w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all hover:scale-[1.01]"
                style={{ background: "rgba(100,150,255,0.08)", border: "1px solid rgba(100,150,255,0.2)", color: "#93c5fd" }}
              >
                📖 我想學習技能
              </button>
              <button
                onClick={onClose}
                className="w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all hover:scale-[1.01]"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "#94a3b8" }}
              >
                👋 告辭
              </button>
            </div>
          )}

          {/* 技能列表 */}
          {dialogueStep === "skills" && (
            <div className="px-5 pb-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">可學習技能（{teachableSkills.length}）</span>
                <span className="text-xs text-slate-600">你的等級: Lv.{agentLevel} | 金幣: {agentGold}</span>
              </div>

              {teachableSkills.length === 0 && (
                <div className="text-center py-6 text-sm text-slate-600">此 NPC 目前沒有可教授的技能</div>
              )}

              <div className="space-y-2">
                {teachableSkills.map(skill => {
                  const rc = QUALITY_COLOR[skill.rarity ?? "common"] ?? "#94a3b8";
                  const rz = QUALITY_ZH[skill.rarity ?? "common"] ?? "普通";
                  const elEmoji = WX_EMOJI[skill.element ?? ""] ?? "✨";
                  const elZh = WX_ZH[skill.element ?? ""] ?? "";
                  const isSelected = selectedSkill === skill.skillId;
                  const canLearn = !skill.isLearned && (agentLevel >= (skill.prerequisiteLevel ?? 0));
                  const cost = skill.learnCost ?? {};

                  return (
                    <div key={skill.skillId}>
                      <button
                        onClick={() => setSelectedSkill(isSelected ? null : skill.skillId)}
                        className="w-full text-left px-3 py-2.5 rounded-xl transition-all"
                        style={{
                          background: isSelected ? `${rc}10` : skill.isLearned ? "rgba(34,197,94,0.05)" : "rgba(255,255,255,0.02)",
                          border: `1px solid ${isSelected ? `${rc}40` : skill.isLearned ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.06)"}`,
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{elEmoji}</span>
                          <span className="text-sm font-bold" style={{ color: rc }}>{skill.name}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: `${rc}15`, color: rc }}>{rz}</span>
                          {elZh && <span className="text-xs text-slate-500">{elZh}屬</span>}
                          {skill.isLearned && <span className="text-xs text-green-400 ml-auto">✓ 已習得</span>}
                          {!skill.isLearned && skill.prerequisiteLevel && agentLevel < skill.prerequisiteLevel && (
                            <span className="text-xs text-red-400 ml-auto">需 Lv.{skill.prerequisiteLevel}</span>
                          )}
                        </div>
                        {skill.description && <p className="text-xs text-slate-500 mt-1 ml-7">{skill.description}</p>}
                      </button>

                      {/* 展開的學習面板 */}
                      {isSelected && !skill.isLearned && (
                        <div className="mt-1 mx-2 px-3 py-3 rounded-lg" style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${rc}20` }}>
                          <div className="text-xs text-slate-400 mb-2">學習代價：</div>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {cost.gold > 0 && (
                              <span className="text-xs px-2 py-1 rounded-lg" style={{
                                background: agentGold >= cost.gold ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)",
                                color: agentGold >= cost.gold ? "#f59e0b" : "#ef4444",
                                border: `1px solid ${agentGold >= cost.gold ? "rgba(245,158,11,0.3)" : "rgba(239,68,68,0.3)"}`,
                              }}>💰 {cost.gold} 金幣</span>
                            )}
                            {cost.stones > 0 && (
                              <span className="text-xs px-2 py-1 rounded-lg" style={{ background: "rgba(168,85,247,0.1)", color: "#a78bfa", border: "1px solid rgba(168,85,247,0.3)" }}>
                                💎 {cost.stones} 靈晶
                              </span>
                            )}
                            {cost.reputation > 0 && (
                              <span className="text-xs px-2 py-1 rounded-lg" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}>
                                ⭐ {cost.reputation} 聲望
                              </span>
                            )}
                            {(cost.items ?? []).map((item: { itemId: string; qty: number }, i: number) => (
                              <span key={i} className="text-xs px-2 py-1 rounded-lg" style={{ background: "rgba(96,165,250,0.1)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.3)" }}>
                                📦 {item.itemId} x{item.qty}
                              </span>
                            ))}
                          </div>
                          <button
                            onClick={handleLearn}
                            disabled={!canLearn || learnMutation.isPending}
                            className="w-full py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-40"
                            style={{
                              background: canLearn ? `linear-gradient(135deg, ${rc}, ${rc}cc)` : "rgba(255,255,255,0.05)",
                              color: canLearn ? "#000" : "#64748b",
                            }}
                          >
                            {learnMutation.isPending ? "學習中…" : canLearn ? "✨ 拜師學藝" : "條件不足"}
                          </button>
                          {learnMutation.error && (
                            <div className="text-xs text-red-400 mt-2 text-center">{learnMutation.error.message}</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => setDialogueStep("greeting")}
                className="w-full text-center py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                ← 返回對話
              </button>
            </div>
          )}

          {/* 學習動畫 */}
          {dialogueStep === "learning" && (
            <div className="px-5 pb-5 text-center py-8">
              <div className="text-4xl mb-4 animate-bounce">✨</div>
              <div className="text-sm text-slate-400">正在傳授技能…</div>
            </div>
          )}

          {/* 學習成功提示 */}
          {learnMutation.isSuccess && (
            <div className="mx-5 mb-4 px-4 py-3 rounded-xl text-center"
              style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
              <div className="text-green-400 text-sm font-bold">🎉 成功習得技能「{learnMutation.data?.skillName}」！</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
