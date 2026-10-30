import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Building2, Package, Users, Target, ChevronRight, ChevronLeft,
  CheckCircle, Sparkles, Store, Utensils, Scissors, Pill, Wrench,
  ShoppingBag, Smartphone, Leaf, Shirt, Briefcase, HelpCircle,
} from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { cn } from '../../lib/utils';

const BUSINESS_TYPES = [
  { value: 'retail', label: 'Retail Shop / Minimarket', icon: Store },
  { value: 'supermarket', label: 'Supermarket / Wholesale', icon: ShoppingBag },
  { value: 'salon', label: 'Salon / Kinyozi / Barbershop', icon: Scissors },
  { value: 'restaurant', label: 'Restaurant / Café / Food', icon: Utensils },
  { value: 'pharmacy', label: 'Pharmacy / Health Products', icon: Pill },
  { value: 'hardware', label: 'Hardware / Construction', icon: Wrench },
  { value: 'electronics', label: 'Electronics / Phone Accessories', icon: Smartphone },
  { value: 'agrovet', label: 'Agrovet / Farm Supplies', icon: Leaf },
  { value: 'fashion', label: 'Clothing / Fashion', icon: Shirt },
  { value: 'service', label: 'Professional Services', icon: Briefcase },
  { value: 'other', label: 'Other', icon: HelpCircle },
];

const GOALS = [
  { value: 'sales_tracking', label: 'Track sales and profits' },
  { value: 'inventory', label: 'Manage inventory' },
  { value: 'reduce_losses', label: 'Reduce stock losses' },
  { value: 'reorder', label: 'Predict when to reorder' },
  { value: 'expiry', label: 'Track expiry dates' },
  { value: 'branches', label: 'Compare branches' },
  { value: 'customers', label: 'Manage customers' },
  { value: 'expenses', label: 'Track expenses and cash flow' },
  { value: 'automation', label: 'Automated reminders and reports' },
  { value: 'ai_recommendations', label: 'AI business recommendations' },
];

const STEPS = [
  { title: 'Business type', icon: Store },
  { title: 'Business details', icon: Building2 },
  { title: 'How you operate', icon: Package },
  { title: 'Business size', icon: Users },
  { title: 'Your goals', icon: Target },
];

interface Answers {
  businessType?: string;
  businessTypeCustom?: string;
  businessName?: string;
  businessDescription?: string;
  country?: string;
  county?: string;
  currency?: string;
  phone?: string;
  hasExpiryDates?: boolean;
  sharedStock?: boolean;
  sellsWholesale?: boolean;
  numberOfStaff?: number;
  appointmentBased?: boolean;
  numberOfBranches?: number;
  numberOfEmployees?: number;
  monthlySalesRange?: string;
  expectsMoreBranches?: boolean;
  goals?: string[];
}

export function OnboardingWizard() {
  const navigate = useNavigate();
  const organization = useAuthStore((s) => s.organization);
  const updateOrganization = useAuthStore((s) => s.updateOrganization);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [planRec, setPlanRec] = useState<{
    planName: string;
    reason: string;
    alternatives: string[];
  } | null>(null);

  // Restore progress
  const { data: status } = useQuery({
    queryKey: ['onboarding-status'],
    queryFn: () => api.get<{ status: string; step: number; answers: Answers }>('/onboarding/status'),
    enabled: !!organization?.id,
  });

  useEffect(() => {
    if (status) {
      setStep(status.step ?? 0);
      const savedAnswers = status.answers ?? {};
      setAnswers({
        ...savedAnswers,
        businessName: savedAnswers.businessName ?? organization?.name,
        businessType: savedAnswers.businessType ?? organization?.businessType,
        country: savedAnswers.country ?? organization?.country,
        currency: savedAnswers.currency ?? organization?.currency,
      });
      if (status.status === 'complete') navigate('/app');
    }
  }, [status, navigate, organization]);

  const saveMutation = useMutation({
    mutationFn: (data: { step: number; answers: Answers }) =>
      api.patch('/onboarding/progress', data),
  });

  const completeMutation = useMutation({
    mutationFn: (data: { step: number; answers: Answers }) =>
      api.post('/onboarding/complete', data),
    onSuccess: () => {
      updateOrganization({
        name: answers.businessName?.trim() || organization?.name || 'My Business',
        businessType: answers.businessType || organization?.businessType || 'other',
        currency: answers.currency || organization?.currency || 'KES',
        country: answers.country || organization?.country || 'KE',
        onboardingStatus: 'complete',
      });
      navigate('/app');
    },
  });

  const recommendMutation = useMutation({
    mutationFn: (a: Answers) => api.post<{ planName: string; reason: string; alternatives: string[] }>('/onboarding/recommend-plan', { answers: a }),
    onSuccess: (data) => setPlanRec(data),
  });

  const selectPlanMutation = useMutation({
    mutationFn: (planName: string) => api.post('/onboarding/select-plan', { planName }),
    onSuccess: () => completeMutation.mutate({ step: 5, answers }),
  });

  const update = (patch: Partial<Answers>) => {
    const updated = { ...answers, ...patch };
    setAnswers(updated);
    saveMutation.mutate({ step, answers: updated });
  };

  const next = () => {
    if (step === 4) {
      recommendMutation.mutate(answers);
    }
    setStep((s) => Math.min(s + 1, 5));
    saveMutation.mutate({ step: step + 1, answers });
  };

  const back = () => setStep((s) => Math.max(s - 1, 0));

  const isService = ['salon', 'service'].includes(answers.businessType ?? '');
  const isFood = answers.businessType === 'restaurant';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">T</span>
          </div>
          <div>
            <h1 className="font-semibold text-lg">Set up your business</h1>
            <p className="text-sm text-muted-foreground">
              Step {Math.min(step + 1, 5)} of 5 — {STEPS[step]?.title ?? 'Almost done'}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 mb-8">
          {STEPS.map((s, i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                i <= step ? 'bg-primary' : 'bg-muted',
              )}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
          {/* Step 0 — Business type */}
          {step === 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-1">What kind of business do you run?</h2>
              <p className="text-sm text-muted-foreground mb-5">
                We'll customize your setup based on your business type.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {BUSINESS_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      onClick={() => update({ businessType: type.value })}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-xl border text-sm font-medium text-center transition-all',
                        answers.businessType === type.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/40 hover:bg-muted',
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      {type.label}
                    </button>
                  );
                })}
              </div>
              {answers.businessType === 'other' && (
                <input
                  className="mt-3 w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Describe your business type"
                  value={answers.businessTypeCustom ?? ''}
                  onChange={(e) => update({ businessTypeCustom: e.target.value })}
                />
              )}
            </div>
          )}

          {/* Step 1 — Business details */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold mb-1">Business details</h2>
              <div>
                <label className="block text-sm font-medium mb-1">Business name *</label>
                <input
                  className="w-full px-3 py-2.5 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="e.g. Nairobi General Store"
                  value={answers.businessName ?? ''}
                  onChange={(e) => update({ businessName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Short description</label>
                <textarea
                  className="w-full px-3 py-2.5 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  rows={2}
                  placeholder="What does your business sell or offer?"
                  value={answers.businessDescription ?? ''}
                  onChange={(e) => update({ businessDescription: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Country</label>
                  <select
                    className="w-full px-3 py-2.5 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                    value={answers.country ?? 'KE'}
                    onChange={(e) => update({ country: e.target.value })}
                  >
                    <option value="KE">Kenya</option>
                    <option value="UG">Uganda</option>
                    <option value="TZ">Tanzania</option>
                    <option value="RW">Rwanda</option>
                    <option value="ET">Ethiopia</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">County / City</label>
                  <input
                    className="w-full px-3 py-2.5 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="e.g. Nairobi"
                    value={answers.county ?? ''}
                    onChange={(e) => update({ county: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Business phone</label>
                <input
                  type="tel"
                  className="w-full px-3 py-2.5 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="+254 7XX XXX XXX"
                  value={answers.phone ?? ''}
                  onChange={(e) => update({ phone: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Step 2 — How you operate */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold mb-1">How your business operates</h2>
              {!isService && !isFood && (
                <>
                  <Toggle label="Do products have expiry dates?" value={answers.hasExpiryDates} onChange={(v) => update({ hasExpiryDates: v })} />
                  <Toggle label="Do you sell wholesale AND retail?" value={answers.sellsWholesale} onChange={(v) => update({ sellsWholesale: v })} />
                  <Toggle label="Do you track supplier/purchase costs?" value={answers.sharedStock} onChange={(v) => update({ sharedStock: v })} />
                </>
              )}
              {isService && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Number of staff</label>
                    <input
                      type="number"
                      min={1}
                      className="w-full px-3 py-2.5 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      value={answers.numberOfStaff ?? ''}
                      onChange={(e) => update({ numberOfStaff: Number(e.target.value) })}
                    />
                  </div>
                  <Toggle label="Do customers book appointments?" value={answers.appointmentBased} onChange={(v) => update({ appointmentBased: v })} />
                  <Toggle label="Do you also sell products?" value={answers.sharedStock} onChange={(v) => update({ sharedStock: v })} />
                </>
              )}
              {isFood && (
                <Toggle label="Do you track ingredient costs?" value={answers.hasExpiryDates} onChange={(v) => update({ hasExpiryDates: v })} />
              )}
            </div>
          )}

          {/* Step 3 — Business size */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold mb-1">Business size</h2>
              <div>
                <label className="block text-sm font-medium mb-1">Number of branches / locations</label>
                <input
                  type="number"
                  min={1}
                  className="w-full px-3 py-2.5 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={answers.numberOfBranches ?? 1}
                  onChange={(e) => update({ numberOfBranches: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Number of employees</label>
                <input
                  type="number"
                  min={1}
                  className="w-full px-3 py-2.5 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={answers.numberOfEmployees ?? ''}
                  onChange={(e) => update({ numberOfEmployees: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Approximate monthly sales</label>
                <select
                  className="w-full px-3 py-2.5 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                  value={answers.monthlySalesRange ?? ''}
                  onChange={(e) => update({ monthlySalesRange: e.target.value })}
                >
                  <option value="">Select range</option>
                  <option value="below_50k">Below KES 50,000</option>
                  <option value="50k_200k">KES 50,000 – 200,000</option>
                  <option value="200k_1m">KES 200,000 – 1,000,000</option>
                  <option value="above_1m">Above KES 1,000,000</option>
                </select>
              </div>
              <Toggle label="Do you expect to open more branches?" value={answers.expectsMoreBranches} onChange={(v) => update({ expectsMoreBranches: v })} />
            </div>
          )}

          {/* Step 4 — Goals */}
          {step === 4 && (
            <div>
              <h2 className="text-lg font-semibold mb-1">What are you looking to achieve?</h2>
              <p className="text-sm text-muted-foreground mb-4">Select all that apply</p>
              <div className="space-y-2">
                {GOALS.map((goal) => {
                  const selected = answers.goals?.includes(goal.value);
                  return (
                    <button
                      key={goal.value}
                      onClick={() => {
                        const current = answers.goals ?? [];
                        update({
                          goals: selected
                            ? current.filter((g) => g !== goal.value)
                            : [...current, goal.value],
                        });
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-all',
                        selected
                          ? 'border-primary bg-primary/10 text-primary font-medium'
                          : 'border-border hover:border-primary/40 hover:bg-muted',
                      )}
                    >
                      <div className={cn('w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center',
                        selected ? 'border-primary bg-primary' : 'border-muted-foreground')}>
                        {selected && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>
                      {goal.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 5 — Plan recommendation */}
          {step === 5 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Your recommended plan</h2>
              </div>
              {recommendMutation.isPending && (
                <div className="text-center py-8 text-muted-foreground">Finding the best plan for your business...</div>
              )}
              {planRec && (
                <div>
                  <div className="p-4 rounded-xl border-2 border-primary bg-primary/5 mb-4">
                    <p className="font-semibold capitalize text-lg text-primary">{planRec.planName}</p>
                    <p className="text-sm text-muted-foreground mt-1">{planRec.reason}</p>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    You can change your plan at any time from Settings → Subscription.
                  </p>
                  <button
                    onClick={() => selectPlanMutation.mutate(planRec.planName)}
                    disabled={selectPlanMutation.isPending || completeMutation.isPending}
                    className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {selectPlanMutation.isPending ? 'Setting up...' : 'Start free trial →'}
                  </button>
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    No credit card required. {14}-day free trial.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        {step < 5 && (
          <div className="flex justify-between mt-6">
            <button
              onClick={back}
              disabled={step === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm disabled:opacity-40 hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={next}
              disabled={step === 0 && !answers.businessType}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 hover:bg-primary/90 transition-colors"
            >
              {step === 4 ? 'See recommendation' : 'Continue'} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Small toggle component used inside the wizard
function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border">
      <span className="text-sm">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={cn(
          'relative w-10 h-6 rounded-full transition-colors',
          value ? 'bg-primary' : 'bg-muted',
        )}
      >
        <span className={cn(
          'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform',
          value ? 'translate-x-5' : 'translate-x-1',
        )} />
      </button>
    </div>
  );
}
