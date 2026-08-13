import { Target, Repeat2, Layers3, LineChart } from "lucide-react";

const reasons = [
  {
    icon: Target,
    title: "Built for specific jobs",
    description:
      "Each Worker is designed around a clear responsibility instead of trying to be a general-purpose assistant.",
  },
  {
    icon: Repeat2,
    title: "Reusable by design",
    description:
      "Configure a Worker once and reuse it whenever the same type of work needs to be done.",
  },
  {
    icon: Layers3,
    title: "A workforce, not a single agent",
    description:
      "Create multiple specialized Workers and build a system where every Worker has a role.",
  },
  {
    icon: LineChart,
    title: "Improve through execution",
    description:
      "Review execution history and results to understand what works and continuously improve your Workers.",
  },
];

export default function WhyAgentForgeSection() {
  return (
    <section
      id="why-agentforge"
      className="relative overflow-hidden bg-slate-950 py-28"
    >
      {/* Background glow */}
      <div className="pointer-events-none absolute right-0 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-violet-500/5 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-16 lg:grid-cols-[0.9fr_1.1fr]">
          {/* Left */}
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-400">
              Why AgentForge
            </p>

            <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
              Don't just use AI.
              <span className="block text-slate-500">
                Build a workforce around it.
              </span>
            </h2>

            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-400">
              Most AI tools are built around individual conversations.
              AgentForge is built around persistent, specialized Workers that
              can be configured and reused for real work.
            </p>
          </div>

          {/* Right */}
          <div className="grid gap-4 sm:grid-cols-2">
            {reasons.map((reason) => {
              const Icon = reason.icon;

              return (
                <div
                  key={reason.title}
                  className="rounded-2xl border border-white/10 bg-white/3 p-6 transition hover:border-indigo-400/20 hover:bg-white/5"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                    <Icon size={20} />
                  </div>

                  <h3 className="mt-5 text-base font-semibold text-white">
                    {reason.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {reason.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
