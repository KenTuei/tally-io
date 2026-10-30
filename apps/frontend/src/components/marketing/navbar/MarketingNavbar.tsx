import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ShoppingCart, BarChart3, Warehouse, Users, Building2, DollarSign,
  Brain, Package, ArrowRightLeft, TrendingUp, Receipt, Bell,
  Store, ShoppingBag, Pill, Wrench, Scissors, Utensils, Smartphone,
  Sparkles, ChevronDown, X, Menu, BookOpen, LifeBuoy, HelpCircle, Mail,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

const PRODUCT_MENU = {
  'Run your business': [
    { label: 'Point of Sale', desc: 'Fast checkout, payments, receipts', icon: ShoppingCart, to: '/app/pos' },
    { label: 'Sales Management', desc: 'Track every transaction', icon: Receipt, to: '/app/sales' },
    { label: 'Inventory Management', desc: 'Stock levels, adjustments, transfers', icon: Warehouse, to: '/app/inventory' },
    { label: 'Product Catalogue', desc: 'Products, variants, pricing', icon: Package, to: '/app/products' },
    { label: 'Customer Management', desc: 'Profiles, history, loyalty', icon: Users, to: '/app/customers' },
    { label: 'Expenses', desc: 'Track costs, approve spending', icon: DollarSign, to: '/app/expenses' },
  ],
  'Understand your business': [
    { label: 'Business Analytics', desc: 'Sales, profit, trends', icon: BarChart3, to: '/app/reports' },
    { label: 'AI Business Assistant', desc: 'Ask questions, get insights', icon: Brain, to: '/app/ai' },
  ],
  'Manage multiple locations': [
    { label: 'Multi-Branch Management', desc: 'All stores in one place', icon: Building2, to: '/app/branches' },
    { label: 'Stock Transfers', desc: 'Move stock between branches', icon: ArrowRightLeft, to: '/app/branches' },
  ],
};

const SOLUTIONS = [
  { label: 'Retail Shops', icon: Store, desc: 'Daily sales and stock tracking' },
  { label: 'Supermarkets', icon: ShoppingBag, desc: 'Large catalogues and volume' },
  { label: 'Wholesale', icon: Package, desc: 'Bulk pricing and purchasing' },
  { label: 'Pharmacies', icon: Pill, desc: 'Batch and expiry tracking' },
  { label: 'Hardware Stores', icon: Wrench, desc: 'Product variants and stock' },
  { label: 'Cosmetics & Beauty', icon: Sparkles, desc: 'Products and customer sales' },
  { label: 'Electronics Shops', icon: Smartphone, desc: 'SKU management and pricing' },
  { label: 'Restaurants & Cafés', icon: Utensils, desc: 'Sales, ingredients, costs' },
  { label: 'Salons & Kinyozi', icon: Scissors, desc: 'Services, staff, commissions' },
  { label: 'Multi-Branch', icon: Building2, desc: 'Centralized management' },
];

const FEATURES = [
  'Smart POS', 'Inventory Tracking', 'AI Stock Recommendations', 'Expiry Management',
  'Multi-Branch Intelligence', 'Financial Reporting', 'Customer Management', 'Offline-First Operations',
];

const RESOURCES = [
  { label: 'Help Centre', icon: LifeBuoy },
  { label: 'Getting Started', icon: BookOpen },
  { label: 'Business Guides', icon: BookOpen },
  { label: 'FAQs', icon: HelpCircle },
  { label: 'Contact Support', icon: Mail },
];

export function MarketingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
  }, [mobileOpen]);

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          scrolled
            ? 'bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm'
            : 'bg-transparent border-b border-transparent',
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-18">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg">T</span>
              </div>
              <span className={cn(
                'text-lg font-bold tracking-tight transition-colors',
                scrolled ? 'text-slate-900' : 'text-slate-900',
              )}>Tally.io</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1" ref={menuRef}>
              {['Product', 'Solutions', 'Features', 'Resources', 'Pricing'].map((item) => (
                <button
                  key={item}
                  onClick={() => setOpenMenu(openMenu === item ? null : item)}
                  onMouseEnter={() => setOpenMenu(item)}
                  className={cn(
                    'flex items-center gap-1 px-3.5 py-2 text-sm font-medium rounded-lg transition-colors',
                    scrolled
                      ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/80'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/60',
                  )}
                >
                  {item}
                  {item !== 'Pricing' && <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', openMenu === item && 'rotate-180')} />}
                </button>
              ))}

              {/* Mega menu panels */}
              <AnimatePresence>
                {openMenu && openMenu !== 'Pricing' && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.15 }}
                    className={cn(
                      'absolute top-full left-0 right-0 mt-2',
                      openMenu === 'Product' && 'max-w-5xl mx-auto left-1/2 -translate-x-1/2',
                    )}
                  >
                    {openMenu === 'Product' && <ProductMegaMenu />}
                    {openMenu === 'Solutions' && <SolutionsMenu />}
                    {openMenu === 'Features' && <FeaturesMenu />}
                    {openMenu === 'Resources' && <ResourcesMenu />}
                  </motion.div>
                )}
              </AnimatePresence>
            </nav>

            {/* Right actions */}
            <div className="hidden lg:flex items-center gap-3">
              <Link to="/login" className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors px-3 py-2">
                Sign in
              </Link>
              <button
                onClick={() => navigate('/register')}
                className="text-sm font-semibold text-white bg-slate-900 px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-all shadow-sm hover:shadow-md"
              >
                Get started
              </button>
            </div>

            {/* Mobile toggle */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -mr-2 text-slate-700"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <MobileNav onClose={() => setMobileOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

function ProductMegaMenu() {
  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden">
      <div className="grid grid-cols-3 gap-0">
        {Object.entries(PRODUCT_MENU).map(([group, items]) => (
          <div key={group} className="p-5 border-r border-slate-100 last:border-r-0">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">{group}</p>
            <div className="space-y-1">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 group-hover:text-emerald-600 transition-colors">{item.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SolutionsMenu() {
  return (
    <div className="absolute left-1/2 -translate-x-1/2 w-[640px] bg-white rounded-2xl shadow-2xl border border-slate-200/80 p-6">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Built for your trade</p>
      <div className="grid grid-cols-2 gap-2">
        {SOLUTIONS.map((sol) => {
          const Icon = sol.icon;
          return (
            <Link key={sol.label} to="/" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 group-hover:text-blue-600">{sol.label}</p>
                <p className="text-xs text-slate-500">{sol.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function FeaturesMenu() {
  return (
    <div className="absolute left-1/2 -translate-x-1/2 w-[480px] bg-white rounded-2xl shadow-2xl border border-slate-200/80 p-6">
      <div className="grid grid-cols-2 gap-1.5">
        {FEATURES.map((feat) => (
          <Link key={feat} to="/" className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700 hover:text-emerald-600">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {feat}
          </Link>
        ))}
      </div>
    </div>
  );
}

function ResourcesMenu() {
  return (
    <div className="absolute left-1/2 -translate-x-1/2 w-[320px] bg-white rounded-2xl shadow-2xl border border-slate-200/80 p-4">
      <div className="space-y-1">
        {RESOURCES.map((res) => {
          const Icon = res.icon;
          return (
            <Link key={res.label} to="/" className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
              <Icon className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">{res.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function MobileNav({ onClose }: { onClose: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const navigate = useNavigate();

  const toggle = (item: string) => setExpanded(expanded === item ? null : item);

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed inset-0 z-[60] lg:hidden"
    >
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-100 flex-shrink-0">
          <Link to="/" onClick={onClose} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center">
              <span className="text-white font-bold">T</span>
            </div>
            <span className="text-base font-bold">Tally.io</span>
          </Link>
          <button onClick={onClose} className="p-2 -mr-2 text-slate-500 hover:text-slate-900" aria-label="Close menu">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto py-4">
          {/* Product */}
          <MobileItem label="Product" expanded={expanded === 'Product'} onToggle={() => toggle('Product')}>
            {Object.entries(PRODUCT_MENU).map(([group, items]) => (
              <div key={group} className="mb-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-1 mb-1.5">{group}</p>
                {items.map((item) => (
                  <Link key={item.label} to={item.to} onClick={onClose} className="flex items-center gap-2.5 py-2 px-1 text-sm text-slate-600 hover:text-emerald-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}
          </MobileItem>

          {/* Solutions */}
          <MobileItem label="Solutions" expanded={expanded === 'Solutions'} onToggle={() => toggle('Solutions')}>
            {SOLUTIONS.map((sol) => (
              <Link key={sol.label} to="/" onClick={onClose} className="flex items-center gap-2.5 py-2 px-1 text-sm text-slate-600 hover:text-blue-600">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                {sol.label}
              </Link>
            ))}
          </MobileItem>

          {/* Features */}
          <MobileItem label="Features" expanded={expanded === 'Features'} onToggle={() => toggle('Features')}>
            {FEATURES.map((feat) => (
              <Link key={feat} to="/" onClick={onClose} className="flex items-center gap-2.5 py-2 px-1 text-sm text-slate-600">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                {feat}
              </Link>
            ))}
          </MobileItem>

          {/* Resources */}
          <MobileItem label="Resources" expanded={expanded === 'Resources'} onToggle={() => toggle('Resources')}>
            {RESOURCES.map((res) => (
              <Link key={res.label} to="/" onClick={onClose} className="flex items-center gap-2.5 py-2 px-1 text-sm text-slate-600">
                <res.icon className="w-4 h-4 text-slate-400" />
                {res.label}
              </Link>
            ))}
          </MobileItem>

          <Link to="/" onClick={onClose} className="block py-3 px-1 text-sm font-medium text-slate-700 hover:text-emerald-600">
            Pricing
          </Link>
        </div>

        {/* Actions */}
        <div className="border-t border-slate-100 p-5 space-y-2.5 flex-shrink-0">
          <Link to="/login" onClick={onClose} className="block w-full text-center py-2.5 text-sm font-medium text-slate-700 border border-slate-200 rounded-xl">
            Sign in
          </Link>
          <button
            onClick={() => { onClose(); navigate('/register'); }}
            className="block w-full text-center py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-xl"
          >
            Get started
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function MobileItem({ label, expanded, onToggle, children }: { label: string; expanded: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="border-b border-slate-50">
      <button onClick={onToggle} className="flex items-center justify-between w-full py-3 px-1 text-sm font-medium text-slate-700">
        {label}
        <ChevronDown className={cn('w-4 h-4 transition-transform', expanded && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pb-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
