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
import LinearGradient from 'react-native-linear-gradient';
import haptic from '../../../components/haptic-feedback/haptic';
import {navigationRef} from '../../../Root';

interface OnboardingFinishModalProps {
  id: string;
  title: string;
  description?: string;
  buttons: Array<{
    text: string;
    onPress: () => void;
  }>;
}

const BackgroundGradient = styled(LinearGradient).attrs({
  colors: ['#AD4FF7', '#1A3B8B'],
  start: {x: 0, y: 0},
  end: {x: 0, y: 0},
  useAngle: true,
  angle: 225,
})`
  border-radius: 10px;
`;

const OnboardingFinishModalContainer = styled.View`
  justify-content: center;
  align-items: center;
  width: ${WIDTH - 16}px;
  padding: 20px;
`;

const OnboardingFinishModal: React.FC = () => {
  const isVisible = useSelector(
    ({APP}: RootState) => APP.showOnboardingFinishModal,
  );
  const dispatch = useDispatch();
  const keys = useSelector(({WALLET}: RootState) => WALLET.keys);
  const modalType = keys.length ? 'addFunds' : 'createWallet';
  const dismissModal = () => {
    haptic('impactLight');
    dispatch(AppActions.setOnboardingCompleted());
    dispatch(AppActions.dismissOnboardingFinishModal());
  };

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
            dismissModal();
            navigationRef.navigate('BuyCrypto', {screen: 'Root'});
          },
        },
        {
          text: 'Receive Crypto',
          onPress: () => {
            dismissModal();
            // TODO: navigationRef
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
            dismissModal();
            navigationRef.navigate('Home', {screen: 'SelectAssets'});
          },
        },
        {
          text: 'Import Wallet',
          onPress: () => {
            dismissModal();
             navigationRef.navigate('Home', {screen: 'ImportWallet'});
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
      <BackgroundGradient>
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
      </BackgroundGradient>
    </Modal>
  );
};

export default OnboardingFinishModal;
