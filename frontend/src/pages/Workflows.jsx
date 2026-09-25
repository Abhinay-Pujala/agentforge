import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import DashboardLayout from "../layouts/DashboardLayout";
import { deleteWorkflow, getWorkflows } from "../services/workflow.service";

export default function Workflows() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");

  async function loadWorkflows() {
    try {
      setError("");
      setIsLoading(true);
      const result = await getWorkflows();
      setWorkflows(Array.isArray(result) ? result : result?.workflows || []);
    } catch (err) {
      console.error("Failed to load workflows:", err);
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Failed to load workflows.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadWorkflows();
  }, []);

  async function handleDelete(workflow) {
    if (
      !window.confirm(
        `Delete the workflow "${workflow.name}"? Workers assigned to it may no longer be able to trigger it.`,
      )
    ) {
      return;
    }

    try {
      setError("");
      setDeletingId(workflow._id);
      await deleteWorkflow(workflow._id);
      setWorkflows((previous) =>
        previous.filter((item) => item._id !== workflow._id),
      );
    } catch (err) {
      console.error("Failed to delete workflow:", err);
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Failed to delete workflow.",
      );
    } finally {
      setDeletingId("");
    }
  }

  return (
    <DashboardLayout title="Workflows">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 text-slate-400 transition-all hover:border-slate-700 hover:bg-slate-800 hover:text-white cursor-pointer"
              aria-label="Back to dashboard"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Workflow Registry
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Register and manage the n8n workflows your Workers can use.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadWorkflows}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
              Refresh
            </button>

            <Link
              to="/dashboard/workflows/new"
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-indigo-500"
            >
              <Plus size={17} />
              Add Workflow
            </Link>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 py-16 text-sm text-slate-400">
            <Loader2 size={18} className="mr-3 animate-spin" />
            Loading workflow registry...
          </div>
        ) : workflows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 px-6 py-16 text-center">
            <h2 className="text-lg font-semibold text-white">
              No workflows registered
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-slate-400">
              Register your existing n8n webhook workflow here before assigning
              it to a Worker.
            </p>
            <Link
              to="/dashboard/workflows/new"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-indigo-500"
            >
              <Plus size={17} />
              Register First Workflow
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {workflows.map((workflow) => (
              <div
                key={workflow._id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-white">
                        {workflow.name}
                      </h2>
                      <span className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-400">
                        {workflow.category}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          workflow.status === "enabled"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {workflow.status}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-400">
                      {workflow.description}
                    </p>

                    <div className="mt-3 space-y-1 text-xs text-slate-500">
                      <p>
                        Provider:{" "}
                        <span className="font-mono text-slate-400">
                          {workflow.webhook?.provider || "n8n"}
                        </span>
                      </p>
                      <p>
                        Registry ID:{" "}
                        <span className="font-mono text-slate-400">
                          {workflow._id}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      to={`/dashboard/workflows/${workflow._id}/edit`}
                      className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-slate-800 hover:text-white"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(workflow)}
                      disabled={deletingId === workflow._id}
                      className="flex items-center gap-2 rounded-xl border border-red-500/20 px-4 py-2.5 text-sm font-medium text-red-400 transition-all hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                    >
                      {deletingId === workflow._id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
