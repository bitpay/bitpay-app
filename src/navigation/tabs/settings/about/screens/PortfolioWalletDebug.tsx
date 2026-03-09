import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {InteractionManager, Platform, ScrollView} from 'react-native';
import styled from 'styled-components/native';
import {useTheme} from 'styled-components/native';
import {useTranslation} from 'react-i18next';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import Clipboard from '@react-native-clipboard/clipboard';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {getEncryptionKey, storage} from '../../../../../store';
import {encryptTransform} from 'redux-persist-transform-encrypt';
import {AboutGroupParamList, AboutScreens} from '../AboutGroup';
import {
  DebugButtonRow,
  DebugButtonSpacer,
  DebugHeaderContainer,
  DebugHeaderText,
  DebugPillButton,
  DebugPillButtonText,
  DebugScreenContainer,
} from '../components/DebugUI';
import {WalletScreens} from '../../../../wallet/WalletGroup';
import type {
  BalanceSnapshot,
  SnapshotBalanceMismatch,
} from '../../../../../store/portfolio/portfolio.models';
import type {Wallet} from '../../../../../store/wallet/wallet.models';
import {GetTransactionHistory} from '../../../../../store/wallet/effects/transactions/transactions';

type PortfolioWalletDebugScreenProps = NativeStackScreenProps<
  AboutGroupParamList,
  AboutScreens.PORTFOLIO_WALLET_DEBUG
>;

type WalletDebugDataView = 'redux' | 'disk';

const JsonLineText = styled.Text`
  padding: 12px;
  font-size: 12px;
  line-height: 16px;
  font-family: ${Platform.OS === 'ios' ? 'Menlo' : 'monospace'};
  color: ${({theme}) => theme.colors.text};
`;

const csvEscape = (v: unknown): string => {
  const s = v == null ? '' : String(v);
  if (/[\n\r,\"]/g.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

type DiskSnapshotData = {
  ok: boolean;
  error: string | null;
  snapshotsCount: number;
  json: string;
};

const formatTimestampForCsv = (timestamp: unknown): string => {
  const tsNum = Number(timestamp);
  if (!Number.isFinite(tsNum)) {
    return '';
  }
  const d = new Date(tsNum);
  const ms = d.getTime();
  if (!Number.isFinite(ms)) {
    return '';
  }
  return d.toISOString();
};

const getImpliedRateForCsv = (s: BalanceSnapshot): string => {
  const balanceNum = Number(s.cryptoBalance);
  if (!(Number.isFinite(balanceNum) && balanceNum > 0)) {
    return '';
  }
  const basisNum = Number(s.remainingCostBasisFiat);
  const pnlNum = Number(s.unrealizedPnlFiat);
  if (!(Number.isFinite(basisNum) && Number.isFinite(pnlNum))) {
    return '';
  }
  const rate = (basisNum + pnlNum) / balanceNum;
  return Number.isFinite(rate) ? String(rate) : '';
};

const getDecimalPlaces = (v: unknown): number => {
  const s = typeof v === 'string' ? v.replace(/,/g, '').trim() : '';
  if (!s || !s.includes('.')) {
    return 0;
  }
  return s.split('.')[1]?.length || 0;
};

const unitStringToAtomicStringForDebug = (
  unitString: unknown,
  decimals: number,
): string | null => {
  const raw =
    typeof unitString === 'string' ? unitString.replace(/,/g, '').trim() : '';
  if (!raw) {
    return null;
  }
  const sign = raw.startsWith('-') ? '-' : '';
  const unsigned = sign ? raw.slice(1) : raw;
  const [wholePartRaw, fracPartRaw = ''] = unsigned.split('.');
  const wholePart = wholePartRaw || '0';
  const frac = fracPartRaw
    .slice(0, Math.max(0, decimals))
    .padEnd(decimals, '0');
  const normalized = `${wholePart}${frac}`.replace(/^0+(?=\d)/, '');
  const out = `${sign}${normalized || '0'}`;
  try {
    return BigInt(out).toString();
  } catch {
    return null;
  }
};

const redactIdForDebug = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parts = trimmed.split(':');
  if (parts.length >= 3 && (parts[0] === 'tx' || parts[0] === 'daily')) {
    return `${parts[0]}:[redacted]:[redacted]`;
  }
  return '[redacted]';
};

const redactTxIdsForDebug = (txIds: unknown): string[] | null => {
  if (!Array.isArray(txIds)) {
    return null;
  }
  return txIds.map(() => '[redacted]');
};

const redactMismatchForDebug = (
  mismatch: SnapshotBalanceMismatch | undefined,
): SnapshotBalanceMismatch | null => {
  if (!mismatch) {
    return null;
  }
  return {
    ...mismatch,
    walletId: '[redacted]',
  };
};

const summarizeSnapshotForDebug = (s?: BalanceSnapshot | null) => {
  if (!s) {
    return null;
  }
  return {
    id: redactIdForDebug(s.id),
    eventType: s.eventType,
    timestamp: s.timestamp,
    createdAt: s.createdAt ?? null,
    cryptoBalance: s.cryptoBalance,
    balanceDeltaAtomic: s.balanceDeltaAtomic ?? null,
    txIdsCount: Array.isArray(s.txIds) ? s.txIds.length : 0,
    direction: s.direction ?? null,
  };
};

const pickLatestSnapshotByOrderingForDebug = (
  snapshots: BalanceSnapshot[],
): BalanceSnapshot | undefined => {
  const arr = Array.isArray(snapshots) ? snapshots : [];
  if (!arr.length) {
    return undefined;
  }
  return arr.reduce(
    (best: BalanceSnapshot | undefined, current: BalanceSnapshot) => {
      if (!best) {
        return current;
      }
      const bestTs = typeof best.timestamp === 'number' ? best.timestamp : 0;
      const currTs =
        typeof current.timestamp === 'number' ? current.timestamp : 0;
      if (currTs > bestTs) {
        return current;
      }
      if (currTs < bestTs) {
        return best;
      }

      const bestCreatedAt =
        typeof best.createdAt === 'number' ? best.createdAt : 0;
      const currCreatedAt =
        typeof current.createdAt === 'number' ? current.createdAt : 0;
      if (currCreatedAt > bestCreatedAt) {
        return current;
      }
      if (currCreatedAt < bestCreatedAt) {
        return best;
      }

      return String(current.id || '').localeCompare(String(best.id || '')) > 0
        ? current
        : best;
    },
    undefined,
  );
};

const summarizeDiskRowForDebug = (row: any) => {
  if (!row || typeof row !== 'object') {
    return null;
  }
  return {
    id: redactIdForDebug(row.i),
    timestamp: typeof row.t === 'number' ? row.t : null,
    eventTypeCode: typeof row.e === 'number' ? row.e : null,
    cryptoBalanceAtomic: typeof row.b === 'string' ? row.b : null,
    deltaAtomic: typeof row.d === 'string' ? row.d : null,
    txIdsCount: Array.isArray(row.x) ? row.x.length : 0,
  };
};

const countDuplicateTimestampsForDebug = (
  snapshots: BalanceSnapshot[],
): number => {
  const freq: Record<string, number> = {};
  for (const s of snapshots || []) {
    const ts = typeof s?.timestamp === 'number' ? String(s.timestamp) : '';
    if (!ts) {
      continue;
    }
    freq[ts] = (freq[ts] || 0) + 1;
  }
  return Object.values(freq).filter(n => n > 1).length;
};

const extractTxIdFromSnapshotIdForDebug = (
  snapshotId: unknown,
): string | null => {
  if (typeof snapshotId !== 'string') {
    return null;
  }
  if (!snapshotId.startsWith('tx:')) {
    return null;
  }
  const txid = snapshotId.slice(3).trim();
  return txid || null;
};

const countDuplicateSnapshotIdsForDebug = (
  snapshots: BalanceSnapshot[],
): number => {
  const freq: Record<string, number> = {};
  for (const s of snapshots || []) {
    const id = typeof s?.id === 'string' ? s.id : '';
    if (!id) {
      continue;
    }
    freq[id] = (freq[id] || 0) + 1;
  }
  return Object.values(freq).filter(n => n > 1).length;
};

const countDuplicateSnapshotTxIdsForDebug = (
  snapshots: BalanceSnapshot[],
): number => {
  const freq: Record<string, number> = {};
  for (const s of snapshots || []) {
    const txid = extractTxIdFromSnapshotIdForDebug(s?.id);
    if (!txid) {
      continue;
    }
    freq[txid] = (freq[txid] || 0) + 1;
  }
  return Object.values(freq).filter(n => n > 1).length;
};

const countSameTxIdDifferentBalanceForDebug = (
  snapshots: BalanceSnapshot[],
): number => {
  const seen = new Map<string, string>();
  let count = 0;
  for (const s of snapshots || []) {
    const txid = extractTxIdFromSnapshotIdForDebug(s?.id);
    const balance =
      typeof s?.cryptoBalance === 'string' ? s.cryptoBalance : null;
    if (!txid || balance == null) {
      continue;
    }
    const prev = seen.get(txid);
    if (prev == null) {
      seen.set(txid, balance);
      continue;
    }
    if (prev !== balance) {
      count++;
    }
  }
  return count;
};

const buildLatestPopulateWindowStatsForDebug = (args: {
  snapshots: BalanceSnapshot[];
  populateStartedAt?: number | null;
}) => {
  const startedAt =
    typeof args.populateStartedAt === 'number' ? args.populateStartedAt : null;
  if (startedAt == null) {
    return {
      startedAt: null,
      snapshotsCreatedInWindowCount: null,
      firstCreatedInWindow: null,
      lastCreatedInWindow: null,
      deltaAtomicSumInWindow: null,
      duplicateSnapshotIdsInWindow: null,
      duplicateTxIdsInWindow: null,
      sameTxIdDifferentBalanceInWindow: null,
    };
  }

  const windowSnaps = (args.snapshots || []).filter(s => {
    const createdAt = s?.createdAt;
    return typeof createdAt === 'number' && createdAt >= startedAt;
  });

  let deltaAtomicSum = 0n;
  for (const s of windowSnaps) {
    try {
      deltaAtomicSum += BigInt(
        typeof s?.balanceDeltaAtomic === 'string' ? s.balanceDeltaAtomic : '0',
      );
    } catch {}
  }

  return {
    startedAt,
    snapshotsCreatedInWindowCount: windowSnaps.length,
    firstCreatedInWindow: summarizeSnapshotForDebug(windowSnaps[0]),
    lastCreatedInWindow: summarizeSnapshotForDebug(
      windowSnaps.length ? windowSnaps[windowSnaps.length - 1] : null,
    ),
    deltaAtomicSumInWindow: deltaAtomicSum.toString(),
    duplicateSnapshotIdsInWindow:
      countDuplicateSnapshotIdsForDebug(windowSnaps),
    duplicateTxIdsInWindow: countDuplicateSnapshotTxIdsForDebug(windowSnaps),
    sameTxIdDifferentBalanceInWindow:
      countSameTxIdDifferentBalanceForDebug(windowSnaps),
  };
};

const getTxTimestampMsForDebug = (tx: any): number | null => {
  const raw =
    tx?.time ??
    tx?.__portfolioTimestampMs ??
    tx?.createdOn ??
    tx?.ts ??
    tx?.timestamp ??
    tx?.createdTime ??
    tx?.blockTime ??
    tx?.block_time ??
    tx?.blockTimeNormalized ??
    tx?.block_time_normalized;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }
  return n > 1e12 ? n : n * 1000;
};

const summarizeTxForDebug = (tx: any) => ({
  txidPresent: typeof tx?.txid === 'string' && tx.txid.trim().length > 0,
  txidRedacted:
    typeof tx?.txid === 'string' && tx.txid.trim().length > 0
      ? '[redacted]'
      : null,
  action: typeof tx?.action === 'string' ? tx.action : null,
  confirmations:
    typeof tx?.confirmations === 'number'
      ? tx.confirmations
      : Number.isFinite(Number(tx?.confirmations))
      ? Number(tx.confirmations)
      : null,
  amount:
    typeof tx?.amount === 'number'
      ? tx.amount
      : Number.isFinite(Number(tx?.amount))
      ? Number(tx.amount)
      : null,
  fees:
    typeof tx?.fees === 'number'
      ? tx.fees
      : Number.isFinite(Number(tx?.fees))
      ? Number(tx.fees)
      : null,
  timePresent: tx?.time != null,
  createdOnPresent: tx?.createdOn != null,
  timestampMs: getTxTimestampMsForDebug(tx),
});

const PortfolioWalletDebug = ({
  route,
  navigation,
}: PortfolioWalletDebugScreenProps) => {
  const {t} = useTranslation();
  const theme = useTheme();
  const dispatch = useAppDispatch();

  const {walletId} = route.params;
  const portfolio = useAppSelector(({PORTFOLIO}) => PORTFOLIO);
  const walletKeys = useAppSelector(({WALLET}) => WALLET?.keys || {});

  const [dataView, setDataView] = useState<WalletDebugDataView>('redux');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copyCsvState, setCopyCsvState] = useState<'idle' | 'copied'>('idle');
  const [copyReduxJsonState, setCopyReduxJsonState] = useState<
    'idle' | 'copied'
  >('idle');
  const [copyDiskJsonState, setCopyDiskJsonState] = useState<'idle' | 'copied'>(
    'idle',
  );
  const [copyDiagState, setCopyDiagState] = useState<'idle' | 'copied'>('idle');
  const [copyTimelineState, setCopyTimelineState] = useState<'idle' | 'copied'>(
    'idle',
  );

  const walletSnapshots: BalanceSnapshot[] = useMemo(() => {
    return (portfolio.snapshotsByWalletId?.[walletId] ||
      []) as BalanceSnapshot[];
  }, [portfolio.snapshotsByWalletId, walletId]);

  const wallet = useMemo(() => {
    for (const key of Object.values(walletKeys || {}) as any[]) {
      const wallets: Wallet[] = Array.isArray(key?.wallets) ? key.wallets : [];
      const found = wallets.find((w: Wallet) => w?.id === walletId);
      if (found) {
        return found;
      }
    }
    return undefined;
  }, [walletId, walletKeys]);

  const cryptoBalanceString = useMemo(() => {
    if (!wallet) {
      return '—';
    }
    if (typeof wallet.balance?.crypto === 'string') {
      return wallet.balance.crypto;
    }
    if (typeof wallet.balance?.sat === 'number') {
      return wallet.balance.sat.toString();
    }
    return '0';
  }, [wallet]);

  const cryptoBalanceSatString = useMemo(() => {
    if (typeof wallet?.balance?.sat === 'number') {
      return wallet.balance.sat;
    }
    return '—';
  }, [wallet]);

  const snapshotCryptoBalanceString = useMemo(() => {
    const last = walletSnapshots.length
      ? walletSnapshots[walletSnapshots.length - 1]
      : undefined;
    return last?.cryptoBalance ?? '—';
  }, [walletSnapshots]);

  const mismatch = useMemo(() => {
    return (portfolio.snapshotBalanceMismatchesByWalletId || {})[walletId] as
      | SnapshotBalanceMismatch
      | undefined;
  }, [portfolio.snapshotBalanceMismatchesByWalletId, walletId]);

  const [diskSnapshotData, setDiskSnapshotData] = useState<DiskSnapshotData>({
    ok: false,
    error: null,
    snapshotsCount: 0,
    json: JSON.stringify({loading: true}, null, 2),
  });

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setDiskSnapshotData({
          ok: false,
          error: null,
          snapshotsCount: 0,
          json: JSON.stringify({loading: true}, null, 2),
        });

        const rootStr = storage.getString('persist:root');
        if (!rootStr) {
          const json = JSON.stringify(
            {error: 'persist:root is empty'},
            null,
            2,
          );
          if (!cancelled) {
            setDiskSnapshotData({
              ok: false,
              error: 'persist:root is empty',
              snapshotsCount: 0,
              json,
            });
          }
          return;
        }

        const root = JSON.parse(rootStr);
        const portfolioStr = (root as any)?.PORTFOLIO;
        if (!portfolioStr) {
          const json = JSON.stringify(
            {error: 'persist:root.PORTFOLIO missing'},
            null,
            2,
          );
          if (!cancelled) {
            setDiskSnapshotData({
              ok: false,
              error: 'persist:root.PORTFOLIO missing',
              snapshotsCount: 0,
              json,
            });
          }
          return;
        }

        // In redux-persist, each slice is typically stored as a JSON string.
        // For encrypted reducers, JSON.parse(portfolioStr) yields the encrypted payload string.
        const parsed =
          typeof portfolioStr === 'string'
            ? JSON.parse(portfolioStr)
            : portfolioStr;

        let portfolioRaw: any = parsed;
        let encryptedPayload: string | null = null;

        if (typeof parsed === 'string') {
          encryptedPayload = parsed;
          try {
            // Decrypt using the same transform config used by the store.
            const secretKey = await getEncryptionKey();
            const decrypt = encryptTransform({
              secretKey,
              onError: () => {},
              unencryptedStores: [
                'APP',
                'MARKET_STATS',
                'PORTFOLIO',
                'RATE',
                'SHOP',
                'SHOP_CATALOG',
                'WALLET',
              ],
            });
            portfolioRaw = decrypt.out(parsed as any, 'PORTFOLIO');
          } catch (e) {
            portfolioRaw = null;
          }
        }

        if (!portfolioRaw || typeof portfolioRaw !== 'object') {
          const json = JSON.stringify(
            {
              walletId,
              error:
                'Unable to decode PORTFOLIO from persisted storage (encrypted payload?)',
              encryptedPayloadPreview: encryptedPayload
                ? encryptedPayload.slice(0, 500)
                : null,
            },
            null,
            2,
          );
          if (!cancelled) {
            setDiskSnapshotData({
              ok: false,
              error: 'Unable to decode PORTFOLIO from persisted storage',
              snapshotsCount: 0,
              json,
            });
          }
          return;
        }

        const snapshotStorage =
          (portfolioRaw?.snapshotsByWalletId || {})[walletId] ?? null;
        const snapshotsCount = Array.isArray(snapshotStorage)
          ? snapshotStorage.length
          : typeof snapshotStorage?.rows?.length === 'number'
          ? Number(snapshotStorage.rows.length)
          : 0;

        const jsonObj = {
          walletId,
          portfolioMeta: {
            quoteCurrency: portfolioRaw?.quoteCurrency ?? null,
            lastPopulatedAt: portfolioRaw?.lastPopulatedAt ?? null,
            // populateStatus: portfolioRaw?.populateStatus ?? null,
          },
          snapshotStorage,
          // Helpful when debugging encryption / transform issues.
          encryptedPayloadPreview: encryptedPayload
            ? encryptedPayload.slice(0, 200)
            : null,
        };

        const json = JSON.stringify(jsonObj, null, 2);
        if (!cancelled) {
          setDiskSnapshotData({
            ok: true,
            error: null,
            snapshotsCount,
            json,
          });
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        const json = JSON.stringify(
          {error: 'Failed to read persisted portfolio data', message},
          null,
          2,
        );
        if (!cancelled) {
          setDiskSnapshotData({
            ok: false,
            error: message,
            snapshotsCount: 0,
            json,
          });
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [walletId]);

  const reduxJsonString = useMemo(() => {
    const json = {
      walletId,
      quoteCurrency: portfolio.quoteCurrency,
      lastPopulatedAt: portfolio.lastPopulatedAt,
      // populateStatus: portfolio.populateStatus,
      balanceMismatch: mismatch,
      snapshots: walletSnapshots,
    };

    try {
      return JSON.stringify(json, null, 2);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return JSON.stringify(
        {error: 'Failed to stringify wallet portfolio debug data', message},
        null,
        2,
      );
    }
  }, [mismatch, portfolio, walletId, walletSnapshots]);

  const displayJson = useMemo(() => {
    const limit = 200000;
    const raw = dataView === 'disk' ? diskSnapshotData.json : reduxJsonString;
    if (raw.length > limit) {
      return raw.slice(0, limit) + `\n...TRUNCATED (${raw.length} chars)`;
    }
    return raw;
  }, [dataView, diskSnapshotData.json, reduxJsonString]);

  const copyReduxJson = useCallback(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      Clipboard.setString(reduxJsonString);
      setCopyReduxJsonState('copied');
      setTimeout(() => setCopyReduxJsonState('idle'), 1500);
    });
    return () => task.cancel();
  }, [reduxJsonString]);

  const copyDiskJson = useCallback(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      Clipboard.setString(diskSnapshotData.json);
      setCopyDiskJsonState('copied');
      setTimeout(() => setCopyDiskJsonState('idle'), 1500);
    });
    return () => task.cancel();
  }, [diskSnapshotData.json]);

  const copyCsv = useCallback(() => {
    if (isGenerating) {
      return;
    }

    setIsGenerating(true);
    const task = InteractionManager.runAfterInteractions(() => {
      try {
        const headers = [
          'chain',
          'coin',
          'network',
          'assetId',
          'timestamp',
          'date',
          'dayStartMs',
          'eventType',
          'direction',
          'cryptoBalance',
          'cryptoDelta',
          'avgCostFiatPerUnit',
          'remainingCostBasisFiat',
          'unrealizedPnlFiat',
          'impliedRateFiatPerUnit',
          'costBasisRateFiat',
          'quoteCurrency',
          'createdAt',
        ];

        const rows = walletSnapshots.map(
          (s: BalanceSnapshot, index: number) => {
            const prevBalance =
              index > 0 ? walletSnapshots[index - 1].cryptoBalance : '0';
            const currentBalanceNum = Number(s.cryptoBalance);
            const prevBalanceNum = Number(prevBalance);
            const cryptoDelta =
              Number.isFinite(currentBalanceNum) &&
              Number.isFinite(prevBalanceNum)
                ? (currentBalanceNum - prevBalanceNum).toString()
                : '';

            return [
              s.chain,
              s.coin,
              s.network,
              s.assetId,
              s.timestamp,
              formatTimestampForCsv(s.timestamp),
              s.dayStartMs ?? '',
              s.eventType,
              s.direction ?? '',
              s.cryptoBalance,
              cryptoDelta,
              s.avgCostFiatPerUnit,
              s.remainingCostBasisFiat,
              s.unrealizedPnlFiat,
              getImpliedRateForCsv(s),
              s.costBasisRateFiat ?? '',
              s.quoteCurrency,
              s.createdAt ?? '',
            ]
              .map(csvEscape)
              .join(',');
          },
        );

        const csv = [headers.join(','), ...rows].join('\n');
        Clipboard.setString(csv);
        setCopyCsvState('copied');
        setTimeout(() => setCopyCsvState('idle'), 1500);
      } finally {
        setIsGenerating(false);
      }
    });

    return () => task.cancel();
  }, [isGenerating, walletSnapshots]);

  const copyMismatchDiagnostics = useCallback(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      const lastSnapshot = walletSnapshots.length
        ? walletSnapshots[walletSnapshots.length - 1]
        : undefined;
      const walletSat = wallet?.balance?.sat;
      const walletCrypto =
        typeof wallet?.balance?.crypto === 'string'
          ? wallet.balance.crypto
          : null;
      const snapshotCrypto =
        typeof lastSnapshot?.cryptoBalance === 'string'
          ? lastSnapshot.cryptoBalance
          : null;
      const tokenDecimals = (wallet as any)?.credentials?.token?.decimals;
      const decimalsGuess = Math.max(
        0,
        typeof tokenDecimals === 'number' ? tokenDecimals : 0,
        getDecimalPlaces(snapshotCrypto),
        getDecimalPlaces(walletCrypto),
      );

      const walletSatAtomicFromNumber =
        typeof walletSat === 'number' && Number.isFinite(walletSat)
          ? walletSat.toString()
          : null;
      const walletAtomicFromCrypto =
        walletCrypto == null
          ? null
          : unitStringToAtomicStringForDebug(walletCrypto, decimalsGuess);
      const snapshotAtomicFromCrypto =
        snapshotCrypto == null
          ? null
          : unitStringToAtomicStringForDebug(snapshotCrypto, decimalsGuess);
      const diff = (() => {
        try {
          if (!walletSatAtomicFromNumber || !snapshotAtomicFromCrypto) {
            return null;
          }
          return (
            BigInt(snapshotAtomicFromCrypto) - BigInt(walletSatAtomicFromNumber)
          ).toString();
        } catch {
          return null;
        }
      })();

      const diagnostics = {
        walletId: redactIdForDebug(walletId),
        mismatchFromStore: redactMismatchForDebug(mismatch),
        walletBalance: {
          sat: walletSat ?? null,
          satType: typeof walletSat,
          satIsSafeInteger:
            typeof walletSat === 'number'
              ? Number.isSafeInteger(walletSat)
              : null,
          crypto: walletCrypto,
          tokenDecimals:
            typeof tokenDecimals === 'number' ? tokenDecimals : null,
        },
        snapshotLast: lastSnapshot
          ? {
              id: redactIdForDebug(lastSnapshot.id),
              eventType: lastSnapshot.eventType,
              timestamp: lastSnapshot.timestamp,
              createdAt: lastSnapshot.createdAt ?? null,
              cryptoBalance: lastSnapshot.cryptoBalance,
              txIds: redactTxIdsForDebug(lastSnapshot.txIds),
            }
          : null,
        derived: {
          decimalsGuess,
          walletSatAtomicFromNumber,
          walletAtomicFromCrypto,
          snapshotAtomicFromCrypto,
          snapshotMinusWalletSatAtomic: diff,
        },
      };

      Clipboard.setString(JSON.stringify(diagnostics, null, 2));
      setCopyDiagState('copied');
      setTimeout(() => setCopyDiagState('idle'), 1500);
    });
    return () => task.cancel();
  }, [mismatch, wallet, walletId, walletSnapshots]);

  const copyMismatchTimelineLogs = useCallback(() => {
    const task = InteractionManager.runAfterInteractions(async () => {
      const lastSnapshotByArray = walletSnapshots.length
        ? walletSnapshots[walletSnapshots.length - 1]
        : undefined;
      const lastSnapshotByOrdering =
        pickLatestSnapshotByOrderingForDebug(walletSnapshots);
      const firstSnapshot = walletSnapshots.length
        ? walletSnapshots[0]
        : undefined;
      const walletSat = wallet?.balance?.sat;
      const walletCrypto =
        typeof wallet?.balance?.crypto === 'string'
          ? wallet.balance.crypto
          : null;
      const snapshotCrypto =
        typeof lastSnapshotByArray?.cryptoBalance === 'string'
          ? lastSnapshotByArray.cryptoBalance
          : null;
      const orderedSnapshotCrypto =
        typeof lastSnapshotByOrdering?.cryptoBalance === 'string'
          ? lastSnapshotByOrdering.cryptoBalance
          : null;
      const tokenDecimals = (wallet as any)?.credentials?.token?.decimals;
      const decimalsGuess = Math.max(
        0,
        typeof tokenDecimals === 'number' ? tokenDecimals : 0,
        getDecimalPlaces(snapshotCrypto),
        getDecimalPlaces(orderedSnapshotCrypto),
        getDecimalPlaces(walletCrypto),
      );
      const walletAtomicFromSat =
        typeof walletSat === 'number' && Number.isFinite(walletSat)
          ? walletSat.toString()
          : null;
      const walletAtomicFromCrypto =
        walletCrypto == null
          ? null
          : unitStringToAtomicStringForDebug(walletCrypto, decimalsGuess);
      const snapshotAtomicFromCrypto =
        snapshotCrypto == null
          ? null
          : unitStringToAtomicStringForDebug(snapshotCrypto, decimalsGuess);
      const orderedSnapshotAtomicFromCrypto =
        orderedSnapshotCrypto == null
          ? null
          : unitStringToAtomicStringForDebug(
              orderedSnapshotCrypto,
              decimalsGuess,
            );
      const mismatchNowArrayTail = (() => {
        try {
          if (!walletAtomicFromSat || !snapshotAtomicFromCrypto) {
            return null;
          }
          return (
            BigInt(snapshotAtomicFromCrypto) !== BigInt(walletAtomicFromSat)
          );
        } catch {
          return null;
        }
      })();
      const mismatchNowOrderedLatest = (() => {
        try {
          if (!walletAtomicFromSat || !orderedSnapshotAtomicFromCrypto) {
            return null;
          }
          return (
            BigInt(orderedSnapshotAtomicFromCrypto) !==
            BigInt(walletAtomicFromSat)
          );
        } catch {
          return null;
        }
      })();

      let diskJsonObj: any = null;
      try {
        diskJsonObj = JSON.parse(diskSnapshotData.json);
      } catch {}
      const diskRows = Array.isArray(diskJsonObj?.snapshotStorage?.rows)
        ? (diskJsonObj.snapshotStorage.rows as any[])
        : [];
      const diskLastRowByArray = diskRows.length
        ? diskRows[diskRows.length - 1]
        : null;
      const diskLastRowByOrdering = diskRows.length
        ? diskRows.reduce((best: any, current: any) => {
            if (!best) {
              return current;
            }
            const bestTs = typeof best?.t === 'number' ? best.t : 0;
            const currTs = typeof current?.t === 'number' ? current.t : 0;
            if (currTs > bestTs) {
              return current;
            }
            if (currTs < bestTs) {
              return best;
            }
            return String(current?.i || '').localeCompare(
              String(best?.i || ''),
            ) > 0
              ? current
              : best;
          }, null)
        : null;

      let txHistoryRows: any[] = [];
      let txHistoryProbeError: string | null = null;
      if (wallet) {
        try {
          const txRes = await dispatch(
            GetTransactionHistory({
              wallet,
              transactionsHistory: [],
              limit: 200,
              refresh: true,
              contactList: [],
              isAccountDetailsView: true,
              skipWalletProcessing: true,
              skipUiFriendlyList: true,
            }) as any,
          );
          txHistoryRows = Array.isArray(txRes?.transactions)
            ? txRes.transactions
            : [];
        } catch (e: any) {
          txHistoryProbeError =
            typeof e?.message === 'string' ? e.message : String(e);
        }
      }

      const txPendingCount = txHistoryRows.filter(tx => {
        const c = Number(tx?.confirmations);
        return Number.isFinite(c) && c <= 0;
      }).length;
      const txMissingTxidCount = txHistoryRows.filter(
        tx => !(typeof tx?.txid === 'string' && tx.txid.trim().length > 0),
      ).length;
      const txMissingTimestampCount = txHistoryRows.filter(
        tx => getTxTimestampMsForDebug(tx) == null,
      ).length;

      const logs = {
        capturedAtMs: Date.now(),
        walletId: redactIdForDebug(walletId),
        mismatchFromStore: redactMismatchForDebug(mismatch),
        recomputedMismatchNowArrayTail: mismatchNowArrayTail,
        recomputedMismatchNowOrderedLatest: mismatchNowOrderedLatest,
        walletBalance: {
          sat: walletSat ?? null,
          satConfirmedLocked:
            (wallet as any)?.balance?.satConfirmedLocked ?? null,
          satPending: (wallet as any)?.balance?.satPending ?? null,
          crypto: walletCrypto,
          chain: wallet?.chain ?? null,
          coin: wallet?.currencyAbbreviation ?? null,
          tokenAddress: wallet?.tokenAddress ?? null,
          tokenDecimals:
            typeof tokenDecimals === 'number' ? tokenDecimals : null,
        },
        atomic: {
          decimalsGuess,
          walletAtomicFromSat,
          walletAtomicFromCrypto,
          snapshotAtomicFromArrayTail: snapshotAtomicFromCrypto,
          snapshotAtomicFromOrderedLatest: orderedSnapshotAtomicFromCrypto,
          snapshotMinusWalletSat:
            walletAtomicFromSat && snapshotAtomicFromCrypto
              ? (
                  BigInt(snapshotAtomicFromCrypto) - BigInt(walletAtomicFromSat)
                ).toString()
              : null,
          snapshotOrderedLatestMinusWalletSat:
            walletAtomicFromSat && orderedSnapshotAtomicFromCrypto
              ? (
                  BigInt(orderedSnapshotAtomicFromCrypto) -
                  BigInt(walletAtomicFromSat)
                ).toString()
              : null,
        },
        populateStatus: {
          inProgress: portfolio.populateStatus?.inProgress ?? null,
          startedAt: portfolio.populateStatus?.startedAt ?? null,
          finishedAt: portfolio.populateStatus?.finishedAt ?? null,
          currentWalletId: portfolio.populateStatus?.currentWalletId ?? null,
          walletsTotal: portfolio.populateStatus?.walletsTotal ?? null,
          walletsCompleted: portfolio.populateStatus?.walletsCompleted ?? null,
          errorsCount: Array.isArray(portfolio.populateStatus?.errors)
            ? portfolio.populateStatus.errors.length
            : 0,
          walletStatus:
            portfolio.populateStatus?.walletStatusById?.[walletId] ?? null,
          errorsForThisWallet: Array.isArray(portfolio.populateStatus?.errors)
            ? portfolio.populateStatus.errors
                .filter(e => e?.walletId === walletId)
                .map(e => ({
                  walletId: '[redacted]',
                  message:
                    typeof e?.message === 'string'
                      ? e.message
                      : String(e?.message),
                }))
            : [],
        },
        mechanismHints: {
          mismatchCacheButNoArrayTailMismatch:
            !!mismatch && mismatchNowArrayTail === false,
          snapshotArrayTailPredatesLastPopulateStart:
            typeof portfolio.populateStatus?.startedAt === 'number' &&
            typeof lastSnapshotByArray?.createdAt === 'number'
              ? lastSnapshotByArray.createdAt <
                portfolio.populateStatus.startedAt
              : null,
          snapshotOrderedLatestPredatesLastPopulateStart:
            typeof portfolio.populateStatus?.startedAt === 'number' &&
            typeof lastSnapshotByOrdering?.createdAt === 'number'
              ? lastSnapshotByOrdering.createdAt <
                portfolio.populateStatus.startedAt
              : null,
          duplicateTimestampCountInRedux:
            countDuplicateTimestampsForDebug(walletSnapshots),
          sameTimestampDifferentBalances:
            !!lastSnapshotByArray &&
            !!lastSnapshotByOrdering &&
            lastSnapshotByArray.timestamp ===
              lastSnapshotByOrdering.timestamp &&
            lastSnapshotByArray.cryptoBalance !==
              lastSnapshotByOrdering.cryptoBalance,
        },
        snapshotsRedux: {
          count: walletSnapshots.length,
          first: summarizeSnapshotForDebug(firstSnapshot),
          lastByArray: summarizeSnapshotForDebug(lastSnapshotByArray),
          lastByOrdering: summarizeSnapshotForDebug(lastSnapshotByOrdering),
          arrayTailIndex:
            lastSnapshotByArray == null
              ? null
              : walletSnapshots.findIndex(s => s === lastSnapshotByArray),
          orderedLatestIndex:
            lastSnapshotByOrdering == null
              ? null
              : walletSnapshots.findIndex(s => s === lastSnapshotByOrdering),
          last5Ids: walletSnapshots.slice(-5).map(s => redactIdForDebug(s.id)),
          last5DeltaAtomic: walletSnapshots
            .slice(-5)
            .map(s =>
              typeof s.balanceDeltaAtomic === 'string'
                ? s.balanceDeltaAtomic
                : null,
            ),
          missingBalanceDeltaAtomicCount: walletSnapshots.filter(
            s => typeof s.balanceDeltaAtomic !== 'string',
          ).length,
          duplicateSnapshotIdsCount:
            countDuplicateSnapshotIdsForDebug(walletSnapshots),
          duplicateTxIdsCount:
            countDuplicateSnapshotTxIdsForDebug(walletSnapshots),
          sameTxIdDifferentBalanceCount:
            countSameTxIdDifferentBalanceForDebug(walletSnapshots),
        },
        snapshotsDisk: {
          ok: diskSnapshotData.ok,
          error: diskSnapshotData.error,
          count: diskSnapshotData.snapshotsCount,
          quoteCurrency: diskJsonObj?.portfolioMeta?.quoteCurrency ?? null,
          lastPopulatedAt: diskJsonObj?.portfolioMeta?.lastPopulatedAt ?? null,
          storageType: Array.isArray(diskJsonObj?.snapshotStorage)
            ? 'array'
            : diskJsonObj?.snapshotStorage?.rows
            ? 'series'
            : typeof diskJsonObj?.snapshotStorage,
          seriesRowsCount:
            typeof diskJsonObj?.snapshotStorage?.rows?.length === 'number'
              ? diskJsonObj.snapshotStorage.rows.length
              : null,
          rowLastByArray: summarizeDiskRowForDebug(diskLastRowByArray),
          rowLastByOrdering: summarizeDiskRowForDebug(diskLastRowByOrdering),
        },
        latestPopulateWindow: buildLatestPopulateWindowStatsForDebug({
          snapshots: walletSnapshots,
          populateStartedAt: portfolio.populateStatus?.startedAt ?? null,
        }),
        txHistoryProbe: {
          ok: txHistoryProbeError == null,
          error: txHistoryProbeError,
          totalRows: txHistoryRows.length,
          pendingCount: txPendingCount,
          missingTxidCount: txMissingTxidCount,
          missingTimestampCount: txMissingTimestampCount,
          last10: txHistoryRows.slice(0, 10).map(summarizeTxForDebug),
        },
      };

      Clipboard.setString(JSON.stringify(logs, null, 2));
      setCopyTimelineState('copied');
      setTimeout(() => setCopyTimelineState('idle'), 1500);
    });
    return () => task.cancel();
  }, [
    dispatch,
    diskSnapshotData,
    mismatch,
    portfolio.populateStatus,
    wallet,
    walletId,
    walletSnapshots,
  ]);

  return (
    <DebugScreenContainer>
      <DebugHeaderContainer>
        <DebugHeaderText>
          {t('Wallet')}: {walletId}
        </DebugHeaderText>
        <DebugHeaderText>
          {t('Snapshots')} (redux): {walletSnapshots.length} | (disk):{' '}
          {diskSnapshotData.snapshotsCount} | mismatches:{' '}
          {mismatch ? 'yes' : 'no'}
        </DebugHeaderText>
        <DebugHeaderText>
          {t('Crypto balance')}: {cryptoBalanceString}
        </DebugHeaderText>
        <DebugHeaderText>
          {t('Crypto balance (sat)')}: {cryptoBalanceSatString}
        </DebugHeaderText>
        <DebugHeaderText>
          {t('Snapshot-based crypto balance')}: {snapshotCryptoBalanceString}
        </DebugHeaderText>

        <DebugButtonRow>
          <DebugPillButton
            selected={dataView === 'redux'}
            onPress={() => setDataView('redux')}>
            <DebugPillButtonText selected={dataView === 'redux'}>
              {t('Redux')}
            </DebugPillButtonText>
          </DebugPillButton>
          <DebugPillButton
            selected={dataView === 'disk'}
            onPress={() => setDataView('disk')}>
            <DebugPillButtonText selected={dataView === 'disk'}>
              {t('On disk')}
            </DebugPillButtonText>
          </DebugPillButton>
          <DebugButtonSpacer />
          <DebugPillButton onPress={() => (isGenerating ? null : copyCsv())}>
            <DebugPillButtonText>
              {copyCsvState === 'copied' ? t('Copied') : t('Copy CSV')}
            </DebugPillButtonText>
          </DebugPillButton>
          <DebugPillButton onPress={() => copyReduxJson()}>
            <DebugPillButtonText>
              {copyReduxJsonState === 'copied'
                ? t('Copied')
                : t('Copy Redux JSON')}
            </DebugPillButtonText>
          </DebugPillButton>
          <DebugPillButton onPress={() => copyDiskJson()}>
            <DebugPillButtonText>
              {copyDiskJsonState === 'copied'
                ? t('Copied')
                : t('Copy Disk JSON')}
            </DebugPillButtonText>
          </DebugPillButton>
          <DebugPillButton onPress={() => copyMismatchDiagnostics()}>
            <DebugPillButtonText>
              {copyDiagState === 'copied'
                ? t('Copied')
                : t('Copy Mismatch Diagnostics')}
            </DebugPillButtonText>
          </DebugPillButton>
          <DebugPillButton onPress={() => copyMismatchTimelineLogs()}>
            <DebugPillButtonText>
              {copyTimelineState === 'copied'
                ? t('Copied')
                : t('Copy Mismatch Timeline')}
            </DebugPillButtonText>
          </DebugPillButton>
          <DebugButtonSpacer />
          <DebugPillButton
            onPress={() =>
              navigation.navigate(WalletScreens.WALLET_DETAILS as any, {
                walletId,
              })
            }>
            <DebugPillButtonText>{t('Wallet Details')}</DebugPillButtonText>
          </DebugPillButton>
        </DebugButtonRow>
      </DebugHeaderContainer>

      <ScrollView
        style={{flex: 1}}
        contentContainerStyle={{
          paddingBottom: 40,
          backgroundColor: theme.colors.background,
        }}>
        <JsonLineText selectable>{displayJson}</JsonLineText>
      </ScrollView>
    </DebugScreenContainer>
  );
};

export default PortfolioWalletDebug;
