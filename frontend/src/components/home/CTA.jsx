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
        <div className="relative overflow-hidden rounded-3xl border border-indigo-200 bg-linear-to-br from-indigo-100/80 via-white/90 to-violet-100/70 px-6 py-20 text-center shadow-[0_24px_70px_rgba(79,70,229,0.12)] backdrop-blur-2xl">
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
            className="inline-flex group gap-2 mt-8 text-white bg-indigo-600 font-medium rounded-xl px-6 py-3.5 transition hover:bg-indigo-500 cursor-pointer"
          >
            Start Building{" "}
            <ArrowRight className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  );
}
