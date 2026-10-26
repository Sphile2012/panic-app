import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Dimensions,
  Animated,
} from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { Link, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { getApiBaseUrl, verifyApiSession } from '../src/lib/backend';
import { getSupabaseClient, isSupabaseConfigured } from '../src/lib/supabase';
import { formatAuthError, SIGNUP_CONFIRMATION_MESSAGE } from '../src/lib/auth-messages';
import { colors, spacing, borderRadius, shadows, typography } from '../src/lib/theme';

type AuthMode = 'sign-in' | 'sign-up';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState<'error' | 'info'>('error');
  const [backendStatus, setBackendStatus] = useState('Checking backend connection…');
  const [backendBusy, setBackendBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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
      setMenuOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not sign out.');
    }
  }

  function handlePanicPress() {
    router.push('/live-location');
  }

  function navigateToFeature(path: string) {
    setMenuOpen(false);
    router.push(path as any);
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {session ? (
        <View style={styles.mainScreen}>
          <View style={styles.gradientOverlay} />

          <Pressable
            style={styles.hamburgerButton}
            onPress={() => setMenuOpen(true)}
            accessibilityLabel="Open menu"
            accessibilityRole="button"
          >
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
          </Pressable>

          <View style={styles.fullScreenContainer}>
            <View style={styles.topSection}>
              <View style={styles.logoContainer}>
                <Image 
                  source={require('../assets/icon.png')} 
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.brandTitle}>PANIC RING</Text>
              <Text style={styles.brandSubtitle}>Your Safety, Always Protected</Text>
            </View>

            <View style={styles.centerSection}>
              <Pressable
                style={styles.panicButton}
                onPress={handlePanicPress}
                accessibilityLabel="Emergency SOS button"
                accessibilityRole="button"
                accessibilityHint="Press to share your location and alert trusted contacts"
              >
                <View style={styles.panicButtonInner}>
                  <Text style={styles.panicButtonText}>SOS</Text>
                </View>
              </Pressable>
            </View>

            <View style={styles.bottomSection}>
              <Text style={styles.instructionText}>Tap to activate emergency alert</Text>
            </View>
          </View>

          <Modal
            animationType="slide"
            transparent={true}
            visible={menuOpen}
            onRequestClose={() => setMenuOpen(false)}
          >
            <Pressable 
              style={styles.modalOverlay}
              onPress={() => setMenuOpen(false)}
            >
              <View style={styles.menuContainer} onStartShouldSetResponder={() => true}>
                <View style={styles.menuHeader}>
                  <Text style={styles.menuTitle}>Menu</Text>
                  <Pressable 
                    onPress={() => setMenuOpen(false)}
                    style={styles.closeButton}
                  >
                    <Text style={styles.closeButtonText}>Close</Text>
                  </Pressable>
                </View>

                <ScrollView style={styles.menuScroll}>
                  <Text style={styles.sectionTitle}>MAIN</Text>
                  
                  <Pressable 
                    style={[styles.menuItem, styles.activeMenuItem]}
                    onPress={() => setMenuOpen(false)}
                  >
                    <View style={[styles.iconCircle, styles.iconHome]}>
                      <Text style={styles.iconText}>HOME</Text>
                    </View>
                    <View style={styles.menuTextContainer}>
                      <Text style={styles.menuItemTitle}>Home</Text>
                    </View>
                  </Pressable>

                  <Pressable 
                    style={styles.menuItem}
                    onPress={() => navigateToFeature('/live-location')}
                  >
                    <View style={[styles.iconCircle, styles.iconMap]}>
                      <Text style={styles.iconText}>MAP</Text>
                    </View>
                    <View style={styles.menuTextContainer}>
                      <Text style={styles.menuItemTitle}>Live Map</Text>
                    </View>
                  </Pressable>

                  <Pressable 
                    style={styles.menuItem}
                    onPress={() => navigateToFeature('/circle')}
                  >
                    <View style={[styles.iconCircle, styles.iconContacts]}>
                      <Text style={styles.iconText}>CONT</Text>
                    </View>
                    <View style={styles.menuTextContainer}>
                      <Text style={styles.menuItemTitle}>Contacts</Text>
                    </View>
                  </Pressable>

                  <Text style={styles.sectionTitle}>SAFETY</Text>

                  <Pressable 
                    style={styles.menuItem}
                    onPress={() => navigateToFeature('/sos')}
                  >
                    <View style={[styles.iconCircle, styles.iconAlert]}>
                      <Text style={styles.iconText}>HIST</Text>
                    </View>
                    <View style={styles.menuTextContainer}>
                      <Text style={styles.menuItemTitle}>Alert History</Text>
                    </View>
                  </Pressable>

                  <Pressable 
                    style={styles.menuItem}
                    onPress={() => navigateToFeature('/safety-plan')}
                  >
                    <View style={[styles.iconCircle, styles.iconJourney]}>
                      <Text style={styles.iconText}>JOUR</Text>
                    </View>
                    <View style={styles.menuTextContainer}>
                      <Text style={styles.menuItemTitle}>Journey</Text>
                    </View>
                  </Pressable>

                  <Pressable 
                    style={styles.menuItem}
                    onPress={() => navigateToFeature('/emergency')}
                  >
                    <View style={[styles.iconCircle, styles.iconFakeCall]}>
                      <Text style={styles.iconText}>CALL</Text>
                    </View>
                    <View style={styles.menuTextContainer}>
                      <Text style={styles.menuItemTitle}>Fake Call</Text>
                    </View>
                  </Pressable>

                  <Text style={styles.sectionTitle}>ACCOUNT</Text>

                  <Pressable 
                    style={styles.menuItem}
                    onPress={() => navigateToFeature('/change-password')}
                  >
                    <View style={[styles.iconCircle, styles.iconSettings]}>
                      <Text style={styles.iconText}>SET</Text>
                    </View>
                    <View style={styles.menuTextContainer}>
                      <Text style={styles.menuItemTitle}>Settings</Text>
                    </View>
                  </Pressable>

                  <Pressable 
                    style={styles.menuItem}
                    onPress={() => navigateToFeature('/about')}
                  >
                    <View style={[styles.iconCircle, styles.iconGuide]}>
                      <Text style={styles.iconText}>GUIDE</Text>
                    </View>
                    <View style={styles.menuTextContainer}>
                      <Text style={styles.menuItemTitle}>User Guide</Text>
                    </View>
                  </Pressable>

                  <Pressable 
                    style={styles.menuItem}
                    onPress={() => navigateToFeature('/about')}
                  >
                    <View style={[styles.iconCircle, styles.iconFaq]}>
                      <Text style={styles.iconText}>FAQ</Text>
                    </View>
                    <View style={styles.menuTextContainer}>
                      <Text style={styles.menuItemTitle}>FAQ</Text>
                    </View>
                  </Pressable>

                  <Pressable 
                    style={styles.menuItem}
                    onPress={() => navigateToFeature('/about')}
                  >
                    <View style={[styles.iconCircle, styles.iconFeedback]}>
                      <Text style={styles.iconText}>FEED</Text>
                    </View>
                    <View style={styles.menuTextContainer}>
                      <Text style={styles.menuItemTitle}>Feedback</Text>
                    </View>
                  </Pressable>

                  <Pressable 
                    style={[styles.menuItem, styles.signOutItem]}
                    onPress={signOut}
                  >
                    <View style={[styles.iconCircle, styles.iconLogout]}>
                      <Text style={styles.iconText}>OUT</Text>
                    </View>
                    <View style={styles.menuTextContainer}>
                      <Text style={[styles.menuItemTitle, styles.signOutText]}>Sign Out</Text>
                    </View>
                  </Pressable>
                </ScrollView>
              </View>
            </Pressable>
          </Modal>
        </View>
      ) : (
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
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>About this mobile build</Text>
            <Text style={styles.body}>
              This build provides full personal safety features including SOS alerts, trusted circle management, live location tracking, private notes, safety planning, and emergency services dialer.
            </Text>
          </View>

          <Link href="/about" style={styles.aboutLink}>
            About Panic Ring
          </Link>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  
  // PREMIUM HOME SCREEN
  mainScreen: { 
    flex: 1, 
    backgroundColor: colors.background,
    position: 'relative',
  },

  // Subtle gradient overlay effect
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.4,
    backgroundColor: colors.primarySoft,
    opacity: 0.5,
  },

  // Premium Hamburger Menu
  hamburgerButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 50,
    left: spacing.lg,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    zIndex: 3000,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },

  hamburgerLine: {
    width: 24,
    height: 3,
    backgroundColor: colors.primary,
    marginVertical: 3,
    borderRadius: 2,
  },
  
  fullScreenContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing['4xl'],
    paddingHorizontal: spacing.xl,
  },

  topSection: {
    alignItems: 'center',
    width: '100%',
    paddingTop: spacing['2xl'],
  },

  logoContainer: {
    width: 100,
    height: 100,
    marginBottom: spacing.xl,
    borderRadius: borderRadius['2xl'],
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.primary,
    ...shadows.lg,
  },

  logo: {
    width: '70%',
    height: '70%',
  },

  brandTitle: {
    fontSize: typography.fontSize['5xl'],
    fontWeight: typography.fontWeight.black,
    color: colors.primary,
    letterSpacing: 3,
    marginBottom: spacing.md,
    textAlign: 'center',
  },

  brandSubtitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
    letterSpacing: 1,
    textAlign: 'center',
    opacity: 0.9,
  },

  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingVertical: spacing['3xl'],
  },

  bottomSection: {
    alignItems: 'center',
    width: '100%',
    paddingBottom: spacing.xl,
  },

  instructionText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  
  // PREMIUM SOS BUTTON
  panicButton: { 
    width: Math.min(width * 0.7, 280),
    height: Math.min(width * 0.7, 280),
    borderRadius: Math.min(width * 0.7, 280) / 2,
    backgroundColor: colors.emergency,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    borderColor: colors.surface,
    ...shadows.xl,
  },
  
  panicButtonInner: {
    width: '85%',
    height: '85%',
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  panicButtonText: { 
    fontSize: typography.fontSize['4xl'],
    fontWeight: typography.fontWeight.black,
    color: colors.textInverse,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  
  // PREMIUM MODAL MENU
  modalOverlay: { 
    flex: 1, 
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  
  menuContainer: { 
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    maxHeight: height * 0.88,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.lg,
    ...shadows.xl,
  },
  
  menuHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  
  menuTitle: { 
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.black,
    color: colors.text,
    letterSpacing: 0.5,
  },
  
  closeButton: { 
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.base,
    backgroundColor: colors.surfaceMuted,
  },
  
  closeButtonText: { 
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
  },
  
  menuScroll: { 
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },

  sectionTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.textTertiary,
    letterSpacing: 1.2,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
  },
  
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center',
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.base,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },

  activeMenuItem: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryLight,
  },
  
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.base,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },

  iconHome: {
    backgroundColor: colors.primarySoft,
  },

  iconMap: {
    backgroundColor: colors.infoSoft,
  },

  iconContacts: {
    backgroundColor: colors.infoSoft,
  },

  iconAlert: {
    backgroundColor: colors.successSoft,
  },

  iconJourney: {
    backgroundColor: colors.successSoft,
  },

  iconFakeCall: {
    backgroundColor: colors.warningSoft,
  },

  iconSettings: {
    backgroundColor: colors.surfaceMuted,
  },

  iconGuide: {
    backgroundColor: colors.surfaceMuted,
  },

  iconFaq: {
    backgroundColor: colors.surfaceMuted,
  },

  iconFeedback: {
    backgroundColor: colors.surfaceMuted,
  },
  
  iconDanger: {
    backgroundColor: colors.dangerLight,
  },
  
  iconPrimary: {
    backgroundColor: colors.primarySoft,
  },
  
  iconSuccess: {
    backgroundColor: colors.successSoft,
  },
  
  iconWarning: {
    backgroundColor: colors.warningSoft,
  },
  
  iconInfo: {
    backgroundColor: colors.infoSoft,
  },
  
  iconNeutral: {
    backgroundColor: colors.surfaceMuted,
  },
  
  iconLogout: {
    backgroundColor: colors.dangerLight,
  },
  
  iconText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.black,
    color: colors.text,
    letterSpacing: 0.3,
  },
  
  menuTextContainer: { 
    flex: 1 
  },
  
  menuItemTitle: { 
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  
  menuItemDesc: { 
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  
  menuDivider: { 
    height: 1, 
    backgroundColor: colors.border,
    marginVertical: spacing.base,
  },
  
  signOutItem: { 
    borderColor: colors.danger,
    backgroundColor: colors.dangerLight,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  
  signOutText: {
    color: colors.danger,
    fontWeight: typography.fontWeight.bold,
  },

  // AUTH SCREENS
  page: { 
    flexGrow: 1, 
    paddingHorizontal: spacing.xl, 
    paddingTop: spacing['4xl'], 
    paddingBottom: spacing['3xl'],
  },
  
  header: { 
    alignItems: 'center', 
    marginBottom: spacing['2xl'],
  },
  
  brandMark: {
    width: 80, 
    height: 80, 
    borderRadius: borderRadius.xl, 
    borderWidth: 3,
    borderColor: colors.primary, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: spacing.xl,
    backgroundColor: colors.surface,
    ...shadows.md,
  },
  
  brandMarkInner: { 
    width: 40, 
    height: 40, 
    borderRadius: borderRadius.base, 
    backgroundColor: colors.primary,
  },
  
  eyebrow: { 
    color: colors.primary, 
    fontSize: typography.fontSize.xs, 
    fontWeight: typography.fontWeight.bold, 
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  
  title: { 
    color: colors.text, 
    fontSize: typography.fontSize['4xl'], 
    fontWeight: typography.fontWeight.black, 
    marginTop: spacing.sm,
  },
  
  subtitle: { 
    color: colors.textSecondary, 
    fontSize: typography.fontSize.base, 
    lineHeight: typography.lineHeight.relaxed * typography.fontSize.base, 
    marginTop: spacing.md, 
    textAlign: 'center',
  },
  
  card: { 
    backgroundColor: colors.surface, 
    borderColor: colors.border, 
    borderRadius: borderRadius.xl, 
    borderWidth: 1, 
    padding: spacing.xl,
    ...shadows.base,
  },
  
  cardTitle: { 
    color: colors.text, 
    fontSize: typography.fontSize.xl, 
    fontWeight: typography.fontWeight.bold,
  },
  
  body: { 
    color: colors.textSecondary, 
    fontSize: typography.fontSize.sm, 
    lineHeight: typography.lineHeight.relaxed * typography.fontSize.sm, 
    marginTop: spacing.sm,
  },
  
  warning: { 
    color: colors.warning, 
    backgroundColor: colors.warningSoft, 
    borderRadius: borderRadius.base, 
    lineHeight: typography.lineHeight.normal * typography.fontSize.sm, 
    marginTop: spacing.base, 
    overflow: 'hidden', 
    padding: spacing.md,
  },
  
  label: { 
    color: colors.text, 
    fontSize: typography.fontSize.sm, 
    fontWeight: typography.fontWeight.semibold, 
    marginBottom: spacing.sm, 
    marginTop: spacing.lg,
  },
  
  input: {
    backgroundColor: colors.surface, 
    borderColor: colors.border, 
    borderRadius: borderRadius.base,
    borderWidth: 1, 
    color: colors.text, 
    fontSize: typography.fontSize.base, 
    minHeight: 50, 
    paddingHorizontal: spacing.base,
  },
  
  message: { 
    color: colors.danger, 
    fontSize: typography.fontSize.sm, 
    lineHeight: typography.lineHeight.normal * typography.fontSize.sm, 
    marginTop: spacing.md,
  },
  
  infoMessage: { 
    color: colors.textSecondary,
  },
  
  primaryButton: {
    alignItems: 'center', 
    backgroundColor: colors.primary, 
    borderRadius: borderRadius.md,
    justifyContent: 'center', 
    marginTop: spacing.xl, 
    minHeight: 52,
    ...shadows.md,
  },
  
  disabledButton: { 
    opacity: 0.5,
  },
  
  primaryButtonText: { 
    color: colors.textInverse, 
    fontSize: typography.fontSize.base, 
    fontWeight: typography.fontWeight.bold,
  },
  
  textButton: { 
    alignItems: 'center', 
    marginTop: spacing.lg, 
    paddingVertical: spacing.sm,
  },
  
  textButtonText: { 
    color: colors.primary, 
    fontSize: typography.fontSize.sm, 
    fontWeight: typography.fontWeight.semibold, 
    textAlign: 'center',
  },
  
  infoCard: { 
    backgroundColor: colors.surfaceMuted, 
    borderRadius: borderRadius.lg, 
    marginTop: spacing.lg, 
    padding: spacing.lg,
  },
  
  infoTitle: { 
    color: colors.text, 
    fontSize: typography.fontSize.base, 
    fontWeight: typography.fontWeight.bold,
  },
  
  aboutLink: { 
    alignSelf: 'center', 
    color: colors.primary, 
    fontSize: typography.fontSize.sm, 
    fontWeight: typography.fontWeight.semibold, 
    marginTop: spacing['2xl'], 
    padding: spacing.sm,
  },
});
