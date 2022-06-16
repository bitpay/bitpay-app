import React, {useEffect, useState} from 'react';
import {Text, TouchableOpacity} from 'react-native';
import {RouteProp, useRoute, useNavigation} from '@react-navigation/native';
import Clipboard from '@react-native-community/clipboard';
import moment from 'moment';
import {Br} from '../../../../../components/styled/Containers';
import {Settings, SettingsContainer} from '../../SettingsRoot';
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
} from '../styled/ExternalServicesDetails';
import {useTranslation} from 'react-i18next';

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
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState<Status>({
    statusTitle: undefined,
    statusDescription: undefined,
  });

  const copyText = (text: string) => {
    Clipboard.setString(text);
  };

  const updateStatusDescription = () => {
    setStatus(changellyGetStatusDetails(swapTx.status));
  };

  const getStatus = (force?: boolean) => {
    if (swapTx.status === 'finished' && !force) {
      return;
    }
    changellyGetStatus(swapTx.exchangeTxId, swapTx.status)
      .then(data => {
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
        logger.error('Changelly getStatus Error: ' + JSON.stringify(err));
      });
  };

  useEffect(() => {
    updateStatusDescription();
    getStatus();
  }, []);

  return (
    <SettingsContainer>
      <Settings>
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
              haptic('impactLight');
              copyText(swapTx.addressTo);
            }}>
            <RowLabel>{t('Deposit address')}</RowLabel>
            <ColumnData>{swapTx.addressTo}</ColumnData>
          </TouchableOpacity>
        </ColumnDataContainer>

        <RowDataContainer style={{marginTop: 20}}>
          <RowLabel>{t('Paying')}</RowLabel>
          <RowData>
            {swapTx.amountFrom} {swapTx.coinFrom.toUpperCase()}
          </RowData>
        </RowDataContainer>

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
          {!!swapTx.status && ['failed', 'hold'].includes(swapTx.status) && (
            <>
              <Br />
              <TouchableOpacity
                onPress={() => {
                  haptic('impactLight');
                  copyText('security@changelly.com');
                }}>
                <LabelTipText>
                  {t('Please contact Changelly support:')}{' '}
                  <LabelTipText style={{fontWeight: '700'}}>
                    security@changelly.com
                  </LabelTipText>
                </LabelTipText>
              </TouchableOpacity>
              <Br />
              <TouchableOpacity
                onPress={() => {
                  haptic('impactLight');
                  copyText(swapTx.exchangeTxId);
                }}>
                <LabelTipText>
                  {t('Provide the transaction id:')}{' '}
                  <LabelTipText style={{fontWeight: '700'}}>
                    {swapTx.exchangeTxId}
                  </LabelTipText>
                </LabelTipText>
              </TouchableOpacity>
            </>
          )}
        </LabelTip>

        <ColumnDataContainer>
          <TouchableOpacity
            onPress={() => {
              haptic('impactLight');
              copyText(swapTx.payinAddress);
            }}>
            <RowLabel>{t('Exchange address (Payin)')}</RowLabel>
            <ColumnData>{swapTx.payinAddress}</ColumnData>
          </TouchableOpacity>
        </ColumnDataContainer>

        {!!swapTx.payinExtraId && (
          <ColumnDataContainer>
            <TouchableOpacity
              onPress={() => {
                haptic('impactLight');
                copyText(swapTx.payinExtraId!);
              }}>
              <RowLabel>{t('Destination Tag (Payin Extra Id)')}</RowLabel>
              <ColumnData>{swapTx.payinExtraId}</ColumnData>
            </TouchableOpacity>
          </ColumnDataContainer>
        )}

        <ColumnDataContainer>
          <TouchableOpacity
            onPress={() => {
              haptic('impactLight');
              copyText(swapTx.refundAddress);
            }}>
            <RowLabel>{t('Refund address')}</RowLabel>
            <ColumnData>{swapTx.refundAddress}</ColumnData>
          </TouchableOpacity>
        </ColumnDataContainer>

        <ColumnDataContainer>
          <TouchableOpacity
            onPress={() => {
              haptic('impactLight');
              copyText(swapTx.exchangeTxId);
            }}>
            <RowLabel>{t('Exchange Transaction ID')}</RowLabel>
            <ColumnData>{swapTx.exchangeTxId}</ColumnData>
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
      </Settings>
    </SettingsContainer>
  );
};

export default ChangellyDetails;
