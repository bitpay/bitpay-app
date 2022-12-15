import React, {useLayoutEffect, useState} from 'react';
import {HeaderTitle, H5, Paragraph} from '../../../components/styled/Text';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../WalletStack';
import styled from 'styled-components/native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {ScreenGutter} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import {useDispatch} from 'react-redux';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';
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
  const dispatch = useDispatch();
  const homeCarouselConfig = useAppSelector(({APP}) => APP.homeCarouselConfig);

  const {notificationsAccepted, emailNotifications, brazeEid} = useAppSelector(
    ({APP}) => APP,
  );
  const {keys} = useAppSelector(({WALLET}) => WALLET);

  const {
    params: {keyId},
  } = useRoute<RouteProp<WalletStackParamList, 'DeleteKey'>>();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>{t('Delete Key')}</HeaderTitle>,
    });
  });

  const [isVisible, setIsVisible] = useState(false);
  const startDeleteKey = async () => {
    setIsVisible(false);
    await sleep(500);
    dispatch(
      startOnGoingProcessModal(
        // t('Deleting Key')
        t(OnGoingProcessMessages.DELETING_KEY),
      ),
    );

    // Unsubscribe wallets to push/email notifications if enabled
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

    await sleep(300);
    dispatch(deleteKey({keyId}));
    dispatch(
      setHomeCarouselConfig(
        homeCarouselConfig.filter(item => item.id !== keyId),
      ),
    );
    await sleep(1000);
    dispatch(updatePortfolioBalance());
    dispatch(AppActions.dismissOnGoingProcessModal());
    navigation.navigate('Tabs', {screen: 'Home'});
  };

  return (
    <DeleteKeyContainer>
      <ScrollView>
        <Title>{t('Warning!')}</Title>
        <DeleteKeyParagraph>
          {t(
            'Permanently deletes all wallets using this key. \nTHIS ACTION CANNOT BE REVERSED.',
          )}
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
