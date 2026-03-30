/**
 * Expert Router - 主入口
 * 將 6 個子路由器合併為一個 flat expertRouter，保持 API 路徑不變
 */
import { router } from "../../_core/trpc";
import { expertProfileRouter } from "./profile";
import { expertServicesRouter } from "./services";
import { expertCalendarRouter } from "./calendar";
import { expertBookingsRouter } from "./bookings";
import { expertMessagingRouter } from "./messaging";
import { expertAdminRouter } from "./admin";

export const expertRouter = router({
  // Profile (3 procedures)
  ...expertProfileRouter._def.procedures,
  // Services (5 procedures)
  ...expertServicesRouter._def.procedures,
  // Calendar (7 procedures)
  ...expertCalendarRouter._def.procedures,
  // Bookings (17 procedures)
  ...expertBookingsRouter._def.procedures,
  // Messaging (7 procedures)
  ...expertMessagingRouter._def.procedures,
  // Admin (17 procedures)
  ...expertAdminRouter._def.procedures,
});
