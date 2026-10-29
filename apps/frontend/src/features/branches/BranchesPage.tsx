import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Plus, MapPin, Phone, Users, TrendingUp,
  ArrowRightLeft, BarChart3, ChevronDown, RefreshCw,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatMoney, cn } from '../../lib/utils';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { useAuthStore } from '../../stores/authStore';

interface Branch {
  id: string;
  name: string;
  code: string;
  address?: { city?: string; county?: string; country: string };
  phone?: string;
  isMainBranch: boolean;
  isActive: boolean;
}

interface BranchComparison {
  branchId: string;
  branchName: string;
  branchCode: string;
  totalSales: number;
  transactions: number;
  avgOrderValue: number;
}

type View = 'cards' | 'comparison' | 'transfers';

export function BranchesPage() {
  const [view, setView] = useState<View>('cards');
  const [showNewBranch, setShowNewBranch] = useState(false);
  const currency = useAuthStore((s) => s.organization?.currency ?? 'KES');
  const queryClient = useQueryClient();

  const { data: branches = [], isLoading } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: () => api.get<Branch[]>('/branches'),
  });

  const { data: comparison, isLoading: compLoading } = useQuery<{ comparison: BranchComparison[] }>({
    queryKey: ['branch-comparison'],
    queryFn: () => api.get('/branches/comparison'),
    enabled: view === 'comparison',
  });

  const { data: transfers = [], isLoading: transfersLoading } = useQuery<unknown[]>({
    queryKey: ['transfers'],
    queryFn: () => api.get('/branches/transfers'),
    enabled: view === 'transfers',
  });

  return (
    <div>
      <PageHeader
        title="Branches & Locations"
        description={`${branches.length} branch${branches.length !== 1 ? 'es' : ''}`}
        actions={
          <div className="flex gap-2">
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              {(['cards', 'comparison', 'transfers'] as View[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    'px-3 py-1.5 text-xs rounded-md capitalize transition-colors',
                    view === v ? 'bg-card shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {v === 'cards' ? 'Branches' : v === 'comparison' ? 'Compare' : 'Transfers'}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowNewBranch(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add branch
            </button>
          </div>
        }
      />

      {/* Branch cards view */}
      {view === 'cards' && (
        <>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : branches.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No branches yet"
              description="Add your first branch to start managing multiple locations."
              action={
                <button
                  onClick={() => setShowNewBranch(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground"
                >
                  <Plus className="w-4 h-4" /> Add first branch
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {branches.map((branch) => (
                <div
                  key={branch.id}
                  className="rounded-xl border border-border bg-card p-5 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{branch.name}</h3>
                        {branch.isMainBranch && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            Main
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        {branch.code}
                      </p>
                    </div>
                    <div className={cn(
                      'w-2.5 h-2.5 rounded-full mt-1',
                      branch.isActive ? 'bg-emerald-500' : 'bg-muted',
                    )} />
                  </div>
                  {branch.address?.city && (
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {branch.address.city}, {branch.address.county ?? branch.address.country}
                    </p>
                  )}
                  {branch.phone && (
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone className="w-3.5 h-3.5" />
                      {branch.phone}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Comparison view */}
      {view === 'comparison' && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold">Branch Performance — Last 30 Days</h2>
            <RefreshCw className={cn('w-4 h-4 text-muted-foreground', compLoading && 'animate-spin')} />
          </div>
          {compLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}
            </div>
          ) : comparison?.comparison?.length ? (
            <>
              <div className="grid grid-cols-4 gap-4 px-4 py-2.5 bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <span>Branch</span>
                <span className="text-right">Revenue</span>
                <span className="text-right">Transactions</span>
                <span className="text-right">Avg. Order</span>
              </div>
              <div className="divide-y divide-border">
                {comparison.comparison.map((b) => (
                  <div key={b.branchId} className="grid grid-cols-4 gap-4 px-4 py-3 items-center hover:bg-muted/20">
                    <div>
                      <p className="text-sm font-medium">{b.branchName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{b.branchCode}</p>
                    </div>
                    <p className="text-sm font-money font-semibold text-right">{formatMoney(b.totalSales, currency)}</p>
                    <p className="text-sm text-right">{b.transactions}</p>
                    <p className="text-sm font-money text-right">{formatMoney(b.avgOrderValue, currency)}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState icon={BarChart3} title="No sales data" description="Sales data will appear here once transactions are recorded." />
          )}
        </div>
      )}

      {/* Transfers view */}
      {view === 'transfers' && (
        <div>
          <div className="flex justify-end mb-4">
            <button className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              <ArrowRightLeft className="w-4 h-4" />
              New transfer
            </button>
          </div>
          {transfersLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : (transfers as unknown[]).length === 0 ? (
            <EmptyState
              icon={ArrowRightLeft}
              title="No stock transfers"
              description="Stock transfers between branches appear here."
            />
          ) : (
            <div className="rounded-xl border border-border bg-card divide-y divide-border">
              {(transfers as Record<string, unknown>[]).map((t, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-mono font-medium">{t['transferNumber'] as string}</p>
                    <p className="text-xs text-muted-foreground capitalize">{t['status'] as string}</p>
                  </div>
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full',
                    t['status'] === 'received' ? 'bg-emerald-100 text-emerald-700' :
                    t['status'] === 'dispatched' ? 'bg-blue-100 text-blue-700' :
                    'bg-muted text-muted-foreground',
                  )}>
                    {t['status'] as string}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New branch modal — simplified */}
      {showNewBranch && (
        <NewBranchModal
          onClose={() => setShowNewBranch(false)}
          onSaved={() => {
            setShowNewBranch(false);
            void queryClient.invalidateQueries({ queryKey: ['branches'] });
          }}
        />
      )}
    </div>
  );
}

function NewBranchModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [city, setCity] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post('/branches', {
      name, code, address: { city, country: 'KE' },
    }),
    onSuccess: onSaved,
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to create branch'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-semibold mb-4">Add new branch</h2>
        {error && <p className="text-sm text-destructive mb-3">{error}</p>}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Branch name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="e.g. Nairobi CBD" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Branch code *</label>
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="w-full px-3 py-2.5 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono" placeholder="e.g. NBI" maxLength={10} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">City</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="e.g. Nairobi" />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-sm hover:bg-muted">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={!name || !code || mutation.isPending} className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
            {mutation.isPending ? 'Creating...' : 'Create branch'}
          </button>
        </div>
      </div>
    </div>
  );
}
