import { useAuth } from "../../hooks/useAuth";

export default function WelcomeCard() {
  const { user } = useAuth();

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h1 className="text-3xl font-bold text-white">
        Welcome back, {user.name.split(" ")[0]} 👋
      </h1>

      <p className="text-slate-400 mt-2">
        Create, deploy and manage your AI workforce from one place.
      </p>
    </div>
  );
}
