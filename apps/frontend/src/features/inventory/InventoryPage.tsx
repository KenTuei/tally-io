import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Warehouse, AlertTriangle, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';
import type { StockProjection } from '@tally/shared-types';

interface InventoryItem extends StockProjection {
  productName: string;
  sku: string;
  lowStockThreshold: number;
  categoryName?: string;
}

interface InventoryResponse {
  data: InventoryItem[];
  pagination: { total: number; page: number; totalPages: number };
}

export function InventoryPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch } = useQuery<InventoryResponse>({
    queryKey: ['inventory', search, filter, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (search) params.set('q', search);
      if (filter === 'low') params.set('lowStock', 'true');
      if (filter === 'out') params.set('outOfStock', 'true');
      return api.get<InventoryResponse>(`/inventory/stock?${params}`);
    },
  });

  const items = data?.data ?? [];

  const stockStatus = (item: InventoryItem) => {
    if (item.quantityOnHand <= 0) return 'out';
    if (item.quantityOnHand <= item.lowStockThreshold) return 'low';
    return 'ok';
  };

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Stock levels across all products"
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => void refetch()}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            </button>
            <button className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              <ArrowUp className="w-4 h-4" />
              Receive stock
            </button>
            <button className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors">
              <RefreshCw className="w-4 h-4" />
              Adjust stock
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search products..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          {(['all', 'low', 'out'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1 text-sm rounded-md transition-colors capitalize',
                filter === f ? 'bg-card shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {f === 'all' ? 'All' : f === 'low' ? 'Low Stock' : 'Out of Stock'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-sm text-destructive">
          Could not load inventory data.
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 animate-pulse">
                <div className="h-3.5 bg-muted rounded w-48" />
                <div className="h-3 bg-muted rounded w-16 ml-auto" />
                <div className="h-6 bg-muted rounded w-24" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Warehouse}
            title="No inventory data"
            description="Add products with inventory tracking enabled to see stock levels here."
          />
        ) : (
          <>
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-4 py-2.5 border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <span>Product</span>
              <span className="text-right">On Hand</span>
              <span className="text-right">Threshold</span>
              <span>Status</span>
              <span className="w-20">Actions</span>
            </div>
            <div className="divide-y divide-border">
              {items.map((item) => {
                const status = stockStatus(item);
                return (
                  <div
                    key={`${item.productId}-${item.branchId}`}
                    className={cn(
                      'grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3 items-center',
                      status === 'out' && 'bg-rose-50/50 dark:bg-rose-950/10',
                      status === 'low' && 'bg-amber-50/50 dark:bg-amber-950/10',
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.productName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                    </div>
                    <span
                      className={cn(
                        'text-sm font-semibold font-money text-right tabular-nums',
                        status === 'out' && 'text-rose-600',
                        status === 'low' && 'text-amber-600',
                        status === 'ok' && 'text-foreground',
                      )}
                    >
                      {item.quantityOnHand}
                    </span>
                    <span className="text-sm text-muted-foreground text-right tabular-nums">
                      {item.lowStockThreshold}
                    </span>
                    <div>
                      {status === 'out' && (
                        <span className="flex items-center gap-1 text-xs text-rose-600 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Out of stock
                        </span>
                      )}
                      {status === 'low' && (
                        <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Low stock
                        </span>
                      )}
                      {status === 'ok' && (
                        <span className="text-xs text-emerald-600 font-medium">In stock</span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        title="Add stock"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        title="Remove stock"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
