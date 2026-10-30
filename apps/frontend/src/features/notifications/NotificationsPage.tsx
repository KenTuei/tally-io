import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Bell, CheckCircle2, Package, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { api } from '../../lib/api';
import { useSyncStore } from '../../stores/syncStore';

interface StockAlert { productId: string; productName: string; sku: string; quantityOnHand: number; lowStockThreshold: number; }

export function NotificationsPage() {
  const { status, pendingCount, isOnline } = useSyncStore();
  const { data, isLoading, isError } = useQuery({ queryKey: ['notification-low-stock'], queryFn: () => api.get<{ data: StockAlert[] }>('/inventory/stock?lowStock=true&limit=50') });
  const alerts = data?.data ?? [];
  const hasSyncIssue = !isOnline || status === 'error' || pendingCount > 0;
  return <div>
    <PageHeader title="Notifications" description="A quick look at things that may need your attention." />
    <div className="space-y-3">
      {hasSyncIssue && <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30"><WifiOff className="mt-0.5 h-5 w-5 text-amber-600"/><div><p className="font-medium">{!isOnline ? 'You are offline' : status === 'error' ? 'Some changes need attention' : 'Changes waiting to sync'}</p><p className="mt-1 text-sm text-muted-foreground">{pendingCount ? `${pendingCount} change${pendingCount === 1 ? '' : 's'} waiting to sync. Keep this device online to send them.` : 'Reconnect to keep your sales and inventory up to date.'}</p></div></div>}
      {isLoading && <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Checking stock alerts…</p>}
      {isError && <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Stock alerts could not be loaded right now.</p>}
      {alerts.map((item) => <div key={`${item.productId}-${item.sku}`} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"><AlertTriangle className="mt-0.5 h-5 w-5 text-amber-500"/><div className="flex-1"><p className="font-medium">Low stock: {item.productName}</p><p className="mt-1 text-sm text-muted-foreground">{item.quantityOnHand} left · alert at {item.lowStockThreshold} · SKU {item.sku}</p></div><Link to="/inventory" className="flex items-center gap-1 text-sm text-primary"><Package className="h-4 w-4"/>Inventory</Link></div>)}
      {!isLoading && !isError && !alerts.length && !hasSyncIssue && <div className="rounded-xl border border-border bg-card p-8 text-center"><CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-emerald-500"/><p className="font-medium">You’re all caught up</p><p className="mt-1 text-sm text-muted-foreground">No low stock or sync alerts right now.</p></div>}
      {!isLoading && !isError && !alerts.length && hasSyncIssue && <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"><Bell className="h-5 w-5 text-muted-foreground"/><p className="text-sm text-muted-foreground">No low stock alerts.</p></div>}
    </div>
  </div>;
}
