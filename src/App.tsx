import { Navigate, Route, Routes } from 'react-router-dom';

import { Spinner } from '@/components/ui';
import { TabsLayout } from '@/components/tabs-layout';
import { isConfigured } from '@/lib/supabase';
import ActivitiesPage from '@/pages/activities';
import CalendarPage from '@/pages/calendar';
import CoachPage from '@/pages/coach';
import OnboardingPage from '@/pages/onboarding';
import ProfilePage from '@/pages/profile';
import SignInPage from '@/pages/sign-in';
import WorkoutPage from '@/pages/workout';
import { AuthProvider, useAuth } from '@/providers/auth';

function Gate() {
  const { loading, session, profile } = useAuth();

  if (loading) return <div className="center"><Spinner /></div>;
  if (!session) return <SignInPage />;
  if (!profile) return <OnboardingPage />;

  return (
    <Routes>
      <Route element={<TabsLayout />}>
        <Route index element={<CalendarPage />} />
        <Route path="coach" element={<CoachPage />} />
        <Route path="activities" element={<ActivitiesPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="workout/:id" element={<WorkoutPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  if (!isConfigured) {
    return (
      <main className="page" style={{ justifyContent: 'center', minHeight: '100dvh' }}>
        <h1 className="title">Supabase isn't configured</h1>
        <p className="body muted">
          Copy .env.example to .env, add your Supabase publishable key, then restart `npm run dev`. On Vercel, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
        </p>
      </main>
    );
  }
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
