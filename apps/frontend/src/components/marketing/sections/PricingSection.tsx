import { useState } from 'react';
import { Reveal } from '../animations/Reveal';
import { Check, Sparkles } from 'lucide-react';
import { cn } from '../../../lib/utils';

const PLANS = [
  {
    name: 'Starter',
    desc: 'For a single shop beginning to organize its operations.',
    priceMonthly: '999',
    priceYearly: '9,990',
    features: ['Basic POS', 'Sales tracking', 'Products & inventory', 'Essential reports', '1 branch', '3 users'],
    cta: 'Start free trial',
    popular: false,
  },
  {
    name: 'Growth',
    desc: 'For growing businesses that need deeper inventory and intelligence.',
    priceMonthly: '2,499',
    priceYearly: '24,990',
    features: ['Everything in Starter', 'AI recommendations', 'Customer management', 'Expense tracking', 'Expiry alerts', 'Email automation', '2 branches', '10 users'],
    cta: 'Start free trial',
    popular: true,
  },
  {
    name: 'Multi-Branch',
    desc: 'For owners managing multiple locations.',
    priceMonthly: '4,999',
    priceYearly: '49,990',
    features: ['Everything in Growth', 'Centralized management', 'Branch comparisons', 'Stock transfers', 'Organization-wide reporting', '10 branches', '30 users'],
    cta: 'Start free trial',
    popular: false,
  },
  {
    name: 'Enterprise',
    desc: 'For larger organizations requiring advanced permissions.',
    priceMonthly: '9,999',
    priceYearly: '99,990',
    features: ['Everything in Multi-Branch', 'Advanced permissions', 'Configurable integrations', 'Priority support', 'Unlimited branches', 'Unlimited users'],
    cta: 'Contact sales',
    popular: false,
  },
];

export function PricingSection() {
  const [annual, setAnnual] = useState(true);

  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl mx-auto text-center mb-10">
          <p className="text-sm font-semibold text-emerald-600 mb-3">Pricing</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            A plan that grows with your business.
          </h2>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-3 mt-6 p-1 bg-white rounded-xl border border-slate-200">
            <button onClick={() => setAnnual(false)} className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-colors', !annual ? 'bg-slate-900 text-white' : 'text-slate-600')}>Monthly</button>
            <button onClick={() => setAnnual(true)} className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-colors', annual ? 'bg-slate-900 text-white' : 'text-slate-600')}>
              Annual <span className="text-emerald-500 text-xs ml-1">Save 2 months</span>
            </button>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 0.08}>
              <div className={cn(
                'relative rounded-2xl border bg-white p-6 h-full flex flex-col transition-all',
                plan.popular ? 'border-emerald-400 shadow-lg ring-1 ring-emerald-400/20' : 'border-slate-200 hover:border-slate-300',
              )}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-semibold">
                    <Sparkles className="w-3 h-3" /> Most popular
                  </div>
                )}
                <h3 className="text-base font-bold text-slate-900">{plan.name}</h3>
                <p className="text-xs text-slate-500 mt-1 mb-4 min-h-[2.5rem]">{plan.desc}</p>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-slate-900">KES {annual ? plan.priceYearly : plan.priceMonthly}</span>
                  <span className="text-sm text-slate-400">/{annual ? 'year' : 'month'}</span>
                </div>
                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-sm text-slate-600">
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      {feat}
                    </li>
                  ))}
                </ul>
                <a
                  href={plan.cta === 'Contact sales' ? 'mailto:support@tally.io' : '/register'}
                  className={cn(
                    'block text-center py-2.5 rounded-xl text-sm font-semibold transition-colors',
                    plan.popular ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-slate-100 text-slate-900 hover:bg-slate-200',
                  )}
                >
                  {plan.cta}
                </a>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.4} className="text-center mt-8">
          <p className="text-xs text-slate-400">14-day free trial · No credit card required · Cancel anytime</p>
        </Reveal>
      </div>
    </section>
  );
}
