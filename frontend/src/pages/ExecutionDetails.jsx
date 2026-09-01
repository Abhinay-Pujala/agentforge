import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Coins,
  Cpu,
  Loader2,
  Timer,
  XCircle,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout.jsx";
import { getExecutionById } from "../services/execution.service.js";

export default function ExecutionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [execution, setExecution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchExecution() {
      try {
        setLoading(true);
        setError("");

        const result = await getExecutionById(id);

        setExecution(result);
      } catch (error) {
        console.error("Failed to fetch execution:", error);

        setError(
          error.response?.data?.message ||
            error.message ||
            "Failed to fetch execution details.",
        );
      } finally {
        setLoading(false);
      }
    }

    fetchExecution();
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout title="Execution Details">
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 size={32} className="animate-spin text-indigo-400" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Execution Details">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6">
            <p className="text-red-400">{error}</p>

            <button
              type="button"
              onClick={() => navigate("/dashboard/executions")}
              className="mt-4 cursor-pointer rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700"
            >
              Back to Executions
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!execution) {
    return null;
  }

  return (
    <DashboardLayout title="Execution Details">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Back Button */}
        <button
          type="button"
          onClick={() => navigate("/dashboard/executions")}
          className="flex cursor-pointer items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to Executions
        </button>

        {/* Header */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-slate-400">
                {execution.worker?.name || "Unknown Worker"}
              </p>

              <h1 className="mt-1 text-2xl font-bold text-white">
                Execution Details
              </h1>

              <p className="mt-2 font-mono text-xs text-slate-500">
                {execution._id}
              </p>
            </div>

            <div
              className={`flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${
                execution.status === "COMPLETED"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : execution.status === "FAILED" ||
                      execution.status === "TIMEOUT"
                    ? "bg-red-500/10 text-red-400"
                    : "bg-yellow-500/10 text-yellow-400"
              }`}
            >
              {execution.status === "COMPLETED" ? (
                <CheckCircle2 size={16} />
              ) : execution.status === "FAILED" ||
                execution.status === "TIMEOUT" ? (
                <XCircle size={16} />
              ) : (
                <Loader2 size={16} className="animate-spin" />
              )}

              {execution.status}
            </div>
          </div>
        </section>

        {/* Overview */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center gap-2 text-slate-400">
              <Cpu size={16} />
              <span className="text-xs">Model</span>
            </div>

            <p className="mt-3 truncate text-sm font-medium text-white">
              {execution.model || "Not available"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center gap-2 text-slate-400">
              <Timer size={16} />
              <span className="text-xs">Duration</span>
            </div>

            <p className="mt-3 text-sm font-medium text-white">
              {execution.durationMs !== null &&
              execution.durationMs !== undefined
                ? `${(execution.durationMs / 1000).toFixed(2)}s`
                : "Not available"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center gap-2 text-slate-400">
              <Clock size={16} />
              <span className="text-xs">Started</span>
            </div>

            <p className="mt-3 text-sm font-medium text-white">
              {execution.startedAt
                ? new Date(execution.startedAt).toLocaleString()
                : "Not available"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center gap-2 text-slate-400">
              <Clock size={16} />
              <span className="text-xs">Completed</span>
            </div>

            <p className="mt-3 text-sm font-medium text-white">
              {execution.completedAt
                ? new Date(execution.completedAt).toLocaleString()
                : "Not available"}
            </p>
          </div>
        </section>

        {/* Input */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold text-white">Input</h2>

          <div className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-950 p-4 text-sm leading-6 text-slate-300">
            {execution.input || "No input provided"}
          </div>
        </section>

        {/* Output */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold text-white">Output</h2>

          <div className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-950 p-4 text-sm leading-6 text-slate-300">
            {execution.output || "No output available"}
          </div>
        </section>

        {/* Error */}
        {(execution.status === "FAILED" || execution.status === "TIMEOUT") && (
          <section className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-red-400">
              <XCircle size={18} />
              Execution Error
            </h2>

            <div className="mt-4 rounded-xl bg-slate-950 p-4">
              <p className="text-sm text-red-300">
                {execution.error?.message || "No error details available"}
              </p>

              {execution.error?.code && (
                <p className="mt-2 font-mono text-xs text-red-400/70">
                  Code: {execution.error.code}
                </p>
              )}
            </div>
          </section>
        )}

        {/* Usage */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center gap-2">
            <Coins size={18} className="text-indigo-400" />

            <h2 className="text-lg font-semibold text-white">Usage & Cost</h2>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-slate-950 p-4">
              <p className="text-xs text-slate-500">Prompt Tokens</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {execution.usage?.promptTokens ?? "—"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-950 p-4">
              <p className="text-xs text-slate-500">Completion Tokens</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {execution.usage?.completionTokens ?? "—"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-950 p-4">
              <p className="text-xs text-slate-500">Total Tokens</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {execution.usage?.totalTokens ?? "—"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-950 p-4">
              <p className="text-xs text-slate-500">Estimated Cost</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {execution.cost !== null && execution.cost !== undefined
                  ? `$${execution.cost.toFixed(6)}`
                  : "—"}
              </p>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
