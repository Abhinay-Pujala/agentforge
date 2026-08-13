import { ArrowRight } from "lucide-react";
import { loginWithGoogle } from "../../services/auth.service.js";

export default function Navbar() {
  const handleGetStarted = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error("Google sign-in failed:", error);
    }
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <nav className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/80 px-5 py-3 backdrop-blur-xl">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500 text-sm font-bold text-white shadow-lg shadow-indigo-500/20">
              A
            </div>

            <span className="text-lg font-semibold tracking-tight text-white">
              AgentForge
            </span>
          </div>

          {/* Navigation */}
          <div className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="text-sm text-slate-400 transition hover:text-white"
            >
              Features
            </a>

            <a
              href="#how-it-works"
              className="text-sm text-slate-400 transition hover:text-white"
            >
              How it works
            </a>

            <a
              href="#why-agentforge"
              className="text-sm text-slate-400 transition hover:text-white"
            >
              Why AgentForge
            </a>
          </div>

          {/* CTA */}
          <button
            onClick={handleGetStarted}
            className="cursor-pointer group flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
          >
            Get Started
            <ArrowRight
              size={16}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </button>
        </nav>
      </div>
    </header>
  );
}
