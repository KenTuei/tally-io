import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CreditCard,
  DollarSign,
  X,
  CheckCircle,
  Barcode,
  ChevronDown,
  User,
} from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { formatMoney, cn } from '../../lib/utils';
import { useAuthStore } from '../../stores/authStore';
import { usePOSSessionStore } from '../../stores/posSessionStore';
import type { Product, CartItem, CompleteSaleRequest } from '@tally/shared-types';
import { POSSessionSetup } from './POSSessionSetup';

// ---- Cart store (local to POS, no persistence needed between page navigations) ----
function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const currency = useAuthStore((s) => s.organization?.currency ?? 'KES');

  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const taxAmount = items.reduce((s, i) => s + i.taxAmount, 0);
  const total = subtotal + taxAmount;

  const addItem = useCallback((product: Product) => {
    setItems((prev) => {
      const existing = prev.find(
        (i) => i.productId === product.id && !i.variantId,
      );
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id && !i.variantId
            ? {
                ...i,
                quantity: i.quantity + 1,
                lineTotal: (i.quantity + 1) * i.unitPrice - i.discountAmount,
              }
            : i,
        );
      }
      const taxRate = 0; // TODO: load from product.taxRateId
      const taxAmount = Math.round(product.sellingPrice * taxRate);
      const newItem: CartItem = {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        barcode: product.barcode,
        quantity: 1,
        unitPrice: product.sellingPrice,
        costPrice: product.costPrice,
        discountAmount: 0,
        taxAmount,
        lineTotal: product.sellingPrice + taxAmount,
        taxInclusive: product.taxInclusive,
      };
      return [...prev, newItem];
    });
  }, []);

  const updateQty = useCallback((productId: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((i) => {
          if (i.productId !== productId) return i;
          const newQty = i.quantity + delta;
          if (newQty <= 0) return null;
          return {
            ...i,
            quantity: newQty,
            lineTotal: newQty * i.unitPrice - i.discountAmount + i.taxAmount,
          };
        })
        .filter(Boolean) as CartItem[],
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  return { items, subtotal, taxAmount, total, currency, addItem, updateQty, removeItem, clear };
}

// ---- Product search results ----
function ProductGrid({
  products,
  onAdd,
  loading,
}: {
  products: Product[];
  onAdd: (p: Product) => void;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
        <Search className="w-10 h-10 mb-2 opacity-30" />
        <p className="text-sm">No products found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {products.map((p) => (
        <button
          key={p.id}
          onClick={() => onAdd(p)}
          className="text-left p-3 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-colors group"
        >
          <div className="w-full aspect-square mb-2 rounded-md bg-muted flex items-center justify-center overflow-hidden">
            {p.images[0] ? (
              <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl select-none opacity-30">📦</span>
            )}
          </div>
          <p className="text-xs font-medium leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {p.name}
          </p>
          <p className="text-sm font-semibold font-money mt-1 text-primary">
            {formatMoney(p.sellingPrice, 'KES')}
          </p>
        </button>
      ))}
    </div>
  );
}

// ---- Payment modal ----
function PaymentModal({
  total,
  currency,
  onConfirm,
  onClose,
  isProcessing,
}: {
  total: number;
  currency: string;
  onConfirm: (method: 'cash' | 'mpesa', amountTendered: number) => void;
  onClose: () => void;
  isProcessing: boolean;
}) {
  const [method, setMethod] = useState<'cash' | 'mpesa'>('cash');
  const [tendered, setTendered] = useState('');
  const tenderedCents = Math.round(parseFloat(tendered || '0') * 100);
  const change = tenderedCents - total;

  const quickAmounts = [total, total + 5000, total + 10000, 100000, 200000, 500000];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-xl border border-border shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-base font-semibold">Payment</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Total */}
          <div className="text-center py-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Amount due</p>
            <p className="text-3xl font-bold font-money mt-1">
              {formatMoney(total, currency)}
            </p>
          </div>

          {/* Payment method */}
          <div className="flex gap-2">
            {(['cash', 'mpesa'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={cn(
                  'flex-1 py-2.5 rounded-lg border text-sm font-medium capitalize transition-colors',
                  method === m
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:bg-muted',
                )}
              >
                {m === 'cash' ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <DollarSign className="w-4 h-4" /> Cash
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    <CreditCard className="w-4 h-4" /> M-Pesa
                  </span>
                )}
              </button>
            ))}
          </div>

          {method === 'cash' && (
            <>
              <div>
                <label className="text-sm font-medium block mb-1">Amount tendered (KES)</label>
                <input
                  type="number"
                  value={tendered}
                  onChange={(e) => setTendered(e.target.value)}
                  placeholder={`Min. ${(total / 100).toFixed(2)}`}
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-lg font-money focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                />
              </div>
              {/* Quick amounts */}
              <div className="flex flex-wrap gap-2">
                {quickAmounts.map((a) => (
                  <button
                    key={a}
                    onClick={() => setTendered((a / 100).toFixed(2))}
                    className="px-3 py-1 text-xs rounded-md border border-border hover:bg-muted transition-colors font-money"
                  >
                    {formatMoney(a, currency)}
                  </button>
                ))}
              </div>
              {tenderedCents >= total && (
                <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-900/50">
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    Change
                  </span>
                  <span className="text-lg font-bold font-money text-emerald-700 dark:text-emerald-400">
                    {formatMoney(change, currency)}
                  </span>
                </div>
              )}
            </>
          )}

          {method === 'mpesa' && (
            <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground text-center">
              M-Pesa STK Push integration requires Daraja API credentials.
              <br />
              Configure in Settings → Integrations.
            </div>
          )}
        </div>

        <div className="p-5 pt-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-border text-sm hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(method, method === 'cash' ? tenderedCents : total)}
            disabled={
              isProcessing ||
              (method === 'cash' && tenderedCents < total) ||
              method === 'mpesa'
            }
            className="flex-2 flex-grow py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? 'Processing...' : 'Confirm Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Main POS page ----
export function POSPage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [saleComplete, setSaleComplete] = useState<{ id: string; receiptNumber: string } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const cart = useCart();
  const { tenantId } = { tenantId: useAuthStore((s) => s.organization?.id) ?? '' };
  const session = usePOSSessionStore();

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  // Gate: require open session before POS is usable
  if (!session.isOpen) {
    return <POSSessionSetup />;
  }

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['pos-products', search, selectedCategory],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (selectedCategory) params.set('categoryId', selectedCategory);
      params.set('limit', '48');
      return api.get<Product[]>(`/products?${params.toString()}`);
    },
    staleTime: 30_000,
  });

  const { data: categories = [] } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ['categories'],
    queryFn: () => api.get('/products/categories'),
    staleTime: 60_000 * 5,
  });

  const completeSaleMutation = useMutation({
    mutationFn: (req: CompleteSaleRequest) =>
      api.post<{ id: string; receiptNumber: string }>('/sales', req),
    onSuccess: (data) => {
      setShowPayment(false);
      setSaleComplete({ id: data.id, receiptNumber: data.receiptNumber });
      cart.clear();
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const handlePaymentConfirm = (method: 'cash' | 'mpesa', amountTendered: number) => {
    if (cart.items.length === 0) return;
    completeSaleMutation.mutate({
      branchId: session.branchId ?? '',
      registerId: session.registerId ?? '',
      shiftId: session.shiftId ?? '',
      items: cart.items.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
        discountAmount: i.discountAmount,
      })),
      payments: [{ method, amount: amountTendered }],
      deviceId: localStorage.getItem('tally-device-id') ?? 'web',
      clientTimestamp: new Date().toISOString(),
    });
  };

  if (saleComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-semibold">Sale complete!</h2>
        <p className="text-muted-foreground mt-1">
          Receipt <span className="font-mono font-medium">{saleComplete.receiptNumber}</span>
        </p>
        <div className="flex gap-3 mt-6">
          <button
            onClick={async () => {
              if (!saleComplete?.id) return;
              try {
                const accessToken = useAuthStore.getState().accessToken ?? '';
                const res = await fetch(`/api/v1/sales/${saleComplete.id}/receipt.pdf`, {
                  headers: { Authorization: `Bearer ${accessToken}` },
                });
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `receipt-${saleComplete.receiptNumber}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
              } catch { /* silent */ }
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
          >
            Download receipt
          </button>
          <button
            onClick={() => setSaleComplete(null)}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            New sale
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)] -mx-4 sm:-mx-6 px-4 sm:px-6">
      {/* Left: Product browser */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Search + barcode */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products or scan barcode..."
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            title="Barcode scanner mode"
            className="px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
          >
            <Barcode className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Category filter */}
        {categories.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1 flex-shrink-0">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                !selectedCategory
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border hover:bg-muted',
              )}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                  selectedCategory === c.id
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border hover:bg-muted',
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Products */}
        <div className="flex-1 overflow-y-auto">
          <ProductGrid
            products={products}
            onAdd={cart.addItem}
            loading={productsLoading}
          />
        </div>
      </div>

      {/* Right: Cart */}
      <div className="w-72 xl:w-80 flex flex-col flex-shrink-0 rounded-xl border border-border bg-card overflow-hidden">
        {/* Cart header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">
              Cart {cart.items.length > 0 && `(${cart.items.length})`}
            </span>
          </div>
          {cart.items.length > 0 && (
            <button
              onClick={cart.clear}
              className="text-xs text-destructive hover:underline"
            >
              Clear
            </button>
          )}
        </div>

        {/* Customer selector */}
        <button className="flex items-center gap-2 px-4 py-2 border-b border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
          <User className="w-4 h-4" />
          <span>Add customer (optional)</span>
        </button>

        {/* Line items */}
        <div className="flex-1 overflow-y-auto">
          {cart.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
              <ShoppingCart className="w-10 h-10 mb-2 opacity-20" />
              <p className="text-sm">Cart is empty</p>
              <p className="text-xs mt-1">Search or scan to add products</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {cart.items.map((item) => (
                <div key={item.productId} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-tight line-clamp-2 flex-1">
                      {item.productName}
                    </p>
                    <button
                      onClick={() => cart.removeItem(item.productId)}
                      className="p-0.5 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => cart.updateQty(item.productId, -1)}
                        className="w-6 h-6 rounded-md border border-border flex items-center justify-center hover:bg-muted transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        onClick={() => cart.updateQty(item.productId, 1)}
                        className="w-6 h-6 rounded-md border border-border flex items-center justify-center hover:bg-muted transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-sm font-semibold font-money">
                      {formatMoney(item.lineTotal, cart.currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals + pay */}
        <div className="border-t border-border p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-money">{formatMoney(cart.subtotal, cart.currency)}</span>
          </div>
          {cart.taxAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span className="font-money">{formatMoney(cart.taxAmount, cart.currency)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold pt-1 border-t border-border">
            <span>Total</span>
            <span className="font-money">{formatMoney(cart.total, cart.currency)}</span>
          </div>
          <button
            onClick={() => setShowPayment(true)}
            disabled={cart.items.length === 0}
            className="w-full mt-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Pay {cart.items.length > 0 && formatMoney(cart.total, cart.currency)}
          </button>
        </div>
      </div>

      {/* Payment modal */}
      {showPayment && (
        <PaymentModal
          total={cart.total}
          currency={cart.currency}
          onConfirm={handlePaymentConfirm}
          onClose={() => setShowPayment(false)}
          isProcessing={completeSaleMutation.isPending}
        />
      )}
    </div>
  );
}
