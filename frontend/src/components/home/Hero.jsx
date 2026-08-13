import { ArrowRight, Play } from "lucide-react";
import { loginWithGoogle } from "../../services/auth.service.js";

export default function Hero() {
  const handleGetStarted = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error("Google sign-in failed:", error);
    }
  };

  return (
    <section className="relative min-h-screen overflow-hidden bg-slate-950 pt-32">
      {/* Background glow */}
      <div className="pointer-events-none absolute left-1/2 top-20 h-96 w-96 -translate-x-1/2 rounded-full bg-indigo-500/20 blur-[120px]" />

      <div className="pointer-events-none absolute right-0 top-1/3 h-80 w-80 rounded-full bg-violet-500/10 blur-[120px]" />

      <div className="relative mx-auto flex min-h-[calc(100vh-8rem)] max-w-7xl items-center px-6 pb-20">
        <div className="grid w-full items-center gap-16 lg:grid-cols-2">
          {/* Left */}
          <div>
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-4 py-2 text-sm text-indigo-300">
              <span className="h-2 w-2 rounded-full bg-indigo-400" />
              Build your AI workforce
            </div>

            {/* Heading */}
            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Build AI Workers
              <span className="block bg-linear-to-r from-indigo-400 via-violet-400 to-indigo-300 bg-clip-text text-transparent">
                that actually work.
              </span>
            </h1>

            {/* Description */}
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-400">
              AgentForge gives you a place to build, configure, and run
              intelligent AI Workers that can handle real tasks and workflows
              for you.
            </p>

            {/* CTAs */}
            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <button
                onClick={handleGetStarted}
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-6 py-3.5 font-medium text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400 cursor-pointer"
              >
                Start Building
                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                />
              </button>

              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 font-medium text-slate-200 transition hover:bg-white/10"
              >
                <Play size={17} />
                See how it works
              </a>
            </div>

            {/* Small trust line */}
            <p className="mt-6 text-sm text-slate-500">
              No complicated setup. Define your Worker and let it do the work.
            </p>
          </div>

          {/* Right — product visual */}
          <div className="relative hidden lg:block">
            <div className="absolute -inset-8 rounded-4xl bg-indigo-500/10 blur-3xl" />

            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/90 shadow-2xl shadow-black/40">
              {/* Window header */}
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div className="flex gap-2">
                  <span className="h-3 w-3 rounded-full bg-slate-700" />
                  <span className="h-3 w-3 rounded-full bg-slate-700" />
                  <span className="h-3 w-3 rounded-full bg-slate-700" />
                </div>

                <span className="text-xs text-slate-500">
                  AgentForge Workspace
                </span>
              </div>

              {/* Mock workspace */}
              <div className="grid grid-cols-[150px_1fr]">
                <aside className="border-r border-white/10 p-4">
                  <div className="mb-6 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Workspace
                  </div>

                  <div className="space-y-2">
                    {["Overview", "AI Workers", "Executions", "History"].map(
                      (item, index) => (
                        <div
                          key={item}
                          className={`rounded-lg px-3 py-2 text-xs ${
                            index === 1
                              ? "bg-indigo-500/15 text-indigo-300"
                              : "text-slate-500"
                          }`}
                        >
                          {item}
                        </div>
                      ),
                    )}
                  </div>
                </aside>

                <main className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500">Your Worker</p>
                      <h3 className="mt-1 text-lg font-semibold text-white">
                        Research Worker
                      </h3>
                    </div>

                    <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-400">
                      Active
                    </span>
                  </div>

                  <div className="mt-6 space-y-3">
                    <div className="rounded-xl border border-white/10 bg-slate-950/70 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Task</span>
                        <span className="text-xs text-indigo-400">Running</span>
                      </div>

                      <p className="mt-3 text-sm text-slate-300">
                        Research the latest developments in AI agents...
                      </p>

                      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-800">
                        <div className="h-full w-3/4 rounded-full bg-indigo-500" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-white/10 bg-slate-950/70 p-4">
                        <p className="text-xs text-slate-500">Executions</p>
                        <p className="mt-2 text-xl font-semibold text-white">
                          128
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-slate-950/70 p-4">
                        <p className="text-xs text-slate-500">Success rate</p>
                        <p className="mt-2 text-xl font-semibold text-emerald-400">
                          96.4%
                        </p>
                      </div>
                    </div>
                  </div>
                </main>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
