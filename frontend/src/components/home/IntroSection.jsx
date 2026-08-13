import { Bot, Workflow, Sparkles } from "lucide-react";

const concepts = [
  {
    icon: Bot,
    title: "AI Workers",
    description:
      "Create specialized AI Workers with their own instructions, behavior, and responsibilities.",
  },
  {
    icon: Workflow,
    title: "Real Workflows",
    description:
      "Connect your Workers to workflows so they can move beyond conversations and perform useful tasks.",
  },
  {
    icon: Sparkles,
    title: "One AI Workforce",
    description:
      "Build a collection of intelligent Workers that work together as your digital workforce.",
  },
];

export default function IntroSection() {
  return (
    <section className="relative bg-slate-950 py-28" id="about">
      <div className="mx-auto max-w-7xl px-6">
        {/* Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-400">
            The idea
          </p>

          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Think beyond individual AI chats.
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-400">
            AgentForge is designed around a simple idea: instead of asking AI to
            do everything yourself, create specialized AI Workers that are
            configured to handle specific jobs.
          </p>
        </div>

        {/* Concepts */}
        <div className="mt-16 grid gap-5 md:grid-cols-3">
          {concepts.map((concept) => {
            const Icon = concept.icon;

            return (
              <div
                key={concept.title}
                className="group rounded-2xl border border-white/10 bg-white/3 p-7 transition hover:-translate-y-1 hover:border-indigo-400/30 hover:bg-white/5"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                  <Icon size={21} />
                </div>

                <h3 className="mt-6 text-lg font-semibold text-white">
                  {concept.title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-slate-400">
                  {concept.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
