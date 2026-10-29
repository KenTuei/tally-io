import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Users, Phone, Mail, Edit } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { api, ApiError } from '../../lib/api';
import { cn } from '../../lib/utils';

interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  creditAllowed: boolean;
  loyaltyPoints: number;
  isActive: boolean;
  createdAt: string;
}

export function CustomersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showNew, setShowNew] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<{ data: Customer[]; pagination: { total: number; totalPages: number } }>({
    queryKey: ['customers', search, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (search) params.set('q', search);
      return api.get(`/customers?${params}`);
    },
  });

  const customers = data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Customers"
        description={data?.pagination ? `${data.pagination.total} customers` : undefined}
        actions={
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add customer
          </button>
        }
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search name, phone, email..."
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-sm text-destructive">
          Could not load customers.
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-muted rounded w-36" />
                  <div className="h-3 bg-muted rounded w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customers yet"
            description="Add customers to track purchase history, credit, and loyalty points."
            action={
              <button
                onClick={() => setShowNew(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground"
              >
                <Plus className="w-4 h-4" /> Add first customer
              </button>
            }
          />
        ) : (
          <div className="divide-y divide-border">
            {customers.map((customer) => (
              <div key={customer.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-primary">
                    {customer.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{customer.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {customer.phone && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3" /> {customer.phone}
                      </span>
                    )}
                    {customer.email && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="w-3 h-3" /> {customer.email}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {customer.creditAllowed && (
                    <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 px-2 py-0.5 rounded-full">
                      Credit
                    </span>
                  )}
                  {customer.loyaltyPoints > 0 && (
                    <span className="text-xs text-muted-foreground">{customer.loyaltyPoints} pts</span>
                  )}
                  <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showNew && (
        <NewCustomerModal
          onClose={() => setShowNew(false)}
          onSaved={() => {
            setShowNew(false);
            void queryClient.invalidateQueries({ queryKey: ['customers'] });
          }}
        />
      )}
    </div>
  );
}

function NewCustomerModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', marketingConsent: false });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post('/customers', form),
    onSuccess: onSaved,
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Failed to create customer'),
  });

  const update = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-semibold mb-4">Add customer</h2>
        {error && <p className="text-sm text-destructive mb-3">{error}</p>}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Full name *</label>
            <input value={form.name} onChange={(e) => update({ name: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Customer name" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone number</label>
            <input type="tel" value={form.phone} onChange={(e) => update({ phone: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="+254 7XX XXX XXX" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" value={form.email} onChange={(e) => update({ email: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="customer@example.com" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.marketingConsent} onChange={(e) => update({ marketingConsent: e.target.checked })} className="rounded" />
            <span className="text-sm">Customer consents to marketing emails</span>
          </label>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-sm hover:bg-muted">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={!form.name || mutation.isPending} className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
            {mutation.isPending ? 'Adding...' : 'Add customer'}
          </button>
        </div>
      </div>
    </div>
  );
}
