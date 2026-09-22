import React, {useEffect, useState} from 'react';
import {ActivityIndicator, RefreshControl, Text} from 'react-native';
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
import haptic from '../../../../../components/haptic-feedback/haptic';
import MoonpayLogo from '../../../../../components/icons/external-services/moonpay/moonpay-logo';
import {
  MoonpayPaymentData,
  MoonpayTransactionDetailsEmbeddedData,
  MoonpayTransactionStage,
} from '../../../../../store/buy-crypto/buy-crypto.models';
import {
  useAppDispatch,
  useLogger,
  useAppSelector,
} from '../../../../../utils/hooks';
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
import {moonpayGetTransactionDetailsEmbedded} from '../../../../../store/buy-crypto/effects/moonpay/moonpay';
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
  getMoonpayEmbeddedCredentials,
  isMoonpayEmbeddedCredentialsValid,
  setMoonpayEmbeddedCredentials,
  setMoonpayEmbeddedStatus,
} from '../../../../../store/buy-crypto/buy-crypto.effects';
import {MoonpayClientCredentials} from '../../../../services/utils/moonpayFrameCrypto';
import {ExternalServicesScreens} from '../../../../services/ExternalServicesGroup';
import {moonpaySellEnv} from '../../../../../navigation/services/sell-crypto/utils/moonpay-sell-utils';
import {RootState} from '../../../../../store';
import {Key, Wallet} from '../../../../../store/wallet/wallet.models';
import styled from 'styled-components/native';
export interface MoonpayDetailsProps {
  paymentRequest: MoonpayPaymentData;
}

const BankTransferSeparator = styled.View`
  margin: 15px 15px 0px 15px;
  border: solid 0.5px ${({theme: {dark}}) => (dark ? SlateDark : Slate)};
`;

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
  const logger = useLogger();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const allKeys: {[key: string]: Key} = useAppSelector(
    ({WALLET}: RootState) => WALLET.keys,
  );
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
  const [sepaStages, setSepaStages] = useState<MoonpayTransactionStage[]>();
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
        ...(sepaDetails.bankName
          ? [
              {
                key: 'bankName',
                label: t('Bank name'),
                value: sepaDetails.bankName,
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

    if (paymentRequest.is_embedded && paymentRequest.transaction_id) {
      const cachedCredentials = getMoonpayEmbeddedCredentials();
      if (isMoonpayEmbeddedCredentialsValid() && cachedCredentials) {
        setEmbeddedDisconnected(false);
        try {
          const txDetails: MoonpayTransactionDetailsEmbeddedData =
            await moonpayGetTransactionDetailsEmbedded({
              transactionId: paymentRequest.transaction_id,
              accessToken: cachedCredentials.accessToken,
            });

          console.log('Moonpay embedded transaction details', txDetails);

          if (!txDetails) {
            logger.error(
              'Moonpay moonpayGetTransactionDetailsEmbedded Error: ' +
                'No data returned',
            );
            return;
          }
          let needUpdate = false;
          if (
            !paymentRequest.status ||
            txDetails.status != paymentRequest.status
          ) {
            logger.debug('Updating status to: ' + txDetails.status);
            paymentRequest.status = txDetails.status;
            updateStatusDescription();
            needUpdate = true;
          }

          if (
            txDetails?.destination?.amount &&
            Number(txDetails.destination.amount) > 0 &&
            Number(txDetails.destination.amount) != paymentRequest.crypto_amount
          ) {
            logger.debug(
              'Updating crypto amount to: ' + txDetails.destination.amount,
            );
            paymentRequest.crypto_amount = Number(txDetails.destination.amount);

            if (
              txDetails?.source?.amount &&
              Number(txDetails.source.amount) > 0 &&
              Number(txDetails.source.amount) !=
                paymentRequest.fiat_total_amount
            ) {
              logger.debug(
                'Updating fiat total amount to: ' + txDetails.source.amount,
              );
              paymentRequest.fiat_total_amount = Number(
                txDetails.source.amount,
              );
            }
            needUpdate = true;
          }

          // The checkout stores these when the purchase is created, but the
          // deposit details are generated asynchronously, so they can still be
          // missing by then.
          if (
            !paymentRequest.sepa_details &&
            txDetails?.bankTransferDepositInfo?.reference
          ) {
            const depositInfo = txDetails.bankTransferDepositInfo;
            paymentRequest.sepa_details = {
              reference: depositInfo.reference,
              iban: depositInfo.iban,
              bic: depositInfo.bic,
              recipientName: depositInfo.recipientName,
              bankName: depositInfo.bankName,
            };
            setSepaDetails(paymentRequest.sepa_details);
            needUpdate = true;
          }

          // A bank transfer sits at 'pending' from creation until the money
          // settles, so the stages are the only place the progress shows.
          if (isEmbeddedSepa) {
            setSepaStages(txDetails.stages);
            updateStatusDescription(txDetails.stages);
          }

          if (needUpdate || true) {
            const stateParams = {
              externalId: paymentRequest.external_id,
              transactionId: paymentRequest.transaction_id,
              status: paymentRequest.status,
              cryptoAmount: paymentRequest.crypto_amount,
              fiatTotalAmount: paymentRequest.fiat_total_amount,
              sepaDetails: paymentRequest.sepa_details,
            };
            dispatch(
              BuyCryptoActions.updatePaymentRequestMoonpay({
                moonpayIncomingData: stateParams,
              }),
            );

            logger.debug(
              'Saved payment request with: ' + JSON.stringify(paymentRequest),
            );
          }
        } catch (err) {
          const errStr =
            err instanceof Error ? err.message : JSON.stringify(err);
          logger.error(
            'Moonpay getTransactionDetailsEmbedded Error: ' + errStr,
          );
        } finally {
          setStatusLoading(false);
        }
      } else {
        logger.warn(
          'Moonpay getTransactionDetailsEmbedded Error: User disconnected or credentials expired',
        );
        setEmbeddedDisconnected(true);
        setStatusLoading(false);
        showDisconnectedNotification();
      }
    } else {
      try {
        const walletIsSupported = (wallet: Wallet): boolean =>
          !!(wallet.credentials && wallet.isComplete());

        const selectedWallet = Object.values(allKeys)
          .filter(key => key.backupComplete)
          .flatMap(key => key.wallets ?? [])
          .find(walletIsSupported);

        if (!selectedWallet) {
          logger.error(
            'No supported wallet found for Moonpay transaction details',
          );
          return;
        }

        let body;
        if (paymentRequest.transaction_id) {
          body = {
            transactionId: paymentRequest.transaction_id,
            env: moonpaySellEnv,
          };
        } else if (paymentRequest.external_id) {
          body = {externalId: paymentRequest.external_id, env: moonpaySellEnv};
        } else {
          logger.debug('Moonpay getTransactionDetails: Missing parameters');
          return;
        }

        const _data = await selectedWallet.moonpayGetTransactionDetails(body);
        let data = _data?.body ?? _data;
        if (Array.isArray(data)) {
          data = data[0];
        }
        if (!data || data.type === 'NotFoundError') {
          logger.error('Moonpay getTransactionDetails Error: ' + data?.message);
          return;
        }
        if (
          !paymentRequest.transaction_id ||
          !paymentRequest.status ||
          data.status != paymentRequest.status
        ) {
          logger.debug('Updating status to: ' + data.status);
          paymentRequest.status = data.status;
          paymentRequest.transaction_id = data.id;
          updateStatusDescription();
          const stateParams = {
            externalId: paymentRequest.external_id,
            transactionId: paymentRequest.transaction_id,
            status: paymentRequest.status,
          };
          dispatch(
            BuyCryptoActions.updatePaymentRequestMoonpay({
              moonpayIncomingData: stateParams,
            }),
          );

          logger.debug(
            'Saved payment request with: ' + JSON.stringify(paymentRequest),
          );
        }
      } catch (err) {
        const errStr = err instanceof Error ? err.message : JSON.stringify(err);
        logger.error('Moonpay getTransactionDetails Error: ' + errStr);
      } finally {
        setStatusLoading(false);
      }
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
                accessibilityLabel="Check Moonpay payment status"
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
                    accessibilityLabel="Contact Moonpay support"
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
                    accessibilityLabel={`Copy ${row.label}`}
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
              <BankTransferSeparator />
            </>
          ) : null}

          <ColumnDataContainer>
            <TouchableOpacity
              testID="moonpay-copy-deposit-address-button"
              accessibilityLabel="Copy deposit address"
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
                accessibilityLabel="Copy transaction ID"
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
              accessibilityLabel="Copy external transaction ID"
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
            accessibilityLabel="Moonpay remove payment request button"
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
