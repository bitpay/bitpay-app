import Modal from 'react-native-modal';
import React from 'react';
import styled from 'styled-components/native';
import {H3, Paragraph, TextAlign} from '../../../components/styled/Text';
import {
  CtaContainer,
  TextContainer,
  TitleContainer,
  WIDTH,
} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';
import {RootState} from '../../../store';
import {useDispatch, useSelector} from 'react-redux';
import {AppActions} from '../../../store/app';
import {White} from '../../../styles/colors';

interface OnboardingFinishModalProps {
  id: string;
  title: string;
  description?: string;
  buttons: Array<{
    text: string;
    onPress: () => void;
  }>;
}

const OnboardingFinishModalContainer = styled.View`
  justify-content: center;
  align-items: center;
  width: ${WIDTH - 16}px;
  border-radius: 10px;
  padding: 20px;
  background: #ad4ff7; // TODO linear gradient
`;

const OnboardingFinishModal: React.FC = () => {
  const isVisible = useSelector(
    ({APP}: RootState) => APP.showOnboardingFinishModal,
  );
  const dispatch = useDispatch();
  const keys = useSelector(({WALLET}: RootState) => WALLET.keys);
  const modalType = keys.length ? 'addFunds' : 'createWallet';

  // TODO add navigation
  let OnboardingFinishModalTypes: {
    [key in string]: OnboardingFinishModalProps;
  } = {
    addFunds: {
      id: 'addFunds',
      title: "Let's add funds",
      description: 'To start using your assets, you will need to have crypto.',
      buttons: [
        {
          text: 'Buy Crypto',
          onPress: () => {
            dispatch(AppActions.setOnboardingCompleted())
            dispatch(AppActions.dismissOnboardingFinishModal());
          },
        },
        {
          text: 'Receive Crypto',
          onPress: () => {
            dispatch(AppActions.setOnboardingCompleted())
            dispatch(AppActions.dismissOnboardingFinishModal());
          },
        },
      ],
    },
    createWallet: {
      id: 'createWallet',
      title: "Let's create a wallet",
      description:
        'To start using the app, you need to have a wallet. You can create or import a wallet.',
      buttons: [
        {
          text: 'Create Wallet',
          onPress: () => {
            dispatch(AppActions.setOnboardingCompleted());
            dispatch(AppActions.dismissOnboardingFinishModal());
          },
        },
        {
          text: 'Import Wallet',
          onPress: () => {
            dispatch(AppActions.setOnboardingCompleted());
            dispatch(AppActions.dismissOnboardingFinishModal());
          },
        },
      ],
    },
  };

  return (
    <Modal
      isVisible={isVisible}
      backdropOpacity={0.4}
      animationIn={'fadeInUp'}
      animationOut={'fadeOutDown'}
      backdropTransitionOutTiming={0}
      hideModalContentWhileAnimating={true}
      useNativeDriverForBackdrop={true}
      useNativeDriver={true}
      style={{
        alignItems: 'center',
      }}>
      <OnboardingFinishModalContainer>
        <TitleContainer style={{marginTop: 10}}>
          <TextAlign align={'center'} style={{color: White}}>
            <H3>{OnboardingFinishModalTypes[modalType].title}</H3>
          </TextAlign>
        </TitleContainer>
        <TextContainer>
          <TextAlign align={'center'} style={{color: White}}>
            <Paragraph>
              {OnboardingFinishModalTypes[modalType].description}
            </Paragraph>
          </TextAlign>
        </TextContainer>
        <CtaContainer style={{marginTop: 10}}>
          <Button
            buttonStyle={'primary'}
            buttonType={'pill'}
            onPress={() =>
              OnboardingFinishModalTypes[modalType].buttons[0].onPress()
            }>
            {OnboardingFinishModalTypes[modalType].buttons[0].text}
          </Button>
          <Button
            buttonStyle={'primary'}
            buttonType={'pill'}
            onPress={() =>
              OnboardingFinishModalTypes[modalType].buttons[1].onPress()
            }>
            {OnboardingFinishModalTypes[modalType].buttons[1].text}
          </Button>
        </CtaContainer>
      </OnboardingFinishModalContainer>
    </Modal>
  );
};

export default OnboardingFinishModal;
