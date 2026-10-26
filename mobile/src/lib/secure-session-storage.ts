import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const CHUNK_SIZE = 500;
const MARKER_PREFIX = 'panic-ring-secure-v1:';

type StoredChunks = {
  version: string;
  count: number;
};

function parseMarker(value: string | null): StoredChunks | null {
  if (!value?.startsWith(MARKER_PREFIX)) return null;
  const match = value.slice(MARKER_PREFIX.length).match(/^([a-z0-9-]+):([1-9]\d*)$/);
  if (!match) throw new Error('Secure sign-in storage is invalid. Sign in again.');
  const count = Number(match[2]);
  if (!Number.isSafeInteger(count) || count > 1000) {
    throw new Error('Secure sign-in storage is invalid. Sign in again.');
  }
  return { version: match[1], count };
}

async function readSecureValue(key: string, marker: string): Promise<string> {
  const chunks = parseMarker(marker);
  if (!chunks) return marker;

  const values = await Promise.all(
    Array.from({ length: chunks.count }, (_, index) =>
      SecureStore.getItemAsync(`${key}.pr.${chunks.version}.${index}`)),
  );
  if (values.some((chunk: string | null) => chunk === null)) {
    throw new Error('Secure sign-in storage is incomplete. Sign in again to restore your session.');
  }
  return values.map((chunk: string | null) => {
    if (chunk === null) throw new Error('Secure sign-in storage is incomplete. Sign in again to restore your session.');
    return chunk;
  }).join('');
}

async function writeSecureValue(key: string, value: string): Promise<void> {
  const previous = parseMarker(await SecureStore.getItemAsync(key));
  const version = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const chunks: string[] = [];
  let chunk = '';
  for (const character of value) {
    if (chunk.length + character.length > CHUNK_SIZE) {
      chunks.push(chunk);
      chunk = '';
    }
    chunk += character;
  }
  if (chunk || chunks.length === 0) chunks.push(chunk);
  if (chunks.length > 1000) throw new Error('Secure sign-in data is too large to store.');

  for (const [index, valueChunk] of chunks.entries()) {
    await SecureStore.setItemAsync(`${key}.pr.${version}.${index}`, valueChunk);
  }
  await SecureStore.setItemAsync(key, `${MARKER_PREFIX}${version}:${chunks.length}`);

  if (previous) {
    for (let index = 0; index < previous.count; index += 1) {
      await SecureStore.deleteItemAsync(`${key}.pr.${previous.version}.${index}`);
    }
  }
  await AsyncStorage.removeItem(key);
}

export const secureSessionStorage = {
  async getItem(key: string): Promise<string | null> {
    const secureMarker = await SecureStore.getItemAsync(key);
    if (secureMarker !== null) return readSecureValue(key, secureMarker);

    const legacyValue = await AsyncStorage.getItem(key);
    if (legacyValue === null) return null;
    await writeSecureValue(key, legacyValue);
    return legacyValue;
  },

  async setItem(key: string, value: string): Promise<void> {
    await writeSecureValue(key, value);
  },

  async removeItem(key: string): Promise<void> {
    const marker = await SecureStore.getItemAsync(key);
    const chunks = parseMarker(marker);
    await SecureStore.deleteItemAsync(key);
    if (chunks) {
      await Promise.all(Array.from({ length: chunks.count }, (_, index) =>
        SecureStore.deleteItemAsync(`${key}.pr.${chunks.version}.${index}`)));
    }
    await AsyncStorage.removeItem(key);
  },
};
