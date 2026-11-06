import React, {useLayoutEffect, useState} from 'react';
import {HeaderTitle, H5, Paragraph} from '../../../components/styled/Text';
import {useNavigation, useRoute} from '@react-navigation/native';
import {CommonActions, RouteProp} from '@react-navigation/core';
import {WalletGroupParamList} from '../WalletGroup';
import {SafeAreaView, StyleSheet} from 'react-native';
import {useAndroidBackHandler} from 'react-navigation-backhandler';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {ScreenGutter} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import {sleep} from '../../../utils/helper-methods';
import {
  deleteKey,
  updatePortfolioBalance,
} from '../../../store/wallet/wallet.actions';
import useAppSelector from '../../../utils/hooks/useAppSelector';
import {setHomeCarouselConfig} from '../../../store/app/app.actions';
import {unsubscribeKeyNotifications} from '../../../store/app/keyNotifications.effects';
import {cancelTSSCeremony} from '../../../store/wallet/effects/create-multisig/create-multisig';
import {useTranslation} from 'react-i18next';
import {useAppDispatch, useMount} from '../../../utils/hooks';
import {RootStacks} from '../../../Root';
import {TabsScreens} from '../../../navigation/tabs/TabsStack';
import {useOngoingProcess} from '../../../contexts';
import {ResultView} from '../../../components/backup/ResultView';

const gutter = parseInt(ScreenGutter, 10);

const styles = StyleSheet.create({
  deleteKeyContainer: {
    flex: 1,
  },
  scrollView: {
    marginTop: 20,
    paddingHorizontal: gutter,
  },
  title: {
    color: '#ce334b',
  },
  deleteKeyParagraph: {
    marginTop: 15,
    marginHorizontal: 0,
    marginBottom: 20,
  },
});

const DeleteKeyContainer: React.FC<
  React.ComponentProps<typeof SafeAreaView>
> = ({style, ...rest}) => (
  <SafeAreaView style={[styles.deleteKeyContainer, style]} {...rest} />
);

const ScrollView: React.FC<
  React.ComponentProps<typeof KeyboardAwareScrollView>
> = ({style, ...rest}) => (
  <KeyboardAwareScrollView style={[styles.scrollView, style]} {...rest} />
);

const Title: React.FC<React.ComponentProps<typeof H5>> = ({style, ...rest}) => (
  <H5 style={[styles.title, style]} {...rest} />
);

const DeleteKeyParagraph: React.FC<React.ComponentProps<typeof Paragraph>> = ({
  style,
  ...rest
}) => <Paragraph style={[styles.deleteKeyParagraph, style]} {...rest} />;

const DeleteKey = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const {showOngoingProcess, hideOngoingProcess} = useOngoingProcess();
  const homeCarouselConfig = useAppSelector(({APP}) => APP.homeCarouselConfig);
  const keys = useAppSelector(({WALLET}) => WALLET.keys);

  const {
    params: {keyId, confirmed},
  } = useRoute<RouteProp<WalletGroupParamList, 'DeleteKey'>>();
  const [keyName] = useState(() => keys[keyId]?.keyName || '');
  const [deleted, setDeleted] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions(
      confirmed
        ? {
            headerTitle: () => null,
            headerLeft: () => null,
            gestureEnabled: false,
          }
        : {headerTitle: () => <HeaderTitle>{t('Delete Key')}</HeaderTitle>},
    );
  });

  const goHome = () =>
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

  const removeKey = async () => {
    dispatch(cancelTSSCeremony(keyId));
    showOngoingProcess('DELETING_KEY');

    await sleep(300);
    dispatch(unsubscribeKeyNotifications(keyId));
    dispatch(deleteKey({keyId}));

    dispatch(
      setHomeCarouselConfig(
        homeCarouselConfig.filter(item => item.id !== keyId),
      ),
    );
    dispatch(updatePortfolioBalance());
    hideOngoingProcess();
  };

  useMount(() => {
    if (confirmed) {
      removeKey().then(() => setDeleted(true));
    }
  });

  useAndroidBackHandler(() => {
    if (!confirmed) {
      return false;
    }
    if (deleted) {
      goHome();
    }
    return true;
  });

  const [isVisible, setIsVisible] = useState(false);
  const startDeleteKey = async () => {
    setIsVisible(false);
    await sleep(500);
    await removeKey();
    await sleep(1000);
    goHome();
  };

  if (confirmed) {
    return deleted ? (
      <ResultView
        title={t('Key deleted')}
        message={t('{{keyName}} has been removed from this phone.', {
          keyName,
        })}
        primary={t('Done')}
        onPrimary={goHome}
      />
    ) : null;
  }

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
