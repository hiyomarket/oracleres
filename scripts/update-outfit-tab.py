#!/usr/bin/env python3
"""Replace the outfit tab in WarRoom.tsx with V9.0 wuxing-driven version."""

NEW_OUTFIT_TAB = '''          {activeTab === "outfit" && (
            <motion.div
              key="outfit"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* ── 五行加權總覽表 ── */}
              <SectionCard title="今日五行加權總覽" icon="⚖️">
                <div className="space-y-2">
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3 mb-3">
                    <p className="text-white/60 text-xs">
                      計算公式：<span className="text-amber-300 font-mono">今日加權 = 本命×30% + 環境×70%</span>
                    </p>
                    <p className="text-white/40 text-xs mt-1">
                      環境五行：{data.date.yearPillar}年 {data.date.monthPillar}月 {data.date.dayPillar}日（六字各佔1/6）
                    </p>
                  </div>
                  {/* 五行總覽表 */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left text-white/40 py-2 pr-3">五行</th>
                          <th className="text-right text-white/40 py-2 px-2">本命</th>
                          <th className="text-right text-white/40 py-2 px-2">環境</th>
                          <th className="text-right text-white/40 py-2 px-2">加權</th>
                          <th className="text-left text-white/40 py-2 pl-3">能量等級</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.elementOverview?.map((row: { element: string; emoji: string; natalPct: number; envPct: number; weightedPct: number; energyLevel: { level: string; stars: number; emoji: string }; interpretation: string }) => (
                          <tr key={row.element} className="border-b border-white/5">
                            <td className="py-2 pr-3">
                              <span className="text-base mr-1">{row.emoji}</span>
                              <span className="text-white/80 font-medium">{row.element}</span>
                            </td>
                            <td className="text-right text-white/50 py-2 px-2">{row.natalPct}%</td>
                            <td className="text-right text-white/50 py-2 px-2">{row.envPct}%</td>
                            <td className="text-right py-2 px-2">
                              <span className={`font-bold ${row.weightedPct >= 35 ? 'text-amber-400' : row.weightedPct >= 25 ? 'text-orange-400' : row.weightedPct >= 15 ? 'text-emerald-400' : row.weightedPct >= 5 ? 'text-blue-400' : 'text-red-400'}`}>
                                {row.weightedPct}%
                              </span>
                            </td>
                            <td className="pl-3 py-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                row.energyLevel.stars >= 5 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                row.energyLevel.stars >= 4 ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' :
                                row.energyLevel.stars >= 3 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                                row.energyLevel.stars >= 2 ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                                'bg-red-500/20 text-red-300 border border-red-500/30'
                              }`}>
                                {row.energyLevel.level}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* 核心矛盾 */}
                  {data.wuxing?.coreContradiction && (
                    <div className="rounded-xl bg-amber-950/20 border border-amber-500/20 p-3 mt-2">
                      <span className="text-amber-400 text-xs font-semibold">⚡ 今日核心矛盾：</span>
                      <span className="text-amber-300/80 text-xs ml-2">{data.wuxing.coreContradiction}</span>
                    </div>
                  )}
                </div>
              </SectionCard>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ── 穿搭建議（V9.0 加權五行驅動）── */}
                <SectionCard title="今日穿搭建議" icon="👗">
                  <div className="space-y-3">
                    {/* 能量標籤 */}
                    {data.outfit?.energyTag && (
                      <div className="rounded-xl bg-orange-950/20 border border-orange-500/20 p-3">
                        <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full border border-orange-500/30">
                          {data.outfit.energyTag}
                        </span>
                        {data.outfit?.coreStrategy && (
                          <p className="text-orange-300/80 text-xs mt-2">{data.outfit.coreStrategy}</p>
                        )}
                      </div>
                    )}
                    {/* 上半身 */}
                    <div className="rounded-xl bg-red-950/20 border border-red-500/20 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-red-400 text-xs font-semibold">上半身</span>
                        <span className="text-white font-medium text-sm">
                          {data.outfit?.upperBody?.colors?.join(' / ') || ''}
                        </span>
                        <span className="text-red-500/60 text-xs ml-auto">{data.outfit?.upperBody?.element}</span>
                      </div>
                      <p className="text-white/60 text-xs leading-relaxed">{data.outfit?.upperBody?.tacticalExplanation}</p>
                    </div>
                    {/* 下半身 */}
                    <div className="rounded-xl bg-amber-950/20 border border-amber-500/20 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-amber-400 text-xs font-semibold">下半身</span>
                        <span className="text-white font-medium text-sm">
                          {data.outfit?.lowerBody?.colors?.join(' / ') || ''}
                        </span>
                        <span className="text-amber-500/60 text-xs ml-auto">{data.outfit?.lowerBody?.element}</span>
                      </div>
                      <p className="text-white/60 text-xs leading-relaxed">{data.outfit?.lowerBody?.tacticalExplanation}</p>
                    </div>
                    {/* 避開顏色 */}
                    {data.outfit?.avoid && data.outfit.avoid.length > 0 && (
                      <div className="rounded-xl bg-slate-800/40 border border-slate-500/20 p-3">
                        <div className="text-slate-400 text-xs font-semibold mb-2">⚠️ 今日避開</div>
                        {data.outfit.avoid.map((item: { element: string; colors: string[]; reason: string }, i: number) => (
                          <div key={i} className="mb-1">
                            <span className="text-slate-300 text-xs">{item.element}色系（{item.colors.slice(0,2).join('/')}）</span>
                            <span className="text-slate-500 text-xs ml-2">— {item.reason}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </SectionCard>

                {/* ── 飲食建議（V9.0 新增）── */}
                <SectionCard title="今日飲食建議" icon="🍽️">
                  <div className="space-y-3">
                    {/* 補充食物 */}
                    {data.dietary?.supplements?.map((item: { element: string; priority: number; foods: string[]; advice: string }, i: number) => (
                      <div key={i} className={`rounded-xl border p-3 ${
                        item.element === '火' ? 'bg-red-950/20 border-red-500/20' :
                        item.element === '土' ? 'bg-amber-950/20 border-amber-500/20' :
                        item.element === '金' ? 'bg-slate-800/40 border-slate-500/20' :
                        'bg-emerald-950/20 border-emerald-500/20'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs font-semibold ${
                            item.element === '火' ? 'text-red-400' :
                            item.element === '土' ? 'text-amber-400' :
                            item.element === '金' ? 'text-slate-300' :
                            'text-emerald-400'
                          }`}>
                            {item.element === '火' ? '🔥' : item.element === '土' ? '🌍' : item.element === '金' ? '⚪' : '🌊'} 補{item.element}食物（優先級#{item.priority}）
                          </span>
                        </div>
                        <p className="text-white/60 text-xs leading-relaxed mb-2">{item.advice}</p>
                        <div className="flex flex-wrap gap-1">
                          {item.foods.map((food: string, fi: number) => (
                            <span key={fi} className="text-xs bg-white/10 text-white/60 px-2 py-0.5 rounded-full">{food}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                    {/* 避開食物 */}
                    {data.dietary?.avoid && data.dietary.avoid.length > 0 && (
                      <div className="rounded-xl bg-slate-800/40 border border-slate-500/20 p-3">
                        <div className="text-slate-400 text-xs font-semibold mb-2">⚠️ 今日少吃</div>
                        {data.dietary.avoid.map((item: { element: string; foods: string[]; reason: string }, i: number) => (
                          <div key={i} className="mb-2">
                            <p className="text-slate-300 text-xs">{item.element}屬食物：{item.foods.slice(0,4).join('、')}</p>
                            <p className="text-slate-500 text-xs mt-0.5">{item.reason}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </SectionCard>
              </div>

              {/* ── 手串矩陣（V9.0 加權五行驅動）── */}
              <SectionCard title="今日手串矩陣" icon="📿">
                <div className="space-y-4">
                  {/* 核心目標 */}
                  {data.bracelets?.coreGoal && (
                    <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                      <p className="text-white/70 text-sm">{data.bracelets.coreGoal}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 左手 */}
                    <div>
                      <div className="text-emerald-400/70 text-xs font-semibold mb-2">🖐 左手（主補能）</div>
                      {data.bracelets?.leftHand && (
                        <div className={`rounded-lg border p-3 transition-all ${
                          wornSet.has(`${data.bracelets.leftHand.code}-left`)
                            ? 'bg-emerald-900/40 border-emerald-400/50'
                            : 'bg-emerald-950/20 border-emerald-500/20'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-emerald-500/60 text-xs font-mono">{data.bracelets.leftHand.code}</span>
                              <span className="text-emerald-300 font-medium text-sm">{data.bracelets.leftHand.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                {data.bracelets.leftHand.element}
                              </span>
                              <button
                                onClick={() => handleToggleWear(data.bracelets.leftHand.code, data.bracelets.leftHand.name, 'left')}
                                disabled={toggleWear.isPending}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold transition-all ${
                                  wornSet.has(`${data.bracelets.leftHand.code}-left`)
                                    ? 'bg-emerald-500/30 border border-emerald-400/60 text-emerald-300'
                                    : 'bg-white/5 border border-white/20 text-white/40 hover:border-emerald-500/40 hover:text-emerald-400'
                                }`}
                              >
                                {wornSet.has(`${data.bracelets.leftHand.code}-left`) ? '✓ 已佩戴' : '佩戴'}
                              </button>
                            </div>
                          </div>
                          <p className="text-emerald-400/70 text-xs font-medium mb-1">⚔️ {data.bracelets.leftHand.tacticalRole}</p>
                          <p className="text-white/50 text-xs leading-relaxed">{data.bracelets.leftHand.explanation}</p>
                        </div>
                      )}
                    </div>
                    {/* 右手 */}
                    <div>
                      <div className="text-blue-400/70 text-xs font-semibold mb-2">🤚 右手（策略/防護）</div>
                      {data.bracelets?.rightHand && (
                        <div className={`rounded-lg border p-3 transition-all ${
                          wornSet.has(`${data.bracelets.rightHand.code}-right`)
                            ? 'bg-blue-900/40 border-blue-400/50'
                            : 'bg-blue-950/20 border-blue-500/20'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-blue-500/60 text-xs font-mono">{data.bracelets.rightHand.code}</span>
                              <span className="text-blue-300 font-medium text-sm">{data.bracelets.rightHand.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">
                                {data.bracelets.rightHand.element}
                              </span>
                              <button
                                onClick={() => handleToggleWear(data.bracelets.rightHand.code, data.bracelets.rightHand.name, 'right')}
                                disabled={toggleWear.isPending}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold transition-all ${
                                  wornSet.has(`${data.bracelets.rightHand.code}-right`)
                                    ? 'bg-blue-500/30 border border-blue-400/60 text-blue-300'
                                    : 'bg-white/5 border border-white/20 text-white/40 hover:border-blue-500/40 hover:text-blue-400'
                                }`}
                              >
                                {wornSet.has(`${data.bracelets.rightHand.code}-right`) ? '✓ 已佩戴' : '佩戴'}
                              </button>
                            </div>
                          </div>
                          <p className="text-blue-400/70 text-xs font-medium mb-1">🛡️ {data.bracelets.rightHand.tacticalRole}</p>
                          <p className="text-white/50 text-xs leading-relaxed">{data.bracelets.rightHand.explanation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </SectionCard>
            </motion.div>
          )}
          {/* ═══ 財運羅盤 ═══ */}
'''

with open('client/src/pages/WarRoom.tsx', 'r') as f:
    content = f.read()
    lines = f.readlines()

with open('client/src/pages/WarRoom.tsx', 'r') as f:
    lines = f.readlines()

# Find the outfit tab start and end
start_line = None
end_line = None
for i, line in enumerate(lines):
    if 'activeTab === "outfit"' in line and start_line is None:
        start_line = i
    if start_line is not None and 'activeTab === "wealth"' in line:
        end_line = i
        break

print(f'Replacing lines {start_line+1} to {end_line} ({end_line - start_line} lines)')

new_lines = lines[:start_line] + [NEW_OUTFIT_TAB] + lines[end_line:]

with open('client/src/pages/WarRoom.tsx', 'w') as f:
    f.writelines(new_lines)

print('Done!')
