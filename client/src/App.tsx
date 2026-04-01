import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { GameErrorBoundary } from "./components/game/GameErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AccessGate } from "@/components/AccessGate";
import { DailySigninModal } from "./components/DailySigninModal";
import { FloatingBanner } from "./components/FloatingBanner";
import { AiReadOnlyBanner } from "./components/AiReadOnlyBanner";
import { ThemeInitializer } from "./components/ThemeInitializer";
import { LiveFeedContainer } from "./components/LiveFeedBanner";
import { AchievementToastContainer } from "./components/AchievementToast";
import { useGameWebSocket } from "./hooks/useGameWebSocket";
import { useAuth } from "./_core/hooks/useAuth";

// Lazy-loaded pages (code-splitting)
const NotFound = lazy(() => import("@/pages/NotFound"));
const Home = lazy(() => import("@/pages/Home"));
const LandingPage = lazy(() => import("@/pages/LandingPage"));
const OracleStats = lazy(() => import("@/pages/OracleStats"));
const LotteryOracle = lazy(() => import("@/pages/LotteryOracle"));
const OracleCalendar = lazy(() => import("@/pages/OracleCalendar"));
const WeeklyReport = lazy(() => import("@/pages/WeeklyReport"));
const WarRoom = lazy(() => import("@/pages/WarRoom"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const MyProfile = lazy(() => import("@/pages/MyProfile"));
const AddToHome = lazy(() => import("@/pages/AddToHome"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const AdminUsers = lazy(() => import("@/pages/AdminUsers"));
const AdminUserGroups = lazy(() => import("@/pages/AdminUserGroups"));
const AdminBusinessHub = lazy(() => import("@/pages/AdminBusinessHub"));
const AdminLogicConfig = lazy(() => import("@/pages/AdminLogicConfig"));
const AdminMarketing = lazy(() => import("@/pages/AdminMarketing"));
const CasinoPage = lazy(() => import("./pages/CasinoPage"));
const WbcPage = lazy(() => import("./pages/WbcPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const FeatureStore = lazy(() => import("./pages/FeatureStore"));
const AdminFeatureStore = lazy(() => import("./pages/AdminFeatureStore"));
const AdminDestinyShop = lazy(() => import("./pages/AdminDestinyShop"));
const AdminBanners = lazy(() => import("./pages/AdminBanners"));
const AdminExperts = lazy(() => import("./pages/AdminExperts"));
const AdminTheme = lazy(() => import("./pages/AdminTheme"));
const AdminAccessTokens = lazy(() => import("./pages/AdminAccessTokens"));
const AiView = lazy(() => import("./pages/AiView"));
const AiEntry = lazy(() => import("./pages/AiEntry"));
const AvatarRoom = lazy(() => import("./pages/game/AvatarRoom"));
const VirtualWorldPage = lazy(() => import("./pages/game/VirtualWorldPage"));
const GameCMS = lazy(() => import("./pages/admin/GameCMS"));
// AdminGameTheater is now integrated into GameCMS
// const AdminGameTheater = lazy(() => import("./pages/admin/AdminGameTheater"));
const Shop = lazy(() => import("./pages/game/Shop"));
const GameShop = lazy(() => import("./pages/game/GameShop"));
const CombatRoom = lazy(() => import("./pages/game/CombatRoom"));
const CharacterProfile = lazy(() => import("./pages/game/CharacterProfile"));
const AdventureAchievements = lazy(() => import("./pages/game/AdventureAchievements"));
const SkillCatalogPage = lazy(() => import("./pages/game/SkillCatalogPage"));
const PvpHistoryPage = lazy(() => import("./pages/game/PvpHistoryPage"));
const AuctionHouse = lazy(() => import("./pages/game/AuctionHouse"));
const QuestSkillPage = lazy(() => import("./pages/game/QuestSkillPage"));
const PetPage = lazy(() => import("./pages/game/PetPage"));
const BossTracker = lazy(() => import("./pages/game/BossTracker"));
const BossCatalogPage = lazy(() => import("./pages/game/BossCatalogPage"));
const GameGuide = lazy(() => import("./pages/GameGuide"));
const EnhancePage = lazy(() => import("./pages/game/EnhancePage"));
const ExpertMarket = lazy(() => import("./pages/ExpertMarket"));
const ExpertDetail = lazy(() => import("./pages/ExpertDetail"));
const ExpertDashboard = lazy(() => import("./pages/expert/ExpertDashboard"));
const ExpertProfile = lazy(() => import("./pages/expert/ExpertProfile"));
const ExpertServices = lazy(() => import("./pages/expert/ExpertServices"));
const ExpertCalendar = lazy(() => import("./pages/expert/ExpertCalendar"));
const ExpertBookings = lazy(() => import("./pages/expert/ExpertOrders"));
const ExpertRevenue = lazy(() => import("./pages/expert/ExpertRevenue"));
const ExpertReviews = lazy(() => import("./pages/expert/ExpertReviews"));
const MyFavorites = lazy(() => import("./pages/MyFavorites"));
const MyBookings = lazy(() => import("./pages/MyBookings"));
const Messages = lazy(() => import("./pages/Messages"));
const OutfitPage = lazy(() => import("@/pages/OutfitPage"));
const WardrobePage = lazy(() => import("@/pages/WardrobePage"));
const DietPage = lazy(() => import("@/pages/DietPage"));
const DivinationPage = lazy(() => import("@/pages/DivinationPage"));
const LuckCyclePage = lazy(() => import("@/pages/LuckCyclePage"));
const WealthPage = lazy(() => import("@/pages/WealthPage"));

// Loading fallback
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">載入中...</p>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* 公開路由：不需登入 */}
        <Route path={"/"} component={LandingPage} />
        {/* AI 特殊存取路由：不需登入，排除在 AccessGate 之外 */}
        <Route path={"/ai-entry"} component={AiEntry} />
        <Route path={"/ai-view"} component={AiView} />
        {/* 其餘路由：需要登入（或 AI session）才能存取 */}
        <Route>
          <AccessGate>
            <Suspense fallback={<PageLoader />}>
              <Switch>
                <Route path={"/war-room"} component={WarRoom} />
                <Route path={"/login"} component={WarRoom} />
                <Route path={"/oracle"} component={Home} />
                <Route path={"/stats"} component={OracleStats} />
                <Route path={"/lottery"} component={LotteryOracle} />
                <Route path={"/calendar"} component={OracleCalendar} />
                <Route path={"/weekly"} component={WeeklyReport} />
                <Route path={"/profile"} component={ProfilePage} />
                <Route path={"/my-profile"} component={MyProfile} />
                <Route path={"/admin/dashboard"} component={AdminDashboard} />
                <Route path={"/admin/users"} component={AdminUsers} />
                <Route path={"/admin/user-groups"} component={AdminUserGroups} />
                <Route path={"/admin/business-hub"} component={AdminBusinessHub} />
                <Route path={"/admin/logic-config"} component={AdminLogicConfig} />
                <Route path={"/admin/marketing"} component={AdminMarketing} />
                <Route path={"/casino/wbc"} component={WbcPage} />
                <Route path={"/casino"} component={CasinoPage} />
                <Route path={"/notifications"} component={NotificationsPage} />
                <Route path={"/feature-store"} component={FeatureStore} />
                <Route path={"/admin/feature-store"} component={AdminFeatureStore} />
                <Route path={"/admin/destiny-shop"} component={AdminDestinyShop} />
                <Route path={"/admin/banners"} component={AdminBanners} />
                <Route path={"/outfit"} component={OutfitPage} />
                <Route path={"/wardrobe"} component={WardrobePage} />
                <Route path={"/diet"} component={DietPage} />
                <Route path={"/divination"} component={DivinationPage} />
                <Route path={"/luck-cycle"} component={LuckCyclePage} />
                <Route path={"/wealth"} component={WealthPage} />
                <Route path={"/add-to-home"} component={AddToHome} />
                {/* Expert System Routes */}
                <Route path={"/experts"} component={ExpertMarket} />
                <Route path={"/experts/:id"} component={ExpertDetail} />
                <Route path={"/messages"} component={Messages} />
                <Route path={"/expert/dashboard"} component={ExpertDashboard} />
                <Route path={"/expert/profile"} component={ExpertProfile} />
                <Route path={"/expert/services"} component={ExpertServices} />
                <Route path={"/expert/calendar"} component={ExpertCalendar} />
                <Route path={"/expert/bookings"} component={ExpertBookings} />
                <Route path={"/expert/revenue"} component={ExpertRevenue} />
                <Route path={"/expert/reviews"} component={ExpertReviews} />
                <Route path={"/my-favorites"} component={MyFavorites} />
                <Route path={"/my-bookings"} component={MyBookings} />
                <Route path={"/admin/experts"} component={AdminExperts} />
                <Route path={"/admin/theme"} component={AdminTheme} />
                <Route path={"/admin/access-tokens"} component={AdminAccessTokens} />
                <Route path={"/admin/game"} component={GameCMS} />
                <Route path="/admin/game-theater">{() => { window.location.replace("/admin/game"); return null; }}</Route>
                <Route path="/game">{() => <GameErrorBoundary><VirtualWorldPage /></GameErrorBoundary>}</Route>
                <Route path={"/game/avatar"} component={AvatarRoom} />
                <Route path={"/game/shop"} component={Shop} />
                <Route path={"/game/gameshop"} component={GameShop} />
                <Route path={"/game/combat"} component={CombatRoom} />
                <Route path={"/game/profile"} component={CharacterProfile} />
                <Route path={"/game/achievements"} component={AdventureAchievements} />
                <Route path={"/game/skills"} component={SkillCatalogPage} />
                <Route path={"/game/pvp-history"} component={PvpHistoryPage} />
                <Route path={"/game/auction"} component={AuctionHouse} />
                <Route path={"/game/quest-skills"} component={QuestSkillPage} />
                <Route path={"/game/pets"} component={PetPage} />
                <Route path={"/game/boss"} component={BossTracker} />
                <Route path={"/game/boss-catalog"} component={BossCatalogPage} />
                <Route path={"/game/guide"} component={GameGuide} />
                <Route path={"/game/enhance"} component={EnhancePage} />
                <Route path={"/404"} component={NotFound} />
                {/* Final fallback route */}
                <Route component={NotFound} />
              </Switch>
            </Suspense>
          </AccessGate>
        </Route>
      </Switch>
    </Suspense>
  );
}

function GlobalGameOverlay() {
  const { user } = useAuth();
  const { latestMessage } = useGameWebSocket({ agentId: null, enabled: !!user });
  return (
    <>
      <LiveFeedContainer latestMessage={latestMessage} className="fixed top-0 left-0 right-0 z-50" />
      <AchievementToastContainer latestMessage={latestMessage} />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <TooltipProvider>
          <ThemeInitializer />
          <Toaster />
          <AiReadOnlyBanner />
          <DailySigninModal />
          <FloatingBanner />
          <GlobalGameOverlay />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
