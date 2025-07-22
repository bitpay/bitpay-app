import React from 'react';
import {ActivityIndicator, Platform} from 'react-native';
import styled from 'styled-components/native';
import {LightBlack, SlateDark, White} from '../../../styles/colors';
import {useAppSelector} from '../../../utils/hooks';
import {BlurContainer} from '../../blur/Blur';
import {BaseText} from '../../styled/Text';
import SheetModal from '../base/sheet/SheetModal';
import BaseModal from '../base/BaseModal';
import {HEIGHT, WIDTH} from '../../styled/Containers';

export type OnGoingProcessMessages =
  | 'GENERAL_AWAITING'
  | 'CREATING_KEY'
  | 'LOGGING_IN'
  | 'LOGGING_OUT'
  | 'PAIRING'
  | 'CREATING_ACCOUNT'
  | 'UPDATING_ACCOUNT'
  | 'IMPORTING'
  | 'IMPORT_SCANNING_FUNDS'
  | 'DELETING_KEY'
  | 'ADDING_WALLET'
  | 'ADDING_ACCOUNT'
  | 'ADDING_EVM_CHAINS'
  | 'ADDING_SPL_CHAINS'
  | 'LOADING'
  | 'FETCHING_PAYMENT_OPTIONS'
  | 'FETCHING_PAYMENT_INFO'
  | 'JOIN_WALLET'
  | 'SENDING_PAYMENT'
  | 'ACCEPTING_PAYMENT'
  | 'GENERATING_ADDRESS'
  | 'GENERATING_GIFT_CARD'
  | 'SYNCING_WALLETS'
  | 'REJECTING_CALL_REQUEST'
  | 'SAVING_LAYOUT'
  | 'SAVING_ADDRESSES'
  | 'EXCHANGE_GETTING_DATA'
  | 'CALCULATING_FEE'
  | 'CONNECTING_COINBASE'
  | 'FETCHING_COINBASE_DATA'
  | 'UPDATING_TXP'
  | 'CREATING_TXP'
  | 'SENDING_EMAIL'
  | 'REDIRECTING'
  | 'REMOVING_BILL'
  | 'BROADCASTING_TXP'
  | 'SWEEPING_WALLET'
  | 'SCANNING_FUNDS'
  | 'SCANNING_FUNDS_WITH_PASSPHRASE';

const Row = styled.View`
  background-color: ${({theme}) => (theme.dark ? LightBlack : White)};
  border-radius: 10px;
  flex-direction: row;
  padding: 20px;
  max-width: 60%;
  padding-right: 47px;
`;

const ActivityIndicatorContainer = styled.View`
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin-right: 15px;
`;

const Message = styled(BaseText)`
  font-weight: 700;
  flex-wrap: wrap;
`;

const ModalWrapper = styled.View`
  height: ${HEIGHT}px;
  width: ${WIDTH}px;
  align-items: center;
  justify-content: center;
  margin-left: -20px;
`;

const FullscreenWrapper = styled.View`
  height: ${HEIGHT}px;
  width: ${WIDTH}px;
  align-items: center;
  justify-content: center;
`;

const OnGoingProcessModal: React.FC = () => {
  const message = useAppSelector(({APP}) => APP.onGoingProcessModalMessage);
  const isVisible = useAppSelector(({APP}) => APP.showOnGoingProcessModal);
  const appWasInit = useAppSelector(({APP}) => APP.appWasInit);

  const modalLibrary: 'bottom-sheet' | 'modal' = Platform.OS === 'ios' ? 'modal' : 'bottom-sheet';

  return modalLibrary === 'bottom-sheet' ? (
    <SheetModal
      modalLibrary={modalLibrary}
      isVisible={appWasInit && isVisible}
      fullscreen={true}
      enableBackdropDismiss={false}
      onBackdropPress={() => {}}
      backdropOpacity={0.4}
      backgroundColor="transparent"
      borderRadius={18}
      stackBehavior="replace"
      paddingTop={0}>
      <FullscreenWrapper>
        <Row>
          <ActivityIndicatorContainer>
            <ActivityIndicator color={SlateDark} />
          </ActivityIndicatorContainer>
          <Message>{message}</Message>
          <BlurContainer />
        </Row>
      </FullscreenWrapper>
    </SheetModal>
  ) : (
    <BaseModal
      id={'ongoingProcess'}
      deviceHeight={HEIGHT}
      deviceWidth={WIDTH}
      presentationStyle="overFullScreen"
      isVisible={appWasInit && isVisible}
      backdropOpacity={0.4}
      coverScreen={true}
      animationIn={'fadeInRight'}
      animationOut={'fadeOutLeft'}
      backdropTransitionOutTiming={0}
      hideModalContentWhileAnimating={true}
      useNativeDriverForBackdrop={true}
      useNativeDriver={true}>
      <ModalWrapper>
        <Row>
          <ActivityIndicatorContainer>
            <ActivityIndicator color={SlateDark} />
          </ActivityIndicatorContainer>
          <Message>{message}</Message>
          <BlurContainer />
        </Row>
      </ModalWrapper>
    </BaseModal>
  );
};

export default OnGoingProcessModal;
