import {
  LayoutDashboard,
  Bot,
  History,
  Workflow,
  Wrench,
  LogOut,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { logOut } from "../../services/auth.service.js";

export default function Sidebar() {
  const { user } = useAuth();

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Workers", path: "/dashboard/workers", icon: Bot },
    { name: "Runs", path: "/dashboard/executions", icon: History },
    { name: "Workflows", path: "/dashboard/workflows", icon: Workflow },
    { name: "Tools", path: "/dashboard/tools", icon: Wrench },
  ];

  const handleLogout = async () => {
    try {
      await logOut();
    } catch (err) {
      console.error("Logout failed: ", err);
    }
  };

  return (
    <aside className="sticky top-0 hidden h-screen max-h-screen w-72 shrink-0 self-start overflow-y-auto border-r border-white/80 bg-white/50 shadow-[inset_-1px_0_0_rgba(255,255,255,0.8),12px_0_40px_rgba(51,65,85,0.04)] backdrop-blur-2xl md:flex md:flex-col">
      <div className="shrink-0 border-b border-white/60 px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-indigo-300 text-base font-bold text-white shadow-[0_12px_26px_rgba(99,102,241,0.45)]">
            A
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-white">AgentForge</h1>
            <p className="text-xs text-slate-400">AI Workforce Platform</p>
          </div>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === "/dashboard"}
              className={({ isActive }) =>
                `group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border px-3.5 py-2.5 text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? "border-indigo-200/80 bg-white/75 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_14px_28px_rgba(79,70,229,0.12)]"
                    : "border-transparent bg-transparent text-slate-600 hover:border-white/80 hover:bg-white/60 hover:text-slate-900 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_12px_24px_rgba(15,23,42,0.05)]"
                }`
              }
            >
              <span className="absolute inset-0 bg-gradient-to-r from-white/35 via-white/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <Icon size={18} className="relative z-10 transition-transform duration-300 group-hover:scale-110" />
              <span className="relative z-10">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-white/10 p-4">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
          <img
            src={user?.photoURL || "https://ui-avatars.com/api/?name=User&background=4f46e5&color=fff"}
            alt="User Photo"
            className="h-10 w-10 rounded-full border border-white/10 bg-indigo-500 object-cover"
          />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {user?.name?.split(" ")[0] || "User"}
            </p>
            <p className="text-xs text-slate-400">Free Plan</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/70 bg-white/55 px-3.5 py-2.5 text-sm font-medium text-slate-600 transition-all duration-300 hover:-translate-y-0.5 hover:border-red-300/60 hover:bg-red-500/10 hover:text-red-600 hover:shadow-[0_12px_22px_rgba(239,68,68,0.08)]"
        >
          <LogOut size={17} />
          Logout
        </button>
      </div>
    </aside>
  );
}
