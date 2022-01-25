import React from 'react';
import RNSwipeButton from 'rn-swipe-button';
import {NotificationPrimary, White} from '../../styles/colors';
import BitpayBSvg from '../../../assets/img/logos/bitpay-b.svg';

export interface SwipeButtonConfig {
  title: string;
  onSwipeComplete: () => void;
}

const SwipeButton = ({title, onSwipeComplete}: SwipeButtonConfig) => {
  return (
    <RNSwipeButton
      containerStyles={{borderRadius: 50}}
      height={77}
      onSwipeSuccess={onSwipeComplete}
      railBackgroundColor={NotificationPrimary}
      railFillBorderColor={'#1f3ab3'}
      railFillBackgroundColor={'#1f3ab3'}
      thumbIconStyles={{borderRadius: 50}}
      thumbIconBackgroundColor={'#1f3ab3'}
      thumbIconBorderColor={'#1f3ab3'}
      // @ts-ignore
      thumbIconComponent={() => <BitpayBSvg />}
      thumbIconWidth={81}
      title={title}
      titleColor={White}
      titleStyles={{fontWeight: '500'}}
      // shouldResetAfterSuccess={true} // Button resets automatically after swipe success
      // resetAfterSuccessAnimDelay={3000} // Reset after 3s
      // forceReset={ reset => {
      //   forceResetLastButton = reset // Calling "reset" will reset the swipe thumb.
      // }}
    />
  );
};

export default SwipeButton;
