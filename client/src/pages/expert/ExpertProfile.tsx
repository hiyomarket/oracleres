import { useState, useEffect, useRef } from "react";
import { ExpertLayout } from "@/components/ExpertLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  User, Tag, Globe, Save, X, Plus, Camera, Code, Eye,
  Link as LinkIcon, AlertCircle, CheckCircle2, Upload,
} from "lucide-react";

const SPECIALTY_OPTIONS = [
  "紫微斗數", "八字命理", "塔羅占卜", "占星", "風水", "姓名學",
  "手相", "面相", "奇門遁甲", "六爻", "梅花易數", "數字命理",
  "靈擺", "水晶", "天使牌卡", "催眠", "前世今生", "靈魂解讀",
  "陰陽宅開運", "生命靈數", "塔羅牌", "威卡牌", "靈歌治療",
  "星座命盤", "氣場調理", "周易占卜", "天干地支", "後天八卦",
  "靈數學", "靈氣消除", "山海經", "符咒開運",
];

// 安全渲染 HTML（過濾危險屬性）
function SafeHtml({ html }: { html: string }) {
  // 移除 style 屬性中的 position/fixed/absolute 等危險 CSS
  const sanitized = html
    .replace(/style="[^"]*"/gi, (match) => {
      const safe = match.replace(/(position|z-index|fixed|absolute|overflow|display\s*:\s*none)[^;"]*/gi, "");
      return safe;
    })
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "");
  return (
    <div
      className="prose prose-invert prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}

export default function ExpertProfile() {
  const { data: profile, refetch } = trpc.expert.getMyProfile.useQuery();
  const upsertMutation = trpc.expert.updateMyProfile.useMutation({
    onSuccess: () => { toast.success("✅ 個人資料已更新"); refetch(); },
    onError: (e) => toast.error("更新失敗: " + e.message),
  });
  const uploadImageMutation = trpc.expert.uploadProfileImage.useMutation({
    onSuccess: (data, variables) => {
      toast.success(variables.imageType === "profile" ? "頭像已更新" : "封面已更新");
      refetch();
    },
    onError: (e) => toast.error("上傳失敗: " + e.message),
  });

  const profileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    publicName: "",
    title: "",
    bio: "",
    bioHtml: "",
    slug: "",
    specialties: [] as string[],
    priceMin: 500,
    priceMax: 3000,
    languages: "中文",
    consultationModes: ["video"] as string[],
  });
  const [tagInput, setTagInput] = useState("");
  const [bioTab, setBioTab] = useState<"plain" | "html" | "preview">("plain");
  const [slugStatus, setSlugStatus] = useState<"idle" | "ok" | "taken">("idle");

  useEffect(() => {
    if (profile) {
      setForm({
        publicName: profile.publicName || "",
        title: profile.title || "",
        bio: profile.bio || "",
        bioHtml: profile.bioHtml || "",
        slug: profile.slug || "",
        specialties: (profile.specialties as string[]) || [],
        priceMin: profile.priceMin || 500,
        priceMax: profile.priceMax || 3000,
        languages: profile.languages || "中文",
        consultationModes: (profile.consultationModes as string[]) || ["video"],
      });
    }
  }, [profile]);

  const handleImageUpload = (type: "profile" | "cover", file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error("圖片不能超過 5MB"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = (e.target?.result as string).split(",")[1];
      uploadImageMutation.mutate({ imageBase64: base64, mimeType: file.type, imageType: type });
    };
    reader.readAsDataURL(file);
  };

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
      title: form.title,
      bio: form.bio,
      bioHtml: form.bioHtml,
      slug: form.slug || undefined,
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
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
        <div className="hidden md:block">
          <h1 className="text-2xl font-bold">個人品牌編輯</h1>
          <p className="text-muted-foreground text-sm mt-1">設定您的公開形象，讓用戶認識您</p>
        </div>

        {/* 狀態提示 */}
        {profile && profile.status !== "active" && (
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            您的資料正在審核中，審核通過後將公開顯示於天命聯盟
          </div>
        )}

        {/* ── 照片區塊 ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="w-4 h-4" /> 個人照片
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              {/* 頭像 */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative w-24 h-24 rounded-full overflow-hidden bg-accent/50 border-2 border-border">
                  {profile?.profileImageUrl ? (
                    <img src={profile.profileImageUrl} alt="頭像" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl text-muted-foreground">
                      {form.publicName?.[0] || "?"}
                    </div>
                  )}
                  <button
                    onClick={() => profileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <Upload className="w-5 h-5 text-white" />
                  </button>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 px-2 bg-transparent"
                  onClick={() => profileInputRef.current?.click()}
                  disabled={uploadImageMutation.isPending}
                >
                  <Camera className="w-3 h-3 mr-1" /> 更換頭像
                </Button>
                <input
                  ref={profileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleImageUpload("profile", e.target.files[0])}
                />
              </div>

              {/* 封面 */}
              <div className="flex-1 flex flex-col gap-2">
                <div
                  className="relative w-full h-28 rounded-lg overflow-hidden bg-gradient-to-br from-amber-900/30 to-stone-900/50 border border-border cursor-pointer group"
                  onClick={() => coverInputRef.current?.click()}
                >
                  {profile?.coverImageUrl ? (
                    <img src={profile.coverImageUrl} alt="封面" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                      點擊上傳封面圖片
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 px-2 self-start bg-transparent"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={uploadImageMutation.isPending}
                >
                  <Camera className="w-3 h-3 mr-1" /> 更換封面
                </Button>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleImageUpload("cover", e.target.files[0])}
                />
                <p className="text-xs text-muted-foreground">建議尺寸 1200×400，支援 JPG/PNG，最大 5MB</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── 基本資料 ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" /> 基本資料
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">公開顯示名稱 *</label>
                <Input
                  value={form.publicName}
                  onChange={(e) => setForm((f) => ({ ...f, publicName: e.target.value }))}
                  placeholder="例如：命理師 陳天命"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">頭銜/職稱</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="例如：紫微斗數命理師 · 20年經驗"
                />
              </div>
            </div>

            {/* 專屬網址 */}
            <div>
              <label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5" /> 專屬網址（選填）
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  /experts/
                </span>
                <div className="relative flex-1">
                  <Input
                    value={form.slug}
                    onChange={(e) => {
                      const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                      setForm((f) => ({ ...f, slug: val }));
                      setSlugStatus("idle");
                    }}
                    placeholder="your-name"
                    className="pr-8"
                  />
                  {form.slug && slugStatus === "ok" && (
                    <CheckCircle2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />
                  )}
                  {form.slug && slugStatus === "taken" && (
                    <X className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                只能使用小寫英文、數字和連字號（-），設定後用戶可用 /experts/your-name 找到您
              </p>
            </div>

            {/* 個人介紹 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">個人介紹</label>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <button
                    onClick={() => setBioTab("plain")}
                    className={`px-2 py-0.5 rounded transition-colors ${bioTab === "plain" ? "bg-accent text-foreground" : "hover:text-foreground"}`}
                  >
                    純文字
                  </button>
                  <button
                    onClick={() => setBioTab("html")}
                    className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${bioTab === "html" ? "bg-accent text-foreground" : "hover:text-foreground"}`}
                  >
                    <Code className="w-3 h-3" /> HTML
                  </button>
                  <button
                    onClick={() => setBioTab("preview")}
                    className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${bioTab === "preview" ? "bg-accent text-foreground" : "hover:text-foreground"}`}
                  >
                    <Eye className="w-3 h-3" /> 預覽
                  </button>
                </div>
              </div>

              {bioTab === "plain" && (
                <>
                  <Textarea
                    value={form.bio}
                    onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                    placeholder="介紹您的專業背景、服務理念和擅長領域…&#10;&#10;支援換行，文字會依段落顯示在頁面上"
                    rows={6}
                    className="resize-y"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{form.bio.length}/1000 字 · 換行將被正確顯示</p>
                </>
              )}

              {bioTab === "html" && (
                <>
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 mb-2 text-xs text-amber-400 flex items-start gap-1.5">
                    <Code className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>
                      您可以使用 HTML 語法美化介紹頁面。<br />
                      <strong>允許：</strong> &lt;h2&gt;、&lt;p&gt;、&lt;ul&gt;、&lt;li&gt;、&lt;strong&gt;、&lt;em&gt;、&lt;a&gt;、&lt;br&gt;、&lt;hr&gt;、&lt;img&gt;<br />
                      <strong>限制：</strong> 不允許 &lt;script&gt; 及危險的 CSS 定位屬性（position、z-index 等）
                    </span>
                  </div>
                  <Textarea
                    value={form.bioHtml}
                    onChange={(e) => setForm((f) => ({ ...f, bioHtml: e.target.value }))}
                    placeholder={`<h2>關於我</h2>\n<p>我是一位擁有 20 年經驗的命理師...</p>\n<ul>\n  <li>專精紫微斗數</li>\n  <li>八字命理</li>\n</ul>`}
                    rows={10}
                    className="font-mono text-sm resize-y"
                  />
                  <p className="text-xs text-muted-foreground mt-1">HTML 介紹會優先顯示於您的頁面，若未填寫則顯示純文字介紹</p>
                </>
              )}

              {bioTab === "preview" && (
                <div className="min-h-[150px] rounded-lg border border-border p-4 bg-background">
                  {form.bioHtml ? (
                    <SafeHtml html={form.bioHtml} />
                  ) : form.bio ? (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{form.bio}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">尚未填寫個人介紹</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── 專業領域 ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="w-4 h-4" /> 專業領域
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">選擇您擅長的領域（可多選），這些標籤將用於前台篩選</p>
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
            <div className="border-t border-border/50 pt-3">
              <p className="text-xs text-muted-foreground mb-2">找不到您的領域？手動新增</p>
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

        {/* ── 服務設定 ── */}
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
                  { key: "video", label: "📹 視訊" },
                  { key: "voice", label: "📞 語音" },
                  { key: "text", label: "💬 文字" },
                  { key: "in_person", label: "🤝 面對面" },
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
