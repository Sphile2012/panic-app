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
import { colors } from '../src/lib/theme';

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
                      {contact.status === 'accepted' ? '✓ Accepted' : '⏳ Invite pending'}
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
  content: { paddingBottom: 44, paddingHorizontal: 22, paddingTop: 48 },
  header: { marginBottom: 24 },
  back: { alignSelf: 'flex-start', paddingVertical: 10, paddingRight: 16, marginBottom: 12 },
  backText: { color: colors.accent, fontSize: 16, fontWeight: '600' },
  title: { color: colors.text, fontSize: 30, fontWeight: '800' },
  infoCard: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  infoIcon: { fontSize: 40, marginBottom: 12 },
  infoTitle: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  infoBody: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  loadingContainer: { paddingVertical: 40, alignItems: 'center' },
  contactsList: { marginBottom: 24 },
  emptyState: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySubtext: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },
  contactCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactInfo: { flex: 1 },
  contactName: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 4 },
  contactPhone: { color: colors.textSecondary, fontSize: 15, marginBottom: 6 },
  contactStatus: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  contactStatusAccepted: { color: colors.success },
  removeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.dangerSoft,
  },
  removeButtonText: { color: colors.danger, fontSize: 14, fontWeight: '700' },
  addCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  addTitle: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 16 },
  label: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 20,
    minHeight: 52,
  },
  disabledButton: { opacity: 0.5 },
  primaryButtonText: { color: colors.surface, fontSize: 16, fontWeight: '700' },
  noteCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    padding: 16,
  },
  noteText: { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
  noteBold: { fontWeight: '700', color: colors.text },
});
