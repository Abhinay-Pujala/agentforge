import Sidebar from "../components/dashboard/Sidebar";
import Topbar from "../components/dashboard/Topbar";

export default function DashboardLayout({ children, title }) {
  return (
    <div className="min-h-screen flex bg-slate-950">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar title={title} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
