import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout.jsx";
import { getExecutions } from "../services/execution.service.js";
import { getWorkers } from "../services/worker.service.js";
import { CheckCircle2, Clock, Loader2, Timer, XCircle } from "lucide-react";

export default function Executions() {
  const navigate = useNavigate();

  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [workers, setWorkers] = useState([]);
  const [workerId, setWorkerId] = useState("");

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  async function fetchExecutions(
    page = 1,
    selectedStatus = status,
    selectedWorkerId = workerId,
    selectedFrom = from,
    selectedTo = to,
  ) {
    try {
      setLoading(true);
      setError("");

      const result = await getExecutions({
        page,
        limit: pagination.limit,
        status: selectedStatus || undefined,
        workerId: selectedWorkerId || undefined,
        from: selectedFrom || undefined,
        to: selectedTo || undefined,
      });

      setExecutions(result.executions);
      setPagination(result.pagination);
    } catch (error) {
      console.error("Failed to fetch executions:", error);

      setError(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch executions.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function fetchWorkers() {
      try {
        const result = await getWorkers();
        setWorkers(result);
      } catch (error) {
        console.error("Failed to fetch workers:", error);
      }
    }

    fetchWorkers();
  }, []);

  useEffect(() => {
    fetchExecutions();
  }, []);

  return (
    <DashboardLayout title="Executions">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h1 className="text-2xl font-bold text-white">Execution History</h1>

          <p className="mt-2 text-sm text-slate-400">
            View and monitor all worker executions.
          </p>
        </section>
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label
              htmlFor="status"
              className="mb-1 block text-xs font-medium text-slate-400"
            >
              Status
            </label>

            <select
              id="status"
              value={status}
              onChange={(e) => {
                const newStatus = e.target.value;

                setStatus(newStatus);
                fetchExecutions(1, newStatus);
              }}
              className="cursor-pointer rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white outline-none transition focus:border-indigo-500"
            >
              <option value="">All statuses</option>
              <option value="QUEUED">Queued</option>
              <option value="RUNNING">Running</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
              <option value="TIMEOUT">Timeout</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="worker"
              className="mb-1 block text-xs font-medium text-slate-400"
            >
              Worker
            </label>

            <select
              id="worker"
              value={workerId}
              onChange={(e) => {
                const newWorkerId = e.target.value;

                setWorkerId(newWorkerId);
                fetchExecutions(1, status, newWorkerId);
              }}
              className="cursor-pointer rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white outline-none transition focus:border-indigo-500"
            >
              <option value="">All workers</option>

              {workers.map((worker) => (
                <option key={worker._id} value={worker._id}>
                  {worker.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="from"
              className="mb-1 block text-xs font-medium text-slate-400"
            >
              From
            </label>

            <input
              id="from"
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => {
                const newFrom = e.target.value;

                setFrom(newFrom);
                fetchExecutions(1, status, workerId, newFrom, to);
              }}
              className="cursor-pointer rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white outline-none transition focus:border-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="to"
              className="mb-1 block text-xs font-medium text-slate-400"
            >
              To
            </label>

            <input
              id="to"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => {
                const newTo = e.target.value;

                setTo(newTo);
                fetchExecutions(1, status, workerId, from, newTo);
              }}
              className="cursor-pointer rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white outline-none transition focus:border-indigo-500"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setStatus("");
              setWorkerId("");
              setFrom("");
              setTo("");

              fetchExecutions(1, "", "", "", "");
            }}
            className="mt-5 cursor-pointer rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
          >
            Clear Filters
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            Loading executions...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-400">
            {error}
          </div>
        ) : (
          <div className="space-y-4">
            {executions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 py-16 text-center">
                <Clock size={32} className="mx-auto mb-3 text-slate-600" />

                <p className="text-sm font-medium text-slate-300">
                  No executions found
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Run one of your workers to see execution history here.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {executions.map((execution) => (
                    <button
                      key={execution._id}
                      type="button"
                      onClick={() =>
                        navigate(`/dashboard/executions/${execution._id}`)
                      }
                      className="w-full cursor-pointer rounded-2xl border border-slate-800 bg-slate-900 p-5 text-left transition-all hover:border-indigo-500 hover:bg-slate-800/50"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 flex flex-1 items-start gap-4">
                          {/* Status Icon */}
                          <div className="mt-0.5">
                            {execution.status === "COMPLETED" ? (
                              <CheckCircle2
                                size={22}
                                className="text-emerald-400"
                              />
                            ) : execution.status === "FAILED" ||
                              execution.status === "TIMEOUT" ? (
                              <XCircle size={22} className="text-red-400" />
                            ) : (
                              <Loader2
                                size={22}
                                className="animate-spin text-yellow-400"
                              />
                            )}
                          </div>

                          {/* Execution Information */}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-medium text-white">
                                {execution.worker?.name || "Unknown Worker"}
                              </h3>

                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                  execution.status === "COMPLETED"
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : execution.status === "FAILED" ||
                                        execution.status === "TIMEOUT"
                                      ? "bg-red-500/10 text-red-400"
                                      : "bg-yellow-500/10 text-yellow-400"
                                }`}
                              >
                                {execution.status}
                              </span>
                            </div>

                            <p className="mt-2 line-clamp-2 text-sm text-slate-400">
                              {execution.input || "No input provided"}
                            </p>

                            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                              <span>
                                {new Date(execution.createdAt).toLocaleString()}
                              </span>

                              {execution.durationMs !== null &&
                                execution.durationMs !== undefined && (
                                  <span className="flex items-center gap-1">
                                    <Timer size={13} />
                                    {(execution.durationMs / 1000).toFixed(2)}s
                                  </span>
                                )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                {pagination.totalPages > 1 && (
                  <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:flex-row">
                    <p className="text-sm text-slate-400">
                      Page {pagination.page} of {pagination.totalPages}
                      <span className="ml-2 text-slate-600">
                        ({pagination.total} executions)
                      </span>
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={pagination.page === 1}
                        onClick={() =>
                          fetchExecutions(
                            pagination.page - 1,
                            status,
                            workerId,
                            from,
                            to,
                          )
                        }
                        className="cursor-pointer rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Previous
                      </button>

                      <button
                        type="button"
                        disabled={pagination.page === pagination.totalPages}
                        onClick={() =>
                          fetchExecutions(
                            pagination.page + 1,
                            status,
                            workerId,
                            from,
                            to,
                          )
                        }
                        className="cursor-pointer rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
