import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Calendar, TrendingUp, Download } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { PageHeader } from '../../components/PageHeader';
import { StatCard } from '../../components/StatCard';
import { api } from '../../lib/api';
import { formatMoney, cn } from '../../lib/utils';
import { useAuthStore } from '../../stores/authStore';

type ReportPeriod = 'today' | 'week' | 'month' | 'custom';

interface SalesReport {
  summary: {
    grossSales: number;
    netSales: number;
    discounts: number;
    taxes: number;
    refunds: number;
    costOfGoods: number;
    grossProfit: number;
    transactions: number;
    averageOrderValue: number;
  };
  byDay: Array<{ date: string; sales: number; transactions: number; profit: number }>;
  byPaymentMethod: Array<{ method: string; amount: number; count: number }>;
  byCategory: Array<{ name: string; revenue: number; quantity: number }>;
}

export function ReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>('week');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const currency = useAuthStore((s) => s.organization?.currency ?? 'KES');

  const { data, isLoading, error } = useQuery<SalesReport>({
    queryKey: ['reports-sales', period, customFrom, customTo],
    queryFn: () => {
      const params = new URLSearchParams({ period });
      if (period === 'custom') {
        params.set('from', customFrom);
        params.set('to', customTo);
      }
      return api.get<SalesReport>(`/reports/sales?${params}`);
    },
    enabled: period !== 'custom' || (!!customFrom && !!customTo),
  });

  const s = data?.summary;

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        actions={
          <button className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        }
      />

      {/* Period selector */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          {(['today', 'week', 'month'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-md capitalize transition-colors',
                period === p ? 'bg-card shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {p === 'today' ? 'Today' : p === 'week' ? 'This week' : 'This month'}
            </button>
          ))}
          <button
            onClick={() => setPeriod('custom')}
            className={cn(
              'flex items-center gap-1 px-3 py-1.5 text-sm rounded-md transition-colors',
              period === 'custom' ? 'bg-card shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Calendar className="w-3.5 h-3.5" />
            Custom
          </button>
        </div>
        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="px-3 py-1.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <span className="text-muted-foreground text-sm">to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="px-3 py-1.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-sm text-destructive">
          Could not load reports. Backend may not be connected.
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard title="Gross Sales" value={formatMoney(s?.grossSales ?? 0, currency)} icon={TrendingUp} loading={isLoading} />
        <StatCard title="Net Sales" value={formatMoney(s?.netSales ?? 0, currency)} icon={TrendingUp} loading={isLoading} />
        <StatCard title="Gross Profit" value={formatMoney(s?.grossProfit ?? 0, currency)} icon={BarChart3} loading={isLoading} />
        <StatCard title="Transactions" value={String(s?.transactions ?? 0)} description={s ? `Avg. ${formatMoney(s.averageOrderValue, currency)}` : undefined} icon={BarChart3} loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {/* Sales by day */}
        <div className="xl:col-span-2 rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold mb-4">Sales Trend</h2>
          {isLoading ? (
            <div className="h-52 bg-muted/40 rounded animate-pulse" />
          ) : data?.byDay && data.byDay.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.byDay} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v: number) => `${(v / 100).toLocaleString()}`} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === 'sales' ? formatMoney(value, currency) : value,
                    name === 'sales' ? 'Sales' : 'Transactions',
                  ]}
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="sales" fill="hsl(231,48%,48%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">
              No data for this period
            </div>
          )}
        </div>

        {/* Payment methods */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold mb-4">By Payment Method</h2>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-muted/40 rounded animate-pulse" />)}
            </div>
          ) : data?.byPaymentMethod && data.byPaymentMethod.length > 0 ? (
            <div className="space-y-3">
              {data.byPaymentMethod.map((m) => (
                <div key={m.method} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize font-medium">{m.method}</span>
                    <span className="font-money">{formatMoney(m.amount, currency)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{
                        width: `${Math.min(100, (m.amount / (data?.summary.grossSales ?? 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{m.count} transactions</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No data</p>
          )}
        </div>
      </div>

      {/* Additional breakdown */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold mb-4">Financial Summary</h2>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-8 bg-muted/40 rounded animate-pulse" />)}
          </div>
        ) : s ? (
          <div className="divide-y divide-border">
            {[
              { label: 'Gross sales', value: s.grossSales, note: 'Before discounts' },
              { label: 'Discounts given', value: -s.discounts, note: '' },
              { label: 'Net sales', value: s.netSales, bold: true, note: 'After discounts' },
              { label: 'Cost of goods', value: -s.costOfGoods, note: '' },
              { label: 'Gross profit', value: s.grossProfit, bold: true, positive: s.grossProfit > 0 },
              { label: 'Refunds', value: -s.refunds, note: '' },
              { label: 'Taxes collected', value: s.taxes, note: '' },
            ].map((row) => (
              <div key={row.label} className="flex justify-between items-center py-2.5">
                <span className={cn('text-sm', row.bold && 'font-semibold')}>{row.label}</span>
                <div className="text-right">
                  <span
                    className={cn(
                      'text-sm font-money tabular-nums',
                      row.bold && 'font-semibold',
                      row.positive !== undefined && (row.positive ? 'text-emerald-600' : 'text-rose-600'),
                    )}
                  >
                    {formatMoney(Math.abs(row.value), currency)}
                  </span>
                  {row.note && <p className="text-xs text-muted-foreground">{row.note}</p>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No data available</p>
        )}
      </div>
    </div>
  );
}
