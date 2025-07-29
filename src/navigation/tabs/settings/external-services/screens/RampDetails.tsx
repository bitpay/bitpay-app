import React, {useEffect, useState} from 'react';
import {Text} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {RouteProp, useRoute, useNavigation} from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';
import moment from 'moment';
import {Link} from '../../../../../components/styled/Text';
import {SettingsComponent, SettingsContainer} from '../../SettingsRoot';
import haptic from '../../../../../components/haptic-feedback/haptic';
import RampLogo from '../../../../../components/icons/external-services/ramp/ramp-logo';
import {RampPaymentData} from '../../../../../store/buy-crypto/models/ramp.models';
import {useAppDispatch} from '../../../../../utils/hooks';
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
  rampGetStatusDetails,
  RampStatus,
} from '../../../../services/buy-crypto/utils/ramp-utils';
import {Br} from '../../../../../components/styled/Containers';

export interface RampDetailsProps {
  paymentRequest: RampPaymentData;
}

const copyText = (text: string) => {
  haptic('impactLight');
  Clipboard.setString(text);
};

const RampDetails: React.FC = () => {
  const {t} = useTranslation();
  const {
    params: {paymentRequest},
  } = useRoute<RouteProp<{params: RampDetailsProps}>>();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState<RampStatus>({
    statusTitle: undefined,
    statusDescription: undefined,
  });
  const [copiedDepositAddress, setCopiedDepositAddress] = useState(false);

  const updateStatusDescription = () => {
    setStatus(rampGetStatusDetails(paymentRequest.status));
  };

  useEffect(() => {
    updateStatusDescription();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedDepositAddress(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedDepositAddress]);

  return (
    <SettingsContainer>
      <SettingsComponent>
        <ExternalServiceContainer>
          <RowDataContainer>
            <CryptoAmountContainer>
              <CryptoTitle>{t('Approximate receiving amount')}</CryptoTitle>
              <CryptoContainer>
                <CryptoAmount>{paymentRequest.crypto_amount}</CryptoAmount>
                <CryptoUnit>{paymentRequest.coin}</CryptoUnit>
              </CryptoContainer>
            </CryptoAmountContainer>
            <RampLogo iconOnly={true} width={50} height={50} />
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
                "The final crypto amount you receive when the transaction is complete may differ because it is based on Ramp's exchange rate.",
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
                      'https://support.ramp.network/en/articles/8647-how-do-i-check-the-status-of-my-crypto-purchase-on-ramp-network',
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
              {['pending'].includes(paymentRequest.status) ? (
                <>
                  <Br />
                  <LabelTipText>
                    {t('What is the status of my payment?')}{' '}
                  </LabelTipText>
                  <TouchableOpacity
                    onPress={() => {
                      haptic('impactLight');
                      dispatch(
                        openUrlWithInAppBrowser(
                          'https://support.ramp.network/en/articles/8647-how-do-i-check-the-status-of-my-crypto-purchase-on-ramp-network',
                        ),
                      );
                    }}>
                    <Link style={{marginTop: 15}}>{t('Transaction FAQ')}</Link>
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
                          BuyCryptoActions.removePaymentRequestRamp({
                            rampExternalId: paymentRequest.external_id,
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

export default RampDetails;
