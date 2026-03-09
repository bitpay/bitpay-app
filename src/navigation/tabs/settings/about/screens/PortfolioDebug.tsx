import React, {useCallback, useMemo, useState} from 'react';
import {InteractionManager, Pressable, ScrollView} from 'react-native';
import styled from 'styled-components/native';
import {useTranslation} from 'react-i18next';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import Clipboard from '@react-native-clipboard/clipboard';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
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
import {
  clearPortfolio,
  populatePortfolio,
} from '../../../../../store/portfolio';
import {clearRateState} from '../../../../../store/rate/rate.actions';
import type {BalanceSnapshot} from '../../../../../store/portfolio/portfolio.models';
import type {Wallet} from '../../../../../store/wallet/wallet.models';
import {Network} from '../../../../../constants';
import type {FiatRatePoint} from '../../../../../store/rate/rate.models';

type PortfolioDebugScreenProps = NativeStackScreenProps<
  AboutGroupParamList,
  AboutScreens.PORTFOLIO_DEBUG
>;

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

const csvEscape = (v: unknown): string => {
  const s = v == null ? '' : String(v);
  if (/[^\x20-\x7E]|[\n\r,\"]/g.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

type DerivedMismatch = {
  deltaUnits: string;
  liveUnits: string;
  snapshotUnits: string;
};

const parseFiatRateSeriesCacheKey = (
  cacheKey: string,
): {fiatCode: string; coin: string; interval: string} | undefined => {
  if (!cacheKey || typeof cacheKey !== 'string') {
    return undefined;
  }
  const first = cacheKey.indexOf(':');
  if (first <= 0) {
    return undefined;
  }
  const second = cacheKey.indexOf(':', first + 1);
  if (second <= first + 1) {
    return undefined;
  }
  return {
    fiatCode: cacheKey.slice(0, first).toUpperCase(),
    coin: cacheKey.slice(first + 1, second).toLowerCase(),
    interval: cacheKey.slice(second + 1),
  };
};

const getFiniteTsBounds = (
  points: FiatRatePoint[] | undefined,
): {startTsMs?: number; endTsMs?: number} => {
  if (!Array.isArray(points) || !points.length) {
    return {};
  }

  let startTsMs = Number.POSITIVE_INFINITY;
  let endTsMs = Number.NEGATIVE_INFINITY;
  for (const p of points) {
    const ts = Number((p as any)?.ts);
    if (!Number.isFinite(ts)) {
      continue;
    }
    if (ts < startTsMs) {
      startTsMs = ts;
    }
    if (ts > endTsMs) {
      endTsMs = ts;
    }
  }

  if (!Number.isFinite(startTsMs) || !Number.isFinite(endTsMs)) {
    return {};
  }

  return {startTsMs, endTsMs};
};

const toIso = (tsMs: number | undefined): string => {
  if (!Number.isFinite(tsMs)) {
    return '';
  }
  try {
    return new Date(tsMs as number).toISOString();
  } catch {
    return '';
  }
};

const PortfolioDebug = ({navigation}: PortfolioDebugScreenProps) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();

  const portfolio = useAppSelector(({PORTFOLIO}) => PORTFOLIO);
  const walletKeys = useAppSelector(({WALLET}) => WALLET?.keys || {});
  const fiatRateSeriesCache = useAppSelector(
    ({RATE}) => RATE?.fiatRateSeriesCache || {},
  );

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isCopyingAudit, setIsCopyingAudit] = useState<boolean>(false);
  const [copyAuditState, setCopyAuditState] = useState<'idle' | 'copied'>(
    'idle',
  );
  const [isCopyingRateDiagnostics, setIsCopyingRateDiagnostics] =
    useState<boolean>(false);
  const [copyRateDiagnosticsState, setCopyRateDiagnosticsState] = useState<
    'idle' | 'copied'
  >('idle');

  const walletIds = useMemo(() => {
    const ids = Object.keys(portfolio.snapshotsByWalletId || {});
    ids.sort();
    return ids;
  }, [portfolio.snapshotsByWalletId]);

  const {walletNameById, allWallets} = useMemo(() => {
    const nameMap: {[walletId: string]: string | undefined} = {};
    const walletMap: {[walletId: string]: Wallet | undefined} = {};
    const all: Wallet[] = [];
    for (const key of Object.values(walletKeys || {}) as any[]) {
      const wallets: Wallet[] = Array.isArray(key?.wallets) ? key.wallets : [];
      for (const w of wallets) {
        all.push(w);
        if (w?.id) {
          nameMap[w.id] = w.walletName;
          walletMap[w.id] = w;
        }
      }
    }
    return {walletNameById: nameMap, walletById: walletMap, allWallets: all};
  }, [walletKeys]);

  const {mainnetWallets, testnetWallets, mainnetWalletsWithZeroBalance} =
    useMemo(() => {
      const mainnet = allWallets.filter(w => w?.network === Network.mainnet);
      const testnet = allWallets.filter(w => w?.network !== Network.mainnet);
      const zero = mainnet.filter(w => {
        const sat = (w as any)?.balance?.sat;
        const crypto = (w as any)?.balance?.crypto;
        if (typeof sat === 'number') {
          return sat === 0;
        }
        if (typeof crypto === 'string') {
          const n = Number(crypto);
          return Number.isFinite(n) ? n === 0 : false;
        }
        return false;
      });
      return {
        mainnetWallets: mainnet,
        testnetWallets: testnet,
        mainnetWalletsWithZeroBalance: zero,
      };
    }, [allWallets]);

  const totalSnapshots = useMemo(() => {
    let count = 0;
    for (const v of Object.values(portfolio.snapshotsByWalletId || {})) {
      count += Array.isArray(v) ? v.length : 0;
    }
    return count;
  }, [portfolio.snapshotsByWalletId]);

  const walletMismatchById = useMemo(() => {
    const map: Record<string, DerivedMismatch> = {};
    for (const walletId of walletIds) {
      const mismatch =
        portfolio.snapshotBalanceMismatchesByWalletId?.[walletId];
      if (mismatch) {
        map[walletId] = {
          deltaUnits: mismatch.delta,
          liveUnits: mismatch.currentWalletBalance,
          snapshotUnits: mismatch.computedUnitsHeld,
        };
      }
    }
    return map;
  }, [portfolio.snapshotBalanceMismatchesByWalletId, walletIds]);

  const totalWalletMismatches = useMemo(
    () => Object.keys(walletMismatchById).length,
    [walletMismatchById],
  );

  const clear = useCallback(() => {
    if (isGenerating) {
      return;
    }
    setIsGenerating(true);

    const task = InteractionManager.runAfterInteractions(() => {
      try {
        dispatch(clearPortfolio());
      } catch (e) {
      } finally {
        setIsGenerating(false);
      }
    });

    return () => task.cancel();
  }, [dispatch, isGenerating]);

  const populate = useCallback(() => {
    if (isGenerating || portfolio.populateStatus?.inProgress) {
      return;
    }

    setIsGenerating(true);

    const task = InteractionManager.runAfterInteractions(async () => {
      try {
        await dispatch(populatePortfolio());
      } catch (e) {
      } finally {
        setIsGenerating(false);
      }
    });

    return () => task.cancel();
  }, [dispatch, isGenerating, portfolio.populateStatus?.inProgress]);

  const clearRatesCache = useCallback(() => {
    if (isGenerating || portfolio.populateStatus?.inProgress) {
      return;
    }

    const task = InteractionManager.runAfterInteractions(() => {
      try {
        dispatch(clearRateState());
      } catch {}
    });

    return () => task.cancel();
  }, [dispatch, isGenerating, portfolio.populateStatus?.inProgress]);

  const copySnapshotAuditCsv = useCallback(() => {
    if (isCopyingAudit) {
      return;
    }

    setIsCopyingAudit(true);

    const task = InteractionManager.runAfterInteractions(() => {
      try {
        const wallets = [...(allWallets || [])].filter((w: any) => !!w?.id);
        wallets.sort((a: any, b: any) =>
          String(a.id).localeCompare(String(b.id)),
        );

        const headers = [
          'walletId',
          'walletName',
          'keyId',
          'chain',
          'coin',
          'tokenAddress',
          'network',
          'hidden',
          'balance.crypto',
          'balance.sat',
          'snapshots',
          'txSnapshots',
          'dailySnapshots',
          'dailyTxIdsTotal',
          'duplicateSnapshotIds',
          'firstSnapshotTs',
          'lastSnapshotTs',
        ];

        const rows = wallets.map((w: any) => {
          const walletId = String(w.id);
          const name = walletNameById[walletId] || w.walletName || '';
          const snapsRaw = (portfolio.snapshotsByWalletId || {})[walletId];
          const snaps: BalanceSnapshot[] = Array.isArray(snapsRaw)
            ? (snapsRaw as BalanceSnapshot[])
            : [];
          const total = snaps.length;
          const txCount = snaps.filter(
            s => (s as any)?.eventType === 'tx',
          ).length;
          const dailyCount = total - txCount;
          const dailyTxIdsTotal = snaps.reduce((sum, s: any) => {
            const txIds = s?.txIds;
            return sum + (Array.isArray(txIds) ? txIds.length : 0);
          }, 0);
          const uniqueIds = new Set(
            snaps.map(s => String((s as any)?.id || '')),
          ).size;
          const dupIds = total - uniqueIds;
          const firstTs = total ? (snaps[0] as any)?.timestamp ?? '' : '';
          const lastTs = total
            ? (snaps[total - 1] as any)?.timestamp ?? ''
            : '';

          return [
            walletId,
            name,
            w.keyId || '',
            w.chain || '',
            w.currencyAbbreviation || '',
            w.tokenAddress || '',
            w.network || '',
            w.hideWallet ? 'yes' : '',
            w.balance?.crypto ?? '',
            typeof w.balance?.sat === 'number' ? w.balance.sat : '',
            total,
            txCount,
            dailyCount,
            dailyTxIdsTotal,
            dupIds,
            firstTs,
            lastTs,
          ]
            .map(csvEscape)
            .join(',');
        });

        const csv = [headers.join(','), ...rows].join('\n');
        Clipboard.setString(csv);
        setCopyAuditState('copied');
        setTimeout(() => setCopyAuditState('idle'), 1500);
      } finally {
        setIsCopyingAudit(false);
      }
    });

    return () => task.cancel();
  }, [
    allWallets,
    isCopyingAudit,
    portfolio.snapshotsByWalletId,
    walletNameById,
  ]);

  const copyRateDiagnosticsCsv = useCallback(() => {
    if (isCopyingRateDiagnostics) {
      return;
    }

    setIsCopyingRateDiagnostics(true);

    const task = InteractionManager.runAfterInteractions(() => {
      try {
        const intervalOrder: Record<string, number> = {
          '1D': 1,
          '1W': 2,
          '1M': 3,
          '3M': 4,
          '1Y': 5,
          '5Y': 6,
          ALL: 7,
        };

        const defaultIntervals = ['1D', '1W', '1M', '3M', '1Y', '5Y', 'ALL'];
        const discoveredIntervals = new Set<string>();
        const byPair = new Map<
          string,
          {
            fiatCode: string;
            coin: string;
            byInterval: Map<string, any>;
          }
        >();

        for (const [cacheKey, series] of Object.entries(
          fiatRateSeriesCache || {},
        )) {
          const parsed = parseFiatRateSeriesCacheKey(cacheKey);
          if (!parsed) {
            continue;
          }
          discoveredIntervals.add(parsed.interval);
          const pairKey = `${parsed.fiatCode}:${parsed.coin}`;
          let pair = byPair.get(pairKey);
          if (!pair) {
            pair = {
              fiatCode: parsed.fiatCode,
              coin: parsed.coin,
              byInterval: new Map<string, any>(),
            };
            byPair.set(pairKey, pair);
          }
          pair.byInterval.set(parsed.interval, series);
        }

        const intervals = Array.from(
          new Set([...defaultIntervals, ...Array.from(discoveredIntervals)]),
        ).sort((a, b) => {
          const ia = intervalOrder[a] ?? Number.MAX_SAFE_INTEGER;
          const ib = intervalOrder[b] ?? Number.MAX_SAFE_INTEGER;
          if (ia !== ib) {
            return ia - ib;
          }
          return a.localeCompare(b);
        });

        const headers = ['fiatCode', 'coin'];
        for (const interval of intervals) {
          headers.push(`${interval}_ratesStored`);
          headers.push(`${interval}_startTsMs`);
          headers.push(`${interval}_endTsMs`);
          headers.push(`${interval}_startIso`);
          headers.push(`${interval}_endIso`);
        }

        const sortedPairs = Array.from(byPair.values()).sort((a, b) => {
          const fiatCmp = a.fiatCode.localeCompare(b.fiatCode);
          if (fiatCmp !== 0) {
            return fiatCmp;
          }
          return a.coin.localeCompare(b.coin);
        });

        const csvRows = sortedPairs.map(pair => {
          const row: Array<string | number> = [pair.fiatCode, pair.coin];
          for (const interval of intervals) {
            const series = pair.byInterval.get(interval);
            const points = Array.isArray(series?.points)
              ? (series.points as FiatRatePoint[])
              : [];
            const {startTsMs, endTsMs} = getFiniteTsBounds(points);
            row.push(points.length);
            row.push(startTsMs ?? '');
            row.push(endTsMs ?? '');
            row.push(toIso(startTsMs));
            row.push(toIso(endTsMs));
          }
          return row.map(csvEscape).join(',');
        });

        const csv = [headers.join(','), ...csvRows].join('\n');
        Clipboard.setString(csv);
        setCopyRateDiagnosticsState('copied');
        setTimeout(() => setCopyRateDiagnosticsState('idle'), 1500);
      } finally {
        setIsCopyingRateDiagnostics(false);
      }
    });

    return () => task.cancel();
  }, [fiatRateSeriesCache, isCopyingRateDiagnostics]);

  return (
    <DebugScreenContainer>
      <DebugHeaderContainer>
        <DebugHeaderText>
          {t('Wallets')} (with snapshots): {walletIds.length} | {t('Snapshots')}
          : {totalSnapshots}
        </DebugHeaderText>
        <DebugHeaderText>
          {t('Mainnet Wallets')}: {mainnetWallets.length} |{' '}
          {t('Testnet Wallets')}: {testnetWallets.length} |{' '}
          {t('Mainnet Zero-Balance Wallets')}:{' '}
          {mainnetWalletsWithZeroBalance.length}
        </DebugHeaderText>
        <DebugHeaderText>
          inProgress: {portfolio.populateStatus?.inProgress ? 'yes' : 'no'} |{' '}
          walletsCompleted: {portfolio.populateStatus?.walletsCompleted ?? 0}/
          {portfolio.populateStatus?.walletsTotal ?? 0} | txsProcessed:{' '}
          {portfolio.populateStatus?.txsProcessed ?? 0} | errors:{' '}
          {portfolio.populateStatus?.errors?.length ?? 0} | mismatches:{' '}
          {totalWalletMismatches}
        </DebugHeaderText>

        <DebugButtonRow>
          <DebugPillButton onPress={() => (isGenerating ? null : clear())}>
            <DebugPillButtonText>
              {t('Clear Portfolio Store')}
            </DebugPillButtonText>
          </DebugPillButton>
          <DebugButtonSpacer />
          <DebugPillButton
            onPress={() => (isGenerating ? null : populate())}
            selected={portfolio.populateStatus?.inProgress}>
            <DebugPillButtonText
              selected={portfolio.populateStatus?.inProgress}>
              {t('Populate Portfolio Store')}
            </DebugPillButtonText>
          </DebugPillButton>
          <DebugButtonSpacer />
          <DebugPillButton
            onPress={() => (isGenerating ? null : clearRatesCache())}>
            <DebugPillButtonText>{t('Clear Rates Cache')}</DebugPillButtonText>
          </DebugPillButton>
        </DebugButtonRow>

        <DebugButtonRow>
          <DebugPillButton
            onPress={() => (isCopyingAudit ? null : copySnapshotAuditCsv())}
            selected={copyAuditState === 'copied'}>
            <DebugPillButtonText selected={copyAuditState === 'copied'}>
              {copyAuditState === 'copied'
                ? 'Copied Snapshot Audit CSV'
                : 'Copy Snapshot Audit CSV'}
            </DebugPillButtonText>
          </DebugPillButton>
          <DebugButtonSpacer />
          <DebugPillButton
            onPress={() =>
              isCopyingRateDiagnostics ? null : copyRateDiagnosticsCsv()
            }
            selected={copyRateDiagnosticsState === 'copied'}>
            <DebugPillButtonText
              selected={copyRateDiagnosticsState === 'copied'}>
              {copyRateDiagnosticsState === 'copied'
                ? 'Copied Rate Diagnostics CSV'
                : 'Copy Rate Diagnostics'}
            </DebugPillButtonText>
          </DebugPillButton>
        </DebugButtonRow>
      </DebugHeaderContainer>

      <ScrollView style={{flex: 1}} contentContainerStyle={{paddingBottom: 40}}>
        {walletIds.map(walletId => {
          const snapshots = portfolio.snapshotsByWalletId?.[walletId];
          const count = snapshots?.length ?? 0;
          const walletName = walletNameById[walletId];
          const mismatch = walletMismatchById[walletId];
          return (
            <WalletRow
              key={walletId}
              onPress={() =>
                navigation.navigate(AboutScreens.PORTFOLIO_WALLET_DEBUG, {
                  walletId,
                })
              }>
              <WalletRowTitle>
                {(walletName || walletId).trim()} ({count})
              </WalletRowTitle>
              {walletName ? (
                <WalletRowSubTitle>{walletId}</WalletRowSubTitle>
              ) : null}
              {mismatch ? (
                <WalletRowMismatchText>
                  mismatch delta: {mismatch.deltaUnits}
                </WalletRowMismatchText>
              ) : null}
            </WalletRow>
          );
        })}
      </ScrollView>
    </DebugScreenContainer>
  );
};

export default PortfolioDebug;
