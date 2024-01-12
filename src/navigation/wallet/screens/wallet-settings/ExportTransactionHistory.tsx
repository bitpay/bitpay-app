import {RouteProp, useRoute} from '@react-navigation/native';
import React, {useCallback} from 'react';
import {useTranslation} from 'react-i18next';
import styled from 'styled-components/native';
import Button from '../../../../components/button/Button';
import {ScreenGutter} from '../../../../components/styled/Containers';
import {
  BWS_TX_HISTORY_LIMIT,
  GetTransactionHistory,
} from '../../../../store/wallet/effects/transactions/transactions';
import {useAppDispatch} from '../../../../utils/hooks';
import {WalletGroupParamList} from '../../WalletGroup';
import _ from 'lodash';
import {APP_NAME_UPPERCASE} from '../../../../constants/config';
import {GetPrecision} from '../../../../store/wallet/utils/currency';
import RNFS from 'react-native-fs';
import {PermissionsAndroid, Platform} from 'react-native';
import Share, {ShareOptions} from 'react-native-share';
import Papa from 'papaparse';
import {BottomNotificationConfig} from '../../../../components/modal/bottom-notification/BottomNotification';
import {
  formatCurrencyAbbreviation,
  sleep,
} from '../../../../utils/helper-methods';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../../store/app/app.actions';
import {CustomErrorMessage} from '../../components/ErrorMessages';
import {BWCErrorMessage} from '../../../../constants/BWCError';
import {startOnGoingProcessModal} from '../../../../store/app/app.effects';
import {LogActions} from '../../../../store/log';
import {Paragraph} from '../../../../components/styled/Text';
import {SlateDark, White} from '../../../../styles/colors';
import Mailer from 'react-native-mail';

const ExportTransactionHistoryContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollView = styled.ScrollView`
  margin-top: 20px;
  padding: 0 ${ScreenGutter};
`;

const ExportTransactionHistoryDescription = styled(Paragraph)`
  margin-bottom: 15px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const ButtonContainer = styled.View`
  margin-top: 20px;
`;

const ExportTransactionHistory = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const {
    params: {wallet},
  } = useRoute<RouteProp<WalletGroupParamList, 'ExportTransactionHistory'>>();
  const {currencyAbbreviation, chain, walletName, tokenAddress} = wallet;

  const formatDate = (date: number): string => {
    const dateObj = new Date(date);
    if (!dateObj) {
      dispatch(LogActions.warn('[formatDate]: Error formating a date.'));
      return 'DateError';
    }
    if (!dateObj.toJSON()) {
      return '';
    }
    return dateObj.toJSON();
  };

  const isAndroidStoragePermissionGranted = (): Promise<boolean> => {
    return new Promise(async (resolve, reject) => {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        ]);
        if (
          granted['android.permission.READ_EXTERNAL_STORAGE'] ===
            PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.WRITE_EXTERNAL_STORAGE'] ===
            PermissionsAndroid.RESULTS.GRANTED
        ) {
          dispatch(
            LogActions.info(
              '[isAndroidStoragePermissionGranted]: Storage permission granted',
            ),
          );
          resolve(true);
        } else {
          dispatch(
            LogActions.warn(
              '[isAndroidStoragePermissionGranted]: Storage permission denied',
            ),
          );
          throw new Error('Storage permission denied');
        }
      } catch (e) {
        reject(e);
      }
    });
  };

  const buildCVSFile = async () => {
    try {
      const {transactions} = await dispatch(
        GetTransactionHistory({
          wallet,
          transactionsHistory: [],
          limit: BWS_TX_HISTORY_LIMIT,
        }),
      );

      if (_.isEmpty(transactions)) {
        dispatch(
          LogActions.warn(
            '[buildCVSFile]: Failed to generate CSV: no transactions',
          ),
        );
        const err = t('This wallet has no transactions');
        throw err;
      }

      dispatch(
        LogActions.debug(
          `[buildCVSFile]: Wallet Transaction History Length: ${transactions.length}`,
        ),
      );

      // @ts-ignore
      const {unitToSatoshi} = dispatch(
        GetPrecision(currencyAbbreviation, chain, tokenAddress),
      );
      const satToUnit = 1 / unitToSatoshi;

      let _amount, _note, _copayers, _creator, _comment;
      const csvContent: any[] = [];

      transactions.forEach(tx => {
        let amount = tx.amount;

        if (tx.action == 'moved') {
          amount = 0;
        }

        _copayers = '';
        _creator = '';

        if (tx.actions && tx.actions.length > 1) {
          for (let i = 0; i < tx.actions.length; i++) {
            _copayers +=
              tx.actions[i].copayerName + ':' + tx.actions[i].type + ' - ';
          }
          _creator = tx.creatorName ? tx.creatorName : '';
        }
        _amount =
          (tx.action == 'sent' ? '-' : '') + (amount * satToUnit).toFixed(8);
        _note = tx.message || '';
        _comment = tx.note ? tx.note.body : '';

        if (tx.action == 'moved') {
          _note += ' Sent to self:' + (tx.amount * satToUnit).toFixed(8);
        }

        csvContent.push({
          Date: formatDate(tx.time * 1000),
          Destination: tx.addressTo || '',
          Description: _note,
          Amount: _amount,
          Currency: formatCurrencyAbbreviation(currencyAbbreviation),
          Txid: tx.txid,
          Creator: _creator,
          Copayers: _copayers,
          Comment: _comment,
        });

        if (tx.fees && (tx.action == 'moved' || tx.action == 'sent')) {
          const _fee = (tx.fees * satToUnit).toFixed(8);
          csvContent.push({
            Date: formatDate(tx.time * 1000),
            Destination: `${chain.toUpperCase()} Network Fees`,
            Description: _note,
            Amount: '-' + _fee,
            Currency: chain.toUpperCase(),
            Txid: '',
            Creator: '',
            Copayers: '',
          });
        }
      });
      const csv = Papa.unparse(csvContent);
      return csv;
    } catch (e) {
      const errString = e instanceof Error ? e.message : JSON.stringify(e);
      dispatch(LogActions.warn(`[buildCVSFile]: ${errString}`));
      throw e;
    }
  };

  const handleEmail = (subject: string, filePath: string) => {
    Mailer.mail(
      {
        subject,
        isHTML: false,
        attachments: [
          {
            path: filePath,
            type: 'csv',
          },
        ],
      },
      async (error, event) => {
        if (error) {
          dispatch(LogActions.error('Error sending email: ' + error));
          const err = new Error(
            `${APP_NAME_UPPERCASE} cannot open default Email App.`,
          );
          await sleep(500);
          await showErrorMessage(
            CustomErrorMessage({
              errMsg: BWCErrorMessage(err),
              title: t('Uh oh, something went wrong'),
            }),
          );
        }
        if (event) {
          dispatch(LogActions.debug('Email Logs: ' + event));
        }
      },
    );
  };

  const shareFile = async (csv: any, option: string) => {
    try {
      if (Platform.OS === 'android' && Platform.Version < 30) {
        await isAndroidStoragePermissionGranted();
      }
      const rootPath =
        Platform.OS === 'ios'
          ? RNFS.LibraryDirectoryPath
          : RNFS.TemporaryDirectoryPath;
      const csvFilename = `${APP_NAME_UPPERCASE}-${walletName}`;
      let filePath = `${rootPath}/${csvFilename}`;

      await RNFS.mkdir(filePath);

      filePath += '.csv';
      const opts: ShareOptions = {
        title: csvFilename,
        url: `file://${filePath}`,
        subject: `${walletName} Transaction History`,
      };

      await RNFS.writeFile(filePath, csv, 'utf8');

      if (option === 'download') {
        await Share.open(opts);
      } else {
        handleEmail(opts.subject!, filePath);
      }
    } catch (err: any) {
      dispatch(LogActions.debug(`[shareFile]: ${err.message}`));
      if (err && err.message === 'User did not share') {
        return;
      } else {
        throw err;
      }
    }
  };

  const onSubmit = async (option: string) => {
    try {
      dispatch(startOnGoingProcessModal('LOADING'));
      const csv = await buildCVSFile();
      await sleep(200);
      dispatch(dismissOnGoingProcessModal());
      await sleep(500);
      await shareFile(csv, option);
    } catch (e) {
      dispatch(dismissOnGoingProcessModal());
      await sleep(500);
      await showErrorMessage(
        CustomErrorMessage({
          errMsg: BWCErrorMessage(e),
          title: t('Uh oh, something went wrong'),
        }),
      );
    }
  };

  const showErrorMessage = useCallback(
    async (msg: BottomNotificationConfig) => {
      await sleep(500);
      dispatch(showBottomNotificationModal(msg));
    },
    [dispatch],
  );

  return (
    <ExportTransactionHistoryContainer>
      <ScrollView>
        <ExportTransactionHistoryDescription>
          {t('Export your transaction history as a .csv file')}
        </ExportTransactionHistoryDescription>

        <ButtonContainer>
          <Button onPress={() => onSubmit('download')}>
            {t('Share File')}
          </Button>
        </ButtonContainer>

        <ButtonContainer>
          <Button onPress={() => onSubmit('email')} buttonStyle={'secondary'}>
            {t('Send by Email')}
          </Button>
        </ButtonContainer>
      </ScrollView>
    </ExportTransactionHistoryContainer>
  );
};

export default ExportTransactionHistory;
