import { Menu, Bell, ChevronDown, Search, Wifi, WifiOff, RefreshCw, Package, Users, ArrowRight, Receipt } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useSyncStore } from '../stores/syncStore';
import { cn } from '../lib/utils';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

interface TopBarProps {
  onMenuClick: () => void;
}

function SyncIndicator() {
  const { status, lastSyncedAt, pendingCount, isOnline } = useSyncStore();

  const statusConfig = {
    synced: {
      dot: 'bg-emerald-500',
      text: 'Synced',
      label: lastSyncedAt ? `Last synced ${new Date(lastSyncedAt).toLocaleTimeString()}` : 'All up to date',
      icon: <Wifi className="w-3.5 h-3.5 text-emerald-500" />,
    },
    syncing: {
      dot: 'bg-blue-500 animate-pulse',
      text: `Syncing${pendingCount > 0 ? ` (${pendingCount})` : ''}`,
      label: 'Synchronizing with server...',
      icon: <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />,
    },
    offline: {
      dot: 'bg-orange-500',
      text: 'Offline',
      label: 'Working offline. Changes will sync when connected.',
      icon: <WifiOff className="w-3.5 h-3.5 text-orange-500" />,
    },
    error: {
      dot: 'bg-rose-500',
      text: 'Sync issues',
      label: 'Some items failed to sync. Check notifications.',
      icon: <WifiOff className="w-3.5 h-3.5 text-rose-500" />,
    },
  };

  const config = statusConfig[status] ?? statusConfig.offline;

  return (
    <div
      className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-default"
      title={config.label}
      aria-label={config.label}
    >
      {config.icon}
      <span className={cn('hidden sm:block', !isOnline && 'text-orange-500 font-medium')}>
        {config.text}
      </span>
    </div>
  );
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const organization = useAuthStore((s) => s.organization);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const searchTerm = searchText.trim();
  const { data: searchResults, isFetching: searching } = useQuery({
    queryKey: ['global-search', searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams({ q: searchTerm, limit: '5' });
      const [products, customers, sales] = await Promise.all([
        api.get<{ data: Array<{ id: string; name: string; sku: string }> }>(`/products?${params}`),
        api.get<{ data: Array<{ id: string; name: string; phone?: string }> }>(`/customers?${params}`),
        api.get<{ data: Array<{ id: string; receiptNumber: string; total: number }> }>(`/sales?${params}`),
      ]);
      return { products: products.data, customers: customers.data, sales: sales.data };
    },
    enabled: searchOpen && searchTerm.length >= 2,
  });

  const goTo = (path: string) => { setSearchOpen(false); setSearchText(''); navigate(`${path}?q=${encodeURIComponent(searchTerm)}`); };

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const initials = user
    ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()
    : '?';

  return (
    <header className="h-14 flex items-center gap-3 px-4 border-b border-border bg-card flex-shrink-0">
      {/* Mobile menu toggle */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Toggle navigation"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-md">
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 w-full px-3 py-1.5 rounded-md border border-border bg-muted/50 text-sm text-muted-foreground hover:text-foreground hover:border-ring transition-colors"
          aria-label="Search"
        >
          <Search className="w-4 h-4" />
          <span className="hidden sm:block">Search products, sales, customers...</span>
          <kbd className="hidden md:block ml-auto text-xs bg-background border border-border rounded px-1.5 py-0.5">
            ⌘K
          </kbd>
        </button>
        {/* TODO: Global search command palette */}
        {searchOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/20 flex items-start justify-center pt-20"
            onClick={() => setSearchOpen(false)}
          >
            <div
              className="bg-card rounded-xl border border-border shadow-lg w-full max-w-xl p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                autoFocus
                className="w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                placeholder="Search products or customers..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setSearchOpen(false)}
              />
              {searchTerm.length < 2 ? <p className="text-xs text-muted-foreground mt-3">Type at least 2 characters to search.</p> : searching ? <p className="text-sm text-muted-foreground py-4">Searching…</p> : (
                <div className="mt-3 max-h-80 overflow-y-auto divide-y divide-border">
                  {searchResults?.products.map((item) => <button key={`p-${item.id}`} onClick={() => goTo('/products')} className="w-full flex items-center gap-3 py-2 text-left hover:bg-muted px-2 rounded"><Package className="w-4 h-4 text-primary"/><span className="flex-1 text-sm">{item.name}<span className="block text-xs text-muted-foreground">SKU {item.sku}</span></span><ArrowRight className="w-4 h-4"/></button>)}
                  {searchResults?.customers.map((item) => <button key={`c-${item.id}`} onClick={() => goTo('/customers')} className="w-full flex items-center gap-3 py-2 text-left hover:bg-muted px-2 rounded"><Users className="w-4 h-4 text-primary"/><span className="flex-1 text-sm">{item.name}<span className="block text-xs text-muted-foreground">{item.phone ?? 'Customer'}</span></span><ArrowRight className="w-4 h-4"/></button>)}
                  {searchResults?.sales.map((item) => <button key={`s-${item.id}`} onClick={() => goTo('/sales')} className="w-full flex items-center gap-3 py-2 text-left hover:bg-muted px-2 rounded"><Receipt className="w-4 h-4 text-primary"/><span className="flex-1 text-sm">Sale {item.receiptNumber}<span className="block text-xs text-muted-foreground">Open sales to view receipt details</span></span><ArrowRight className="w-4 h-4"/></button>)}
                  {!searchResults?.products.length && !searchResults?.customers.length && !searchResults?.sales.length && <p className="text-sm text-muted-foreground py-4 text-center">No matching products, customers or receipts.</p>}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Sync status */}
        <SyncIndicator />

        {/* Notifications */}
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          {/* Badge — placeholder */}
          {false && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
          )}
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen((o) => !o)}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-md hover:bg-muted transition-colors"
            aria-expanded={userMenuOpen}
            aria-label="User menu"
          >
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-semibold">{initials}</span>
            </div>
            <div className="hidden md:block text-left min-w-0">
              <p className="text-sm font-medium leading-tight truncate max-w-[120px]">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                {organization?.name}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>

          {userMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setUserMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-56 bg-card border border-border rounded-lg shadow-lg z-20 py-1">
                <div className="px-3 py-2 border-b border-border mb-1">
                  <p className="text-sm font-medium">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <button
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                  onClick={() => { setUserMenuOpen(false); navigate('/settings'); }}
                >
                  Settings
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-muted transition-colors"
                  onClick={handleLogout}
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
