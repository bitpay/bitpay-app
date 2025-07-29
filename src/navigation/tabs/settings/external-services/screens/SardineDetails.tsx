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
import SardineLogo from '../../../../../components/icons/external-services/sardine/sardine-logo';
import {
  SardineGetOrderDetailsRequestData,
  SardineIncomingData,
  SardinePaymentData,
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
  sardineEnv,
  sardineGetStatusDetails,
  SardineStatus,
} from '../../../../services/buy-crypto/utils/sardine-utils';
import {sardineGetOrderDetails} from '../../../../../store/buy-crypto/effects/sardine/sardine';
import {sleep} from '../../../../../utils/helper-methods';
import {SlateDark, White} from '../../../../../styles/colors';
import {Br} from '../../../../../components/styled/Containers';
import {openUrlWithInAppBrowser} from '../../../../../store/app/app.effects';
import {Link} from '../../../../../components/styled/Text';

export interface SardineDetailsProps {
  paymentRequest: SardinePaymentData;
}

const copyText = (text: string) => {
  haptic('impactLight');
  Clipboard.setString(text);
};

const SardineDetails: React.FC = () => {
  const {t} = useTranslation();
  const logger = useLogger();
  const theme = useTheme();
  const {
    params: {paymentRequest},
  } = useRoute<RouteProp<{params: SardineDetailsProps}>>();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState<SardineStatus>({
    statusTitle: undefined,
    statusDescription: undefined,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [copiedDepositAddress, setCopiedDepositAddress] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [copiedReferenceId, setCopiedReferenceId] = useState(false);
  const [copiedTransactionId, setCopiedTransactionId] = useState(false);

  const updateStatusDescription = () => {
    setStatus(sardineGetStatusDetails(paymentRequest.status));
  };

  const getOrderDetails = (force?: boolean) => {
    if (
      (['Complete', 'Declined', 'Expired'].includes(paymentRequest.status) ||
        !paymentRequest.order_id) &&
      !force
    ) {
      return;
    }

    const requestData: SardineGetOrderDetailsRequestData = {
      env: sardineEnv,
      orderId: paymentRequest.order_id,
    };

    sardineGetOrderDetails(requestData)
      .then(data => {
        if (!data) {
          logger.error('Sardine getOrderDetails Error: ' + data.message);
          return;
        }
        let shouldUpdate = false;
        if (
          data.data?.quantity &&
          typeof data.data.quantity === 'number' &&
          data.data.quantity > 0 &&
          data.data.quantity != paymentRequest.crypto_amount
        ) {
          logger.debug(
            `Updating crypto_amount from: ${paymentRequest.crypto_amount} to: ${data.data.quantity}`,
          );
          paymentRequest.crypto_amount = data.data.quantity;
          shouldUpdate = true;
        }
        if (!paymentRequest.order_id && data.id) {
          paymentRequest.order_id = data.id;
          shouldUpdate = true;
        }
        if (data.withdrawal?.txHash) {
          paymentRequest.transaction_id = data.withdrawal.txHash;
          shouldUpdate = true;
        }
        if (
          data.status &&
          (!paymentRequest.status || data.status != paymentRequest.status)
        ) {
          logger.debug(
            `Updating status from: ${paymentRequest.status} to: ${data.status}`,
          );
          paymentRequest.status = data.status;
          updateStatusDescription();
          shouldUpdate = true;
        }

        if (shouldUpdate) {
          const stateParams: SardineIncomingData = {
            sardineExternalId: paymentRequest.external_id,
            status: paymentRequest.status,
            cryptoAmount: paymentRequest.crypto_amount,
            transactionId: paymentRequest.transaction_id,
          };
          dispatch(
            BuyCryptoActions.updatePaymentRequestSardine({
              sardineIncomingData: stateParams,
            }),
          );

          logger.debug(
            'Saved payment request with: ' + JSON.stringify(paymentRequest),
          );
        }
      })
      .catch(err => {
        logger.error('Sardine getOrderDetails Error: ' + JSON.stringify(err));
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
                <CryptoAmount>
                  {paymentRequest.crypto_amount
                    .toFixed(8)
                    .replace(/\.?0+$/, '')}
                </CryptoAmount>
                <CryptoUnit>{paymentRequest.coin}</CryptoUnit>
              </CryptoContainer>
            </CryptoAmountContainer>
            <SardineLogo iconOnly={true} />
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
                "The final crypto amount you receive when the transaction is complete may differ because it is based on Sardine's exchange rate.",
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
              {!['Declined', 'Expired'].includes(paymentRequest.status) ? (
                <>
                  <Br />
                  <LabelTipText>
                    {t('Having problems with Sardine?')}
                  </LabelTipText>
                  <TouchableOpacity
                    onPress={() => {
                      haptic('impactLight');
                      dispatch(
                        openUrlWithInAppBrowser(
                          'https://crypto.sardine.ai/support',
                        ),
                      );
                    }}>
                    <Link style={{marginTop: 15}}>
                      {t('Contact the Sardine support team.')}
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
                          BuyCryptoActions.removePaymentRequestSardine({
                            sardineExternalId: paymentRequest.external_id,
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

export default SardineDetails;
