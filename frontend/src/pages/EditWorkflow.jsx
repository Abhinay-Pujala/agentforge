import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import { getWorkflowById, updateWorkflow } from "../services/workflow.service";

const DEFAULT_INPUT_SCHEMA = JSON.stringify({ type: "object", properties: {}, additionalProperties: true }, null, 2);

export default function EditWorkflow() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState({ name: "", description: "", category: "automation", webhookUrl: "", status: "enabled", permissions: "n8n.trigger", inputSchema: DEFAULT_INPUT_SCHEMA, capabilities: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedWebhookUrl = formData.webhookUrl.trim();
  let webhookValidation = "MISSING";
  if (normalizedWebhookUrl) {
    try {
      const url = new URL(normalizedWebhookUrl);
      webhookValidation = ["http:", "https:"].includes(url.protocol) ? "VALID" : "INVALID";
    } catch {
      webhookValidation = "INVALID";
    }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const response = await getWorkflowById(id);
        const workflow = response?.data?.data ?? response?.data ?? response;
        if (!mounted) return;
        setFormData({
          name: workflow.name ?? "",
          description: workflow.description ?? "",
          category: workflow.category ?? "automation",
          webhookUrl: workflow.webhook?.url ?? "",
          status: workflow.status ?? "enabled",
          permissions: (workflow.permissions ?? []).join(", "),
          inputSchema: JSON.stringify(workflow.inputSchema ?? JSON.parse(DEFAULT_INPUT_SCHEMA), null, 2),
          capabilities: (workflow.capabilities ?? []).join(", "),
        });
      } catch (err) {
        if (mounted) setError(err.response?.data?.message || err.response?.data?.error || err.message || "Failed to load workflow.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    const name = formData.name.trim();
    const description = formData.description.trim();
    const category = formData.category.trim();
    const webhookUrl = formData.webhookUrl.trim();
    const permissions = formData.permissions.split(",").map((p) => p.trim()).filter(Boolean);

    if (!name || !description || !category || !webhookUrl) {
      setError("Please fill in all required fields.");
      return;
    }

    let inputSchema;
    try {
      inputSchema = JSON.parse(formData.inputSchema);
      if (typeof inputSchema !== "object" || inputSchema === null || Array.isArray(inputSchema)) {
        setError("Input schema must be a valid JSON object.");
        return;
      }
    } catch {
      setError("Input schema contains invalid JSON.");
      return;
    }

    try {
      setIsSubmitting(true);
      await updateWorkflow(id, {
        name,
        description,
        category,
        capabilities: formData.capabilities.split(",").map((value) => value.trim().toLowerCase()).filter(Boolean),
        webhook: { provider: "n8n", url: webhookUrl },
        status: formData.status,
        permissions,
        inputSchema,
      });
      navigate("/dashboard/workflows");
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || err.message || "Failed to update workflow. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <DashboardLayout title="Edit Workflow"><div className="flex min-h-[400px] items-center justify-center text-slate-400"><Loader2 size={24} className="animate-spin" /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout title="Edit Workflow">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => navigate("/dashboard/workflows")} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-800 hover:text-white cursor-pointer" aria-label="Back to workflows"><ArrowLeft size={18} /></button>
          <div><h1 className="text-2xl font-bold text-white">Edit Workflow</h1><p className="mt-1 text-sm text-slate-400">Update the registered n8n workflow configuration.</p></div>
        </div>

        {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="glass-panel p-6">
            <h2 className="text-lg font-semibold text-white">Workflow Information</h2>
            <p className="mt-1 text-sm text-slate-400">Update the metadata used to discover and assign this workflow.</p>
            <div className="mt-6 space-y-5">
              <Field label="Name" id="name" required><input id="name" name="name" value={formData.name} onChange={handleChange} maxLength={100} className={inputClass} /></Field>
              <Field label="Description" id="description" required><textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={3} maxLength={300} className={inputClass} /></Field>
              <div>
                <label htmlFor="capabilities" className="mb-2 block text-sm font-medium text-slate-200">
                  Capabilities
                </label>
                <input id="capabilities" name="capabilities" value={formData.capabilities} onChange={handleChange} placeholder="email, gmail, search, reply" className={inputClass} />
                <p className="mt-2 text-xs text-slate-500">Comma-separated semantic terms used for natural-language workflow discovery.</p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Category" id="category" required><input id="category" name="category" value={formData.category} onChange={handleChange} maxLength={50} className={inputClass} /></Field>
                <Field label="Status" id="status"><select id="status" name="status" value={formData.status} onChange={handleChange} className={inputClass}><option value="enabled">Enabled</option><option value="disabled">Disabled</option></select></Field>
              </div>
            </div>
          </section>

          <section className="glass-panel p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">n8n Connection</h2>
                <p className="mt-1 text-sm text-slate-400">Register the n8n webhook AgentForge is allowed to trigger.</p>
              </div>
              <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${webhookValidation === "VALID" ? "bg-emerald-500/10 text-emerald-400" : webhookValidation === "INVALID" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${webhookValidation === "VALID" ? "bg-emerald-400" : webhookValidation === "INVALID" ? "bg-red-400" : "bg-amber-400"}`} />
                {webhookValidation === "VALID" ? "Webhook configured" : webhookValidation === "INVALID" ? "Invalid webhook URL" : "Webhook required"}
              </span>
            </div>
            <div className="mt-6">
              <input id="webhookUrl" name="webhookUrl" type="url" value={formData.webhookUrl} onChange={handleChange} placeholder="https://your-n8n-host/webhook/..." className={inputClass} />
              <p className="mt-2 text-xs text-slate-500">Only HTTP and HTTPS webhook URLs are accepted. This validates the URL format; it does not verify that n8n is reachable.</p>
            </div>
          </section>

          <section className="glass-panel p-6">
            <h2 className="text-lg font-semibold text-white">Permissions</h2>
            <p className="mt-1 text-sm text-slate-400">Comma-separated permissions associated with this workflow.</p>
            <div className="mt-6"><input id="permissions" name="permissions" value={formData.permissions} onChange={handleChange} placeholder="n8n.trigger" className={inputClass} /></div>
          </section>

          <section className="glass-panel p-6">
            <h2 className="text-lg font-semibold text-white">Input Schema</h2>
            <p className="mt-1 text-sm text-slate-400">Define the structured input Workers must provide.</p>
            <div className="mt-6"><textarea id="inputSchema" name="inputSchema" value={formData.inputSchema} onChange={handleChange} rows={12} className={inputClass + " font-mono leading-6"} /></div>
          </section>

          <div className="flex justify-end gap-3 pb-6">
            <button type="button" onClick={() => navigate("/dashboard/workflows")} disabled={isSubmitting} className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-50 cursor-pointer">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60 cursor-pointer">{isSubmitting && <Loader2 size={17} className="animate-spin" />}{isSubmitting ? "Saving..." : "Save Changes"}</button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-500";

function Field({ label, id, required, children }) {
  return <div><label htmlFor={id} className="mb-2 block text-sm font-medium text-slate-200">{label} {required && <span className="text-indigo-400">*</span>}</label>{children}</div>;
}
