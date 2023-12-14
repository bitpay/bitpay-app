import {useNavigation} from '@react-navigation/native';
import React from 'react';
import {TouchableOpacity} from 'react-native';
import * as Svg from 'react-native-svg';
import {HeaderButtonContainer} from './Styled';
import {
  Action,
  LinkBlue,
  Midnight,
  NeutralSlate,
} from '../../../../styles/colors';
import {useTheme} from 'styled-components/native';
import {useAppDispatch} from '../../../../utils/hooks';
import {Analytics} from '../../../../store/analytics/analytics.effects';

const ScanIcon = () => {
  const theme = useTheme();
  const background = theme.dark ? Midnight : NeutralSlate;
  const fill = theme.dark ? LinkBlue : Action;

  return (
    <Svg.Svg width="35" height="35" viewBox="0 0 35 35" fill="none">
      <Svg.Circle cx="17.5" cy="17.5" r="17.5" fill={background} />
      <Svg.Rect
        fill={fill}
        x="9.87781"
        y="11.7464"
        width="2.39283"
        height="4.95"
        rx="1.19642"
        transform="rotate(-90 9.87781 11.7464)"
      />
      <Svg.Rect
        fill={fill}
        x="9.87781"
        y="9.35358"
        width="2.39283"
        height="4.95"
        rx="1.19642"
      />
      <Svg.Rect
        fill={fill}
        x="22.6799"
        y="9.35358"
        width="2.39283"
        height="4.95"
        rx="1.19642"
      />
      <Svg.Rect
        fill={fill}
        x="25.0728"
        y="9.35358"
        width="2.39283"
        height="4.95"
        rx="1.19642"
        transform="rotate(90 25.0728 9.35358)"
      />
      <Svg.Rect
        fill={fill}
        x="12.2706"
        y="25.6464"
        width="2.39283"
        height="4.95"
        rx="1.19642"
        transform="rotate(180 12.2706 25.6464)"
      />
      <Svg.Rect
        fill={fill}
        x="9.87781"
        y="25.6464"
        width="2.39283"
        height="4.95"
        rx="1.19642"
        transform="rotate(-90 9.87781 25.6464)"
      />
      <Svg.Rect
        fill={fill}
        x="25.0729"
        y="23.2536"
        width="2.39283"
        height="4.95"
        rx="1.19642"
        transform="rotate(90 25.0729 23.2536)"
      />
      <Svg.Rect
        fill={fill}
        x="25.0729"
        y="25.6464"
        width="2.39283"
        height="4.95"
        rx="1.19642"
        transform="rotate(-180 25.0729 25.6464)"
      />
      <Svg.Rect
        fill={fill}
        x="6.90503"
        y="18.6964"
        width="2.39"
        height="21.19"
        rx="1.195"
        transform="rotate(-90 6.90503 18.6964)"
      />
    </Svg.Svg>
  );
};

const ScanButton: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  return (
    <HeaderButtonContainer>
      <TouchableOpacity
        onPress={() => {
          dispatch(
            Analytics.track('Open Scanner', {
              context: 'HeaderScanButton',
            }),
          );
          navigation.navigate('ScanRoot');
        }}>
        <ScanIcon />
      </TouchableOpacity>
    </HeaderButtonContainer>
  );
};

export default ScanButton;
