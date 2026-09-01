import {
  LayoutDashboard,
  Bot,
  History,
  Wrench,
  Settings,
  LogOut,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { logOut } from "../../services/auth.service.js";

export default function Sidebar() {
  const { user } = useAuth();

  const navItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Workers",
      path: "/dashboard/workers",
      icon: Bot,
    },
    {
      name: "Runs",
      path: "/dashboard/executions",
      icon: History,
    },
    {
      name: "Tools",
      path: "/dashboard/tools",
      icon: Wrench,
    },
    {
      name: "Settings",
      path: "/settings",
      icon: Settings,
    },
  ];

  const handleLogout = async () => {
    try {
      await logOut();
    } catch (err) {
      console.error("Logout failed: ", err);
    }
  };

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
      {/* Sidebar Heading */}
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-white text-2xl font-bold">AgentForge</h1>
        <p className="text-slate-400 text-sm mt-1">AI Workforce Platform</p>
      </div>
      {/* Nav Links */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === "/dashboard"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 w-full rounded-xl transition-all duration-200 ${isActive ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`
              }
            >
              <Icon size={18} />
              {item.name}
            </NavLink>
          );
        })}
      </nav>
      {/* Sidebar footer */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3">
          <img
            src={user.photoURL}
            alt="User Photo"
            className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-xs"
          />

          <div>
            <p className="text-white text-sm font-medium">
              {user?.name.split(" ")[0] || "User"}
            </p>

            <p className="text-xs text-slate-400">Free Plan</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 mt-4 px-4 py-3 text-slate-300 w-full rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 cursor-pointer"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}
