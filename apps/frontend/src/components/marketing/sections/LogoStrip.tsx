import { motion } from 'framer-motion';

const CATEGORIES = [
  'Retail', 'Wholesale', 'Supermarkets', 'Pharmacies', 'Hardware',
  'Restaurants', 'Salons', 'Electronics', 'Agrovets', 'Service Businesses',
];

export function LogoStrip() {
  return (
    <section className="py-14 bg-white border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm font-medium text-slate-400 mb-8">
          Built for the businesses that keep Kenya moving
        </p>
        <div className="relative overflow-hidden">
          {/* Gradient fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

          <motion.div
            animate={{ x: ['0%', '-50%'] }}
            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            className="flex gap-10 w-max"
          >
            {[...CATEGORIES, ...CATEGORIES].map((cat, i) => (
              <div key={i} className="flex items-center gap-2 whitespace-nowrap">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-slate-400">{cat.charAt(0)}</span>
                </div>
                <span className="text-sm font-semibold text-slate-400">{cat}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
