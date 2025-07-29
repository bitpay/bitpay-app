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
import {Link} from '../../../../../components/styled/Text';
import {SettingsComponent, SettingsContainer} from '../../SettingsRoot';
import haptic from '../../../../../components/haptic-feedback/haptic';
import MoonpayLogo from '../../../../../components/icons/external-services/moonpay/moonpay-logo';
import {MoonpayPaymentData} from '../../../../../store/buy-crypto/buy-crypto.models';
import {useAppDispatch, useLogger} from '../../../../../utils/hooks';
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
import {moonpayGetTransactionDetails} from '../../../../../store/buy-crypto/effects/moonpay/moonpay';
import {
  moonpayGetStatusColor,
  moonpayGetStatusDetails,
  MoonpayStatus,
} from '../../../../services/buy-crypto/utils/moonpay-utils';
import {Br} from '../../../../../components/styled/Containers';
import {sleep} from '../../../../../utils/helper-methods';
import {SlateDark, White} from '../../../../../styles/colors';
export interface MoonpayDetailsProps {
  paymentRequest: MoonpayPaymentData;
}

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
  const [status, setStatus] = useState<MoonpayStatus>({
    statusTitle: undefined,
    statusDescription: undefined,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [copiedDepositAddress, setCopiedDepositAddress] = useState(false);
  const [copiedExternalId, setCopiedExternalId] = useState(false);
  const [copiedTransactionId, setCopiedTransactionId] = useState(false);

  const updateStatusDescription = () => {
    setStatus(moonpayGetStatusDetails(paymentRequest.status));
  };

  const getTransactionDetails = (force?: boolean) => {
    if (paymentRequest.status === 'completed' && !force) {
      return;
    }

    moonpayGetTransactionDetails(
      paymentRequest.transaction_id,
      paymentRequest.external_id,
    )
      .then(data => {
        if (!data || data.type === 'NotFoundError') {
          logger.error('Moonpay getTransactionDetails Error: ' + data.message);
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
      })
      .catch(err => {
        logger.error(
          'Moonpay getTransactionDetails Error: ' + JSON.stringify(err),
        );
      });
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
            <LabelTip type="info">
              <LabelTipText>{status.statusDescription}</LabelTipText>
              {['failed'].includes(paymentRequest.status) ? (
                <>
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

          <ColumnDataContainer>
            <TouchableOpacity
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
                      action: () => {
                        console.log('Removing payment Request CANCELED');
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

export default MoonpayDetails;
