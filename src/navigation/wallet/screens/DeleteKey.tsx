import React, {useLayoutEffect, useState} from 'react';
import {HeaderTitle, H5, Paragraph} from '../../../components/styled/Text';
import {useNavigation, useRoute} from '@react-navigation/native';
import {CommonActions, RouteProp} from '@react-navigation/core';
import {WalletGroupParamList} from '../WalletGroup';
import styled from 'styled-components/native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {ScreenGutter} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import {AppActions} from '../../../store/app';
import {sleep} from '../../../utils/helper-methods';
import {
  deleteKey,
  updatePortfolioBalance,
} from '../../../store/wallet/wallet.actions';
import {findKeyByKeyId} from '../../../store/wallet/utils/wallet';
import useAppSelector from '../../../utils/hooks/useAppSelector';
import {setHomeCarouselConfig} from '../../../store/app/app.actions';
import {
  unSubscribeEmailNotifications,
  unSubscribePushNotifications,
} from '../../../store/app/app.effects';
import {useTranslation} from 'react-i18next';
import {useAppDispatch} from '../../../utils/hooks';
import {RootStacks} from '../../../Root';
import {TabsScreens} from '../../../navigation/tabs/TabsStack';

const DeleteKeyContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollView = styled(KeyboardAwareScrollView)`
  margin-top: 20px;
  padding: 0 ${ScreenGutter};
`;

const Title = styled(H5)`
  color: #ce334b;
`;

const DeleteKeyParagraph = styled(Paragraph)`
  margin: 15px 0 20px;
`;

const DeleteKey = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const homeCarouselConfig = useAppSelector(({APP}) => APP.homeCarouselConfig);

  const notificationsAccepted = useAppSelector(
    ({APP}) => APP.notificationsAccepted,
  );
  const emailNotifications = useAppSelector(({APP}) => APP.emailNotifications);
  const brazeEid = useAppSelector(({APP}) => APP.brazeEid);
  const {keys} = useAppSelector(({WALLET}) => WALLET);

  const {
    params: {keyId},
  } = useRoute<RouteProp<WalletGroupParamList, 'DeleteKey'>>();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>{t('Delete Key')}</HeaderTitle>,
    });
  });

  const [isVisible, setIsVisible] = useState(false);
  const startDeleteKey = async () => {
    setIsVisible(false);
    await sleep(500);
    dispatch(startOnGoingProcessModal('DELETING_KEY'));

    await sleep(300);
    unsubscribeNotifications();
    dispatch(deleteKey({keyId}));

    dispatch(
      setHomeCarouselConfig(
        homeCarouselConfig.filter(item => item.id !== keyId),
      ),
    );
    dispatch(updatePortfolioBalance());
    dispatch(AppActions.dismissOnGoingProcessModal());
    await sleep(1000);
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: RootStacks.TABS,
            params: {screen: TabsScreens.HOME},
          },
        ],
      }),
    );
  };

  const unsubscribeNotifications = async () => {
    const keyObj = await findKeyByKeyId(keyId, keys);
    keyObj.wallets
      .filter(
        (wallet: any) =>
          !wallet.credentials.token && wallet.credentials.isComplete(),
      )
      .forEach(walletClient => {
        if (notificationsAccepted && brazeEid) {
          dispatch(unSubscribePushNotifications(walletClient, brazeEid));
        }
        if (emailNotifications.accepted && emailNotifications.email) {
          dispatch(unSubscribeEmailNotifications(walletClient));
        }
      });
  };

  return (
    <DeleteKeyContainer>
      <ScrollView>
        <Title>{t('Warning!')}</Title>
        <DeleteKeyParagraph>
          {t('Permanently deletes all wallets using this key.') +
            '\n' +
            t('THIS ACTION CANNOT BE REVERSED.')}
        </DeleteKeyParagraph>

        <Button onPress={() => setIsVisible(true)}>{t('Delete')}</Button>
      </ScrollView>

      <DeleteConfirmationModal
        description={t(
          'Are you sure you want to delete all wallets using this key?',
        )}
        onPressOk={startDeleteKey}
        isVisible={isVisible}
        onPressCancel={() => setIsVisible(false)}
      />
    </DeleteKeyContainer>
  );
};

export default DeleteKey;
