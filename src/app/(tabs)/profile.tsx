import { useState } from 'react';

import { ProfileForm } from '@/components/profile-form';
import { Body, Button, Screen, Title } from '@/components/ui';
import { colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth';

export default function ProfileScreen() {
  const { session, profile, refreshProfile } = useAuth();
  const [saved, setSaved] = useState(false);
  if (!profile) return null;

  return (
    <Screen>
      <Title>Profile</Title>
      <Body muted>{session?.user.email}</Body>
      <ProfileForm
        key={profile.id}
        initial={profile}
        submitLabel="Save profile"
        onSaved={async () => {
          await refreshProfile();
          setSaved(true);
          setTimeout(() => setSaved(false), 2500);
        }}
      />
      {saved && <Body style={{ color: colors.success }}>Saved. Your coach will use this from the next plan update.</Body>}
      <Button title="Sign out" variant="danger" onPress={() => supabase.auth.signOut()} />
    </Screen>
  );
}
