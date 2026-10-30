import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Play, TrendingUp, Package, AlertTriangle, Store, Brain } from 'lucide-react';

export function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="relative pt-28 lg:pt-36 pb-20 overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-100/40 rounded-full blur-3xl" />
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-blue-100/40 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Headline */}
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/60 mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-medium text-emerald-700">Built for Kenyan businesses</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-[1.08]"
          >
            Your business.
            <br />
            <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
              Every branch.
            </span>{' '}
            One clear picture.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 text-lg sm:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto"
          >
            From the first sale to your growing network of stores, Tally.io brings your
            sales, inventory, finances and business intelligence together in one powerful platform.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <button
              onClick={() => navigate('/register')}
              className="group flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-900 text-white font-semibold text-sm shadow-lg hover:shadow-xl hover:bg-slate-800 transition-all w-full sm:w-auto"
            >
              Get started
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={() => navigate('/app')}
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all w-full sm:w-auto"
            >
              <Play className="w-4 h-4 text-emerald-600" />
              Explore Tally.io
            </button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-4 text-sm text-slate-400"
          >
            No credit card required · 14-day free trial
          </motion.p>
        </div>

        {/* Hero product showcase */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-12 lg:mt-16 mx-auto max-w-5xl"
        >
          {/* Main dashboard preview */}
          <div className="relative rounded-2xl border border-slate-200/80 bg-white shadow-2xl overflow-hidden">
            {/* Browser bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                <div className="w-3 h-3 rounded-full bg-green-400/60" />
              </div>
              <div className="flex-1 mx-4 px-3 py-1 rounded-md bg-white border border-slate-200 text-xs text-slate-400 font-mono">
                app.tally.io
              </div>
            </div>

            {/* Dashboard content */}
            <div className="flex">
              {/* Mini sidebar */}
              <div className="w-44 border-r border-slate-100 p-3 hidden sm:block bg-slate-50/50">
                <div className="space-y-1">
                  {['Overview', 'Point of Sale', 'Sales', 'Inventory', 'Reports'].map((item, i) => (
                    <div key={item} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium ${i === 0 ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Main content */}
              <div className="flex-1 p-4 sm:p-6 bg-white">
                {/* Stat cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                  <StatCard label="Today's Sales" value="KES 48,650" change="+12% vs yesterday" icon={TrendingUp} positive />
                  <StatCard label="Transactions" value="86" icon={Package} />
                  <StatCard label="Gross Profit" value="KES 12,400" icon={TrendingUp} positive />
                  <StatCard label="Stock Alerts" value="5" icon={AlertTriangle} negative />
                </div>

                {/* Chart placeholder */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 mb-3">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-slate-700">Sales — Last 7 Days</p>
                    <span className="text-xs text-slate-400">Demo data</span>
                  </div>
                  <div className="flex items-end gap-2 h-28">
                    {[40, 55, 45, 70, 60, 85, 90].map((h, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ duration: 0.6, delay: 0.8 + i * 0.08 }}
                        className="flex-1 rounded-t-md bg-gradient-to-t from-emerald-400 to-emerald-500"
                      />
                    ))}
                  </div>
                </div>

                {/* Branch comparison mini */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { name: 'Nairobi CBD', sales: 'KES 48,650' },
                    { name: 'Westlands', sales: 'KES 36,200' },
                    { name: 'Thika', sales: 'KES 29,400' },
                  ].map((b) => (
                    <div key={b.name} className="rounded-lg border border-slate-100 p-2.5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Store className="w-3 h-3 text-slate-400" />
                        <p className="text-[10px] font-medium text-slate-500 truncate">{b.name}</p>
                      </div>
                      <p className="text-sm font-semibold text-slate-800 font-mono">{b.sales}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Floating cards */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="absolute -left-4 lg:-left-12 top-1/3 hidden md:block"
          >
            <div className="bg-white rounded-xl shadow-xl border border-slate-100 p-3.5 w-52">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Brain className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <p className="text-xs font-semibold text-slate-700">AI Recommendation</p>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Cooking oil is selling faster than its recent average. Stock is approximately 3 days of demand.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 1.1 }}
            className="absolute -right-4 lg:-right-12 bottom-1/4 hidden md:block"
          >
            <div className="bg-white rounded-xl shadow-xl border border-slate-100 p-3.5 w-48">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <p className="text-xs font-semibold text-slate-700">Expiry Alert</p>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                3 batches of paracetamol expire in 14 days. Review stock before they become unsellable.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function StatCard({ label, value, change, icon: Icon, positive, negative }: {
  label: string; value: string; change?: string; icon: typeof TrendingUp; positive?: boolean; negative?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-100 p-3 bg-white">
      <div className="flex items-start justify-between mb-1.5">
        <span className="text-[10px] text-slate-500 font-medium">{label}</span>
        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${positive ? 'bg-emerald-50' : negative ? 'bg-amber-50' : 'bg-slate-50'}`}>
          <Icon className={`w-3 h-3 ${positive ? 'text-emerald-600' : negative ? 'text-amber-600' : 'text-slate-400'}`} />
        </div>
      </div>
      <p className="text-base font-bold text-slate-900 font-mono">{value}</p>
      {change && <p className={`text-[10px] mt-0.5 ${positive ? 'text-emerald-600' : 'text-slate-400'}`}>{change}</p>}
    </div>
  );
}
