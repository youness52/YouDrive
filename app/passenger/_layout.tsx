import { Stack } from 'expo-router';

export default function PassengerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="request" />
      <Stack.Screen name="tracking" />
      <Stack.Screen name="rating" />
    </Stack>
  );
}
