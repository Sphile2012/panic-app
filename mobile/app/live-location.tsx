import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import {
  getLiveTrackingUrl,
  listTrustedContacts,
  recordLiveLocation,
  startLiveTracking,
  stopLiveTracking,
} from '../src/lib/emergency';
import { resolveStreetAddress } from '../src/lib/location-address';
import { colors, spacing, borderRadius, shadows, typography } from '../src/lib/theme';

type LocationData = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
};

type TrustedContact = {
  id: string;
  display_name: string;
  phone_number: string;
};

export default function LiveLocationScreen() {
  const [isTracking, setIsTracking] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isPreparingShare, setIsPreparingShare] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'checking'>('checking');
  const [error, setError] = useState('');
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [trackingUrl, setTrackingUrl] = useState<string | null>(null);
  const mountedRef = useRef(false);
  const isStartingRef = useRef(false);
  const isStoppingRef = useRef(false);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const trackingTokenRef = useRef<string | null>(null);
  const locationSyncQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    mountedRef.current = true;
    void Location.getForegroundPermissionsAsync()
      .then(({ status }) => {
        if (mountedRef.current) setPermissionStatus(status === 'granted' ? 'granted' : 'denied');
      })
      .catch((err: unknown) => {
        if (!mountedRef.current) return;
        setError(err instanceof Error ? err.message : 'Could not check location permissions.');
        setPermissionStatus('denied');
      });
    void listTrustedContacts()
      .then((trustedContacts) => {
        if (mountedRef.current) setContacts(trustedContacts);
      })
      .catch((err: unknown) => {
        if (mountedRef.current) setError(err instanceof Error ? err.message : 'Could not load trusted contacts.');
      });

    return () => {
      mountedRef.current = false;
      locationSubscriptionRef.current?.remove();
      locationSubscriptionRef.current = null;
      const token = trackingTokenRef.current;
      trackingTokenRef.current = null;
      if (token) {
        void stopLiveTracking(token).catch((err: unknown) => {
          console.error('Could not revoke the live location link on screen close.', err);
        });
      }
    };
  }, []);

  async function requestPermissions() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status === 'granted' ? 'granted' : 'denied');
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Panic Ring needs location access to track your location. Please enable location in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Could not request location permissions.');
      }
    }
  }

  async function startTracking() {
    if (isStartingRef.current || isStoppingRef.current || isTracking) return;
    if (permissionStatus !== 'granted') {
      await requestPermissions();
      return;
    }

    let token: string | null = null;
    isStartingRef.current = true;
    try {
      setIsStarting(true);
      setError('');
      getLiveTrackingUrl('0'.repeat(32));
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      if (!mountedRef.current) return;
      token = await startLiveTracking(currentLocation);
      trackingTokenRef.current = token;
      if (!mountedRef.current) {
        trackingTokenRef.current = null;
        await stopLiveTracking(token);
        return;
      }
      const liveUrl = getLiveTrackingUrl(token);
      if (!liveUrl) throw new Error('Live location sharing is not configured for this app.');
      setTrackingUrl(liveUrl);
      setLocation(toLocationData(currentLocation));

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000, // 10 seconds
          distanceInterval: 10, // 10 meters
        },
        (newLocation) => {
          const activeToken = trackingTokenRef.current;
          if (!activeToken) return;
          setLocation(toLocationData(newLocation));
          locationSyncQueueRef.current = locationSyncQueueRef.current
            .then(() => {
              if (trackingTokenRef.current === activeToken) {
                return recordLiveLocation(activeToken, newLocation);
              }
            })
            .catch((err: unknown) => {
              if (trackingTokenRef.current === activeToken) {
                setError(err instanceof Error ? err.message : 'Could not update the live location.');
              }
            });
        }
      );
      if (!mountedRef.current) {
        subscription.remove();
        if (trackingTokenRef.current === token) {
          trackingTokenRef.current = null;
          await stopLiveTracking(token);
        }
        return;
      }
      locationSubscriptionRef.current = subscription;
      setIsTracking(true);
    } catch (err) {
      let message = err instanceof Error ? err.message : 'Could not start location tracking.';
      locationSubscriptionRef.current?.remove();
      locationSubscriptionRef.current = null;
      if (token) {
        trackingTokenRef.current = null;
        try {
          await stopLiveTracking(token);
        } catch (revokeError) {
          message += ` The live link may still be available: ${revokeError instanceof Error ? revokeError.message : 'revocation failed.'}`;
        }
      }
      if (mountedRef.current) {
        setError(message);
        setIsTracking(false);
        setTrackingUrl(null);
      } else {
        console.error('Could not finish starting or revoke live location after screen close.', message);
      }
    } finally {
      isStartingRef.current = false;
      if (mountedRef.current) setIsStarting(false);
    }
  }

  async function stopTracking() {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;
    setIsStopping(true);
    locationSubscriptionRef.current?.remove();
    locationSubscriptionRef.current = null;
    const token = trackingTokenRef.current;
    trackingTokenRef.current = null;
    setIsTracking(false);
    try {
      if (token) await stopLiveTracking(token);
      setTrackingUrl(null);
      setError('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tracking stopped on this device, but the live link could not be revoked.';
      if (mountedRef.current) setError(message);
      else console.error('Could not revoke the live location link after screen close.', message);
    } finally {
      isStoppingRef.current = false;
      if (mountedRef.current) setIsStopping(false);
    }
  }

  function getGoogleMapsLink() {
    if (!location) return '';
    return `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
  }

  async function buildShareMessage(): Promise<string | null> {
    if (!location || !trackingUrl) return null;
    setIsPreparingShare(true);
    try {
      const address = await resolveStreetAddress(location.latitude, location.longitude);
      const coordinates = `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
      const addressLine = address
        ? `Approximate address: ${address}`
        : `Street address unavailable; GPS coordinates: ${coordinates}`;
      const accuracyLine = location.accuracy === null
        ? 'GPS accuracy estimate unavailable.'
        : `GPS accuracy estimate: ±${Math.round(location.accuracy)} m.`;
      return `${addressLine}\nCoordinates: ${coordinates}\n${accuracyLine}\nMap: ${getGoogleMapsLink()}\nLive location: ${trackingUrl}\nThe live link updates while sharing is on.`;
    } finally {
      if (mountedRef.current) setIsPreparingShare(false);
    }
  }

  async function shareViaWhatsApp(contact: TrustedContact) {
    if (!trackingUrl) return;
    const number = contact.phone_number.replace(/^\+/, '');
    if (!/^[1-9]\d{7,14}$/.test(number)) {
      Alert.alert('Invalid contact number', `Check ${contact.display_name}'s phone number in your trusted circle.`);
      return;
    }
    try {
      const message = await buildShareMessage();
      if (!message) return;
      const whatsappUrl = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
      await Linking.openURL(whatsappUrl);
    } catch {
      Alert.alert(
        'Could not open WhatsApp',
        `Could not open a message draft for ${contact.display_name}. Check that WhatsApp is available, or use SMS.`
      );
    }
  }

  async function shareViaSMS() {
    if (!trackingUrl) return;
    if (contacts.length === 0) {
      Alert.alert('No trusted contacts', 'Add a trusted contact before sharing your location.');
      return;
    }

    try {
      const message = await buildShareMessage();
      if (!message) return;
      const isAvailable = await SMS.isAvailableAsync();
      
      if (!isAvailable) {
        Alert.alert('SMS Not Available', 'SMS is not available on this device.');
        return;
      }

      await SMS.sendSMSAsync(contacts.map((contact) => contact.phone_number), message);
    } catch (err) {
      Alert.alert('Could not open SMS', err instanceof Error ? err.message : 'Could not prepare the SMS draft.');
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Link href="/" asChild>
          <Pressable accessibilityRole="button" style={styles.back}>
            <Text style={styles.backText}>‹  Back</Text>
          </Pressable>
        </Link>
        <Text style={styles.title}>Live Location</Text>
      </View>

      {permissionStatus === 'checking' ? (
        <View style={styles.card}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.statusText}>Checking permissions...</Text>
        </View>
      ) : permissionStatus === 'denied' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Location Permission Required</Text>
          <Text style={styles.body}>
            Panic Ring needs access to your location to enable live tracking for emergency situations.
          </Text>
          <Pressable style={styles.primaryButton} onPress={requestPermissions}>
            <Text style={styles.primaryButtonText}>Grant Permission</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => Linking.openSettings()}>
            <Text style={styles.secondaryButtonText}>Open Settings</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <View style={styles.statusIndicator}>
              <View style={[styles.statusDot, isTracking && styles.statusDotActive]} />
              <Text style={styles.statusLabel}>
                {isTracking ? 'Live location is ON' : 'Live location is OFF'}
              </Text>
            </View>

            {error ? (
              <Text style={styles.errorText} accessibilityLiveRegion="polite">{error}</Text>
            ) : null}

            {location ? (
              <View style={styles.locationInfo}>
                <Text style={styles.label}>Current Location</Text>
                <Text style={styles.coordinates}>
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </Text>
                {location.accuracy !== null && (
                  <Text style={styles.accuracy}>Accuracy: ±{Math.round(location.accuracy)}m</Text>
                )}
                {location.accuracy === null && (
                  <Text style={styles.accuracy}>GPS accuracy estimate unavailable</Text>
                )}
                <Text style={styles.timestamp}>
                  Last updated: {new Date(location.timestamp).toLocaleString()}
                </Text>
                <Pressable
                  style={styles.mapButton}
                  onPress={() => Linking.openURL(getGoogleMapsLink())}
                >
                  <Text style={styles.mapButtonText}>View on Google Maps</Text>
                </Pressable>
              </View>
            ) : null}

            <Pressable
              style={[styles.primaryButton, isTracking ? styles.dangerButton : null]}
              onPress={isTracking ? stopTracking : startTracking}
              disabled={isStarting || isStopping}
            >
              <Text style={styles.primaryButtonText}>
                {isStarting ? 'Starting live location...' : isStopping ? 'Stopping live location...' : isTracking ? 'Turn off live location' : 'Turn on live location'}
              </Text>
            </Pressable>
          </View>

          {isTracking && location && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Share Live Location</Text>
              <Text style={styles.body}>
                Location messages include an approximate address when available, plus GPS coordinates and the live link. Only share this link with people you trust; anyone with it can view your location while tracking is active.
              </Text>

              <View style={styles.shareButtons}>
                <Pressable
                  style={styles.smsButton}
                  onPress={shareViaSMS}
                  disabled={isPreparingShare}
                >
                  <Text style={styles.shareButtonText}>{isPreparingShare ? 'Preparing address...' : 'SMS'}</Text>
                </Pressable>
              </View>

              {contacts.length > 0 && (
                <View style={styles.contactsList}>
                  <Text style={styles.contactsLabel}>SMS opens with your trusted circle. Choose one person for WhatsApp:</Text>
                  {contacts.map((contact) => (
                    <View key={contact.id} style={styles.contactRow}>
                      <Text style={styles.contactItem}>{contact.display_name} ({contact.phone_number})</Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Share location with ${contact.display_name} using WhatsApp`}
                        style={styles.whatsappButton}
                        onPress={() => void shareViaWhatsApp(contact)}
                        disabled={isPreparingShare}
                      >
                        <Text style={styles.shareButtonText}>{isPreparingShare ? 'Preparing address...' : 'WhatsApp'}</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>How it works</Text>
            <Text style={styles.body}>
              While this screen is active, your live link is refreshed when your phone reports a new GPS position. The recipient page checks for updates about every 10 seconds. SMS and WhatsApp open a draft for your trusted contacts; you must review and send it.
            </Text>
            <Text style={[styles.body, { marginTop: 12 }]}>
              Turning tracking off or leaving this screen stops GPS updates and revokes the link. GPS accuracy varies by device and surroundings.
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

function toLocationData(position: Location.LocationObject): LocationData {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    timestamp: position.timestamp,
  };
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { paddingBottom: spacing['5xl'], paddingHorizontal: spacing.xl, paddingTop: spacing['4xl'] },
  header: { marginBottom: spacing.xl },
  back: { alignSelf: 'flex-start', paddingVertical: spacing.sm, paddingRight: spacing.base, marginBottom: spacing.md },
  backText: { color: colors.primary, fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold },
  title: { color: colors.text, fontSize: typography.fontSize['4xl'], fontWeight: typography.fontWeight.black },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.xl,
    marginBottom: spacing.base,
    ...shadows.base,
  },
  cardTitle: { color: colors.text, fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, marginBottom: spacing.sm },
  body: { color: colors.textSecondary, fontSize: typography.fontSize.sm, lineHeight: typography.lineHeight.relaxed * typography.fontSize.sm },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.base,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.textTertiary,
    marginRight: spacing.sm,
  },
  statusDotActive: {
    backgroundColor: colors.success,
  },
  statusLabel: {
    color: colors.text,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    marginTop: spacing.base,
  },
  locationInfo: {
    backgroundColor: colors.primarySoft,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    marginBottom: spacing.lg,
  },
  label: {
    color: colors.text,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  coordinates: {
    color: colors.primary,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    marginBottom: 4,
  },
  accuracy: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    marginBottom: 4,
  },
  timestamp: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.md,
  },
  mapButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.base,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  mapButtonText: {
    color: colors.textInverse,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    minHeight: 52,
    ...shadows.md,
  },
  dangerButton: {
    backgroundColor: colors.danger,
  },
  primaryButtonText: {
    color: colors.textInverse,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    justifyContent: 'center',
    marginTop: spacing.md,
    minHeight: 48,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.normal * typography.fontSize.sm,
    marginBottom: spacing.base,
    textAlign: 'center',
    backgroundColor: colors.dangerLight,
    padding: spacing.md,
    borderRadius: borderRadius.base,
  },
  shareButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.base,
  },
  whatsappButton: {
    flex: 1,
    backgroundColor: '#25D366',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  smsButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  shareButtonText: {
    color: colors.textInverse,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
  },
  contactsList: {
    marginTop: spacing.base,
    padding: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.base,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
  },
  contactsLabel: {
    color: colors.text,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  contactItem: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.normal * typography.fontSize.sm,
  },
  infoCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  infoTitle: {
    color: colors.text,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.sm,
  },
});
