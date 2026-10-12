import * as Sentry from '@sentry/react-native';

export type VaultCode =
  | 'MODERN_KEY_FAILURE'
  | 'NEW_KEY_VERIFICATION'
  | 'INVALID_LEGACY_INPUT'
  | 'SOURCE_CONFLICT'
  | 'REQUIRED_COPY_FAILURE'
  | 'CLEANUP_DEFERRED'
  | 'STARTUP_FAILURE';
export type VaultPhase =
  | 'key'
  | 'inventory'
  | 'classify'
  | 'required-copy'
  | 'cleanup'
  | 'startup'
  | 'conversion';
export type VaultReason =
  | 'KEY_UNAVAILABLE'
  | 'KEY_INVALID'
  | 'KEY_STORAGE'
  | 'KEY_RETIREMENT'
  | 'RECORD_INVALID'
  | 'RECORD_READ'
  | 'RECORD_WRITE'
  | 'SOURCE_READ'
  | 'SOURCE_CHANGED'
  | 'SOURCE_INVALID'
  | 'COPY_WRITE'
  | 'COPY_VERIFICATION'
  | 'CLEANUP_PENDING';
export type VaultSource = 'key' | 'record' | 'mmkv' | 'async' | 'main' | 'bak';
type Diagnostic = {
  code: VaultCode;
  phase: VaultPhase;
  reason?: VaultReason;
  source?: VaultSource;
};
// Identity lookup never touches native messages, getters, causes or prototypes.
const diagnostics = new WeakMap<Error, Readonly<Diagnostic>>();
export const vaultError = (
  code: VaultCode,
  phase: VaultPhase,
  reason?: VaultReason,
  source?: VaultSource,
): Error => {
  const error = new Error(`Vault migration failed: ${code} (${phase})`);
  error.stack = undefined;
  diagnostics.set(
    error,
    Object.freeze({
      code,
      phase,
      ...(reason ? {reason} : {}),
      ...(source ? {source} : {}),
    }),
  );
  return error;
};
export const safeVaultError = (
  error: unknown,
  code: VaultCode = 'STARTUP_FAILURE',
  phase: VaultPhase = 'startup',
  reason?: VaultReason,
  source?: VaultSource,
): Error =>
  diagnostics.has(error as Error)
    ? (error as Error)
    : vaultError(code, phase, reason, source);
export const vaultDiagnostic = (error: Error) => diagnostics.get(error);

export const reportVaultStartupFailure = (error: unknown): void => {
  try {
    const known = diagnostics.get(error as Error);
    if (!known) {
      Sentry.captureException(error, {level: 'error'});
      return;
    }
    // Construct a fresh reporting object even for classified errors. A caller
    // may have attached a cause/stack or replaced a property after creation.
    const safe = vaultError(
      known.code,
      known.phase,
      known.reason,
      known.source,
    );
    const diagnostic = diagnostics.get(safe)!;
    Sentry.captureException(safe, {
      level: 'error',
      tags: {
        vaultCode: diagnostic.code,
        vaultPhase: diagnostic.phase,
        ...(diagnostic.reason ? {vaultReason: diagnostic.reason} : {}),
        ...(diagnostic.source ? {vaultSource: diagnostic.source} : {}),
      },
    });
  } catch {}
};
