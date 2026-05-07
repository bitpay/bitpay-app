import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Platform, ScrollView} from 'react-native';
import {NavigationProp, useNavigation} from '@react-navigation/native';
import styled from 'styled-components/native';
import Clipboard from '@react-native-clipboard/clipboard';
import {useTranslation} from 'react-i18next';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../../../../Root';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {
  atomicToUnitString,
  formatCurrencyAbbreviation,
  unitStringToAtomicBigInt,
} from '../../../../../utils/helper-methods';
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
import {getPortfolioRuntimeClient} from '../../../../../portfolio/runtime/portfolioRuntime';
import type {
  SnapshotIndexV2,
  SnapshotPersistDebugMode,
} from '../../../../../portfolio/core/pnl/snapshotStore';
import type {BalanceSnapshotStored} from '../../../../../portfolio/core/pnl/types';
import type {
  Tx,
  WalletCredentials,
  WalletSummary,
} from '../../../../../portfolio/core/types';
import {formatAtomicAmount} from '../../../../../portfolio/core/format';
import {getTxHistoryLogicalPageSize} from '../../../../../portfolio/core/txHistoryPaging';
import type {Wallet} from '../../../../../store/wallet/wallet.models';
import {GetPrecision} from '../../../../../store/wallet/utils/currency';
import {WalletScreens} from '../../../../wallet/WalletGroup';
import {
  clearWalletPortfolioDataWithRuntime,
  populatePortfolio,
} from '../../../../../store/portfolio';
import {logManager} from '../../../../../managers/LogManager';
import {getWalletLiveAtomicBalance} from '../../../../../utils/portfolio/assets';
import {extractPortfolioWalletCredentialsSnapshot} from '../../../../../portfolio/adapters/rn/walletMappers';
import {buildPortfolioTxHistoryRequestPath} from '../../../../../portfolio/adapters/rn/txHistoryRequest';
import {BwcProvider} from '../../../../../lib/bwc';
import {
  buildTokenWalletTxHistoryContextFromCredentials,
  normalizeTokenWalletTxHistoryPage,
} from '../../../../../portfolio/core/tokenTxHistory';
import {
  buildWalletBalanceDiagnostic,
  type BalanceDiagnosticTxPage,
} from '../../../../../portfolio/debug/balanceDiagnostic';
import type {PortfolioPopulateWalletDebugTrace} from '../../../../../portfolio/core/engine/populateDebug';

type PortfolioWalletDebugScreenProps = NativeStackScreenProps<
  AboutGroupParamList,
  AboutScreens.PORTFOLIO_WALLET_DEBUG
>;

const JsonLineText = styled.Text`
  padding: 12px;
  font-size: 12px;
  line-height: 16px;
  font-family: ${Platform.OS === 'ios' ? 'Menlo' : 'monospace'};
  color: ${({theme}) => theme.colors.text};
`;

const SectionTitle = styled.Text`
  padding: 0 12px;
  color: ${({theme}) => theme.colors.text};
  font-size: 13px;
  line-height: 18px;
  font-weight: 600;
`;

const SectionText = styled.Text`
  padding: 0 12px 12px;
  color: ${({theme}) => theme.colors.text};
  font-size: 12px;
  line-height: 18px;
`;

const ErrorText = styled(SectionText)`
  color: ${({theme}) => theme.colors.notification};
`;

const ControlLabel = styled.Text`
  color: ${({theme}) => theme.colors.text};
  font-size: 12px;
  line-height: 16px;
  margin-top: 2px;
  margin-bottom: 8px;
  opacity: 0.7;
`;

const SNAPSHOT_DEBUG_MODE_OPTIONS: SnapshotPersistDebugMode[] = [
  'none',
  'link',
  'full',
];

const formatSnapshotDebugModeLabel = (
  mode: SnapshotPersistDebugMode,
): string => {
  switch (mode) {
    case 'none':
      return 'None';
    case 'link':
      return 'Link';
    case 'full':
      return 'Full';
  }
};

const csvEscape = (value: unknown): string => {
  const nextValue = value == null ? '' : String(value);
  if (/[,"\n\r]/.test(nextValue)) {
    return `"${nextValue.replace(/"/g, '""')}"`;
  }
  return nextValue;
};

const toIso = (value?: number): string => {
  if (!Number.isFinite(value)) {
    return '—';
  }

  try {
    return new Date(value as number).toISOString();
  } catch {
    return '—';
  }
};

const getRowCount = (index: SnapshotIndexV2 | null | undefined): number => {
  if (!index?.chunks?.length) {
    return 0;
  }

  return index.chunks.reduce((total, chunk) => {
    const rows = Number(chunk?.rows);
    return total + (Number.isFinite(rows) ? rows : 0);
  }, 0);
};

const formatChunkDebugModes = (
  index: SnapshotIndexV2 | null | undefined,
): string => {
  if (!index?.chunks?.length) {
    return '—';
  }

  const counts = index.chunks.reduce<Record<string, number>>((acc, chunk) => {
    const mode = String(chunk?.debugMode || 'none');
    acc[mode] = (acc[mode] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([mode, count]) => `${mode}:${count}`)
    .join(', ');
};

const findWalletById = (
  walletKeys: Record<string, any>,
  walletId: string,
): Wallet | undefined => {
  for (const key of Object.values(walletKeys || {})) {
    const wallets = Array.isArray((key as any)?.wallets)
      ? (key as any).wallets
      : [];
    const match = wallets.find((wallet: Wallet) => wallet?.id === walletId);
    if (match) {
      return match;
    }
  }
  return undefined;
};

const toCsv = (snapshots: BalanceSnapshotStored[]): string => {
  const headers = [
    'id',
    'walletId',
    'chain',
    'coin',
    'network',
    'assetId',
    'timestamp',
    'iso',
    'eventType',
    'cryptoBalance',
    'remainingCostBasisFiat',
    'markRate',
    'quoteCurrency',
    'createdAt',
    'txIds',
  ];

  const rows = snapshots.map(snapshot => {
    return [
      snapshot.id,
      snapshot.walletId,
      snapshot.chain,
      snapshot.coin,
      snapshot.network,
      snapshot.assetId,
      snapshot.timestamp,
      toIso(snapshot.timestamp),
      snapshot.eventType,
      snapshot.cryptoBalance,
      snapshot.remainingCostBasisFiat,
      snapshot.markRate,
      snapshot.quoteCurrency,
      snapshot.createdAt,
      Array.isArray(snapshot.txIds) ? snapshot.txIds.join('|') : '',
    ]
      .map(csvEscape)
      .join(',');
  });

  return [headers.join(','), ...rows].join('\n');
};

const BWC = BwcProvider.getInstance();
const DIAGNOSTIC_PAGE_SIZE = 1000;
const MAX_DIAGNOSTIC_PAGES = 250;

type WalletBwsSummaryState = {
  fetchedAtMs: number;
  summary: WalletSummary;
};

type WalletBalanceDiagnosticState = {
  generatedAtMs: number;
  summaryLine: string;
  reportText: string;
  pageCount: number;
  txCount: number;
};

type WalletPopulateCheckpointCaptureState = {
  capturedAtMs: number;
  snapshotDebugMode: 'link' | 'full' | 'none';
  beforeIndex: SnapshotIndexV2 | null;
  afterIndex: SnapshotIndexV2 | null;
  debugTrace?: PortfolioPopulateWalletDebugTrace | null;
};

const createPortfolioDebugBwcClient = (credentials: WalletCredentials): any => {
  return BWC.getClient(JSON.stringify(credentials));
};

const fetchPortfolioDebugBwsWalletSummary = async (
  client: any,
  credentials: WalletCredentials,
): Promise<WalletSummary> => {
  const tokenAddress =
    String(client?.credentials?.token?.address || '').trim() || undefined;
  const multisigContractAddress =
    String(
      client?.credentials?.multisigEthInfo?.multisigContractAddress || '',
    ).trim() || undefined;
  const network =
    String(client?.credentials?.network || '').trim() || undefined;

  const status = await new Promise<any>((resolve, reject) => {
    client.getStatus(
      {
        twoStep: true,
        tokenAddress,
        multisigContractAddress,
        network,
      },
      (error: any, nextStatus: any) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(nextStatus);
      },
    );
  });

  const walletName = String(
    status?.wallet?.name ||
      credentials?.walletName ||
      credentials?.walletId ||
      'Wallet',
  );
  const chain = String(credentials?.chain || credentials?.coin || '')
    .trim()
    .toLowerCase();
  const normalizedNetwork = String(credentials?.network || '')
    .trim()
    .toLowerCase();
  const currencyAbbreviation = String(
    credentials?.token?.symbol || credentials?.coin || chain,
  )
    .trim()
    .toLowerCase();
  const balanceAtomic = String(status?.balance?.totalAmount ?? '0');

  return {
    walletId: String(credentials?.walletId || '').trim(),
    walletName,
    chain,
    network: normalizedNetwork,
    currencyAbbreviation,
    tokenAddress,
    balanceAtomic,
    balanceFormatted: formatAtomicAmount(balanceAtomic, credentials),
  };
};

const fetchPortfolioDebugTxHistoryPageByRequest = async (args: {
  client: any;
  credentials: WalletCredentials;
  skip: number;
  limit: number;
  reverse?: boolean;
}): Promise<Tx[]> => {
  const requestPath = buildPortfolioTxHistoryRequestPath({
    credentials: args.credentials,
    skip: args.skip,
    limit: args.limit,
    reverse: args.reverse,
  });

  return new Promise((resolve, reject) => {
    args.client.request.get(requestPath, (error: any, txs: Tx[]) => {
      if (error) {
        reject(error);
        return;
      }

      const out = Array.isArray(txs) ? txs : [];
      if (typeof args.client?._processTxps === 'function') {
        args.client._processTxps(out);
      }
      resolve(
        normalizeTokenWalletTxHistoryPage({
          txs: out,
          context: buildTokenWalletTxHistoryContextFromCredentials(
            args.credentials,
          ),
        }),
      );
    });
  });
};

const collectPortfolioDebugTxHistoryPages = async (args: {
  client: any;
  credentials: WalletCredentials;
  pageSize?: number;
}): Promise<BalanceDiagnosticTxPage[]> => {
  const pageSize =
    Number.isFinite(Number(args.pageSize)) && Number(args.pageSize) > 0
      ? Math.trunc(Number(args.pageSize))
      : DIAGNOSTIC_PAGE_SIZE;

  const pages: BalanceDiagnosticTxPage[] = [];
  let skip = 0;

  for (let pageNumber = 1; pageNumber <= MAX_DIAGNOSTIC_PAGES; pageNumber++) {
    const txs = await fetchPortfolioDebugTxHistoryPageByRequest({
      client: args.client,
      credentials: args.credentials,
      skip,
      limit: pageSize,
      reverse: true,
    });

    pages.push({
      pageNumber,
      skip,
      txs,
    });

    if (!txs.length) {
      return pages;
    }

    const logicalPageSize = getTxHistoryLogicalPageSize(txs);
    if (logicalPageSize <= 0) {
      return pages;
    }
    skip += logicalPageSize;
  }

  throw new Error(
    `Balance diagnostic exceeded ${MAX_DIAGNOSTIC_PAGES} tx-history pages.`,
  );
};

const PortfolioWalletDebug = ({route}: PortfolioWalletDebugScreenProps) => {
  const {t} = useTranslation();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const dispatch = useAppDispatch();
  const {walletId} = route.params;

  const walletKeys = useAppSelector(({WALLET}) => WALLET?.keys || {});
  const mismatch = useAppSelector(
    ({PORTFOLIO}) => PORTFOLIO.snapshotBalanceMismatchesByWalletId?.[walletId],
  );

  const [index, setIndex] = useState<SnapshotIndexV2 | null>(null);
  const [latestSnapshot, setLatestSnapshot] =
    useState<BalanceSnapshotStored | null>(null);
  const [snapshots, setSnapshots] = useState<BalanceSnapshotStored[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [runtimeError, setRuntimeError] = useState<string>('');
  const [copyJsonState, setCopyJsonState] = useState<'idle' | 'copied'>('idle');
  const [copyCsvState, setCopyCsvState] = useState<'idle' | 'copied'>('idle');
  const [copyBalanceDiagnosticState, setCopyBalanceDiagnosticState] = useState<
    'idle' | 'copied'
  >('idle');
  const [bwsSummary, setBwsSummary] = useState<WalletBwsSummaryState | null>(
    null,
  );
  const [balanceDiagnostic, setBalanceDiagnostic] =
    useState<WalletBalanceDiagnosticState | null>(null);
  const [lastDebugPopulate, setLastDebugPopulate] =
    useState<WalletPopulateCheckpointCaptureState | null>(null);
  const [isRefreshingBwsSummary, setIsRefreshingBwsSummary] =
    useState<boolean>(false);
  const [isRunningBalanceDiagnostic, setIsRunningBalanceDiagnostic] =
    useState<boolean>(false);
  const [populateDebugMode, setPopulateDebugMode] =
    useState<SnapshotPersistDebugMode>('link');

  const wallet = useMemo(
    () => findWalletById(walletKeys, walletId),
    [walletId, walletKeys],
  );
  const walletUnitDecimals = useMemo(() => {
    if (!wallet) {
      return 0;
    }

    const precision =
      dispatch(
        GetPrecision(
          wallet.currencyAbbreviation,
          wallet.chain,
          wallet.tokenAddress,
        ) as any,
      ) || undefined;
    return precision?.unitDecimals || 0;
  }, [dispatch, wallet]);
  const walletDetailsBalance = useMemo(() => {
    if (!wallet) {
      return undefined;
    }

    const cryptoBalance = String((wallet as any)?.balance?.crypto || '0');
    const currencyAbbreviation = formatCurrencyAbbreviation(
      String((wallet as any)?.currencyAbbreviation || ''),
    );

    return [cryptoBalance, currencyAbbreviation].filter(Boolean).join(' ');
  }, [wallet]);
  const walletDetailsAtomicBalance = useMemo(() => {
    if (!wallet) {
      return undefined;
    }

    try {
      return unitStringToAtomicBigInt(
        String((wallet as any)?.balance?.crypto || '0').replace(/,/g, ''),
        walletUnitDecimals,
      ).toString();
    } catch {
      return undefined;
    }
  }, [wallet, walletUnitDecimals]);
  const walletPopulateLogicAtomicBalance = useMemo(() => {
    if (!wallet) {
      return undefined;
    }

    try {
      return getWalletLiveAtomicBalance({
        wallet,
        unitDecimals: walletUnitDecimals,
      }).toString();
    } catch {
      return undefined;
    }
  }, [wallet, walletUnitDecimals]);
  const liveRecomputedMismatch = useMemo(() => {
    if (!wallet || !latestSnapshot) {
      return undefined;
    }

    try {
      const snapshotAtomic = BigInt(
        String(latestSnapshot.cryptoBalance || '0'),
      );
      const populateLiveAtomic = getWalletLiveAtomicBalance({
        wallet,
        unitDecimals: walletUnitDecimals,
      });
      const walletDetailsAtomic = unitStringToAtomicBigInt(
        String((wallet as any)?.balance?.crypto || '0').replace(/,/g, ''),
        walletUnitDecimals,
      );

      return {
        hasPopulateMismatch: snapshotAtomic !== populateLiveAtomic,
        hasWalletDetailsMismatch: snapshotAtomic !== walletDetailsAtomic,
        populateLogicMatchesWalletDetails:
          populateLiveAtomic === walletDetailsAtomic,
        snapshotAtomic: snapshotAtomic.toString(),
        snapshotUnitsHeld: atomicToUnitString(
          snapshotAtomic,
          walletUnitDecimals,
        ),
        unitDecimals: walletUnitDecimals,
        populateLogicCurrentWalletBalance: atomicToUnitString(
          populateLiveAtomic,
          walletUnitDecimals,
        ),
        walletDetailsCurrentWalletBalance: atomicToUnitString(
          walletDetailsAtomic,
          walletUnitDecimals,
        ),
        populateLogicCurrentWalletAtomicBalance: populateLiveAtomic.toString(),
        walletDetailsCurrentWalletAtomicBalance: walletDetailsAtomic.toString(),
        populateLogicDelta: atomicToUnitString(
          snapshotAtomic - populateLiveAtomic,
          walletUnitDecimals,
        ),
        walletDetailsDelta: atomicToUnitString(
          snapshotAtomic - walletDetailsAtomic,
          walletUnitDecimals,
        ),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        error: message,
      };
    }
  }, [latestSnapshot, wallet, walletUnitDecimals]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setRuntimeError('');

    try {
      const client = getPortfolioRuntimeClient();
      const [nextIndex, nextLatestSnapshot, nextSnapshots] = await Promise.all([
        client.getSnapshotIndex({walletId}),
        client.getLatestSnapshot({walletId}),
        client.listSnapshots({walletId}),
      ]);

      setIndex(nextIndex || null);
      setLatestSnapshot(nextLatestSnapshot || null);
      setSnapshots(Array.isArray(nextSnapshots) ? nextSnapshots : []);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logManager.error('[PortfolioWalletDebug] refresh failed', message);
      setRuntimeError(message);
      setIndex(null);
      setLatestSnapshot(null);
      setSnapshots([]);
    } finally {
      setIsLoading(false);
    }
  }, [walletId]);

  const refreshBwsSummary = useCallback(async () => {
    if (!wallet) {
      setRuntimeError('Wallet not found in current Redux wallet state.');
      return;
    }

    setIsRefreshingBwsSummary(true);
    setRuntimeError('');

    try {
      const credentials = extractPortfolioWalletCredentialsSnapshot(wallet);
      const client = createPortfolioDebugBwcClient(credentials);
      const summary = await fetchPortfolioDebugBwsWalletSummary(
        client,
        credentials,
      );

      setBwsSummary({
        fetchedAtMs: Date.now(),
        summary,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logManager.error(
        '[PortfolioWalletDebug] refreshBwsSummary failed',
        message,
      );
      setRuntimeError(message);
    } finally {
      setIsRefreshingBwsSummary(false);
    }
  }, [wallet]);

  const runBalanceDiagnostic = useCallback(async () => {
    if (!wallet) {
      setRuntimeError('Wallet not found in current Redux wallet state.');
      return;
    }

    setIsRunningBalanceDiagnostic(true);
    setRuntimeError('');

    try {
      const credentials = extractPortfolioWalletCredentialsSnapshot(wallet);
      const client = createPortfolioDebugBwcClient(credentials);
      const runtimeClient = getPortfolioRuntimeClient();
      const [
        nextIndex,
        nextLatestSnapshot,
        nextSnapshots,
        nextPopulateTrace,
        summary,
        txPages,
      ] = await Promise.all([
        runtimeClient.getSnapshotIndex({walletId}),
        runtimeClient.getLatestSnapshot({walletId}),
        runtimeClient.listSnapshots({walletId}),
        runtimeClient.getPopulateWalletTrace({walletId}),
        fetchPortfolioDebugBwsWalletSummary(client, credentials),
        collectPortfolioDebugTxHistoryPages({
          client,
          credentials,
          pageSize: DIAGNOSTIC_PAGE_SIZE,
        }),
      ]);

      setIndex(nextIndex || null);
      setLatestSnapshot(nextLatestSnapshot || null);
      setSnapshots(Array.isArray(nextSnapshots) ? nextSnapshots : []);
      setBwsSummary({
        fetchedAtMs: Date.now(),
        summary,
      });
      if (nextPopulateTrace) {
        setLastDebugPopulate(current =>
          current
            ? {...current, debugTrace: nextPopulateTrace}
            : {
                capturedAtMs: Date.now(),
                snapshotDebugMode: nextPopulateTrace.snapshotDebugMode,
                beforeIndex: null,
                afterIndex: nextIndex || null,
                debugTrace: nextPopulateTrace,
              },
        );
      }

      const diagnostic = buildWalletBalanceDiagnostic({
        wallet: summary,
        credentials,
        txPages,
        index: nextIndex || null,
        populateCapture: lastDebugPopulate
          ? {
              ...lastDebugPopulate,
              debugTrace: nextPopulateTrace || lastDebugPopulate.debugTrace,
            }
          : nextPopulateTrace
          ? {
              capturedAtMs: Date.now(),
              snapshotDebugMode: nextPopulateTrace.snapshotDebugMode,
              beforeIndex: null,
              afterIndex: nextIndex || null,
              debugTrace: nextPopulateTrace,
            }
          : undefined,
        snapshots: Array.isArray(nextSnapshots) ? nextSnapshots : [],
      });
      const txCount = txPages.reduce(
        (total, page) => total + page.txs.length,
        0,
      );

      setBalanceDiagnostic({
        generatedAtMs: Date.now(),
        summaryLine: diagnostic.summaryLine,
        reportText: diagnostic.reportText,
        pageCount: txPages.length,
        txCount,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logManager.error(
        '[PortfolioWalletDebug] runBalanceDiagnostic failed',
        message,
      );
      setRuntimeError(message);
    } finally {
      setIsRunningBalanceDiagnostic(false);
    }
  }, [lastDebugPopulate, wallet, walletId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    setBwsSummary(null);
    setBalanceDiagnostic(null);
    setLastDebugPopulate(null);
    setCopyBalanceDiagnosticState('idle');
  }, [walletId]);

  const previewJson = useMemo(() => {
    const payload = {
      wallet: wallet
        ? {
            walletId: wallet.id,
            walletName: (wallet as any)?.walletName,
            chain: (wallet as any)?.chain,
            currencyAbbreviation: (wallet as any)?.currencyAbbreviation,
            network: (wallet as any)?.network,
            balance: (wallet as any)?.balance || null,
          }
        : null,
      mismatch: mismatch || null,
      index,
      latestSnapshot,
      bwsSummary,
      balanceDiagnostic,
      lastDebugPopulate,
      snapshotsPreview: {
        total: snapshots.length,
        first: snapshots.slice(0, 10),
        last: snapshots.slice(-10),
      },
    };

    return JSON.stringify(payload, null, 2);
  }, [
    balanceDiagnostic,
    bwsSummary,
    index,
    lastDebugPopulate,
    latestSnapshot,
    mismatch,
    snapshots,
    wallet,
  ]);

  const copyJson = useCallback(() => {
    Clipboard.setString(
      JSON.stringify(
        {
          wallet,
          mismatch,
          index,
          latestSnapshot,
          bwsSummary,
          balanceDiagnostic,
          lastDebugPopulate,
          snapshots,
        },
        null,
        2,
      ),
    );
    setCopyJsonState('copied');
    setTimeout(() => setCopyJsonState('idle'), 1200);
  }, [
    balanceDiagnostic,
    bwsSummary,
    index,
    lastDebugPopulate,
    latestSnapshot,
    mismatch,
    snapshots,
    wallet,
  ]);

  const copyCsv = useCallback(() => {
    Clipboard.setString(toCsv(snapshots));
    setCopyCsvState('copied');
    setTimeout(() => setCopyCsvState('idle'), 1200);
  }, [snapshots]);

  const copyBalanceDiagnostic = useCallback(() => {
    if (!balanceDiagnostic?.reportText) {
      return;
    }

    Clipboard.setString(balanceDiagnostic.reportText);
    setCopyBalanceDiagnosticState('copied');
    setTimeout(() => setCopyBalanceDiagnosticState('idle'), 1200);
  }, [balanceDiagnostic]);

  const clearWallet = useCallback(async () => {
    try {
      setBalanceDiagnostic(null);
      setLastDebugPopulate(null);
      setCopyBalanceDiagnosticState('idle');
      await dispatch(
        clearWalletPortfolioDataWithRuntime({walletIds: [walletId]}) as any,
      );
      await refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setRuntimeError(message);
    }
  }, [dispatch, refresh, walletId]);

  const repopulateWallet = useCallback(async () => {
    try {
      setBalanceDiagnostic(null);
      setCopyBalanceDiagnosticState('idle');
      const runtimeClient = getPortfolioRuntimeClient();
      const beforeIndex =
        (await runtimeClient.getSnapshotIndex({walletId})) || null;
      await dispatch(
        populatePortfolio(
          wallet
            ? {
                wallets: [wallet],
                walletIds: [walletId],
                snapshotDebugMode: populateDebugMode,
              }
            : {walletIds: [walletId], snapshotDebugMode: populateDebugMode},
        ) as any,
      );
      const afterIndex =
        (await runtimeClient.getSnapshotIndex({walletId})) || null;
      const debugTrace =
        (await runtimeClient.getPopulateWalletTrace({walletId})) || null;
      setLastDebugPopulate({
        capturedAtMs: Date.now(),
        snapshotDebugMode: populateDebugMode,
        beforeIndex,
        afterIndex,
        debugTrace,
      });
      await refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setRuntimeError(message);
    }
  }, [dispatch, populateDebugMode, refresh, wallet, walletId]);

  const viewWallet = useCallback(() => {
    if (!wallet) {
      return;
    }

    navigation.navigate(WalletScreens.WALLET_DETAILS, {
      walletId: wallet.id,
    });
  }, [navigation, wallet]);

  const rowsCount = getRowCount(index);
  const latestTimestamp = latestSnapshot?.timestamp;
  const latestBalance = latestSnapshot?.cryptoBalance;

  return (
    <DebugScreenContainer>
      <ScrollView>
        <DebugHeaderContainer>
          <DebugHeaderText>
            {t('Runtime wallet debug view for a single portfolio wallet.')}
          </DebugHeaderText>
          <ControlLabel>
            {`Populate debug mode: ${formatSnapshotDebugModeLabel(
              populateDebugMode,
            )}`}
          </ControlLabel>
          <DebugButtonRow>
            {SNAPSHOT_DEBUG_MODE_OPTIONS.map(mode => {
              const selected = populateDebugMode === mode;
              return (
                <DebugPillButton
                  key={mode}
                  onPress={() => setPopulateDebugMode(mode)}
                  selected={selected}>
                  <DebugPillButtonText selected={selected}>
                    {formatSnapshotDebugModeLabel(mode)}
                  </DebugPillButtonText>
                </DebugPillButton>
              );
            })}
          </DebugButtonRow>
          <DebugButtonRow>
            <DebugPillButton onPress={refresh}>
              <DebugPillButtonText>
                {isLoading ? t('Loading...') : t('Refresh')}
              </DebugPillButtonText>
            </DebugPillButton>
            <DebugPillButton disabled={!wallet} onPress={refreshBwsSummary}>
              <DebugPillButtonText>
                {isRefreshingBwsSummary ? t('Loading...') : t('Refresh BWS')}
              </DebugPillButtonText>
            </DebugPillButton>
            <DebugPillButton disabled={!wallet} onPress={viewWallet}>
              <DebugPillButtonText>{t('View Wallet')}</DebugPillButtonText>
            </DebugPillButton>
            <DebugPillButton onPress={repopulateWallet}>
              <DebugPillButtonText>
                {`${t('Populate Wallet')} (${formatSnapshotDebugModeLabel(
                  populateDebugMode,
                )})`}
              </DebugPillButtonText>
            </DebugPillButton>
            <DebugPillButton onPress={clearWallet}>
              <DebugPillButtonText>{t('Clear Wallet')}</DebugPillButtonText>
            </DebugPillButton>
            <DebugPillButton onPress={copyJson}>
              <DebugPillButtonText>
                {copyJsonState === 'copied' ? t('Copied') : t('Copy JSON')}
              </DebugPillButtonText>
            </DebugPillButton>
            <DebugPillButton onPress={copyCsv}>
              <DebugPillButtonText>
                {copyCsvState === 'copied' ? t('Copied') : t('Copy CSV')}
              </DebugPillButtonText>
            </DebugPillButton>
            <DebugPillButton disabled={!wallet} onPress={runBalanceDiagnostic}>
              <DebugPillButtonText>
                {isRunningBalanceDiagnostic
                  ? t('Running...')
                  : t('Run Diagnostic')}
              </DebugPillButtonText>
            </DebugPillButton>
            <DebugPillButton
              disabled={!balanceDiagnostic?.reportText}
              onPress={copyBalanceDiagnostic}>
              <DebugPillButtonText>
                {copyBalanceDiagnosticState === 'copied'
                  ? t('Copied')
                  : t('Copy Diagnostic')}
              </DebugPillButtonText>
            </DebugPillButton>
          </DebugButtonRow>
        </DebugHeaderContainer>

        {runtimeError ? <ErrorText>{runtimeError}</ErrorText> : null}

        <SectionTitle>{t('Wallet')}</SectionTitle>
        <SectionText>
          {wallet
            ? [
                `walletId: ${wallet.id}`,
                `walletName: ${String(
                  (wallet as any)?.walletName ||
                    (wallet as any)?.name ||
                    wallet.id,
                )}`,
                `chain: ${String((wallet as any)?.chain || '')}`,
                `coin: ${String((wallet as any)?.currencyAbbreviation || '')}`,
                `network: ${String((wallet as any)?.network || '')}`,
                `unitDecimals: ${walletUnitDecimals}`,
                `walletBalanceSat: ${String(
                  (wallet as any)?.balance?.sat ?? '—',
                )}`,
                `walletDetailsBalance: ${walletDetailsBalance || '—'}`,
                `walletDetailsAtomicBalance: ${
                  walletDetailsAtomicBalance || '—'
                }`,
                `populateLogicAtomicBalance: ${
                  walletPopulateLogicAtomicBalance || '—'
                }`,
              ].join('\n')
            : `walletId: ${walletId}\nwallet not found in current Redux wallet state`}
        </SectionText>

        <SectionTitle>{t('Runtime snapshot index')}</SectionTitle>
        <SectionText>
          {index
            ? [
                `rows: ${rowsCount}`,
                `chunks: ${index.chunks?.length || 0}`,
                `chunkRows: ${index.chunkRows}`,
                `chunkDebugModes: ${formatChunkDebugModes(index)}`,
                `compressionEnabled: ${
                  index.compressionEnabled ? 'yes' : 'no'
                }`,
                `checkpoint.nextSkip: ${index.checkpoint?.nextSkip ?? 0}`,
                `checkpoint.balanceAtomic: ${
                  index.checkpoint?.balanceAtomic ?? '—'
                }`,
                `checkpoint.lastTimestamp: ${
                  index.checkpoint?.lastTimestamp ?? '—'
                }`,
                `checkpoint.lastTimestampIso: ${toIso(
                  index.checkpoint?.lastTimestamp,
                )}`,
                `checkpoint.recentTxIds: ${
                  Array.isArray(index.checkpoint?.recentTxIds) &&
                  index.checkpoint.recentTxIds.length
                    ? index.checkpoint.recentTxIds.join('|')
                    : '—'
                }`,
                `checkpoint.carryoverGroup: ${
                  Array.isArray(index.checkpoint?.carryoverGroup) &&
                  index.checkpoint.carryoverGroup.length
                    ? JSON.stringify(index.checkpoint.carryoverGroup)
                    : '—'
                }`,
                `updatedAt: ${toIso(index.updatedAt)}`,
              ].join('\n')
            : 'No runtime snapshot index'}
        </SectionText>

        <SectionTitle>{t('Last debug populate')}</SectionTitle>
        <SectionText>
          {lastDebugPopulate
            ? [
                `capturedAt: ${toIso(lastDebugPopulate.capturedAtMs)}`,
                `snapshotDebugMode: ${lastDebugPopulate.snapshotDebugMode}`,
                `before.nextSkip: ${
                  lastDebugPopulate.beforeIndex?.checkpoint?.nextSkip ?? '—'
                }`,
                `before.balanceAtomic: ${
                  lastDebugPopulate.beforeIndex?.checkpoint?.balanceAtomic ??
                  '—'
                }`,
                `after.nextSkip: ${
                  lastDebugPopulate.afterIndex?.checkpoint?.nextSkip ?? '—'
                }`,
                `after.balanceAtomic: ${
                  lastDebugPopulate.afterIndex?.checkpoint?.balanceAtomic ?? '—'
                }`,
                `after.chunkDebugModes: ${formatChunkDebugModes(
                  lastDebugPopulate.afterIndex,
                )}`,
                `populateDebug.fetchedTxRows: ${
                  lastDebugPopulate.debugTrace?.fetchedTxRows.length ?? 0
                }`,
                `populateDebug.processedTxRows: ${
                  lastDebugPopulate.debugTrace?.processedTxRows.length ?? 0
                }`,
                `populateDebug.emittedSnapshotRows: ${
                  lastDebugPopulate.debugTrace?.emittedSnapshotRows.length ?? 0
                }`,
              ].join('\n')
            : 'No debug populate capture yet. Populate Wallet in this screen to store before/after checkpoint data.'}
        </SectionText>

        <SectionTitle>{t('Live BWS status')}</SectionTitle>
        <SectionText>
          {bwsSummary
            ? [
                `fetchedAt: ${toIso(bwsSummary.fetchedAtMs)}`,
                `walletId: ${bwsSummary.summary.walletId}`,
                `walletName: ${bwsSummary.summary.walletName}`,
                `balanceAtomic: ${bwsSummary.summary.balanceAtomic}`,
                `balanceFormatted: ${bwsSummary.summary.balanceFormatted}`,
              ].join('\n')
            : 'Not fetched yet. Use Refresh BWS to fetch the live wallet summary through the BWC request path.'}
        </SectionText>

        <SectionTitle>{t('Latest snapshot')}</SectionTitle>
        <SectionText>
          {latestSnapshot
            ? [
                `id: ${latestSnapshot.id}`,
                `timestamp: ${latestSnapshot.timestamp}`,
                `iso: ${toIso(latestTimestamp)}`,
                `eventType: ${latestSnapshot.eventType}`,
                `cryptoBalanceAtomic: ${latestBalance}`,
                `remainingCostBasisFiat: ${latestSnapshot.remainingCostBasisFiat}`,
                `markRate: ${latestSnapshot.markRate}`,
                `quoteCurrency: ${latestSnapshot.quoteCurrency}`,
              ].join('\n')
            : 'No latest snapshot'}
        </SectionText>

        <SectionTitle>{t('Cached populate mismatch')}</SectionTitle>
        <SectionText>
          {mismatch
            ? [
                `delta: ${mismatch.delta}`,
                `deltaAtomic: ${mismatch.deltaAtomic}`,
                `currentWalletBalance: ${mismatch.currentWalletBalance}`,
                `currentAtomic: ${mismatch.currentAtomic}`,
                `computedUnitsHeld: ${mismatch.computedUnitsHeld}`,
                `computedAtomic: ${mismatch.computedAtomic}`,
              ].join('\n')
            : 'No recorded mismatch from the last populate decision'}
        </SectionText>

        <SectionTitle>{t('Live recomputed mismatch')}</SectionTitle>
        <SectionText>
          {!wallet
            ? 'Wallet not found in current Redux wallet state'
            : !latestSnapshot
            ? 'No latest snapshot available to compare'
            : liveRecomputedMismatch?.error
            ? `Unable to recompute mismatch: ${liveRecomputedMismatch.error}`
            : [
                `populateLogicStatus: ${
                  liveRecomputedMismatch?.hasPopulateMismatch
                    ? 'mismatch'
                    : 'match'
                }`,
                `walletDetailsStatus: ${
                  liveRecomputedMismatch?.hasWalletDetailsMismatch
                    ? 'mismatch'
                    : 'match'
                }`,
                `unitDecimals: ${liveRecomputedMismatch?.unitDecimals ?? '—'}`,
                `snapshotAtomic: ${
                  liveRecomputedMismatch?.snapshotAtomic || '—'
                }`,
                `snapshotUnitsHeld: ${
                  liveRecomputedMismatch?.snapshotUnitsHeld || '—'
                }`,
                `populateLogicCurrentWalletAtomicBalance: ${
                  liveRecomputedMismatch?.populateLogicCurrentWalletAtomicBalance ||
                  '—'
                }`,
                `populateLogicCurrentWalletBalance: ${
                  liveRecomputedMismatch?.populateLogicCurrentWalletBalance ||
                  '—'
                }`,
                `walletDetailsCurrentWalletAtomicBalance: ${
                  liveRecomputedMismatch?.walletDetailsCurrentWalletAtomicBalance ||
                  '—'
                }`,
                `walletDetailsCurrentWalletBalance: ${
                  liveRecomputedMismatch?.walletDetailsCurrentWalletBalance ||
                  '—'
                }`,
                `populateLogicDelta: ${
                  liveRecomputedMismatch?.populateLogicDelta || '—'
                }`,
                `walletDetailsDelta: ${
                  liveRecomputedMismatch?.walletDetailsDelta || '—'
                }`,
                `populateLogicMatchesWalletDetails: ${
                  liveRecomputedMismatch?.populateLogicMatchesWalletDetails
                    ? 'yes'
                    : 'no'
                }`,
              ].join('\n')}
        </SectionText>

        <SectionTitle>{t('Harness balance diagnostic')}</SectionTitle>
        <SectionText>
          {balanceDiagnostic
            ? [
                `generatedAt: ${toIso(balanceDiagnostic.generatedAtMs)}`,
                `pages: ${balanceDiagnostic.pageCount}`,
                `txs: ${balanceDiagnostic.txCount}`,
                `summary: ${balanceDiagnostic.summaryLine}`,
              ].join('\n')
            : 'No diagnostic report yet. Run Diagnostic to fetch reverse tx history through the BWC request path and compare it against the stored runtime snapshots.'}
        </SectionText>

        {balanceDiagnostic?.reportText ? (
          <JsonLineText>{balanceDiagnostic.reportText}</JsonLineText>
        ) : null}

        <SectionTitle>{t('Raw preview')}</SectionTitle>
        <JsonLineText>{previewJson}</JsonLineText>
        <DebugButtonSpacer />
      </ScrollView>
    </DebugScreenContainer>
  );
};

export default PortfolioWalletDebug;
