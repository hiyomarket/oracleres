import { useState } from "react";
import { Link } from "wouter";
import { SharedNav } from "@/components/SharedNav";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Heart, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function MyFavorites() {
  const { data: favorites, isLoading } = trpc.expert.getMyFavorites.useQuery();
  const utils = trpc.useUtils();
  const removeFav = trpc.expert.toggleFavorite.useMutation({
    onSuccess: () => { utils.expert.getMyFavorites.invalidate(); toast.success("已取消收藏"); },
  });
  return (
    <div className="min-h-screen bg-background">
      <SharedNav currentPage="favorites" />
      <div className="container max-w-4xl py-6 px-4">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Heart className="w-6 h-6 text-red-500 fill-red-500" /> 我的收藏
        </h1>
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">載入中...</div>
        ) : !favorites || favorites.length === 0 ? (
          <Card><CardContent className="py-12 text-center">
            <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">尚未收藏任何專家</p>
            <Link href="/experts"><Button className="mt-4">探索天命聯盟</Button></Link>
          </CardContent></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {favorites.map(fav => (
              <Card key={fav.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <Link href={"/experts/" + fav.expertId}>
                    <div className="flex items-center gap-3 cursor-pointer">
                      {fav.profileImage ? (
                        <img src={fav.profileImage} alt="" className="w-14 h-14 rounded-full object-cover" />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-xl">
                          {(fav.publicName ?? "?")[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{fav.publicName}</h3>
                        <p className="text-sm text-muted-foreground truncate">{fav.title ?? "命理師"}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span className="text-xs">{fav.ratingAvg ? Number(fav.ratingAvg).toFixed(1) : "新"}</span>
                          <span className="text-xs text-muted-foreground">({fav.ratingCount ?? 0})</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                  <Button variant="ghost" size="sm"
                    className="mt-2 w-full text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => removeFav.mutate({ expertId: fav.expertId })}
                    disabled={removeFav.isPending}>
                    <Trash2 className="w-4 h-4 mr-1" /> 取消收藏
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
