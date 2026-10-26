import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { getSupabaseClient } from '../src/lib/supabase';
import { colors, spacing, borderRadius, shadows, typography } from '../src/lib/theme';

type Contact = {
  id: string;
  name: string;
  phone: string;
  status: 'pending' | 'accepted';
};

export default function CircleScreen() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

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
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Could not load contacts.');
    } finally {
      setLoading(false);
    }
  }

  async function addContact() {
    if (!newName.trim() || !newPhone.trim()) {
      Alert.alert('Missing Information', 'Please enter both name and phone number.');
      return;
    }

    if (contacts.length >= 5) {
      Alert.alert('Limit Reached', 'You can have up to 5 trusted contacts.');
      return;
    }

    setAdding(true);
    try {
      const client = getSupabaseClient();
      const { data: { session } } = await client.auth.getSession();
      if (!session) throw new Error('Not signed in');

      const { error } = await client.from('contacts').insert({
        user_id: session.user.id,
        name: newName.trim(),
        phone: newPhone.trim(),
        status: 'accepted', // In real app, this would be 'pending' until contact accepts
      });

      if (error) throw error;

      setNewName('');
      setNewPhone('');
      await loadContacts();
      Alert.alert('Success', `${newName} has been added to your Trusted Circle.`);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Could not add contact.');
    } finally {
      setAdding(false);
    }
  }

  async function removeContact(contact: Contact) {
    Alert.alert(
      'Remove Contact',
      `Remove ${contact.name} from your Trusted Circle?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const client = getSupabaseClient();
              const { error } = await client.from('contacts').delete().eq('id', contact.id);
              if (error) throw error;
              await loadContacts();
            } catch (error) {
              Alert.alert('Error', 'Could not remove contact.');
            }
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
        <Text style={styles.title}>Trusted Circle</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Your trusted contacts</Text>
        <Text style={styles.infoBody}>
          These people will receive alerts when you activate SOS. Choose people you trust who can
          help in an emergency. You can have up to 5 contacts.
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <>
          <View style={styles.contactsList}>
            {contacts.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No trusted contacts yet</Text>
                <Text style={styles.emptySubtext}>Add someone who can help in an emergency</Text>
              </View>
            ) : (
              contacts.map((contact) => (
                <View key={contact.id} style={styles.contactCard}>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactPhone}>{contact.phone}</Text>
                    <Text
                      style={[
                        styles.contactStatus,
                        contact.status === 'accepted' && styles.contactStatusAccepted,
                      ]}
                    >
                      {contact.status === 'accepted' ? 'Accepted' : 'Invite pending'}
                    </Text>
                  </View>
                  <Pressable
                    style={styles.removeButton}
                    onPress={() => removeContact(contact)}
                    accessibilityLabel={`Remove ${contact.name}`}
                  >
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </Pressable>
                </View>
              ))
            )}
          </View>

          {contacts.length < 5 && (
            <View style={styles.addCard}>
              <Text style={styles.addTitle}>Add a trusted contact</Text>
              <Text style={styles.label}>Contact name</Text>
              <TextInput
                style={styles.input}
                value={newName}
                onChangeText={setNewName}
                placeholder="e.g., Sarah"
                placeholderTextColor={colors.placeholder}
                editable={!adding}
              />
              <Text style={styles.label}>Phone number</Text>
              <TextInput
                style={styles.input}
                value={newPhone}
                onChangeText={setNewPhone}
                placeholder="e.g., 0821234567"
                placeholderTextColor={colors.placeholder}
                keyboardType="phone-pad"
                editable={!adding}
              />
              <Pressable
                style={[styles.primaryButton, adding && styles.disabledButton]}
                onPress={addContact}
                disabled={adding}
              >
                {adding ? (
                  <ActivityIndicator color={colors.surface} />
                ) : (
                  <Text style={styles.primaryButtonText}>Add Contact</Text>
                )}
              </Pressable>
            </View>
          )}
        </>
      )}

      <View style={styles.noteCard}>
        <Text style={styles.noteText}>
          <Text style={styles.noteBold}>Note:</Text> Your contacts can remove themselves from
          your Trusted Circle at any time. You can also remove anyone from here.
        </Text>
      </View>
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
  infoCard: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryLight,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    ...shadows.sm,
  },
  infoTitle: { color: colors.text, fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, marginBottom: spacing.sm, textAlign: 'center' },
  infoBody: { color: colors.textSecondary, fontSize: typography.fontSize.sm, lineHeight: typography.lineHeight.relaxed * typography.fontSize.sm, textAlign: 'center' },
  loadingContainer: { paddingVertical: spacing['3xl'], alignItems: 'center' },
  contactsList: { marginBottom: spacing.xl },
  emptyState: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing['3xl'],
    alignItems: 'center',
    ...shadows.sm,
  },
  emptyText: { color: colors.text, fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, marginBottom: spacing.sm },
  emptySubtext: { color: colors.textSecondary, fontSize: typography.fontSize.sm, textAlign: 'center' },
  contactCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.base,
  },
  contactInfo: { flex: 1 },
  contactName: { color: colors.text, fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, marginBottom: 4 },
  contactPhone: { color: colors.textSecondary, fontSize: typography.fontSize.base, marginBottom: 6 },
  contactStatus: { color: colors.textSecondary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold },
  contactStatusAccepted: { color: colors.success },
  removeButton: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.base,
    backgroundColor: colors.dangerLight,
  },
  removeButtonText: { color: colors.danger, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold },
  addCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    ...shadows.base,
  },
  addTitle: { color: colors.text, fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, marginBottom: spacing.base },
  label: { color: colors.text, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.sm, marginTop: spacing.md },
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
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    marginTop: spacing.lg,
    minHeight: 52,
    ...shadows.md,
  },
  disabledButton: { opacity: 0.5 },
  primaryButtonText: { color: colors.textInverse, fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.bold },
  noteCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.md,
    padding: spacing.base,
  },
  noteText: { color: colors.textSecondary, fontSize: typography.fontSize.sm, lineHeight: typography.lineHeight.normal * typography.fontSize.sm },
  noteBold: { fontWeight: typography.fontWeight.bold, color: colors.text },
});
