import React from 'react';
import {Alert, Platform, Button} from 'react-native';
import Mailer from 'react-native-mail';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useAppDispatch, useAppSelector} from '../utils/hooks';
import {LogLevel} from '../store/log/log.models';
import {RootStackParamList} from '../Root';
import {RootState} from '../store';
import {BaseText} from '../components/styled/Text';
import styled from 'styled-components/native';
import {Caution, SlateDark, White} from '../styles/colors';
import {isAndroidStoragePermissionGranted} from '../utils/helper-methods';
import RNFS from 'react-native-fs';
import Share, {ShareOptions} from 'react-native-share';
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

const DebugContainer = styled.View`
  flex: 1;
`;

const ButtonContainer = styled.View`
  padding: 20px 15px;
`;

const ScrollView = styled.ScrollView`
  margin: 20px 15px;
`;

const TitleError = styled(BaseText)`
  font-size: 18px;
  font-weight: bold;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  padding: 50px 15px 8px 15px;
`;

const DescriptionError = styled(BaseText)`
  font-size: 14px;
  color: ${Caution};
  padding: 0 15px;
`;

const LogError = styled(BaseText)`
  font-size: 14px;
  color: ${({theme: {dark}}) => (dark ? '#E1E4E7' : SlateDark)};
`;

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
      await Share.open(opts);
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
        <Button title="Share Logs" onPress={() => showDisclaimer(logStr, 'share')} />
      </ButtonContainer>
      {!IS_DESKTOP && (
        <ButtonContainer>
          <Button title="Send Logs By Email" onPress={() => showDisclaimer(logStr, 'email')} />
        </ButtonContainer>
      )}
    </DebugContainer>
  );
};

export default DebugScreen;
