import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import { runPatrol, formatPatrolSummary } from "../lib/artSync";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),

  /**
   * patrolArtAssets
   * Multi-Agent 素材巡邏程序
   * 從 GitHub 拉取 ART/MANIFEST.json，回傳所有 status:"ready" 的素材清單
   * 排程任務每 2 小時呼叫一次此程序
   */
  patrolArtAssets: publicProcedure
    .mutation(async () => {
      const result = await runPatrol();
      const summary = formatPatrolSummary(result);

      // 如果有待整合素材，通知 Boss
      if (result.ready_count > 0 && !result.error) {
        await notifyOwner({
          title: `🎨 美術素材更新通知：${result.ready_count} 個素材待整合`,
          content: summary,
        }).catch(() => {
          // 通知失敗不影響主流程
        });
      }

      return {
        success: !result.error,
        checked_at: result.checked_at,
        manifest_last_updated: result.manifest_last_updated,
        ready_count: result.ready_count,
        total_assets: result.total_assets,
        ready_assets: result.ready_assets,
        summary,
        error: result.error ?? null,
      };
    }),
});
