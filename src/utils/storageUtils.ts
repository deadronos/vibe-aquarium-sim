type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export const readFromStorage = (key: string, fallback: string | null = null): string | null => {
  return safelyAccessStorage(
    key,
    (storage) => storage.getItem(key),
    fallback,
    'reading from'
  );
};

export const writeToStorage = (key: string, value: string) => {
  safelyAccessStorage(
    key,
    (storage) => storage.setItem(key, value),
    undefined,
    'writing to'
  );
};

export const readBoolFromStorage = (key: string, fallback: boolean): boolean => {
  return safelyAccessStorage(
    key,
    (storage) => {
      const raw = storage.getItem(key);
      return raw === null ? null : raw === 'true';
    },
    fallback,
    'reading bool from'
  );
};

export const writeBoolToStorage = (key: string, value: boolean) => {
  safelyAccessStorage(
    key,
    (storage) => storage.setItem(key, value ? 'true' : 'false'),
    undefined,
    'writing bool to'
  );
};

// Helper to encapsulate try/catch and window checks
function safelyAccessStorage<T>(
  key: string,
  operation: (storage: StorageLike) => T | null | undefined,
  fallback: T,
  actionDescription: string
): T {
  const storage = getStorage();
  if (!storage) return fallback;

  try {
    const result = operation(storage);
    // If the operation returns null/undefined (and fallback is not), return fallback.
    // However, for void operations (write), T is undefined, so we return undefined.
    // For read operations, if result is null, we return fallback.
    return (result as T) ?? fallback;
  } catch (error) {
    console.warn(`Error ${actionDescription} localStorage key "${key}":`, error);
    return fallback;
  }
}

function getStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;

  const storage = window.localStorage;
  if (!storage) return null;
  if (typeof storage.getItem !== 'function') return null;
  if (typeof storage.setItem !== 'function') return null;

  return storage;
}
