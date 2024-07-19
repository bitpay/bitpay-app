import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import React, {useCallback, useEffect, useLayoutEffect, useState} from 'react';
import {ActivityIndicator, Platform} from 'react-native';
import styled, {useTheme} from 'styled-components/native';
import Button from '../../../components/button/Button';
import {CtaContainer, WIDTH} from '../../../components/styled/Containers';
import {Badge, H2, H5, HeaderTitle} from '../../../components/styled/Text';
import {
  SlateDark,
  White,
  Black,
  LuckySevens,
  ProgressBlue,
} from '../../../styles/colors';
import {
  calculatePercentageDifference,
  formatFiatAmount,
  sleep,
} from '../../../utils/helper-methods';
import RangeDateSelector from '../components/RangeDateSelector';
import {WalletScreens, WalletGroupParamList} from '../WalletGroup';
import {BitpaySupportedCoins} from '../../../constants/currencies';
import {ExchangeRateItemProps} from '../../tabs/home/components/exchange-rates/ExchangeRatesList';
import {fetchHistoricalRates} from '../../../store/wallet/effects';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {BottomNotificationConfig} from '../../../components/modal/bottom-notification/BottomNotification';
import {CustomErrorMessage} from '../components/ErrorMessages';
import {BWCErrorMessage} from '../../../constants/BWCError';
import {DateRanges, Rate} from '../../../store/rate/rate.models';
import GainArrow from '../../../../assets/img/home/exchange-rates/increment-arrow.svg';
import LossArrow from '../../../../assets/img/home/exchange-rates/decrement-arrow.svg';
import NeutralArrow from '../../../../assets/img/home/exchange-rates/flat-arrow.svg';
import {CurrencyImage} from '../../../components/currency-image/CurrencyImage';
import {useRequireKeyAndWalletRedirect} from '../../../utils/hooks/useRequireKeyAndWalletRedirect';
import {useTranslation} from 'react-i18next';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {GraphPoint, LineGraph} from 'react-native-graph';
import haptic from '../../../components/haptic-feedback/haptic';

export type PriceChartsParamList = {
  item: ExchangeRateItemProps;
};

interface ChartDisplayDataType {
  date: Date;
  value: number;
}
interface ChartDataType {
  data: ChartDisplayDataType[];
  percentChange: number;
  priceChange: number;
}

const defaultDisplayData: ChartDataType = {
  data: [],
  percentChange: 0,
  priceChange: 0,
};

const defaultCachedRates: {
  [key in DateRanges]: ChartDataType;
} = {
  [DateRanges.Day]: {data: [], percentChange: 0, priceChange: 0},
  [DateRanges.Week]: {data: [], percentChange: 0, priceChange: 0},
  [DateRanges.Month]: {data: [], percentChange: 0, priceChange: 0},
};

const rateFetchPromises: {
  [key in DateRanges]: Promise<Rate[]> | undefined;
} = {
  [DateRanges.Day]: undefined,
  [DateRanges.Week]: undefined,
  [DateRanges.Month]: undefined,
};

const SafeAreaView = styled.SafeAreaView`
  flex: 1;
`;

const HeaderContainer = styled.View`
  flex: 0 0 auto;
  margin-left: 16px;
  margin-top: 40px;
`;

const PriceChartContainer = styled.View`
  flex: 1 1 auto;
  margin-top: 0px;
`;

const RangeDateSelectorContainer = styled.View`
  margin-bottom: 33px;
`;

const CurrencyAverageText = styled(H5)`
  color: ${({theme}) => (theme.dark ? LuckySevens : SlateDark)};
`;

const RowContainer = styled.View`
  align-items: center;
  flex-direction: row;
`;

const LoadingContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const scaleDownArray = (
  array: ChartDisplayDataType[],
  targetLength: number,
): ChartDisplayDataType[] => {
  if (array.length === targetLength || !array.length) {
    return array;
  }
  const desiredLength = targetLength || 1;
  const result = [];
  const step = array.length / desiredLength;
  for (let i = 0; i < desiredLength; i++) {
    result.push(array[Math.floor(step * i)]);
  }
  return result;
};

const showLossGainOrNeutralArrow = (percentChange: number | undefined) => {
  if (percentChange === undefined) {
    return;
  }

  if (percentChange > 0) {
    return <GainArrow style={{marginRight: 5}} width={20} height={20} />;
  } else if (percentChange < 0) {
    return <LossArrow style={{marginRight: 5}} width={20} height={20} />;
  } else {
    return <NeutralArrow style={{marginRight: 5}} width={20} height={20} />;
  }
};

const getFormattedData = (
  rates: Array<Rate>,
  targetLength: number,
): ChartDataType => {
  let data = rates;
  const percentChange = calculatePercentageDifference(
    rates[rates.length - 1].rate,
    rates[0].rate,
  );
  const scaledData = scaleDownArray(
    data.map(value => ({
      date: new Date(value.ts),
      value: value.rate,
    })),
    targetLength,
  );
  return {
    data: scaledData,
    percentChange,
    priceChange: data[data.length - 1].rate - data[0].rate,
  };
};

const PriceChartHeader = ({currencyName, currencyAbbreviation, img}: any) => {
  return (
    <RowContainer>
      <CurrencyImage img={img} size={20} />
      <HeaderTitle style={{paddingLeft: 4, paddingRight: 8}}>
        {currencyName}
      </HeaderTitle>
      <Badge>{currencyAbbreviation.toUpperCase()}</Badge>
    </RowContainer>
  );
};

const PriceCharts = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const {
    params: {item},
  } = useRoute<RouteProp<WalletGroupParamList, 'PriceCharts'>>();
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);

  const {
    currencyName,
    chain,
    currentPrice,
    average: percentChange,
    currencyAbbreviation,
    img,
  } = item;

  const {coinColor, gradientBackgroundColor} =
    BitpaySupportedCoins[chain.toLowerCase()].theme!;

  const buttonLabel =
    t('Buy ') +
    (currencyAbbreviation === 'matic'
      ? currencyAbbreviation.charAt(0).toUpperCase() +
        currencyAbbreviation.slice(1)
      : currencyName);

  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      // eslint-disable-next-line react/no-unstable-nested-components
      headerTitle: () => (
        <PriceChartHeader
          currencyName={currencyName}
          currencyAbbreviation={currencyAbbreviation}
          img={img}
        />
      ),
    });
  }, [navigation, currencyName, currencyAbbreviation, img]);

  const [loading, setLoading] = useState(true);
  const [showRageDateSelector, setShowRageDateSelector] = useState(true);
  const [displayData, setDisplayData] = useState(defaultDisplayData);
  const [cachedRates, setCachedRates] = useState(defaultCachedRates);
  const [chartRowHeight, setChartRowHeight] = useState(-1);
  const [selectedPoint, setSelectedPoint] = useState(
    undefined as
      | {price: number; priceChange: number; percentChange: number}
      | undefined,
  );

  const showErrorMessage = useCallback(
    async (msg: BottomNotificationConfig) => {
      await sleep(500);
      dispatch(showBottomNotificationModal(msg));
    },
    [dispatch],
  );

  const getHistoricalFiatRates = async (
    dateRange: DateRanges,
    targetLength?: number,
  ) => {
    const maxPoints = 45; // If this is too large, animations stop working.
    try {
      const historicFiatRates = await rateFetchPromises[dateRange]!;
      const formattedRates = getFormattedData(
        historicFiatRates.sort((a, b) => a.ts - b.ts),
        maxPoints || targetLength || historicFiatRates.length,
      );
      setCachedRates(previous => ({
        ...previous,
        [dateRange]: formattedRates,
      }));
      return formattedRates;
    } catch (e) {
      throw e;
    }
  };

  const fillRateCache = async () => {
    [DateRanges.Day, DateRanges.Month, DateRanges.Week].forEach(dateRange =>
      fetchRates(dateRange),
    );
    const dayRates = await rateFetchPromises[DateRanges.Day]!;
    const targetLength = dayRates?.length;
    [DateRanges.Day, DateRanges.Month, DateRanges.Week].forEach(
      async dateRange => {
        getHistoricalFiatRates(dateRange, targetLength);
      },
    );
  };

  const fetchRates = async (dateRange: DateRanges) => {
    rateFetchPromises[dateRange] = dispatch(
      fetchHistoricalRates(dateRange, currencyAbbreviation),
    );
    const rates = await rateFetchPromises[dateRange];
    return rates;
  };

  const redrawChart = async (dateRange: DateRanges) => {
    if (cachedRates[dateRange].data.length) {
      setDisplayData(cachedRates[dateRange]);
    } else {
      try {
        const rates = await getHistoricalFiatRates(dateRange);
        setDisplayData(rates);
        setLoading(false);
      } catch (e) {
        dispatch(dismissOnGoingProcessModal());
        await sleep(500);
        setShowRageDateSelector(false);
        await showErrorMessage(
          CustomErrorMessage({
            errMsg: BWCErrorMessage(e),
            title: t('Uh oh, something went wrong'),
          }),
        );
      }
    }
  };

  const goToBuyCrypto = useRequireKeyAndWalletRedirect(() => {
    dispatch(
      Analytics.track('Clicked Buy Crypto', {
        context: 'PriceChart',
        coin: currencyAbbreviation || '',
        chain: chain || '',
      }),
    );
    navigation.navigate(WalletScreens.AMOUNT, {
      onAmountSelected: async (amount: string) => {
        navigation.navigate('BuyCryptoRoot', {
          amount: Number(amount),
          currencyAbbreviation,
          chain,
        });
      },
      context: 'buyCrypto',
    });
  });

  useEffect(() => {
    fillRateCache();
    const defaultDateRange = DateRanges.Day;
    redrawChart(defaultDateRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointSelected = useCallback(
    (p: GraphPoint) => {
      const percentChangeAtPoint = calculatePercentageDifference(
        p.value,
        displayData.data[0].value,
      );
      setSelectedPoint({
        price: p.value,
        priceChange: p.value - displayData.data[0].value,
        percentChange: percentChangeAtPoint,
      });
      haptic('impactLight');
    },
    [displayData.data],
  );

  const onGestureEnd = useCallback(async () => {
    await sleep(10);
    setSelectedPoint(undefined);
    haptic('impactLight');
  }, []);

  const onGestureStarted = useCallback(() => {
    haptic('impactLight');
  }, []);

  const getPercentChange = () => {
    if (loading) {
      return percentChange!;
    }
    return selectedPoint?.percentChange ?? displayData.percentChange;
  };

  return (
    <SafeAreaView>
      <HeaderContainer>
        {currentPrice ? (
          <H2>
            {formatFiatAmount(
              selectedPoint?.price ?? currentPrice,
              defaultAltCurrency.isoCode,
              {
                customPrecision: 'minimal',
                currencyAbbreviation,
              },
            )}
          </H2>
        ) : null}
        <RowContainer>
          {showLossGainOrNeutralArrow(getPercentChange())}
          <CurrencyAverageText>
            {selectedPoint?.priceChange ?? displayData.priceChange
              ? formatFiatAmount(
                  selectedPoint?.priceChange ?? displayData.priceChange ?? 0,
                  defaultAltCurrency.isoCode,
                  {customPrecision: 'minimal', currencyAbbreviation},
                )
              : ''}
            <>
              {percentChange ? (
                <>
                  {!loading ? ' (' : ''}
                  {Math.abs(getPercentChange())}%{!loading ? ')' : ''}
                </>
              ) : null}
            </>
          </CurrencyAverageText>
        </RowContainer>
      </HeaderContainer>

      <PriceChartContainer
        onLayout={e => {
          setChartRowHeight(e.nativeEvent.layout.height);
        }}>
        {!loading && chartRowHeight > 0 ? (
          <LineGraph
            points={displayData.data}
            animated={true}
            gradientFillColors={[
              gradientBackgroundColor,
              theme.dark ? 'transparent' : White,
            ]}
            enablePanGesture={true}
            panGestureDelay={100}
            onGestureStart={onGestureStarted}
            onPointSelected={onPointSelected}
            onGestureEnd={onGestureEnd}
            color={theme.dark && coinColor === Black ? White : coinColor}
            style={{width: WIDTH, height: chartRowHeight, marginTop: 20}}
          />
        ) : (
          <LoadingContainer>
            <ActivityIndicator color={ProgressBlue} />
          </LoadingContainer>
        )}
      </PriceChartContainer>

      <CtaContainer
        style={{
          flexGrow: 0,
          flexShrink: 0,
          flexBasis: 'auto',
          marginBottom: Platform.OS === 'ios' ? 40 : 5,
        }}>
        {showRageDateSelector ? (
          <RangeDateSelectorContainer>
            <RangeDateSelector onPress={redrawChart} />
          </RangeDateSelectorContainer>
        ) : null}
        <Button onPress={goToBuyCrypto} buttonStyle={'primary'}>
          {buttonLabel}
        </Button>
      </CtaContainer>
    </SafeAreaView>
  );
};

export default PriceCharts;
