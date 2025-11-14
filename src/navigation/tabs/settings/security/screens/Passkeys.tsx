import React, {useCallback, useEffect, useLayoutEffect, useState} from 'react';
import {useNavigation} from '@react-navigation/native';
import styled from 'styled-components/native';
import {SettingsContainer} from '../../SettingsRoot';
import {
  ScreenGutter,
  SettingDescription,
  SettingTitle,
  SheetContainer,
  SheetParams,
} from '../../../../../components/styled/Containers';
import Button from '../../../../../components/button/Button';
import {useTranslation} from 'react-i18next';
import {LogActions} from '../../../../../store/log';
import {
  Action,
  Feather,
  LightBlack,
  Slate30,
  SlateDark,
  White,
} from '../../../../../styles/colors';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {Session} from '../../../../../store/bitpay-id/bitpay-id.models';
import {BitPayIdEffects} from '../../../../../store/bitpay-id';
import {
  getPasskeyCredentials,
  registerPasskey,
  removePasskey,
  getPasskeyStatus,
} from '../../../../../utils/passkey';
import {FlashList} from '@shopify/flash-list';
import DeleteConfirmationModal from '../../../../../navigation/wallet/components/DeleteConfirmationModal';
import PasskeyHeader from '../../../../../../assets/img/passkey-header.svg';
import PasskeyPersonSetup from '../../../../../../assets/img/passkey-person-setup.svg';
import {showBottomNotificationModal} from '../../../../../store/app/app.actions';
import {
  setPasskeyStatus,
  setPasskeyCredentials,
} from '../../../../../store/bitpay-id/bitpay-id.actions';
import Settings from '../../../../../components/settings/Settings';
import SheetModal from '../../../../../components/modal/base/sheet/SheetModal';
import {TouchableOpacity} from '../../../../../components/base/TouchableOpacity';
import {BaseText} from '../../../../../components/styled/Text';
import {useOngoingProcess} from '../../../../../contexts';
import {logManager} from '../../../../../managers/LogManager';

const ScrollContainer = styled.ScrollView``;

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
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
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

const CardIntro = styled.View`
  margin: 15px ${ScreenGutter};
  border-width: 1px;
  border-color: ${({theme: {dark}}) => (dark ? LightBlack : Slate30)};
  border-radius: 8px;
  padding-bottom: 16px;
  background-color: transparent;
  gap: 25px;
`;

const TitleIntro = styled(BaseText)`
  padding: 16px;
  font-weight: 500;
  font-size: 16px;
  border-color: ${({theme: {dark}}) => (dark ? LightBlack : Slate30)};
  border-bottom-width: 1px;
`;

const RowIntro = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: 20px;
  margin-left: 20px;
  margin-right: 20px;
`;

const IconContainerIntro = styled.View`
  margin-right: 12px;
  margin-top: 2px;
`;

const DescriptionIntro = styled(BaseText)`
  flex: 1;
  font-size: 16px;
  line-height: 24px;
  font-weight: 400;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
`;

const PasskeyScreen: React.FC = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const {showOngoingProcess, hideOngoingProcess} = useOngoingProcess();
  const network = useAppSelector(({APP}) => APP.network);
  const session: Session = useAppSelector(({BITPAY_ID}) => BITPAY_ID.session);
  const user = useAppSelector(({BITPAY_ID}) => BITPAY_ID.user[network]);
  const _passkeyCredentials = useAppSelector(
    ({BITPAY_ID}) => BITPAY_ID.passkeyCredentials,
  );
  const [listPasskeyCredentials, setListPasskeyCredentials] =
    useState(_passkeyCredentials);
  const [isVisible, setIsVisible] = useState(false);
  const [passkeyId, setPasskeyId] = useState<string>('');
  const [showOptions, setShowOptions] = useState(false);
  const [fetchingCredentials, setFetchingCredentials] = useState(false);

  useLayoutEffect(() => {
    if (listPasskeyCredentials && listPasskeyCredentials.length > 0) {
      navigation.setOptions({
        headerRight: () => <Settings onPress={() => setShowOptions(true)} />,
      });
    }
  }, [navigation, listPasskeyCredentials]);

  const createPasskey = useCallback(async () => {
    setShowOptions(false);
    if (listPasskeyCredentials && listPasskeyCredentials.length > 4) {
      logManager.warn('[PasskeyScreen] Reached max number of passkeys'),
        dispatch(
          showBottomNotificationModal({
            type: 'warning',
            title: t("Couldn't create a new Passkey"),
            message: t('You reached max number of passkeys.'),
            enableBackdropDismiss: true,
            actions: [
              {
                text: t('OK'),
                action: () => {},
              },
            ],
          }),
        );
      return;
    }
    if (!user || !session?.isAuthenticated) {
      logManager.warn(
        '[PasskeyScreen] User not authenticated. Redirecting to login.',
      );
      navigateToLogin();
      return;
    }
    if (user && !user.verified) {
      logManager.warn('[PasskeyScreen] Email address not verified');
      // TODO: check that user data is updated before redirecting to verify email screen
      //navigation.navigate('VerifyEmail');
      return;
    }
    showOngoingProcess('CREATING_PASSKEY');
    try {
      const registeredPasskey = await registerPasskey(
        user.email,
        network,
        session.csrfToken,
      );
      logManager.info(
        '[PasskeyScreen] Passkey created: ',
        JSON.stringify(registeredPasskey),
      );
      dispatch(setPasskeyStatus(registeredPasskey));
      const {credentials} = await getPasskeyCredentials(
        user.email,
        network,
        session.csrfToken,
      );
      dispatch(setPasskeyCredentials(credentials));
      setListPasskeyCredentials(credentials);
      hideOngoingProcess();
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
    } catch (err: any) {
      dispatch(setPasskeyStatus(false));
      hideOngoingProcess();
      const errMessage = err.message || JSON.stringify(err);
      logManager.error('[PasskeyScreen] ', errMessage);
      if (err.error === 'Unauthorized') {
        dispatch(
          showBottomNotificationModal({
            type: 'warning',
            title: t('User not authorized'),
            message: t('Please, log in again.'),
            enableBackdropDismiss: true,
            actions: [
              {
                text: t('OK'),
                action: () => {
                  navigateToLogin();
                },
              },
            ],
          }),
        );
        return;
      } else if (
        err.error !== 'UserCancelled' &&
        !errMessage.includes('error 1001')
      ) {
        dispatch(
          showBottomNotificationModal({
            type: 'error',
            title: t('Error creating passkey'),
            message: errMessage,
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
    }
  }, [user, listPasskeyCredentials]);

  useEffect(() => {
    dispatch(BitPayIdEffects.startFetchSession());
  }, []);

  const fetchCredentials = useCallback(async () => {
    if (!user || fetchingCredentials) {
      return;
    }
    setFetchingCredentials(true);
    try {
      if (session?.isAuthenticated) {
        const {passkey} = await getPasskeyStatus(
          user.email,
          network,
          session.csrfToken,
        );
        dispatch(setPasskeyStatus(passkey));
        const {credentials} = await getPasskeyCredentials(
          user.email,
          network,
          session.csrfToken,
        );
        dispatch(setPasskeyCredentials(credentials));
        setListPasskeyCredentials(credentials);
      } else {
        logManager.warn(
          '[PasskeyScreen] Session expired. Cannot create/delete passkey until user logs in.',
        );
      }
      setFetchingCredentials(false);
    } catch (err: any) {
      setFetchingCredentials(false);
      logManager.error('[PasskeyScreen] ', err);
    }
  }, [dispatch, user, fetchingCredentials, session, network]);

  useEffect(() => {
    fetchCredentials();
  }, [user]);

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

  const navigateToLogin = () => {
    navigation.navigate('Login');
  };

  const deletePasskey = async () => {
    setIsVisible(false);
    if (!user || !session?.isAuthenticated) {
      logManager.warn(
        '[PasskeyScreen] Cannot delete passkey because user not authenticated. Redirecting to login.',
      );
      navigateToLogin();
      return;
    }
    try {
      const {success} = await removePasskey(
        passkeyId,
        network,
        session.csrfToken,
      );
      if (success) {
        setPasskeyId('');
        fetchCredentials();
      }
    } catch (err: any) {
      logManager.error('[PasskeyScreen] ', err);
      dispatch(
        showBottomNotificationModal({
          type: 'error',
          title: t('Passkey'),
          message: t('Error deleting Passkey. Please, try again later.'),
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

  return (
    <SettingsContainer>
      <ScrollContainer>
        {user &&
          listPasskeyCredentials &&
          listPasskeyCredentials.length === 0 && (
            <CardIntro>
              <TitleIntro>{t('Setup a passkey')}</TitleIntro>
              <RowIntro>
                <IconContainerIntro>
                  <PasskeyPersonSetup width={36} height={36} />
                </IconContainerIntro>
                <DescriptionIntro>
                  Passkeys are encrypted digital keys you create using your
                  fingerprint, face, or screen lock.
                </DescriptionIntro>
              </RowIntro>
              <Button
                style={{width: '90%', marginLeft: 20}}
                height={50}
                buttonStyle={'primary'}
                onPress={createPasskey}>
                Create a Passkey
              </Button>
            </CardIntro>
          )}
        {user &&
          listPasskeyCredentials &&
          listPasskeyCredentials.length > 0 && (
            <>
              <FlashList
                renderItem={renderPasskey}
                data={listPasskeyCredentials}
                keyExtractor={(item, index) => index.toString()}
              />
            </>
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
          <OptionContainer
            placement={'bottom'}
            disabled={listPasskeyCredentials.length > 4}
            onPress={createPasskey}>
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
