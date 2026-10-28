import { useQuery } from '@tanstack/react-query';
import {
  ShoppingCart,
  TrendingUp,
  Package,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { StatCard } from '../../components/StatCard';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../lib/api';
import { formatMoney, formatDate } from '../../lib/utils';

// Types for dashboard data
interface DashboardSummary {
  todaySales: number;
  todayTransactions: number;
  todaySalesChange: number;
  weekSales: number;
  weekTransactions: number;
  monthSales: number;
  lowStockCount: number;
  pendingSyncCount: number;
  recentSales: Array<{
    id: string;
    receiptNumber: string;
    total: number;
    completedAt: string;
    cashierName: string;
    itemCount: number;
  }>;
  salesTrend: Array<{ date: string; sales: number; transactions: number }>;
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
}

export function OverviewPage() {
  const organization = useAuthStore((s) => s.organization);
  const currency = organization?.currency ?? 'KES';

  const { data, isLoading, error, refetch } = useQuery<DashboardSummary>({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardSummary>('/reports/dashboard'),
    refetchInterval: 60_000, // Refresh every minute
    retry: 1,
  });

  const today = formatDate(new Date(), { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div>
      <PageHeader
        title="Overview"
        description={today}
        actions={
          <button
            onClick={() => void refetch()}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      {error && (
        <div className="mb-6 p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-sm text-destructive">
          Could not load dashboard data. The backend may not be connected yet.
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Today's Sales"
          value={formatMoney(data?.todaySales ?? 0, currency)}
          change={
            data?.todaySalesChange !== undefined
              ? `${data.todaySalesChange >= 0 ? '+' : ''}${data.todaySalesChange.toFixed(1)}% vs yesterday`
              : undefined
          }
          changeType={
            data?.todaySalesChange === undefined
              ? 'neutral'
              : data.todaySalesChange >= 0
              ? 'positive'
              : 'negative'
          }
          icon={DollarSign}
          loading={isLoading}
        />
        <StatCard
          title="Transactions Today"
          value={String(data?.todayTransactions ?? 0)}
          description="Completed sales"
          icon={ShoppingCart}
          loading={isLoading}
        />
        <StatCard
          title="This Week"
          value={formatMoney(data?.weekSales ?? 0, currency)}
          description={`${data?.weekTransactions ?? 0} transactions`}
          icon={TrendingUp}
          loading={isLoading}
        />
        <StatCard
          title="Low Stock Alerts"
          value={String(data?.lowStockCount ?? 0)}
          description={data?.lowStockCount ? 'Products need restocking' : 'All stock levels OK'}
          changeType={data?.lowStockCount ? 'negative' : 'positive'}
          icon={Package}
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Sales trend chart */}
        <div className="xl:col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Sales — Last 7 Days</h2>
          </div>
          {isLoading ? (
            <div className="h-52 bg-muted/50 rounded-lg animate-pulse" />
          ) : data?.salesTrend && data.salesTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.salesTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(231,48%,48%)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(231,48%,48%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) => `${(v / 100).toLocaleString()}`}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value: number) => [formatMoney(value, currency), 'Sales']}
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="hsl(231,48%,48%)"
                  strokeWidth={2}
                  fill="url(#colorSales)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">
              No sales data yet. Complete your first sale to see trends.
            </div>
          )}
        </div>

        {/* Top products */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Top Products Today</h2>
            <Link
              to="/reports"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 bg-muted/50 rounded animate-pulse" />
              ))}
            </div>
          ) : data?.topProducts && data.topProducts.length > 0 ? (
            <div className="space-y-3">
              {data.topProducts.slice(0, 6).map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-muted-foreground font-mono w-4 flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-sm truncate">{p.name}</span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-medium font-money">
                      {formatMoney(p.revenue, currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">{p.quantity} sold</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No sales yet today
            </p>
          )}
        </div>

        {/* Recent sales */}
        <div className="xl:col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Recent Sales</h2>
            <Link
              to="/sales"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
              ))}
            </div>
          ) : data?.recentSales && data.recentSales.length > 0 ? (
            <div className="divide-y divide-border">
              {data.recentSales.map((sale) => (
                <div key={sale.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium font-mono">{sale.receiptNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {sale.cashierName} · {sale.itemCount} item{sale.itemCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold font-money">
                      {formatMoney(sale.total, currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(sale.completedAt).toLocaleTimeString('en-KE', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No sales yet today.</p>
              <Link
                to="/pos"
                className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                Open Point of Sale
              </Link>
            </div>
          )}
        </div>

        {/* Low stock alerts */}
        {(data?.lowStockCount ?? 0) > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-semibold text-amber-700 dark:text-amber-500">
                Low Stock Alert
              </h2>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              {data?.lowStockCount} product{data?.lowStockCount !== 1 ? 's are' : ' is'} running
              low on stock.
            </p>
            <Link
              to="/inventory"
              className="inline-flex items-center gap-1.5 mt-3 text-sm text-amber-700 dark:text-amber-400 hover:underline"
            >
              View inventory <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
