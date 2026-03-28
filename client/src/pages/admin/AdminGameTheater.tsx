/**
 * 遊戲劇院（Game Theater）— 後台管理頁面
 * 功能：
 * 1. 角色管理 — 搜尋角色、調整點數/靈石/遊戲幣、設定永久滿值
 * 2. 全域參數 — 24 個遊戲參數即時調整
 * 3. Tick 引擎狀態 — 伺服器端 Tick 監控
 */
import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useLocation } from "wouter";

// ─── 世界重置 Tab ───────────────────────────────────────────────────────────
function WorldResetTab() {
  const [confirmText, setConfirmText] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetResult, setResetResult] = useState<null | {
    success: boolean;
    agentsCleared: number;
    eventsCleared: number;
    chatCleared: number;
    pvpCleared: number;
    shopItemsAdded: number;
    hiddenPoolAdded: number;
    errors: string[];
  }>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [nodeId, setNodeId] = useState("node_001");

  const resetWorldMutation = trpc.gameAdmin.resetWorld.useMutation({
    onSuccess: (data) => {
      setIsResetting(false);
      setResetResult(data);
      setShowConfirm(false);
      setConfirmText("");
      if (data.success) {
        toast.success("🌍 新世界已誕生！所有角色資料已清除，商店已重置。");
      } else {
        toast.error(`重置完成但有錯誤：${data.errors.join(", ")}`);
      }
    },
    onError: (err) => {
      setIsResetting(false);
      toast.error(`重置失敗：${err.message}`);
    },
  });

  const triggerHiddenShopMutation = trpc.gameAdmin.triggerHiddenShop.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`✅ 密店已在節點 ${nodeId} 觸發！`);
      } else {
        toast.error("密店觸發失敗（可能已達上限或商品池為空）");
      }
    },
  });

  const cleanShopsMutation = trpc.gameAdmin.cleanExpiredHiddenShops.useMutation({
    onSuccess: (data) => {
      toast.success(`✅ 已清除 ${data.cleaned} 個過期密店`);
    },
  });

  const handleReset = () => {
    if (confirmText !== "確認重置世界") {
      toast.error("請輸入正確的確認文字：確認重置世界");
      return;
    }
    setIsResetting(true);
    resetWorldMutation.mutate({ confirmText });
  };

  return (
    <div className="space-y-6">
      {/* 警告說明 */}
      <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="font-bold text-red-400 text-lg">格式化世界 — 不可逆操作</h3>
            <p className="text-sm text-red-300/80 mt-1">此操作將清除所有角色資料（保留帳號），重置商店，並廣播新世界誕生訊息。所有玩家需重新建立角色。</p>
            <ul className="text-xs text-slate-400 mt-3 space-y-1 list-disc list-inside">
              <li>清除所有角色（gameAgents）及其背包、事件記錄</li>
              <li>清除世界事件歷史、聊天訊息、PvP 戰績、週冠軍</li>
              <li>重置基礎商店（插入 20 種初始商品）</li>
              <li>初始化隱藏商店商品池（如為空）</li>
              <li>重啟 Tick 引擎和世界 Tick 引擎</li>
              <li>廣播「新世界誕生」全服通知</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 重置操作區 */}
      {!showConfirm ? (
        <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-5">
          <h4 className="font-bold text-slate-200 mb-3">🔴 執行世界重置</h4>
          <p className="text-sm text-slate-400 mb-4">點擊下方按鈕開始重置流程，系統將要求您輸入確認文字。</p>
          <Button
            variant="destructive"
            onClick={() => setShowConfirm(true)}
            className="w-full"
          >
            🌍 格式化世界並重新啟動
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-red-500/50 bg-red-950/30 p-5 space-y-4">
          <h4 className="font-bold text-red-400">⚠️ 最終確認</h4>
          <p className="text-sm text-slate-300">請在下方輸入 <code className="bg-slate-800 px-2 py-0.5 rounded text-red-300">確認重置世界</code> 以繼續：</p>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="輸入：確認重置世界"
            className="border-red-500/50 bg-slate-900"
          />
          <div className="flex gap-3">
            <Button
              variant="destructive"
              onClick={handleReset}
              disabled={isResetting || confirmText !== "確認重置世界"}
              className="flex-1"
            >
              {isResetting ? "🔄 重置中..." : "✅ 確認執行重置"}
            </Button>
            <Button
              variant="outline"
              onClick={() => { setShowConfirm(false); setConfirmText(""); }}
              className="flex-1"
            >
              取消
            </Button>
          </div>
        </div>
      )}

      {/* 重置結果 */}
      {resetResult && (
        <div className={`rounded-xl border p-5 ${
          resetResult.success ? "border-green-500/30 bg-green-950/20" : "border-yellow-500/30 bg-yellow-950/20"
        }`}>
          <h4 className={`font-bold mb-3 ${resetResult.success ? "text-green-400" : "text-yellow-400"}`}>
            {resetResult.success ? "✅ 重置成功" : "⚠️ 重置完成（有警告）"}
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-slate-400 text-xs">清除角色數</div>
              <div className="text-2xl font-bold text-slate-200">{resetResult.agentsCleared}</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-slate-400 text-xs">商店商品數</div>
              <div className="text-2xl font-bold text-green-400">{resetResult.shopItemsAdded}</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-slate-400 text-xs">清除事件數</div>
              <div className="text-2xl font-bold text-slate-200">{resetResult.eventsCleared}</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-slate-400 text-xs">密店商品池</div>
              <div className="text-2xl font-bold text-purple-400">
                {resetResult.hiddenPoolAdded === -1 ? "已存在" : resetResult.hiddenPoolAdded}
              </div>
            </div>
          </div>
          {resetResult.errors.length > 0 && (
            <div className="mt-3 space-y-1">
              {resetResult.errors.map((err, i) => (
                <p key={i} className="text-xs text-yellow-400">⚠️ {err}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 隱藏商店管理 */}
      <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-5 space-y-4">
        <h4 className="font-bold text-slate-200">🏪 隱藏密店管理</h4>
        <p className="text-xs text-slate-400">
          密店觸發條件：世界 Tick（每 6 次，15% 機率）、探索（尋寶力≥30，10% 機率）、流星雨（強制觸發）。<br />
          密店持續 30 分鐘後自動消失。
        </p>
        <div className="flex gap-2">
          <Input
            value={nodeId}
            onChange={(e) => setNodeId(e.target.value)}
            placeholder="節點 ID（如 node_001）"
            className="flex-1"
          />
          <Button
            onClick={() => triggerHiddenShopMutation.mutate({ nodeId, reason: "world_tick" })}
            disabled={triggerHiddenShopMutation.isPending}
            className="bg-purple-600 hover:bg-purple-500"
          >
            🎪 手動觸發密店
          </Button>
        </div>
        <Button
          variant="outline"
          onClick={() => cleanShopsMutation.mutate()}
          disabled={cleanShopsMutation.isPending}
          className="w-full"
        >
          🧹 清除過期密店
        </Button>
      </div>
    </div>
  );
}

// ─── 五行顏色 ────────────────────────────────────────────────────────────────
const WUXING_COLORS: Record<string, string> = {
  木: "#2E8B57", 火: "#DC143C", 土: "#CD853F", 金: "#C9A227", 水: "#00CED1",
};

// ─── 全域參數分類 ─────────────────────────────────────────────────────────────
const CONFIG_CATEGORY_LABELS: Record<string, string> = {
  weather: "🌤 天氣系統",
  teleport: "🗺 傳送系統",
  adventure: "🎲 奇遇系統",
  combat: "⚔️ 戰鬥系統",
  drop: "🎁 掉落系統",
  exp: "📈 經驗系統",
  shop: "🏪 商店系統",
  stamina: "💪 體力系統",
  global: "🌐 全域設定",
};

// ─── 角色管理 Tab ─────────────────────────────────────────────────────────────
function AgentManagementTab() {
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<AgentResult | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [showEditPanel, setShowEditPanel] = useState(false);

  const { data: pagedData, isLoading, refetch } = trpc.gameAdmin.listAgentsPaginated.useQuery(
    { page, pageSize: 20, keyword: keyword || undefined }
  );
  const agents = pagedData?.agents;
  const total = pagedData?.total ?? 0;
  const totalPages = pagedData?.totalPages ?? 1;

  const adjustValues = trpc.gameAdmin.adjustAgentValues.useMutation({
    onSuccess: () => {
      toast.success("✅ 角色數值已更新");
      refetch();
      setShowEditPanel(false);
    },
    onError: (err) => toast.error(`❌ 更新失敗：${err.message}`),
  });

  const setControl = trpc.gameAdmin.setAgentControl.useMutation({
    onSuccess: () => {
      toast.success("✅ 永久滿值設定已更新");
      refetch();
    },
    onError: (err) => toast.error(`❌ 設定失敗：${err.message}`),
  });

  type AgentResult = NonNullable<typeof agents>[number];

  const handleSearch = () => {
    setKeyword(searchInput.trim());
    setPage(1);
  };

  const openEdit = (agent: AgentResult) => {
    setSelectedAgent(agent);
    setEditValues({
      gold: String(agent.gold ?? 0),
      hp: String(agent.hp ?? 0),
      mp: String(agent.mp ?? 0),
      stamina: String(agent.stamina ?? 0),
      actionPoints: String(agent.actionPoints ?? 0),
      level: String(agent.level ?? 1),
      exp: String(agent.exp ?? 0),
      wuxingWood: String(agent.wuxingWood ?? 0),
      wuxingFire: String(agent.wuxingFire ?? 0),
      wuxingEarth: String(agent.wuxingEarth ?? 0),
      wuxingMetal: String(agent.wuxingMetal ?? 0),
      wuxingWater: String(agent.wuxingWater ?? 0),
      pointsBalance: String(agent.pointsBalance ?? 0),
      gameCoins: String(agent.gameCoins ?? 0),
      gameStones: String(agent.gameStones ?? 0),
    });
    setShowEditPanel(true);
  };

  const handleSave = () => {
    if (!selectedAgent) return;
    const toInt = (k: string) => parseInt(editValues[k] ?? "0", 10) || 0;
    adjustValues.mutate({
      agentId: selectedAgent.id,
      userId: selectedAgent.userId,
      gold: toInt("gold"),
      hp: toInt("hp"),
      mp: toInt("mp"),
      stamina: toInt("stamina"),
      actionPoints: toInt("actionPoints"),
      level: toInt("level"),
      exp: toInt("exp"),
      wuxingWood: toInt("wuxingWood"),
      wuxingFire: toInt("wuxingFire"),
      wuxingEarth: toInt("wuxingEarth"),
      wuxingMetal: toInt("wuxingMetal"),
      wuxingWater: toInt("wuxingWater"),
      pointsBalance: toInt("pointsBalance"),
      gameCoins: toInt("gameCoins"),
      gameStones: toInt("gameStones"),
    });
  };

  const toggleControl = (agent: AgentResult, field: string, value: boolean) => {
    setControl.mutate({
      agentId: agent.id,
      [field]: value,
    });
  };

  return (
    <div className="space-y-4">
      {/* 搜尋列 + 統計 */}
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder="輸入角色名稱或 UserID 篩選…（留空顯示全部）"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSearch()}
          className="max-w-sm"
        />
        <Button onClick={handleSearch} variant="outline" size="sm">🔍 篩選</Button>
        {keyword && (
          <Button variant="ghost" size="sm" onClick={() => { setKeyword(""); setSearchInput(""); setPage(1); }}>✕ 清除篩選</Button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          共 <span className="text-amber-400 font-medium">{total}</span> 位玩家
        </span>
      </div>

      {/* 結果列表 */}
      {isLoading && <p className="text-muted-foreground text-sm">載入中…</p>}
      {!isLoading && agents && agents.length === 0 && (
        <p className="text-muted-foreground text-sm">找不到符合的角色</p>
      )}

      {agents && agents.length > 0 && (
        <div className="space-y-3">
          {agents.map(agent => (
            <Card key={agent.id} className="border-border/50">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-start justify-between gap-4">
                  {/* 角色基本資訊 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base">{agent.agentName}</span>
                      <Badge variant="outline" className="text-xs">Lv.{agent.level}</Badge>
                      {agent.dominantElement && (
                        <Badge style={{ background: WUXING_COLORS[agent.dominantElement] ?? "#888", color: "#fff" }} className="text-xs">
                          {agent.dominantElement}命
                        </Badge>
                      )}
                      {agent.control?.isBanned === 1 && (
                        <Badge variant="destructive" className="text-xs">已封禁</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">UID: {agent.userId}</p>

                    {/* 資源數值 */}
                    <div className="grid grid-cols-3 gap-x-4 gap-y-1 mt-2 text-xs">
                      <span className="text-muted-foreground">HP: <span className="text-foreground">{agent.hp}/{agent.maxHp}</span></span>
                      <span className="text-muted-foreground">MP: <span className="text-foreground">{agent.mp}/{agent.maxMp}</span></span>
                      <span className="text-muted-foreground">體力: <span className="text-foreground">{agent.stamina}/{agent.maxStamina}</span></span>
                      <span className="text-muted-foreground">金幣: <span className="text-yellow-500">{agent.gold}</span></span>
                      <span className="text-muted-foreground">遊戲幣: <span className="text-blue-400">{agent.gameCoins}</span></span>
                      <span className="text-muted-foreground">靈石: <span className="text-purple-400">{agent.gameStones}</span></span>
                      <span className="text-muted-foreground">積分: <span className="text-amber-400">{agent.pointsBalance}</span></span>
                      <span className="text-muted-foreground">AP: <span className="text-cyan-400">{agent.actionPoints}/{agent.maxActionPoints}</span></span>
                      <span className="text-muted-foreground">節點: <span className="text-foreground text-[10px]">{agent.currentNodeId}</span></span>
                    </div>

                    {/* 五行數值 */}
                    <div className="flex gap-2 mt-1.5 flex-wrap">
                      {[
                        { k: "wuxingWood", label: "木", val: agent.wuxingWood },
                        { k: "wuxingFire", label: "火", val: agent.wuxingFire },
                        { k: "wuxingEarth", label: "土", val: agent.wuxingEarth },
                        { k: "wuxingMetal", label: "金", val: agent.wuxingMetal },
                        { k: "wuxingWater", label: "水", val: agent.wuxingWater },
                      ].map(({ label, val }) => (
                        <span key={label} className="text-xs px-1.5 py-0.5 rounded"
                          style={{ background: `${WUXING_COLORS[label]}20`, color: WUXING_COLORS[label] }}>
                          {label} {val}
                        </span>
                      ))}
                    </div>

                    {/* 永久滿值開關 */}
                    <div className="flex gap-4 mt-2 flex-wrap">
                      {[
                        { field: "infiniteStamina", label: "∞ 體力", value: agent.control?.infiniteStamina === 1 },
                        { field: "infiniteAP", label: "∞ AP", value: agent.control?.infiniteAP === 1 },
                        { field: "infiniteHP", label: "∞ HP", value: agent.control?.infiniteHP === 1 },
                        { field: "infiniteMP", label: "∞ MP", value: agent.control?.infiniteMP === 1 },
                        { field: "infiniteGold", label: "∞ 金幣", value: agent.control?.infiniteGold === 1 },
                        { field: "isBanned", label: "🚫 封禁", value: agent.control?.isBanned === 1 },
                      ].map(({ field, label, value }) => (
                        <label key={field} className="flex items-center gap-1.5 cursor-pointer select-none">
                          <Switch
                            checked={value}
                            onCheckedChange={(v) => toggleControl(agent, field, v)}
                            className="scale-75"
                          />
                          <span className="text-xs text-muted-foreground">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 編輯按鈕 */}
                  <Button size="sm" variant="outline" onClick={() => openEdit(agent)} className="shrink-0">
                    ✏️ 編輯數值
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 分頁控制器 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline" size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1 || isLoading}
          >
            ← 上一頁
          </Button>
          <span className="text-sm text-muted-foreground">
            第 <span className="text-amber-400 font-medium">{page}</span> / {totalPages} 頁
          </span>
          <Button
            variant="outline" size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || isLoading}
          >
            下一頁 →
          </Button>
        </div>
      )}

      {/* 編輯面板（浮動抄屉） */}
      {showEditPanel && selectedAgent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
          onClick={() => setShowEditPanel(false)}>
          <div className="bg-card border border-border rounded-2xl p-5 w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">✏️ 編輯角色數值 — {selectedAgent.agentName}</h3>
              <button onClick={() => setShowEditPanel(false)} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "level", label: "等級", min: 1, max: 999 },
                { key: "exp", label: "經驗值", min: 0, max: 9999999 },
                { key: "hp", label: "HP", min: 0, max: 9999 },
                { key: "mp", label: "MP", min: 0, max: 9999 },
                { key: "stamina", label: "體力", min: 0, max: 255 },
                { key: "actionPoints", label: "AP", min: 0, max: 10 },
                { key: "gold", label: "金幣（虛相）", min: 0, max: 9999999 },
                { key: "pointsBalance", label: "積分點", min: 0, max: 9999999 },
                { key: "gameCoins", label: "遊戲幣", min: 0, max: 9999999 },
                { key: "gameStones", label: "靈石", min: 0, max: 9999999 },
                { key: "wuxingWood", label: "木屬性", min: 0, max: 255 },
                { key: "wuxingFire", label: "火屬性", min: 0, max: 255 },
                { key: "wuxingEarth", label: "土屬性", min: 0, max: 255 },
                { key: "wuxingMetal", label: "金屬性", min: 0, max: 255 },
                { key: "wuxingWater", label: "水屬性", min: 0, max: 255 },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                  <Input
                    type="number"
                    value={editValues[key] ?? ""}
                    onChange={e => setEditValues(prev => ({ ...prev, [key]: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={handleSave} disabled={adjustValues.isPending} className="flex-1">
                {adjustValues.isPending ? "儲存中…" : "💾 儲存"}
              </Button>
              <Button variant="outline" onClick={() => setShowEditPanel(false)}>取消</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 全域參數 Tab ─────────────────────────────────────────────────────────────
function GameConfigTab() {
  const { data: configs, isLoading, refetch } = trpc.gameAdmin.getGameConfigs.useQuery();
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const batchUpdate = trpc.gameAdmin.batchUpdateGameConfigs.useMutation({
    onSuccess: (data) => {
      toast.success(`✅ 已更新 ${data.updated} 個參數`);
      setEditedValues({});
      refetch();
      setSaving(false);
    },
    onError: (err) => {
      toast.error(`❌ 更新失敗：${err.message}`);
      setSaving(false);
    },
  });

  const handleSaveAll = () => {
    const changed = Object.entries(editedValues).map(([configKey, configValue]) => ({
      configKey,
      configValue,
    }));
    if (changed.length === 0) {
      toast.info("沒有修改的參數");
      return;
    }
    setSaving(true);
    batchUpdate.mutate(changed);
  };

  // 依分類分組
  const grouped = (configs ?? []).reduce((acc, cfg) => {
    const cat = cfg.category ?? "global";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(cfg);
    return acc;
  }, {} as Record<string, typeof configs>);

  const changedCount = Object.keys(editedValues).length;

  return (
    <div className="space-y-4">
      {/* 頂部操作列 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          共 {configs?.length ?? 0} 個全域參數，即時生效，無需重啟伺服器
        </p>
        <div className="flex items-center gap-2">
          {changedCount > 0 && (
            <Badge variant="secondary">{changedCount} 項已修改</Badge>
          )}
          <Button onClick={handleSaveAll} disabled={saving || changedCount === 0} size="sm">
            {saving ? "儲存中…" : "💾 儲存所有修改"}
          </Button>
          {changedCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => setEditedValues({})}>
              ↩ 還原
            </Button>
          )}
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">載入中…</p>}

      {/* 分類顯示 */}
      {Object.entries(grouped).map(([category, items]) => (
        <Card key={category}>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              {CONFIG_CATEGORY_LABELS[category] ?? category}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(items ?? []).map(cfg => {
                const isEdited = cfg.configKey in editedValues;
                const currentVal = isEdited ? editedValues[cfg.configKey] : (cfg.configValue ?? "");
                return (
                  <div key={cfg.configKey} className={`rounded-lg border p-3 transition-colors ${isEdited ? "border-amber-500/50 bg-amber-500/5" : "border-border/40"}`}>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div>
                        <p className="text-xs font-medium">{cfg.configKey}</p>
                        {cfg.description && (
                          <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{cfg.description}</p>
                        )}
                      </div>
                      {isEdited && <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/50 shrink-0">已修改</Badge>}
                    </div>
                    <Input
                      value={currentVal}
                      onChange={e => setEditedValues(prev => ({ ...prev, [cfg.configKey]: e.target.value }))}
                      className="h-7 text-xs font-mono"
                      placeholder={String(cfg.configValue ?? "")}
                    />

                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Tick 引擎狀態 Tab ────────────────────────────────────────────────────────
function TickEngineTab() {
  const [tickLog, setTickLog] = useState<Array<{ time: string; msg: string; type: "info" | "success" | "error" }>>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [tickCount, setTickCount] = useState(0);
  const [lastTickTime, setLastTickTime] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const triggerTick = trpc.gameWorld.triggerTick.useMutation({
    onSuccess: (data) => {
      const now = new Date().toLocaleTimeString("zh-TW");
      setLastTickTime(now);
      setTickCount(prev => prev + 1);
      const msg = `Tick #${tickCount + 1} 完成 — ${(data as { eventsProcessed?: number })?.eventsProcessed ?? 0} 個事件`;
      setTickLog(prev => [{ time: now, msg, type: "success" }, ...prev.slice(0, 49)]);
    },
    onError: (err) => {
      const now = new Date().toLocaleTimeString("zh-TW");
      setTickLog(prev => [{ time: now, msg: `Tick 失敗：${err.message}`, type: "error" }, ...prev.slice(0, 49)]);
    },
  });

  const handleToggle = () => {
    if (isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      setIsRunning(false);
      const now = new Date().toLocaleTimeString("zh-TW");
      setTickLog(prev => [{ time: now, msg: "⏹ 管理員手動停止 Tick 監控", type: "info" }, ...prev.slice(0, 49)]);
    } else {
      setIsRunning(true);
      const now = new Date().toLocaleTimeString("zh-TW");
      setTickLog(prev => [{ time: now, msg: "▶ 管理員啟動 Tick 監控（每 5 秒）", type: "info" }, ...prev.slice(0, 49)]);
      triggerTick.mutate();
      intervalRef.current = setInterval(() => {
        triggerTick.mutate();
      }, 5000);
    }
  };

  const handleManualTick = () => {
    triggerTick.mutate();
  };

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  return (
    <div className="space-y-4">
      {/* 狀態卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">{tickCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">本次執行 Tick 數</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-sm font-mono font-bold">{lastTickTime ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">最後 Tick 時間</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold ${isRunning ? "bg-green-500/15 text-green-400" : "bg-slate-500/15 text-slate-400"}`}>
              <span className={`w-2 h-2 rounded-full ${isRunning ? "bg-green-400 animate-pulse" : "bg-slate-500"}`} />
              {isRunning ? "運行中" : "已停止"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Tick 狀態</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-sm font-bold text-amber-400">5 秒</p>
            <p className="text-xs text-muted-foreground mt-0.5">前端觸發間隔</p>
          </CardContent>
        </Card>
      </div>

      {/* 操作按鈕 */}
      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={handleToggle}
          variant={isRunning ? "destructive" : "default"}
          className="min-w-[120px]"
        >
          {isRunning ? "⏹ 停止自動 Tick" : "▶ 啟動自動 Tick"}
        </Button>
        <Button variant="outline" onClick={handleManualTick} disabled={triggerTick.isPending}>
          {triggerTick.isPending ? "⏳ 執行中…" : "⚡ 手動執行一次"}
        </Button>
        <Button variant="ghost" onClick={() => setTickLog([])} className="text-muted-foreground">
          🗑 清空日誌
        </Button>
      </div>

      {/* 說明 */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="pt-4 pb-3">
          <p className="text-xs text-amber-300/80 leading-relaxed">
            <strong>說明：</strong>伺服器端 Tick 引擎每 <strong>5 分鐘</strong>自動執行一次（處理所有活躍旅人）。
            此頁面可讓管理員<strong>手動觸發</strong> Tick 或以 <strong>5 秒</strong>間隔快速推進遊戲進程，
            適合測試和調試用途。玩家前端的「執行」按鈕也可手動觸發，每 5 秒自動重複。
          </p>
        </CardContent>
      </Card>

      {/* Tick 日誌 */}
      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm">📋 Tick 執行日誌（最新在上）</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div ref={logRef} className="h-64 overflow-y-auto space-y-1 font-mono text-xs">
            {tickLog.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">等待第一次 Tick…</p>
            ) : tickLog.map((log, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-muted-foreground shrink-0 tabular-nums">{log.time}</span>
                <span className={
                  log.type === "success" ? "text-green-400" :
                  log.type === "error" ? "text-red-400" :
                  "text-slate-400"
                }>{log.msg}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── 全服廣播 Tab ─────────────────────────────────────────────────────────────────────────────
const MSG_TYPE_OPTIONS = [
  { value: "info",        label: "📢 一般公告",  color: "#38bdf8" },
  { value: "warning",     label: "⚠️ 警告",      color: "#f59e0b" },
  { value: "event",       label: "🎉 活動公告",  color: "#a855f7" },
  { value: "maintenance", label: "🔧 維護公告",  color: "#ef4444" },
];

function BroadcastTab() {
  const [content, setContent] = useState("");
  const [msgType, setMsgType] = useState<"info" | "warning" | "event" | "maintenance">("info");
  const [duration, setDuration] = useState("300");

  const { data: history, refetch: refetchHistory } = trpc.gameAdmin.getBroadcastHistory.useQuery();

  const sendBroadcast = trpc.gameAdmin.broadcastMessage.useMutation({
    onSuccess: () => {
      toast.success("📢 廣播已發送！玩家將在 20 秒內看到");
      setContent("");
      refetchHistory();
    },
    onError: (e) => toast.error("發送失敗：" + e.message),
  });

  const closeBroadcast = trpc.gameAdmin.closeBroadcast.useMutation({
    onSuccess: () => { toast.success("已關閉廣播"); refetchHistory(); },
  });

  const selectedStyle = MSG_TYPE_OPTIONS.find(o => o.value === msgType);

  return (
    <div className="space-y-6">
      {/* 發送區 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">📢 發送全服廣播</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 訊息類型 */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">訊息類型</p>
            <div className="flex flex-wrap gap-2">
              {MSG_TYPE_OPTIONS.map(opt => (
                <button key={opt.value}
                  onClick={() => setMsgType(opt.value as typeof msgType)}
                  className="px-3 py-1.5 rounded-lg border text-xs font-medium transition-all"
                  style={msgType === opt.value
                    ? { background: `${opt.color}20`, borderColor: opt.color, color: opt.color }
                    : { background: "transparent", borderColor: "rgba(255,255,255,0.1)", color: "#64748b" }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {/* 內容 */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">廣播內容（最多 500 字）</p>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="輸入廣播內容，玩家將在選區頂部看到此訊息…"
              className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background text-sm resize-none outline-none focus:border-amber-500/50 transition-colors"
            />
            <p className="text-right text-xs text-muted-foreground mt-1">{content.length}/500</p>
          </div>
          {/* 持續時間 */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-2">顯示持續（秒）</p>
              <Input
                type="number"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                min={10} max={3600}
                className="h-8 text-sm"
                placeholder="300 = 5 分鐘"
              />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-2">預覽</p>
              <div className="px-3 py-2 rounded-lg border text-xs font-medium"
                style={selectedStyle
                  ? { background: `${selectedStyle.color}15`, borderColor: `${selectedStyle.color}40`, color: selectedStyle.color }
                  : {}}>
                {content || "廣播內容預覽"}
              </div>
            </div>
          </div>
          <Button
            onClick={() => sendBroadcast.mutate({ content, msgType, durationSeconds: parseInt(duration) || 300 })}
            disabled={!content.trim() || sendBroadcast.isPending}
            className="w-full">
            {sendBroadcast.isPending ? "發送中…" : "📢 發送全服廣播"}
          </Button>
        </CardContent>
      </Card>

      {/* 廣播歷史 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">📜 廣播歷史（最新 20 筆）</CardTitle>
        </CardHeader>
        <CardContent>
          {!history || history.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">尚無廣播歷史</p>
          ) : (
            <div className="space-y-2">
              {history.map(b => {
                const style = MSG_TYPE_OPTIONS.find(o => o.value === b.msgType);
                return (
                  <div key={b.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/40">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium" style={{ color: style?.color ?? "#94a3b8" }}>
                          {style?.label ?? b.msgType}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(b.createdAt).toLocaleString("zh-TW")}
                        </span>
                        {b.isActive ? (
                          <Badge variant="outline" className="text-[10px] text-green-500 border-green-500/40">結束中</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-slate-500">已關閉</Badge>
                        )}
                      </div>
                      <p className="text-sm text-foreground/80 break-words">{b.content}</p>
                      {b.expiresAt && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          到期：{new Date(b.expiresAt).toLocaleString("zh-TW")}
                        </p>
                      )}
                    </div>
                    {b.isActive === 1 && (
                      <Button variant="outline" size="sm" className="shrink-0 text-xs h-7"
                        onClick={() => closeBroadcast.mutate({ id: b.id })}
                        disabled={closeBroadcast.isPending}>
                        關閉
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── 引擎彈性調控 Tab ─────────────────────────────────────────────────────────────────────────────
function EngineControlTab() {
  const { data: cfg, refetch: refetchCfg } = trpc.gameAdmin.getEngineConfig.useQuery();
  const [localCfg, setLocalCfg] = useState<Record<string, string | boolean>>({});
  const [isDirty, setIsDirty] = useState(false);

  const { data: afkStatus, refetch: refetchAfk } = trpc.gameAdmin.getAfkTickStatus.useQuery();
  const restartAfk = trpc.gameAdmin.restartAfkTickEngine.useMutation({
    onSuccess: () => { toast.success("✅ 掛機循環引擎已重啟"); refetchAfk(); },
    onError: (e) => toast.error("重啟失敗：" + e.message),
  });

  // 從伺服器載入初始値
  useEffect(() => {
    if (cfg) {
      setLocalCfg({
        tickIntervalMs: String(cfg.tickIntervalMs),
        expMultiplier: String(cfg.expMultiplier),
        goldMultiplier: String(cfg.goldMultiplier),
        dropMultiplier: String(cfg.dropMultiplier),
        combatChance: String(cfg.combatChance),
        gatherChance: String(cfg.gatherChance),
        rogueChance: String(cfg.rogueChance),
        gameEnabled: cfg.gameEnabled,
        maintenanceMsg: cfg.maintenanceMsg,
        infuseMinGain: String((cfg as any).infuseMinGain ?? 0.1),
        infuseMaxGain: String((cfg as any).infuseMaxGain ?? 0.5),
        infuseFailRate: String((cfg as any).infuseFailRate ?? 0.2),
        infuseMaxWuxing: String((cfg as any).infuseMaxWuxing ?? 100),
        rewardMultIdle: String((cfg as any).rewardMultIdle ?? 0.33),
        rewardMultClosed: String((cfg as any).rewardMultClosed ?? 1.0),
        rewardMultOpen: String((cfg as any).rewardMultOpen ?? 1.5),
        afkTickIntervalMs: String((cfg as any).afkTickIntervalMs ?? 15000),
        afkTickEnabled: (cfg as any).afkTickEnabled ?? true,
        // 屬性平衡參數
        statLvHpMult: String((cfg as any).statLvHpMult ?? 12),
        statLvHpBase: String((cfg as any).statLvHpBase ?? 80),
        statLvAtkMult: String((cfg as any).statLvAtkMult ?? 8),
        statLvAtkBase: String((cfg as any).statLvAtkBase ?? 15),
        statLvDefMult: String((cfg as any).statLvDefMult ?? 8),
        statLvDefBase: String((cfg as any).statLvDefBase ?? 15),
        statLvSpdMult: String((cfg as any).statLvSpdMult ?? 6),
        statLvSpdBase: String((cfg as any).statLvSpdBase ?? 10),
        statLvMpMult: String((cfg as any).statLvMpMult ?? 8),
        statLvMpBase: String((cfg as any).statLvMpBase ?? 40),
        infuseHpPer100: String((cfg as any).infuseHpPer100 ?? 30),
        infuseAtkPer100: String((cfg as any).infuseAtkPer100 ?? 30),
        infuseDefPer100: String((cfg as any).infuseDefPer100 ?? 30),
        infuseSpdPer100: String((cfg as any).infuseSpdPer100 ?? 20),
        infuseMpPer100: String((cfg as any).infuseMpPer100 ?? 20),
        resistMaxPct: String((cfg as any).resistMaxPct ?? 50),
        combatAtkCoeff: String((cfg as any).combatAtkCoeff ?? 1.5),
        combatDefCoeff: String((cfg as any).combatDefCoeff ?? 0.5),
        // 屬性上限
        statCapHp: String((cfg as any).statCapHp ?? 99999),
        statCapMp: String((cfg as any).statCapMp ?? 9999),
        statCapAtk: String((cfg as any).statCapAtk ?? 1500),
        statCapDef: String((cfg as any).statCapDef ?? 1500),
        statCapSpd: String((cfg as any).statCapSpd ?? 1500),
        statCapMatk: String((cfg as any).statCapMatk ?? 1500),
        statCapMdef: String((cfg as any).statCapMdef ?? 1500),
        wuxingCap: String((cfg as any).wuxingCap ?? 100),
        sellDiscountRate: String((cfg as any).sellDiscountRate ?? 0.5),
        // 戰鬥倒數計時
        battleTurnTimerPvE: String((cfg as any).battleTurnTimerPvE ?? 30),
        battleTurnTimerBoss: String((cfg as any).battleTurnTimerBoss ?? 20),
        battleTurnTimerPvP: String((cfg as any).battleTurnTimerPvP ?? 15),
        // Boss 系統
        bossSystemEnabled: (cfg as any).bossSystemEnabled ?? true,
        bossT1MaxCount: String((cfg as any).bossT1MaxCount ?? 5),
        bossT1MoveInterval: String((cfg as any).bossT1MoveInterval ?? 300),
        bossT2MoveInterval: String((cfg as any).bossT2MoveInterval ?? 600),
      });
      setIsDirty(false);
    }
  }, [cfg]);

  const updateConfig = trpc.gameAdmin.updateEngineConfig.useMutation({
    onSuccess: () => {
      toast.success("✅ 引擎配置已更新，立即生效！");
      refetchCfg();
      setIsDirty(false);
    },
    onError: (e) => toast.error("更新失敗：" + e.message),
  });

  const resetConfig = trpc.gameAdmin.resetEngineConfig.useMutation({
    onSuccess: () => {
      toast.success("✅ 已重置為預設値");
      refetchCfg();
    },
    onError: (e) => toast.error("重置失敗：" + e.message),
  });

  const handleChange = (key: string, value: string | boolean) => {
    setLocalCfg(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleSave = () => {
    updateConfig.mutate({
      tickIntervalMs: parseInt(String(localCfg.tickIntervalMs)) || undefined,
      expMultiplier: parseFloat(String(localCfg.expMultiplier)) || undefined,
      goldMultiplier: parseFloat(String(localCfg.goldMultiplier)) || undefined,
      dropMultiplier: parseFloat(String(localCfg.dropMultiplier)) || undefined,
      combatChance: parseFloat(String(localCfg.combatChance)) || undefined,
      gatherChance: parseFloat(String(localCfg.gatherChance)) || undefined,
      rogueChance: parseFloat(String(localCfg.rogueChance)) || undefined,
      gameEnabled: Boolean(localCfg.gameEnabled),
      maintenanceMsg: String(localCfg.maintenanceMsg || ""),
      // 注靈配置
      infuseMinGain: parseFloat(String(localCfg.infuseMinGain)) || undefined,
      infuseMaxGain: parseFloat(String(localCfg.infuseMaxGain)) || undefined,
      infuseFailRate: parseFloat(String(localCfg.infuseFailRate)) || undefined,
      infuseMaxWuxing: parseFloat(String(localCfg.infuseMaxWuxing)) || undefined,
      // 戰鬥經驗倍率
      rewardMultIdle: parseFloat(String(localCfg.rewardMultIdle)) || undefined,
      rewardMultClosed: parseFloat(String(localCfg.rewardMultClosed)) || undefined,
      rewardMultOpen: parseFloat(String(localCfg.rewardMultOpen)) || undefined,
      // 掛機循環
      afkTickIntervalMs: parseInt(String(localCfg.afkTickIntervalMs)) || undefined,
      afkTickEnabled: typeof localCfg.afkTickEnabled === 'boolean' ? localCfg.afkTickEnabled : undefined,
      // 屬性平衡參數
      statLvHpMult: parseFloat(String(localCfg.statLvHpMult)) || undefined,
      statLvHpBase: parseFloat(String(localCfg.statLvHpBase)) || undefined,
      statLvAtkMult: parseFloat(String(localCfg.statLvAtkMult)) || undefined,
      statLvAtkBase: parseFloat(String(localCfg.statLvAtkBase)) || undefined,
      statLvDefMult: parseFloat(String(localCfg.statLvDefMult)) || undefined,
      statLvDefBase: parseFloat(String(localCfg.statLvDefBase)) || undefined,
      statLvSpdMult: parseFloat(String(localCfg.statLvSpdMult)) || undefined,
      statLvSpdBase: parseFloat(String(localCfg.statLvSpdBase)) || undefined,
      statLvMpMult: parseFloat(String(localCfg.statLvMpMult)) || undefined,
      statLvMpBase: parseFloat(String(localCfg.statLvMpBase)) || undefined,
      infuseHpPer100: parseFloat(String(localCfg.infuseHpPer100)) || undefined,
      infuseAtkPer100: parseFloat(String(localCfg.infuseAtkPer100)) || undefined,
      infuseDefPer100: parseFloat(String(localCfg.infuseDefPer100)) || undefined,
      infuseSpdPer100: parseFloat(String(localCfg.infuseSpdPer100)) || undefined,
      infuseMpPer100: parseFloat(String(localCfg.infuseMpPer100)) || undefined,
      resistMaxPct: parseFloat(String(localCfg.resistMaxPct)) || undefined,
      combatAtkCoeff: parseFloat(String(localCfg.combatAtkCoeff)) || undefined,
      combatDefCoeff: parseFloat(String(localCfg.combatDefCoeff)) || undefined,
      // 屬性上限
      statCapHp: parseInt(String(localCfg.statCapHp)) || undefined,
      statCapMp: parseInt(String(localCfg.statCapMp)) || undefined,
      statCapAtk: parseInt(String(localCfg.statCapAtk)) || undefined,
      statCapDef: parseInt(String(localCfg.statCapDef)) || undefined,
      statCapSpd: parseInt(String(localCfg.statCapSpd)) || undefined,
      statCapMatk: parseInt(String(localCfg.statCapMatk)) || undefined,
      statCapMdef: parseInt(String(localCfg.statCapMdef)) || undefined,
      wuxingCap: parseInt(String(localCfg.wuxingCap)) || undefined,
      sellDiscountRate: parseFloat(String(localCfg.sellDiscountRate)) || undefined,
      // 戰鬥倒數計時
      battleTurnTimerPvE: parseInt(String(localCfg.battleTurnTimerPvE)),
      battleTurnTimerBoss: parseInt(String(localCfg.battleTurnTimerBoss)),
      battleTurnTimerPvP: parseInt(String(localCfg.battleTurnTimerPvP)),
      // Boss 系統
      bossSystemEnabled: typeof localCfg.bossSystemEnabled === 'boolean' ? localCfg.bossSystemEnabled : undefined,
      bossT1MaxCount: parseInt(String(localCfg.bossT1MaxCount)) || undefined,
      bossT1MoveInterval: parseInt(String(localCfg.bossT1MoveInterval)) || undefined,
      bossT2MoveInterval: parseInt(String(localCfg.bossT2MoveInterval)) || undefined,
    });
  };

  const MULTIPLIER_FIELDS = [
    { key: "expMultiplier",  label: "📈 經驗値倍率",   min: 0.1, max: 10, step: 0.1, desc: "1.0 = 正常，2.0 = 雙倍經驗" },
    { key: "goldMultiplier", label: "🪙 金幣倍率",     min: 0.1, max: 10, step: 0.1, desc: "1.0 = 正常，2.0 = 雙倍金幣" },
    { key: "dropMultiplier", label: "🎁 採集掉落倍率", min: 0.1, max: 10, step: 0.1, desc: "1.0 = 正常，2.0 = 雙倍材料" },
  ];

  const CHANCE_FIELDS = [
    { key: "combatChance", label: "⚔️ 戰鬥機率", min: 0, max: 0.95, step: 0.05, desc: "預設 0.65，越高戰鬥越多" },
    { key: "gatherChance", label: "🌿 採集機率", min: 0, max: 0.95, step: 0.05, desc: "預設 0.20，越高採集越多" },
    { key: "rogueChance",  label: "🎲 奇遇機率", min: 0, max: 0.50, step: 0.01, desc: "預設 0.05，越高奇遇越多" },
  ];

  return (
    <div className="space-y-6">
      {/* 遊戲開關 */}
      <Card className={!localCfg.gameEnabled ? "border-red-500/40" : ""}>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">🔮 遊戲開關</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {localCfg.gameEnabled ? "遊戲運行中，Tick 正常執行" : "維護模式，所有 Tick 暫停"}
              </p>
            </div>
            <Switch
              checked={Boolean(localCfg.gameEnabled)}
              onCheckedChange={v => handleChange("gameEnabled", v)}
            />
          </div>
          {!localCfg.gameEnabled && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground mb-1">維護公告（玩家看到的訊息）</p>
              <Input
                value={String(localCfg.maintenanceMsg ?? "")}
                onChange={e => handleChange("maintenanceMsg", e.target.value)}
                placeholder="系統維護中，請稍後再試"
                className="text-sm"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tick 間隔 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">⏱ Tick 間隔（伺服器自動執行）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              value={String(localCfg.tickIntervalMs ?? "300000")}
              onChange={e => handleChange("tickIntervalMs", e.target.value)}
              min={5000} max={1800000} step={5000}
              className="h-8 text-sm flex-1"
            />
            <span className="text-sm text-muted-foreground shrink-0">
              = {(parseInt(String(localCfg.tickIntervalMs ?? 300000)) / 1000 / 60).toFixed(1)} 分鐘
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">預設 300000 ms（5 分鐘），最小 5000 ms（5 秒）。調整後引擎自動重啟。</p>
        </CardContent>
      </Card>

      {/* 倍率調控 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">🌟 全域倍率調控</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {MULTIPLIER_FIELDS.map(f => (
              <div key={f.key}>
                <p className="text-xs font-medium mb-1">{f.label}</p>
                <p className="text-[10px] text-muted-foreground mb-1.5">{f.desc}</p>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={f.min} max={f.max} step={f.step}
                    value={parseFloat(String(localCfg[f.key] ?? 1))}
                    onChange={e => handleChange(f.key, e.target.value)}
                    className="flex-1 accent-amber-500"
                  />
                  <span className="text-sm font-bold tabular-nums w-10 text-right">
                    {parseFloat(String(localCfg[f.key] ?? 1)).toFixed(1)}x
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 機率調控 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">🎲 事件機率調控</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {CHANCE_FIELDS.map(f => (
              <div key={f.key}>
                <p className="text-xs font-medium mb-1">{f.label}</p>
                <p className="text-[10px] text-muted-foreground mb-1.5">{f.desc}</p>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={f.min} max={f.max} step={f.step}
                    value={parseFloat(String(localCfg[f.key] ?? 0))}
                    onChange={e => handleChange(f.key, e.target.value)}
                    className="flex-1 accent-amber-500"
                  />
                  <span className="text-sm font-bold tabular-nums w-12 text-right">
                    {(parseFloat(String(localCfg[f.key] ?? 0)) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            注意：三種機率合計建議不超過 90%，剩餘為移動事件。
          </p>
        </CardContent>
      </Card>

      {/* 戰鬥經驗倍率配置 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">⚔️ 戰鬥經驗倍率配置</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { key: "rewardMultIdle", label: "💤 掛機模式 (idle)", desc: "伺服器自動掛機時的經驗倍率", min: 0, max: 3, step: 0.01 },
              { key: "rewardMultClosed", label: "📱 關閉戰鬥視窗 (closed)", desc: "玩家在線但未打開戰鬥畫面", min: 0, max: 5, step: 0.1 },
              { key: "rewardMultOpen", label: "👁️ 打開戰鬥視窗 (open)", desc: "玩家主動觀看戰鬥過程", min: 0, max: 5, step: 0.1 },
            ].map(f => (
              <div key={f.key}>
                <p className="text-xs font-medium mb-1">{f.label}</p>
                <p className="text-[10px] text-muted-foreground mb-1.5">{f.desc}</p>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={f.min} max={f.max} step={f.step}
                    value={parseFloat(String(localCfg[f.key] ?? 1))}
                    onChange={e => handleChange(f.key, e.target.value)}
                    className="flex-1 accent-red-500"
                  />
                  <span className="text-sm font-bold tabular-nums w-12 text-right">
                    {parseFloat(String(localCfg[f.key] ?? 1)).toFixed(2)}x
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            戰鬥結算時根據玩家狀態套用不同倍率。idle = 伺服器自動掛機，closed = 玩家在線但未看戰鬥，open = 玩家正在觀看戰鬥。
          </p>
        </CardContent>
      </Card>

      {/* 掛機循環引擎配置 */}
      <Card className={!localCfg.afkTickEnabled ? "border-amber-500/40" : ""}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">🔄 掛機循環引擎 (AFK Tick)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-medium">啟用伺服器端掛機循環</p>
              <p className="text-[10px] text-muted-foreground">關閉後玩家離線將不會自動執行行動</p>
            </div>
            <Switch
              checked={Boolean(localCfg.afkTickEnabled)}
              onCheckedChange={v => handleChange("afkTickEnabled", v)}
            />
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1">
              <p className="text-xs font-medium mb-1">循環間隔</p>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={String(localCfg.afkTickIntervalMs ?? "15000")}
                  onChange={e => handleChange("afkTickIntervalMs", e.target.value)}
                  min={5000} max={120000} step={1000}
                  className="h-8 text-sm"
                />
                <span className="text-sm text-muted-foreground shrink-0">
                  = {(parseInt(String(localCfg.afkTickIntervalMs ?? 15000)) / 1000).toFixed(0)} 秒
                </span>
              </div>
            </div>
          </div>
          {afkStatus && (
            <div className="flex items-center gap-3 text-xs">
              <div className={`w-2 h-2 rounded-full ${afkStatus.running ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
              <span className="text-muted-foreground">
                引擎狀態：{afkStatus.running ? "運行中" : "已停止"}
                {" | "}間隔：{(afkStatus.intervalMs / 1000).toFixed(0)} 秒
                {" | "}{afkStatus.enabled ? "已啟用" : "已停用"}
              </span>
              <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => restartAfk.mutate()} disabled={restartAfk.isPending}>
                {restartAfk.isPending ? "重啟中…" : "手動重啟"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 戰鬥倒數計時配置 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">⏱ 戰鬥回合倒數計時</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[10px] text-muted-foreground mb-3">設定各模式的回合倒數秒數，0 = 不限制。倒數結束時自動提交普攻。</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-medium mb-1">⚔️ 個人戰 (PvE)</p>
              <div className="flex items-center gap-2">
                <input type="range" min={0} max={120} step={5}
                  value={parseInt(String(localCfg.battleTurnTimerPvE ?? 30))}
                  onChange={e => handleChange("battleTurnTimerPvE", e.target.value)}
                  className="flex-1 accent-blue-500" />
                <span className="text-sm font-bold tabular-nums w-12 text-right">
                  {parseInt(String(localCfg.battleTurnTimerPvE ?? 30)) === 0 ? "無限" : `${parseInt(String(localCfg.battleTurnTimerPvE ?? 30))}s`}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium mb-1">👹 Boss 戰</p>
              <div className="flex items-center gap-2">
                <input type="range" min={0} max={120} step={5}
                  value={parseInt(String(localCfg.battleTurnTimerBoss ?? 20))}
                  onChange={e => handleChange("battleTurnTimerBoss", e.target.value)}
                  className="flex-1 accent-red-500" />
                <span className="text-sm font-bold tabular-nums w-12 text-right">
                  {parseInt(String(localCfg.battleTurnTimerBoss ?? 20)) === 0 ? "無限" : `${parseInt(String(localCfg.battleTurnTimerBoss ?? 20))}s`}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium mb-1">🤺 PvP 戰</p>
              <div className="flex items-center gap-2">
                <input type="range" min={0} max={120} step={5}
                  value={parseInt(String(localCfg.battleTurnTimerPvP ?? 15))}
                  onChange={e => handleChange("battleTurnTimerPvP", e.target.value)}
                  className="flex-1 accent-purple-500" />
                <span className="text-sm font-bold tabular-nums w-12 text-right">
                  {parseInt(String(localCfg.battleTurnTimerPvP ?? 15)) === 0 ? "無限" : `${parseInt(String(localCfg.battleTurnTimerPvP ?? 15))}s`}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Boss 系統配置 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">👹 Boss 系統配置</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-medium">啟用 Boss 系統</p>
              <p className="text-[10px] text-muted-foreground">開啟後 Boss 會按排程自動生成</p>
            </div>
            <Switch
              checked={Boolean(localCfg.bossSystemEnabled)}
              onCheckedChange={v => handleChange("bossSystemEnabled", v)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-medium mb-1">T1 最大數量</p>
              <Input type="number" value={String(localCfg.bossT1MaxCount ?? 5)}
                onChange={e => handleChange("bossT1MaxCount", e.target.value)}
                min={0} max={20} className="h-8 text-sm" />
            </div>
            <div>
              <p className="text-xs font-medium mb-1">T1 移動間隔(秒)</p>
              <Input type="number" value={String(localCfg.bossT1MoveInterval ?? 300)}
                onChange={e => handleChange("bossT1MoveInterval", e.target.value)}
                min={60} max={3600} className="h-8 text-sm" />
            </div>
            <div>
              <p className="text-xs font-medium mb-1">T2 移動間隔(秒)</p>
              <Input type="number" value={String(localCfg.bossT2MoveInterval ?? 600)}
                onChange={e => handleChange("bossT2MoveInterval", e.target.value)}
                min={60} max={7200} className="h-8 text-sm" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 注靈指令配置 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">✨ 注靈指令配置</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium mb-1">📉 最小截取値</p>
              <p className="text-[10px] text-muted-foreground mb-1.5">注靈成功時最小獲得五行值（預設 0.1）</p>
              <div className="flex items-center gap-2">
                <input type="range" min={0.01} max={2} step={0.01}
                  value={parseFloat(String(localCfg.infuseMinGain ?? 0.1))}
                  onChange={e => handleChange("infuseMinGain", e.target.value)}
                  className="flex-1 accent-purple-500" />
                <span className="text-sm font-bold tabular-nums w-12 text-right">
                  {parseFloat(String(localCfg.infuseMinGain ?? 0.1)).toFixed(2)}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium mb-1">📈 最大截取値</p>
              <p className="text-[10px] text-muted-foreground mb-1.5">注靈成功時最大獲得五行値（預設 0.5）</p>
              <div className="flex items-center gap-2">
                <input type="range" min={0.01} max={5} step={0.01}
                  value={parseFloat(String(localCfg.infuseMaxGain ?? 0.5))}
                  onChange={e => handleChange("infuseMaxGain", e.target.value)}
                  className="flex-1 accent-purple-500" />
                <span className="text-sm font-bold tabular-nums w-12 text-right">
                  {parseFloat(String(localCfg.infuseMaxGain ?? 0.5)).toFixed(2)}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium mb-1">🎲 失敗機率</p>
              <p className="text-[10px] text-muted-foreground mb-1.5">注靈失敗機率（預設 20%）</p>
              <div className="flex items-center gap-2">
                <input type="range" min={0} max={0.99} step={0.01}
                  value={parseFloat(String(localCfg.infuseFailRate ?? 0.2))}
                  onChange={e => handleChange("infuseFailRate", e.target.value)}
                  className="flex-1 accent-red-500" />
                <span className="text-sm font-bold tabular-nums w-12 text-right">
                  {(parseFloat(String(localCfg.infuseFailRate ?? 0.2)) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium mb-1">🔝 五行値上限</p>
              <p className="text-[10px] text-muted-foreground mb-1.5">注靈累積上限（預設 100）</p>
              <div className="flex items-center gap-2">
                <input type="range" min={10} max={999} step={1}
                  value={parseFloat(String(localCfg.infuseMaxWuxing ?? 100))}
                  onChange={e => handleChange("infuseMaxWuxing", e.target.value)}
                  className="flex-1 accent-amber-500" />
                <span className="text-sm font-bold tabular-nums w-14 text-right">
                  {parseFloat(String(localCfg.infuseMaxWuxing ?? 100)).toFixed(0)}
                </span>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            注靈指令：玩家在節點上截取屬性五行能量，每次 Tick 有失敗機率，成功則獲得 min~max 之間隨機値。
          </p>
        </CardContent>
      </Card>

      {/* 屬性平衡參數（GD-024） */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">⚔️ 屬性平衡參數（GD-024）</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[10px] text-muted-foreground mb-3">
            公式：HP = Lv × 升級係數 + 基礎值 + 注靈加成。調整後立即生效，下次 AFK tick 會重新計算所有角色屬性。
          </p>
          <div className="space-y-4">
            {/* 升級係數 */}
            <div>
              <p className="text-xs font-semibold text-amber-400 mb-2">升級係數（每級加成）</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { key: "statLvHpMult", label: "❤️ HP", def: 12, min: 1, max: 50 },
                  { key: "statLvAtkMult", label: "⚔️ ATK", def: 8, min: 1, max: 30 },
                  { key: "statLvDefMult", label: "🛡️ DEF", def: 8, min: 1, max: 30 },
                  { key: "statLvSpdMult", label: "💨 SPD", def: 6, min: 1, max: 30 },
                  { key: "statLvMpMult", label: "💧 MP", def: 8, min: 1, max: 30 },
                ].map(f => (
                  <div key={f.key}>
                    <p className="text-[10px] text-muted-foreground mb-1">{f.label} × Lv</p>
                    <Input type="number" value={String(localCfg[f.key] ?? f.def)}
                      onChange={e => handleChange(f.key, e.target.value)}
                      min={f.min} max={f.max} step={1} className="h-7 text-xs" />
                  </div>
                ))}
              </div>
            </div>
            {/* 基礎值 */}
            <div>
              <p className="text-xs font-semibold text-blue-400 mb-2">基礎值（初始加成）</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { key: "statLvHpBase", label: "❤️ HP", def: 80, min: 0, max: 500 },
                  { key: "statLvAtkBase", label: "⚔️ ATK", def: 15, min: 0, max: 200 },
                  { key: "statLvDefBase", label: "🛡️ DEF", def: 15, min: 0, max: 200 },
                  { key: "statLvSpdBase", label: "💨 SPD", def: 10, min: 0, max: 200 },
                  { key: "statLvMpBase", label: "💧 MP", def: 40, min: 0, max: 500 },
                ].map(f => (
                  <div key={f.key}>
                    <p className="text-[10px] text-muted-foreground mb-1">{f.label} 基礎</p>
                    <Input type="number" value={String(localCfg[f.key] ?? f.def)}
                      onChange={e => handleChange(f.key, e.target.value)}
                      min={f.min} max={f.max} step={1} className="h-7 text-xs" />
                  </div>
                ))}
              </div>
            </div>
            {/* 注靈加成（每 100 點五行） */}
            <div>
              <p className="text-xs font-semibold text-green-400 mb-2">注靈加成（每 100 點五行）</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { key: "infuseHpPer100", label: "🌲木→HP", def: 30, min: 0, max: 200 },
                  { key: "infuseAtkPer100", label: "🔥火→ATK", def: 30, min: 0, max: 200 },
                  { key: "infuseDefPer100", label: "⛰️土→DEF", def: 30, min: 0, max: 200 },
                  { key: "infuseSpdPer100", label: "🪙金→SPD", def: 20, min: 0, max: 200 },
                  { key: "infuseMpPer100", label: "🌊水→MP", def: 20, min: 0, max: 200 },
                ].map(f => (
                  <div key={f.key}>
                    <p className="text-[10px] text-muted-foreground mb-1">{f.label}</p>
                    <Input type="number" value={String(localCfg[f.key] ?? f.def)}
                      onChange={e => handleChange(f.key, e.target.value)}
                      min={f.min} max={f.max} step={1} className="h-7 text-xs" />
                  </div>
                ))}
              </div>
            </div>
            {/* 戰鬥係數 & 抗性 */}
            <div>
              <p className="text-xs font-semibold text-red-400 mb-2">戰鬥係數 & 抗性</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">攻擊係數 (ATK×?)</p>
                  <Input type="number" value={String(localCfg.combatAtkCoeff ?? 1.5)}
                    onChange={e => handleChange("combatAtkCoeff", e.target.value)}
                    min={0.1} max={5} step={0.1} className="h-7 text-xs" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">防禦係數 (DEF×?)</p>
                  <Input type="number" value={String(localCfg.combatDefCoeff ?? 0.5)}
                    onChange={e => handleChange("combatDefCoeff", e.target.value)}
                    min={0.1} max={5} step={0.1} className="h-7 text-xs" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">抗性上限 (%)</p>
                  <Input type="number" value={String(localCfg.resistMaxPct ?? 50)}
                    onChange={e => handleChange("resistMaxPct", e.target.value)}
                    min={1} max={90} step={1} className="h-7 text-xs" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 屬性上限設定 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">📊 屬性上限設定</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[10px] text-muted-foreground mb-3">
            所有角色屬性不會超過此上限。調整後立即生效。
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { key: "statCapHp", label: "❤️ HP 上限", def: 99999 },
              { key: "statCapMp", label: "💧 MP 上限", def: 9999 },
              { key: "statCapAtk", label: "⚔️ ATK 上限", def: 1500 },
              { key: "statCapDef", label: "🛡️ DEF 上限", def: 1500 },
              { key: "statCapSpd", label: "💨 SPD 上限", def: 1500 },
              { key: "statCapMatk", label: "✨ MATK 上限", def: 1500 },
              { key: "statCapMdef", label: "🔮 MDEF 上限", def: 1500 },
              { key: "wuxingCap", label: "☀️ 五行上限", def: 100 },
            ].map(f => (
              <div key={f.key}>
                <p className="text-[10px] text-muted-foreground mb-1">{f.label}</p>
                <Input type="number" value={String(localCfg[f.key] ?? f.def)}
                  onChange={e => handleChange(f.key, e.target.value)}
                  min={10} max={999999} step={1} className="h-7 text-xs" />
              </div>
            ))}
          </div>
          <div className="mt-3">
            <p className="text-[10px] text-muted-foreground mb-1">💰 販售折扣率（賣出價格 = 原價 × 此值）</p>
            <div className="flex items-center gap-2 max-w-xs">
              <input type="range" min={0.01} max={1} step={0.01}
                value={parseFloat(String(localCfg.sellDiscountRate ?? 0.5))}
                onChange={e => handleChange("sellDiscountRate", e.target.value)}
                className="flex-1 accent-amber-500" />
              <span className="text-sm font-bold tabular-nums w-12 text-right">
                {(parseFloat(String(localCfg.sellDiscountRate ?? 0.5)) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 操作按鈕 */}
      <div className="flex gap-3">
        <Button
          onClick={handleSave}
          disabled={!isDirty || updateConfig.isPending}
          className="flex-1">
          {updateConfig.isPending ? "儲存中…" : "✅ 儲存引擎配置（立即生效）"}
        </Button>
        <Button
          variant="outline"
          onClick={() => resetConfig.mutate()}
          disabled={resetConfig.isPending}>
          {resetConfig.isPending ? "重置中…" : "↩ 重置預設"}
        </Button>
      </div>

      {/* 目前生效狀態 */}
      {cfg && (
        <Card className="border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">目前伺服器生效狀態</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded bg-muted/30">
                <p className="text-muted-foreground">遊戲狀態</p>
                <p className="font-bold mt-0.5" style={{ color: cfg.gameEnabled ? "#22c55e" : "#ef4444" }}>
                  {cfg.gameEnabled ? "運行中" : "維護中"}
                </p>
              </div>
              <div className="p-2 rounded bg-muted/30">
                <p className="text-muted-foreground">Tick 間隔</p>
                <p className="font-bold mt-0.5">{(cfg.tickIntervalMs / 60000).toFixed(1)} 分鐘</p>
              </div>
              <div className="p-2 rounded bg-muted/30">
                <p className="text-muted-foreground">經驗/金幣倍率</p>
                <p className="font-bold mt-0.5">{cfg.expMultiplier}x / {cfg.goldMultiplier}x</p>
              </div>
              <div className="p-2 rounded bg-muted/30">
                <p className="text-muted-foreground">戰鬥/採集/奇遇</p>
                <p className="font-bold mt-0.5">{(cfg.combatChance*100).toFixed(0)}% / {(cfg.gatherChance*100).toFixed(0)}% / {(cfg.rogueChance*100).toFixed(0)}%</p>
              </div>
              <div className="p-2 rounded bg-muted/30">
                <p className="text-muted-foreground">戰鬥經驗倍率</p>
                <p className="font-bold mt-0.5">
                  💤{(cfg as any).rewardMultIdle ?? 0.33}x / 📱{(cfg as any).rewardMultClosed ?? 1.0}x / 👁️{(cfg as any).rewardMultOpen ?? 1.5}x
                </p>
              </div>
              <div className="p-2 rounded bg-muted/30">
                <p className="text-muted-foreground">AFK 循環</p>
                <p className="font-bold mt-0.5" style={{ color: (cfg as any).afkTickEnabled ? "#22c55e" : "#ef4444" }}>
                  {(cfg as any).afkTickEnabled ? `運行中 (${((cfg as any).afkTickIntervalMs ?? 15000) / 1000}s)` : "已停用"}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              最後更新：{new Date(cfg.lastUpdatedAt).toLocaleString("zh-TW")} by {cfg.lastUpdatedBy}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── 奇遇事件管理 Tab ─────────────────────────────────────────────────────────────────────────────────────
const REWARD_TYPE_LABELS: Record<string, string> = {
  gold: "💰 金幣",
  exp: "⭐ 經驗",
  item: "📦 道具",
  heal: "💚 治療",
  buff: "✨ 增益",
  debuff: "💀 減益",
  mixed: "🎁 混合",
};

function RogueEventTab() {
  const { data: rogueEvents, refetch } = trpc.gameAdmin.getRogueEvents.useQuery();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    eventId: "",
    name: "",
    description: "",
    icon: "✨",
    rewardType: "gold" as "gold" | "exp" | "item" | "heal" | "buff" | "debuff" | "mixed",
    goldMin: 0,
    goldMax: 0,
    expReward: 0,
    hpChange: 0,
    healFull: 0,
    itemRewardId: "",
    itemRewardQty: 0,
    weight: 10,
    isActive: 1,
    wuxingFilter: "",
    minLevel: 0,
  });

  const createMutation = trpc.gameAdmin.createRogueEvent.useMutation({
    onSuccess: () => { toast.success("奇遇事件已新增"); refetch(); setShowForm(false); resetForm(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.gameAdmin.updateRogueEvent.useMutation({
    onSuccess: () => { toast.success("奇遇事件已更新"); refetch(); setShowForm(false); setEditingId(null); resetForm(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.gameAdmin.deleteRogueEvent.useMutation({
    onSuccess: () => { toast.success("奇遇事件已刪除"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const toggleMutation = trpc.gameAdmin.updateRogueEvent.useMutation({
    onSuccess: () => refetch(),
  });

  function resetForm() {
    setForm({ eventId: "", name: "", description: "", icon: "✨", rewardType: "gold", goldMin: 0, goldMax: 0, expReward: 0, hpChange: 0, healFull: 0, itemRewardId: "", itemRewardQty: 0, weight: 10, isActive: 1, wuxingFilter: "", minLevel: 0 });
  }

  function startEdit(e: typeof rogueEvents extends (infer T)[] | undefined ? T : never) {
    if (!e) return;
    setEditingId((e as any).id);
    setForm({
      eventId: (e as any).eventId,
      name: (e as any).name,
      description: (e as any).description,
      icon: (e as any).icon || "✨",
      rewardType: (e as any).rewardType,
      goldMin: (e as any).goldMin,
      goldMax: (e as any).goldMax,
      expReward: (e as any).expReward,
      hpChange: (e as any).hpChange,
      healFull: (e as any).healFull,
      itemRewardId: (e as any).itemRewardId || "",
      itemRewardQty: (e as any).itemRewardQty,
      weight: (e as any).weight,
      isActive: (e as any).isActive,
      wuxingFilter: (e as any).wuxingFilter || "",
      minLevel: (e as any).minLevel,
    });
    setShowForm(true);
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.description.trim()) {
      toast.error("請填寫事件名稱和描述");
      return;
    }
    if (editingId !== null) {
      updateMutation.mutate({ id: editingId, data: { ...form, rewardType: form.rewardType as "gold" | "exp" | "item" | "heal" | "buff" | "debuff" | "mixed" } });
    } else {
      if (!form.eventId.trim()) { toast.error("請填寫事件 ID"); return; }
      createMutation.mutate({ ...form, rewardType: form.rewardType as "gold" | "exp" | "item" | "heal" | "buff" | "debuff" | "mixed" });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">🎲 奇遇事件管理</h3>
          <p className="text-sm text-muted-foreground mt-1">管理玩家在探索時可能觸發的奇遇事件。每個事件有獨立的觸發權重、獎勵設定和屬性/等級過濾條件。</p>
        </div>
        <Button onClick={() => { setShowForm(!showForm); setEditingId(null); resetForm(); }} variant="outline" size="sm">
          {showForm ? "取消" : "+ 新增奇遇"}
        </Button>
      </div>

      {/* 新增/編輯表單 */}
      {showForm && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader><CardTitle className="text-base">{editingId ? "✏️ 編輯奇遇事件" : "➕ 新增奇遇事件"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {!editingId && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">事件 ID（英文小寫+底線）</label>
                  <Input placeholder="treasure_chest" value={form.eventId} onChange={e => setForm(f => ({...f, eventId: e.target.value}))} />
                </div>
              )}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">事件名稱</label>
                <Input placeholder="神秘寶笱" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">圖示 Emoji</label>
                <Input placeholder="✨" value={form.icon} onChange={e => setForm(f => ({...f, icon: e.target.value}))} className="w-20" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">事件描述（玩家看到的文字）</label>
              <Input placeholder="發現了一個神秘的寶笱..." value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">獎勵類型</label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.rewardType} onChange={e => setForm(f => ({...f, rewardType: e.target.value as "gold" | "exp" | "item" | "heal" | "buff" | "debuff" | "mixed"}))}>
                  {Object.entries(REWARD_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">金幣最小值</label>
                <Input type="number" value={form.goldMin} onChange={e => setForm(f => ({...f, goldMin: parseInt(e.target.value)||0}))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">金幣最大值</label>
                <Input type="number" value={form.goldMax} onChange={e => setForm(f => ({...f, goldMax: parseInt(e.target.value)||0}))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">經驗獎勵</label>
                <Input type="number" value={form.expReward} onChange={e => setForm(f => ({...f, expReward: parseInt(e.target.value)||0}))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">HP 變化（負=損失）</label>
                <Input type="number" value={form.hpChange} onChange={e => setForm(f => ({...f, hpChange: parseInt(e.target.value)||0}))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">全量治療 HP</label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.healFull} onChange={e => setForm(f => ({...f, healFull: parseInt(e.target.value)}))}>
                  <option value={0}>否</option>
                  <option value={1}>是</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">道具 ID（選填）</label>
                <Input placeholder="potion-001" value={form.itemRewardId} onChange={e => setForm(f => ({...f, itemRewardId: e.target.value}))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">道具數量</label>
                <Input type="number" value={form.itemRewardQty} onChange={e => setForm(f => ({...f, itemRewardQty: parseInt(e.target.value)||0}))} />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">觸發權重（越高越常觸發）</label>
                <Input type="number" min={1} value={form.weight} onChange={e => setForm(f => ({...f, weight: parseInt(e.target.value)||10}))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">最低等級限制</label>
                <Input type="number" min={0} value={form.minLevel} onChange={e => setForm(f => ({...f, minLevel: parseInt(e.target.value)||0}))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">屬性限制（空=全部）</label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.wuxingFilter} onChange={e => setForm(f => ({...f, wuxingFilter: e.target.value}))}>
                  <option value="">全部屬性</option>
                  <option value="木">🌿 木</option>
                  <option value="火">🔥 火</option>
                  <option value="土">🌍 土</option>
                  <option value="金">⚡ 金</option>
                  <option value="水">💧 水</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">啟用狀態</label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.isActive} onChange={e => setForm(f => ({...f, isActive: parseInt(e.target.value)}))}>
                  <option value={1}>✅ 啟用</option>
                  <option value={0}>❌ 停用</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingId ? "💾 儲存變更" : "➕ 新增事件"}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }}>取消</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 事件列表 */}
      <div className="space-y-2">
        {!rogueEvents?.length && <p className="text-muted-foreground text-center py-8">尚無奇遇事件，點擊「新增奇遇」開始建立。</p>}
        {rogueEvents?.map(e => (
          <Card key={(e as any).id} className={`transition-opacity ${(e as any).isActive ? "" : "opacity-50"}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">{(e as any).icon || "✨"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{(e as any).name}</span>
                    <Badge variant="outline" className="text-xs">{(e as any).eventId}</Badge>
                    <Badge variant={(e as any).isActive ? "default" : "secondary"} className="text-xs">
                      {(e as any).isActive ? "啟用" : "停用"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">{REWARD_TYPE_LABELS[(e as any).rewardType] || (e as any).rewardType}</Badge>
                    <span className="text-xs text-muted-foreground">權重 {(e as any).weight}</span>
                    {(e as any).minLevel > 0 && <span className="text-xs text-muted-foreground">Lv.{(e as any).minLevel}+</span>}
                    {(e as any).wuxingFilter && <span className="text-xs text-muted-foreground">{(e as any).wuxingFilter}屬性</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{(e as any).description}</p>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    {((e as any).goldMin > 0 || (e as any).goldMax > 0) && <span>💰 {(e as any).goldMin}~{(e as any).goldMax} 金幣</span>}
                    {(e as any).expReward > 0 && <span>⭐ +{(e as any).expReward} EXP</span>}
                    {(e as any).hpChange !== 0 && <span>{(e as any).hpChange > 0 ? "💚" : "💔"} {(e as any).hpChange > 0 ? "+" : ""}{(e as any).hpChange} HP</span>}
                    {(e as any).healFull === 1 && <span>💚 全量治療</span>}
                    {(e as any).itemRewardId && <span>📦 {(e as any).itemRewardId} x{(e as any).itemRewardQty}</span>}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => toggleMutation.mutate({ id: (e as any).id, data: { isActive: (e as any).isActive ? 0 : 1 } })}>
                    {(e as any).isActive ? "停用" : "啟用"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => startEdit(e)}>編輯</Button>
                  <Button size="sm" variant="destructive" onClick={() => { if (confirm(`確定刪除「${(e as any).name}」？`)) deleteMutation.mutate({ id: (e as any).id }); }}>刪除</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ──// ─── 世界事件 Tab ────────────────────────────────────────────────────────────────────────────────────
const EVENT_TYPE_LABELS: Record<string, string> = {
  weather_change:   "🌤️ 天氣變化",
  global_blessing:  "✨ 全服祝福",
  hidden_npc:       "👤 隱藏 NPC",
  hidden_quest:     "📜 隱藏任務",
  elemental_surge:  "⚡ 天災/祥瑞",
  meteor_shower:    "🌠 流星雨",
  divine_arrival:   "🌟 神明降臨",
  ap_regen:         "🔵 靈力回復",
  manual:           "🔧 手動觸發",
};

function WorldEventTab() {
  const { data: worldStatus, refetch: refetchStatus } = trpc.gameAdmin.getWorldTickStatus.useQuery();
  const { data: worldEvents, refetch: refetchEvents } = trpc.gameAdmin.getWorldEvents.useQuery({ limit: 30 });
  const [editingConfig, setEditingConfig] = useState<Record<string, { enabled: boolean; probability: number }>>({});
  const [hasConfigChanges, setHasConfigChanges] = useState(false);

  const triggerWorldTick = trpc.gameAdmin.triggerWorldTick.useMutation({
    onSuccess: (result) => {
      toast.success(`✅ 世界 Tick 執行完成！${result.apRegen} 位旅人獲得 +1 AP，世界事件：${result.worldEventType ?? "無"} `);
      refetchStatus();
      refetchEvents();
    },
    onError: (err) => toast.error(`❌ 世界 Tick 失敗：${err.message}`),
  });

  const toggleEngine = trpc.gameAdmin.toggleWorldTickEngine.useMutation({
    onSuccess: (r) => {
      toast.success(r.isRunning ? "✅ 世界 Tick 引擎已啟動" : "⏸️ 世界 Tick 引擎已停止");
      refetchStatus();
    },
  });

  const updateConfig = trpc.gameAdmin.updateWorldEventConfig.useMutation({
    onSuccess: () => {
      toast.success("✅ 世界事件機率已更新");
      setHasConfigChanges(false);
      refetchStatus();
    },
  });

  // 初始化編輯配置
  const cfg = worldStatus?.config;
  const editCfg = Object.keys(editingConfig).length > 0 ? editingConfig : (cfg ? {
    weatherChange:   { enabled: cfg.weatherChange.enabled,   probability: cfg.weatherChange.probability },
    globalBlessing:  { enabled: cfg.globalBlessing.enabled,  probability: cfg.globalBlessing.probability },
    hiddenNpc:       { enabled: cfg.hiddenNpc.enabled,       probability: cfg.hiddenNpc.probability },
    hiddenQuest:     { enabled: cfg.hiddenQuest.enabled,     probability: cfg.hiddenQuest.probability },
    elementalSurge:  { enabled: cfg.elementalSurge.enabled,  probability: cfg.elementalSurge.probability },
    meteorShower:    { enabled: cfg.meteorShower.enabled,    probability: cfg.meteorShower.probability },
    divineArrival:   { enabled: cfg.divineArrival.enabled,   probability: cfg.divineArrival.probability },
  } : {});

  function handleProbChange(key: string, val: number) {
    setEditingConfig(prev => ({ ...prev, [key]: { ...(editCfg[key] ?? { enabled: true, probability: 0 }), probability: val } }));
    setHasConfigChanges(true);
  }
  function handleToggle(key: string, val: boolean) {
    setEditingConfig(prev => ({ ...prev, [key]: { ...(editCfg[key] ?? { enabled: true, probability: 0 }), enabled: val } }));
    setHasConfigChanges(true);
  }

  const ws = worldStatus?.worldState;
  const totalProb = Object.values(editCfg).reduce((sum, v) => sum + (v.enabled ? v.probability : 0), 0);

  const EVENT_CONFIG_LABELS: Record<string, string> = {
    weatherChange:   "🌤️ 天氣變化",
    globalBlessing:  "✨ 全服祝福",
    hiddenNpc:       "👤 隱藏 NPC",
    hiddenQuest:     "📜 隱藏任務",
    elementalSurge:  "⚡ 天災/祥瑞",
    meteorShower:    "🌠 流星雨",
    divineArrival:   "🌟 神明降臨",
  };

  return (
    <div className="space-y-6">
      {/* 世界狀態卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>🌍 當前世界狀態</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => toggleEngine.mutate({ running: !worldStatus?.isRunning })}
                disabled={toggleEngine.isPending}
              >
                {worldStatus?.isRunning ? "⏸️ 停止世界 Tick" : "▶️ 啟動世界 Tick"}
              </Button>
              <Button
                size="sm"
                onClick={() => triggerWorldTick.mutate()}
                disabled={triggerWorldTick.isPending}
              >
                {triggerWorldTick.isPending ? "執行中…" : "⚡ 手動觸發世界 Tick"}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-muted/40 rounded-lg p-3">
              <div className="text-xs text-muted-foreground">引擎狀態</div>
              <div className={`font-bold mt-1 ${worldStatus?.isRunning ? "text-green-500" : "text-red-500"}`}>
                {worldStatus?.isRunning ? "✅ 運行中" : "⏹️ 已停止"}
              </div>
            </div>
            <div className="bg-muted/40 rounded-lg p-3">
              <div className="text-xs text-muted-foreground">當前天氣</div>
              <div className="font-bold mt-1">
                {ws?.currentWeather === "wood" && "🌿 木"}
                {ws?.currentWeather === "fire" && "🔥 火"}
                {ws?.currentWeather === "earth" && "🏔️ 土"}
                {ws?.currentWeather === "metal" && "✨ 金"}
                {ws?.currentWeather === "water" && "💧 水"}
              </div>
            </div>
            <div className="bg-muted/40 rounded-lg p-3">
              <div className="text-xs text-muted-foreground">全服祝福</div>
              <div className="font-bold mt-1 text-sm">
                {ws?.activeBlessing
                  ? `✨ ${ws.activeBlessing.type === "exp" ? "經驗" : ws.activeBlessing.type === "gold" ? "金幣" : "摀落"} x${ws.activeBlessing.multiplier / 100}`
                  : "— 無"}
              </div>
            </div>
            <div className="bg-muted/40 rounded-lg p-3">
              <div className="text-xs text-muted-foreground">隱藏節點</div>
              <div className="font-bold mt-1 text-sm">
                {ws?.activeHiddenNodes?.length ? `${ws.activeHiddenNodes.length} 個活躍` : "— 無"}
              </div>
            </div>
          </div>
          {ws?.elementalSurge && (
            <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm">
              ⚡ 五行祥瑞：{ws.elementalSurge.element} {ws.elementalSurge.type === "boost" ? "大旺" : "衰弱"}
            </div>
          )}
          {ws?.meteorActive && (
            <div className="mt-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg text-sm">
              🌠 流星雨活躍！所有旅人下次行動必觸奇遇
            </div>
          )}
        </CardContent>
      </Card>

      {/* 事件機率調整 */}
      <Card>
        <CardHeader>
          <CardTitle>🎲 隨機事件機率調整</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">
            每次世界 Tick 會從下方事件池隨機選擇一個事件觸發。總機率建議不超過 100％。
            目前總機率：<span className={`font-bold ${totalProb > 100 ? "text-red-500" : "text-green-500"}`}>{totalProb}%</span>
          </p>
          <div className="space-y-3">
            {Object.entries(EVENT_CONFIG_LABELS).map(([key, label]) => {
              const val = editCfg[key] ?? { enabled: true, probability: 0 };
              return (
                <div key={key} className="flex items-center gap-3">
                  <Switch
                    checked={val.enabled}
                    onCheckedChange={(v) => handleToggle(key, v)}
                  />
                  <span className="w-32 text-sm">{label}</span>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    value={val.probability}
                    onChange={(e) => handleProbChange(key, Number(e.target.value))}
                    disabled={!val.enabled}
                    className="flex-1 accent-primary"
                  />
                  <span className="w-12 text-right text-sm font-mono">{val.probability}%</span>
                </div>
              );
            })}
          </div>
          {hasConfigChanges && (
            <Button
              className="mt-4 w-full"
              onClick={() => updateConfig.mutate(editCfg as Parameters<typeof updateConfig.mutate>[0])}
              disabled={updateConfig.isPending}
            >
              {updateConfig.isPending ? "儲存中…" : "💾 儲存機率設定"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* 世界事件歷史 */}
      <Card>
        <CardHeader>
          <CardTitle>📜 世界事件歷史</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {!worldEvents || worldEvents.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">尚無世界事件記錄</p>
            ) : (
              worldEvents.map((ev) => (
                <div key={ev.id} className="flex gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {EVENT_TYPE_LABELS[ev.eventType] ?? ev.eventType}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(ev.createdAt).toLocaleString("zh-TW")}
                      </span>
                      {ev.triggeredBy && (
                        <Badge variant="secondary" className="text-xs">手動</Badge>
                      )}
                    </div>
                    <div className="font-medium text-sm mt-1">{ev.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ev.description}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── 商店管理 Tab ──────────────────────────────────────────────────────────────────────────────────────
function ShopManagementTab() {
  const [shopType, setShopType] = useState<"virtual" | "spirit" | "hidden">("virtual");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    itemKey: "", displayName: "", description: "",
    priceCoins: 50, priceStones: 1, price: 100,
    quantity: 1, stock: -1, rarity: "common" as string,
    currencyType: "coins" as string, weight: 10, sortOrder: 0,
  });

  const { data: virtualItems, refetch: refetchVirtual } = trpc.gameAdmin.getVirtualShop.useQuery(
    undefined, { enabled: shopType === "virtual" }
  );
  const { data: spiritItems, refetch: refetchSpirit } = trpc.gameAdmin.getSpiritShop.useQuery(
    undefined, { enabled: shopType === "spirit" }
  );
  const { data: hiddenPool, refetch: refetchHidden } = trpc.gameAdmin.getHiddenShopPool.useQuery(
    undefined, { enabled: shopType === "hidden" }
  );

  const createVirtual = trpc.gameAdmin.createVirtualShopItem.useMutation({
    onSuccess: () => { toast.success("✅ 商品已新增"); refetchVirtual(); setShowForm(false); },
    onError: (e) => toast.error(`❌ ${e.message}`),
  });
  const deleteVirtual = trpc.gameAdmin.deleteVirtualShopItem.useMutation({
    onSuccess: () => { toast.success("已刪除"); refetchVirtual(); },
    onError: (e) => toast.error(`❌ ${e.message}`),
  });
  const createSpirit = trpc.gameAdmin.createSpiritShopItem.useMutation({
    onSuccess: () => { toast.success("✅ 商品已新增"); refetchSpirit(); setShowForm(false); },
    onError: (e) => toast.error(`❌ ${e.message}`),
  });
  const deleteSpirit = trpc.gameAdmin.deleteSpiritShopItem.useMutation({
    onSuccess: () => { toast.success("已刪除"); refetchSpirit(); },
    onError: (e) => toast.error(`❌ ${e.message}`),
  });
  const createHidden = trpc.gameAdmin.createHiddenShopItem.useMutation({
    onSuccess: () => { toast.success("✅ 商品已加入密店池"); refetchHidden(); setShowForm(false); },
    onError: (e) => toast.error(`❌ ${e.message}`),
  });
  const deleteHidden = trpc.gameAdmin.deleteHiddenShopItem.useMutation({
    onSuccess: () => { toast.success("已刪除"); refetchHidden(); },
    onError: (e) => toast.error(`❌ ${e.message}`),
  });
  const refreshShop = trpc.gameWorld.adminRefreshShop.useMutation({
    onSuccess: (r) => toast.success(`🔄 商店已刷新！一般 ${r.virtualCount} 件，靈石 ${r.spiritCount} 件`),
    onError: (e) => toast.error(`❌ ${e.message}`),
  });

  const handleSubmit = () => {
    if (!form.itemKey || !form.displayName) { toast.error("請填寫道具 Key 和顯示名稱"); return; }
    if (shopType === "virtual") {
      createVirtual.mutate({ itemKey: form.itemKey, displayName: form.displayName, description: form.description, priceCoins: form.priceCoins, quantity: form.quantity, stock: form.stock, sortOrder: form.sortOrder, isOnSale: 1 });
    } else if (shopType === "spirit") {
      createSpirit.mutate({ itemKey: form.itemKey, displayName: form.displayName, description: form.description, priceStones: form.priceStones, quantity: form.quantity, rarity: form.rarity as "common" | "rare" | "epic" | "legendary", sortOrder: form.sortOrder, isOnSale: 1 });
    } else {
      createHidden.mutate({ itemKey: form.itemKey, displayName: form.displayName, description: form.description, currencyType: form.currencyType as "coins" | "stones", price: form.price, quantity: form.quantity, weight: form.weight, rarity: form.rarity as "common" | "rare" | "epic" | "legendary", isActive: 1 });
    }
  };

  const currentItems = shopType === "virtual" ? (virtualItems ?? []) : shopType === "spirit" ? (spiritItems ?? []) : (hiddenPool ?? []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2">
          {(["virtual", "spirit", "hidden"] as const).map(t => (
            <Button key={t} variant={shopType === t ? "default" : "outline"} size="sm" onClick={() => { setShopType(t); setShowForm(false); }}>
              {t === "virtual" ? "🪙 一般商店" : t === "spirit" ? "💎 靈石專區" : "🔮 密店商品池"}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => refreshShop.mutate()} disabled={refreshShop.isPending}>
            🔄 立即刷新商店
          </Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? "✕ 取消" : "+ 新增商品"}
          </Button>
        </div>
      </div>

      {/* 新增表單 */}
      {showForm && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">新增商品</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">道具 Key（如 I_W001）</p>
                <Input value={form.itemKey} onChange={e => setForm(f => ({ ...f, itemKey: e.target.value }))} placeholder="I_W001" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">顯示名稱</p>
                <Input value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} placeholder="青龍草" />
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground mb-1">描述（選填）</p>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="道具描述" />
              </div>
              {shopType === "virtual" && (
                <>
                  <div><p className="text-xs text-muted-foreground mb-1">金幣價格</p><Input type="number" value={form.priceCoins} onChange={e => setForm(f => ({ ...f, priceCoins: +e.target.value }))} /></div>
                  <div><p className="text-xs text-muted-foreground mb-1">數量</p><Input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: +e.target.value }))} /></div>
                  <div><p className="text-xs text-muted-foreground mb-1">庫存(-1=無限)</p><Input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: +e.target.value }))} /></div>
                  <div><p className="text-xs text-muted-foreground mb-1">排序</p><Input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: +e.target.value }))} /></div>
                </>
              )}
              {shopType === "spirit" && (
                <>
                  <div><p className="text-xs text-muted-foreground mb-1">靈石價格</p><Input type="number" value={form.priceStones} onChange={e => setForm(f => ({ ...f, priceStones: +e.target.value }))} /></div>
                  <div><p className="text-xs text-muted-foreground mb-1">數量</p><Input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: +e.target.value }))} /></div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">稾有度</p>
                    <select className="w-full border rounded px-2 py-1.5 text-sm bg-background" value={form.rarity} onChange={e => setForm(f => ({ ...f, rarity: e.target.value }))}>
                      <option value="common">普通</option><option value="rare">稀有</option><option value="epic">史詩</option><option value="legendary">傳奇</option>
                    </select>
                  </div>
                  <div><p className="text-xs text-muted-foreground mb-1">排序</p><Input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: +e.target.value }))} /></div>
                </>
              )}
              {shopType === "hidden" && (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">貨幣類型</p>
                    <select className="w-full border rounded px-2 py-1.5 text-sm bg-background" value={form.currencyType} onChange={e => setForm(f => ({ ...f, currencyType: e.target.value }))}>
                      <option value="coins">🪙 金幣</option><option value="stones">💎 靈石</option>
                    </select>
                  </div>
                  <div><p className="text-xs text-muted-foreground mb-1">價格</p><Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: +e.target.value }))} /></div>
                  <div><p className="text-xs text-muted-foreground mb-1">數量</p><Input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: +e.target.value }))} /></div>
                  <div><p className="text-xs text-muted-foreground mb-1">權重(1-100)</p><Input type="number" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: +e.target.value }))} /></div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">稾有度</p>
                    <select className="w-full border rounded px-2 py-1.5 text-sm bg-background" value={form.rarity} onChange={e => setForm(f => ({ ...f, rarity: e.target.value }))}>
                      <option value="common">普通</option><option value="rare">稀有</option><option value="epic">史詩</option><option value="legendary">傳奇</option>
                    </select>
                  </div>
                </>
              )}
            </div>
            <Button className="mt-4 w-full" onClick={handleSubmit} disabled={createVirtual.isPending || createSpirit.isPending || createHidden.isPending}>
              新增商品
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 商品列表 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {shopType === "virtual" ? "🪙 一般商店商品" : shopType === "spirit" ? "💎 靈石專區商品" : "🔮 密店隨機生成池"}
            <span className="ml-2 text-muted-foreground font-normal">({currentItems.length} 件)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">目前無商品，點擊「+ 新增商品」或「立即刷新商店」自動生成</p>
          ) : (
            <div className="space-y-2">
              {currentItems.map((item: Record<string, unknown>) => (
                <div key={String(item.id)} className="flex items-center justify-between gap-2 p-2 rounded border">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{String(item.displayName)}</span>
                      <Badge variant="outline" className="text-xs">{String(item.itemKey)}</Badge>
                      {item.rarity != null && <Badge variant="outline" className="text-xs">{String(item.rarity)}</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {shopType === "virtual" && `🪙 ${item.priceCoins} 金幣 · x${item.quantity}`}
                      {shopType === "spirit" && `💎 ${item.priceStones} 靈石 · x${item.quantity}`}
                      {shopType === "hidden" && `${item.currencyType === "coins" ? "🪙" : "💎"} ${item.price} · x${item.quantity} · 權重 ${item.weight}`}
                    </div>
                  </div>
                  <Button
                    variant="destructive" size="sm"
                    onClick={() => {
                      if (shopType === "virtual") deleteVirtual.mutate({ id: Number(item.id) });
                      else if (shopType === "spirit") deleteSpirit.mutate({ id: Number(item.id) });
                      else deleteHidden.mutate({ id: Number(item.id) });
                    }}
                  >刪除</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        密店池是隨機抽取名單，權重越高出現機率越大。一般商店和靈石專區會在每次 Tick 自動從道具圖鑑隨機補充商品。
      </p>
    </div>
  );
}

// ─── 主頁面 ──────────────────────────────────────────────────────────────────────────────────────
export default function AdminGameTheater() {
  const [, navigate] = useLocation();
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">🎭 遊戲劇院</h1>
          <p className="text-muted-foreground text-sm mt-1">管理角色資源、全域參數、Tick 引擎、全服廣播</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {/* Bug 4 fix: 返回遊戲世界按鈕 */}
          <Button variant="outline" size="sm" onClick={() => navigate("/game")}>
            🌏 返回遊戲
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/game")}>
            📊 遊戲CMS
          </Button>
        </div>
      </div>

      <Tabs defaultValue="agents">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="agents">👤 角色管理</TabsTrigger>
          <TabsTrigger value="configs">⚙️ 全域參數</TabsTrigger>
          <TabsTrigger value="tick">⚡ Tick 引擎</TabsTrigger>
          <TabsTrigger value="broadcast">📢 全服廣播</TabsTrigger>
          <TabsTrigger value="engine">🌟 引擎調控</TabsTrigger>
          <TabsTrigger value="world">🌍 世界事件</TabsTrigger>
          <TabsTrigger value="rogue">🎲 奇遇事件</TabsTrigger>
          <TabsTrigger value="reset" className="text-red-400">🔴 世界重置</TabsTrigger>
          <TabsTrigger value="shop">🏪 商店管理</TabsTrigger>
        </TabsList>

        <TabsContent value="agents"><AgentManagementTab /></TabsContent>
        <TabsContent value="configs"><GameConfigTab /></TabsContent>
        <TabsContent value="tick"><TickEngineTab /></TabsContent>
        <TabsContent value="broadcast"><BroadcastTab /></TabsContent>
        <TabsContent value="engine"><EngineControlTab /></TabsContent>
        <TabsContent value="world"><WorldEventTab /></TabsContent>
        <TabsContent value="rogue"><RogueEventTab /></TabsContent>
        <TabsContent value="reset"><WorldResetTab /></TabsContent>
        <TabsContent value="shop"><ShopManagementTab /></TabsContent>
      </Tabs>
    </div>
  );
}