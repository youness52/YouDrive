import { Stack } from 'expo-router';

export default function DriverLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="tracking" />
      <Stack.Screen name="earnings" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
