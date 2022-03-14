import React, {useEffect, useLayoutEffect, useState} from 'react';
import {useNavigation, useRoute, CommonActions} from '@react-navigation/native';
import {HeaderBackButton} from '@react-navigation/elements';

import styled from 'styled-components/native';
import {
  Column,
  Hr,
  Row,
  ScreenGutter,
} from '../../../../components/styled/Containers';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../../WalletStack';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {ScrollView, View} from 'react-native';
import {H4, H5, H6, H7, TextAlign} from '../../../../components/styled/Text';
import {
  InvoiceCreationParams,
  Key,
  Recipient,
  TransactionProposal,
  TxDetails,
  Wallet,
} from '../../../../store/wallet/wallet.models';
import SwipeButton from '../../../../components/swipe-button/SwipeButton';
import {
  createInvoiceAndTxProposal,
  startSendPayment,
} from '../../../../store/wallet/effects/send/send';
import PaymentSent from '../../components/PaymentSent';
import {sleep, formatFiatAmount} from '../../../../utils/helper-methods';
import {startOnGoingProcessModal} from '../../../../store/app/app.effects';
import {OnGoingProcessMessages} from '../../../../components/modal/ongoing-process/OngoingProcess';
import {dismissOnGoingProcessModal} from '../../../../store/app/app.actions';
import SendToPill from '../../components/SendToPill';
import {SUPPORTED_CURRENCIES} from '../../../../constants/currencies';
import {CurrencyListIcons} from '../../../../constants/SupportedCurrencyOptions';
import DefaultSvg from '../../../../../assets/img/currencies/default.svg';
import RemoteImage from '../../../tabs/shop/components/RemoteImage';
import SheetModal from '../../../../components/modal/base/sheet/SheetModal';
import {
  WalletSelectMenuBodyContainer,
  WalletSelectMenuContainer,
  WalletSelectMenuHeaderContainer,
} from '../GlobalSelect';
import KeyWalletsRow, {
  KeyWalletsRowProps,
} from '../../../../components/list/KeyWalletsRow';
import merge from 'lodash.merge';
import cloneDeep from 'lodash.clonedeep';
import {ShopActions, ShopEffects} from '../../../../store/shop';

const ConfirmContainer = styled.SafeAreaView`
  flex: 1;
  width: 100%;
`;

const Header = styled(H6)`
  margin-top: 20px;
  margin-bottom: 15px;
  justify-content: center;
  text-transform: uppercase;
`;

interface DetailContainerParams {
  height?: number;
}

const DetailContainer = styled.View<DetailContainerParams>`
  min-height: 53px;
  padding: 20px 0;
  justify-content: center;
  ${({height}) => (height ? `height: ${height}px;` : '')}
`;

const DetailRow = styled(Row)`
  align-items: center;
  justify-content: space-between;
`;

const DetailColumn = styled(Column)`
  align-items: flex-end;
`;

const DetailsList = styled(ScrollView)`
  padding: 0 ${ScreenGutter};
`;

export interface ConfirmParamList {
  wallet?: Wallet;
  recipient?: Recipient;
  txp?: Partial<TransactionProposal>;
  txDetails?: TxDetails;
  invoiceCreationParams?: InvoiceCreationParams;
}

const Confirm = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<WalletStackParamList, 'Confirm'>>();
  const {
    wallet: _wallet,
    recipient: _recipient,
    txDetails: _txDetails,
    txp: _txp,
    invoiceCreationParams,
  } = route.params;
  const keys = useAppSelector(({WALLET}) => WALLET.keys);

  const [walletSelectModalVisible, setWalletSelectModalVisible] =
    useState(false);
  const [key, setKey] = useState(keys[_wallet ? _wallet.keyId : '']);
  const [wallet, setWallet] = useState(_wallet);
  const [recipient, setRecipient] = useState(_recipient);
  const [txDetails, updateTxDetails] = useState(_txDetails);
  const [txp, updateTxp] = useState(_txp);
  const [showPaymentSentModal, setShowPaymentSentModal] = useState(false);
  const [keyWallets, setKeysWallets] = useState<KeyWalletsRowProps[]>();

  const {fee, networkCost, sendingFrom, sendingTo, subTotal, total} =
    txDetails || {};
  const {recipientName, recipientAddress} = sendingTo || {};

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: (props: any) => (
        <HeaderBackButton
          {...props}
          onPress={() => {
            if (invoiceCreationParams?.cardConfig && txp) {
              dispatch(
                ShopActions.deletedUnsoldGiftCard({
                  invoiceId: txp.invoiceID!,
                }),
              );
            }
            navigation.goBack();
          }}
        />
      ),
    });
  });

  const openKeyWalletSelector = (allKeys: {[name: string]: Key}) => {
    setKeysWallets(
      Object.keys(allKeys).map(keyId => {
        const keyObj = allKeys[keyId];
        return {
          key: keyId,
          keyName: keyObj.keyName || 'My Key',
          wallets: allKeys[keyId].wallets.map(walletObj => {
            const {
              balance,
              currencyAbbreviation,
              credentials: {network},
            } = walletObj;
            return merge(cloneDeep(walletObj), {
              cryptoBalance: balance.crypto,
              fiatBalance: formatFiatAmount(balance.fiat, 'USD'),
              currencyAbbreviation,
              network,
            });
          }),
        };
      }),
    );
    setWalletSelectModalVisible(true);
  };

  const onWalletSelect = async (selectedWallet: Wallet) => {
    setWallet(selectedWallet);
    setKey(keys[selectedWallet.keyId]);
    setWalletSelectModalVisible(false);
    if (!invoiceCreationParams) {
      return;
    }
    await sleep(500);
    dispatch(
      startOnGoingProcessModal(OnGoingProcessMessages.FETCHING_PAYMENT_INFO),
    );
    const {txDetails: newTxDetails, txp: newTxp} = await dispatch(
      createInvoiceAndTxProposal(selectedWallet, invoiceCreationParams),
    );
    dispatch(dismissOnGoingProcessModal());
    updateTxDetails(newTxDetails);
    updateTxp(newTxp);
    setRecipient({address: newTxDetails.sendingTo.recipientAddress} as {
      address: string;
    });
  };

  useEffect(() => {
    if (!invoiceCreationParams || !invoiceCreationParams.cardConfig) {
      return;
    }
    openKeyWalletSelector(keys);
  }, []);

  const getIcon = () => {
    const currency = wallet?.currencyAbbreviation;
    return currency && SUPPORTED_CURRENCIES.includes(currency) ? (
      CurrencyListIcons[currency]({width: 18, height: 18, marginRight: 3})
    ) : (
      <DefaultSvg width={18} height={18} />
    );
  };

  const SendingFromRow = () => {
    return (
      <>
        <DetailContainer height={83}>
          <DetailRow>
            <H7>Sending from</H7>
            <SendToPill
              icon={wallet ? getIcon() : undefined}
              onPress={
                invoiceCreationParams
                  ? () => openKeyWalletSelector(keys)
                  : undefined
              }
              description={
                wallet
                  ? wallet.walletName || wallet.credentials.walletName
                  : 'Select Wallet'
              }
            />
          </DetailRow>
        </DetailContainer>
        <Hr />
      </>
    );
  };

  return (
    <ConfirmContainer>
      <DetailsList>
        {invoiceCreationParams ? (
          <>
            {invoiceCreationParams.cardConfig ? (
              <>
                <Header>
                  {invoiceCreationParams.cardConfig.displayName} Gift Card
                </Header>
                <Hr />
                <DetailContainer height={73}>
                  <DetailRow>
                    <H4>
                      {formatFiatAmount(
                        invoiceCreationParams.amount,
                        invoiceCreationParams.cardConfig.currency,
                      )}{' '}
                      {invoiceCreationParams.cardConfig.currency}
                    </H4>
                    <RemoteImage
                      uri={invoiceCreationParams.cardConfig.icon}
                      height={40}
                      borderRadius={40}
                    />
                  </DetailRow>
                </DetailContainer>
                <Hr style={{marginBottom: 40}} />
              </>
            ) : null}
          </>
        ) : null}
        <Header>Summary</Header>
        <Hr />
        {invoiceCreationParams ? <>{SendingFromRow()}</> : null}
        {sendingTo && !invoiceCreationParams ? (
          <>
            <DetailContainer>
              <DetailRow>
                <H7>Sending to</H7>
                <SendToPill
                  icon={getIcon()}
                  description={recipientName || recipientAddress || ''}
                />
              </DetailRow>
            </DetailContainer>
            <Hr />
          </>
        ) : null}
        {networkCost ? (
          <>
            <DetailContainer>
              <DetailRow>
                <H7>Network Cost</H7>
                <DetailColumn>
                  <H7>{networkCost?.fiatAmount}</H7>
                </DetailColumn>
              </DetailRow>
            </DetailContainer>
            <Hr />
          </>
        ) : null}
        {fee ? (
          <>
            <DetailContainer>
              <DetailRow>
                <H7>Miner fee</H7>
                <DetailColumn>
                  {!invoiceCreationParams ? (
                    <>
                      <H5>{fee.feeLevel.toUpperCase()}</H5>
                      <H6>{fee.cryptoAmount}</H6>
                    </>
                  ) : null}
                  <H7>
                    {fee.fiatAmount}{' '}
                    {!invoiceCreationParams ? (
                      <> ({fee.percentageOfTotalAmount} of total amount) </>
                    ) : null}
                  </H7>
                </DetailColumn>
              </DetailRow>
            </DetailContainer>
            <Hr />
          </>
        ) : null}
        {sendingFrom && !invoiceCreationParams ? <>{SendingFromRow()}</> : null}
        {subTotal && !invoiceCreationParams ? (
          <>
            <DetailContainer>
              <DetailRow>
                <H6>SUBTOTAL</H6>
                <DetailColumn>
                  <H4>{subTotal.cryptoAmount}</H4>
                  <H7>{subTotal.fiatAmount}</H7>
                </DetailColumn>
              </DetailRow>
            </DetailContainer>
          </>
        ) : null}
        {total ? (
          <>
            <DetailContainer>
              <DetailRow>
                <H6>TOTAL</H6>
                <View>
                  <DetailColumn>
                    <H4>{total.cryptoAmount}</H4>
                    <H7>{total.fiatAmount}</H7>
                  </DetailColumn>
                </View>
              </DetailRow>
            </DetailContainer>
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
                if (invoiceCreationParams?.cardConfig && txp.invoiceID) {
                  const giftCard = await dispatch(
                    ShopEffects.startRedeemGiftCard(txp.invoiceID),
                  );
                  dispatch(dismissOnGoingProcessModal());
                  await sleep(400);
                  navigation.dispatch(
                    CommonActions.reset({
                      index: 2,
                      routes: [
                        {
                          name: 'Tabs',
                          params: {screen: 'Shop'},
                        },
                        {
                          name: 'GiftCard',
                          params: {
                            screen: 'GiftCardDetails',
                            params: {
                              giftCard,
                              cardConfig: invoiceCreationParams.cardConfig,
                            },
                          },
                        },
                      ],
                    }),
                  );
                  return;
                }
                dispatch(dismissOnGoingProcessModal());
                await sleep(400);
                setShowPaymentSentModal(true);
              } catch (err) {}
            }}
          />
        </>
      ) : null}

      <SheetModal
        isVisible={walletSelectModalVisible}
        onBackdropPress={() => setWalletSelectModalVisible(false)}>
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
          navigation.navigate('Wallet', {
            screen: 'WalletDetails',
            params: {
              walletId: wallet!.id,
              key,
            },
          });
          await sleep(300);
          setShowPaymentSentModal(false);
        }}
      />
    </ConfirmContainer>
  );
};

export default Confirm;
