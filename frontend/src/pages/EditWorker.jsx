import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import { getWorkerById, updateWorker } from "../services/worker.service";
import { getWorkflows } from "../services/workflow.service";

const AVAILABLE_TOOLS = [
  { name: "calculator", label: "Calculator", description: "Performs arithmetic calculations.", permission: "calculator.execute" },
  { name: "n8n.trigger", label: "n8n Workflow", description: "Triggers a configured n8n workflow.", permission: "n8n.trigger" },
];

export default function EditWorker() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState({ name: "", description: "", instructions: "", model: "", configuration: "", status: "enabled", enabledTools: [], permissions: [], workflowIds: [] });
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const [worker, workflowResponse] = await Promise.all([
          getWorkerById(id),
          getWorkflows({ status: "enabled" }),
        ]);
        const availableWorkflows = Array.isArray(workflowResponse)
          ? workflowResponse
          : workflowResponse?.workflows || workflowResponse?.data?.workflows || workflowResponse?.data || [];

        setWorkflows(availableWorkflows);
        setFormData({
          name: worker.name || "",
          description: worker.description || "",
          instructions: worker.instructions || "",
          model: worker.model || "",
          configuration: JSON.stringify(worker.configuration || {}, null, 2),
          status: worker.status || "enabled",
          enabledTools: worker.enabledTools || [],
          permissions: worker.permissions || [],
          workflowIds: (worker.workflowIds || []).map((workflow) =>
            typeof workflow === "string" ? workflow : workflow._id,
          ).filter(Boolean),
        });
      } catch (err) {
        console.error("Failed to fetch worker data:", err);
        setError(err.response?.data?.message || err.message || "Failed to load worker.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  }

  function handleToolToggle(tool) {
    setFormData((previous) => {
      const isEnabled = previous.enabledTools.includes(tool.name);
      const enabledTools = isEnabled
        ? previous.enabledTools.filter((name) => name !== tool.name)
        : [...previous.enabledTools, tool.name];
      const permissions = isEnabled
        ? previous.permissions.filter((permission) => permission !== tool.permission)
        : [...previous.permissions, tool.permission];

      return {
        ...previous,
        enabledTools,
        permissions,
        ...(tool.name === "n8n.trigger" && isEnabled ? { workflowIds: [] } : {}),
      };
    });
  }

  function handleWorkflowToggle(workflowId) {
    setFormData((previous) => {
      const selected = previous.workflowIds.includes(workflowId);
      const workflowIds = selected
        ? previous.workflowIds.filter((value) => value !== workflowId)
        : [...previous.workflowIds, workflowId];

      const hasWorkflows = workflowIds.length > 0;
      const enabledTools = hasWorkflows
        ? previous.enabledTools.includes("n8n.trigger")
          ? previous.enabledTools
          : [...previous.enabledTools, "n8n.trigger"]
        : previous.enabledTools.filter((name) => name !== "n8n.trigger");
      const permissions = hasWorkflows
        ? previous.permissions.includes("n8n.trigger")
          ? previous.permissions
          : [...previous.permissions, "n8n.trigger"]
        : previous.permissions.filter((permission) => permission !== "n8n.trigger");

      return { ...previous, workflowIds, enabledTools, permissions };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const name = formData.name.trim();
    const description = formData.description.trim();
    const instructions = formData.instructions.trim();
    const model = formData.model.trim();

    if (!name || !description || !instructions) {
      setError("Please fill in all required fields.");
      return;
    }

    let configuration = {};
    if (formData.configuration.trim()) {
      try {
        configuration = JSON.parse(formData.configuration);
        if (typeof configuration !== "object" || configuration === null || Array.isArray(configuration)) {
          setError("Configuration must be a valid JSON object.");
          return;
        }
      } catch {
        setError("Configuration contains invalid JSON.");
        return;
      }
    }

    if (formData.workflowIds.length > 0 && !formData.enabledTools.includes("n8n.trigger")) {
      setError("At least one selected workflow requires the n8n Workflow tool.");
      return;
    }

    if (formData.enabledTools.includes("n8n.trigger") && formData.workflowIds.length === 0) {
      setError("Select at least one registered workflow or disable the n8n Workflow tool.");
      return;
    }

    if (!formData.enabledTools.includes("n8n.trigger") && configuration.n8n) {
      delete configuration.n8n;
    }

    const workerData = {
      name,
      description,
      instructions,
      configuration,
      status: formData.status,
      enabledTools: formData.enabledTools,
      permissions: formData.permissions,
      workflowIds: formData.workflowIds,
    };

    if (model) workerData.model = model;

    try {
      setIsSubmitting(true);
      await updateWorker(id, workerData);
      navigate(`/dashboard/workers/${id}`);
    } catch (err) {
      console.error("Failed to update worker:", err);
      setError(err.response?.data?.message || err.message || "Failed to update worker.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return <DashboardLayout title="Edit Worker"><div className="flex min-h-80 items-center justify-center"><p className="text-sm text-slate-400">Loading worker...</p></div></DashboardLayout>;
  }

  return (
    <DashboardLayout title="Edit Worker">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => navigate(`/dashboard/workers/${id}`)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-800 hover:text-white cursor-pointer"><ArrowLeft size={18} /></button>
          <div><h1 className="text-2xl font-bold text-white">Edit Worker</h1><p className="mt-1 text-sm text-slate-400">Update your worker configuration.</p></div>
        </div>

        {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-6 text-lg font-semibold text-white">Basic Information</h2>
            <div className="space-y-5">
              <div><label htmlFor="name" className="mb-2 block text-sm font-medium text-slate-200">Worker Name *</label><input id="name" name="name" value={formData.name} onChange={handleChange} maxLength={100} className={inputClass} /></div>
              <div><label htmlFor="description" className="mb-2 block text-sm font-medium text-slate-200">Description *</label><textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={3} maxLength={300} className={inputClass} /></div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><h2 className="mb-6 text-lg font-semibold text-white">Instructions</h2><textarea name="instructions" value={formData.instructions} onChange={handleChange} rows={9} className={inputClass + " leading-6"} /></section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><h2 className="mb-6 text-lg font-semibold text-white">Model</h2><input name="model" value={formData.model} onChange={handleChange} className={inputClass + " font-mono"} /></section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><h2 className="mb-2 text-lg font-semibold text-white">Configuration</h2><p className="mb-6 text-sm text-slate-400">JSON configuration object.</p><textarea name="configuration" value={formData.configuration} onChange={handleChange} rows={8} className={inputClass + " font-mono leading-6"} /></section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-6"><h2 className="text-lg font-semibold text-white">Tools & Permissions</h2><p className="mt-1 text-sm text-slate-400">Choose the tools this worker can use.</p></div>
            <div className="space-y-3">
              {AVAILABLE_TOOLS.map((tool) => {
                const isEnabled = formData.enabledTools.includes(tool.name);
                return <label key={tool.name} className={`flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-all ${isEnabled ? "border-indigo-500/50 bg-indigo-500/5" : "border-slate-800 bg-slate-950 hover:border-slate-700"}`}>
                  <input type="checkbox" checked={isEnabled} onChange={() => handleToolToggle(tool)} className="mt-1 h-4 w-4 cursor-pointer accent-indigo-500" />
                  <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-medium text-white">{tool.label}</h3>{isEnabled && <span className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-400">Enabled</span>}</div><p className="mt-1 text-sm text-slate-400">{tool.description}</p></div>
                </label>;
              })}
            </div>
          </section>

          {formData.enabledTools.includes("n8n.trigger") && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <div className="mb-6"><h2 className="text-lg font-semibold text-white">Registered Workflows</h2><p className="mt-1 text-sm text-slate-400">Choose the registered workflows this Worker is allowed to trigger.</p></div>
              {workflows.length === 0 ? <p className="rounded-xl border border-dashed border-slate-700 bg-slate-950 p-4 text-sm text-slate-400">No enabled workflows are registered.</p> : <div className="space-y-3">
                {workflows.map((workflow) => {
                  const selected = formData.workflowIds.includes(workflow._id);
                  return <label key={workflow._id} className={`flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-all ${selected ? "border-indigo-500/50 bg-indigo-500/5" : "border-slate-800 bg-slate-950 hover:border-slate-700"}`}>
                    <input type="checkbox" checked={selected} onChange={() => handleWorkflowToggle(workflow._id)} className="mt-1 h-4 w-4 cursor-pointer accent-indigo-500" />
                    <div><div className="flex items-center gap-2"><h3 className="text-sm font-medium text-white">{workflow.name}</h3><span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-400">enabled</span></div><p className="mt-1 text-sm text-slate-400">{workflow.description}</p><p className="mt-2 text-xs text-slate-500">{workflow.category}</p></div>
                  </label>;
                })}
              </div>}
            </section>
          )}

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold text-white">Worker Status</h2><p className="mt-1 text-sm text-slate-400">Enable or disable this worker.</p></div><select name="status" value={formData.status} onChange={handleChange} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-indigo-500"><option value="enabled">Enabled</option><option value="disabled">Disabled</option></select></div></section>

          <div className="flex justify-end gap-3 pb-6"><button type="button" onClick={() => navigate(`/dashboard/workers/${id}`)} disabled={isSubmitting} className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm text-slate-300 hover:bg-slate-800 cursor-pointer">Cancel</button><button type="submit" disabled={isSubmitting} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60 cursor-pointer">{isSubmitting && <Loader2 size={17} className="animate-spin" />}{isSubmitting ? "Saving..." : "Save Changes"}</button></div>
        </form>
      </div>
    </DashboardLayout>
  );
}

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-500";
