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
import { colors, spacing, borderRadius, shadows, typography } from '../src/lib/theme';

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

    let location = null;
    if (shareLocation) {
      location = await getLocation();
      setCurrentLocation(location);
    }

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

    const message = `PANIC RING SOS ALERT\n\nI need help! This is an emergency alert from your trusted contact.\n\nPlease check on me or call me immediately.${locationText}\n\nSent from Panic Ring`;

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
            <Text style={styles.alertIcon}>!</Text>
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
                    <Text style={styles.contactPreviewIcon}>C</Text>
                    <Text style={styles.contactPreviewName}>{contact.name}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.disclaimerCard}>
            <Text style={styles.disclaimerText}>
              WARNING: This alert opens your SMS app. You must tap Send in the messaging app. Panic Ring
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
  content: { paddingBottom: spacing['5xl'], paddingHorizontal: spacing.xl, paddingTop: spacing['4xl'] },
  header: { marginBottom: spacing.xl },
  back: { alignSelf: 'flex-start', paddingVertical: spacing.sm, paddingRight: spacing.base, marginBottom: spacing.md },
  backText: { color: colors.primary, fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold },
  title: { color: colors.text, fontSize: typography.fontSize['4xl'], fontWeight: typography.fontWeight.black },
  loadingContainer: { paddingVertical: spacing['3xl'], alignItems: 'center' },
  infoCard: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    ...shadows.sm,
  },
  infoTitle: { color: colors.text, fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, marginBottom: spacing.sm, textAlign: 'center' },
  infoBody: { color: colors.textSecondary, fontSize: typography.fontSize.sm, lineHeight: typography.lineHeight.relaxed * typography.fontSize.sm, textAlign: 'center' },
  settingsCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    ...shadows.base,
  },
  settingsTitle: { color: colors.text, fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, marginBottom: spacing.base },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleInfo: { flex: 1, marginRight: spacing.base },
  toggleLabel: { color: colors.text, fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, marginBottom: 4 },
  toggleDescription: { color: colors.textSecondary, fontSize: typography.fontSize.sm },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: { backgroundColor: colors.primary },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  toggleThumbActive: { alignSelf: 'flex-end' },
  sosContainer: { alignItems: 'center', marginVertical: spacing['2xl'] },
  sosButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: spacing.base,
    ...shadows.xl,
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
    color: colors.textInverse,
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.black,
    textAlign: 'center',
    zIndex: 1,
  },
  sosHint: { color: colors.textSecondary, fontSize: typography.fontSize.sm, textAlign: 'center' },
  contactsPreview: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.base,
    ...shadows.base,
  },
  contactsTitle: { color: colors.text, fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.bold, marginBottom: spacing.base },
  noContacts: { alignItems: 'center', paddingVertical: spacing.lg },
  noContactsText: { color: colors.textSecondary, fontSize: typography.fontSize.sm, marginBottom: spacing.base },
  addContactButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.base,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    ...shadows.sm,
  },
  addContactButtonText: { color: colors.textInverse, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold },
  contactsList: { gap: spacing.sm },
  contactPreviewItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  contactPreviewIcon: { fontSize: typography.fontSize.xl },
  contactPreviewName: { color: colors.text, fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold },
  disclaimerCard: {
    backgroundColor: colors.warningSoft,
    borderRadius: borderRadius.md,
    padding: spacing.base,
  },
  disclaimerText: { color: colors.textSecondary, fontSize: typography.fontSize.sm, lineHeight: typography.lineHeight.normal * typography.fontSize.sm },
  alertActiveCard: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.danger,
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    alignItems: 'center',
    ...shadows.base,
  },
  alertIcon: { fontSize: 64, marginBottom: spacing.base },
  alertTitle: { color: colors.danger, fontSize: typography.fontSize['3xl'], fontWeight: typography.fontWeight.black, marginBottom: spacing.sm },
  alertBody: { color: colors.text, fontSize: typography.fontSize.base, textAlign: 'center' },
  statusCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.base,
    ...shadows.base,
  },
  statusTitle: { color: colors.text, fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, marginBottom: spacing.base },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusName: { color: colors.text, fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusIcon: { fontSize: typography.fontSize.base },
  statusText: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold },
  statusSending: { color: colors.warning },
  statusDelivered: { color: colors.success },
  statusFailed: { color: colors.danger },
  locationCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.base,
    ...shadows.base,
  },
  locationTitle: { color: colors.text, fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.bold, marginBottom: spacing.sm },
  locationCoords: { color: colors.textSecondary, fontSize: typography.fontSize.sm, marginBottom: spacing.md },
  mapButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.base,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  mapButtonText: { color: colors.textInverse, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold },
  cancelButton: {
    backgroundColor: colors.surface,
    borderColor: colors.danger,
    borderWidth: 2,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    alignItems: 'center',
  },
  cancelButtonText: { color: colors.danger, fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.bold },
});
