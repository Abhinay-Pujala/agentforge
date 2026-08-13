import {
  Settings2,
  BrainCircuit,
  Play,
  History,
  Workflow,
  ShieldCheck,
} from "lucide-react";

const features = [
  {
    icon: Settings2,
    title: "Configure AI Workers",
    description:
      "Define exactly how each Worker behaves, what it should do, and how it should respond.",
  },
  {
    icon: BrainCircuit,
    title: "Choose the Intelligence",
    description:
      "Give each Worker the right AI model and configuration for the job it needs to perform.",
  },
  {
    icon: Play,
    title: "Run on Demand",
    description:
      "Launch a Worker whenever you need it and get the result without rebuilding the workflow every time.",
  },
  {
    icon: Workflow,
    title: "Automate Workflows",
    description:
      "Connect AI Workers with automated workflows to turn instructions into repeatable processes.",
  },
  {
    icon: History,
    title: "Track Executions",
    description:
      "Keep a record of Worker executions so you can understand what happened and review results.",
  },
  {
    icon: ShieldCheck,
    title: "Controlled by Design",
    description:
      "Keep Workers configuration-driven and predictable instead of relying on hidden behavior.",
  },
];

export default function FeaturesSection() {
  return (
    <section
      id="features"
      className="relative overflow-hidden bg-slate-950 py-28"
    >
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/5 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-6">
        {/* Heading */}
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-400">
            Capabilities
          </p>

          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Everything you need to build an AI workforce.
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-400">
            Start with a simple Worker and gradually turn it into a reliable
            system that handles real work.
          </p>
        </div>

        {/* Feature grid */}
        <div className="mt-16 grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="group bg-slate-950 p-8 transition hover:bg-slate-900"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/3 text-indigo-400 transition group-hover:border-indigo-400/30 group-hover:bg-indigo-500/10">
                  <Icon size={21} />
                </div>

                <h3 className="mt-6 text-lg font-semibold text-white">
                  {feature.title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-slate-400">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
