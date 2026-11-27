/**
 * Orders strings by UTF-16 code unit. For identifiers (wallet ids, cache
 * keys, signatures) where only a stable order matters: `localeCompare` goes
 * through ICU collation, which costs tens of milliseconds per Home render on
 * Android Hermes once a list has a few dozen entries. Not for anything a
 * person reads — use localeCompare there.
 */
export const compareCodeUnits = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;
