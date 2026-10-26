import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { usePathname, useRouter, type Href } from 'expo-router';
import { borderRadius, colors, spacing } from '../lib/theme';

const features: { label: string; href: Href }[] = [
  { label: 'Home', href: '/' },
  { label: 'Live Location', href: '/live-location' },
  { label: 'Trusted Contacts', href: '/circle' },
  { label: 'Alert History', href: '/sos' },
  { label: 'Safety Plan', href: '/safety-plan' },
  { label: 'Emergency Services', href: '/emergency' },
  { label: 'Private Notes', href: '/notes' },
  { label: 'Settings', href: '/change-password' },
  { label: 'About', href: '/about' },
];

export function FeatureNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  if (
    pathname === '/' ||
    pathname.startsWith('/auth/') ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password'
  ) {
    return null;
  }

  function openFeature(href: Href) {
    setMenuOpen(false);
    router.replace(href);
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open feature navigation"
        onPress={() => setMenuOpen(true)}
        style={styles.openButton}
      >
        <Text style={styles.openButtonText}>FEATURES</Text>
      </Pressable>
      <Modal
        animationType="slide"
        transparent
        visible={menuOpen}
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setMenuOpen(false)}>
          <View style={styles.panel} onStartShouldSetResponder={() => true}>
            <View style={styles.panelHeader}>
              <Text style={styles.title}>Go to a feature</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setMenuOpen(false)}
                hitSlop={10}
              >
                <Text style={styles.closeText}>Close</Text>
              </Pressable>
            </View>
            <ScrollView>
              {features.map((feature) => (
                <Pressable
                  key={feature.label}
                  accessibilityRole="button"
                  onPress={() => openFeature(feature.href)}
                  style={[
                    styles.featureRow,
                    pathname === feature.href && styles.activeFeatureRow,
                  ]}
                >
                  <Text
                    style={[
                      styles.featureText,
                      pathname === feature.href && styles.activeFeatureText,
                    ]}
                  >
                    {feature.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  openButton: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 28 : 8,
    right: spacing.base,
    zIndex: 10,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  openButtonText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  panel: {
    maxHeight: '80%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  closeText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    padding: spacing.sm,
  },
  featureRow: {
    minHeight: 48,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingHorizontal: spacing.md,
  },
  activeFeatureRow: {
    backgroundColor: colors.primarySoft,
    borderRadius: borderRadius.sm,
  },
  featureText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  activeFeatureText: {
    color: colors.primary,
    fontWeight: '700',
  },
});
