import React, {useLayoutEffect} from 'react';
import {
  ActiveOpacity,
  ScreenGutter,
} from '../../../components/styled/Containers';
import {Black, LightBlack, SlateDark, White} from '../../../styles/colors';
import Button from '../../../components/button/Button';
import {H4, Link, Paragraph, TextAlign} from '../../../components/styled/Text';
import {useTranslation} from 'react-i18next';
import {Platform, View, SafeAreaView, StyleSheet} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {useAppDispatch} from '../../../utils/hooks';
import {
  dismissBottomNotificationModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import haptic from '../../../components/haptic-feedback/haptic';
import {Analytics} from '../../../store/analytics/analytics.effects';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation, useTheme} from '@react-navigation/native';
import ZenLedgerLogo from '../components/ZenLedgerLogo';
import Back from '../../../components/back/Back';
import {openUrlWithInAppBrowser} from '../../../store/app/app.effects';
import LinkIcon from '../../../components/icons/link-icon/LinkIcon';

const screenGutter = parseInt(ScreenGutter, 10);

const styles = StyleSheet.create({
  zenledgerContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  zenLedgerIntroContainer: {
    marginTop: 40,
    borderRadius: 10,
    padding: screenGutter,
    flex: 1,
  },
  zenLedgerBottomContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: screenGutter,
  },
  zenLedgerDescription: {
    marginVertical: 10,
    textAlign: 'center',
  },
  zenLedgerLogoContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 16,
  },
  zenLedgerBackground: {
    flex: 1,
  },
  linkCointainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const ZenLedgerBottomContainer = ({children}: {children: React.ReactNode}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.zenLedgerBottomContainer,
        {backgroundColor: theme?.dark ? LightBlack : White},
      ]}>
      {children}
    </View>
  );
};

const ZenLedgerDescription = ({children}: {children: React.ReactNode}) => {
  const theme = useTheme();
  return (
    <Paragraph
      style={[
        styles.zenLedgerDescription,
        {color: theme?.dark ? White : SlateDark},
      ]}>
      {children}
    </Paragraph>
  );
};

const ZenLedgerBackground = ({children}: {children: React.ReactNode}) => {
  const theme = useTheme();
  return (
    <LinearGradient
      colors={
        theme.dark ? [Black, Black] : ['#FFFFFF', 'rgba(0, 133, 102, 0.05)']
      }
      start={{x: 0, y: 0}}
      end={{x: 0, y: 0}}
      style={styles.zenLedgerBackground}>
      {children}
    </LinearGradient>
  );
};

const LinkCointainer = ({
  onPress,
  children,
}: {
  onPress?: () => void;
  children: React.ReactNode;
}) => (
  <TouchableOpacity onPress={onPress} style={styles.linkCointainer}>
    {children}
  </TouchableOpacity>
);
const ZenLedgerIntro: React.FC = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const theme = useTheme();
  const onContinue = () => {
    haptic('impactLight');
    dispatch(Analytics.track('Clicked ZenLedger Continue'));
    dispatch(
      showBottomNotificationModal({
        type: 'info',
        title: t('Connect to ZenLedger'),
        message: t(
          'After you create a ZenLedger account or log in with your existing account, BitPay will automatically send your Wallet Addresses to Zenledger to be imported.',
        ),
        enableBackdropDismiss: true,
        actions: [
          {
            text: t('GOT IT'),
            action: () => {
              haptic('impactLight');
              navigation.navigate('ZenLedgerImport');
            },
            primary: true,
          },
          {
            text: t('Cancel'),
            action: () => {
              dispatch(dismissBottomNotificationModal());
            },
          },
        ],
      }),
    );
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: {
        backgroundColor: theme.dark ? Black : 'rgba(0, 133, 102, 0.05)',
      },
      headerLeft: () => (
        <TouchableOpacity
          touchableLibrary={'react-native-gesture-handler'}
          style={{marginLeft: Platform.OS === 'android' ? 10 : 0}}
          activeOpacity={ActiveOpacity}
          onPress={() => {
            navigation.goBack();
          }}>
          <Back />
        </TouchableOpacity>
      ),
    });
  }, [navigation, t, theme.dark]);

  return (
    <SafeAreaView style={styles.zenledgerContainer}>
      <ZenLedgerBackground>
        <View style={styles.zenLedgerIntroContainer}>
          <View style={styles.zenLedgerLogoContainer}>
            <ZenLedgerLogo />
          </View>
          <View>
            <TextAlign align={'center'}>
              <H4>{t('Be Prepared for Tax Season')}</H4>
            </TextAlign>
            <ZenLedgerDescription>
              {t(
                'ZenLedger makes crypto taxes easy. Log In or Create your ZenLedger Account and BitPay will import your wallets for you.',
              )}
            </ZenLedgerDescription>
            <View style={{marginTop: 16}}>
              <Button
                onPress={onContinue}
                buttonStyle="secondary"
                children={t('Import Wallet')}
              />
            </View>
          </View>
        </View>
        <ZenLedgerBottomContainer>
          <TextAlign align={'center'}>
            <H4>{t('Already imported?')}</H4>
          </TextAlign>
          <ZenLedgerDescription>
            {t(
              'ZenLedger is best viewed on desktop or you can visit on mobile here.',
            )}
          </ZenLedgerDescription>
          <LinkCointainer
            onPress={() => {
              haptic('impactLight');
              dispatch(
                openUrlWithInAppBrowser('https://app.zenledger.io/login'),
              );
            }}>
            <Link style={{fontWeight: 'bold', marginRight: 2}}>
              {t('Visit ZenLedger')}
            </Link>
            <LinkIcon />
          </LinkCointainer>
        </ZenLedgerBottomContainer>
      </ZenLedgerBackground>
    </SafeAreaView>
  );
};

export default ZenLedgerIntro;
