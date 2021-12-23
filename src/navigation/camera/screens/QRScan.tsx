import React from 'react';
import {RNCamera} from 'react-native-camera';
import styled from 'styled-components/native';
import Back from '../../../components/back/Back';
import {useNavigation} from '@react-navigation/native';
import haptic from '../../../components/haptic-feedback/haptic';
import {ScreenGutter} from "../../../components/styled/Containers";

const ScanContainer = styled.SafeAreaView`
  flex: 1;
  padding: ${ScreenGutter};
`;

const BackButton = styled.TouchableOpacity`
  width: 41px;
`;

const QRScan = () => {
  const navigation = useNavigation();
  const goBack = () => {
    haptic('impactLight');
    navigation.goBack();
  };
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
        if (barcodes[0] && barcodes[0].data) {
          console.log(barcodes);
        }
      }}>
      <ScanContainer>
        <BackButton onPress={goBack}>
          <Back />
        </BackButton>
      </ScanContainer>
    </RNCamera>
  );
};

export default QRScan;
