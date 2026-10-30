import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PackagePlus, Truck } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

interface Branch { id: string; name: string; }
interface Product { id: string; name: string; sku: string; }
interface Supplier { id: string; name: string; }

export function PurchasingPage() {
  const qc = useQueryClient();
  const currency = useAuthStore((s) => s.organization?.currency ?? 'KES');
  const branches = useQuery({ queryKey: ['branches'], queryFn: () => api.get<Branch[]>('/branches') });
  const products = useQuery({ queryKey: ['purchase-products'], queryFn: () => api.get<{ data: Product[] }>('/products?limit=200') });
  const suppliers = useQuery({ queryKey: ['suppliers'], queryFn: () => api.get<Supplier[]>('/suppliers') });
  const [branchId, setBranchId] = useState('');
  const [productId, setProductId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [message, setMessage] = useState('');
  const receive = useMutation({
    mutationFn: async () => {
      const supplierName = suppliers.data?.find((s) => s.id === supplierId)?.name;
      const productName = products.data?.data.find((p) => p.id === productId)?.name;
      return api.post('/inventory/adjust', {
        productId, branchId, quantity: Number(quantity),
        unitCost: unitCost ? Math.round(Number(unitCost) * 100) : undefined,
        reason: `Stock received${supplierName ? ` from ${supplierName}` : ''}${unitCost ? ` at ${currency} ${unitCost} per unit` : ''}`,
      }).then(() => productName);
    },
    onSuccess: async (name) => {
      setMessage(`${quantity} ${name ?? 'units'} received and added to inventory.`);
      setQuantity(''); setUnitCost('');
      await Promise.all([qc.invalidateQueries({ queryKey: ['inventory'] }), qc.invalidateQueries({ queryKey: ['notification-low-stock'] })]);
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Could not record the stock receipt.'),
  });
  const branchName = new Map((branches.data ?? []).map((b) => [b.id, b.name]));
  return <div><PageHeader title="Purchasing" description="Record incoming stock and update inventory when deliveries arrive." />
    {message && <div role="status" className="mb-4 rounded-lg border border-border bg-card p-3 text-sm">{message}<button onClick={() => setMessage('')} className="float-right text-primary">Dismiss</button></div>}
    {!branches.data?.length && !branches.isLoading ? <div className="rounded-xl border border-border bg-card p-6 text-center"><Truck className="mx-auto mb-2 h-7 w-7 text-primary"/><p className="font-medium">Add a business location first</p><p className="mt-1 text-sm text-muted-foreground">Stock receipts need a destination branch.</p></div> : <form onSubmit={(e) => { e.preventDefault(); receive.mutate(); }} className="max-w-2xl rounded-xl border border-border bg-card p-5 sm:p-6"><div className="mb-5 flex items-center gap-3"><span className="rounded-lg bg-primary/10 p-2 text-primary"><PackagePlus className="h-5 w-5"/></span><div><h2 className="font-semibold">Receive a delivery</h2><p className="text-sm text-muted-foreground">This receipt immediately increases the selected product’s stock.</p></div></div>
      <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Deliver to branch *<select required value={branchId} onChange={(e) => setBranchId(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"><option value="">Choose branch</option>{(branches.data ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        <label className="text-sm">Supplier<select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"><option value="">Choose supplier (optional)</option>{(suppliers.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label className="text-sm sm:col-span-2">Product *<select required value={productId} onChange={(e) => setProductId(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"><option value="">Choose product</option>{(products.data?.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name} · {p.sku}</option>)}</select></label>
        <label className="text-sm">Quantity received *<input required type="number" min="1" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" placeholder="e.g. 24"/></label>
        <label className="text-sm">Unit cost ({currency}, optional)<input type="number" min="0" step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" placeholder="e.g. 125.00"/></label>
      </div><p className="mt-4 text-xs text-muted-foreground">Destination: {branchName.get(branchId) ?? 'Select a branch above'}. Each receipt is recorded in the inventory history.</p><button disabled={!branchId || !productId || !quantity || receive.isPending} className="mt-5 flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">{receive.isPending ? 'Recording receipt…' : 'Receive stock'}</button>
    </form>}
  </div>;
}
