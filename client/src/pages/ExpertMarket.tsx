import { useState } from "react";
import { Link } from "wouter";
import { SharedNav } from "@/components/SharedNav";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Star, Users, ChevronRight } from "lucide-react";

const SPECIALTIES = ["命理", "塔羅", "風水", "紫微斗數", "八字", "姓名學", "占星", "其他"];

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
        (e.title ?? "").toLowerCase().includes(search.toLowerCase())
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

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜尋專家名稱或專長…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setSpecialty(""); setOffset(0); }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                specialty === "" ? "bg-amber-500 text-black" : "bg-accent/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              全部
            </button>
            {SPECIALTIES.map((s) => (
              <button
                key={s}
                onClick={() => { setSpecialty(s); setOffset(0); }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  specialty === s ? "bg-amber-500 text-black" : "bg-accent/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Expert Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 rounded-xl bg-accent/30 animate-pulse" />
            ))}
          </div>
        ) : experts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>目前沒有符合條件的專家</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {experts.map((expert: typeof allExperts[0]) => (
              <Link key={expert.id} href={`/experts/${expert.id}`}>
                <Card className="cursor-pointer hover:border-amber-500/50 transition-all group">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500/30 to-amber-700/30 flex-shrink-0 overflow-hidden">
                        {expert.profileImageUrl ? (
                          <img src={expert.profileImageUrl} alt={expert.publicName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">
                            {expert.publicName[0]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate group-hover:text-amber-400 transition-colors">
                          {expert.publicName}
                        </h3>
                        {expert.title && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{expert.title}</p>
                        )}
                        <div className="flex items-center gap-1 mt-1.5">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span className="text-xs text-amber-400">{expert.ratingAvg ? Number(expert.ratingAvg).toFixed(1) : "新"}</span>
                          <span className="text-xs text-muted-foreground">({expert.ratingCount ?? 0} 評價)</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-400 transition-colors flex-shrink-0 mt-1" />
                    </div>
                    {expert.tags && expert.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {(expert.tags as string[]).slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs px-2 py-0.5">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <button
              onClick={() => setOffset((o) => Math.max(0, o - LIMIT))}
              disabled={offset === 0}
              className="px-4 py-2 rounded-lg bg-accent/50 text-sm disabled:opacity-40"
            >
              上一頁
            </button>
            <span className="px-4 py-2 text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setOffset((o) => o + LIMIT)}
              disabled={allExperts.length < LIMIT}
              className="px-4 py-2 rounded-lg bg-accent/50 text-sm disabled:opacity-40"
            >
              下一頁
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
