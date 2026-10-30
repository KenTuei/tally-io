import { Reveal, RevealStagger, RevealItem } from '../animations/Reveal';
import { Store, ShoppingBag, Pill, Wrench, Sparkles, Smartphone, Utensils, Scissors, Building2, Package } from 'lucide-react';

const INDUSTRIES = [
  { icon: Store, title: 'Retail & Minimarkets', desc: 'Track everyday sales, products, stock and payments.' },
  { icon: ShoppingBag, title: 'Supermarkets & Wholesale', desc: 'Manage larger catalogues, stock quantities, purchasing and sales.' },
  { icon: Pill, title: 'Pharmacies & Health', desc: 'Monitor stock batches, expiry dates and inventory risks.' },
  { icon: Wrench, title: 'Hardware & Construction', desc: 'Manage product catalogues, pricing, stock and expenses.' },
  { icon: Sparkles, title: 'Cosmetics & Beauty', desc: 'Track products, sales, stock and customer purchases.' },
  { icon: Utensils, title: 'Restaurants & Cafés', desc: 'Track sales, ingredients, stock usage and operating costs.' },
  { icon: Scissors, title: 'Salons & Kinyozi', desc: 'Record services, staff performance, customers served and commissions.' },
  { icon: Building2, title: 'Multi-Branch Businesses', desc: 'Compare locations and manage operations from one dashboard.' },
];

export function IndustryGrid() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl mx-auto text-center mb-12">
          <p className="text-sm font-semibold text-emerald-600 mb-3">Solutions</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Built around the way your business works.
          </h2>
        </Reveal>

        <RevealStagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" stagger={0.06}>
          {INDUSTRIES.map((ind) => {
            const Icon = ind.icon;
            return (
              <RevealItem key={ind.title}>
                <div className="p-5 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:shadow-md transition-all h-full group cursor-pointer">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition-colors">
                    <Icon className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-1.5">{ind.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{ind.desc}</p>
                </div>
              </RevealItem>
            );
          })}
        </RevealStagger>
      </div>
    </section>
  );
}
