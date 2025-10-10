import React, {useEffect, useLayoutEffect, useState} from 'react';
import {useNavigation} from '@react-navigation/native';
import styled from 'styled-components/native';
import {SettingsComponent, SettingsContainer} from '../../SettingsRoot';
import {
  ScreenGutter,
  Setting,
  SettingDescription,
  SettingTitle,
  SettingIcon,
  SheetContainer,
  SheetParams,
} from '../../../../../components/styled/Containers';
import Button from '../../../../../components/button/Button';
import {useTranslation} from 'react-i18next';
import {LogActions} from '../../../../../store/log';
import {
  Action,
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
  getPasskeyCredentials,
  registerPasskey,
  removePasskey,
  getPasskeyStatus,
} from '../../../../../utils/passkey';
import {FlashList} from '@shopify/flash-list';
import {Network} from '../../../../../constants';
import DeleteConfirmationModal from '../../../../../navigation/wallet/components/DeleteConfirmationModal';
import PasskeyHeader from '../../../../../../assets/img/passkey-header.svg';
import PasskeyPersonSetup from '../../../../../../assets/img/passkey-person-setup.svg';
import {startOnGoingProcessModal} from '../../../../../store/app/app.effects';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../../../store/app/app.actions';
import {
  setPasskeyStatus,
  setPasskeyCredentials,
} from '../../../../../store/bitpay-id/bitpay-id.actions';
import {PasskeyCredential} from '../../../../../store/bitpay-id/bitpay-id.models';
import Settings from '../../../../../components/settings/Settings';
import SheetModal from '../../../../../components/modal/base/sheet/SheetModal';
import {TouchableOpacity} from '../../../../../components/base/TouchableOpacity';
import {BaseText} from '../../../../../components/styled/Text';

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

const OptionContainer = styled(TouchableOpacity)<SheetParams>`
  flex-direction: row;
  align-items: stretch;
  padding-${({placement}) => placement}: 41px;
`;

const OptionTextContainer = styled.View`
  align-items: flex-start;
  justify-content: space-around;
  flex-direction: column;
  margin: 0 25px;
`;

const OptionTitleText = styled(BaseText)`
  font-style: normal;
  font-weight: 500;
  font-size: 18px;
  line-height: 28px;
  color: ${({theme: {dark}}) => (dark ? White : Action)};
`;

const OptionIconContainer = styled.View`
  justify-content: center;
  width: 24px;
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
  const passkeyStatus = useSelector<RootState, boolean>(
    ({BITPAY_ID}) => BITPAY_ID.passkeyStatus,
  );
  const passkeyCredentials = useSelector<RootState, Array<PasskeyCredential>>(
    ({BITPAY_ID}) => BITPAY_ID.passkeyCredentials,
  );
  const [isVisible, setIsVisible] = useState(false);
  const [passkeyId, setPasskeyId] = useState<string>('');
  const [showOptions, setShowOptions] = useState(false);

  useLayoutEffect(() => {
    if (passkeyCredentials && passkeyCredentials.length > 0) {
      navigation.setOptions({
        headerRight: () => <Settings onPress={() => setShowOptions(true)} />,
      });
    }
  }, [navigation]);

  const createPasskey = async () => {
    setShowOptions(false);
    if (!user || !session?.isAuthenticated) {
      dispatch(LogActions.warn('[PasskeyScreen] User not authenticated'));
      navigation.navigate('Login');
      return;
    }
    await dispatch(startOnGoingProcessModal('GENERAL_AWAITING'));
    const registeredPasskey = await registerPasskey(
      user.email,
      network,
      session.csrfToken,
    );
    dispatch(setPasskeyStatus(registeredPasskey));
    dispatch(dismissOnGoingProcessModal());
    if (registeredPasskey) {
      await fetchCredentials();
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

  const fetchCredentials = async () => {
    if (passkeyStatus && user && session?.isAuthenticated) {
      const _passkeyCredentials = await getPasskeyCredentials(
        user.email,
        network,
        session.csrfToken,
      );
      dispatch(setPasskeyCredentials(_passkeyCredentials));
    }
  };

  useEffect(() => {
    fetchCredentials();
  }, []);

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
          height={40}
          style={{marginVertical: 15, width: '50%'}}
          buttonStyle={'secondary'}
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
    if (user) {
      const _passkeyStatus = await getPasskeyStatus(
        user.email,
        network,
        session.csrfToken,
      );
      dispatch(setPasskeyStatus(_passkeyStatus));
    }
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
              <Setting style={{marginTop: 10}}>
                <SettingIcon style={{marginRight: 20, marginBottom: 10}}>
                  <PasskeyPersonSetup />
                </SettingIcon>
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
        {user &&
          session?.isAuthenticated &&
          passkeyCredentials.length === 0 && (
            <CreateButtonContainer>
              <Button
                style={{width: '60%'}}
                height={45}
                buttonStyle={'secondary'}
                onPress={createPasskey}>
                Create a Passkey
              </Button>
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

      <SheetModal
        modalLibrary={'bottom-sheet'}
        placement={'bottom'}
        isVisible={showOptions}
        onBackdropPress={() => setShowOptions(false)}>
        <SheetContainer placement={'bottom'}>
          <OptionContainer placement={'bottom'} onPress={createPasskey}>
            <OptionIconContainer>
              <PasskeyPersonSetup />
            </OptionIconContainer>
            <OptionTextContainer>
              <OptionTitleText>{t('Create a Passkey')}</OptionTitleText>
            </OptionTextContainer>
          </OptionContainer>
        </SheetContainer>
      </SheetModal>
    </SettingsContainer>
  );
};

export default PasskeyScreen;
