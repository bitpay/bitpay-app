import React from 'react';
import {
  Alert,
  Platform,
  Button,
  View,
  ScrollView as RNScrollView,
  Text,
  TextProps,
  ScrollViewProps,
  StyleSheet,
} from 'react-native';
import Mailer from 'react-native-mail';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useAppDispatch, useAppSelector} from '../utils/hooks';
import {LogLevel} from '../store/log/log.models';
import {RootStackParamList} from '../Root';
import {RootState} from '../store';
import {BaseText} from '../components/styled/Text';
import {useTheme} from '../contexts';
import {Caution, Slate30, SlateDark, White} from '../styles/colors';
import {isAndroidStoragePermissionGranted} from '../utils/helper-methods';
import RNFS from 'react-native-fs';
import {ShareOptions} from 'react-native-share';
import {shareFile as shareFileUtil} from '../utils/share';
import DeviceInfo from 'react-native-device-info';
const IS_DESKTOP = DeviceInfo.getDeviceType();

export enum DebugScreens {
  DEBUG = 'Debug',
}

export type DebugScreenParamList = {
  Debug: {
    name?: string | undefined | null;
  };
};

const styles = StyleSheet.create({
  debugContainer: {
    flex: 1,
  },
  buttonContainer: {
    paddingVertical: 20,
    paddingHorizontal: 15,
  },
  scrollView: {
    marginVertical: 20,
    marginHorizontal: 15,
  },
  titleError: {
    fontSize: 18,
    fontWeight: 'bold',
    paddingTop: 50,
    paddingRight: 15,
    paddingBottom: 8,
    paddingLeft: 15,
  },
  descriptionError: {
    fontSize: 14,
    color: Caution,
    paddingHorizontal: 15,
  },
  logError: {
    fontSize: 14,
  },
});

const DebugContainer = ({children}: {children?: React.ReactNode}) => (
  <View style={styles.debugContainer}>{children}</View>
);

const ButtonContainer = ({children}: {children?: React.ReactNode}) => (
  <View style={styles.buttonContainer}>{children}</View>
);

const ScrollView = ({children, style, ...rest}: ScrollViewProps) => (
  <RNScrollView style={[styles.scrollView, style]} {...rest}>
    {children}
  </RNScrollView>
);

const TitleError = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <BaseText
        ref={ref}
        style={[
          styles.titleError,
          {color: theme.dark ? White : SlateDark},
          style,
        ]}
        {...rest}
      />
    );
  },
);

const DescriptionError = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => (
    <BaseText ref={ref} style={[styles.descriptionError, style]} {...rest} />
  ),
);

const LogError = React.forwardRef<Text, TextProps>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <BaseText
      ref={ref}
      style={[
        styles.logError,
        {color: theme.dark ? Slate30 : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
});

const DebugScreen: React.FC<
  NativeStackScreenProps<RootStackParamList, 'Debug'>
> = ({route}) => {
  const dispatch = useAppDispatch();
  const logs = useAppSelector(({LOG}: RootState) => LOG.logs);
  const {name} = route.params || {name: ''};

  let logStr: string =
    'Session Logs.\nBe careful, this could contain sensitive private data\n\n';
  logStr += '\n\n';

  const filteredLogs = logs
    .filter(log => log.level <= LogLevel.Debug)
    .map(log => {
      const formattedLevel = LogLevel[log.level].toLowerCase();

      const output = `[${formattedLevel}] ${log.message}\n`;
      logStr += output;
      return output;
    });

  const shareFile = async (data: string) => {
    try {
      if (Platform.OS === 'android' && Platform.Version < 30) {
        await isAndroidStoragePermissionGranted(dispatch);
      }

      const rootPath =
        Platform.OS === 'ios'
          ? RNFS.LibraryDirectoryPath
          : RNFS.TemporaryDirectoryPath;
      const txtFilename = 'App-logs';
      let filePath = `${rootPath}/${txtFilename}`;

      await RNFS.mkdir(filePath);

      filePath += '.txt';
      const opts: ShareOptions = {
        title: txtFilename,
        url: `file://${filePath}`,
        subject: 'App Logs',
      };

      await RNFS.writeFile(filePath, data, 'utf8');
      await dispatch(shareFileUtil(opts));
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message,
        [
          {
            text: 'Ok',
            onPress: () => console.log('OK: Email Error Response'),
          },
          {
            text: 'Cancel',
            onPress: () => console.log('CANCEL: Email Error Response'),
          },
        ],
        {cancelable: true},
      );
    }
  };

  const handleEmail = (data: string) => {
    Mailer.mail(
      {
        subject: 'BitPay Log',
        body: data,
        isHTML: false,
      },
      (error, event) => {
        Alert.alert(
          error,
          event,
          [
            {
              text: 'Ok',
              onPress: () => console.log('OK: Email Error Response'),
            },
            {
              text: 'Cancel',
              onPress: () => console.log('CANCEL: Email Error Response'),
            },
          ],
          {cancelable: true},
        );
      },
    );
  };

  const showDisclaimer = (data: string, option: 'email' | 'share') => {
    Alert.alert(
      'Warning',
      'Be careful, this could contain sensitive private data.',
      [
        {
          text: 'Continue',
          onPress: () => {
            switch (option) {
              case 'share':
                shareFile(data);
                break;
              case 'email':
                handleEmail(data);
                break;
            }
          },
        },
        {text: 'Cancel'},
      ],
      {cancelable: true},
    );
  };

  return (
    <DebugContainer>
      <TitleError>Oops, something went wrong.</TitleError>
      <DescriptionError>{name}</DescriptionError>
      <ScrollView>
        <LogError>{filteredLogs}</LogError>
      </ScrollView>
      <ButtonContainer>
        <Button
          title="Share Logs"
          onPress={() => showDisclaimer(logStr, 'share')}
        />
      </ButtonContainer>
      {!IS_DESKTOP && (
        <ButtonContainer>
          <Button
            title="Send Logs By Email"
            onPress={() => showDisclaimer(logStr, 'email')}
          />
        </ButtonContainer>
      )}
    </DebugContainer>
  );
};

export default DebugScreen;
