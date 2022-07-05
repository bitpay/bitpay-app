import {
  RouteProp,
  useNavigation,
  useRoute,
  useTheme,
} from '@react-navigation/native';
import styled from 'styled-components/native';
import {
  CurrencyColumn,
  CurrencyImageContainer,
  Row,
  RowContainer,
  ScreenGutter,
} from '../../../components/styled/Containers';
import {
  H5,
  HeaderTitle,
  ListItemSubText,
} from '../../../components/styled/Text';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {WalletStackParamList} from '../WalletStack';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import _ from 'lodash';
import {TransactionProposal, Wallet} from '../../../store/wallet/wallet.models';
import {RefreshControl, SectionList, View} from 'react-native';
import TransactionProposalRow from '../../../components/list/TransactionProposalRow';
import {Air, LightBlack, SlateDark, White} from '../../../styles/colors';
import {sleep} from '../../../utils/helper-methods';
import {TRANSACTION_ROW_HEIGHT} from '../../../components/list/TransactionRow';
import {findWalletById} from '../../../store/wallet/utils/wallet';
import {useTranslation} from 'react-i18next';
import {CurrencyImage} from '../../../components/currency-image/CurrencyImage';
import {startGetRates} from '../../../store/wallet/effects';
import {startUpdateAllKeyAndWalletStatus} from '../../../store/wallet/effects/status/status';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {
  BalanceUpdateError,
  CustomErrorMessage,
  WrongPasswordError,
} from '../components/ErrorMessages';
import HamburgerSvg from '../../../../assets/img/hamburger.svg';
import Checkbox from '../../../components/checkbox/Checkbox';
import PaymentSent from '../components/PaymentSent';
import {
  logSegmentEvent,
  startOnGoingProcessModal,
} from '../../../store/app/app.effects';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';
import {BWCErrorMessage} from '../../../constants/BWCError';
import {BottomNotificationConfig} from '../../../components/modal/bottom-notification/BottomNotification';
import SwipeButton from '../../../components/swipe-button/SwipeButton';
import {publishAndSignMultipleProposals} from '../../../store/wallet/effects/send/send';
import {HamburgerContainer} from '../../tabs/settings/general/screens/customize-home/Shared';

const NotificationsContainer = styled.View`
  flex: 1;
`;

const ListHeaderPadding = styled.View`
  padding: 10px;
  margin-top: 10px;
`;

const TransactionSectionHeaderContainer = styled.View`
  padding: ${ScreenGutter};
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : '#F5F6F7')};
  height: 55px;
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const BorderBottom = styled.View`
  border-bottom-width: 1px;
  border-bottom-color: ${({theme: {dark}}) => (dark ? LightBlack : Air)};
`;

const ProposalsContainer = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
`;

const ProposalsInfoContainer = styled.View`
  flex: 1;
`;

const CheckBoxContainer = styled.View`
  flex-direction: column;
  justify-content: center;
  margin-left: 15px;
  margin-right: 5px;
`;

const TransactionProposalNotifications = () => {
  const {
    params: {walletId, keyId},
  } =
    useRoute<
      RouteProp<WalletStackParamList, 'TransactionProposalNotifications'>
    >();
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const {keys} = useAppSelector(({WALLET}) => WALLET);
  const wallets = keyId
    ? keys[keyId].wallets
    : Object.values(keys).flatMap(k => k.wallets);
  const [resetSwipeButton, setResetSwipeButton] = useState(false);
  const [showPaymentSentModal, setShowPaymentSentModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [allTxps, setAllTxps] = useState(
    [] as {
      title: string;
      type: string;
      data: any[];
    }[],
  );
  const [selectingProposalsWalletId, setSelectingProposalsWalletId] =
    useState('');
  const [txpsToSign, setTxpsToSign] = useState([] as TransactionProposal[]);
  const [txpChecked, setTxpChecked] = useState(
    {} as {
      [key in string]: boolean;
    },
  );

  let pendingTxps: TransactionProposal[] = [];
  _.each(wallets, x => {
    if (x.pendingTxps.length > 0) {
      pendingTxps = pendingTxps.concat(x.pendingTxps);
    }
  });

  if (walletId) {
    pendingTxps = _.filter(pendingTxps, txp => {
      return txp.walletId === walletId;
    });
  }

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>{t('Notifications')}</HeaderTitle>,
    });
  }, [navigation, t]);

  const setTxpsByStatus = (txps: TransactionProposal[]): void => {
    let txpsPending: TransactionProposal[] = [];
    let txpsAccepted: TransactionProposal[] = [];
    let txpsRejected: TransactionProposal[] = [];

    txps.forEach(txp => {
      // Check if txp were checked before
      let _txpChecked: any = {};
      _txpChecked[txp.id] = _.indexOf(txpsToSign, txp) >= 0 ? true : false;

      setTxpChecked({...txpChecked, ..._txpChecked});

      const action: any = _.find(txp.actions, {
        copayerId: txp.copayerId,
      });

      if ((!action || action.type === 'failed') && txp.status === 'pending') {
        txp.pendingForUs = true;
      }

      if (action && action.type === 'accept') {
        txp.statusForUs = 'accepted';
        txpsAccepted.push(txp);
      } else if (action && action.type === 'reject') {
        txp.statusForUs = 'rejected';
        txpsRejected.push(txp);
      } else {
        txp.statusForUs = 'pending';
        txpsPending.push(txp);
      }
    });
    setAllTxpsByWallet({txpsPending, txpsAccepted, txpsRejected});
  };

  const getTxpToBeSigned = (txpsPerWallet: TransactionProposal[]): number => {
    let i = 0;
    txpsPerWallet.forEach(txp => {
      if (txp.statusForUs === 'pending') {
        i = i + 1;
      }
    });
    return i;
  };

  const groupByWallets = (txps: TransactionProposal[]): any[] => {
    const walletIdGetter = (txp: TransactionProposal) => txp.walletId;
    const map = new Map();
    const txpsByWallet: any[] = [];

    txps.forEach((txp: TransactionProposal) => {
      const _walletId = walletIdGetter(txp);
      const collection = map.get(_walletId);

      if (!collection) {
        map.set(_walletId, [txp]);
      } else {
        collection.push(txp);
      }
    });
    Array.from(map).forEach(txpsPerWallet => {
      const txpToBeSigned = getTxpToBeSigned(txpsPerWallet[1]);
      txpsByWallet.push({
        id: Math.random(),
        walletId: txpsPerWallet[0],
        txps: txpsPerWallet[1],
        multipleSignAvailable: txpToBeSigned > 1,
      });
    });
    return txpsByWallet;
  };

  const setAllTxpsByWallet = ({
    txpsPending,
    txpsAccepted,
    txpsRejected,
  }: {
    txpsPending: TransactionProposal[];
    txpsAccepted: TransactionProposal[];
    txpsRejected: TransactionProposal[];
  }): void => {
    let _allTxps = [];
    if (txpsPending.length > 0) {
      _allTxps.push({
        title: t('Payment Proposal'),
        type: 'pending',
        data: groupByWallets(txpsPending),
      });
    }
    if (txpsAccepted.length > 0) {
      _allTxps.push({
        title: t('Accepted'),
        type: 'accepted',
        data: groupByWallets(txpsAccepted),
      });
    }
    if (txpsRejected.length > 0) {
      _allTxps.push({
        title: t('Rejected'),
        type: 'rejected',
        data: groupByWallets(txpsRejected),
      });
    }
    setAllTxps(_allTxps);
    if (navigation.canGoBack() && _allTxps.length === 0) {
      navigation.goBack();
    }
  };

  const updatePendingProposals = (): void => {
    setTxpsByStatus(pendingTxps);
  };

  const onPressTxp = useMemo(
    () => (transaction: TransactionProposal, fullWalletObj: Wallet) => {
      const key = keys[fullWalletObj.keyId];
      navigation.navigate('Wallet', {
        screen: 'TransactionProposalDetails',
        params: {wallet: fullWalletObj, transaction, key},
      });
    },
    [keys, navigation],
  );

  const txpSelectionChange = useCallback(
    (txp: TransactionProposal) => {
      let _txpChecked: {
        [key in string]: boolean;
      } = {};
      if (_.indexOf(txpsToSign, txp) >= 0) {
        _.remove(txpsToSign, txpToSign => {
          return txpToSign.id === txp.id;
        });
        _txpChecked[txp.id] = false;
      } else {
        _txpChecked[txp.id] = true;
        txpsToSign.push(txp);
      }
      setTxpsToSign(txpsToSign);
      setTxpChecked({...txpChecked, ..._txpChecked});
    },
    [setTxpsToSign, setTxpChecked, txpsToSign, txpChecked],
  );

  const showErrorMessage = useCallback(
    async (msg: BottomNotificationConfig) => {
      await sleep(500);
      dispatch(showBottomNotificationModal(msg));
    },
    [dispatch],
  );

  const onPressSelectProposals = useCallback(
    (_walletId: string) => {
      _walletId === selectingProposalsWalletId
        ? setSelectingProposalsWalletId('')
        : setSelectingProposalsWalletId(_walletId);
      // remove old selections
      setTxpsToSign([]);
      setTxpChecked({});
    },
    [
      setTxpsToSign,
      setTxpChecked,
      setSelectingProposalsWalletId,
      selectingProposalsWalletId,
    ],
  );

  const renderTxpByWallet = useCallback(
    ({item}) => {
      const fullWalletObj = findWalletById(wallets, item.walletId) as Wallet;
      const {
        img,
        currencyAbbreviation,
        currencyName,
        credentials: {walletName, m, n, walletId: _walletId},
      } = fullWalletObj;
      return (
        <>
          <RowContainer
            disabled={!item.multipleSignAvailable}
            style={{opacity: 1}}
            onPress={
              item.multipleSignAvailable
                ? () => onPressSelectProposals(_walletId)
                : () => {}
            }>
            <CurrencyImageContainer>
              <CurrencyImage img={img} size={45} />
            </CurrencyImageContainer>
            <CurrencyColumn>
              <Row>
                <H5 ellipsizeMode="tail" numberOfLines={1}>
                  {walletName || currencyName}
                </H5>
              </Row>
              <ListItemSubText>
                {currencyAbbreviation.toUpperCase()} {`- Multisig ${m}/${n}`}
              </ListItemSubText>
            </CurrencyColumn>
            {item.multipleSignAvailable ? (
              <HamburgerContainer>
                <HamburgerSvg />
              </HamburgerContainer>
            ) : null}
          </RowContainer>
          {item?.txps[0]
            ? item.txps.map((txp: any) => (
                <ProposalsContainer key={txp.id}>
                  {selectingProposalsWalletId === _walletId ? (
                    <CheckBoxContainer>
                      <Checkbox
                        checked={txpChecked[txp.id]}
                        onPress={() => {
                          txpSelectionChange(txp);
                        }}
                      />
                    </CheckBoxContainer>
                  ) : null}
                  <ProposalsInfoContainer>
                    <TransactionProposalRow
                      icon={txp.uiIcon}
                      creator={txp.uiCreator}
                      time={txp.uiTime}
                      value={txp.uiValue}
                      onPressTransaction={() => onPressTxp(txp, fullWalletObj)}
                      hideIcon={true}
                    />
                  </ProposalsInfoContainer>
                </ProposalsContainer>
              ))
            : null}
        </>
      );
    },
    [
      wallets,
      onPressSelectProposals,
      selectingProposalsWalletId,
      txpChecked,
      txpSelectionChange,
      onPressTxp,
    ],
  );

  const keyExtractor = useCallback(item => item.id, []);

  const getItemLayout = useCallback(
    (data, index) => ({
      length: TRANSACTION_ROW_HEIGHT,
      offset: TRANSACTION_ROW_HEIGHT * index,
      index,
    }),
    [],
  );

  const listFooterComponent = () => {
    return (
      <>
        {!allTxps?.length ? null : (
          <View style={{marginBottom: 20}}>
            <BorderBottom />
          </View>
        )}
      </>
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await sleep(1000);
    try {
      await dispatch(startGetRates({force: true}));
      await dispatch(startUpdateAllKeyAndWalletStatus());
    } catch (err) {
      dispatch(showBottomNotificationModal(BalanceUpdateError()));
    }
    setRefreshing(false);
  };

  const countSuccessAndFailed = (
    arrayData: (TransactionProposal | Error)[],
  ) => {
    const count = {success: 0, failed: 0};
    arrayData.forEach((data: TransactionProposal | Error) => {
      if (data instanceof Error) {
        count.failed = count.failed + 1;
      } else if (data.id) {
        count.success = count.success + 1;
      }
    });
    return count;
  };

  useEffect(() => {
    updatePendingProposals();
  }, [keys]);

  useEffect(() => {
    if (!resetSwipeButton) {
      return;
    }
    const timer = setTimeout(() => {
      setResetSwipeButton(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [resetSwipeButton]);

  return (
    <NotificationsContainer>
      <SectionList
        refreshControl={
          <RefreshControl
            tintColor={theme.dark ? White : SlateDark}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        ListHeaderComponent={() => {
          return <ListHeaderPadding />;
        }}
        sections={allTxps}
        stickyHeaderIndices={[allTxps?.length]}
        stickySectionHeadersEnabled={true}
        keyExtractor={keyExtractor}
        renderItem={renderTxpByWallet}
        renderSectionHeader={({section: {title}}) => {
          return (
            <TransactionSectionHeaderContainer>
              <H5>{title}</H5>
            </TransactionSectionHeaderContainer>
          );
        }}
        ItemSeparatorComponent={() => <BorderBottom />}
        ListFooterComponent={listFooterComponent}
        onEndReachedThreshold={0.5}
        maxToRenderPerBatch={15}
        getItemLayout={getItemLayout}
      />

      {txpsToSign && Object.values(txpsToSign)[0] ? (
        <SwipeButton
          title={t('Slide to send')}
          forceReset={resetSwipeButton}
          onSwipeComplete={async () => {
            try {
              dispatch(
                startOnGoingProcessModal(
                  //  t('Sending Payment')
                  t(OnGoingProcessMessages.SENDING_PAYMENT),
                ),
              );
              await sleep(400);
              const wallet = findWalletById(
                wallets,
                selectingProposalsWalletId,
              ) as Wallet;
              const key = keys[wallet.keyId];
              const data = (await dispatch<any>(
                publishAndSignMultipleProposals({
                  txps: Object.values(txpsToSign),
                  key,
                  wallet,
                }),
              )) as (TransactionProposal | Error)[];
              const count = countSuccessAndFailed(data);
              if (count.failed > 0) {
                const errMsg = `There was problem while trying to sign ${count.failed} of your transactions proposals. Please, try again`;
                await showErrorMessage(
                  CustomErrorMessage({
                    errMsg,
                    title: t('Uh oh, something went wrong'),
                  }),
                );
              }
              dispatch(dismissOnGoingProcessModal());

              if (count.success > 0) {
                dispatch(
                  logSegmentEvent(
                    'track',
                    'Sent Crypto',
                    {
                      context: 'Transaction Proposal Notifications',
                      coin: wallet.currencyAbbreviation || '',
                    },
                    true,
                  ),
                );
                await sleep(400);
                setShowPaymentSentModal(true);
              }
              setResetSwipeButton(true);
            } catch (err) {
              dispatch(dismissOnGoingProcessModal());
              await sleep(500);
              setResetSwipeButton(true);
              switch (err) {
                case 'invalid password':
                  dispatch(showBottomNotificationModal(WrongPasswordError()));
                  break;
                case 'password canceled':
                  break;
                default:
                  await showErrorMessage(
                    CustomErrorMessage({
                      errMsg: BWCErrorMessage(err),
                      title: t('Uh oh, something went wrong'),
                    }),
                  );
              }
            }
          }}
        />
      ) : null}

      <PaymentSent
        isVisible={showPaymentSentModal}
        onCloseModal={async () => {
          setShowPaymentSentModal(false);
          await sleep(300);
          // if (navigation.canGoBack() && _allTxps.length === 0) {
          //   navigation.goBack();
          // }
        }}
      />
    </NotificationsContainer>
  );
};

export default TransactionProposalNotifications;
