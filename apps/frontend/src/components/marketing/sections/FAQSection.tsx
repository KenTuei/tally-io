import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Reveal } from '../animations/Reveal';
import { cn } from '../../../lib/utils';

const FAQS = [
  { q: 'What is Tally.io?', a: 'Tally.io is a smart POS and business management platform that brings your sales, inventory, finances and business intelligence together in one place. Built for Kenyan businesses, it helps you understand what\'s happening across your entire operation.' },
  { q: 'What types of businesses can use Tally.io?', a: 'Retail shops, minimarkets, supermarkets, wholesalers, pharmacies, hardware stores, cosmetics shops, electronics shops, restaurants, cafés, salons, kinyozi businesses, service businesses, and businesses with multiple branches.' },
  { q: 'Can I manage multiple branches?', a: 'Yes. Multi-branch management is a core feature. You can compare store performance, transfer stock between branches, and view consolidated reports — all from one dashboard.' },
  { q: 'Can different employees have different permissions?', a: 'Yes. Each staff member gets their own login. Roles include owner, admin, manager, accountant, inventory manager, cashier, salesperson, and auditor. You decide what each role can access.' },
  { q: 'Can I track stock across different locations?', a: 'Yes. Each branch maintains its own stock levels, and stock transfers between branches are recorded as inventory movements, not sales.' },
  { q: 'Does Tally.io help me understand my profits?', a: 'Yes. Tally.io distinguishes gross sales, net sales, cost of goods sold, gross profit, operating expenses, and operating profit. Reports clearly separate revenue from profit.' },
  { q: 'Can I manage services as well as products?', a: 'Yes. Salons, kinyozi businesses and service providers can record completed services, track revenue per staff member, and see product sales alongside service revenue.' },
  { q: 'Can I track products nearing expiry?', a: 'Yes. The expiry management module monitors batches, sends configurable alerts (30, 14, 7, 3 days before expiry), and provides a clear workflow for affected stock.' },
  { q: 'Does Tally.io support M-Pesa?', a: 'Yes. M-Pesa Daraja integration supports STK Push, callback handling, and reconciliation. Sandbox credentials can be configured for testing.' },
  { q: 'Can I use Tally.io when the internet is unavailable?', a: 'Yes. Tally.io is offline-first. Sales are saved locally on your device and synchronize automatically when connectivity returns. Your business doesn\'t stop when the internet does.' },
  { q: 'Can I access my business from my phone?', a: 'Yes. Tally.io works on desktop, tablet, and mobile. An Android app is available via Capacitor, and the web app works in any modern browser.' },
  { q: 'How do subscriptions work?', a: 'Plans range from Starter to Enterprise. Every plan includes a 14-day free trial with no credit card required. You can upgrade or downgrade at any time. During development, subscription enforcement can be disabled locally for testing.' },
];

export function FAQSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="py-20 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-10">
          <p className="text-sm font-semibold text-emerald-600 mb-3">FAQ</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Common questions
          </h2>
        </Reveal>

        <div className="space-y-2">
          {FAQS.map((faq, i) => (
            <Reveal key={i} delay={i * 0.03}>
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="flex items-center justify-between w-full px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                >
                  <span className="text-sm font-semibold text-slate-900">{faq.q}</span>
                  <ChevronDown className={cn('w-4 h-4 text-slate-400 flex-shrink-0 transition-transform', open === i && 'rotate-180')} />
                </button>
                <AnimatePresence>
                  {open === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
