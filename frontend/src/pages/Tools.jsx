import { Calculator, CheckCircle2, Wrench } from "lucide-react";
import DashboardLayout from "../layouts/DashboardLayout";

const AVAILABLE_TOOLS = [
  {
    name: "calculator",
    label: "Calculator",
    description: "Performs arithmetic calculations.",
    permission: "calculator.execute",
    status: "Available",
    icon: Calculator,
  },
];

export default function Tools() {
  return (
    <DashboardLayout title="Tools">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo-600/10 border border-indigo-500/20">
              <Wrench className="text-indigo-400" size={24} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-white">Tools</h1>
              <p className="text-slate-400 mt-1">
                Capabilities available to your AI workers.
              </p>
            </div>
          </div>
        </div>

        {/* Available Tools */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">
              Available Tools
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Tools registered in the AgentForge runtime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {AVAILABLE_TOOLS.map((tool) => {
              const Icon = tool.icon;

              return (
                <div
                  key={tool.name}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-colors"
                >
                  {/* Tool Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-slate-800">
                        <Icon size={22} className="text-indigo-400" />
                      </div>

                      <div>
                        <h3 className="text-white font-semibold">
                          {tool.label}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          {tool.name}
                        </p>
                      </div>
                    </div>

                    <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 rounded-full">
                      <CheckCircle2 size={14} />
                      {tool.status}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-slate-400 mt-5 leading-relaxed">
                    {tool.description}
                  </p>

                  {/* Permission */}
                  <div className="mt-6 pt-4 border-t border-slate-800">
                    <p className="text-xs text-slate-500 mb-2">
                      Required Permission
                    </p>

                    <code className="inline-block text-xs text-indigo-300 bg-slate-800 px-3 py-2 rounded-lg">
                      {tool.permission}
                    </code>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
