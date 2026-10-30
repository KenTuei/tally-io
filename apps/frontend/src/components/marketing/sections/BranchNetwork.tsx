import { motion } from 'framer-motion';
import { Reveal } from '../animations/Reveal';
import { Store, TrendingUp, ArrowRightLeft, MapPin } from 'lucide-react';

const BRANCHES = [
  { name: 'Nairobi CBD', sales: 'KES 48,650', txns: 86, alerts: 3, x: 50, y: 55 },
  { name: 'Westlands', sales: 'KES 36,200', txns: 64, alerts: 1, x: 35, y: 40 },
  { name: 'Thika', sales: 'KES 29,400', txns: 51, alerts: 2, x: 75, y: 30 },
];

export function BranchNetwork() {
  return (
    <section className="py-20 bg-slate-900 text-white relative overflow-hidden">
      {/* Decorative grid */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl mx-auto text-center mb-14">
          <p className="text-sm font-semibold text-emerald-400 mb-3">Multi-branch intelligence</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Every branch connected. Every decision informed.
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Manage your entire business from one place. Compare stores, understand local performance and move stock where it is needed.
          </p>
        </Reveal>

        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Map visualization */}
          <Reveal>
            <div className="relative rounded-2xl bg-slate-800/50 border border-slate-700/50 p-8 h-80 overflow-hidden">
              {/* Connection lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                <motion.line x1="35%" y1="40%" x2="50%" y2="55%" stroke="rgba(16,185,129,0.3)" strokeWidth="2" strokeDasharray="4 4"
                  initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1 }} />
                <motion.line x1="50%" y1="55%" x2="75%" y2="30%" stroke="rgba(16,185,129,0.3)" strokeWidth="2" strokeDasharray="4 4"
                  initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.3 }} />
                <motion.line x1="35%" y1="40%" x2="75%" y2="30%" stroke="rgba(59,130,246,0.2)" strokeWidth="1" strokeDasharray="4 4"
                  initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.6 }} />
              </svg>

              {/* Branch markers */}
              {BRANCHES.map((b, i) => (
                <motion.div
                  key={b.name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2 }}
                  className="absolute"
                  style={{ left: `${b.x}%`, top: `${b.y}%`, transform: 'translate(-50%, -50%)' }}
                >
                  <div className="relative">
                    <div className="absolute inset-0 w-10 h-10 rounded-full bg-emerald-500/20 animate-ping" />
                    <div className="relative w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
                      <Store className="w-4 h-4 text-white" />
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap">
                      <p className="text-xs font-medium text-slate-300">{b.name}</p>
                      <p className="text-[10px] text-emerald-400 font-mono">{b.sales}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </Reveal>

          {/* Comparison table */}
          <Reveal delay={0.2}>
            <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-700/50 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold">Branch Comparison — Last 30 Days</span>
              </div>
              <div className="grid grid-cols-4 gap-3 px-5 py-2 border-b border-slate-700/30 text-xs font-medium text-slate-400 uppercase">
                <span>Metric</span><span className="text-right">Nairobi CBD</span><span className="text-right">Westlands</span><span className="text-right">Thika</span>
              </div>
              {[
                { label: 'Sales', vals: ['48,650', '36,200', '29,400'] },
                { label: 'Transactions', vals: ['86', '64', '51'] },
                { label: 'Stock alerts', vals: ['3', '1', '2'] },
              ].map((row) => (
                <div key={row.label} className="grid grid-cols-4 gap-3 px-5 py-3 border-b border-slate-800 last:border-0 text-sm">
                  <span className="text-slate-400">{row.label}</span>
                  {row.vals.map((v, i) => (
                    <span key={i} className="text-right font-mono text-slate-200">{v.startsWith('KES') || row.label === 'Sales' ? `KES ${v}` : v}</span>
                  ))}
                </div>
              ))}
              <div className="px-5 py-3 flex items-center gap-2 text-xs text-slate-500">
                <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400" />
                Stock transfers between branches are recorded as movements, not sales.
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
