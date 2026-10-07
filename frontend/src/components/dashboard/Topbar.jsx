import { useState } from "react";
import { Bell, Menu, X, LayoutDashboard, Bot, History, Workflow, Wrench } from "lucide-react";
import { NavLink } from "react-router-dom";

const navItems = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "Workers", path: "/dashboard/workers", icon: Bot },
  { name: "Runs", path: "/dashboard/executions", icon: History },
  { name: "Workflows", path: "/dashboard/workflows", icon: Workflow },
  { name: "Tools", path: "/dashboard/tools", icon: Wrench },
];

export default function Topbar({ title }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/80 bg-white/55 px-4 py-3 shadow-[0_8px_30px_rgba(51,65,85,0.06)] backdrop-blur-2xl sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Toggle navigation menu"
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition-all duration-200 hover:border-white/20 hover:bg-white/10 md:hidden"
              onClick={() => setMobileMenuOpen((value) => !value)}
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
                Workspace
              </p>
              <h2 className="mt-1 truncate text-xl font-semibold tracking-tight text-white sm:text-2xl">
                {title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            aria-label="Notifications"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition-all duration-200 hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            <Bell size={18} />
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="border-b border-white/10 bg-slate-900/80 p-3 backdrop-blur-xl md:hidden">
          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  end={item.path === "/dashboard"}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-white/10 text-white"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`
                  }
                >
                  <Icon size={17} />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}
