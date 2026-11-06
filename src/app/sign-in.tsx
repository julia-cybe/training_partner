import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { Body, Button, Card, ErrorText, errorMessage, Field, Screen } from '@/components/ui';
import { colors, space } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function SignIn() {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async () => {
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
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <View style={styles.hero}>
          <View style={styles.logo}><Ionicons name="barbell" size={34} color="#fff" /></View>
          <Text style={styles.brand}>Training Partner</Text>
          <Body muted style={{ textAlign: 'center' }}>Your AI coach for CrossFit and hybrid training.</Body>
        </View>
        <Card>
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email"
            keyboardType="email-address" placeholder="you@example.com" />
          <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry
            autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'} placeholder="At least 6 characters"
            onSubmitEditing={submit} />
          <ErrorText error={error} />
          {notice ? <Body style={{ color: colors.success }}>{notice}</Body> : null}
          <Button title={mode === 'signIn' ? 'Sign in' : 'Create account'} onPress={submit} loading={busy}
            disabled={!email || password.length < 6} style={{ marginTop: space.sm }} />
          <Button variant="ghost" title={mode === 'signIn' ? 'New here? Create an account' : 'Have an account? Sign in'}
            onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')} />
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.md, paddingTop: space.xxl * 2, paddingBottom: space.lg },
  logo: { width: 72, height: 72, borderRadius: 20, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  brand: { color: colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
});
