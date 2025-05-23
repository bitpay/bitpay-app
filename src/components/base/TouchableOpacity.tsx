import React from 'react';
import {
  TouchableOpacity as RNTouchableOpacity,
  TouchableOpacityProps as RNTouchableOpacityProps,
} from 'react-native';
import {
  TouchableOpacity as GHTouchableOpacity,
  TouchableOpacityProps as GHTouchableOpacityProps,
} from 'react-native-gesture-handler';
import {IS_ANDROID} from '../../constants';

export const ActiveOpacity = 0.75;

// Use intersection of both prop types to ensure compatibility
export type TouchableOpacityProps = RNTouchableOpacityProps &
  GHTouchableOpacityProps & {
    touchableLibrary?: 'react-native' | 'react-native-gesture-handler';
  };

export const TouchableOpacity: React.FC<TouchableOpacityProps> = ({
  activeOpacity = ActiveOpacity,
  touchableLibrary,
  ...props
}) => {
  const specifiedTouchable =
    touchableLibrary &&
    (touchableLibrary === 'react-native'
      ? RNTouchableOpacity
      : GHTouchableOpacity);
  const TouchableComponent =
    specifiedTouchable ||
    (IS_ANDROID ? RNTouchableOpacity : GHTouchableOpacity);
  return <TouchableComponent activeOpacity={activeOpacity} {...props} />;
};
