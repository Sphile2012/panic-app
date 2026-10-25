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
import { colors } from '../src/lib/theme';

type LocationData = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
};

export default function LiveLocationScreen() {
  const [isTracking, setIsTracking] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'checking'>('checking');
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);
  const [error, setError] = useState('');
  const [contacts, setContacts] = useState<{ name: string; phone: string }[]>([]);

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
        .select('name, phone')
        .eq('user_id', session.user.id)
        .limit(5);

      if (fetchError) throw fetchError;
      setContacts(data || []);
    } catch {
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

      await client.from('live_locations').upsert({
        user_id: session.user.id,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy,
        updated_at: new Date(locationData.timestamp).toISOString(),
      });
    } catch (err) {
      console.error('Could not save location:', err);
    }
  }

  function getGoogleMapsLink() {
    if (!location) return '';
    return `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
  }

  async function shareViaWhatsApp() {
    if (!location) return;
    
    const mapsLink = getGoogleMapsLink();
    const message = `🚨 Panic Ring Live Location\n\nI'm sharing my live location with you:\n${mapsLink}\n\nLast updated: ${new Date(location.timestamp).toLocaleString()}`;
    
    try {
      const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        Alert.alert('WhatsApp Not Available', 'WhatsApp is not installed on this device.');
      }
    } catch {
      Alert.alert('Error', 'Could not open WhatsApp.');
    }
  }

  async function shareViaSMS() {
    if (!location) return;

    const mapsLink = getGoogleMapsLink();
    const message = `🚨 Panic Ring Live Location\n\nI'm sharing my live location with you:\n${mapsLink}\n\nLast updated: ${new Date(location.timestamp).toLocaleString()}`;

    try {
      const isAvailable = await SMS.isAvailableAsync();
      
      if (!isAvailable) {
        Alert.alert('SMS Not Available', 'SMS is not available on this device.');
        return;
      }

      const recipients = contacts.length > 0 ? contacts.map(c => c.phone) : [];
      
      await SMS.sendSMSAsync(recipients, message);
    } catch {
      Alert.alert('Error', 'Could not send SMS.');
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
              <Text style={styles.cardTitle}>Share Location</Text>
              <Text style={styles.body}>
                Send your current location to emergency contacts
              </Text>

              <View style={styles.shareButtons}>
                <Pressable
                  style={styles.whatsappButton}
                  onPress={shareViaWhatsApp}
                >
                  <Text style={styles.shareButtonText}>📱 WhatsApp</Text>
                </Pressable>

                <Pressable
                  style={styles.smsButton}
                  onPress={shareViaSMS}
                >
                  <Text style={styles.shareButtonText}>💬 SMS</Text>
                </Pressable>
              </View>

              {contacts.length > 0 && (
                <View style={styles.contactsList}>
                  <Text style={styles.contactsLabel}>SMS will be sent to:</Text>
                  {contacts.map((contact, index) => (
                    <Text key={index} style={styles.contactItem}>
                      • {contact.name} ({contact.phone})
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>How it works</Text>
            <Text style={styles.body}>
              When live location is turned on, your location is updated every 10 seconds and saved securely. 
              Only your trusted contacts can access your live location.
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
  content: { paddingBottom: 44, paddingHorizontal: 22, paddingTop: 48 },
  header: { marginBottom: 24 },
  back: { alignSelf: 'flex-start', paddingVertical: 10, paddingRight: 16, marginBottom: 12 },
  backText: { color: colors.accent, fontSize: 16, fontWeight: '600' },
  title: { color: colors.text, fontSize: 30, fontWeight: '800' },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    marginBottom: 16,
  },
  cardTitle: { color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: 8 },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 21 },
  warningIcon: { fontSize: 48, textAlign: 'center', marginBottom: 16 },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.textSecondary,
    marginRight: 10,
  },
  statusDotActive: {
    backgroundColor: colors.success,
  },
  statusLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 16,
  },
  locationInfo: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  coordinates: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  accuracy: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 4,
  },
  timestamp: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 12,
  },
  mapButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  mapButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '700',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 52,
  },
  dangerButton: {
    backgroundColor: colors.danger,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: colors.accent,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 48,
  },
  secondaryButtonText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '700',
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  shareButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  whatsappButton: {
    flex: 1,
    backgroundColor: '#25D366',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  smsButton: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  shareButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '700',
  },
  contactsList: {
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
  },
  contactsLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  contactItem: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    padding: 18,
  },
  infoTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
});
