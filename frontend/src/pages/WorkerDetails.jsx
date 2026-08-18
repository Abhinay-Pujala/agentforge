import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bot,
  Calendar,
  Clock,
  Edit,
  Loader2,
  Play,
  Send,
  Settings2,
  Trash2,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import {
  getWorkerById,
  deleteWorker,
  updateWorkerStatus,
  runWorker,
} from "../services/worker.service";

export default function WorkerDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [executionInput, setExecutionInput] = useState("");
  const [executionOutput, setExecutionOutput] = useState("");
  const [executionError, setExecutionError] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    async function fetchWorker() {
      try {
        setLoading(true);
        setError("");

        const worker = await getWorkerById(id);

        setWorker(worker);
      } catch (error) {
        console.error("Failed to fetch worker:", error);

        setError(
          error.response?.data?.message ||
            error.message ||
            "Failed to load worker.",
        );
      } finally {
        setLoading(false);
      }
    }

    fetchWorker();
  }, [id]);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${worker.name}"? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsDeleting(true);

      await deleteWorker(worker._id);

      navigate("/dashboard/workers");
    } catch (error) {
      console.error("Failed to delete worker:", error);

      setError(
        error.response?.data?.message ||
          error.message ||
          "Failed to delete worker.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleRunWorker(event) {
    event.preventDefault();

    const input = executionInput.trim();

    if (!input) {
      setExecutionError("Please enter an input for the worker.");
      return;
    }

    try {
      setIsExecuting(true);
      setExecutionError("");
      setExecutionOutput("");

      const result = await runWorker(worker._id, input);

      setExecutionOutput(result.output || "");
    } catch (error) {
      console.error("Failed to run worker:", error);

      setExecutionError(
        error.response?.data?.message ||
          error.message ||
          "Failed to run worker.",
      );
    } finally {
      setIsExecuting(false);
    }
  }

  async function handleToggleStatus() {
    const nextStatus = worker.status === "enabled" ? "disabled" : "enabled";

    try {
      setIsUpdatingStatus(true);
      setError("");

      const Worker = await updateWorkerStatus(worker._id, nextStatus);

      setWorker(Worker);
    } catch (error) {
      console.error("Failed to update worker status:", error);

      setError(
        error.response?.data?.message ||
          error.message ||
          "Failed to update worker status.",
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Worker Details">
        <div className="flex min-h-80 items-center justify-center">
          <p className="text-sm text-slate-400">Loading worker...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Worker Details">
        <div className="space-y-6">
          <button
            type="button"
            onClick={() => navigate("/dashboard/workers")}
            className="flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white cursor-pointer"
          >
            <ArrowLeft size={17} />
            Back to Workers
          </button>

          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!worker) {
    return null;
  }

  return (
    <DashboardLayout title="Worker Details">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Back */}
        <button
          type="button"
          onClick={() => navigate("/dashboard/workers")}
          className="flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white cursor-pointer"
        >
          <ArrowLeft size={17} />
          Back to Workers
        </button>

        {/* Header */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10">
                <Bot size={28} className="text-indigo-400" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-white">{worker.name}</h1>

                <p className="mt-2 max-w-2xl text-sm text-slate-400">
                  {worker.description}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  worker.status === "enabled"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-slate-700 text-slate-400"
                }`}
              >
                {worker.status}
              </span>

              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={isUpdatingStatus}
                className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                {isUpdatingStatus
                  ? "Updating..."
                  : worker.status === "enabled"
                    ? "Disable"
                    : "Enable"}
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate(`/dashboard/workers/${worker._id}/edit`)
                }
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-indigo-500 cursor-pointer"
              >
                <Edit size={17} />
                Edit
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 rounded-xl border border-red-500/30 px-4 py-2.5 text-sm font-medium text-red-400 transition-all hover:border-red-500/50 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                <Trash2 size={17} />
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </section>

        {/* Run Worker */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Run Worker</h2>

              <p className="mt-1 text-sm text-slate-400">
                Send an input to this worker and view its response.
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10">
              <Play size={18} className="text-indigo-400" />
            </div>
          </div>

          <form onSubmit={handleRunWorker} className="space-y-4">
            <div>
              <label
                htmlFor="execution-input"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                Input
              </label>

              <textarea
                id="execution-input"
                value={executionInput}
                onChange={(event) => setExecutionInput(event.target.value)}
                rows={5}
                placeholder="Ask your worker something..."
                disabled={isExecuting || worker.status !== "enabled"}
                className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm leading-6 text-white outline-none transition-all placeholder:text-slate-600 focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {executionError && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {executionError}
              </div>
            )}

            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-slate-500">
                {worker.status === "enabled"
                  ? "Worker is ready to execute."
                  : "Enable this worker before running it."}
              </p>

              <button
                type="submit"
                disabled={
                  isExecuting ||
                  worker.status !== "enabled" ||
                  !executionInput.trim()
                }
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                {isExecuting ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Send size={17} />
                    Run Worker
                  </>
                )}
              </button>
            </div>
          </form>

          {executionOutput && (
            <div className="mt-6 border-t border-slate-800 pt-6">
              <h3 className="mb-3 text-sm font-semibold text-white">
                Worker Response
              </h3>

              <div className="whitespace-pre-wrap rounded-xl bg-slate-950 p-5 text-sm leading-7 text-slate-300">
                {executionOutput}
              </div>
            </div>
          )}
        </section>

        {/* Model + Configuration */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Model */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-4 flex items-center gap-3">
              <Settings2 size={19} className="text-indigo-400" />

              <h2 className="font-semibold text-white">Model</h2>
            </div>

            <p className="break-all rounded-xl bg-slate-950 px-4 py-3 font-mono text-sm text-slate-300">
              {worker.model}
            </p>
          </section>

          {/* Configuration */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-4 flex items-center gap-3">
              <Settings2 size={19} className="text-indigo-400" />

              <h2 className="font-semibold text-white">Configuration</h2>
            </div>

            <pre className="max-h-64 overflow-auto rounded-xl bg-slate-950 p-4 font-mono text-sm leading-6 text-slate-300">
              {JSON.stringify(worker.configuration || {}, null, 2)}
            </pre>
          </section>
        </div>

        {/* Instructions */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Instructions
          </h2>

          <div className="whitespace-pre-wrap rounded-xl bg-slate-950 p-5 text-sm leading-7 text-slate-300">
            {worker.instructions}
          </div>
        </section>

        {/* Metadata */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-5 text-lg font-semibold text-white">
            Worker Information
          </h2>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <Calendar size={18} className="mt-0.5 text-slate-500" />

              <div>
                <p className="text-xs text-slate-500">Created</p>

                <p className="mt-1 text-sm text-slate-300">
                  {new Date(worker.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock size={18} className="mt-0.5 text-slate-500" />

              <div>
                <p className="text-xs text-slate-500">Last Updated</p>

                <p className="mt-1 text-sm text-slate-300">
                  {new Date(worker.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
