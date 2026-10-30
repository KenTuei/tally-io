import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart, Warehouse, BarChart3, Brain, DollarSign,
  Search, Plus, Minus, Package, AlertTriangle, TrendingUp,
} from 'lucide-react';
import { Reveal } from '../animations/Reveal';
import { cn } from '../../../lib/utils';

const TABS = [
  { id: 'pos', label: 'Point of Sale', icon: ShoppingCart },
  { id: 'inventory', label: 'Inventory', icon: Warehouse },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'ai', label: 'AI Intelligence', icon: Brain },
  { id: 'finance', label: 'Finance', icon: DollarSign },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function ProductShowcase() {
  const [active, setActive] = useState<TabId>('pos');

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl mx-auto text-center mb-12">
          <p className="text-sm font-semibold text-emerald-600 mb-3">The platform</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            One platform. Complete business visibility.
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Click through the modules to see how Tally.io brings your business together.
          </p>
        </Reveal>

        {/* Tab buttons */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActive(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                  active === tab.id
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <Reveal className="rounded-3xl border border-slate-200/80 overflow-hidden shadow-xl">
          <div className="bg-slate-50/50 p-6 sm:p-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {active === 'pos' && <POSPreview />}
                {active === 'inventory' && <InventoryPreview />}
                {active === 'analytics' && <AnalyticsPreview />}
                {active === 'ai' && <AIPreview />}
                {active === 'finance' && <FinancePreview />}
              </motion.div>
            </AnimatePresence>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function PreviewLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-slate-400 text-center mb-3">Illustrative demo data — {children}</p>;
}

function POSPreview() {
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Product grid */}
      <div>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm" placeholder="Search products or scan barcode..." readOnly />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {['Cooking Oil', 'Sugar', 'Rice', 'Milk', 'Bread', 'Tea'].map((p) => (
            <div key={p} className="p-3 rounded-xl border border-slate-200 bg-white text-center">
              <div className="aspect-square rounded-lg bg-slate-50 flex items-center justify-center mb-2 text-2xl">📦</div>
              <p className="text-xs font-medium text-slate-700">{p}</p>
              <p className="text-xs text-emerald-600 font-semibold mt-0.5">KES {Math.floor(Math.random() * 500) + 100}</p>
            </div>
          ))}
        </div>
      </div>
      {/* Cart */}
      <div className="rounded-2xl border border-slate-200 bg-white flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-semibold">Cart (3)</span>
        </div>
        <div className="flex-1 p-4 space-y-2">
          {[
            { name: 'Cooking Oil', qty: 2, price: 32000 },
            { name: 'Sugar', qty: 1, price: 15000 },
            { name: 'Rice', qty: 3, price: 45000 },
          ].map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button className="w-6 h-6 rounded-md border border-slate-200 flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                <span className="text-sm w-6 text-center">{item.qty}</span>
                <button className="w-6 h-6 rounded-md border border-slate-200 flex items-center justify-center"><Plus className="w-3 h-3" /></button>
              </div>
              <span className="text-sm font-medium">{item.name}</span>
              <span className="text-sm font-semibold font-mono">KES {(item.price * item.qty / 100).toFixed(0)}</span>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-slate-100">
          <div className="flex justify-between mb-2"><span className="text-sm text-slate-500">Total</span><span className="text-base font-bold font-mono">KES 1,240</span></div>
          <button className="w-full py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold">Pay KES 1,240</button>
        </div>
      </div>
      <PreviewLabel>POS checkout flow</PreviewLabel>
    </div>
  );
}

function InventoryPreview() {
  const items = [
    { name: 'Cooking Oil', sku: 'OIL-500', stock: 36, threshold: 10, status: 'ok' },
    { name: 'Sugar 1kg', sku: 'SUG-1K', stock: 5, threshold: 10, status: 'low' },
    { name: 'Paracetamol', sku: 'PAR-500', stock: 0, threshold: 5, status: 'out' },
    { name: 'Rice 2kg', sku: 'RIC-2K', stock: 48, threshold: 15, status: 'ok' },
    { name: 'Tea Bags', sku: 'TEA-100', stock: 8, threshold: 10, status: 'low' },
  ];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-4 py-2.5 border-b border-slate-100 bg-slate-50 text-xs font-medium text-slate-400 uppercase">
        <span>Product</span><span className="text-right">On Hand</span><span className="text-right">Threshold</span><span>Status</span>
      </div>
      {items.map((item) => (
        <div key={item.name} className={cn('grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-4 py-3 items-center border-b border-slate-50 last:border-0',
          item.status === 'out' && 'bg-rose-50/30', item.status === 'low' && 'bg-amber-50/30')}>
          <div><p className="text-sm font-medium">{item.name}</p><p className="text-xs text-slate-400 font-mono">{item.sku}</p></div>
          <span className={cn('text-sm font-semibold font-mono text-right', item.status === 'out' && 'text-rose-600', item.status === 'low' && 'text-amber-600')}>{item.stock}</span>
          <span className="text-sm text-slate-400 text-right">{item.threshold}</span>
          <span className={cn('text-xs font-medium', item.status === 'ok' && 'text-emerald-600', item.status === 'low' && 'text-amber-600', item.status === 'out' && 'text-rose-600')}>
            {item.status === 'ok' ? 'In stock' : item.status === 'low' ? 'Low stock' : 'Out of stock'}
          </span>
        </div>
      ))}
      <PreviewLabel>Stock levels with alerts</PreviewLabel>
    </div>
  );
}

function AnalyticsPreview() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] text-slate-500">This Week</p>
          <p className="text-lg font-bold font-mono">KES 314K</p>
          <p className="text-[10px] text-emerald-600">+18% vs last week</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] text-slate-500">Transactions</p>
          <p className="text-lg font-bold">562</p>
          <p className="text-[10px] text-slate-400">This week</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] text-slate-500">Avg. Order</p>
          <p className="text-lg font-bold font-mono">KES 559</p>
          <p className="text-[10px] text-slate-400">Per transaction</p>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold mb-3">Sales Trend — 30 Days</p>
        <div className="flex items-end gap-1 h-40">
          {[35, 42, 38, 50, 45, 60, 55, 70, 65, 75, 80, 72, 85, 90, 88, 95].map((h, i) => (
            <motion.div key={i} initial={{ height: 0 }} whileInView={{ height: `${h}%` }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.03 }} className="flex-1 rounded-t-sm bg-gradient-to-t from-blue-400 to-blue-500 min-h-[4px]" />
          ))}
        </div>
      </div>
      <PreviewLabel>Sales and profit analytics</PreviewLabel>
    </div>
  );
}

function AIPreview() {
  return (
    <div className="max-w-lg mx-auto">
      <div className="space-y-3">
        {/* User message */}
        <div className="flex gap-2 justify-end">
          <div className="bg-slate-900 text-white text-sm rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%]">
            Which products should I reorder this week?
          </div>
        </div>
        {/* AI response */}
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Brain className="w-4 h-4 text-blue-600" />
          </div>
          <div className="bg-white border border-slate-200 text-sm rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
            <p className="text-slate-700 leading-relaxed">Your <strong>Cooking Oil</strong> and <strong>Sugar</strong> stock are approaching their reorder thresholds at Nairobi CBD. Based on recorded sales velocity and your supplier lead time of 3 days, these should be reviewed first.</p>
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center gap-2 text-xs"><div className="w-2 h-2 rounded-full bg-amber-500" /><span className="text-slate-500">Cooking Oil — 3 days of demand left</span></div>
              <div className="flex items-center gap-2 text-xs"><div className="w-2 h-2 rounded-full bg-amber-500" /><span className="text-slate-500">Sugar — 5 days of demand left</span></div>
            </div>
          </div>
        </div>
      </div>
      <PreviewLabel>AI assistant powered by Google Gemini</PreviewLabel>
    </div>
  );
}

function FinancePreview() {
  const rows = [
    { label: 'Gross sales', value: 'KES 48,650', note: 'Before discounts' },
    { label: 'Discounts given', value: '-KES 2,150' },
    { label: 'Net sales', value: 'KES 46,500', bold: true },
    { label: 'Cost of goods sold', value: '-KES 34,100' },
    { label: 'Gross profit', value: 'KES 12,400', bold: true, positive: true },
    { label: 'Operating expenses', value: '-KES 4,200' },
    { label: 'Operating profit', value: 'KES 8,200', bold: true, positive: true },
  ];
  return (
    <div className="max-w-md mx-auto">
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <p className="text-sm font-semibold">Daily Financial Summary</p>
        </div>
        <div className="divide-y divide-slate-50">
          {rows.map((r) => (
            <div key={r.label} className="flex justify-between items-center px-4 py-2.5">
              <span className={cn('text-sm', r.bold && 'font-semibold')}>{r.label}</span>
              <div className="text-right">
                <span className={cn('text-sm font-mono', r.bold && 'font-semibold', r.positive && 'text-emerald-600')}>{r.value}</span>
                {r.note && <p className="text-[10px] text-slate-400">{r.note}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
      <PreviewLabel>Profit is not revenue</PreviewLabel>
    </div>
  );
}
