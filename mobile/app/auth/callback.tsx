import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import * as Linking from 'expo-linking';
import { completeAuthRedirect } from '../../src/lib/auth-callback';
import { isSupabaseConfigured } from '../../src/lib/supabase';
import { colors } from '../../src/lib/theme';

export default function AuthCallbackScreen() {
  const url = Linking.useLinkingURL();
  const configured = isSupabaseConfigured();
  const [message, setMessage] = useState(() => {
    if (!configured) return 'Supabase is not configured. Add the values in mobile/.env first.';
    if (!url) return 'Open the confirmation link from your email on this device.';
    return 'Confirming your account…';
  });
  const processedUrls = useRef(new Set<string>());

  useEffect(() => {
    let active = true;
    if (!configured || !url) return;
    if (processedUrls.current.has(url)) return () => { active = false; };
    processedUrls.current.add(url);

    void completeAuthRedirect(url).then((result) => {
      if (result.type === 'recovery') {
        router.replace('/reset-password');
        return;
      }
      if (active) setMessage('Your email is confirmed. Your account is ready to use.');
    }).catch((error: unknown) => {
      if (active) {
        setMessage(error instanceof Error ? error.message : 'Could not confirm this link. Request a new email and try again.');
      }
    });

    return () => {
      active = false;
    };
  }, [configured, url]);

  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.title}>Panic Ring account</Text>
        <ActivityIndicator color={colors.accent} style={styles.spinner} />
        <Text style={styles.message} accessibilityLiveRegion="polite">{message}</Text>
        <Link href="/" style={styles.link}>Continue to sign in</Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 24 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, padding: 22 },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  spinner: { marginTop: 24 },
  message: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 18, textAlign: 'center' },
  link: { alignSelf: 'center', color: colors.accent, fontSize: 14, fontWeight: '600', marginTop: 22, padding: 8 },
});
