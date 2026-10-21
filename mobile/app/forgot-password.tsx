import { useState } from 'react';
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
import { Link } from 'expo-router';
import * as Linking from 'expo-linking';
import { getSupabaseClient, isSupabaseConfigured } from '../src/lib/supabase';
import { colors } from '../src/lib/theme';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState('');
  const configured = isSupabaseConfigured();

  async function sendResetLink() {
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setMessage('Enter a valid email address.');
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      const { error } = await getSupabaseClient().auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: Linking.createURL('reset-password'),
      });
      if (error) throw error;
      setSent(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not send a reset link. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>Reset your password</Text>
          <Text style={styles.body}>
            Enter the email address for your account. We’ll send a secure link to choose a new password.
          </Text>
          {!configured && <Text style={styles.message}>Supabase is not configured. Add the values in mobile/.env first.</Text>}
          {sent ? (
            <Text style={styles.success} accessibilityLiveRegion="polite">
              If an account exists with that email, a reset link has been sent. Check your inbox and spam folder.
            </Text>
          ) : (
            <>
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
              {message ? <Text style={styles.message} accessibilityLiveRegion="polite">{message}</Text> : null}
              <Pressable
                style={[styles.primaryButton, (!configured || busy) && styles.disabledButton]}
                onPress={sendResetLink}
                disabled={!configured || busy}
                accessibilityRole="button"
              >
                {busy ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryButtonText}>Send reset link</Text>}
              </Pressable>
            </>
          )}
          <Link href="/" style={styles.link}>Back to sign in</Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  page: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, padding: 22 },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 8 },
  label: { color: colors.text, fontSize: 13, fontWeight: '600', marginBottom: 7, marginTop: 22 },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 10, borderWidth: 1, color: colors.text, fontSize: 16, minHeight: 50, paddingHorizontal: 14 },
  message: { color: colors.danger, fontSize: 14, lineHeight: 20, marginTop: 14 },
  success: { color: colors.success, fontSize: 14, lineHeight: 21, marginTop: 22 },
  primaryButton: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 12, justifyContent: 'center', marginTop: 22, minHeight: 52 },
  disabledButton: { opacity: 0.5 },
  primaryButtonText: { color: colors.surface, fontSize: 16, fontWeight: '700' },
  link: { alignSelf: 'center', color: colors.accent, fontSize: 14, fontWeight: '600', marginTop: 22, padding: 8 },
});
