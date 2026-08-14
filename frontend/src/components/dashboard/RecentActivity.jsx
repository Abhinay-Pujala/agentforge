import { History } from "lucide-react";

export default function RecentActivity() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex items-center gap-2 mb-4">
        <History size={20} className="text-indigo-400" />
        <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
      </div>

      <div className="py-12 text-center">
        <p className="text-slate-400">No activity yet.</p>

        <p className="text-sm text-slate-500 mt-2">
          Create your first worker to start tracking activity.
        </p>
      </div>
    </div>
  );
}
