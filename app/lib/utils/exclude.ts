/**
 * TR: Verilen bir objeden (nesneden) belirtilen anahtarları/alanları güvenle çıkarır.
 * EN: Safely excludes specified keys/fields from a given object.
 * Input: user (User object), keys (Array of keys to remove)
 * Output: Object (Omit<User, Key>)
 */
export function exclude<User, Key extends keyof User>(
  user: User,
  keys: Key[]
): Omit<User, Key> {
  const result = { ...user };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}
