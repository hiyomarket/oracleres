import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "@/pages/Home";
import LandingPage from "@/pages/LandingPage";
import OracleStats from "@/pages/OracleStats";
import LotteryOracle from "@/pages/LotteryOracle";
import OracleCalendar from "@/pages/OracleCalendar";
import WeeklyReport from "@/pages/WeeklyReport";
import WarRoom from "@/pages/WarRoom";
import ProfilePage from "@/pages/ProfilePage";
import MyProfile from "@/pages/MyProfile";
import { AccessGate } from "@/components/AccessGate";
import AddToHome from "@/pages/AddToHome";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminUsers from "@/pages/AdminUsers";
import AdminUserGroups from "@/pages/AdminUserGroups";
import AdminBusinessHub from "@/pages/AdminBusinessHub";
import AdminLogicConfig from "@/pages/AdminLogicConfig";
import AdminMarketing from "@/pages/AdminMarketing";
import CasinoPage from "./pages/CasinoPage";
import WbcPage from "./pages/WbcPage";
import NotificationsPage from "./pages/NotificationsPage";
import FeatureStore from "./pages/FeatureStore";
import AdminFeatureStore from "./pages/AdminFeatureStore";
import AdminDestinyShop from "./pages/AdminDestinyShop";
import AdminBanners from "./pages/AdminBanners";
import AdminExperts from "./pages/AdminExperts";
import AdminTheme from "./pages/AdminTheme";
import AdminAccessTokens from "./pages/AdminAccessTokens";
import AiView from "./pages/AiView";
import AiEntry from "./pages/AiEntry";
import AvatarRoom from "./pages/game/AvatarRoom";
import GameLobby from "./pages/game/GameLobby";
import VirtualWorldPage from "./pages/game/VirtualWorldPage";
import GameCMS from "./pages/admin/GameCMS";
import AdminGameTheater from "./pages/admin/AdminGameTheater";
import Shop from "./pages/game/Shop";
import GameShop from "./pages/game/GameShop";
import CombatRoom from "./pages/game/CombatRoom";
import CharacterProfile from "./pages/game/CharacterProfile";
import ExpertMarket from "./pages/ExpertMarket";
import ExpertDetail from "./pages/ExpertDetail";
import ExpertDashboard from "./pages/expert/ExpertDashboard";
import ExpertProfile from "./pages/expert/ExpertProfile";
import ExpertServices from "./pages/expert/ExpertServices";
import ExpertCalendar from "./pages/expert/ExpertCalendar";
import ExpertBookings from "./pages/expert/ExpertOrders";
import MyBookings from "./pages/MyBookings";
import Messages from "./pages/Messages";
import OutfitPage from "@/pages/OutfitPage";
import WardrobePage from "@/pages/WardrobePage";
import DietPage from "@/pages/DietPage";
import DivinationPage from "@/pages/DivinationPage";
import LuckCyclePage from "@/pages/LuckCyclePage";
import WealthPage from "@/pages/WealthPage";
import { DailySigninModal } from "./components/DailySigninModal";
import { FloatingBanner } from "./components/FloatingBanner";
import { AiReadOnlyBanner } from "./components/AiReadOnlyBanner";
import { ThemeInitializer } from "./components/ThemeInitializer";

function Router() {
  return (
    <Switch>
      {/* 公開路由：不需登入 */}
      <Route path={"/"} component={LandingPage} />
      {/* AI 特殊存取路由：不需登入，排除在 AccessGate 之外 */}
      <Route path={"/ai-entry"} component={AiEntry} />
      <Route path={"/ai-view"} component={AiView} />

      {/* 其餘路由：需要登入（或 AI session）才能存取 */}
      <Route>
        <AccessGate>
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
            <Route path={"/my-bookings"} component={MyBookings} />
            <Route path={"/admin/experts"} component={AdminExperts} />
            <Route path={"/admin/theme"} component={AdminTheme} />
            <Route path={"/admin/access-tokens"} component={AdminAccessTokens} />
            <Route path={"/admin/game"} component={GameCMS} />
            <Route path={"/admin/game-theater"} component={AdminGameTheater} />
            <Route path={"/game"} component={VirtualWorldPage} />
            <Route path={"/game/avatar"} component={AvatarRoom} />
            <Route path={"/game/shop"} component={Shop} />
            <Route path={"/game/gameshop"} component={GameShop} />
            <Route path={"/game/combat"} component={CombatRoom} />
            <Route path={"/game/profile"} component={CharacterProfile} />
            <Route path={"/404"} component={NotFound} />
            {/* Final fallback route */}
            <Route component={NotFound} />
          </Switch>
        </AccessGate>
      </Route>
    </Switch>
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
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
