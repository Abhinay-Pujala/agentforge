import { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import { createWorkflow } from "../services/workflow.service";

const DEFAULT_INPUT_SCHEMA = JSON.stringify(
  {
    type: "object",
    properties: {},
    additionalProperties: true,
  },
  null,
  2,
);

export default function CreateWorkflow() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "automation",
    webhookUrl: "",
    status: "enabled",
    permissions: "n8n.trigger",
    inputSchema: DEFAULT_INPUT_SCHEMA,
  });

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const name = formData.name.trim();
    const description = formData.description.trim();
    const category = formData.category.trim();
    const webhookUrl = formData.webhookUrl.trim();
    const permissions = formData.permissions
      .split(",")
      .map((permission) => permission.trim())
      .filter(Boolean);

    if (!name || !description || !category || !webhookUrl) {
      setError("Please fill in all required fields.");
      return;
    }

    let inputSchema;

    try {
      inputSchema = JSON.parse(formData.inputSchema);

      if (
        typeof inputSchema !== "object" ||
        inputSchema === null ||
        Array.isArray(inputSchema)
      ) {
        setError("Input schema must be a valid JSON object.");
        return;
      }
    } catch {
      setError("Input schema contains invalid JSON.");
      return;
    }

    try {
      setIsSubmitting(true);

      await createWorkflow({
        name,
        description,
        category,
        webhook: {
          provider: "n8n",
          url: webhookUrl,
        },
        status: formData.status,
        permissions,
        inputSchema,
      });

      navigate("/dashboard/workflows");
    } catch (err) {
      console.error("Failed to create workflow:", err);

      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Failed to create workflow. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DashboardLayout title="Add Workflow">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate("/dashboard/workflows")}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 text-slate-400 transition-all hover:border-slate-700 hover:bg-slate-800 hover:text-white cursor-pointer"
            aria-label="Back to workflows"
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <h1 className="text-2xl font-bold text-white">
              Register n8n Workflow
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Add a trusted n8n webhook to the AgentForge Workflow Registry.
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white">
                Workflow Information
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Give the workflow enough metadata to be safely discovered and
                assigned to Workers.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Name <span className="text-indigo-400">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  maxLength={100}
                  placeholder="e.g. Send Gmail Notification"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Description <span className="text-indigo-400">*</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  maxLength={300}
                  placeholder="What does this workflow do?"
                  className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-500"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="category"
                    className="mb-2 block text-sm font-medium text-slate-200"
                  >
                    Category <span className="text-indigo-400">*</span>
                  </label>
                  <input
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    maxLength={50}
                    placeholder="automation"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="status"
                    className="mb-2 block text-sm font-medium text-slate-200"
                  >
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-indigo-500"
                  >
                    <option value="enabled">Enabled</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white">
                n8n Connection
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Register the webhook URL used by AgentForge. This URL will not
                be exposed to Workers.
              </p>
            </div>

            <div>
              <label
                htmlFor="webhookUrl"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                Webhook URL <span className="text-indigo-400">*</span>
              </label>
              <input
                id="webhookUrl"
                name="webhookUrl"
                type="url"
                value={formData.webhookUrl}
                onChange={handleChange}
                placeholder="https://your-n8n-host/webhook/..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-500"
              />
              <p className="mt-2 text-xs text-slate-500">
                Use the production or test webhook URL that AgentForge is
                authorized to call.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white">
                Permissions
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Comma-separated permissions associated with this workflow.
              </p>
            </div>

            <input
              id="permissions"
              name="permissions"
              value={formData.permissions}
              onChange={handleChange}
              placeholder="n8n.trigger"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-500"
            />
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white">
                Input Schema
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Define the structured input Workers must provide when
                triggering this workflow.
              </p>
            </div>

            <textarea
              id="inputSchema"
              name="inputSchema"
              value={formData.inputSchema}
              onChange={handleChange}
              rows={12}
              className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-mono text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-indigo-500"
            />

            <p className="mt-2 text-xs text-slate-500">
              Start with an object schema. You can add properties later as the
              workflow contract becomes more specific.
            </p>
          </section>

          <div className="flex items-center justify-end gap-3 pb-6">
            <button
              type="button"
              onClick={() => navigate("/dashboard/workflows")}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting && <Loader2 size={17} className="animate-spin" />}
              {isSubmitting ? "Registering..." : "Register Workflow"}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
