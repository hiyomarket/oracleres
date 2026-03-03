import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "@/pages/Home";
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
import AdminBanners from "./pages/AdminBanners";
import OutfitPage from "@/pages/OutfitPage";
import WardrobePage from "@/pages/WardrobePage";
import DietPage from "@/pages/DietPage";
import DivinationPage from "@/pages/DivinationPage";
import LuckCyclePage from "@/pages/LuckCyclePage";
import WealthPage from "@/pages/WealthPage";
import { DailySigninModal } from "./components/DailySigninModal";
import { FloatingBanner } from "./components/FloatingBanner";

function Router() {
  return (
    <AccessGate>
      <Switch>
        <Route path={"/"} component={WarRoom} />
        <Route path={"/oracle"} component={Home} />
        <Route path={"/stats"} component={OracleStats} />
        <Route path={"/lottery"} component={LotteryOracle} />
        <Route path={"/calendar"} component={OracleCalendar} />
        <Route path={"/weekly"} component={WeeklyReport} />
        <Route path={"/war-room"} component={WarRoom} />
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
        <Route path={"/admin/banners"} component={AdminBanners} />
        <Route path={"/outfit"} component={OutfitPage} />
        <Route path={"/wardrobe"} component={WardrobePage} />
        <Route path={"/diet"} component={DietPage} />
        <Route path={"/divination"} component={DivinationPage} />
        <Route path={"/luck-cycle"} component={LuckCyclePage} />
        <Route path={"/wealth"} component={WealthPage} />
        <Route path={"/add-to-home"} component={AddToHome} />
        <Route path={"/404"} component={NotFound} />
        {/* Final fallback route */}
        <Route component={NotFound} />
      </Switch>
    </AccessGate>
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
          <Toaster />
          <DailySigninModal />
          <FloatingBanner />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
