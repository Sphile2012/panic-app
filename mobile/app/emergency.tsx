import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import { Link } from 'expo-router';
import {
  getActiveEmergency,
  buildEmergencyMessage,
  getLatestEmergencyLocation,
  getLiveTrackingUrl,
  getMapUrl,
  listTrustedContacts,
  recordEmergencyLocation,
  startEmergency,
  stopEmergency,
  type EmergencyLocation,
  type EmergencySession,
  type TrustedContact,
} from '../src/lib/emergency';
import { colors } from '../src/lib/theme';

export default function EmergencyScreen() {
  const [activeSession, setActiveSession] = useState<EmergencySession | null>(null);
  const [lastLocation, setLastLocation] = useState<EmergencyLocation | null>(null);
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [watching, setWatching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [locationStatus, setLocationStatus] = useState('Location is not active.');
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const sessionRef = useRef<EmergencySession | null>(null);

  const setSession = useCallback((session: EmergencySession | null) => {
    sessionRef.current = session;
    setActiveSession(session);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [session, trustedContacts] = await Promise.all([
        getActiveEmergency(),
        listTrustedContacts(),
      ]);
      setSession(session);
      setContacts(trustedContacts);
      if (session) {
        setLastLocation(await getLatestEmergencyLocation(session.id));
        setLocationStatus('An emergency is active. Tracking is not running until you resume it.');
      } else {
        setLastLocation(null);
        setLocationStatus('Location is not active.');
      }
      setStatus('');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not load emergency data.');
    } finally {
      setLoading(false);
    }
  }, [setSession]);

  useEffect(() => {
    void refresh();
    return () => {
      watchRef.current?.remove();
      watchRef.current = null;
    };
  }, [refresh]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && watchRef.current) {
        watchRef.current.remove();
        watchRef.current = null;
        setWatching(false);
        setLocationStatus('Tracking stopped when Panic Ring left the foreground. Resume it when the app is open.');
      }
    });
    return () => subscription.remove();
  }, []);

  const publishLocation = useCallback((session: EmergencySession, position: Location.LocationObject) => {
    const location: EmergencyLocation = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy_meters: position.coords.accuracy ?? 0,
      captured_at: new Date(position.timestamp).toISOString(),
    };
    setLastLocation(location);
    setLocationStatus('GPS fix received. Saving to your emergency record and live link…');

    writeQueueRef.current = writeQueueRef.current.then(async () => {
      try {
        await recordEmergencyLocation(session.id, position);
        setLocationStatus('Live location is updating while Panic Ring stays open.');
      } catch (error) {
        setLocationStatus(error instanceof Error ? error.message : 'GPS was read but could not be synced.');
      }
    });
  }, []);

  const beginTracking = useCallback(async (session: EmergencySession) => {
    if (watchRef.current) return;
    setLocationStatus('Requesting foreground location permission…');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setLocationStatus('Location permission was not granted. The SOS record remains active; you can still open the SMS composer.');
        return;
      }

      try {
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        publishLocation(session, position);
      } catch {
        setLocationStatus('Waiting for a GPS fix. Tracking will update when the device can determine your location.');
      }

      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10_000,
          distanceInterval: 0,
        },
        (position) => publishLocation(session, position),
      );
      setWatching(true);
      setLocationStatus((current) => current.startsWith('Waiting for') ? current : 'Foreground location tracking is active; Android may vary update timing.');
    } catch (error) {
      watchRef.current?.remove();
      watchRef.current = null;
      setWatching(false);
      setLocationStatus(error instanceof Error ? error.message : 'Could not start foreground location tracking.');
    }
  }, [publishLocation]);

  async function activateEmergency() {
    if (busy || activeSession) return;
    setBusy(true);
    setStatus('');
    try {
      const session = await startEmergency();
      setSession(session);
      setLocationStatus('Emergency record created. Starting foreground location…');
      await beginTracking(session);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not start the emergency.');
    } finally {
      setBusy(false);
    }
  }

  async function openSmsComposer() {
    if (!activeSession) return;
    if (contacts.length === 0) {
      setStatus('Add trusted contacts before opening an SOS message.');
      return;
    }

    setBusy(true);
    setStatus('');
    try {
      if (!await SMS.isAvailableAsync()) {
        throw new Error('SMS is not available on this device. Call emergency services directly if needed.');
      }

      let trackingUrl: string | null;
      try {
        trackingUrl = getLiveTrackingUrl(activeSession.id);
      } catch (error) {
        trackingUrl = null;
        setStatus(error instanceof Error ? error.message : 'The live tracking URL is invalid.');
      }

      const message = buildEmergencyMessage(lastLocation, trackingUrl);
      const result = await SMS.sendSMSAsync(contacts.map((contact) => contact.phone_number), message);

      if (result.result === 'sent') {
        setStatus('The device reports that the message was submitted by the user. Delivery is not confirmed.');
      } else if (result.result === 'cancelled') {
        setStatus('SMS composer was cancelled; no message was sent.');
      } else {
        setStatus('SMS composer closed. This device cannot confirm whether the message was sent or delivered.');
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not open the SMS composer.');
    } finally {
      setBusy(false);
    }
  }

  async function openWhatsAppComposer() {
    if (!activeSession) return;
    let trackingUrl: string | null = null;
    try {
      trackingUrl = getLiveTrackingUrl(activeSession.id);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'The live tracking URL is invalid.');
    }
    const message = buildEmergencyMessage(lastLocation, trackingUrl);
    try {
      await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`);
      setStatus('WhatsApp share opened. Choose recipients and tap Send; delivery is not confirmed.');
    } catch {
      setStatus('Could not open WhatsApp. Use the SMS composer or contact emergency services directly.');
    }
  }

  function confirmEnd(status: 'cancelled' | 'ended') {
    if (!activeSession || busy) return;
    const title = status === 'cancelled' ? 'Cancel this SOS?' : 'End this emergency?';
    Alert.alert(
      title,
      'Location tracking will stop and the live link will be revoked if the server is reachable.',
      [
        { text: 'Keep active', style: 'cancel' },
        {
          text: status === 'cancelled' ? 'Cancel SOS' : 'End emergency',
          style: 'destructive',
          onPress: () => void finishEmergency(activeSession, status),
        },
      ],
    );
  }

  async function finishEmergency(session: EmergencySession, status: 'cancelled' | 'ended') {
    setBusy(true);
    watchRef.current?.remove();
    watchRef.current = null;
    setWatching(false);
    setLocationStatus('Stopping local tracking and closing the emergency…');
    try {
      const failures = await stopEmergency(session.id, status);
      if (failures.length === 0) {
        setSession(null);
        setLastLocation(null);
        setLocationStatus('Emergency ended. The live location row was revoked.');
        setStatus('');
      } else {
        setStatus(failures.join(' '));
        setLocationStatus('Local GPS tracking has stopped. Check the server status before assuming the link was revoked.');
        await refresh();
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not close the emergency.');
      setLocationStatus('Local GPS tracking has stopped. The server may still hold the active record or last location.');
    } finally {
      setBusy(false);
    }
  }

  async function openMap() {
    if (!lastLocation) return;
    try {
      await Linking.openURL(getMapUrl(lastLocation.latitude, lastLocation.longitude));
    } catch {
      setStatus('Could not open a map app on this device.');
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <Link href="/" style={styles.back}>‹  Account</Link>
        <Text style={styles.title}>Emergency SOS</Text>
        <Text style={styles.body}>
          Starting an SOS records an emergency and requests foreground GPS. Sending a message is a separate action so you can review it in your SMS app.
        </Text>
        <Text style={styles.notice}>
          Tracking runs only while Panic Ring is open in the foreground. Android background tracking and guaranteed message delivery are not enabled.
        </Text>

        {loading ? <ActivityIndicator color={colors.accent} style={styles.loading} /> : null}
        {!loading && !activeSession ? (
          <Pressable
            style={[styles.sosButton, (busy || loading) && styles.disabledButton]}
            onPress={() => void activateEmergency()}
            disabled={busy || loading}
            accessibilityRole="button"
            accessibilityLabel="Start emergency SOS"
          >
            {busy ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.sosText}>START SOS</Text>}
          </Pressable>
        ) : null}

        {activeSession ? (
          <View style={styles.card}>
            <Text style={styles.activeTitle}>SOS active</Text>
            <Text style={styles.body}>Started {new Date(activeSession.started_at).toLocaleString()}</Text>
            <Text style={styles.locationStatus} accessibilityLiveRegion="polite">{locationStatus}</Text>
            {watching ? (
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Foreground GPS updates enabled</Text>
              </View>
            ) : (
              <Pressable
                style={styles.secondaryButton}
                onPress={() => void beginTracking(activeSession)}
                disabled={busy}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryText}>Allow location / resume tracking</Text>
              </Pressable>
            )}
            {lastLocation ? (
              <View style={styles.locationCard}>
                <Text style={styles.coordinate}>Lat {lastLocation.latitude.toFixed(6)}</Text>
                <Text style={styles.coordinate}>Long {lastLocation.longitude.toFixed(6)}</Text>
                <Text style={styles.coordinate}>Accuracy ±{Math.round(lastLocation.accuracy_meters)} m</Text>
                <Text style={styles.updated}>Updated {new Date(lastLocation.captured_at).toLocaleTimeString()}</Text>
                <Pressable onPress={() => void openMap()} accessibilityRole="button" style={styles.mapButton}>
                  <Text style={styles.secondaryText}>Open last location in map</Text>
                </Pressable>
              </View>
            ) : null}

            <Pressable
              style={[styles.primaryButton, (busy || contacts.length === 0) && styles.disabledButton]}
              onPress={() => void openSmsComposer()}
              disabled={busy || contacts.length === 0}
              accessibilityRole="button"
            >
              {busy ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryText}>Open SMS composer for {contacts.length} contact(s)</Text>}
            </Pressable>
            <Pressable
              style={[styles.secondaryButton, busy && styles.disabledButton]}
              onPress={() => void openWhatsAppComposer()}
              disabled={busy}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryText}>Share through WhatsApp</Text>
            </Pressable>
            <Link href="/circle" style={styles.circleLink}>Manage trusted circle</Link>
            <Pressable style={styles.endButton} onPress={() => confirmEnd('ended')} disabled={busy} accessibilityRole="button">
              <Text style={styles.endText}>End emergency</Text>
            </Pressable>
            <Pressable style={styles.cancelButton} onPress={() => confirmEnd('cancelled')} disabled={busy} accessibilityRole="button">
              <Text style={styles.cancelText}>Cancel SOS</Text>
            </Pressable>
          </View>
        ) : null}

        {status ? <Text style={styles.message} accessibilityLiveRegion="polite">{status}</Text> : null}
        {!loading && !activeSession ? <Link href="/circle" style={styles.circleLink}>Set up trusted circle</Link> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  page: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 48, paddingBottom: 40 },
  back: { alignSelf: 'flex-start', color: colors.accent, fontSize: 15, fontWeight: '600', paddingVertical: 8, paddingRight: 12 },
  title: { color: colors.text, fontSize: 30, fontWeight: '800', marginTop: 14 },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 8 },
  notice: { backgroundColor: colors.warningSoft, borderRadius: 10, color: colors.warning, fontSize: 13, lineHeight: 19, marginTop: 14, padding: 12 },
  loading: { marginTop: 28 },
  sosButton: { alignItems: 'center', alignSelf: 'center', backgroundColor: colors.danger, borderColor: colors.surface, borderRadius: 90, borderWidth: 8, height: 180, justifyContent: 'center', marginTop: 36, width: 180 },
  sosText: { color: colors.surface, fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  disabledButton: { opacity: 0.55 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, marginTop: 22, padding: 18 },
  activeTitle: { color: colors.danger, fontSize: 22, fontWeight: '800' },
  locationStatus: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 18 },
  liveIndicator: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 14 },
  liveDot: { backgroundColor: colors.success, borderRadius: 5, height: 10, width: 10 },
  liveText: { color: colors.success, fontSize: 13, fontWeight: '700' },
  secondaryButton: { alignItems: 'center', borderColor: colors.accent, borderRadius: 12, borderWidth: 1, justifyContent: 'center', marginTop: 16, minHeight: 48, paddingHorizontal: 8 },
  secondaryText: { color: colors.accent, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  locationCard: { backgroundColor: colors.surfaceMuted, borderRadius: 12, marginTop: 16, padding: 14 },
  coordinate: { color: colors.text, fontSize: 14, fontVariant: ['tabular-nums'], marginTop: 3 },
  updated: { color: colors.textSecondary, fontSize: 12, marginTop: 8 },
  mapButton: { alignItems: 'center', alignSelf: 'flex-start', justifyContent: 'center', marginTop: 10, minHeight: 42, paddingHorizontal: 4 },
  primaryButton: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 12, justifyContent: 'center', marginTop: 18, minHeight: 52, paddingHorizontal: 12 },
  primaryText: { color: colors.surface, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  circleLink: { alignSelf: 'center', color: colors.accent, fontSize: 14, fontWeight: '700', marginTop: 20, padding: 8, textAlign: 'center' },
  endButton: { alignItems: 'center', backgroundColor: colors.danger, borderRadius: 12, justifyContent: 'center', marginTop: 16, minHeight: 50 },
  endText: { color: colors.surface, fontSize: 15, fontWeight: '700' },
  cancelButton: { alignItems: 'center', justifyContent: 'center', marginTop: 8, minHeight: 46 },
  cancelText: { color: colors.danger, fontSize: 14, fontWeight: '600' },
  message: { color: colors.danger, fontSize: 14, lineHeight: 20, marginTop: 16 },
});
