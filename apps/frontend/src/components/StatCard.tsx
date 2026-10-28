import { cn } from '../lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  description?: string;
  loading?: boolean;
}

export function StatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  description,
  loading = false,
}: StatCardProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 animate-pulse">
        <div className="h-4 bg-muted rounded w-24 mb-3" />
        <div className="h-8 bg-muted rounded w-32 mb-2" />
        <div className="h-3 bg-muted rounded w-20" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground font-medium truncate">{title}</p>
          <p className="text-2xl font-semibold font-money mt-1 tabular-nums">{value}</p>
          {(change ?? description) && (
            <p
              className={cn(
                'text-xs mt-1.5',
                changeType === 'positive' && 'text-emerald-600',
                changeType === 'negative' && 'text-rose-600',
                changeType === 'neutral' && 'text-muted-foreground',
              )}
            >
              {change ?? description}
            </p>
          )}
        </div>
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 ml-3">
          <Icon className="w-5 h-5 text-primary" />
        </div>
      </div>
    </div>
  );
}
