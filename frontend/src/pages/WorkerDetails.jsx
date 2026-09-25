import { useEffect, useState } from "react";
import {
  ArrowLeft, Bot, Calendar, Clock, Edit, Loader2, Play, Send,
  Settings2, Trash2, History, CheckCircle2, XCircle, Timer, Workflow,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout.jsx";
import { getWorkerById, deleteWorker, updateWorkerStatus, runWorker } from "../services/worker.service.js";
import { getExecutions } from "../services/execution.service.js";
import { getWorkflows } from "../services/workflow.service.js";

const AVAILABLE_TOOLS = {
  calculator: { label: "Calculator", description: "Performs arithmetic calculations.", permission: "calculator.execute" },
  "n8n.trigger": { label: "n8n Workflow", description: "Triggers a configured n8n workflow.", permission: "n8n.trigger" },
};

export default function WorkerDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [worker, setWorker] = useState(null);
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [executionInput, setExecutionInput] = useState("");
  const [executionOutput, setExecutionOutput] = useState("");
  const [executionError, setExecutionError] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [executions, setExecutions] = useState([]);
  const [isLoadingExecutions, setIsLoadingExecutions] = useState(false);
  const [showAllExecutions, setShowAllExecutions] = useState(false);

  useEffect(() => {
    async function fetchWorkerData() {
      try {
        setLoading(true);
        setError("");
        const [workerResult, workflowResult] = await Promise.all([
          getWorkerById(id),
          getWorkflows(),
        ]);
        setWorker(workerResult);
        const availableWorkflows = Array.isArray(workflowResult)
          ? workflowResult
          : workflowResult?.workflows || workflowResult?.data?.workflows || workflowResult?.data || [];
        setWorkflows(availableWorkflows);
      } catch (err) {
        console.error("Failed to fetch worker data:", err);
        setError(err.response?.data?.message || err.message || "Failed to load worker.");
      } finally {
        setLoading(false);
      }
    }
    fetchWorkerData();
    fetchExecutions();
  }, [id]);

  async function fetchExecutions() {
    try {
      setIsLoadingExecutions(true);
      const result = await getExecutions({ workerId: id, limit: 10 });
      setExecutions(result.executions);
    } catch (err) {
      console.error("Failed to fetch execution history:", err);
    } finally {
      setIsLoadingExecutions(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(`Are you sure you want to delete "${worker.name}"? This action cannot be undone.`);
    if (!confirmed) return;
    try {
      setIsDeleting(true);
      await deleteWorker(worker._id);
      navigate("/dashboard/workers");
    } catch (err) {
      console.error("Failed to delete worker:", err);
      setError(err.response?.data?.message || err.message || "Failed to delete worker.");
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
      await fetchExecutions();
    } catch (err) {
      console.error("Failed to run worker:", err);
      setExecutionError(err.response?.data?.message || err.message || "Failed to run worker.");
    } finally {
      setIsExecuting(false);
    }
  }

  async function handleToggleStatus() {
    const nextStatus = worker.status === "enabled" ? "disabled" : "enabled";
    try {
      setIsUpdatingStatus(true);
      setError("");
      setWorker(await updateWorkerStatus(worker._id, nextStatus));
    } catch (err) {
      console.error("Failed to update worker status:", err);
      setError(err.response?.data?.message || err.message || "Failed to update worker status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  if (loading) {
    return <DashboardLayout title="Worker Details"><div className="flex min-h-80 items-center justify-center"><p className="text-sm text-slate-400">Loading worker...</p></div></DashboardLayout>;
  }

  if (error) {
    return <DashboardLayout title="Worker Details"><div className="space-y-6"><button type="button" onClick={() => navigate("/dashboard/workers")} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white cursor-pointer"><ArrowLeft size={17} /> Back to Workers</button><div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6"><p className="text-sm text-red-400">{error}</p></div></div></DashboardLayout>;
  }

  if (!worker) return null;

  const displayedExecutions = showAllExecutions ? executions : executions.slice(0, 5);
  const enabledTools = worker.enabledTools || [];
  const activePermissions = worker.permissions || [];
  const assignedWorkflowIds = (worker.workflowIds || []).map((workflow) => typeof workflow === "string" ? workflow : workflow?._id).filter(Boolean);
  const assignedWorkflows = workflows.filter((workflow) => assignedWorkflowIds.includes(workflow._id));

  return (
    <DashboardLayout title="Worker Details">
      <div className="mx-auto max-w-5xl space-y-6">
        <button type="button" onClick={() => navigate("/dashboard/workers")} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white cursor-pointer"><ArrowLeft size={17} /> Back to Workers</button>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10"><Bot size={28} className="text-indigo-400" /></div><div><h1 className="text-2xl font-bold text-white">{worker.name}</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">{worker.description}</p></div></div>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${worker.status === "enabled" ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-700 text-slate-400"}`}>{worker.status}</span>
              <button type="button" onClick={handleToggleStatus} disabled={isUpdatingStatus} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-50 cursor-pointer">{isUpdatingStatus ? "Updating..." : worker.status === "enabled" ? "Disable" : "Enable"}</button>
              <button type="button" onClick={() => navigate(`/dashboard/workers/${worker._id}/edit`)} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 cursor-pointer"><Edit size={17} /> Edit</button>
              <button type="button" onClick={handleDelete} disabled={isDeleting} className="flex items-center gap-2 rounded-xl border border-red-500/30 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50 cursor-pointer"><Trash2 size={17} /> {isDeleting ? "Deleting..." : "Delete"}</button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-5 flex items-center justify-between gap-4"><div><h2 className="text-lg font-semibold text-white">Run Worker</h2><p className="mt-1 text-sm text-slate-400">Send an input to this worker and view its response.</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10"><Play size={18} className="text-indigo-400" /></div></div>
          <form onSubmit={handleRunWorker} className="space-y-4">
            <div><label htmlFor="execution-input" className="mb-2 block text-sm font-medium text-slate-200">Input</label><textarea id="execution-input" value={executionInput} onChange={(event) => setExecutionInput(event.target.value)} rows={5} placeholder="Ask your worker something..." disabled={isExecuting || worker.status !== "enabled"} className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm leading-6 text-white placeholder:text-slate-600 focus:border-indigo-500 disabled:opacity-50" /></div>
            {executionError && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{executionError}</div>}
            <div className="flex items-center justify-between gap-4"><p className="text-xs text-slate-500">{worker.status === "enabled" ? "Worker is ready to execute." : "Enable this worker before running it."}</p><button type="submit" disabled={isExecuting || worker.status !== "enabled" || !executionInput.trim()} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 cursor-pointer">{isExecuting ? <><Loader2 size={17} className="animate-spin" /> Running...</> : <><Send size={17} /> Run Worker</>}</button></div>
          </form>
          {executionOutput && <div className="mt-6 border-t border-slate-800 pt-6"><h3 className="mb-3 text-sm font-semibold text-white">Worker Response</h3><div className="whitespace-pre-wrap rounded-xl bg-slate-950 p-5 text-sm leading-7 text-slate-300">{executionOutput}</div></div>}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-semibold text-white">Execution History</h2><p className="mt-1 text-sm text-slate-400">Recent executions for this worker.</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10"><History size={18} className="text-indigo-400" /></div></div>
          {isLoadingExecutions ? <div className="flex items-center justify-center py-10"><Loader2 size={22} className="animate-spin text-indigo-400" /></div> : executions.length === 0 ? <div className="rounded-xl border border-dashed border-slate-700 py-10 text-center"><History size={28} className="mx-auto mb-3 text-slate-600" /><p className="text-sm text-slate-400">No executions yet.</p><p className="mt-1 text-xs text-slate-600">Run this worker to see its execution history.</p></div> : <><div className="space-y-3">{displayedExecutions.map((execution) => <div key={execution._id} className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-950 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0 flex-1"><div className="flex items-center gap-2">{execution.status === "COMPLETED" ? <CheckCircle2 size={18} className="shrink-0 text-emerald-400" /> : execution.status === "FAILED" || execution.status === "TIMEOUT" ? <XCircle size={18} className="shrink-0 text-red-400" /> : <Timer size={18} className="shrink-0 text-yellow-400" />}<span className="text-sm font-medium text-white">{execution.status}</span></div><p className="mt-2 truncate text-sm text-slate-400">{execution.input}</p><p className="mt-2 text-xs text-slate-600">{new Date(execution.createdAt).toLocaleString()}</p></div>{execution.duration !== undefined && execution.duration !== null && <div className="text-sm text-slate-400">{execution.duration} ms</div>}</div>)}</div>{executions.length > 5 && <button type="button" onClick={() => setShowAllExecutions(!showAllExecutions)} className="mt-4 w-full rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer">{showAllExecutions ? "Show less" : "View all executions"}</button>}</>}
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><div className="mb-4 flex items-center gap-3"><Settings2 size={19} className="text-indigo-400" /><h2 className="font-semibold text-white">Model</h2></div><p className="break-all rounded-xl bg-slate-950 px-4 py-3 font-mono text-sm text-slate-300">{worker.model}</p></section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><div className="mb-4 flex items-center gap-3"><Settings2 size={19} className="text-indigo-400" /><h2 className="font-semibold text-white">Configuration</h2></div><pre className="max-h-64 overflow-auto rounded-xl bg-slate-950 p-4 font-mono text-sm leading-6 text-slate-300">{JSON.stringify(worker.configuration || {}, null, 2)}</pre></section>
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-5"><h2 className="text-lg font-semibold text-white">Active Tools & Permissions</h2><p className="mt-1 text-sm text-slate-400">Tools currently enabled for this worker and the exact permissions granted to use them.</p></div>
          {enabledTools.length > 0 ? <div className="space-y-3">{enabledTools.map((toolName) => {
            const tool = AVAILABLE_TOOLS[toolName];
            const permission = tool?.permission;
            const hasPermission = permission ? activePermissions.includes(permission) : false;
            return <div key={toolName} className="rounded-xl border border-slate-800 bg-slate-950 p-4"><div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-medium text-white">{tool?.label || toolName}</h3><p className="mt-1 text-sm text-slate-400">{tool?.description || "Enabled worker tool."}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${hasPermission ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>{hasPermission ? "Permission Granted" : "Permission Missing"}</span></div><div className="mt-3 border-t border-slate-800 pt-3"><p className="text-xs text-slate-500">Required permission</p><span className="mt-2 inline-block rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-xs text-slate-300">{permission || "No permission metadata"}</span></div></div>;
          })}</div> : <div className="rounded-xl border border-dashed border-slate-700 py-8 text-center"><p className="text-sm text-slate-500">No tools enabled for this worker.</p></div>}
          {activePermissions.length > 0 && <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4"><p className="text-xs text-slate-500">All active permissions</p><div className="mt-2 flex flex-wrap gap-2">{activePermissions.map((permission) => <span key={permission} className="rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-xs text-slate-400">{permission}</span>)}</div></div>}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div><h2 className="text-lg font-semibold text-white">Assigned Workflows</h2><p className="mt-1 text-sm text-slate-400">Registered workflows this Worker is authorized to trigger.</p></div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10"><Workflow size={18} className="text-indigo-400" /></div>
          </div>
          {assignedWorkflows.length > 0 ? <div className="space-y-3">{assignedWorkflows.map((workflow) => (
            <div key={workflow._id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-medium text-white">{workflow.name}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${workflow.status === "enabled" ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-700 text-slate-400"}`}>{workflow.status}</span><span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-400">{workflow.category}</span></div><p className="mt-2 text-sm text-slate-400">{workflow.description}</p></div>
                <span className="shrink-0 rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-400">Authorized</span>
              </div>
              <div className="mt-3 border-t border-slate-800 pt-3"><p className="text-xs text-slate-500">Workflow ID</p><p className="mt-1 break-all font-mono text-xs text-slate-400">{workflow._id}</p></div>
            </div>
          ))}</div> : <div className="rounded-xl border border-dashed border-slate-700 py-8 text-center"><Workflow size={28} className="mx-auto mb-3 text-slate-600" /><p className="text-sm text-slate-500">No workflows assigned to this worker.</p><button type="button" onClick={() => navigate(`/dashboard/workers/${worker._id}/edit`)} className="mt-3 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer">Manage Workflows</button></div>}
          {assignedWorkflows.length > 0 && <button type="button" onClick={() => navigate(`/dashboard/workers/${worker._id}/edit`)} className="mt-4 w-full rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer">Manage Assigned Workflows</button>}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><h2 className="mb-4 text-lg font-semibold text-white">Instructions</h2><div className="whitespace-pre-wrap rounded-xl bg-slate-950 p-5 text-sm leading-7 text-slate-300">{worker.instructions}</div></section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><h2 className="mb-5 text-lg font-semibold text-white">Worker Information</h2><div className="grid gap-5 sm:grid-cols-2"><div className="flex items-start gap-3"><Calendar size={18} className="mt-0.5 text-slate-500" /><div><p className="text-xs text-slate-500">Created</p><p className="mt-1 text-sm text-slate-300">{new Date(worker.createdAt).toLocaleString()}</p></div></div><div className="flex items-start gap-3"><Clock size={18} className="mt-0.5 text-slate-500" /><div><p className="text-xs text-slate-500">Last Updated</p><p className="mt-1 text-sm text-slate-300">{new Date(worker.updatedAt).toLocaleString()}</p></div></div></div></section>
      </div>
    </DashboardLayout>
  );
}
