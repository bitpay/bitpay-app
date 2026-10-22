import React, {useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import Svg, {Circle, G} from 'react-native-svg';
import {useTheme} from '../../../../contexts';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {
  ActiveOpacity,
  ScreenGutter,
} from '../../../../components/styled/Containers';
import {BaseText} from '../../../../components/styled/Text';
import {HomeSectionTitle} from './Styled';
import ChevronRightSvg from './ChevronRightSvg';
import {useAppSelector} from '../../../../utils/hooks';
import type {Key, Wallet} from '../../../../store/wallet/wallet.models';
import {
  buildAllocationDataFromWalletRows,
  type AllocationWallet,
  toAllocationWallet,
} from '../../../../utils/portfolio/allocation';
import {
  getVisibleWalletsFromKeys,
  walletsHaveNonZeroLiveBalance,
} from '../../../../utils/portfolio/assets';
import {
  Black,
  CharcoalBlack,
  GhostWhite,
  LightBlack,
  NeutralSlate,
  Slate30,
  SlateDark,
  White,
} from '../../../../styles/colors';

export type AllocationLegendItem = {
  key: string;
  label: string;
  isOther?: boolean;
  value?: string;
  color: {
    light: string;
    dark: string;
  };
};

export type AllocationSlice = {
  key: string;
  value: number;
  color: {
    light: string;
    dark: string;
  };
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 0,
    marginRight: parseInt(ScreenGutter, 10),
    marginBottom: 0,
    marginLeft: 16,
  },
  headerAction: {
    padding: 6,
  },
  card: {
    marginTop: 12,
    marginHorizontal: parseInt(ScreenGutter, 10),
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  donutContainer: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  legendGrid: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendColumn: {
    flex: 1,
    gap: 10,
  },
  legendItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
  },
  legendText: {
    fontSize: 13,
    fontStyle: 'normal',
    fontWeight: '400',
    lineHeight: 20,
  },
});

const Container: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <View style={styles.container}>{children}</View>
);

const Header: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <View style={styles.header}>{children}</View>
);

const HeaderAction: React.FC<React.ComponentProps<typeof TouchableOpacity>> = ({
  style,
  ...rest
}) => <TouchableOpacity style={[styles.headerAction, style]} {...rest} />;

const Card: React.FC<{style?: any; children?: React.ReactNode}> = ({
  style,
  children,
}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          borderColor: theme.dark ? SlateDark : Slate30,
          backgroundColor: theme.dark ? 'transparent' : White,
        },
        style,
      ]}>
      {children}
    </View>
  );
};

const ContentRow: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <View style={styles.contentRow}>{children}</View>
);

const DonutContainer: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <View style={styles.donutContainer}>{children}</View>
);

const LegendGrid: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <View style={styles.legendGrid}>{children}</View>
);

const LegendColumn: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <View style={styles.legendColumn}>{children}</View>
);

const LegendItemRow: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <View style={styles.legendItemRow}>{children}</View>
);

const LegendDot: React.FC<{color: string}> = ({color}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.legendDot,
        {
          backgroundColor: color,
          borderColor: theme.dark ? SlateDark : Slate30,
        },
      ]}
    />
  );
};

const LegendText: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <BaseText style={styles.legendText}>{children}</BaseText>
);

const LegendCurrencyAbbreviationText: React.FC<{
  children?: React.ReactNode;
}> = ({children}) => {
  const theme = useTheme();
  return (
    <Text style={[styles.legendText, {color: theme.dark ? White : Black}]}>
      {children}
    </Text>
  );
};

const LegendPercentageText: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => {
  const theme = useTheme();
  return (
    <Text
      style={[styles.legendText, {color: theme.dark ? Slate30 : SlateDark}]}>
      {children}
    </Text>
  );
};

const DonutChart = ({
  size,
  strokeWidth,
  slices,
}: {
  size: number;
  strokeWidth: number;
  slices: AllocationSlice[];
}) => {
  const theme = useTheme();
  const radius = (size - strokeWidth) / 2;
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const hasValidTotal = Number.isFinite(total) && total > 0;
  const hasSlices = slices.length > 0;
  const shouldRenderNeutralRing = !hasSlices || !hasValidTotal;
  const segmentBorderColor = theme.dark ? SlateDark : Slate30;

  const isSingleSliceFull =
    slices.length === 1 &&
    total > 0 &&
    Math.abs((slices[0]?.value || 0) - total) < 1e-6;

  const gap = 2;
  const edgeBorderWidth = 1;
  const outerEdgeRadius = radius + strokeWidth / 2 - edgeBorderWidth / 2;
  const innerEdgeRadius = radius - strokeWidth / 2 + edgeBorderWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const outerCircumference = 2 * Math.PI * outerEdgeRadius;
  const innerCircumference = 2 * Math.PI * innerEdgeRadius;
  const gapAngle = gap / radius;

  if (shouldRenderNeutralRing) {
    return (
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G rotation={-90} originX={size / 2} originY={size / 2}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={segmentBorderColor}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
        </G>
      </Svg>
    );
  }

  const sliceFragments: React.ReactElement[] = [];
  let cumulativeAngle = 0;

  if (!isSingleSliceFull) {
    for (const slice of slices) {
      const color = theme.dark ? slice.color.dark : slice.color.light;
      const segmentAngle = (slice.value / total) * 2 * Math.PI;
      const adjustedSegmentAngle = Math.max(0, segmentAngle - gapAngle);

      const dashArray = `${adjustedSegmentAngle * radius} ${circumference}`;
      const dashOffset = -((cumulativeAngle + gapAngle / 2) * radius);

      const outerDashArray = `${
        adjustedSegmentAngle * outerEdgeRadius
      } ${outerCircumference}`;
      const outerDashOffset = -(
        (cumulativeAngle + gapAngle / 2) *
        outerEdgeRadius
      );

      const innerDashArray = `${
        adjustedSegmentAngle * innerEdgeRadius
      } ${innerCircumference}`;
      const innerDashOffset = -(
        (cumulativeAngle + gapAngle / 2) *
        innerEdgeRadius
      );

      cumulativeAngle += segmentAngle;

      sliceFragments.push(
        <React.Fragment key={slice.key}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={dashArray}
            strokeDashoffset={dashOffset}
            strokeLinecap="butt"
            fill="transparent"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={outerEdgeRadius}
            stroke={segmentBorderColor}
            strokeWidth={edgeBorderWidth}
            strokeDasharray={outerDashArray}
            strokeDashoffset={outerDashOffset}
            strokeLinecap="butt"
            fill="transparent"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={innerEdgeRadius}
            stroke={segmentBorderColor}
            strokeWidth={edgeBorderWidth}
            strokeDasharray={innerDashArray}
            strokeDashoffset={innerDashOffset}
            strokeLinecap="butt"
            fill="transparent"
          />
        </React.Fragment>,
      );
    }
  }

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <G rotation={-90} originX={size / 2} originY={size / 2}>
        {isSingleSliceFull ? null : (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={segmentBorderColor}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
        )}
        {isSingleSliceFull ? (
          <>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={theme.dark ? slices[0].color.dark : slices[0].color.light}
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={outerEdgeRadius}
              stroke={segmentBorderColor}
              strokeWidth={edgeBorderWidth}
              fill="transparent"
            />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={innerEdgeRadius}
              stroke={segmentBorderColor}
              strokeWidth={edgeBorderWidth}
              fill="transparent"
            />
          </>
        ) : null}
        {sliceFragments}
      </G>
    </Svg>
  );
};

export const AllocationDonutLegendCard: React.FC<{
  legendItems: AllocationLegendItem[];
  slices: AllocationSlice[];
  style?: any;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  isLoading?: boolean;
}> = ({legendItems, slices, style, header, footer, isLoading}) => {
  const theme = useTheme();
  const {t} = useTranslation();
  const leftColumn = legendItems.slice(0, 3);
  const rightColumn = legendItems.slice(3);
  const renderLegendColumn = (items: AllocationLegendItem[]) => {
    return (
      <LegendColumn>
        {items.map(item => {
          const dotColor = theme.dark ? item.color.dark : item.color.light;

          return (
            <LegendItemRow key={item.key}>
              <LegendDot color={dotColor} />
              <LegendText>
                <LegendCurrencyAbbreviationText>
                  {item.isOther ? t('Other') : item.label}
                </LegendCurrencyAbbreviationText>
                {item.value ? (
                  <LegendPercentageText>{` ${item.value}`}</LegendPercentageText>
                ) : null}
              </LegendText>
            </LegendItemRow>
          );
        })}
      </LegendColumn>
    );
  };

  if (isLoading) {
    const holeColor =
      (theme as any)?.colors?.background || (theme.dark ? Black : White);

    const skeletonBackgroundColor = theme.dark ? CharcoalBlack : NeutralSlate;
    const skeletonHighlightColor = theme.dark ? LightBlack : GhostWhite;
    const skeletonRowHeight = 12;
    const skeletonRowWidth = 68;
    const skeletonRowBorderRadius = 2;

    return (
      <Card style={style}>
        {header}
        <View style={{position: 'relative'}}>
          <SkeletonPlaceholder
            backgroundColor={skeletonBackgroundColor}
            highlightColor={skeletonHighlightColor}>
            <SkeletonPlaceholder.Item flexDirection="row" alignItems="center">
              <SkeletonPlaceholder.Item
                width={80}
                height={80}
                borderRadius={40}
              />
              <SkeletonPlaceholder.Item marginLeft={25} flexDirection="row">
                <SkeletonPlaceholder.Item>
                  <SkeletonPlaceholder.Item
                    width={skeletonRowWidth}
                    height={skeletonRowHeight}
                    borderRadius={skeletonRowBorderRadius}
                    marginBottom={skeletonRowHeight}
                  />
                  <SkeletonPlaceholder.Item
                    width={skeletonRowWidth}
                    height={skeletonRowHeight}
                    borderRadius={skeletonRowBorderRadius}
                    marginBottom={skeletonRowHeight}
                  />
                  <SkeletonPlaceholder.Item
                    width={skeletonRowWidth}
                    height={skeletonRowHeight}
                    borderRadius={skeletonRowBorderRadius}
                  />
                </SkeletonPlaceholder.Item>

                <SkeletonPlaceholder.Item marginLeft={40}>
                  <SkeletonPlaceholder.Item
                    width={skeletonRowWidth}
                    height={skeletonRowHeight}
                    borderRadius={skeletonRowBorderRadius}
                    marginBottom={skeletonRowHeight}
                  />
                  <SkeletonPlaceholder.Item
                    width={skeletonRowWidth}
                    height={skeletonRowHeight}
                    borderRadius={skeletonRowBorderRadius}
                    marginBottom={skeletonRowHeight}
                  />
                  <SkeletonPlaceholder.Item
                    width={skeletonRowWidth}
                    height={skeletonRowHeight}
                    borderRadius={skeletonRowBorderRadius}
                  />
                </SkeletonPlaceholder.Item>
              </SkeletonPlaceholder.Item>
            </SkeletonPlaceholder.Item>
          </SkeletonPlaceholder>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 12,
              top: 12,
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: holeColor,
            }}
          />
        </View>
        {footer}
      </Card>
    );
  }

  return (
    <Card style={style}>
      {header}
      <ContentRow>
        <DonutContainer>
          <DonutChart size={80} strokeWidth={12} slices={slices} />
        </DonutContainer>

        <LegendGrid>
          {renderLegendColumn(leftColumn)}
          {renderLegendColumn(rightColumn)}
        </LegendGrid>
      </ContentRow>
      {footer}
    </Card>
  );
};

const AllocationSection: React.FC = () => {
  const navigation = useNavigation();
  const {t} = useTranslation();
  const keys = useAppSelector(({WALLET}) => WALLET.keys) as Record<string, Key>;
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const homeCarouselConfig = useAppSelector(({APP}) => APP.homeCarouselConfig);

  const visibleWallets = useMemo(
    () => getVisibleWalletsFromKeys(keys, homeCarouselConfig),
    [keys, homeCarouselConfig],
  );

  const hasAnyVisibleWalletBalance = useMemo(() => {
    return walletsHaveNonZeroLiveBalance(visibleWallets);
  }, [visibleWallets]);

  const walletRows: AllocationWallet[] = useMemo(() => {
    return visibleWallets.map((w: Wallet) => {
      return toAllocationWallet(w);
    });
  }, [visibleWallets]);

  const allocationData = useMemo(() => {
    return buildAllocationDataFromWalletRows(
      walletRows,
      defaultAltCurrency.isoCode,
    );
  }, [defaultAltCurrency.isoCode, walletRows]);

  return (
    <Container>
      <Header>
        <HomeSectionTitle>{t('Allocation')}</HomeSectionTitle>
        <HeaderAction
          activeOpacity={ActiveOpacity}
          hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}
          onPress={() => (navigation as any).navigate('Allocation')}>
          <ChevronRightSvg width={13} height={19} gray />
        </HeaderAction>
      </Header>

      <TouchableOpacity
        activeOpacity={ActiveOpacity}
        onPress={() => (navigation as any).navigate('Allocation')}>
        <AllocationDonutLegendCard
          legendItems={allocationData.legendItems}
          slices={allocationData.slices}
          isLoading={hasAnyVisibleWalletBalance && !allocationData.rows?.length}
        />
      </TouchableOpacity>
    </Container>
  );
};

export default AllocationSection;
