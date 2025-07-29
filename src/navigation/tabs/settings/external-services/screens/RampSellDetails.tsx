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
import {useAppDispatch, useLogger} from '../../../../../utils/hooks';
import {
  showBottomNotificationModal,
  dismissBottomNotificationModal,
} from '../../../../../store/app/app.actions';
import {openUrlWithInAppBrowser} from '../../../../../store/app/app.effects';
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
import {RampSellOrderData} from '../../../../../store/sell-crypto/models/ramp-sell.models';
import {
  rampSellGetStatusColor,
  rampSellGetStatusDetails,
  RampSellStatus,
} from '../../../../services/sell-crypto/utils/ramp-sell-utils';
import {SellCryptoActions} from '../../../../../store/sell-crypto';
import {Br} from '../../../../../components/styled/Containers';
export interface RampSellDetailsProps {
  sellOrder: RampSellOrderData;
}

const copyText = (text: string) => {
  haptic('impactLight');
  Clipboard.setString(text);
};

const RampSellDetails: React.FC = () => {
  const {t} = useTranslation();
  const {
    params: {sellOrder},
  } = useRoute<RouteProp<{params: RampSellDetailsProps}>>();
  const navigation = useNavigation();
  const logger = useLogger();
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState<RampSellStatus>({
    statusTitle: undefined,
    statusDescription: undefined,
  });
  const [copiedDepositAddress, setCopiedDepositAddress] = useState(false);
  const [copiedPaymentId, setCopiedPaymentId] = useState(false);
  const [copiedTransactionSentId, setCopiedTransactionSentId] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(false);

  const updateStatusDescription = () => {
    setStatus(rampSellGetStatusDetails(sellOrder.status));
  };

  useEffect(() => {
    updateStatusDescription();
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
      setCopiedPaymentId(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedPaymentId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedTransactionSentId(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedTransactionSentId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedOrderId(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedOrderId]);

  return (
    <SettingsContainer>
      <SettingsComponent>
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
            <RampLogo iconOnly={true} width={50} height={50} />
          </RowDataContainer>

          <LabelTip type="warn">
            <LabelTipText>
              {t(
                "The final amount you receive when the transaction is complete may differ because it is based on Ramp's exchange rate.",
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
                  color: rampSellGetStatusColor(sellOrder.status),
                  textTransform: 'capitalize',
                }}>
                {status.statusTitle || t('Sell Order started')}
              </RowData>
            </RowDataContainer>
          )}

          {!sellOrder.status && (
            <LabelTip type="info">
              <LabelTipText>
                {t(
                  'If you have successfully completed the entire crypto selling process, remember that receiving payment may take a few days.',
                )}
              </LabelTipText>
              <TouchableOpacity
                onPress={() => {
                  haptic('impactLight');
                  dispatch(
                    openUrlWithInAppBrowser(
                      'https://support.ramp.network/en/articles/8968-how-do-i-check-the-status-of-my-crypto-sale',
                    ),
                  );
                }}>
                <Link style={{marginTop: 15}}>
                  {t('What is the status of my crypto sale?')}
                </Link>
              </TouchableOpacity>
            </LabelTip>
          )}

          {sellOrder.status ? (
            <LabelTip type="info">
              <LabelTipText
                style={{maxWidth: status?.statusDescription ? '80%' : '90%'}}>
                {status.statusDescription ||
                  t(
                    'If you have successfully completed the entire crypto selling process, remember that receiving payment may take a few days.',
                  )}
              </LabelTipText>
              {['expired'].includes(sellOrder.status) ? (
                <>
                  <Br />
                  <LabelTipText>
                    {t('Having problems with Ramp?')}{' '}
                  </LabelTipText>
                  <TouchableOpacity
                    onPress={() => {
                      haptic('impactLight');
                      dispatch(
                        openUrlWithInAppBrowser(
                          'https://www.ramp.com/support/',
                        ),
                      );
                    }}>
                    <Link style={{marginTop: 15}}>
                      {t('Contact the Ramp support team.')}
                    </Link>
                  </TouchableOpacity>
                </>
              ) : null}
              {['created', 'createdOrder', 'bitpayTxSent'].includes(
                sellOrder.status,
              ) ? (
                <>
                  <Br />
                  <LabelTipText>
                    {t('What is the status of my crypto sale?')}{' '}
                  </LabelTipText>
                  <TouchableOpacity
                    onPress={() => {
                      haptic('impactLight');
                      dispatch(
                        openUrlWithInAppBrowser(
                          'https://support.ramp.network/en/articles/8968-how-do-i-check-the-status-of-my-crypto-sale',
                        ),
                      );
                    }}>
                    <Link style={{marginTop: 15}}>{t('Transaction FAQ')}</Link>
                  </TouchableOpacity>
                </>
              ) : null}
            </LabelTip>
          ) : null}

          <ColumnDataContainer>
            <TouchableOpacity
              onPress={() => {
                copyText(sellOrder.address_to);
                setCopiedDepositAddress(true);
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

          {sellOrder.quote_id ? (
            <ColumnDataContainer>
              <TouchableOpacity
                onPress={() => {
                  copyText(sellOrder.quote_id!);
                  setCopiedPaymentId(true);
                }}>
                <RowLabel>{t('Ramp Network Order ID')}</RowLabel>
                <CopiedContainer>
                  <ColumnData style={{maxWidth: '90%'}}>
                    {sellOrder.quote_id}
                  </ColumnData>
                  <CopyImgContainerRight style={{minWidth: '10%'}}>
                    {copiedPaymentId ? <CopiedSvg width={17} /> : null}
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
                          SellCryptoActions.removeSellOrderRamp({
                            rampExternalId: sellOrder.external_id,
                          }),
                        );
                        navigation.goBack();
                      },
                      primary: true,
                    },
                    {
                      text: t('GO BACK'),
                      action: () => {
                        console.log('Removing sell order CANCELED');
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

export default RampSellDetails;
