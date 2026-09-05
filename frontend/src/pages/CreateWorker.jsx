import { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import { createWorker } from "../services/worker.service";

const AVAILABLE_TOOLS = [
  {
    name: "calculator",
    label: "Calculator",
    description: "Performs arithmetic calculations.",
    permission: "calculator.execute",
  },
  {
    name: "n8n.trigger",
    label: "n8n Workflow",
    description: "Triggers a configured n8n workflow.",
    permission: "n8n.trigger",
  },
];

export default function CreateWorker() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    instructions: "",
    model: "gemini-3.6-flash-lite",
    configuration: "",
    status: "enabled",
    enabledTools: [],
    permissions: [],
  });
  const [n8nWorkflow, setN8nWorkflow] = useState("agentforge-test");

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleToolToggle(tool) {
    setFormData((previous) => {
      const isEnabled = previous.enabledTools.includes(tool.name);

      if (tool.name === "n8n.trigger" && isEnabled) {
        setN8nWorkflow("agentforge-test");
      }

      return {
        ...previous,
        enabledTools: isEnabled
          ? previous.enabledTools.filter((name) => name !== tool.name)
          : [...previous.enabledTools, tool.name],
        permissions: isEnabled
          ? previous.permissions.filter(
              (permission) => permission !== tool.permission,
            )
          : [...previous.permissions, tool.permission],
      };
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

        if (
          typeof configuration !== "object" ||
          configuration === null ||
          Array.isArray(configuration)
        ) {
          setError("Configuration must be a valid JSON object.");
          return;
        }
      } catch {
        setError("Configuration contains invalid JSON.");
        return;
      }
    }

    if (formData.enabledTools.includes("n8n.trigger")) {
      configuration.n8n = {
        workflow: n8nWorkflow,
      };
    }

    const workerData = {
      name,
      description,
      instructions,
      configuration,
      status: formData.status,
      enabledTools: formData.enabledTools,
      permissions: formData.permissions,
    };

    if (model) {
      workerData.model = model;
    }

    try {
      setIsSubmitting(true);

      const worker = await createWorker(workerData);

      navigate(`/dashboard/workers/${worker._id}`);
    } catch (err) {
      console.error("Failed to create worker:", err);

      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to create worker. Please try again.";

      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DashboardLayout title="Create Worker">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate("/dashboard/workers")}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 text-slate-400 transition-all duration-200 hover:border-slate-700 hover:bg-slate-800 hover:text-white cursor-pointer"
            aria-label="Back to workers"
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <h1 className="text-2xl font-bold text-white">Create Worker</h1>

            <p className="mt-1 text-sm text-slate-400">
              Configure a new AI Worker for your workforce.
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white">
                Basic Information
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Give your worker a clear identity.
              </p>
            </div>

            <div className="space-y-5">
              {/* Name */}
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Worker Name <span className="text-indigo-400">*</span>
                </label>

                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  maxLength={100}
                  placeholder="e.g. Customer Support Worker"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-slate-600 focus:border-indigo-500"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Maximum 100 characters.
                </p>
              </div>

              {/* Description */}
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
                  placeholder="Briefly describe what this worker does."
                  className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-slate-600 focus:border-indigo-500"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Maximum 300 characters.
                </p>
              </div>
            </div>
          </section>

          {/* Instructions */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white">Instructions</h2>

              <p className="mt-1 text-sm text-slate-400">
                Define the role, responsibilities, and behavior of this worker.
              </p>
            </div>

            <div>
              <label
                htmlFor="instructions"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                Worker Instructions <span className="text-indigo-400">*</span>
              </label>

              <textarea
                id="instructions"
                name="instructions"
                value={formData.instructions}
                onChange={handleChange}
                rows={9}
                placeholder="You are a customer support worker. Your job is to..."
                className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm leading-6 text-white outline-none transition-all placeholder:text-slate-600 focus:border-indigo-500"
              />
            </div>
          </section>

          {/* Model */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white">Model</h2>

              <p className="mt-1 text-sm text-slate-400">
                Choose the AI model used by this worker.
              </p>
            </div>

            <div>
              <label
                htmlFor="model"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                AI Model
              </label>

              <input
                id="model"
                name="model"
                type="text"
                value={formData.model}
                onChange={handleChange}
                placeholder="e.g. gemini-3.6-flash-lite"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-slate-600 focus:border-indigo-500"
              />
            </div>
          </section>

          {/* Configuration */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white">
                Configuration
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Add optional configuration for this worker as a JSON object.
              </p>
            </div>

            <div>
              <label
                htmlFor="configuration"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                Configuration
              </label>

              <textarea
                id="configuration"
                name="configuration"
                value={formData.configuration}
                onChange={handleChange}
                rows={8}
                placeholder={`{
  "key": "value"
}`}
                className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-mono text-sm leading-6 text-white outline-none transition-all placeholder:text-slate-600 focus:border-indigo-500"
              />

              <p className="mt-2 text-xs text-slate-500">
                Must be a valid JSON object. This field is optional.
              </p>
            </div>
          </section>

          {/* Tools & Permissions */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white">
                Tools & Permissions
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Choose the tools this worker can use. Selecting a tool
                automatically grants the permission required to execute it.
              </p>
            </div>

            <div className="space-y-3">
              {AVAILABLE_TOOLS.map((tool) => {
                const isEnabled = formData.enabledTools.includes(tool.name);

                return (
                  <label
                    key={tool.name}
                    className={`flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-all ${
                      isEnabled
                        ? "border-indigo-500/50 bg-indigo-500/5"
                        : "border-slate-800 bg-slate-950 hover:border-slate-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => handleToolToggle(tool)}
                      className="mt-1 h-4 w-4 cursor-pointer accent-indigo-500"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-medium text-white">
                          {tool.label}
                        </h3>

                        {isEnabled && (
                          <span className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-400">
                            Enabled
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-sm text-slate-400">
                        {tool.description}
                      </p>

                      {isEnabled && (
                        <p className="mt-2 text-xs text-slate-500">
                          Permission:{" "}
                          <span className="font-mono text-slate-400">
                            {tool.permission}
                          </span>
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </section>

          {/* n8n Configuration */}
          {formData.enabledTools.includes("n8n.trigger") && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white">
                  n8n Workflow Configuration
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Choose the n8n workflow this worker is allowed to trigger.
                </p>
              </div>

              <div>
                <label
                  htmlFor="n8nWorkflow"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Workflow
                </label>

                <select
                  id="n8nWorkflow"
                  value={n8nWorkflow}
                  onChange={(event) => setN8nWorkflow(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition-all focus:border-indigo-500"
                >
                  <option value="agentforge-test">
                    AgentForge Test Workflow
                  </option>
                </select>

                <p className="mt-2 text-xs text-slate-500">
                  The workflow endpoint is managed securely by AgentForge.
                </p>
              </div>
            </section>
          )}

          {/* Status */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between gap-6">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Worker Status
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Choose whether this worker should be enabled after creation.
                </p>
              </div>

              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition-all focus:border-indigo-500"
              >
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
          </section>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pb-6">
            <button
              type="button"
              onClick={() => navigate("/dashboard/workers")}
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

              {isSubmitting ? "Creating..." : "Create Worker"}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
