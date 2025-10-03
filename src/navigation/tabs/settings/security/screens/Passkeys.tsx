import React, {useEffect, useState} from 'react';
import {useNavigation} from '@react-navigation/native';
import styled from 'styled-components/native';
import {SettingsComponent, SettingsContainer} from '../../SettingsRoot';
import {
  ScreenGutter,
  Setting,
  SettingDescription,
  SettingTitle,
} from '../../../../../components/styled/Containers';
import Button from '../../../../../components/button/Button';
import {useTranslation} from 'react-i18next';
import {LogActions} from '../../../../../store/log';
import {
  Black,
  Feather,
  LightBlack,
  SlateDark,
  White,
} from '../../../../../styles/colors';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {useSelector} from 'react-redux';
import {RootState} from '../../../../../store';
import {Session, User} from '../../../../../store/bitpay-id/bitpay-id.models';
import {BitPayIdEffects} from '../../../../../store/bitpay-id';
import {
  getPasskeyStatus,
  getPasskeyCredentials,
  registerPasskey,
  removePasskey,
} from '../../../../../utils/passkey';
import {FlashList} from '@shopify/flash-list';
import {Network} from '../../../../../constants';
import DeleteConfirmationModal from '../../../../../navigation/wallet/components/DeleteConfirmationModal';
import PasskeyHeader from '../../../../../../assets/img/passkey-header.svg';
import {startOnGoingProcessModal} from '../../../../../store/app/app.effects';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../../../store/app/app.actions';
import {setPasskeyStatus} from '../../../../../store/bitpay-id/bitpay-id.actions';

const ScrollContainer = styled.ScrollView``;

const HeaderTitle = styled(Setting)`
  margin-top: 20px;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : Feather)};
  padding: 0 ${ScreenGutter};
  border-bottom-width: 1px;
  border-bottom-color: ${({theme: {dark}}) => (dark ? Black : White)};
`;

const CreateButtonContainer = styled.View`
  margin-top: 20px;
  margin-bottom: 20px;
  padding: 0 ${ScreenGutter};
`;

const PasskeyBoxContainer = styled.View`
  margin: 20px ${ScreenGutter};
  padding: 0 ${ScreenGutter};
  border-width: 1px;
  border-color: ${({theme: {dark}}) => (dark ? LightBlack : Feather)};
  border-radius: 10px;
`;

const IconContainer = styled.View`
  margin-top: 10px;
`;

const PasskeyTitleContainer = styled.View`
  margin: 20px 0 10px 5px;
`;

const PasskeyTitle = styled(SettingTitle)`
  font-size: 16px;
  font-weight: bold;
`;

const PasskeyDescription = styled(SettingDescription)`
  font-size: 14px;
  color: ${({theme: {dark}}) => (dark ? LightBlack : SlateDark)};
  margin-top: 5px;
  margin-bottom: 10px;
`;

const PasskeyScreen: React.FC = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const network = useSelector<RootState, Network>(({APP}) => APP.network);
  const session: Session = useAppSelector(({BITPAY_ID}) => BITPAY_ID.session);
  const user = useSelector<RootState, User | null>(
    ({BITPAY_ID}) => BITPAY_ID.user[network],
  );
  const [passkeyCredentials, setPasskeyCredentials] = useState<Array<any>>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [passkeyId, setPasskeyId] = useState<string>('');
  const [checkingPasskey, setCheckingPasskey] = useState<boolean>(false);

  const createPasskey = async () => {
    if (!user || !session?.isAuthenticated) return;
    await dispatch(startOnGoingProcessModal('GENERAL_AWAITING'));
    const registeredPasskey = await registerPasskey(
      user.email,
      network,
      session.csrfToken,
    );
    dispatch(dismissOnGoingProcessModal());
    if (registeredPasskey) {
      dispatch(
        showBottomNotificationModal({
          type: 'success',
          title: t('Passkey'),
          message: t('You secure Passkey has been created.'),
          enableBackdropDismiss: false,
          actions: [
            {
              text: t('OK'),
              action: () => {
                dispatch(BitPayIdEffects.startFetchSession());
              },
            },
          ],
        }),
      );
    } else {
      dispatch(
        showBottomNotificationModal({
          type: 'error',
          title: t('Passkey'),
          message: t('Error creating Passkey. Please, try again later.'),
          enableBackdropDismiss: true,
          actions: [
            {
              text: t('OK'),
              action: () => {},
            },
          ],
        }),
      );
    }
  };

  useEffect(() => {
    dispatch(BitPayIdEffects.startFetchSession());
  }, []);

  useEffect(() => {
    const checkStatus = async () => {
      if (checkingPasskey) {
        return;
      }
      if (!user) return;
      if (!session?.isAuthenticated) {
        dispatch(LogActions.warn('[PasskeyScreen] User not authenticated'));
        navigation.navigate('Login');
        return;
      }
      setCheckingPasskey(true);
      const hasPasskey = await getPasskeyStatus(
        user.email,
        network,
        session.csrfToken,
      );
      dispatch(setPasskeyStatus(hasPasskey));
      if (hasPasskey) {
        const credentials = await getPasskeyCredentials(
          user.email,
          network,
          session.csrfToken,
        );
        setPasskeyCredentials(credentials);
      }
      setCheckingPasskey(false);
    };
    checkStatus();
  }, [session]);

  const renderPasskey = ({item, index}) => {
    const date = new Date(item.createdAt);
    const formattedDate = date.toLocaleDateString();
    const formattedTime = date.toLocaleTimeString();
    return (
      <PasskeyBoxContainer>
        <IconContainer>
          <PasskeyHeader />
        </IconContainer>
        <PasskeyTitleContainer>
          <PasskeyTitle>Passkey {index + 1}</PasskeyTitle>
          <PasskeyDescription>
            {formattedDate + ', ' + formattedTime}
          </PasskeyDescription>
        </PasskeyTitleContainer>
        <Button
          style={{marginVertical: 15, width: '50%'}}
          buttonType={'pill'}
          onPress={() => {
            setPasskeyId(item.id);
            setIsVisible(true);
          }}>
          {t('Delete Passkey')}
        </Button>
      </PasskeyBoxContainer>
    );
  };

  const deletePasskey = async () => {
    await removePasskey(passkeyId, network, session.csrfToken);
    setIsVisible(false);
    setPasskeyId('');
  };

  return (
    <SettingsContainer>
      <ScrollContainer>
        {user && passkeyCredentials && passkeyCredentials.length === 0 && (
          <>
            <HeaderTitle>
              <SettingTitle>{t('Setup a passkey')}</SettingTitle>
            </HeaderTitle>
            <SettingsComponent>
              <Setting>
                <SettingTitle>
                  Passkeys are encrypted digital keys you create using your
                  fingerprint, face, or screen lock.
                </SettingTitle>
              </Setting>
            </SettingsComponent>
          </>
        )}
        {user && passkeyCredentials && passkeyCredentials.length > 0 && (
          <>
            <FlashList
              renderItem={renderPasskey}
              data={passkeyCredentials}
              keyExtractor={(item, index) => index.toString()}
            />
          </>
        )}
        {user && session?.isAuthenticated && (
          <CreateButtonContainer>
            <Button onPress={createPasskey}>Create a Passkey</Button>
          </CreateButtonContainer>
        )}
      </ScrollContainer>
      <DeleteConfirmationModal
        description={t(
          "Are you sure you want to remove this Passkey? You might lose access if you don't have another login method set up.",
        )}
        onPressOk={deletePasskey}
        isVisible={isVisible}
        onPressCancel={() => setIsVisible(false)}
      />
    </SettingsContainer>
  );
};

export default PasskeyScreen;
