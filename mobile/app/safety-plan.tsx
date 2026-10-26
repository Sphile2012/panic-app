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

const CATEGORIES = [
  { key: 'trusted_people', label: 'Trusted People', icon: 'TC', placeholder: 'Who can I contact if I feel unsafe?' },
  { key: 'safe_places', label: 'Safe Places', icon: 'SP', placeholder: 'Where can I go if I need to leave quickly?' },
  { key: 'emergency_numbers', label: 'Emergency Numbers', icon: 'EN', placeholder: 'Important numbers to remember' },
  { key: 'important_documents', label: 'Important Documents', icon: 'ID', placeholder: 'What documents should I keep safe?' },
  { key: 'transport', label: 'Transport Options', icon: 'TR', placeholder: 'How can I leave safely?' },
  { key: 'things_to_remember', label: 'Things to Remember', icon: 'TM', placeholder: 'Other important information' },
];

export default function SafetyPlanScreen() {
  const [plan, setPlan] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);

  useEffect(() => {
    void loadSafetyPlan();
  }, []);

  async function loadSafetyPlan() {
    try {
      const client = getSupabaseClient();
      const { data: { session } } = await client.auth.getSession();
      if (!session) return;

      const { data, error } = await client
        .from('safety_plans')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setPlan({
          trusted_people: data.trusted_people || '',
          safe_places: data.safe_places || '',
          emergency_numbers: data.emergency_numbers || '',
          important_documents: data.important_documents || '',
          transport: data.transport || '',
          things_to_remember: data.things_to_remember || '',
        });
      }
    } catch {
      Alert.alert('Error', 'Could not load safety plan.');
    } finally {
      setLoading(false);
    }
  }

  async function saveSafetyPlan() {
    setSaving(true);
    try {
      const client = getSupabaseClient();
      const { data: { session } } = await client.auth.getSession();
      if (!session) throw new Error('Not signed in');

      const { error } = await client.from('safety_plans').upsert({
        user_id: session.user.id,
        ...plan,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      Alert.alert('Saved', 'Your safety plan has been updated.');
      setEditingCategory(null);
    } catch {
      Alert.alert('Error', 'Could not save safety plan.');
    } finally {
      setSaving(false);
    }
  }

  function updateCategory(category: string, value: string) {
    setPlan({ ...plan, [category]: value });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Link href="/" asChild>
          <Pressable accessibilityRole="button" style={styles.back}>
            <Text style={styles.backText}>‹  Back</Text>
          </Pressable>
        </Link>
        <Text style={styles.title}>My Safety Plan</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Plan for Your Safety</Text>
        <Text style={styles.infoBody}>
          Prepare before an emergency. Write down trusted people, safe places, and important
          information you might need. This is stored privately and encrypted.
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <>
          {CATEGORIES.map((category) => (
            <View key={category.key} style={styles.categoryCard}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryIcon}>{category.icon}</Text>
                <Text style={styles.categoryLabel}>{category.label}</Text>
              </View>

              {editingCategory === category.key ? (
                <>
                  <TextInput
                    style={styles.textarea}
                    value={plan[category.key] || ''}
                    onChangeText={(value) => updateCategory(category.key, value)}
                    placeholder={category.placeholder}
                    placeholderTextColor={colors.placeholder}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                  <View style={styles.buttonRow}>
                    <Pressable
                      style={styles.secondaryButton}
                      onPress={() => {
                        setEditingCategory(null);
                        void loadSafetyPlan();
                      }}
                    >
                      <Text style={styles.secondaryButtonText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.primaryButton, saving && styles.disabledButton]}
                      onPress={saveSafetyPlan}
                      disabled={saving}
                    >
                      {saving ? (
                        <ActivityIndicator color={colors.surface} size="small" />
                      ) : (
                        <Text style={styles.primaryButtonText}>Save</Text>
                      )}
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  {plan[category.key] ? (
                    <Text style={styles.categoryContent}>{plan[category.key]}</Text>
                  ) : (
                    <Text style={styles.categoryEmpty}>No information added yet</Text>
                  )}
                  <Pressable
                    style={styles.editButton}
                    onPress={() => setEditingCategory(category.key)}
                  >
                    <Text style={styles.editButtonText}>
                      {plan[category.key] ? 'Edit' : 'Add'}
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          ))}

          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>Tips for Your Safety Plan</Text>
            <View style={styles.tipsList}>
              <Text style={styles.tipItem}>
                Keep this information updated as your situation changes
              </Text>
              <Text style={styles.tipItem}>
                Include people who live nearby and far away
              </Text>
              <Text style={styles.tipItem}>
                • Think about different times of day and scenarios
              </Text>
              <Text style={styles.tipItem}>
                • Consider what you would need if you had to leave quickly
              </Text>
              <Text style={styles.tipItem}>
                • Your safety plan is private and encrypted
              </Text>
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
  categoryCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  categoryIcon: { fontSize: 24 },
  categoryLabel: { color: colors.text, fontSize: 18, fontWeight: '700' },
  categoryContent: { color: colors.text, fontSize: 15, lineHeight: 22, marginBottom: 16 },
  categoryEmpty: { color: colors.textSecondary, fontSize: 14, fontStyle: 'italic', marginBottom: 16 },
  textarea: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    minHeight: 100,
    padding: 14,
    marginBottom: 16,
  },
  buttonRow: { flexDirection: 'row', gap: 12 },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 44,
  },
  disabledButton: { opacity: 0.5 },
  primaryButtonText: { color: colors.surface, fontSize: 15, fontWeight: '700' },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    borderColor: colors.accent,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  secondaryButtonText: { color: colors.accent, fontSize: 15, fontWeight: '700' },
  editButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.accentSoft,
  },
  editButtonText: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  tipsCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
  },
  tipsTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  tipsList: { gap: 8 },
  tipItem: { color: colors.textSecondary, fontSize: 14, lineHeight: 21 },
});
