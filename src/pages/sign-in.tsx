import { Dumbbell } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { Body, Button, Card, ErrorText, errorMessage, Field } from '@/components/ui';
import { supabase } from '@/lib/supabase';

export default function SignInPage() {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === 'signIn') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        if (!data.session) setNotice('Check your email to confirm your account, then sign in.');
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page">
      <div className="hero">
        <div className="logo"><Dumbbell size={34} color="#fff" /></div>
        <div className="brand">Training Partner</div>
        <Body muted>Your AI coach for CrossFit and hybrid training.</Body>
      </div>
      <form onSubmit={submit}>
        <Card>
          <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email"
            autoCapitalize="none" inputMode="email" placeholder="you@example.com" required />
          <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'} placeholder="At least 6 characters" minLength={6} required />
          <ErrorText error={error} />
          {notice && <p className="success">{notice}</p>}
          <Button type="submit" onClick={undefined} title={mode === 'signIn' ? 'Sign in' : 'Create account'} loading={busy}
            disabled={!email || password.length < 6} />
          <Button variant="ghost" title={mode === 'signIn' ? 'New here? Create an account' : 'Have an account? Sign in'}
            onClick={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')} style={{ alignSelf: 'center' }} />
        </Card>
      </form>
    </main>
  );
}
