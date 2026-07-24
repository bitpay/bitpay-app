import React, {useCallback, useLayoutEffect, useMemo} from 'react';
import {
  ImageRequireSource,
  SafeAreaView,
  StyleSheet,
  View,
} from 'react-native';
import {FlashList, ListRenderItemInfo} from '@shopify/flash-list';
import {useTheme} from '../../../../contexts';
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
  type AllocationRowItem,
  type AllocationWallet,
  toAllocationWallet,
} from '../../../../utils/portfolio/allocation';
import {
  getVisibleWalletsForKey,
  getVisibleWalletsFromKeys,
} from '../../../../utils/portfolio/assets';
import {LightBlack, Slate30, SlateDark} from '../../../../styles/colors';
import {maskIfHidden} from '../../../../utils/hideBalances';
import {useAssetIconResolver} from '../hooks/useAssetIconResolver';

type Props = NativeStackScreenProps<RootStackParamList, 'Allocation'>;

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  row: {
    marginHorizontal: 16,
    paddingVertical: 14,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowLabels: {
    flex: 1,
    justifyContent: 'center',
  },
  assetName: {
    fontSize: 14,
    fontStyle: 'normal',
    fontWeight: '400',
    lineHeight: 20,
  },
  assetSymbol: {
    fontSize: 13,
    fontStyle: 'normal',
    fontWeight: '400',
    lineHeight: 20,
  },
  rowRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 12,
  },
  fiatAmount: {
    fontSize: 14,
    fontStyle: 'normal',
    fontWeight: '400',
    lineHeight: 20,
  },
  percent: {
    fontSize: 13,
    fontStyle: 'normal',
    fontWeight: '400',
    lineHeight: 20,
  },
  progressTrack: {
    marginTop: 10,
    height: 10,
    borderRadius: 50,
    overflow: 'hidden',
  },
  progressFill: {
    height: 10,
    borderRadius: 50,
    borderWidth: 1,
  },
});

const ScreenContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <SafeAreaView style={styles.screenContainer}>{children}</SafeAreaView>;

const Row: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <View style={styles.row}>{children}</View>
);

const RowTop: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <View style={styles.rowTop}>{children}</View>
);

const RowLeft: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <View style={styles.rowLeft}>{children}</View>
);

const IconContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={styles.iconContainer}>{children}</View>;

const RowLabels: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <View style={styles.rowLabels}>{children}</View>
);

const AssetName: React.FC<{children?: React.ReactNode}> = ({children}) => {
  const theme = useTheme();
  return (
    <BaseText style={[styles.assetName, {color: theme.colors.text}]}>
      {children}
    </BaseText>
  );
};

const AssetSymbol: React.FC<{children?: React.ReactNode}> = ({children}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.assetSymbol,
        {color: theme.dark ? Slate30 : SlateDark},
      ]}>
      {children}
    </BaseText>
  );
};

const RowRight: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <View style={styles.rowRight}>{children}</View>
);

const FiatAmount: React.FC<{children?: React.ReactNode}> = ({children}) => {
  const theme = useTheme();
  return (
    <BaseText style={[styles.fiatAmount, {color: theme.colors.text}]}>
      {children}
    </BaseText>
  );
};

const Percent: React.FC<{children?: React.ReactNode}> = ({children}) => {
  const theme = useTheme();
  return (
    <BaseText style={[styles.percent, {color: theme.colors.text}]}>
      {children}
    </BaseText>
  );
};

const ProgressTrack: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.progressTrack,
        {backgroundColor: theme.dark ? LightBlack : Slate30},
      ]}>
      {children}
    </View>
  );
};

const ProgressFill: React.FC<{progress: number; color: string}> = ({
  progress,
  color,
}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.progressFill,
        {
          width: `${Math.min(100, Math.max(0, progress))}%`,
          backgroundColor: color,
          borderColor: theme.dark ? SlateDark : Slate30,
        },
      ]}
    />
  );
};

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

      const wallets = getVisibleWalletsForKey(key);

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
