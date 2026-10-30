import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Receipt, Calendar, Filter } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { api } from '../../lib/api';
import { formatMoney, formatDateTime, cn } from '../../lib/utils';
import type { Sale } from '@tally/shared-types';

interface SalesResponse {
  data: Sale[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

const statusColors: Record<string, string> = {
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  held: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  voided: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
  refunded: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  partially_refunded: 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400',
  pending_payment: 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400',
};

export function SalesPage() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => { setSearch(searchParams.get('q') ?? ''); setPage(1); }, [searchParams]);

  const { data, isLoading, error } = useQuery<SalesResponse>({
    queryKey: ['sales', search, page, dateFrom, dateTo],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (search) params.set('q', search);
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      return api.get<SalesResponse>(`/sales?${params}`);
    },
  });

  const sales = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div>
      <PageHeader
        title="Sales"
        description={pagination ? `${pagination.total} transactions` : undefined}
        actions={
          <button className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors">
            <Filter className="w-4 h-4" />
            Export
          </button>
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
            placeholder="Search receipt number, customer..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <span className="text-muted-foreground text-sm">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-sm text-destructive">
          Could not load sales.
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 animate-pulse">
                <div className="h-4 bg-muted rounded w-28" />
                <div className="h-4 bg-muted rounded w-20 ml-auto" />
                <div className="h-6 bg-muted rounded-full w-20" />
                <div className="h-4 bg-muted rounded w-24" />
              </div>
            ))}
          </div>
        ) : sales.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No sales yet"
            description="Completed sales will appear here. Head to the POS to start selling."
          />
        ) : (
          <>
            <div className="grid grid-cols-[1.5fr_2fr_1fr_auto_1fr] gap-4 px-4 py-2.5 border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <span>Receipt</span>
              <span>Date & Time</span>
              <span className="text-right">Total</span>
              <span>Status</span>
              <span>Cashier</span>
            </div>
            <div className="divide-y divide-border">
              {sales.map((sale) => (
                <div
                  key={sale.id}
                  className="grid grid-cols-[1.5fr_2fr_1fr_auto_1fr] gap-4 px-4 py-3 items-center hover:bg-muted/20 transition-colors cursor-pointer"
                >
                  <span className="text-sm font-mono font-medium">{sale.receiptNumber}</span>
                  <span className="text-sm text-muted-foreground">
                    {sale.completedAt ? formatDateTime(sale.completedAt) : '—'}
                  </span>
                  <span className="text-sm font-semibold font-money text-right">
                    {formatMoney(sale.total)}
                  </span>
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-medium capitalize whitespace-nowrap',
                      statusColors[sale.status] ?? 'bg-muted text-muted-foreground',
                    )}
                  >
                    {sale.status.replace(/_/g, ' ')}
                  </span>
                  <span className="text-sm text-muted-foreground truncate">
                    {sale.cashierId}
                  </span>
                </div>
              ))}
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
                <p className="text-xs text-muted-foreground">
                  {pagination.total} transactions · Page {pagination.page} of {pagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page <= 1}
                    className="px-3 py-1 text-xs rounded-md border border-border disabled:opacity-40 hover:bg-muted transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= pagination.totalPages}
                    className="px-3 py-1 text-xs rounded-md border border-border disabled:opacity-40 hover:bg-muted transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
