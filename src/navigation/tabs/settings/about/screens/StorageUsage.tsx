import React, {useState} from 'react';
import {Platform} from 'react-native';
import RNFS from 'react-native-fs';
import {forEach} from 'lodash';
import {SettingsComponent, SettingsContainer} from '../../SettingsRoot';
import {
  Hr,
  Setting,
  SettingTitle,
} from '../../../../../components/styled/Containers';
import Button from '../../../../../components/button/Button';
import {useTranslation} from 'react-i18next';
import {LogActions} from '../../../../../store/log';

const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const storagePath =
  Platform.OS === 'ios' ? RNFS.MainBundlePath : RNFS.DocumentDirectoryPath;

const StorageUsage: React.VFC = () => {
  const {t} = useTranslation();
  const [appSize, setAppSize] = useState<number>(0);
  const [dataSize, setDataSize] = useState<number>(0);

  RNFS.readDir(storagePath)
    .then(result => {
      let _dataSize: number = 0;
      forEach(result, data => {
        if (data.name === 'BitPayApp') {
          setAppSize(data.size);
        } else {
          _dataSize = _dataSize + data.size;
        }
      });
      setDataSize(_dataSize);
    })
    .catch(err => {
      const errStr = err instanceof Error ? err.message : JSON.stringify(err);
      LogActions.error('[StorageUsage] Error ', errStr);
    });

  return (
    <SettingsContainer>
      <SettingsComponent style={{marginBottom: 10}}>
        <Setting>
          <SettingTitle>{t('BitPay Size')}</SettingTitle>

          <Button buttonType="pill">{formatBytes(appSize)}</Button>
        </Setting>

        <Hr />
        <Setting>
          <SettingTitle>{t('Data Size')}</SettingTitle>

          <Button buttonType="pill">{formatBytes(dataSize)}</Button>
        </Setting>

        <Hr />
      </SettingsComponent>
    </SettingsContainer>
  );
};

export default StorageUsage;
