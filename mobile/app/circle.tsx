import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import {
  addTrustedContact,
  isValidPhoneNumber,
  listTrustedContacts,
  removeTrustedContact,
  type TrustedContact,
} from '../src/lib/emergency';
import { colors } from '../src/lib/theme';

export default function CircleScreen() {
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const refreshContacts = useCallback(async () => {
    setLoading(true);
    try {
      setContacts(await listTrustedContacts());
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load your trusted circle.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshContacts();
  }, [refreshContacts]);

  async function saveContact() {
    if (!name.trim()) {
      setMessage('Enter the contact’s name.');
      return;
    }
    if (!isValidPhoneNumber(phone)) {
      setMessage('Use an international number such as +27123456789.');
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      await addTrustedContact(name, phone);
      setName('');
      setPhone('');
      await refreshContacts();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not add this contact.');
    } finally {
      setBusy(false);
    }
  }

  function confirmRemove(contact: TrustedContact) {
    Alert.alert(
      'Remove trusted contact?',
      `${contact.display_name} will no longer appear in your SOS recipient list.`,
      [
        { text: 'Keep contact', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setBusy(true);
              try {
                await removeTrustedContact(contact.id);
                await refreshContacts();
              } catch (error) {
                setMessage(error instanceof Error ? error.message : 'Could not remove this contact.');
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ],
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <Link href="/" style={styles.back}>‹  Account</Link>
        <Text style={styles.title}>Trusted circle</Text>
        <Text style={styles.body}>
          Add people you trust. Panic Ring opens your SMS composer with these numbers and an emergency message for you to review and send.
        </Text>
        <Text style={styles.notice}>
          Contacts are stored in your account. Confirm each person’s permission and phone number yourself. SMS opening is not proof of delivery.
        </Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Add a contact</Text>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            maxLength={80}
            autoCapitalize="words"
            accessibilityLabel="Contact name"
          />
          <Text style={styles.label}>Phone number, including country code</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            maxLength={16}
            autoCapitalize="none"
            keyboardType="phone-pad"
            placeholder="+27123456789"
            placeholderTextColor={colors.placeholder}
            accessibilityLabel="Contact phone number in international format"
          />
          {message ? <Text style={styles.message} accessibilityLiveRegion="polite">{message}</Text> : null}
          <Pressable
            style={[styles.primaryButton, busy && styles.disabledButton]}
            onPress={() => void saveContact()}
            disabled={busy}
            accessibilityRole="button"
          >
            {busy ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryButtonText}>Add to circle</Text>}
          </Pressable>
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>Your contacts</Text>
          <Pressable onPress={() => void refreshContacts()} disabled={loading || busy} accessibilityRole="button">
            <Text style={styles.refresh}>Refresh</Text>
          </Pressable>
        </View>
        {loading ? (
          <ActivityIndicator color={colors.accent} style={styles.loading} />
        ) : contacts.length === 0 ? (
          <Text style={styles.empty}>Your circle is empty. Add someone you trust above.</Text>
        ) : contacts.map((contact) => (
          <View key={contact.id} style={styles.contact}>
            <View style={styles.contactCopy}>
              <Text style={styles.contactName}>{contact.display_name}</Text>
              <Text style={styles.contactPhone}>{contact.phone_number}</Text>
            </View>
            <Pressable
              style={styles.removeButton}
              onPress={() => confirmRemove(contact)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${contact.display_name}`}
              hitSlop={8}
            >
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          </View>
        ))}
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
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, marginTop: 20, padding: 18 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  label: { color: colors.text, fontSize: 13, fontWeight: '600', marginBottom: 7, marginTop: 17 },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 10, borderWidth: 1, color: colors.text, fontSize: 16, minHeight: 50, paddingHorizontal: 14 },
  message: { color: colors.danger, fontSize: 14, lineHeight: 20, marginTop: 12 },
  primaryButton: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 12, justifyContent: 'center', marginTop: 20, minHeight: 52 },
  disabledButton: { opacity: 0.55 },
  primaryButtonText: { color: colors.surface, fontSize: 16, fontWeight: '700' },
  listHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 26 },
  refresh: { color: colors.accent, fontSize: 14, fontWeight: '600', padding: 8 },
  loading: { marginTop: 22 },
  empty: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 14 },
  contact: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 13, borderWidth: 1, flexDirection: 'row', marginTop: 10, minHeight: 74, paddingHorizontal: 14 },
  contactCopy: { flex: 1, paddingVertical: 12 },
  contactName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  contactPhone: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  removeButton: { alignItems: 'center', justifyContent: 'center', minHeight: 44, paddingHorizontal: 10 },
  removeText: { color: colors.danger, fontSize: 13, fontWeight: '600' },
});
