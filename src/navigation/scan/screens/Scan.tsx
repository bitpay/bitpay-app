import React from 'react';
import {RNCamera} from 'react-native-camera';
import styled from 'styled-components/native';
import ScanGuideSvg from '../../../../assets/img/qr-scan-guides.svg';

const ScanContainer = styled.SafeAreaView`
  flex: 1;
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

const Scan = () => {
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
        <ScanGuideContainer>
          <ScanGuide>
            <ScanGuideSvg />
          </ScanGuide>
        </ScanGuideContainer>
      </ScanContainer>
    </RNCamera>
  );
};

export default Scan;
