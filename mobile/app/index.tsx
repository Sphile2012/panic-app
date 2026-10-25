import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { Link } from 'expo-router';
import * as Linking from 'expo-linking';
import { getApiBaseUrl, verifyApiSession } from '../src/lib/backend';
import { getSupabaseClient, isSupabaseConfigured } from '../src/lib/supabase';
import { formatAuthError, SIGNUP_CONFIRMATION_MESSAGE } from '../src/lib/auth-messages';
import { colors } from '../src/lib/theme';

type AuthMode = 'sign-in' | 'sign-up';

export default function HomeScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState<'error' | 'info'>('error');
  const [backendStatus, setBackendStatus] = useState('Checking backend connection…');
  const [backendBusy, setBackendBusy] = useState(false);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) {
      setBackendStatus('Add the Supabase and API values to mobile/.env to connect.');
      return;
    }

    let active = true;
    const client = getSupabaseClient();
    void client.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setMessage(formatAuthError(error.message));
        return;
      }
      setSession(data.session);
    }).catch((error: unknown) => {
      if (active) setMessage(error instanceof Error ? error.message : 'Could not restore your session.');
    });

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setSession(nextSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [configured]);

  useEffect(() => {
    if (!session) {
      setBackendStatus('Sign in to verify your account with the API.');
      return;
    }

    let active = true;
    setBackendBusy(true);
    void verifyApiSession(session.access_token).then((user) => {
      if (active) setBackendStatus(`API verified account ${user.id.slice(0, 8)}…`);
    }).catch((error: unknown) => {
      if (active) {
        setBackendStatus(error instanceof Error ? error.message : 'The API could not verify your account.');
      }
    }).finally(() => {
      if (active) setBackendBusy(false);
    });

    return () => {
      active = false;
    };
  }, [session]);

  async function submitAuth() {
    const client = getSupabaseClient();
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      setMessage('Enter your email address and password.');
      return;
    }
    if (mode === 'sign-up' && password.length < 8) {
      setMessage('Password must be at least 8 characters.');
      return;
    }

    setBusy(true);
    setMessage('');
    setMessageKind('error');
    try {
      if (mode === 'sign-in') {
        const { data, error } = await client.auth.signInWithPassword({ email: normalizedEmail, password });
        if (error) throw error;
        if (!data.session) {
          setMessage('Sign-in succeeded, but your session could not be restored. Please try again.');
          return;
        }
        setSession(data.session);
      } else {
        const { data, error } = await client.auth.signUp({
          email: normalizedEmail,
          password,
          options: { emailRedirectTo: Linking.createURL('auth/callback') },
        });
        if (error) throw error;
        if (data.session) setSession(data.session);
        else {
          setMessage(SIGNUP_CONFIRMATION_MESSAGE);
          setMessageKind('info');
        }
      }
    } catch (error) {
      setMessage(formatAuthError(error instanceof Error ? error.message : 'Account request failed. Please try again.'));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    try {
      const { error } = await getSupabaseClient().auth.signOut();
      if (error) throw error;
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not sign out.');
    }
  }

  async function checkBackend() {
    setBackendBusy(true);
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/health`);
      const result: unknown = await response.json();
      if (!response.ok) {
        const detail = typeof result === 'object' && result !== null && 'error' in result
          && typeof result.error === 'string' ? result.error : `API returned HTTP ${response.status}.`;
        throw new Error(detail);
      }
      setBackendStatus('API and Supabase are reachable.');
    } catch (error) {
      setBackendStatus(error instanceof Error ? error.message : 'Could not reach the API.');
    } finally {
      setBackendBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.brandMark} accessibilityLabel="Panic Ring logo">
            <View style={styles.brandMarkInner} />
          </View>
          <Text style={styles.eyebrow}>A LITTLE MORE PREPARED</Text>
          <Text style={styles.title}>Panic Ring</Text>
          <Text style={styles.subtitle}>
            A privacy-first foundation for personal safety planning.
          </Text>
        </View>

        <View style={styles.card}>
          {session ? (
            <>
              <Text style={styles.cardTitle}>You’re signed in</Text>
              <Text style={styles.body}>{session.user.email ?? 'Your Panic Ring account is ready.'}</Text>
              <View style={styles.statusRow}>
                {backendBusy && <ActivityIndicator color={colors.accent} />}
                <Text style={styles.statusText}>{backendStatus}</Text>
              </View>
              <Pressable style={styles.secondaryButton} onPress={checkBackend} disabled={backendBusy}>
                <Text style={styles.secondaryButtonText}>Check connection</Text>
              </Pressable>
              
              <View style={styles.menuGrid}>
                <Link href="/sos" asChild>
                  <Pressable style={styles.menuButton}>
                    <Text style={styles.menuButtonText}>🆘 SOS Alert</Text>
                  </Pressable>
                </Link>
                <Link href="/circle" asChild>
                  <Pressable style={styles.menuButton}>
                    <Text style={styles.menuButtonText}>👥 Trusted Circle</Text>
                  </Pressable>
                </Link>
                <Link href="/live-location" asChild>
                  <Pressable style={styles.menuButton}>
                    <Text style={styles.menuButtonText}>📍 Live Location</Text>
                  </Pressable>
                </Link>
                <Link href="/notes" asChild>
                  <Pressable style={styles.menuButton}>
                    <Text style={styles.menuButtonText}>🔒 Private Notes</Text>
                  </Pressable>
                </Link>
                <Link href="/safety-plan" asChild>
                  <Pressable style={styles.menuButton}>
                    <Text style={styles.menuButtonText}>🛡️ Safety Plan</Text>
                  </Pressable>
                </Link>
                <Link href="/emergency" asChild>
                  <Pressable style={styles.menuButton}>
                    <Text style={styles.menuButtonText}>🚨 Emergency</Text>
                  </Pressable>
                </Link>
              </View>
              
              <Link href="/change-password" style={styles.aboutLink}>Change password</Link>
              <Pressable style={styles.textButton} onPress={signOut}>
                <Text style={styles.textButtonText}>Sign out</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.cardTitle}>
                {mode === 'sign-in' ? 'Welcome back' : 'Create your account'}
              </Text>
              <Text style={styles.body}>
                {mode === 'sign-in'
                  ? 'Sign in to connect your Panic Ring account.'
                  : 'Use your email to create a secure account.'}
              </Text>
              {!configured && (
                <Text style={styles.warning}>
                  Supabase is not configured. Copy mobile/.env.example to mobile/.env and add your project URL and anon key.
                </Text>
              )}
              <Text style={styles.label}>Email address</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder="you@example.com"
                placeholderTextColor={colors.placeholder}
                textContentType="emailAddress"
                accessibilityLabel="Email address"
              />
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                placeholder="At least 8 characters"
                placeholderTextColor={colors.placeholder}
                secureTextEntry
                textContentType={mode === 'sign-in' ? 'password' : 'newPassword'}
                accessibilityLabel="Password"
              />
              {message ? <Text style={[styles.message, messageKind === 'info' && styles.infoMessage]} accessibilityLiveRegion="polite">{message}</Text> : null}
              <Pressable
                style={[styles.primaryButton, (!configured || busy) && styles.disabledButton]}
                onPress={submitAuth}
                disabled={!configured || busy}
                accessibilityRole="button"
              >
                {busy
                  ? <ActivityIndicator color={colors.text} />
                  : <Text style={styles.primaryButtonText}>
                    {mode === 'sign-in' ? 'Sign in' : 'Create account'}
                  </Text>}
              </Pressable>
              <Pressable
                style={styles.textButton}
                onPress={() => {
                  setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
                  setMessage('');
                  setMessageKind('error');
                }}
              >
                <Text style={styles.textButtonText}>
                  {mode === 'sign-in' ? 'New here? Create an account' : 'Already registered? Sign in'}
                </Text>
              </Pressable>
              {mode === 'sign-in' && (
                <Link href="/forgot-password" style={styles.aboutLink}>Forgot password?</Link>
              )}
            </>
          )}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>About this mobile build</Text>
          <Text style={styles.body}>
            This build provides Supabase account sign-in and Express API verification. Safety plans, trusted contacts, and alert sending are not available here yet. It is not an emergency service.
          </Text>
        </View>

        <Link href="/about" style={styles.aboutLink}>
          About Panic Ring
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  page: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 52, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 28 },
  brandMark: {
    width: 64, height: 64, borderRadius: 32, borderWidth: 3,
    borderColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  brandMarkInner: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.accent },
  eyebrow: { color: colors.accent, fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  title: { color: colors.text, fontSize: 36, fontWeight: '800', marginTop: 6 },
  subtitle: { color: colors.textSecondary, fontSize: 15, lineHeight: 22, marginTop: 8, textAlign: 'center' },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, padding: 22 },
  cardTitle: { color: colors.text, fontSize: 22, fontWeight: '700' },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 8 },
  warning: { color: colors.warning, backgroundColor: colors.warningSoft, borderRadius: 10, lineHeight: 20, marginTop: 16, overflow: 'hidden', padding: 12 },
  label: { color: colors.text, fontSize: 13, fontWeight: '600', marginBottom: 7, marginTop: 18 },
  input: {
    backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 10,
    borderWidth: 1, color: colors.text, fontSize: 16, minHeight: 50, paddingHorizontal: 14,
  },
  message: { color: colors.danger, fontSize: 14, lineHeight: 20, marginTop: 14 },
  infoMessage: { color: colors.textSecondary },
  primaryButton: {
    alignItems: 'center', backgroundColor: colors.accent, borderRadius: 12,
    justifyContent: 'center', marginTop: 22, minHeight: 52,
  },
  disabledButton: { opacity: 0.5 },
  primaryButtonText: { color: colors.surface, fontSize: 16, fontWeight: '700' },
  secondaryButton: {
    alignItems: 'center', borderColor: colors.accent, borderRadius: 12,
    borderWidth: 1, justifyContent: 'center', marginTop: 20, minHeight: 48,
  },
  secondaryButtonText: { color: colors.accent, fontSize: 15, fontWeight: '700' },
  menuGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 12, 
    marginTop: 20 
  },
  menuButton: {
    alignItems: 'center', 
    backgroundColor: colors.accentSoft, 
    borderColor: colors.accent,
    borderRadius: 12, 
    borderWidth: 1, 
    justifyContent: 'center', 
    minHeight: 80,
    flex: 1,
    minWidth: '45%',
  },
  menuButtonText: { color: colors.accent, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  textButton: { alignItems: 'center', marginTop: 18, paddingVertical: 8 },
  textButtonText: { color: colors.accent, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  statusRow: { alignItems: 'center', flexDirection: 'row', gap: 10, marginTop: 18 },
  statusText: { color: colors.textSecondary, flex: 1, fontSize: 13, lineHeight: 19 },
  infoCard: { backgroundColor: colors.surfaceMuted, borderRadius: 16, marginTop: 18, padding: 18 },
  infoTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  aboutLink: { alignSelf: 'center', color: colors.accent, fontSize: 14, fontWeight: '600', marginTop: 26, padding: 8 },
});
