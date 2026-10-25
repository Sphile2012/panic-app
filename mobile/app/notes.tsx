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

type Note = {
  id: string;
  title: string;
  content: string;
  created_at: string;
};

export default function NotesScreen() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  useEffect(() => {
    void loadNotes();
  }, []);

  async function loadNotes() {
    try {
      const client = getSupabaseClient();
      const { data: { session } } = await client.auth.getSession();
      if (!session) return;

      const { data, error } = await client
        .from('notes')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      Alert.alert('Error', 'Could not load notes.');
    } finally {
      setLoading(false);
    }
  }

  async function createNote() {
    if (!newTitle.trim() || !newContent.trim()) {
      Alert.alert('Missing Information', 'Please enter both a title and content for your note.');
      return;
    }

    setCreating(true);
    try {
      const client = getSupabaseClient();
      const { data: { session } } = await client.auth.getSession();
      if (!session) throw new Error('Not signed in');

      const { error } = await client.from('notes').insert({
        user_id: session.user.id,
        title: newTitle.trim(),
        content: newContent.trim(),
      });

      if (error) throw error;

      setNewTitle('');
      setNewContent('');
      await loadNotes();
      Alert.alert('Saved', 'Your note has been saved securely.');
    } catch (error) {
      Alert.alert('Error', 'Could not save note.');
    } finally {
      setCreating(false);
    }
  }

  async function deleteNote(note: Note) {
    Alert.alert(
      'Delete Note',
      `Delete "${note.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const client = getSupabaseClient();
              const { error } = await client.from('notes').delete().eq('id', note.id);
              if (error) throw error;
              await loadNotes();
            } catch (error) {
              Alert.alert('Error', 'Could not delete note.');
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
        <Text style={styles.title}>Private Notes</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Secure Evidence Storage</Text>
        <Text style={styles.infoBody}>
          Document incidents privately. Your notes are encrypted and stored securely. Only you can
          access them.
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <>
          <View style={styles.createCard}>
            <Text style={styles.createTitle}>Create New Note</Text>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Brief description"
              placeholderTextColor={colors.placeholder}
              editable={!creating}
            />
            <Text style={styles.label}>Content</Text>
            <TextInput
              style={styles.textarea}
              value={newContent}
              onChangeText={setNewContent}
              placeholder="What happened? Include dates, times, locations, and any other important details..."
              placeholderTextColor={colors.placeholder}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              editable={!creating}
            />
            <Pressable
              style={[styles.primaryButton, creating && styles.disabledButton]}
              onPress={createNote}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <Text style={styles.primaryButtonText}>Save Note</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Your Notes ({notes.length})</Text>
            {notes.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📝</Text>
                <Text style={styles.emptyText}>No notes yet</Text>
                <Text style={styles.emptySubtext}>Create your first note above</Text>
              </View>
            ) : (
              notes.map((note) => (
                <View key={note.id} style={styles.noteCard}>
                  <View style={styles.noteHeader}>
                    <Text style={styles.noteTitle}>{note.title}</Text>
                    <Text style={styles.noteDate}>
                      {new Date(note.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={styles.noteContent} numberOfLines={3}>
                    {note.content}
                  </Text>
                  <Pressable
                    style={styles.deleteButton}
                    onPress={() => deleteNote(note)}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </Pressable>
                </View>
              ))
            )}
          </View>

          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>💡 What to Include</Text>
            <View style={styles.tipsList}>
              <Text style={styles.tipItem}>• Date and time of the incident</Text>
              <Text style={styles.tipItem}>• Location where it happened</Text>
              <Text style={styles.tipItem}>• Who was involved</Text>
              <Text style={styles.tipItem}>• What happened in detail</Text>
              <Text style={styles.tipItem}>• Any witnesses present</Text>
              <Text style={styles.tipItem}>• Photos or evidence (if safe to collect)</Text>
            </View>
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
  createCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  createTitle: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 16 },
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
  textarea: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    minHeight: 120,
    padding: 14,
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
  notesSection: { marginBottom: 24 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 16 },
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
  noteCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  noteTitle: { color: colors.text, fontSize: 18, fontWeight: '700', flex: 1 },
  noteDate: { color: colors.textSecondary, fontSize: 13 },
  noteContent: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginBottom: 12 },
  deleteButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.dangerSoft,
  },
  deleteButtonText: { color: colors.danger, fontSize: 14, fontWeight: '700' },
  tipsCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    padding: 20,
  },
  tipsTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  tipsList: { gap: 8 },
  tipItem: { color: colors.textSecondary, fontSize: 14, lineHeight: 21 },
});
