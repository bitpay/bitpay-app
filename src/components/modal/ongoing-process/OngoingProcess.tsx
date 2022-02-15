import Modal from 'react-native-modal';
import React from 'react';
import {BaseText} from '../../styled/Text';
import styled from 'styled-components/native';
import {ActivityIndicator} from 'react-native';
import {RootState} from '../../../store';
import {useSelector} from 'react-redux';
import {LightBlack, SlateDark, White} from '../../../styles/colors';

export enum OnGoingProcessMessages {
  GENERAL_AWAITING = "Just a second, we're setting a few things up",
  CREATING_KEY = 'Creating Key',
  LOGGING_IN = 'Logging In',
  CREATING_ACCOUNT = 'Creating Account',
  IMPORTING = 'Importing',
  DELETING_KEY = 'Deleting Key',
  ADDING_WALLET = 'Adding Wallet',
  LOADING = 'Loading',
  FETCHING_PAYMENT_OPTIONS = 'Fetching payment options...',
  FETCHING_PAYMENT_INFO = 'Fetching payment information...',
  JOIN_WALLET = 'Joining Wallet',
}

const OnGoingProcessContainer = styled.View`
  max-width: 60%;
  justify-content: center;
  align-items: center;
`;

const Row = styled.View`
  background-color: ${({theme}) => (theme.dark ? LightBlack : White)};
  border-radius: 10px;
  flex-direction: row;
  padding: 20px;
`;

const ActivityIndicatorContainer = styled.View`
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin-right: 15px;
  transform: scale(1.1);
`;

const Message = styled(BaseText)`
  font-weight: 700;
  flex-wrap: wrap;
`;

const OnGoingProcessModal: React.FC = () => {
  const message = useSelector(
    ({APP}: RootState) => APP.onGoingProcessModalMessage,
  );
  const isVisible = useSelector(
    ({APP}: RootState) => APP.showOnGoingProcessModal,
  );

  return (
    <Modal
      isVisible={isVisible}
      backdropOpacity={0.4}
      animationIn={'fadeInRight'}
      animationOut={'fadeOutLeft'}
      backdropTransitionOutTiming={0}
      hideModalContentWhileAnimating={true}
      useNativeDriverForBackdrop={true}
      useNativeDriver={true}
      style={{
        alignItems: 'center',
      }}>
      <OnGoingProcessContainer>
        <Row>
          <ActivityIndicatorContainer>
            <ActivityIndicator color={SlateDark} />
          </ActivityIndicatorContainer>
          <Message>{message}</Message>
        </Row>
      </OnGoingProcessContainer>
    </Modal>
  );
};

export default OnGoingProcessModal;
