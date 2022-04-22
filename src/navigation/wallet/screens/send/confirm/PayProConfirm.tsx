import React, {useEffect, useMemo, useState} from 'react';
import {useNavigation, useRoute, CommonActions} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../../../WalletStack';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {H4, TextAlign} from '../../../../../components/styled/Text';
import SecureLockIcon from '../../../../../../assets/img/secure-lock.svg';
import {
  Recipient,
  TransactionProposal,
  TxDetails,
  Wallet,
} from '../../../../../store/wallet/wallet.models';
import SwipeButton from '../../../../../components/swipe-button/SwipeButton';
import {
  createPayProTxProposal,
  handleCreateTxProposalError,
  removeTxp,
  showNoWalletsModal,
  startSendPayment,
} from '../../../../../store/wallet/effects/send/send';
import PaymentSent from '../../../components/PaymentSent';
import {sleep} from '../../../../../utils/helper-methods';
import {startOnGoingProcessModal} from '../../../../../store/app/app.effects';
import {OnGoingProcessMessages} from '../../../../../components/modal/ongoing-process/OngoingProcess';
import {dismissOnGoingProcessModal} from '../../../../../store/app/app.actions';
import SheetModal from '../../../../../components/modal/base/sheet/SheetModal';
import {
  WalletSelectMenuBodyContainer,
  WalletSelectMenuContainer,
  WalletSelectMenuHeaderContainer,
} from '../../GlobalSelect';
import KeyWalletsRow, {
  KeyWalletsRowProps,
} from '../../../../../components/list/KeyWalletsRow';
import {BuildKeysAndWalletsList} from '../../../../../store/wallet/utils/wallet';
import {
  Amount,
  ConfirmContainer,
  DetailsList,
  Fee,
  Header,
  SendingFrom,
  SendingTo,
} from './Shared';
import {AppActions} from '../../../../../store/app';
import {CustomErrorMessage} from '../../../components/ErrorMessages';
import {PayProOptions} from '../../../../../store/wallet/effects/paypro/paypro';

export interface PayProConfirmParamList {
  wallet?: Wallet;
  recipient?: Recipient;
  txp?: TransactionProposal;
  txDetails?: TxDetails;
  payProOptions: PayProOptions;
}

const PayProConfirm = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<WalletStackParamList, 'PayProConfirm'>>();
  const {
    payProOptions,
    wallet: _wallet,
    recipient: _recipient,
    txDetails: _txDetails,
    txp: _txp,
  } = route.params!;
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);

  const [walletSelectModalVisible, setWalletSelectModalVisible] =
    useState(false);
  const [key, setKey] = useState(keys[_wallet ? _wallet.keyId : '']);
  const [wallet, setWallet] = useState(_wallet);
  const [recipient, setRecipient] = useState(_recipient);
  const [txDetails, updateTxDetails] = useState(_txDetails);
  const [txp, updateTxp] = useState(_txp);
  const [keyWallets, setKeysWallets] = useState<KeyWalletsRowProps[]>();
  const [showPaymentSentModal, setShowPaymentSentModal] = useState(false);
  const {fee, sendingFrom, subTotal, total} = txDetails || {};
  const payProHost = payProOptions.payProUrl
    .replace('https://', '')
    .split('/')[0];

  const memoizedKeysAndWalletsList = useMemo(
    () =>
      BuildKeysAndWalletsList({
        keys,
        payProOptions,
        defaultAltCurrencyIsoCode: defaultAltCurrency.isoCode,
      }),
    [keys, payProOptions],
  );

  const reshowWalletSelector = async () => {
    await sleep(400);
    setWalletSelectModalVisible(true);
  };

  const createTxp = async (selectedWallet: Wallet) => {
    dispatch(
      startOnGoingProcessModal(OnGoingProcessMessages.FETCHING_PAYMENT_INFO),
    );
    try {
      const {txDetails: newTxDetails, txp: newTxp} = await dispatch(
        await createPayProTxProposal({
          wallet: selectedWallet,
          paymentUrl: payProOptions.payProUrl,
          payProOptions,
          invoiceID: payProOptions.paymentId,
        }),
      );
      setWallet(selectedWallet);
      setKey(keys[selectedWallet.keyId]);
      await sleep(400);
      dispatch(dismissOnGoingProcessModal());
      updateTxDetails(newTxDetails);
      updateTxp(newTxp);
      setRecipient({address: newTxDetails.sendingTo.recipientAddress} as {
        address: string;
      });
    } catch (err: any) {
      await sleep(400);
      dispatch(dismissOnGoingProcessModal());
      const [errorConfig] = await Promise.all([
        handleCreateTxProposalError(err),
        sleep(500),
      ]);
      dispatch(
        AppActions.showBottomNotificationModal(
          CustomErrorMessage({
            title: 'Error',
            errMsg:
              err.response?.data?.message || err.message || errorConfig.message,
            action: () => (wallet ? null : reshowWalletSelector()),
          }),
        ),
      );
    }
  };

  useEffect(() => {
    wallet ? createTxp(wallet) : setTimeout(() => openKeyWalletSelector(), 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openKeyWalletSelector = () => {
    if (memoizedKeysAndWalletsList.length) {
      setKeysWallets(memoizedKeysAndWalletsList);
      setWalletSelectModalVisible(true);
    } else {
      dispatch(showNoWalletsModal({navigation}));
    }
  };

  const onWalletSelect = async (selectedWallet: Wallet) => {
    setWalletSelectModalVisible(false);
    // not ideal - will dive into why the timeout has to be this long
    await sleep(400);
    createTxp(selectedWallet);
  };

  return (
    <ConfirmContainer>
      <DetailsList>
        <Header hr>Summary</Header>
        <SendingTo
          recipient={{
            recipientName: payProHost,
            img: () => (
              <SecureLockIcon height={18} width={18} style={{marginTop: -2}} />
            ),
          }}
          hr
        />
        {txp && recipient && wallet ? (
          <>
            <Fee
              fee={fee}
              hideFeeOptions
              currencyAbbreviation={wallet.currencyAbbreviation}
              hr
            />
            <SendingFrom
              sender={sendingFrom!}
              onPress={openKeyWalletSelector}
              hr
            />
            <Amount description={'SubTotal'} amount={subTotal} />
            <Amount description={'Total'} amount={total} />
          </>
        ) : null}
      </DetailsList>
      {txp && recipient && wallet ? (
        <>
          <SwipeButton
            title={'Slide to send'}
            onSwipeComplete={async () => {
              try {
                dispatch(
                  startOnGoingProcessModal(
                    OnGoingProcessMessages.SENDING_PAYMENT,
                  ),
                );
                await sleep(400);
                await dispatch(startSendPayment({txp, key, wallet, recipient}));
                dispatch(dismissOnGoingProcessModal());
                await sleep(400);
                setShowPaymentSentModal(true);
              } catch (err: any) {
                await removeTxp(wallet, txp).catch(removeErr =>
                  console.error('error deleting txp', removeErr),
                );
                dispatch(dismissOnGoingProcessModal());
                await sleep(400);
                updateTxDetails(undefined);
                updateTxp(undefined);
                setWallet(undefined);
                dispatch(
                  AppActions.showBottomNotificationModal(
                    CustomErrorMessage({
                      title: 'Error',
                      errMsg: err.message || 'Could not send transaction',
                      action: () => reshowWalletSelector(),
                    }),
                  ),
                );
              }
            }}
          />
        </>
      ) : null}

      <SheetModal
        isVisible={walletSelectModalVisible}
        onBackdropPress={async () => {
          setWalletSelectModalVisible(false);
          await sleep(100);
          navigation.goBack();
        }}>
        <WalletSelectMenuContainer>
          <WalletSelectMenuHeaderContainer>
            <TextAlign align={'center'}>
              <H4>Select a wallet</H4>
            </TextAlign>
          </WalletSelectMenuHeaderContainer>
          <WalletSelectMenuBodyContainer>
            <KeyWalletsRow keyWallets={keyWallets!} onPress={onWalletSelect} />
          </WalletSelectMenuBodyContainer>
        </WalletSelectMenuContainer>
      </SheetModal>

      <PaymentSent
        isVisible={showPaymentSentModal}
        onCloseModal={async () => {
          navigation.dispatch(
            CommonActions.reset({
              index: 2,
              routes: [
                {
                  name: 'Tabs',
                  params: {screen: 'Home'},
                },
                {
                  name: 'Wallet',
                  params: {
                    screen: 'WalletDetails',
                    params: {
                      walletId: wallet!.id,
                      key,
                    },
                  },
                },
              ],
            }),
          );
          await sleep(0);
          setShowPaymentSentModal(false);
        }}
      />
    </ConfirmContainer>
  );
};

export default PayProConfirm;
