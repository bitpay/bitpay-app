import React, {useState} from 'react';
import {
  CtaContainerAbsolute,
  HeaderTitleContainer,
} from '../../../components/styled/Containers';
import {H3} from '../../../components/styled/Text';
import TermsBox from '../components/TermsBox';
import Button from '../../../components/button/Button';
import styled from 'styled-components/native';
import {StackScreenProps} from '@react-navigation/stack';
import {OnboardingStackParamList} from '../OnboardingStack';
import {useNavigation} from '@react-navigation/native';

type Props = StackScreenProps<OnboardingStackParamList, 'TermsOfUse'>;

interface Term {
  id: number;
  statement: string;
  acknowledgement?: string;
  link?: {
    text: string;
    url: string;
  };
}

let Terms: Array<Term> = [
  {
    id: 1,
    statement: 'Your funds are in are in your custody',
    acknowledgement:
      'I understand that my funds are held and controled on this device, not by a company.',
  },
  {
    id: 2,
    statement:
      'BitPay cannot recover your funds if you don’t set up a recovery key or if you lose your key',
    acknowledgement:
      'I understand that if this app is moved to another device or deleted, my crypto funds can only be recovered with the recovery phrase.',
  },
  {
    id: 3,
    statement: 'I have read, understood, and agree with the Terms of Use',
    link: {
      text: 'View the complete Terms of Use',
      url: 'https://bitpay.com',
    },
  },
];

const TermsOfUseContainer = styled.SafeAreaView`
  position: relative;
  flex: 1;
`;

const TermsOfUse = ({navigation: _navigation, route}: Props) => {
  const navigation = useNavigation();

  const [termsList, setTermsList] = useState(Terms);
  _navigation.addListener('transitionStart', () => {
    if (route?.params?.context === 'skip') {
      setTermsList(termsList.filter(term => term.id === 3));
    }
  });

  const [agreed, setAgreed] = useState<number[]>([]);
  const setChecked = (id: number) => {
    setAgreed([...agreed, id]);
  };

  return (
    <TermsOfUseContainer>
      <HeaderTitleContainer>
        <H3>Terms of Use</H3>
        {termsList.map((term: Term, index: number) => {
          return <TermsBox term={term} emit={setChecked} key={index} />;
        })}
      </HeaderTitleContainer>
      <CtaContainerAbsolute>
        <Button
          onPress={() => navigation.navigate('Tabs')}
          buttonStyle={'primary'}
          disabled={agreed.length !== termsList.length}>
          Agree and Continue
        </Button>
      </CtaContainerAbsolute>
    </TermsOfUseContainer>
  );
};

export default TermsOfUse;
