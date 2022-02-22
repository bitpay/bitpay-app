import {useNavigation, useTheme} from '@react-navigation/native';
import {StackScreenProps} from '@react-navigation/stack';
import React, {useEffect, useLayoutEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {
  ActivityIndicator,
  RefreshControl,
  SectionList,
  Share,
  View,
} from 'react-native';
import {useDispatch} from 'react-redux';
import styled from 'styled-components/native';
import Settings from '../../../components/settings/Settings';
import {
  Balance,
  BaseText,
  H5,
  HeaderTitle,
} from '../../../components/styled/Text';
import {Network} from '../../../constants';
import {SUPPORTED_CURRENCIES} from '../../../constants/currencies';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {startUpdateWalletBalance} from '../../../store/wallet/effects/balance/balance';
import {findWalletById} from '../../../store/wallet/utils/wallet';
import {updatePortfolioBalance} from '../../../store/wallet/wallet.actions';
import {Key, Wallet} from '../../../store/wallet/wallet.models';
import {
  LightBlack,
  NotificationPrimary,
  SlateDark,
  White,
} from '../../../styles/colors';
import {sleep} from '../../../utils/helper-methods';
import LinkingButtons from '../../tabs/home/components/LinkingButtons';
import {BalanceUpdateError} from '../components/ErrorMessages';
import OptionsSheet, {Option} from '../components/OptionsSheet';
import ReceiveAddress from '../components/ReceiveAddress';
import Icons from '../components/WalletIcons';
import {WalletStackParamList} from '../WalletStack';
import {buildUIFormattedWallet} from './KeyOverview';
import {useAppSelector} from '../../../utils/hooks';
import {createWalletAddress} from '../../../store/wallet/effects/address/address';
import {
  GetTransactionHistory,
  GroupTransactionHistory,
} from '../../../store/wallet/effects/transactions/transactions';
import {ScreenGutter} from '../../../components/styled/Containers';
import WalletTransactionRow from '../../../components/list/WalletTransactionRow';
import GhostSvg from '../../../../assets/img/ghost-straight-face.svg';

const HISTORY_SHOW_LIMIT = 15;

type WalletDetailsScreenProps = StackScreenProps<
  WalletStackParamList,
  'WalletDetails'
>;

const WalletDetailsContainer = styled.View`
  flex: 1;
`;

const Row = styled.View<{emptyList?: boolean}>`
  flex-direction: row;
  justify-content: ${({emptyList}) => (emptyList ? 'center' : 'space-between')};
  align-items: flex-end;
`;

const BalanceContainer = styled.View<{emptyList?: boolean}>`
  margin-top: ${({emptyList}) => (emptyList ? '-100px' : '20px')};
  padding: 10px 15px;
  flex-direction: column;
`;

const Chain = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  letter-spacing: 0;
  line-height: 40px;
  color: ${({theme: {dark}}) => (dark ? White : LightBlack)};
`;

const Type = styled(BaseText)<{emptyList?: boolean}>`
  font-size: 12px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  border: 1px solid ${({theme: {dark}}) => (dark ? '#252525' : '#E1E4E7')};
  padding: 2px 4px;
  border-radius: 3px;
  margin-left: auto;
  margin-right: ${({emptyList}) => (emptyList ? 'auto' : 0)};
  margin-top: ${({emptyList}) => (emptyList ? '10px' : 0)};
`;

const TransactionSectionHeader = styled(H5)`
  padding: ${ScreenGutter};
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : '#F5F6F7')};
`;

const BorderBottom = styled.View`
  border-bottom-width: 1px;
  border-bottom-color: ${({theme: {dark}}) => (dark ? LightBlack : '#EBEDF8')};
`;

const SpinnerContainer = styled.View`
  padding: ${ScreenGutter};
`;

const getWalletType = (key: Key, wallet: Wallet) => {
  const {
    credentials: {token, walletId},
  } = wallet;
  if (token) {
    const linkedWallet = key.wallets.find(({tokens}) =>
      tokens?.includes(walletId),
    );
    const walletName =
      linkedWallet?.walletName || linkedWallet?.credentials.walletName;
    return `Linked to ${walletName}`;
  }
  return;
};

const EmptyListContainer = styled.View`
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
`;

const WalletDetails: React.FC<WalletDetailsScreenProps> = ({route}) => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const theme = useTheme();
  const {t} = useTranslation();
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const {walletId, key} = route.params;
  const wallets = useAppSelector(({WALLET}) => WALLET.keys[key.id].wallets);
  const fullWalletObj = findWalletById(wallets, walletId) as Wallet;
  const uiFormattedWallet = buildUIFormattedWallet(fullWalletObj);
  const [showReceiveAddressBottomModal, setShowReceiveAddressBottomModal] =
    useState(false);
  const walletType = getWalletType(key, fullWalletObj);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <HeaderTitle>{uiFormattedWallet.walletName}</HeaderTitle>
      ),
      headerRight: () => (
        <Settings
          onPress={() => {
            setShowWalletOptions(true);
          }}
        />
      ),
    });
  }, [navigation, uiFormattedWallet]);

  const ShareAddress = async () => {
    try {
      await sleep(1000);
      const address = (await dispatch<any>(
        createWalletAddress({wallet: fullWalletObj, newAddress: false}),
      )) as string;

      await Share.share({
        message: address,
      });
    } catch (e) {}
  };

  const assetOptions: Array<Option> = [
    {
      img: <Icons.RequestAmount />,
      title: 'Request a specific amount',
      description:
        'This will generate an invoice, which the person you send it to can pay using any wallet.',
      onPress: () => {
        navigation.navigate('Wallet', {
          screen: 'RequestSpecificAmount',
          params: {wallet: fullWalletObj},
        });
      },
    },
    {
      img: <Icons.ShareAddress />,
      title: 'Share Address',
      description:
        'Share your wallet address to someone in your contacts so they can send you funds.',
      onPress: ShareAddress,
    },
    {
      img: <Icons.Settings />,
      title: 'Wallet Settings',
      description: 'View all the ways to manage and configure your wallet.',
      onPress: () =>
        navigation.navigate('Wallet', {
          screen: 'WalletSettings',
          params: {
            key,
            walletId,
          },
        }),
    },
  ];

  const showReceiveAddress = () => {
    setShowReceiveAddressBottomModal(true);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await sleep(1000);

    try {
      await Promise.all([
        await dispatch(startUpdateWalletBalance({key, wallet: fullWalletObj})),
        sleep(1000),
      ]);
      dispatch(updatePortfolioBalance());
    } catch (err) {
      dispatch(showBottomNotificationModal(BalanceUpdateError));
    }
    setRefreshing(false);
  };

  const {
    cryptoBalance,
    fiatBalance,
    currencyName,
    currencyAbbreviation,
    network,
  } = uiFormattedWallet;

  const showFiatBalance =
    SUPPORTED_CURRENCIES.includes(currencyAbbreviation.toLowerCase()) &&
    network !== Network.testnet;

  const [history, setHistory] = useState<any[]>([]);
  const [groupedHistory, setGroupedHistory] = useState<
    {title: string; data: any[]}[]
  >([]);
  const [loadMore, setLoadMore] = useState(true);
  const [isLoading, setIsLoading] = useState<boolean>();

  const loadHistory = async () => {
    if (!loadMore) {
      return;
    }
    try {
      setIsLoading(true);
      let {transactions: _history, loadMore: _loadMore} =
        await GetTransactionHistory({
          wallet: fullWalletObj,
          transactionsHistory: history,
          limit: HISTORY_SHOW_LIMIT,
        });

      if (_history?.length) {
        setHistory(_history);
        const grouped = GroupTransactionHistory(_history);
        setGroupedHistory(grouped);
      }
      setIsLoading(false);
      setLoadMore(_loadMore);
    } catch (e) {
      setLoadMore(false);
      setIsLoading(false);
      console.log(e);
    }
  };

  useEffect(() => {
    loadHistory();
    console.log(fullWalletObj);
  }, []);

  const listFooterComponent = () => {
    return (
      <>
        {!groupedHistory?.length ? null : (
          <View style={{marginBottom: 20}}>
            <BorderBottom />
          </View>
        )}
        {isLoading ? (
          <SpinnerContainer>
            <ActivityIndicator size={'large'} color={NotificationPrimary} />
          </SpinnerContainer>
        ) : null}
      </>
    );
  };

  const listEmptyComponent = () => {
    return (
      <>
        {!isLoading && (
          <EmptyListContainer>
            <H5>It's a ghost town in here</H5>
            <GhostSvg style={{marginTop: 20}} />
          </EmptyListContainer>
        )}
      </>
    );
  };

  return (
    <WalletDetailsContainer>
      <SectionList
        refreshControl={
          <RefreshControl
            tintColor={theme.dark ? White : SlateDark}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        ListHeaderComponent={() => {
          return (
            <>
              <BalanceContainer>
                <Row>
                  <Balance>
                    {cryptoBalance} {currencyAbbreviation}
                  </Balance>
                  <Chain>{currencyAbbreviation}</Chain>
                </Row>
                <Row>
                  {showFiatBalance && <H5>{fiatBalance}</H5>}
                  {walletType ? <Type>{walletType}</Type> : null}
                </Row>
              </BalanceContainer>

              {fullWalletObj ? (
                <LinkingButtons
                  receive={{cta: () => showReceiveAddress()}}
                  send={{
                    hide: __DEV__ ? false : !fullWalletObj.balance.fiat,
                    cta: () =>
                      navigation.navigate('Wallet', {
                        screen: 'SendTo',
                        params: {wallet: fullWalletObj},
                      }),
                  }}
                />
              ) : null}
            </>
          );
        }}
        sections={groupedHistory}
        stickyHeaderIndices={[groupedHistory?.length]}
        keyExtractor={(item, index) => item + index}
        renderItem={({item}) => (
          <WalletTransactionRow
            transaction={item}
            wallet={fullWalletObj}
            contactsList={[]}
          />
        )}
        renderSectionHeader={({section: {title}}) => (
          <TransactionSectionHeader>{title}</TransactionSectionHeader>
        )}
        ItemSeparatorComponent={() => <BorderBottom />}
        ListFooterComponent={listFooterComponent}
        onEndReached={loadHistory}
        onEndReachedThreshold={0.6}
        ListEmptyComponent={listEmptyComponent}
      />

      <OptionsSheet
        isVisible={showWalletOptions}
        closeModal={() => setShowWalletOptions(false)}
        title={t('ReceiveCurrency', {currency: currencyName})}
        options={assetOptions}
      />

      {fullWalletObj ? (
        <ReceiveAddress
          isVisible={showReceiveAddressBottomModal}
          closeModal={() => setShowReceiveAddressBottomModal(false)}
          wallet={fullWalletObj}
        />
      ) : null}
    </WalletDetailsContainer>
  );
};

export default WalletDetails;
