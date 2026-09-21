import React, {useEffect, useMemo, useRef, useState} from 'react';
import {ImageRequireSource, StyleSheet, View} from 'react-native';
import {NavigationProp, useNavigation} from '@react-navigation/native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import {useTheme} from '../../../../contexts';
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
import {
  type AssetRowPresentationResetToken,
  resolveAssetRowDisplayPresentation,
} from './assetRowLoading';

const supportedCurrencyOptionLookup = createSupportedCurrencyOptionLookup(
  SupportedCurrencyOptions,
);
const PRESERVED_ASSET_ROW_LOADING_DELAY_MS = 250;
const PERCENT_PILL_SKELETON_FILL_VALUE = '-2.22%';

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  iconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  assetInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  assetName: {
    fontSize: 13,
    fontWeight: '400',
  },
  assetAmount: {
    marginTop: 2,
    fontSize: 13,
    fontStyle: 'normal',
    fontWeight: '400',
    lineHeight: 20,
  },
  values: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginRight: 12,
  },
  deltaFiatSkeletonContainer: {
    alignItems: 'flex-end',
    marginTop: 6,
  },
  fiatAmount: {
    fontSize: 13,
    fontStyle: 'normal',
    fontWeight: '400',
    lineHeight: 20,
  },
  deltaFiat: {
    fontSize: 13,
    fontStyle: 'normal',
    fontWeight: '400',
    lineHeight: 20,
  },
  percentPill: {
    position: 'relative',
    borderRadius: 50,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    marginRight: 14,
  },
  percentSkeletonOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronContainer: {
    width: 9,
    alignItems: 'flex-end',
  },
});

const Row: React.FC<
  React.ComponentProps<typeof TouchableOpacity> & {isLast: boolean}
> = ({isLast, style, ...rest}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.row,
        {
          borderBottomWidth: isLast ? 0 : 1,
          borderBottomColor: theme.dark ? LightBlack : LightBlue,
        },
        style,
      ]}
      {...rest}
    />
  );
};

const IconContainer: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <View style={styles.iconContainer}>{children}</View>
);

const AssetInfo: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <View style={styles.assetInfo}>{children}</View>
);

const AssetName: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[styles.assetName, {color: theme.colors.text}, style]}
      {...rest}
    />
  );
};

const AssetAmount: React.FC<React.ComponentProps<typeof H7>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <H7
      style={[
        styles.assetAmount,
        {color: theme.dark ? Slate30 : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

const Values: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <View style={styles.values}>{children}</View>
);

const DeltaFiatSkeletonContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={styles.deltaFiatSkeletonContainer}>{children}</View>;

const FiatAmount: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[styles.fiatAmount, {color: theme.colors.text}, style]}
      {...rest}
    />
  );
};

const DeltaFiat: React.FC<
  React.ComponentProps<typeof BaseText> & {
    isPositive: boolean;
    hasPnl: boolean;
  }
> = ({isPositive, hasPnl, style, ...rest}) => {
  const theme = useTheme();
  const color = hasPnl
    ? getDifferenceColor(isPositive, theme.dark)
    : theme.dark
    ? Slate30
    : SlateDark;
  return <BaseText style={[styles.deltaFiat, {color}, style]} {...rest} />;
};

const PercentPill: React.FC<{children?: React.ReactNode}> = ({children}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.percentPill,
        {
          borderColor: theme.dark ? SlateDark : Slate30,
          backgroundColor: theme.dark ? 'transparent' : White,
        },
      ]}>
      {children}
    </View>
  );
};

const PercentText: React.FC<
  React.ComponentProps<typeof BaseText> & {
    isPositive: boolean;
    hasPnl: boolean;
  }
> = ({isPositive, hasPnl, style, ...rest}) => {
  const theme = useTheme();
  const color = hasPnl
    ? getDifferenceColor(isPositive, theme.dark)
    : theme.dark
    ? Slate30
    : SlateDark;
  return <BaseText style={[styles.deltaFiat, {color}, style]} {...rest} />;
};

const PercentSkeletonAnchor: React.FC<
  React.ComponentProps<typeof PercentText>
> = ({style, ...rest}) => (
  <PercentText style={[{opacity: 0}, style]} {...rest} />
);

const PercentSkeletonOverlay: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={styles.percentSkeletonOverlay}>{children}</View>;

const ChevronContainer: React.FC<{
  visible: boolean;
  children?: React.ReactNode;
}> = ({visible, children}) => (
  <View style={[styles.chevronContainer, {opacity: visible ? 1 : 0}]}>
    {children}
  </View>
);

interface Props {
  item: AssetRowItem;
  isLast: boolean;
  keyId?: string;
  isPnlLoading?: boolean;
  isPopulateLoading?: boolean;
  forceSkeleton?: boolean;
  presentationResetToken?: AssetRowPresentationResetToken;
  img?: SupportedCurrencyOption['img'];
  imgSrc?: ImageRequireSource;
}

const AssetRow: React.FC<Props> = ({
  item,
  isLast,
  keyId,
  isPnlLoading,
  isPopulateLoading,
  forceSkeleton,
  presentationResetToken,
  img,
  imgSrc,
}) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const theme = useTheme();
  const hideAllBalances = useAppSelector(({APP}) => APP.hideAllBalances);
  const rowLoading = !!(isPnlLoading || isPopulateLoading);
  const shouldForceSkeleton = !!forceSkeleton;
  const lastSettledItemRef = useRef<
    | {
        item: AssetRowItem;
        presentationResetToken?: AssetRowPresentationResetToken;
      }
    | undefined
  >(undefined);
  const [loadingDelayElapsed, setLoadingDelayElapsed] = useState(false);
  const preservedEntry = lastSettledItemRef.current;
  const preservedItem =
    preservedEntry &&
    preservedEntry.presentationResetToken === presentationResetToken
      ? preservedEntry.item
      : undefined;

  useEffect(() => {
    if (!rowLoading) {
      lastSettledItemRef.current = {
        item,
        presentationResetToken,
      };
      setLoadingDelayElapsed(false);
      return;
    }

    if (!preservedItem) {
      setLoadingDelayElapsed(true);
      return;
    }

    setLoadingDelayElapsed(false);
    const timeout = setTimeout(() => {
      setLoadingDelayElapsed(true);
    }, PRESERVED_ASSET_ROW_LOADING_DELAY_MS);

    return () => clearTimeout(timeout);
  }, [item, presentationResetToken, preservedItem, rowLoading]);
  const {displayItem, shouldShowSkeleton} = useMemo(() => {
    return resolveAssetRowDisplayPresentation({
      item,
      preservedItem,
      preservedItemResetToken: preservedEntry?.presentationResetToken,
      presentationResetToken,
      isLoading: rowLoading,
      loadingDelayElapsed,
    });
  }, [
    item,
    loadingDelayElapsed,
    preservedEntry?.presentationResetToken,
    preservedItem,
    presentationResetToken,
    rowLoading,
  ]);
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
  const isCryptoAmountLoading =
    shouldShowSkeleton &&
    !!isPopulateLoading &&
    !isPnlLoading &&
    !String(displayItem.cryptoAmount || '').trim();
  const shouldShowDeltaFiatSkeleton =
    shouldShowSkeleton &&
    (shouldShowDeltaFiat || showPnlPlaceholder || showScopedPnlLoading);

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
      testID={`home-asset-row-item-${displayItem.currencyAbbreviation}-${displayItem.chain}`}
      accessibilityLabel={`${displayItem.name} asset`}
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
            ) : (
              <>
                <FiatAmount>{fiatAmountDisplay}</FiatAmount>
                {shouldShowDeltaFiatSkeleton ? (
                  <DeltaFiatSkeletonContainer>
                    <SkeletonPlaceholder
                      backgroundColor={
                        theme.dark ? CharcoalBlack : NeutralSlate
                      }
                      highlightColor={theme.dark ? LightBlack : GhostWhite}>
                      <SkeletonPlaceholder.Item
                        width={45}
                        height={12}
                        borderRadius={2}
                      />
                    </SkeletonPlaceholder>
                  </DeltaFiatSkeletonContainer>
                ) : shouldShowDeltaFiat ? (
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
              <>
                <PercentSkeletonAnchor isPositive={false} hasPnl>
                  {PERCENT_PILL_SKELETON_FILL_VALUE}
                </PercentSkeletonAnchor>
                <PercentSkeletonOverlay>
                  <SkeletonPlaceholder
                    backgroundColor={theme.dark ? CharcoalBlack : NeutralSlate}
                    highlightColor={theme.dark ? LightBlack : GhostWhite}>
                    <SkeletonPlaceholder.Item
                      width={40}
                      height={12}
                      borderRadius={2}
                    />
                  </SkeletonPlaceholder>
                </PercentSkeletonOverlay>
              </>
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
