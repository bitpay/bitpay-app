import React, {useMemo, useState} from 'react';
import styled from 'styled-components/native';
import {Platform} from 'react-native';
import RNFS from 'react-native-fs';
import {forEach} from 'lodash';
import {SettingsComponent, SettingsContainer} from '../../SettingsRoot';
import {
  Hr,
  ScreenGutter,
  Setting,
  SettingTitle,
} from '../../../../../components/styled/Containers';
import Button from '../../../../../components/button/Button';
import {useTranslation} from 'react-i18next';
import {LogActions} from '../../../../../store/log';
import {Black, Feather, LightBlack, White} from '../../../../../styles/colors';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';

const ScrollContainer = styled.ScrollView``;

const HeaderTitle = styled(Setting)`
  margin-top: 20px;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : Feather)};
  padding: 0 ${ScreenGutter};
  border-bottom-width: 1px;
  border-bottom-color: ${({theme: {dark}}) => (dark ? Black : White)};
`;

const storagePath =
  Platform.OS === 'ios' ? RNFS.MainBundlePath : RNFS.DocumentDirectoryPath;

const StorageUsage: React.FC = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();

  const [walletsCount, setWalletsCount] = useState<number>(0);
  const [giftCount, setGiftCount] = useState<number>(0);
  const [contactCount, setContactCount] = useState<number>(0);
  const [customTokenCount, setCustomTokenCount] = useState<number>(0);

  const [appSize, setAppSize] = useState<string>('');
  const [deviceFreeStorage, setDeviceFreeStorage] = useState<string>('');
  const [deviceTotalStorage, setDeviceTotalStorage] = useState<string>('');
  const [giftCardtStorage, setGiftCardStorage] = useState<string>('');
  const [walletStorage, setWalletStorage] = useState<string>('');
  const [customTokenStorage, setCustomTokenStorage] = useState<string>('');
  const [contactStorage, setContactStorage] = useState<string>('');
  const [ratesStorage, setRatesStorage] = useState<string>('');

  const giftCards = useAppSelector(
    ({APP, SHOP}) => SHOP.giftCards[APP.network],
  );
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const customTokens = useAppSelector(({WALLET}) => WALLET.customTokenData);
  const contacts = useAppSelector(({CONTACT}) => CONTACT.list);
  const rates = useAppSelector(({RATE}) => RATE.rates);

  const formatBytes = (bytes: number, decimals = 2): string => {
    if (!+bytes) {
      return '0 Bytes';
    }

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const getSize = async (filePath: string, data: string): Promise<number> => {
    try {
      await RNFS.writeFile(filePath, data);
      const file = await RNFS.stat(filePath);
      await RNFS.unlink(filePath); // Delete
      return Promise.resolve(file.size);
    } catch (err) {
      return Promise.reject(err);
    }
  };

  useMemo(async () => {
    const _setAppSize = async () => {
      try {
        // App Data Storage
        const resultStorage = await RNFS.readDir(storagePath);
        let _appSize: number = 0;
        forEach(resultStorage, data => {
          _appSize = _appSize + data.size;
        });
        setAppSize(formatBytes(_appSize));
      } catch (err) {
        const errStr = err instanceof Error ? err.message : JSON.stringify(err);
        dispatch(LogActions.error('[setAppSize] Error ', errStr));
      }
    };
    const _setDeviceStorage = async () => {
      try {
        // Device Storage
        const resultDeviceStorage = await RNFS.getFSInfo();
        if (resultDeviceStorage) {
          setDeviceFreeStorage(formatBytes(resultDeviceStorage.freeSpace));
          setDeviceTotalStorage(formatBytes(resultDeviceStorage.totalSpace));
        }
      } catch (err) {
        const errStr = err instanceof Error ? err.message : JSON.stringify(err);
        dispatch(LogActions.error('[setDeviceStorage] Error ', errStr));
      }
    };
    const _setDataCounterStorage = async () => {
      try {
        // Data counter
        const wallets = Object.values(keys).map(k => {
          const {wallets} = k;
          return wallets.length;
        });
        const walletsCount = wallets.reduce((a, b) => a + b, 0);
        setWalletsCount(walletsCount);
        setGiftCount(giftCards.length);
        setContactCount(contacts.length);
        const _customTokenCount = Object.values(customTokens).length;
        setCustomTokenCount(_customTokenCount);
      } catch (err) {
        const errStr = err instanceof Error ? err.message : JSON.stringify(err);
        dispatch(LogActions.error('[setDataCounterStorage] Error ', errStr));
      }
    };
    const _setWalletStorage = async () => {
      try {
        // Specific Data Storage
        const _walletStorageSize = await getSize(
          RNFS.TemporaryDirectoryPath + '/wallets.txt',
          JSON.stringify(keys),
        );
        setWalletStorage(formatBytes(_walletStorageSize));
      } catch (err) {
        const errStr = err instanceof Error ? err.message : JSON.stringify(err);
        dispatch(LogActions.error('[setWalletStorage] Error ', errStr));
      }
    };
    const _setGiftCardStorage = async () => {
      try {
        const _giftCardStorageSize = await getSize(
          RNFS.TemporaryDirectoryPath + '/gift-cards.txt',
          JSON.stringify(giftCards),
        );
        setGiftCardStorage(formatBytes(_giftCardStorageSize));
      } catch (err) {
        const errStr = err instanceof Error ? err.message : JSON.stringify(err);
        dispatch(LogActions.error('[setGiftCardStorage] Error ', errStr));
      }
    };
    const _setCustomTokensStorage = async () => {
      try {
        const _customTokenStorageSize = await getSize(
          RNFS.TemporaryDirectoryPath + '/custom-tokens.txt',
          JSON.stringify(customTokens),
        );
        setCustomTokenStorage(formatBytes(_customTokenStorageSize));
      } catch (err) {
        const errStr = err instanceof Error ? err.message : JSON.stringify(err);
        dispatch(LogActions.error('[setCustomTokensStorage] Error ', errStr));
      }
    };
    const _setContactStorage = async () => {
      try {
        const _contactStorageSize = await getSize(
          RNFS.TemporaryDirectoryPath + '/contacts.txt',
          JSON.stringify(contacts),
        );
        setContactStorage(formatBytes(_contactStorageSize));
      } catch (err) {
        const errStr = err instanceof Error ? err.message : JSON.stringify(err);
        dispatch(LogActions.error('[setContactStorage] Error ', errStr));
      }
    };
    const _setRatesStorage = async () => {
      try {
        const _ratesStorageSize = await getSize(
          RNFS.TemporaryDirectoryPath + '/rates.txt',
          JSON.stringify(rates),
        );
        setRatesStorage(formatBytes(_ratesStorageSize));
      } catch (err) {
        const errStr = err instanceof Error ? err.message : JSON.stringify(err);
        dispatch(LogActions.error('[setRatesStorage] Error ', errStr));
      }
    };
    _setAppSize();
    _setDeviceStorage();
    _setDataCounterStorage();
    _setWalletStorage();
    _setGiftCardStorage();
    _setCustomTokensStorage();
    _setContactStorage();
    _setRatesStorage();
  }, [dispatch]);

  return (
    <SettingsContainer>
      <ScrollContainer>
        <HeaderTitle>
          <SettingTitle>{t('Total Size')}</SettingTitle>
        </HeaderTitle>
        <SettingsComponent>
          <Setting>
            <SettingTitle>BitPay</SettingTitle>

            <Button buttonType="pill">{appSize}</Button>
          </Setting>

          <Hr />

          <Setting>
            <SettingTitle>{t('Free Disk Storage')}</SettingTitle>

            <Button buttonType="pill">{deviceFreeStorage}</Button>
          </Setting>

          <Hr />
          <Setting>
            <SettingTitle>{t('Total Disk Storage')}</SettingTitle>

            <Button buttonType="pill">{deviceTotalStorage}</Button>
          </Setting>
        </SettingsComponent>
        <HeaderTitle>
          <SettingTitle>{t('Details')}</SettingTitle>
        </HeaderTitle>
        <SettingsComponent style={{marginBottom: 10}}>
          <Setting>
            <SettingTitle>
              {t('Wallets')} ({walletsCount || '0'})
            </SettingTitle>

            <Button buttonType="pill">{walletStorage}</Button>
          </Setting>

          <Hr />
          <Setting>
            <SettingTitle>
              {t('Gift Cards')} ({giftCount || '0'})
            </SettingTitle>

            <Button buttonType="pill">{giftCardtStorage}</Button>
          </Setting>

          <Hr />
          <Setting>
            <SettingTitle>
              {t('Custom Tokens')} ({customTokenCount || '0'})
            </SettingTitle>

            <Button buttonType="pill">{customTokenStorage}</Button>
          </Setting>

          <Hr />
          <Setting>
            <SettingTitle>
              {t('Contacts')} ({contactCount || '0'})
            </SettingTitle>

            <Button buttonType="pill">{contactStorage}</Button>
          </Setting>

          <Hr />
          <Setting>
            <SettingTitle>{t('Rates')}</SettingTitle>

            <Button buttonType="pill">{ratesStorage}</Button>
          </Setting>
        </SettingsComponent>
      </ScrollContainer>
    </SettingsContainer>
  );
};

export default StorageUsage;
