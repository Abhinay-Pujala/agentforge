import {
  Plus,
  SlidersHorizontal,
  Play,
  BarChart3,
  ArrowRight,
} from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Plus,
    title: "Create",
    description:
      "Create a new AI Worker and give it a clear purpose based on the work you want it to handle.",
  },
  {
    number: "02",
    icon: SlidersHorizontal,
    title: "Configure",
    description:
      "Define its instructions, model, behavior, and configuration so the Worker knows exactly how to operate.",
  },
  {
    number: "03",
    icon: Play,
    title: "Run",
    description:
      "Give your Worker a task and let it execute the configured workflow to produce a useful result.",
  },
  {
    number: "04",
    icon: BarChart3,
    title: "Review",
    description:
      "Inspect the execution and result, learn from what happened, and improve your Worker when necessary.",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative bg-slate-950 py-28">
      <div className="mx-auto max-w-7xl px-6">
        {/* Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-400">
            How it works
          </p>

          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            From idea to execution in four steps.
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-400">
            AgentForge keeps the process simple. Define what your Worker should
            do, configure it, run it, and learn from the results.
          </p>
        </div>

        {/* Steps */}
        <div className="relative mt-20">
          {/* Connector */}
          <div className="absolute left-[12.5%] right-[12.5%] top-7 hidden h-px bg-linear-to-r from-transparent via-indigo-400/30 to-transparent lg:block" />

          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => {
              const Icon = step.icon;

              return (
                <div key={step.number} className="relative text-center">
                  {/* Icon */}
                  <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-400/20 bg-slate-900 text-indigo-400 shadow-lg shadow-indigo-500/5">
                    <Icon size={22} />
                  </div>

                  {/* Number */}
                  <p className="mt-6 text-xs font-semibold tracking-[0.2em] text-indigo-400/70">
                    {step.number}
                  </p>

                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {step.title}
                  </h3>

                  <p className="mx-auto mt-3 max-w-xs text-sm leading-7 text-slate-400">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Flow summary */}
        <div className="mx-auto mt-20 flex max-w-2xl items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/3 px-5 py-4 text-sm text-slate-400">
          <span className="text-white">Create</span>
          <ArrowRight size={15} />
          <span className="text-white">Configure</span>
          <ArrowRight size={15} />
          <span className="text-white">Run</span>
          <ArrowRight size={15} />
          <span className="text-white">Review</span>
        </div>
      </div>
    </section>
  );
}
