import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

interface CreateProductModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export function CreateProductModal({ onClose, onCreated }: CreateProductModalProps) {
  const currency = useAuthStore((s) => s.organization?.currency ?? 'KES');
  const [form, setForm] = useState({
    name: '',
    sku: '',
    barcode: '',
    categoryId: '',
    unitOfMeasure: 'piece',
    costPrice: '',
    sellingPrice: '',
    lowStockThreshold: '5',
    trackInventory: true,
    isService: false,
    taxInclusive: false,
    taxRateId: '',
    description: '',
  });
  const [error, setError] = useState('');

  const { data: categories = [] } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ['categories'],
    queryFn: () => api.get('/products/categories'),
  });

  const { data: taxes = [] } = useQuery<Array<{ id: string; name: string; rate: number }>>({
    queryKey: ['taxes'],
    queryFn: () => api.get('/taxes'),
  });

  const mutation = useMutation({
    mutationFn: () => {
      const costCents = Math.round(parseFloat(form.costPrice || '0') * 100);
      const sellCents = Math.round(parseFloat(form.sellingPrice || '0') * 100);
      return api.post('/products', {
        name: form.name,
        sku: form.sku,
        barcode: form.barcode || undefined,
        categoryId: form.categoryId || undefined,
        unitOfMeasure: form.unitOfMeasure,
        costPrice: costCents,
        sellingPrice: sellCents,
        lowStockThreshold: parseInt(form.lowStockThreshold) || 5,
        trackInventory: form.trackInventory,
        isService: form.isService,
        taxInclusive: form.taxInclusive,
        taxRateId: form.taxRateId || undefined,
        description: form.description || undefined,
      });
    },
    onSuccess: onCreated,
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Failed to create product'),
  });

  const update = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));
  const inputClass = 'w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-card rounded-xl border border-border shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-base font-semibold">Add product</h2>
          <button onClick={onClose} className="p-1.5 rounded-md text-muted-foreground hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && <div className="p-3 rounded-lg bg-destructive/10 text-sm text-destructive">{error}</div>}

          <div>
            <label className="block text-sm font-medium mb-1">Product name *</label>
            <input value={form.name} onChange={(e) => update('name', e.target.value)} className={inputClass} placeholder="e.g. Cooking Oil 500ml" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">SKU *</label>
              <input value={form.sku} onChange={(e) => update('sku', e.target.value)} className={inputClass} placeholder="e.g. OIL-500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Barcode</label>
              <input value={form.barcode} onChange={(e) => update('barcode', e.target.value)} className={inputClass} placeholder="EAN-13" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Cost price ({currency})</label>
              <input type="number" min="0" step="0.01" value={form.costPrice} onChange={(e) => update('costPrice', e.target.value)} className={inputClass + ' font-mono'} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Selling price ({currency}) *</label>
              <input type="number" min="0" step="0.01" value={form.sellingPrice} onChange={(e) => update('sellingPrice', e.target.value)} className={inputClass + ' font-mono'} placeholder="0.00" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select value={form.categoryId} onChange={(e) => update('categoryId', e.target.value)} className={inputClass + ' bg-background'}>
                <option value="">No category</option>
                {(categories as Array<{ id: string; name: string }>).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Unit of measure</label>
              <select value={form.unitOfMeasure} onChange={(e) => update('unitOfMeasure', e.target.value)} className={inputClass + ' bg-background'}>
                {['piece', 'kg', 'g', 'litre', 'ml', 'box', 'pack', 'dozen', 'metre'].map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Tax rate</label>
              <select value={form.taxRateId} onChange={(e) => update('taxRateId', e.target.value)} className={inputClass + ' bg-background'}>
                <option value="">No tax</option>
                {(taxes as Array<{ id: string; name: string; rate: number }>).map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({(t.rate / 100).toFixed(0)}%)</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Low stock threshold</label>
              <input type="number" min="0" value={form.lowStockThreshold} onChange={(e) => update('lowStockThreshold', e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.trackInventory} onChange={(e) => update('trackInventory', e.target.checked)} className="rounded" />
              <span className="text-sm">Track inventory</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isService} onChange={(e) => update('isService', e.target.checked)} className="rounded" />
              <span className="text-sm">This is a service (no inventory)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.taxInclusive} onChange={(e) => update('taxInclusive', e.target.checked)} className="rounded" />
              <span className="text-sm">Price includes tax</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={2} className={inputClass + ' resize-none'} placeholder="Optional product description" />
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-border flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-sm hover:bg-muted transition-colors">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!form.name || !form.sku || !form.sellingPrice || mutation.isPending}
            className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? 'Creating…' : 'Add product'}
          </button>
        </div>
      </div>
    </div>
  );
}
