import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, ChevronRight, X, Circle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { cn } from '../lib/utils';

interface ChecklistStep {
  id: string;
  title: string;
  description: string;
  action: string;
  actionUrl: string;
  completed: boolean;
  dismissed: boolean;
}

interface ChecklistData {
  steps: ChecklistStep[];
  completedCount: number;
  totalCount: number;
  allComplete: boolean;
  hidden: boolean;
}

export function SetupChecklist() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<ChecklistData>({
    queryKey: ['setup-checklist'],
    queryFn: () => api.get('/onboarding/setup-checklist'),
    staleTime: 60_000,
  });

  const completeMutation = useMutation({
    mutationFn: (stepId: string) => api.patch(`/onboarding/setup-checklist/${stepId}/complete`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['setup-checklist'] }),
  });

  const hideMutation = useMutation({
    mutationFn: () => api.patch('/onboarding/setup-checklist/hide', {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['setup-checklist'] }),
  });

  if (isLoading || !data || data.hidden || data.allComplete) return null;

  const pct = Math.round((data.completedCount / data.totalCount) * 100);

  return (
    <div className="rounded-2xl border border-border bg-card mb-6">
      {/* Header */}
      <div className="flex items-start justify-between p-5 pb-4">
        <div>
          <h2 className="text-base font-semibold">Set up your business to start selling</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data.completedCount} of {data.totalCount} steps completed
          </p>
          {/* Progress bar */}
          <div className="mt-3 w-64 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <button
          onClick={() => hideMutation.mutate()}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Hide setup checklist"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Steps */}
      <div className="border-t border-border divide-y divide-border">
        {data.steps.map((step) => (
          <div key={step.id} className={cn('flex items-center gap-4 px-5 py-3.5 group', step.completed && 'opacity-60')}>
            <div className="flex-shrink-0">
              {step.completed ? (
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground/40" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm font-medium', step.completed && 'line-through text-muted-foreground')}>
                {step.title}
              </p>
              {!step.completed && (
                <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
              )}
            </div>
            {!step.completed && (
              <button
                onClick={() => {
                  completeMutation.mutate(step.id);
                  navigate(step.actionUrl);
                }}
                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline flex-shrink-0"
              >
                {step.action}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
