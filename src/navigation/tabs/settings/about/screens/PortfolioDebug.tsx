import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  InteractionManager,
  Pressable,
  ScrollView,
  TextInput,
} from 'react-native';
import styled, {useTheme} from 'styled-components/native';
import Clipboard from '@react-native-clipboard/clipboard';
import {useTranslation} from 'react-i18next';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import SearchSvg from '../../../../../../assets/img/search.svg';
import {Network} from '../../../../../constants';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {getPortfolioRuntimeClient} from '../../../../../portfolio/runtime/portfolioRuntime';
import type {
  SnapshotIndexV2,
  SnapshotPersistDebugMode,
} from '../../../../../portfolio/core/pnl/snapshotStore';
import type {SnapshotInvalidHistoryMarkerV1} from '../../../../../portfolio/core/pnl/invalidHistory';
import type {Wallet} from '../../../../../store/wallet/wallet.models';
import type {
  ExcessiveBalanceMismatchMarker,
  InvalidDecimalsMarker,
  SnapshotBalanceMismatch,
} from '../../../../../store/portfolio/portfolio.models';
import {
  clearPortfolioWithRuntime,
  populatePortfolio,
} from '../../../../../store/portfolio';
import {remountHomeChart} from '../../../../../store/app/app.actions';
import {clearShopStore} from '../../../../../store/shop/shop.actions';
import {clearShopCatalogStore} from '../../../../../store/shop-catalog/shop-catalog.actions';
import {AboutGroupParamList, AboutScreens} from '../AboutGroup';
import {
  DebugButtonRow,
  DebugButtonSpacer,
  DebugHeaderContainer,
  DebugHeaderText,
  DebugPillButton,
  DebugPillButtonText,
  DebugScreenContainer,
  SNAPSHOT_DEBUG_MODE_OPTIONS,
  formatDebugIso,
  formatSnapshotDebugModeLabel,
  getSnapshotIndexRowCount,
} from '../components/DebugUI';
import {logManager} from '../../../../../managers/LogManager';

type PortfolioDebugScreenProps = NativeStackScreenProps<
  AboutGroupParamList,
  AboutScreens.PORTFOLIO_DEBUG
>;

type RuntimeWalletRow = {
  wallet: Wallet;
  index: SnapshotIndexV2 | null;
  rowCount: number;
  chunkCount: number;
  mismatch?: SnapshotBalanceMismatch;
  invalidHistory?: SnapshotInvalidHistoryMarkerV1;
  invalidDecimals?: InvalidDecimalsMarker;
  excessiveBalanceMismatch?: ExcessiveBalanceMismatchMarker;
};

function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

const WalletRow = styled(Pressable)`
  padding: 14px 12px;
  border-top-width: 1px;
  border-top-color: ${({theme}) => theme.colors.border};
`;

const WalletRowTitle = styled.Text`
  color: ${({theme}) => theme.colors.text};
  font-size: 14px;
  line-height: 18px;
`;

const WalletRowSubTitle = styled.Text`
  color: ${({theme}) => theme.colors.text};
  font-size: 12px;
  line-height: 16px;
  opacity: 0.7;
`;

const WalletRowMismatchText = styled(WalletRowSubTitle)`
  color: ${({theme}) => theme.colors.notification};
  opacity: 1;
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

const EmptyStateText = styled(SectionText)`
  opacity: 0.7;
`;

const ControlLabel = styled.Text`
  padding: 0 12px;
  color: ${({theme}) => theme.colors.text};
  font-size: 12px;
  line-height: 16px;
  opacity: 0.7;
`;

const SearchInputContainer = styled.View`
  margin: 0 12px 12px;
  border-radius: 999px;
  flex-direction: row;
  align-items: center;
  padding: 10px 14px;
  border: 1px solid ${({theme: {dark}}) => (dark ? '#2C2F34' : '#E4E9EF')};
  background-color: ${({theme: {dark}}) => (dark ? 'transparent' : '#FFFFFF')};
`;

const SearchIconContainer = styled.View`
  margin-right: 8px;
`;

const SearchField = styled(TextInput)`
  flex: 1;
  font-size: 13px;
  color: ${({theme}) => theme.colors.text};
  padding: 0;
  margin: 0;
`;

const formatBytes = (bytes?: number): string => {
  const safeBytes = Number(bytes);
  if (!Number.isFinite(safeBytes) || safeBytes <= 0) {
    return '0 Bytes';
  }

  const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(
    Math.floor(Math.log(safeBytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = safeBytes / Math.pow(1024, index);
  const fixed = value >= 100 ? value.toFixed(0) : value.toFixed(2);
  return `${Number(fixed)} ${units[index]}`;
};

const nowMs = (): number => {
  const candidate = globalThis?.performance?.now?.();
  return Number.isFinite(candidate) ? Number(candidate) : Date.now();
};

const roundMs = (value: number): number => Math.round(value * 100) / 100;

const getWalletBalanceLabel = (wallet?: Wallet): string => {
  const crypto = (wallet as any)?.balance?.crypto;
  if (typeof crypto === 'string' && crypto.length) {
    return crypto;
  }

  const sat = (wallet as any)?.balance?.sat;
  if (typeof sat === 'number' && Number.isFinite(sat)) {
    return String(sat);
  }

  return '0';
};

const getAllMainnetWallets = (walletKeys: Record<string, any>): Wallet[] => {
  const rows = Object.values(walletKeys || {})
    .flatMap((key: any) => (Array.isArray(key?.wallets) ? key.wallets : []))
    .filter((wallet: Wallet) => (wallet as any)?.network === Network.mainnet);

  return rows.sort((a, b) => {
    const aName = String((a as any)?.walletName || (a as any)?.id || '');
    const bName = String((b as any)?.walletName || (b as any)?.id || '');
    return aName.localeCompare(bName);
  });
};

const PortfolioDebug = ({navigation}: PortfolioDebugScreenProps) => {
  const {t} = useTranslation();
  const theme = useTheme();
  const dispatch = useAppDispatch();

  const portfolio = useAppSelector(({PORTFOLIO}) => PORTFOLIO);
  const walletKeys = useAppSelector(({WALLET}) => WALLET?.keys || {});

  const [walletRows, setWalletRows] = useState<RuntimeWalletRow[]>([]);
  const [rateEntries, setRateEntries] = useState<any[]>([]);
  const [kvStats, setKvStats] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [isClearingShop, setIsClearingShop] = useState<boolean>(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [runtimeError, setRuntimeError] = useState<string>('');
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | undefined>();
  const [query, setQuery] = useState('');
  const [populateDebugMode, setPopulateDebugMode] =
    useState<SnapshotPersistDebugMode>('link');
  const wallets = useMemo(() => getAllMainnetWallets(walletKeys), [walletKeys]);
  const deferredQuery = useDeferredValue(query);
  const loadRequestIdRef = useRef(0);
  const walletsRef = useLatestRef(wallets);
  const mismatchByWalletIdRef = useLatestRef(
    portfolio.snapshotBalanceMismatchesByWalletId,
  );
  const invalidDecimalsByWalletIdRef = useLatestRef(
    portfolio.invalidDecimalsByWalletId,
  );
  const excessiveBalanceMismatchByWalletIdRef = useLatestRef(
    portfolio.excessiveBalanceMismatchesByWalletId,
  );
  const populateStartProbeRef = useRef<
    | {
        startedAtMs: number;
        walletCount: number;
        walletRowCount: number;
        snapshotDebugMode: SnapshotPersistDebugMode;
      }
    | undefined
  >(undefined);
  const previousPopulateInProgressRef = useRef(
    !!portfolio.populateStatus?.inProgress,
  );

  const invalidDecimalsRefreshKey = useMemo(() => {
    const invalidDecimalsByWalletId: {
      [walletId: string]: InvalidDecimalsMarker | undefined;
    } = portfolio.invalidDecimalsByWalletId || {};

    return Object.entries(invalidDecimalsByWalletId)
      .map(([walletId, marker]) => `${walletId}:${marker?.message || ''}`)
      .sort()
      .join('|');
  }, [portfolio.invalidDecimalsByWalletId]);

  const excessiveBalanceMismatchRefreshKey = useMemo(() => {
    const excessiveBalanceMismatchesByWalletId: {
      [walletId: string]: ExcessiveBalanceMismatchMarker | undefined;
    } = portfolio.excessiveBalanceMismatchesByWalletId || {};

    return Object.entries(excessiveBalanceMismatchesByWalletId)
      .map(
        ([walletId, marker]) =>
          `${walletId}:${marker?.detectedAt || ''}:${
            marker?.lastAttemptedAt || ''
          }:${marker?.computedAtomic || ''}:${marker?.liveAtomic || ''}`,
      )
      .sort()
      .join('|');
  }, [portfolio.excessiveBalanceMismatchesByWalletId]);

  const refreshToken = useMemo(() => {
    return [
      portfolio.lastPopulatedAt || 0,
      portfolio.populateStatus?.inProgress ? 1 : 0,
      portfolio.populateStatus?.errors?.length || 0,
      invalidDecimalsRefreshKey,
      excessiveBalanceMismatchRefreshKey,
      wallets.length,
    ].join(':');
  }, [
    excessiveBalanceMismatchRefreshKey,
    invalidDecimalsRefreshKey,
    portfolio.lastPopulatedAt,
    portfolio.populateStatus,
    wallets.length,
  ]);

  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const hasActiveQuery = normalizedQuery.length > 0;

  const load = useCallback(async () => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
    setIsLoading(true);
    setRuntimeError('');

    try {
      const client = getPortfolioRuntimeClient();
      const activeWallets = walletsRef.current;
      const [nextKvStats, nextRateEntries, indexes, invalidHistoryMarkers] =
        await Promise.all([
          client.kvStats(),
          client.listRates({}),
          Promise.all(
            activeWallets.map(async wallet => {
              try {
                return await client.getSnapshotIndex({walletId: wallet.id});
              } catch {
                return null;
              }
            }),
          ),
          Promise.all(
            activeWallets.map(async wallet => {
              try {
                return await client.getInvalidHistory({walletId: wallet.id});
              } catch {
                return null;
              }
            }),
          ),
        ]);

      if (loadRequestIdRef.current !== requestId) {
        return;
      }

      const nextRows = activeWallets
        .map((wallet, index): RuntimeWalletRow => {
          const snapshotIndex = indexes[index] || null;
          return {
            wallet,
            index: snapshotIndex,
            rowCount: getSnapshotIndexRowCount(snapshotIndex),
            chunkCount: snapshotIndex?.chunks?.length || 0,
            mismatch: mismatchByWalletIdRef.current?.[wallet.id],
            invalidHistory: invalidHistoryMarkers[index] || undefined,
            invalidDecimals: invalidDecimalsByWalletIdRef.current?.[wallet.id],
            excessiveBalanceMismatch:
              excessiveBalanceMismatchByWalletIdRef.current?.[wallet.id],
          };
        })
        .sort((a, b) => {
          const quarantineScoreA =
            (a.invalidHistory ? 1 : 0) +
            (a.invalidDecimals ? 1 : 0) +
            (a.excessiveBalanceMismatch ? 1 : 0);
          const quarantineScoreB =
            (b.invalidHistory ? 1 : 0) +
            (b.invalidDecimals ? 1 : 0) +
            (b.excessiveBalanceMismatch ? 1 : 0);
          if (quarantineScoreA !== quarantineScoreB) {
            return quarantineScoreB - quarantineScoreA;
          }

          const scoreA = (a.index ? 1 : 0) + (a.mismatch ? 1 : 0);
          const scoreB = (b.index ? 1 : 0) + (b.mismatch ? 1 : 0);
          if (scoreA !== scoreB) {
            return scoreB - scoreA;
          }
          const aName = String(
            (a.wallet as any)?.walletName || a.wallet.id || '',
          );
          const bName = String(
            (b.wallet as any)?.walletName || b.wallet.id || '',
          );
          return aName.localeCompare(bName);
        });

      setWalletRows(nextRows);
      setRateEntries(nextRateEntries || []);
      setKvStats(nextKvStats || null);
      setLastRefreshedAt(Date.now());
    } catch (error: unknown) {
      if (loadRequestIdRef.current !== requestId) {
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      logManager.error('[PortfolioDebug] refresh failed', message);
      setRuntimeError(message);
      setWalletRows([]);
      setRateEntries([]);
      setKvStats(null);
    } finally {
      if (loadRequestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshToken]);

  useEffect(() => {
    const previous = previousPopulateInProgressRef.current;
    const current = !!portfolio.populateStatus?.inProgress;
    const probe = populateStartProbeRef.current;

    if (!previous && current) {
      console.log('[portfolio-raw-populate-freeze] inProgress observed', {
        elapsedMs: probe ? roundMs(nowMs() - probe.startedAtMs) : undefined,
        walletCount: probe?.walletCount ?? wallets.length,
        walletRowCount: probe?.walletRowCount ?? walletRows.length,
        snapshotDebugMode: probe?.snapshotDebugMode,
        currentWalletId: portfolio.populateStatus?.currentWalletId,
        walletsTotal: portfolio.populateStatus?.walletsTotal,
      });
    }

    if (previous && !current) {
      populateStartProbeRef.current = undefined;
    }

    previousPopulateInProgressRef.current = current;
  }, [
    portfolio.populateStatus?.currentWalletId,
    portfolio.populateStatus?.inProgress,
    portfolio.populateStatus?.walletsTotal,
    walletRows.length,
    wallets.length,
  ]);

  const summary = useMemo(() => {
    const walletsWithSnapshots = walletRows.filter(row => !!row.index).length;
    const totalRows = walletRows.reduce(
      (total, row) => total + row.rowCount,
      0,
    );
    const totalChunks = walletRows.reduce(
      (total, row) => total + row.chunkCount,
      0,
    );
    const mismatchCount = walletRows.filter(row => !!row.mismatch).length;
    const invalidHistoryCount = walletRows.filter(
      row => !!row.invalidHistory,
    ).length;
    const invalidDecimalsCount = walletRows.filter(
      row => !!row.invalidDecimals,
    ).length;
    const excessiveBalanceMismatchCount = walletRows.filter(
      row => !!row.excessiveBalanceMismatch,
    ).length;

    return {
      walletsTotal: wallets.length,
      walletsWithSnapshots,
      totalRows,
      totalChunks,
      mismatchCount,
      invalidHistoryCount,
      invalidDecimalsCount,
      excessiveBalanceMismatchCount,
      rateEntries: rateEntries.length,
      kvStats,
      populateStatus: portfolio.populateStatus,
      lastPopulatedAt: portfolio.lastPopulatedAt,
      lastRefreshedAt,
    };
  }, [
    kvStats,
    lastRefreshedAt,
    portfolio.lastPopulatedAt,
    portfolio.populateStatus,
    rateEntries.length,
    walletRows,
    wallets.length,
  ]);

  const filteredWalletRows = useMemo(() => {
    if (!hasActiveQuery) {
      return walletRows;
    }

    return walletRows.filter(row => {
      const walletName = String(
        (row.wallet as any)?.walletName ||
          (row.wallet as any)?.name ||
          row.wallet.id,
      );
      const chain = String((row.wallet as any)?.chain || '');
      const coin = String((row.wallet as any)?.currencyAbbreviation || '');
      const searchText = [walletName, chain, coin].join('\u0000').toLowerCase();
      return searchText.includes(normalizedQuery);
    });
  }, [hasActiveQuery, normalizedQuery, walletRows]);

  const copySummary = useCallback(() => {
    const payload = {
      summary,
      wallets: walletRows.map(row => ({
        walletId: row.wallet.id,
        walletName: (row.wallet as any)?.walletName,
        chain: (row.wallet as any)?.chain,
        currencyAbbreviation: (row.wallet as any)?.currencyAbbreviation,
        network: (row.wallet as any)?.network,
        rowCount: row.rowCount,
        chunkCount: row.chunkCount,
        updatedAt: row.index?.updatedAt,
        mismatch: row.mismatch || null,
        invalidHistory: row.invalidHistory || null,
        invalidDecimals: row.invalidDecimals || null,
        excessiveBalanceMismatch: row.excessiveBalanceMismatch || null,
      })),
      rates: rateEntries,
    };

    Clipboard.setString(JSON.stringify(payload, null, 2));
    setCopyState('copied');
    setTimeout(() => setCopyState('idle'), 1200);
  }, [rateEntries, summary, walletRows]);

  const repopulate = useCallback(async () => {
    const startedAtMs = nowMs();
    const walletCount = wallets.length;
    const walletRowCount = walletRows.length;
    const probe = {
      startedAtMs,
      walletCount,
      walletRowCount,
      snapshotDebugMode: populateDebugMode,
    };
    populateStartProbeRef.current = probe;

    console.log('[portfolio-raw-populate-freeze] tap start', {
      walletCount,
      walletRowCount,
      snapshotDebugMode: populateDebugMode,
      populateInProgress: !!portfolio.populateStatus?.inProgress,
    });

    setTimeout(() => {
      if (populateStartProbeRef.current !== probe) {
        return;
      }
      console.log('[portfolio-raw-populate-freeze] post-tap setTimeout', {
        elapsedMs: roundMs(nowMs() - startedAtMs),
        walletCount,
      });
    }, 0);

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        if (populateStartProbeRef.current !== probe) {
          return;
        }
        console.log('[portfolio-raw-populate-freeze] post-tap animationFrame', {
          elapsedMs: roundMs(nowMs() - startedAtMs),
          walletCount,
        });
      });
    }

    InteractionManager.runAfterInteractions(() => {
      if (populateStartProbeRef.current !== probe) {
        return;
      }
      console.log('[portfolio-raw-populate-freeze] after interactions', {
        elapsedMs: roundMs(nowMs() - startedAtMs),
        walletCount,
      });
    });

    try {
      const dispatchStartedAt = nowMs();
      const populatePromise = dispatch(
        populatePortfolio({snapshotDebugMode: populateDebugMode}) as any,
      );

      console.log('[portfolio-raw-populate-freeze] dispatch returned', {
        syncElapsedMs: roundMs(nowMs() - dispatchStartedAt),
        elapsedSinceTapMs: roundMs(nowMs() - startedAtMs),
        walletCount,
      });

      await populatePromise;

      console.log(
        '[portfolio-raw-populate-freeze] populate dispatch resolved',
        {
          elapsedSinceTapMs: roundMs(nowMs() - startedAtMs),
          walletCount,
        },
      );

      const loadStartedAt = nowMs();
      load()
        .then(() => {
          console.log(
            '[portfolio-raw-populate-freeze] post-dispatch load resolved',
            {
              elapsedMs: roundMs(nowMs() - loadStartedAt),
              elapsedSinceTapMs: roundMs(nowMs() - startedAtMs),
              walletCount,
            },
          );
        })
        .catch((loadError: unknown) => {
          const loadMessage =
            loadError instanceof Error ? loadError.message : String(loadError);
          console.log(
            '[portfolio-raw-populate-freeze] post-dispatch load error',
            {
              elapsedMs: roundMs(nowMs() - loadStartedAt),
              elapsedSinceTapMs: roundMs(nowMs() - startedAtMs),
              walletCount,
              message: loadMessage,
            },
          );
        });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.log('[portfolio-raw-populate-freeze] populate dispatch error', {
        elapsedSinceTapMs: roundMs(nowMs() - startedAtMs),
        walletCount,
        message,
      });
      setRuntimeError(message);
    }
  }, [
    dispatch,
    load,
    populateDebugMode,
    portfolio.populateStatus?.inProgress,
    walletRows.length,
    wallets.length,
  ]);

  const clearAll = useCallback(async () => {
    if (isClearing) {
      return;
    }

    setRuntimeError('');
    setIsClearing(true);
    try {
      await dispatch(clearPortfolioWithRuntime() as any);
      await load();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setRuntimeError(message);
    } finally {
      setIsClearing(false);
    }
  }, [dispatch, isClearing, load]);

  const clearShopSlices = useCallback(async () => {
    if (isClearingShop) {
      return;
    }

    setRuntimeError('');
    setIsClearingShop(true);
    try {
      dispatch(clearShopStore());
      dispatch(clearShopCatalogStore());
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setRuntimeError(message);
    } finally {
      setIsClearingShop(false);
    }
  }, [dispatch, isClearingShop]);

  const clearRates = useCallback(async () => {
    try {
      await getPortfolioRuntimeClient().clearRateStorage();
      await load();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setRuntimeError(message);
    }
  }, [load]);

  const remountCharts = useCallback(() => {
    try {
      setRuntimeError('');
      dispatch(remountHomeChart());
      load();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setRuntimeError(message);
    }
  }, [dispatch, load]);

  return (
    <DebugScreenContainer>
      <ScrollView keyboardShouldPersistTaps="handled">
        <DebugHeaderContainer>
          <DebugHeaderText>
            {t(
              'Runtime-backed portfolio debug info. Redux snapshot arrays are no longer used in production.',
            )}
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
            <DebugPillButton onPress={load}>
              <DebugPillButtonText>
                {isLoading ? t('Loading...') : t('Refresh')}
              </DebugPillButtonText>
            </DebugPillButton>
            <DebugPillButton onPress={repopulate}>
              <DebugPillButtonText>
                {`${t('Populate')} (${formatSnapshotDebugModeLabel(
                  populateDebugMode,
                )})`}
              </DebugPillButtonText>
            </DebugPillButton>
            <DebugPillButton onPress={clearRates}>
              <DebugPillButtonText>{t('Clear Rates')}</DebugPillButtonText>
            </DebugPillButton>
            <DebugPillButton
              disabled={isClearingShop}
              onPress={clearShopSlices}>
              <DebugPillButtonText>
                {isClearingShop ? t('Clearing Shop...') : t('Clear Shop')}
              </DebugPillButtonText>
            </DebugPillButton>
            <DebugPillButton onPress={remountCharts}>
              <DebugPillButtonText>
                {t('Remount Portfolio Chart')}
              </DebugPillButtonText>
            </DebugPillButton>
            <DebugPillButton disabled={isClearing} onPress={clearAll}>
              <DebugPillButtonText>
                {isClearing ? t('Clearing...') : t('Clear All')}
              </DebugPillButtonText>
            </DebugPillButton>
            <DebugPillButton onPress={copySummary}>
              <DebugPillButtonText>
                {copyState === 'copied' ? t('Copied') : t('Copy JSON')}
              </DebugPillButtonText>
            </DebugPillButton>
          </DebugButtonRow>
        </DebugHeaderContainer>

        {runtimeError ? <ErrorText>{runtimeError}</ErrorText> : null}

        <SectionText>
          {`Wallets: ${summary.walletsWithSnapshots}/${summary.walletsTotal} with runtime data\n`}
          {`Snapshot rows: ${summary.totalRows}\n`}
          {`Snapshot chunks: ${summary.totalChunks}\n`}
          {`Runtime keys: ${summary.kvStats?.totalKeys || 0}\n`}
          {`Runtime bytes: ${formatBytes(summary.kvStats?.totalBytes)}\n`}
          {`Snapshot bytes: ${formatBytes(summary.kvStats?.snapBytes)}\n`}
          {`Rate bytes: ${formatBytes(summary.kvStats?.rateBytes)}\n`}
          {`Rate entries: ${summary.rateEntries}\n`}
          {`Populate in progress: ${
            summary.populateStatus?.inProgress ? 'yes' : 'no'
          }\n`}
          {`Wallets completed: ${
            summary.populateStatus?.walletsCompleted || 0
          }/${summary.populateStatus?.walletsTotal || 0}\n`}
          {`Errors: ${summary.populateStatus?.errors?.length || 0}\n`}
          {`Stop reason: ${summary.populateStatus?.stopReason || '—'}\n`}
          {`Mismatches: ${summary.mismatchCount}\n`}
          {`Invalid history: ${summary.invalidHistoryCount}\n`}
          {`Invalid decimals: ${summary.invalidDecimalsCount}\n`}
          {`Excessive mismatches: ${summary.excessiveBalanceMismatchCount}\n`}
          {`Last populated: ${formatDebugIso(summary.lastPopulatedAt)}\n`}
          {`Last refreshed: ${formatDebugIso(summary.lastRefreshedAt)}`}
        </SectionText>

        <SearchInputContainer>
          <SearchIconContainer>
            <SearchSvg height={16} width={16} />
          </SearchIconContainer>
          <SearchField
            value={query}
            placeholder={t('Search wallets')}
            placeholderTextColor={theme.dark ? '#9BA3AE' : '#6B7280'}
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setQuery}
            accessibilityLabel="Search portfolio raw wallets"
            testID="portfolio-debug-search-input"
          />
        </SearchInputContainer>

        {!walletRows.length ? (
          <EmptyStateText>{t('No mainnet wallets found.')}</EmptyStateText>
        ) : !filteredWalletRows.length ? (
          <EmptyStateText>{t('No wallets match your search.')}</EmptyStateText>
        ) : null}

        {filteredWalletRows.map(row => {
          const walletName = String(
            (row.wallet as any)?.walletName ||
              (row.wallet as any)?.name ||
              row.wallet.id,
          );
          const subtitle = [
            String((row.wallet as any)?.chain || '').toUpperCase(),
            String(
              (row.wallet as any)?.currencyAbbreviation || '',
            ).toUpperCase(),
            String((row.wallet as any)?.network || '').toLowerCase(),
            getWalletBalanceLabel(row.wallet),
          ]
            .filter(Boolean)
            .join(' • ');

          return (
            <WalletRow
              key={row.wallet.id}
              onPress={() =>
                navigation.navigate(AboutScreens.PORTFOLIO_WALLET_DEBUG, {
                  walletId: row.wallet.id,
                })
              }>
              <WalletRowTitle>{walletName}</WalletRowTitle>
              <WalletRowSubTitle>{subtitle}</WalletRowSubTitle>
              <WalletRowSubTitle>
                {row.index
                  ? `rows ${row.rowCount} • chunks ${
                      row.chunkCount
                    } • updated ${formatDebugIso(row.index.updatedAt)}`
                  : 'no runtime snapshot index'}
              </WalletRowSubTitle>
              {row.mismatch ? (
                <WalletRowMismatchText>
                  {`mismatch Δ ${row.mismatch.delta} • live ${row.mismatch.currentWalletBalance} • stored ${row.mismatch.computedUnitsHeld}`}
                </WalletRowMismatchText>
              ) : null}
              {row.invalidHistory ? (
                <WalletRowMismatchText>
                  {`invalid history • ${row.invalidHistory.reason} • ${row.invalidHistory.message}`}
                </WalletRowMismatchText>
              ) : null}
              {row.invalidDecimals ? (
                <WalletRowMismatchText>
                  {`invalid decimals • ${row.invalidDecimals.message}`}
                </WalletRowMismatchText>
              ) : null}
              {row.excessiveBalanceMismatch ? (
                <WalletRowMismatchText>
                  {`excessive mismatch • ${row.excessiveBalanceMismatch.message}`}
                </WalletRowMismatchText>
              ) : null}
            </WalletRow>
          );
        })}

        <DebugButtonSpacer />
      </ScrollView>
    </DebugScreenContainer>
  );
};

export default PortfolioDebug;
