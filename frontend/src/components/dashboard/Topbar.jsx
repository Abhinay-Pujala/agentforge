import { Bell } from "lucide-react";

export default function Topbar({ title }) {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-6">
      <h2 className="text-white text-xl font-semibold">{title}</h2>
      <button className="p-2 text-slate-400 rounded-lg hover:text-white hover:bg-slate-800 transition-all duration-200 cursor-pointer">
        <Bell />
      </button>
    </header>
  );
}
