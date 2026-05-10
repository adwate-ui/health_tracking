import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/auth';
import { ThemeProvider } from '@/lib/theme';
import { RequireAuth, RequireOnboarded } from '@/lib/guards';
import { SignInPage } from '@/pages/SignInPage';
import { AuthCallbackPage } from '@/pages/AuthCallbackPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { TodayPage } from '@/pages/TodayPage';
import { BodyPage } from '@/pages/BodyPage';
import { TrendsPage } from '@/pages/TrendsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { DesignSystemPage } from '@/pages/DesignSystemPage';
import { Navigation } from '@/components/Navigation';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AppRoutes() {
  const location = useLocation();
  return (
    <>
      <main className="min-h-screen bg-surface-base">
        <Routes>
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/design-system" element={<DesignSystemPage />} />

          <Route
            path="/onboarding"
            element={
              <RequireAuth>
                <OnboardingPage />
              </RequireAuth>
            }
          />
          <Route
            path="/"
            element={
              <RequireAuth>
                <RequireOnboarded>
                  <TodayPage />
                </RequireOnboarded>
              </RequireAuth>
            }
          />
          <Route
            path="/body"
            element={
              <RequireAuth>
                <RequireOnboarded>
                  <BodyPage />
                </RequireOnboarded>
              </RequireAuth>
            }
          />
          <Route
            path="/trends"
            element={
              <RequireAuth>
                <RequireOnboarded>
                  <TrendsPage />
                </RequireOnboarded>
              </RequireAuth>
            }
          />
          <Route
            path="/settings"
            element={
              <RequireAuth>
                <RequireOnboarded>
                  <SettingsPage />
                </RequireOnboarded>
              </RequireAuth>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {location.pathname !== '/onboarding' &&
        location.pathname !== '/signin' &&
        location.pathname !== '/auth/callback' &&
        location.pathname !== '/design-system' && (
          <Navigation />
        )}
    </>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
