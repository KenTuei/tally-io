import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ShoppingCart, Store, CreditCard, DollarSign } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { usePOSSessionStore } from '../../stores/posSessionStore';
import { cn } from '../../lib/utils';

interface Branch { id: string; name: string; code: string; }
interface Register { id: string; name: string; branchId: string; currentShiftId?: string; }

export function POSSessionSetup() {
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedRegister, setSelectedRegister] = useState('');
  const [openingFloat, setOpeningFloat] = useState('0');
  const [error, setError] = useState('');
  const setSession = usePOSSessionStore((s) => s.setSession);

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: () => api.get<Branch[]>('/branches'),
  });

  const { data: registers = [] } = useQuery<Register[]>({
    queryKey: ['registers'],
    queryFn: () => api.get<Register[]>('/branches/registers'),
    enabled: !!selectedBranch,
  });

  const branchRegisters = registers.filter((r) => r.branchId === selectedBranch);

  const openShiftMutation = useMutation({
    mutationFn: () =>
      api.post<{ id: string }>('/branches/shifts/open', {
        branchId: selectedBranch,
        registerId: selectedRegister,
        openingFloat: Math.round(parseFloat(openingFloat || '0') * 100),
      }),
    onSuccess: (data) => {
      const branch = branches.find((b) => b.id === selectedBranch);
      const register = branchRegisters.find((r) => r.id === selectedRegister);
      setSession({
        branchId: selectedBranch,
        branchName: branch?.name ?? '',
        registerId: selectedRegister,
        registerName: register?.name ?? '',
        shiftId: data.id,
      });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Failed to open shift'),
  });

  const canOpen = selectedBranch && selectedRegister;

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <ShoppingCart className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold">Open POS Session</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Select a branch and register to start selling
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-destructive/10 text-sm text-destructive text-center">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Branch */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Branch / Location</label>
            {branches.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-border text-center text-sm text-muted-foreground">
                No branches found.{' '}
                <a href="/app/branches" className="text-primary hover:underline">Add a branch first</a>
              </div>
            ) : (
              <div className="grid gap-2">
                {branches.map((branch) => (
                  <button
                    key={branch.id}
                    onClick={() => { setSelectedBranch(branch.id); setSelectedRegister(''); }}
                    className={cn(
                      'flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all',
                      selectedBranch === branch.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-slate-300',
                    )}
                  >
                    <div className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                      selectedBranch === branch.id ? 'bg-primary/10' : 'bg-muted',
                    )}>
                      <Store className={cn('w-4 h-4', selectedBranch === branch.id ? 'text-primary' : 'text-muted-foreground')} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{branch.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{branch.code}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Register */}
          {selectedBranch && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Register</label>
              {branchRegisters.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-border text-center text-sm text-muted-foreground">
                  No registers for this branch.{' '}
                  <a href="/app/registers" className="text-primary hover:underline">Add a register</a>
                </div>
              ) : (
                <div className="grid gap-2">
                  {branchRegisters.map((reg) => (
                    <button
                      key={reg.id}
                      onClick={() => setSelectedRegister(reg.id)}
                      className={cn(
                        'flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all',
                        selectedRegister === reg.id ? 'border-primary bg-primary/5' : 'border-border hover:border-slate-300',
                      )}
                    >
                      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                        selectedRegister === reg.id ? 'bg-primary/10' : 'bg-muted')}>
                        <CreditCard className={cn('w-4 h-4', selectedRegister === reg.id ? 'text-primary' : 'text-muted-foreground')} />
                      </div>
                      <p className="text-sm font-medium">{reg.name}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Opening float */}
          {selectedRegister && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Opening cash float</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Count the cash in the register before opening
              </p>
            </div>
          )}

          {/* Open button */}
          <button
            onClick={() => openShiftMutation.mutate()}
            disabled={!canOpen || openShiftMutation.isPending}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors mt-2"
          >
            {openShiftMutation.isPending ? 'Opening session…' : 'Open POS Session'}
          </button>
        </div>
      </div>
    </div>
  );
}
