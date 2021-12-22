import React from 'react';
import {View} from 'react-native';
import {RNCamera} from 'react-native-camera';
import styled from 'styled-components/native';

const CameraContainer = styled.View`
  width: 100%;
  padding: 0 20px;
`;

const Camera = () => {
  return (
    <CameraContainer>
      <View style={{flex: 1, justifyContent: 'flex-end', alignItems: 'center'}}>
        <RNCamera
          style={{
            flex: 0,
            backgroundColor: '#fff',
            borderRadius: 5,
            padding: 15,
            paddingHorizontal: 20,
            alignSelf: 'center',
            margin: 20,
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
            if (barcodes[0] && barcodes[0].data) {
              console.log(barcodes);
            }
          }}
        />
      </View>
    </CameraContainer>
  );
};

export default Camera;
