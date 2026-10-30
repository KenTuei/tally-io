import { useNavigate } from 'react-router-dom';
import { Reveal } from '../animations/Reveal';
import { ArrowRight, Mail } from 'lucide-react';

export function FinalCTA() {
  const navigate = useNavigate();

  return (
    <section className="py-24 bg-slate-900 relative overflow-hidden">
      {/* Decorative gradient */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <Reveal>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
            Your business deserves a clearer picture.
          </h2>
          <p className="mt-5 text-lg text-slate-400 max-w-xl mx-auto">
            Bring your sales, inventory, finances and business intelligence together with Tally.io.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/register')}
              className="group flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-emerald-500 text-white font-semibold text-sm shadow-lg hover:bg-emerald-600 transition-all w-full sm:w-auto"
            >
              Get started with Tally.io
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <a
              href="mailto:support@tally.io"
              className="flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-white/10 text-white font-semibold text-sm border border-white/20 hover:bg-white/20 transition-all w-full sm:w-auto"
            >
              <Mail className="w-4 h-4" />
              Talk to our team
            </a>
          </div>

          <p className="mt-5 text-sm text-slate-500">
            No credit card required · 14-day free trial · Built for Kenyan businesses
          </p>
        </Reveal>
      </div>
    </section>
  );
}
