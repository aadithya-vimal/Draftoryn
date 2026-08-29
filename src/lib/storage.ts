import type { StorageAdapter } from "../repository/types";

export class MemoryStorage implements StorageAdapter {
  private store = new Map<string, string>();
  async get(key: string): Promise<string | null> {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  async set(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }
  async remove(key: string): Promise<void> {
    this.store.delete(key);
  }
  async keys(prefix = ""): Promise<string[]> {
    return [...this.store.keys()].filter((k) => k.startsWith(prefix));
  }
}

export function createWebStorage(): StorageAdapter {
  const ls = (globalThis as any).localStorage as any;
  if (!ls) return new MemoryStorage();
  return {
    async get(key) {
      return ls.getItem(key);
    },
    async set(key, value) {
      ls.setItem(key, value);
    },
    async remove(key) {
      ls.removeItem(key);
    },
    async keys(prefix = "") {
      const out: string[] = [];
      for (let i = 0; i < ls.length; i++) {
        const k = ls.key(i);
        if (k && k.startsWith(prefix)) out.push(k);
      }
      return out;
    },
  };
}

let nativeStorage: StorageAdapter | null = null;
export function getPlatformStorage(): StorageAdapter {
  if (nativeStorage) return nativeStorage;
  // On native, AsyncStorage is provided by React Native; load lazily so that
  // non-native environments (Node, web) do not require the native module.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("@react-native-async-storage/async-storage");
    const AsyncStorage = mod.default ?? mod;
    nativeStorage = {
      async get(key) {
        return (await AsyncStorage.getItem(key)) as string | null;
      },
      async set(key, value) {
        await AsyncStorage.setItem(key, value);
      },
      async remove(key) {
        await AsyncStorage.removeItem(key);
      },
      async keys(prefix = "") {
        const all = await AsyncStorage.getAllKeys();
        return (all as string[]).filter((k: string) => k.startsWith(prefix));
      },
    };
  } catch {
    nativeStorage = createWebStorage();
  }
  return nativeStorage;
}
