import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { X, Plus, Trash2 } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../stores/authStore';

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: string; // user input — convert to cents on submit
  discountAmount: number;
  taxRate: number;
}

interface CreateInvoiceModalProps {
  type: 'invoice' | 'quote';
  onClose: () => void;
  onCreated: () => void;
}

function calcLine(item: InvoiceItem) {
  const price = Math.round(parseFloat(item.unitPrice || '0') * 100);
  const subtotal = price * item.quantity;
  const disc = item.discountAmount;
  const tax = Math.round((subtotal - disc) * item.taxRate / 10000);
  return subtotal - disc + tax;
}

export function CreateInvoiceModal({ type, onClose, onCreated }: CreateInvoiceModalProps) {
  const currency = useAuthStore((s) => s.organization?.currency ?? 'KES');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0] ?? '');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, unitPrice: '', discountAmount: 0, taxRate: 0 },
  ]);
  const [error, setError] = useState('');

  const { data: taxes = [] } = useQuery<Array<{ id: string; name: string; rate: number }>>({
    queryKey: ['taxes'],
    queryFn: () => api.get('/taxes'),
  });

  const mutation = useMutation({
    mutationFn: () => {
      const body = {
        type,
        customerName,
        customerEmail: customerEmail || undefined,
        issueDate: new Date(issueDate).toISOString(),
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        notes: notes || undefined,
        items: items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unitPrice: Math.round(parseFloat(i.unitPrice || '0') * 100),
          discountAmount: i.discountAmount,
          taxRate: i.taxRate,
        })),
      };
      return api.post('/invoices', body);
    },
    onSuccess: onCreated,
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Failed to create'),
  });

  const addItem = () =>
    setItems((prev) => [...prev, { description: '', quantity: 1, unitPrice: '', discountAmount: 0, taxRate: 0 }]);

  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const updateItem = (i: number, patch: Partial<InvoiceItem>) =>
    setItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, ...patch } : item)));

  const total = items.reduce((s, i) => s + calcLine(i), 0);

  const inputClass = 'px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-full';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-base font-semibold">New {type === 'invoice' ? 'Invoice' : 'Quote'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && <div className="p-3 rounded-lg bg-destructive/10 text-sm text-destructive">{error}</div>}

          {/* Customer */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Customer name *</label>
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={inputClass} placeholder="Customer or company" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Customer email</label>
              <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className={inputClass} placeholder="email@example.com" />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Issue date *</label>
              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className={inputClass} />
            </div>
            {type === 'invoice' && (
              <div>
                <label className="block text-sm font-medium mb-1">Due date</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
              </div>
            )}
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold">Line items</label>
              <button onClick={addItem} className="flex items-center gap-1 text-xs text-primary hover:underline">
                <Plus className="w-3.5 h-3.5" /> Add item
              </button>
            </div>

            <div className="rounded-xl border border-border overflow-hidden">
              <div className="grid grid-cols-[3fr_1fr_1fr_1fr_auto] gap-2 px-3 py-2 bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <span>Description</span><span>Qty</span><span>Price ({currency})</span><span>Tax</span><span className="w-6" />
              </div>
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-[3fr_1fr_1fr_1fr_auto] gap-2 px-3 py-2 border-t border-border items-center">
                  <input
                    value={item.description}
                    onChange={(e) => updateItem(i, { description: e.target.value })}
                    className="px-2 py-1.5 rounded-md border border-input text-sm w-full focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="Item description"
                  />
                  <input
                    type="number" min="0.01" step="0.01"
                    value={item.quantity}
                    onChange={(e) => updateItem(i, { quantity: Math.max(0.01, parseFloat(e.target.value) || 1) })}
                    className="px-2 py-1.5 rounded-md border border-input text-sm w-full focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <input
                    type="number" min="0" step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(i, { unitPrice: e.target.value })}
                    className="px-2 py-1.5 rounded-md border border-input text-sm w-full focus:outline-none focus:ring-1 focus:ring-ring font-mono"
                    placeholder="0.00"
                  />
                  <select
                    value={item.taxRate}
                    onChange={(e) => updateItem(i, { taxRate: parseInt(e.target.value) })}
                    className="px-2 py-1.5 rounded-md border border-input text-xs w-full bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value={0}>No tax</option>
                    {(taxes as Array<{ id: string; name: string; rate: number }>).map((t) => (
                      <option key={t.id} value={t.rate}>{t.name} ({(t.rate / 100).toFixed(0)}%)</option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeItem(i)}
                    disabled={items.length === 1}
                    className="p-1 text-muted-foreground hover:text-destructive disabled:opacity-30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-2">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-xl font-bold font-money">{currency} {(total / 100).toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputClass + ' resize-none'} placeholder="Optional notes for the customer" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-border flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-sm hover:bg-muted transition-colors">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!customerName || items.some((i) => !i.description || !i.unitPrice) || mutation.isPending}
            className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? 'Creating…' : `Create ${type === 'invoice' ? 'Invoice' : 'Quote'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
