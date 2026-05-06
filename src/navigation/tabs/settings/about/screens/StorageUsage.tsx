import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Platform} from 'react-native';
import RNFS from 'react-native-fs';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import {useIsFocused, useNavigation} from '@react-navigation/native';
import styled, {useTheme} from 'styled-components/native';
import {forEach} from 'lodash';
import {SettingsComponent, SettingsContainer} from '../../SettingsRoot';
import {
  Hr,
  ScreenGutter,
  Setting,
  SettingTitle,
} from '../../../../../components/styled/Containers';
import Button from '../../../../../components/button/Button';
import {
  Action,
  Black,
  Feather,
  LightBlack,
  LightBlue,
  Midnight,
  White,
} from '../../../../../styles/colors';
import {useAppSelector} from '../../../../../utils/hooks';
import {storage} from '../../../../../store';
import {logManager} from '../../../../../managers/LogManager';
import {getPortfolioRuntimeClient} from '../../../../../portfolio/runtime/portfolioRuntime';
import {AboutScreens} from '../AboutGroup';

const ScrollContainer = styled.ScrollView``;

const ValueSkeleton = ({width = 90}: {width?: number}) => {
  const theme = useTheme();
  const backgroundColor = theme.dark ? Midnight : LightBlue;
  const highlightColor = theme.dark ? Action : '#E5E9FF';
  return (
    <SkeletonPlaceholder
      backgroundColor={backgroundColor}
      highlightColor={highlightColor}>
      <SkeletonPlaceholder.Item width={width} height={36} borderRadius={999} />
    </SkeletonPlaceholder>
  );
};

const HeaderTitle = styled(Setting)`
  margin-top: 20px;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : Feather)};
  padding: 0 ${ScreenGutter};
  border-bottom-width: 1px;
  border-bottom-color: ${({theme: {dark}}) => (dark ? Black : White)};
`;

const storagePath =
  Platform.OS === 'ios' ? RNFS.MainBundlePath : RNFS.DocumentDirectoryPath;
const EMPTY_LIST: Array<unknown> = [];

type StorageUsageMetrics = {
  walletsCount: number;
  giftCount: number;
  contactCount: number;
  customTokenCount: number;
  appSize: string;
  deviceFreeStorage: string;
  deviceTotalStorage: string;
  giftCardStorage: string;
  walletStorage: string;
  customTokenStorage: string;
  contactStorage: string;
  ratesStorage: string;
  portfolioPersistedStorage: string;
  portfolioSnapshotsCount: number;
  backupStorage: string;
  shopCatalogStorage: string;
};

const EMPTY_STORAGE_USAGE_METRICS: StorageUsageMetrics = {
  walletsCount: 0,
  giftCount: 0,
  contactCount: 0,
  customTokenCount: 0,
  appSize: '',
  deviceFreeStorage: '',
  deviceTotalStorage: '',
  giftCardStorage: '',
  walletStorage: '',
  customTokenStorage: '',
  contactStorage: '',
  ratesStorage: '',
  portfolioPersistedStorage: '',
  portfolioSnapshotsCount: 0,
  backupStorage: '',
  shopCatalogStorage: '',
};

const StorageUsage: React.FC = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const {t} = useTranslation();
  const renderValue = useCallback((value: string, width?: number) => {
    if (value) {
      return <Button buttonType="pill">{value}</Button>;
    }
    return <ValueSkeleton width={width} />;
  }, []);
  const tripleTapRef = useRef<{
    count: number;
    lastTapMs: number;
    timer?: ReturnType<typeof setTimeout>;
  }>({count: 0, lastTapMs: 0});

  const runAfterTripleTap = useCallback((action: () => void) => {
    const now = Date.now();
    const windowMs = 600;
    const state = tripleTapRef.current;

    if (now - state.lastTapMs > windowMs) {
      state.count = 1;
    } else {
      state.count += 1;
    }

    state.lastTapMs = now;

    if (state.timer) {
      clearTimeout(state.timer);
    }

    if (state.count >= 3) {
      state.count = 0;
      state.lastTapMs = 0;
      state.timer = undefined;
      action();
      return;
    }

    state.timer = setTimeout(() => {
      state.count = 0;
      state.lastTapMs = 0;
      state.timer = undefined;
    }, windowMs);
  }, []);

  const handlePortfolioPress = useCallback(() => {
    runAfterTripleTap(() =>
      navigation.navigate(AboutScreens.PORTFOLIO_DEBUG as never),
    );
  }, [navigation, runAfterTripleTap]);
  const [metrics, setMetrics] = useState<StorageUsageMetrics>(
    EMPTY_STORAGE_USAGE_METRICS,
  );
  const loadRequestIdRef = useRef(0);

  const giftCardsRaw = useAppSelector(
    ({APP, SHOP}) => SHOP.giftCards[APP.network],
  );
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const customTokens = useAppSelector(({WALLET}) => WALLET.customTokenData);
  const contactsRaw = useAppSelector(({CONTACT}) => CONTACT.list);
  const rates = useAppSelector(({RATE}) => RATE.rates);
  const giftCards = giftCardsRaw ?? EMPTY_LIST;
  const contacts = contactsRaw ?? EMPTY_LIST;

  const portfolioRefreshToken = useAppSelector(
    ({PORTFOLIO}) =>
      `${PORTFOLIO.lastPopulatedAt || 0}:${
        PORTFOLIO.populateStatus?.inProgress ? 1 : 0
      }:${PORTFOLIO.populateStatus?.errors?.length || 0}`,
  );

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

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    let cancelled = false;
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;

    const load = async () => {
      const nextMetrics: StorageUsageMetrics = {
        ...EMPTY_STORAGE_USAGE_METRICS,
      };

      try {
        const resultStorage = await RNFS.readDir(storagePath);
        let totalBytes = 0;
        forEach(resultStorage, data => {
          totalBytes += data.size;
        });
        nextMetrics.appSize = formatBytes(totalBytes);
      } catch (err) {
        nextMetrics.appSize = '0 Bytes';
        logManager.error(
          '[setAppSize] Error ',
          err instanceof Error ? err.message : JSON.stringify(err),
        );
      }

      try {
        const resultDeviceStorage = await RNFS.getFSInfo();
        if (resultDeviceStorage) {
          nextMetrics.deviceFreeStorage = formatBytes(
            resultDeviceStorage.freeSpace,
          );
          nextMetrics.deviceTotalStorage = formatBytes(
            resultDeviceStorage.totalSpace,
          );
        } else {
          nextMetrics.deviceFreeStorage = '0 Bytes';
          nextMetrics.deviceTotalStorage = '0 Bytes';
        }
      } catch (err) {
        nextMetrics.deviceFreeStorage = '0 Bytes';
        nextMetrics.deviceTotalStorage = '0 Bytes';
        logManager.error(
          '[setDeviceStorage] Error ',
          err instanceof Error ? err.message : JSON.stringify(err),
        );
      }

      try {
        const walletCounts = Object.values(keys || {}).map(keyItem => {
          const {wallets} = keyItem as {wallets: Array<unknown>};
          return wallets.length;
        });
        nextMetrics.walletsCount = walletCounts.reduce((a, b) => a + b, 0);
        nextMetrics.giftCount = giftCards.length;
        nextMetrics.contactCount = contacts.length;
        nextMetrics.customTokenCount = Object.values(customTokens || {}).length;
      } catch (err) {
        logManager.error(
          '[setDataCounterStorage] Error ',
          err instanceof Error ? err.message : JSON.stringify(err),
        );
      }

      try {
        const size = await getSize(
          RNFS.TemporaryDirectoryPath + '/wallets.txt',
          JSON.stringify(keys),
        );
        nextMetrics.walletStorage = formatBytes(size);
      } catch (err) {
        nextMetrics.walletStorage = '0 Bytes';
        logManager.error(
          '[setWalletStorage] Error ',
          err instanceof Error ? err.message : JSON.stringify(err),
        );
      }

      try {
        const size = await getSize(
          RNFS.TemporaryDirectoryPath + '/gift-cards.txt',
          JSON.stringify(giftCards),
        );
        nextMetrics.giftCardStorage = formatBytes(size);
      } catch (err) {
        nextMetrics.giftCardStorage = '0 Bytes';
        logManager.error(
          '[setGiftCardStorage] Error ',
          err instanceof Error ? err.message : JSON.stringify(err),
        );
      }

      try {
        const size = await getSize(
          RNFS.TemporaryDirectoryPath + '/custom-tokens.txt',
          JSON.stringify(customTokens),
        );
        nextMetrics.customTokenStorage = formatBytes(size);
      } catch (err) {
        nextMetrics.customTokenStorage = '0 Bytes';
        logManager.error(
          '[setCustomTokensStorage] Error ',
          err instanceof Error ? err.message : JSON.stringify(err),
        );
      }

      try {
        const size = await getSize(
          RNFS.TemporaryDirectoryPath + '/contacts.txt',
          JSON.stringify(contacts),
        );
        nextMetrics.contactStorage = formatBytes(size);
      } catch (err) {
        nextMetrics.contactStorage = '0 Bytes';
        logManager.error(
          '[setContactStorage] Error ',
          err instanceof Error ? err.message : JSON.stringify(err),
        );
      }

      try {
        const client = getPortfolioRuntimeClient();
        const walletIds = Object.values(keys || {}).flatMap((key: any) => {
          const wallets = Array.isArray(key?.wallets) ? key.wallets : [];
          return wallets
            .map((wallet: any) => wallet?.id)
            .filter(
              (walletId: any): walletId is string =>
                typeof walletId === 'string' && !!walletId,
            );
        });
        const uniqueWalletIds = Array.from(new Set(walletIds));
        const [stats, indexes] = await Promise.all([
          client.kvStats(),
          Promise.all(
            uniqueWalletIds.map(async walletId => {
              try {
                return await client.getSnapshotIndex({walletId});
              } catch {
                return null;
              }
            }),
          ),
        ]);
        const spotRatesBytes = JSON.stringify(rates || {}).length;

        nextMetrics.portfolioSnapshotsCount = indexes.reduce((total, index) => {
          if (!index?.chunks?.length) {
            return total;
          }
          return (
            total +
            index.chunks.reduce((chunkTotal, chunk) => {
              const rowsInChunk = Number(chunk?.rows);
              return (
                chunkTotal + (Number.isFinite(rowsInChunk) ? rowsInChunk : 0)
              );
            }, 0)
          );
        }, 0);
        nextMetrics.ratesStorage = formatBytes(
          spotRatesBytes + (stats.rateBytes || 0),
        );
        nextMetrics.portfolioPersistedStorage = formatBytes(
          stats.totalBytes || 0,
        );
      } catch (err) {
        nextMetrics.ratesStorage = '0 Bytes';
        nextMetrics.portfolioSnapshotsCount = 0;
        nextMetrics.portfolioPersistedStorage = '0 Bytes';
        logManager.error(
          '[setPortfolioStorage] Error ',
          err instanceof Error ? err.message : JSON.stringify(err),
        );
      }

      try {
        const baseDir = RNFS.CachesDirectoryPath + '/bitpay/redux';
        const finalFile = baseDir + '/persist-root.json';
        const bakFile = finalFile + '.bak';
        let bytes = 0;
        const finalExists = await RNFS.exists(finalFile);
        if (finalExists) {
          const stat = await RNFS.stat(finalFile);
          bytes = Number(stat.size) || 0;
        } else {
          const bakExists = await RNFS.exists(bakFile);
          if (bakExists) {
            const stat = await RNFS.stat(bakFile);
            bytes = Number(stat.size) || 0;
          }
        }
        nextMetrics.backupStorage = formatBytes(bytes);
      } catch (err) {
        nextMetrics.backupStorage = '0 Bytes';
        logManager.error(
          '[setBackupStorage] Error ',
          err instanceof Error ? err.message : JSON.stringify(err),
        );
      }

      try {
        const root = storage.getString('persist:root');
        if (root) {
          try {
            const parsed = JSON.parse(root);
            const data = parsed?.SHOP_CATALOG;
            const bytes = data ? JSON.stringify(data).length : 0;
            nextMetrics.shopCatalogStorage = formatBytes(bytes);
          } catch {
            nextMetrics.shopCatalogStorage = '0 Bytes';
          }
        } else {
          nextMetrics.shopCatalogStorage = '0 Bytes';
        }
      } catch (err) {
        nextMetrics.shopCatalogStorage = '0 Bytes';
        logManager.error(
          '[setShopCatalogStorage] Error ',
          err instanceof Error ? err.message : JSON.stringify(err),
        );
      }

      if (cancelled || loadRequestIdRef.current !== requestId) {
        return;
      }

      setMetrics(nextMetrics);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [
    isFocused,
    contacts,
    customTokens,
    giftCards,
    keys,
    portfolioRefreshToken,
    rates,
  ]);

  useEffect(() => {
    const tapState = tripleTapRef.current;
    return () => {
      const timer = tapState.timer;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, []);

  return (
    <SettingsContainer>
      <ScrollContainer>
        <HeaderTitle>
          <SettingTitle>{t('Total Size')}</SettingTitle>
        </HeaderTitle>
        <SettingsComponent>
          <Setting>
            <SettingTitle>BitPay</SettingTitle>

            {renderValue(metrics.appSize, 110)}
          </Setting>

          <Hr />

          <Setting>
            <SettingTitle>{t('Free Disk Storage')}</SettingTitle>

            {renderValue(metrics.deviceFreeStorage, 110)}
          </Setting>

          <Hr />
          <Setting>
            <SettingTitle>{t('Total Disk Storage')}</SettingTitle>

            {renderValue(metrics.deviceTotalStorage, 110)}
          </Setting>
        </SettingsComponent>
        <HeaderTitle>
          <SettingTitle>{t('Details')}</SettingTitle>
        </HeaderTitle>
        <SettingsComponent style={{marginBottom: 10}}>
          <Setting>
            <SettingTitle>
              {t('Wallets')} ({metrics.walletsCount || '0'})
            </SettingTitle>

            {renderValue(metrics.walletStorage)}
          </Setting>

          <Hr />
          <Setting>
            <SettingTitle>
              {t('Gift Cards')} ({metrics.giftCount || '0'})
            </SettingTitle>

            {renderValue(metrics.giftCardStorage)}
          </Setting>

          <Hr />
          <Setting>
            <SettingTitle>
              {t('Custom Tokens')} ({metrics.customTokenCount || '0'})
            </SettingTitle>

            {renderValue(metrics.customTokenStorage)}
          </Setting>

          <Hr />
          <Setting>
            <SettingTitle>
              {t('Contacts')} ({metrics.contactCount || '0'})
            </SettingTitle>

            {renderValue(metrics.contactStorage)}
          </Setting>

          <Hr />
          <Setting>
            <SettingTitle>{t('Rates')}</SettingTitle>

            {renderValue(metrics.ratesStorage)}
          </Setting>

          <Hr />
          <Setting onPress={handlePortfolioPress}>
            <SettingTitle>
              {t('Portfolio')} ({metrics.portfolioSnapshotsCount || '0'})
            </SettingTitle>

            {renderValue(metrics.portfolioPersistedStorage)}
          </Setting>

          <Hr />
          <Setting>
            <SettingTitle>{t('Shop Catalog')}</SettingTitle>

            {renderValue(metrics.shopCatalogStorage)}
          </Setting>

          <Hr />
          <Setting>
            <SettingTitle>{t('Filesystem Backup')}</SettingTitle>

            {renderValue(metrics.backupStorage)}
          </Setting>
        </SettingsComponent>
      </ScrollContainer>
    </SettingsContainer>
  );
};

export default StorageUsage;
