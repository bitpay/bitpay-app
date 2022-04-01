import React from 'react';
import RNSwipeButton from 'rn-swipe-button';
import {NotificationPrimary, White} from '../../styles/colors';
import BitpayBSvg from '../../../assets/img/logos/bitpay-b.svg';
import haptic from '../haptic-feedback/haptic';

export interface SwipeButtonConfig {
  title: string;
  onSwipeComplete: () => void;
  forceReset?: boolean;
}

const SwipeButton = ({
  title,
  onSwipeComplete,
  forceReset,
}: SwipeButtonConfig) => {
  return (
    <RNSwipeButton
      containerStyles={{borderRadius: 50}}
      height={77}
      onSwipeStart={() => haptic('longPress')}
      onSwipeSuccess={onSwipeComplete}
      swipeSuccessThreshold={90}
      railBackgroundColor={NotificationPrimary}
      railFillBorderColor={'#0E258D'}
      railFillBackgroundColor={'#0E258D'}
      thumbIconStyles={{borderRadius: 50}}
      thumbIconBackgroundColor={'#0E258D'}
      thumbIconBorderColor={'#0E258D'}
      // @ts-ignore
      thumbIconComponent={() => <BitpayBSvg />}
      thumbIconWidth={81}
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
    />
  );
};

export default SwipeButton;
