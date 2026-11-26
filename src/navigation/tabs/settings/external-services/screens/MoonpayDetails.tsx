import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
import {SettingsComponent, SettingsContainer} from '../../SettingsRoot';
import {moonpayRefreshTransactionDetails} from '../utils/external-services-status';
import haptic from '../../../../../components/haptic-feedback/haptic';
import MoonpayLogo from '../../../../../components/icons/external-services/moonpay/moonpay-logo';
import {
  MoonpayPaymentData,
  MoonpayTransactionStage,
} from '../../../../../store/buy-crypto/buy-crypto.models';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {
  showBottomNotificationModal,
  dismissBottomNotificationModal,
} from '../../../../../store/app/app.actions';
import {openUrlWithInAppBrowser} from '../../../../../store/app/app.effects';
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
  MOONPAY_SUPPORT_URL,
  moonpayGetSepaStatusDetails,
  moonpayGetStatusColor,
  moonpayGetStatusDetails,
  moonpaySepaIsWaitingForPayment,
  MoonpayStatus,
} from '../../../../services/buy-crypto/utils/moonpay-utils';
import {Br} from '../../../../../components/styled/Containers';
import {sleep} from '../../../../../utils/helper-methods';
import {
  ProgressBlue,
  Slate,
  SlateDark,
  White,
} from '../../../../../styles/colors';
import {
  getMoonpayEmbeddedAnonymousCredentials,
  setMoonpayEmbeddedCredentials,
  setMoonpayEmbeddedStatus,
} from '../../../../../store/buy-crypto/buy-crypto.effects';
import {MoonpayClientCredentials} from '../../../../services/utils/moonpayFrameCrypto';
import {ExternalServicesScreens} from '../../../../services/ExternalServicesGroup';
import {RootState} from '../../../../../store';
export interface MoonpayDetailsProps {
  paymentRequest: MoonpayPaymentData;
}

const styles = StyleSheet.create({
  bankTransferSeparator: {
    marginTop: 15,
    marginHorizontal: 15,
    borderStyle: 'solid',
    borderWidth: 0.5,
  },
});

const copyText = (text: string) => {
  haptic('impactLight');
  Clipboard.setString(text);
};

const MoonpayDetails: React.FC = () => {
  const {t} = useTranslation();
  const {
    params: {paymentRequest},
  } = useRoute<RouteProp<{params: MoonpayDetailsProps}>>();
  const navigation = useNavigation();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const user = useAppSelector(
    ({APP, BITPAY_ID}: RootState) => BITPAY_ID.user[APP.network],
  );
  const [status, setStatus] = useState<MoonpayStatus>({
    statusTitle: undefined,
    statusDescription: undefined,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [copiedDepositAddress, setCopiedDepositAddress] = useState(false);
  const [copiedExternalId, setCopiedExternalId] = useState(false);
  const [copiedTransactionId, setCopiedTransactionId] = useState(false);
  const [copiedSepaField, setCopiedSepaField] = useState<string>();
  const [embeddedDisconnected, setEmbeddedDisconnected] = useState(false);

  const [sepaDetails, setSepaDetails] = useState(paymentRequest.sepa_details);
  const [sepaStages, setSepaStages] = useState<
    MoonpayTransactionStage[] | undefined
  >(paymentRequest.sepa_stages);
  const isEmbeddedSepa =
    !!paymentRequest.is_embedded &&
    paymentRequest.payment_method === 'sepaBankTransfer';
  const [statusLoading, setStatusLoading] = useState(
    () => paymentRequest.status !== 'completed',
  );
  const sepaRows: {
    key: string;
    label: string;
    value: string;
    copyValue?: string;
  }[] = sepaDetails
    ? [
        {key: 'reference', label: t('Reference'), value: sepaDetails.reference},
        ...(sepaDetails.iban
          ? [
              {
                key: 'iban',
                label: t('IBAN'),
                value: sepaDetails.iban,
                // Displayed grouped in fours, as MoonPay returns it, but copied
                // in the machine format that banking apps expect.
                copyValue: sepaDetails.iban.replace(/\s/g, ''),
              },
            ]
          : []),
        ...(sepaDetails.bic
          ? [{key: 'bic', label: t('BIC'), value: sepaDetails.bic}]
          : []),
        ...(sepaDetails.recipientName
          ? [
              {
                key: 'recipientName',
                label: t('Recipient'),
                value: sepaDetails.recipientName,
              },
            ]
          : []),
        ...(sepaDetails.recipientAddress
          ? [
              {
                key: 'recipientAddress',
                label: t('Recipient address'),
                value: sepaDetails.recipientAddress,
              },
            ]
          : []),
        ...(sepaDetails.bankName
          ? [
              {
                key: 'bankName',
                label: t('Bank name'),
                value: sepaDetails.bankName,
              },
            ]
          : []),
        ...(sepaDetails.bankAddress
          ? [
              {
                key: 'bankAddress',
                label: t('Bank address'),
                value: sepaDetails.bankAddress,
              },
            ]
          : []),
      ]
    : [];

  const updateStatusDescription = (stages?: MoonpayTransactionStage[]) => {
    setStatus(
      isEmbeddedSepa
        ? moonpayGetSepaStatusDetails(paymentRequest.status, stages)
        : moonpayGetStatusDetails(paymentRequest.status),
    );
  };

  // The embedded status comes from MoonPay's API, so without valid credentials
  // the screen can only show the status as of the last successful fetch.
  const goToMoonpayOnboarding = () => {
    const anonymousCredentials = getMoonpayEmbeddedAnonymousCredentials();
    if (!anonymousCredentials) {
      // Anonymous credentials are not ready yet: the connection settings screen
      // requests them and offers the Connect button.
      (navigation as any).navigate('MoonpayConnectionSettings');
      return;
    }
    (navigation as any).navigate(
      ExternalServicesScreens.MOONPAY_BUY_EMBEDDED_ONBOARDING,
      {
        context: 'moonpayDetails',
        user,
        anonymousCredentials,
        onConnectAccount: async (newCredentials: MoonpayClientCredentials) => {
          setMoonpayEmbeddedCredentials(newCredentials);
          setMoonpayEmbeddedStatus('active');
          navigation.goBack();
          getTransactionDetails(true);
        },
        onSkipConnection: async () => {
          navigation.goBack();
        },
      },
    );
  };

  const showDisconnectedNotification = () => {
    dispatch(
      showBottomNotificationModal({
        type: 'warning',
        title: t('Disconnected from MoonPay'),
        message: t(
          'This purchase was made through your MoonPay account, and the status shown may be out of date. Connect again to see its latest status.',
        ),
        enableBackdropDismiss: true,
        actions: [
          {
            text: t('Connect MoonPay'),
            action: () => {
              dispatch(dismissBottomNotificationModal());
              goToMoonpayOnboarding();
            },
            primary: true,
          },
          {
            text: t('Skip'),
            action: () => {
              dispatch(dismissBottomNotificationModal());
            },
          },
        ],
      }),
    );
  };

  const getTransactionDetails = async (force?: boolean) => {
    if (paymentRequest.status === 'completed' && !force) {
      setStatusLoading(false);
      return;
    }
    setStatusLoading(true);
    try {
      const {disconnected, fetched, stages} = await dispatch(
        moonpayRefreshTransactionDetails(paymentRequest, force),
      );
      if (disconnected) {
        setEmbeddedDisconnected(true);
        showDisconnectedNotification();
        return;
      }
      setEmbeddedDisconnected(false);
      setSepaDetails(paymentRequest.sepa_details);
      if (isEmbeddedSepa) {
        if (fetched) {
          setSepaStages(stages);
          updateStatusDescription(stages);
        }
      } else {
        updateStatusDescription();
      }
    } finally {
      setStatusLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([getTransactionDetails(true), sleep(1000)]);
    setRefreshing(false);
  };

  useEffect(() => {
    updateStatusDescription();
    getTransactionDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount to set the initial status and fetch the latest transaction details; later refreshes go through onRefresh
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedDepositAddress(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedDepositAddress]);

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedSepaField(undefined);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedSepaField]);

  // moonpayGetTransactionDetails

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
            <MoonpayLogo iconOnly={true} />
          </RowDataContainer>

          <RowDataContainer>
            <RowLabel>{t('Approximate receiving fiat amount')}</RowLabel>
            <RowData>
              {paymentRequest.fiat_base_amount}{' '}
              {paymentRequest.fiat_total_amount_currency}
            </RowData>
          </RowDataContainer>
          <LabelTip type="warn">
            <LabelTipText>
              {t(
                "The final crypto amount you receive when the transaction is complete may differ because it is based on Moonpay's exchange rate.",
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
                  color: moonpayGetStatusColor(paymentRequest.status),
                  textTransform: 'capitalize',
                }}>
                {status.statusTitle}
              </RowData>
            </RowDataContainer>
          )}

          {!paymentRequest.status && (
            <LabelTip type="info">
              <LabelTipText>
                {t(
                  'If you have successfully completed the entire payment process, remember that receiving crypto may take a few hours.',
                )}
              </LabelTipText>
              <TouchableOpacity
                testID="moonpay-payment-status-link"
                accessibilityLabel={t('Check Moonpay payment status')}
                onPress={() => {
                  haptic('impactLight');
                  dispatch(
                    openUrlWithInAppBrowser(
                      'https://buy.moonpay.com/trade_history',
                    ),
                  );
                }}>
                <Link style={{marginTop: 15}}>
                  {t('What is the status of my payment?')}
                </Link>
              </TouchableOpacity>
            </LabelTip>
          )}

          {!!paymentRequest.status && (
            <LabelTip type={embeddedDisconnected ? 'warn' : 'info'}>
              {embeddedDisconnected ? (
                <>
                  <LabelTipText>
                    {t(
                      'Warning: You are disconnected from MoonPay, so this status may be out of date. Please connect again to see its latest status.',
                    )}
                  </LabelTipText>
                  <Br />
                </>
              ) : null}
              {statusLoading ? (
                <ActivityIndicator color={ProgressBlue} size={'small'} />
              ) : (
                <LabelTipText>{status.statusDescription}</LabelTipText>
              )}
              {!statusLoading && ['failed'].includes(paymentRequest.status) ? (
                <>
                  <Br />
                  <LabelTipText>
                    {t('Having problems with Moonpay?')}{' '}
                  </LabelTipText>
                  <TouchableOpacity
                    testID="moonpay-support-link"
                    accessibilityLabel={t('Contact Moonpay support')}
                    onPress={() => {
                      haptic('impactLight');
                      dispatch(openUrlWithInAppBrowser(MOONPAY_SUPPORT_URL));
                    }}>
                    <Link style={{marginTop: 15}}>
                      {t('Contact the Moonpay support team.')}
                    </Link>
                  </TouchableOpacity>
                </>
              ) : null}
            </LabelTip>
          )}

          {sepaRows.length > 0 &&
          !statusLoading &&
          moonpaySepaIsWaitingForPayment(paymentRequest.status, sepaStages) ? (
            <>
              <RowDataContainer style={{marginTop: 0, marginBottom: 0}}>
                <RowLabel>{t('Bank transfer details')}</RowLabel>
              </RowDataContainer>
              {sepaRows.map(row => (
                <ColumnDataContainer
                  key={row.key}
                  style={{paddingHorizontal: 15}}>
                  <TouchableOpacity
                    testID={`moonpay-copy-sepa-${row.key}-button`}
                    accessibilityLabel={t('Copy {{label}}', {label: row.label})}
                    onPress={() => {
                      copyText(row.copyValue ?? row.value);
                      setCopiedSepaField(row.key);
                    }}>
                    <RowLabel>{row.label}</RowLabel>
                    <CopiedContainer>
                      <ColumnData style={{maxWidth: '90%'}}>
                        {row.value}
                      </ColumnData>
                      <CopyImgContainerRight style={{minWidth: '10%'}}>
                        {copiedSepaField === row.key ? (
                          <CopiedSvg width={17} />
                        ) : null}
                      </CopyImgContainerRight>
                    </CopiedContainer>
                  </TouchableOpacity>
                  {row.key === 'reference' && (
                    <LabelTip
                      type="warn"
                      style={{marginTop: 10, marginBottom: 0}}>
                      <LabelTipText>
                        {t(
                          'Your transfer must include the reference above, or MoonPay will reject it.',
                        )}
                      </LabelTipText>
                    </LabelTip>
                  )}
                </ColumnDataContainer>
              ))}
              <View
                style={[
                  styles.bankTransferSeparator,
                  {borderColor: theme.dark ? SlateDark : Slate},
                ]}
              />
            </>
          ) : null}

          <ColumnDataContainer>
            <TouchableOpacity
              testID="moonpay-copy-deposit-address-button"
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

          {!!paymentRequest.transaction_id && (
            <ColumnDataContainer>
              <TouchableOpacity
                testID="moonpay-copy-transaction-id-button"
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

          <ColumnDataContainer>
            <TouchableOpacity
              testID="moonpay-copy-external-transaction-id-button"
              accessibilityLabel={t('Copy external transaction ID')}
              onPress={() => {
                copyText(paymentRequest.external_id);
                setCopiedExternalId(true);
              }}>
              <RowLabel>{t('External Transaction ID')}</RowLabel>
              <CopiedContainer>
                <ColumnData style={{maxWidth: '90%'}}>
                  {paymentRequest.external_id}
                </ColumnData>
                <CopyImgContainerRight style={{minWidth: '10%'}}>
                  {copiedExternalId ? <CopiedSvg width={17} /> : null}
                </CopyImgContainerRight>
              </CopiedContainer>
            </TouchableOpacity>
          </ColumnDataContainer>

          <RemoveCta
            testID="moonpay-remove-payment-request-button"
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
                          BuyCryptoActions.removePaymentRequestMoonpay({
                            externalId: paymentRequest.external_id,
                          }),
                        );
                        navigation.goBack();
                      },
                      primary: true,
                    },
                    {
                      text: t('GO BACK'),
                      action: () => {},
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

export default MoonpayDetails;
