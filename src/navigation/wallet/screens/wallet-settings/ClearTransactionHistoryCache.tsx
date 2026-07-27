import {CommonActions} from '@react-navigation/native';
import React, {useCallback, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {SafeAreaView, ScrollView, StyleSheet, View} from 'react-native';
import {useTheme} from '../../../../contexts';
import Button, {ButtonState} from '../../../../components/button/Button';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {WalletGroupParamList, WalletScreens} from '../../WalletGroup';
import {BottomNotificationConfig} from '../../../../components/modal/bottom-notification/BottomNotification';
import {sleep} from '../../../../utils/helper-methods';
import {showBottomNotificationModal} from '../../../../store/app/app.actions';
import {CustomErrorMessage} from '../../components/ErrorMessages';
import {BWCErrorMessage} from '../../../../constants/BWCError';
import {Paragraph} from '../../../../components/styled/Text';
import {SlateDark, White} from '../../../../styles/colors';
import {BwcProvider} from '../../../../lib/bwc';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {updateWalletTxHistory} from '../../../../store/wallet/wallet.actions';
import {RootStacks} from '../../../../Root';
import {isTSSKey} from '../../../../store/wallet/effects/tss-send/tss-send';
import {IsVMChain} from '../../../../store/wallet/utils/currency';
import {TabsScreens} from '../../../../navigation/tabs/TabsStack';
import {findWalletById} from '../../../../store/wallet/utils/wallet';
import {Wallet} from '../../../../store/wallet/wallet.models';

const styles = StyleSheet.create({
  clearTransactionHistoryCacheContainer: {
    flex: 1,
  },
  scrollView: {
    marginTop: 20,
    paddingHorizontal: 12,
  },
  clearTransactionHistoryCacheDescription: {
    marginBottom: 15,
  },
  buttonContainer: {
    marginTop: 20,
  },
});

type ClearTransactionHistoryCacheProps = NativeStackScreenProps<
  WalletGroupParamList,
  'ClearTransactionHistoryCache'
>;
const BWC = BwcProvider.getInstance();

const ClearTransactionHistoryCache: React.FC<
  ClearTransactionHistoryCacheProps
> = ({navigation, route}) => {
  const {t} = useTranslation();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const [buttonState, setButtonState] = useState<ButtonState>();

  const {keyId, walletId, copayerId} = route.params;
  const key = useAppSelector(({WALLET}) => WALLET.keys[keyId]);
  const wallet = findWalletById(key.wallets, walletId, copayerId) as Wallet;

  const clearCache = async () => {
    setButtonState('loading');

    const walletClient = BWC.getClient(JSON.stringify(wallet.credentials));

    walletClient.clearCache({tokenAddress: wallet.tokenAddress}, async err => {
      if (err) {
        setButtonState('failed');
        showErrorMessage(
          CustomErrorMessage({
            errMsg: BWCErrorMessage(err),
            title: t('Uh oh, something went wrong'),
            action: () => {
              setButtonState(undefined);
            },
          }),
        );
      } else {
        setButtonState('success');
        dispatch(
          updateWalletTxHistory({
            walletId: wallet.id,
            keyId: key.id,
            transactionHistory: {
              transactions: [],
              loadMore: true,
              hasConfirmingTxs: false,
            },
          }),
        );

        const baseRoutes = [
          {
            name: RootStacks.TABS,
            params: {screen: TabsScreens.HOME},
          },
        ];
        const keyOverviewRoute = {
          name: WalletScreens.KEY_OVERVIEW,
          params: {id: key.id},
        };
        const AccountDetailsRoute = {
          name: WalletScreens.ACCOUNT_DETAILS,
          params: {
            keyId: key.id,
            selectedAccountAddress: key.wallets[0]?.receiveAddress,
          },
        };
        const walletDetailsRoute = {
          name: WalletScreens.WALLET_DETAILS,
          params: {
            walletId: wallet.id,
            copayerId,
            skipInitializeHistory: false,
          },
        };

        const routes = isTSSKey(key)
          ? IsVMChain(key.wallets[0].chain)
            ? [...baseRoutes, AccountDetailsRoute, walletDetailsRoute]
            : [...baseRoutes, walletDetailsRoute]
          : [...baseRoutes, keyOverviewRoute, walletDetailsRoute];

        navigation.dispatch(
          CommonActions.reset({
            index: routes.length - 1,
            routes,
          }),
        );
      }
    });
  };

  const showErrorMessage = useCallback(
    async (msg: BottomNotificationConfig) => {
      await sleep(500);
      dispatch(showBottomNotificationModal(msg));
    },
    [dispatch],
  );

  return (
    <SafeAreaView style={styles.clearTransactionHistoryCacheContainer}>
      <ScrollView style={styles.scrollView}>
        <Paragraph
          style={[
            styles.clearTransactionHistoryCacheDescription,
            {color: theme.dark ? White : SlateDark},
          ]}>
          {t(
            'The transaction history and every new incoming transaction are cached in the app. Clearing the cache cleans up the transaction history and synchronizes again from the server.',
          )}
        </Paragraph>

        <View style={styles.buttonContainer}>
          <Button onPress={() => clearCache()} state={buttonState}>
            {t('Clear cache')}
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ClearTransactionHistoryCache;
