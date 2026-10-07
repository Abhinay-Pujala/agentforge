import { CheckCircle2, Clock3, History, XCircle } from "lucide-react";

function StatusIcon({ status }) {
  if (status === "COMPLETED") return <CheckCircle2 size={17} className="text-emerald-400" />;
  if (status === "FAILED" || status === "TIMEOUT") return <XCircle size={17} className="text-red-400" />;
  return <Clock3 size={17} className="text-amber-400" />;
}

export default function RecentActivity({ executions = [] }) {
  return (
    <section className="glass-panel p-4 sm:p-5 lg:p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-indigo-300/60 bg-indigo-500/10 text-indigo-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
          <History size={18} />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">
            Recent activity
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Your latest Worker executions.
          </p>
        </div>
      </div>

      {executions.length === 0 ? (
        <div className="glass-list-item border-dashed px-4 py-12 text-center">
          <p className="text-sm font-medium text-slate-700">No executions yet.</p>
          <p className="mt-2 text-sm text-slate-500">
            Run a Worker to start building execution history.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {executions.slice(0, 5).map((execution) => (
            <div
              key={execution._id}
              className="glass-list-item flex items-center gap-3 px-3 py-3 sm:px-4"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/55">
                <StatusIcon status={execution.status} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">
                  {execution.worker?.name || "Worker execution"}
                </p>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {execution.input || "No input provided"}
                </p>
              </div>

              <span className="shrink-0 text-[11px] font-medium text-slate-500">
                {new Date(execution.createdAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
