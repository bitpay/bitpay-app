import {CommonActions} from '@react-navigation/native';
import React, {useCallback, useState} from 'react';
import {useTranslation} from 'react-i18next';
import styled from 'styled-components/native';
import Button, {ButtonState} from '../../../../components/button/Button';
import {ScreenGutter} from '../../../../components/styled/Containers';
import {useAppDispatch} from '../../../../utils/hooks';
import {WalletStackParamList} from '../../WalletStack';
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

const ClearTransactionHistoryCacheContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollView = styled.ScrollView`
  margin-top: 20px;
  padding: 0 ${ScreenGutter};
`;

const ClearTransactionHistoryCacheDescription = styled(Paragraph)`
  margin-bottom: 15px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const ButtonContainer = styled.View`
  margin-top: 20px;
`;

type ClearTransactionHistoryCacheProps = NativeStackScreenProps<
  WalletStackParamList,
  'ClearTransactionHistoryCache'
>;
const BWC = BwcProvider.getInstance();

const ClearTransactionHistoryCache: React.FC<
  ClearTransactionHistoryCacheProps
> = ({navigation, route}) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const [buttonState, setButtonState] = useState<ButtonState>();

  const {wallet, key} = route.params;

  const clearCache = async () => {
    setButtonState('loading');

    const walletClient = BWC.getClient(JSON.stringify(wallet.credentials));

    walletClient.clearCache(async (err: any) => {
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
        navigation.dispatch(
          CommonActions.reset({
            index: 1,
            routes: [
              {
                name: 'KeyOverview',
                params: {
                  id: key.id,
                },
              },
              {
                name: 'WalletDetails',
                params: {
                  walletId: wallet.id,
                  key,
                  skipInitializeHistory: false,
                },
              },
            ],
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
    <ClearTransactionHistoryCacheContainer>
      <ScrollView>
        <ClearTransactionHistoryCacheDescription>
          {t(
            'The transaction history and every new incoming transaction are cached in the app. Clearing the cache cleans up the transaction history and synchronizes again from the server.',
          )}
        </ClearTransactionHistoryCacheDescription>

        <ButtonContainer>
          <Button onPress={() => clearCache()} state={buttonState}>
            {t('Clear cache')}
          </Button>
        </ButtonContainer>
      </ScrollView>
    </ClearTransactionHistoryCacheContainer>
  );
};

export default ClearTransactionHistoryCache;
