import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { colors } from '../src/lib/theme';

type Service = {
  name: string;
  number: string;
  detail: string;
  icon: string;
  tag: string;
};

const SERVICES: Service[] = [
  {
    name: 'General emergency',
    number: '112',
    detail: 'Mobile emergency number for police, ambulance, and fire response.',
    icon: '!',
    tag: 'All genders',
  },
  {
    name: 'Police · SAPS',
    number: '10111',
    detail: 'South African Police Service emergency line.',
    icon: 'P',
    tag: 'All genders',
  },
  {
    name: 'Ambulance',
    number: '10177',
    detail: 'Emergency medical services.',
    icon: 'A',
    tag: 'All genders',
  },
  {
    name: 'Gender-based violence support',
    number: '0800428428',
    detail: 'GBV Command Centre. Ask the service about support options for your situation.',
    icon: 'H',
    tag: 'Support for all genders',
  },
  {
    name: 'Childline South Africa',
    number: '116',
    detail: 'Free support line for children. Support is for children of all genders.',
    icon: 'C',
    tag: 'For children',
  },
];

export default function EmergencyScreen() {
  const handleCall = (service: Service) => {
    Alert.alert(
      `Call ${service.name}?`,
      `This will dial ${service.number}. Make sure you're safe to make a call.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => {
            Linking.openURL(`tel:${service.number}`).catch(() => {
              Alert.alert('Error', 'Could not open phone dialer.');
            });
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Link href="/" asChild>
          <Pressable accessibilityRole="button" style={styles.back}>
            <Text style={styles.backText}>‹  Back</Text>
          </Pressable>
        </Link>
        <Text style={styles.title}>Emergency Dialer</Text>
      </View>

      <View style={styles.introCard}>
        <Text style={styles.introIcon}>!</Text>
        <Text style={styles.introTitle}>Help for anyone who needs it</Text>
        <Text style={styles.introBody}>
          Choose a service to open your phone&apos;s dialer. Check the number and tap Call.
        </Text>
      </View>

      <View style={styles.servicesList}>
        {SERVICES.map((service, index) => (
          <Pressable
            key={index}
            style={styles.serviceCard}
            onPress={() => handleCall(service)}
            accessibilityRole="button"
            accessibilityLabel={`Call ${service.name}, ${service.number}`}
          >
            <Text style={styles.serviceIcon}>{service.icon}</Text>
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>{service.name}</Text>
              <Text style={styles.serviceTag}>{service.tag}</Text>
              <Text style={styles.serviceDetail}>{service.detail}</Text>
            </View>
            <View style={styles.callButton}>
              <Text style={styles.callNumber}>{service.number}</Text>
              <Text style={styles.callLabel}>Call</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <View style={styles.disclaimerCard}>
        <Text style={styles.disclaimerText}>
          Calls are placed by your phone; Panic Ring cannot confirm they connect. If you are in
          immediate danger, use the most appropriate emergency service.
        </Text>
      </View>
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
  introCard: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  introIcon: { fontSize: 40, marginBottom: 12 },
  introTitle: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  introBody: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  servicesList: { gap: 12, marginBottom: 24 },
  serviceCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  serviceIcon: { color: colors.accent, fontSize: 13, fontWeight: '800', minWidth: 40, textAlign: 'center' },
  serviceInfo: { flex: 1 },
  serviceName: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  serviceTag: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  serviceDetail: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  callButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    padding: 12,
    minWidth: 90,
    alignItems: 'center',
  },
  callNumber: { color: colors.surface, fontSize: 15, fontWeight: '700', marginBottom: 2 },
  callLabel: { color: colors.surface, fontSize: 12, fontWeight: '600' },
  disclaimerCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    padding: 16,
  },
  disclaimerText: { color: colors.textSecondary, fontSize: 13, lineHeight: 20, textAlign: 'center' },
});
