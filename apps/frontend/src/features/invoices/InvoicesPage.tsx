import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, FileText, Download, Eye, MoreHorizontal,
  CheckCircle, Clock, AlertCircle, XCircle, Send, Copy,
} from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { api, ApiError } from '../../lib/api';
import { formatMoney, formatDate, cn } from '../../lib/utils';
import { useAuthStore } from '../../stores/authStore';
import { CreateInvoiceModal } from './CreateInvoiceModal';

type InvoiceType = 'invoice' | 'quote';

interface Invoice {
  id: string;
  invoiceNumber: string;
  type: InvoiceType;
  status: string;
  customerName: string;
  issueDate: string;
  dueDate?: string;
  total: number;
  balanceDue: number;
  amountPaid: number;
  currency: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-600', icon: FileText },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700', icon: Send },
  viewed: { label: 'Viewed', color: 'bg-purple-100 text-purple-700', icon: Eye },
  partial: { label: 'Partial', color: 'bg-amber-100 text-amber-700', icon: Clock },
  paid: { label: 'Paid', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  overdue: { label: 'Overdue', color: 'bg-red-100 text-red-700', icon: AlertCircle },
  cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-500', icon: XCircle },
  void: { label: 'Void', color: 'bg-slate-100 text-slate-500', icon: XCircle },
};

export function InvoicesPage() {
  const [tab, setTab] = useState<InvoiceType>('invoice');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const currency = useAuthStore((s) => s.organization?.currency ?? 'KES');
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<{
    data: Invoice[];
    pagination: { total: number; totalPages: number };
  }>({
    queryKey: ['invoices', tab, search, page],
    queryFn: () => {
      const params = new URLSearchParams({ type: tab, page: String(page), limit: '25' });
      if (search) params.set('q', search);
      return api.get(`/invoices?${params}`);
    },
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => api.post(`/invoices/${id}/send`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  });

  const voidMutation = useMutation({
    mutationFn: (id: string) => api.post(`/invoices/${id}/void`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  });

  const handleDownloadPDF = async (id: string, invoiceNumber: string) => {
    try {
      const response = await fetch(`/api/v1/invoices/${id}/pdf`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('tally-access-token') ?? ''}` },
      });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // handle error
    }
  };

  const invoices = data?.data ?? [];
  const pagination = data?.pagination;

  // Summary stats
  const outstanding = invoices.filter((i) => ['sent', 'viewed', 'partial', 'overdue'].includes(i.status))
    .reduce((s, i) => s + i.balanceDue, 0);
  const overdue = invoices.filter((i) => i.status === 'overdue').length;

  return (
    <div>
      <PageHeader
        title={tab === 'invoice' ? 'Invoices' : 'Quotations'}
        description={pagination ? `${pagination.total} ${tab === 'invoice' ? 'invoices' : 'quotes'}` : undefined}
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New {tab === 'invoice' ? 'invoice' : 'quote'}
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit mb-5">
        {(['invoice', 'quote'] as InvoiceType[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(1); }}
            className={cn('px-4 py-1.5 text-sm rounded-md capitalize transition-colors font-medium',
              tab === t ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground')}
          >
            {t === 'invoice' ? 'Invoices' : 'Quotes'}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      {tab === 'invoice' && invoices.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p className="text-lg font-bold font-money mt-1">{formatMoney(outstanding, currency)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Overdue</p>
            <p className={cn('text-lg font-bold mt-1', overdue > 0 ? 'text-destructive' : 'text-foreground')}>
              {overdue} invoice{overdue !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">This page</p>
            <p className="text-lg font-bold mt-1">{invoices.length}</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by number or customer..."
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-sm text-destructive">
          Could not load {tab}s.
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 animate-pulse">
                <div className="h-4 bg-muted rounded w-24" />
                <div className="h-4 bg-muted rounded w-32 flex-1" />
                <div className="h-6 bg-muted rounded-full w-16" />
                <div className="h-4 bg-muted rounded w-20" />
              </div>
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={`No ${tab === 'invoice' ? 'invoices' : 'quotes'} yet`}
            description={tab === 'invoice'
              ? 'Create invoices for your customers and track payments.'
              : 'Create quotes and convert them to invoices when accepted.'}
            action={
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground"
              >
                <Plus className="w-4 h-4" /> Create first {tab === 'invoice' ? 'invoice' : 'quote'}
              </button>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-[1.2fr_2fr_1fr_1fr_1fr_auto] gap-3 px-4 py-2.5 border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <span>Number</span>
              <span>Customer</span>
              <span>Date</span>
              <span>Status</span>
              <span className="text-right">Amount</span>
              <span className="w-8" />
            </div>
            <div className="divide-y divide-border">
              {invoices.map((inv) => {
                const statusCfg = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG['draft']!;
                const StatusIcon = statusCfg.icon;
                return (
                  <div key={inv.id} className="grid grid-cols-[1.2fr_2fr_1fr_1fr_1fr_auto] gap-3 px-4 py-3 items-center hover:bg-muted/20 transition-colors">
                    <span className="text-sm font-mono font-medium">{inv.invoiceNumber}</span>
                    <span className="text-sm truncate">{inv.customerName}</span>
                    <span className="text-sm text-muted-foreground">{formatDate(inv.issueDate)}</span>
                    <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium w-fit', statusCfg.color)}>
                      <StatusIcon className="w-3 h-3" />
                      {statusCfg.label}
                    </span>
                    <div className="text-right">
                      <p className="text-sm font-semibold font-money">{formatMoney(inv.total, currency)}</p>
                      {inv.balanceDue > 0 && inv.balanceDue < inv.total && (
                        <p className="text-xs text-amber-600">Due: {formatMoney(inv.balanceDue, currency)}</p>
                      )}
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setActionMenu(actionMenu === inv.id ? null : inv.id)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {actionMenu === inv.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setActionMenu(null)} />
                          <div className="absolute right-0 top-full mt-1 w-44 bg-card border border-border rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                            <button
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
                              onClick={() => { handleDownloadPDF(inv.id, inv.invoiceNumber); setActionMenu(null); }}
                            >
                              <Download className="w-4 h-4 text-muted-foreground" />
                              Download PDF
                            </button>
                            {inv.status === 'draft' && (
                              <button
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
                                onClick={() => { sendMutation.mutate(inv.id); setActionMenu(null); }}
                              >
                                <Send className="w-4 h-4 text-muted-foreground" />
                                Mark as sent
                              </button>
                            )}
                            <button
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
                              onClick={() => { setActionMenu(null); }}
                            >
                              <Copy className="w-4 h-4 text-muted-foreground" />
                              Duplicate
                            </button>
                            {!['paid', 'void', 'cancelled'].includes(inv.status) && (
                              <button
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                                onClick={() => { voidMutation.mutate(inv.id); setActionMenu(null); }}
                              >
                                <XCircle className="w-4 h-4" />
                                Void
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
                <p className="text-xs text-muted-foreground">{pagination.total} {tab}s · Page {page} of {pagination.totalPages}</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage((p) => p - 1)} disabled={page <= 1} className="px-3 py-1 text-xs rounded-md border border-border disabled:opacity-40 hover:bg-muted">Previous</button>
                  <button onClick={() => setPage((p) => p + 1)} disabled={page >= pagination.totalPages} className="px-3 py-1 text-xs rounded-md border border-border disabled:opacity-40 hover:bg-muted">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showCreate && (
        <CreateInvoiceModal
          type={tab}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            void queryClient.invalidateQueries({ queryKey: ['invoices'] });
          }}
        />
      )}
    </div>
  );
}
