import {CommonActions} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {ReactElement, useLayoutEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {DeviceEventEmitter, Linking, ScrollView} from 'react-native';
import {useAndroidBackHandler} from 'react-navigation-backhandler';
import styled from 'styled-components/native';
import Button from '../../../components/button/Button';
import {CtaContainerAbsolute} from '../../../components/styled/Containers';
import {HeaderTitle, Link, Paragraph} from '../../../components/styled/Text';
import {URL} from '../../../constants';
import {setOnboardingCompleted} from '../../../store/app/app.actions';
import {setWalletTermsAccepted} from '../../../store/wallet/wallet.actions';
import {Key} from '../../../store/wallet/wallet.models';
import TermsBox from '../components/TermsBox';
import {DeviceEmitterEvents} from '../../../constants/device-emitter-events';
import {
  useAppDispatch,
  useRequestTrackingPermissionHandler,
} from '../../../utils/hooks';
import {
  WalletGroupParamList,
  WalletScreens,
} from '../../../navigation/wallet/WalletGroup';
import {RootStacks} from '../../../Root';
import {TabsScreens} from '../../../navigation/tabs/TabsStack';
import {sleep} from '../../../utils/helper-methods';

type TermsOfUseScreenProps = NativeStackScreenProps<
  WalletGroupParamList,
  WalletScreens.TERMS_OF_USE
>;

export interface TermsOfUseParamList {
  context?: 'TOUOnly';
  key?: Key;
}

export interface TermsOfUseModel {
  id: number;
  statement: ReactElement;
  accessibilityLabel: string;
}

const StatementText = styled(Paragraph)`
  color: ${({theme}) => theme.colors.text};
`;

const StatementTextUnderline = styled(Paragraph)`
  color: ${({theme}) => theme.colors.text};
  text-decoration: underline;
  text-decoration-color: ${({theme}) => theme.colors.text};
`;

const StatementTextBold = styled(Paragraph)`
  color: ${({theme}) => theme.colors.text};
  font-weight: 500;
`;

const StatementLink = styled(Link)`
  font-size: 16px;
  font-style: normal;
  line-height: 25px;
  letter-spacing: 0;
`;

const TermsOfUseContainer = styled.SafeAreaView`
  position: relative;
  flex: 1;
`;

// need padding-bottom for the CTA
const TermsContainer = styled.View`
  padding: 20px 10px 100px;
`;

const TermsOfUse: React.FC<TermsOfUseScreenProps> = ({route, navigation}) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const {key, context} = route.params || {};
  const [agreed, setAgreed] = useState<number[]>([]);

  const askForTrackingThenNavigate = useRequestTrackingPermissionHandler();

  const Terms: Array<TermsOfUseModel> = [
    {
      id: 1,
      statement: (
        <StatementText>
          {t('My funds are held and controlled on this device.')}{' '}
          <StatementTextUnderline>
            {t('BitPay has no custody, access or control over my funds')}
          </StatementTextUnderline>
          .
        </StatementText>
      ),
      accessibilityLabel: 'first-term-checkbox',
    },
    {
      id: 2,
      statement: (
        <StatementText>
          <StatementTextBold>
            {t('BitPay can never recover my funds for me.')}
          </StatementTextBold>{' '}
          <StatementTextUnderline>
            {t(
              'It is my responsibility to save and maintain the 12-word recovery phrase',
            )}
          </StatementTextUnderline>
          {t(
            '. Using my 12-word phrase is the only way to recover my funds if this app is deleted or the device is lost.',
          )}{' '}
          <StatementTextUnderline>
            {t('If I lose my recovery phrase, it can’t be recovered')}
          </StatementTextUnderline>
          .
        </StatementText>
      ),
      accessibilityLabel: 'second-term-checkbox',
    },
    {
      id: 3,
      statement: (
        <StatementText>
          {t('I have read, understood and accepted the')}{' '}
          <StatementLink onPress={() => Linking.openURL(URL.TOU_WALLET)}>
            {t('Wallet Terms of Use.')}
          </StatementLink>
        </StatementText>
      ),
      accessibilityLabel: 'third-term-checkbox',
    },
  ];
  const [termsList] = useState(() => {
    if (context === 'TOUOnly') {
      return Terms.filter(term => term.id === 3);
    } else if (key) {
      return Terms.filter(term => term.id !== 3);
    }

    return Terms;
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerTitle: () => <HeaderTitle>{t('Important')}</HeaderTitle>,
      headerLeft: () => null,
      headerRight: () => null,
    });
  }, [navigation, t]);

  useAndroidBackHandler(() => true);

  const setChecked = (id: number) => {
    if (id > 0) {
      setAgreed(prev => (prev.includes(id) ? prev : [...prev, id]));
    } else {
      const positiveId = Math.abs(id);
      setAgreed(prev => prev.filter(agreedId => agreedId !== positiveId));
    }
  };

  return (
    <TermsOfUseContainer accessibilityLabel="terms-of-use-container">
      <ScrollView>
        <TermsContainer>
          <StatementText>{t('I understand that:')}</StatementText>
          {termsList.map((term: TermsOfUseModel) => {
            return <TermsBox term={term} emit={setChecked} key={term.id} />;
          })}
        </TermsContainer>
      </ScrollView>

      <CtaContainerAbsolute accessibilityLabel="cta-container">
        <Button
          accessibilityLabel="agree-and-continue-button"
          onPress={() => {
            askForTrackingThenNavigate(async () => {
              if (agreed.length >= 2) {
                dispatch(setWalletTermsAccepted());
              }
              navigation.dispatch(
                CommonActions.reset({
                  routes: [
                    {
                      name: RootStacks.TABS,
                      params: {
                        screen: TabsScreens.HOME,
                      },
                    },
                  ],
                }),
              );
              await sleep(1000);
              dispatch(setOnboardingCompleted());
              DeviceEventEmitter.emit(
                DeviceEmitterEvents.APP_ONBOARDING_COMPLETED,
              );
            });
          }}
          buttonStyle={'primary'}
          disabled={agreed.length !== termsList.length}>
          {t('Agree and Continue')}
        </Button>
      </CtaContainerAbsolute>
    </TermsOfUseContainer>
  );
};

export default TermsOfUse;
