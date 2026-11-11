import React, {useCallback, useEffect, useState, useMemo} from 'react';
import {
  useCameraDevice,
  Camera,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';
import {incomingData} from '../../../store/scan/scan.effects';
import {debounce} from '../../../utils/debounce';
import {useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {ScanGroupParamList, ScanScreens} from '../ScanGroup';
import {navigationRef} from '../../../Root';
import {AppActions} from '../../../store/app';
import {CustomErrorMessage} from '../../wallet/components/ErrorMessages';
import {useTranslation} from 'react-i18next';
import {useAppDispatch, useLogger} from '../../../utils/hooks';
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  View,
} from 'react-native';
import {SafeAreaView} from '../../../components/safe-area/SafeAreaView';
import {BaseText, Link} from '../../../components/styled/Text';

const styles = StyleSheet.create({
  scanContainer: {
    flex: 1,
  },
  scanGuide: {
    maxWidth: 400,
    maxHeight: '50%',
    margin: 'auto',
    opacity: 0.7,
  },
});

const ScanContainer: React.FC<React.PropsWithChildren> = ({children}) => (
  <SafeAreaView style={styles.scanContainer}>{children}</SafeAreaView>
);

const ScanGuide: React.FC<React.PropsWithChildren> = ({children}) => (
  <View style={styles.scanGuide}>{children}</View>
);

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
              {t('Grant Camera Permission on')}{' '}
              <Link>{t('App Settings.')}</Link>
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
            {t('Camera not found. Please make sure your device has a camera.')}
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
  const {debug} = useLogger();
  const {hasPermission, requestPermission} = useCameraPermission();
  const [showAppSettingsLabel, setShowAppSettingsLabel] =
    useState<boolean>(false);

  const onCodeScanned = useCallback(
    async (scannedData: any[]) => {
      const value = scannedData[0]?.value;
      if (!value) return;

      navigationRef.goBack();

      if (onScanComplete) {
        onScanComplete(value);
        return;
      }

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
    },
    [dispatch, onScanComplete, t],
  );

  const debouncedOnCodeScanned = useMemo(
    () => debounce(onCodeScanned, 800, {leading: true, trailing: false}),
    [onCodeScanned],
  );

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: debouncedOnCodeScanned,
  });

  const cameraDevice = useCameraDevice('back');

  // The camera module is created lazily (see the vision-camera patch), so on
  // the first Scan open useCameraDevice('back') is briefly null while the
  // device list enumerates. Show a spinner during that initial window rather
  // than the "no camera" error; once enumeration settles, a still-null device
  // is treated as genuinely absent. (If the device appears after the window,
  // the camera renders anyway — cameraDevice is then non-null.)
  const [enumerationSettled, setEnumerationSettled] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setEnumerationSettled(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    debug(`Camera permission status: ${hasPermission}`);
  }, [hasPermission, debug]);

  useEffect(() => {
    debug(`Camera device exist: ${!!cameraDevice}`);
  }, [cameraDevice, debug]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!hasPermission) {
        const request = await requestPermission();
        debug(`Camera request permission status: ${request}`);
        if (!request && !cancelled) setShowAppSettingsLabel(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasPermission, requestPermission, debug]);

  if (cameraDevice == null) {
    if (!enumerationSettled) {
      return <ActivityIndicator size="large" color="#1C6758" />;
    }
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
