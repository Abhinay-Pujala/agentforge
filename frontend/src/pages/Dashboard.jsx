import { useEffect, useState } from "react";
import RecentActivity from "../components/dashboard/RecentActivity";
import StatsCards from "../components/dashboard/StatsCards";
import WelcomeCard from "../components/dashboard/WelcomeCard";
import DashboardLayout from "../layouts/DashboardLayout";
import { getExecutions } from "../services/execution.service";
import { getWorkers } from "../services/worker.service";

export default function Dashboard() {
  const [workers, setWorkers] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [workerResult, executionResult] = await Promise.all([
          getWorkers(),
          getExecutions({ limit: 10 }),
        ]);

        if (mounted) {
          setWorkers(workerResult || []);
          setExecutions(executionResult?.executions || []);
        }
      } catch (error) {
        console.error("Failed to load dashboard:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <DashboardLayout title="Dashboard">
      <div className="mx-auto max-w-7xl space-y-6">
        <WelcomeCard />
        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
            Loading workspace activity...
          </div>
        ) : (
          <>
            <StatsCards workers={workers} executions={executions} />
            <RecentActivity executions={executions} />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
