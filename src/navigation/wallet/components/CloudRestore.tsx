import {useCallback, useEffect, useRef, useState} from 'react';
import {NativeModules, Platform} from 'react-native';
import {StackActions, useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useOngoingProcess} from '../../../contexts';
import {useAppDispatch, useAppSelector, useLogger} from '../../../utils/hooks';
import {fixWalletAddresses, sleep} from '../../../utils/helper-methods';
import {PIN_CONFIG, getPinLockoutSeconds} from '../../../utils/pin';
import {Effect} from '../../../store';
import {AppActions} from '../../../store/app';
import {
  setHomeCarouselConfig,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {startGetRates} from '../../../store/wallet/effects';
import {
  isKeyPassphrase,
  isMissingWalletsError,
  startRestoreRecoveryPhrase,
} from '../../../store/wallet/effects/cloud-backup/cloud-backup';
import {startUpdateAllWalletStatusForKey} from '../../../store/wallet/effects/status/status';
import {
  setCloudBackupComplete,
  updateKeyName,
  updatePortfolioBalance,
} from '../../../store/wallet/wallet.actions';
import {Key} from '../../../store/wallet/wallet.models';
import {getMatchedKey} from '../../../store/wallet/utils/wallet';
import {populateImportedKeyPortfolio} from '../../../store/portfolio';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {
  CloudBackupPayload,
  InvalidCloudBackupError,
  WrongCloudBackupPasswordError,
  decryptCloudBackup,
  readCloudBackupHeader,
} from '../../../utils/cloud-backup/codec';
import {
  CloudBackupError,
  CloudBackupFileEntry,
  CloudBackupKind,
} from '../../../utils/cloud-backup/storage';
import {
  decryptCloudKeyshare,
  decryptNewestCloudBackup,
} from '../../../utils/cloud-backup/password';
import {startImportTSSFile} from '../../../store/wallet/effects/import/import';
import {isTSSKey} from '../../../store/wallet/effects/tss-send/tss-send';
import {backupRedirect} from '../screens/Backup';

export type CloudBackupSource =
  | {
      source: 'cloud';
      files: CloudBackupFileEntry[];
      kind?: CloudBackupKind;
    }
  | {source: 'file'; text: string};

const formatLockout = (seconds: number) =>
  `${`0${Math.floor(seconds / 60)}`.slice(-2)}:${`0${seconds % 60}`.slice(-2)}`;

const getTimeSinceBoot = async () => {
  const timeSinceBoot = Number(await NativeModules.Timer.getRelativeTime());
  if (!Number.isFinite(timeSinceBoot) || timeSinceBoot < 0) {
    throw new RangeError('Invalid time since boot');
  }
  return timeSinceBoot;
};

const registerWrongBackupPassword =
  (): Effect<void> => (dispatch, getState) => {
    const nextAttempts = getState().APP.backupPasswordFailedAttempts + 1;
    dispatch(AppActions.backupPasswordFailedAttempts(nextAttempts));
    if (nextAttempts % PIN_CONFIG.ATTEMPT_LIMIT === 0) {
      dispatch(AppActions.backupPasswordBannedUntil(Number.MAX_SAFE_INTEGER));
    }
  };

export const useBackupPasswordLockout = () => {
  const {t} = useTranslation();
  const logger = useLogger();
  const dispatch = useAppDispatch();
  const bannedUntil = useAppSelector(({APP}) => APP.backupPasswordBannedUntil);
  const failedAttempts = useAppSelector(
    ({APP}) => APP.backupPasswordFailedAttempts,
  );
  const [lockedSeconds, setLockedSeconds] = useState(0);

  useEffect(() => {
    if (!bannedUntil) {
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    const tick = async () => {
      try {
        const timeSinceBoot = await getTimeSinceBoot();
        if (cancelled) {
          return;
        }
        const secondsLeft = bannedUntil - timeSinceBoot;
        if (secondsLeft <= 0) {
          setLockedSeconds(0);
          dispatch(AppActions.backupPasswordBannedUntil(undefined));
          return;
        }
        const lockoutSeconds =
          failedAttempts > 0
            ? getPinLockoutSeconds(failedAttempts)
            : PIN_CONFIG.ATTEMPT_LOCK_OUT_TIME;
        if (secondsLeft > lockoutSeconds) {
          dispatch(
            AppActions.backupPasswordBannedUntil(
              timeSinceBoot + lockoutSeconds,
            ),
          );
          return;
        }
        setLockedSeconds(secondsLeft);
        timer = setTimeout(tick, 1000);
      } catch (err) {
        logger.error(
          `[CloudRestore] lockout check failed: ${
            err instanceof Error ? err.name : 'unknown'
          }`,
        );
        if (!cancelled) {
          timer = setTimeout(tick, 1000);
        }
      }
    };
    tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [bannedUntil, dispatch, failedAttempts, logger]);

  const registerWrongPassword = useCallback(() => {
    dispatch(registerWrongBackupPassword());
  }, [dispatch]);

  const resetWrongPasswords = useCallback(() => {
    dispatch(AppActions.backupPasswordFailedAttempts(0));
  }, [dispatch]);

  return {
    locked: !!bannedUntil,
    lockMessage:
      bannedUntil && lockedSeconds
        ? t('Try again in ', {time: formatLockout(lockedSeconds)})
        : undefined,
    registerWrongPassword,
    resetWrongPasswords,
  };
};

export const useCloudBackupRestore = ({
  context,
  onUsePhrase,
}: {
  context?: string;
  onUsePhrase: () => void;
}) => {
  const {t} = useTranslation();
  const logger = useLogger();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const {showOngoingProcess, hideOngoingProcess} = useOngoingProcess();
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const walletTermsAccepted = useAppSelector(
    ({WALLET}) => WALLET.walletTermsAccepted,
  );
  const cloudName = Platform.OS === 'ios' ? 'iCloud' : 'Google Drive';

  const showSheet = (
    type: 'info' | 'warning' | 'error',
    title: string,
    message: string,
    actions: {text: string; action: () => void; primary?: boolean}[],
  ) =>
    dispatch(
      showBottomNotificationModal({
        type,
        title,
        message,
        enableBackdropDismiss: true,
        actions,
      }),
    );

  const showDamaged = (source: CloudBackupSource['source']) =>
    showSheet(
      'error',
      t('This file is damaged'),
      t(
        'We can’t read it. Try another copy, or use your 12-word recovery phrase.',
      ),
      [
        {text: t('Use 12-Word Phrase'), action: onUsePhrase, primary: true},
        source === 'file'
          ? {text: t('Try Another File'), action: () => {}}
          : {
              text: t('Choose a File'),
              action: () =>
                navigation.dispatch(
                  StackActions.replace('Import', {context, importTab: 'file'}),
                ),
            },
      ],
    );

  const scanFunds = async (key: Key) => {
    try {
      showOngoingProcess('IMPORT_SCANNING_FUNDS');
      await dispatch(startGetRates({force: true}));
      await fixWalletAddresses({appDispatch: dispatch, wallets: key.wallets});
      await dispatch(
        startUpdateAllWalletStatusForKey({
          key,
          force: true,
          createTokenWalletWithFunds: true,
        }),
      );
      dispatch(updatePortfolioBalance());
      populateImportedKeyPortfolio({dispatch, key, logger});
    } catch (err) {
      logger.error(
        `[CloudRestore] scan failed: ${
          err instanceof Error ? err.name : 'unknown'
        }`,
      );
    }
  };

  const fail = async (source: string, reason: string) => {
    hideOngoingProcess();
    dispatch(Analytics.track('Cloud Restore Failed', {source, reason}));
    await sleep(500);
  };

  const restoringRef = useRef(false);

  const restoreBackup = async (
    backup: CloudBackupSource,
    password: string,
    passphrase = '',
  ): Promise<'wrong_password' | 'unlocked' | 'failed'> => {
    if (restoringRef.current) {
      return 'failed';
    }
    restoringRef.current = true;
    try {
      return await unlockAndRestore(backup, password, passphrase);
    } finally {
      restoringRef.current = false;
    }
  };

  const unlockAndRestore = async (
    backup: CloudBackupSource,
    password: string,
    passphrase: string,
  ): Promise<'wrong_password' | 'unlocked' | 'failed'> => {
    showOngoingProcess('IMPORTING');
    let text: string | undefined;
    let payload: CloudBackupPayload | undefined;
    let keyshare: string | undefined;
    try {
      if (backup.source === 'cloud' && backup.kind === 'keyshare') {
        keyshare = await decryptCloudKeyshare(backup.files, password);
      } else if (backup.source === 'cloud') {
        const restored = await decryptNewestCloudBackup(backup.files, password);
        text = restored?.text;
        payload = restored?.payload;
      } else {
        text = backup.text;
        payload = await decryptCloudBackup(text, password);
      }
    } catch (err) {
      if (err instanceof WrongCloudBackupPasswordError) {
        dispatch(registerWrongBackupPassword());
        await fail(backup.source, 'wrong_password');
        return 'wrong_password';
      }
      if (err instanceof CloudBackupError) {
        logger.error(`[CloudRestore] read failed: ${err.reason}`);
        await fail(backup.source, err.reason);
        showSheet(
          'warning',
          t('Something went wrong'),
          t(
            "We couldn't reach {{cloudName}}. Check your internet connection and try again.",
            {cloudName},
          ),
          [{text: t('OK'), action: () => {}, primary: true}],
        );
        return 'failed';
      }
      const damaged = err instanceof InvalidCloudBackupError;
      await fail(backup.source, damaged ? 'damaged' : 'unknown');
      if (damaged) {
        showDamaged(backup.source);
      } else {
        showSheet(
          'warning',
          t('Something went wrong'),
          t('Please try again.'),
          [{text: t('OK'), action: () => {}, primary: true}],
        );
      }
      return 'failed';
    }
    if (keyshare) {
      const decryptedKeyshare = keyshare;
      dispatch(AppActions.backupPasswordFailedAttempts(0));
      const {key: keyshareKey} = JSON.parse(decryptedKeyshare);
      const existingTssKey = keyshareKey
        ? getMatchedKey(
            keyshareKey,
            Object.values(keys).filter(
              k => !k.id.includes('readonly') && isTSSKey(k),
            ),
          )
        : undefined;
      return importAndOpen(backup.source, async () =>
        existingTssKey
          ? existingTssKey
          : ((await dispatch<any>(
              startImportTSSFile(decryptedKeyshare, {}),
            )) as Key),
      );
    }
    if (!text || !payload) {
      await fail(backup.source, 'damaged');
      showDamaged(backup.source);
      return 'failed';
    }
    dispatch(AppActions.backupPasswordFailedAttempts(0));
    const header = readCloudBackupHeader(text);
    const existingKey = getMatchedKey(
      {id: header.keyId, fingerPrint: header.fingerPrint},
      Object.values(keys).filter(k => !k.id.includes('readonly')),
    );
    if (existingKey) {
      return importAndOpen(
        backup.source,
        async () => existingKey,
        key => {
          if (backup.source === 'cloud') {
            dispatch(
              setCloudBackupComplete({
                keyId: key.id,
                timestamp: header.createdAt,
              }),
            );
          }
        },
      );
    }
    if (payload.mnemonicHasPassphrase) {
      if (!passphrase) {
        await fail(backup.source, 'passphrase_missing');
        showSheet(
          'warning',
          t('Recovery phrase password required'),
          t(
            'This key’s recovery phrase is protected with a password. Enter it in Advanced Options, then try again.',
          ),
          [{text: t('OK'), action: () => {}, primary: true}],
        );
        return 'failed';
      }
      let passphraseMatches = true;
      try {
        passphraseMatches =
          !header.fingerPrint ||
          isKeyPassphrase(payload.mnemonic, passphrase, header.fingerPrint);
      } catch {
        await fail(backup.source, 'damaged');
        showDamaged(backup.source);
        return 'failed';
      }
      if (!passphraseMatches) {
        await fail(backup.source, 'passphrase_wrong');
        showSheet(
          'warning',
          t('Incorrect recovery phrase password'),
          t(
            'Check the recovery phrase password in Advanced Options, then try again.',
          ),
          [{text: t('OK'), action: () => {}, primary: true}],
        );
        return 'failed';
      }
    }
    const restoredPayload = payload;
    return importAndOpen(
      backup.source,
      () =>
        dispatch(
          startRestoreRecoveryPhrase(
            restoredPayload.mnemonic,
            restoredPayload.mnemonicHasPassphrase ? passphrase : undefined,
          ),
        ),
      key => {
        if (restoredPayload.keyName) {
          dispatch(
            updateKeyName({keyId: key.id, name: restoredPayload.keyName}),
          );
        }
        if (backup.source === 'cloud') {
          dispatch(
            setCloudBackupComplete({
              keyId: key.id,
              timestamp: header.createdAt,
            }),
          );
        }
      },
    );
  };

  const importAndOpen = async (
    source: CloudBackupSource['source'],
    importKey: () => Promise<Key>,
    afterImport: (key: Key) => void = () => {},
  ): Promise<'unlocked' | 'failed'> => {
    try {
      const key = await importKey();
      dispatch(setHomeCarouselConfig({id: key.id, show: true}));
      await scanFunds(key);
      afterImport(key);
      hideOngoingProcess();
      backupRedirect({context, navigation, walletTermsAccepted, key});
      dispatch(
        Analytics.track('Imported Key', {
          context: context || '',
          source: 'CloudBackup',
        }),
      );
      dispatch(Analytics.track('Cloud Restore Completed', {source}));
    } catch (err) {
      if (isMissingWalletsError(err)) {
        await fail(source, 'no_wallets');
        showSheet(
          'warning',
          t('No wallets found'),
          t(
            'We couldn’t find any wallets for this key, so nothing was restored.',
          ),
          [{text: t('OK'), action: () => {}, primary: true}],
        );
        return 'failed';
      }
      logger.error(
        `[CloudRestore] import failed: ${
          err instanceof Error ? err.name : 'unknown'
        }`,
      );
      await fail(source, 'import');
      showSheet('warning', t('Something went wrong'), t('Please try again.'), [
        {text: t('OK'), action: () => {}, primary: true},
      ]);
      return 'failed';
    }
    return 'unlocked';
  };

  return {restoreBackup};
};
