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
import AdminBusinessHub from "@/pages/AdminBusinessHub";
import OutfitPage from "@/pages/OutfitPage";
import DivinationPage from "@/pages/DivinationPage";
import LuckCyclePage from "@/pages/LuckCyclePage";
import { DailySigninModal } from "@/components/DailySigninModal";

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
        <Route path={"/admin/business-hub"} component={AdminBusinessHub} />
        <Route path={"/outfit"} component={OutfitPage} />
        <Route path={"/divination"} component={DivinationPage} />
        <Route path={"/luck-cycle"} component={LuckCyclePage} />
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
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
