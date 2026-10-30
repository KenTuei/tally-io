import { Reveal, RevealStagger, RevealItem } from '../animations/Reveal';
import { AlertTriangle, Package, TrendingDown, Clock, DollarSign, Calendar, Eye } from 'lucide-react';

const PROBLEMS = [
  { icon: TrendingDown, title: 'Not knowing how much you actually made', desc: 'Revenue and profit get confused. You wonder where the money went.' },
  { icon: Package, title: 'Discovering stock is out too late', desc: 'Customers ask for products you no longer have on the shelf.' },
  { icon: AlertTriangle, title: 'Unsold stock tying up capital', desc: 'Products sit on shelves for months, quietly costing you money.' },
  { icon: Calendar, title: 'Struggling to compare your stores', desc: 'Each branch feels like a separate business you can\'t see together.' },
  { icon: Clock, title: 'Spending hours on daily reports', desc: 'End-of-day closing takes too long, done by hand, prone to errors.' },
  { icon: DollarSign, title: 'Losing track of expenses', desc: 'Costs happen throughout the day and nobody adds them up properly.' },
];

export function ProblemSection() {
  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl mx-auto text-center mb-12">
          <p className="text-sm font-semibold text-emerald-600 mb-3">The challenge</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Running a business shouldn't mean running after numbers.
          </h2>
        </Reveal>

        <RevealStagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" stagger={0.08}>
          {PROBLEMS.map((prob, i) => {
            const Icon = prob.icon;
            return (
              <RevealItem key={i}>
                <div className="p-5 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 transition-colors h-full">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-slate-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-1.5">{prob.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{prob.desc}</p>
                </div>
              </RevealItem>
            );
          })}
        </RevealStagger>

        {/* Transition into solution */}
        <Reveal delay={0.2} className="mt-14 text-center">
          <div className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 text-white">
            <Eye className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium">Bring everything together. See what's happening. Know what needs attention.</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
