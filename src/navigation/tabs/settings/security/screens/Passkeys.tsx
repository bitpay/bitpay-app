import React, {useCallback, useEffect, useLayoutEffect, useState} from 'react';
import {useNavigation} from '@react-navigation/native';
import {ScrollView, StyleSheet, View} from 'react-native';
import {useTheme} from '../../../../../contexts';
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

const styles = StyleSheet.create({
  passkeyBoxContainer: {
    marginVertical: 20,
    marginHorizontal: parseInt(ScreenGutter, 10),
    paddingHorizontal: parseInt(ScreenGutter, 10),
    borderWidth: 1,
    borderRadius: 10,
  },
  iconContainer: {
    marginTop: 10,
  },
  passkeyTitleContainer: {
    marginTop: 20,
    marginRight: 0,
    marginBottom: 10,
    marginLeft: 5,
  },
  passkeyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  passkeyDescription: {
    fontSize: 14,
    marginTop: 5,
    marginBottom: 10,
  },
  optionContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  optionTextContainer: {
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    flexDirection: 'column',
    marginHorizontal: 25,
  },
  optionTitleText: {
    fontStyle: 'normal',
    fontWeight: '500',
    fontSize: 18,
    lineHeight: 28,
  },
  optionIconContainer: {
    justifyContent: 'center',
    width: 24,
  },
  cardIntro: {
    marginVertical: 15,
    marginHorizontal: parseInt(ScreenGutter, 10),
    borderWidth: 1,
    borderRadius: 8,
    paddingBottom: 16,
    backgroundColor: 'transparent',
    gap: 25,
  },
  titleIntro: {
    padding: 16,
    fontWeight: '500',
    fontSize: 16,
    borderBottomWidth: 1,
  },
  rowIntro: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginLeft: 20,
    marginRight: 20,
  },
  iconContainerIntro: {
    marginRight: 12,
    marginTop: 2,
  },
  descriptionIntro: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
});

const ScrollContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof ScrollView>) => (
  <ScrollView style={style} {...rest} />
);

const PasskeyBoxContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.passkeyBoxContainer,
        {borderColor: theme.dark ? LightBlack : Feather},
        style,
      ]}
      {...rest}
    />
  );
};

const IconContainer = ({style, ...rest}: React.ComponentProps<typeof View>) => (
  <View style={[styles.iconContainer, style]} {...rest} />
);

const PasskeyTitleContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.passkeyTitleContainer, style]} {...rest} />
);

const PasskeyTitle = ({
  style,
  ...rest
}: React.ComponentProps<typeof SettingTitle>) => (
  <SettingTitle style={[styles.passkeyTitle, style]} {...rest} />
);

const PasskeyDescription = ({
  style,
  ...rest
}: React.ComponentProps<typeof SettingDescription>) => {
  const theme = useTheme();
  return (
    <SettingDescription
      style={[
        styles.passkeyDescription,
        {color: theme.dark ? Slate30 : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

const OptionContainer = ({
  placement,
  style,
  ...rest
}: SheetParams & React.ComponentProps<typeof TouchableOpacity>) => (
  <TouchableOpacity
    style={[
      styles.optionContainer,
      placement === 'top' ? {paddingTop: 41} : {paddingBottom: 41},
      style,
    ]}
    {...rest}
  />
);

const OptionTextContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.optionTextContainer, style]} {...rest} />
);

const OptionTitleText = ({
  style,
  ...rest
}: React.ComponentProps<typeof BaseText>) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.optionTitleText,
        {color: theme.dark ? White : Action},
        style,
      ]}
      {...rest}
    />
  );
};

const OptionIconContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.optionIconContainer, style]} {...rest} />
);

const CardIntro = ({style, ...rest}: React.ComponentProps<typeof View>) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.cardIntro,
        {borderColor: theme.dark ? LightBlack : Slate30},
        style,
      ]}
      {...rest}
    />
  );
};

const TitleIntro = ({
  style,
  ...rest
}: React.ComponentProps<typeof BaseText>) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.titleIntro,
        {borderColor: theme.dark ? LightBlack : Slate30},
        style,
      ]}
      {...rest}
    />
  );
};

const RowIntro = ({style, ...rest}: React.ComponentProps<typeof View>) => (
  <View style={[styles.rowIntro, style]} {...rest} />
);

const IconContainerIntro = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.iconContainerIntro, style]} {...rest} />
);

const DescriptionIntro = ({
  style,
  ...rest
}: React.ComponentProps<typeof BaseText>) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.descriptionIntro,
        {color: theme.dark ? Slate30 : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

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

  const loginRequired = () => {
    return !user || !session || !session?.isAuthenticated;
  };

  const createPasskey = async () => {
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
    const isAuthorized = await checkUserAuthorized();
    if (!isAuthorized) {
      return;
    }

    if (user && !user.verified) {
      logManager.warn('[PasskeyScreen] Email address not verified');
      // TODO: check that user data is updated before redirecting to verify email screen
      //navigation.navigate('VerifyEmail');
      return;
    }
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
      showOngoingProcess('CREATING_PASSKEY');
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
  };

  useEffect(() => {
    dispatch(BitPayIdEffects.startFetchSession());
  }, []);

  const fetchCredentials = useCallback(async () => {
    if (loginRequired() || fetchingCredentials) {
      return;
    }
    setFetchingCredentials(true);
    try {
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

  const checkUserAuthorized = async (): Promise<boolean> => {
    if (!user?.email) {
      return Promise.resolve(false);
    }
    if (loginRequired()) {
      logManager.warn(
        '[PasskeyScreen] This action requires authorization. Trying to login...',
      );
      if (listPasskeyCredentials && listPasskeyCredentials.length > 0) {
        const userLoggedIn = await dispatch(
          BitPayIdEffects.startLogin({email: user.email}),
        );
        return Promise.resolve(userLoggedIn);
      } else {
        navigateToLogin();
        return Promise.resolve(false);
      }
    }
    return Promise.resolve(true);
  };

  const deletePasskey = async () => {
    setIsVisible(false);
    const isAuthorized = await checkUserAuthorized();
    if (!isAuthorized) {
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
        dispatch(
          showBottomNotificationModal({
            type: 'success',
            title: t('Passkey'),
            message: t('Passkey has been removed successfully.'),
            enableBackdropDismiss: true,
            actions: [
              {
                text: t('OK'),
                action: () => {
                  fetchCredentials();
                },
              },
            ],
          }),
        );
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
              <TitleIntro>{t('Create a passkey')}</TitleIntro>
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
