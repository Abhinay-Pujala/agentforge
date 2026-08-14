import RecentActivity from "../components/dashboard/RecentActivity";
import StatsCards from "../components/dashboard/StatsCards";
import WelcomeCard from "../components/dashboard/WelcomeCard";
import DashboardLayout from "../layouts/DashboardLayout";

export default function Dashboard() {
  return (
    <DashboardLayout title={"Dashboard"}>
      <div className="space-y-6">
        <WelcomeCard />
        <StatsCards />
        <RecentActivity />
      </div>
    </DashboardLayout>
  );
}
