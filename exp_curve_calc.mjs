// GD-028 targets:
// Lv.1→10 cumulative: ~1,000 exp
// Lv.90→99 cumulative: ~5,000,000 exp

// The single power approach with p=2.89 gives:
// base=0.5: Lv1-10=1202, Lv90-99=2,595,811 (90-99 too low)
// base=1.0: Lv1-10=2410, Lv90-99=5,191,629 (1-10 too high)

// Solution: Use a smooth formula with variable exponent that increases with level
// expToNext(lv) = floor(A * lv^(B + C*ln(lv)))
// This gives gentle growth at low levels and steep growth at high levels

function sumRange(start, end, fn) {
  let sum = 0;
  for (let i = start; i <= end; i++) sum += fn(i);
  return sum;
}

console.log("=== Variable exponent: A * lv^(B + C*ln(lv)) ===");
let best = null;
let bestDist = Infinity;

for (let A = 1; A <= 30; A += 1) {
  for (let B = 1.0; B <= 2.5; B += 0.05) {
    for (let C = 0.1; C <= 1.0; C += 0.05) {
      const fn = (lv) => Math.floor(A * Math.pow(lv, B + C * Math.log(lv)));
      const s1 = sumRange(1, 10, fn);
      const s9 = sumRange(90, 99, fn);
      
      const dist = Math.abs(s1 - 1000) / 1000 + Math.abs(s9 - 5000000) / 5000000;
      if (dist < bestDist) {
        bestDist = dist;
        best = { A, B, C, s1, s9, dist };
      }
    }
  }
}

console.log("Best:", best);
const { A: AA, B: BB, C: CC } = best;
const fn = (lv) => Math.floor(AA * Math.pow(lv, BB + CC * Math.log(lv)));
console.log("\nDetailed curve:");
for (const lv of [1, 2, 3, 5, 10, 15, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99]) {
  console.log(`  Lv.${lv}: ${fn(lv)} exp`);
}
for (const m of [10, 20, 30, 50, 70, 90, 99]) {
  console.log(`  Cumulative 1→${m}: ${sumRange(1, m, fn)}`);
}

// Also try the simplest approach: just use the right base with power 2.89
// but add a minimum floor for low levels
console.log("\n=== Simple: max(minExp, floor(0.5 * lv^2.89)) ===");
for (let minExp of [10, 15, 20, 25, 30]) {
  const fn2 = (lv) => Math.max(minExp, Math.floor(0.5 * Math.pow(lv, 2.89)));
  const s1 = sumRange(1, 10, fn2);
  const s9 = sumRange(90, 99, fn2);
  console.log(`minExp=${minExp}: Lv1-10=${s1}, Lv90-99=${s9}`);
  if (minExp === 20) {
    for (const lv of [1, 2, 3, 5, 10, 20, 30, 50, 70, 90, 99]) {
      console.log(`  Lv.${lv}: ${fn2(lv)} exp`);
    }
  }
}
