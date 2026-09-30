import { CheckCircle2, Clock3, History, XCircle } from "lucide-react";

function StatusIcon({ status }) {
  if (status === "COMPLETED") return <CheckCircle2 size={17} className="text-emerald-400" />;
  if (status === "FAILED" || status === "TIMEOUT") return <XCircle size={17} className="text-red-400" />;
  return <Clock3 size={17} className="text-amber-400" />;
}

export default function RecentActivity({ executions = [] }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-5 flex items-center gap-2">
        <History size={20} className="text-indigo-400" />
        <div>
          <h2 className="text-lg font-semibold text-white">Recent activity</h2>
          <p className="mt-1 text-sm text-slate-500">Your latest Worker executions.</p>
        </div>
      </div>

      {executions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 py-12 text-center">
          <p className="text-sm text-slate-400">No executions yet.</p>
          <p className="mt-1 text-xs text-slate-600">Run a Worker to start building execution history.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-800">
          {executions.slice(0, 5).map((execution) => (
            <div key={execution._id} className="flex items-center gap-3 py-4">
              <StatusIcon status={execution.status} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-200">
                  {execution.worker?.name || "Worker execution"}
                </p>
                <p className="mt-1 truncate text-xs text-slate-500">{execution.input}</p>
              </div>
              <span className="shrink-0 text-xs text-slate-600">
                {new Date(execution.createdAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
