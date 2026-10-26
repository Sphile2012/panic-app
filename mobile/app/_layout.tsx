import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { FeatureNavigation } from '../src/components/FeatureNavigation';
import { colors } from '../src/lib/theme';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
      <FeatureNavigation />
    </>
  );
}
