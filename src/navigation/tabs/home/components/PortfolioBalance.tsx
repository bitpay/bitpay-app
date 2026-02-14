import React, {useEffect, useMemo, useState} from 'react';
import styled from 'styled-components/native';
import {BaseText, H2} from '../../../../components/styled/Text';
import {SlateDark, White} from '../../../../styles/colors';
import {useSelector} from 'react-redux';
import {RootState} from '../../../../store';
import {
  calculatePercentageDifference,
  formatFiatAmount,
} from '../../../../utils/helper-methods';
import InfoSvg from './InfoSvg';
import {ActiveOpacity} from '../../../../components/styled/Containers';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {
  showBottomNotificationModal,
  toggleHideAllBalances,
} from '../../../../store/app/app.actions';
import Percentage from '../../../../components/percentage/Percentage';
import {COINBASE_ENV} from '../../../../api/coinbase/coinbase.constants';
import {useTranslation} from 'react-i18next';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {maskIfHidden} from '../../../../utils/hideBalances';
import {
  getPercentageDifferenceFromPercentRatio,
  getPortfolioPnlChangeForTimeframeFromPortfolioSnapshots,
  getQuoteCurrency,
  getVisibleKeysFromKeys,
  getVisibleWalletsFromKeys,
  hasSnapshotsBeforeMsForWallets,
  hasSnapshotsForWallets,
  walletHasNonZeroLiveBalance,
} from '../../../../utils/portfolio/assets';
import type {Wallet} from '../../../../store/wallet/wallet.models';

const PortfolioContainer = styled.View`
  justify-content: center;
  align-items: center;
`;

const PortfolioBalanceHeader = styled(TouchableOpacity)`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const PortfolioBalanceTitle = styled(BaseText)`
  margin-right: 3px;
  font-size: 13px;
  line-height: 18px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const PortfolioBalanceText = styled(BaseText)`
  font-weight: bold;
  font-size: 31px;
  line-height: 40px;
  color: ${({theme}) => theme.colors.text};
  margin: 2px 0;
`;

const PercentageWrapper = styled.View`
  align-items: center;
`;

const HiddenBalance = styled(H2)`
  line-height: 50px;
  margin: 6px 0;
`;

const PortfolioBalance = () => {
  const {t} = useTranslation();
  const coinbaseBalance =
    useAppSelector(({COINBASE}) => COINBASE.balance[COINBASE_ENV]) || 0.0;

  const keys = useSelector(({WALLET}: RootState) => WALLET.keys);
  const portfolio = useSelector(({PORTFOLIO}: RootState) => PORTFOLIO);
  const {rates, lastDayRates, fiatRateSeriesCache} = useSelector(
    ({RATE}: RootState) => RATE,
  );

  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const hideAllBalances = useAppSelector(({APP}) => APP.hideAllBalances);
  const homeCarouselConfig = useAppSelector(({APP}) => APP.homeCarouselConfig);

  const visibleKeys = useMemo(
    () => getVisibleKeysFromKeys(keys, homeCarouselConfig),
    [homeCarouselConfig, keys],
  );

  const visibleCurrentBalance = useMemo(
    () =>
      visibleKeys.reduce((total, key) => total + (key.totalBalance || 0), 0),
    [visibleKeys],
  );

  const visibleLastDayBalance = useMemo(
    () =>
      visibleKeys.reduce(
        (total, key) => total + (key.totalBalanceLastDay || 0),
        0,
      ),
    [visibleKeys],
  );

  const totalBalance: number = visibleCurrentBalance + coinbaseBalance;

  const dispatch = useAppDispatch();

  const walletsAcrossKeys: Wallet[] = useMemo(() => {
    const allWallets = getVisibleWalletsFromKeys(keys, homeCarouselConfig);

    const byId = new Map<string, Wallet>();
    for (const w of allWallets) {
      if (!w?.id) {
        continue;
      }
      if (!walletHasNonZeroLiveBalance(w)) {
        continue;
      }
      if (!byId.has(w.id)) {
        byId.set(w.id, w);
      }
    }
    return Array.from(byId.values());
  }, [homeCarouselConfig, keys]);

  const legacyPercentageDifference = calculatePercentageDifference(
    visibleCurrentBalance,
    visibleLastDayBalance,
  );

  const hasSnapshots = hasSnapshotsForWallets({
    snapshotsByWalletId: portfolio?.snapshotsByWalletId || {},
    wallets: walletsAcrossKeys,
  });
  const isPopulateInProgress = !!portfolio?.populateStatus?.inProgress;
  const hasSnapshotsBeforePopulateStarted = useMemo(() => {
    const startedAt = portfolio?.populateStatus?.startedAt;
    if (!isPopulateInProgress || typeof startedAt !== 'number') {
      return true;
    }

    return hasSnapshotsBeforeMsForWallets({
      snapshotsByWalletId: portfolio?.snapshotsByWalletId || {},
      wallets: walletsAcrossKeys,
      cutoffMs: startedAt,
    });
  }, [
    isPopulateInProgress,
    portfolio?.populateStatus?.startedAt,
    portfolio?.snapshotsByWalletId,
    walletsAcrossKeys,
  ]);
  const quoteCurrency = getQuoteCurrency({
    portfolioQuoteCurrency: portfolio?.quoteCurrency,
    defaultAltCurrencyIsoCode: defaultAltCurrency?.isoCode,
  });

  const portfolioPnlPercentageDifference = useMemo(() => {
    if (!hasSnapshots) {
      return null;
    }

    const pnl = getPortfolioPnlChangeForTimeframeFromPortfolioSnapshots({
      snapshotsByWalletId: portfolio?.snapshotsByWalletId || {},
      wallets: walletsAcrossKeys,
      quoteCurrency,
      timeframe: '1D',
      rates,
      lastDayRates,
      fiatRateSeriesCache,
    });

    if (!pnl.available) {
      return null;
    }

    return getPercentageDifferenceFromPercentRatio(pnl.percentRatio);
  }, [
    fiatRateSeriesCache,
    hasSnapshots,
    lastDayRates,
    quoteCurrency,
    portfolio?.snapshotsByWalletId,
    rates,
    walletsAcrossKeys,
  ]);

  const [
    committedSnapshotPercentageDifference,
    setCommittedSnapshotPercentage,
  ] = useState<number | null>(null);

  useEffect(() => {
    if (!isPopulateInProgress) {
      if (!hasSnapshots) {
        setCommittedSnapshotPercentage(null);
        return;
      }

      if (portfolioPnlPercentageDifference !== null) {
        setCommittedSnapshotPercentage(portfolioPnlPercentageDifference);
      }
      return;
    }

    if (
      committedSnapshotPercentageDifference === null &&
      hasSnapshotsBeforePopulateStarted &&
      portfolioPnlPercentageDifference !== null
    ) {
      setCommittedSnapshotPercentage(portfolioPnlPercentageDifference);
    }
  }, [
    committedSnapshotPercentageDifference,
    hasSnapshots,
    hasSnapshotsBeforePopulateStarted,
    isPopulateInProgress,
    portfolioPnlPercentageDifference,
  ]);

  const percentageDifference = useMemo(() => {
    if (!hasSnapshots) {
      return legacyPercentageDifference;
    }

    if (isPopulateInProgress) {
      if (!hasSnapshotsBeforePopulateStarted) {
        return legacyPercentageDifference;
      }

      if (committedSnapshotPercentageDifference !== null) {
        return committedSnapshotPercentageDifference;
      }
    }

    if (portfolioPnlPercentageDifference !== null) {
      return portfolioPnlPercentageDifference;
    }

    return legacyPercentageDifference;
  }, [
    committedSnapshotPercentageDifference,
    hasSnapshots,
    hasSnapshotsBeforePopulateStarted,
    isPopulateInProgress,
    legacyPercentageDifference,
    portfolioPnlPercentageDifference,
  ]);

  const showPortfolioBalanceInfoModal = () => {
    dispatch(
      showBottomNotificationModal({
        type: 'info',
        title: t('Portfolio balance'),
        message: t(
          'Your Portfolio Balance is the total of all your crypto assets.',
        ),
        enableBackdropDismiss: true,
        actions: [
          {
            text: t('GOT IT'),
            action: () => null,
            primary: true,
          },
        ],
      }),
    );
  };

  return (
    <PortfolioContainer>
      <PortfolioBalanceHeader
        activeOpacity={ActiveOpacity}
        onPress={showPortfolioBalanceInfoModal}>
        <PortfolioBalanceTitle>{t('Portfolio Balance')}</PortfolioBalanceTitle>
        <InfoSvg width={16} height={16} />
      </PortfolioBalanceHeader>
      <TouchableOpacity
        onLongPress={() => {
          dispatch(toggleHideAllBalances());
        }}>
        {!hideAllBalances ? (
          <>
            <PortfolioBalanceText>
              {formatFiatAmount(totalBalance, defaultAltCurrency.isoCode, {
                currencyDisplay: 'symbol',
              })}
            </PortfolioBalanceText>
            {percentageDifference || percentageDifference === 0 ? (
              <PercentageWrapper>
                <Percentage
                  percentageDifference={percentageDifference}
                  hideArrow
                  rangeLabel={t('Last Day')}
                />
              </PercentageWrapper>
            ) : null}
          </>
        ) : (
          <HiddenBalance>{maskIfHidden(true, totalBalance)}</HiddenBalance>
        )}
      </TouchableOpacity>
    </PortfolioContainer>
  );
};

export default PortfolioBalance;
