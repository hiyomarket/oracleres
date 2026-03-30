/**
 * battle/BattleAnimations.tsx — 戰鬥動畫層（粒子、閃光、飄字、技能宣告等）
 */
import React from "react";
import { WX_THEME } from "./types";

// ─── 粒子背景 ───
export function ParticleBackground({ particles }: {
  particles: Array<{ id: number; x: number; y: number; size: number; duration: number; delay: number; opacity: number }>;
}) {
  return (
    <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
      {particles.map(p => (
        <div key={p.id} className="absolute rounded-full"
          style={{
            left: `${p.x}%`, top: `${p.y}%`,
            width: `${p.size}px`, height: `${p.size}px`,
            background: `radial-gradient(circle, rgba(139,92,246,${p.opacity}) 0%, transparent 70%)`,
            animation: `particleFloat ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
          }} />
      ))}
    </div>
  );
}

// ─── 全螢幕視覺特效 ───
export function ScreenFlash({ color }: { color: string | null }) {
  if (!color) return null;
  // 判斷特效類型
  const isCrit = color.includes("251,191,36"); // 金色 = 爆擊
  const isBlock = color.includes("96,165,250"); // 藍色 = 格檔
  const isDodge = color.includes("148,163,184"); // 灰色 = 閃避
  return (
    <>
      {/* 基礎閃光 */}
      <div className="fixed inset-0 pointer-events-none z-[203] animate-screenFlash"
        style={{ background: color }} />
      {/* 爆擊：金色徑向爆裂 + 邊緣光暈 */}
      {isCrit && (
        <>
          <div className="fixed inset-0 pointer-events-none z-[203]"
            style={{
              background: "radial-gradient(circle at 50% 40%, rgba(251,191,36,0.3) 0%, rgba(251,191,36,0.1) 30%, transparent 60%)",
              animation: "critBurst 0.6s ease-out forwards",
            }} />
          <div className="fixed inset-0 pointer-events-none z-[203]"
            style={{
              boxShadow: "inset 0 0 80px rgba(251,191,36,0.4), inset 0 0 160px rgba(245,158,11,0.15)",
              animation: "screenFlash 0.5s ease-out forwards",
            }} />
        </>
      )}
      {/* 格檔：藍色盾牌波紋擴散 */}
      {isBlock && (
        <div className="fixed inset-0 pointer-events-none z-[203] flex items-center justify-center">
          <div style={{
            width: "200px", height: "200px", borderRadius: "50%",
            border: "3px solid rgba(96,165,250,0.6)",
            boxShadow: "0 0 40px rgba(96,165,250,0.3), inset 0 0 30px rgba(96,165,250,0.1)",
            animation: "blockRipple 0.8s ease-out forwards",
          }} />
        </div>
      )}
      {/* 閃避：橫向速度線 */}
      {isDodge && (
        <div className="fixed inset-0 pointer-events-none z-[203] overflow-hidden">
          {[0, 1, 2].map(i => (
            <div key={i} className="absolute" style={{
              left: "-10%", right: "-10%",
              top: `${35 + i * 10}%`,
              height: "2px",
              background: "linear-gradient(90deg, transparent, rgba(148,163,184,0.4), rgba(148,163,184,0.6), rgba(148,163,184,0.4), transparent)",
              animation: `dodgeLine 0.5s ease-out ${i * 0.08}s forwards`,
            }} />
          ))}
        </div>
      )}
    </>
  );
}

// ─── Boss 掉落動畫 ───
export function DropAnimation({ show, drops }: { show: boolean; drops: string[] }) {
  if (!show || drops.length === 0) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-[210] flex items-center justify-center">
      <div className="text-center animate-fadeSlideIn">
        <div className="text-4xl mb-3 animate-bounce">🌟</div>
        <p className="text-lg font-black text-yellow-300 mb-3 tracking-widest"
          style={{ textShadow: "0 0 20px rgba(251,191,36,0.8), 0 0 40px rgba(251,191,36,0.4)" }}>
          掉落物品！
        </p>
        <div className="flex flex-col gap-2 items-center">
          {drops.slice(0, 6).map((drop, i) => (
            <div key={i}
              className="px-4 py-2 rounded-xl text-sm font-bold"
              style={{
                background: "linear-gradient(135deg, rgba(251,191,36,0.2) 0%, rgba(245,158,11,0.1) 100%)",
                border: "1px solid rgba(251,191,36,0.4)",
                color: "#fde68a",
                boxShadow: "0 0 12px rgba(251,191,36,0.2)",
                animation: `fadeSlideIn 0.4s ease-out ${i * 0.15}s both`,
              }}>
              ✨ {drop}
            </div>
          ))}
          {drops.length > 6 && (
            <p className="text-[10px] text-yellow-400/60">...+{drops.length - 6} 更多物品</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 技能名稱大字閃現 ───
export function SkillAnnounce({ skill }: { skill: { name: string; element?: string } | null }) {
  if (!skill) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-[204] flex items-center justify-center">
      <div className="animate-skillAnnounce text-center">
        <p className="text-4xl font-black tracking-widest"
          style={{
            color: skill.element ? (WX_THEME[skill.element]?.color ?? "#c4b5fd") : "#c4b5fd",
            textShadow: `0 0 30px ${skill.element ? (WX_THEME[skill.element]?.glow ?? "rgba(196,181,253,0.6)") : "rgba(196,181,253,0.6)"}, 0 0 60px rgba(139,92,246,0.3), 0 4px 8px rgba(0,0,0,0.8)`,
            WebkitTextStroke: "1px rgba(255,255,255,0.2)",
          }}>
          {skill.name}
        </p>
        {skill.element && (
          <p className="text-sm mt-1 font-bold" style={{ color: WX_THEME[skill.element]?.color }}>
            {WX_THEME[skill.element]?.icon} {WX_THEME[skill.element]?.name}屬性
          </p>
        )}
      </div>
    </div>
  );
}

// ─── 回合轉場 ───
export function RoundTransition({ show, round }: { show: boolean; round: number }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-[205] flex items-center justify-center animate-roundTransition">
      <div className="px-8 py-3 rounded-full" style={{
        background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.3), rgba(139,92,246,0.5), rgba(99,102,241,0.3), transparent)",
      }}>
        <p className="text-2xl font-black text-indigo-200 tracking-[0.3em]"
          style={{ textShadow: "0 0 20px rgba(99,102,241,0.8)" }}>
          ROUND {round}
        </p>
      </div>
    </div>
  );
}

// ─── 飄字動畫層 ───
export function FloatingTexts({ texts }: {
  texts: Array<{ id: number; text: string; color: string; x: string; y: string; size: string; isCrit?: boolean; type: string }>;
}) {
  return (
    <div className="fixed inset-0 pointer-events-none z-[206] overflow-hidden">
      {texts.map(ft => (
        <div key={ft.id}
          className={`absolute font-black ${ft.size}`}
          style={{
            left: ft.x, top: ft.y,
            color: ft.color,
            textShadow: ft.isCrit
              ? `0 0 20px ${ft.color}, 0 0 40px ${ft.color}80, 0 0 60px ${ft.color}40, 0 4px 8px rgba(0,0,0,0.9)`
              : ft.type === "block"
              ? `0 0 16px ${ft.color}, 0 0 32px ${ft.color}60, 0 3px 6px rgba(0,0,0,0.9)`
              : ft.type === "dodge"
              ? `0 0 10px ${ft.color}60, 0 2px 4px rgba(0,0,0,0.8)`
              : `0 0 12px ${ft.color}80, 0 2px 6px rgba(0,0,0,0.9)`,
            animation: ft.isCrit ? "critFloatUp 2s ease-out forwards"
              : ft.type === "dodge" ? "dodgeSlide 1.5s ease-out forwards"
              : ft.type === "block" ? "blockPulse 1.8s ease-out forwards"
              : "floatUp 1.8s ease-out forwards",
          }}>
          {ft.text}
        </div>
      ))}
    </div>
  );
}

// ─── 戰鬥動畫 CSS ───
export function BattleStyles() {
  return (
    <style>{`
      @keyframes particleFloat {
        0%   { transform: translateY(0) translateX(0); opacity: 0.2; }
        50%  { opacity: 0.6; }
        100% { transform: translateY(-30px) translateX(15px); opacity: 0.1; }
      }
      @keyframes screenFlash {
        0%   { opacity: 1; }
        100% { opacity: 0; }
      }
      .animate-screenFlash { animation: screenFlash 0.4s ease-out forwards; }
      @keyframes battleShake {
        0%   { transform: translateX(0); }
        20%  { transform: translateX(-4px); }
        40%  { transform: translateX(4px); }
        60%  { transform: translateX(-3px); }
        80%  { transform: translateX(3px); }
        100% { transform: translateX(0); }
      }
      @keyframes battleShakeHard {
        0%   { transform: translateX(0) rotate(0); }
        15%  { transform: translateX(-8px) rotate(-0.5deg); }
        30%  { transform: translateX(8px) rotate(0.5deg); }
        45%  { transform: translateX(-6px) rotate(-0.3deg); }
        60%  { transform: translateX(6px) rotate(0.3deg); }
        75%  { transform: translateX(-3px); }
        100% { transform: translateX(0) rotate(0); }
      }
      @keyframes floatUp {
        0%   { opacity: 0; transform: translateY(0) scale(0.5); }
        15%  { opacity: 1; transform: translateY(-10px) scale(1.15); }
        30%  { transform: translateY(-20px) scale(1); }
        100% { opacity: 0; transform: translateY(-70px) scale(0.7); }
      }
      @keyframes critFloatUp {
        0%   { opacity: 0; transform: translateY(0) scale(0.3); }
        10%  { opacity: 1; transform: translateY(-5px) scale(1.5); }
        20%  { transform: translateY(-15px) scale(1.2); }
        40%  { transform: translateY(-25px) scale(1.1); }
        100% { opacity: 0; transform: translateY(-80px) scale(0.6); }
      }
      @keyframes skillAnnounce {
        0%   { opacity: 0; transform: scale(2) translateY(10px); filter: blur(8px); }
        20%  { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
        70%  { opacity: 1; transform: scale(1.05); }
        100% { opacity: 0; transform: scale(0.9) translateY(-10px); filter: blur(4px); }
      }
      .animate-skillAnnounce { animation: skillAnnounce 1.5s ease-out forwards; }
      @keyframes roundTransition {
        0%   { opacity: 0; transform: scaleX(0); }
        30%  { opacity: 1; transform: scaleX(1.1); }
        50%  { transform: scaleX(1); }
        80%  { opacity: 1; }
        100% { opacity: 0; transform: scaleX(0.8); }
      }
      .animate-roundTransition { animation: roundTransition 0.8s ease-out forwards; }
      @keyframes attackLunge {
        0%   { transform: translateX(0); }
        40%  { transform: translateX(12px); }
        100% { transform: translateX(0); }
      }
      @keyframes attackLungeLeft {
        0%   { transform: translateX(0); }
        40%  { transform: translateX(-12px); }
        100% { transform: translateX(0); }
      }
      @keyframes hitFlash {
        0%   { filter: brightness(1); }
        30%  { filter: brightness(2.5) saturate(0); }
        100% { filter: brightness(1); }
      }
      @keyframes shimmer {
        0%   { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      @keyframes breathe {
        0%, 100% { transform: scale(1); }
        50%       { transform: scale(1.01); }
      }
      @keyframes fadeSlideIn {
        0%   { opacity: 0; transform: translateY(4px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      .animate-fadeSlideIn { animation: fadeSlideIn 0.3s ease-out forwards; }
      @keyframes victoryGlow {
        0%   { opacity: 0; transform: scale(0.8); }
        100% { opacity: 1; transform: scale(1); }
      }
      @keyframes hpShimmer {
        0%   { left: -100%; }
        100% { left: 200%; }
      }
      @keyframes defeatDarken {
        0%   { opacity: 0; }
        100% { opacity: 1; }
      }
      @keyframes dodgeSlide {
        0%   { opacity: 0; transform: translateY(0) translateX(-20px) scale(0.8); }
        20%  { opacity: 1; transform: translateY(-5px) translateX(0) scale(1.3); }
        50%  { transform: translateY(-15px) scale(1.1); }
        100% { opacity: 0; transform: translateY(-50px) scale(0.7); }
      }
      @keyframes blockPulse {
        0%   { opacity: 0; transform: translateY(0) scale(0.5); }
        15%  { opacity: 1; transform: translateY(-5px) scale(1.4); }
        30%  { transform: translateY(-10px) scale(1.1); filter: brightness(1.5); }
        50%  { transform: translateY(-20px) scale(1); }
        100% { opacity: 0; transform: translateY(-60px) scale(0.6); }
      }
      @keyframes critBurst {
        0%   { opacity: 0; transform: scale(0.5); }
        30%  { opacity: 1; transform: scale(1); }
        100% { opacity: 0; transform: scale(2); }
      }
      @keyframes blockRipple {
        0%   { opacity: 1; transform: scale(0.3); }
        50%  { opacity: 0.6; transform: scale(1.5); }
        100% { opacity: 0; transform: scale(3); }
      }
      @keyframes dodgeLine {
        0%   { opacity: 0; transform: translateX(-100%); }
        30%  { opacity: 1; }
        100% { opacity: 0; transform: translateX(100%); }
      }
      @keyframes battleShakeHeavy {
        0%   { transform: translateX(0) rotate(0); }
        10%  { transform: translateX(-12px) rotate(-1deg); }
        20%  { transform: translateX(12px) rotate(1deg); }
        30%  { transform: translateX(-10px) rotate(-0.8deg); }
        40%  { transform: translateX(10px) rotate(0.8deg); }
        50%  { transform: translateX(-6px) rotate(-0.4deg); }
        60%  { transform: translateX(6px) rotate(0.4deg); }
        75%  { transform: translateX(-3px); }
        100% { transform: translateX(0) rotate(0); }
      }
    `}</style>
  );
}
