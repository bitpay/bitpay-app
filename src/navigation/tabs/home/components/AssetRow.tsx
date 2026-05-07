import React, {useEffect, useMemo, useRef, useState} from 'react';
import {ImageRequireSource} from 'react-native';
import {NavigationProp, useNavigation} from '@react-navigation/native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import styled, {useTheme} from 'styled-components/native';
import type {RootStackParamList} from '../../../../Root';
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
import {createSupportedCurrencyOptionLookup} from '../../../../utils/portfolio/supportedCurrencyOptionsLookup';
import {resolveAssetRowDisplayPresentation} from './assetRowLoading';

const supportedCurrencyOptionLookup = createSupportedCurrencyOptionLookup(
  SupportedCurrencyOptions,
);
const PRESERVED_ASSET_ROW_LOADING_DELAY_MS = 250;

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
  keyId?: string;
  isFiatLoading?: boolean;
  isPopulateLoading?: boolean;
  forceSkeleton?: boolean;
  img?: SupportedCurrencyOption['img'];
  imgSrc?: ImageRequireSource;
}

const AssetRow: React.FC<Props> = ({
  item,
  isLast,
  keyId,
  isFiatLoading,
  isPopulateLoading,
  forceSkeleton,
  img,
  imgSrc,
}) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const theme = useTheme();
  const hideAllBalances = useAppSelector(({APP}) => APP.hideAllBalances);
  const rowLoading = !!(isFiatLoading || isPopulateLoading);
  const shouldForceSkeleton = !!forceSkeleton;
  const lastSettledItemRef = useRef<AssetRowItem | undefined>(undefined);
  const [loadingDelayElapsed, setLoadingDelayElapsed] = useState(false);

  useEffect(() => {
    if (!rowLoading) {
      lastSettledItemRef.current = item;
      setLoadingDelayElapsed(false);
      return;
    }

    if (!lastSettledItemRef.current) {
      setLoadingDelayElapsed(true);
      return;
    }

    setLoadingDelayElapsed(false);
    const timeout = setTimeout(() => {
      setLoadingDelayElapsed(true);
    }, PRESERVED_ASSET_ROW_LOADING_DELAY_MS);

    return () => clearTimeout(timeout);
  }, [item, rowLoading]);
  const {displayItem, shouldShowSkeleton} = useMemo(() => {
    return resolveAssetRowDisplayPresentation({
      item,
      preservedItem: lastSettledItemRef.current,
      isLoading: rowLoading,
      loadingDelayElapsed,
    });
  }, [item, loadingDelayElapsed, rowLoading]);
  const option = useMemo(() => {
    return supportedCurrencyOptionLookup.getOption({
      currencyAbbreviation: displayItem.currencyAbbreviation,
      chain: displayItem.chain,
      tokenAddress: displayItem.tokenAddress,
    });
  }, [
    displayItem.chain,
    displayItem.currencyAbbreviation,
    displayItem.tokenAddress,
  ]);
  const hasRate = !!displayItem.hasRate;
  const hasPnl = !!displayItem.hasPnl;
  const showPnlPlaceholder = !!displayItem.showPnlPlaceholder;
  const showScopedPnlLoading = !!displayItem.showScopedPnlLoading;
  const shouldShowRightSide =
    hasRate || showPnlPlaceholder || showScopedPnlLoading;
  const canNavigate = useMemo(() => {
    return canNavigateToExchangeRateForAssetRowItem({
      item: displayItem,
      options: option ? [option] : [],
    });
  }, [displayItem, option]);
  const shouldShowDeltaFiat = hasPnl;
  const shouldShowDeltaFiatSkeleton =
    shouldShowDeltaFiat || showPnlPlaceholder || showScopedPnlLoading;
  const isCryptoAmountLoading =
    shouldShowSkeleton &&
    !!isPopulateLoading &&
    !isFiatLoading &&
    !String(displayItem.cryptoAmount || '').trim();

  const fiatAmountDisplay = hasRate ? displayItem.fiatAmount : '— ';

  const handlePress = () => {
    if (!canNavigate || !option) {
      return;
    }

    navigation.navigate('ExchangeRate', {
      currencyName: option.currencyName || displayItem.name,
      currencyAbbreviation:
        option.currencyAbbreviation || displayItem.currencyAbbreviation,
      chain: option.chain || displayItem.chain,
      ...(keyId ? {keyId} : {}),
      tokenAddress: option.tokenAddress || displayItem.tokenAddress,
      chartType: 'assetBalanceHistory',
    });
  };

  if (shouldForceSkeleton) {
    return (
      <Row activeOpacity={1} isLast={isLast}>
        <IconContainer>
          <SkeletonPlaceholder
            backgroundColor={theme.dark ? CharcoalBlack : NeutralSlate}
            highlightColor={theme.dark ? LightBlack : GhostWhite}>
            <SkeletonPlaceholder.Item
              width={40}
              height={40}
              borderRadius={20}
            />
          </SkeletonPlaceholder>
        </IconContainer>

        <AssetInfo>
          <SkeletonPlaceholder
            backgroundColor={theme.dark ? CharcoalBlack : NeutralSlate}
            highlightColor={theme.dark ? LightBlack : GhostWhite}>
            <SkeletonPlaceholder.Item
              width={120}
              height={13}
              borderRadius={2}
            />
            <SkeletonPlaceholder.Item
              width={88}
              height={12}
              borderRadius={2}
              marginTop={8}
            />
          </SkeletonPlaceholder>
        </AssetInfo>

        <Values>
          <SkeletonPlaceholder
            backgroundColor={theme.dark ? CharcoalBlack : NeutralSlate}
            highlightColor={theme.dark ? LightBlack : GhostWhite}>
            <SkeletonPlaceholder.Item
              width={72}
              height={12}
              borderRadius={2}
              marginBottom={6}
              marginTop={3}
            />
            <SkeletonPlaceholder.Item width={54} height={12} borderRadius={2} />
          </SkeletonPlaceholder>
        </Values>

        <PercentPill>
          <SkeletonPlaceholder
            backgroundColor={theme.dark ? CharcoalBlack : NeutralSlate}
            highlightColor={theme.dark ? LightBlack : GhostWhite}>
            <SkeletonPlaceholder.Item width={48} height={12} borderRadius={2} />
          </SkeletonPlaceholder>
        </PercentPill>

        <ChevronContainer visible={false}>
          <ChevronRightSvg width={9} height={15} gray />
        </ChevronContainer>
      </Row>
    );
  }

  return (
    <Row
      activeOpacity={canNavigate ? ActiveOpacity : 1}
      isLast={isLast}
<<<<<<< HEAD
      testID={`home-asset-row-item-${item.currencyAbbreviation}-${item.chain}`}
      accessibilityLabel={`${item.name} asset`}
=======
      testID={`home-asset-row-item-${displayItem.currencyAbbreviation}-${displayItem.chain}`}
      accessibilityLabel={`${displayItem.name} asset`}
>>>>>>> c22e129129325f5c727adb0e05929fde8aa32208
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
          {displayItem.name}
        </AssetName>
        {hideAllBalances ? (
          <AssetAmount>
            {maskIfHidden(true, displayItem.cryptoAmount)}
          </AssetAmount>
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
          <AssetAmount>{displayItem.cryptoAmount}</AssetAmount>
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
                  <DeltaFiat
                    isPositive={displayItem.isPositive}
                    hasPnl={hasPnl}>
                    {maskIfHidden(true, displayItem.deltaFiat)}
                  </DeltaFiat>
                ) : null}
              </>
            ) : shouldShowSkeleton ? (
              <SkeletonPlaceholder
                backgroundColor={theme.dark ? CharcoalBlack : NeutralSlate}
                highlightColor={theme.dark ? LightBlack : GhostWhite}>
                <SkeletonPlaceholder.Item
                  width={72}
                  height={12}
                  borderRadius={2}
                  marginBottom={shouldShowDeltaFiatSkeleton ? 6 : 0}
                  marginTop={3}
                />
                {shouldShowDeltaFiatSkeleton ? (
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
                  <DeltaFiat
                    isPositive={displayItem.isPositive}
                    hasPnl={hasPnl}>
                    {displayItem.deltaFiat}
                  </DeltaFiat>
                ) : null}
              </>
            )}
          </Values>

          <PercentPill>
            {shouldShowSkeleton ? (
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
              <PercentText isPositive={displayItem.isPositive} hasPnl={hasPnl}>
                {displayItem.deltaPercent}
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
