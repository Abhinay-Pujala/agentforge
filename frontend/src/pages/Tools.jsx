import { Calculator, CheckCircle2, Workflow, Wrench } from "lucide-react";
import DashboardLayout from "../layouts/DashboardLayout";

const AVAILABLE_TOOLS = [
  {
    name: "calculator",
    label: "Calculator",
    description: "Performs safe basic arithmetic calculations.",
    permission: "calculator.execute",
    icon: Calculator,
  },
  {
    name: "n8n.trigger",
    label: "Workflow trigger",
    description: "Runs a registered n8n workflow when a Worker is explicitly asked to perform an actionable task.",
    permission: "n8n.trigger",
    icon: Workflow,
  },
];

export default function Tools() {
  return (
    <DashboardLayout title="Tools">
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10">
              <Wrench className="text-indigo-400" size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Tools</h1>
              <p className="mt-1 text-sm text-slate-400">
                Capabilities available to Workers at runtime.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {AVAILABLE_TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <article
                key={tool.name}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-indigo-500/30"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800">
                      <Icon size={21} className="text-indigo-400" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-white">{tool.label}</h2>
                      <code className="text-xs text-slate-500">{tool.name}</code>
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-400">
                    <CheckCircle2 size={14} />
                    Available
                  </span>
                </div>

                <p className="mt-5 text-sm leading-6 text-slate-400">{tool.description}</p>

                <div className="mt-5 border-t border-slate-800 pt-4">
                  <p className="mb-2 text-xs text-slate-500">Permission</p>
                  <code className="rounded-lg bg-slate-800 px-3 py-2 text-xs text-indigo-300">
                    {tool.permission}
                  </code>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
