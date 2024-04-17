import React, {useCallback, useEffect, useState} from 'react';
import {
  useCameraDevice,
  Camera,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';
import styled from 'styled-components/native';
import {incomingData} from '../../../store/scan/scan.effects';
import debounce from 'lodash.debounce';
import {useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {ScanGroupParamList, ScanScreens} from '../ScanGroup';
import {navigationRef} from '../../../Root';
import {AppActions} from '../../../store/app';
import {CustomErrorMessage} from '../../wallet/components/ErrorMessages';
import {useTranslation} from 'react-i18next';
import {useAppDispatch, useLogger} from '../../../utils/hooks';
import {ActivityIndicator, Alert, Linking, StyleSheet} from 'react-native';
import {BaseText, Link} from '../../../components/styled/Text';

const ScanContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScanGuide = styled.View`
  max-width: 400px;
  max-height: 50%;
  margin: auto;
  opacity: 0.7;
`;

interface Props {
  onScanComplete?: (data: string) => void;
}

const NoPermissionCameraDeviceError = ({
  showAppSettingsLabel,
}: {
  showAppSettingsLabel: boolean;
}) => {
  const {t} = useTranslation();

  const openSettings = useCallback(() => {
    Alert.alert(
      t('Camera permission disabled'),
      t(
        'Grant camera permission to use the camera for scanning QR codes. Go to Settings and tap Allow Camera.',
      ),
      [
        {
          text: t('Cancel'),
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: t('Change Settings'),
          onPress: async () => {
            Linking.openSettings();
          },
        },
      ],
    );
  }, [t]);

  return (
    <>
      {showAppSettingsLabel ? (
        <ScanContainer>
          <ScanGuide>
            <BaseText onPress={() => openSettings()}>
              Grant Camera Permission on <Link>App Settings.</Link>
            </BaseText>
          </ScanGuide>
        </ScanContainer>
      ) : null}
    </>
  );
};

const NoCameraDeviceError = () => {
  const {t} = useTranslation();

  const openSettings = useCallback(() => {
    Alert.alert(
      t('Camera permission disabled'),
      t(
        'Grant camera permission to use the camera for scanning QR codes. Go to Settings and tap Allow Camera.',
      ),
      [
        {
          text: t('Cancel'),
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: t('Change Settings'),
          onPress: async () => {
            Linking.openSettings();
          },
        },
      ],
    );
  }, [t]);

  return (
    <>
      <ScanContainer>
        <ScanGuide>
          <BaseText onPress={() => openSettings()}>
            Camera not found. Please make sure your device has a camera.
          </BaseText>
        </ScanGuide>
      </ScanContainer>
    </>
  );
};

const ScanRoot = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const route = useRoute<RouteProp<ScanGroupParamList, ScanScreens.Root>>();
  const {onScanComplete} = route.params || {};
  const logger = useLogger();
  const {hasPermission, requestPermission} = useCameraPermission();
  const [showAppSettingsLabel, setShowAppSettingsLabel] =
    useState<boolean>(false);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: debounce(
      async scannedData => {
        const value = scannedData[0]?.value;
        if (!value) {
          return;
        }
        navigationRef.goBack();
        // if specific handler is passed use that else use generic self deriving handler
        if (onScanComplete) {
          onScanComplete(value);
        } else {
          try {
            await dispatch(incomingData(value));
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
      800,
      {
        leading: true,
        trailing: false,
      },
    ),
  });

  useEffect(() => {
    (async () => {
      // First time opening the app, hasPermission is false. Call requestPermission() now.
      if (!hasPermission) {
        const request = await requestPermission();
        logger.debug(`Camera request permission status: ${request}`);
        // User explicitly denied permission, hasPermission is false and requestPermission() will return false.
        if (!request) {
          setShowAppSettingsLabel(true);
        }
      }
    })();
  }, []);

  logger.debug(`Camera permission status: ${hasPermission}`);
  const cameraDevice = useCameraDevice('back');
  logger.debug(`Camera device exist: ${!!cameraDevice}`);

  if (cameraDevice == null) {
    return <NoCameraDeviceError />;
  }
  if (cameraDevice && !hasPermission) {
    return (
      <NoPermissionCameraDeviceError
        showAppSettingsLabel={showAppSettingsLabel}
      />
    );
  }
  // User already granted permission, hasPermission is true. Continue with using the <Camera> view.
  if (cameraDevice && hasPermission) {
    return (
      <Camera
        style={StyleSheet.absoluteFill}
        device={cameraDevice}
        isActive={true}
        codeScanner={codeScanner}
      />
    );
  }
  return <ActivityIndicator size="large" color="#1C6758" />;
};

export default ScanRoot;
