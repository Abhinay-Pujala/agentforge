import { useAuth } from "../../hooks/useAuth";

export default function WelcomeCard() {
  const { user } = useAuth();

  return (
    <section className="glass-panel overflow-hidden p-5 sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-indigo-600">
            Overview
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
            Welcome back, {user?.name?.split(" ")[0] || "there"} 👋
          </h1>
        </div>

        <div className="inline-flex items-center gap-2 self-start rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 shadow-[0_0_0_1px_rgba(16,185,129,0.12)] backdrop-blur-xl">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Workspace healthy
        </div>
      </div>

      <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
        Create, deploy and manage your AI workforce from one place.
      </p>
    </section>
  );
}
