import { useState } from 'react';

import { ProfileForm } from '@/components/profile-form';
import { Body, Button, Title } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth';

export default function ProfilePage() {
  const { session, profile, refreshProfile } = useAuth();
  const [saved, setSaved] = useState(false);
  if (!profile) return null;

  return (
    <>
      <Title>Profile</Title>
      <Body muted>{session?.user.email}</Body>
      <ProfileForm key={profile.id} initial={profile} submitLabel="Save profile" onSaved={async () => {
        await refreshProfile();
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }} />
      {saved && <p className="success">Saved. Your coach will use this from the next plan update.</p>}
      <Button title="Sign out" variant="danger" onClick={() => supabase.auth.signOut()} style={{ alignSelf: 'center' }} />
    </>
  );
}
