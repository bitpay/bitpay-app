import React from 'react';
import styled from 'styled-components/native';
import {ScreenGutter} from '../../../components/styled/Containers';
import {SlateDark, White} from '../../../styles/colors';
import Button from '../../../components/button/Button';
import {H4, Link, Paragraph, TextAlign} from '../../../components/styled/Text';
import {useTranslation} from 'react-i18next';
import {View} from 'react-native';
import {useAppDispatch} from '../../../utils/hooks';
import {
  dismissBottomNotificationModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import haptic from '../../../components/haptic-feedback/haptic';
import {Analytics} from '../../../store/analytics/analytics.effects';
import LinkIcon from '../../../../assets/img/zenledger/link.svg';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import ZenLedgerLogo from '../components/ZenLedgerLogo';

const ZenLedgerIntroContainer = styled.View`
  border-radius: 10px;
  padding: ${ScreenGutter};
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const ZenLedgerBottomContainer = styled.View`
  background-color: ${({theme}) => (theme?.dark ? SlateDark : White)};
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
  colors: theme.dark
    ? ['#606060', '#26272A']
    : ['#FFFFFF', 'rgba(0, 133, 102, 0.05)'],
  start: {x: 0, y: 0},
  end: {x: 0, y: 0},
}))`
  flex: 1;
`;

export interface ZenLedgerIntroParamList {}

const ZenLedgerIntro: React.VFC<ZenLedgerIntroParamList> = props => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const onContinue = () => {
    haptic('impactLight');
    dispatch(Analytics.track('Clicked ZenLedger Continue'));
    dispatch(
      showBottomNotificationModal({
        type: 'warning',
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
              navigation.navigate('ZenLedger', {screen: 'ZenLedgerImport'});
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
        <Link style={{fontWeight: 'bold'}}>
          {t('Visit ZenLedger')} <LinkIcon />
        </Link>
      </ZenLedgerBottomContainer>
    </ZenLedgerBackground>
  );
};

export default ZenLedgerIntro;
