import { Plus, Bot, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import { useEffect, useState } from "react";
import {
  getWorkers,
  deleteWorker,
  updateWorkerStatus,
} from "../services/worker.service";

export default function Workers() {
  const navigate = useNavigate();

  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingWorkerId, setDeletingWorkerId] = useState(null);
  const [updatingWorkerId, setUpdatingWorkerId] = useState(null);

  useEffect(() => {
    async function fetchWorkers() {
      try {
        setLoading(true);
        setError("");

        const workers = await getWorkers();

        setWorkers(workers);
      } catch (error) {
        console.error("Failed to fetch workers:", error);

        setError(
          error.response?.data?.message ||
            error.message ||
            "Failed to load workers.",
        );
      } finally {
        setLoading(false);
      }
    }

    fetchWorkers();
  }, []);

  async function handleDelete(worker) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${worker.name}"? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingWorkerId(worker._id);
      setError("");

      await deleteWorker(worker._id);

      setWorkers((previous) =>
        previous.filter((item) => item._id !== worker._id),
      );
    } catch (error) {
      console.error("Failed to delete worker:", error);

      setError(
        error.response?.data?.message ||
          error.message ||
          "Failed to delete worker.",
      );
    } finally {
      setDeletingWorkerId(null);
    }
  }

  async function handleToggleStatus(worker) {
    const nextStatus = worker.status === "enabled" ? "disabled" : "enabled";

    try {
      setUpdatingWorkerId(worker._id);
      setError("");

      await updateWorkerStatus(worker._id, nextStatus);

      setWorkers((previous) =>
        previous.map((item) =>
          item._id === worker._id ? { ...item, status: nextStatus } : item,
        ),
      );
    } catch (error) {
      console.error("Failed to update worker status:", error);

      setError(
        error.response?.data?.message ||
          error.message ||
          "Failed to update worker status.",
      );
    } finally {
      setUpdatingWorkerId(null);
    }
  }

  return (
    <DashboardLayout title="Workers">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">AI Workers</h1>

            <p className="mt-1 text-sm text-slate-400">
              Create and manage your intelligent AI workforce.
            </p>
          </div>

          <button
            onClick={() => navigate("/dashboard/workers/new")}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-indigo-500 cursor-pointer"
          >
            <Plus size={18} />
            Create Worker
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <p className="text-sm text-slate-400">Loading workers...</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        ) : workers.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 px-6 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10">
              <Bot size={28} className="text-indigo-400" />
            </div>

            <h2 className="text-lg font-semibold text-white">No workers yet</h2>

            <p className="mt-2 max-w-md text-sm text-slate-400">
              Create your first AI Worker to start building your intelligent
              workforce.
            </p>

            <button
              onClick={() => navigate("/dashboard/workers/new")}
              className="mt-5 flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 transition-all duration-200 hover:border-indigo-500/50 hover:bg-slate-800 hover:text-white cursor-pointer"
            >
              <Plus size={17} />
              Create your first worker
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {workers.map((worker) => (
              <div
                key={worker._id}
                className="rounded-2xl border border-white/10 bg-slate-900 p-6 transition-all duration-200 hover:border-indigo-500/30"
              >
                <div
                  onClick={() => navigate(`/dashboard/workers/${worker._id}`)}
                  className="cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold text-white">
                        {worker.name}
                      </h2>

                      <p className="mt-2 line-clamp-2 text-sm text-slate-400">
                        {worker.description}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                        worker.status === "enabled"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-slate-700 text-slate-400"
                      }`}
                    >
                      {worker.status}
                    </span>
                  </div>

                  <div className="mt-5 border-t border-slate-800 pt-4">
                    <span className="text-xs text-slate-500">
                      {worker.model}
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-4">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(worker)}
                    disabled={updatingWorkerId === worker._id}
                    className="rounded-lg px-3 py-2 text-xs font-medium text-slate-300 transition-all hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                  >
                    {updatingWorkerId === worker._id
                      ? "Updating..."
                      : worker.status === "enabled"
                        ? "Disable"
                        : "Enable"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(worker)}
                    disabled={deletingWorkerId === worker._id}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-red-400 transition-all hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                  >
                    <Trash2 size={15} />

                    {deletingWorkerId === worker._id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
