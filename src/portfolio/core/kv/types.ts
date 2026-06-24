export interface KvStore {
  /** Returns the stored string value, or null if not found. */
  getString(key: string): Promise<string | null>;

  /** Stores a string value. */
  setString(key: string, value: string): Promise<void>;

  /** Deletes a key (no-op if missing). */
  delete(key: string): Promise<void>;

  /** Lists keys in the store (optionally filtered by a prefix). */
  listKeys(prefix?: string): Promise<string[]>;

  /** Clears all keys in the store. */
  clearAll(): Promise<void>;
}

export function jsonParseSafe<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function jsonStringifySafe(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return 'null';
  }
}
