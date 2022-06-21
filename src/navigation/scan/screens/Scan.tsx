import React from 'react';
import {RNCamera} from 'react-native-camera';
import styled from 'styled-components/native';
import ScanGuideSvg from '../../../../assets/img/qr-scan-guides.svg';
import {useDispatch} from 'react-redux';
import {incomingData} from '../../../store/scan/scan.effects';
import debounce from 'lodash.debounce';
import {useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {ScanStackParamList} from '../ScanStack';
import {navigationRef} from '../../../Root';
import {AppActions} from '../../../store/app';
import {CustomErrorMessage} from '../../wallet/components/ErrorMessages';
import {useTranslation} from 'react-i18next';

const ScanContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScanGuide = styled.View`
  width: 60%;
  max-width: 400px;
  max-height: 50%;
  margin: auto;
  opacity: 0.7;
`;

interface Props {
  onScanComplete?: (data: string) => void;
}

const Scan = () => {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const route = useRoute<RouteProp<ScanStackParamList, 'Root'>>();
  const {onScanComplete} = route.params || {};

  return (
    <RNCamera
      style={{
        flex: 1,
      }}
      type={RNCamera.Constants.Type.back}
      flashMode={RNCamera.Constants.FlashMode.auto}
      captureAudio={false}
      androidCameraPermissionOptions={{
        title: t('Permission to use camera'),
        message: t('We need your permission to use your camera'),
        buttonPositive: t('Ok'),
        buttonNegative: t('Cancel'),
      }}
      onBarCodeRead={debounce(
        async ({data}) => {
          navigationRef.goBack();
          // if specific handler is passed use that else use generic self deriving handler
          if (onScanComplete) {
            onScanComplete(data);
          } else {
            try {
              await dispatch(incomingData(data));
            } catch (error: any) {
              dispatch(
                AppActions.showBottomNotificationModal(
                  CustomErrorMessage({
                    title: t('Error'),
                    errMsg: error?.message || t('Unable to read QR code'),
                  }),
                ),
              );
            }
          }
        },
        500,
        {
          leading: true,
          trailing: false,
        },
      )}>
      <ScanContainer>
        <ScanGuide>
          <ScanGuideSvg />
        </ScanGuide>
      </ScanContainer>
    </RNCamera>
  );
};

export default Scan;
