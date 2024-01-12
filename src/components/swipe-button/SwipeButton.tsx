import React from 'react';
import RNSwipeButton from 'rn-swipe-button';
import {NotificationPrimary, White} from '../../styles/colors';
import BitpayBSvg from '../../../assets/img/logos/bitpay-b.svg';
import SlideArrowSVG from '../../../assets/img/slide-arrow.svg';
import haptic from '../haptic-feedback/haptic';
import styled from 'styled-components/native';

export interface SwipeButtonConfig {
  title: string;
  onSwipeComplete: () => void;
  forceReset?: boolean;
  disabled?: boolean;
}

const buttonHeight = 77;

const SwipeButtonBackground = styled.View`
  background-color: ${NotificationPrimary};
  border-radius: 50px;
`;

const SwipeButtonContainer = styled.View`
  padding: 5px 10%;
`;

const SlideArrow = styled(SlideArrowSVG)`
  position: absolute;
  right: 30px;
  top: 31px;
  z-index: -1;
`;

const SwipeButton = ({
  title,
  onSwipeComplete,
  forceReset,
  disabled = false,
}: SwipeButtonConfig) => {
  return (
    <SwipeButtonContainer>
      <SwipeButtonBackground>
        <RNSwipeButton
          containerStyles={{
            borderRadius: 50,
            margin: 0,
            borderWidth: 0,
            height: buttonHeight,
          }}
          height={buttonHeight}
          onSwipeStart={() => haptic('longPress')}
          onSwipeSuccess={onSwipeComplete}
          swipeSuccessThreshold={75}
          railBackgroundColor={'transparent'}
          railFillBorderColor={'#0E258D'}
          railStyles={{borderWidth: 2, borderRadius: 50}}
          railFillBackgroundColor={'#0E258D'}
          thumbIconStyles={{borderRadius: 50}}
          thumbIconBackgroundColor={'#0E258D'}
          thumbIconBorderColor={'#0E258D'}
          // @ts-ignore
          thumbIconComponent={() => <BitpayBSvg />}
          thumbIconWidth={buttonHeight}
          title={title}
          titleColor={White}
          titleStyles={{fontWeight: '500'}}
          // shouldResetAfterSuccess={true} // Button resets automatically after swipe success
          // resetAfterSuccessAnimDelay={3000} // Reset after 3s
          forceReset={(reset: any) => {
            if (forceReset) {
              reset(); // Calling "reset" will reset the swipe thumb.
            }
          }}
          disabled={disabled}
        />
        <SlideArrow />
      </SwipeButtonBackground>
    </SwipeButtonContainer>
  );
};

export default SwipeButton;
