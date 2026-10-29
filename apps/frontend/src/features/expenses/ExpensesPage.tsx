import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, DollarSign, Calendar, Search } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { api, ApiError } from '../../lib/api';
import { formatMoney, formatDate, cn } from '../../lib/utils';
import { useAuthStore } from '../../stores/authStore';

interface Expense {
  id: string;
  branchId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  payeeName: string;
  reference?: string;
  notes?: string;
  date: string;
  status: string;
}

export function ExpensesPage() {
  const [page, setPage] = useState(1);
  const [showNew, setShowNew] = useState(false);
  const currency = useAuthStore((s) => s.organization?.currency ?? 'KES');
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<{ data: Expense[]; pagination: { total: number; totalPages: number } }>({
    queryKey: ['expenses', page],
    queryFn: () => api.get(`/expenses?page=${page}&limit=25`),
  });

  const { data: categories = [] } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ['expense-categories'],
    queryFn: () => api.get('/expenses/categories'),
  });

  const expenses = data?.data ?? [];
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <PageHeader
        title="Expenses"
        description={data?.pagination ? `${data.pagination.total} records` : undefined}
        actions={
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Record expense
          </button>
        }
      />

      {/* Summary */}
      {expenses.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Total this page</p>
            <p className="text-xl font-semibold font-money">{formatMoney(total, currency)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Transactions</p>
            <p className="text-xl font-semibold">{expenses.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Average</p>
            <p className="text-xl font-semibold font-money">{formatMoney(Math.round(total / (expenses.length || 1)), currency)}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-sm text-destructive">
          Could not load expenses.
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 animate-pulse">
                <div className="h-4 bg-muted rounded w-32" />
                <div className="h-4 bg-muted rounded w-20 ml-auto" />
              </div>
            ))}
          </div>
        ) : expenses.length === 0 ? (
          <EmptyState
            icon={DollarSign}
            title="No expenses recorded"
            description="Track operating costs to calculate accurate profit."
            action={
              <button
                onClick={() => setShowNew(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground"
              >
                <Plus className="w-4 h-4" /> Record first expense
              </button>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-4 py-2.5 border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <span>Payee</span>
              <span>Method</span>
              <span>Date</span>
              <span className="text-right">Amount</span>
            </div>
            <div className="divide-y divide-border">
              {expenses.map((exp) => (
                <div key={exp.id} className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-4 py-3 items-center hover:bg-muted/20">
                  <div>
                    <p className="text-sm font-medium">{exp.payeeName}</p>
                    {exp.notes && <p className="text-xs text-muted-foreground truncate">{exp.notes}</p>}
                  </div>
                  <span className="text-sm capitalize text-muted-foreground">
                    {exp.paymentMethod.replace('_', ' ')}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(exp.date)}
                  </span>
                  <span className="text-sm font-money font-semibold text-right">
                    {formatMoney(exp.amount, currency)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showNew && (
        <NewExpenseModal
          categories={categories}
          onClose={() => setShowNew(false)}
          onSaved={() => {
            setShowNew(false);
            void queryClient.invalidateQueries({ queryKey: ['expenses'] });
          }}
        />
      )}
    </div>
  );
}

function NewExpenseModal({
  categories,
  onClose,
  onSaved,
}: {
  categories: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    branchId: '',
    categoryId: '',
    amount: '',
    paymentMethod: 'cash',
    payeeName: '',
    notes: '',
    date: new Date().toISOString().split('T')[0] ?? '',
  });
  const [error, setError] = useState('');

  const { data: branches = [] } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ['branches'],
    queryFn: () => api.get('/branches'),
  });

  const mutation = useMutation({
    mutationFn: () => api.post('/expenses', {
      ...form,
      amount: Math.round(parseFloat(form.amount) * 100),
      date: new Date(form.date).toISOString(),
    }),
    onSuccess: onSaved,
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Failed to record expense'),
  });

  const update = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-semibold mb-4">Record expense</h2>
        {error && <p className="text-sm text-destructive mb-3">{error}</p>}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Branch *</label>
            <select value={form.branchId} onChange={(e) => update({ branchId: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-input text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Select branch</option>
              {(branches as Array<{ id: string; name: string }>).map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Payee / Description *</label>
            <input value={form.payeeName} onChange={(e) => update({ payeeName: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="e.g. Electricity bill" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Amount (KES) *</label>
              <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => update({ amount: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Payment method</label>
              <select value={form.paymentMethod} onChange={(e) => update({ paymentMethod: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-input text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="cash">Cash</option>
                <option value="mpesa">M-Pesa</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="card">Card</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input type="date" value={form.date} onChange={(e) => update({ date: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <input value={form.notes} onChange={(e) => update({ notes: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Optional notes" />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-sm hover:bg-muted">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={!form.payeeName || !form.amount || !form.branchId || mutation.isPending} className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
            {mutation.isPending ? 'Saving...' : 'Record expense'}
          </button>
        </div>
      </div>
    </div>
  );
}
