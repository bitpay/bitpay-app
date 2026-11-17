import {Platform} from 'react-native';
import RNFS from 'react-native-fs';
import type {Effect} from '.';
import {APP_ANALYTICS_ENABLED} from '../constants/config';
import {logManager} from '../managers/LogManager';
import {Analytics} from './analytics/analytics.effects';
import {setVaultMigrationStatusReported} from './app/app.actions';
import {
  readVaultTransferRecord,
  vaultLegacySourceExists,
} from './vault-runtime';
import {LEGACY_RETIREMENT_ENABLED} from './vault-retirement-policy';

const MMKV_RELEASE_CUTOFF_SECONDS = 1693434851;
// v.14.14.0 published 2023-08-30T22:34:11Z.
type LegacyStatus = 'eligible' | 'absent' | 'blocked' | 'unknown';
type SourceSlot = Parameters<typeof vaultLegacySourceExists>[0];

const logFailure = () => {
  try {
    logManager.warn('Vault migration status telemetry could not be completed');
  } catch {}
};

const observeSource = async (slot: SourceSlot) => {
  try {
    const present = await vaultLegacySourceExists(slot);
    if (typeof present !== 'boolean') throw new Error();
    return present;
  } catch {
    logFailure();
    return undefined;
  }
};

const legacyStatus = async (
  permitted: boolean,
  ...slots: SourceSlot[]
): Promise<LegacyStatus> => {
  if (permitted) return 'eligible';
  // Each observation catches its own failure: either known-present MMKV file
  // establishes existence even if checking the other file fails.
  const present = await Promise.all(slots.map(observeSource));
  if (present.some(value => value === true)) return 'blocked';
  return present.every(value => value === false) ? 'absent' : 'unknown';
};

const legacyAsyncDb = async (platform: 'ios' | 'android') => {
  if (platform === 'ios') return 'n/a';
  try {
    const path = `${RNFS.DocumentDirectoryPath}/../databases/RKStorage`;
    const present = await RNFS.exists(path);
    if (present === false) return 'absent';
    if (present !== true) throw new Error();
    const {size} = await RNFS.stat(path);
    if (typeof size !== 'number' || !Number.isFinite(size) || size < 0)
      throw new Error();
    return size < 65536 ? 'small' : size < 1048576 ? 'medium' : 'large';
  } catch {
    logFailure();
    return 'unknown';
  }
};

export const reportVaultMigrationStatus =
  (): Effect<Promise<void>> => async (dispatch, getState) => {
    try {
      const {APP} = getState();
      // initAnalytics fills missing dates immediately after dispatching us.
      // Capture the value before any await, not the mutable APP object alone.
      const firstOpenDate = APP.appFirstOpenData?.firstOpenDate;
      if (!APP_ANALYTICS_ENABLED || Analytics.isMergingUser()) return;
      const record = readVaultTransferRecord();
      if (!record || record.phase === 'preparing') return;
      const {phase, copies, release} = record;
      // Canonical ordering; observations and policy are intentionally excluded.
      const signature = JSON.stringify([
        phase,
        copies.root,
        copies.main,
        copies.bak,
        release.data,
        release.crc,
        release.async,
        release.main,
        release.bak,
        release.temp,
      ]);
      if (APP.vaultMigrationStatusSignature === signature) return;
      const platform = Platform.OS;
      if (platform !== 'ios' && platform !== 'android') return;
      const [mmkv, async, main, bak, database] = await Promise.all([
        legacyStatus(release.data, 'data', 'crc'),
        legacyStatus(release.async, 'async'),
        legacyStatus(release.main, 'main'),
        legacyStatus(release.bak, 'bak'),
        legacyAsyncDb(platform),
      ]);
      await dispatch(
        Analytics.track(
          'Vault Migration Status',
          {
            phase,
            rootSource: copies.root ?? 'none',
            backupsConverted:
              Number(copies.main !== null) + Number(copies.bak !== null),
            legacyMmkv: mmkv,
            legacyAsync: async,
            legacyMainBackup: main,
            legacyBakBackup: bak,
            blockedCount: [mmkv, async, main, bak].filter(
              value => value === 'blocked',
            ).length,
            retirementEnabled: LEGACY_RETIREMENT_ENABLED,
            platform,
            firstOpenedBeforeMmkv:
              typeof firstOpenDate !== 'number' ||
              !Number.isFinite(firstOpenDate)
                ? 'unknown'
                : firstOpenDate < MMKV_RELEASE_CUTOFF_SECONDS,
            legacyAsyncDb: database,
          },
          () => {
            // The analytics guard discards its async callback's promise; this
            // catch must live inside onComplete, not just around track().
            try {
              dispatch(setVaultMigrationStatusReported(signature));
            } catch {
              logFailure();
            }
          },
        ),
      );
    } catch {
      logFailure();
    }
  };
