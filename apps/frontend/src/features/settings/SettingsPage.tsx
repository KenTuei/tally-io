import { useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { useAuthStore } from '../../stores/authStore';
import { Settings, Building2, Users, CreditCard, Link, Bell, Shield, Palette } from 'lucide-react';
import { cn } from '../../lib/utils';

type SettingsTab = 'general' | 'organization' | 'users' | 'billing' | 'integrations' | 'notifications' | 'security' | 'appearance';

const tabs: Array<{ id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'organization', label: 'Organization', icon: Building2 },
  { id: 'users', label: 'Users & Roles', icon: Users },
  { id: 'billing', label: 'Subscription', icon: CreditCard },
  { id: 'integrations', label: 'Integrations', icon: Link },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
];

function ComingSoon({ feature }: { feature: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Settings className="w-6 h-6 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold">{feature}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs">
        This settings section is being implemented. It will be available in an upcoming phase.
      </p>
    </div>
  );
}

function GeneralSettings() {
  const user = useAuthStore((s) => s.user);
  const organization = useAuthStore((s) => s.organization);

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h3 className="text-sm font-semibold mb-3">Profile</h3>
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Name</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {user?.firstName} {user?.lastName}
              </p>
            </div>
            <button className="text-sm text-primary hover:underline">Edit</button>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-sm text-muted-foreground mt-0.5">{user?.email}</p>
            </div>
            <button className="text-sm text-primary hover:underline">Change</button>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Password</p>
              <p className="text-sm text-muted-foreground mt-0.5">Last changed: unknown</p>
            </div>
            <button className="text-sm text-primary hover:underline">Change</button>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">Business</h3>
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Business name</p>
              <p className="text-sm text-muted-foreground mt-0.5">{organization?.name}</p>
            </div>
            <button className="text-sm text-primary hover:underline">Edit</button>
          </div>
          <div className="px-4 py-3">
            <p className="text-sm font-medium">Business type</p>
            <p className="text-sm text-muted-foreground mt-0.5 capitalize">{organization?.businessType}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-sm font-medium">Currency</p>
            <p className="text-sm text-muted-foreground mt-0.5">{organization?.currency}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-sm font-medium">Country</p>
            <p className="text-sm text-muted-foreground mt-0.5">{organization?.country}</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">Danger Zone</h3>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive">Delete organization</p>
          <p className="text-xs text-muted-foreground mt-1">
            Permanently delete your organization and all associated data. This cannot be undone.
          </p>
          <button
            disabled
            className="mt-3 px-3 py-1.5 text-sm rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
          >
            Delete organization
          </button>
        </div>
      </div>
    </div>
  );
}

function IntegrationsSettings() {
  const integrations = [
    {
      name: 'M-Pesa Daraja',
      description: 'Accept M-Pesa payments via STK Push',
      status: 'not_configured',
      docsUrl: 'https://developer.safaricom.co.ke',
    },
    {
      name: 'KRA eTIMS',
      description: 'Kenya Revenue Authority tax fiscalization',
      status: 'research',
      docsUrl: 'https://www.kra.go.ke',
    },
    {
      name: 'Google Gemini AI',
      description: 'AI-powered business assistant',
      status: 'not_configured',
      docsUrl: 'https://ai.google.dev',
    },
    {
      name: 'Google Chat',
      description: 'Business notifications via Google Chat',
      status: 'not_configured',
      docsUrl: 'https://developers.google.com/chat',
    },
  ];

  return (
    <div className="space-y-3 max-w-xl">
      <p className="text-sm text-muted-foreground mb-4">
        Configure third-party integrations. All credentials are stored securely on the server.
      </p>
      {integrations.map((integration) => (
        <div key={integration.name} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{integration.name}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{integration.description}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {integration.status === 'not_configured' && (
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                  Not configured
                </span>
              )}
              {integration.status === 'research' && (
                <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 px-2 py-0.5 rounded-full">
                  Research needed
                </span>
              )}
              <button className="text-sm text-primary hover:underline">Configure</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  const renderContent = () => {
    switch (activeTab) {
      case 'general': return <GeneralSettings />;
      case 'integrations': return <IntegrationsSettings />;
      default: return <ComingSoon feature={tabs.find(t => t.id === activeTab)?.label ?? 'Settings'} />;
    }
  };

  return (
    <div>
      <PageHeader title="Settings" />

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-0.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left',
                    activeTab === tab.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
