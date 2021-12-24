import React from 'react';
import {RNCamera} from 'react-native-camera';
import styled, {css} from 'styled-components/native';
import Back from '../../components/back/Back';
import {useNavigation} from '@react-navigation/native';
import haptic from '../../components/haptic-feedback/haptic';
import ScanGuideSvg from '../../../assets/img/qr-scan-guides.svg';
import {Platform} from 'react-native';

const ScanContainer = styled.SafeAreaView`
  flex: 1;
`;

const BackButton = styled.TouchableOpacity`
  width: 41px;
  z-index: 1;
  margin-left: ${Platform.select({
  ios: css`
      0
    `,
  android: css`15px`,
})}; ;
`;

const ScanGuideContainer = styled.View`
  display: flex;
  position: absolute;
  height: 100%;
  width: 100%;
  align-items: center;
  justify-content: center;
  top: 0;
  left: 0;
`;

const ScanGuide = styled.View`
  width: 60%;
  max-width: 400px;
  max-height: 50%;
  margin: auto;
  opacity: 0.7;
`;

const ScanStack = () => {
  const navigation = useNavigation();

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
          onGoogleVisionBarcodesDetected={({barcodes}) => {
            if (barcodes.length && barcodes[0].data) {
              //  TODO: Handle me
              console.log(barcodes);
            }
          }}>
        <ScanContainer>
          <BackButton
              onPress={() => {
                haptic('impactLight');
                navigation.goBack();
              }}>
            <Back />
          </BackButton>
          <ScanGuideContainer>
            <ScanGuide>
              <ScanGuideSvg />
            </ScanGuide>
          </ScanGuideContainer>
        </ScanContainer>
      </RNCamera>
  );
};

export default ScanStack;
