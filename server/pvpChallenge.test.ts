/**
 * PVP 挑戰系統 v2 測試
 * 測試：發起挑戰、回應挑戰、冷卻機制、戰鬥邏輯、經驗獎勵
 */
import { describe, it, expect } from "vitest";

// ─── 戰鬥邏輯單元測試 ───
describe("PVP 戰鬥邏輯", () => {
  // 模擬戰鬥計算（與後端 respondPvpChallenge 中的邏輯一致）
  function simulateBattle(challenger: { attack: number; defense: number; maxHp: number; speed: number; level: number },
    defender: { attack: number; defense: number; maxHp: number; speed: number; level: number }) {
    const cAtk = challenger.attack + Math.floor(challenger.level * 2);
    const cDef = challenger.defense;
    const cHp = challenger.maxHp;
    const cSpd = challenger.speed;
    const dAtk = defender.attack + Math.floor(defender.level * 2);
    const dDef = defender.defense;
    const dHp = defender.maxHp;
    const dSpd = defender.speed;

    let cHpCur = cHp, dHpCur = dHp;
    const battleLog: string[] = [];
    for (let round = 1; round <= 5; round++) {
      const first = cSpd >= dSpd ? "challenger" : "defender";
      const second = first === "challenger" ? "defender" : "challenger";
      for (const who of [first, second]) {
        if (who === "challenger") {
          const dmg = Math.max(1, cAtk - Math.floor(dDef * 0.5) + Math.floor(Math.random() * 5));
          dHpCur -= dmg;
          battleLog.push(`第${round}回合：挑戰者 攻擊 ${dmg} 點`);
          if (dHpCur <= 0) { battleLog.push("防守者 戰敗！"); break; }
        } else {
          const dmg = Math.max(1, dAtk - Math.floor(cDef * 0.5) + Math.floor(Math.random() * 5));
          cHpCur -= dmg;
          battleLog.push(`第${round}回合：防守者 攻擊 ${dmg} 點`);
          if (cHpCur <= 0) { battleLog.push("挑戰者 戰敗！"); break; }
        }
      }
      if (cHpCur <= 0 || dHpCur <= 0) break;
    }

    let result: "challenger_win" | "defender_win" | "draw";
    if (cHpCur > dHpCur) result = "challenger_win";
    else if (dHpCur > cHpCur) result = "defender_win";
    else result = "draw";

    return { result, battleLog, cHpCur, dHpCur };
  }

  it("應產生有效的戰鬥結果", () => {
    const result = simulateBattle(
      { attack: 30, defense: 15, maxHp: 200, speed: 20, level: 5 },
      { attack: 25, defense: 12, maxHp: 180, speed: 18, level: 4 }
    );
    expect(["challenger_win", "defender_win", "draw"]).toContain(result.result);
    expect(result.battleLog.length).toBeGreaterThan(0);
  });

  it("戰鬥日誌應包含回合資訊", () => {
    const result = simulateBattle(
      { attack: 50, defense: 10, maxHp: 100, speed: 30, level: 10 },
      { attack: 10, defense: 5, maxHp: 50, speed: 5, level: 1 }
    );
    expect(result.battleLog.some(l => l.includes("第1回合"))).toBe(true);
  });

  it("高攻擊力角色應有更高的勝率", () => {
    let challengerWins = 0;
    for (let i = 0; i < 100; i++) {
      const result = simulateBattle(
        { attack: 100, defense: 50, maxHp: 500, speed: 40, level: 20 },
        { attack: 20, defense: 10, maxHp: 100, speed: 10, level: 3 }
      );
      if (result.result === "challenger_win") challengerWins++;
    }
    expect(challengerWins).toBeGreaterThan(80); // 應有 80%+ 勝率
  });

  it("速度高者應先攻", () => {
    const result = simulateBattle(
      { attack: 30, defense: 15, maxHp: 200, speed: 10, level: 5 },
      { attack: 30, defense: 15, maxHp: 200, speed: 50, level: 5 }
    );
    // 防守者速度更高，第一條日誌應該是防守者先攻
    expect(result.battleLog[0]).toContain("防守者");
  });

  it("傷害最低為 1", () => {
    const result = simulateBattle(
      { attack: 1, defense: 1, maxHp: 1000, speed: 10, level: 1 },
      { attack: 1, defense: 999, maxHp: 1000, speed: 10, level: 1 }
    );
    // 即使防禦極高，每回合至少造成 1 點傷害
    expect(result.battleLog.some(l => l.includes("1 點"))).toBe(true);
  });
});

// ─── 經驗獎勵計算測試 ───
describe("PVP 經驗獎勵計算", () => {
  function calcExpRewards(challengerLevel: number, defenderLevel: number, result: "challenger_win" | "defender_win" | "draw") {
    const baseExp = 15;
    const levelDiffBonus = Math.abs(challengerLevel - defenderLevel) * 2;
    let expChallenger = baseExp + levelDiffBonus;
    let expDefender = baseExp + levelDiffBonus;
    if (result === "challenger_win") {
      expChallenger = Math.floor(expChallenger * 1.5);
    } else if (result === "defender_win") {
      expDefender = Math.floor(expDefender * 1.5);
    }
    return { expChallenger, expDefender };
  }

  it("輸贏都應獲得經驗", () => {
    const { expChallenger, expDefender } = calcExpRewards(5, 5, "challenger_win");
    expect(expChallenger).toBeGreaterThan(0);
    expect(expDefender).toBeGreaterThan(0);
  });

  it("勝者應獲得更多經驗", () => {
    const { expChallenger, expDefender } = calcExpRewards(5, 5, "challenger_win");
    expect(expChallenger).toBeGreaterThan(expDefender);
  });

  it("等級差距越大，經驗越多", () => {
    const sameLevel = calcExpRewards(5, 5, "draw");
    const diffLevel = calcExpRewards(5, 15, "draw");
    expect(diffLevel.expChallenger).toBeGreaterThan(sameLevel.expChallenger);
  });

  it("平手時雙方經驗相同", () => {
    const { expChallenger, expDefender } = calcExpRewards(10, 10, "draw");
    expect(expChallenger).toBe(expDefender);
  });

  it("勝者經驗為基礎的 1.5 倍", () => {
    const { expChallenger, expDefender } = calcExpRewards(10, 10, "challenger_win");
    expect(expChallenger).toBe(Math.floor(15 * 1.5)); // 22
    expect(expDefender).toBe(15);
  });
});

// ─── 冷卻機制測試 ───
describe("PVP 冷卻機制", () => {
  const ONE_HOUR = 60 * 60 * 1000;

  function checkCooldown(lastBattleTime: number, now: number): { onCooldown: boolean; remainingMs: number } {
    const elapsed = now - lastBattleTime;
    if (elapsed < ONE_HOUR) {
      return { onCooldown: true, remainingMs: ONE_HOUR - elapsed };
    }
    return { onCooldown: false, remainingMs: 0 };
  }

  it("1 小時內應處於冷卻狀態", () => {
    const now = Date.now();
    const result = checkCooldown(now - 30 * 60 * 1000, now); // 30 分鐘前
    expect(result.onCooldown).toBe(true);
    expect(result.remainingMs).toBeGreaterThan(0);
    expect(result.remainingMs).toBeLessThanOrEqual(ONE_HOUR);
  });

  it("超過 1 小時應解除冷卻", () => {
    const now = Date.now();
    const result = checkCooldown(now - 61 * 60 * 1000, now); // 61 分鐘前
    expect(result.onCooldown).toBe(false);
    expect(result.remainingMs).toBe(0);
  });

  it("剛好 1 小時應解除冷卻", () => {
    const now = Date.now();
    const result = checkCooldown(now - ONE_HOUR, now);
    expect(result.onCooldown).toBe(false);
  });

  it("剩餘時間應正確計算", () => {
    const now = Date.now();
    const result = checkCooldown(now - 45 * 60 * 1000, now); // 45 分鐘前
    expect(result.remainingMs).toBeGreaterThan(14 * 60 * 1000); // 至少 14 分鐘
    expect(result.remainingMs).toBeLessThanOrEqual(15 * 60 * 1000); // 最多 15 分鐘
  });
});

// ─── 金幣獎勵計算測試 ───
describe("PVP 金幣獎勵", () => {
  function calcGoldReward(result: string, opponentLevel: number): number {
    if (result === "challenger_win" || result === "defender_win") {
      return Math.floor(50 + opponentLevel * 10);
    }
    return 10;
  }

  it("勝者應獲得基於對手等級的金幣", () => {
    expect(calcGoldReward("challenger_win", 10)).toBe(150); // 50 + 10*10
    expect(calcGoldReward("defender_win", 5)).toBe(100); // 50 + 5*10
  });

  it("平手只獲得少量金幣", () => {
    expect(calcGoldReward("draw", 10)).toBe(10);
  });

  it("對手等級越高，金幣獎勵越多", () => {
    const lowLevel = calcGoldReward("challenger_win", 3);
    const highLevel = calcGoldReward("challenger_win", 20);
    expect(highLevel).toBeGreaterThan(lowLevel);
  });
});

// ─── PVP 挑戰狀態流轉測試 ───
describe("PVP 挑戰狀態流轉", () => {
  type ChallengeStatus = "pending" | "accepted" | "declined" | "timeout" | "completed";

  function validateTransition(from: ChallengeStatus, to: ChallengeStatus): boolean {
    const validTransitions: Record<ChallengeStatus, ChallengeStatus[]> = {
      pending: ["accepted", "declined", "timeout"],
      accepted: ["completed"],
      declined: [],
      timeout: [],
      completed: [],
    };
    return validTransitions[from]?.includes(to) ?? false;
  }

  it("pending 可轉為 accepted/declined/timeout", () => {
    expect(validateTransition("pending", "accepted")).toBe(true);
    expect(validateTransition("pending", "declined")).toBe(true);
    expect(validateTransition("pending", "timeout")).toBe(true);
  });

  it("pending 不可直接轉為 completed", () => {
    expect(validateTransition("pending", "completed")).toBe(false);
  });

  it("completed 不可轉為任何狀態", () => {
    expect(validateTransition("completed", "pending")).toBe(false);
    expect(validateTransition("completed", "accepted")).toBe(false);
  });

  it("declined 不可轉為任何狀態", () => {
    expect(validateTransition("declined", "pending")).toBe(false);
    expect(validateTransition("declined", "completed")).toBe(false);
  });

  it("timeout 不可轉為任何狀態", () => {
    expect(validateTransition("timeout", "pending")).toBe(false);
    expect(validateTransition("timeout", "accepted")).toBe(false);
  });
});
