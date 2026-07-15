import * as SecureStore from "expo-secure-store";

export async function migratedSecureValue(
  currentKey: string,
  previousKey: string
): Promise<string | null> {
  const current = await SecureStore.getItemAsync(currentKey);
  if (current !== null) return current;
  const previous = await SecureStore.getItemAsync(previousKey);
  if (previous === null) return null;
  await SecureStore.setItemAsync(currentKey, previous, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  await SecureStore.deleteItemAsync(previousKey);
  return previous;
}
