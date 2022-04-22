import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import React, {
  ComponentType,
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
} from 'react';
import styled from 'styled-components/native';
import Button from '../../../components/button/Button';
import {
  CtaContainerAbsolute,
  WIDTH,
} from '../../../components/styled/Containers';
import {
  BaseText,
  fontFamily,
  H2,
  HeaderTitle,
} from '../../../components/styled/Text';
import {
  SlateDark,
  Success25,
  White,
  LightBlack,
  Black,
} from '../../../styles/colors';
import {formatFiatAmount, sleep} from '../../../utils/helper-methods';
import RangeDateSelector from '../components/RangeDateSelector';
import {WalletStackParamList} from '../WalletStack';
import {Currencies} from '../../../constants/currencies';
import {useTheme} from 'styled-components/native';
import {ExchangeRateItemProps} from '../../tabs/home/components/exchange-rates/ExchangeRatesList';
import {fetchHistoricalRates} from '../../../store/wallet/effects';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
  showOnGoingProcessModal,
} from '../../../store/app/app.actions';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';
import {BottomNotificationConfig} from '../../../components/modal/bottom-notification/BottomNotification';
import {CustomErrorMessage} from '../components/ErrorMessages';
import {BWCErrorMessage} from '../../../constants/BWCError';
import {
  createContainer,
  LineSegment,
  VictoryArea,
  VictoryGroup,
  VictoryTooltip,
} from 'victory-native';
import {DateRanges} from '../../../store/wallet/wallet.models';
import {Defs, Stop, LinearGradient} from 'react-native-svg';
import _ from 'lodash';
import {Platform} from 'react-native';

export type PriceChartsParamList = {
  item: ExchangeRateItemProps;
};

interface ChartDisplayDataType {
  x: number;
  y: number;
}

interface ChartDomainType {
  x: [number, number];
  y?: [number, number];
}

interface ChartDataType {
  data: ChartDisplayDataType[];
  domain?: ChartDomainType;
}

const MAX_POINTS = 200;

const defaultDisplayData: ChartDataType = {
  data: [
    {
      x: 0,
      y: 0,
    },
  ],
};

const defaultCachedRates = {
  [DateRanges.Day]: {data: []},
  [DateRanges.Week]: {data: []},
  [DateRanges.Month]: {data: []},
};

const SafeAreaView = styled.SafeAreaView`
  flex: 1;
`;

const HeaderContainer = styled.View`
  margin-left: 16px;
  margin-top: 40px;
`;

const PriceChartContainer = styled.View`
  flex: 1;
  margin-top: 60px;
`;

const RangeDateSelectorContainer = styled.View`
  margin-bottom: 33px;
`;

const CurrencyAverageContainer = styled.View<{average?: number}>`
  margin-top: 4px;
  height: 23px;
  background-color: ${({average}) =>
    average === 0
      ? LightBlack
      : average && average >= 0
      ? Success25
      : '#ff647c'};
  border-radius: 7px;
  width: auto;
  max-width: 80px;
  justify-content: center;
  flex-direction: row;
  align-items: center;
`;

const CurrencyAverageText = styled(BaseText)<{average?: number}>`
  font-style: normal;
  font-weight: 500;
  font-size: 14px;
  line-height: 20px;
  color: ${({average}) => (average && average >= 0 ? SlateDark : White)};
  margin: 2px 10px;
`;

const PriceCharts = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const {
    params: {item},
  } = useRoute<RouteProp<WalletStackParamList, 'PriceCharts'>>();
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);

  const {
    average,
    currencyName,
    currentPrice,
    priceDisplay,
    id,
    currencyAbbreviation,
  } = item;

  const {coinColor, gradientBackgroundColor} =
    Currencies[id.toLowerCase()].theme;

  const chartStyle = {
    data: {
      fill: 'url(#backgroundGradient)',
      fillOpacity: 0.7,
      stroke: theme.dark && coinColor === Black ? White : coinColor,
      strokeWidth: 2,
    },
  };

  const VictoryCursorVoronoiContainer: ComponentType<any> = createContainer(
    'cursor',
    'voronoi',
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerTitle: () => <HeaderTitle>{currencyName}</HeaderTitle>,
    });
  }, [navigation, currencyName]);

  const [loading, setLoading] = useState(true);
  const [showRageDateSelector, setShowRageDateSelector] = useState(true);
  const [displayData, setDisplayData] =
    useState<ChartDataType>(defaultDisplayData);
  const [cachedRates, setCachedRates] =
    useState<{[key in DateRanges]: ChartDataType}>(defaultCachedRates);

  const getFormattedData = (rates: Array<number>): ChartDataType => {
    let data = rates;

    // reduce number of points to improve performance
    if (data.length > MAX_POINTS) {
      const k = Math.pow(2, Math.ceil(Math.log2(data.length / MAX_POINTS)));
      data = data.filter((_d, i) => i % k === 0);
    }

    const min = _.minBy(data);
    const max = _.maxBy(data);

    return {
      data: data.map((value, key) => ({
        x: key,
        y: value,
      })),
      domain: {
        x: [0, data.length - 1],
        y: [min!, max! + max! / 100],
      },
    };
  };

  const showErrorMessage = useCallback(
    async (msg: BottomNotificationConfig) => {
      await sleep(500);
      dispatch(showBottomNotificationModal(msg));
    },
    [dispatch],
  );

  const getHistoricalFiatRates = async (dateRange: DateRanges) => {
    try {
      const historicFiatRates = (await dispatch<any>(
        fetchHistoricalRates(dateRange, currencyAbbreviation),
      )) as Array<number>;
      return getFormattedData(historicFiatRates.reverse());
    } catch (e) {
      throw e;
    }
  };

  const redrawChart = async (dateRange: DateRanges) => {
    if (cachedRates[dateRange].domain) {
      dispatch(showOnGoingProcessModal(OnGoingProcessMessages.LOADING));
      await sleep(500);
      setDisplayData(cachedRates[dateRange]);
      dispatch(dismissOnGoingProcessModal());
      await sleep(500);
    } else {
      try {
        dispatch(showOnGoingProcessModal(OnGoingProcessMessages.LOADING));
        await sleep(500);
        let {data, domain}: ChartDataType = await getHistoricalFiatRates(
          dateRange,
        );
        setCachedRates({...cachedRates, ...{[dateRange]: {data, domain}}});
        setDisplayData({data, domain});
        dispatch(dismissOnGoingProcessModal());
        await sleep(500);
      } catch (e) {
        dispatch(dismissOnGoingProcessModal());
        await sleep(500);
        setShowRageDateSelector(false);
        await showErrorMessage(
          CustomErrorMessage({
            errMsg: BWCErrorMessage(e),
            title: 'Uh oh, something went wrong',
          }),
        );
      }
    }
  };

  const goToBuyCrypto = () => {
    navigation.navigate('Wallet', {
      screen: 'Amount',
      params: {
        onAmountSelected: async (amount: string) => {
          navigation.navigate('BuyCrypto', {
            screen: 'Root',
            params: {
              amount: Number(amount),
              currencyAbbreviation,
            },
          });
        },
        opts: {
          hideSendMax: true,
        },
      },
    });
  };

  useEffect(() => {
    if (loading) {
      const defaultDateRange = DateRanges.Day;
      const formattedData = getFormattedData(priceDisplay);
      setCachedRates({...cachedRates, ...{[defaultDateRange]: formattedData}});
      setDisplayData(formattedData);
      setLoading(false);
    }
  }, [loading, cachedRates, currencyAbbreviation, priceDisplay]);

  return (
    <SafeAreaView>
      <HeaderContainer>
        {currentPrice && (
          <H2>
            {formatFiatAmount(currentPrice, defaultAltCurrency.isoCode, {
              customPrecision: 'minimal',
              currencyAbbreviation,
            })}
          </H2>
        )}
        <CurrencyAverageContainer average={average}>
          <CurrencyAverageText average={average}>
            {average && average > 0 ? '+' : null}
            {average}%
          </CurrencyAverageText>
        </CurrencyAverageContainer>
      </HeaderContainer>
      <PriceChartContainer>
        {!loading ? (
          <VictoryGroup
            containerComponent={
              <VictoryCursorVoronoiContainer
                voronoiDimension="x"
                cursorDimension="x"
                cursorComponent={
                  <LineSegment
                    style={{
                      stroke:
                        theme.dark && coinColor === Black ? White : coinColor,
                      strokeDasharray: '4, 8',
                      strokeWidth: 2,
                    }}
                  />
                }
                labels={({datum}: any) =>
                  formatFiatAmount(datum.y, 'USD', {
                    customPrecision: 'minimal',
                    currencyAbbreviation,
                  })
                }
                labelComponent={
                  <VictoryTooltip
                    cornerRadius={5}
                    pointerLength={0}
                    renderInPortal={false}
                    flyoutStyle={{
                      stroke:
                        theme.dark && coinColor === Black ? White : coinColor,
                      fill: theme.dark ? Black : White,
                    }}
                    style={{
                      fill:
                        theme.dark && coinColor === Black ? White : coinColor,
                      fontFamily,
                    }}
                  />
                }
              />
            }
            width={WIDTH}
            padding={0}
            height={350}
            domain={displayData?.domain}
            domainPadding={{y: 40}}>
            <VictoryArea
              interpolation={'monotoneX'}
              style={chartStyle}
              data={displayData?.data}
            />
            <Defs>
              <LinearGradient
                id="backgroundGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1">
                <Stop offset="0%" stopColor={gradientBackgroundColor} />
                <Stop
                  offset="100%"
                  stopColor={theme.dark ? 'transparent' : White}
                />
              </LinearGradient>
            </Defs>
          </VictoryGroup>
        ) : null}
      </PriceChartContainer>
      <CtaContainerAbsolute
        style={{marginBottom: Platform.OS === 'ios' ? 40 : 5}}>
        {showRageDateSelector ? (
          <RangeDateSelectorContainer>
            <RangeDateSelector onPress={redrawChart} />
          </RangeDateSelectorContainer>
        ) : null}
        <Button onPress={goToBuyCrypto} buttonStyle={'primary'}>
          Buy {currencyName}
        </Button>
      </CtaContainerAbsolute>
    </SafeAreaView>
  );
};

export default PriceCharts;
