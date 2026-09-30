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
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <div
            key={stat.title}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-indigo-500/30"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">{stat.title}</p>
              <Icon size={20} className="text-indigo-400" />
            </div>
            <h3 className="mt-4 text-3xl font-bold text-white">{stat.value}</h3>
          </div>
        );
      })}
    </div>
  );
}
