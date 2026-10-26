import { useEffect, useState } from 'react';
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
import { getSupabaseClient } from '../src/lib/supabase';
import { colors, spacing, borderRadius, shadows, typography } from '../src/lib/theme';

type LocationData = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
};

type TrustedContact = {
  id: string;
  name: string;
  phone: string;
};

export default function LiveLocationScreen() {
  const [isTracking, setIsTracking] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'checking'>('checking');
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);
  const [error, setError] = useState('');
  const [contacts, setContacts] = useState<TrustedContact[]>([]);

  const checkPermissions = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setPermissionStatus(status === 'granted' ? 'granted' : 'denied');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not check location permissions.');
      setPermissionStatus('denied');
    }
  };

  const requestPermissions = async () => {
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
      setError(err instanceof Error ? err.message : 'Could not request location permissions.');
    }
  };

  const loadContacts = async () => {
    try {
      const client = getSupabaseClient();
      const { data: { session } } = await client.auth.getSession();
      if (!session) return;

      const { data, error: fetchError } = await client
        .from('contacts')
        .select('id, name, phone')
        .eq('user_id', session.user.id)
        .eq('trusted', true)
        .limit(5);

      if (fetchError) throw fetchError;
      setContacts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load trusted contacts.');
    }
  };

  useEffect(() => {
    void checkPermissions();
    void loadContacts();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [locationSubscription]);

  async function startTracking() {
    if (permissionStatus !== 'granted') {
      await requestPermissions();
      return;
    }

    try {
      setError('');
      
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const locationData: LocationData = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy,
        timestamp: currentLocation.timestamp,
      };

      setLocation(locationData);
      setIsTracking(true);

      await saveLocationToDatabase(locationData);

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000, // 10 seconds
          distanceInterval: 10, // 10 meters
        },
        (newLocation) => {
          const updatedLocation: LocationData = {
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
            accuracy: newLocation.coords.accuracy,
            timestamp: newLocation.timestamp,
          };
          setLocation(updatedLocation);
          void saveLocationToDatabase(updatedLocation);
        }
      );

      setLocationSubscription(subscription);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start location tracking.');
      setIsTracking(false);
    }
  }

  async function stopTracking() {
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }
    setIsTracking(false);
  }

  async function saveLocationToDatabase(locationData: LocationData) {
    try {
      const client = getSupabaseClient();
      const { data: { session } } = await client.auth.getSession();
      if (!session) return;

      const { error: saveError } = await client.from('live_locations').upsert({
        user_id: session.user.id,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy,
        updated_at: new Date(locationData.timestamp).toISOString(),
      });
      if (saveError) throw saveError;
    } catch (err) {
      setError(err instanceof Error ? `Could not sync live location: ${err.message}` : 'Could not sync live location.');
    }
  }

  function getGoogleMapsLink() {
    if (!location) return '';
    return `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
  }

  async function shareViaWhatsApp(contact: TrustedContact) {
    if (!location) return;
    const number = contact.phone.replace(/\D/g, '').replace(/^0/, '27');
    if (number.length < 7 || number.length > 15) {
      Alert.alert('Invalid contact number', `Check ${contact.name}'s phone number in your trusted circle.`);
      return;
    }
    const mapsLink = getGoogleMapsLink();
    const message = `My current location is here: ${mapsLink}\nLast updated: ${new Date(location.timestamp).toLocaleString()}`;
    const whatsappUrl = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
    try {
      await Linking.openURL(whatsappUrl);
    } catch {
      Alert.alert(
        'Could not open WhatsApp',
        `Could not open a message draft for ${contact.name}. Check that WhatsApp is available, or use SMS.`
      );
    }
  }

  async function shareViaSMS() {
    if (!location) return;
    if (contacts.length === 0) {
      Alert.alert('No trusted contacts', 'Add a trusted contact before sharing your location.');
      return;
    }

    const mapsLink = getGoogleMapsLink();
    const message = `My current location is here: ${mapsLink}\nLast updated: ${new Date(location.timestamp).toLocaleString()}`;

    try {
      const isAvailable = await SMS.isAvailableAsync();
      
      if (!isAvailable) {
        Alert.alert('SMS Not Available', 'SMS is not available on this device.');
        return;
      }

      const recipients = contacts.length > 0 ? contacts.map(c => c.phone) : [];
      
      await SMS.sendSMSAsync(recipients, message);
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
            >
              <Text style={styles.primaryButtonText}>
                {isTracking ? 'Turn off live location' : 'Turn on live location'}
              </Text>
            </Pressable>
          </View>

          {isTracking && location && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Share Current Location</Text>
              <Text style={styles.body}>
                Open a message draft for a trusted contact. Review and send it in the messaging app.
              </Text>

              <View style={styles.shareButtons}>
                <Pressable
                  style={styles.smsButton}
                  onPress={shareViaSMS}
                >
                  <Text style={styles.shareButtonText}>SMS</Text>
                </Pressable>
              </View>

              {contacts.length > 0 && (
                <View style={styles.contactsList}>
                  <Text style={styles.contactsLabel}>SMS opens with all trusted contacts. Choose one for WhatsApp:</Text>
                  {contacts.map((contact) => (
                    <View key={contact.id} style={styles.contactRow}>
                      <Text style={styles.contactItem}>{contact.name} ({contact.phone})</Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Share location with ${contact.name} using WhatsApp`}
                        style={styles.whatsappButton}
                        onPress={() => void shareViaWhatsApp(contact)}
                      >
                        <Text style={styles.shareButtonText}>WhatsApp</Text>
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
              When tracking is on, your latest location is saved to your account every 10 seconds. SMS and WhatsApp open a draft with the current map pin for your trusted contacts. You must send it, and share again to provide an updated pin.
            </Text>
            <Text style={[styles.body, { marginTop: 12 }]}>
              Location tracking continues while the app is open. For background tracking, additional 
              permissions may be required.
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
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
