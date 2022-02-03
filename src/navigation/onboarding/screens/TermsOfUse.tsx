import {StackActions, useNavigation} from '@react-navigation/native';
import {StackScreenProps} from '@react-navigation/stack';
import React, {useLayoutEffect, useState} from 'react';
import {ScrollView} from 'react-native';
import {useAndroidBackHandler} from 'react-navigation-backhandler';
import {useDispatch} from 'react-redux';
import styled from 'styled-components/native';
import Button from '../../../components/button/Button';
import {CtaContainerAbsolute} from '../../../components/styled/Containers';
import {HeaderTitle} from '../../../components/styled/Text';
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

interface Term {
  id: number;
  statement: string;
  acknowledgement?: string;
  link?: {
    text: string;
    url: string;
  };
}

const Terms: Array<Term> = [
  {
    id: 1,
    statement: 'Your funds are in your custody',
    acknowledgement:
      'I understand that my funds are held and controlled on this device, not by a company.',
  },
  {
    id: 2,
    statement:
      "BitPay cannot recover your funds if you don't set up a recovery wallet or if you lose your wallet",
    acknowledgement:
      'I understand that if this app is moved to another device or deleted, my crypto funds can only be recovered with the recovery phrase.',
  },
  {
    id: 3,
    statement: 'I have read, understood, and agree with the Terms of Use',
    link: {
      text: 'View the complete Terms of Use',
      url: 'https://bitpay.com/legal/terms-of-use/#wallet-terms-of-use',
    },
  },
];

const TermsOfUseContainer = styled.SafeAreaView`
  position: relative;
  flex: 1;
`;

// need padding-bottom for the CTA
const TermsContainer = styled.View`
  padding: 0 10px 100px;
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
      headerTitle: () => <HeaderTitle>Terms of Use</HeaderTitle>,
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
          {termsList.map((term: Term) => {
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
                  params: {key},
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
