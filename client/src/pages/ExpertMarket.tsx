import { useState } from "react";
import { Link } from "wouter";
import { SharedNav } from "@/components/SharedNav";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Star, Users, ChevronRight, MapPin, Video } from "lucide-react";

// 篩選標籤對應的 specialties 關鍵字
const FILTER_TAGS = [
  { label: "全部", value: "" },
  { label: "命理", value: "命理" },
  { label: "塔羅", value: "塔羅" },
  { label: "風水", value: "風水" },
  { label: "紫微斗數", value: "紫微斗數" },
  { label: "八字", value: "八字" },
  { label: "姓名學", value: "姓名學" },
  { label: "占星", value: "占星" },
  { label: "其他", value: "其他" },
];

export default function ExpertMarket() {
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [offset, setOffset] = useState(0);
  const LIMIT = 12;

  const { data: rawData, isLoading } = trpc.expert.listExperts.useQuery({
    tag: specialty || undefined,
    limit: LIMIT,
    offset,
  });

  const allExperts = rawData ?? [];
  // Client-side search filter
  const experts = search
    ? allExperts.filter((e) =>
        e.publicName.toLowerCase().includes(search.toLowerCase()) ||
        (e.title ?? "").toLowerCase().includes(search.toLowerCase()) ||
        ((e.specialties as string[] | null) ?? []).some((s) =>
          s.toLowerCase().includes(search.toLowerCase())
        )
      )
    : allExperts;

  const page = Math.floor(offset / LIMIT) + 1;
  const totalPages = allExperts.length === LIMIT ? page + 1 : page;

  return (
    <div className="min-h-screen bg-background">
      <SharedNav currentPage="experts" />
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">天命聯盟・專家市集</h1>
          <p className="text-muted-foreground">與頂尖命理師、塔羅師、風水師一對一諮詢，解開你的天命密碼</p>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜尋專家名稱、專長領域…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
            className="pl-9"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          {FILTER_TAGS.map((tag) => (
            <button
              key={tag.value}
              onClick={() => { setSpecialty(tag.value); setOffset(0); setSearch(""); }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                specialty === tag.value
                  ? "bg-amber-500 text-black"
                  : "bg-accent/50 text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>

        {/* Expert Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-52 rounded-xl bg-accent/30 animate-pulse" />
            ))}
          </div>
        ) : experts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium mb-1">目前沒有符合條件的專家</p>
            <p className="text-sm">
              {specialty ? `「${specialty}」領域暫無上架專家，試試其他分類` : "請調整搜尋條件"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {experts.map((expert) => {
              const href = expert.slug ? `/experts/${expert.slug}` : `/experts/${expert.id}`;
              const specialties = (expert.specialties as string[] | null) ?? [];
              const tags = (expert.tags as string[] | null) ?? [];
              const combined = [...specialties, ...tags];
              const displayTags = combined.filter((t, i) => combined.indexOf(t) === i).slice(0, 4);
              const consultModes = (expert.consultationModes as string[] | null);
              const coverUrl = expert.coverImageUrl;
              const hasOnline = consultModes?.includes("video") || consultModes?.includes("voice") || consultModes?.includes("text");
              const hasOffline = consultModes?.includes("in_person");

              return (
                <Link key={expert.id} href={href}>
                  <Card className="cursor-pointer hover:border-amber-500/50 transition-all group h-full overflow-visible">
                    <CardContent className="p-0">
                      {/* Cover / Avatar area - use overflow-visible on card so avatar can overlap */}
                      <div className="relative">
                        {/* Cover image */}
                        <div className="h-20 rounded-t-xl overflow-hidden bg-gradient-to-br from-amber-900/40 to-stone-900/60 relative">
                          {coverUrl ? (
                            <img src={coverUrl} alt="" className="w-full h-full object-cover" />
                          ) : null}
                          {/* Price badge */}
                          {expert.priceMin && (
                            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/50 text-amber-400 text-xs font-medium">
                              NT${expert.priceMin.toLocaleString()} 起
                            </div>
                          )}
                        </div>
                        {/* Avatar - positioned to overlap cover bottom, z-10 to stay above */}
                        <div className="absolute bottom-0 left-4 translate-y-1/2 z-10">
                          <div className="w-14 h-14 rounded-full border-2 border-background bg-gradient-to-br from-amber-500/30 to-amber-700/30 overflow-hidden shadow-md">
                            {expert.profileImageUrl ? (
                              <img src={expert.profileImageUrl} alt={expert.publicName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xl font-bold text-amber-400">
                                {expert.publicName[0]}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="pt-9 px-4 pb-4">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="min-w-0">
                            <h3 className="font-semibold truncate group-hover:text-amber-400 transition-colors">
                              {expert.publicName}
                            </h3>
                            {expert.title && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{expert.title}</p>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-400 transition-colors flex-shrink-0 mt-0.5" />
                        </div>

                        {/* Rating */}
                        <div className="flex items-center gap-1 mb-2.5">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span className="text-xs text-amber-400 font-medium">
                            {expert.ratingAvg ? Number(expert.ratingAvg).toFixed(1) : "新"}
                          </span>
                          <span className="text-xs text-muted-foreground">({expert.ratingCount ?? 0} 評價)</span>
                          {hasOnline && (
                            <span className="ml-auto flex items-center gap-0.5 text-xs text-blue-400">
                              <Video className="w-3 h-3" /> 線上
                            </span>
                          )}
                          {hasOffline && (
                            <span className="flex items-center gap-0.5 text-xs text-green-400">
                              <MapPin className="w-3 h-3" /> 面對面
                            </span>
                          )}
                        </div>

                        {/* Tags */}
                        {displayTags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {displayTags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="text-xs px-1.5 py-0 bg-amber-500/10 text-amber-400/80 border-amber-500/20 border"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <button
              onClick={() => setOffset((o) => Math.max(0, o - LIMIT))}
              disabled={offset === 0}
              className="px-4 py-2 rounded-lg bg-accent/50 text-sm disabled:opacity-40 hover:bg-accent transition-colors"
            >
              上一頁
            </button>
            <span className="px-4 py-2 text-sm text-muted-foreground">
              第 {page} 頁
            </span>
            <button
              onClick={() => setOffset((o) => o + LIMIT)}
              disabled={allExperts.length < LIMIT}
              className="px-4 py-2 rounded-lg bg-accent/50 text-sm disabled:opacity-40 hover:bg-accent transition-colors"
            >
              下一頁
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
