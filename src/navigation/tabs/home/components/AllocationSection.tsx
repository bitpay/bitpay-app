import React, {useMemo} from 'react';
import {View} from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import Svg, {Circle, G} from 'react-native-svg';
import styled, {useTheme} from 'styled-components/native';
import {useNavigation} from '@react-navigation/native';
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
} from '../../../../utils/allocation';
import {Black, Slate30, SlateDark, White} from '../../../../styles/colors';

export type AllocationLegendItem = {
  key: string;
  label: string;
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

const Container = styled.View`
  margin-bottom: 18px;
`;

const Header = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin: 0 ${ScreenGutter} 0 16px;
`;

const HeaderAction = styled(TouchableOpacity)`
  padding: 6px;
`;

const Card = styled.View`
  margin: 12px ${ScreenGutter} 10px;
  border-radius: 12px;
  border-width: 1px;
  border-color: ${({theme: {dark}}) => (dark ? SlateDark : Slate30)};
  background-color: ${({theme: {dark}}) => (dark ? 'transparent' : White)};
  padding: 14px 14px;
`;

const ContentRow = styled.View`
  flex-direction: row;
  align-items: center;
`;

const DonutContainer = styled.View`
  width: 88px;
  height: 88px;
  align-items: center;
  justify-content: center;
  margin-right: 14px;
`;

const LegendGrid = styled.View`
  flex: 1;
  flex-direction: row;
  justify-content: space-between;
`;

const LegendColumn = styled.View`
  flex: 1;
  gap: 10px;
`;

const LegendItemRow = styled.View`
  flex-direction: row;
  align-items: center;
`;

const LegendDot = styled.View<{
  color: string;
}>`
  width: 9px;
  height: 9px;
  border-radius: 8px;
  margin-right: 8px;
  background-color: ${({color}) => color};
  border-width: 1px;
  border-color: ${({theme: {dark}}) => (dark ? SlateDark : Slate30)};
`;

const LegendText = styled(BaseText)`
  font-size: 13px;
  font-style: normal;
  font-weight: 400;
  line-height: 20px;
`;

const LegendCurrencyAbbreviationText = styled(LegendText)`
  color: ${({theme: {dark}}) => (dark ? White : Black)};
`;

const LegendPercentageText = styled(LegendText)`
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
`;

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
  let cumulativeAngle = 0;

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
        {slices.map(slice => {
          if (isSingleSliceFull) {
            return null;
          }
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

          return (
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
            </React.Fragment>
          );
        })}
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
  const leftColumn = legendItems.slice(0, 3);
  const rightColumn = legendItems.slice(3);

  if (isLoading) {
    const holeColor =
      (theme as any)?.colors?.background || (theme.dark ? Black : White);

    const skeletonBackgroundColor = theme.dark ? '#111' : '#F5F7F8';
    const skeletonHighlightColor = theme.dark ? '#252525' : '#FBFBFF';
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
          <LegendColumn>
            {leftColumn.map(item => {
              const dotColor = theme.dark ? item.color.dark : item.color.light;

              return (
                <LegendItemRow key={item.key}>
                  <LegendDot color={dotColor} />
                  <LegendText>
                    <LegendCurrencyAbbreviationText>
                      {item.label}
                    </LegendCurrencyAbbreviationText>
                    {item.value ? (
                      <LegendPercentageText>{` ${item.value}`}</LegendPercentageText>
                    ) : null}
                  </LegendText>
                </LegendItemRow>
              );
            })}
          </LegendColumn>

          <LegendColumn>
            {rightColumn.map(item => {
              const dotColor = theme.dark ? item.color.dark : item.color.light;

              return (
                <LegendItemRow key={item.key}>
                  <LegendDot color={dotColor} />
                  <LegendText>
                    <LegendCurrencyAbbreviationText>
                      {item.label}
                    </LegendCurrencyAbbreviationText>
                    {item.value ? (
                      <LegendPercentageText>{` ${item.value}`}</LegendPercentageText>
                    ) : null}
                  </LegendText>
                </LegendItemRow>
              );
            })}
          </LegendColumn>
        </LegendGrid>
      </ContentRow>
      {footer}
    </Card>
  );
};

const AllocationSection: React.FC = () => {
  const navigation = useNavigation();
  const keys = useAppSelector(({WALLET}) => WALLET.keys) as Record<string, Key>;
  const {defaultAltCurrency} = useAppSelector(({APP}) => APP);

  const hasAnyVisibleWalletBalance = useMemo(() => {
    const wallets = (Object.values(keys) as Key[])
      .flatMap((k: Key) => k.wallets)
      .filter((w: Wallet) => !w.hideWallet && !w.hideWalletByAccount);

    return wallets.some(
      (w: Wallet) => (Number((w.balance as any)?.sat) || 0) > 0,
    );
  }, [keys]);

  const walletRows: AllocationWallet[] = useMemo(() => {
    const wallets = (Object.values(keys) as Key[])
      .flatMap((k: Key) => k.wallets)
      .filter((w: Wallet) => !w.hideWallet && !w.hideWalletByAccount);

    return wallets.map((w: Wallet) => {
      return {
        currencyAbbreviation: w.currencyAbbreviation,
        chain: w.chain,
        tokenAddress: w.tokenAddress,
        currencyName: w.currencyName,
        fiatBalance: (w.balance as any)?.fiat,
      };
    });
  }, [keys]);

  const allocationData = useMemo(() => {
    return buildAllocationDataFromWalletRows(
      walletRows,
      defaultAltCurrency.isoCode,
    );
  }, [defaultAltCurrency.isoCode, walletRows]);

  return (
    <Container>
      <Header>
        <HomeSectionTitle>Allocation</HomeSectionTitle>
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
