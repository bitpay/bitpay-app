import React, {useCallback, useLayoutEffect, useMemo} from 'react';
import {ImageRequireSource, View} from 'react-native';
import {FlashList, ListRenderItemInfo} from '@shopify/flash-list';
import styled, {useTheme} from 'styled-components/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {RootStackParamList} from '../../../../Root';
import {useStackScreenOptions} from '../../../utils/headerHelpers';
import {HeaderTitle, BaseText} from '../../../../components/styled/Text';
import HeaderBackButton from '../../../../components/back/HeaderBackButton';
import type {SupportedCurrencyOption} from '../../../../constants/SupportedCurrencyOptions';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';
import {AllocationDonutLegendCard} from '../components/AllocationSection';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {buildAccountList} from '../../../../store/wallet/utils/wallet';
import type {Key, Wallet} from '../../../../store/wallet/wallet.models';
import {formatCurrencyAbbreviation} from '../../../../utils/helper-methods';
import {
  buildAllocationDataFromWalletRows,
  type AllocationWallet,
  toAllocationWallet,
} from '../../../../utils/portfolio/allocation';
import {getVisibleWalletsFromKeys} from '../../../../utils/portfolio/assets';
import {LightBlack, Slate30, SlateDark} from '../../../../styles/colors';
import {maskIfHidden} from '../../../../utils/hideBalances';
import {useAssetIconResolver} from '../hooks/useAssetIconResolver';

type Props = NativeStackScreenProps<RootStackParamList, 'Allocation'>;

export type AllocationRowItem = {
  key: string;
  currencyAbbreviation: string;
  chain: string;
  tokenAddress?: string;
  name: string;
  fiatAmount: string;
  percent: string;
  barColor: {
    light: string;
    dark: string;
  };
  progress: number;
};

const ScreenContainer = styled.SafeAreaView`
  flex: 1;
`;

const Row = styled.View`
  margin: 0 16px;
  padding: 14px 0;
`;

const RowTop = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 5px;
`;

const RowLeft = styled.View`
  flex-direction: row;
  align-items: center;
  flex: 1;
`;

const IconContainer = styled.View`
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
`;

const RowLabels = styled.View`
  flex: 1;
  justify-content: center;
`;

const AssetName = styled(BaseText)`
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
  line-height: 20px;
  color: ${({theme}) => theme.colors.text};
`;

const AssetSymbol = styled(BaseText)`
  font-size: 13px;
  font-style: normal;
  font-weight: 400;
  line-height: 20px;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
`;

const RowRight = styled.View`
  align-items: flex-end;
  justify-content: center;
  margin-left: 12px;
`;

const FiatAmount = styled(BaseText)`
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
  line-height: 20px;
  color: ${({theme}) => theme.colors.text};
`;

const Percent = styled(BaseText)`
  font-size: 13px;
  font-style: normal;
  font-weight: 400;
  line-height: 20px;
  color: ${({theme}) => theme.colors.text};
`;

const ProgressTrack = styled.View`
  margin-top: 10px;
  height: 10px;
  border-radius: 50px;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : Slate30)};
  overflow: hidden;
`;

const ProgressFill = styled.View<{
  progress: number;
  color: string;
}>`
  height: 10px;
  width: ${({progress}) => `${Math.min(100, Math.max(0, progress))}%`};
  border-radius: 50px;
  background-color: ${({color}) => color};
  border-width: 1px;
  border-color: ${({theme: {dark}}) => (dark ? SlateDark : Slate30)};
`;

const ALLOCATION_ROW_ESTIMATED_ITEM_SIZE = 94;

const AllocationRow: React.FC<{
  item: AllocationRowItem;
  hideAllBalances: boolean;
  barColor: string;
  img?: SupportedCurrencyOption['img'];
  imgSrc?: ImageRequireSource;
}> = ({item, hideAllBalances, barColor, img, imgSrc}) => {
  return (
    <Row>
      <RowTop>
        <RowLeft>
          <IconContainer>
            <CurrencyImage img={img} imgSrc={imgSrc} size={40} />
          </IconContainer>
          <RowLabels>
            <AssetName>{item.name}</AssetName>
            <AssetSymbol>
              {formatCurrencyAbbreviation(item.currencyAbbreviation || '')}
            </AssetSymbol>
          </RowLabels>
        </RowLeft>

        <RowRight>
          <FiatAmount>
            {maskIfHidden(hideAllBalances, item.fiatAmount)}
          </FiatAmount>
          <Percent>{item.percent}</Percent>
        </RowRight>
      </RowTop>

      <ProgressTrack>
        <ProgressFill progress={item.progress} color={barColor} />
      </ProgressTrack>
    </Row>
  );
};

export const AllocationRowsList: React.FC<{
  rows: AllocationRowItem[];
  style?: any;
  ListHeaderComponent?: React.ReactElement | null;
  scrollEnabled?: boolean;
}> = ({rows, style, ListHeaderComponent, scrollEnabled = false}) => {
  const theme = useTheme();
  const hideAllBalances = useAppSelector(({APP}) => APP.hideAllBalances);
  const {getAssetIconData} = useAssetIconResolver();

  const renderRow = useCallback(
    (item: AllocationRowItem) => {
      const {img, imgSrc} = getAssetIconData(item);

      const barColor = theme.dark ? item.barColor.dark : item.barColor.light;

      return (
        <AllocationRow
          item={item}
          hideAllBalances={hideAllBalances}
          barColor={barColor}
          img={img}
          imgSrc={imgSrc}
        />
      );
    },
    [getAssetIconData, hideAllBalances, theme.dark],
  );

  const renderItem = useCallback(
    ({item}: ListRenderItemInfo<AllocationRowItem>) => renderRow(item),
    [renderRow],
  );

  const keyExtractor = useCallback((item: AllocationRowItem) => item.key, []);

  if (!scrollEnabled) {
    return (
      <View style={[{paddingBottom: 24}, style]}>
        {ListHeaderComponent}
        {rows.map(item => (
          <React.Fragment key={item.key}>{renderRow(item)}</React.Fragment>
        ))}
      </View>
    );
  }

  return (
    <FlashList<AllocationRowItem>
      data={rows}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeaderComponent}
      contentContainerStyle={[{paddingBottom: 24}, style]}
      estimatedItemSize={ALLOCATION_ROW_ESTIMATED_ITEM_SIZE}
      maintainVisibleContentPosition={{disabled: true}}
      scrollEnabled={scrollEnabled}
    />
  );
};

const Allocation: React.FC<Props> = ({navigation, route}) => {
  const theme = useTheme();
  const {t} = useTranslation();
  const commonOptions = useStackScreenOptions(theme);
  const dispatch = useAppDispatch();
  const keys = useAppSelector(({WALLET}) => WALLET.keys) as Record<string, Key>;
  const {rates} = useAppSelector(({RATE}) => RATE);
  const {defaultAltCurrency} = useAppSelector(({APP}) => APP);
  const homeCarouselConfig = useAppSelector(({APP}) => APP.homeCarouselConfig);

  useLayoutEffect(() => {
    navigation.setOptions({
      ...commonOptions,
      headerLeft: () => <HeaderBackButton />,
      headerTitle: () => <HeaderTitle>{t('Allocation')}</HeaderTitle>,
    });
  }, [navigation, commonOptions, t]);

  const walletRows: AllocationWallet[] = useMemo(() => {
    const keyId = route.params?.keyId;
    const accountAddress = route.params?.accountAddress;

    if (keyId) {
      const key = keys[keyId];
      if (!key) {
        return [];
      }

      if (accountAddress) {
        const accounts = buildAccountList(
          key,
          defaultAltCurrency.isoCode,
          rates,
          dispatch,
          {
            filterByHideWallet: true,
          },
        );
        const account = accounts.find(a => a.receiveAddress === accountAddress);
        return (account?.wallets || []) as AllocationWallet[];
      }

      const wallets = key.wallets.filter(
        w => !w.hideWallet && !w.hideWalletByAccount,
      );

      return wallets.map((w: Wallet) => {
        return toAllocationWallet(w);
      });
    }

    const wallets = getVisibleWalletsFromKeys(keys, homeCarouselConfig);

    return wallets.map((w: Wallet) => {
      return toAllocationWallet(w);
    });
  }, [
    defaultAltCurrency.isoCode,
    dispatch,
    homeCarouselConfig,
    keys,
    rates,
    route.params?.accountAddress,
    route.params?.keyId,
  ]);

  const allocationData = useMemo(() => {
    return buildAllocationDataFromWalletRows(
      walletRows,
      defaultAltCurrency.isoCode,
    );
  }, [defaultAltCurrency.isoCode, walletRows]);

  const listHeaderComponent = useMemo(() => {
    return (
      <AllocationDonutLegendCard
        legendItems={allocationData.legendItems}
        slices={allocationData.slices}
      />
    );
  }, [allocationData.legendItems, allocationData.slices]);

  return (
    <ScreenContainer>
      <AllocationRowsList
        rows={allocationData.rows}
        ListHeaderComponent={listHeaderComponent}
        scrollEnabled
      />
    </ScreenContainer>
  );
};

export default Allocation;
