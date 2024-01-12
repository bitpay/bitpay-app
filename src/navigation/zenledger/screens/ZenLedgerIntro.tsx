import React, {useLayoutEffect} from 'react';
import styled from 'styled-components/native';
import {
  ActiveOpacity,
  ScreenGutter,
} from '../../../components/styled/Containers';
import {Black, LightBlack, SlateDark, White} from '../../../styles/colors';
import Button from '../../../components/button/Button';
import {
  H4,
  HeaderTitle,
  Link,
  Paragraph,
  TextAlign,
} from '../../../components/styled/Text';
import {useTranslation} from 'react-i18next';
import {Platform, TouchableOpacity, View} from 'react-native';
import {useAppDispatch} from '../../../utils/hooks';
import {
  dismissBottomNotificationModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import haptic from '../../../components/haptic-feedback/haptic';
import {Analytics} from '../../../store/analytics/analytics.effects';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import ZenLedgerLogo from '../components/ZenLedgerLogo';
import Back from '../../../components/back/Back';
import {openUrlWithInAppBrowser} from '../../../store/app/app.effects';
import {useTheme} from 'styled-components/native';
import LinkIcon from '../../../components/icons/link-icon/LinkIcon';

const ZenLedgerIntroContainer = styled.View`
  border-radius: 10px;
  padding: ${ScreenGutter};
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const ZenLedgerBottomContainer = styled.View`
  background-color: ${({theme}) => (theme?.dark ? LightBlack : White)};
  bottom: 0px;
  height: 200px;
  width: 100%;
  border-radius: 20px;
  justify-content: center;
  align-items: center;
  padding: ${ScreenGutter};
`;

const ZenLedgerDescription = styled(Paragraph)`
  color: ${({theme}) => (theme?.dark ? White : SlateDark)};
  margin: 10px 0;
  text-align: center;
`;

const ZenLedgerLogoContainer = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: center;
  margin: 16px 0;
`;

const ZenLedgerBackground = styled(LinearGradient).attrs(({theme}) => ({
  colors: theme.dark ? [Black, Black] : ['#FFFFFF', 'rgba(0, 133, 102, 0.05)'],
  start: {x: 0, y: 0},
  end: {x: 0, y: 0},
}))`
  flex: 1;
`;

const LinkCointainer = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;
const ZenLedgerIntro: React.VFC = () => {
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
          style={{marginLeft: Platform.OS === 'android' ? 10 : 0}}
          activeOpacity={ActiveOpacity}
          onPress={() => {
            navigation.goBack();
          }}>
          <Back color={White} background={LightBlack} opacity={1} />
        </TouchableOpacity>
      ),
      headerTitle: () => <HeaderTitle>{t('ZenLedger')}</HeaderTitle>,
    });
  }, [navigation, t]);

  return (
    <ZenLedgerBackground>
      <ZenLedgerIntroContainer>
        <ZenLedgerLogoContainer>
          <ZenLedgerLogo />
        </ZenLedgerLogoContainer>

        <TextAlign align={'center'}>
          <H4>{t('Be Prepared for Tax Season')}</H4>
        </TextAlign>
        <View>
          <ZenLedgerDescription>
            {t(
              'ZenLedger makes crypto taxes easy. Log In or Create your ZenLedger Account and BitPay will import your wallets for you.',
            )}
          </ZenLedgerDescription>
          <View style={{marginTop: 16}}>
            <Button onPress={onContinue} buttonStyle="secondary">
              {t('Import Wallet')}
            </Button>
          </View>
        </View>
      </ZenLedgerIntroContainer>
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
            dispatch(openUrlWithInAppBrowser('https://app.zenledger.io/login'));
          }}>
          <Link style={{fontWeight: 'bold', marginRight: 2}}>
            {t('Visit ZenLedger')}
          </Link>
          <LinkIcon />
        </LinkCointainer>
      </ZenLedgerBottomContainer>
    </ZenLedgerBackground>
  );
};

export default ZenLedgerIntro;
