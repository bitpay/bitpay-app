import React, {useMemo} from 'react';
import {ImageRequireSource} from 'react-native';
import {NavigationProp, useNavigation} from '@react-navigation/native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import styled, {useTheme} from 'styled-components/native';
import type {RootStackParamList} from '../../../../Root';
import {
  FIAT_RATE_SERIES_CACHED_INTERVALS,
  hasValidSeriesForCoin,
} from '../../../../store/rate/rate.models';
import {TouchableOpacity} from '../../../../components/base/TouchableOpacity';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';
import {ActiveOpacity} from '../../../../components/styled/Containers';
import {BaseText, H7} from '../../../../components/styled/Text';
import {
  SupportedCurrencyOptions,
  type SupportedCurrencyOption,
} from '../../../../constants/SupportedCurrencyOptions';
import {
  CharcoalBlack,
  GhostWhite,
  LightBlack,
  LightBlue,
  NeutralSlate,
  Slate30,
  SlateDark,
  White,
} from '../../../../styles/colors';
import {getDifferenceColor} from '../../../../components/percentage/Percentage';
import {useAppSelector} from '../../../../utils/hooks';
import {maskIfHidden} from '../../../../utils/hideBalances';
import ChevronRightSvg from './ChevronRightSvg';
import {
  AssetRowItem,
  canNavigateToExchangeRateForAssetRowItem,
} from '../../../../utils/portfolio/assets';
import {normalizeFiatRateSeriesCoin} from '../../../../utils/portfolio/core/pnl/rates';
import {createSupportedCurrencyOptionLookup} from '../../../../utils/portfolio/supportedCurrencyOptionsLookup';

const supportedCurrencyOptionLookup = createSupportedCurrencyOptionLookup(
  SupportedCurrencyOptions,
);

const Row = styled(TouchableOpacity)<{isLast: boolean}>`
  flex-direction: row;
  align-items: center;
  padding: 14px 0;
  border-bottom-width: ${({isLast}) => (isLast ? 0 : 1)}px;
  border-bottom-color: ${({theme: {dark}}) => (dark ? LightBlack : LightBlue)};
`;

const IconContainer = styled.View`
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
`;

const AssetInfo = styled.View`
  flex: 1;
  justify-content: center;
`;

const AssetName = styled(BaseText)`
  font-size: 13px;
  font-weight: 400;
  color: ${({theme}) => theme.colors.text};
`;

const AssetAmount = styled(H7)`
  margin-top: 2px;
  font-size: 13px;
  font-style: normal;
  font-weight: 400;
  line-height: 20px;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
`;

const Values = styled.View`
  align-items: flex-end;
  justify-content: center;
  margin-right: 12px;
`;

const FiatAmount = styled(BaseText)`
  font-size: 13px;
  font-style: normal;
  font-weight: 400;
  line-height: 20px;
  color: ${({theme}) => theme.colors.text};
`;

const DeltaFiat = styled(BaseText)<{isPositive: boolean; hasPnl: boolean}>`
  font-size: 13px;
  font-style: normal;
  font-weight: 400;
  line-height: 20px;
  color: ${({theme: {dark}, isPositive, hasPnl}) =>
    hasPnl ? getDifferenceColor(isPositive, dark) : dark ? Slate30 : SlateDark};
`;

const PercentPill = styled.View`
  border-radius: 50px;
  padding: 8px 10px;
  border: 1px solid ${({theme: {dark}}) => (dark ? SlateDark : Slate30)};
  background-color: ${({theme: {dark}}) => (dark ? 'transparent' : White)};
  margin-right: 14px;
`;

const PercentText = styled(BaseText)<{isPositive: boolean; hasPnl: boolean}>`
  font-size: 13px;
  font-style: normal;
  font-weight: 400;
  line-height: 20px;
  color: ${({theme: {dark}, isPositive, hasPnl}) =>
    hasPnl ? getDifferenceColor(isPositive, dark) : dark ? Slate30 : SlateDark};
`;

const ChevronContainer = styled.View<{visible: boolean}>`
  width: 9px;
  align-items: flex-end;
  opacity: ${({visible}) => (visible ? 1 : 0)};
`;

interface Props {
  item: AssetRowItem;
  isLast: boolean;
  isFiatLoading?: boolean;
  isPopulateLoading?: boolean;
  img?: SupportedCurrencyOption['img'];
  imgSrc?: ImageRequireSource;
}

const AssetRow: React.FC<Props> = ({
  item,
  isLast,
  isFiatLoading,
  isPopulateLoading,
  img,
  imgSrc,
}) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const theme = useTheme();
  const hideAllBalances = useAppSelector(({APP}) => APP.hideAllBalances);
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const fiatRateSeriesCache = useAppSelector(
    ({RATE}) => RATE.fiatRateSeriesCache,
  );
  const option = useMemo(() => {
    return supportedCurrencyOptionLookup.getOption({
      currencyAbbreviation: item.currencyAbbreviation,
      chain: item.chain,
      tokenAddress: item.tokenAddress,
    });
  }, [item.chain, item.currencyAbbreviation, item.tokenAddress]);
  const hasRate = !!item.hasRate;
  const hasPnl = !!item.hasPnl;
  const showPnlPlaceholder = !!item.showPnlPlaceholder;
  const shouldShowRightSide = hasRate || showPnlPlaceholder;
  const hasHistoricalV4Rates = useMemo(() => {
    return hasValidSeriesForCoin({
      cache: fiatRateSeriesCache,
      fiatCodeUpper: (defaultAltCurrency?.isoCode || 'USD').toUpperCase(),
      normalizedCoin: normalizeFiatRateSeriesCoin(item.currencyAbbreviation),
      intervals: FIAT_RATE_SERIES_CACHED_INTERVALS,
    });
  }, [
    defaultAltCurrency?.isoCode,
    fiatRateSeriesCache,
    item.currencyAbbreviation,
  ]);
  const canNavigate = useMemo(() => {
    return (
      hasHistoricalV4Rates &&
      canNavigateToExchangeRateForAssetRowItem({
        item,
        options: option ? [option] : [],
      })
    );
  }, [hasHistoricalV4Rates, item, option]);
  const shouldShowDeltaFiat = hasPnl;
  const isCryptoAmountLoading = !!isPopulateLoading && !isFiatLoading;

  const fiatAmountDisplay = hasRate ? item.fiatAmount : '— ';

  const handlePress = () => {
    if (!canNavigate || !option) {
      return;
    }

    navigation.navigate('ExchangeRate', {
      currencyName: option.currencyName || item.name,
      currencyAbbreviation:
        option.currencyAbbreviation || item.currencyAbbreviation,
      chain: option.chain || item.chain,
      tokenAddress: option.tokenAddress || item.tokenAddress,
    });
  };

  return (
    <Row
      activeOpacity={canNavigate ? ActiveOpacity : 1}
      isLast={isLast}
      onPress={canNavigate ? handlePress : undefined}>
      <IconContainer>
        <CurrencyImage
          img={img ?? option?.img}
          imgSrc={
            imgSrc ??
            (option && typeof option.imgSrc === 'number'
              ? option.imgSrc
              : undefined)
          }
          size={40}
        />
      </IconContainer>

      <AssetInfo>
        <AssetName numberOfLines={1} ellipsizeMode="tail">
          {item.name}
        </AssetName>
        {hideAllBalances ? (
          <AssetAmount>{maskIfHidden(true, item.cryptoAmount)}</AssetAmount>
        ) : isCryptoAmountLoading ? (
          <SkeletonPlaceholder
            backgroundColor={theme.dark ? CharcoalBlack : NeutralSlate}
            highlightColor={theme.dark ? LightBlack : GhostWhite}>
            <SkeletonPlaceholder.Item
              width={80}
              height={12}
              borderRadius={2}
              marginTop={8}
            />
          </SkeletonPlaceholder>
        ) : (
          <AssetAmount>{item.cryptoAmount}</AssetAmount>
        )}
      </AssetInfo>

      {shouldShowRightSide ? (
        <>
          <Values>
            {hideAllBalances ? (
              <>
                <FiatAmount>
                  {hasRate ? maskIfHidden(true, fiatAmountDisplay) : '—'}
                </FiatAmount>
                {shouldShowDeltaFiat ? (
                  <DeltaFiat isPositive={item.isPositive} hasPnl={hasPnl}>
                    {maskIfHidden(true, item.deltaFiat)}
                  </DeltaFiat>
                ) : null}
              </>
            ) : (isFiatLoading || isPopulateLoading) && !showPnlPlaceholder ? (
              <SkeletonPlaceholder
                backgroundColor={theme.dark ? CharcoalBlack : NeutralSlate}
                highlightColor={theme.dark ? LightBlack : GhostWhite}>
                <SkeletonPlaceholder.Item
                  width={72}
                  height={12}
                  borderRadius={2}
                  marginBottom={shouldShowDeltaFiat ? 6 : 0}
                  marginTop={3}
                />
                {shouldShowDeltaFiat ? (
                  <SkeletonPlaceholder.Item
                    width={54}
                    height={12}
                    borderRadius={2}
                  />
                ) : null}
              </SkeletonPlaceholder>
            ) : (
              <>
                <FiatAmount>{fiatAmountDisplay}</FiatAmount>
                {shouldShowDeltaFiat ? (
                  <DeltaFiat isPositive={item.isPositive} hasPnl={hasPnl}>
                    {item.deltaFiat}
                  </DeltaFiat>
                ) : null}
              </>
            )}
          </Values>

          <PercentPill>
            {(isFiatLoading || isPopulateLoading) && !showPnlPlaceholder ? (
              <SkeletonPlaceholder
                backgroundColor={theme.dark ? CharcoalBlack : NeutralSlate}
                highlightColor={theme.dark ? LightBlack : GhostWhite}>
                <SkeletonPlaceholder.Item
                  width={48}
                  height={12}
                  borderRadius={2}
                />
              </SkeletonPlaceholder>
            ) : (
              <PercentText isPositive={item.isPositive} hasPnl={hasPnl}>
                {item.deltaPercent}
              </PercentText>
            )}
          </PercentPill>
        </>
      ) : null}

      <ChevronContainer visible={canNavigate}>
        <ChevronRightSvg width={9} height={15} gray />
      </ChevronContainer>
    </Row>
  );
};

export default React.memo(AssetRow);
