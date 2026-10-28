import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BarChart3,
  Warehouse,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Receipt,
  TrendingUp,
  Building2,
  Bell,
  Sparkles,
  CreditCard,
  Shield,
  Truck,
  DollarSign,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuthStore } from '../stores/authStore';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  group?: string;
}

const navItems: NavItem[] = [
  // Operations
  { label: 'Overview', path: '/', icon: LayoutDashboard, group: 'Operations' },
  { label: 'Point of Sale', path: '/pos', icon: ShoppingCart, group: 'Operations' },
  { label: 'Sales', path: '/sales', icon: Receipt, group: 'Operations' },
  { label: 'Cash Registers', path: '/registers', icon: CreditCard, group: 'Operations' },

  // Management
  { label: 'Products', path: '/products', icon: Package, group: 'Management' },
  { label: 'Inventory', path: '/inventory', icon: Warehouse, group: 'Management' },
  { label: 'Purchasing', path: '/purchasing', icon: Truck, group: 'Management' },
  { label: 'Customers', path: '/customers', icon: Users, group: 'Management' },
  { label: 'Suppliers', path: '/suppliers', icon: Building2, group: 'Management' },
  { label: 'Expenses', path: '/expenses', icon: DollarSign, group: 'Management' },

  // Analytics
  { label: 'Reports', path: '/reports', icon: BarChart3, group: 'Analytics' },
  { label: 'AI Assistant', path: '/ai', icon: Sparkles, group: 'Analytics' },

  // Admin
  { label: 'Staff', path: '/staff', icon: Shield, group: 'Admin' },
  { label: 'Notifications', path: '/notifications', icon: Bell, group: 'Admin' },
  { label: 'Branches', path: '/branches', icon: TrendingUp, group: 'Admin' },
  { label: 'Settings', path: '/settings', icon: Settings, group: 'Admin' },
];

const groups = ['Operations', 'Management', 'Analytics', 'Admin'];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const organization = useAuthStore((s) => s.organization);

  return (
    <aside
      className={cn(
        'flex flex-col bg-card border-r border-border transition-all duration-200 flex-shrink-0',
        collapsed ? 'w-14' : 'w-60',
      )}
    >
      {/* Logo + toggle */}
      <div className={cn(
        'flex items-center h-16 border-b border-border px-3 flex-shrink-0',
        collapsed ? 'justify-center' : 'justify-between',
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-primary-foreground font-bold text-sm">T</span>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-tight truncate">Tally.io</p>
              <p className="text-xs text-muted-foreground truncate leading-tight">
                {organization?.name ?? 'Loading...'}
              </p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">T</span>
          </div>
        )}
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
            collapsed && 'hidden',
          )}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-1 px-2" aria-label="Main navigation">
        {groups.map((group) => {
          const items = navItems.filter((i) => i.group === group);
          return (
            <div key={group}>
              {!collapsed && (
                <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mt-3 first:mt-0">
                  {group}
                </p>
              )}
              {collapsed && <div className="h-px bg-border my-2 mx-1" />}
              {items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.path === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(item.path);

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors group',
                      isActive
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                      collapsed && 'justify-center',
                    )}
                  >
                    <Icon
                      className={cn(
                        'flex-shrink-0 transition-colors',
                        collapsed ? 'w-5 h-5' : 'w-4 h-4',
                        isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                      )}
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Collapse toggle at bottom */}
      {collapsed && (
        <button
          onClick={onToggle}
          aria-label="Expand sidebar"
          className="p-3 flex justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border-t border-border"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </aside>
  );
}
