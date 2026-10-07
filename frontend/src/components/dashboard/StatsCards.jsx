import { Bot, PlayCircle, Wrench, Activity } from "lucide-react";

export default function StatsCards({ workers = [], executions = [], workflows = [] }) {
  const completed = executions.filter((item) => item.status === "COMPLETED").length;
  const finished = executions.filter((item) =>
    ["COMPLETED", "FAILED", "TIMEOUT"].includes(item.status),
  ).length;

  const stats = [
    { title: "Workers", value: workers.length, icon: Bot },
    { title: "Runs", value: executions.length, icon: PlayCircle },
    { title: "Workflows", value: workflows.length, icon: Wrench },
    {
      title: "Success rate",
      value: finished ? `${Math.round((completed / finished) * 100)}%` : "—",
      icon: Activity,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <div
            key={stat.title}
            className="glass-panel p-4 sm:p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-600">{stat.title}</p>
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-indigo-300/60 bg-indigo-500/10 text-indigo-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
                <Icon size={18} />
              </div>
            </div>

            <h3 className="mt-5 text-3xl font-bold tracking-tight text-slate-900">
              {stat.value}
            </h3>
          </div>
        );
      })}
    </div>
  );
}
