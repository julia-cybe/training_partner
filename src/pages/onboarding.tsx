import { emptyProfile, ProfileForm } from '@/components/profile-form';
import { Body, Title } from '@/components/ui';
import { useAuth } from '@/providers/auth';

export default function OnboardingPage() {
  const { session, refreshProfile } = useAuth();
  if (!session) return null;
  return (
    <main className="page">
      <Title>Meet your coach</Title>
      <Body muted>Tell your coach about yourself. The more specific you are about goals, maxes and limitations, the better your plan.</Body>
      <ProfileForm initial={emptyProfile(session.user.id)} submitLabel="Continue" onSaved={refreshProfile} />
    </main>
  );
}
