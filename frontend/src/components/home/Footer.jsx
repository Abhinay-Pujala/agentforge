export default function Footer() {
  return (
    <footer className="bg-slate-950 py-12 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-6 flex gap-10 flex-col sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-indigo-500 text-sm text-white font-bold shadow-lg shadow-indigo-500/20">
              A
            </div>
            <span className="text-lg font-semibold tracking-tight text-white">
              AgentForge
            </span>
          </div>
          <p className="mt-3 text-slate-500 text-sm leading-6 max-w-xs">
            Build your AI workforce.
          </p>
        </div>
        <div>
          <h3 className="text-white text-xl font-semibold mb-2">Product</h3>
          <div className="flex flex-col gap-2 text-slate-500 transition">
            <a href="#features" className="hover:text-white">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-white">
              How it works
            </a>
            <a href="#why-agentforge" className="hover:text-white">
              Why AgentForge
            </a>
          </div>
        </div>
        <div>
          <h3 className="text-white text-xl font-semibold mb-2">Resources</h3>
          <div className="flex flex-col gap-2 text-slate-400">
            <a
              href="https://github.com/Abhinay-Pujala/agentforge"
              className="hover:text-white"
            >
              Github
            </a>
          </div>
        </div>
      </div>
      <div className="mt-10 border-t border-white/10 pt-6"></div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between max-w-7xl mx-auto px-6">
        <h3 className="text-xs text-slate-600">
          © 2026 AgentForge. All rights reserved.
        </h3>
        <p className="text-xs text-slate-600">
          Built for the AI workforce era.
        </p>
      </div>
    </footer>
  );
}
