import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { AppShell } from '../layouts/AppShell';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { OnboardingWizard } from '../features/onboarding/OnboardingWizard';
import { OverviewPage } from '../features/overview/OverviewPage';
import { POSPage } from '../features/pos/POSPage';
import { ProductsPage } from '../features/products/ProductsPage';
import { SalesPage } from '../features/sales/SalesPage';
import { InventoryPage } from '../features/inventory/InventoryPage';
import { ReportsPage } from '../features/reports/ReportsPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { AIAssistantPage } from '../features/ai/AIAssistantPage';
import { BranchesPage } from '../features/branches/BranchesPage';
import { CustomersPage } from '../features/customers/CustomersPage';
import { ExpensesPage } from '../features/expenses/ExpensesPage';
import { RegistersPage } from '../features/registers/RegistersPage';
import { StaffPage } from '../features/staff/StaffPage';
import { NotificationsPage } from '../features/notifications/NotificationsPage';
import { SuppliersPage } from '../features/suppliers/SuppliersPage';
import { PurchasingPage } from '../features/purchasing/PurchasingPage';
import { NotFoundPage } from '../components/NotFoundPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, organization } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to onboarding if not complete (but not if already on onboarding page)
  if (organization?.onboardingStatus && organization.onboardingStatus !== 'complete') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

      {/* Onboarding — authenticated but may be incomplete */}
      <Route path="/onboarding" element={<OnboardingRoute><OnboardingWizard /></OnboardingRoute>} />

      {/* Protected app routes */}
      <Route path="/" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route index element={<OverviewPage />} />
        <Route path="pos" element={<POSPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="sales" element={<SalesPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="registers" element={<RegistersPage />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="suppliers" element={<SuppliersPage />} />
        <Route path="purchasing" element={<PurchasingPage />} />
        <Route path="branches" element={<BranchesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="ai" element={<AIAssistantPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
