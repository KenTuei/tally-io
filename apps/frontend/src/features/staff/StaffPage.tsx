import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, Plus, Shield, Users } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { api } from '../../lib/api';

interface StaffMember { id: string; name: string; email: string; phone?: string; role: string; isActive: boolean; }
interface TeamResponse { staff: StaffMember[]; plannedCount: number; filledCount: number; }

export function StaffPage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('cashier');
  const [message, setMessage] = useState('');
  const { data, isLoading, error } = useQuery({ queryKey: ['staff'], queryFn: () => api.get<TeamResponse>('/users') });
  const addMember = useMutation({ mutationFn: () => api.post('/users', { email, role }), onSuccess: () => { setMessage('Team member added.'); setShowAdd(false); setEmail(''); void qc.invalidateQueries({ queryKey: ['staff'] }); }, onError: (e) => setMessage(e instanceof Error ? e.message : 'Could not add this team member.') });
  const staff = data?.staff ?? [];
  const remaining = Math.max(0, (data?.plannedCount ?? 0) - staff.length);
  return <div>
    <PageHeader title="Staff" description="See the people who have access to your business." actions={<button onClick={() => setShowAdd((value) => !value)} className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"><Plus className="h-4 w-4"/>Add team member</button>} />
    {message && <p role="status" className="mb-3 rounded-lg border border-border bg-card p-3 text-sm">{message}<button onClick={() => setMessage('')} className="float-right text-primary">Dismiss</button></p>}
    {showAdd && <form onSubmit={(e) => { e.preventDefault(); addMember.mutate(); }} className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"><label className="min-w-56 flex-1 text-sm">Team member’s Tally.io email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"/></label><label className="text-sm">Role<select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 rounded-lg border border-input bg-background px-3 py-2"><option value="cashier">Cashier</option><option value="manager">Manager</option><option value="inventory_manager">Inventory manager</option><option value="accountant">Accountant</option><option value="admin">Admin</option></select></label><button disabled={addMember.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">{addMember.isPending ? 'Adding…' : 'Add to team'}</button><p className="basis-full text-xs text-muted-foreground">They need to create a Tally.io account with this email first.</p></form>}
    <div className="mb-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-border bg-card p-4"><p className="text-sm text-muted-foreground">Team members</p><p className="mt-1 text-2xl font-semibold">{staff.length}</p></div><div className="rounded-xl border border-border bg-card p-4"><p className="text-sm text-muted-foreground">Staff size from setup</p><p className="mt-1 text-2xl font-semibold">{data?.plannedCount ?? '—'}</p></div></div>
    {remaining > 0 && <div className="mb-5 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm"><p className="font-medium">You said your business has {data?.plannedCount} staff.</p><p className="mt-1 text-muted-foreground">{remaining} {remaining === 1 ? 'person is' : 'people are'} not on Tally yet. Staff names appear here after their accounts are invited and linked.</p></div>}
    {isLoading ? <p className="text-sm text-muted-foreground">Loading your team…</p> : error ? <p className="rounded-lg border border-destructive/20 p-4 text-sm text-destructive">Could not load staff. Please refresh and try again.</p> : <div className="divide-y divide-border rounded-xl border border-border bg-card">{staff.map((member) => <div key={member.id} className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary"><Users className="h-5 w-5"/></div><div className="min-w-0 flex-1"><p className="font-medium">{member.name}</p><p className="flex items-center gap-1 text-sm text-muted-foreground"><Mail className="h-3.5 w-3.5"/>{member.email}</p></div><span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs capitalize"><Shield className="h-3 w-3"/>{member.role}</span></div>)}{!staff.length && <p className="p-6 text-center text-sm text-muted-foreground">No team accounts have been added yet. Your account will appear here when you refresh.</p>}</div>}
  </div>;
}
