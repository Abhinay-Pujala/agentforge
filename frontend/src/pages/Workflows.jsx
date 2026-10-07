import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, Plus, RefreshCw, Trash2, XCircle } from "lucide-react";
import DashboardLayout from "../layouts/DashboardLayout";
import { deleteWorkflow, getWorkflows, testWorkflow } from "../services/workflow.service";

export default function Workflows() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [testingId, setTestingId] = useState("");
  const [testResults, setTestResults] = useState({});
  const [testInputId, setTestInputId] = useState("");
  const [testInput, setTestInput] = useState("{}");
  const [testInputError, setTestInputError] = useState("");

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

  function openTestControls(workflow) {
    setError("");
    setTestInputError("");
    setTestResults((previous) => ({
      ...previous,
      [workflow._id]: null,
    }));
    setTestInputId(workflow._id);
    setTestInput(JSON.stringify({
      input: "test",
      agentforge: {
        test: true,
      },
    }, null, 2));
  }

  function closeTestControls() {
    if (testingId) return;
    setTestInputId("");
    setTestInput("{}");
    setTestInputError("");
  }

  async function handleTest(workflow) {
    if (workflow.configurationStatus?.code !== "READY") {
      setError("This workflow is not ready to test.");
      return;
    }

    let testData;
    try {
      testData = JSON.parse(testInput);
      if (
        typeof testData !== "object" ||
        testData === null ||
        Array.isArray(testData)
      ) {
        setTestInputError("Test input must be a valid JSON object.");
        return;
      }
    } catch {
      setTestInputError("Test input contains invalid JSON.");
      return;
    }

    if (
      !window.confirm(
        `Run a test request for "${workflow.name}"? The connected n8n workflow may perform its configured actions.`,
      )
    ) {
      return;
    }

    try {
      setError("");
      setTestInputError("");
      setTestingId(workflow._id);
      setTestResults((previous) => ({
        ...previous,
        [workflow._id]: null,
      }));

      const result = await testWorkflow(workflow._id, testData);
      setTestResults((previous) => ({
        ...previous,
        [workflow._id]: {
          success: true,
          message: "Workflow test completed successfully.",
          result,
        },
      }));
    } catch (err) {
      console.error("Workflow test failed:", err);
      setTestResults((previous) => ({
        ...previous,
        [workflow._id]: {
          success: false,
          message:
            err.response?.data?.message ||
            err.response?.data?.error ||
            err.message ||
            "Workflow test failed.",
        },
      }));
    } finally {
      setTestingId("");
    }
  }

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
          <div className="glass-panel flex items-center justify-center py-16 text-sm text-slate-600">
            <Loader2 size={18} className="mr-3 animate-spin" />
            Loading workflow registry...
          </div>
        ) : workflows.length === 0 ? (
          <div className="glass-panel border-dashed px-6 py-16 text-center">
            <h2 className="text-lg font-semibold text-slate-900">
              No workflows registered
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
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
            {workflows.map((workflow) => {
              const testResult = testResults[workflow._id];
              const isTesting = testingId === workflow._id;
              const isTestOpen = testInputId === workflow._id;

              return (
                <div
                  key={workflow._id}
                  className="glass-panel p-5"
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
                          className={`${
                            workflow.configurationStatus?.code === "READY"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : workflow.configurationStatus?.code === "CONFIGURATION_REQUIRED"
                                ? "bg-amber-500/10 text-amber-400"
                                : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {workflow.configurationStatus?.label || workflow.status}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-slate-400">
                        {workflow.description}
                      </p>

                      {workflow.configurationStatus?.description && (
                        <p className="mt-2 text-xs text-slate-500">
                          {workflow.configurationStatus.description}
                        </p>
                      )}

                      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">Connection:</span>
                          <span className={`inline-flex items-center gap-1.5 font-medium ${
                            workflow.configurationStatus?.code === "READY"
                              ? "text-emerald-400"
                              : "text-amber-400"
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              workflow.configurationStatus?.code === "READY"
                                ? "bg-emerald-400"
                                : "bg-amber-400"
                            }`} />
                            {workflow.configurationStatus?.code === "READY"
                              ? "Configured"
                              : "Needs configuration"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">Provider:</span>
                          <span className="font-mono text-slate-400">
                            {workflow.webhook?.provider || "n8n"}
                          </span>
                        </div>
                        <p className="sm:col-span-2">
                          Webhook:{" "}
                          <span className="font-mono text-slate-400">
                            {workflow.webhook?.url ? "Configured" : "Missing"}
                          </span>
                        </p>
                        <p className="sm:col-span-2">
                          Registry ID:{" "}
                          <span className="font-mono text-slate-400">
                            {workflow._id}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openTestControls(workflow)}
                        disabled={
                          isTesting ||
                          workflow.configurationStatus?.code !== "READY"
                        }
                        className="flex items-center gap-2 rounded-xl border border-emerald-500/20 px-4 py-2.5 text-sm font-medium text-emerald-400 transition-all hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                      >
                        <CheckCircle2 size={16} />
                        Test
                      </button>
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

                  {isTestOpen && (
                    <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-white">
                            Test workflow
                          </h3>
                          <p className="mt-1 text-xs text-slate-500">
                            Send a JSON payload to the registered n8n webhook. The workflow may perform real configured actions.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={closeTestControls}
                          disabled={isTesting}
                          className="self-start rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>

                      <textarea
                        value={testInput}
                        onChange={(event) => {
                          setTestInput(event.target.value);
                          setTestInputError("");
                        }}
                        rows={9}
                        spellCheck={false}
                        className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 font-mono text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-indigo-500"
                        aria-label={`Test payload for ${workflow.name}`}
                      />

                      {testInputError && (
                        <p className="mt-2 text-xs text-red-400">{testInputError}</p>
                      )}

                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleTest(workflow)}
                          disabled={isTesting}
                          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                        >
                          {isTesting && <Loader2 size={16} className="animate-spin" />}
                          {isTesting ? "Running..." : "Run Test"}
                        </button>
                      </div>
                    </div>
                  )}

                  {testResult && (
                    <div
                      className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                        testResult.success
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                          : "border-red-500/20 bg-red-500/10 text-red-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-medium">
                        {testResult.success ? (
                          <CheckCircle2 size={16} />
                        ) : (
                          <XCircle size={16} />
                        )}
                        {testResult.message}
                      </div>

                      {testResult.success && testResult.result && (
                        <pre className="mt-3 max-h-64 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs leading-5 text-slate-300">
                          {JSON.stringify(testResult.result, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
