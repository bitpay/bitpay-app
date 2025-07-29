import React, {useEffect, useState} from 'react';
import {RefreshControl, Text} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {RouteProp, useRoute, useNavigation} from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';
import {useTheme} from '@react-navigation/native';
import moment from 'moment';
import {Br} from '../../../../../components/styled/Containers';
import {SettingsComponent, SettingsContainer} from '../../SettingsRoot';
import haptic from '../../../../../components/haptic-feedback/haptic';
import {changellyTxData} from '../../../../../store/swap-crypto/swap-crypto.models';
import {changellyGetStatus} from '../../../../../store/swap-crypto/effects/changelly/changelly';
import ChangellyLogo from '../../../../../components/icons/external-services/changelly/changelly-logo';
import {useAppDispatch, useLogger} from '../../../../../utils/hooks';
import {
  showBottomNotificationModal,
  dismissBottomNotificationModal,
} from '../../../../../store/app/app.actions';
import {SwapCryptoActions} from '../../../../../store/swap-crypto';
import {
  changellyGetStatusDetails,
  Status,
  changellyGetStatusColor,
} from '../../../../../navigation/services/swap-crypto/utils/changelly-utils';
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
import {sleep} from '../../../../../utils/helper-methods';
import {SlateDark, White} from '../../../../../styles/colors';

export interface ChangellyDetailsProps {
  swapTx: changellyTxData;
}

const ChangellyDetails: React.FC = () => {
  const {t} = useTranslation();
  const {
    params: {swapTx},
  } = useRoute<RouteProp<{params: ChangellyDetailsProps}>>();
  const navigation = useNavigation();
  const logger = useLogger();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState<Status>({
    statusTitle: undefined,
    statusDescription: undefined,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [copiedDepositAddress, setCopiedDepositAddress] = useState(false);
  const [copiedPayinAddress, setCopiedPayinAddress] = useState(false);
  const [copiedPayinExtraId, setCopiedPayinExtraId] = useState(false);
  const [copiedRefundAddress, setCopiedRefundAddress] = useState(false);
  const [copiedExchangeTxId, setCopiedExchangeTxId] = useState(false);
  const [copiedSupportEmailLabelTip, setCopiedSupportEmailLabelTip] =
    useState(false);
  const [copiedExchangeTxIdLabelTip, setCopiedExchangeTxIdLabelTip] =
    useState(false);

  const copyText = (text: string) => {
    haptic('impactLight');
    Clipboard.setString(text);
  };

  const updateStatusDescription = () => {
    setStatus(changellyGetStatusDetails(swapTx.status));
  };

  const getStatus = (force?: boolean) => {
    if (swapTx.status === 'finished' && !force) {
      return;
    }
    console.log('===========changellyGetStatus data enviada : ', swapTx);
    changellyGetStatus(swapTx.exchangeTxId, swapTx.status)
      .then(data => {
        console.log('===========changellyGetStatus data recibida : ', data);
        if (data.error) {
          logger.error('Changelly getStatus Error: ' + data.error.message);
          return;
        }
        if (data.result != swapTx.status) {
          logger.debug('Updating status to: ' + data.result);
          swapTx.status = data.result;
          updateStatusDescription();
          dispatch(
            SwapCryptoActions.successTxChangelly({
              changellyTxData: swapTx,
            }),
          );

          logger.debug('Saved swap with: ' + JSON.stringify(swapTx));
        }
      })
      .catch(err => {
        console.log('===========changellyGetStatus err : ', err);
        logger.error('Changelly getStatus Error: ' + JSON.stringify(err));
      });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([getStatus(true), sleep(1000)]);
    setRefreshing(false);
  };

  useEffect(() => {
    updateStatusDescription();
    getStatus();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedDepositAddress(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedDepositAddress]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedPayinAddress(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedPayinAddress]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedPayinExtraId(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedPayinExtraId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedRefundAddress(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedRefundAddress]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedExchangeTxId(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedExchangeTxId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedSupportEmailLabelTip(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedSupportEmailLabelTip]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedExchangeTxIdLabelTip(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedExchangeTxIdLabelTip]);

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
              <CryptoTitle>{t('Receiving amount')}</CryptoTitle>
              <CryptoContainer>
                <CryptoAmount>{swapTx.amountTo}</CryptoAmount>
                <CryptoUnit>{swapTx.coinTo.toUpperCase()}</CryptoUnit>
              </CryptoContainer>
            </CryptoAmountContainer>
            <ChangellyLogo iconOnly={true} width={45} height={45} />
          </RowDataContainer>

          <ColumnDataContainer>
            <TouchableOpacity
              onPress={() => {
                copyText(swapTx.addressTo);
                setCopiedDepositAddress(true);
              }}>
              <RowLabel>{t('Deposit address')}</RowLabel>
              <CopiedContainer>
                <ColumnData style={{maxWidth: '90%'}}>
                  {swapTx.addressTo}
                </ColumnData>
                <CopyImgContainerRight style={{minWidth: '10%'}}>
                  {copiedDepositAddress ? <CopiedSvg width={17} /> : null}
                </CopyImgContainerRight>
              </CopiedContainer>
            </TouchableOpacity>
          </ColumnDataContainer>

          {swapTx.chainTo && (
            <RowDataContainer style={{marginTop: 20}}>
              <RowLabel>{t('Deposit Blockchain')}</RowLabel>
              <RowData>
                {BitpaySupportedCoins[swapTx.chainTo.toLowerCase()]?.name ||
                  swapTx.chainTo.toUpperCase()}
              </RowData>
            </RowDataContainer>
          )}

          <RowDataContainer style={!swapTx.chainTo ? {marginTop: 20} : {}}>
            <RowLabel>{t('Paying')}</RowLabel>
            <RowData>
              {swapTx.amountFrom} {swapTx.coinFrom.toUpperCase()}
            </RowData>
          </RowDataContainer>

          {swapTx.chainFrom && (
            <RowDataContainer>
              <RowLabel>{t('Source Blockchain')}</RowLabel>
              <RowData>
                {BitpaySupportedCoins[swapTx.chainFrom.toLowerCase()]?.name ||
                  swapTx.chainFrom.toUpperCase()}
              </RowData>
            </RowDataContainer>
          )}

          <RowDataContainer>
            <RowLabel>{t('Created')}</RowLabel>
            <RowData>
              {moment(swapTx.date).format('MMM DD, YYYY hh:mm a')}
            </RowData>
          </RowDataContainer>

          {!!swapTx.status && (
            <RowDataContainer>
              <RowLabel>{t('Status')}</RowLabel>
              <RowData
                style={{
                  color: changellyGetStatusColor(swapTx.status),
                  textTransform: 'capitalize',
                }}>
                {status.statusTitle}
              </RowData>
            </RowDataContainer>
          )}

          <LabelTip type="info">
            <LabelTipText>{status.statusDescription}</LabelTipText>
            {!!swapTx.status && ['failed', 'hold'].includes(swapTx.status) ? (
              <>
                <Br />
                <CopiedContainer>
                  <TouchableOpacity
                    style={{maxWidth: '90%'}}
                    onPress={() => {
                      copyText('security@changelly.com');
                      setCopiedSupportEmailLabelTip(true);
                    }}>
                    <LabelTipText>
                      {t('Please contact Changelly support:')}{' '}
                      <LabelTipText style={{fontWeight: '700'}}>
                        security@changelly.com
                      </LabelTipText>
                    </LabelTipText>
                  </TouchableOpacity>
                  <CopyImgContainerRight
                    style={{minWidth: '10%', paddingTop: 0}}>
                    {copiedSupportEmailLabelTip ? (
                      <CopiedSvg width={17} />
                    ) : null}
                  </CopyImgContainerRight>
                </CopiedContainer>
                <Br />
                <CopiedContainer>
                  <TouchableOpacity
                    style={{maxWidth: '90%'}}
                    onPress={() => {
                      copyText(swapTx.exchangeTxId);
                      setCopiedExchangeTxIdLabelTip(true);
                    }}>
                    <LabelTipText>
                      {t('Provide the transaction id:')}{' '}
                      <LabelTipText style={{fontWeight: '700'}}>
                        {swapTx.exchangeTxId}
                      </LabelTipText>
                    </LabelTipText>
                  </TouchableOpacity>
                  <CopyImgContainerRight
                    style={{minWidth: '10%', paddingTop: 0}}>
                    {copiedExchangeTxIdLabelTip ? (
                      <CopiedSvg width={17} />
                    ) : null}
                  </CopyImgContainerRight>
                </CopiedContainer>
              </>
            ) : null}
          </LabelTip>

          <ColumnDataContainer>
            <TouchableOpacity
              onPress={() => {
                copyText(swapTx.payinAddress);
                setCopiedPayinAddress(true);
              }}>
              <RowLabel>{t('Exchange address (Payin)')}</RowLabel>
              <CopiedContainer>
                <ColumnData style={{maxWidth: '90%'}}>
                  {swapTx.payinAddress}
                </ColumnData>
                <CopyImgContainerRight style={{minWidth: '10%'}}>
                  {copiedPayinAddress ? <CopiedSvg width={17} /> : null}
                </CopyImgContainerRight>
              </CopiedContainer>
            </TouchableOpacity>
          </ColumnDataContainer>

          {swapTx.payinExtraId ? (
            <ColumnDataContainer>
              <TouchableOpacity
                onPress={() => {
                  copyText(swapTx.payinExtraId!);
                  setCopiedPayinExtraId(true);
                }}>
                <RowLabel>{t('Destination Tag (Payin Extra Id)')}</RowLabel>
                <CopiedContainer>
                  <ColumnData style={{maxWidth: '90%'}}>
                    {swapTx.payinExtraId}
                  </ColumnData>
                  <CopyImgContainerRight style={{minWidth: '10%'}}>
                    {copiedPayinExtraId ? <CopiedSvg width={17} /> : null}
                  </CopyImgContainerRight>
                </CopiedContainer>
              </TouchableOpacity>
            </ColumnDataContainer>
          ) : null}

          <ColumnDataContainer>
            <TouchableOpacity
              onPress={() => {
                copyText(swapTx.refundAddress);
                setCopiedRefundAddress(true);
              }}>
              <RowLabel>{t('Refund address')}</RowLabel>
              <CopiedContainer>
                <ColumnData style={{maxWidth: '90%'}}>
                  {swapTx.refundAddress}
                </ColumnData>
                <CopyImgContainerRight style={{minWidth: '10%'}}>
                  {copiedRefundAddress ? <CopiedSvg width={17} /> : null}
                </CopyImgContainerRight>
              </CopiedContainer>
            </TouchableOpacity>
          </ColumnDataContainer>

          <ColumnDataContainer>
            <TouchableOpacity
              onPress={() => {
                copyText(swapTx.exchangeTxId);
                setCopiedExchangeTxId(true);
              }}>
              <RowLabel>{t('Exchange Transaction ID')}</RowLabel>
              <CopiedContainer>
                <ColumnData style={{maxWidth: '90%'}}>
                  {swapTx.exchangeTxId}
                </ColumnData>
                <CopyImgContainerRight style={{minWidth: '10%'}}>
                  {copiedExchangeTxId ? <CopiedSvg width={17} /> : null}
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
                  title: t('Removing transaction data'),
                  message: t(
                    "The data of this swap will be deleted from your device. Make sure you don't need it",
                  ),
                  enableBackdropDismiss: true,
                  actions: [
                    {
                      text: t('REMOVE'),
                      action: () => {
                        dispatch(dismissBottomNotificationModal());
                        dispatch(
                          SwapCryptoActions.removeTxChangelly({
                            exchangeTxId: swapTx.exchangeTxId,
                          }),
                        );
                        navigation.goBack();
                      },
                      primary: true,
                    },
                    {
                      text: t('GO BACK'),
                      action: () => {
                        console.log('Removing transaction data CANCELED');
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

export default ChangellyDetails;
