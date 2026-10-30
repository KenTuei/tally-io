import { motion } from 'framer-motion';
import { Reveal } from '../animations/Reveal';
import { Wifi, WifiOff, CheckCircle, RefreshCw } from 'lucide-react';

export function OfflineSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text */}
          <Reveal>
            <p className="text-sm font-semibold text-emerald-600 mb-3">Offline-first</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
              Your business doesn't stop when the internet does.
            </h2>
            <p className="mt-4 text-lg text-slate-600 leading-relaxed">
              Tally.io works locally, even with no connection. Sales are saved on your device
              and sync automatically the moment you're back online.
            </p>

            <div className="mt-8 space-y-4">
              {[
                { icon: WifiOff, title: 'Connection lost — POS keeps working', desc: 'Sales, payments and receipts all work the same way.' },
                { icon: CheckCircle, title: 'Every sale is saved locally', desc: 'Nothing gets lost while you are offline.' },
                { icon: RefreshCw, title: 'Syncs automatically on reconnect', desc: 'No manual steps. Your data updates in the background.' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="text-sm text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Reveal>

          {/* Visual demo */}
          <Reveal delay={0.2}>
            <div className="relative">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 overflow-hidden">
                {/* Status indicator */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{ backgroundColor: ['#fbbf24', '#fbbf24', '#10b981', '#10b981'] }}
                      transition={{ duration: 4, repeat: Infinity, times: [0, 0.25, 0.5, 1] }}
                      className="w-3 h-3 rounded-full"
                    />
                    <span className="text-sm font-medium text-slate-600">
                      <motion.span
                        animate={{ opacity: [1, 1, 0, 0, 1] }}
                        transition={{ duration: 4, repeat: Infinity, times: [0, 0.25, 0.26, 0.49, 0.5] }}
                      >Offline — 3 pending</motion.span>
                      <motion.span
                        className="absolute"
                        animate={{ opacity: [0, 0, 1, 1, 0] }}
                        transition={{ duration: 4, repeat: Infinity, times: [0, 0.5, 0.51, 0.99, 1] }}
                      >Online — synced</motion.span>
                    </span>
                  </div>
                  <WifiOff className="w-4 h-4 text-amber-500" />
                </div>

                {/* Pending items */}
                <div className="space-y-2">
                  {[1, 2, 3].map((n) => (
                    <motion.div
                      key={n}
                      initial={{ opacity: 0.6 }}
                      animate={{ opacity: [0.6, 0.6, 1, 1] }}
                      transition={{ duration: 4, repeat: Infinity, times: [0, 0.5, 0.51, 1] }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Sale TLY-{`2026102${n}`}</p>
                        <p className="text-xs text-slate-400">Saved locally</p>
                      </div>
                      <motion.span
                        className="text-xs text-amber-500 font-medium"
                        animate={{ opacity: [1, 1, 0, 0] }}
                        transition={{ duration: 4, repeat: Infinity, times: [0, 0.49, 0.5, 1] }}
                      >Pending sync</motion.span>
                      <motion.span
                        className="text-xs text-emerald-600 font-medium"
                        animate={{ opacity: [0, 0, 1, 1] }}
                        transition={{ duration: 4, repeat: Infinity, times: [0, 0.5, 0.51, 1] }}
                      >Synced</motion.span>
                    </motion.div>
                  ))}
                </div>

                {/* Sync bar */}
                <motion.div
                  className="mt-4 h-1.5 rounded-full bg-slate-200 overflow-hidden"
                >
                  <motion.div
                    className="h-full bg-emerald-500 rounded-full"
                    animate={{ width: ['0%', '0%', '100%'] }}
                    transition={{ duration: 4, repeat: Infinity, times: [0, 0.5, 1] }}
                  />
                </motion.div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
