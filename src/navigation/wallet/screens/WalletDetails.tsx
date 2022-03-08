import {useNavigation, useTheme} from '@react-navigation/native';
import {StackScreenProps} from '@react-navigation/stack';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import {useTranslation} from 'react-i18next';
import {RefreshControl, SectionList, Share, View} from 'react-native';
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
import {findWalletById, isSegwit} from '../../../store/wallet/utils/wallet';
import {updatePortfolioBalance} from '../../../store/wallet/wallet.actions';
import {Key, Wallet} from '../../../store/wallet/wallet.models';
import {Air, LightBlack, SlateDark, White} from '../../../styles/colors';
import {sleep} from '../../../utils/helper-methods';
import LinkingButtons from '../../tabs/home/components/LinkingButtons';
import {
  BalanceUpdateError,
  RbfTransaction,
  SpeedUpEthTransaction,
  SpeedUpTransaction,
  UnconfirmedInputs,
} from '../components/ErrorMessages';
import OptionsSheet, {Option} from '../components/OptionsSheet';
import ReceiveAddress from '../components/ReceiveAddress';
import Icons from '../components/WalletIcons';
import {WalletStackParamList} from '../WalletStack';
import {buildUIFormattedWallet} from './KeyOverview';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {startGetRates} from '../../../store/wallet/effects';
import {createWalletAddress} from '../../../store/wallet/effects/address/address';
import {
  CanSpeedUpTx,
  GetTransactionHistory,
  GroupTransactionHistory,
  IsMoved,
  IsReceived, TX_HISTORY_LIMIT,
} from '../../../store/wallet/effects/transactions/transactions';
import {ScreenGutter} from '../../../components/styled/Containers';
import TransactionRow, {
  TRANSACTION_ROW_HEIGHT,
} from '../../../components/list/TransactionRow';
import GhostSvg from '../../../../assets/img/ghost-straight-face.svg';
import WalletTransactionSkeletonRow from '../../../components/list/WalletTransactionSkeletonRow';
import {IsERCToken} from '../../../store/wallet/utils/currency';
import {DeviceEventEmitter} from 'react-native';
import {DeviceEmitterEvents} from '../../../constants/device-emitter-events';

type WalletDetailsScreenProps = StackScreenProps<
  WalletStackParamList,
  'WalletDetails'
>;

const WalletDetailsContainer = styled.View`
  flex: 1;
  padding-top: 10px;
`;

const Row = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-end;
`;

const BalanceContainer = styled.View`
  margin-top: 20px;
  padding: 0 15px 10px;
  flex-direction: column;
`;

const Chain = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  letter-spacing: 0;
  line-height: 40px;
  color: ${({theme: {dark}}) => (dark ? White : LightBlack)};
`;

const Type = styled(BaseText)`
  font-size: 12px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  border: 1px solid ${({theme: {dark}}) => (dark ? LightBlack : '#E1E4E7')};
  padding: 2px 4px;
  border-radius: 3px;
  margin-left: auto;
`;

const TransactionSectionHeader = styled(H5)`
  padding: ${ScreenGutter};
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : '#F5F6F7')};
  height: 55px;
`;

const BorderBottom = styled.View`
  border-bottom-width: 1px;
  border-bottom-color: ${({theme: {dark}}) => (dark ? LightBlack : Air)};
`;

const SkeletonContainer = styled.View`
  margin-bottom: 20px;
`;

const EmptyListContainer = styled.View`
  justify-content: space-between;
  align-items: center;
  margin-top: 50px;
`;

const getWalletType = (key: Key, wallet: Wallet) => {
  const {
    credentials: {token, walletId, addressType},
  } = wallet;
  if (token) {
    const linkedWallet = key.wallets.find(({tokens}) =>
      tokens?.includes(walletId),
    );
    const walletName =
      linkedWallet?.walletName || linkedWallet?.credentials.walletName;
    return `Linked to ${walletName}`;
  }

  if (isSegwit(addressType)) {
    return 'Segwit';
  }
  return;
};

const WalletDetails: React.FC<WalletDetailsScreenProps> = ({route}) => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const {t} = useTranslation();
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const {walletId, key} = route.params;
  const wallets = useAppSelector(({WALLET}) => WALLET.keys[key.id].wallets);
  const contactList = useAppSelector(({CONTACT}) => CONTACT.list);
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
  }, [navigation, uiFormattedWallet.walletName]);

  useEffect(() => {
    setRefreshing(!!fullWalletObj.isRefreshing);
  }, [fullWalletObj.isRefreshing]);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      DeviceEmitterEvents.WALLET_UPDATE_COMPLETE,
      () => {
        loadHistory(true);
      },
    );
    return subscription.remove;
  }, []);

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
          screen: 'Amount',
          params: {
            currencyAbbreviation:
              fullWalletObj.currencyAbbreviation.toUpperCase(),
            onAmountSelected: async (amount, setButtonState) => {
              setButtonState('success');
              await sleep(500);
              navigation.navigate('Wallet', {
                screen: 'RequestSpecificAmountQR',
                params: {wallet: fullWalletObj, requestAmount: Number(amount)},
              });
            },
            opts: {
              hideSendMax: true,
            },
          },
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

  const onRefresh = async () => {
    setRefreshing(true);
    await sleep(1000);

    try {
      await dispatch(startGetRates());
      await Promise.all([
        await dispatch(startUpdateWalletBalance({key, wallet: fullWalletObj})),
        await loadHistory(true),
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
  const [errorLoadingTxs, setErrorLoadingTxs] = useState<boolean>();

  const loadHistory = async (refresh?: boolean) => {
    if (!loadMore && !refresh) {
      return;
    }
    try {
      setIsLoading(!refresh);
      setErrorLoadingTxs(false);
      const [transactionHistory] = await Promise.all([
        dispatch(
          GetTransactionHistory({
            wallet: fullWalletObj,
            transactionsHistory: history,
            limit: TX_HISTORY_LIMIT,
            contactList,
            refresh,
          }),
        ),
        sleep(500),
      ]);

      let {transactions: _history, loadMore: _loadMore} = transactionHistory;

      if (_history?.length){
        setHistory(_history);
        const grouped = GroupTransactionHistory(_history);
        setGroupedHistory(grouped);
      }
      setIsLoading(false);
      setLoadMore(_loadMore);
    } catch (e) {
      setLoadMore(false);
      setIsLoading(false);
      setErrorLoadingTxs(true);

      console.log('Transaction Update: ', e);
    }
  };

  useEffect(() => {
    loadHistory();
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
          <SkeletonContainer>
            <WalletTransactionSkeletonRow />
          </SkeletonContainer>
        ) : null}
      </>
    );
  };

  const listEmptyComponent = () => {
    return (
      <>
        {!isLoading && !errorLoadingTxs && (
          <EmptyListContainer>
            <H5>It's a ghost town in here</H5>
            <GhostSvg style={{marginTop: 20}} />
          </EmptyListContainer>
        )}

        {!isLoading && errorLoadingTxs && (
          <EmptyListContainer>
            <H5>Could not update transaction history</H5>
            <GhostSvg style={{marginTop: 20}} />
          </EmptyListContainer>
        )}
      </>
    );
  };

  const goToTransactionDetails = (transaction: any) => {
    navigation.navigate('Wallet', {
      screen: 'TransactionDetails',
      params: {wallet: fullWalletObj, transaction},
    });
  };

  const speedUpTransaction = (transaction: any) => {
    //   TODO: Speed up Transaction
  };

  const onPressTransaction = useMemo(
    () => (transaction: any) => {
      const {hasUnconfirmedInputs, action, isRBF} = transaction;
      const isReceived = IsReceived(action);
      const isMoved = IsMoved(action);
      const currency = currencyAbbreviation.toLowerCase();

      if (
        hasUnconfirmedInputs &&
        (isReceived || isMoved) &&
        currency === 'btc'
      ) {
        dispatch(
          showBottomNotificationModal(
            UnconfirmedInputs(() => goToTransactionDetails(transaction)),
          ),
        );
      } else if (isRBF && isReceived && currency === 'btc') {
        dispatch(
          showBottomNotificationModal(
            RbfTransaction(
              () => speedUpTransaction(transaction),
              () => goToTransactionDetails(transaction),
            ),
          ),
        );
      } else if (CanSpeedUpTx(transaction, currency)) {
        if (currency === 'eth' || IsERCToken(currency)) {
          dispatch(
            showBottomNotificationModal(
              SpeedUpEthTransaction(
                () => speedUpTransaction(transaction),
                () => goToTransactionDetails(transaction),
              ),
            ),
          );
        } else {
          dispatch(
            showBottomNotificationModal(
              SpeedUpTransaction(
                () => speedUpTransaction(transaction),
                () => goToTransactionDetails(transaction),
              ),
            ),
          );
        }
      } else {
        goToTransactionDetails(transaction);
      }
    },
    [],
  );

  const renderItem = useCallback(
    ({item}) => (
      <TransactionRow
        icon={item.uiIcon}
        description={item.uiDescription}
        time={item.uiTime}
        value={item.uiValue}
        onPressTransaction={() => onPressTransaction(item)}
      />
    ),
    [],
  );

  const keyExtractor = useCallback(item => item.txid, []);

  const getItemLayout = useCallback(
    (data, index) => ({
      length: TRANSACTION_ROW_HEIGHT,
      offset: TRANSACTION_ROW_HEIGHT * index,
      index,
    }),
    [],
  );

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
                  {walletType && <Type>{walletType}</Type>}
                </Row>
              </BalanceContainer>

              {fullWalletObj ? (
                <LinkingButtons
                  receive={{cta: () => setShowReceiveAddressBottomModal(true)}}
                  send={{
                    hide: !fullWalletObj.balance.sat,
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
        stickySectionHeadersEnabled={true}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        renderSectionHeader={({section: {title}}) => (
          <TransactionSectionHeader>{title}</TransactionSectionHeader>
        )}
        ItemSeparatorComponent={() => <BorderBottom />}
        ListFooterComponent={listFooterComponent}
        onEndReached={() => loadHistory()}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={listEmptyComponent}
        maxToRenderPerBatch={15}
        getItemLayout={getItemLayout}
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
