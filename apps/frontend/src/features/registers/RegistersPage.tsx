import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Plus, Play, Square, Store } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { api, ApiError } from '../../lib/api';
import { formatMoney } from '../../lib/utils';
import { useAuthStore } from '../../stores/authStore';

interface Branch { id: string; name: string; }
interface Register { id: string; branchId: string; name: string; isActive: boolean; currentShiftId?: string; }
interface Shift { id: string; registerId: string; status: 'open' | 'closed'; openingFloat: number; openedAt: string; }

export function RegistersPage() {
  const qc = useQueryClient();
  const currency = useAuthStore((s) => s.organization?.currency ?? 'KES');
  const [name, setName] = useState('');
  const [branchId, setBranchId] = useState('');
  const [float, setFloat] = useState('');
  const [message, setMessage] = useState('');
  const branches = useQuery({ queryKey: ['branches'], queryFn: () => api.get<Branch[]>('/branches') });
  const registers = useQuery({ queryKey: ['registers'], queryFn: () => api.get<Register[]>('/branches/registers') });
  const shifts = useQuery({ queryKey: ['register-shifts'], queryFn: () => api.get<Shift[]>('/branches/shifts') });
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ['registers'] }), qc.invalidateQueries({ queryKey: ['register-shifts'] })]);
  const create = useMutation({ mutationFn: () => api.post('/branches/registers', { name: name.trim(), branchId }), onSuccess: () => { setName(''); setMessage('Register created.'); void refresh(); }, onError: (e) => setMessage(e instanceof ApiError ? e.message : 'Could not create register.') });
  const open = useMutation({ mutationFn: ({ register, amount }: { register: Register; amount: number }) => api.post('/branches/shifts/open', { registerId: register.id, branchId: register.branchId, openingFloat: amount }), onSuccess: () => { setFloat(''); setMessage('Shift opened. You are ready to start selling.'); void refresh(); }, onError: (e) => setMessage(e instanceof Error ? e.message : 'Could not open shift.') });
  const close = useMutation({ mutationFn: ({ shiftId, amount }: { shiftId: string; amount: number }) => api.post(`/branches/shifts/${shiftId}/close`, { closingCount: amount }), onSuccess: () => { setMessage('Shift closed.'); void refresh(); }, onError: (e) => setMessage(e instanceof Error ? e.message : 'Could not close shift.') });
  const branchName = new Map((branches.data ?? []).map((branch) => [branch.id, branch.name]));
  const openShift = (registerId: string) => shifts.data?.find((shift) => shift.registerId === registerId && shift.status === 'open');

  return <div>
    <PageHeader title="Cash registers" description="Set up tills, open a shift, and keep track of the opening cash." />
    {message && <div className="mb-4 rounded-lg border border-border bg-card p-3 text-sm" role="status">{message}<button className="float-right text-primary" onClick={() => setMessage('')}>Dismiss</button></div>}
    {!branches.isLoading && !branches.data?.length && <div className="mb-5 rounded-xl border border-border bg-card p-6 text-center"><Store className="mx-auto mb-2 h-7 w-7 text-primary"/><p className="font-medium">Add your business location first</p><p className="my-2 text-sm text-muted-foreground">A register belongs to a branch.</p><Link className="text-sm text-primary" to="/branches">Go to Branches →</Link></div>}
    {!!branches.data?.length && <form className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
      <label className="min-w-48 flex-1 text-sm">Register name<input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Front counter" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"/></label>
      <label className="min-w-48 flex-1 text-sm">Branch<select required value={branchId} onChange={(e) => setBranchId(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"><option value="">Choose branch</option>{branches.data.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      <button disabled={!name.trim() || !branchId || create.isPending} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"><Plus className="h-4 w-4"/>Create register</button>
    </form>}
    {registers.isLoading ? <p className="text-sm text-muted-foreground">Loading registers…</p> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{(registers.data ?? []).map((register) => {
      const shift = openShift(register.id);
      return <section key={register.id} className="rounded-xl border border-border bg-card p-5"><div className="mb-4 flex items-center gap-3"><div className="rounded-lg bg-primary/10 p-2 text-primary"><CreditCard className="h-5 w-5"/></div><div><h2 className="font-semibold">{register.name}</h2><p className="text-xs text-muted-foreground">{branchName.get(register.branchId) ?? 'Business branch'}</p></div></div>
        {shift ? <><p className="mb-3 text-sm text-emerald-600">Shift open · Started {new Date(shift.openedAt).toLocaleTimeString()}</p><p className="mb-3 text-sm text-muted-foreground">Opening cash: {formatMoney(shift.openingFloat, currency)}</p><div className="flex gap-2"><input aria-label="Closing cash counted" type="number" min="0" step="0.01" placeholder="Cash counted at close" value={float} onChange={(e) => setFloat(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"/><button disabled={!float || close.isPending} onClick={() => close.mutate({ shiftId: shift.id, amount: Math.round(Number(float) * 100) })} className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50"><Square className="h-4 w-4"/>Close</button></div></> : <div className="flex gap-2"><input aria-label="Opening cash float" type="number" min="0" step="0.01" placeholder={`Opening cash (${currency})`} value={float} onChange={(e) => setFloat(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"/><button disabled={!float || open.isPending} onClick={() => open.mutate({ register, amount: Math.round(Number(float) * 100) })} className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"><Play className="h-4 w-4"/>Open shift</button></div>}
      </section>;
    })}</div>}
    {!registers.isLoading && !!branches.data?.length && !registers.data?.length && <p className="py-8 text-center text-sm text-muted-foreground">Create your first register above to get started.</p>}
  </div>;
}
