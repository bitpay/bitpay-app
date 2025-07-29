import React, {useEffect, useState} from 'react';
import {Platform, RefreshControl, Text} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {
  RouteProp,
  useRoute,
  useNavigation,
  useTheme,
} from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';
import moment from 'moment';
import {Link} from '../../../../../components/styled/Text';
import {SettingsContainer, SettingsComponent} from '../../SettingsRoot';
import haptic from '../../../../../components/haptic-feedback/haptic';
import MoonpayLogo from '../../../../../components/icons/external-services/moonpay/moonpay-logo';
import {
  useAppDispatch,
  useAppSelector,
  useLogger,
} from '../../../../../utils/hooks';
import {
  showBottomNotificationModal,
  dismissBottomNotificationModal,
} from '../../../../../store/app/app.actions';
import {openUrlWithInAppBrowser} from '../../../../../store/app/app.effects';
import {SellCryptoActions} from '../../../../../store/sell-crypto';
import {
  RowDataContainer,
  CryptoAmountContainer,
  CryptoTitle,
  CryptoContainer,
  CryptoAmount,
  CryptoUnit,
  RowLabel,
  RowData,
  LabelTip,
  LabelTipText,
  ColumnDataContainer,
  ColumnData,
  RemoveCta,
  CopiedContainer,
  CopyImgContainerRight,
  ExternalServiceContainer,
} from '../styled/ExternalServicesDetails';
import {useTranslation} from 'react-i18next';
import CopiedSvg from '../../../../../../assets/img/copied-success.svg';
import {BitpaySupportedCoins} from '../../../../../constants/currencies';
import {moonpayGetSellTransactionDetails} from '../../../../../store/buy-crypto/effects/moonpay/moonpay';
import {
  moonpaySellEnv,
  moonpaySellGetStatusColor,
  moonpaySellGetStatusDetails,
  MoonpaySellStatus,
} from '../../../../services/sell-crypto/utils/moonpay-sell-utils';
import {Br} from '../../../../../components/styled/Containers';
import {sleep} from '../../../../../utils/helper-methods';
import {SlateDark, White} from '../../../../../styles/colors';
import {
  MoonpayCancelSellTransactionRequestData,
  MoonpaySellOrderData,
  MoonpaySellOrderStatus,
  MoonpaySellTransactionDetails,
} from '../../../../../store/sell-crypto/models/moonpay-sell.models';
import {RootState} from '../../../../../store';
import {Wallet} from '../../../../../store/wallet/wallet.models';

export interface MoonpaySellDetailsProps {
  sellOrder: MoonpaySellOrderData;
}

const copyText = (text: string) => {
  haptic('impactLight');
  Clipboard.setString(text);
};

const MoonpaySellDetails: React.FC = () => {
  const {t} = useTranslation();
  const {
    params: {sellOrder},
  } = useRoute<RouteProp<{params: MoonpaySellDetailsProps}>>();
  const navigation = useNavigation();
  const logger = useLogger();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const allKeys = useAppSelector(({WALLET}: RootState) => WALLET.keys);
  const [status, setStatus] = useState<MoonpaySellStatus>({
    statusTitle: undefined,
    statusDescription: undefined,
  });
  const [sourceWallet, setSourceWallet] = useState<Wallet>();
  const [refreshing, setRefreshing] = useState(false);
  const [copiedDepositAddress, setCopiedDepositAddress] = useState(false);
  const [copiedRefundAddress, setCopiedRefundAddress] = useState(false);
  const [copiedTransactionSentId, setCopiedTransactionSentId] = useState(false);
  const [copiedExternalId, setCopiedExternalId] = useState(false);
  const [copiedTransactionId, setCopiedTransactionId] = useState(false);

  const updateStatusDescription = () => {
    setStatus(moonpaySellGetStatusDetails(sellOrder.status));
  };

  const getSellTransactionDetails = (force?: boolean) => {
    if (
      ['bitpayCanceled'].includes(sellOrder.status) ||
      (['completed', 'failed'].includes(sellOrder.status) && !force)
    ) {
      return;
    }

    moonpayGetSellTransactionDetails(
      sellOrder.transaction_id,
      sellOrder.external_id,
    )
      .then((data: MoonpaySellTransactionDetails) => {
        if (!data || data.type === 'NotFoundError') {
          logger.error(
            'Moonpay getSellTransactionDetails Error: ' + data.message,
          );
          return;
        }

        let shouldUpdate = false;
        if (
          !sellOrder.status ||
          data.status != sellOrder.status ||
          (data.status === 'failed' && data.failureReason)
        ) {
          if (
            sellOrder.status === 'bitpayTxSent' &&
            data.status === 'waitingForDeposit'
          ) {
            logger.debug(
              `Status not updated: Current status is: ${sellOrder.status}, but Moonpay is still waiting for deposit. Ask for support.`,
            );
          } else {
            logger.debug(
              `Updating status from: ${sellOrder.status} to: ${data.status}`,
            );
            sellOrder.status = data.status;
            if (
              data.status === 'failed' &&
              data.failureReason &&
              sellOrder.failure_reason !== data.failureReason
            ) {
              logger.debug(
                `Updating failure reason from: ${sellOrder.failure_reason} to: ${data.failureReason}`,
              );
              sellOrder.failure_reason = data.failureReason;
            }
            updateStatusDescription();
            shouldUpdate = true;
          }
        }

        if (
          data.id &&
          (!sellOrder.transaction_id || sellOrder.transaction_id !== data.id)
        ) {
          logger.debug(
            `Updating transaction_id from: ${sellOrder.transaction_id} to: ${data.id}`,
          );
          sellOrder.transaction_id = data.id;
          shouldUpdate = true;
        }

        if (!sellOrder.address_to && data.depositWallet?.walletAddress) {
          logger.debug(
            `Updating address_to from: ${sellOrder.address_to} to: ${data.depositWallet.walletAddress}`,
          );
          sellOrder.address_to = data.depositWallet.walletAddress;
          shouldUpdate = true;
        }

        if (
          data.quoteCurrencyAmount &&
          typeof data.quoteCurrencyAmount === 'number' &&
          sellOrder.fiat_receiving_amount !== data.quoteCurrencyAmount
        ) {
          logger.debug(
            `Updating fiat_receiving_amount from: ${sellOrder.fiat_receiving_amount} to: ${data.quoteCurrencyAmount}`,
          );
          sellOrder.fiat_receiving_amount = data.quoteCurrencyAmount;
          shouldUpdate = true;
        }

        if (shouldUpdate) {
          const stateParams = {
            externalId: sellOrder.external_id,
            transactionId: sellOrder.transaction_id,
            status: sellOrder.status,
            depositWalletAddress: sellOrder.address_to,
            failureReason: sellOrder.failure_reason,
            fiatAmount: sellOrder.fiat_receiving_amount,
          };

          dispatch(
            SellCryptoActions.updateSellOrderMoonpay({
              moonpaySellIncomingData: stateParams,
            }),
          );

          logger.debug('Saved sell order with: ' + JSON.stringify(sellOrder));
        }
      })
      .catch(err => {
        logger.error(
          'Moonpay getSellTransactionDetails Error: ' + JSON.stringify(err),
        );
      });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([getSellTransactionDetails(true), sleep(1000)]);
    setRefreshing(false);
  };

  const getWallet = () => {
    let wallet: Wallet | undefined;
    let allWallets: Wallet[] = [];

    const keysList = Object.values(allKeys);
    keysList.forEach(key => {
      allWallets = [...allWallets, ...key.wallets];
    });

    wallet = allWallets.find(wallet => wallet.id === sellOrder.wallet_id);
    setSourceWallet(wallet);
  };

  useEffect(() => {
    updateStatusDescription();
    getSellTransactionDetails();
    getWallet();
    logger.debug('Sell order details: ' + JSON.stringify(sellOrder));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedDepositAddress(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedDepositAddress]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedRefundAddress(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedRefundAddress]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedTransactionSentId(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedTransactionSentId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedExternalId(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedExternalId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedTransactionId(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedTransactionId]);

  return (
    <SettingsContainer>
      <SettingsComponent
        refreshControl={
          <RefreshControl
            tintColor={theme.dark ? White : SlateDark}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }>
        <ExternalServiceContainer>
          <RowDataContainer>
            <CryptoAmountContainer>
              <CryptoTitle>{t('Approximate receiving amount')}</CryptoTitle>
              <CryptoContainer>
                <CryptoAmount>
                  {Number(sellOrder.fiat_receiving_amount).toFixed(2)}
                </CryptoAmount>
                <CryptoUnit>{sellOrder.fiat_currency}</CryptoUnit>
              </CryptoContainer>
            </CryptoAmountContainer>
            <MoonpayLogo iconOnly={true} />
          </RowDataContainer>

          <LabelTip type="warn">
            <LabelTipText>
              {t(
                "The final amount you receive when the transaction is complete may differ because it is based on Moonpay's exchange rate.",
              )}
            </LabelTipText>
          </LabelTip>

          <RowDataContainer>
            <RowLabel>{t('Paying')}</RowLabel>
            <RowData>
              {sellOrder.crypto_amount} {sellOrder.coin}
            </RowData>
          </RowDataContainer>

          {sellOrder.chain && (
            <RowDataContainer>
              <RowLabel>{t('Blockchain')}</RowLabel>
              <RowData>
                {BitpaySupportedCoins[sellOrder.chain.toLowerCase()]?.name ||
                  sellOrder.chain.toUpperCase()}
              </RowData>
            </RowDataContainer>
          )}

          <RowDataContainer>
            <RowLabel>{t('Created')}</RowLabel>
            <RowData>
              {moment(sellOrder.created_on).format('MMM DD, YYYY hh:mm a')}
            </RowData>
          </RowDataContainer>

          {!!sellOrder.status && (
            <RowDataContainer>
              <RowLabel>{t('Status')}</RowLabel>
              <RowData
                style={{
                  color: moonpaySellGetStatusColor(sellOrder.status),
                  textTransform: 'capitalize',
                }}>
                {status.statusTitle}
              </RowData>
            </RowDataContainer>
          )}

          {!sellOrder.status && (
            <LabelTip type="info">
              <LabelTipText>
                {t(
                  'If you have successfully completed the entire crypto selling process, remember that receiving payment may take a few hours.',
                )}
              </LabelTipText>
              <TouchableOpacity
                onPress={() => {
                  haptic('impactLight');
                  dispatch(
                    openUrlWithInAppBrowser(
                      'https://sell.moonpay.com/trade_history',
                    ),
                  );
                }}>
                <Link style={{marginTop: 15}}>
                  {t('What is the status of my crypto sell order?')}
                </Link>
              </TouchableOpacity>
            </LabelTip>
          )}

          {!!sellOrder.status && (
            <LabelTip type="info">
              <LabelTipText>{status.statusDescription}</LabelTipText>
              {['failed'].includes(sellOrder.status) ? (
                <>
                  {sellOrder.failure_reason ? (
                    <>
                      <Br />
                      <LabelTipText>
                        {t('Failure Reason:')} {sellOrder.failure_reason}
                      </LabelTipText>
                    </>
                  ) : null}
                  <Br />
                  <LabelTipText>
                    {t('Having problems with Moonpay?')}{' '}
                  </LabelTipText>
                  <TouchableOpacity
                    onPress={() => {
                      haptic('impactLight');
                      dispatch(
                        openUrlWithInAppBrowser(
                          'https://support.moonpay.com/hc/en-gb/requests/new',
                        ),
                      );
                    }}>
                    <Link style={{marginTop: 15}}>
                      {t('Contact the Moonpay support team.')}
                    </Link>
                  </TouchableOpacity>
                </>
              ) : null}
            </LabelTip>
          )}

          {!!sellOrder.address_to && (
            <ColumnDataContainer>
              <TouchableOpacity
                onPress={() => {
                  if (sellOrder.address_to) {
                    copyText(sellOrder.address_to);
                    setCopiedDepositAddress(true);
                  }
                }}>
                <RowLabel>{t('Deposit address')}</RowLabel>
                <CopiedContainer>
                  <ColumnData style={{maxWidth: '90%'}}>
                    {sellOrder.address_to}
                  </ColumnData>
                  <CopyImgContainerRight style={{minWidth: '10%'}}>
                    {copiedDepositAddress ? <CopiedSvg width={17} /> : null}
                  </CopyImgContainerRight>
                </CopiedContainer>
              </TouchableOpacity>
            </ColumnDataContainer>
          )}

          {!!sellOrder.refund_address &&
          ['failed'].includes(sellOrder.status) ? (
            <ColumnDataContainer>
              <TouchableOpacity
                onPress={() => {
                  copyText(sellOrder.refund_address);
                  setCopiedRefundAddress(true);
                }}>
                <RowLabel>{t('Refund address')}</RowLabel>
                <CopiedContainer>
                  <ColumnData style={{maxWidth: '90%'}}>
                    {sellOrder.refund_address}
                  </ColumnData>
                  <CopyImgContainerRight style={{minWidth: '10%'}}>
                    {copiedRefundAddress ? <CopiedSvg width={17} /> : null}
                  </CopyImgContainerRight>
                </CopiedContainer>
              </TouchableOpacity>
            </ColumnDataContainer>
          ) : null}

          {!!sellOrder.tx_sent_id && (
            <ColumnDataContainer>
              <TouchableOpacity
                onPress={() => {
                  copyText(sellOrder.tx_sent_id!);
                  setCopiedTransactionSentId(true);
                }}>
                <RowLabel>{t('Transaction ID')}</RowLabel>
                <CopiedContainer>
                  <ColumnData style={{maxWidth: '90%'}}>
                    {sellOrder.tx_sent_id}
                  </ColumnData>
                  <CopyImgContainerRight style={{minWidth: '10%'}}>
                    {copiedTransactionSentId ? <CopiedSvg width={17} /> : null}
                  </CopyImgContainerRight>
                </CopiedContainer>
              </TouchableOpacity>
            </ColumnDataContainer>
          )}

          {!!sellOrder.transaction_id && (
            <ColumnDataContainer>
              <TouchableOpacity
                onPress={() => {
                  copyText(sellOrder.transaction_id!);
                  setCopiedTransactionId(true);
                }}>
                <RowLabel>{t('Moonpay Sell Order ID')}</RowLabel>
                <CopiedContainer>
                  <ColumnData style={{maxWidth: '90%'}}>
                    {sellOrder.transaction_id}
                  </ColumnData>
                  <CopyImgContainerRight style={{minWidth: '10%'}}>
                    {copiedTransactionId ? <CopiedSvg width={17} /> : null}
                  </CopyImgContainerRight>
                </CopiedContainer>
              </TouchableOpacity>
            </ColumnDataContainer>
          )}

          {sellOrder.external_id && (__DEV__ || !sellOrder.transaction_id) ? (
            <ColumnDataContainer
              style={{marginBottom: Platform.OS === 'android' ? 20 : 0}}>
              <TouchableOpacity
                onPress={() => {
                  copyText(sellOrder.external_id);
                  setCopiedExternalId(true);
                }}>
                <RowLabel>{t('External Sell Order ID')}</RowLabel>
                <CopiedContainer>
                  <ColumnData style={{maxWidth: '90%'}}>
                    {sellOrder.external_id}
                  </ColumnData>
                  <CopyImgContainerRight style={{minWidth: '10%'}}>
                    {copiedExternalId ? <CopiedSvg width={17} /> : null}
                  </CopyImgContainerRight>
                </CopiedContainer>
              </TouchableOpacity>
            </ColumnDataContainer>
          ) : null}

          {['bitpayPending', 'waitingForDeposit'].includes(sellOrder.status) &&
          sourceWallet ? (
            <RemoveCta
              onPress={async () => {
                haptic('impactLight');
                dispatch(
                  showBottomNotificationModal({
                    type: 'question',
                    title: t('Cancel sell order'),
                    message: t(
                      "The data of this order will be canceled. Make sure you don't need it",
                    ),
                    enableBackdropDismiss: true,
                    actions: [
                      {
                        text: t('CANCEL ORDER'),
                        action: async () => {
                          dispatch(dismissBottomNotificationModal());
                          try {
                            const reqData: MoonpayCancelSellTransactionRequestData =
                              {
                                env: moonpaySellEnv,
                                transactionId: sellOrder.transaction_id,
                                externalId: sellOrder.external_id,
                              };
                            const res =
                              await sourceWallet.moonpayCancelSellTransaction(
                                reqData,
                              );
                            if (res?.statusCode == 204) {
                              // Canceled successfully
                              sellOrder.status = 'bitpayCanceled';
                              const stateParams = {
                                externalId: sellOrder.external_id,
                                status:
                                  'bitpayCanceled' as MoonpaySellOrderStatus,
                              };

                              dispatch(
                                SellCryptoActions.updateSellOrderMoonpay({
                                  moonpaySellIncomingData: stateParams,
                                }),
                              );
                              updateStatusDescription();
                            }
                          } catch (err) {
                            await sleep(500);
                            dispatch(
                              showBottomNotificationModal({
                                type: 'warning',
                                title: t('Something went wrong'),
                                message: t(
                                  'There was an error trying to cancel the order.',
                                ),
                                enableBackdropDismiss: true,
                                actions: [
                                  {
                                    text: t('OK'),
                                    action: () => {},
                                    primary: true,
                                  },
                                ],
                              }),
                            );
                          }
                        },
                        primary: true,
                      },
                      {
                        text: t('GO BACK'),
                        action: () => {
                          logger.debug('Cancel sell order aborted');
                        },
                      },
                    ],
                  }),
                );
              }}>
              <Text style={{color: 'red'}}>{t('Cancel Order')}</Text>
            </RemoveCta>
          ) : null}

          {[
            'createdOrder',
            'bitpayPending',
            'bitpayCanceled',
            'failed',
            'completed',
          ].includes(sellOrder.status) ||
          (['bitpayPending', 'waitingForDeposit'].includes(sellOrder.status) &&
            !sourceWallet) ? (
            <RemoveCta
              onPress={async () => {
                haptic('impactLight');
                dispatch(
                  showBottomNotificationModal({
                    type: 'question',
                    title: t('Removing sell order data'),
                    message: t(
                      "The data of this sell order will be deleted. Make sure you don't need it",
                    ),
                    enableBackdropDismiss: true,
                    actions: [
                      {
                        text: t('REMOVE'),
                        action: () => {
                          dispatch(dismissBottomNotificationModal());
                          dispatch(
                            SellCryptoActions.removeSellOrderMoonpay({
                              externalId: sellOrder.external_id,
                            }),
                          );
                          navigation.goBack();
                        },
                        primary: true,
                      },
                      {
                        text: t('GO BACK'),
                        action: () => {
                          logger.debug('Removing sell order CANCELED');
                        },
                      },
                    ],
                  }),
                );
              }}>
              <Text style={{color: 'red'}}>{t('Remove')}</Text>
            </RemoveCta>
          ) : null}
        </ExternalServiceContainer>
      </SettingsComponent>
    </SettingsContainer>
  );
};

export default MoonpaySellDetails;
