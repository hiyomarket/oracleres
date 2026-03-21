import { useAdminRole } from "@/hooks/useAdminRole";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { THEMES, applyTheme, DEFAULT_THEME_ID } from "@/lib/themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Palette, RefreshCw, Eye } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";

export default function AdminTheme() {
  const { readOnly } = useAdminRole();
  const [selectedTheme, setSelectedTheme] = useState<string>(DEFAULT_THEME_ID);
  const [previewTheme, setPreviewTheme] = useState<string | null>(null);

  // 讀取目前後台設定的主題
  const { data: themeSetting, refetch } = trpc.expert.getSystemSetting.useQuery(
    { key: "active_theme" },
    { staleTime: 0 }
  );

  useEffect(() => {
    const val = (themeSetting as any)?.settingValue ?? (themeSetting as any)?.value;
    if (val) {
      setSelectedTheme(val);
    }
  }, [themeSetting]);

  const updateSetting = trpc.expert.adminUpdateSystemSetting.useMutation({
    onSuccess: () => {
      toast.success("主題已儲存，全站配色已更新");
      refetch();
    },
    onError: (err) => {
      toast.error("儲存失敗：" + err.message);
    },
  });

  const handlePreview = (themeId: string) => {
    setPreviewTheme(themeId);
    applyTheme(themeId);
  };

  const handleResetPreview = () => {
    setPreviewTheme(null);
    applyTheme(selectedTheme);
  };

  const handleSave = () => {
    const themeToSave = previewTheme ?? selectedTheme;
    setSelectedTheme(themeToSave);
    setPreviewTheme(null);
    updateSetting.mutate({ key: "active_theme", value: themeToSave });
  };

  const currentThemeName = THEMES.find(t => t.id === (previewTheme ?? selectedTheme))?.name ?? "未知";

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* 頁首 */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Palette className="w-6 h-6 text-primary" />
              全站主題管理
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              選擇一個主題方案，點擊「預覽」可即時查看效果，確認後點擊「儲存並套用」。
            </p>
          </div>
          <div className="flex items-center gap-2">
            {previewTheme && (
              <Button variant="outline" size="sm" onClick={handleResetPreview}>
                <RefreshCw className="w-4 h-4 mr-1" />
                取消預覽
              </Button>
            )}
            <Button
              disabled={readOnly || updateSetting.isPending}
              title={readOnly ? "唯讀模式，無法操作" : undefined}
              onClick={handleSave}
              className="flame-button"
            >
              {updateSetting.isPending ? "儲存中..." : "儲存並套用"}
            </Button>
          </div>
        </div>

        {/* 目前狀態 */}
        <Card className="glass-card border-primary/30">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
              <span className="text-sm text-muted-foreground">
                {previewTheme ? "預覽中：" : "目前套用："}
              </span>
              <span className="font-semibold text-foreground">{currentThemeName}</span>
              {previewTheme && (
                <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-400">
                  預覽模式
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 主題卡片網格 */}
        {/* 深色主題 */}
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="text-lg">🌙</span>深色主題系列
            <span className="text-xs text-muted-foreground font-normal">（適合夜間、神秘氛圍）</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {THEMES.filter(t => !t.id.endsWith('_light')).map((theme) => {
            const isActive = selectedTheme === theme.id && !previewTheme;
            const isPreviewing = previewTheme === theme.id;

            return (
              <Card
                key={theme.id}
                className={`cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
                  isActive || isPreviewing
                    ? "ring-2 ring-primary shadow-lg shadow-primary/20"
                    : "glass-card hover:border-primary/40"
                }`}
                onClick={() => handlePreview(theme.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="text-xl">{theme.emoji}</span>
                        {theme.name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {theme.description}
                      </p>
                    </div>
                    {(isActive || isPreviewing) && (
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ml-2 ${
                        isPreviewing ? "bg-amber-500" : "bg-primary"
                      }`}>
                        {isPreviewing ? (
                          <Eye className="w-3 h-3 text-white" />
                        ) : (
                          <Check className="w-3 h-3 text-primary-foreground" />
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* 顏色預覽色塊 */}
                  <div className="flex gap-1.5 mt-1 mb-2">
                    {theme.previewColors.map((color, i) => (
                      <div
                        key={i}
                        className="flex-1 h-7 rounded-md shadow-sm"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                  {/* 縮圖 UI 預覽 */}
                  <div className="rounded-lg overflow-hidden mb-2" style={{ background: theme.vars.pageBg, border: `1px solid ${theme.vars.border}` }}>
                    <div className="px-2 py-1 flex gap-1.5 items-center" style={{ background: theme.vars.navBg }}>
                      <div className="w-2 h-2 rounded-full" style={{ background: theme.vars.primary }} />
                      <div className="w-8 h-1.5 rounded-full" style={{ background: theme.vars.primary }} />
                      <div className="w-5 h-1.5 rounded-full" style={{ background: theme.vars.muted }} />
                      <div className="w-5 h-1.5 rounded-full" style={{ background: theme.vars.muted }} />
                    </div>
                    <div className="p-2 grid grid-cols-3 gap-1">
                      {[0.7, 0.9, 0.55].map((w, i) => (
                        <div key={i} className="rounded p-1.5" style={{ background: theme.vars.card }}>
                          <div className="h-1 rounded-full mb-1" style={{ background: theme.vars.primary, width: `${w * 100}%` }} />
                          <div className="h-0.5 rounded-full" style={{ background: theme.vars.muted }} />
                        </div>
                      ))}
                    </div>
                    <div className="px-2 py-1.5 flex gap-1.5" style={{ borderTop: `1px solid ${theme.vars.border}` }}>
                      <div className="px-2 py-0.5 rounded text-[9px] font-semibold" style={{ background: theme.vars.primary, color: theme.vars.primaryForeground }}>主要</div>
                      <div className="px-2 py-0.5 rounded text-[9px] font-semibold" style={{ background: theme.vars.accent, color: theme.vars.accentForeground }}>強調</div>
                    </div>
                  </div>
                  {/* 操作按鈕 */}
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(theme.id);
                      }}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      預覽
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 text-xs"
                      disabled={readOnly || updateSetting.isPending}
                      title={readOnly ? "唯讀模式，無法操作" : undefined}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTheme(theme.id);
                        setPreviewTheme(null);
                        applyTheme(theme.id);
                        updateSetting.mutate({ key: "active_theme", value: theme.id });
                      }}
                    >
                      <Check className="w-3 h-3 mr-1" />
                      {selectedTheme === theme.id && !previewTheme ? "已套用" : "套用"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          </div>
        </div>

        {/* 淺色主題 */}
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="text-lg">☀️</span>淺色主題系列
            <span className="text-xs text-muted-foreground font-normal">（適合白天、清新氛圍）</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {THEMES.filter(t => t.id.endsWith('_light')).map((theme) => {
            const isActive = selectedTheme === theme.id && !previewTheme;
            const isPreviewing = previewTheme === theme.id;

            return (
              <Card
                key={theme.id}
                className={`cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
                  isActive || isPreviewing
                    ? "ring-2 ring-primary shadow-lg shadow-primary/20"
                    : "glass-card hover:border-primary/40"
                }`}
                onClick={() => handlePreview(theme.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="text-xl">{theme.emoji}</span>
                        {theme.name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {theme.description}
                      </p>
                    </div>
                    {(isActive || isPreviewing) && (
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ml-2 ${
                        isPreviewing ? "bg-amber-500" : "bg-primary"
                      }`}>
                        {isPreviewing ? (
                          <Eye className="w-3 h-3 text-white" />
                        ) : (
                          <Check className="w-3 h-3 text-primary-foreground" />
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* 顏色預覽色塊 */}
                  <div className="flex gap-1.5 mt-1 mb-2">
                    {theme.previewColors.map((color, i) => (
                      <div
                        key={i}
                        className="flex-1 h-7 rounded-md shadow-sm"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                  {/* 縮圖 UI 預覽 */}
                  <div className="rounded-lg overflow-hidden mb-2" style={{ background: theme.vars.pageBg, border: `1px solid ${theme.vars.border}` }}>
                    <div className="px-2 py-1 flex gap-1.5 items-center" style={{ background: theme.vars.navBg }}>
                      <div className="w-2 h-2 rounded-full" style={{ background: theme.vars.primary }} />
                      <div className="w-8 h-1.5 rounded-full" style={{ background: theme.vars.primary }} />
                      <div className="w-5 h-1.5 rounded-full" style={{ background: theme.vars.muted }} />
                      <div className="w-5 h-1.5 rounded-full" style={{ background: theme.vars.muted }} />
                    </div>
                    <div className="p-2 grid grid-cols-3 gap-1">
                      {[0.7, 0.9, 0.55].map((w, i) => (
                        <div key={i} className="rounded p-1.5" style={{ background: theme.vars.card }}>
                          <div className="h-1 rounded-full mb-1" style={{ background: theme.vars.primary, width: `${w * 100}%` }} />
                          <div className="h-0.5 rounded-full" style={{ background: theme.vars.muted }} />
                        </div>
                      ))}
                    </div>
                    <div className="px-2 py-1.5 flex gap-1.5" style={{ borderTop: `1px solid ${theme.vars.border}` }}>
                      <div className="px-2 py-0.5 rounded text-[9px] font-semibold" style={{ background: theme.vars.primary, color: theme.vars.primaryForeground }}>主要</div>
                      <div className="px-2 py-0.5 rounded text-[9px] font-semibold" style={{ background: theme.vars.accent, color: theme.vars.accentForeground }}>強調</div>
                    </div>
                  </div>
                  {/* 操作按鈕 */}
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(theme.id);
                      }}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      預覽
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 text-xs"
                      disabled={readOnly || updateSetting.isPending}
                      title={readOnly ? "唯讀模式，無法操作" : undefined}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTheme(theme.id);
                        setPreviewTheme(null);
                        applyTheme(theme.id);
                        updateSetting.mutate({ key: "active_theme", value: theme.id });
                      }}
                    >
                      <Check className="w-3 h-3 mr-1" />
                      {selectedTheme === theme.id && !previewTheme ? "已套用" : "套用"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          </div>
        </div>

        {/* 說明區塊 */}
        <Card className="glass-card">
          <CardContent className="pt-4 pb-4">
            <h3 className="font-semibold text-sm mb-2 text-primary">使用說明</h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• 點擊任意主題卡片或「預覽」按鈕，可即時在當前頁面查看效果</li>
              <li>• 點擊「套用」或「儲存並套用」後，設定會儲存到資料庫，所有用戶下次重新整理後即可看到新主題</li>
              <li>• 主題切換不會影響任何資料，隨時可以更換</li>
              <li>• 預設主題為「神秘紫羅蘭」，適合女性用戶群體</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
