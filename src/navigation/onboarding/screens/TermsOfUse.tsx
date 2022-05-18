import {StackActions, useNavigation} from '@react-navigation/native';
import {StackScreenProps} from '@react-navigation/stack';
import React, {ReactElement, useLayoutEffect, useState} from 'react';
import {Linking, ScrollView} from 'react-native';
import {useAndroidBackHandler} from 'react-navigation-backhandler';
import {useDispatch} from 'react-redux';
import styled from 'styled-components/native';
import Button from '../../../components/button/Button';
import {CtaContainerAbsolute} from '../../../components/styled/Containers';
import {HeaderTitle, Link, Paragraph} from '../../../components/styled/Text';
import {URL} from '../../../constants';
import {setOnboardingCompleted} from '../../../store/app/app.actions';
import {setWalletTermsAccepted} from '../../../store/wallet/wallet.actions';
import {Key} from '../../../store/wallet/wallet.models';
import TermsBox from '../components/TermsBox';
import {OnboardingStackParamList} from '../OnboardingStack';

type TermsOfUseScreenProps = StackScreenProps<
  OnboardingStackParamList,
  'TermsOfUse'
>;

export interface TermsOfUseParamList {
  context?: 'TOUOnly';
  key?: Key;
}

export interface TermsOfUseModel {
  id: number;
  statement: ReactElement;
}

const StatementText = styled(Paragraph)`
  color: ${({theme}) => theme.colors.text};
`;

const StatementTextUnderline = styled(Paragraph)`
  color: ${({theme}) => theme.colors.text};
  text-decoration: underline;
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
const Terms: Array<TermsOfUseModel> = [
  {
    id: 1,
    statement: (
      <StatementText>
        My funds are held and controlled on this device.{' '}
        <StatementTextUnderline>
          BitPay has no custody, access or control over my funds
        </StatementTextUnderline>
        .
      </StatementText>
    ),
  },
  {
    id: 2,
    statement: (
      <StatementText>
        <StatementTextBold>
          BitPay can never recover my funds for me.
        </StatementTextBold>{' '}
        <StatementTextUnderline>
          It is my responsibility to save and maintain the 12-word recovery
          phrase
        </StatementTextUnderline>
        . Using my 12-word phrase is the only way to recover my funds if this
        app is deleted or the device is lost.{' '}
        <StatementTextUnderline>
          If I lose my recovery phrase, it can’t be recovered
        </StatementTextUnderline>
        .
      </StatementText>
    ),
  },
  {
    id: 3,
    statement: (
      <StatementText>
        I have read, understood and accepted the{' '}
        <StatementLink onPress={() => Linking.openURL(URL.TOU_WALLET)}>
          Wallet Terms of Use.
        </StatementLink>
      </StatementText>
    ),
  },
];

const TermsOfUseContainer = styled.SafeAreaView`
  position: relative;
  flex: 1;
`;

// need padding-bottom for the CTA
const TermsContainer = styled.View`
  padding: 20px 10px 100px;
`;

const TermsOfUse: React.FC<TermsOfUseScreenProps> = ({route}) => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const {key, context} = route.params || {};
  const [agreed, setAgreed] = useState<number[]>([]);
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
      headerTitle: () => <HeaderTitle>Important</HeaderTitle>,
      headerLeft: () => null,
      headerRight: () => null,
    });
  }, [navigation]);

  useAndroidBackHandler(() => true);
  const setChecked = (id: number) => {
    setAgreed([...agreed, id]);
  };

  return (
    <TermsOfUseContainer>
      <ScrollView>
        <TermsContainer>
          <StatementText>I understand that:</StatementText>
          {termsList.map((term: TermsOfUseModel) => {
            return <TermsBox term={term} emit={setChecked} key={term.id} />;
          })}
        </TermsContainer>
      </ScrollView>

      <CtaContainerAbsolute>
        <Button
          onPress={() => {
            if (agreed.length >= 2) {
              dispatch(setWalletTermsAccepted());
            }
            if (key) {
              navigation.dispatch(
                StackActions.replace('Wallet', {
                  screen: 'KeyOverview',
                  params: {id: key.id},
                }),
              );
            } else {
              navigation.navigate('Tabs', {screen: 'Home'});
            }
            dispatch(setOnboardingCompleted());
          }}
          buttonStyle={'primary'}
          disabled={agreed.length !== termsList.length}>
          Agree and Continue
        </Button>
      </CtaContainerAbsolute>
    </TermsOfUseContainer>
  );
};

export default TermsOfUse;
