import { Reveal } from '../animations/Reveal';
import { UserPlus, Package, ShoppingCart, TrendingUp } from 'lucide-react';

const STEPS = [
  { icon: UserPlus, title: 'Create your business', desc: 'Register, add business details and select the type of business you operate.' },
  { icon: Package, title: 'Set up your products or services', desc: 'Add products, services, prices, stock and employees.' },
  { icon: ShoppingCart, title: 'Start operating', desc: 'Record sales, track payments, monitor stock and manage everyday operations.' },
  { icon: TrendingUp, title: 'Grow with insight', desc: 'Use reports, AI recommendations and multi-branch intelligence to make better decisions.' },
];

export function HowItWorks() {
  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl mx-auto text-center mb-14">
          <p className="text-sm font-semibold text-emerald-600 mb-3">Getting started</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            From setup to smarter business decisions.
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Connecting line */}
          <div className="hidden lg:block absolute top-12 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <Reveal key={i} delay={i * 0.1}>
                <div className="relative text-center">
                  <div className="relative inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm mb-4">
                    <Icon className="w-5 h-5 text-emerald-600" />
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-1.5">{step.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={0.4} className="text-center mt-12">
          <a href="/register" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors">
            Start free trial
          </a>
        </Reveal>
      </div>
    </section>
  );
}
