import React from 'react';
import RNSwipeButton from 'rn-swipe-button';
import {useTheme} from 'styled-components/native';
import {NotificationPrimary, White} from '../../styles/colors';
import BitpayBSvg from '../../../assets/img/logos/bitpay-b.svg';
import SlideArrowSVG from '../../../assets/img/slide-arrow.svg';
import haptic from '../haptic-feedback/haptic';
import styled from 'styled-components/native';
import * as Svg from 'react-native-svg';

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

const SwipeBitpayLogo = (disabled?: boolean) => {
  const theme = useTheme();

  return (
    <Svg.Svg width="24" height="36" viewBox="0 0 24 36" fill="none">
      <Svg.Path
        fill={theme.dark ? (disabled ? '#888888' : White) : White}
        d="M19.3795 11.666C18.3321 11.1497 17.0915 10.8912 15.6558 10.8912C14.9676 10.8912 14.3248 10.9673 13.7271 11.119C13.1284 11.2715 12.5645 11.4681 11.9668 11.7414L14.7142 0L7.76066 1.09356L0 34.2228C0.867115 34.6486 1.78641 34.9825 2.75891 35.2252C3.73039 35.4682 4.65003 35.6503 5.51748 35.7721C6.38459 35.8933 7.15514 35.9614 7.82809 35.9773C8.50105 35.9921 8.97204 36 9.24109 36C11.3342 36 13.2785 35.5969 15.0727 34.7922C16.8672 33.9877 18.4219 32.8942 19.7383 31.5115C21.054 30.1291 22.0933 28.5038 22.856 26.6354C23.6188 24.767 24 22.7847 24 20.6885C24 19.3216 23.835 18.0456 23.5063 16.8608C23.1769 15.6757 22.6687 14.6434 21.9811 13.7619C21.2929 12.8811 20.4258 12.1827 19.3795 11.666ZM13.2915 30.2153C12.3375 30.7388 11.3218 31 10.2451 31H9.41423C9.1984 31 8.89017 30.9822 8 30.8263L11.0098 18.1613C11.5635 17.6692 12.1607 17.3498 12.8532 17.1953C13.5457 17.0415 13.9916 17 14.4229 17C15.7455 17 16.7688 17.3798 17.2615 18.2112C17.7535 19.0419 18 20.1962 18 21.6735C18 22.8743 17.7995 24.0286 17.3999 25.1366C16.9997 26.2445 16.4536 27.237 15.7615 28.1145C15.069 28.9916 14.2451 29.6922 13.2915 30.2153Z"
      />
    </Svg.Svg>
  );
};

const SwipeButton = ({
  title,
  onSwipeComplete,
  forceReset,
  disabled = false,
}: SwipeButtonConfig) => {
  const theme = useTheme();
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
          disabledRailBackgroundColor={theme.dark ? '#3B3B3B' : '#C5C5C5'}
          disabledThumbIconBackgroundColor={theme.dark ? '#656565' : '#868686'}
          disabledThumbIconBorderColor={theme.dark ? '#656565' : '#868686'}
          // @ts-ignore
          thumbIconComponent={() => SwipeBitpayLogo(disabled)}
          thumbIconWidth={buttonHeight}
          title={title}
          titleColor={theme.dark ? (disabled ? '#656565' : White) : White}
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
