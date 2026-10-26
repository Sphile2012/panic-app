import { Link } from 'expo-router';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../src/lib/theme';

const emergencyNumbers = [
  { number: '10111', name: 'South African Police Service' },
  { number: '0800 428 428', name: 'GBV Command Centre' },
];

export default function AboutScreen() {
  async function call(number: string) {
    try {
      await Linking.openURL(`tel:${number.replace(/\s/g, '')}`);
    } catch {
      Alert.alert('Unable to place call', 'This device cannot open a phone app. Dial the number directly if you need help.');
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Link href="/" asChild>
        <Pressable accessibilityRole="button" style={styles.back}>
          <Text style={styles.backText}>‹  Back</Text>
        </Pressable>
      </Link>

      <View style={styles.hero}>
        <View style={styles.ring}><View style={styles.ringCenter} /></View>
        <Text style={styles.title}>Panic Ring</Text>
        <Text style={styles.tagline}>A little more prepared. A little more connected.</Text>
        <Text style={styles.version}>Version 1.0.0</Text>
      </View>

      <Section title="What Panic Ring does">
        <Text style={styles.body}>
          The mobile build provides Supabase account sign-in, a trusted contact list, emergency session records, and foreground-only location updates. An SOS can open an SMS composer for you to review and send.
        </Text>
        <Bullet>Trusted contacts and emergency location records are stored under your account’s row-level security policies.</Bullet>
        <Bullet>When preparing a location message, the app asks the device’s reverse-geocoding provider for an approximate address. If no address is available, the message includes GPS coordinates and a map link instead.</Bullet>
        <Bullet>Account sign-in uses Supabase Auth.</Bullet>
        <Bullet>The API verifies account tokens with Supabase Auth.</Bullet>
      </Section>

      <Section title="What it does not do">
        <Bullet>Panic Ring is not an emergency response service.</Bullet>
        <Bullet>Location tracking stops when the app leaves the foreground; background tracking is not enabled.</Bullet>
        <Bullet>SMS is not sent until you confirm it in your messaging app, and delivery is not confirmed.</Bullet>
        <Bullet>It does not capture photos or dispatch help.</Bullet>
        <Bullet>Tracking links are bearer links; anyone with a link can view its current location while it is active.</Bullet>
      </Section>

      <Section title="Your data">
        <Text style={styles.body}>
          Account sign-in is handled by Supabase. The mobile app uses your public anon key; privileged service credentials are never included in the app. Do not store sensitive information in an account unless the app tells you how it is protected.
        </Text>
      </Section>

      <Section title="Emergency help in South Africa">
        {emergencyNumbers.map((item) => (
          <Pressable
            key={item.number}
            accessibilityRole="button"
            onPress={() => void call(item.number)}
            style={styles.emergencyButton}
          >
            <Text style={styles.emergencyNumber}>{item.number}</Text>
            <Text style={styles.emergencyName}>{item.name}</Text>
          </Pressable>
        ))}
      </Section>
      <Text style={styles.disclaimer}>If you are in immediate danger, contact local emergency services directly.</Text>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bullet}>
      <Text style={styles.bulletMark}>•</Text>
      <Text style={styles.body}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { paddingBottom: 44, paddingHorizontal: 22, paddingTop: 48 },
  back: { alignSelf: 'flex-start', paddingVertical: 10, paddingRight: 16 },
  backText: { color: colors.accent, fontSize: 16, fontWeight: '600' },
  hero: { alignItems: 'center', paddingBottom: 28, paddingTop: 18 },
  ring: { alignItems: 'center', borderColor: colors.accent, borderRadius: 36, borderWidth: 3, height: 72, justifyContent: 'center', width: 72 },
  ringCenter: { backgroundColor: colors.accent, borderRadius: 15, height: 30, width: 30 },
  title: { color: colors.text, fontSize: 30, fontWeight: '800', marginTop: 14 },
  tagline: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 6, textAlign: 'center' },
  version: { color: colors.textSecondary, fontSize: 12, marginTop: 8 },
  section: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, marginTop: 14, padding: 18 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 8 },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 21 },
  bullet: { alignItems: 'flex-start', flexDirection: 'row', gap: 8, marginTop: 8 },
  bulletMark: { color: colors.accent, fontSize: 18, lineHeight: 21 },
  emergencyButton: { backgroundColor: colors.surfaceMuted, borderColor: colors.border, borderRadius: 11, borderWidth: 1, marginTop: 10, padding: 13 },
  emergencyNumber: { color: colors.accent, fontSize: 19, fontWeight: '800' },
  emergencyName: { color: colors.textSecondary, fontSize: 13, marginTop: 3 },
  disclaimer: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 18, textAlign: 'center' },
});
