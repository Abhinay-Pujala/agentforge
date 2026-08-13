import { ArrowRight } from "lucide-react";
import { loginWithGoogle } from "../../services/auth.service";

const handleGetStarted = async () => {
  try {
    await loginWithGoogle();
  } catch (err) {
    console.error("Google login failed: ", err);
  }
};

export default function CTA() {
  return (
    <section className="bg-slate-950 py-28">
      <div className="max-w-5xl mx-auto px-6">
        <div className="relative overflow-hidden rounded-3xl border border-indigo-400/20 bg-linear-to-br from-indigo-500/10 via-slate-900 to-violet-500/10 px-6 py-20 text-center">
          <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/20 blur-[100px] pointer-events-none"></div>
          <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white">
            READY TO BUILD?
          </h2>
          <p className="text-slate-400 mt-6 mx-auto max-w-xl text-lg leading-8">
            Build your first AI Worker.
            <br />
            Turn repetitive work into intelligent workflows.
          </p>
          <button
            onClick={handleGetStarted}
            className="inline-flex group gap-2 mt-8 text-slate-950 bg-white font-medium rounded-xl px-6 py-3.5 transition hover:bg-slate-200 cursor-pointer"
          >
            Start Building{" "}
            <ArrowRight className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  );
}
