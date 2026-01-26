import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {RefreshControl, ScrollView, View} from 'react-native';
import type {SelectionDotProps} from 'react-native-graph';
import {GraphPoint, LineGraph} from 'react-native-graph';
import {Circle, Group} from '@shopify/react-native-skia';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {Path, Svg} from 'react-native-svg';
import styled, {useTheme} from 'styled-components/native';
import HeaderBackButton from '../../../components/back/HeaderBackButton';
import {CurrencyImage} from '../../../components/currency-image/CurrencyImage';
import Percentage from '../../../components/percentage/Percentage';
import {
  ActiveOpacity,
  CardContainer,
  ScreenGutter,
  WIDTH,
} from '../../../components/styled/Containers';
import {
  BaseText,
  H2,
  H5,
  HeaderTitle,
  Link,
} from '../../../components/styled/Text';
import {BitpaySupportedCoins} from '../../../constants/currencies';
import {SupportedCurrencyOptions} from '../../../constants/SupportedCurrencyOptions';
import LinkingButtons from '../../tabs/home/components/LinkingButtons';
import Loader from '../../../components/loader/Loader';
import {
  Action,
  LightBlack,
  LightBlue,
  LinkBlue,
  LuckySevens,
  Midnight,
  ProgressBlue,
  Slate,
  Slate10,
  Slate30,
  SlateDark,
  White,
} from '../../../styles/colors';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import type {WalletGroupParamList} from '../WalletGroup';
import {Network} from '../../../constants';
import {
  buildUIFormattedWallet,
  isCacheKeyStale,
} from '../../../store/wallet/utils/wallet';
import type {Wallet} from '../../../store/wallet/wallet.models';
import type {Key} from '../../../store/wallet/wallet.models';
import type {RootState} from '../../../store';
import {
  calculatePercentageDifference,
  formatCryptoAddress,
  formatFiatAmount,
  getRateByCurrencyName,
  sleep,
} from '../../../utils/helper-methods';
import {downsampleTimestamps} from '../../../utils/rate';
import {findIndex, maxBy, minBy} from 'lodash';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {
  fetchMarketStats,
  getMarketStatsCacheKey,
} from '../../../store/market-stats';
import {
  sendCrypto,
  receiveCrypto,
} from '../../../store/wallet/effects/send/send';
import {ExternalServicesScreens} from '../../services/ExternalServicesGroup';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {
  fetchFiatRateSeriesAllIntervals,
  fetchFiatRateSeriesInterval,
  refreshFiatRateSeries,
  startGetRates,
} from '../../../store/wallet/effects';
import {getAndDispatchUpdatedWalletBalances} from '../../../store/wallet/effects/status/statusv2';
import {
  DateRanges,
  FiatRateInterval,
  FiatRatePoint,
  FIAT_RATE_SERIES_CACHED_INTERVALS,
  getFiatRateSeriesCacheKey,
} from '../../../store/rate/rate.models';
import haptic from '../../../components/haptic-feedback/haptic';
import {HISTORIC_RATES_CACHE_DURATION} from '../../../constants/wallet';
import {logManager} from '../../../managers/LogManager';

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
  maxIndex: undefined,
  maxPoint: undefined,
  minIndex: undefined,
  minPoint: undefined,
};

const AxisLabel = ({
  value,
  index,
  prevIndex,
  arrayLength,
  currencyAbbreviation,
  type,
  textColor,
}: {
  value: number;
  index: number;
  prevIndex?: number;
  arrayLength: number;
  currencyAbbreviation: string;
  type: 'min' | 'max';
  textColor?: string;
}): React.ReactElement => {
  const defaultAltCurrency = useAppSelector(
    ({APP}: RootState) => APP.defaultAltCurrency,
  );
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
  const labelColor = textColor ?? (theme.dark ? Slate30 : SlateDark);
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
            color: labelColor,
            fontWeight: '400',
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

const formatCompactNumber = (value: number, maximumFractionDigits = 2) => {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  const units: Array<{threshold: number; suffix: string}> = [
    {threshold: 1e12, suffix: 'T'},
    {threshold: 1e9, suffix: 'B'},
    {threshold: 1e6, suffix: 'M'},
    {threshold: 1e3, suffix: 'K'},
  ];

  const unit = units.find(u => abs >= u.threshold);
  if (!unit) {
    const fixed = value.toFixed(Math.min(2, maximumFractionDigits));
    return fixed.replace(/\.0+$/, '').replace(/(\.[0-9]*?)0+$/, '$1');
  }

  const scaled = abs / unit.threshold;
  const fixed = scaled.toFixed(maximumFractionDigits);
  const trimmed = fixed.replace(/\.0+$/, '').replace(/(\.[0-9]*?)0+$/, '$1');
  return `${sign}${trimmed}${unit.suffix}`;
};

const POLYGON_ABOUT_FALLBACK =
  'Polygon (Previously Matic Network) is the first well-structured, easy-to-use platform for Ethereum scaling and infrastructure development. Its core component is Polygon SDK, a modular, flexible framework that supports building multiple types of applications.\r\n\r\nUsing Polygon, one can create Optimistic Rollup chains, ZK Rollup chains, stand alone chains or any other kind of infra required by the developer. \r\n\r\nPolygon effectively transforms Ethereum into a full-fledged multi-chain system (aka Internet of Blockchains). This multi-chain system is akin to other ones such as Polkadot, Cosmos, Avalanche etc with the advantages of Ethereum’s security, vibrant ecosystem and openness.\r\n\r\nNothing will change for the existing ecosystem built on the Plasma-POS chain. With Polygon, new features are being built around the existing proven technology to expand the ability to cater to diverse needs from the developer ecosystem. Polygon will continue to develop the core technology so that it can scale to a larger ecosystem. \r\n\r\nThe $MATIC token will continue to exist and will play an increasingly important role, securing the system and enabling governance.';

const getCurrencySymbol = (isoCode: string): string => {
  try {
    const formatted = (0)
      .toLocaleString('en-US', {
        style: 'currency',
        currency: isoCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
      .replace(/\d/g, '')
      .trim();
    return formatted || isoCode;
  } catch {
    return isoCode;
  }
};

const MIN_TINY_VALUE = 0.01;
const MIN_TINY_FRACTION_DIGITS = 4;
const MAX_TINY_FRACTION_DIGITS = 8;
const MIN_TINY_DISPLAYABLE = 1 / Math.pow(10, MAX_TINY_FRACTION_DIGITS);

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const HISTORIC_TIMEFRAME_WINDOW_MS: Record<'3M' | '1Y' | '5Y', number> = {
  '3M': DateRanges.Quarter * MS_PER_DAY,
  '1Y': DateRanges.Year * MS_PER_DAY,
  '5Y': DateRanges.FiveYears * MS_PER_DAY,
};

const formatTinyDecimal = (value: number, decimals: number) => {
  const fixed = value.toFixed(decimals);
  return fixed.replace(/\.0+$/, '').replace(/(\.[0-9]*?)0+$/, '$1');
};

const formatCompactCurrency = (
  value: number,
  isoCode: string,
  maximumFractionDigits = 2,
) => {
  const absValue = Math.abs(value);
  const isoUpper = (isoCode || '').toUpperCase();
  const symbol = getCurrencySymbol(isoCode);
  const useSymbol = symbol !== isoCode;
  const compactThreshold = isoUpper === 'USD' ? 1e6 : 1e5;

  if (absValue < compactThreshold) {
    if (!absValue || absValue >= MIN_TINY_VALUE) {
      return formatFiatAmount(value, isoCode, {
        customPrecision: 'minimal',
        currencyDisplay: 'symbol',
      });
    }

    if (absValue < MIN_TINY_DISPLAYABLE) {
      const comparator = value < 0 ? '>' : '<';
      const thresholdString = `0.${'0'.repeat(MAX_TINY_FRACTION_DIGITS - 1)}1`;
      return useSymbol
        ? `${comparator}${symbol}${thresholdString}`
        : `${comparator}${thresholdString} ${isoCode}`;
    }

    const decimals = Math.min(
      MAX_TINY_FRACTION_DIGITS,
      Math.max(
        MIN_TINY_FRACTION_DIGITS,
        Math.ceil(Math.abs(Math.log10(absValue))) + 2,
      ),
    );
    const tinyNumber = formatTinyDecimal(absValue, decimals);
    const sign = value < 0 ? '-' : '';
    return useSymbol
      ? `${sign}${symbol}${tinyNumber}`
      : `${sign}${tinyNumber} ${isoCode}`;
  }

  const compact = formatCompactNumber(value, maximumFractionDigits);
  return useSymbol ? `${symbol}${compact}` : `${compact} ${isoCode}`;
};

const formatSupply = (value: number, maximumFractionDigits = 2) => {
  if (value >= 1e9) {
    return formatCompactNumber(value, maximumFractionDigits);
  }
  const fixed = value.toFixed(maximumFractionDigits);
  const trimmed = fixed.replace(/\.0+$/, '').replace(/(\.[0-9]*?)0+$/, '$1');
  const [intPart, decPart] = trimmed.split('.');
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decPart ? `${withCommas}.${decPart}` : withCommas;
};

const getFormattedData = (
  historicFiatRates: Array<{ts: number; rate: number}>,
): ChartDataType => {
  const ratesSorted = [...historicFiatRates].sort((a, b) => a.ts - b.ts);
  if (!ratesSorted.length) {
    return defaultDisplayData;
  }
  const targetLen = 91;
  const rates =
    ratesSorted.length > targetLen
      ? (downsampleTimestamps({series: ratesSorted}, targetLen, {
          strategy: 'lttb',
          mode: 'per_coin',
        }).series.filter(p => p !== null) as Array<{ts: number; rate: number}>)
      : ratesSorted;
  if (rates.length < 2) {
    const scaledData = rates.map(value => ({
      date: new Date(value.ts),
      value: value.rate,
    }));
    const maxPoint = maxBy(scaledData, point => point.value);
    const minPoint = minBy(scaledData, point => point.value);
    const maxIndex =
      typeof maxPoint !== 'undefined'
        ? findIndex(scaledData, maxPoint)
        : undefined;
    const minIndex =
      typeof minPoint !== 'undefined'
        ? findIndex(scaledData, minPoint)
        : undefined;
    return {
      data: scaledData,
      percentChange: 0,
      priceChange: 0,
      maxIndex,
      maxPoint,
      minIndex,
      minPoint,
    };
  }
  const percentChange = calculatePercentageDifference(
    rates[rates.length - 1].rate,
    rates[0].rate,
  );
  const scaledData = rates.map(value => ({
    date: new Date(value.ts),
    value: value.rate,
  }));
  const maxPoint = maxBy(scaledData, point => point.value);
  const minPoint = minBy(scaledData, point => point.value);
  const maxIndex =
    typeof maxPoint !== 'undefined'
      ? findIndex(scaledData, maxPoint)
      : undefined;
  const minIndex =
    typeof minPoint !== 'undefined'
      ? findIndex(scaledData, minPoint)
      : undefined;

  return {
    data: scaledData,
    percentChange,
    priceChange: rates[rates.length - 1].rate - rates[0].rate,
    maxIndex,
    maxPoint,
    minIndex,
    minPoint,
  };
};

const ScreenContainer = styled.SafeAreaView`
  flex: 1;
`;

const HeaderRight = styled.View`
  flex-direction: row;
  gap: 10px;
`;

const CircleButton = styled(TouchableOpacity)`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  align-items: center;
  justify-content: center;
  background-color: ${({theme}) => (theme.dark ? '#252525' : '#F5F7F8')};
`;

const HeaderTitleText = styled(HeaderTitle)`
  font-size: 20px;
`;

const TopSection = styled.View`
  margin-top: 10px;
  align-items: center;
  padding: 0 16px;
`;

const AbbreviationLabel = styled(BaseText)`
  font-size: 13px;
  line-height: 18px;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
  text-transform: uppercase;
  font-weight: 400;
  margin-bottom: 2px;
`;

const PriceText = styled(H2)<{isLargeNumber?: boolean}>`
  font-size: ${({isLargeNumber}) => (isLargeNumber ? '32px' : '40px')};
  line-height: ${({isLargeNumber}) => (isLargeNumber ? '38px' : '50px')};
  margin-bottom: 5px;
`;

const PercentRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;

const ChartContainer = styled.View`
  margin-top: 8px;
`;

const ChartInner = styled.View`
  position: relative;
  align-items: center;
  justify-content: center;
  height: 220px;
`;

const ChartLoaderOverlay = styled.View`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  justify-content: center;
  align-items: center;
`;

const TimeframeContainer = styled.View`
  margin-top: 5px;
  padding: 0 0px;
`;

const TimeframeRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-self: center;
  width: ${WIDTH - 24}px;
`;

const TimeframeHitSlop = {top: 10, bottom: 10, left: 10, right: 10} as const;

const TimeframePill = styled(TouchableOpacity)<{active: boolean}>`
  height: 34px;
  min-width: 44px;
  padding: 0 12px;
  border-radius: 18px;
  align-items: center;
  justify-content: center;
  background-color: ${({theme, active}) =>
    active ? (theme.dark ? Midnight : LightBlue) : 'transparent'};
`;

const TimeframeText = styled(BaseText)<{active: boolean}>`
  font-size: 14px;
  font-weight: ${({active}) => (active ? 500 : 400)};
  color: ${({theme, active}) =>
    active
      ? theme.dark
        ? LinkBlue
        : Action
      : theme.dark
      ? Slate30
      : SlateDark};
`;

const ActionsContainer = styled.View`
  margin-top: 20px;
  margin-bottom: 20px;
`;

const SectionTitle = styled(H5)`
  font-size: 20px;
  font-style: normal;
  font-weight: 700;
  line-height: 30px;
  margin: 18px ${ScreenGutter} 3px;
`;

const WalletCard = styled(TouchableOpacity)`
  border: 1px solid ${({theme}) => (theme.dark ? LightBlack : Slate10)};
  background-color: ${({theme: {dark}}) => (dark ? '#111' : Slate10)};
  border-radius: 12px;
  margin: 8px ${ScreenGutter};
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 15px;
  height: 75px;
`;

const WalletLeft = styled.View`
  flex: 1;
  padding-right: 10px;
`;

const WalletName = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
  line-height: 24px;
  color: ${({theme}) => theme.colors.text};
`;

const WalletSub = styled(BaseText)`
  font-size: 13px;
  font-style: normal;
  font-weight: 400;
  line-height: 20px;
  color: ${({theme: {dark}}) => (dark ? Slate30 : LuckySevens)};
`;

const WalletRight = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 10px;
`;

const WalletAmount = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
  line-height: 24px;
  color: ${({theme}) => theme.colors.text};
`;

const MarketCardContainer = styled.View`
  margin: 20px ${ScreenGutter} 20px;
  border: 1px solid ${({theme}) => (theme.dark ? LightBlack : Slate30)};
  border-radius: 12px;
`;

const MarketHeader = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
`;

const MarketHeaderLeft = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 10px;
`;

const MarketTitle = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  font-weight: 500;
  line-height: 24px;
  color: ${({theme}) => theme.colors.text};
`;

const MarketPrice = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  font-weight: 700;
  line-height: 24px;
  color: ${({theme}) => theme.colors.text};
`;

const Divider = styled.View`
  height: 1px;
  background-color: ${({theme}) => (theme.dark ? LightBlack : Slate30)};
`;

const MarketBody = styled.View`
  padding: 14px;
  background-color: ${({theme: {dark}}) => (dark ? '#111' : Slate10)};
`;

const SubSectionTitle = styled(BaseText)`
  font-size: 13px;
  font-style: normal;
  font-weight: 600;
  line-height: 20px;
  color: ${({theme}) => theme.colors.text};
  margin-bottom: 10px;
`;

const StatsGridRow = styled.View`
  flex-direction: row;
`;

const StatBlock = styled.View`
  flex: 1;
  flex-basis: 0px;
`;

const StatLabel = styled(BaseText)`
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
  line-height: 15px;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
  margin-bottom: 4px;
`;

const StatValue = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
  line-height: 24px;
  color: ${({theme}) => theme.colors.text};
`;

const AboutText = styled(BaseText)`
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
  line-height: 15px;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
`;

const RightIconSvg = ({type}: {type: 'star' | 'bell'}) => {
  const theme = useTheme();
  const fill = theme.dark ? Slate30 : SlateDark;

  if (type === 'star') {
    return (
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27Z"
          fill={fill}
        />
      </Svg>
    );
  }

  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2Zm6-6V11c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5S10.5 3.17 10.5 4v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2Z"
        fill={fill}
      />
    </Svg>
  );
};

const ChartSelectionDot = ({
  isActive,
  color,
  circleX,
  circleY,
}: SelectionDotProps): React.ReactElement => {
  const outerRadius = useSharedValue(0);
  const innerRadius = useSharedValue(0);

  const setIsActive = useCallback(
    (active: boolean) => {
      outerRadius.value = withSpring(active ? 9 : 0, {
        mass: 1,
        stiffness: 1000,
        damping: 50,
        velocity: 0,
      });
      innerRadius.value = withSpring(active ? 4 : 0, {
        mass: 1,
        stiffness: 1000,
        damping: 50,
        velocity: 0,
      });
    },
    [innerRadius, outerRadius],
  );

  useAnimatedReaction(
    () => isActive.value,
    active => {
      runOnJS(setIsActive)(active);
    },
    [setIsActive],
  );

  return (
    <Group>
      <Circle
        cx={circleX}
        cy={circleY}
        r={outerRadius}
        color={color}
        opacity={0.18}
      />
      <Circle cx={circleX} cy={circleY} r={innerRadius} color={color} />
    </Group>
  );
};

const ExchangeRate = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const keys = useAppSelector(({WALLET}: RootState) => WALLET.keys);
  const rates = useAppSelector(({RATE}: RootState) => RATE.rates);
  const fiatRateSeriesCache = useAppSelector(
    ({RATE}: RootState) => RATE.fiatRateSeriesCache,
  );
  const defaultAltCurrency = useAppSelector(
    ({APP}: RootState) => APP.defaultAltCurrency,
  );
  const hideAllBalances = useAppSelector(
    ({APP}: RootState) => APP.hideAllBalances,
  );
  const {params} = useRoute<RouteProp<WalletGroupParamList, 'ExchangeRate'>>();
  const [selectedTimeframe, setSelectedTimeframe] =
    useState<FiatRateInterval>('ALL');
  const [isAboutExpanded, setIsAboutExpanded] = useState(false);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [displayData, setDisplayData] =
    useState<ChartDataType>(defaultDisplayData);
  const [prevDisplayData, setPrevDisplayData] =
    useState<ChartDataType>(defaultDisplayData);
  const displayDataRef = useRef(displayData);
  useEffect(() => {
    displayDataRef.current = displayData;
  }, [displayData]);
  const gestureStarted = useRef(false);
  const [selectedPoint, setSelectedPoint] = useState<
    | {
        date: Date;
        price: number;
        priceChange: number;
        percentChange: number;
      }
    | undefined
  >(undefined);

  const currencyAbbreviation = (
    params?.currencyAbbreviation || 'BTC'
  ).toUpperCase();
  const coinKey = (
    params?.chain ||
    params?.currencyAbbreviation ||
    'btc'
  ).toLowerCase();
  const coin = BitpaySupportedCoins[coinKey] ?? BitpaySupportedCoins.btc;
  const currencyName = params?.currencyName || coin.name || 'Bitcoin';

  const assetContext = useMemo(
    () => ({
      currencyAbbreviation: (
        params?.currencyAbbreviation || 'btc'
      ).toLowerCase(),
      chain: (
        params?.chain ||
        params?.currencyAbbreviation ||
        'btc'
      ).toLowerCase(),
      network: params?.network?.toLowerCase(),
      tokenAddress: params?.tokenAddress?.toLowerCase(),
    }),
    [
      params?.chain,
      params?.currencyAbbreviation,
      params?.network,
      params?.tokenAddress,
    ],
  );

  const assetCurrencyOption = useMemo(() => {
    const tokenAddressLower = assetContext.tokenAddress;
    return (
      SupportedCurrencyOptions.find(
        ({currencyAbbreviation, chain, tokenAddress}) =>
          currencyAbbreviation === assetContext.currencyAbbreviation &&
          chain === assetContext.chain &&
          (!tokenAddressLower ||
            (tokenAddress || '').toLowerCase() === tokenAddressLower),
      ) ||
      (tokenAddressLower
        ? SupportedCurrencyOptions.find(
            ({tokenAddress}) =>
              (tokenAddress || '').toLowerCase() === tokenAddressLower,
          )
        : undefined) ||
      SupportedCurrencyOptions.find(
        ({currencyAbbreviation}) =>
          currencyAbbreviation === assetContext.currencyAbbreviation,
      )
    );
  }, [
    assetContext.chain,
    assetContext.currencyAbbreviation,
    assetContext.tokenAddress,
  ]);

  const normalizeFiatRateSeriesCoin = useCallback((abbr?: string): string => {
    switch ((abbr || '').toLowerCase()) {
      case 'matic':
      case 'pol':
        return 'pol';
      default:
        return (abbr || '').toLowerCase();
    }
  }, []);

  const selectedFiatCodeUpper = (
    defaultAltCurrency.isoCode || 'USD'
  ).toUpperCase();
  const normalizedCoin = normalizeFiatRateSeriesCoin(
    assetContext.currencyAbbreviation,
  );

  const seriesDataInterval: FiatRateInterval = useMemo(() => {
    switch (selectedTimeframe) {
      case '3M':
      case '1Y':
      case '5Y':
        return 'ALL';
      default:
        return selectedTimeframe;
    }
  }, [selectedTimeframe]);

  const selectedSeriesKey = useMemo(() => {
    return getFiatRateSeriesCacheKey(
      selectedFiatCodeUpper,
      normalizedCoin,
      seriesDataInterval,
    );
  }, [normalizedCoin, selectedFiatCodeUpper, seriesDataInterval]);

  const selectedSeries = fiatRateSeriesCache[selectedSeriesKey];

  useEffect(() => {
    dispatch(
      fetchFiatRateSeriesAllIntervals({
        fiatCode: selectedFiatCodeUpper,
        currencyAbbreviation: assetContext.currencyAbbreviation,
      }),
    );
  }, [assetContext.currencyAbbreviation, dispatch, selectedFiatCodeUpper]);

  useEffect(() => {
    dispatch(
      fetchFiatRateSeriesInterval({
        fiatCode: selectedFiatCodeUpper,
        interval: seriesDataInterval,
        coinForCacheCheck: normalizedCoin,
      }),
    );
  }, [dispatch, normalizedCoin, selectedFiatCodeUpper, seriesDataInterval]);

  const altCurrencyIsoCodeUpper = defaultAltCurrency.isoCode?.toUpperCase();

  const currentFiatRate = useMemo(() => {
    if (
      !rates ||
      !assetContext.currencyAbbreviation ||
      !altCurrencyIsoCodeUpper
    ) {
      return undefined;
    }

    const currencyRates = getRateByCurrencyName(
      rates,
      assetContext.currencyAbbreviation,
      assetContext.chain,
      assetContext.tokenAddress,
    );

    if (!currencyRates?.length) {
      return undefined;
    }

    const matchingRate = currencyRates.find(
      rate => rate.code?.toUpperCase() === altCurrencyIsoCodeUpper,
    );

    return matchingRate?.rate;
  }, [
    altCurrencyIsoCodeUpper,
    assetContext.chain,
    assetContext.currencyAbbreviation,
    assetContext.tokenAddress,
    rates,
  ]);

  useEffect(() => {
    if (selectedSeries?.points?.length) {
      const pointsToDisplay: FiatRatePoint[] = (() => {
        if (
          seriesDataInterval === 'ALL' &&
          selectedTimeframe !== 'ALL' &&
          (selectedTimeframe === '3M' ||
            selectedTimeframe === '1Y' ||
            selectedTimeframe === '5Y')
        ) {
          const now = Date.now();
          const windowMs =
            selectedTimeframe === '3M'
              ? HISTORIC_TIMEFRAME_WINDOW_MS['3M']
              : selectedTimeframe === '1Y'
              ? HISTORIC_TIMEFRAME_WINDOW_MS['1Y']
              : HISTORIC_TIMEFRAME_WINDOW_MS['5Y'];
          const cutoff = now - windowMs;
          return selectedSeries.points.filter(
            (p: FiatRatePoint) => p.ts >= cutoff,
          );
        }
        return selectedSeries.points;
      })();

      const pointsForChart = (() => {
        if (
          !pointsToDisplay.length ||
          !currentFiatRate ||
          !Number.isFinite(currentFiatRate)
        ) {
          return pointsToDisplay;
        }

        const lastIdx = pointsToDisplay.length - 1;
        const last = pointsToDisplay[lastIdx];
        // Never mutate cached series points in Redux; only override in-memory for rendering.
        const copy = [...pointsToDisplay];
        copy[lastIdx] = {...last, rate: currentFiatRate};
        return copy;
      })();

      const formattedRates = getFormattedData(pointsForChart);
      setPrevDisplayData(displayDataRef.current);
      setDisplayData(formattedRates);
      setIsChartLoading(false);
      return;
    }

    const hasUsableData = !!displayDataRef.current.data.length;
    setIsChartLoading(!hasUsableData);
  }, [
    currentFiatRate,
    selectedSeries?.points,
    selectedTimeframe,
    seriesDataInterval,
  ]);

  const loggedDownsampleLengthsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const intervals: FiatRateInterval[] = ['ALL', '1D', '1W', '1M'];
    for (const interval of intervals) {
      const cacheKey = getFiatRateSeriesCacheKey(
        selectedFiatCodeUpper,
        normalizedCoin,
        interval,
      );
      const series = fiatRateSeriesCache[cacheKey];
      if (!series?.points?.length || !series.fetchedOn) {
        continue;
      }

      if (loggedDownsampleLengthsRef.current[cacheKey] === series.fetchedOn) {
        continue;
      }

      const downsampledLen = getFormattedData(series.points).data.length;
      logManager.info(
        `[ExchangeRate] downsample length - fiat:${selectedFiatCodeUpper} coin:${normalizedCoin} interval:${interval} raw:${series.points.length} downsampled:${downsampledLen}`,
      );
      loggedDownsampleLengthsRef.current[cacheKey] = series.fetchedOn;
    }
  }, [fiatRateSeriesCache, normalizedCoin, selectedFiatCodeUpper]);

  const walletsForAsset = useMemo(() => {
    const allWallets: Wallet[] = (Object.values(keys) as Key[]).flatMap(
      k => k.wallets,
    );
    const filtered = allWallets
      .filter(w => w.network !== Network.testnet)
      .filter(w => !w.hideWallet && !w.hideWalletByAccount)
      .filter(w => (w.balance?.sat ?? 0) > 0)
      .filter(w => {
        const matchesCurrency =
          (w.currencyAbbreviation || '').toLowerCase() ===
          assetContext.currencyAbbreviation;
        const matchesTokenAddress = assetContext.tokenAddress
          ? (w.tokenAddress || '').toLowerCase() === assetContext.tokenAddress
          : true;
        const matchesChain = assetContext.tokenAddress
          ? (w.chain || '').toLowerCase() === assetContext.chain
          : true;
        return matchesCurrency && matchesTokenAddress && matchesChain;
      })
      .map(wallet => {
        const ui = buildUIFormattedWallet(
          wallet,
          defaultAltCurrency.isoCode,
          rates,
          dispatch,
          'symbol',
        );
        return {wallet, ui};
      })
      .sort((a, b) => (b.ui.fiatBalance || 0) - (a.ui.fiatBalance || 0));

    return filtered;
  }, [
    assetContext.chain,
    assetContext.currencyAbbreviation,
    assetContext.tokenAddress,
    defaultAltCurrency.isoCode,
    dispatch,
    keys,
    rates,
  ]);
  const hasWalletsForAsset = walletsForAsset.length > 0;

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (hasWalletsForAsset) {
        await dispatch(
          getAndDispatchUpdatedWalletBalances({
            context: 'homeRootOnRefresh',
          }),
        );
      } else {
        await dispatch(
          startGetRates({
            context: 'homeRootOnRefresh',
            force: true,
          }),
        );
      }
      const cacheKey = getFiatRateSeriesCacheKey(
        selectedFiatCodeUpper,
        normalizedCoin,
        seriesDataInterval,
      );
      const cached = fiatRateSeriesCache[cacheKey];
      const isStale = cached
        ? isCacheKeyStale(cached.fetchedOn, HISTORIC_RATES_CACHE_DURATION)
        : true;

      if (!cached?.points?.length || isStale) {
        await dispatch(
          fetchFiatRateSeriesInterval({
            fiatCode: selectedFiatCodeUpper,
            interval: seriesDataInterval,
            coinForCacheCheck: normalizedCoin,
            force: true,
          }),
        );
      } else {
        const didAppend = await dispatch(
          refreshFiatRateSeries({
            fiatCode: selectedFiatCodeUpper,
            currencyAbbreviation: assetContext.currencyAbbreviation,
            interval: seriesDataInterval,
            spotRate: currentFiatRate,
          }),
        );
        if (!didAppend) {
          await dispatch(
            fetchFiatRateSeriesInterval({
              fiatCode: selectedFiatCodeUpper,
              interval: seriesDataInterval,
              coinForCacheCheck: normalizedCoin,
              force: true,
            }),
          );
        }
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [
    assetContext.currencyAbbreviation,
    currentFiatRate,
    dispatch,
    fiatRateSeriesCache,
    hasWalletsForAsset,
    normalizedCoin,
    selectedFiatCodeUpper,
    selectedTimeframe,
    seriesDataInterval,
  ]);

  const rangeLabel = useMemo(() => {
    switch (selectedTimeframe) {
      case '1D':
        return 'Last Day';
      case '1W':
        return 'Past Week';
      case '1M':
        return 'Past Month';
      case '3M':
        return 'Past 3 Months';
      case '1Y':
        return 'Past Year';
      case '5Y':
        return 'Past 5 Years';
      case 'ALL':
      default:
        return 'All-time';
    }
  }, [selectedTimeframe]);

  const rangeOrSelectedPointLabel = useMemo(() => {
    if (!selectedPoint?.date) {
      return rangeLabel;
    }
    const date = selectedPoint.date;
    if (selectedTimeframe === '1D') {
      return date.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      });
    }
    if (selectedTimeframe === '1W' || selectedTimeframe === '1M') {
      return date.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    }
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [rangeLabel, selectedPoint?.date, selectedTimeframe]);

  const fallbackHistoricalPrice = useMemo(() => {
    if (displayData.data.length) {
      return displayData.data[displayData.data.length - 1].value;
    }
    return undefined;
  }, [displayData.data]);

  const latestPriceValue = currentFiatRate ?? fallbackHistoricalPrice;

  const formattedCurrentPrice = useMemo(() => {
    const valueToDisplay =
      selectedPoint?.price ?? latestPriceValue ?? fallbackHistoricalPrice;
    if (valueToDisplay == null) {
      return '--';
    }

    return formatFiatAmount(valueToDisplay, defaultAltCurrency.isoCode, {
      customPrecision: 'minimal',
      currencyAbbreviation: assetContext.currencyAbbreviation,
    });
  }, [
    assetContext.currencyAbbreviation,
    defaultAltCurrency.isoCode,
    fallbackHistoricalPrice,
    latestPriceValue,
    selectedPoint?.price,
  ]);

  const allIntervalsHighValue = useMemo(() => {
    const getPointsForInterval = (
      interval: 'ALL' | '1D' | '1W' | '1M',
    ): FiatRatePoint[] | undefined => {
      const cacheKey = getFiatRateSeriesCacheKey(
        selectedFiatCodeUpper,
        normalizedCoin,
        interval,
      );
      return fiatRateSeriesCache[cacheKey]?.points;
    };

    const getHighFromPoints = (
      points?: FiatRatePoint[],
    ): number | undefined => {
      if (!points?.length) {
        return undefined;
      }
      return getFormattedData(points).maxPoint?.value;
    };

    const maxCandidates: number[] = [];
    for (const interval of FIAT_RATE_SERIES_CACHED_INTERVALS) {
      const high = getHighFromPoints(getPointsForInterval(interval));
      if (high != null) {
        maxCandidates.push(high);
      }
    }

    const allPoints = getPointsForInterval('ALL');
    if (allPoints?.length) {
      const now = Date.now();
      const derivedWindows: Array<{windowMs: number}> = [
        {windowMs: HISTORIC_TIMEFRAME_WINDOW_MS['3M']},
        {windowMs: HISTORIC_TIMEFRAME_WINDOW_MS['1Y']},
        {windowMs: HISTORIC_TIMEFRAME_WINDOW_MS['5Y']},
      ];

      for (const {windowMs} of derivedWindows) {
        const cutoff = now - windowMs;
        const windowPoints = allPoints.filter(p => p.ts >= cutoff);
        const high = getHighFromPoints(windowPoints);
        if (high != null) {
          maxCandidates.push(high);
        }
      }
    }

    return maxCandidates.length ? Math.max(...maxCandidates) : undefined;
  }, [fiatRateSeriesCache, normalizedCoin, selectedFiatCodeUpper]);

  const formattedAllIntervalsHighPrice = useMemo(() => {
    if (allIntervalsHighValue == null) {
      return undefined;
    }

    return formatFiatAmount(allIntervalsHighValue, defaultAltCurrency.isoCode, {
      customPrecision: 'minimal',
      currencyAbbreviation: assetContext.currencyAbbreviation,
    });
  }, [
    allIntervalsHighValue,
    assetContext.currencyAbbreviation,
    defaultAltCurrency.isoCode,
  ]);

  const percentChangeToDisplay = useMemo(() => {
    if (selectedPoint) {
      return selectedPoint.percentChange;
    }
    if (displayData.data.length) {
      return displayData.percentChange;
    }
    return 0;
  }, [displayData.data.length, displayData.percentChange, selectedPoint]);

  const priceChangeToDisplay = useMemo(() => {
    if (selectedPoint) {
      return formatFiatAmount(
        selectedPoint.priceChange,
        defaultAltCurrency.isoCode,
        {
          customPrecision: 'minimal',
          currencyAbbreviation: assetContext.currencyAbbreviation,
        },
      );
    }
    if (displayData.data.length) {
      return formatFiatAmount(
        displayData.priceChange,
        defaultAltCurrency.isoCode,
        {
          customPrecision: 'minimal',
          currencyAbbreviation: assetContext.currencyAbbreviation,
        },
      );
    }
    return undefined;
  }, [
    assetContext.currencyAbbreviation,
    defaultAltCurrency.isoCode,
    displayData.data.length,
    displayData.priceChange,
    selectedPoint,
  ]);

  const chartPoints = useMemo(() => {
    return displayData.data;
  }, [displayData.data]);

  useEffect(() => {
    gestureStarted.current = false;
    setSelectedPoint(undefined);
  }, [chartPoints]);

  const MinAxisLabel = useCallback(() => {
    if (isChartLoading) {
      return null;
    }
    if (
      !displayData.data.length ||
      typeof displayData.minIndex !== 'number' ||
      displayData.minPoint?.value == null
    ) {
      return null;
    }

    return (
      <AxisLabel
        value={displayData.minPoint.value}
        index={displayData.minIndex}
        prevIndex={prevDisplayData.minIndex}
        arrayLength={displayData.data.length}
        currencyAbbreviation={currencyAbbreviation}
        type="min"
      />
    );
  }, [
    currencyAbbreviation,
    displayData.data.length,
    displayData.minIndex,
    displayData.minPoint?.value,
    isChartLoading,
    prevDisplayData.minIndex,
  ]);

  const MaxAxisLabel = useCallback(() => {
    if (isChartLoading) {
      return null;
    }
    if (
      !displayData.data.length ||
      typeof displayData.maxIndex !== 'number' ||
      displayData.maxPoint?.value == null
    ) {
      return null;
    }

    return (
      <AxisLabel
        value={displayData.maxPoint.value}
        index={displayData.maxIndex}
        prevIndex={prevDisplayData.maxIndex}
        arrayLength={displayData.data.length}
        currencyAbbreviation={currencyAbbreviation}
        type="max"
      />
    );
  }, [
    currencyAbbreviation,
    displayData.data.length,
    displayData.maxIndex,
    displayData.maxPoint?.value,
    isChartLoading,
    prevDisplayData.maxIndex,
  ]);

  const onPointSelected = useCallback(
    (p: GraphPoint) => {
      if (!gestureStarted.current || !chartPoints.length) {
        return;
      }
      const baselineValue = chartPoints[0]?.value ?? p.value;
      const percentChangeAtPoint = calculatePercentageDifference(
        p.value,
        baselineValue,
      );
      setSelectedPoint({
        date: p.date,
        price: p.value,
        priceChange: p.value - baselineValue,
        percentChange: percentChangeAtPoint,
      });
      haptic('impactLight');
    },
    [chartPoints],
  );

  const onGestureEnd = useCallback(async () => {
    if (!gestureStarted.current) {
      return;
    }
    await sleep(10);
    gestureStarted.current = false;
    setSelectedPoint(undefined);
    haptic('impactLight');
  }, []);

  const onGestureStarted = useCallback(() => {
    if (!chartPoints.length) {
      return;
    }
    gestureStarted.current = true;
    haptic('impactLight');
  }, [chartPoints.length]);

  const marketStatsSymbol = useMemo(() => {
    const abbreviation = (
      assetContext.currencyAbbreviation || ''
    ).toLowerCase();
    if (abbreviation === 'matic') {
      return 'pol';
    }
    return abbreviation;
  }, [assetContext.currencyAbbreviation]);

  const marketStatsCacheKey = useMemo(() => {
    return getMarketStatsCacheKey({
      fiatCode: defaultAltCurrency.isoCode,
      coin: marketStatsSymbol,
    });
  }, [defaultAltCurrency.isoCode, marketStatsSymbol]);

  const marketStats = useAppSelector(
    ({MARKET_STATS}: RootState) => MARKET_STATS.itemsByKey[marketStatsCacheKey],
  );

  useEffect(() => {
    if (!defaultAltCurrency.isoCode || !marketStatsSymbol) {
      return;
    }
    dispatch(
      fetchMarketStats({
        fiatCode: defaultAltCurrency.isoCode,
        coin: marketStatsSymbol,
      }),
    );
  }, [defaultAltCurrency.isoCode, dispatch, marketStatsSymbol]);

  const marketHigh52wToDisplay = useMemo(() => {
    if (marketStats?.high52w == null) {
      return '--';
    }
    return formatCompactCurrency(
      marketStats.high52w,
      defaultAltCurrency.isoCode,
    );
  }, [defaultAltCurrency.isoCode, marketStats?.high52w]);

  const marketLow52wToDisplay = useMemo(() => {
    if (marketStats?.low52w == null) {
      return '--';
    }
    return formatCompactCurrency(
      marketStats.low52w,
      defaultAltCurrency.isoCode,
    );
  }, [defaultAltCurrency.isoCode, marketStats?.low52w]);

  const priceDisplayIsoCode = useMemo(() => {
    return defaultAltCurrency.isoCode || 'USD';
  }, [defaultAltCurrency.isoCode]);

  const marketVolume24hToDisplay = useMemo(() => {
    if (marketStats?.volume24h == null) {
      return '--';
    }
    return formatCompactCurrency(marketStats.volume24h, priceDisplayIsoCode);
  }, [marketStats?.volume24h, priceDisplayIsoCode]);

  const marketCapToDisplay = useMemo(() => {
    if (marketStats?.marketCap == null) {
      return '--';
    }
    return formatCompactCurrency(marketStats.marketCap, priceDisplayIsoCode);
  }, [marketStats?.marketCap, priceDisplayIsoCode]);

  const circulatingSupplyToDisplay = useMemo(() => {
    if (marketStats?.circulatingSupply == null) {
      return '--';
    }
    return `${formatSupply(
      marketStats.circulatingSupply,
    )} ${currencyAbbreviation}`;
  }, [currencyAbbreviation, marketStats?.circulatingSupply]);

  const aboutToDisplay = useMemo(() => {
    const about =
      marketStats?.about ||
      (marketStatsSymbol === 'pol' ? POLYGON_ABOUT_FALLBACK : '');
    return about.replace(/\r\n/g, '\n').trim();
  }, [marketStats?.about, marketStatsSymbol]);

  useEffect(() => {
    setIsAboutExpanded(false);
  }, [
    assetContext.chain,
    assetContext.currencyAbbreviation,
    assetContext.tokenAddress,
  ]);

  const {coinColor, gradientBackgroundColor} = coin.theme ?? {
    coinColor: ProgressBlue,
    gradientBackgroundColor: theme.dark ? 'transparent' : White,
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitleText>{currencyName}</HeaderTitleText>,
      headerLeft: () => <HeaderBackButton />,
      // headerRight: () => (
      //   <HeaderRight>
      //     <CircleButton activeOpacity={ActiveOpacity} onPress={() => {}}>
      //       <RightIconSvg type="star" />
      //     </CircleButton>
      //     <CircleButton activeOpacity={ActiveOpacity} onPress={() => {}}>
      //       <RightIconSvg type="bell" />
      //     </CircleButton>
      //   </HeaderRight>
      // ),
    });
  }, [currencyName, navigation]);

  const timeframes: Array<{label: string; value: FiatRateInterval}> = [
    {label: 'All', value: 'ALL'},
    {label: '1D', value: '1D'},
    {label: '1W', value: '1W'},
    {label: '1M', value: '1M'},
    {label: '3M', value: '3M'},
    {label: '1Y', value: '1Y'},
    {label: '5Y', value: '5Y'},
  ];

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={{paddingBottom: 30}}
        refreshControl={
          <RefreshControl
            tintColor={theme.dark ? White : SlateDark}
            progressBackgroundColor={theme.dark ? SlateDark : White}
            refreshing={isRefreshing}
            onRefresh={onRefresh}
          />
        }>
        <TopSection>
          <AbbreviationLabel>{currencyAbbreviation}</AbbreviationLabel>
          <PriceText
            isLargeNumber={
              (formattedAllIntervalsHighPrice || formattedCurrentPrice).length >
              11
            }>
            {formattedCurrentPrice}
          </PriceText>
          <PercentRow>
            <Percentage
              percentageDifference={percentChangeToDisplay}
              hideArrow
              hideSign
              priceChange={priceChangeToDisplay}
              rangeLabel={rangeOrSelectedPointLabel}
            />
          </PercentRow>
        </TopSection>

        <ChartContainer>
          <ChartInner>
            <LineGraph
              points={chartPoints}
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
              SelectionDot={ChartSelectionDot}
              color={theme.dark && coinColor === '#000000' ? White : coinColor}
              style={{
                width: WIDTH,
                height: 200,
                marginTop: 10,
                opacity: isChartLoading ? 0.25 : 1,
              }}
            />
            {isChartLoading ? (
              <ChartLoaderOverlay pointerEvents="none">
                <Loader size={32} spinning />
              </ChartLoaderOverlay>
            ) : null}
          </ChartInner>
        </ChartContainer>

        <TimeframeContainer>
          <TimeframeRow>
            {timeframes.map(({label, value}) => {
              const active = selectedTimeframe === value;
              return (
                <TimeframePill
                  key={value}
                  active={active}
                  hitSlop={TimeframeHitSlop}
                  activeOpacity={ActiveOpacity}
                  onPress={() => setSelectedTimeframe(value)}>
                  <TimeframeText active={active}>{label}</TimeframeText>
                </TimeframePill>
              );
            })}
          </TimeframeRow>
        </TimeframeContainer>

        <ActionsContainer>
          <LinkingButtons
            maxWidth={500}
            buy={{
              cta: () => {
                dispatch(
                  Analytics.track('Clicked Buy Crypto', {
                    context: 'PriceChart',
                    coin: assetContext.currencyAbbreviation || '',
                    chain: assetContext.chain || '',
                  }),
                );
                navigation.navigate(ExternalServicesScreens.ROOT_BUY_AND_SELL, {
                  context: 'buyCrypto',
                  currencyAbbreviation: assetContext.currencyAbbreviation,
                  chain: assetContext.chain,
                });
              },
            }}
            sell={{
              cta: () => {
                dispatch(
                  Analytics.track('Clicked Sell Crypto', {
                    context: 'PriceChart',
                    coin: assetContext.currencyAbbreviation || '',
                    chain: assetContext.chain || '',
                  }),
                );
                navigation.navigate(ExternalServicesScreens.ROOT_BUY_AND_SELL, {
                  context: 'sellCrypto',
                  currencyAbbreviation: assetContext.currencyAbbreviation,
                  chain: assetContext.chain,
                });
              },
            }}
            swap={{
              cta: () => {
                dispatch(
                  Analytics.track('Clicked Swap Crypto', {
                    context: 'PriceChart',
                    coin: assetContext.currencyAbbreviation || '',
                    chain: assetContext.chain || '',
                  }),
                );
                navigation.navigate('GlobalSelect', {
                  context: 'swapFrom',
                  assetContext,
                });
              },
            }}
            receive={{
              cta: () => {
                dispatch(
                  Analytics.track('Clicked Receive Crypto', {
                    context: 'PriceChart',
                    coin: assetContext.currencyAbbreviation || '',
                    chain: assetContext.chain || '',
                  }),
                );
                dispatch(
                  receiveCrypto(
                    navigation as any,
                    'ExchangeRate',
                    assetContext,
                  ),
                );
              },
            }}
            send={{
              cta: () => {
                dispatch(
                  Analytics.track('Clicked Send Crypto', {
                    context: 'PriceChart',
                    coin: assetContext.currencyAbbreviation || '',
                    chain: assetContext.chain || '',
                  }),
                );
                dispatch(sendCrypto('ExchangeRate', assetContext));
              },
            }}
          />
        </ActionsContainer>

        {walletsForAsset.length ? (
          <>
            <SectionTitle>{`Your Wallets with ${currencyAbbreviation}`}</SectionTitle>

            {walletsForAsset.map(({wallet, ui}) => (
              <WalletCard
                key={ui.id}
                activeOpacity={ActiveOpacity}
                onPress={() => {
                  navigation.navigate('WalletDetails', {
                    walletId: wallet.credentials?.walletId || wallet.id,
                    key: keys[wallet.keyId],
                    copayerId: wallet.credentials?.copayerId,
                  });
                }}>
                <WalletLeft>
                  <WalletName numberOfLines={1} ellipsizeMode="tail">
                    {ui.walletName}
                  </WalletName>
                  <WalletSub numberOfLines={1} ellipsizeMode="tail">
                    {ui.receiveAddress
                      ? formatCryptoAddress(ui.receiveAddress)
                      : ''}
                  </WalletSub>
                </WalletLeft>
                <WalletRight>
                  <WalletAmount>
                    {hideAllBalances
                      ? '****'
                      : ui.network === Network.testnet
                      ? 'Test - No Value'
                      : ui.fiatBalanceFormat || '$0.00'}
                  </WalletAmount>
                  <RightChevron />
                </WalletRight>
              </WalletCard>
            ))}
          </>
        ) : null}

        <MarketCardContainer>
          <CardContainer style={{backgroundColor: 'transparent'}}>
            <MarketHeader>
              <MarketHeaderLeft>
                <View style={{width: 26, height: 26}}>
                  <CurrencyImage
                    img={assetCurrencyOption?.img || coin.img}
                    size={26}
                  />
                </View>
                <MarketTitle>{`${currencyAbbreviation} Market Price`}</MarketTitle>
              </MarketHeaderLeft>
              <MarketPrice>{formattedCurrentPrice}</MarketPrice>
            </MarketHeader>
            <Divider />
            <MarketBody>
              <SubSectionTitle>{`${currencyName} Stats`}</SubSectionTitle>

              <StatsGridRow>
                <StatBlock style={{paddingRight: 8}}>
                  <StatLabel>52wk high</StatLabel>
                  <StatValue>{marketHigh52wToDisplay}</StatValue>
                </StatBlock>
                <View>
                  <StatBlock>
                    <StatLabel>52wk low</StatLabel>
                    <StatValue>{marketLow52wToDisplay}</StatValue>
                  </StatBlock>
                </View>
                <StatBlock style={{alignItems: 'flex-end'}}>
                  <StatLabel>24h volume</StatLabel>
                  <StatValue>{marketVolume24hToDisplay}</StatValue>
                </StatBlock>
              </StatsGridRow>

              <View style={{marginTop: 14}} />
              <Divider />
              <View style={{marginTop: 14}} />

              <StatsGridRow>
                <StatBlock style={{paddingRight: 8}}>
                  <StatLabel>Circulating supply</StatLabel>
                  <StatValue>{circulatingSupplyToDisplay}</StatValue>
                </StatBlock>
                <StatBlock style={{alignItems: 'flex-end'}}>
                  <StatLabel>Market cap</StatLabel>
                  <StatValue>{marketCapToDisplay}</StatValue>
                </StatBlock>
              </StatsGridRow>

              <View style={{marginTop: 16}} />
              <Divider />

              <View style={{marginTop: 14}}>
                <SubSectionTitle style={{fontWeight: '400', marginBottom: 6}}>
                  About
                </SubSectionTitle>
                <AboutText
                  numberOfLines={isAboutExpanded ? undefined : 3}
                  ellipsizeMode={isAboutExpanded ? undefined : 'tail'}>
                  {aboutToDisplay || '--'}
                </AboutText>
                <View style={{marginTop: 15}}>
                  {!!aboutToDisplay ? (
                    <TouchableOpacity
                      accessibilityRole="button"
                      hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                      onPress={() => setIsAboutExpanded(prev => !prev)}>
                      <Link style={{fontSize: 13}}>
                        {isAboutExpanded ? 'Show less' : 'Show more'}
                      </Link>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </MarketBody>
          </CardContainer>
        </MarketCardContainer>
      </ScrollView>
    </ScreenContainer>
  );
};

const RightChevron = () => {
  const theme = useTheme();
  const stroke = theme.dark ? Slate : SlateDark;
  return (
    <Svg width={7} height={13} viewBox="0 0 10 16" fill="none">
      <Path
        d="M1 1L8 8L1 15"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default ExchangeRate;
