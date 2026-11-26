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
import {banxaRefreshOrderDetails} from '../utils/external-services-status';
import haptic from '../../../../../components/haptic-feedback/haptic';
import BanxaLogo from '../../../../../components/icons/external-services/banxa/banxa-logo';
import {BanxaPaymentData} from '../../../../../store/buy-crypto/buy-crypto.models';
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
  banxaGetStatusDetails,
  BanxaStatus,
  banxaUrl,
} from '../../../../services/buy-crypto/utils/banxa-utils';
import {sleep} from '../../../../../utils/helper-methods';
import {SlateDark, White} from '../../../../../styles/colors';
import {Br} from '../../../../../components/styled/Containers';
import {openUrlWithInAppBrowser} from '../../../../../store/app/app.effects';
import {Link} from '../../../../../components/styled/Text';

export interface BanxaDetailsProps {
  paymentRequest: BanxaPaymentData;
}

const copyText = (text: string) => {
  haptic('impactLight');
  Clipboard.setString(text);
};

const BanxaDetails: React.FC = () => {
  const {t} = useTranslation();
  const logger = useLogger();
  const theme = useTheme();
  const {
    params: {paymentRequest},
  } = useRoute<RouteProp<{params: BanxaDetailsProps}>>();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState<BanxaStatus>({
    statusTitle: undefined,
    statusDescription: undefined,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [copiedDepositAddress, setCopiedDepositAddress] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [copiedReferenceId, setCopiedReferenceId] = useState(false);
  const [copiedTransactionId, setCopiedTransactionId] = useState(false);

  const updateStatusDescription = () => {
    setStatus(banxaGetStatusDetails(paymentRequest.status));
  };

  const getOrderDetails = async (force?: boolean) => {
    const updated = await dispatch(
      banxaRefreshOrderDetails(paymentRequest, force),
    );
    if (updated) {
      updateStatusDescription();
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([getOrderDetails(true), sleep(1000)]);
    setRefreshing(false);
  };

  useEffect(() => {
    updateStatusDescription();
    getOrderDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount to set the initial status and fetch the latest order details; later refreshes go through onRefresh
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
            <BanxaLogo iconOnly={true} />
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
                "The final crypto amount you receive when the transaction is complete may differ because it is based on Banxa's exchange rate.",
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

          {paymentRequest.status ? (
            <LabelTip type="info">
              <LabelTipText>{status.statusDescription}</LabelTipText>
              {[
                'declined',
                'expired',
                'refunded',
                'cancelled',
                'failed',
              ].includes(paymentRequest.status) ? (
                <>
                  <Br />
                  <LabelTipText>
                    {t('Having problems with Banxa?')}
                  </LabelTipText>
                  <TouchableOpacity
                    testID="banxa-support-link"
                    accessibilityLabel={t('Contact Banxa support')}
                    onPress={() => {
                      haptic('impactLight');
                      dispatch(
                        openUrlWithInAppBrowser(
                          'https://support.banxa.com/en/support/solutions/',
                        ),
                      );
                    }}>
                    <Link style={{marginTop: 15}}>
                      {t('Contact the Banxa support team.')}
                    </Link>
                  </TouchableOpacity>
                </>
              ) : null}
            </LabelTip>
          ) : null}

          {!paymentRequest.status ||
          [
            'paymentRequestSent',
            'pending',
            'pendingPayment',
            'waitingPayment',
            'paymentReceived',
            'inProgress',
            'coinTransferred',
          ].includes(paymentRequest.status) ? (
            <LabelTip type="info">
              <LabelTipText>
                {t(
                  'If you have successfully completed the entire payment process, remember that receiving crypto may take a few hours.',
                ) +
                  ' ' +
                  t(
                    'Orders through bank transfers may take one or more business days.',
                  )}
              </LabelTipText>
              <TouchableOpacity
                testID="banxa-read-more-link"
                accessibilityLabel={t('Read more about order timing')}
                onPress={() => {
                  haptic('impactLight');
                  dispatch(
                    openUrlWithInAppBrowser(
                      'https://support.banxa.com/en/support/solutions/articles/44002216503-how-long-will-my-order-take-',
                    ),
                  );
                }}>
                <Link style={{fontSize: 12, marginLeft: 2, top: 2}}>
                  {t('Read more')}
                </Link>
              </TouchableOpacity>
              <Br />
              <TouchableOpacity
                testID="banxa-payment-status-link"
                accessibilityLabel={t('Check Banxa payment status')}
                onPress={() => {
                  haptic('impactLight');
                  dispatch(
                    openUrlWithInAppBrowser(
                      `${banxaUrl}/status/${paymentRequest.order_id}`,
                    ),
                  );
                }}>
                <Link style={{marginTop: 15}}>
                  {t('What is the status of my payment?')}
                </Link>
              </TouchableOpacity>
            </LabelTip>
          ) : null}

          <ColumnDataContainer>
            <TouchableOpacity
              testID="banxa-copy-deposit-address-button"
              accessibilityLabel={t('Copy deposit address')}
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
                testID="banxa-copy-order-id-button"
                accessibilityLabel={t('Copy order ID')}
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

          {!!paymentRequest.ref && (
            <ColumnDataContainer>
              <TouchableOpacity
                testID="banxa-copy-order-number-button"
                accessibilityLabel={t('Copy order number')}
                onPress={() => {
                  copyText(paymentRequest.ref?.toString()!);
                  setCopiedReferenceId(true);
                }}>
                <RowLabel>{t('Order Number')}</RowLabel>
                <CopiedContainer>
                  <ColumnData style={{maxWidth: '90%'}}>
                    {paymentRequest.ref}
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
                testID="banxa-copy-transaction-id-button"
                accessibilityLabel={t('Copy transaction ID')}
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
            testID="banxa-remove-payment-request-button"
            accessibilityLabel={t('Remove payment request')}
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
                          BuyCryptoActions.removePaymentRequestBanxa({
                            banxaExternalId: paymentRequest.external_id,
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

export default BanxaDetails;
