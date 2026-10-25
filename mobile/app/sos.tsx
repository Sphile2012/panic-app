import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, router } from 'expo-router';
import * as Location from 'expo-location';
import { getSupabaseClient } from '../src/lib/supabase';
import { colors } from '../src/lib/theme';

type Contact = {
  id: string;
  name: string;
  phone: string;
};

type DeliveryStatus = 'sending' | 'delivered' | 'failed';

export default function SOSScreen() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertActive, setAlertActive] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [shareLocation, setShareLocation] = useState(false);
  const [deliveryStatuses, setDeliveryStatuses] = useState<Record<string, DeliveryStatus>>({});
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    void loadContacts();
  }, []);

  async function loadContacts() {
    try {
      const client = getSupabaseClient();
      const { data: { session } } = await client.auth.getSession();
      if (!session) return;

      const { data, error } = await client
        .from('contacts')
        .select('id, name, phone')
        .eq('user_id', session.user.id)
        .eq('status', 'accepted');

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      Alert.alert('Error', 'Could not load contacts.');
    } finally {
      setLoading(false);
    }
  }

  async function getLocation() {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
        if (newStatus !== 'granted') return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch {
      return null;
    }
  }

  function startHold() {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 2;
      setHoldProgress(progress);

      if (progress >= 100) {
        clearInterval(interval);
        void activateAlert();
      }
    }, 30); // 1.5 seconds total (30ms * 50 steps)

    return () => clearInterval(interval);
  }

  async function activateAlert() {
    if (contacts.length === 0) {
      Alert.alert('No Contacts', 'Add trusted contacts first to send SOS alerts.');
      router.push('/circle');
      return;
    }

    setAlertActive(true);
    setHoldProgress(0);

    // Get location if user wants to share
    let location = null;
    if (shareLocation) {
      location = await getLocation();
      setCurrentLocation(location);
    }

    // Send alerts to contacts
    const statuses: Record<string, DeliveryStatus> = {};
    for (const contact of contacts) {
      statuses[contact.id] = 'sending';
      setDeliveryStatuses({ ...statuses });

      try {
        await sendSMSAlert(contact, location);
        statuses[contact.id] = 'delivered';
      } catch {
        statuses[contact.id] = 'failed';
      }
      setDeliveryStatuses({ ...statuses });
    }
  }

  async function sendSMSAlert(contact: Contact, location: { latitude: number; longitude: number } | null) {
    const locationText = location
      ? `\n\nLocation: https://www.google.com/maps?q=${location.latitude},${location.longitude}`
      : '';

    const message = `🚨 PANIC RING SOS ALERT 🚨\n\nI need help! This is an emergency alert from your trusted contact.\n\nPlease check on me or call me immediately.${locationText}\n\nSent from Panic Ring`;

    const smsUrl = `sms:${contact.phone}${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(message)}`;

    try {
      const canOpen = await Linking.canOpenURL(smsUrl);
      if (canOpen) {
        await Linking.openURL(smsUrl);
      } else {
        throw new Error('Cannot open SMS');
      }
    } catch {
      throw new Error('Failed to send SMS');
    }
  }

  function cancelAlert() {
    Alert.alert(
      'Cancel Alert',
      'Are you sure you want to cancel the SOS alert?',
      [
        { text: 'No, Keep Active', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => {
            setAlertActive(false);
            setHoldProgress(0);
            setDeliveryStatuses({});
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Link href="/" asChild>
          <Pressable accessibilityRole="button" style={styles.back}>
            <Text style={styles.backText}>‹  Back</Text>
          </Pressable>
        </Link>
        <Text style={styles.title}>SOS Alert</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : alertActive ? (
        <>
          <View style={styles.alertActiveCard}>
            <Text style={styles.alertIcon}>🚨</Text>
            <Text style={styles.alertTitle}>Alert Activated</Text>
            <Text style={styles.alertBody}>
              Sending alerts to your trusted contacts...
            </Text>
          </View>

          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Delivery Status</Text>
            {contacts.map((contact) => (
              <View key={contact.id} style={styles.statusRow}>
                <Text style={styles.statusName}>{contact.name}</Text>
                <View style={styles.statusBadge}>
                  {deliveryStatuses[contact.id] === 'sending' && (
                    <>
                      <ActivityIndicator size="small" color={colors.warning} />
                      <Text style={[styles.statusText, styles.statusSending]}>Sending...</Text>
                    </>
                  )}
                  {deliveryStatuses[contact.id] === 'delivered' && (
                    <>
                      <Text style={styles.statusIcon}>✓</Text>
                      <Text style={[styles.statusText, styles.statusDelivered]}>Delivered</Text>
                    </>
                  )}
                  {deliveryStatuses[contact.id] === 'failed' && (
                    <>
                      <Text style={styles.statusIcon}>✗</Text>
                      <Text style={[styles.statusText, styles.statusFailed]}>Failed to deliver</Text>
                    </>
                  )}
                </View>
              </View>
            ))}
          </View>

          {currentLocation && (
            <View style={styles.locationCard}>
              <Text style={styles.locationTitle}>Location Shared</Text>
              <Text style={styles.locationCoords}>
                {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
              </Text>
              <Pressable
                style={styles.mapButton}
                onPress={() =>
                  Linking.openURL(
                    `https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`
                  )
                }
              >
                <Text style={styles.mapButtonText}>View on Google Maps</Text>
              </Pressable>
            </View>
          )}

          <Pressable style={styles.cancelButton} onPress={cancelAlert}>
            <Text style={styles.cancelButtonText}>Cancel Alert</Text>
          </Pressable>
        </>
      ) : (
        <>
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Silent SOS Alert</Text>
            <Text style={styles.infoBody}>
              Hold the button below to activate. Your trusted contacts will receive an alert with
              your location (if you choose to share).
            </Text>
          </View>

          <View style={styles.settingsCard}>
            <Text style={styles.settingsTitle}>Alert Settings</Text>
            <Pressable
              style={styles.toggleRow}
              onPress={() => setShareLocation(!shareLocation)}
            >
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>Share my location</Text>
                <Text style={styles.toggleDescription}>
                  Include your current location in the alert
                </Text>
              </View>
              <View style={[styles.toggle, shareLocation && styles.toggleActive]}>
                <View style={[styles.toggleThumb, shareLocation && styles.toggleThumbActive]} />
              </View>
            </Pressable>
          </View>

          <View style={styles.sosContainer}>
            <Pressable
              style={[styles.sosButton, holdProgress > 0 && styles.sosButtonActive]}
              onPressIn={startHold}
              onPressOut={() => setHoldProgress(0)}
              delayLongPress={1500}
            >
              {holdProgress > 0 && (
                <View style={[styles.sosProgress, { height: `${holdProgress}%` }]} />
              )}
              <Text style={styles.sosText}>Hold to{'\n'}Activate</Text>
            </Pressable>
            <Text style={styles.sosHint}>Press and hold for 1.5 seconds</Text>
          </View>

          <View style={styles.contactsPreview}>
            <Text style={styles.contactsTitle}>Alert will be sent to:</Text>
            {contacts.length === 0 ? (
              <View style={styles.noContacts}>
                <Text style={styles.noContactsText}>No trusted contacts yet</Text>
                <Link href="/circle" asChild>
                  <Pressable style={styles.addContactButton}>
                    <Text style={styles.addContactButtonText}>Add Contacts</Text>
                  </Pressable>
                </Link>
              </View>
            ) : (
              <View style={styles.contactsList}>
                {contacts.map((contact) => (
                  <View key={contact.id} style={styles.contactPreviewItem}>
                    <Text style={styles.contactPreviewIcon}>👤</Text>
                    <Text style={styles.contactPreviewName}>{contact.name}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.disclaimerCard}>
            <Text style={styles.disclaimerText}>
              ⚠️ This alert opens your SMS app. You must tap Send in the messaging app. Panic Ring
              does not send messages automatically.
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
  loadingContainer: { paddingVertical: 40, alignItems: 'center' },
  infoCard: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  infoIcon: { fontSize: 40, marginBottom: 12 },
  infoTitle: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  infoBody: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  settingsCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  settingsTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 16 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleInfo: { flex: 1, marginRight: 16 },
  toggleLabel: { color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 4 },
  toggleDescription: { color: colors.textSecondary, fontSize: 13 },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: { backgroundColor: colors.accent },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  toggleThumbActive: { alignSelf: 'flex-end' },
  sosContainer: { alignItems: 'center', marginVertical: 32 },
  sosButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 16,
  },
  sosButtonActive: { opacity: 0.9 },
  sosProgress: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.dangerDark,
  },
  sosText: {
    color: colors.surface,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    zIndex: 1,
  },
  sosHint: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },
  contactsPreview: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  contactsTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 16 },
  noContacts: { alignItems: 'center', paddingVertical: 20 },
  noContactsText: { color: colors.textSecondary, fontSize: 14, marginBottom: 16 },
  addContactButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  addContactButtonText: { color: colors.surface, fontSize: 14, fontWeight: '700' },
  contactsList: { gap: 8 },
  contactPreviewItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  contactPreviewIcon: { fontSize: 20 },
  contactPreviewName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  disclaimerCard: {
    backgroundColor: colors.warningSoft,
    borderRadius: 12,
    padding: 16,
  },
  disclaimerText: { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
  alertActiveCard: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    borderWidth: 2,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  alertIcon: { fontSize: 64, marginBottom: 16 },
  alertTitle: { color: colors.danger, fontSize: 24, fontWeight: '800', marginBottom: 8 },
  alertBody: { color: colors.text, fontSize: 16, textAlign: 'center' },
  statusCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  statusTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 16 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusIcon: { fontSize: 16 },
  statusText: { fontSize: 13, fontWeight: '600' },
  statusSending: { color: colors.warning },
  statusDelivered: { color: colors.success },
  statusFailed: { color: colors.danger },
  locationCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  locationTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  locationCoords: { color: colors.textSecondary, fontSize: 14, marginBottom: 12 },
  mapButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  mapButtonText: { color: colors.surface, fontSize: 14, fontWeight: '700' },
  cancelButton: {
    backgroundColor: colors.surface,
    borderColor: colors.danger,
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: { color: colors.danger, fontSize: 16, fontWeight: '700' },
});
