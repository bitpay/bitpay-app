import React from 'react';
import {TouchableOpacity as RNTouchableOpacity, TouchableOpacityProps as RNTouchableOpacityProps} from 'react-native';
import {TouchableOpacity as GHTouchableOpacity, TouchableOpacityProps as GHTouchableOpacityProps} from 'react-native-gesture-handler';
import {IS_ANDROID} from '../../constants';

export const ActiveOpacity = 0.75;

// Use intersection of both prop types to ensure compatibility
export type TouchableOpacityProps = RNTouchableOpacityProps & GHTouchableOpacityProps;

export const TouchableOpacity: React.FC<TouchableOpacityProps> = ({
  activeOpacity = ActiveOpacity,
  ...props
}) => {
  const TouchableComponent = IS_ANDROID ? RNTouchableOpacity : GHTouchableOpacity;
  return <TouchableComponent activeOpacity={activeOpacity} {...props} />;
};
