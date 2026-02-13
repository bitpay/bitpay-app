import merge from 'lodash.merge';
import {createTransform} from 'redux-persist';
import {Key, Wallet} from '../wallet/wallet.models';
import {BwcProvider} from '../../lib/bwc';
import type {PortfolioState} from '../portfolio/portfolio.models';
import type {BalanceSnapshot} from '../portfolio/portfolio.models';
import {
  BitpaySupportedUtxoCoins,
  OtherBitpaySupportedCoins,
} from '../../constants/currencies';
import {ContactState} from '../contact/contact.reducer';
import {WalletState} from '../wallet/wallet.reducer';
import {buildWalletObj} from '../wallet/utils/wallet';
import {ContactRowProps} from '../../components/list/ContactRow';
import {getErrorString} from '../../utils/helper-methods';
import {LogActions} from '../log';
import * as initLogs from '../log/initLogs';
import {
  encryptAppStore,
  decryptAppStore,
  encryptShopStore,
  decryptShopStore,
  encryptWalletStore,
  decryptWalletStore,
} from './encrypt';
import {logManager} from '../../managers/LogManager';
import {
  hydrateBalanceSnapshotsFromSeries,
  isBalanceSnapshotSeries,
  packBalanceSnapshotsToSeries,
} from '../../utils/portfolio/core/pnl/snapshotSeries';
import type {BalanceSnapshotStored} from '../../utils/portfolio/core/pnl/types';

const getUtcDayStartMs = (tsMs: number): number => {
  const d = new Date(tsMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const getSnapshotMarkRate = (
  snapshot: Partial<BalanceSnapshot> & {markRate?: unknown},
): number => {
  const costBasisRateFiat = toFiniteNumber(snapshot.costBasisRateFiat, NaN);
  if (!Number.isNaN(costBasisRateFiat)) {
    return costBasisRateFiat;
  }
  return toFiniteNumber(snapshot.markRate, 0);
};

const toSnapshotEventType = (
  value: unknown,
): BalanceSnapshotStored['eventType'] => {
  return value === 'daily' ? 'daily' : 'tx';
};

const isChronologicalByTimestamp = <T extends {timestamp?: unknown}>(
  snapshots: T[],
): boolean => {
  let prevTimestamp = Number.NEGATIVE_INFINITY;
  for (const snapshot of snapshots) {
    const timestamp = toFiniteNumber(snapshot.timestamp, 0);
    if (timestamp < prevTimestamp) {
      return false;
    }
    prevTimestamp = timestamp;
  }
  return true;
};

const ensureChronologicalByTimestamp = <T extends {timestamp?: unknown}>(
  snapshots: T[],
): T[] => {
  if (snapshots.length < 2 || isChronologicalByTimestamp(snapshots)) {
    return snapshots;
  }
  return snapshots
    .map((snapshot, index) => ({snapshot, index}))
    .sort((a, b) => {
      const tsDiff =
        toFiniteNumber(a.snapshot.timestamp, 0) -
        toFiniteNumber(b.snapshot.timestamp, 0);
      if (tsDiff !== 0) {
        return tsDiff;
      }
      // Stable tie-break when timestamps are equal.
      return a.index - b.index;
    })
    .map(({snapshot}) => snapshot);
};

const BWCProvider = BwcProvider.getInstance();

// Helper for logging transform failures before the store exists
const logTransformFailure = (
  phase: 'encrypt' | 'decrypt',
  store: 'Wallet' | 'App' | 'Shop',
  error: unknown,
) => {
  try {
    initLogs.add(
      LogActions.persistLog(
        LogActions.error(
          `${phase}${store}Store failed - ${getErrorString(error)}`,
        ),
      ),
    );
  } catch (_) {}
};

export const bootstrapWallets = (wallets: Wallet[]) => {
  return wallets
    .map(wallet => {
      try {
        // reset transaction history
        wallet.transactionHistory = {
          transactions: [],
          loadMore: true,
          hasConfirmingTxs: false,
        };
        const walletClient = BWCProvider.getClient(
          JSON.stringify(wallet.credentials),
        );
        const successLog = `bindWalletClient - ${wallet.id}`;
        logManager.info(successLog);
        // build wallet obj with bwc client credentials
        return merge(
          walletClient,
          wallet,
          buildWalletObj({
            ...walletClient.credentials,
            ...wallet,
          } as any),
        );
      } catch (err: unknown) {
        const errorLog = `Failed to bindWalletClient - ${
          wallet.id
        } - ${getErrorString(err)}`;
        initLogs.add(LogActions.persistLog(LogActions.error(errorLog)));
      }
    })
    .filter((w): w is NonNullable<typeof w> => w !== undefined);
};

export const bootstrapKey = (key: Key, id: string) => {
  if (id === 'readonly') {
    return key;
  } else if (key.hardwareSource) {
    return key;
  } else if (key.properties?.metadata) {
    try {
      const properties = JSON.parse(JSON.stringify(key.properties));
      const privateKeyShare = key.properties.keychain?.privateKeyShare as any;
      if (privateKeyShare?.data) {
        properties.keychain.privateKeyShare = Buffer.from(privateKeyShare.data);
        console.log(
          '[bootstrapKey] privateKeyShare restored, length:',
          properties.keychain.privateKeyShare.length,
        );
      }

      const reducedPrivateKeyShare = key.properties.keychain
        ?.reducedPrivateKeyShare as any;
      if (reducedPrivateKeyShare?.data) {
        properties.keychain.reducedPrivateKeyShare = Buffer.from(
          reducedPrivateKeyShare.data,
        );
      }
      const tssKey = BWCProvider.createTssKey(properties);
      const _key = merge(key, {
        methods: tssKey,
      });

      const successLog = `bindTssKey - ${id}`;
      initLogs.add(LogActions.info(successLog));
      return _key;
    } catch (err: unknown) {
      const errorLog = `Failed to bindTssKey - ${id} - ${getErrorString(err)}`;
      initLogs.add(LogActions.persistLog(LogActions.error(errorLog)));
    }
  } else {
    try {
      const _key = merge(key, {
        methods: BWCProvider.createKey({
          seedType: 'object',
          seedData: key.properties,
        }),
      });
      const successLog = `bindKey - ${id}`;
      logManager.info(successLog);
      return _key;
    } catch (err: unknown) {
      const errorLog = `Failed to bindWalletKeys - ${id} - ${getErrorString(
        err,
      )}`;
      initLogs.add(LogActions.persistLog(LogActions.error(errorLog)));
    }
  }
};

export const bindWalletKeys = createTransform<WalletState, WalletState>(
  // transform state on its way to being serialized and persisted.
  inboundState => {
    const keys = inboundState.keys || {};
    if (Object.keys(keys).length > 0) {
      for (const [id, key] of Object.entries(keys)) {
        key.wallets.forEach(wallet => delete wallet.transactionHistory);

        inboundState.keys[id] = {
          ...key,
        };
      }
    }
    return inboundState;
  },
  // transform state being rehydrated
  outboundState => {
    const keys = outboundState.keys || {};
    if (Object.keys(keys).length > 0) {
      for (const [id, key] of Object.entries(keys)) {
        const bootstrappedKey = bootstrapKey(key, id);
        const wallets = bootstrapWallets(key.wallets);

        if (bootstrappedKey) {
          outboundState.keys[id] = {...bootstrappedKey, wallets};
        }
      }
    }
    return outboundState;
  },
  {whitelist: ['WALLET']},
);

export const transformContacts = createTransform<ContactState, ContactState>(
  inboundState => inboundState,
  outboundState => {
    try {
      const contactList = outboundState.list || [];
      if (contactList.length > 0) {
        const migratedContacts = contactList.map(contact => ({
          ...contact,
          chain:
            contact.chain ||
            (OtherBitpaySupportedCoins[contact.coin] ||
            BitpaySupportedUtxoCoins[contact.coin]
              ? contact.coin
              : 'eth'),
        })) as ContactRowProps[];
        outboundState.list = migratedContacts;
      }
      return outboundState;
    } catch (_) {
      return outboundState;
    }
  },
  {whitelist: ['CONTACT']},
);

export const transformPortfolioPopulateStatus = createTransform<
  PortfolioState,
  PortfolioState
>(
  inboundState => inboundState,
  outboundState => {
    if (outboundState?.populateStatus?.inProgress) {
      return {
        ...outboundState,
        populateStatus: {
          ...outboundState.populateStatus,
          inProgress: false,
          currentWalletId: undefined,
        },
      };
    }
    return outboundState;
  },
  {whitelist: ['PORTFOLIO']},
);

// Persist portfolio snapshots in a compact series format to reduce storage + parse costs.
const ENABLE_PORTFOLIO_SNAPSHOT_SERIES_PERSIST_COMPRESSION = true;

export const transformPortfolioSnapshotSeries = createTransform<
  PortfolioState,
  any
>(
  inboundState => {
    if (!ENABLE_PORTFOLIO_SNAPSHOT_SERIES_PERSIST_COMPRESSION) {
      return inboundState;
    }
    try {
      const map = (inboundState as any)?.snapshotsByWalletId || {};
      const outMap: Record<string, any> = {};

      for (const [walletId, snapsRaw] of Object.entries(map)) {
        const snaps = Array.isArray(snapsRaw)
          ? (snapsRaw as BalanceSnapshot[])
          : [];
        if (!snaps.length) continue;
        const orderedSnaps = ensureChronologicalByTimestamp(snaps);

        const compressionEnabled = orderedSnaps.some(
          s => s.eventType === 'daily',
        );
        const lastSnapshot = orderedSnaps[orderedSnaps.length - 1];
        const createdAt = toFiniteNumber(lastSnapshot?.createdAt, Date.now());

        const minimal: BalanceSnapshotStored[] = orderedSnaps.map(s => {
          const snapshot = (s || {}) as Partial<BalanceSnapshot> & {
            walletId?: unknown;
            markRate?: unknown;
          };
          const markRate = getSnapshotMarkRate(snapshot);

          return {
            id: String(snapshot.id || ''),
            walletId: String(snapshot.walletId || walletId),
            chain: String(snapshot.chain || ''),
            coin: String(snapshot.coin || ''),
            network: String(snapshot.network || ''),
            assetId: String(snapshot.assetId || ''),
            timestamp: toFiniteNumber(snapshot.timestamp, 0),
            eventType: toSnapshotEventType(snapshot.eventType),
            txIds: Array.isArray(snapshot.txIds)
              ? snapshot.txIds.map(String)
              : undefined,
            // In this app's PORTFOLIO store, cryptoBalance is a UNIT string,
            // even though BalanceSnapshotStored's core comment calls it atomic.
            cryptoBalance: String(snapshot.cryptoBalance || '0'),
            balanceDeltaAtomic: snapshot.balanceDeltaAtomic,
            remainingCostBasisFiat: toFiniteNumber(
              snapshot.remainingCostBasisFiat,
              0,
            ),
            quoteCurrency: String(
              snapshot.quoteCurrency ||
                (inboundState as any)?.quoteCurrency ||
                '',
            ),
            markRate: toFiniteNumber(markRate, 0),
            createdAt:
              typeof snapshot.createdAt === 'number'
                ? snapshot.createdAt
                : undefined,
          };
        });

        const series = packBalanceSnapshotsToSeries({
          snapshots: minimal,
          compressionEnabled,
          createdAt,
        });

        if (series) {
          outMap[walletId] = series;
        }
      }

      return {
        ...inboundState,
        snapshotsByWalletId: outMap as any,
      };
    } catch (_) {
      return inboundState;
    }
  },
  outboundState => {
    try {
      const map = (outboundState as any)?.snapshotsByWalletId || {};
      const outMap: Record<string, BalanceSnapshot[]> = {};

      for (const [walletId, value] of Object.entries(map)) {
        if (isBalanceSnapshotSeries(value)) {
          const minimal = ensureChronologicalByTimestamp(
            hydrateBalanceSnapshotsFromSeries(value),
          );
          const snaps: BalanceSnapshot[] = minimal.map(s => {
            const units = toFiniteNumber(s.cryptoBalance, 0);
            const markRate = toFiniteNumber(s.markRate, 0);
            const fiatBalance = units * markRate;
            const remainingCostBasisFiat = toFiniteNumber(
              s.remainingCostBasisFiat || 0,
              0,
            );
            const avgCostFiatPerUnit =
              units > 0 ? remainingCostBasisFiat / units : 0;
            const unrealizedPnlFiat = fiatBalance - remainingCostBasisFiat;
            const txIds =
              Array.isArray(s.txIds) && s.txIds.length > 1
                ? s.txIds
                : undefined;

            return {
              id: s.id,
              chain: s.chain,
              coin: s.coin,
              network: s.network,
              assetId: s.assetId,
              timestamp: s.timestamp,
              dayStartMs:
                s.eventType === 'daily'
                  ? getUtcDayStartMs(s.timestamp)
                  : undefined,
              eventType: s.eventType,
              txIds,
              balanceDeltaAtomic: s.balanceDeltaAtomic,
              cryptoBalance: s.cryptoBalance,
              avgCostFiatPerUnit,
              remainingCostBasisFiat,
              unrealizedPnlFiat,
              costBasisRateFiat: markRate,
              quoteCurrency: s.quoteCurrency,
              createdAt: s.createdAt,
            } as BalanceSnapshot;
          });
          outMap[walletId] = snaps;
        } else if (Array.isArray(value)) {
          // Support uncompressed/raw snapshots when inbound packing is disabled.
          outMap[walletId] = value as BalanceSnapshot[];
        }
      }

      return {
        ...outboundState,
        snapshotsByWalletId: outMap,
      };
    } catch (_) {
      return outboundState;
    }
  },
  {whitelist: ['PORTFOLIO']},
);

export const encryptSpecificFields = (secretKey: string) => {
  return createTransform(
    // Encrypt specified fields on inbound (saving to storage)
    (inboundState, key) => {
      if (key === 'WALLET') {
        try {
          return encryptWalletStore(inboundState, secretKey);
        } catch (error) {
          logTransformFailure('encrypt', 'Wallet', error);
        }
      }
      if (key === 'APP') {
        try {
          return encryptAppStore(inboundState, secretKey);
        } catch (error) {
          logTransformFailure('encrypt', 'App', error);
        }
      }
      if (key === 'SHOP') {
        try {
          return encryptShopStore(inboundState, secretKey);
        } catch (error) {
          logTransformFailure('encrypt', 'Shop', error);
        }
      }
      return inboundState;
    },
    // Decrypt specified fields on outbound (loading from storage)
    (outboundState, key) => {
      if (key === 'WALLET') {
        try {
          return decryptWalletStore(outboundState, secretKey);
        } catch (error) {
          logTransformFailure('decrypt', 'Wallet', error);
        }
      }
      if (key === 'APP') {
        try {
          return decryptAppStore(outboundState, secretKey);
        } catch (error) {
          logTransformFailure('decrypt', 'App', error);
        }
      }
      if (key === 'SHOP') {
        try {
          return decryptShopStore(outboundState, secretKey);
        } catch (error) {
          logTransformFailure('decrypt', 'Shop', error);
        }
      }
      return outboundState;
    },
  );
};
