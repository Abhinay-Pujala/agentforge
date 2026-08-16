import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import { getWorkerById, updateWorker } from "../services/worker.service";

export default function EditWorker() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    instructions: "",
    model: "",
    configuration: "",
    status: "enabled",
  });

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchWorker() {
      try {
        const worker = await getWorkerById(id);

        setFormData({
          name: worker.name || "",
          description: worker.description || "",
          instructions: worker.instructions || "",
          model: worker.model || "",
          configuration: JSON.stringify(worker.configuration || {}, null, 2),
          status: worker.status || "enabled",
        });
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

    const workerData = {
      name,
      description,
      instructions,
      configuration,
      status: formData.status,
    };

    if (model) {
      workerData.model = model;
    }

    try {
      setIsSubmitting(true);

      await updateWorker(id, workerData);

      navigate(`/dashboard/workers/${id}`);
    } catch (error) {
      console.error("Failed to update worker:", error);

      setError(
        error.response?.data?.message ||
          error.message ||
          "Failed to update worker.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Edit Worker">
        <div className="flex min-h-80 items-center justify-center">
          <p className="text-sm text-slate-400">Loading worker...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Edit Worker">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(`/dashboard/workers/${id}`)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 text-slate-400 transition-all hover:border-slate-700 hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <h1 className="text-2xl font-bold text-white">Edit Worker</h1>

            <p className="mt-1 text-sm text-slate-400">
              Update your worker configuration.
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
            </div>

            <div className="space-y-5">
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Worker Name *
                </label>

                <input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  maxLength={100}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Description *
                </label>

                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  maxLength={300}
                  className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </section>

          {/* Instructions */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-6 text-lg font-semibold text-white">
              Instructions
            </h2>

            <textarea
              name="instructions"
              value={formData.instructions}
              onChange={handleChange}
              rows={9}
              className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm leading-6 text-white outline-none focus:border-indigo-500"
            />
          </section>

          {/* Model */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-6 text-lg font-semibold text-white">Model</h2>

            <input
              name="model"
              value={formData.model}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-mono text-sm text-white outline-none focus:border-indigo-500"
            />
          </section>

          {/* Configuration */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-2 text-lg font-semibold text-white">
              Configuration
            </h2>

            <p className="mb-6 text-sm text-slate-400">
              JSON configuration object.
            </p>

            <textarea
              name="configuration"
              value={formData.configuration}
              onChange={handleChange}
              rows={8}
              className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-mono text-sm leading-6 text-white outline-none focus:border-indigo-500"
            />
          </section>

          {/* Status */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Worker Status
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Enable or disable this worker.
                </p>
              </div>

              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-indigo-500"
              >
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
          </section>

          {/* Actions */}
          <div className="flex justify-end gap-3 pb-6">
            <button
              type="button"
              onClick={() => navigate(`/dashboard/workers/${id}`)}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm text-slate-300 hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting && <Loader2 size={17} className="animate-spin" />}

              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
