import { Bot, PlayCircle, Wrench, Activity } from "lucide-react";

export default function StatsCards() {
  const stats = [
    {
      title: "Workers",
      value: "0",
      icon: Bot,
    },
    {
      title: "Runs",
      value: "0",
      icon: PlayCircle,
    },
    {
      title: "Tools",
      value: "0",
      icon: Wrench,
    },
    {
      title: "Success Rate",
      value: "--",
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
            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 hover:border-indigo-500/30 transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <p className="text-slate-400 text-sm">{stat.title}</p>

              <Icon size={20} className="text-indigo-400" />
            </div>

            <h3 className="text-3xl font-bold text-white mt-4">{stat.value}</h3>
          </div>
        );
      })}
    </div>
  );
}
