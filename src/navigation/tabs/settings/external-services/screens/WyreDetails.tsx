import React, {useEffect, useState} from 'react';
import {Text} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import Clipboard from '@react-native-clipboard/clipboard';
import {RouteProp, useRoute, useNavigation} from '@react-navigation/native';
import moment from 'moment';
import {SettingsComponent, SettingsContainer} from '../../SettingsRoot';
import haptic from '../../../../../components/haptic-feedback/haptic';
import WyreLogo from '../../../../../components/icons/external-services/wyre/wyre-logo';
import {WyrePaymentData} from '../../../../../store/buy-crypto/buy-crypto.models';
import {useAppDispatch} from '../../../../../utils/hooks';
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
import {useLogger} from '../../../../../utils/hooks/useLogger';
import {useTranslation} from 'react-i18next';
import CopiedSvg from '../../../../../../assets/img/copied-success.svg';
import {BitpaySupportedCoins} from '../../../../../constants/currencies';

export interface WyreDetailsProps {
  paymentRequest: WyrePaymentData;
}

const copyText = (text: string) => {
  haptic('impactLight');
  Clipboard.setString(text);
};

const WyreDetails: React.FC = () => {
  const {t} = useTranslation();
  const {
    params: {paymentRequest},
  } = useRoute<RouteProp<{params: WyreDetailsProps}>>();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const logger = useLogger();
  const [paymentData, setPaymentData] =
    useState<WyrePaymentData>(paymentRequest);
  const [copiedDepositAddress, setCopiedDepositAddress] = useState(false);
  const [copiedTransferId, setCopiedTransferId] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [copiedBlockchainNetworkTx, setCopiedBlockchainNetworkTx] =
    useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedDepositAddress(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedDepositAddress]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedTransferId(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedTransferId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedOrderId(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedOrderId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedBlockchainNetworkTx(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedBlockchainNetworkTx]);

  return (
    <SettingsContainer>
      <SettingsComponent>
        <ExternalServiceContainer>
          <RowDataContainer>
            <CryptoAmountContainer>
              <CryptoTitle>{t('Approximate receiving amount')}</CryptoTitle>
              <CryptoContainer>
                <CryptoAmount>{paymentData.destAmount}</CryptoAmount>
                <CryptoUnit>{paymentData.destCurrency}</CryptoUnit>
              </CryptoContainer>
            </CryptoAmountContainer>
            <WyreLogo iconOnly={true} width={45} height={40} />
          </RowDataContainer>

          <RowDataContainer>
            <RowLabel>{t('Approximate receiving fiat amount')}</RowLabel>
            <RowData>
              {paymentData.purchaseAmount} {paymentData.sourceCurrency}
            </RowData>
          </RowDataContainer>
          <LabelTip type="warn">
            <LabelTipText>
              {t(
                "The final crypto amount you receive when the transaction is complete may differ because it is based on Wyre's exchange rate.",
              )}
            </LabelTipText>
          </LabelTip>

          <RowDataContainer>
            <RowLabel>{t('Paying')}</RowLabel>
            <RowData>
              {paymentData.sourceAmount} {paymentData.sourceCurrency}
            </RowData>
          </RowDataContainer>

          {paymentData.destChain && (
            <RowDataContainer>
              <RowLabel>{t('Deposit Blockchain')}</RowLabel>
              <RowData>
                {BitpaySupportedCoins[paymentData.destChain.toLowerCase()]
                  ?.name || paymentData.destChain.toUpperCase()}
              </RowData>
            </RowDataContainer>
          )}

          <RowDataContainer>
            <RowLabel>{t('Created')}</RowLabel>
            <RowData>
              {moment(paymentData.created_on).format('MMM DD, YYYY hh:mm a')}
            </RowData>
          </RowDataContainer>

          {paymentData.status ? (
            <RowDataContainer>
              <RowLabel>{t('Status')}</RowLabel>
              <RowData>
                {paymentData.status === 'paymentRequestSent' && (
                  <Text>{t('Processing payment request')}</Text>
                )}
                {paymentData.status === 'failed' && (
                  <Text style={{color: '#df5264'}}>
                    {t('Payment request rejected')}
                  </Text>
                )}
                {paymentData.status === 'success' && (
                  <Text style={{color: '#01d1a2'}}>
                    {t('Payment request approved')}
                  </Text>
                )}
              </RowData>
            </RowDataContainer>
          ) : null}

          {paymentData.dest ? (
            <ColumnDataContainer>
              <TouchableOpacity
                onPress={() => {
                  copyText(paymentData.dest!);
                  setCopiedDepositAddress(true);
                }}>
                <RowLabel>{t('Deposit address')}</RowLabel>
                <CopiedContainer>
                  <ColumnData style={{maxWidth: '90%'}}>
                    {paymentData.dest}
                  </ColumnData>
                  <CopyImgContainerRight style={{minWidth: '10%'}}>
                    {copiedDepositAddress ? <CopiedSvg width={17} /> : null}
                  </CopyImgContainerRight>
                </CopiedContainer>
              </TouchableOpacity>
            </ColumnDataContainer>
          ) : null}

          {paymentData.paymentMethodName ? (
            <ColumnDataContainer>
              <RowLabel>{t('Payment method')}</RowLabel>
              <ColumnData>{paymentData.paymentMethodName}</ColumnData>
            </ColumnDataContainer>
          ) : null}

          {paymentData.transferId ? (
            <ColumnDataContainer>
              <TouchableOpacity
                onPress={() => {
                  copyText(paymentData.transferId!);
                  setCopiedTransferId(true);
                }}>
                <RowLabel>{t('Transfer ID')}</RowLabel>
                <CopiedContainer>
                  <ColumnData style={{maxWidth: '90%'}}>
                    {paymentData.transferId}
                  </ColumnData>
                  <CopyImgContainerRight style={{minWidth: '10%'}}>
                    {copiedTransferId ? <CopiedSvg width={17} /> : null}
                  </CopyImgContainerRight>
                </CopiedContainer>
              </TouchableOpacity>
            </ColumnDataContainer>
          ) : null}

          {!!paymentData.orderId && (
            <ColumnDataContainer>
              <TouchableOpacity
                onPress={() => {
                  copyText(paymentData.orderId);
                  setCopiedOrderId(true);
                }}>
                <RowLabel>{t('Order ID')}</RowLabel>
                <CopiedContainer>
                  <ColumnData style={{maxWidth: '90%'}}>
                    {paymentData.orderId}
                  </ColumnData>
                  <CopyImgContainerRight style={{minWidth: '10%'}}>
                    {copiedOrderId ? <CopiedSvg width={17} /> : null}
                  </CopyImgContainerRight>
                </CopiedContainer>
              </TouchableOpacity>
            </ColumnDataContainer>
          )}

          {paymentData.blockchainNetworkTx ? (
            <ColumnDataContainer>
              <TouchableOpacity
                onPress={() => {
                  copyText(paymentData.blockchainNetworkTx!);
                  setCopiedBlockchainNetworkTx(true);
                }}>
                <RowLabel>{t('Blockchain Network Tx')}</RowLabel>
                <CopiedContainer>
                  <ColumnData style={{maxWidth: '90%'}}>
                    {paymentData.blockchainNetworkTx}
                  </ColumnData>
                  <CopyImgContainerRight style={{minWidth: '10%'}}>
                    {copiedBlockchainNetworkTx ? (
                      <CopiedSvg width={17} />
                    ) : null}
                  </CopyImgContainerRight>
                </CopiedContainer>
              </TouchableOpacity>
            </ColumnDataContainer>
          ) : null}

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
                          BuyCryptoActions.removePaymentRequestWyre({
                            orderId: paymentData.orderId,
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

export default WyreDetails;
