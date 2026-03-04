import { useState, useEffect } from "react";
import { ExpertLayout } from "@/components/ExpertLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { User, Tag, Globe, Save, X, Plus } from "lucide-react";

const SPECIALTY_OPTIONS = [
  "紫微斗數", "八字命理", "塔羅占卜", "占星", "風水", "姓名學",
  "手相", "面相", "奇門遁甲", "六爻", "梅花易數", "數字命理",
  "靈擺", "水晶", "天使牌卡", "催眠", "前世今生", "靈魂解讀",
  "陰陽宅開運", "生命靈數", "塔羅牌", "威卡牌", "靈歌治療",
  "星座命盤", "氣場調理", "周易占卜", "天干地支", "後天八卦",
  "靈數學", "靈氣消除", "山海經", "靈歌治療",
];

export default function ExpertProfile() {

  const { data: profile, refetch } = trpc.expert.getMyProfile.useQuery();
  const upsertMutation = trpc.expert.updateMyProfile.useMutation({
    onSuccess: () => {
      toast("✅ 個人資料已更新");
      refetch();
    },
    onError: (e) => toast.error("更新失敗: " + e.message),
  });

  const [form, setForm] = useState({
    publicName: "",
    bio: "",
    specialties: [] as string[],
    priceMin: 500,
    priceMax: 3000,
    languages: "中文",
    consultationModes: ["video"] as string[],
    socialLinks: "",
  });
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (profile) {
      setForm({
        publicName: profile.publicName || "",
        bio: profile.bio || "",
        specialties: (profile.specialties as string[]) || [],
        priceMin: profile.priceMin || 500,
        priceMax: profile.priceMax || 3000,
        languages: profile.languages || "中文",
        consultationModes: (profile.consultationModes as string[]) || ["video"],
        socialLinks: profile.socialLinks ? JSON.stringify(profile.socialLinks) : "",
      });
    }
  }, [profile]);

  const toggleSpecialty = (s: string) => {
    setForm((f) => ({
      ...f,
      specialties: f.specialties.includes(s)
        ? f.specialties.filter((x) => x !== s)
        : [...f.specialties, s],
    }));
  };

  const toggleMode = (m: string) => {
    setForm((f) => ({
      ...f,
      consultationModes: f.consultationModes.includes(m)
        ? f.consultationModes.filter((x) => x !== m)
        : [...f.consultationModes, m],
    }));
  };

  const handleSave = () => {
    upsertMutation.mutate({
      publicName: form.publicName,
      bio: form.bio,
      specialties: form.specialties,
      priceMin: form.priceMin,
      priceMax: form.priceMax,
      languages: form.languages,
      consultationModes: form.consultationModes,
    });
  };

  const saveBtn = (
    <Button
      size="sm"
      className="bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs px-3 h-8"
      onClick={handleSave}
      disabled={upsertMutation.isPending}
    >
      <Save className="w-3.5 h-3.5 mr-1" /> {upsertMutation.isPending ? "儲存中…" : "儲存"}
    </Button>
  );

  return (
    <ExpertLayout headerAction={saveBtn} pageTitle="個人品牌">
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4 md:space-y-6">
        <div className="hidden md:block">
          <h1 className="text-2xl font-bold">個人品牌編輯</h1>
          <p className="text-muted-foreground text-sm mt-1">設定您的公開形象，讓用戶認識您</p>
        </div>

        {/* 狀態提示 */}
        {profile && profile.status !== "active" && (
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm">
            ⏳ 您的資料正在審核中，審核通過後將公開顯示於專家市集
          </div>
        )}

        {/* 基本資料 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" /> 基本資料
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">公開顯示名稱 *</label>
              <Input
                value={form.publicName}
                onChange={(e) => setForm((f) => ({ ...f, publicName: e.target.value }))}
                placeholder="例如：命理師 陳天命"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">個人介紹</label>
              <Textarea
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                placeholder="介紹您的專業背景、服務理念和擅長領域…"
                rows={5}
              />
              <p className="text-xs text-muted-foreground mt-1">{form.bio.length}/500 字</p>
            </div>
          </CardContent>
        </Card>

        {/* 專業領域 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="w-4 h-4" /> 專業領域
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">選擇您擅長的領域（可多選）</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {SPECIALTY_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleSpecialty(s)}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                    form.specialties.includes(s)
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                      : "border-border text-muted-foreground hover:border-amber-500/40 hover:text-amber-400"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {/* 自訂標籤輸入 */}
            <div className="border-t border-border/50 pt-3">
              <p className="text-xs text-muted-foreground mb-2">找不到您的領域？手動新增標籤</p>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && tagInput.trim()) {
                      e.preventDefault();
                      const newTag = tagInput.trim();
                      if (!form.specialties.includes(newTag)) {
                        setForm((f) => ({ ...f, specialties: [...f.specialties, newTag] }));
                      }
                      setTagInput("");
                    }
                  }}
                  placeholder="輸入自訂領域名稱，按 Enter 新增"
                  className="flex-1 h-8 text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 border-amber-500/40 text-amber-400 hover:bg-amber-500/10 bg-transparent"
                  onClick={() => {
                    const newTag = tagInput.trim();
                    if (newTag && !form.specialties.includes(newTag)) {
                      setForm((f) => ({ ...f, specialties: [...f.specialties, newTag] }));
                    }
                    setTagInput("");
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
              {/* 已選標籤列表（包含自訂） */}
              {form.specialties.filter((s) => !SPECIALTY_OPTIONS.includes(s)).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.specialties.filter((s) => !SPECIALTY_OPTIONS.includes(s)).map((s) => (
                    <Badge
                      key={s}
                      className="bg-teal-500/20 text-teal-300 border-teal-500/30 border text-xs pr-1 gap-1"
                    >
                      {s}
                      <button
                        onClick={() => setForm((f) => ({ ...f, specialties: f.specialties.filter((x) => x !== s) }))}
                        className="hover:text-red-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 服務設定 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-4 h-4" /> 服務設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">最低收費（元）</label>
                <Input
                  type="number"
                  value={form.priceMin}
                  onChange={(e) => setForm((f) => ({ ...f, priceMin: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">最高收費（元）</label>
                <Input
                  type="number"
                  value={form.priceMax}
                  onChange={(e) => setForm((f) => ({ ...f, priceMax: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">服務語言</label>
              <Input
                value={form.languages}
                onChange={(e) => setForm((f) => ({ ...f, languages: e.target.value }))}
                placeholder="例如：中文、英文"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">諮詢方式</label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { key: "video", label: "視訊" },
                  { key: "voice", label: "語音" },
                  { key: "text", label: "文字" },
                  { key: "in_person", label: "面對面" },
                ].map((m) => (
                  <button
                    key={m.key}
                    onClick={() => toggleMode(m.key)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      form.consultationModes.includes(m.key)
                        ? "bg-blue-500/20 text-blue-400 border-blue-500/40"
                        : "border-border text-muted-foreground hover:border-blue-500/40"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold"
          onClick={handleSave}
          disabled={upsertMutation.isPending}
        >
          <Save className="w-4 h-4 mr-2" />
          {upsertMutation.isPending ? "儲存中…" : "儲存個人資料"}
        </Button>
      </div>
    </ExpertLayout>
  );
}
