import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
} from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { Link, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { getApiBaseUrl, verifyApiSession } from '../src/lib/backend';
import { getSupabaseClient, isSupabaseConfigured } from '../src/lib/supabase';
import { formatAuthError, SIGNUP_CONFIRMATION_MESSAGE } from '../src/lib/auth-messages';
import { colors } from '../src/lib/theme';

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
          <View style={styles.cornerTopLeft} />
          <View style={styles.cornerTopRight} />
          <View style={styles.cornerBottomLeft} />
          <View style={styles.cornerBottomRight} />
          
          <View style={styles.decorativeCircle1} />
          <View style={styles.decorativeCircle2} />
          <View style={styles.decorativeCircle3} />

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
              <Text style={styles.brandTitle}>PANIC RING</Text>
              <Text style={styles.brandSubtitle}>Your Safety Matters</Text>
            </View>

            <View style={styles.centerSection}>
              <Pressable
                style={styles.panicButton}
                onPress={handlePanicPress}
                accessibilityLabel="Panic button - share your location"
                accessibilityRole="button"
              >
                <Text style={styles.panicButtonText}>PANIC</Text>
              </Pressable>
            </View>

            <View style={styles.bottomSection}>
              <Text style={styles.instructionText}>Hold for emergency</Text>
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
  
  mainScreen: { 
    flex: 1, 
    backgroundColor: '#FFE4F0',
    position: 'relative',
  },

  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 80,
    height: 80,
    borderBottomRightRadius: 40,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderColor: 'rgba(220, 38, 38, 0.3)',
  },

  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 60,
    height: 60,
    borderBottomLeftRadius: 30,
    backgroundColor: 'rgba(236, 72, 153, 0.1)',
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    borderColor: 'rgba(236, 72, 153, 0.3)',
  },

  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 70,
    height: 70,
    borderTopRightRadius: 35,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    borderRightWidth: 3,
    borderTopWidth: 3,
    borderColor: 'rgba(220, 38, 38, 0.3)',
  },

  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 90,
    height: 90,
    borderTopLeftRadius: 45,
    backgroundColor: 'rgba(236, 72, 153, 0.1)',
    borderLeftWidth: 3,
    borderTopWidth: 3,
    borderColor: 'rgba(236, 72, 153, 0.3)',
  },

  decorativeCircle1: {
    position: 'absolute',
    top: '15%',
    right: '10%',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 2,
    borderColor: 'rgba(220, 38, 38, 0.3)',
  },

  decorativeCircle2: {
    position: 'absolute',
    bottom: '25%',
    left: '8%',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(236, 72, 153, 0.3)',
  },

  decorativeCircle3: {
    position: 'absolute',
    top: '70%',
    right: '15%',
    width: 25,
    height: 25,
    borderRadius: 12.5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(220, 38, 38, 0.3)',
  },

  hamburgerButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 24,
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    zIndex: 1000,
    borderWidth: 4,
    borderColor: '#DC2626',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.6,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
  },

  hamburgerLine: {
    width: 32,
    height: 4,
    backgroundColor: '#DC2626',
    marginVertical: 4,
    borderRadius: 2,
  },
  
  fullScreenContainer: {
    flex: 1,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },

  topSection: {
    alignItems: 'center',
    width: '100%',
    paddingTop: 40,
  },

  brandTitle: {
    fontSize: Math.min(width * 0.16, 72),
    fontWeight: '900',
    color: '#DC2626',
    letterSpacing: 8,
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(220, 38, 38, 0.4)',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 6,
    lineHeight: Math.min(width * 0.18, 80),
  },

  brandSubtitle: {
    fontSize: Math.min(width * 0.08, 32),
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 3,
    textAlign: 'center',
    opacity: 0.95,
    lineHeight: Math.min(width * 0.1, 40),
  },

  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },

  bottomSection: {
    alignItems: 'center',
    width: '100%',
    paddingBottom: 20,
  },

  instructionText: {
    fontSize: Math.min(width * 0.06, 24),
    fontWeight: '700',
    color: '#DC2626',
    letterSpacing: 2,
    opacity: 0.85,
    textAlign: 'center',
  },
  
  panicButton: { 
    width: Math.min(width * 0.75, 340),
    height: Math.min(width * 0.75, 340),
    maxWidth: 340,
    maxHeight: 340,
    minWidth: 220,
    minHeight: 220,
    borderRadius: Math.min(width * 0.75, 340) / 2,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 8,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#DC2626',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.6,
        shadowRadius: 24,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  
  panicButtonText: { 
    fontSize: Math.min(width * 0.14, 60), 
    fontWeight: '900', 
    color: '#FFFFFF',
    letterSpacing: 6,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 6,
  },
  
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  
  menuContainer: { 
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.85,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  
  menuHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  
  menuTitle: { 
    fontSize: 24, 
    fontWeight: '800', 
    color: colors.text 
  },
  
  closeButton: { 
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
  },
  
  closeButtonText: { 
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  
  menuScroll: { 
    paddingHorizontal: 24,
    paddingTop: 20,
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 12,
    marginLeft: 4,
  },
  
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  activeMenuItem: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
  },
  
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },

  iconHome: {
    backgroundColor: '#FEE2E2',
  },

  iconMap: {
    backgroundColor: '#E0E7FF',
  },

  iconContacts: {
    backgroundColor: '#E0E7FF',
  },

  iconAlert: {
    backgroundColor: '#E0E7FF',
  },

  iconJourney: {
    backgroundColor: '#E0E7FF',
  },

  iconFakeCall: {
    backgroundColor: '#E0E7FF',
  },

  iconSettings: {
    backgroundColor: '#E0E7FF',
  },

  iconGuide: {
    backgroundColor: '#E0E7FF',
  },

  iconFaq: {
    backgroundColor: '#E0E7FF',
  },

  iconFeedback: {
    backgroundColor: '#E0E7FF',
  },
  
  iconDanger: {
    backgroundColor: '#FEE2E2',
  },
  
  iconPrimary: {
    backgroundColor: colors.accentSoft,
  },
  
  iconSuccess: {
    backgroundColor: colors.successSoft,
  },
  
  iconWarning: {
    backgroundColor: colors.warningSoft,
  },
  
  iconInfo: {
    backgroundColor: '#E0E7FF',
  },
  
  iconNeutral: {
    backgroundColor: colors.surfaceMuted,
  },
  
  iconLogout: {
    backgroundColor: colors.dangerSoft,
  },
  
  iconText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.5,
  },
  
  menuTextContainer: { 
    flex: 1 
  },
  
  menuItemTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: colors.text,
    marginBottom: 2,
  },
  
  menuItemDesc: { 
    fontSize: 13, 
    color: colors.textSecondary,
    lineHeight: 18,
  },
  
  menuDivider: { 
    height: 1, 
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  
  signOutItem: { 
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
    marginTop: 8,
    marginBottom: 20,
  },
  
  signOutText: {
    color: colors.danger,
  },

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
  textButton: { alignItems: 'center', marginTop: 18, paddingVertical: 8 },
  textButtonText: { color: colors.accent, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  infoCard: { backgroundColor: colors.surfaceMuted, borderRadius: 16, marginTop: 18, padding: 18 },
  infoTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  aboutLink: { alignSelf: 'center', color: colors.accent, fontSize: 14, fontWeight: '600', marginTop: 26, padding: 8 },
});
