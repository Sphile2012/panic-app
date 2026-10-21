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
import { getSupabaseClient } from '../src/lib/supabase';
import { colors } from '../src/lib/theme';

export default function ChangePasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  async function savePassword() {
    if (password.length < 8) {
      setMessage('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      const { error } = await getSupabaseClient().auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      setMessage('Your password has been changed.');
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update the password. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>Change password</Text>
          <Text style={styles.body}>Choose a new password for your signed-in account.</Text>
          <Text style={styles.label}>New password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            autoComplete="new-password"
            secureTextEntry
            textContentType="newPassword"
            accessibilityLabel="New password"
          />
          <Text style={styles.label}>Confirm new password</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            autoCapitalize="none"
            autoComplete="new-password"
            secureTextEntry
            textContentType="newPassword"
            accessibilityLabel="Confirm new password"
          />
          {message ? <Text style={success ? styles.success : styles.message} accessibilityLiveRegion="polite">{message}</Text> : null}
          {!success && (
            <Pressable
              style={[styles.primaryButton, busy && styles.disabledButton]}
              onPress={savePassword}
              disabled={busy}
              accessibilityRole="button"
            >
              {busy ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryButtonText}>Save password</Text>}
            </Pressable>
          )}
          <Link href="/" style={styles.link}>Back to account</Link>
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
  label: { color: colors.text, fontSize: 13, fontWeight: '600', marginBottom: 7, marginTop: 18 },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 10, borderWidth: 1, color: colors.text, fontSize: 16, minHeight: 50, paddingHorizontal: 14 },
  message: { color: colors.danger, fontSize: 14, lineHeight: 20, marginTop: 14 },
  success: { color: colors.success, fontSize: 14, lineHeight: 21, marginTop: 14 },
  primaryButton: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 12, justifyContent: 'center', marginTop: 22, minHeight: 52 },
  disabledButton: { opacity: 0.5 },
  primaryButtonText: { color: colors.surface, fontSize: 16, fontWeight: '700' },
  link: { alignSelf: 'center', color: colors.accent, fontSize: 14, fontWeight: '600', marginTop: 22, padding: 8 },
});
