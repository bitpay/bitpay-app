import React, {useEffect, useState} from 'react';
import {RefreshControl, Text} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {
  RouteProp,
  useRoute,
  useNavigation,
  useTheme,
} from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';
import moment from 'moment';
import {SettingsComponent, SettingsContainer} from '../../SettingsRoot';
import haptic from '../../../../../components/haptic-feedback/haptic';
import TransakLogo from '../../../../../components/icons/external-services/transak/transak-logo';
import {
  TransakIncomingData,
  TransakPaymentData,
} from '../../../../../store/buy-crypto/buy-crypto.models';
import {useAppDispatch, useLogger} from '../../../../../utils/hooks';
import {
  showBottomNotificationModal,
  dismissBottomNotificationModal,
} from '../../../../../store/app/app.actions';
import {BuyCryptoActions} from '../../../../../store/buy-crypto';
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
import {
  transakEnv,
  transakGetStatusDetails,
  TransakStatus,
} from '../../../../services/buy-crypto/utils/transak-utils';
import {transakGetOrderDetails} from '../../../../../store/buy-crypto/effects/transak/transak';
import {sleep} from '../../../../../utils/helper-methods';
import {SlateDark, White} from '../../../../../styles/colors';
import {Br} from '../../../../../components/styled/Containers';
import {openUrlWithInAppBrowser} from '../../../../../store/app/app.effects';
import {Link} from '../../../../../components/styled/Text';
import cloneDeep from 'lodash.clonedeep';

export interface TransakDetailsProps {
  paymentRequest: TransakPaymentData;
}

const copyText = (text: string) => {
  haptic('impactLight');
  Clipboard.setString(text);
};

const TransakDetails: React.FC = () => {
  const {t} = useTranslation();
  const logger = useLogger();
  const theme = useTheme();
  const {
    params: {paymentRequest},
  } = useRoute<RouteProp<{params: TransakDetailsProps}>>();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState<TransakStatus>({
    statusTitle: undefined,
    statusDescription: undefined,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [copiedDepositAddress, setCopiedDepositAddress] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [copiedReferenceId, setCopiedReferenceId] = useState(false);
  const [copiedTransactionId, setCopiedTransactionId] = useState(false);

  const updateStatusDescription = () => {
    setStatus(transakGetStatusDetails(paymentRequest.status));
  };

  const getOrderDetails = (force?: boolean) => {
    if (
      ['COMPLETED', 'CANCELLED', 'FAILED', 'REFUNDED', 'EXPIRED'].includes(
        paymentRequest.status,
      ) &&
      !force
    ) {
      return;
    }

    if (!paymentRequest.order_id) {
      logger.debug('Transak getOrderDetails Warn: No order_id');
      return;
    }

    const requestData: any = {
      env: transakEnv,
      orderId: paymentRequest.order_id,
    };

    transakGetOrderDetails(requestData)
      .then(data => {
        if (!data?.data) {
          logger.error('Transak getOrderDetails Error: No data');
          return;
        }
        const orderData = data.data;
        let shouldUpdate = false;
        if (
          orderData.cryptoAmount &&
          typeof orderData.cryptoAmount === 'number' &&
          orderData.cryptoAmount > 0 &&
          orderData.cryptoAmount != paymentRequest.crypto_amount
        ) {
          logger.debug(
            `Updating crypto_amount from: ${paymentRequest.crypto_amount} to: ${orderData.cryptoAmount}`,
          );
          paymentRequest.crypto_amount = orderData.cryptoAmount;
          shouldUpdate = true;
        }
        if (
          orderData.fiatAmount &&
          typeof orderData.fiatAmount === 'number' &&
          orderData.fiatAmount > 0 &&
          orderData.fiatAmount != paymentRequest.fiat_total_amount
        ) {
          logger.debug(
            `Updating fiat_total_amount from: ${paymentRequest.fiat_total_amount} to: ${orderData.fiatAmount}`,
          );
          paymentRequest.fiat_total_amount = orderData.fiatAmount;
          let fiatBaseAmount: number = cloneDeep(
            paymentRequest.fiat_base_amount,
          );
          if (
            orderData.totalFeeInFiat &&
            typeof orderData.totalFeeInFiat === 'number' &&
            orderData.totalFeeInFiat > 0
          ) {
            fiatBaseAmount =
              Number(orderData.fiatAmount) - Number(orderData.totalFeeInFiat);
            logger.debug(
              `Updating fiat_base_amount from: ${paymentRequest.fiat_base_amount} to: ${fiatBaseAmount}`,
            );
            paymentRequest.fiat_base_amount = fiatBaseAmount;
          }
          shouldUpdate = true;
        }
        if (
          orderData.fiatCurrency &&
          paymentRequest.fiat_total_amount_currency !==
            orderData.fiatCurrency.toUpperCase()
        ) {
          logger.debug(
            `Updating fiat_total_amount_currency from: ${
              paymentRequest.fiat_total_amount_currency
            } to: ${orderData.fiatCurrency.toUpperCase()}`,
          );
          paymentRequest.fiat_total_amount_currency =
            orderData.fiatCurrency.toUpperCase();
          shouldUpdate = true;
        }
        if (
          orderData.cryptoCurrency &&
          paymentRequest.coin !== orderData.cryptoCurrency.toUpperCase()
        ) {
          logger.debug(
            `Updating coin from: ${
              paymentRequest.coin
            } to: ${orderData.cryptoCurrency.toUpperCase()}`,
          );
          paymentRequest.coin = cloneDeep(
            orderData.cryptoCurrency,
          ).toUpperCase();
          if (
            orderData.network &&
            orderData.network == 'mainnet' &&
            paymentRequest.chain !== orderData.cryptoCurrency.toLowerCase()
          ) {
            logger.debug(
              `Updating chain from: ${
                paymentRequest.chain
              } to: ${orderData.cryptoCurrency.toLowerCase()}`,
            );
            paymentRequest.coin = orderData.network;
          }
          shouldUpdate = true;
        }
        if (
          orderData.transactionHash &&
          paymentRequest.transaction_id !== orderData.transactionHash
        ) {
          logger.debug(
            `Updating transactionHash from: ${paymentRequest.transaction_id} to: ${orderData.transactionHash}`,
          );
          paymentRequest.transaction_id = orderData.transactionHash;
          shouldUpdate = true;
        }
        if (
          orderData.status &&
          (!paymentRequest.status || orderData.status != paymentRequest.status)
        ) {
          logger.debug(
            `Updating status from: ${paymentRequest.status} to: ${orderData.status}`,
          );
          paymentRequest.status = orderData.status;
          updateStatusDescription();
          shouldUpdate = true;
        }

        if (shouldUpdate) {
          const stateParams: TransakIncomingData = {
            transakExternalId: paymentRequest.external_id,
            status: paymentRequest.status,
            cryptoAmount: paymentRequest.crypto_amount,
            transactionId: paymentRequest.transaction_id,
            fiatTotalAmount: paymentRequest.fiat_total_amount,
            fiatBaseAmount: paymentRequest.fiat_base_amount,
            coin: paymentRequest.coin,
            chain: paymentRequest.chain,
            fiatTotalAmountCurrency: paymentRequest.fiat_total_amount_currency,
          };
          dispatch(
            BuyCryptoActions.updatePaymentRequestTransak({
              transakIncomingData: stateParams,
            }),
          );

          logger.debug(
            'Saved payment request with: ' + JSON.stringify(paymentRequest),
          );
        }
      })
      .catch(err => {
        logger.error('Transak getOrderDetails Error: ' + JSON.stringify(err));
      });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([getOrderDetails(true), sleep(1000)]);
    setRefreshing(false);
  };

  useEffect(() => {
    updateStatusDescription();
    getOrderDetails();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedDepositAddress(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedDepositAddress]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedOrderId(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedOrderId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedReferenceId(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedReferenceId]);

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
                <CryptoAmount>{paymentRequest.crypto_amount}</CryptoAmount>
                <CryptoUnit>{paymentRequest.coin}</CryptoUnit>
              </CryptoContainer>
            </CryptoAmountContainer>
            <TransakLogo iconOnly={true} width={50} height={30} />
          </RowDataContainer>

          <RowDataContainer>
            <RowLabel>{t('Approximate receiving fiat amount')}</RowLabel>
            <RowData>
              {paymentRequest.fiat_base_amount.toFixed(2)}{' '}
              {paymentRequest.fiat_total_amount_currency}
            </RowData>
          </RowDataContainer>
          <LabelTip type="warn">
            <LabelTipText>
              {t(
                "The final crypto amount you receive when the transaction is complete may differ because it is based on Transak's exchange rate.",
              )}
            </LabelTipText>
          </LabelTip>

          <RowDataContainer>
            <RowLabel>{t('Paying')}</RowLabel>
            <RowData>
              {paymentRequest.fiat_total_amount}{' '}
              {paymentRequest.fiat_total_amount_currency}
            </RowData>
          </RowDataContainer>

          {paymentRequest.chain && (
            <RowDataContainer>
              <RowLabel>{t('Deposit Blockchain')}</RowLabel>
              <RowData>
                {BitpaySupportedCoins[paymentRequest.chain.toLowerCase()]
                  ?.name || paymentRequest.chain.toUpperCase()}
              </RowData>
            </RowDataContainer>
          )}

          <RowDataContainer>
            <RowLabel>{t('Created')}</RowLabel>
            <RowData>
              {moment(paymentRequest.created_on).format('MMM DD, YYYY hh:mm a')}
            </RowData>
          </RowDataContainer>

          {!!paymentRequest.status && (
            <RowDataContainer>
              <RowLabel>{t('Status')}</RowLabel>
              <RowData
                style={{
                  textTransform: 'capitalize',
                }}>
                {status.statusTitle}
              </RowData>
            </RowDataContainer>
          )}

          {!!paymentRequest.status && (
            <LabelTip type="info">
              <LabelTipText>{status.statusDescription}</LabelTipText>
              {['CANCELLED', 'FAILED', 'REFUNDED', 'EXPIRED'].includes(
                paymentRequest.status,
              ) ? (
                <>
                  <Br />
                  <LabelTipText>
                    {t('Having problems with Transak?')}
                  </LabelTipText>
                  <TouchableOpacity
                    onPress={() => {
                      haptic('impactLight');
                      dispatch(
                        openUrlWithInAppBrowser(
                          'https://support.transak.com/en/collections/3985810-customer-help-center',
                        ),
                      );
                    }}>
                    <Link style={{marginTop: 15}}>
                      {t('Visit the Transak customer help center.')}
                    </Link>
                  </TouchableOpacity>
                </>
              ) : null}
            </LabelTip>
          )}

          <ColumnDataContainer>
            <TouchableOpacity
              onPress={() => {
                copyText(paymentRequest.address);
                setCopiedDepositAddress(true);
              }}>
              <RowLabel>{t('Deposit address')}</RowLabel>
              <CopiedContainer>
                <ColumnData style={{maxWidth: '90%'}}>
                  {paymentRequest.address}
                </ColumnData>
                <CopyImgContainerRight style={{minWidth: '10%'}}>
                  {copiedDepositAddress ? <CopiedSvg width={17} /> : null}
                </CopyImgContainerRight>
              </CopiedContainer>
            </TouchableOpacity>
          </ColumnDataContainer>

          {!!paymentRequest.order_id && (
            <ColumnDataContainer>
              <TouchableOpacity
                onPress={() => {
                  copyText(paymentRequest.order_id!);
                  setCopiedOrderId(true);
                }}>
                <RowLabel>{t('Order ID')}</RowLabel>
                <CopiedContainer>
                  <ColumnData style={{maxWidth: '90%'}}>
                    {paymentRequest.order_id}
                  </ColumnData>
                  <CopyImgContainerRight style={{minWidth: '10%'}}>
                    {copiedOrderId ? <CopiedSvg width={17} /> : null}
                  </CopyImgContainerRight>
                </CopiedContainer>
              </TouchableOpacity>
            </ColumnDataContainer>
          )}

          {!!paymentRequest.external_id && (
            <ColumnDataContainer>
              <TouchableOpacity
                onPress={() => {
                  copyText(paymentRequest.external_id!);
                  setCopiedReferenceId(true);
                }}>
                <RowLabel>{t('Reference ID')}</RowLabel>
                <CopiedContainer>
                  <ColumnData style={{maxWidth: '90%'}}>
                    {paymentRequest.external_id}
                  </ColumnData>
                  <CopyImgContainerRight style={{minWidth: '10%'}}>
                    {copiedReferenceId ? <CopiedSvg width={17} /> : null}
                  </CopyImgContainerRight>
                </CopiedContainer>
              </TouchableOpacity>
            </ColumnDataContainer>
          )}

          {!!paymentRequest.transaction_id && (
            <ColumnDataContainer>
              <TouchableOpacity
                onPress={() => {
                  copyText(paymentRequest.transaction_id!);
                  setCopiedTransactionId(true);
                }}>
                <RowLabel>{t('Transaction ID')}</RowLabel>
                <CopiedContainer>
                  <ColumnData style={{maxWidth: '90%'}}>
                    {paymentRequest.transaction_id}
                  </ColumnData>
                  <CopyImgContainerRight style={{minWidth: '10%'}}>
                    {copiedTransactionId ? <CopiedSvg width={17} /> : null}
                  </CopyImgContainerRight>
                </CopiedContainer>
              </TouchableOpacity>
            </ColumnDataContainer>
          )}

          <RemoveCta
            onPress={async () => {
              haptic('impactLight');
              dispatch(
                showBottomNotificationModal({
                  type: 'question',
                  title: t('Removing payment request data'),
                  message: t(
                    "The data of this payment request will be deleted. Make sure you don't need it",
                  ),
                  enableBackdropDismiss: true,
                  actions: [
                    {
                      text: t('REMOVE'),
                      action: () => {
                        dispatch(dismissBottomNotificationModal());
                        dispatch(
                          BuyCryptoActions.removePaymentRequestTransak({
                            transakExternalId: paymentRequest.external_id,
                          }),
                        );
                        navigation.goBack();
                      },
                      primary: true,
                    },
                    {
                      text: t('GO BACK'),
                      action: () => {
                        logger.debug('Removing payment Request CANCELED');
                      },
                    },
                  ],
                }),
              );
            }}>
            <Text style={{color: 'red'}}>{t('Remove')}</Text>
          </RemoveCta>
        </ExternalServiceContainer>
      </SettingsComponent>
    </SettingsContainer>
  );
};

export default TransakDetails;
