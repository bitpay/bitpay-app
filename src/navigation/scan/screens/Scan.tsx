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
        title: 'Permission to use camera',
        message: 'We need your permission to use your camera',
        buttonPositive: 'Ok',
        buttonNegative: 'Cancel',
      }}
      onBarCodeRead={debounce(
        ({data}) => {
          navigationRef.goBack();
          // if specific handler is passed use that else use generic self deriving handler
          if (onScanComplete) {
            onScanComplete(data);
          } else {
            dispatch(incomingData(data));
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
