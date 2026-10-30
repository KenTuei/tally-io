import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Check } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { cn } from '../../lib/utils';

interface TaxRate {
  id: string;
  name: string;
  code: string;
  rate: number;
  isInclusive: boolean;
  isDefault: boolean;
  isActive: boolean;
}

export function TaxSettings() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TaxRate | null>(null);
  const [form, setForm] = useState({ name: '', code: '', rate: '', isInclusive: false, isDefault: false });
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const { data: taxes = [], isLoading } = useQuery<TaxRate[]>({
    queryKey: ['taxes'],
    queryFn: () => api.get<TaxRate[]>('/taxes'),
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/taxes', {
      name: form.name,
      code: form.code.toUpperCase(),
      rate: Math.round(parseFloat(form.rate) * 100),
      isInclusive: form.isInclusive,
      isDefault: form.isDefault,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxes'] });
      setShowForm(false);
      setForm({ name: '', code: '', rate: '', isInclusive: false, isDefault: false });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Failed to create tax'),
  });

  const updateMutation = useMutation({
    mutationFn: () => api.patch(`/taxes/${editing?.id}`, {
      name: form.name,
      rate: Math.round(parseFloat(form.rate) * 100),
      isInclusive: form.isInclusive,
      isDefault: form.isDefault,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxes'] });
      setEditing(null);
      setShowForm(false);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/taxes/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['taxes'] }),
  });

  const openEdit = (tax: TaxRate) => {
    setEditing(tax);
    setForm({ name: tax.name, code: tax.code, rate: String(tax.rate / 100), isInclusive: tax.isInclusive, isDefault: tax.isDefault });
    setShowForm(true);
    setError('');
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', code: '', rate: '', isInclusive: false, isDefault: false });
    setShowForm(true);
    setError('');
  };

  const inputClass = 'w-full px-3 py-2 rounded-lg border border-input text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div className="max-w-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold">Tax rates</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Configure taxes for your products and services</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add tax
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-4 p-4 rounded-xl border border-border bg-muted/30">
          <h4 className="text-sm font-semibold mb-3">{editing ? 'Edit tax rate' : 'New tax rate'}</h4>
          {error && <p className="text-xs text-destructive mb-2">{error}</p>}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium mb-1">Name *</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputClass} placeholder="e.g. VAT" />
            </div>
            {!editing && (
              <div>
                <label className="block text-xs font-medium mb-1">Code *</label>
                <input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} className={inputClass + ' font-mono'} placeholder="e.g. VAT16" />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium mb-1">Rate (%)</label>
              <input type="number" min="0" max="100" step="0.01" value={form.rate} onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))} className={inputClass} placeholder="16" />
            </div>
          </div>
          <div className="space-y-2 mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isInclusive} onChange={(e) => setForm((f) => ({ ...f, isInclusive: e.target.checked }))} className="rounded" />
              <span className="text-xs">Tax is included in the price</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))} className="rounded" />
              <span className="text-xs">Apply to new products by default</span>
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors">Cancel</button>
            <button
              onClick={() => editing ? updateMutation.mutate() : createMutation.mutate()}
              disabled={!form.name || !form.rate || (!editing && !form.code) || createMutation.isPending || updateMutation.isPending}
              className="flex-1 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground disabled:opacity-50 transition-colors"
            >
              {editing ? 'Save changes' : 'Add tax rate'}
            </button>
          </div>
        </div>
      )}

      {/* Tax list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-12 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : (taxes as TaxRate[]).length === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground border border-dashed border-border rounded-xl">
          No tax rates configured yet. Add your first tax rate above.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
          {(taxes as TaxRate[]).map((tax) => (
            <div key={tax.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{tax.name}</p>
                  <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{tax.code}</span>
                  {tax.isDefault && (
                    <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                      <Check className="w-2.5 h-2.5" /> Default
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {(tax.rate / 100).toFixed(2)}% {tax.isInclusive ? '(inclusive)' : '(exclusive)'}
                </p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(tax)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete tax rate "${tax.name}"?`)) deleteMutation.mutate(tax.id);
                  }}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
