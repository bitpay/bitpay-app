import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {ActivityIndicator, Platform} from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import styled, {useTheme} from 'styled-components/native';
import Button from '../../../components/button/Button';
import {CtaContainer, WIDTH} from '../../../components/styled/Containers';
import {
  Badge,
  BaseText,
  H2,
  H5,
  HeaderTitle,
} from '../../../components/styled/Text';
import {
  SlateDark,
  White,
  Black,
  LuckySevens,
  ProgressBlue,
  LightBlack,
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
import {useAppDispatch, useAppSelector, useLogger} from '../../../utils/hooks';
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
import {gestureHandlerRootHOC} from 'react-native-gesture-handler';
import {findIndex, maxBy, minBy} from 'lodash';
import Animated, {
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import moment from 'moment';
import ArchaxFooter from '../../../components/archax/archax-footer';

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
  maxIndex?: number;
  maxPoint?: ChartDisplayDataType;
  minIndex?: number;
  minPoint?: ChartDisplayDataType;
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
  margin-top: 0;
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

  const maxPoint = maxBy(scaledData, point => point.value);
  const minPoint = minBy(scaledData, point => point.value);
  const maxIndex = findIndex(scaledData, maxPoint);
  const minIndex = findIndex(scaledData, minPoint);
  return {
    data: scaledData,
    maxIndex,
    maxPoint,
    minIndex,
    minPoint,
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

export const AxisLabel = ({
  value,
  index,
  prevIndex,
  arrayLength,
  currencyAbbreviation,
  type,
}: {
  value: number;
  index: number;
  prevIndex?: number;
  arrayLength: number;
  currencyAbbreviation: string;
  type: 'min' | 'max';
}): JSX.Element => {
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const theme = useTheme();
  const [textWidth, setTextWidth] = useState(50);
  const prevLocation =
    ((prevIndex ?? index) / arrayLength) * WIDTH - textWidth / 2;
  const location = (index / arrayLength) * WIDTH - textWidth / 2;
  const getTranslateX = (loc: number) => {
    const minLocation = 5;
    const maxLocation = WIDTH - textWidth;
    return Math.min(Math.max(loc, minLocation), maxLocation);
  };
  const prevTranslateX = getTranslateX(prevLocation);
  const newTranslateX = getTranslateX(location);
  const translateX = useSharedValue(prevTranslateX);
  translateX.value = withSpring(newTranslateX, {
    mass: 1,
    stiffness: 500,
    damping: 400,
    velocity: 0,
  });
  const translateY = type === 'min' ? 5 : -5;
  const opacity = useSharedValue(typeof prevIndex !== 'undefined' ? 1 : 0);
  opacity.value = withTiming(1, {duration: 800});
  return (
    <Animated.View
      style={{
        flexDirection: 'row',
        transform: [{translateY}],
        opacity,
      }}>
      <Animated.View
        style={{transform: [{translateX}]}}
        onLayout={event => setTextWidth(event.nativeEvent.layout.width)}>
        <BaseText
          style={{
            color: theme.dark ? LuckySevens : SlateDark,
            fontWeight: '500',
            fontSize: 13,
          }}>
          {formatFiatAmount(value, defaultAltCurrency.isoCode, {
            currencyAbbreviation,
          })}
        </BaseText>
      </Animated.View>
    </Animated.View>
  );
};

const PriceCharts = () => {
  const {t} = useTranslation();
  const showArchaxBanner = useAppSelector(({APP}) => APP.showArchaxBanner);
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const logger = useLogger();
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
    (currencyAbbreviation === 'pol'
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
  const [prevDisplayData, setPrevDisplayData] = useState(defaultDisplayData);
  const [cachedRates, setCachedRates] = useState(defaultCachedRates);
  const [chartRowHeight, setChartRowHeight] = useState(-1);
  const gestureStarted = useRef(false);
  const [selectedPoint, setSelectedPoint] = useState(
    undefined as
      | {
          date: Date;
          price: number;
          priceChange: number;
          percentChange: number;
        }
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
      const historicFiatRates: Rate[] | undefined = await rateFetchPromises[
        dateRange
      ];
      if (!historicFiatRates || !historicFiatRates[0]?.ts) {
        logger.debug('[PriceCharts] No historicFiatRates. Throwing error');
        throw new Error(
          t('We were not able to obtain the rates at this moment.'),
        );
      }
      const formattedRates = getFormattedData(
        historicFiatRates.sort((a, b) => a.ts - b.ts),
        Math.min(maxPoints, targetLength || historicFiatRates.length),
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
    const dayRates = await rateFetchPromises[DateRanges.Day];
    const targetLength = dayRates?.length;
    [DateRanges.Day, DateRanges.Month, DateRanges.Week].forEach(
      async dateRange => {
        getHistoricalFiatRates(dateRange, targetLength);
      },
    );
  };

  const fetchRates = async (dateRange: DateRanges) => {
    rateFetchPromises[dateRange] = dispatch(
      fetchHistoricalRates(
        dateRange,
        currencyAbbreviation,
        defaultAltCurrency.isoCode,
      ),
    );
    const rates = await rateFetchPromises[dateRange];
    return rates;
  };

  const setNewDisplayData = (data: ChartDataType) => {
    setPrevDisplayData(displayData);
    setDisplayData(data);
  };

  const redrawChart = async (dateRange: DateRanges) => {
    if (cachedRates[dateRange]?.data?.length) {
      logger.debug('[PriceCharts] Loading cached rates');
      setNewDisplayData(cachedRates[dateRange]);
    } else {
      try {
        const rates = await getHistoricalFiatRates(dateRange);
        setNewDisplayData(rates);
        setLoading(false);
      } catch (e) {
        dispatch(dismissOnGoingProcessModal());
        await sleep(500);
        setShowRageDateSelector(false);
        const err = BWCErrorMessage(e);
        logger.debug(`[PriceCharts] redrawChart Error: ${err}`);
        await showErrorMessage(
          CustomErrorMessage({
            errMsg: err,
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
      if (!gestureStarted.current) {
        return;
      }
      const percentChangeAtPoint = calculatePercentageDifference(
        p.value,
        displayData.data[0].value,
      );
      setSelectedPoint({
        date: p.date,
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
    gestureStarted.current = false;
    setSelectedPoint(undefined);
    haptic('impactLight');
  }, []);

  const onGestureStarted = useCallback(() => {
    gestureStarted.current = true;
    haptic('impactLight');
  }, []);

  const getPercentChange = () => {
    if (loading) {
      return percentChange!;
    }
    return selectedPoint?.percentChange ?? displayData.percentChange;
  };

  const MinAxisLabel = useCallback(
    () => (
      <AxisLabel
        value={displayData.minPoint?.value!}
        index={displayData.minIndex!}
        prevIndex={prevDisplayData.minIndex}
        arrayLength={displayData.data.length}
        currencyAbbreviation={currencyAbbreviation}
        type="min"
      />
    ),
    [
      currencyAbbreviation,
      displayData.data.length,
      displayData.minIndex,
      displayData.minPoint?.value,
      prevDisplayData.minIndex,
    ],
  );

  const MaxAxisLabel = useCallback(
    () => (
      <AxisLabel
        value={displayData.maxPoint?.value!}
        index={displayData.maxIndex!}
        prevIndex={prevDisplayData.maxIndex}
        arrayLength={displayData.data.length}
        currencyAbbreviation={currencyAbbreviation}
        type="max"
      />
    ),
    [
      currencyAbbreviation,
      displayData.data.length,
      displayData.maxIndex,
      displayData.maxPoint?.value,
      prevDisplayData.maxIndex,
    ],
  );

  return (
    <SafeAreaView>
      <HeaderContainer>
        {loading ? (
          <SkeletonPlaceholder
            backgroundColor={theme.dark ? LightBlack : '#E1E9EE'}
            highlightColor={theme.dark ? '#333333' : '#F2F8FC'}>
            <SkeletonPlaceholder.Item flexDirection="row" alignItems="center">
              <SkeletonPlaceholder.Item>
                <SkeletonPlaceholder.Item width={150} height={30} />
                <SkeletonPlaceholder.Item
                  marginTop={15}
                  width={120}
                  height={15}
                />
              </SkeletonPlaceholder.Item>
            </SkeletonPlaceholder.Item>
          </SkeletonPlaceholder>
        ) : (
          <>
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
                      selectedPoint?.priceChange ??
                        displayData.priceChange ??
                        0,
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
            <RowContainer style={{marginTop: 7}}>
              <CurrencyAverageText style={{fontSize: 13.5, fontWeight: '500'}}>
                {selectedPoint
                  ? moment(selectedPoint.date).format('MMM DD, YYYY hh:mm a')
                  : ' '}
              </CurrencyAverageText>
            </RowContainer>
          </>
        )}
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
            TopAxisLabel={MaxAxisLabel}
            BottomAxisLabel={MinAxisLabel}
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
      {showArchaxBanner && <ArchaxFooter />}
    </SafeAreaView>
  );
};

export default gestureHandlerRootHOC(PriceCharts);
