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
import AccountManager from "@/pages/AccountManager";
import MyProfile from "@/pages/MyProfile";
import PermissionManager from "@/pages/PermissionManager";
import { AccessGate } from "@/components/AccessGate";

function Router() {
  return (
    <AccessGate>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/stats"} component={OracleStats} />
        <Route path={"/lottery"} component={LotteryOracle} />
        <Route path={"/calendar"} component={OracleCalendar} />
        <Route path={"/weekly"} component={WeeklyReport} />
        <Route path={"/war-room"} component={WarRoom} />
        <Route path={"/profile"} component={ProfilePage} />
        <Route path={"/account-manager"} component={AccountManager} />
        <Route path={"/my-profile"} component={MyProfile} />
        <Route path={"/permission-manager"} component={PermissionManager} />
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
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
