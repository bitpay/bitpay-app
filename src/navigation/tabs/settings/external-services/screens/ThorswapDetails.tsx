import React, {useEffect, useState} from 'react';
import {RefreshControl, Text, TouchableOpacity} from 'react-native';
import {RouteProp, useRoute, useNavigation} from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';
import {useTheme} from '@react-navigation/native';
import moment from 'moment';
import {Br} from '../../../../../components/styled/Containers';
import {Settings, SettingsContainer} from '../../SettingsRoot';
import haptic from '../../../../../components/haptic-feedback/haptic';
import {thorswapTxData} from '../../../../../store/swap-crypto/swap-crypto.models';
// import {thorswapGetStatus} from '../../../../../store/swap-crypto/effects/thorswap/thorswap';
import ThorswapLogo from '../../../../../components/icons/external-services/thorswap/thorswap-logo';
import {useAppDispatch, useLogger} from '../../../../../utils/hooks';
import {
  showBottomNotificationModal,
  dismissBottomNotificationModal,
} from '../../../../../store/app/app.actions';
import {SwapCryptoActions} from '../../../../../store/swap-crypto';
import {
  thorswapGetStatusDetails,
  Status,
  thorswapGetStatusColor,
} from '../../../../../navigation/services/swap-crypto/utils/thorswap-utils';
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
} from '../styled/ExternalServicesDetails';
import {useTranslation} from 'react-i18next';
import CopiedSvg from '../../../../../../assets/img/copied-success.svg';
import {BitpaySupportedCoins} from '../../../../../constants/currencies';
import {sleep} from '../../../../../utils/helper-methods';
import {SlateDark, White} from '../../../../../styles/colors';

export interface ThorswapDetailsProps {
  swapTx: thorswapTxData;
}

const ThorswapDetails: React.FC = () => {
  const {t} = useTranslation();
  const {
    params: {swapTx},
  } = useRoute<RouteProp<{params: ThorswapDetailsProps}>>();
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
    setStatus(thorswapGetStatusDetails(swapTx.status));
  };

  // const getStatus = (force?: boolean) => {
  //   if (swapTx.status === 'finished' && !force) {
  //     return;
  //   }
  //   thorswapGetStatus(swapTx.orderId, swapTx.status)
  //     .then(data => {
  //       if (data.error) {
  //         logger.error('Thorswap getStatus Error: ' + data.error.message);
  //         return;
  //       }
  //       if (data.result != swapTx.status) {
  //         logger.debug('Updating status to: ' + data.result);
  //         swapTx.status = data.result;
  //         updateStatusDescription();
  //         dispatch(
  //           SwapCryptoActions.successTxThorswap({
  //             thorswapTxData: swapTx,
  //           }),
  //         );

  //         logger.debug('Saved swap with: ' + JSON.stringify(swapTx));
  //       }
  //     })
  //     .catch(err => {
  //       logger.error('Thorswap getStatus Error: ' + JSON.stringify(err));
  //     });
  // };

  const onRefresh = async () => {
    setRefreshing(true);
    await sleep(1000); // TODO: use this: await Promise.all([getStatus(true), sleep(1000)]);
    setRefreshing(false);
  };

  useEffect(() => {
    updateStatusDescription();
    // getStatus();
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
      <Settings
        refreshControl={
          <RefreshControl
            tintColor={theme.dark ? White : SlateDark}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }>
        <RowDataContainer>
          <CryptoAmountContainer>
            <CryptoTitle>{t('Receiving amount')}</CryptoTitle>
            <CryptoContainer>
              <CryptoAmount>
                {swapTx.amountTo.toFixed(8).replace(/\.?0+$/, '')}
              </CryptoAmount>
              <CryptoUnit>{swapTx.coinTo.toUpperCase()}</CryptoUnit>
            </CryptoContainer>
          </CryptoAmountContainer>
          <ThorswapLogo iconOnly={true} widthIcon={35} heightIcon={35} />
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
                color: thorswapGetStatusColor(swapTx.status),
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
                    copyText('security@thorswap.com');
                    setCopiedSupportEmailLabelTip(true);
                  }}>
                  <LabelTipText>
                    {t('Please contact Thorswap support:')}{' '}
                    <LabelTipText style={{fontWeight: '700'}}>
                      security@thorswap.com
                    </LabelTipText>
                  </LabelTipText>
                </TouchableOpacity>
                <CopyImgContainerRight style={{minWidth: '10%', paddingTop: 0}}>
                  {copiedSupportEmailLabelTip ? <CopiedSvg width={17} /> : null}
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
                <CopyImgContainerRight style={{minWidth: '10%', paddingTop: 0}}>
                  {copiedExchangeTxIdLabelTip ? <CopiedSvg width={17} /> : null}
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

        {/* <ColumnDataContainer>
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
        </ColumnDataContainer> */}

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
                        SwapCryptoActions.removeTxThorswap({
                          orderId: swapTx.orderId,
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
      </Settings>
    </SettingsContainer>
  );
};

export default ThorswapDetails;
